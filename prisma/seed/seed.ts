/**
 * MerQent Production Database Seed Script
 * Populates controlled taxonomies in TaxonomyTerm matching prisma/schema.prisma:
 * Categories: INDUSTRY, ERP_SYSTEM, ACCOUNTING_SYSTEM, DEAL_TYPE, INTEGRATION_DISCIPLINE, PMI_TASK.
 */

import { PrismaClient, TaxonomyCategory } from '@prisma/client';

const prisma = new PrismaClient();

interface SeedTerm {
  category: TaxonomyCategory;
  code: string;
  name: string;
  description?: string;
}

const TAXONOMY_TERMS: SeedTerm[] = [
  // 1. Industries
  {
    category: TaxonomyCategory.INDUSTRY,
    code: 'IND_HEALTHCARE',
    name: 'Healthcare & Life Sciences',
    description: 'Hospitals, medical devices, pharmaceuticals, biotech',
  },
  {
    category: TaxonomyCategory.INDUSTRY,
    code: 'IND_TECH_SAAS',
    name: 'Software & Technology (SaaS)',
    description: 'Enterprise software, B2B SaaS, cloud infrastructure',
  },
  {
    category: TaxonomyCategory.INDUSTRY,
    code: 'IND_MANUFACTURING',
    name: 'Manufacturing & Industrials',
    description: 'Engineered products, automotive supply, industrial automation',
  },
  {
    category: TaxonomyCategory.INDUSTRY,
    code: 'IND_FINANCIAL',
    name: 'Financial Services & FinTech',
    description: 'Asset management, banking tech, payment processing',
  },
  {
    category: TaxonomyCategory.INDUSTRY,
    code: 'IND_CONSUMER',
    name: 'Consumer & Retail',
    description: 'DTC, omni-channel retail, food & beverage',
  },
  {
    category: TaxonomyCategory.INDUSTRY,
    code: 'IND_LOGISTICS',
    name: 'Business Services & Logistics',
    description: '3PL, freight, facility management, B2B outsourced services',
  },
  {
    category: TaxonomyCategory.INDUSTRY,
    code: 'IND_ENERGY',
    name: 'Energy & Infrastructure',
    description: 'Renewables, utility services, telecommunications',
  },

  // 2. ERP Systems
  {
    category: TaxonomyCategory.ERP_SYSTEM,
    code: 'ERP_SAP_S4HANA',
    name: 'SAP S/4HANA',
    description: 'Tier 1 Enterprise ERP suite',
  },
  {
    category: TaxonomyCategory.ERP_SYSTEM,
    code: 'ERP_SAP_B1',
    name: 'SAP Business One',
    description: 'Tier 2 Mid-market ERP suite',
  },
  {
    category: TaxonomyCategory.ERP_SYSTEM,
    code: 'ERP_ORACLE_NETSUITE',
    name: 'Oracle NetSuite',
    description: 'Cloud ERP for fast-growing and mid-market enterprises',
  },
  {
    category: TaxonomyCategory.ERP_SYSTEM,
    code: 'ERP_ORACLE_FUSION',
    name: 'Oracle Cloud ERP (Fusion)',
    description: 'Tier 1 Enterprise financial and operational ERP',
  },
  {
    category: TaxonomyCategory.ERP_SYSTEM,
    code: 'ERP_MS_D365_FO',
    name: 'Microsoft Dynamics 365 Finance & Operations',
    description: 'Tier 1 Enterprise operational and supply chain ERP',
  },
  {
    category: TaxonomyCategory.ERP_SYSTEM,
    code: 'ERP_MS_D365_BC',
    name: 'Microsoft Dynamics 365 Business Central',
    description: 'Tier 2 Mid-market operational ERP',
  },
  {
    category: TaxonomyCategory.ERP_SYSTEM,
    code: 'ERP_WORKDAY_FIN',
    name: 'Workday Financial Management',
    description: 'Cloud financial management and planning',
  },
  {
    category: TaxonomyCategory.ERP_SYSTEM,
    code: 'ERP_INFOR_CS',
    name: 'Infor CloudSuite',
    description: 'Specialized enterprise industrial ERP',
  },
  {
    category: TaxonomyCategory.ERP_SYSTEM,
    code: 'ERP_EPICOR',
    name: 'Epicor ERP',
    description: 'Mid-market manufacturing & distribution ERP',
  },
  {
    category: TaxonomyCategory.ERP_SYSTEM,
    code: 'ERP_SAGE_INTACCT',
    name: 'Sage Intacct',
    description: 'Cloud financial management system',
  },

  // 3. Accounting Systems
  {
    category: TaxonomyCategory.ACCOUNTING_SYSTEM,
    code: 'ACC_BLACKLINE',
    name: 'BlackLine',
    description: 'Financial close management and account reconciliation',
  },
  {
    category: TaxonomyCategory.ACCOUNTING_SYSTEM,
    code: 'ACC_FLOQAST',
    name: 'FloQast',
    description: 'Accounting workflow automation and close management',
  },
  {
    category: TaxonomyCategory.ACCOUNTING_SYSTEM,
    code: 'ACC_ONESTREAM',
    name: 'OneStream Software',
    description: 'Corporate performance management (CPM) and financial consolidation',
  },
  {
    category: TaxonomyCategory.ACCOUNTING_SYSTEM,
    code: 'ACC_ORACLE_FCCS',
    name: 'Oracle Hyperion / FCCS',
    description: 'Financial consolidation and close service',
  },
  {
    category: TaxonomyCategory.ACCOUNTING_SYSTEM,
    code: 'ACC_QUICKBOOKS_ENT',
    name: 'QuickBooks Enterprise',
    description: 'SMB accounting and inventory management',
  },
  {
    category: TaxonomyCategory.ACCOUNTING_SYSTEM,
    code: 'ACC_XERO',
    name: 'Xero Accounting',
    description: 'Cloud SMB accounting software',
  },

  // 4. Deal Types
  {
    category: TaxonomyCategory.DEAL_TYPE,
    code: 'DEAL_PLATFORM',
    name: 'Platform Acquisition',
    description: 'Initial platform investment by private equity sponsor',
  },
  {
    category: TaxonomyCategory.DEAL_TYPE,
    code: 'DEAL_ADD_ON',
    name: 'Add-on / Bolt-on Acquisition',
    description: 'Strategic tuck-in acquisition integrated into existing platform company',
  },
  {
    category: TaxonomyCategory.DEAL_TYPE,
    code: 'DEAL_CARVE_OUT',
    name: 'Corporate Carve-out / Divestiture',
    description: 'Separation and standalone operationalization of a business unit',
  },
  {
    category: TaxonomyCategory.DEAL_TYPE,
    code: 'DEAL_MERGER_OF_EQUALS',
    name: 'Merger of Equals',
    description: 'Direct operational merger of two comparable scale organizations',
  },
  {
    category: TaxonomyCategory.DEAL_TYPE,
    code: 'DEAL_CROSS_BORDER',
    name: 'Cross-Border Acquisition',
    description:
      'International acquisition involving multi-jurisdiction regulatory & tax integration',
  },

  // 5. Integration Disciplines
  {
    category: TaxonomyCategory.INTEGRATION_DISCIPLINE,
    code: 'DISC_FULL_INTEGRATION',
    name: 'Full Operational Integration',
    description: 'Comprehensive consolidation of ERP, finance, sales, IT, and HR',
  },
  {
    category: TaxonomyCategory.INTEGRATION_DISCIPLINE,
    code: 'DISC_BACK_OFFICE',
    name: 'Back-Office / Shared Services Only',
    description: 'Financial consolidation, reporting, payroll, and shared infrastructure',
  },
  {
    category: TaxonomyCategory.INTEGRATION_DISCIPLINE,
    code: 'DISC_HOLD_CO',
    name: 'Autonomous / Holding Co Governance',
    description: 'Decentralized operational model with executive oversight and financial reporting',
  },
  {
    category: TaxonomyCategory.INTEGRATION_DISCIPLINE,
    code: 'DISC_TSA_EXIT',
    name: 'Carve-Out Transition (TSA Exit)',
    description: 'Transition Service Agreement standup, migration, and vendor replacement',
  },

  // 6. PMI Tasks
  {
    category: TaxonomyCategory.PMI_TASK,
    code: 'TASK_DAY_1_READINESS',
    name: 'Day 1 Readiness & Executive Playbook',
    description: 'Operational continuity and executive leadership on transaction close',
  },
  {
    category: TaxonomyCategory.PMI_TASK,
    code: 'TASK_100_DAY_PLAN',
    name: '100-Day Integration Execution',
    description: 'Synergy roadmap delivery and prioritized workstream tracking',
  },
  {
    category: TaxonomyCategory.PMI_TASK,
    code: 'TASK_COA_HARMONIZATION',
    name: 'Chart of Accounts (COA) Harmonization',
    description: 'Unifying ledger structures and revenue recognition standards',
  },
  {
    category: TaxonomyCategory.PMI_TASK,
    code: 'TASK_ERP_CUTOVER',
    name: 'ERP Migration & System Cutover',
    description: 'Data migration, interface integration, and go-live cutover governance',
  },
  {
    category: TaxonomyCategory.PMI_TASK,
    code: 'TASK_CULTURE_ALIGNMENT',
    name: 'Executive Team & Culture Alignment',
    description: 'Retention planning, leadership assessment, and cultural integration',
  },
  {
    category: TaxonomyCategory.PMI_TASK,
    code: 'TASK_VENDOR_SYNERGIES',
    name: 'Vendor Rationalization & Procurement Synergy',
    description: 'Contract renegotiation, supplier consolidation, and direct cost savings',
  },
  {
    category: TaxonomyCategory.PMI_TASK,
    code: 'TASK_IT_HARDENING',
    name: 'IT Infrastructure & Cyber Diligence Hardening',
    description: 'Network consolidation, cybersecurity remediation, and cloud migration',
  },
];

async function main() {
  console.log('🌱 Starting MerQent Database Taxonomy Seed...');

  let count = 0;
  for (const term of TAXONOMY_TERMS) {
    await prisma.taxonomyTerm.upsert({
      where: { code: term.code },
      update: {
        name: term.name,
        category: term.category,
        description: term.description,
        isActive: true,
      },
      create: {
        code: term.code,
        name: term.name,
        category: term.category,
        description: term.description,
        isActive: true,
      },
    });
    count++;
  }

  console.log(`✅ Seeded ${count} taxonomy terms successfully across all categories.`);
  console.log('✨ MerQent Database Taxonomy Seed Completed.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
