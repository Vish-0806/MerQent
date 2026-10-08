'use client';

import * as React from 'react';
import Link from 'next/link';
import { Layers, ChevronDown, Sparkles } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { Container } from './container';
import { MobileNav } from './mobile-nav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-200 border-b ${
        scrolled
          ? 'border-border bg-[#0B0F19]/90 backdrop-blur-md shadow-sm'
          : 'border-border/50 bg-[#0B0F19]/60 backdrop-blur-sm'
      }`}
    >
      <Container>
        <div className="flex h-16 items-center justify-between">
          {/* Brand Logo & Architecture Badge */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-glow group-hover:scale-105 transition-transform">
                <Layers className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg tracking-tight text-white group-hover:text-blue-400 transition-colors">
                    MerQent
                  </span>
                  <Badge variant="verified" className="text-[10px] py-0 px-1.5 h-4">
                    PMI
                  </Badge>
                </div>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
              {siteConfig.navigation.public.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-surface-elevated/60 rounded-md transition-colors"
                >
                  {item.title}
                </Link>
              ))}

              {/* Architecture-Ready Solutions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-surface-elevated/60 rounded-md transition-colors outline-none cursor-pointer">
                    <span>Solutions</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 p-2">
                  <DropdownMenuLabel>Marketplace Portals</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link href="/#pe-firms" className="cursor-pointer">
                      <div className="flex flex-col">
                        <span className="font-medium text-white">Private Equity Firms</span>
                        <span className="text-xs text-muted-foreground">
                          Scope integration mandates & match operators
                        </span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/#consultants" className="cursor-pointer">
                      <div className="flex flex-col">
                        <span className="font-medium text-white">PMI Operators</span>
                        <span className="text-xs text-muted-foreground">
                          Verified ERP cutover & carve-out records
                        </span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/#ai-matching" className="cursor-pointer">
                      <div className="flex items-center gap-2 text-blue-400">
                        <Sparkles className="h-4 w-4" />
                        <span className="text-xs font-semibold">Grounded AI Engine (ADR-006)</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          </div>

          {/* Right Actions & Mobile Toggle */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/#pe-firms">
                <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                  Sign In
                </Button>
              </Link>
              <Link href="/#consultants">
                <Button variant="primary" size="sm">
                  Request Access
                </Button>
              </Link>
            </div>

            {/* Mobile Nav Trigger */}
            <MobileNav />
          </div>
        </div>
      </Container>
    </header>
  );
}
