/**
 * Live Database Health Verification Script for MerQent (Phase 2.5)
 */
import { PrismaClient } from '@prisma/client';

async function main() {
  console.log('--- MerQent Live Database Health & Connectivity Verification ---');

  // 1. Live Connected Probe
  const livePrisma = new PrismaClient();
  try {
    const start = Date.now();
    await livePrisma.$queryRawUnsafe('SELECT 1');
    const latencyMs = Date.now() - start;
    console.log('✅ Live PostgreSQL Connection: CONNECTED');
    console.log(`   Latency: ${latencyMs}ms`);

    // 2. Query execution test
    const count = await livePrisma.taxonomyTerm.count();
    console.log(`✅ Taxonomy Query: ${count} terms found in database`);

    const sample = await livePrisma.taxonomyTerm.findMany({
      take: 3,
      select: { code: true, name: true, category: true },
    });
    console.log('   Sample terms:', JSON.stringify(sample));
  } finally {
    await livePrisma.$disconnect();
  }

  // 3. Degraded/Disconnected State Probe
  const degradedPrisma = new PrismaClient({
    datasources: {
      db: {
        url: 'postgresql://merqent_user:wrong_password@localhost:5433/merqent_db',
      },
    },
  });

  try {
    await degradedPrisma.$queryRawUnsafe('SELECT 1');
    console.error('❌ Degraded probe unexpectedly succeeded');
    process.exit(1);
  } catch {
    console.log('✅ Degraded/Disconnected Probe: Correctly detected disconnected state');
  } finally {
    await degradedPrisma.$disconnect().catch(() => {});
  }

  console.log('✨ Database health verification completed successfully.');
}

main().catch((err) => {
  console.error('❌ Database health verification failed:', err);
  process.exit(1);
});
