import VapiModule from "@vapi-ai/web";
import "./style.css";

// ─────────────────────────────────────────────
// CONFIG  (set these in your .env file)
// ─────────────────────────────────────────────

const VAPI_PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY;
const ASSISTANT_ID    = import.meta.env.VITE_ASSISTANT_ID;
const API             = import.meta.env.VITE_API_URL;

// ─────────────────────────────────────────────
// VAPI CLASS RESOLUTION
// ─────────────────────────────────────────────

const VapiClass =
  VapiModule?.default          ||
  VapiModule?.Vapi             ||
  VapiModule?.default?.default ||
  VapiModule;

let vapi = null;

// ─────────────────────────────────────────────
// RENDER HTML
// ─────────────────────────────────────────────

document.querySelector("#app").innerHTML = `
  <div class="page">

    <!-- ── FORM CARD ── -->
    <div class="card">
      <div class="clinic-header">
        <div class="clinic-icon">🦷</div>
        <div style="flex:1">
          <h1>Maaz Dental Clinic</h1>
          <p class="clinic-sub">Appointment Booking System</p>
        </div>
        <button id="getAptBtn" class="btn-header-apt">📋 Appointments</button>
      </div>

      <div class="section-label">📋 Patient Details</div>

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

      <div id="status" class="status-badge">
        <span class="status-dot"></span>
        Fill in patient details to begin
      </div>

      <div class="divider"></div>

      <!-- ── CALL CONTROLS ── -->
      <div class="section-label">🎙️ Web Call</div>

      <div id="callBox" class="call-box">
        <p class="call-hint" id="callHint">Save an appointment first, then start the web call to test the agent.</p>

        <button id="startBtn" class="btn btn-start" disabled>
          🎙️ Start Web Call
        </button>

        <button id="endBtn" class="btn btn-end" disabled>
          ⛔ End Call
        </button>

        <div id="callStatus" class="status-badge">
          <span class="status-dot"></span>
          Waiting for appointment…
        </div>
      </div>
    </div>

    <!-- ── APPOINTMENTS CARD (toggled from header button) ── -->
    <div id="appointmentsCard" class="card" style="display:none">

      <!-- All appointments header -->
      <div class="data-header" style="margin-bottom:12px">
        <div class="data-label">📋 All Appointments</div>
        <button id="refreshAptBtn" class="btn-get">🔄 Refresh</button>
      </div>
      <div id="appointmentsBox">
        <div class="empty-state">Loading…</div>
      </div>

      <!-- Lookup by ID -->
      <div class="lookup-divider"></div>
      <div class="data-label" style="margin-bottom:10px">🔎 Lookup by Appointment ID</div>
      <div class="lookup-row">
        <input id="lookupId" type="text" placeholder="APT-XXXXXX" autocomplete="off" />
        <button id="lookupBtn" class="btn-get">Search</button>
      </div>
      <div id="lookupResult" class="lookup-result" style="display:none"></div>
    </div>

    <!-- ── CALL LOG CARD ── -->
    <div class="card">
      <div class="data-header">
        <div class="data-label">📟 Call Log</div>
        <button id="clearLogBtn" class="btn-get" style="background:#8499b5;box-shadow:none">🗑 Clear</button>
      </div>
      <pre id="log" class="data-box log-box">Waiting for activity…</pre>
    </div>

  </div>
`;

// ─────────────────────────────────────────────
// ELEMENT REFS
// ─────────────────────────────────────────────

const saveBtn          = document.getElementById("saveBtn");
const startBtn         = document.getElementById("startBtn");
const endBtn           = document.getElementById("endBtn");
const statusEl         = document.getElementById("status");
const callStatusEl     = document.getElementById("callStatus");
const callBox          = document.getElementById("callBox");
const callHint         = document.getElementById("callHint");
const logBox           = document.getElementById("log");
const appointmentsBox  = document.getElementById("appointmentsBox");
const getAptBtn        = document.getElementById("getAptBtn");
const refreshAptBtn    = document.getElementById("refreshAptBtn");
const appointmentsCard = document.getElementById("appointmentsCard");
const clearLogBtn      = document.getElementById("clearLogBtn");
const lookupBtn        = document.getElementById("lookupBtn");
const lookupIdInput    = document.getElementById("lookupId");
const lookupResult     = document.getElementById("lookupResult");

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────

