import Link from 'next/link';
import { Layers, ShieldCheck, Database, Cpu, Lock } from 'lucide-react';
import { Container } from './container';
import { Badge } from '@/components/ui/badge';

export function Footer() {
  return (
    <footer className="border-t border-border bg-[#070A10] text-slate-400 py-16">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Layers className="h-4 w-4" />
              </div>
              <span className="font-bold text-lg text-white">MerQent</span>
              <Badge variant="verified" className="text-[10px]">
                PMI Marketplace
              </Badge>
            </div>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              Specialized B2B marketplace engineered for Private Equity sponsors and portfolio
              operations teams to source vetted Post-Merger Integration (PMI) operators and
              executive consultants.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 px-2 py-1 rounded bg-surface border border-border">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-400" /> Multi-Tier Vetting
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 px-2 py-1 rounded bg-surface border border-border">
                <Database className="h-3.5 w-3.5 text-emerald-400" /> PostgreSQL 16 + pgvector
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 px-2 py-1 rounded bg-surface border border-border">
                <Cpu className="h-3.5 w-3.5 text-indigo-400" /> Grounded AI (ADR-006)
              </span>
            </div>
          </div>

          {/* Governed Taxonomies */}
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wider text-white">
              Governed Taxonomies
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="hover:text-white transition-colors cursor-default">
                  ERP & Finance Systems
                </span>
              </li>
              <li>
                <span className="hover:text-white transition-colors cursor-default">
                  Corporate Carve-Outs
                </span>
              </li>
              <li>
                <span className="hover:text-white transition-colors cursor-default">
                  Day-1 Readiness & TSAs
                </span>
              </li>
              <li>
                <span className="hover:text-white transition-colors cursor-default">
                  Synergy Realization
                </span>
              </li>
              <li>
                <span className="hover:text-white transition-colors cursor-default">
                  Chart-of-Accounts Harmonization
                </span>
              </li>
            </ul>
          </div>

          {/* Solutions & Roles */}
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wider text-white">Solutions</p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/#pe-firms" className="hover:text-white transition-colors">
                  For Private Equity Sponsors
                </Link>
              </li>
              <li>
                <Link href="/#consultants" className="hover:text-white transition-colors">
                  For PMI Operators
                </Link>
              </li>
              <li>
                <Link href="/#verification" className="hover:text-white transition-colors">
                  Verification Tiers
                </Link>
              </li>
              <li>
                <Link href="/#ai-matching" className="hover:text-white transition-colors">
                  Hybrid AI Matching
                </Link>
              </li>
              <li>
                <Link href="/#security" className="hover:text-white transition-colors">
                  Confidential Deal Masking
                </Link>
              </li>
            </ul>
          </div>

          {/* Enterprise & Security */}
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wider text-white">
              Security & Compliance
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-emerald-400" />
                <span>Dual-Token JWT + Argon2id</span>
              </li>
              <li>
                <span className="text-slate-400">Strict Row-Level Security</span>
              </li>
              <li>
                <span className="text-slate-400">SOC 2 Type II Alignment</span>
              </li>
              <li>
                <span className="text-slate-400">Auditable Event Ledger</span>
              </li>
              <li>
                <span className="text-slate-400">Zero Public PII Exposure</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            &copy; {new Date().getFullYear()} MerQent Inc. Enterprise PMI Marketplace. All rights
            reserved.
          </p>
          <div className="flex items-center space-x-6">
            <span>Enterprise Privacy</span>
            <span>Terms of Engagement</span>
            <span>Security Architecture</span>
            <span className="text-blue-400 font-mono">Phase 2.3 Ready</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
