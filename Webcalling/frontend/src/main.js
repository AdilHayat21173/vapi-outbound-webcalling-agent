import VapiModule from "@vapi-ai/web";
import "./style.css";

// ─────────────────────────────────────────────
// CONFIG — fill in your credentials
// ─────────────────────────────────────────────

const VAPI_PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY;
const ASSISTANT_ID = import.meta.env.VITE_ASSISTANT_ID;
const API = import.meta.env.VITE_API_URL;

// ─────────────────────────────────────────────
// VAPI INIT
// ─────────────────────────────────────────────

const VapiClass =
  VapiModule?.default         ||
  VapiModule?.Vapi            ||
  VapiModule?.default?.default ||
  VapiModule;

let vapi = null;

// ─────────────────────────────────────────────
// INJECT HTML INTO #app
// ─────────────────────────────────────────────

document.querySelector("#app").innerHTML = `
  <div class="page">
    <div class="card">

      <div class="clinic-header">
        <div class="clinic-icon">🦷</div>
        <div>
          <h1>Maaz Dental Clinic</h1>
          <p class="clinic-sub">Appointment Booking System</p>
        </div>
      </div>

      <div class="section-label">
        <span class="section-icon">📋</span>
        Patient Details
      </div>

      <div class="form-group">
        <label for="patient_name">Patient Name</label>
        <input id="patient_name" type="text" placeholder="Ali Khan" autocomplete="off" />
      </div>

      <div class="form-group">
        <label for="phone_number">Phone Number</label>
        <input id="phone_number" type="tel" placeholder="+923001234567" autocomplete="off" />
      </div>

      <div class="form-group">
        <label for="doctor_name">Doctor</label>
        <input id="doctor_name" type="text" placeholder="Dr. Maaz" autocomplete="off" />
      </div>

      <div class="row">
        <div class="form-group">
          <label for="appointment_date">Date</label>
          <input id="appointment_date" type="text" placeholder="25 May 2026" autocomplete="off" />
        </div>
        <div class="form-group">
          <label for="appointment_time">Time</label>
          <input id="appointment_time" type="text" placeholder="4:30 PM" autocomplete="off" />
        </div>
      </div>

      <button id="saveBtn" class="btn btn-save">
        💾 Save Appointment
      </button>

      <div class="call-box">
        <p class="call-hint">After saving, start the web call to test the agent.</p>

        <button id="startBtn" class="btn btn-start" disabled>
          🎙️ Start Web Call
        </button>

        <button id="endBtn" class="btn btn-end" disabled>
          ⛔ End Call
        </button>

        <div id="status" class="status-badge">
          <span class="status-dot"></span>
          Save an appointment first
        </div>
      </div>

      <div class="data-section">
        <div class="data-label">📋 All Appointments</div>
        <button id="getAptBtn" class="btn btn-get">🔍 Get All Appointments</button>
        <pre id="patientDataBox" class="data-box">—</pre>
      </div>

      <div class="data-section">
        <div class="data-label">Call Log</div>
        <pre id="log" class="data-box log-box">—</pre>
      </div>

    </div>
  </div>
`;

// ─────────────────────────────────────────────
// ELEMENTS  (grabbed after innerHTML is set)
// ─────────────────────────────────────────────

const saveBtn        = document.getElementById("saveBtn");
const startBtn       = document.getElementById("startBtn");
const endBtn         = document.getElementById("endBtn");
const statusEl       = document.getElementById("status");
const logBox         = document.getElementById("log");
const patientDataBox = document.getElementById("patientDataBox");
const getAptBtn      = document.getElementById("getAptBtn");

// ─────────────────────────────────────────────
// GLOBALS
// ─────────────────────────────────────────────

let patientData  = null;
let isCallActive = false;
let manualEnd    = false;

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function log(message) {
  console.log(message);
  if (logBox.textContent === "—") logBox.textContent = "";
  logBox.textContent += message + "\n";
  logBox.scrollTop = logBox.scrollHeight;
}

function setStatus(text, mode = "") {
  statusEl.className = "status-badge" + (mode ? ` ${mode}` : "");
  statusEl.innerHTML = `<span class="status-dot"></span>${text}`;
}

function val(id) {
  return document.getElementById(id).value.trim();
}

// ─────────────────────────────────────────────
// VAPI SDK  (init after DOM is ready)
// ─────────────────────────────────────────────

try {
  if (typeof VapiClass !== "function") {
    throw new Error("Vapi SDK constructor not found");
  }
  vapi = new VapiClass(VAPI_PUBLIC_KEY);
  log("✅ Vapi SDK loaded successfully.");
} catch (err) {
  log("❌ Vapi SDK error: " + err.message);
}

// ─────────────────────────────────────────────
// SAVE APPOINTMENT
// ─────────────────────────────────────────────

