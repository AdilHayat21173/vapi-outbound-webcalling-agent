# Maaz Dental Clinic — AI Voice Appointment Agents

This repository contains two working AI voice appointment reminder implementations built with **FastAPI**, **Vapi AI**, **Vapi Web SDK**, and **Cloudflare Tunnel** for local webhook testing.

The project demonstrates how a dental clinic can save appointment records, start AI voice conversations, pass patient appointment context to the assistant, and update appointment status when the patient confirms, cancels, reschedules, or when the call ends.

Each module has its own full README with setup instructions, architecture details, API endpoints, Vapi tool calling flow, Cloudflare usage, demo links, and testing steps.

**Click any module link below to explore the complete explanation.**

---

## Repository Modules

| Module | Description | Full Explanation |
|---|---|---|
| Web Calling Agent | Browser-based AI voice appointment reminder using **Vapi Web SDK**, **FastAPI**, and **Vite frontend**. Best for testing the assistant from the browser without a real phone call. | [Click to Explore](./Webcalling/README.md) |
| Outbound Calling Agent | Phone-based outbound appointment reminder using **FastAPI**, **Vapi outbound calls**, webhook/tool calling, and JSON updates. | [Click to Explore](./outbound/readme.md) |

---

## 1. Web Calling Agent

The **Web Calling** module uses the **Vapi Web SDK** with a Vite frontend.

Clinic staff can enter appointment details, save the appointment, and start a browser-based AI voice call. The assistant uses patient context during the call and updates `appointments.json` through Vapi tool calling.

**Main use case:** Testing the appointment reminder assistant directly from the browser without using a real phone number.

Full documentation:

[Open Web Calling README](./Webcalling/README.md)

### Web Calling Demo Videos

- [AI Voice Agent Handles Busy Patient Response](https://www.loom.com/share/34d3cec898e4406cbad00d51e983e678)
- [AI Voice Agent Cancels Dental Appointment](https://www.loom.com/share/9f6b067395134f0b8dc68c9826b6df5d)
- [AI Voice Agent Reschedules Dental Appointment](https://www.loom.com/share/f42a687c79f7463bbf8cd4412a890077)

The Web Calling module also contains a `src/` folder for frontend source files and the voice/video demo file used for showing the web calling workflow.

---

## 2. Outbound Calling Agent

The **Outbound Calling** module uses FastAPI to start outbound phone calls through Vapi.

The backend saves appointment data, sends patient context to the Vapi assistant, starts the call, and updates `appointments.json` using Vapi tool calls and webhook events.

**Main use case:** Starting real outbound appointment reminder calls using a Vapi phone number.

Full documentation:

[Open Outbound Calling README](./outbound/readme.md)

### Outbound Calling Demo Video

- [Outbound Calling Demo](https://www.loom.com/share/5a89990a6be04371a61444dc4d817e46)

During testing, international outbound calls returned a bad request error because free Vapi numbers do not support international calling. A supported US demo number was used for successful outbound call testing.

---

## Main Features

- FastAPI backend for appointment APIs
- Vapi AI assistant integration
- Vapi Web SDK browser calling
- Vapi outbound phone calling
- Context-aware conversation using patient data
- Tool calling for appointment updates
- Call-ended webhook update support
- JSON-based appointment storage
- Cloudflare Tunnel support for local webhook testing
- Separate README files for both implementations
- Loom demo videos for tested scenarios

---

## Repository Structure

```bash
project-root/
│
├── outbound/
│   ├── assets/
│   ├── appointments.json
│   ├── index.html
│   ├── main.py
│   └── readme.md
│
├── Webcalling/
│   ├── frontend/
│   ├── src/
│   ├── appointments.json
│   ├── main.py
│   └── README.md
│
├── .gitignore
└── README.md
```

> Do not push `venv/`, `__pycache__/`, `node_modules/`, `.env`, or `.exe` files to GitHub.

---

## High-Level Architecture

```text
Clinic Staff
    |
    v
Frontend / API Request
    |
    v
FastAPI Backend
    |
    v
appointments.json
    |
    v
Vapi Assistant
    |
    v
Patient Conversation
    |
    v
Vapi Tool Call / Webhook
    |
    v
FastAPI Updates Appointment Status
```

---

## Why Cloudflare Tunnel Is Used

The FastAPI backend runs locally on:

```bash
http://127.0.0.1:8000
```

This local URL works only on the developer machine. External services like Vapi cannot access `127.0.0.1`.

Vapi needs a public HTTPS endpoint for:

- Tool calling
- Webhook events
- Call-ended updates
- Updating `appointments.json` from the assistant response

Because paid cloud deployment was not used for this demo, **Cloudflare Tunnel** was used to expose the local FastAPI backend through a temporary public HTTPS URL.

Example command:

```bash
cloudflared tunnel --url http://127.0.0.1:8000
```

Cloudflare generates a URL like:

```bash
https://example-name.trycloudflare.com
```

This public URL is added in the Vapi tool/webhook configuration.

---

## Techniques Used

### Context Passing

Patient details are passed dynamically to the assistant:

```json
{
  "patient_name": "Ali Khan",
  "doctor_name": "Dr. Maaz",
  "appointment_date": "25 May 2026",
  "appointment_time": "4:30 PM",
  "appointment_id": "APT-A1B2C3"
}
```

This makes the assistant conversation personalized instead of hardcoded.

---

### Vapi Tool Calling

The assistant calls the backend tool endpoint when the appointment needs to be updated.

Example statuses:

```bash
confirmed
cancelled
rescheduled
call_ended
```

---

### JSON Storage

For demo simplicity, appointment data is stored in:

```bash
appointments.json
```

This works like a lightweight database for testing.

---

### Web Calling

The web calling module uses:

```bash
@vapi-ai/web
```

This allows the assistant to run inside the browser using the microphone.

---

### Outbound Calling

The outbound module uses the Vapi API to start phone calls using a Vapi phone number.

It sends the patient context to Vapi, starts the call, receives tool/webhook events, and updates the appointment JSON record.

---

## Basic Setup

Each module has its own detailed setup guide.

### Web Calling Setup

Open:

[Web Calling Full README](./Webcalling/README.md)

### Outbound Calling Setup

Open:

[Outbound Calling Full README](./outbound/readme.md)

---

## Environment Variables

Do not push real `.env` files to GitHub.

Example frontend `.env`:

```env
VITE_VAPI_PUBLIC_KEY=your_vapi_public_key
VITE_ASSISTANT_ID=your_vapi_assistant_id
VITE_API_URL=http://127.0.0.1:8000
```

Example backend `.env` for outbound calling:

```env
VAPI_API_KEY=your_vapi_private_api_key
ASSISTANT_ID=your_vapi_assistant_id
PHONE_NUMBER_ID=your_vapi_phone_number_id
PUBLIC_BASE_URL=https://your-cloudflare-url.trycloudflare.com
```

---

## GitHub Notes

Before pushing to GitHub, remove or ignore:

```gitignore
.env
venv/
__pycache__/
*.pyc
node_modules/
dist/
*.exe
.DS_Store
```

Do not upload:

- Real API keys
- Real `.env` files
- `node_modules`
- Python virtual environment
- `.exe` files
- Private patient data

---

## Project Status

This repository includes:

- Working web calling agent
- Working outbound calling agent
- FastAPI backend
- Vapi assistant integration
- Appointment JSON updates
- Cloudflare Tunnel setup
- Loom demo links
- Individual README files for both modules

---

## Author

**Adil Hayat**  
AI Engineer 
