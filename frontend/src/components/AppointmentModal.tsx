import { useState } from 'react'
import { Appointment, AppointmentUpdatePayload } from '../types'

interface AppointmentModalProps {
  appointment: Appointment
  onClose: () => void
  onUpdate: (id: string, payload: AppointmentUpdatePayload) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const formatDateTime = (isoDate: string) =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(isoDate))

const toInputValue = (isoDate: string) => {
  const date = new Date(isoDate)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

const AppointmentModal = ({ appointment, onClose, onUpdate, onDelete }: AppointmentModalProps) => {
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [rescheduleMode, setRescheduleMode] = useState(false)
  const [newTime, setNewTime] = useState(toInputValue(appointment.appointmentTime))

  const handleAction = async (action: string, payload: AppointmentUpdatePayload) => {
    setBusy(true)
    setFeedback(null)
    try {
      await onUpdate(appointment.id, payload)
      setFeedback(`${action} successful`)
      setTimeout(() => onClose(), 1500)
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  const handlePing = () => {
    handleAction('Reminder sent', {
      notes: `${appointment.notes || ''}\n[${new Date().toLocaleString()}] Provider sent reminder`,
    })
  }

  const handleReschedule = () => {
    handleAction('Rescheduled', {
      appointmentTime: new Date(newTime).toISOString(),
      status: 'Rescheduled',
      notes: `${appointment.notes || ''}\n[${new Date().toLocaleString()}] Rescheduled by provider`,
    })
  }

  const handleCancel = () => {
    handleAction('Cancelled', {
      status: 'Cancelled',
      notes: `${appointment.notes || ''}\n[${new Date().toLocaleString()}] Cancelled by provider`,
    })
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this appointment?')) {
      return
    }
    setBusy(true)
    setFeedback(null)
    try {
      await onDelete(appointment.id)
      setFeedback('Appointment deleted')
      setTimeout(() => onClose(), 1000)
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Appointment Details</h2>
            {appointment.riskLevel !== 'none' && (
              <span className={`risk-badge risk-${appointment.riskLevel}`}>
                {appointment.riskLevel.toUpperCase()} RISK
              </span>
            )}
          </div>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="detail-grid">
            <div className="detail-item">
              <p className="eyebrow">Patient</p>
              <p className="detail-value">{appointment.patientName}</p>
            </div>
            <div className="detail-item">
              <p className="eyebrow">Provider</p>
              <p className="detail-value">{appointment.providerName}</p>
            </div>
            <div className="detail-item">
              <p className="eyebrow">Date & Time</p>
              <p className="detail-value">{formatDateTime(appointment.appointmentTime)}</p>
            </div>
            <div className="detail-item">
              <p className="eyebrow">Status</p>
              <span className={`status-pill status-${appointment.status.toLowerCase()}`}>
                {appointment.status}
              </span>
            </div>
            <div className="detail-item full-width">
              <p className="eyebrow">Location</p>
              <p className="detail-value">{appointment.location}</p>
            </div>
            <div className="detail-item full-width">
              <p className="eyebrow">Visit Type</p>
              <p className="detail-value">{appointment.channel}</p>
            </div>
            <div className="detail-item full-width">
              <p className="eyebrow">Reason</p>
              <p className="detail-value">{appointment.reason}</p>
            </div>
            {appointment.notes && (
              <div className="detail-item full-width">
                <p className="eyebrow">Notes</p>
                <p className="detail-value notes-text">{appointment.notes}</p>
              </div>
            )}
          </div>

          {rescheduleMode && (
            <div className="reschedule-section">
              <label>
                <span className="eyebrow">New Date & Time</span>
                <input
                  type="datetime-local"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                />
              </label>
            </div>
          )}

          {feedback && <p className="modal-feedback">{feedback}</p>}
        </div>

        <div className="modal-actions">
          {!rescheduleMode ? (
            <>
              {appointment.status === 'Completed' ? (
                <button className="modal-btn danger" onClick={handleDelete} disabled={busy}>
                  Delete Appointment
                </button>
              ) : (
                <>
                  <button className="modal-btn primary" onClick={handlePing} disabled={busy}>
                    Send Reminder
                  </button>
                  <button
                    className="modal-btn secondary"
                    onClick={() => setRescheduleMode(true)}
                    disabled={busy}
                  >
                    Reschedule
                  </button>
                  <button className="modal-btn danger" onClick={handleCancel} disabled={busy}>
                    Cancel Appointment
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <button className="modal-btn primary" onClick={handleReschedule} disabled={busy}>
                Confirm Reschedule
              </button>
              <button
                className="modal-btn secondary"
                onClick={() => setRescheduleMode(false)}
                disabled={busy}
              >
                Back
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default AppointmentModal

