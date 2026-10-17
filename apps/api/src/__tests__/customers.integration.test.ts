import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import type { AuthRepository } from '../modules/auth/auth.types.js';
import type { BusinessRepository } from '../modules/business/business.types.js';
import type { CustomerRepository } from '../modules/customers/customers.types.js';

const { verifyJwt, authRepository, businessRepository, customerRepository } = vi.hoisted(() => ({
  verifyJwt: vi.fn(),
  authRepository: {
    findIdentity: vi.fn(),
    createIdentity: vi.fn(),
  } satisfies AuthRepository,
  businessRepository: {
    listForOwner: vi.fn(),
    createForOwner: vi.fn(),
    getBusinessId: vi.fn(),
    getBranchId: vi.fn(),
    getActor: vi.fn(),
    getForOwner: vi.fn(),
    updateForOwner: vi.fn(),
  } satisfies BusinessRepository,
  customerRepository: {
    listCustomers: vi.fn(),
    createCustomer: vi.fn(),
  } satisfies CustomerRepository,
}));

vi.mock('../lib/jwt.js', () => ({ verifyJwt }));
vi.mock('../modules/auth/auth.repository.js', () => ({
  createAuthRepository: () => authRepository,
}));
vi.mock('../modules/business/business.repository.js', () => ({
  createBusinessRepository: () => businessRepository,
}));
vi.mock('../modules/customers/customers.repository.js', () => ({
  createCustomersRepository: () => customerRepository,
}));

import app from '../app.js';
import { ERROR_CODES } from '../shared/errors/app-error.js';

const CUSTOMER_RECORD = {
  id: 'cust-1',
  businessId: 'b-1',
  name: 'Abebe',
  contactPhone: '0911234567',
  contactEmail: 'abebe@example.com',
  active: true,
  createdAt: new Date('2026-03-01T09:00:00.000Z'),
  updatedAt: new Date('2026-03-01T09:00:00.000Z'),
};

const BODY = {
  name: 'Abebe',
  contactPhone: '0911234567',
  contactEmail: 'abebe@example.com',
};

async function authenticate(role: 'OWNER' | 'MANAGER' | 'CASHIER' | 'SERVER' = 'OWNER') {
  verifyJwt.mockResolvedValue({ sub: 'user-1', email: 'user@test.com' });
  authRepository.findIdentity.mockResolvedValue({
    id: 'id-1',
    ownerId: 'owner-1',
    providerUserId: 'user-1',
  });
  businessRepository.getBusinessId.mockResolvedValue('b-1');
  businessRepository.getBranchId.mockResolvedValue('br-1');
  businessRepository.getActor.mockResolvedValue({ id: 'm-1', role });
}

