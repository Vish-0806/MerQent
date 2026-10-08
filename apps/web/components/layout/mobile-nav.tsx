'use client';

import * as React from 'react';
import Link from 'next/link';
import { Menu, X, ArrowRight, ShieldCheck, Briefcase, UserCheck } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function MobileNav() {
  const [isOpen, setIsOpen] = React.useState(false);

  // Close on Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle navigation menu"
        className="text-muted-foreground hover:text-white"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 top-16 z-50 bg-[#0B0F19]/95 backdrop-blur-xl border-t border-border flex flex-col p-6 overflow-y-auto animate-in fade-in-0 slide-in-from-top-4 duration-200">
          <div className="space-y-6 flex-1">
            {/* Public Links */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Platform
              </p>
              <nav className="flex flex-col space-y-3">
                {siteConfig.navigation.public.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="text-base font-medium text-slate-200 hover:text-white transition-colors py-1"
                  >
                    {item.title}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Architecture-Ready Role Sections */}
            <div className="pt-4 border-t border-border space-y-4">
              <div className="rounded-lg border border-border/80 bg-surface/80 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-semibold text-white">Private Equity Firms</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Scope mandates with confidential entity masking and grounded AI matching.
                </p>
                <Link
                  href="/#pe-firms"
                  onClick={() => setIsOpen(false)}
                  className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  Explore PE workflows <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="rounded-lg border border-border/80 bg-surface/80 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="h-4 w-4 text-teal-400" />
                  <span className="text-sm font-semibold text-white">PMI Operators</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Showcase multi-deal track records and ERP cutover history with verified badges.
                </p>
                <Link
                  href="/#consultants"
                  onClick={() => setIsOpen(false)}
                  className="text-xs font-medium text-teal-400 hover:text-teal-300 flex items-center gap-1"
                >
                  Join verified operator network <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="pt-6 border-t border-border space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-4 w-4 text-blue-400" /> Enterprise Verification
              </span>
              <Badge variant="primary">Phase 2.3 Ready</Badge>
            </div>
            <Button
              variant="outline"
              className="w-full justify-center"
              onClick={() => setIsOpen(false)}
            >
              Sign In
            </Button>
            <Button
              variant="primary"
              className="w-full justify-center"
              onClick={() => setIsOpen(false)}
            >
              Request Access
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
