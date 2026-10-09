/**
 * MerQent Web Application Types & Navigation Contracts
 */

export interface NavItem {
  title: string;
  href: string;
  disabled?: boolean;
  external?: boolean;
  description?: string;
  badge?: string;
}

export interface NavigationSection {
  title: string;
  items: NavItem[];
}

export interface SiteConfig {
  name: string;
  tagline: string;
  description: string;
  url: string;
  links: {
    docs?: string;
    github?: string;
  };
  navigation: {
    public: NavItem[];
    firm: NavItem[];
    consultant: NavItem[];
    admin: NavItem[];
  };
}

export type {
  ApiResponse,
  ApiErrorResponse,
  PaginationMeta,
  PaginatedResponse,
} from '@merqent/shared-types';
