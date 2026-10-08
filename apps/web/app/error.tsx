'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Container } from '@/components/layout/container';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log error cleanly for observability
    console.error('Unhandled Next.js application error caught by boundary:', error);
  }, [error]);

  return (
    <main className="min-h-[70vh] flex items-center justify-center py-16">
      <Container size="narrow">
        <div className="flex flex-col items-center text-center p-8 rounded-2xl border border-border bg-surface shadow-elevated space-y-6">
          <div className="h-16 w-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <AlertTriangle className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Application Error Encountered
            </h1>
            <p className="text-sm text-slate-400 max-w-md">
              An unexpected error occurred while rendering this view. Our observability pipeline has
              recorded this event.
            </p>
          </div>

          {error.digest && (
            <div className="px-3 py-1.5 rounded bg-surface-elevated border border-border text-xs font-mono text-slate-400">
              Error Digest: {error.digest}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 w-full sm:w-auto">
            <Button variant="primary" onClick={() => reset()} className="gap-2 w-full sm:w-auto">
              <RefreshCw className="h-4 w-4" />
              <span>Try Again</span>
            </Button>
            <Link href="/" className="w-full sm:w-auto">
              <Button variant="outline" className="gap-2 w-full sm:w-auto">
                <Home className="h-4 w-4" />
                <span>Return to Home</span>
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </main>
  );
}
