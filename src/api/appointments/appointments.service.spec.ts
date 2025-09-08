import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager, LockMode } from '@mikro-orm/core';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { Appointment } from './entities/appointment.entity';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let em: jest.Mocked<EntityManager>;

  beforeEach(async () => {
    const mockEm: Partial<jest.Mocked<EntityManager>> = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      persistAndFlush: jest.fn(),
      flush: jest.fn(),
      transactional: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        {
          provide: EntityManager,
          useValue: mockEm,
        },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
    em = module.get(EntityManager) as jest.Mocked<EntityManager>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const validDto = {
    id: '1',
    start: '2020-10-10 20:20',
    end: '2020-10-10 20:30',
    createdAt: '2020-09-02 14:23:12',
    updatedAt: '2020-09-28 14:23:12',
  };

  describe('upsert', () => {
    it('creates a new appointment (no current row)', async () => {
      em.transactional.mockImplementation(async (cb: any) => {
        em.findOne.mockResolvedValue(null as any);
        (em.create as any).mockReturnValue({} as any);
        em.persistAndFlush.mockResolvedValue(undefined as any);
        return cb(em);
      });

      const res = await service.upsert(validDto);
      expect(res).toEqual({ status: 'ok' });
      expect(em.findOne).toHaveBeenCalledWith(
        Appointment,
        { orgId: 'default', externalId: '1' },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      );
      expect(em.persistAndFlush).toHaveBeenCalled();
    });

    it('rejects invalid date format', async () => {
      em.transactional.mockImplementation(async (cb: any) => cb(em));

      await expect(
        service.upsert({ ...validDto, start: '2020-10-10 25:61' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when start >= end', async () => {
      em.transactional.mockImplementation(async (cb: any) => cb(em));

      await expect(
        service.upsert({
          ...validDto,
          start: '2020-10-10 20:30',
          end: '2020-10-10 20:20',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when createdAt > updatedAt', async () => {
      em.transactional.mockImplementation(async (cb: any) => cb(em));

      await expect(
        service.upsert({
          ...validDto,
          createdAt: '2020-10-01 14:23:12',
          updatedAt: '2020-09-28 14:23:12',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ignores stale updates (same/older updatedAt)', async () => {
      const current = {
        payloadUpdatedAt: new Date('2020-09-29 14:23:12'),
      } as Appointment;

      em.transactional.mockImplementation(async (cb: any) => {
        em.findOne.mockResolvedValue(current);
        return cb(em);
      });

      const res = await service.upsert(validDto);
      expect(res).toEqual({ status: 'ignored-stale' });
    });

    it('applies newer update (LWW) and bumps version', async () => {
      const newer = {
        ...validDto,
        start: '2020-10-10 21:00',
        end: '2020-10-10 21:30',
        updatedAt: '2020-09-28 14:24:12',
      };
      const current = {
        id: 'db-uuid',
        orgId: 'default',
        externalId: '1',
        start: new Date('2020-10-10 20:20'),
        end: new Date('2020-10-10 20:30'),
        payloadUpdatedAt: new Date('2020-09-28 14:23:12'),
        version: 1,
      } as any;

      em.transactional.mockImplementation(async (cb: any) => {
        em.findOne.mockResolvedValue(current);
        em.persistAndFlush.mockResolvedValue(undefined as any);
        return cb(em);
      });

      const res = await service.upsert(newer);
      expect(res).toEqual({ status: 'ok' });
      expect(em.persistAndFlush).toHaveBeenCalled();
    });

    it('throws ConflictException for overlap constraint', async () => {
      em.transactional.mockImplementation(async (cb: any) => {
        em.findOne.mockResolvedValue(null as any);
        (em.create as any).mockReturnValue({} as any);
        (em.persistAndFlush as any).mockRejectedValue({
          code: '23P01',
          message: 'no_overlap_per_org',
        });
        return cb(em);
      });

      await expect(service.upsert(validDto)).rejects.toThrow(ConflictException);
    });

    it('allows adjacency (handled at DB level)', async () => {
      const a = {
        ...validDto,
        id: 'A',
        start: '2020-10-10 10:00',
        end: '2020-10-10 10:30',
      };
      const b = {
        ...validDto,
        id: 'B',
        start: '2020-10-10 10:30',
        end: '2020-10-10 11:00',
      };

      em.transactional.mockImplementationOnce(async (cb: any) => {
        em.findOne.mockResolvedValue(null as any);
        (em.create as any).mockReturnValue({} as any);
        em.persistAndFlush.mockResolvedValue(undefined as any);
        return cb(em);
      });
      await service.upsert(a);

      em.transactional.mockImplementationOnce(async (cb: any) => {
        em.findOne.mockResolvedValue(null as any);
        (em.create as any).mockReturnValue({} as any);
        em.persistAndFlush.mockResolvedValue(undefined as any);
        return cb(em);
      });
      const res2 = await service.upsert(b);
      expect(res2).toEqual({ status: 'ok' });
    });
  });

  describe('list', () => {
    it('returns all appointments for an organization when no "at"', async () => {
      const rows = [{ id: '1' }, { id: '2' }] as Appointment[];
      em.find.mockResolvedValue(rows);

      const res = await service.list({ orgId: 'org1' });
      expect(res).toEqual(rows);
      expect(em.find).toHaveBeenCalledWith(Appointment, { orgId: 'org1' });
    });

    it('filters by "at" (start <= at < end)', async () => {
      const rows = [{ id: 'x' }] as Appointment[];
      em.find.mockResolvedValue(rows);

      const at = '2020-10-10T20:25:00Z';
      const res = await service.list({ orgId: 'org1', at });
      expect(res).toEqual(rows);
      expect(em.find).toHaveBeenCalledWith(Appointment, {
        orgId: 'org1',
        start: { $lte: new Date(at) },
        end: { $gt: new Date(at) },
      });
    });

    it('throws BadRequest for invalid "at"', async () => {
      await expect(
        service.list({ orgId: 'org1', at: 'invalid' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('uses default organization when orgId omitted', async () => {
      const rows = [] as Appointment[];
      em.find.mockResolvedValue(rows);
      await service.list({});
      expect(em.find).toHaveBeenCalledWith(Appointment, { orgId: 'default' });
    });

    it('boundary check: at == start included, at == end excluded', async () => {
      const start = '2020-10-10T10:00:00Z';
      const end = '2020-10-10T10:30:00Z';

      em.find.mockResolvedValueOnce([{ id: 'hit' }] as any);
      const r1 = await service.list({ orgId: 'orgB', at: start });
      expect(r1.length).toBe(1);

      em.find.mockResolvedValueOnce([] as any);
      const r2 = await service.list({ orgId: 'orgB', at: end });
      expect(r2.length).toBe(0);
    });
  });
});
