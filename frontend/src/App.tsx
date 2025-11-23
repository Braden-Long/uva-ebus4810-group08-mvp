import { useEffect, useMemo, useState } from 'react'
import './App.css'
import AuthGate from './components/AuthGate'
import PatientFlow from './components/PatientFlow'
import ProviderFlow from './components/ProviderFlow'
import LoadingOverlay from './components/LoadingOverlay'
import { Appointment, AppointmentFormValues, AppointmentUpdatePayload, User } from './types'
import { createAppointment, deleteAppointment, fetchAppointments, updateAppointment, clearToken } from './api'
import { useSlowLoading } from './hooks/useSlowLoading'

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const { showSlowLoading, withSlowLoading } = useSlowLoading()

  const flowLabel = useMemo(() => {
    if (!currentUser) return 'Select a portal'
    return currentUser.role === 'patient' ? 'Patient scheduling' : 'Provider console'
  }, [currentUser])

  const filtersForUser = (user: User) =>
    user.role === 'patient' ? { patientId: user.id } : { providerId: user.id }

  const loadAppointments = async (user: User | null = currentUser) => {
    if (!user) return
    setLoading(true)
    try {
      const data = await withSlowLoading(fetchAppointments(filtersForUser(user)))
      setAppointments(data)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Unable to reach scheduling API.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!currentUser) {
      setAppointments([])
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    loadAppointments(currentUser)
  }, [currentUser])

  const handleCreate = async (payload: AppointmentFormValues) => {
    await withSlowLoading(createAppointment(payload))
    await loadAppointments(currentUser)
  }

  const handleUpdate = async (id: string, payload: AppointmentUpdatePayload) => {
    await withSlowLoading(updateAppointment(id, payload))
    await loadAppointments(currentUser)
  }

  const handleDelete = async (id: string) => {
    await withSlowLoading(deleteAppointment(id))
    await loadAppointments(currentUser)
  }

  const handleLogout = () => {
    clearToken()
    setCurrentUser(null)
    setAppointments([])
    setLastUpdated(null)
  }

  if (!currentUser) {
    return (
      <div className="auth-shell">
        <AuthGate onAuthenticated={setCurrentUser} />
      </div>
    )
  }

  return (
    <>
      <div className="app-shell">
        <header className="top-bar">
          <div>
            <p className="eyebrow">DocClock</p>
            <h1>Healthcare appointment management</h1>
            <p className="muted">{flowLabel}</p>
          </div>
          <div className="top-actions">
            <div className="user-chip">
              <span>{currentUser.fullName}</span>
              <span>{currentUser.role}</span>
            </div>
            <button className="ghost-button" onClick={handleLogout}>
              Sign out
            </button>
            {lastUpdated && (
              <span className="updated-at">
                Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </header>
        {error && <div className="banner error">{error}</div>}
        <main>
          {currentUser.role === 'patient' ? (
            <PatientFlow
              currentUser={currentUser}
              appointments={appointments}
              loading={loading}
              onCreate={handleCreate}
              onUpdate={handleUpdate}
            />
          ) : (
            <ProviderFlow
              currentUser={currentUser}
              appointments={appointments}
              loading={loading}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          )}
        </main>
      </div>
      <LoadingOverlay show={showSlowLoading} />
    </>
  )
}

export default App

