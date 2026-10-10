import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Production security headers middleware.
 * Implements OWASP recommended defensive HTTP response headers without external dependencies.
 */
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(_req: Request, res: Response, next: NextFunction): void {
    // Prevent MIME-sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking by forbidding iframe framing
    res.setHeader('X-Frame-Options', 'DENY');

    // Disable buggy legacy XSS auditor in modern browsers
    res.setHeader('X-XSS-Protection', '0');

    // Enforce HTTPS across all subdomains for 1 year
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

    // Limit referrer leakage across origins
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy restricting resource execution
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self';",
    );

    // Restrict access to device APIs
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    );

    // Prevent cross-origin resource leaks
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

    // Suppress server fingerprinting headers
    res.removeHeader('X-Powered-By');

    next();
  }
}
