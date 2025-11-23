import { useEffect, useMemo, useState } from 'react'
import {
  Appointment,
  AppointmentFormValues,
  AppointmentUpdatePayload,
  User,
} from '../types'
import { fetchUsers } from '../api'

interface PatientFlowProps {
  currentUser: User
  appointments: Appointment[]
  loading: boolean
  onCreate: (payload: AppointmentFormValues) => Promise<void>
  onUpdate: (id: string, payload: AppointmentUpdatePayload) => Promise<void>
}

const formatDateTime = (isoDate: string) =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(isoDate))

const toInputValue = (isoDate: string) => {
  const date = new Date(isoDate)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}


const defaultAppointmentISO = () => {
  const date = new Date(Date.now() + 36 * 60 * 60 * 1000)
  return date.toISOString()
}

const PatientFlow = ({ currentUser, appointments, loading, onCreate, onUpdate }: PatientFlowProps) => {
  const [providers, setProviders] = useState<User[]>([])
  const [providersLoading, setProvidersLoading] = useState(true)
  const [formValues, setFormValues] = useState<AppointmentFormValues>({
    patientName: currentUser.fullName,
    patientUserId: currentUser.id,
    providerName: '',
    appointmentTime: defaultAppointmentISO(),
    reason: 'Specialist follow-up',
    location: '',
    channel: 'in-person',
    notes: 'Prefers SMS reminders',
  })
  const [formBusy, setFormBusy] = useState(false)
  const [rescheduleDrafts, setRescheduleDrafts] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    setFormValues((prev) => ({
      ...prev,
      patientName: currentUser.fullName,
      patientUserId: currentUser.id,
    }))
  }, [currentUser])

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const providerList = await fetchUsers('provider')
        setProviders(providerList)
        // Set first provider as default if available
        if (providerList.length > 0) {
          setFormValues((prev) => ({
            ...prev,
            providerName: providerList[0].fullName,
          }))
        }
      } catch (error) {
        console.error('Failed to load providers:', error)
      } finally {
        setProvidersLoading(false)
      }
    }
    loadProviders()
  }, [])

  const sortedAppointments = useMemo(
    () =>
      [...appointments].sort(
        (a, b) => new Date(a.appointmentTime).getTime() - new Date(b.appointmentTime).getTime(),
      ),
    [appointments],
  )

  const upcoming = useMemo(
    () => sortedAppointments.filter((appt) => !['Cancelled', 'Completed'].includes(appt.status)).slice(0, 4),
    [sortedAppointments],
  )

  const recentActivity = useMemo(
    () =>
      sortedAppointments
        .filter((appt) => ['Cancelled', 'Completed'].includes(appt.status))
        .slice(0, 4),
    [sortedAppointments],
  )

  const handleInput = (field: keyof AppointmentFormValues, value: string) => {
    if (field === 'appointmentTime') {
      const isoValue = new Date(value).toISOString()
      setFormValues((prev) => ({ ...prev, appointmentTime: isoValue }))
      return
    }
    setFormValues((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormBusy(true)
    setFeedback(null)
    try {
      await onCreate(formValues)
      setFeedback('Appointment requested. We will confirm shortly!')
      setFormValues((prev) => ({ ...prev, reason: '', notes: prev.notes }))
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to submit request.')
    } finally {
      setFormBusy(false)
    }
  }

  const handleCancel = async (appointmentId: string) => {
    try {
      await onUpdate(appointmentId, {
        status: 'Cancelled',
        notes: `Cancelled by patient on ${new Date().toLocaleDateString()}`,
      })
      setFeedback('Appointment cancelled. Let us know if you need to rebook.')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to cancel right now.')
    }
  }

  const handleReschedule = async (appointmentId: string) => {
    const nextValue = rescheduleDrafts[appointmentId]
    if (!nextValue) return
    try {
      await onUpdate(appointmentId, {
        appointmentTime: new Date(nextValue).toISOString(),
        status: 'Rescheduled',
        notes: 'Rescheduled within patient portal',
      })
      setFeedback('Appointment rescheduled.')
      setRescheduleDrafts((prev) => {
        const updated = { ...prev }
        delete updated[appointmentId]
        return updated
      })
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to reschedule right now.')
    }
  }

  return (
    <div className="flow-panel">
      <section className="flow-section hero-panel">
        <div>
          <p className="eyebrow">Welcome back</p>
          <h2>Manage your appointments</h2>
          <p className="muted">
            Book new appointments, reschedule existing ones, or cancel when needed.
          </p>
        </div>
        <div className="hero-card">
          <p className="eyebrow">Next visit</p>
          {upcoming[0] ? (
            <>
              <h3>{formatDateTime(upcoming[0].appointmentTime)}</h3>
              <p>{upcoming[0].providerName}</p>
            </>
          ) : (
            <p>No upcoming visits</p>
          )}
        </div>
      </section>

      <section className="flow-section form-panel">
        <div className="section-header">
          <h3>Request an appointment</h3>
          <p className="muted">Select your provider and preferred date and time.</p>
        </div>
        <form onSubmit={handleSubmit} className="grid-form">
          <label>
            Preferred provider
            <select
              value={formValues.providerName}
              onChange={(e) => handleInput('providerName', e.target.value)}
              disabled={providersLoading}
            >
              {providersLoading ? (
                <option>Loading providers...</option>
              ) : providers.length === 0 ? (
                <option>No providers available</option>
              ) : (
                providers.map((provider) => (
                  <option key={provider.id} value={provider.fullName}>
                    {provider.fullName}
                  </option>
                ))
              )}
            </select>
          </label>
          <label>
            Visit date &amp; time
            <input
              type="datetime-local"
              value={toInputValue(formValues.appointmentTime)}
              onChange={(e) => handleInput('appointmentTime', e.target.value)}
              required
            />
          </label>
          <label>
            Location
            <input
              value={formValues.location}
              onChange={(e) => handleInput('location', e.target.value)}
              required
            />
          </label>
          <label className="full-span">
            Visit reason
            <textarea
              value={formValues.reason}
              onChange={(e) => handleInput('reason', e.target.value)}
              rows={3}
              placeholder="Describe symptoms, goals, or any updates since your last visit."
              required
            />
          </label>
          <label className="full-span">
            Additional notes
            <textarea
              value={formValues.notes}
              onChange={(e) => handleInput('notes', e.target.value)}
              rows={2}
              placeholder="Preferred reminders, transportation needs, accessibility notes…"
            />
          </label>
          <div className="form-actions">
            <div className="view-toggle">
              <button
                type="button"
                className={formValues.channel === 'in-person' ? 'toggle-btn active' : 'toggle-btn'}
                onClick={() => handleInput('channel', 'in-person')}
              >
                In-person
              </button>
              <button
                type="button"
                className={formValues.channel === 'virtual' ? 'toggle-btn active' : 'toggle-btn'}
                onClick={() => handleInput('channel', 'virtual')}
              >
                Virtual
              </button>
            </div>
            <button type="submit" className="primary-button" disabled={formBusy}>
              {formBusy ? 'Submitting…' : 'Request appointment'}
            </button>
          </div>
          {feedback && <p className="inline-feedback">{feedback}</p>}
        </form>
      </section>

      <section className="flow-section list-panel">
        <div className="section-header">
          <h3>Upcoming appointments</h3>
          <p className="muted">View and manage your scheduled visits.</p>
        </div>
        {loading ? (
          <p>Loading appointments…</p>
        ) : (
          <div className="appointment-grid">
            {upcoming.map((appt) => (
              <article key={appt.id} className="appointment-card">
                <div>
                  <p className="eyebrow">{appt.status}</p>
                  <h4>{formatDateTime(appt.appointmentTime)}</h4>
                  <p>{appt.providerName}</p>
                </div>
                <p className="muted">{appt.reason}</p>
                <p className="muted">{appt.location}</p>
                {appt.notes && appt.notes.includes('Provider sent reminder') && (
                  <div className="reminder-notice">
                    <span>📬</span>
                    <p>Your provider sent you a reminder about this appointment</p>
                  </div>
                )}
                <div className="card-actions">
                  <button className="secondary" onClick={() => handleCancel(appt.id)}>
                    Cancel
                  </button>
                  <button
                    className="primary"
                    onClick={() =>
                      setRescheduleDrafts((prev) => ({
                        ...prev,
                        [appt.id]: rescheduleDrafts[appt.id] || toInputValue(appt.appointmentTime),
                      }))
                    }
                  >
                    Reschedule
                  </button>
                </div>
                {rescheduleDrafts[appt.id] && (
                  <div className="reschedule-row">
                    <input
                      type="datetime-local"
                      value={rescheduleDrafts[appt.id]}
                      onChange={(e) =>
                        setRescheduleDrafts((prev) => ({ ...prev, [appt.id]: e.target.value }))
                      }
                    />
                    <button className="primary" onClick={() => handleReschedule(appt.id)}>
                      Confirm
                    </button>
                  </div>
                )}
              </article>
            ))}
            {!upcoming.length && <p>No future visits booked.</p>}
          </div>
        )}
      </section>

      <section className="flow-section list-panel">
        <div className="section-header">
          <h3>Appointment history</h3>
          <p className="muted">View your past appointments.</p>
        </div>
        <div className="activity-feed">
          {recentActivity.map((appt) => (
            <div key={appt.id} className="activity-row">
              <div>
                <p className="eyebrow">{appt.status}</p>
                <p>{appt.providerName}</p>
              </div>
              <p className="muted">{formatDateTime(appt.appointmentTime)}</p>
            </div>
          ))}
          {!recentActivity.length && <p>No history yet.</p>}
        </div>
      </section>
    </div>
  )
}

export default PatientFlow


