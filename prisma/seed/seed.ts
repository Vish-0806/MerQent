/**
 * MerQent Production Database Seed Script
 * Populates controlled taxonomies: Industries, ERPs, Accounting Systems, Deal Types, Integration Types, and PMI Tasks.
 * Grounded in PostgreSQL and Prisma ORM.
 */

import { PrismaClient, SystemRole, VerificationTier } from '@prisma/client';

const prisma = new PrismaClient();

const INDUSTRIES = [
  { name: 'Healthcare & Life Sciences', slug: 'healthcare-life-sciences', category: 'Healthcare' },
  { name: 'Software & Technology (SaaS)', slug: 'software-technology-saas', category: 'Technology' },
  { name: 'Manufacturing & Industrials', slug: 'manufacturing-industrials', category: 'Industrials' },
  { name: 'Financial Services & FinTech', slug: 'financial-services-fintech', category: 'Financial Services' },
  { name: 'Consumer & Retail', slug: 'consumer-retail', category: 'Consumer' },
  { name: 'Business Services & Logistics', slug: 'business-services-logistics', category: 'Business Services' },
  { name: 'Energy & Infrastructure', slug: 'energy-infrastructure', category: 'Energy' },
];

const ERP_SYSTEMS = [
  { name: 'SAP S/4HANA', vendor: 'SAP', tier: 'Enterprise' },
  { name: 'SAP Business One', vendor: 'SAP', tier: 'Mid-Market' },
  { name: 'Oracle NetSuite', vendor: 'Oracle', tier: 'Cloud ERP' },
  { name: 'Oracle Cloud ERP (Fusion)', vendor: 'Oracle', tier: 'Enterprise' },
  { name: 'Microsoft Dynamics 365 Finance & Operations', vendor: 'Microsoft', tier: 'Enterprise' },
  { name: 'Microsoft Dynamics 365 Business Central', vendor: 'Microsoft', tier: 'Mid-Market' },
  { name: 'Workday Financial Management', vendor: 'Workday', tier: 'Enterprise' },
  { name: 'Infor CloudSuite', vendor: 'Infor', tier: 'Enterprise' },
  { name: 'Epicor ERP', vendor: 'Epicor', tier: 'Manufacturing' },
  { name: 'Sage Intacct', vendor: 'Sage', tier: 'Mid-Market' },
];

const ACCOUNTING_SYSTEMS = [
  { name: 'BlackLine (Financial Close)', vendor: 'BlackLine', category: 'Close Management' },
  { name: 'FloQast', vendor: 'FloQast', category: 'Close Management' },
  { name: 'OneStream Software', vendor: 'OneStream', category: 'CPM / Consolidation' },
  { name: 'Oracle Hyperion / FCCS', vendor: 'Oracle', category: 'CPM / Consolidation' },
  { name: 'QuickBooks Enterprise', vendor: 'Intuit', category: 'SMB Accounting' },
  { name: 'Sage Intacct Accounting', vendor: 'Sage', category: 'Mid-Market' },
  { name: 'Xero Accounting', vendor: 'Xero', category: 'SMB Accounting' },
];

const DEAL_TYPES = [
  { name: 'Platform Acquisition', code: 'PLATFORM', description: 'Initial platform investment by private equity sponsor' },
  { name: 'Add-on / Bolt-on Acquisition', code: 'ADD_ON', description: 'Strategic tuck-in acquisition integrated into existing platform' },
  { name: 'Corporate Carve-out / Divestiture', code: 'CARVE_OUT', description: 'Separation and standalone operationalization of a business unit' },
  { name: 'Merger of Equals', code: 'MERGER_OF_EQUALS', description: 'Direct operational merger of two comparable scale organizations' },
  { name: 'Cross-Border Acquisition', code: 'CROSS_BORDER', description: 'International acquisition involving multi-jurisdiction regulatory & tax integration' },
];

