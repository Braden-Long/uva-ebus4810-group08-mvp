# DocClock MVP

Healthcare appointment optimization prototype with a FastAPI backend and a React + TypeScript frontend that showcases both patient and provider flows. The experience mirrors the attached Figma concept: patients can book/reschedule/cancel visits, while providers triage flagged no-show risks, view cancellations, and manage the live schedule. Access now begins with an authentication layer so each role lands in the appropriate portal.

## Project Structure

```
.
├── backend/          # Python FastAPI backend
│   ├── main.py      # FastAPI application
│   └── requirements.txt
├── frontend/         # React + TypeScript frontend
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - Windows:
     ```bash
     venv\Scripts\activate
     ```
   - macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Run the server:
   ```bash
   uvicorn main:app --reload
   ```

   The API will be available at `http://localhost:8000`
   - API docs: `http://localhost:8000/docs`
   - Alternative docs: `http://localhost:8000/redoc`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:3000`

## Development

- Backend runs on port `8000`
- Frontend runs on port `3000`
- The frontend is configured to proxy API requests to the backend
- Both servers support hot-reload during development

## API Surface (FastAPI)

- `POST /api/auth/register` – create patient or provider credentials (persisted to `backend/data/users.json`)
- `POST /api/auth/login` – authenticate into the correct portal
- `GET /api/appointments` – list appointments (filters: `status`, `risk`, `patient_id`, `provider_id`)
- `GET /api/appointments/{id}` – fetch a single appointment
- `POST /api/appointments` – create or request a booking (enforces patient/provider ids)
- `PATCH /api/appointments/{id}` – update status, notes, assignees, or time
- `GET /api/summary` – aggregate counts used by provider analytics
- `GET /health` – service heartbeat

Appointments and users are now written to JSON files inside `backend/data/`, so new sign-ups and bookings persist across restarts without introducing a full database. Seeded demo credentials:

- Patient: `jordan@docclock.health` / `patient123`
- Provider: `emilia.wong@docclock.health` / `provider123`

## Frontend Highlights

- Login gate that asks whether you are a patient or provider, then routes you to the relevant portal
- Patient capabilities: create appointments (auto-tagged to their account), reschedule via datetime picker, cancel with one click, and view recent activity
- Provider console: risk queue filtered to their patients, reminder logging, quick status changes (checked-in / completed), and a grouped timeline of the week
- Responsive layout built with modern CSS (no component library) so it renders cleanly on mobile and desktop

## Future Enhancements

- Replace the in-memory store with a relational database
- Add authentication and role-based routing
- Implement the predictive model that drives the no-show risk signals
- Integrate messaging providers for SMS/email reminders

## Tech Stack

### Backend
- FastAPI - Modern Python web framework
- Uvicorn - ASGI server

### Frontend
- React 18 - UI library
- TypeScript - Type safety
- Vite - Build tool and dev server

