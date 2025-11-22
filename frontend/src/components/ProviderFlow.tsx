import { useMemo, useState } from 'react'
import { Appointment, AppointmentUpdatePayload, User } from '../types'
import AppointmentModal from './AppointmentModal'

interface ProviderFlowProps {
  currentUser: User
  appointments: Appointment[]
  loading: boolean
  onUpdate: (id: string, payload: AppointmentUpdatePayload) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const formatDate = (iso: string, withTime = false) =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(new Date(iso))

const ProviderFlow = ({ currentUser, appointments, loading, onUpdate, onDelete }: ProviderFlowProps) => {
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'today' | 'all'>('today')
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

  const flagged = useMemo(
    () =>
      appointments.filter(
        (appt) =>
          appt.riskLevel !== 'none' &&
          ['Scheduled', 'Rescheduled'].includes(appt.status),
      ),
    [appointments],
  )

  const today = useMemo(() => {
    const todayStr = new Date().toDateString()
    return appointments.filter(
      (appt) =>
        new Date(appt.appointmentTime).toDateString() === todayStr &&
        appt.status !== 'Cancelled',
    )
  }, [appointments])

  const cancelled = useMemo(
    () =>
      appointments.filter(
        (appt) =>
          appt.status === 'Cancelled' &&
          Date.now() - new Date(appt.appointmentTime).getTime() < 7 * 24 * 60 * 60 * 1000,
      ),
    [appointments],
  )

  const groupedSchedule = useMemo(() => {
    const map = new Map<string, { label: string; dateKey: number; items: Appointment[] }>()
    const todayStr = new Date().toDateString()
    
    appointments
      .filter((appt) => {
        if (appt.status === 'Cancelled') return false
        if (viewMode === 'today') {
          return new Date(appt.appointmentTime).toDateString() === todayStr
        }
        return true
      })
      .forEach((appt) => {
        const day = new Date(appt.appointmentTime)
        const key = day.toDateString()
        const entry = map.get(key) ?? {
          label: formatDate(appt.appointmentTime),
          dateKey: new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime(),
          items: [],
        }
        entry.items.push(appt)
        map.set(key, entry)
      })
    return Array.from(map.values()).sort((a, b) => a.dateKey - b.dateKey)
  }, [appointments, viewMode])

  const handleUpdate = async (id: string, payload: AppointmentUpdatePayload, message: string) => {
    setActionMessage(null)
    try {
      await onUpdate(id, payload)
      setActionMessage(message)
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Update failed.')
    }
  }

  return (
    <div className="flow-panel provider-flow">
      <section className="flow-section hero-panel">
        <div>
          <p className="eyebrow">Provider Dashboard</p>
          <h2>Manage your schedule and patient appointments</h2>
          <p className="muted">
            Welcome back, {currentUser.fullName}. Monitor appointments, track cancellations, and manage your daily schedule.
          </p>
        </div>
        <div className="hero-card">
          <p className="eyebrow">Today&apos;s load</p>
          <h3>{today.length} visits</h3>
          <p>{flagged.length} flagged as no-show risk</p>
        </div>
      </section>

      <section className="flow-section metrics-panel">
        <div className="metric-card">
          <p className="eyebrow">Active</p>
          <h3>
            {
              appointments.filter((appt) =>
                ['Scheduled', 'Rescheduled', 'CheckedIn'].includes(appt.status),
              ).length
            }
          </h3>
          <p className="muted">Bookings ahead</p>
        </div>
        <div className="metric-card">
          <p className="eyebrow">Flagged</p>
          <h3>{flagged.length}</h3>
          <p className="muted">Require outreach</p>
        </div>
        <div className="metric-card">
          <p className="eyebrow">Cancelled this week</p>
          <h3>{cancelled.length}</h3>
          <p className="muted">Slots to backfill</p>
        </div>
      </section>

      <section className="flow-section list-panel">
        <div className="section-header">
          <h3>Flagged appointments</h3>
          <p className="muted">Prioritize check-ins with patients likely to miss their visit.</p>
        </div>
        {loading ? (
          <p>Loading risk data…</p>
        ) : (
          <div className="appointment-grid">
            {flagged.map((appt) => (
              <article key={appt.id} className={`appointment-card risk-${appt.riskLevel}`}>
                <div>
                  <p className="eyebrow">
                    {appt.riskLevel.toUpperCase()} risk · {appt.status}
                  </p>
                  <h4>{appt.patientName}</h4>
                  <p>{formatDate(appt.appointmentTime, true)}</p>
                  <p className="muted">{appt.reason}</p>
                </div>
                <div className="card-actions stacked">
                  <button
                    className="primary"
                    onClick={() =>
                      handleUpdate(
                        appt.id,
                        { notes: `Reminder sent ${new Date().toLocaleTimeString()}` },
                        'Reminder noted.',
                      )
                    }
                  >
                    Send reminder
                  </button>
                  <button
                    className="secondary"
                    onClick={() =>
                      handleUpdate(
                        appt.id,
                        { status: 'CheckedIn' },
                        `${appt.patientName} checked in.`,
                      )
                    }
                  >
                    Mark checked in
                  </button>
                </div>
              </article>
            ))}
            {!flagged.length && <p>Nothing flagged. All patients recently confirmed.</p>}
          </div>
        )}
        {actionMessage && <p className="inline-feedback">{actionMessage}</p>}
      </section>

      <section className="flow-section list-panel">
        <div className="section-header">
          <div>
            <h3>Schedule board</h3>
            <p className="muted">View and manage your appointment schedule.</p>
          </div>
          <div className="view-toggle">
            <button
              className={viewMode === 'today' ? 'toggle-btn active' : 'toggle-btn'}
              onClick={() => setViewMode('today')}
            >
              Today
            </button>
            <button
              className={viewMode === 'all' ? 'toggle-btn active' : 'toggle-btn'}
              onClick={() => setViewMode('all')}
            >
              All appointments
            </button>
          </div>
        </div>
        <div className="timeline-board">
          {groupedSchedule.map(({ label, items }) => (
            <div key={label} className="timeline-day">
              <p className="eyebrow">{label}</p>
              {items
                .sort(
                  (a, b) =>
                    new Date(a.appointmentTime).getTime() - new Date(b.appointmentTime).getTime(),
                )
                .map((appt) => (
                  <div
                    key={appt.id}
                    className="timeline-card clickable"
                    onClick={() => setSelectedAppointment(appt)}
                  >
                    <div>
                      <strong>{formatDate(appt.appointmentTime, true)}</strong>
                      <p>{appt.patientName}</p>
                      <p className="muted">{appt.reason}</p>
                    </div>
                    <div className="timeline-actions">
                      {appt.riskLevel !== 'none' && (
                        <span className={`risk-badge risk-${appt.riskLevel}`}>
                          {appt.riskLevel.toUpperCase()}
                        </span>
                      )}
                      <span className={`status-pill status-${appt.status.toLowerCase()}`}>
                        {appt.status}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          ))}
          {!groupedSchedule.length && <p>No appointments scheduled.</p>}
        </div>
      </section>

      {selectedAppointment && (
        <AppointmentModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      )}
    </div>
  )
}

export default ProviderFlow


