import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

const adapter = new PrismaPg({ connectionString: `${process.env.DATABASE_URL}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  type UnitSeed = { name: string; symbol: string; dimension: string; ratio: number };

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

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
