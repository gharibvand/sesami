import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { EntityManager, LockMode } from '@mikro-orm/core';
import { Appointment } from './entities/appointment.entity';
import { AppointmentVersion } from './entities/appointment-version.entity';
import { CreateAppointmentDto } from './dto/create-appointments.dto';
import { FindAppointmentsDto } from './dto/find-appointments.dto';
import { parseTimestamp, sleep } from '../../shared/utils';

const PG_EXCLUSION_VIOLATION = '23P01';
const PG_UNIQUE_VIOLATION = '23505';
const PG_SERIALIZATION_FAILURE = '40001';
const PG_DEADLOCK_DETECTED = '40P01';

async function advisoryXactLock(em: EntityManager, key: string) {
  await em
    .getConnection()
    .execute('select pg_advisory_xact_lock(hashtext(?))', [key]);
}

@Injectable()
export class AppointmentsService {
  constructor(private readonly em: EntityManager) {}

  private validatePayload(dto: CreateAppointmentDto) {
    const orgId = dto.orgId?.trim() || 'default';

    const start = parseTimestamp(dto.start);
    const end = parseTimestamp(dto.end);
    const createdAt = parseTimestamp(dto.createdAt);
    const updatedAt = parseTimestamp(dto.updatedAt);

    if (!start || !end || !createdAt || !updatedAt) {
      throw new BadRequestException({
        code: 'INVALID_DATE_FORMAT',
        message:
          'Invalid date format. Use ISO or "YYYY-MM-DD HH:mm[:ss]" (UTC assumed) for start, end, createdAt, updatedAt.',
      });
    }
    if (start >= end) {
      throw new BadRequestException({
        code: 'INVALID_TIME_RANGE',
        message: 'start must be strictly before end.',
      });
    }
    if (createdAt > updatedAt) {
      throw new BadRequestException({
        code: 'INVALID_METADATA',
        message: 'createdAt cannot be after updatedAt.',
      });
    }

    return { orgId, start, end, createdAt, updatedAt };
  }

  async upsert(dto: CreateAppointmentDto) {
    const { orgId, start, end, createdAt, updatedAt } =
      this.validatePayload(dto);
    const externalId = dto.id;

    const maxRetries = 3;
    let attempt = 0;

    while (true) {
      try {
        return await this.em.transactional(async (tx) => {
          await advisoryXactLock(tx, `${orgId}:${externalId}`);
          const current = await tx.findOne(
            Appointment,
            { orgId, externalId },
            { lockMode: LockMode.PESSIMISTIC_WRITE },
          );

          if (current && updatedAt <= current.payloadUpdatedAt) {
            return { status: 'ignored-stale' as const };
          }

          if (!current) {
            const created = tx.create(Appointment, {
              orgId,
              externalId,
              start,
              end,
              payloadCreatedAt: createdAt,
              payloadUpdatedAt: updatedAt,
              version: 1,
            });
            tx.persist(created);

            const v = tx.create(AppointmentVersion, {
              appointment: created,
              start,
              end,
              payloadCreatedAt: createdAt,
              payloadUpdatedAt: updatedAt,
              version: 1,
            });
            tx.persist(v);

            await tx.flush();
            return { status: 'ok' as const };
          }

          current.start = start;
          current.end = end;
          current.payloadCreatedAt = createdAt;
          current.payloadUpdatedAt = updatedAt;
          current.version = current.version + 1;

          const v = tx.create(AppointmentVersion, {
            appointment: current,
            start,
            end,
            payloadCreatedAt: createdAt,
            payloadUpdatedAt: updatedAt,
            version: current.version,
          });
          tx.persist(v);

          await tx.flush();
          return { status: 'ok' as const };
        });
      } catch (err: any) {
        const code: string | undefined = err?.code;

        if (
          code === PG_EXCLUSION_VIOLATION ||
          err?.message?.includes('no_overlap_per_org')
        ) {
          throw new ConflictException({
            code: 'TIME_RANGE_UNAVAILABLE',
            message:
              'Requested time range is not available (overlaps with an existing appointment in this organization).',
          });
        }

        if (code === PG_UNIQUE_VIOLATION) {
          if (attempt < maxRetries) {
            attempt++;
            await sleep(25 * Math.pow(2, attempt));
            continue;
          }
        }

        if (
          code === PG_SERIALIZATION_FAILURE ||
          code === PG_DEADLOCK_DETECTED
        ) {
          if (attempt < maxRetries) {
            attempt++;
            await sleep(50 * Math.pow(2, attempt));
            continue;
          }
        }

        throw err;
      }
    }
  }

  async list(query: FindAppointmentsDto) {
    const orgId = (query.org || 'default').trim();

    if (!query.at) {
      return this.em.find(Appointment, { orgId });
    }

    const at = parseTimestamp(query.at);
    if (!at) {
      throw new BadRequestException({
        code: 'INVALID_DATE_FORMAT',
        message: 'Invalid "at" date format. Use ISO or "YYYY-MM-DDTHH:mm:ssZ".',
      });
    }

    return this.em.find(Appointment, {
      orgId,
      start: { $lte: at },
      end: { $gt: at },
    });
  }
}
