export type AppointmentStatus = 'ok' | 'ignored-stale';

export interface AppointmentListParams {
  orgId?: string;
  at?: string;
}

export interface DatabaseError extends Error {
  code?: string;
  constraint?: string;
}

export interface ParsedAppointmentData {
  start: Date;
  end: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationContext {
  orgId: string;
}
