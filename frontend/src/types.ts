export type AppointmentStatus = 'Scheduled' | 'Rescheduled' | 'CheckedIn' | 'Completed' | 'Cancelled'

export type RiskLevel = 'none' | 'low' | 'medium' | 'high'

export type UserRole = 'patient' | 'provider'

export interface User {
  id: string
  fullName: string
  email: string
  role: UserRole
  createdAt: string
}

export interface Appointment {
  id: string
  patientName: string
  providerName: string
  patientUserId?: string | null
  providerUserId?: string | null
  appointmentTime: string
  reason: string
  location: string
  channel: string
  status: AppointmentStatus
  riskLevel: RiskLevel
  notes?: string | null
}

export interface AppointmentFormValues {
  patientName: string
  providerName: string
  patientUserId?: string | null
  providerUserId?: string | null
  appointmentTime: string
  reason: string
  location: string
  channel: string
  notes?: string
}

export type AppointmentUpdatePayload = Partial<
  Pick<
    Appointment,
    | 'appointmentTime'
    | 'status'
    | 'riskLevel'
    | 'notes'
    | 'reason'
    | 'patientUserId'
    | 'providerUserId'
  >
>

export interface SummarySnapshot {
  total: number
  active: number
  cancelled: number
  completed: number
  risk_breakdown: Record<RiskLevel, number>
}

export interface LoginPayload {
  email: string
  password: string
  role: UserRole
}

export interface RegisterPayload extends LoginPayload {
  fullName: string
}