const INTEGRATION_TYPES = [
  { name: 'Full Operational Integration', code: 'FULL_INTEGRATION', description: 'Comprehensive consolidation of ERP, finance, sales, IT, and HR' },
  { name: 'Back-Office / Shared Services Only', code: 'BACK_OFFICE_ONLY', description: 'Financial consolidation, reporting, payroll, and shared infrastructure' },
  { name: 'Autonomous / Holding Co Governance', code: 'HOLD_CO_GOVERNANCE', description: 'Decentralized operational model with executive oversight and financial reporting' },
  { name: 'Carve-Out Transition (TSA Exit)', code: 'TSA_EXIT', description: 'Transition Service Agreement standup, migration, and vendor replacement' },
];

const PMI_TASKS = [
  { name: 'Day 1 Readiness & Executive Playbook', category: 'Governance' },
  { name: '100-Day Integration Execution', category: 'Execution' },
  { name: 'Chart of Accounts (COA) Harmonization', category: 'Finance & Accounting' },
  { name: 'ERP Migration & System Cutover', category: 'IT & Systems' },
  { name: 'Billing & Revenue Recognition Unification', category: 'Finance & Accounting' },
  { name: 'Executive Team Assessment & Culture Alignment', category: 'People & Culture' },
  { name: 'Vendor Rationalization & Procurement Synergy', category: 'Operations' },
  { name: 'Sales Pipeline & CRM Consolidation', category: 'Commercial' },
  { name: 'IT Infrastructure & Cyber Diligence Hardening', category: 'IT & Systems' },
];

async function main() {
  console.log('🌱 Starting MerQent Database Taxonomy Seed...');

  // 1. Seed Industries
  for (const item of INDUSTRIES) {
    await prisma.industryTaxonomy.upsert({
      where: { slug: item.slug },
      update: {},
      create: {
        name: item.name,
        slug: item.slug,
        category: item.category,
      },
    });
  }
  console.log(`✅ Seeded ${INDUSTRIES.length} industries.`);

  // 2. Seed ERP Systems
  for (const item of ERP_SYSTEMS) {
    await prisma.erpTaxonomy.upsert({
      where: { name: item.name },
      update: {},
      create: {
        name: item.name,
        vendor: item.vendor,
        tier: item.tier,
      },
    });
  }
  console.log(`✅ Seeded ${ERP_SYSTEMS.length} ERP systems.`);

  // 3. Seed Accounting Systems
  for (const item of ACCOUNTING_SYSTEMS) {
    await prisma.accountingTaxonomy.upsert({
      where: { name: item.name },
      update: {},
      create: {
        name: item.name,
        vendor: item.vendor,
        category: item.category,
      },
    });
  }
  console.log(`✅ Seeded ${ACCOUNTING_SYSTEMS.length} accounting systems.`);

  // 4. Seed Deal Types
  for (const item of DEAL_TYPES) {
    await prisma.dealTypeTaxonomy.upsert({
      where: { code: item.code },
      update: {},
      create: {
        name: item.name,
        code: item.code,
        description: item.description,
      },
    });
  }
  console.log(`✅ Seeded ${DEAL_TYPES.length} deal types.`);

  // 5. Seed Integration Types
  for (const item of INTEGRATION_TYPES) {
    await prisma.integrationTypeTaxonomy.upsert({
      where: { code: item.code },
      update: {},
      create: {
        name: item.name,
        code: item.code,
        description: item.description,
      },
    });
  }
  console.log(`✅ Seeded ${INTEGRATION_TYPES.length} integration types.`);

  // 6. Seed PMI Tasks
  for (const item of PMI_TASKS) {
    await prisma.pmiTaskTaxonomy.upsert({
      where: { name: item.name },
      update: {},
      create: {
        name: item.name,
        category: item.category,
      },
    });
  }
  console.log(`✅ Seeded ${PMI_TASKS.length} PMI tasks.`);

  console.log('✨ MerQent Database Taxonomy Seed Completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
