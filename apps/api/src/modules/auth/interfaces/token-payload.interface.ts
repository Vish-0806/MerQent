import { UserRole } from '@merqent/shared-types';

export interface JwtAccessPayload {
  sub: string;
  email: string;
  role: UserRole;
  type: 'access';
}

export interface JwtRefreshPayload {
  sub: string;
  jti: string;
  type: 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}
