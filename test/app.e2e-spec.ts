import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppointmentsModule } from './../src/api/appointments/appointments.module';

const uid = () => Math.random().toString(16).slice(2);

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

  describe('POST /appointments', () => {
    it('creates a new appointment', async () => {
      const payload = {
        id: `p1-${uid()}`,
        start: '2031-01-01 10:00',
        end: '2031-01-01 10:30',
        createdAt: '2030-12-31 10:00',
        updatedAt: '2030-12-31 10:00',
        orgId: `orgCreate-${uid()}`,
      };

      const res = await request(app.getHttpServer())
        .post('/appointments')
        .send(payload)
        .expect(200);

      expect(res.body.status).toBe('ok');
    });

    it('400 for invalid date format', () => {
      const invalid = {
        id: `inv-${uid()}`,
        start: '2020-10-10 25:61',
        end: '2020-10-10 20:30',
        createdAt: '2020-09-02 14:23:12',
        updatedAt: '2020-09-28 14:23:12',
        orgId: `orgInvalid-${uid()}`,
      };
      return request(app.getHttpServer())
        .post('/appointments')
        .send(invalid)
        .expect(400);
    });

    it('400 when start >= end', () => {
      const invalid = {
        id: `p3-${uid()}`,
        start: '2020-10-10 20:30',
        end: '2020-10-10 20:20',
        createdAt: '2020-09-02 14:23:12',
        updatedAt: '2020-09-28 14:23:12',
        orgId: `org-${uid()}`,
      };
      return request(app.getHttpServer())
        .post('/appointments')
        .send(invalid)
        .expect(400);
    });

    it('409 for overlapping appointments within same org', async () => {
      const org = `orgC-${uid()}`;
      const a = {
        id: `o1-${uid()}`,
        start: '2020-10-10 20:20',
        end: '2020-10-10 20:30',
        createdAt: '2020-09-02 14:23:12',
        updatedAt: '2020-09-28 14:23:12',
        orgId: org,
      };
      const b = {
        id: `o2-${uid()}`,
        start: '2020-10-10 20:25',
        end: '2020-10-10 20:35',
        createdAt: '2020-09-02 14:23:12',
        updatedAt: '2020-09-28 14:23:12',
        orgId: org,
      };

      await request(app.getHttpServer())
        .post('/appointments')
        .send(a)
        .expect(200);
      return request(app.getHttpServer())
        .post('/appointments')
        .send(b)
        .expect(409);
    });

    it('allows overlap across different orgs', async () => {
      const base = {
        start: '2020-10-10 20:20',
        end: '2020-10-10 20:30',
        createdAt: '2020-09-02 14:23:12',
        updatedAt: '2020-09-28 14:23:12',
      };
      const a = { ...base, id: `x1-${uid()}`, orgId: `orgA-${uid()}` };
      const b = { ...base, id: `x2-${uid()}`, orgId: `orgB-${uid()}` };

      await request(app.getHttpServer())
        .post('/appointments')
        .send(a)
        .expect(200);
      await request(app.getHttpServer())
        .post('/appointments')
        .send(b)
        .expect(200);
    });

    it('LWW: newer updatedAt applies and increases version', async () => {
      const org = `orgL-${uid()}`;
      const first = {
        id: `l1-${uid()}`,
        start: '2020-10-10 20:00',
        end: '2020-10-10 20:30',
        createdAt: '2020-09-02 14:23:12',
        updatedAt: '2020-09-28 14:23:12',
        orgId: org,
      };
      const newer = {
        ...first,
        start: '2020-10-10 21:00',
        end: '2020-10-10 21:30',
        updatedAt: '2020-09-28 14:24:12',
      };

      await request(app.getHttpServer())
        .post('/appointments')
        .send(first)
        .expect(200);
      await request(app.getHttpServer())
        .post('/appointments')
        .send(newer)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/appointments?org=${encodeURIComponent(org)}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].version).toBe(2);
      expect(res.body[0].start).toBe('2020-10-10T21:00:00.000Z');
    });

    it('allows adjacency (end == start) and boundary at= checks', async () => {
      const org = `orgAdj-${uid()}`;
      const a = {
        id: `adj-1-${uid()}`,
        start: '2020-10-10 10:00',
        end: '2020-10-10 10:30',
        createdAt: '2020-09-02 14:23:12',
        updatedAt: '2020-09-28 14:23:12',
        orgId: org,
      };
      const b = {
        ...a,
        id: `adj-2-${uid()}`,
        start: '2020-10-10 10:30',
        end: '2020-10-10 11:00',
      };

      await request(app.getHttpServer())
        .post('/appointments')
        .send(a)
        .expect(200);
      await request(app.getHttpServer())
        .post('/appointments')
        .send(b)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(
          `/appointments?org=${encodeURIComponent(org)}&at=2020-10-10T10:30:00Z`,
        )
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].externalId).toBe(b.id);
    });
  });

  describe('GET /appointments', () => {
    it('returns array for default organization', () => {
      return request(app.getHttpServer())
        .get('/appointments')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('returns array for specific organization', () => {
      return request(app.getHttpServer())
        .get(`/appointments?org=${encodeURIComponent('org1')}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('filters by "at" (ISO)', () => {
      return request(app.getHttpServer())
        .get('/appointments?org=org1&at=2020-10-10T20:25:00Z')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('400 for invalid at', () => {
      return request(app.getHttpServer())
        .get('/appointments?at=invalid-date')
        .expect(400);
    });

    it('GET without org returns default org data (after creating one without orgId)', async () => {
      const p = {
        id: `d1-${uid()}`,
        start: '2099-01-01 09:00',
        end: '2099-01-01 09:30',
        createdAt: '2098-12-31 09:00',
        updatedAt: '2098-12-31 09:00',
      };
      await request(app.getHttpServer())
        .post('/appointments')
        .send(p)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/appointments')
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((x: any) => x.externalId === p.id)).toBe(true);
    });

    it('boundary: at == start included, at == end excluded (explicit check)', async () => {
      const org = `orgBnd-${uid()}`;
      const p = {
        id: `bnd-1-${uid()}`,
        start: '2020-10-10 12:00',
        end: '2020-10-10 12:30',
        createdAt: '2020-09-02 14:23:12',
        updatedAt: '2020-09-28 14:23:12',
        orgId: org,
      };
      await request(app.getHttpServer())
        .post('/appointments')
        .send(p)
        .expect(200);

      const r1 = await request(app.getHttpServer())
        .get(
          `/appointments?org=${encodeURIComponent(org)}&at=2020-10-10T12:00:00Z`,
        )
        .expect(200);
      expect(r1.body.find((x: any) => x.externalId === p.id)).toBeTruthy();

      const r2 = await request(app.getHttpServer())
        .get(
          `/appointments?org=${encodeURIComponent(org)}&at=2020-10-10T12:30:00Z`,
        )
        .expect(200);
      expect(r2.body.find((x: any) => x.externalId === p.id)).toBeUndefined();
    });
  });
});
