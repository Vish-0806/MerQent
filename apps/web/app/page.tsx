import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Layers,
  Database,
  Building2,
  Users,
  Lock,
  Workflow,
  CheckCircle2,
} from 'lucide-react';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  return (
    <main className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32 bg-gradient-to-b from-[#0B0F19] via-[#0F172A] to-[#0B0F19]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.15),rgba(255,255,255,0))]" />

        <Container className="relative z-10">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-8">
            {/* Status Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-medium">
              <span className="flex h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
              <span>Enterprise Post-Merger Integration Marketplace</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">Phase 2.3 Web Foundation</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
              Specialized PMI Expertise for{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-teal-400">
                Private Equity
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-lg md:text-xl text-slate-300 max-w-3xl leading-relaxed">
              Generic marketplaces fail when multi-billion dollar carve-outs depend on SAP S/4HANA
              cutovers, TSA expirations, and synergy targets. MerQent connects PE sponsors with
              vetted PMI operators through governed taxonomies and grounded AI matching.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 w-full sm:w-auto">
              <Link href="#pe-firms" className="w-full sm:w-auto">
                <Button variant="primary" size="lg" className="w-full sm:w-auto text-base gap-2">
                  <span>For Private Equity Sponsors</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="#consultants" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-base gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-400" />
                  <span>For Vetted PMI Operators</span>
                </Button>
              </Link>
            </div>

            {/* Architecture Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12 w-full max-w-3xl border-t border-border/60">
              <div className="flex flex-col items-center p-3">
                <span className="text-2xl font-bold text-white tracking-tight">4 Governed</span>
                <span className="text-xs text-slate-400 mt-1">Domain Taxonomies</span>
              </div>
              <div className="flex flex-col items-center p-3">
                <span className="text-2xl font-bold text-blue-400 tracking-tight">Multi-Tier</span>
                <span className="text-xs text-slate-400 mt-1">Operator Verification</span>
              </div>
              <div className="flex flex-col items-center p-3">
                <span className="text-2xl font-bold text-indigo-400 tracking-tight">21-Factor</span>
                <span className="text-xs text-slate-400 mt-1">Grounded AI Matching</span>
              </div>
              <div className="flex flex-col items-center p-3">
                <span className="text-2xl font-bold text-teal-400 tracking-tight">100% Zero</span>
                <span className="text-xs text-slate-400 mt-1">AI Hallucination</span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Problem & Distinction Section */}
      <section id="platform" className="py-20 bg-[#0B0F19] border-t border-border">
        <Container>
          <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
            <Badge variant="primary">The PMI Specialization Gap</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Why Generic Platforms Fail Post-Acquisition
            </h2>
            <p className="text-slate-400 leading-relaxed">
              Post-merger integration requires operational battle-scars, not generic consulting.
              MerQent is engineered to meet the stringent demands of Private Equity deal teams.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-border/80 bg-surface/60 hover:border-border transition-all">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                  <Layers className="h-5 w-5" />
                </div>
                <CardTitle className="text-xl">Governed Domain Taxonomies</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-400 leading-relaxed">
                Structured taxonomy classification covering 14 ERP systems (SAP S/4HANA, Oracle,
                NetSuite), 6 M&A deal archetypes (Carve-out, Add-on, Platform), and 10 PMI
                workstreams.
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-surface/60 hover:border-border transition-all">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <CardTitle className="text-xl">Multi-Tier Operator Vetting</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-400 leading-relaxed">
                4-tier verification protocol: Government ID authentication, professional credential
                validation, redacted M&A transaction history, and operating partner peer
                confirmations.
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-surface/60 hover:border-border transition-all">
              <CardHeader>
                <div className="h-10 w-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                  <Sparkles className="h-5 w-5" />
                </div>
                <CardTitle className="text-xl">Grounded AI Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-400 leading-relaxed">
                Two-stage grounded pipeline combining exact taxonomy filters and pgvector semantic
                retrieval. Every recommendation is mathematically scored with evidence citations.
              </CardContent>
            </Card>
          </div>
        </Container>
      </section>

      {/* Role-Based Solutions */}
      <section className="py-20 bg-surface/40 border-t border-border">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* For PE Firms */}
            <div id="pe-firms" className="space-y-6">
              <div className="flex items-center gap-2">
                <Building2 className="h-6 w-6 text-blue-400" />
                <Badge variant="primary">For PE Sponsors & Operating Partners</Badge>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Confidential Mandate Scoping & Fast Specialist Deployment
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Private equity deal cycles require absolute discretion. MerQent enables operating
                teams to publish integration projects with confidential deal entity masking.
              </p>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                  <span>
                    Confidential masking hides target corporate identity until connection handshake
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                  <span>
                    Side-by-side comparison tables scoring operators across ERPs and deal experience
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                  <span>
                    Direct in-platform scheduling with universal RFC 5545 calendar invitations
                  </span>
                </li>
              </ul>
            </div>

            {/* For PMI Operators */}
            <div id="consultants" className="space-y-6">
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-teal-400" />
                <Badge variant="success">For Vetted PMI Operators</Badge>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                High-Value Mandates Matched to Your Specific Deal Track Record
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Showcase your verified integration credentials directly to managing directors and
                portfolio operations leaders looking for operators who have solved their exact
                problems.
              </p>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
                  <span>
                    Verified badges displaying validated cutover experience and industry domain
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
                  <span>
                    Precise availability calendar preventing unsolicited or mismatched outreach
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
                  <span>
                    Relationship-gated messaging protecting operator time and confidential documents
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* Architecture & Trust Foundations */}
      <section id="taxonomies" className="py-20 bg-[#0B0F19] border-t border-border">
        <Container>
          <div className="rounded-2xl border border-border/80 bg-gradient-to-r from-surface to-surface-elevated/40 p-8 sm:p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                    Production Architecture
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white">
                  Engineered on Rigorous Enterprise ADRs
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Every subsystem within MerQent adheres to formal Architecture Decision Records:
                  PostgreSQL 16 unified relational and pgvector embedding storage, NestJS modular
                  architecture, dual-token authentication, and zero third-party vector lock-in.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-border bg-surface/90">
                  <Lock className="h-5 w-5 text-emerald-400 mb-2" />
                  <div className="text-sm font-semibold text-white">ADR-005 Security</div>
                  <div className="text-xs text-slate-400 mt-1">Dual-Token JWT & Rotation</div>
                </div>
                <div className="p-4 rounded-xl border border-border bg-surface/90">
                  <Database className="h-5 w-5 text-blue-400 mb-2" />
                  <div className="text-sm font-semibold text-white">ADR-003 Storage</div>
                  <div className="text-xs text-slate-400 mt-1">PostgreSQL 16 + pgvector</div>
                </div>
                <div className="p-4 rounded-xl border border-border bg-surface/90">
                  <Workflow className="h-5 w-5 text-indigo-400 mb-2" />
                  <div className="text-sm font-semibold text-white">ADR-008 Realtime</div>
                  <div className="text-xs text-slate-400 mt-1">WebSockets & Redis Cluster</div>
                </div>
                <div className="p-4 rounded-xl border border-border bg-surface/90">
                  <Sparkles className="h-5 w-5 text-teal-400 mb-2" />
                  <div className="text-sm font-semibold text-white">ADR-006 AI Engine</div>
                  <div className="text-xs text-slate-400 mt-1">Grounded Hybrid Matching</div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
