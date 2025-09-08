import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppointmentsModule } from './../src/api/appointments/appointments.module';

describe('AppointmentsController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppointmentsModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/appointments', () => {
    it('should create a new appointment', () => {
      const appointmentData = {
        id: '1',
        start: '2020-10-10 20:20',
        end: '2020-10-10 20:30',
        createdAt: '2020-09-02 14:23:12',
        updatedAt: '2020-09-28 14:23:12',
      };

      return request(app.getHttpServer())
        .post('/api/appointments')
        .send(appointmentData)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
        });
    });

    it('should return 400 for invalid date format', () => {
      const invalidData = {
        id: '1',
        start: 'invalid-date',
        end: '2020-10-10 20:30',
        createdAt: '2020-09-02 14:23:12',
        updatedAt: '2020-09-28 14:23:12',
      };

      return request(app.getHttpServer())
        .post('/api/appointments')
        .send(invalidData)
        .expect(400);
    });

    it('should return 400 when start >= end', () => {
      const invalidData = {
        id: '1',
        start: '2020-10-10 20:30',
        end: '2020-10-10 20:20',
        createdAt: '2020-09-02 14:23:12',
        updatedAt: '2020-09-28 14:23:12',
      };

      return request(app.getHttpServer())
        .post('/api/appointments')
        .send(invalidData)
        .expect(400);
    });

    it('should return 409 for overlapping appointments', async () => {
      const appointment1 = {
        id: '1',
        start: '2020-10-10 20:20',
        end: '2020-10-10 20:30',
        createdAt: '2020-09-02 14:23:12',
        updatedAt: '2020-09-28 14:23:12',
      };

      const appointment2 = {
        id: '2',
        start: '2020-10-10 20:25',
        end: '2020-10-10 20:35',
        createdAt: '2020-09-02 14:23:12',
        updatedAt: '2020-09-28 14:23:12',
      };

      // Create first appointment
      await request(app.getHttpServer())
        .post('/api/appointments')
        .send(appointment1)
        .expect(200);

      // Try to create overlapping appointment
      return request(app.getHttpServer())
        .post('/api/appointments')
        .send(appointment2)
        .expect(409);
    });
  });

  describe('GET /api/appointments', () => {
    it('should return all appointments for default organization', () => {
      return request(app.getHttpServer())
        .get('/api/appointments')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should return appointments for specific organization', () => {
      return request(app.getHttpServer())
        .get('/api/appointments?org=org1')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should return appointments at specific time', () => {
      return request(app.getHttpServer())
        .get('/api/appointments?at=2020-10-10T20:25:00Z')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should return 400 for invalid date in at parameter', () => {
      return request(app.getHttpServer())
        .get('/api/appointments?at=invalid-date')
        .expect(400);
    });
  });
});
