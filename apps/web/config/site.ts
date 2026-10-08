import { SiteConfig } from '../types';

export const siteConfig: SiteConfig = {
  name: 'MerQent',
  tagline: 'Specialized PMI Expertise. Intelligent Matching. Trusted Connections.',
  description:
    'The enterprise B2B marketplace connecting Private Equity sponsors and portfolio operations with vetted Post-Merger Integration (PMI) operators and executive consultants.',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  links: {
    github: 'https://github.com/Vish-0806/MerQent',
  },
  navigation: {
    public: [
      {
        title: 'Platform',
        href: '/#platform',
        description: 'Comprehensive overview of MerQent M&A integration capabilities',
      },
      {
        title: 'Taxonomies',
        href: '/#taxonomies',
        description: 'Governed ERP, Deal Archetype, and Workstream taxonomies',
      },
      {
        title: 'Verification',
        href: '/#verification',
        description: 'Multi-tier credential and track-record vetting system',
      },
      {
        title: 'AI Matching',
        href: '/#ai-matching',
        description: 'Grounded hybrid semantic and faceted operator recommendation engine',
      },
    ],
    firm: [
      {
        title: 'Dashboard',
        href: '/firm/dashboard',
        description: 'Portfolio overview, active integration mandates, and pipeline',
      },
      {
        title: 'Post Mandate',
        href: '/firm/projects/new',
        description: 'Create an integration project with confidential entity masking',
      },
      {
        title: 'Candidate Matches',
        href: '/firm/matches',
        description: 'AI-grounded candidate recommendations with evidence scores',
      },
      {
        title: 'Shortlists',
        href: '/firm/shortlists',
        description: 'Side-by-side comparison of qualified integration specialists',
      },
      {
        title: 'Messages',
        href: '/firm/messages',
        description: 'Confidential end-to-end messaging and scheduling',
      },
    ],
    consultant: [
      {
        title: 'Dashboard',
        href: '/consultant/dashboard',
        description: 'Engagement requests, availability calendar, and profile health',
      },
      {
        title: 'PMI Profile',
        href: '/consultant/profile',
        description: 'Verified ERP experience, deal history, and credentials',
      },
      {
        title: 'Opportunities',
        href: '/consultant/opportunities',
        description: 'Confidential integration mandates matching your expertise',
      },
      {
        title: 'Calendar & Schedule',
        href: '/consultant/schedule',
        description: 'Timezone-aware interview and engagement scheduling',
      },
      {
        title: 'Messages',
        href: '/consultant/messages',
        description: 'Direct communications with PE sponsors and operating partners',
      },
    ],
    admin: [
      {
        title: 'Overview',
        href: '/admin/overview',
        description: 'System health, operator throughput, and engagement metrics',
      },
      {
        title: 'Verifications',
        href: '/admin/verifications',
        description: 'Pending operator identity and credential verification queue',
      },
      {
        title: 'Taxonomies',
        href: '/admin/taxonomies',
        description: 'ERP systems, deal archetypes, and industry taxonomy governance',
      },
      {
        title: 'Audit Logs',
        href: '/admin/audit',
        description: 'Immutable system event trail and security compliance records',
      },
    ],
  },
};
