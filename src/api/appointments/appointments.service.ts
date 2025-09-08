import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/core';
import { Appointment } from './entities/appointment.entity';
import { AppointmentVersion } from './entities/appointment-version.entity';
import { CreateAppointmentDto } from './dto/create-appointments.dto';
import {
  DEFAULT_ORG_ID,
  ERROR_MESSAGES,
  APPOINTMENT_STATUS,
} from '../../shared';
import {
  parseTimestamp,
  validateAppointmentTimes,
  isOverlapConstraintError,
} from '../../shared';

@Injectable()
export class AppointmentsService {
  constructor(private readonly em: EntityManager) {}

  async upsert(dto: CreateAppointmentDto) {
    const orgId = dto.orgId ?? DEFAULT_ORG_ID;
    const externalId = dto.id;

    const start = parseTimestamp(dto.start);
    const end = parseTimestamp(dto.end);
    const createdAt = parseTimestamp(dto.createdAt);
    const updatedAt = parseTimestamp(dto.updatedAt);

    validateAppointmentTimes(start, end, createdAt, updatedAt);

    return this.em.transactional(async (em) => {
      const current = await em.findOne(
        Appointment,
        { orgId, externalId },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      );

      if (current && updatedAt <= current.payloadUpdatedAt) {
        return { status: APPOINTMENT_STATUS.IGNORED_STALE };
      }

      const version = (current?.version ?? 0) + 1;

      try {
        let row = current;
        if (row) {
          row.start = start;
          row.end = end;
          row.payloadCreatedAt = createdAt;
          row.payloadUpdatedAt = updatedAt;
          row.version = version;
          await em.flush();
        } else {
          row = em.create(Appointment, {
            orgId,
            externalId,
            start,
            end,
            payloadCreatedAt: createdAt,
            payloadUpdatedAt: updatedAt,
            version,
          });
          await em.persistAndFlush(row);
        }

        const ver = em.create(AppointmentVersion, {
          appointment: row,
          version,
          start,
          end,
          payloadCreatedAt: createdAt,
          payloadUpdatedAt: updatedAt,
        });
        await em.persistAndFlush(ver);

        return { status: APPOINTMENT_STATUS.OK };
      } catch (e: any) {
        if (isOverlapConstraintError(e)) {
          throw new ConflictException(ERROR_MESSAGES.TIME_RANGE_NOT_AVAILABLE);
        }
        throw e;
      }
    });
  }

  async list({ orgId, at }: { orgId?: string; at?: string }) {
    const organizationId = orgId ?? DEFAULT_ORG_ID;
    if (at) {
      const t = new Date(at);
      if (isNaN(t.getTime()))
        throw new BadRequestException(ERROR_MESSAGES.INVALID_AT_PARAMETER);
      return this.em.find(Appointment, {
        orgId: organizationId,
        start: { $lte: t },
        end: { $gt: t },
      });
    }
    return this.em.find(Appointment, { orgId: organizationId });
  }
}
