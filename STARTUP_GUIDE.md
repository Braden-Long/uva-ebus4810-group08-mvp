# DocClock MVP - Quick Start Guide

Get the DocClock healthcare appointment management system running on your machine.

## Prerequisites

- **Node.js** (v18+) - [Download](https://nodejs.org/)
- **Python** (v3.10+) - [Download](https://www.python.org/downloads/)

---

## Setup Instructions

### Windows

#### 1. Start the Backend
Open PowerShell or Command Prompt:

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

✅ Backend running at **http://localhost:8000**

#### 2. Start the Frontend
Open a **NEW** terminal (keep backend running):

```powershell
cd frontend
npm install
npm run dev
```

✅ Frontend running at **http://localhost:3000**

---

### Mac/Linux

#### 1. Start the Backend
Open Terminal:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

✅ Backend running at **http://localhost:8000**

#### 2. Start the Frontend
Open a **NEW** terminal (keep backend running):

```bash
cd frontend
npm install
npm run dev
```

✅ Frontend running at **http://localhost:3000**

---

## Access the Application

Open your browser to: **http://localhost:3000**

### Demo Accounts

**Patient Portal:**
- Email: `jordan@docclock.health`
- Password: `patient123`

**Provider Portal:**
- Email: `emilia.wong@docclock.health`
- Password: `provider123`

💡 **Tip:** Click "Fill demo credentials" to auto-fill login forms

---

## What You Can Do

### Patient Portal
- Book new appointments
- View upcoming appointments
- Reschedule or cancel appointments
- Receive provider reminders

### Provider Portal
- View today's or all appointments (toggle switch)
- Click appointments for detailed view
- Send reminders to patients
- Reschedule or cancel appointments
- View risk-flagged appointments
- Delete completed appointments

---

## Stopping the Servers

Press `Ctrl + C` in each terminal window to stop the servers.

---

**That's it! You're ready to explore the MVP. 🚀**

