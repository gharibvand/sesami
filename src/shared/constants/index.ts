export const DEFAULT_ORG_ID = 'default';
export const DEFAULT_PORT = 3000;
export const DEFAULT_HOST = '0.0.0.0';

export const API_PREFIX = 'api';
export const SWAGGER_PATH = 'api/docs';

export const EXCLUSION_CONSTRAINT_ERROR_CODE = '23P01';
export const OVERLAP_CONSTRAINT_NAME = 'no_overlap_per_org';

export const APPOINTMENT_STATUS = {
  OK: 'ok',
  IGNORED_STALE: 'ignored-stale',
} as const;

export const ERROR_MESSAGES = {
  INVALID_DATETIME: 'Invalid datetime',
  START_AFTER_END: 'start must be before end',
  CREATED_AFTER_UPDATED: 'createdAt > updatedAt',
  TIME_RANGE_NOT_AVAILABLE: 'time range not available',
  INVALID_AT_PARAMETER: 'Invalid at',
} as const;
