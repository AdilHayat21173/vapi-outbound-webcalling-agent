# Maaz Dental Clinic — AI Voice Appointment Agent

A working AI voice appointment reminder system built with **FastAPI**, **Vapi Web SDK**, and a **Vite frontend**.

The application allows clinic staff to save patient appointment details, start a browser-based AI voice call, and automatically update the appointment record when the patient confirms, cancels, or requests rescheduling.

---

## Project Highlights

- Complete FastAPI backend
- Vapi Web SDK integration
- Context-aware appointment reminder conversation
- Appointment status update using Vapi tool calling
- Local development support using Cloudflare Tunnel
- Setup instructions and architecture explanation
---

## Project Overview

This project is designed for a dental clinic appointment reminder workflow.

The clinic staff enters patient details in the frontend. The frontend sends the appointment data to the FastAPI backend. The backend saves the appointment in `appointments.json` and returns an appointment ID.

After saving the appointment, the staff can start a Vapi web call from the browser. The Vapi assistant receives the appointment context, talks to the patient, and calls the backend tool webhook when the appointment needs to be updated.

Supported patient scenarios:

- Patient confirms the appointment
- Patient cancels the appointment
- Patient requests rescheduling
- Patient asks for appointment information

---

## Demo Videos

The following Loom videos show the Vapi web calling agent working in different appointment scenarios:

### 1. Busy Patient Response

