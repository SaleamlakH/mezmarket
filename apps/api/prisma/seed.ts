import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UnitDependsOn, UnitRole } from '../generated/prisma/client.js';

const adapter = new PrismaPg({ connectionString: `${process.env.DATABASE_URL}` });
const prisma = new PrismaClient({ adapter });

// The demo catalog is owned by a demo tenant. Set SEED_PROVIDER_USER_ID to your own
// auth provider user id to attach the seeded business/products to your account instead.
const DEMO_PROVIDER_USER_ID = process.env.SEED_PROVIDER_USER_ID ?? 'seed-demo-owner';
const DEMO_BUSINESS_NAME = 'Demo Shop';

type UnitSeed = { name: string; symbol: string; dimension: string; ratio: number };

type ProductUnitSeed = {
  role: UnitRole;
  standardUnit?: string;
  name: string;
  dependsOn?: UnitDependsOn;
  conversion?: number;
  price?: number;
  purchase?: boolean;
  sell: boolean;
};

type ProductSeed = {
  name: string;
  category: string;
  brand?: string;
  description?: string;
  trackAsPartial?: boolean;
  units: ProductUnitSeed[];
};

async function seedPlatformData() {
  const dimensions = ['Volume', 'Weight', 'Length', 'Count'];

  for (const name of dimensions) {
    await prisma.dimension.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const units: UnitSeed[] = [
    { name: 'Milliliter', symbol: 'ml', dimension: 'Volume', ratio: 1 },
    { name: 'Liter', symbol: 'L', dimension: 'Volume', ratio: 1000 },
    { name: 'Gram', symbol: 'g', dimension: 'Weight', ratio: 1 },
    { name: 'Kilogram', symbol: 'kg', dimension: 'Weight', ratio: 1000 },
    { name: 'Millimeter', symbol: 'mm', dimension: 'Length', ratio: 1 },
    { name: 'Centimeter', symbol: 'cm', dimension: 'Length', ratio: 10 },
    { name: 'Meter', symbol: 'm', dimension: 'Length', ratio: 1000 },
    { name: 'Piece', symbol: 'pc', dimension: 'Count', ratio: 1 },
  ];

  for (const { name, symbol, dimension, ratio } of units) {
    await prisma.standardUnit.upsert({
      where: { symbol },
      update: { name, dimension: { connect: { name: dimension } }, ratioToReferenceUnit: ratio },
      create: {
        name,
        symbol,
        ratioToReferenceUnit: ratio,
        dimension: { connect: { name: dimension } },
      },
    });
  }

  const references: Record<string, string> = {
    Volume: 'ml',
    Weight: 'g',
    Length: 'mm',
    Count: 'pc',
  };

  for (const [dimensionName, symbol] of Object.entries(references)) {
    const dimension = await prisma.dimension.findUniqueOrThrow({ where: { name: dimensionName } });
    const standardUnit = await prisma.standardUnit.findUniqueOrThrow({ where: { symbol } });

    await prisma.dimensionReference.upsert({
      where: { dimensionId: dimension.id },
      update: { standardUnitId: standardUnit.id },
      create: { dimensionId: dimension.id, standardUnitId: standardUnit.id },
    });
  }
}

async function seedDemoCatalog() {
  await prisma.$transaction(async (tx) => {
    let identity = await tx.accountIdentity.findUnique({
      where: { providerUserId: DEMO_PROVIDER_USER_ID },
      include: { owner: true },
    });

    if (!identity) {
      const owner = await tx.owner.create({ data: { name: 'Demo Owner' } });
      identity = await tx.accountIdentity.create({
        data: { providerUserId: DEMO_PROVIDER_USER_ID, ownerId: owner.id },
        include: { owner: true },
      });
    }

    let business = await tx.business.findFirst({
      where: { ownerId: identity.ownerId, name: DEMO_BUSINESS_NAME },
    });

    if (!business) {
      business = await tx.business.create({
        data: {
          ownerId: identity.ownerId,
          name: DEMO_BUSINESS_NAME,
          currencyCode: 'ETB',
        },
      });
    }

    let branch = await tx.branch.findFirst({ where: { businessId: business.id } });

    if (!branch) {
      branch = await tx.branch.create({ data: { businessId: business.id } });
    }

    const member = await tx.businessMember.findUnique({
      where: { businessId_ownerId: { businessId: business.id, ownerId: identity.ownerId } },
    });

    if (!member) {
      await tx.businessMember.create({
        data: {
          businessId: business.id,
          branchId: branch.id,
          ownerId: identity.ownerId,
          name: 'Demo Owner',
          role: 'OWNER',
        },
      });
    }

    const categories = ['Apparel', 'Beverages', 'Groceries', 'Fabric'];
    const categoryIds = new Map<string, string>();

    for (const name of categories) {
      const category = await tx.category.upsert({
        where: { businessId_name: { businessId: business.id, name } },
        update: {},
        create: { businessId: business.id, name },
      });
      categoryIds.set(name, category.id);
    }

    // Recreated on every run so the demo catalog stays deterministic. Because these
    // products are currently dev-only, deleting them (and their cascaded rows) is safe;
    // if real stock/batch data ever accumulates here, this needs rethinking.
    await tx.product.deleteMany({ where: { businessId: business.id } });

    const standardUnits = await tx.standardUnit.findMany();
    const standardUnitBySymbol = new Map(standardUnits.map((unit) => [unit.symbol, unit.id]));

    const products: ProductSeed[] = [
      {
        name: 'Plain T-shirt',
        category: 'Apparel',
        brand: 'Unbranded',
        description: 'Basic cotton t-shirt, sold as a whole unit.',
        units: [
          {
            role: 'BASE',
            standardUnit: 'pc',
            name: 'Piece',
            price: 250,
            purchase: true,
            sell: true,
          },
          {
            role: 'CUSTOM',
            name: 'Pack (6 pcs)',
            dependsOn: 'BASE',
            conversion: 6,
            purchase: true,
            sell: false,
          },
        ],
      },
      {
        name: 'Sierra Tequila 350 ml',
        category: 'Beverages',
        brand: 'Sierra',
        description: 'Bottle sold whole or by the shot (open-container product).',
        trackAsPartial: true,
        units: [
          {
            role: 'BASE',
            standardUnit: 'pc',
            name: 'Bottle',
            price: 950,
            purchase: true,
            sell: true,
          },
          {
            role: 'MOU',
            standardUnit: 'ml',
            name: 'Milliliter',
            dependsOn: 'BASE',
            conversion: 350,
            sell: true,
          },
          {
            role: 'STANDARD',
            standardUnit: 'L',
            name: 'Liter',
            dependsOn: 'MOU',
            conversion: 1000,
            sell: true,
          },
          {
            role: 'CUSTOM',
            name: 'Shot',
            dependsOn: 'MOU',
            conversion: 25,
            price: 40,
            purchase: false,
            sell: true,
          },
          {
            role: 'CUSTOM',
            name: 'Case (12 bottles)',
            dependsOn: 'BASE',
            conversion: 12,
            purchase: true,
            sell: false,
          },
        ],
      },
      {
        name: 'Cooking Oil 5 L',
        category: 'Groceries',
        brand: 'Generics',
        description: '5 L bottle; also purchasable in liters.',
        units: [
          {
            role: 'BASE',
            standardUnit: 'pc',
            name: 'Bottle',
            price: 620,
            purchase: true,
            sell: true,
          },
          {
            role: 'MOU',
            standardUnit: 'ml',
            name: 'Milliliter',
            dependsOn: 'BASE',
            conversion: 5000,
            sell: true,
          },
          {
            role: 'STANDARD',
            standardUnit: 'L',
            name: 'Liter',
            dependsOn: 'MOU',
            conversion: 1000,
            purchase: true,
            sell: true,
          },
        ],
      },
      {
        name: 'Loose Rice (sack)',
        category: 'Groceries',
        description: 'Sold loose by weight; bought per kilogram or per sack.',
        units: [
          {
            role: 'BASE',
            standardUnit: 'kg',
            name: 'Kilogram',
            price: 120,
            purchase: true,
            sell: true,
          },
          {
            role: 'STANDARD',
            standardUnit: 'g',
            name: 'Gram',
            dependsOn: 'BASE',
            conversion: 0.001,
            sell: true,
          },
          {
            role: 'CUSTOM',
            name: 'Sack (50 kg)',
            dependsOn: 'BASE',
            conversion: 50,
            purchase: true,
            sell: false,
          },
        ],
      },
      {
        name: 'Cotton Fabric',
        category: 'Fabric',
        description: 'Sold by the meter; bought per meter or per roll.',
        units: [
          {
            role: 'BASE',
            standardUnit: 'm',
            name: 'Meter',
            price: 180,
            purchase: true,
            sell: true,
          },
          {
            role: 'STANDARD',
            standardUnit: 'cm',
            name: 'Centimeter',
            dependsOn: 'BASE',
            conversion: 0.01,
            sell: true,
          },
          {
            role: 'CUSTOM',
            name: 'Roll (50 m)',
            dependsOn: 'BASE',
            conversion: 50,
            purchase: true,
            sell: false,
          },
        ],
      },
    ];

    for (const product of products) {
      await tx.product.create({
        data: {
          businessId: business.id,
          branchId: branch.id,
          categoryId: categoryIds.get(product.category) ?? null,
          name: product.name,
          brand: product.brand ?? null,
          description: product.description ?? null,
          trackAsPartial: product.trackAsPartial ?? false,
          productUnits: {
            create: product.units.map((unit) => ({
              unitRole: unit.role,
              standardUnitId: unit.standardUnit
                ? (standardUnitBySymbol.get(unit.standardUnit) ?? null)
                : null,
              name: unit.name,
              dependsOn: unit.dependsOn ?? null,
              conversionRate: unit.conversion ?? null,
              price: unit.price ?? null,
              purchaseCapable: unit.purchase ?? false,
              sellCapable: unit.sell,
            })),
          },
        },
      });
    }

    console.log(
      `Seeded demo catalog for ${DEMO_BUSINESS_NAME} (${products.length} products, providerUserId: ${DEMO_PROVIDER_USER_ID}).`,
    );
  });
}

async function main() {
  await seedPlatformData();
  await seedDemoCatalog();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
