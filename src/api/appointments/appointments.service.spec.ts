import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager, LockMode } from '@mikro-orm/core';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { Appointment } from './entities/appointment.entity';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let entityManager: jest.Mocked<EntityManager>;

  beforeEach(async () => {
    const mockEntityManager = {
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
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
    entityManager = module.get(EntityManager);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upsert', () => {
    const validDto = {
      id: '1',
      start: '2020-10-10 20:20',
      end: '2020-10-10 20:30',
      createdAt: '2020-09-02 14:23:12',
      updatedAt: '2020-09-28 14:23:12',
    };

    it('should create a new appointment successfully', async () => {
      entityManager.transactional.mockImplementation(async (callback) => {
        entityManager.findOne.mockResolvedValue(null);
        entityManager.create.mockReturnValue({} as any);
        entityManager.persistAndFlush.mockResolvedValue(undefined);
        return callback(entityManager);
      });

      const result = await service.upsert(validDto);

      expect(result).toEqual({ status: 'ok' });
      expect(entityManager.findOne).toHaveBeenCalledWith(
        Appointment,
        { orgId: 'default', externalId: '1' },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      );
    });

    it('should throw BadRequestException for invalid date format', async () => {
      const invalidDto = { ...validDto, start: 'invalid-date' };

      await expect(service.upsert(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when start >= end', async () => {
      const invalidDto = {
        ...validDto,
        start: '2020-10-10 20:30',
        end: '2020-10-10 20:20',
      };

      await expect(service.upsert(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when createdAt > updatedAt', async () => {
      const invalidDto = {
        ...validDto,
        createdAt: '2020-10-01 14:23:12',
        updatedAt: '2020-09-28 14:23:12',
      };

      await expect(service.upsert(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should ignore stale updates', async () => {
      const existingAppointment = {
        payloadUpdatedAt: new Date('2020-09-29 14:23:12'),
      } as Appointment;

      entityManager.transactional.mockImplementation(async (callback) => {
        entityManager.findOne.mockResolvedValue(existingAppointment);
        return callback(entityManager);
      });

      const result = await service.upsert(validDto);

      expect(result).toEqual({ status: 'ignored-stale' });
    });

    it('should throw ConflictException for overlapping appointments', async () => {
      entityManager.transactional.mockImplementation(async (callback) => {
        entityManager.findOne.mockResolvedValue(null);
        entityManager.create.mockReturnValue({} as any);
        entityManager.persistAndFlush.mockRejectedValue({
          code: '23P01',
          message: 'no_overlap_per_org',
        });
        return callback(entityManager);
      });

      await expect(service.upsert(validDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('list', () => {
    it('should return all appointments for an organization', async () => {
      const mockAppointments = [{ id: '1' }, { id: '2' }] as Appointment[];
      entityManager.find.mockResolvedValue(mockAppointments);

      const result = await service.list({ orgId: 'org1' });

      expect(result).toEqual(mockAppointments);
      expect(entityManager.find).toHaveBeenCalledWith(Appointment, {
        orgId: 'org1',
      });
    });

    it('should return appointments at a specific time', async () => {
      const mockAppointments = [{ id: '1' }] as Appointment[];
      entityManager.find.mockResolvedValue(mockAppointments);

      const result = await service.list({
        orgId: 'org1',
        at: '2020-10-10T20:25:00Z',
      });

      expect(result).toEqual(mockAppointments);
      expect(entityManager.find).toHaveBeenCalledWith(Appointment, {
        orgId: 'org1',
        start: { $lte: new Date('2020-10-10T20:25:00Z') },
        end: { $gt: new Date('2020-10-10T20:25:00Z') },
      });
    });

    it('should throw BadRequestException for invalid date in at parameter', async () => {
      await expect(
        service.list({ orgId: 'org1', at: 'invalid-date' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use default organization when orgId is not provided', async () => {
      const mockAppointments = [] as Appointment[];
      entityManager.find.mockResolvedValue(mockAppointments);

      await service.list({});

      expect(entityManager.find).toHaveBeenCalledWith(Appointment, {
        orgId: 'default',
      });
    });
  });
});
