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

export interface ApiResponse<T = unknown> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
  message?: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
  timestamp: string;
  path?: string;
}
