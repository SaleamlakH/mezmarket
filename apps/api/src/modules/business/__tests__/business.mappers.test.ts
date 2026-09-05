import { describe, it, expect } from 'vitest';
import type {
  Business as PrismaBusiness,
  Branch as PrismaBranch,
  BusinessMember as PrismaBusinessMember,
} from '../../../../generated/prisma/client.js';
import {
  toBusinessDto,
  toBranchDto,
  toMemberDto,
  toCreateBusinessResponse,
} from '../business.mappers.js';

const isoNow = '2026-01-01T00:00:00.000Z';
const now = new Date(isoNow);

function rawBusinessRow(overrides: Record<string, unknown> = {}): PrismaBusiness {
  return {
    id: 'b-1',
    ownerId: 'owner-1',
    name: 'Test',
    currencyCode: 'USD',
    defaultTaxRate: { toString: () => '5.0000' },
    taxDisplayMode: 'EXCLUSIVE',
    allowNegativeStock: true,
    lowStockDefaultThreshold: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as PrismaBusiness;
}

function rawBranchRow(overrides: Record<string, unknown> = {}): PrismaBranch {
  return {
    id: 'br-1',
    businessId: 'b-1',
    name: 'main',
    address: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as PrismaBranch;
}

function rawMemberRow(overrides: Record<string, unknown> = {}): PrismaBusinessMember {
  return {
    id: 'm-1',
    businessId: 'b-1',
    branchId: 'br-1',
    ownerId: 'owner-1',
    name: 'me',
    role: 'OWNER',
    active: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as PrismaBusinessMember;
}

describe('business.mappers', () => {
  describe('toBusinessDto', () => {
    it('stringifies decimals and ISO-encodes timestamps', () => {
      expect(toBusinessDto(rawBusinessRow())).toEqual({
        id: 'b-1',
        ownerId: 'owner-1',
        name: 'Test',
        currencyCode: 'USD',
        defaultTaxRate: '5.0000',
        taxDisplayMode: 'EXCLUSIVE',
        allowNegativeStock: true,
        lowStockDefaultThreshold: null,
        createdAt: isoNow,
        updatedAt: isoNow,
      });
    });

    it('keeps null decimals as null and stringifies non-null thresholds', () => {
      expect(
        toBusinessDto(
          rawBusinessRow({
            defaultTaxRate: null,
            lowStockDefaultThreshold: { toString: () => '10.0000' },
          }),
        ),
      ).toEqual(
        expect.objectContaining({
          defaultTaxRate: null,
          lowStockDefaultThreshold: '10.0000',
        }),
      );
    });
  });

  describe('toBranchDto', () => {
    it('ISO-encodes timestamps and keeps scalars', () => {
      expect(toBranchDto(rawBranchRow())).toEqual({
        id: 'br-1',
        businessId: 'b-1',
        name: 'main',
        address: null,
        createdAt: isoNow,
        updatedAt: isoNow,
      });
    });
  });

  describe('toMemberDto', () => {
    it('ISO-encodes timestamps and keeps scalars', () => {
      expect(toMemberDto(rawMemberRow())).toEqual({
        id: 'm-1',
        businessId: 'b-1',
        branchId: 'br-1',
        ownerId: 'owner-1',
        name: 'me',
        role: 'OWNER',
        active: true,
        createdAt: isoNow,
        updatedAt: isoNow,
      });
    });
  });

  describe('toCreateBusinessResponse', () => {
    it('maps the db result into the wire response', () => {
      expect(
        toCreateBusinessResponse({
          business: rawBusinessRow(),
          branch: rawBranchRow(),
          member: rawMemberRow(),
        }),
      ).toEqual({
        business: {
          id: 'b-1',
          ownerId: 'owner-1',
          name: 'Test',
          currencyCode: 'USD',
          defaultTaxRate: '5.0000',
          taxDisplayMode: 'EXCLUSIVE',
          allowNegativeStock: true,
          lowStockDefaultThreshold: null,
          createdAt: isoNow,
          updatedAt: isoNow,
        },
        branch: {
          id: 'br-1',
          businessId: 'b-1',
          name: 'main',
          address: null,
          createdAt: isoNow,
          updatedAt: isoNow,
        },
        member: {
          id: 'm-1',
          businessId: 'b-1',
          branchId: 'br-1',
          ownerId: 'owner-1',
          name: 'me',
          role: 'OWNER',
          active: true,
          createdAt: isoNow,
          updatedAt: isoNow,
        },
      });
    });
  });
});