describe('customers.integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    customerRepository.listCustomers.mockResolvedValue([CUSTOMER_RECORD]);
    customerRepository.createCustomer.mockResolvedValue(CUSTOMER_RECORD);
  });

  describe('POST /api/businesses/:businessId/customers', () => {
    it('rejects an unauthenticated request', async () => {
      const res = await request(app).post('/api/businesses/b-1/customers').send(BODY);

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.UNAUTHORIZED } });
      expect(customerRepository.createCustomer).not.toHaveBeenCalled();
    });

    it('rejects an invalid body before the customer is written', async () => {
      await authenticate();

      const res = await request(app)
        .post('/api/businesses/b-1/customers')
        .set('Authorization', 'Bearer token')
        .send({ name: '' });

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        error: { code: ERROR_CODES.BAD_REQUEST, message: expect.any(String) },
      });
      expect(customerRepository.createCustomer).not.toHaveBeenCalled();
    });

    it('refuses a SERVER with FORBIDDEN', async () => {
      await authenticate('SERVER');

      const res = await request(app)
        .post('/api/businesses/b-1/customers')
        .set('Authorization', 'Bearer token')
        .send(BODY);

      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.FORBIDDEN } });
      expect(customerRepository.createCustomer).not.toHaveBeenCalled();
    });

    it.each(['OWNER', 'MANAGER', 'CASHIER'] as const)(
      'creates a customer for a %s',
      async (role) => {
        await authenticate(role);

        const res = await request(app)
          .post('/api/businesses/b-1/customers')
          .set('Authorization', 'Bearer token')
          .send(BODY);

        expect(res.status).toBe(201);
        expect(customerRepository.createCustomer).toHaveBeenCalledWith('b-1', {
          name: 'Abebe',
          contactPhone: '0911234567',
          contactEmail: 'abebe@example.com',
        });
        expect(res.body).toMatchObject({
          id: 'cust-1',
          name: 'Abebe',
          contactPhone: '0911234567',
          contactEmail: 'abebe@example.com',
          active: true,
        });
        // The owning business comes from the resolved scope, never the body.
        expect(customerRepository.createCustomer).not.toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ businessId: expect.anything() }),
        );
      },
    );

    it('drops a blank contact rather than writing an empty string', async () => {
      await authenticate();

      const res = await request(app)
        .post('/api/businesses/b-1/customers')
        .set('Authorization', 'Bearer token')
        .send({ name: 'Abebe', contactPhone: '   ', contactEmail: '' });

      expect(res.status).toBe(201);
      expect(customerRepository.createCustomer).toHaveBeenCalledWith('b-1', { name: 'Abebe' });
    });

    it('answers 404 when the caller does not own the business', async () => {
      await authenticate();
      businessRepository.getBusinessId.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/businesses/b-1/customers')
        .set('Authorization', 'Bearer token')
        .send(BODY);

      expect(res.status).toBe(404);
      expect(customerRepository.createCustomer).not.toHaveBeenCalled();
    });

    it('answers 404 when the caller has no active member in the business', async () => {
      await authenticate();
      businessRepository.getActor.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/businesses/b-1/customers')
        .set('Authorization', 'Bearer token')
        .send(BODY);

      expect(res.status).toBe(404);
      expect(customerRepository.createCustomer).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/businesses/:businessId/customers', () => {
    it('rejects an unauthenticated request', async () => {
      const res = await request(app).get('/api/businesses/b-1/customers');

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ error: { code: ERROR_CODES.UNAUTHORIZED } });
      expect(customerRepository.listCustomers).not.toHaveBeenCalled();
    });

    it('lists the resolved business customers as picker summaries', async () => {
      await authenticate();

      const res = await request(app)
        .get('/api/businesses/b-1/customers')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(customerRepository.listCustomers).toHaveBeenCalledWith('b-1');
      expect(res.body).toEqual([
        {
          id: 'cust-1',
          name: 'Abebe',
          contactPhone: '0911234567',
          contactEmail: 'abebe@example.com',
        },
      ]);
    });

    it('does not leak the owning business or the timestamps', async () => {
      await authenticate();

      const res = await request(app)
        .get('/api/businesses/b-1/customers')
        .set('Authorization', 'Bearer token');

      expect(res.body[0]).not.toHaveProperty('businessId');
      expect(res.body[0]).not.toHaveProperty('createdAt');
      expect(res.body[0]).not.toHaveProperty('updatedAt');
    });

    it('answers an empty array when the business has no customers', async () => {
      await authenticate();
      customerRepository.listCustomers.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/businesses/b-1/customers')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it.each(['OWNER', 'MANAGER', 'CASHIER', 'SERVER'] as const)(
      'lets a %s read the customers',
      async (role) => {
        await authenticate(role);

        const res = await request(app)
          .get('/api/businesses/b-1/customers')
          .set('Authorization', 'Bearer token');

        expect(res.status).toBe(200);
      },
    );

    it('answers 404 when the caller has no active member in the business', async () => {
      await authenticate();
      businessRepository.getActor.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/businesses/b-1/customers')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(404);
      expect(customerRepository.listCustomers).not.toHaveBeenCalled();
    });
  });
});