[AI Voice Agent Handles Busy Patient Response](https://www.loom.com/share/34d3cec898e4406cbad00d51e983e678)

### 2. Appointment Cancellation

[AI Voice Agent Cancels Dental Appointment](https://www.loom.com/share/9f6b067395134f0b8dc68c9826b6df5d)

### 3. Appointment Rescheduling

[AI Voice Agent Reschedules Dental Appointment](https://www.loom.com/share/f42a687c79f7463bbf8cd4412a890077)

---

## Voice Demo File

The project also includes a voice/video demo file inside the `src/` folder. This file is used to show or store the recorded voice-call demo for the web calling workflow.

---

## Tech Stack

### Backend

- Python
- FastAPI
- Pydantic
- Uvicorn
- JSON file storage

### Frontend

- Vite
- JavaScript
- HTML/CSS
- `@vapi-ai/web`

### Voice AI

- Vapi AI Assistant
- Vapi Web SDK
- Vapi tool calling webhook

### Temporary Public URL

- Cloudflare Tunnel

---

## Folder Structure

```bash
Webcalling/
│
├── main.py
├── appointments.json
├── README.md
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── package-lock.json
    ├── .env.example
    └── src/
        ├── main.js
        ├── style.css
        └── voice-demo-video-file
```

> Note: The `src/` folder also contains the voice/video demo file used for showing the web calling result.

> Note: Do not push `node_modules/`, `__pycache__/`, or real `.env` files to GitHub.

---

## Environment Variables

Create a `.env` file inside the `frontend/` folder.

```env
VITE_VAPI_PUBLIC_KEY=your_vapi_public_key
VITE_ASSISTANT_ID=your_vapi_assistant_id
VITE_API_URL=http://127.0.0.1:8000
```

When using Cloudflare Tunnel, replace `VITE_API_URL` with your Cloudflare HTTPS URL:

```env
VITE_API_URL=https://your-cloudflare-url.trycloudflare.com
```

Important:

- Use `VITE_` prefix for Vite frontend environment variables.
- Only use the **Vapi public key** in frontend code.
- Never expose a Vapi private key in frontend code or GitHub.
- Add real `.env` files to `.gitignore`.

---

## Backend Setup

### 1. Create and activate virtual environment

```bash
python -m venv venv
```

For Windows:

```bash
venv\Scripts\activate
```

For macOS/Linux:

```bash
source venv/bin/activate
```

### 2. Install backend dependencies

```bash
pip install fastapi uvicorn pydantic
```

### 3. Run FastAPI backend

From the project root:

```bash
uvicorn main:app --reload
```

The backend will run on:

```bash
http://127.0.0.1:8000
```

API documentation is available at:

```bash
http://127.0.0.1:8000/docs
```

---

## Frontend Setup

Go to the frontend folder:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Run the frontend:

```bash
npm run dev
```

The Vite frontend will run on a local URL similar to:

```bash
http://localhost:5173
```

---

## Why Cloudflare Tunnel Is Used

The FastAPI backend runs locally on:

```bash
http://127.0.0.1:8000
```

This local URL works on the developer machine, but it cannot be accessed by external services like Vapi.

Vapi tool calling needs a public HTTPS endpoint so the assistant can call the backend webhook:

```bash
POST /webhook/tool-call
```

Because this project does not use paid cloud hosting for deployment, **Cloudflare Tunnel** is used as a temporary public HTTPS URL for the local FastAPI server.

Cloudflare Tunnel allows Vapi to reach the local backend during testing without deploying the backend to a paid cloud server.

Example:

```bash
Local FastAPI:
http://127.0.0.1:8000

Cloudflare public URL:
https://your-cloudflare-url.trycloudflare.com
```

The Cloudflare URL is then used in the Vapi tool server URL so Vapi can call the FastAPI webhook.

### Why this is useful for demo/testing

- No paid cloud server is required
- The local FastAPI backend can be tested with Vapi
- Vapi can access the webhook through HTTPS
- Tool calling can update `appointments.json` during the live web call

### Production note

Cloudflare Tunnel is used only for demo/testing. In production, the FastAPI backend should be deployed permanently on a server such as:

- Render
- Railway
- AWS
- Azure
- Google Cloud
- DigitalOcean

---

## Cloudflare Tunnel Setup

Install and run Cloudflare Tunnel for the FastAPI backend:

```bash
cloudflared tunnel --url http://127.0.0.1:8000
```

Cloudflare will generate a temporary HTTPS URL like:

```bash
https://example-name.trycloudflare.com
```

Use this URL in Vapi tool configuration:

```bash
https://example-name.trycloudflare.com/webhook/tool-call
```

Also update the frontend `.env` if the frontend needs to call the public backend URL:

```env
VITE_API_URL=https://example-name.trycloudflare.com
```

> Important: Free Cloudflare Tunnel URLs can change every time the tunnel restarts. If the URL changes, update it in Vapi and frontend `.env`.

---

## API Endpoints

### Health Check

```http
GET /health
```

Returns backend running status.

Example response:

```json
{
  "status": "running"
}
```

---

### Start Web Call / Save Appointment

```http
POST /start-web-call
```

The frontend sends patient appointment details to the backend. The backend saves the appointment and returns an appointment ID.

Example request:

```json
{
  "patient_name": "Ali Khan",
  "phone_number": "+923001234567",
  "doctor_name": "Dr. Maaz",
  "appointment_date": "25 May 2026",
  "appointment_time": "4:30 PM"
}
```

Example response:

```json
{
  "success": true,
  "appointment_id": "APT-A1B2C3"
}
```

---

### Create Appointment

```http
POST /appointments
```

Creates a new appointment record.

---

### Get All Appointments

```http
GET /appointments
```

Returns all saved appointment records from `appointments.json`.

---

### Get Single Appointment

```http
GET /appointments/{appointment_id}
```

Returns one appointment using its appointment ID.

---

### Delete Appointment

```http
DELETE /appointments/{appointment_id}
```

Deletes an appointment record.

---

### Vapi Tool Webhook

```http
POST /webhook/tool-call
```

This endpoint is called by Vapi when the assistant uses the `update_appointment` tool.

The backend reads the tool call arguments and updates the matching appointment in `appointments.json`.

---

## Vapi Tool Calling

The assistant uses a tool called:

```bash
update_appointment
```

The tool sends updated appointment data to the FastAPI webhook.

Example tool arguments:

```json
{
  "appointment_id": "APT-A1B2C3",
  "status": "confirmed",
  "notes": "Patient confirmed the appointment."
}
```

For rescheduling:

```json
{
  "appointment_id": "APT-A1B2C3",
  "status": "rescheduled",
  "appointment_date": "26 May 2026",
  "appointment_time": "6:00 PM",
  "notes": "Patient requested a new appointment time."
}
```

For cancellation:

```json
{
  "appointment_id": "APT-A1B2C3",
  "status": "cancelled",
  "notes": "Patient cancelled the appointment."
}
```

---

## Context-Aware Conversation

The assistant receives appointment context from the frontend when the web call starts.

Example context:

```json
{
  "appointment_id": "APT-A1B2C3",
  "patient_name": "Ali Khan",
  "phone_number": "+923001234567",
  "doctor_name": "Dr. Maaz",
  "appointment_date": "25 May 2026",
  "appointment_time": "4:30 PM"
}
```

This allows the assistant to speak naturally using the correct patient name, doctor name, appointment date, appointment time, and appointment ID.

Example assistant message:

```text
Hello, this is Adil Hayat calling from Maaz Dental Clinic. Am I speaking with Ali Khan?
```

Then:

```text
I am calling to remind you about your dental appointment with Dr. Maaz on 25 May 2026 at 4:30 PM. Are you still able to make it?
```

---

## Conversation Flow

### 1. Identity Confirmation

The assistant confirms that it is speaking with the correct patient.

### 2. Appointment Reminder

The assistant reminds the patient about the doctor, date, and time.

### 3. Patient Response Handling

The assistant handles three main scenarios:

#### Confirm Appointment

Patient says they can attend.

Backend status update:

```json
{
  "status": "confirmed"
}
```

#### Cancel Appointment

Patient says they cannot attend and wants to cancel.

Backend status update:

```json
{
  "status": "cancelled"
}
```

#### Reschedule Appointment

Patient asks for a different date or time.

Backend status update:

```json
{
  "status": "rescheduled",
  "appointment_date": "new date",
  "appointment_time": "new time"
}
```

---

## Architecture Overview

```text
Clinic Staff
    |
    v
Vite Frontend
    |
    | 1. Save appointment
    v
FastAPI Backend
    |
    | 2. Store appointment
    v
appointments.json
    |
    v
Vapi Web SDK
    |
    | 3. Start browser voice call
    v
Vapi Assistant
    |
    | 4. Patient confirms / cancels / reschedules
    v
Vapi Tool Call
    |
    | 5. Public HTTPS webhook through Cloudflare Tunnel
    v
FastAPI /webhook/tool-call
    |
    | 6. Update appointment status
    v
appointments.json
```

---

## Design Decisions

### FastAPI for backend

FastAPI was selected because it is lightweight, fast, and easy to structure for REST APIs and webhook-based systems. It also provides automatic Swagger documentation at `/docs`.

### Vapi Web SDK for demo calls

The project uses Vapi Web SDK so the evaluator can test the AI assistant directly from the browser. This avoids the need for paid international outbound phone calling during demo testing.

### Cloudflare Tunnel for public webhook access

Vapi must call the backend webhook from its own servers. A local backend URL like `127.0.0.1` cannot be accessed by Vapi. Cloudflare Tunnel solves this by exposing the local FastAPI backend through a temporary HTTPS URL.

### JSON file storage

For the demo, appointment data is stored in `appointments.json`. This keeps the project simple and easy to test. In production, this can be replaced with PostgreSQL, MySQL, MongoDB, or another database.

### Context-aware assistant

The assistant does not use hardcoded patient information. The frontend sends dynamic appointment data, and the assistant uses that context during the call.

### Tool calling for real updates

The assistant does not only speak responses. It also calls the backend tool webhook to update appointment status in the stored records.

---

## Testing Scenarios

### Scenario 1: Confirm Appointment

Patient says:

```text
Yes, I will come.
```

Expected backend update:

```json
{
  "status": "confirmed"
}
```

---

### Scenario 2: Cancel Appointment

Patient says:

```text
No, please cancel it.
```

Expected backend update:

```json
{
  "status": "cancelled"
}
```

---

### Scenario 3: Reschedule Appointment

Patient says:

```text
Can I reschedule it to tomorrow at 6 PM?
```

Expected backend update:

```json
{
  "status": "rescheduled",
  "appointment_date": "tomorrow",
  "appointment_time": "6 PM"
}
```

---

## How to Test the Full Flow

1. Start the FastAPI backend:

```bash
uvicorn main:app --reload
```

2. Start Cloudflare Tunnel:

```bash
cloudflared tunnel --url http://127.0.0.1:8000
```

3. Copy the generated Cloudflare HTTPS URL.

4. Add the webhook URL in Vapi tool/server configuration:

```bash
https://your-cloudflare-url.trycloudflare.com/webhook/tool-call
```

5. Start the frontend:

```bash
cd frontend
npm install
npm run dev
```

6. Fill in patient details.

7. Save the appointment.

8. Start the web call.

9. Respond as the patient:

```text
Yes, I will come.
```

or

```text
Please cancel my appointment.
```

or

```text
I want to reschedule it.
```

10. Check the updated appointment record in the frontend or in `appointments.json`.

---

## GitHub Submission Notes

Before pushing to GitHub, remove these folders/files from the repository:

```bash
node_modules/
__pycache__/
.env
```

Add this to `.gitignore`:

```gitignore
# Python
__pycache__/
*.pyc
venv/
.env

# Node
node_modules/
dist/

# Local files
appointments.json
```

If you want to keep sample appointment data, create a separate file:

```bash
appointments.example.json
```

Do not upload real API keys or private patient data.

---

---

## Author

**Adil Hayat**

AI Engineer 