async function saveAppointment() {
  const payload = {
    patient_name:     val("patient_name"),
    phone_number:     val("phone_number"),
    doctor_name:      val("doctor_name"),
    appointment_date: val("appointment_date"),
    appointment_time: val("appointment_time"),
  };

  if (Object.values(payload).some(v => !v)) {
    setStatus("Please fill all fields", "error");
    return;
  }

  saveBtn.disabled = true;
  setStatus("Saving appointment…");
  log("Saving appointment to FastAPI…");

  try {
    const res = await fetch(`${API}/start-web-call`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.detail || "Failed to save appointment");
    }

    patientData = {
      ...payload,
      appointment_id: result.appointment_id,
      status: "scheduled",
      notes:  "",
    };

    patientDataBox.textContent = JSON.stringify(patientData, null, 2);
    startBtn.disabled = false;
    setStatus("Appointment saved — click Start Web Call", "active");
    log("✅ Appointment saved: " + result.appointment_id);

  } catch (err) {
    console.error(err);
    setStatus("Save failed", "error");
    log("❌ SAVE ERROR: " + err.message);
  } finally {
    saveBtn.disabled = false;
  }
}

// ─────────────────────────────────────────────
// START CALL
// ─────────────────────────────────────────────

async function startCall() {
  if (!vapi) { log("❌ Vapi not ready."); return; }

  if (!patientData) {
    setStatus("Save appointment first", "error");
    log("Please save appointment first.");
    return;
  }

  manualEnd         = false;
  startBtn.disabled = true;
  endBtn.disabled   = false;
  setStatus("Requesting microphone…");
  log("Requesting microphone permission…");

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop());

    setStatus("Starting Vapi call…");
    log("Starting Vapi call…");
    log("Sending data to Vapi:\n" + JSON.stringify(patientData, null, 2));

    await vapi.start(ASSISTANT_ID, { variableValues: patientData });

    isCallActive = true;
    setStatus("Call started", "active");
    log("✅ Call started successfully.");

  } catch (err) {
    console.error(err);
    startBtn.disabled = false;
    endBtn.disabled   = false;
    isCallActive      = false;
    setStatus("Error starting call", "error");
    log("❌ START ERROR: " + (err.message || JSON.stringify(err)));
  }
}

// ─────────────────────────────────────────────
// END CALL
// ─────────────────────────────────────────────

function endCall() {
  manualEnd = true;

  if (vapi) vapi.stop();   // stop regardless of isCallActive flag

  isCallActive      = false;
  startBtn.disabled = false;
  endBtn.disabled   = true;
  setStatus("Call ended");
  log("⛔ Call ended by user.");
}

// ─────────────────────────────────────────────
// BUTTON EVENTS
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// GET APPOINTMENT
// ─────────────────────────────────────────────

async function getAppointment() {
  getAptBtn.disabled = true;
  getAptBtn.textContent = "Loading…";
  patientDataBox.textContent = "Fetching all appointments…";
  log("🔍 Fetching all appointments…");

  try {
    const res = await fetch(`${API}/appointments`);
    const data = await res.json();

    if (!res.ok) {
      patientDataBox.textContent = "❌ Failed to fetch appointments.";
      log("❌ Failed to fetch appointments.");
      return;
    }

    const keys = Object.keys(data);
    if (keys.length === 0) {
      patientDataBox.textContent = "No appointments found.";
      log("ℹ️ No appointments in database.");
      return;
    }

    patientDataBox.textContent = JSON.stringify(data, null, 2);
    log(`✅ Loaded ${keys.length} appointment(s).`);

  } catch (err) {
    patientDataBox.textContent = "❌ Error: " + err.message;
    log("❌ GET ERROR: " + err.message);
  } finally {
    getAptBtn.disabled = false;
    getAptBtn.textContent = "🔍 Get All Appointments";
  }
}

saveBtn.addEventListener("click", saveAppointment);
startBtn.addEventListener("click", startCall);
endBtn.addEventListener("click", endCall);
getAptBtn.addEventListener("click", getAppointment);


// ─────────────────────────────────────────────
// VAPI EVENTS
// ─────────────────────────────────────────────

if (vapi) {

  vapi.on("call-start", () => {
    isCallActive      = true;
    startBtn.disabled = true;
    endBtn.disabled   = false;
    setStatus("Call active", "active");
    log("✅ Event: call-start");
  });

  vapi.on("call-end", async () => {
    isCallActive      = false;
    startBtn.disabled = false;
    endBtn.disabled   = true;
    setStatus("Call ended");
    log("⛔ Event: call-end");
  });

  vapi.on("speech-start", () => log("🤖 Assistant speaking…"));
  vapi.on("speech-end",   () => log("🎤 You can speak now."));

  vapi.on("message", (message) => {
    console.log("Vapi message:", message);

    if (message.type === "transcript") {
      const role       = message.role       || "unknown";
      const transcript = message.transcript || "";
      log(`${role}: ${transcript}`);
    }

    if (message.type === "tool-calls" || message.type === "function-call") {
      log("🔧 Tool call received");
      log(JSON.stringify(message, null, 2));
    }
  });

  vapi.on("error", (error) => {
    console.error("Vapi error:", error);

    const errorMsg =
      error?.error?.errorMsg     ||
      error?.error?.message?.msg ||
      error?.message             ||
      "Unknown error";

    if (errorMsg === "Meeting has ended") {
      setStatus("Call ended");
      log("Meeting ended.");
      return;
    }

    setStatus("Vapi error", "error");
    log("❌ VAPI ERROR: " + errorMsg);
    startBtn.disabled = false;
    endBtn.disabled   = false;
    isCallActive      = false;
  });
}