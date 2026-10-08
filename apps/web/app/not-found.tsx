import Link from 'next/link';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center py-16">
      <Container size="narrow">
        <div className="flex flex-col items-center text-center p-8 rounded-2xl border border-border bg-surface shadow-elevated space-y-6">
          <div className="h-16 w-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <FileQuestion className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 font-mono">
              404 — Not Found
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Page or Mandate Not Found
            </h1>
            <p className="text-sm text-slate-400 max-w-md">
              The requested integration mandate, operator profile, or page does not exist or may
              have been archived.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 w-full sm:w-auto">
            <Link href="/" className="w-full sm:w-auto">
              <Button variant="primary" className="gap-2 w-full sm:w-auto">
                <Home className="h-4 w-4" />
                <span>Return to Home</span>
              </Button>
            </Link>
            <Link href="/#platform" className="w-full sm:w-auto">
              <Button variant="outline" className="gap-2 w-full sm:w-auto">
                <ArrowLeft className="h-4 w-4" />
                <span>Platform Overview</span>
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </main>
  );
}