let patientData  = null;
let isCallActive = false;
let manualEnd    = false;
let logEmpty     = true;

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function log(message) {
  console.log(message);
  if (logEmpty) { logBox.textContent = ""; logEmpty = false; }
  const ts = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  logBox.textContent += `[${ts}] ${message}\n`;
  logBox.scrollTop = logBox.scrollHeight;
}

function setStatus(text, mode = "") {
  statusEl.className = "status-badge" + (mode ? ` ${mode}` : "");
  statusEl.innerHTML = `<span class="status-dot"></span>${text}`;
}

function setCallStatus(text, mode = "") {
  callStatusEl.className = "status-badge" + (mode ? ` ${mode}` : "");
  callStatusEl.innerHTML = `<span class="status-dot"></span>${text}`;
}

function val(id) {
  return document.getElementById(id).value.trim();
}

function statusBadgeClass(status) {
  const map = {
    scheduled:            "badge-scheduled",
    confirmed:            "badge-confirmed",
    rescheduled:          "badge-rescheduled",
    cancelled:            "badge-cancelled",
    pending_confirmation: "badge-pending_confirmation",
    calling:              "badge-calling",
    completed:            "badge-completed",
    pending:              "badge-pending",
  };
  return map[status] || "badge-pending";
}

// ─────────────────────────────────────────────
// RENDER APPOINTMENTS TABLE
// ─────────────────────────────────────────────

