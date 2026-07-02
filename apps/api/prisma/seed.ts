import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Planes base del SaaS. Idempotente: se puede correr varias veces. */
const PLANS = [
  { code: 'basico', name: 'Básico', priceMonthly: 15000, maxUsers: 2, maxBranches: 1, features: ['pos', 'caja', 'stock', 'clientes'] },
  { code: 'pro', name: 'Pro', priceMonthly: 28000, maxUsers: 6, maxBranches: 1, features: ['pos', 'caja', 'stock', 'clientes', 'proveedores', 'compras', 'promociones', 'cuenta_corriente', 'reportes'] },
  { code: 'premium', name: 'Premium', priceMonthly: 45000, maxUsers: 20, maxBranches: 10, features: ['todo', 'multi_sucursal', 'arca', 'reportes_avanzados', 'auditoria_avanzada', 'soporte_prioritario'] },
];

async function main(): Promise<void> {
  for (const plan of PLANS) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: { name: plan.name, priceMonthly: plan.priceMonthly, maxUsers: plan.maxUsers, maxBranches: plan.maxBranches, features: plan.features },
      create: plan,
    });
  }
  // eslint-disable-next-line no-console
  console.log(`Seed OK: ${PLANS.length} planes.`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
