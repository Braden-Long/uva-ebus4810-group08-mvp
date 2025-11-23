import {
  Appointment,
  AppointmentFormValues,
  AppointmentUpdatePayload,
  LoginPayload,
  RegisterPayload,
  SummarySnapshot,
  User,
} from './types'

const API_BASE = import.meta.env.VITE_API_URL || ''

interface BackendAppointment {
  id: string
  patient_name: string
  provider_name: string
  patient_user_id?: string | null
  provider_user_id?: string | null
  appointment_time: string
  reason: string
  location: string
  channel: string
  status: string
  risk_level: string
  notes?: string | null
}

interface BackendUser {
  id: string
  full_name: string
  email: string
  role: string
  created_at: string
}

const toUser = (payload: BackendUser): User => ({
  id: payload.id,
  fullName: payload.full_name,
  email: payload.email,
  role: payload.role as User['role'],
  createdAt: payload.created_at,
})

const toFrontend = (payload: BackendAppointment): Appointment => ({
  id: payload.id,
  patientName: payload.patient_name,
  providerName: payload.provider_name,
  patientUserId: payload.patient_user_id,
  providerUserId: payload.provider_user_id,
  appointmentTime: payload.appointment_time,
  reason: payload.reason,
  location: payload.location,
  channel: payload.channel,
  status: payload.status as Appointment['status'],
  riskLevel: payload.risk_level as Appointment['riskLevel'],
  notes: payload.notes,
})

const toBackend = (payload: AppointmentFormValues | AppointmentUpdatePayload) => {
  const mapped: Record<string, unknown> = {}
  if ('patientName' in payload && payload.patientName !== undefined) mapped.patient_name = payload.patientName
  if ('providerName' in payload && payload.providerName !== undefined) mapped.provider_name = payload.providerName
  if ('patientUserId' in payload && payload.patientUserId !== undefined)
    mapped.patient_user_id = payload.patientUserId
  if ('providerUserId' in payload && payload.providerUserId !== undefined)
    mapped.provider_user_id = payload.providerUserId
  if ('appointmentTime' in payload && payload.appointmentTime !== undefined)
    mapped.appointment_time = payload.appointmentTime
  if ('reason' in payload && payload.reason !== undefined) mapped.reason = payload.reason
  if ('location' in payload && payload.location !== undefined) mapped.location = payload.location
  if ('channel' in payload && payload.channel !== undefined) mapped.channel = payload.channel
  if ('status' in payload && payload.status !== undefined) mapped.status = payload.status
  if ('riskLevel' in payload && payload.riskLevel !== undefined) mapped.risk_level = payload.riskLevel
  if ('notes' in payload && payload.notes !== undefined) mapped.notes = payload.notes
  return mapped
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed: ${response.status}`)
  }
  return response.json()
}

export async function fetchAppointments(params?: {
  status?: string
  risk?: string
  patientId?: string
  providerId?: string
}): Promise<Appointment[]> {
  const query = new URLSearchParams()
  if (params?.status) query.append('status', params.status)
  if (params?.risk) query.append('risk', params.risk)
  if (params?.patientId) query.append('patient_id', params.patientId)
  if (params?.providerId) query.append('provider_id', params.providerId)

  const response = await fetch(
    `${API_BASE}/api/appointments${query.toString() ? `?${query.toString()}` : ''}`,
  )
  const data = await handleResponse<BackendAppointment[]>(response)
  return data.map(toFrontend)
}

export async function createAppointment(payload: AppointmentFormValues): Promise<Appointment> {
  const response = await fetch(`${API_BASE}/api/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toBackend(payload)),
  })
  const data = await handleResponse<BackendAppointment>(response)
  return toFrontend(data)
}

export async function updateAppointment(
  appointmentId: string,
  payload: AppointmentUpdatePayload,
): Promise<Appointment> {
  const response = await fetch(`${API_BASE}/api/appointments/${appointmentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toBackend(payload)),
  })
  const data = await handleResponse<BackendAppointment>(response)
  return toFrontend(data)
}

export async function fetchSummary(): Promise<SummarySnapshot> {
  const response = await fetch(`${API_BASE}/api/summary`)
  return handleResponse<SummarySnapshot>(response)
}

export async function login(payload: LoginPayload): Promise<User> {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await handleResponse<BackendUser>(response)
  return toUser(data)
}

export async function register(payload: RegisterPayload): Promise<User> {
  const response = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_name: payload.fullName,
      email: payload.email,
      password: payload.password,
      role: payload.role,
    }),
  })
  const data = await handleResponse<BackendUser>(response)
  return toUser(data)
}

export async function deleteAppointment(appointmentId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/appointments/${appointmentId}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Delete failed: ${response.status}`)
  }
}

export async function fetchUsers(role?: 'patient' | 'provider'): Promise<User[]> {
  const query = new URLSearchParams()
  if (role) query.append('role', role)

  const response = await fetch(
    `${API_BASE}/api/users${query.toString() ? `?${query.toString()}` : ''}`,
  )
  const data = await handleResponse<BackendUser[]>(response)
  return data.map(toUser)
}


