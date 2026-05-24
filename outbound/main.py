from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import os
import uuid
from datetime import datetime
from vapi import Vapi
from vapi.types import AssistantOverrides, CreateCustomerDto
from dotenv import load_dotenv
import os

load_dotenv()


app = FastAPI(title="Maaz Dental Clinic API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE  = os.path.join(BASE_DIR, "appointments.json")




VAPI_API_KEY = os.getenv("VAPI_PRIVATE_KEY")

ASSISTANT_ID = os.getenv("VAPI_ASSISTANT_ID")

PHONE_NUMBER_ID = os.getenv("VAPI_PHONE_NUMBER_ID")
# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def load_db():
    if not os.path.exists(DB_FILE):
        with open(DB_FILE, "w") as f:
            json.dump({}, f)
    with open(DB_FILE, "r") as f:
        return json.load(f)


def save_db(data):
    with open(DB_FILE, "w") as f:
        json.dump(data, f, indent=2)


# ─────────────────────────────────────────────
# MODEL
# ─────────────────────────────────────────────

class AppointmentIn(BaseModel):
    patient_name:     str
    phone_number:     str
    doctor_name:      str
    appointment_date: str
    appointment_time: str


# ─────────────────────────────────────────────
# POST /outbound-call
# Saves appointment + fires Vapi outbound call
# ─────────────────────────────────────────────

@app.post("/outbound-call")
def outbound_call(data: AppointmentIn):

    # 1 — Generate appointment ID and save to JSON
    db             = load_db()
    appointment_id = "APT-" + str(uuid.uuid4())[:6].upper()

    db[appointment_id] = {
        "appointment_id":   appointment_id,
        "patient_name":     data.patient_name,
        "phone_number":     data.phone_number,
        "doctor_name":      data.doctor_name,
        "appointment_date": data.appointment_date,
        "appointment_time": data.appointment_time,
        "status":           "scheduled",
        "call_status":      "calling",
        "vapi_call_id":     None,
        "notes":            "",
        "created_at":       datetime.utcnow().isoformat(),
        "updated_at":       None,
    }
    save_db(db)

    # 2 — Fire outbound call via Vapi SDK
    try:
        client = Vapi(token=VAPI_API_KEY)

        call = client.calls.create(
            assistant_id    = ASSISTANT_ID,
            phone_number_id = PHONE_NUMBER_ID,
            customer        = CreateCustomerDto(
                number = data.phone_number,
                name   = data.patient_name,
            ),
            assistant_overrides = AssistantOverrides(
                variable_values = {
                    "patient_name":     data.patient_name,
                    "phone_number":     data.phone_number,
                    "doctor_name":      data.doctor_name,
                    "appointment_date": data.appointment_date,
                    "appointment_time": data.appointment_time,
                    "appointment_id":   appointment_id,
                    "status":           "scheduled",
                    "notes":            "",
                }
            ),
        )

        print(f"📞 Call created: {call.id}")

        # 3 — Save Vapi call ID back into appointment
        db = load_db()
        db[appointment_id]["vapi_call_id"] = call.id
        db[appointment_id]["updated_at"]   = datetime.utcnow().isoformat()
        save_db(db)

        return {
            "success":        True,
            "appointment_id": appointment_id,
            "vapi_call_id":   call.id,
            "message":        f"Outbound call started to {data.phone_number}",
        }

    except Exception as e:
        # Mark call as failed in JSON
        db = load_db()
        db[appointment_id]["call_status"] = "failed"
        db[appointment_id]["notes"]       = str(e)
        save_db(db)
        raise HTTPException(status_code=502, detail=f"Vapi error: {str(e)}")


# ─────────────────────────────────────────────
# POST /webhook/tool-call
# Vapi calls this for tool use + call end events
# ─────────────────────────────────────────────

@app.post("/webhook/tool-call")
async def vapi_webhook(request: Request):

    raw = await request.body()
    if not raw or not raw.strip():
        return {"results": []}

    try:
        body = json.loads(raw)
    except json.JSONDecodeError:
        return {"results": []}

    print("📩 Webhook received:", json.dumps(body, indent=2))

    message  = body.get("message", {})
    msg_type = message.get("type", "")

    # ── call ended → update call_status ──
    if msg_type == "end-of-call-report":
        call_id      = message.get("call", {}).get("id")
        ended_reason = message.get("endedReason", "unknown")
        db = load_db()
        for apt in db.values():
            if apt.get("vapi_call_id") == call_id:
                apt["call_status"]       = "completed"
                apt["call_ended_reason"] = ended_reason
                apt["updated_at"]        = datetime.utcnow().isoformat()
                print(f"✅ Call completed: {apt['appointment_id']}")
        save_db(db)
        return {"success": True}

    # ── tool calls → update appointment ──
    tool_calls = message.get("toolCallList") or message.get("toolCalls") or []
    results    = []

    for tool_call in tool_calls:
        tool_call_id = tool_call.get("id", "")
        fn           = tool_call.get("function", {})
        fn_name      = fn.get("name", "")
        raw_args     = fn.get("arguments", "{}")

        if isinstance(raw_args, str):
            try:
                args = json.loads(raw_args)
            except Exception:
                args = {}
        else:
            args = raw_args

        print(f"🔧 Tool: {fn_name} | Args: {args}")

        if fn_name == "update_appointment":
            appointment_id = args.get("appointment_id", "").strip().upper()
            db = load_db()

            if not appointment_id or appointment_id not in db:
                result_msg = f"Appointment {appointment_id} not found."
            else:
                for field in ["status", "notes", "doctor_name",
                              "appointment_date", "appointment_time"]:
                    if field in args and args[field]:
                        db[appointment_id][field] = args[field]

                db[appointment_id]["updated_at"] = datetime.utcnow().isoformat()
                save_db(db)
                result_msg = f"Appointment {appointment_id} updated successfully."
                print(f"✅ {result_msg}")

            results.append({"toolCallId": tool_call_id, "result": result_msg})

        else:
            results.append({
                "toolCallId": tool_call_id,
                "result":     f"Tool '{fn_name}' not handled.",
            })

    return {"results": results}


# ─────────────────────────────────────────────
# GET /appointments
# ─────────────────────────────────────────────

@app.get("/appointments")
def get_appointments():
    return load_db()


# ─────────────────────────────────────────────
# HEALTH
# ─────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "running"}