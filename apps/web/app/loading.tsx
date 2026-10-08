import { Container } from '@/components/layout/container';

export default function Loading() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center py-16">
      <Container size="narrow">
        <div className="flex flex-col items-center justify-center space-y-6">
          {/* Animated Spinner & Rings */}
          <div className="relative flex items-center justify-center h-16 w-16">
            <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 animate-ping" />
            <div className="h-12 w-12 rounded-full border-2 border-t-primary border-r-transparent border-b-primary border-l-transparent animate-spin" />
          </div>

          <div className="flex flex-col items-center space-y-2 text-center">
            <span className="text-sm font-semibold text-white tracking-wide">
              Loading MerQent View...
            </span>
            <span className="text-xs text-muted-foreground">
              Retrieving verified integration models and components
            </span>
          </div>

          {/* Skeleton lines */}
          <div className="w-full max-w-sm space-y-3 pt-4">
            <div className="h-3 w-full bg-surface-elevated rounded animate-pulse" />
            <div className="h-3 w-3/4 mx-auto bg-surface-elevated/70 rounded animate-pulse" />
          </div>
        </div>
      </Container>
    </main>
  );
}
