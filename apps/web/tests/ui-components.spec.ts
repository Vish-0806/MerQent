import { cn } from '../lib/utils';
import { buttonVariants } from '../components/ui/button';
import { badgeVariants } from '../components/ui/badge';
import { siteConfig } from '../config/site';

describe('Web UI Foundation & Tokens', () => {
  describe('cn utility', () => {
    it('merges class names and resolves tailwind conflicts', () => {
      const result = cn('px-2 py-1', 'px-4', { 'text-white': true, 'bg-black': false });
      expect(result).toContain('px-4');
      expect(result).not.toContain('px-2');
      expect(result).toContain('py-1');
      expect(result).toContain('text-white');
      expect(result).not.toContain('bg-black');
    });
  });

  describe('buttonVariants', () => {
    it('generates correct classes for primary variant and md size by default', () => {
      const classes = buttonVariants();
      expect(classes).toContain('bg-primary');
      expect(classes).toContain('h-10');
    });

    it('generates correct classes for outline variant and sm size', () => {
      const classes = buttonVariants({ variant: 'outline', size: 'sm' });
      expect(classes).toContain('border-border');
      expect(classes).toContain('h-8');
    });

    it('generates correct classes for destructive variant and lg size', () => {
      const classes = buttonVariants({ variant: 'destructive', size: 'lg' });
      expect(classes).toContain('bg-destructive');
      expect(classes).toContain('h-12');
    });
  });

  describe('badgeVariants', () => {
    it('generates verified badge classes with blue border and background', () => {
      const classes = badgeVariants({ variant: 'verified' });
      expect(classes).toContain('border-blue-500/40');
      expect(classes).toContain('text-blue-300');
    });

    it('generates success badge classes with emerald styling', () => {
      const classes = badgeVariants({ variant: 'success' });
      expect(classes).toContain('text-emerald-400');
    });
  });

  describe('siteConfig', () => {
    it('contains valid navigation structure for all roles', () => {
      expect(siteConfig.name).toBe('MerQent');
      expect(siteConfig.navigation.public.length).toBeGreaterThan(0);
      expect(siteConfig.navigation.firm.length).toBeGreaterThan(0);
      expect(siteConfig.navigation.consultant.length).toBeGreaterThan(0);
      expect(siteConfig.navigation.admin.length).toBeGreaterThan(0);
    });
  });
});
