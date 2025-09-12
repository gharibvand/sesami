import { BadRequestException } from '@nestjs/common';
import { ERROR_MESSAGES } from '../constants';

export function parseTimestamp(input?: string): Date | null {
  if (!input) return null;
  const s = input.trim();
  if (/\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(s)) {
    const iso = s.replace(' ', 'T') + (s.length === 16 ? ':00Z' : 'Z');
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function validateAppointmentTimes(
  start: Date,
  end: Date,
  createdAt: Date,
  updatedAt: Date,
): void {
  if (start >= end) {
    throw new BadRequestException(ERROR_MESSAGES.START_AFTER_END);
  }

  if (createdAt > updatedAt) {
    throw new BadRequestException(ERROR_MESSAGES.CREATED_AFTER_UPDATED);
  }
}

export function isOverlapConstraintError(error: any): boolean {
  return (
    error?.code === '23P01' ||
    String(error?.message).includes('no_overlap_per_org')
  );
}

export async function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}