function renderAppointments(data) {
  const keys = Object.keys(data);

  if (keys.length === 0) {
    appointmentsBox.innerHTML = '<div class="empty-state">No appointments found.</div>';
    return;
  }

  // newest first
  keys.sort((a, b) => new Date(data[b].created_at) - new Date(data[a].created_at));

  const rows = keys.map(k => {
    const a   = data[k];
    const sc  = statusBadgeClass(a.status   || "scheduled");
    const cc  = statusBadgeClass(a.call_status || "pending");
    return `
      <tr>
        <td><b style="color:#3d5a80;font-size:11px">${a.appointment_id}</b></td>
        <td>${a.patient_name}</td>
        <td>${a.appointment_date}<br><small style="color:#8499b5">${a.appointment_time}</small></td>
        <td><span class="badge ${sc}">${a.status || "scheduled"}</span></td>
        <td><span class="badge ${cc}">${a.call_status || "pending"}</span></td>
      </tr>`;
  }).join("");

  appointmentsBox.innerHTML = `
    <table class="appt-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Patient</th>
          <th>Date / Time</th>
          <th>Status</th>
          <th>Call</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ─────────────────────────────────────────────
// VAPI INIT
// ─────────────────────────────────────────────

try {
  if (typeof VapiClass !== "function") throw new Error("Vapi constructor not found");
  vapi = new VapiClass(VAPI_PUBLIC_KEY);
  log("✅ Vapi SDK loaded.");
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
  log("Saving appointment…");

  try {
    const res    = await fetch(`${API}/start-web-call`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });
    const result = await res.json();

    if (!res.ok) throw new Error(result.detail || "Failed to save");

    patientData = {
      ...payload,
      appointment_id: result.appointment_id,
      status: "scheduled",
      notes:  "",
    };

    startBtn.disabled = false;
    setStatus(`✅ Saved — ${result.appointment_id}`, "saved");
    setCallStatus("Appointment ready — start the call", "saved");
    callHint.textContent = `Patient: ${payload.patient_name} • ${payload.appointment_date} at ${payload.appointment_time}`;
    callBox.classList.remove("call-active");
    log(`✅ Saved appointment: ${result.appointment_id}`);

  } catch (err) {
    setStatus("❌ " + err.message, "error");
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
    setCallStatus("Save appointment first", "error");
    return;
  }

  manualEnd         = false;
  startBtn.disabled = true;
  endBtn.disabled   = false;
  setCallStatus("Requesting microphone…");
  log("Requesting microphone…");

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop());

    setCallStatus("Connecting…");
    log("Starting Vapi call with: " + JSON.stringify(patientData));

    await vapi.start(ASSISTANT_ID, { variableValues: patientData });

    isCallActive = true;
    callBox.classList.add("call-active");
    setCallStatus("Call active", "active");
    log("✅ Call started.");

  } catch (err) {
    startBtn.disabled = false;
    endBtn.disabled   = true;
    isCallActive      = false;
    setCallStatus("Error starting call", "error");
    log("❌ START ERROR: " + (err.message || JSON.stringify(err)));
  }
}

// ─────────────────────────────────────────────
// END CALL
// ─────────────────────────────────────────────

function endCall() {
  manualEnd = true;
  if (vapi) vapi.stop();

  isCallActive      = false;
  startBtn.disabled = false;
  endBtn.disabled   = true;
  callBox.classList.remove("call-active");
  setCallStatus("Call ended");
  log("⛔ Call ended by user.");
}

// ─────────────────────────────────────────────
// GET ALL APPOINTMENTS
// ─────────────────────────────────────────────

async function getAppointments() {
  refreshAptBtn.disabled    = true;
  refreshAptBtn.textContent = "Loading…";
  appointmentsBox.innerHTML = '<div class="empty-state">Fetching…</div>';
  log("🔍 Fetching appointments…");

  try {
    const res  = await fetch(`${API}/appointments`);
    const data = await res.json();

    if (!res.ok) throw new Error("Server error");

    renderAppointments(data);
    log(`✅ Loaded ${Object.keys(data).length} appointment(s).`);

  } catch (err) {
    appointmentsBox.innerHTML = `<div class="empty-state">❌ ${err.message}</div>`;
    log("❌ GET ERROR: " + err.message);
  } finally {
    refreshAptBtn.disabled    = false;
    refreshAptBtn.textContent = "🔄 Refresh";
  }
}

// ─────────────────────────────────────────────
// LOOKUP APPOINTMENT BY ID
// ─────────────────────────────────────────────

async function lookupAppointment() {
  const rawId = lookupIdInput.value.trim().toUpperCase();
  if (!rawId) {
    showLookupResult(null, "Please enter an Appointment ID.");
    return;
  }

  lookupBtn.disabled    = true;
  lookupBtn.textContent = "Searching…";
  lookupResult.style.display = "none";
  log(`🔎 Looking up: ${rawId}`);

  try {
    const res  = await fetch(`${API}/appointments/${rawId}`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.detail || "Not found");

    showLookupResult(data, null);
    log(`✅ Found: ${rawId} — ${data.patient_name}`);

  } catch (err) {
    showLookupResult(null, err.message);
    log("❌ LOOKUP ERROR: " + err.message);
  } finally {
    lookupBtn.disabled    = false;
    lookupBtn.textContent = "Search";
  }
}

function showLookupResult(appt, errorMsg) {
  lookupResult.style.display = "block";

  if (errorMsg) {
    lookupResult.className = "lookup-result lookup-error";
    lookupResult.innerHTML = `<span class="lookup-err-icon">✕</span> ${errorMsg}`;
    return;
  }

  const sc = statusBadgeClass(appt.status       || "scheduled");
  const cc = statusBadgeClass(appt.call_status  || "pending");

  lookupResult.className = "lookup-result lookup-found";
  lookupResult.innerHTML = `
    <div class="lookup-card">
      <div class="lookup-card-header">
        <span class="lookup-id">${appt.appointment_id}</span>
        <span class="badge ${sc}">${appt.status || "scheduled"}</span>
      </div>
      <div class="lookup-grid">
        <div class="lookup-field">
          <span class="lookup-field-label">Patient</span>
          <span class="lookup-field-value">${appt.patient_name}</span>
        </div>
        <div class="lookup-field">
          <span class="lookup-field-label">Doctor</span>
          <span class="lookup-field-value">${appt.doctor_name}</span>
        </div>
        <div class="lookup-field">
          <span class="lookup-field-label">Date</span>
          <span class="lookup-field-value">${appt.appointment_date}</span>
        </div>
        <div class="lookup-field">
          <span class="lookup-field-label">Time</span>
          <span class="lookup-field-value">${appt.appointment_time}</span>
        </div>
        <div class="lookup-field">
          <span class="lookup-field-label">Phone</span>
          <span class="lookup-field-value">${appt.phone_number || "—"}</span>
        </div>
        <div class="lookup-field">
          <span class="lookup-field-label">Call</span>
          <span class="badge ${cc}">${appt.call_status || "pending"}</span>
        </div>
      </div>
      ${appt.notes ? `<div class="lookup-notes">📝 ${appt.notes}</div>` : ""}
    </div>`;
}

// ─────────────────────────────────────────────
// BUTTON EVENTS
// ─────────────────────────────────────────────

saveBtn.addEventListener("click",  saveAppointment);
startBtn.addEventListener("click", startCall);
endBtn.addEventListener("click",   endCall);
clearLogBtn.addEventListener("click", () => {
  logBox.textContent = "";
  logEmpty = true;
});

// ── Appointments toggle (header button) ──
let aptVisible = false;
getAptBtn.addEventListener("click", () => {
  aptVisible = !aptVisible;
  appointmentsCard.style.display = aptVisible ? "block" : "none";
  getAptBtn.textContent = aptVisible ? "🙈 Hide" : "📋 Appointments";
  if (aptVisible) getAppointments();
});

// ── Refresh inside appointments card ──
refreshAptBtn.addEventListener("click", getAppointments);

// ── Lookup by ID ──
lookupBtn.addEventListener("click", lookupAppointment);
lookupIdInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") lookupAppointment();
});

// ─────────────────────────────────────────────
// VAPI EVENTS
// ─────────────────────────────────────────────

if (vapi) {

  vapi.on("call-start", () => {
    isCallActive      = true;
    startBtn.disabled = true;
    endBtn.disabled   = false;
    callBox.classList.add("call-active");
    setCallStatus("Call active", "active");
    log("✅ Event: call-start");
  });

  vapi.on("call-end", () => {
    isCallActive      = false;
    startBtn.disabled = false;
    endBtn.disabled   = true;
    callBox.classList.remove("call-active");
    setCallStatus("Call ended");
    log("⛔ Event: call-end");
  });

  vapi.on("speech-start", () => log("🤖 Assistant speaking…"));
  vapi.on("speech-end",   () => log("🎤 Ready for your input."));

  vapi.on("message", (message) => {
    console.log("Vapi message:", message);

    if (message.type === "transcript") {
      const role = message.role || "unknown";
      const text = message.transcript || "";
      log(`${role === "assistant" ? "🤖" : "🎤"} [${role}]: ${text}`);
    }

    if (message.type === "tool-calls" || message.type === "function-call") {
      log("🔧 Tool call: " + JSON.stringify(message));
    }
  });

  vapi.on("error", (error) => {
    console.error("Vapi error:", error);

    const msg =
      error?.error?.errorMsg     ||
      error?.error?.message?.msg ||
      error?.message             ||
      "Unknown error";

    if (msg === "Meeting has ended") {
      setCallStatus("Call ended");
      callBox.classList.remove("call-active");
      log("Meeting ended.");
      return;
    }

    setCallStatus("Vapi error: " + msg, "error");
    log("❌ VAPI ERROR: " + msg);
    startBtn.disabled = false;
    endBtn.disabled   = false;
    isCallActive      = false;
  });
}