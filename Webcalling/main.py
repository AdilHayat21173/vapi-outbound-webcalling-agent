from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json
import os
import uuid
from datetime import datetime

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


def create_appointment_record(data):
    db = load_db()
    appointment_id = "APT-" + str(uuid.uuid4())[:6].upper()
    record = {
        "appointment_id":   appointment_id,
        "patient_name":     data.patient_name,
        "phone_number":     data.phone_number,
        "doctor_name":      data.doctor_name,
        "appointment_date": data.appointment_date,
        "appointment_time": data.appointment_time,
        "status":           "scheduled",
        "notes":            "",
        "created_at":       datetime.utcnow().isoformat(),
        "updated_at":       None,
    }
    db[appointment_id] = record
    save_db(db)
    return record


# ─────────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────────

class AppointmentIn(BaseModel):
    patient_name:     str
    phone_number:     str
    doctor_name:      str
    appointment_date: str
    appointment_time: str


# ─────────────────────────────────────────────
# /webhook/tool-call  ← Vapi calls this
# ─────────────────────────────────────────────

@app.post("/webhook/tool-call")
async def vapi_tool_call(request: Request):
    """
    Vapi sends tool call payloads here.
    Handles the update_appointment tool automatically.
    """
    # Safely read body — Vapi sometimes sends empty body on status pings
    raw = await request.body()
    if not raw or not raw.strip():
        return {"results": []}

    try:
        body = json.loads(raw)
    except json.JSONDecodeError:
        return {"results": []}

    print("📩 Vapi webhook received:", json.dumps(body, indent=2))

    # Vapi wraps the tool call inside message.toolCalls
    message     = body.get("message", {})
    tool_calls  = message.get("toolCallList") or message.get("toolCalls") or []

    results = []

    for tool_call in tool_calls:
        tool_call_id = tool_call.get("id", "")
        fn           = tool_call.get("function", {})
        fn_name      = fn.get("name", "")
        raw_args     = fn.get("arguments", "{}")

        # arguments may arrive as a string or already a dict
        if isinstance(raw_args, str):
            try:
                args = json.loads(raw_args)
            except Exception:
                args = {}
        else:
            args = raw_args

        print(f"🔧 Tool: {fn_name} | Args: {args}")

        # ── handle update_appointment ──
        if fn_name == "update_appointment":
            appointment_id = args.get("appointment_id", "").strip().upper()
            db = load_db()

            if not appointment_id or appointment_id not in db:
                result_msg = f"Appointment {appointment_id} not found."
            else:
                updatable = ["status", "notes", "doctor_name",
                             "appointment_date", "appointment_time"]
                for field in updatable:
                    if field in args and args[field]:
                        db[appointment_id][field] = args[field]

                db[appointment_id]["updated_at"] = datetime.utcnow().isoformat()
                save_db(db)
                result_msg = f"Appointment {appointment_id} updated successfully."
                print(f"✅ {result_msg}")

            results.append({
                "toolCallId": tool_call_id,
                "result":     result_msg,
            })

        else:
            # Unknown tool — return graceful response
            results.append({
                "toolCallId": tool_call_id,
                "result":     f"Tool '{fn_name}' not handled.",
            })

    # Vapi expects: { "results": [ { "toolCallId": "...", "result": "..." } ] }
    return {"results": results}


# ─────────────────────────────────────────────
# /start-web-call  ← Vite frontend Save button
# ─────────────────────────────────────────────

@app.post("/start-web-call")
def start_web_call(data: AppointmentIn):
    record = create_appointment_record(data)
    return {
        "success":        True,
        "appointment_id": record["appointment_id"],
    }


# ─────────────────────────────────────────────
# /appointments  (REST CRUD)
# ─────────────────────────────────────────────

@app.post("/appointments")
def create_appointment(data: AppointmentIn):
    record = create_appointment_record(data)
    return {"success": True, "appointment_id": record["appointment_id"]}


@app.get("/appointments")
def get_appointments():
    return load_db()


@app.get("/appointments/{appointment_id}")
def get_appointment(appointment_id: str):
    db = load_db()
    appointment = db.get(appointment_id.upper())
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment


@app.delete("/appointments/{appointment_id}")
def delete_appointment(appointment_id: str):
    db = load_db()
    if appointment_id.upper() not in db:
        raise HTTPException(status_code=404, detail="Appointment not found")
    del db[appointment_id.upper()]
    save_db(db)
    return {"success": True, "deleted": appointment_id}


# ─────────────────────────────────────────────
# HEALTH
# ─────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "running"}