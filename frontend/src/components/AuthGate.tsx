import { FormEvent, useMemo, useState } from 'react'
import { login, register } from '../api'
import { User, UserRole } from '../types'

interface AuthGateProps {
  onAuthenticated: (user: User) => void
}

type AuthMode = 'login' | 'register'

const credentialHints: Record<UserRole, { email: string; password: string }> = {
  patient: { email: 'jordan@docclock.health', password: 'patient123' },
  provider: { email: 'sarah.mitchell@docclock.health', password: 'provider123' },
}

const AuthGate = ({ onAuthenticated }: AuthGateProps) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [mode, setMode] = useState<AuthMode>('login')
  const [formValues, setFormValues] = useState({
    fullName: '',
    email: '',
    password: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const heading = useMemo(() => {
    if (!selectedRole) return 'Choose your portal'
    const noun = selectedRole === 'patient' ? 'Patient' : 'Provider'
    return `${noun} sign ${mode === 'login' ? 'in' : 'up'}`
  }, [selectedRole, mode])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedRole) {
      setError('Select a portal to continue.')
      return
    }
    if (mode === 'register' && !formValues.fullName.trim()) {
      setError('Full name is required to create an account.')
      return
    }

    setBusy(true)
    setError(null)

    try {
      const user =
        mode === 'login'
          ? await login({ email: formValues.email, password: formValues.password, role: selectedRole })
          : await register({
              fullName: formValues.fullName.trim(),
              email: formValues.email,
              password: formValues.password,
              role: selectedRole,
            })
      onAuthenticated(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to authenticate right now.')
    } finally {
      setBusy(false)
    }
  }

  const autoFillDemo = (role: UserRole) => {
    const creds = credentialHints[role]
    setSelectedRole(role)
    setMode('login')
            setFormValues({
              fullName: role === 'patient' ? 'Jordan Carter' : 'Dr. Sarah Mitchell',
              email: creds.email,
              password: creds.password,
            })
    setError(null)
  }

  const resetForm = () => {
    setFormValues({ fullName: '', email: '', password: '' })
    setError(null)
  }

  return (
    <div className="auth-panel">
      <div>
        <p className="eyebrow">DocClock</p>
        <h2>{heading}</h2>
        <p className="muted">
          Access your appointments and manage your healthcare schedule.
        </p>
      </div>

      <div className="role-grid">
        <button
          type="button"
          className={selectedRole === 'patient' ? 'role-card active' : 'role-card'}
          onClick={() => {
            setSelectedRole('patient')
            setMode('login')
            resetForm()
          }}
        >
          <h3>Patient Portal</h3>
        </button>
        <button
          type="button"
          className={selectedRole === 'provider' ? 'role-card active' : 'role-card'}
          onClick={() => {
            setSelectedRole('provider')
            setMode('login')
            resetForm()
          }}
        >
          <h3>Provider Portal</h3>
        </button>
      </div>

      {selectedRole && (
        <div className="auth-card">
          <div className="auth-tabs">
            <button className={mode === 'login' ? 'tab active' : 'tab'} onClick={() => setMode('login')}>
              Sign in
            </button>
            <button
              className={mode === 'register' ? 'tab active' : 'tab'}
              onClick={() => setMode('register')}
            >
              Create account
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <label>
                Full name
                <input
                  type="text"
                  value={formValues.fullName}
                  onChange={(event) =>
                    setFormValues((prev) => ({ ...prev, fullName: event.target.value }))
                  }
                          placeholder={selectedRole === 'patient' ? 'Jordan Carter' : 'Dr. Sarah Mitchell'}
                  required
                />
              </label>
            )}
            <label>
              Email
              <input
                type="email"
                value={formValues.email}
                onChange={(event) => setFormValues((prev) => ({ ...prev, email: event.target.value }))}
                placeholder={credentialHints[selectedRole].email}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={formValues.password}
                onChange={(event) => setFormValues((prev) => ({ ...prev, password: event.target.value }))}
                placeholder={credentialHints[selectedRole].password}
                required
                minLength={6}
              />
            </label>

            {error && <p className="banner error">{error}</p>}

            <button type="submit" className="primary-button" disabled={busy}>
              {busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>

            <button type="button" className="ghost-button" onClick={() => autoFillDemo(selectedRole)}>
              Fill demo credentials
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default AuthGate


