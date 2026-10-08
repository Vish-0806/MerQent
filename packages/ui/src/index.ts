/**
 * MerQent Design System & UI Contracts
 * Shared theme tokens, variant types, and layout contracts across web and shared presentation layers.
 */

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  muted: string;
  border: string;
  destructive: string;
  success: string;
  warning: string;
}

export const MERQENT_THEME = {
  colors: {
    brandNavy: '#0F172A',
    brandSlate: '#1E293B',
    brandBlue: '#2563EB',
    brandIndigo: '#4F46E5',
    brandTeal: '#0D9488',
    surfaceDark: '#0B0F19',
    surfaceCard: '#111827',
    borderMuted: '#1F2937',
    textPrimary: '#F8FAFC',
    textMuted: '#94A3B8',
  },
  typography: {
    fontSans: 'var(--font-inter)',
    fontMono: 'var(--font-roboto-mono)',
  },
} as const;

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';
export type BadgeVariant =
  'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'verified';
