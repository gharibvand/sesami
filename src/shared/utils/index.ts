import { BadRequestException } from '@nestjs/common';
import { ERROR_MESSAGES } from '../constants';

export function parseTimestamp(timestamp: string): Date {
  try {
    let normalized = timestamp.trim();
    if (!normalized.includes('T')) {
      normalized = normalized.replace(' ', 'T');
      const timePart = normalized.split('T')[1] ?? '';
      const hasSeconds = /:\d{2}(?:\.|$)/.test(timePart);
      if (!hasSeconds) {
        normalized = normalized + ':00';
      }
      normalized = normalized + 'Z';
    } else {
      const hasTimezone = /[zZ]|[+\-]\d{2}:?\d{2}$/.test(normalized);
      if (!hasTimezone) {
        normalized = normalized + 'Z';
      }
    }

    const date = new Date(normalized);

    if (isNaN(date.getTime())) {
      throw new BadRequestException(
        `${ERROR_MESSAGES.INVALID_DATETIME}: ${timestamp}`,
      );
    }

    return date;
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }
    throw new BadRequestException(
      `${ERROR_MESSAGES.INVALID_DATETIME}: ${timestamp}`,
    );
  }
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
