import { PrismaClient, PriceStatus, ProductSource } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const store = await prisma.store.upsert({
    where: { name: 'Main Store' },
    update: {},
    create: {
      name: 'Main Store',
      location: 'Lisbon',
    },
  });

  const product = await prisma.product.upsert({
    where: { barcode: '5601234567890' },
    update: {},
    create: {
      barcode: '5601234567890',
      name: 'Sample Pasta',
      brand: 'ListaCerta',
      category: 'pasta',
      source: ProductSource.manual,
    },
  });

  const device = await prisma.device.upsert({
    where: { id: 'simulator-ios' },
    update: {},
    create: { id: 'simulator-ios' },
  });

  await prisma.price.create({
    data: {
      productId: product.id,
      storeId: store.id,
      priceCents: 199,
      currency: 'EUR',
      submittedBy: device.id,
      status: PriceStatus.active,
    },
  });

  // eslint-disable-next-line no-console
  console.log('Seed completed');
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
