import { Injectable, ConflictException, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { UserRole, UserStatus } from '@merqent/shared-types';
import { RegisterUserSchema, LoginUserSchema } from '@merqent/validation';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { RegisterDto, LoginDto, SanitizedUserDto } from './dto';
import { JwtAccessPayload, JwtRefreshPayload } from './interfaces/token-payload.interface';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: SanitizedUserDto;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Register a new user with Argon2id password hashing and shared Zod validation.
   */
  async register(dto: RegisterDto, ipAddress?: string, deviceInfo?: string): Promise<AuthResult> {
    // 1. Validate strictly using shared Zod schema
    const validated = RegisterUserSchema.parse(dto);

    const normalizedEmail = validated.email.trim().toLowerCase();

    // 2. Duplicate account handling
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      this.logger.warn(`Registration rejected: Duplicate email ${normalizedEmail}`);
      throw new ConflictException('An account with this email address already exists');
    }

    // 3. Password hashing using Argon2id
    const passwordHash = await argon2.hash(validated.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // 4. Persistence with active status
    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        fullName: validated.fullName.trim(),
        role: validated.role,
        status: UserStatus.ACTIVE,
      },
    });

    this.logger.log(`User registered successfully: ${user.id} [${user.role}]`);

    // 5. Generate dual-token pair & session record
    const { accessToken, refreshToken } = await this.generateTokenPair(
      user.id,
      user.email,
      user.role,
      ipAddress,
      deviceInfo,
    );

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Authenticate a user with Argon2id password verification, status checks, and safe errors.
   */
  async login(dto: LoginDto, ipAddress?: string, deviceInfo?: string): Promise<AuthResult> {
    // 1. Validate input format using shared Zod schema
    const validated = LoginUserSchema.parse(dto);
    const normalizedEmail = validated.email.trim().toLowerCase();

    // 2. Retrieve user record
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { firmMember: true, consultantProfile: true },
    });

    // Timing-safe fallback hash if user does not exist
    if (!user) {
      await argon2.hash('dummy_timing_mitigation_password', {
        type: argon2.argon2id,
      });
      this.logger.warn(`Login failed: Account not found for ${normalizedEmail}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    // 3. Password verification
    const isPasswordValid = await argon2.verify(user.passwordHash, validated.password);
    if (!isPasswordValid) {
      this.logger.warn(`Login failed: Invalid credentials for user ${user.id}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    // 4. Account status checks
    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DEACTIVATED) {
      this.logger.warn(`Login blocked: User ${user.id} status is ${user.status}`);
      throw new UnauthorizedException('Account is not active; please contact support');
    }

    // 5. Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 6. Generate token pair & session record
    const { accessToken, refreshToken } = await this.generateTokenPair(
      user.id,
      user.email,
      user.role,
      ipAddress,
      deviceInfo,
      user.firmMember?.firmId,
      user.consultantProfile?.id,
    );

    this.logger.log(`User logged in successfully: ${user.id}`);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Refresh session with token rotation, revocation check, reuse detection, and Redis blacklisting.
   */
  async refresh(
    rawRefreshToken: string,
    ipAddress?: string,
    deviceInfo?: string,
  ): Promise<AuthResult> {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      throw new UnauthorizedException('Refresh token is required');
    }

    const refreshSecret = this.config.get<string>('jwt.refreshSecret');

    let payload: JwtRefreshPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtRefreshPayload>(rawRefreshToken, {
        secret: refreshSecret,
      });
    } catch {
      this.logger.warn('Token refresh rejected: Invalid signature or expired refresh token');
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh' || !payload.jti) {
      throw new UnauthorizedException('Invalid token purpose; refresh token required');
    }

    // Check Redis blacklist for fast revocation & reuse detection
    const isBlacklisted = await this.redis.isTokenBlacklisted(payload.jti);
    if (isBlacklisted) {
      this.logger.warn(
        `SECURITY ALERT: Blacklisted refresh token reuse detected for user ${payload.sub}. Invalidating all active sessions.`,
      );
      await this.prisma.refreshToken.updateMany({
        where: { userId: payload.sub, isRevoked: false },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException('Refresh token has been revoked; all sessions invalidated');
    }

    // Lookup token record in database
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
    });

    if (!tokenRecord) {
      this.logger.warn(`Token refresh rejected: Token ${payload.jti} not found in database`);
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check for expiration
    if (tokenRecord.expiresAt < new Date()) {
      this.logger.warn(`Token refresh rejected: Token ${payload.jti} has expired`);
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Token reuse detection: if already revoked, potential token theft!
    if (tokenRecord.isRevoked) {
      this.logger.error(
        `SECURITY ALERT: Revoked refresh token reuse detected for user ${tokenRecord.userId}. Invalidating all active sessions.`,
      );
      // Invalidate all sessions for compromised user
      await this.prisma.refreshToken.updateMany({
        where: { userId: tokenRecord.userId, isRevoked: false },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException(
        'Refresh token reuse detected; all sessions have been revoked for security',
      );
    }

    // Verify hash match
    const computedHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    if (computedHash !== tokenRecord.tokenHash) {
      this.logger.warn(`Token refresh rejected: Hash mismatch for token ${payload.jti}`);
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Revoke the old token (Rotation)
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isRevoked: true },
    });

    // Add old token to Redis blacklist for remaining lifetime
    const remainingSeconds = Math.max(
      0,
      Math.floor((tokenRecord.expiresAt.getTime() - Date.now()) / 1000),
    );
    if (remainingSeconds > 0) {
      await this.redis.blacklistToken(tokenRecord.id, remainingSeconds);
    }

    // Fetch user and check active status
    const user = await this.prisma.user.findUnique({
      where: { id: tokenRecord.userId },
      include: { firmMember: true, consultantProfile: true },
    });

    if (!user) {
      throw new UnauthorizedException('User account no longer exists');
    }

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DEACTIVATED) {
      throw new UnauthorizedException('Account is not active');
    }

    // Generate new rotated token pair
    const { accessToken, refreshToken: newRefreshToken } = await this.generateTokenPair(
      user.id,
      user.email,
      user.role,
      ipAddress || tokenRecord.ipAddress || undefined,
      deviceInfo || tokenRecord.deviceInfo || undefined,
      user.firmMember?.firmId,
      user.consultantProfile?.id,
    );

    this.logger.log(`Session rotated successfully for user ${user.id}`);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Log out user: revoke refresh token in database and blacklist in Redis.
   */
  async logout(rawRefreshToken?: string): Promise<{ success: boolean; message: string }> {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      return { success: true, message: 'Logged out successfully' };
    }

    try {
      const refreshSecret = this.config.get<string>('jwt.refreshSecret');
      const payload = await this.jwtService.verifyAsync<JwtRefreshPayload>(rawRefreshToken, {
        secret: refreshSecret,
      });

      if (payload?.jti) {
        // Revoke token in DB
        await this.prisma.refreshToken.updateMany({
          where: { id: payload.jti, isRevoked: false },
          data: { isRevoked: true },
        });

        // Blacklist in Redis
        const defaultRevocationTtl = 7 * 24 * 60 * 60; // 7 days
        await this.redis.blacklistToken(payload.jti, defaultRevocationTtl);
        this.logger.log(`Token ${payload.jti} revoked on logout`);
      }
    } catch {
      // If token is expired or malformed, continue with clean logout
      this.logger.debug('Logout called with unverified token; continuing');
    }

    return { success: true, message: 'Logged out successfully' };
  }

  /**
   * Get current authenticated user profile.
   */
  async getMe(userId: string): Promise<SanitizedUserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DEACTIVATED) {
      throw new UnauthorizedException('Account is not active');
    }

    return this.sanitizeUser(user);
  }

  /**
   * Generate an access token (15m) and a persistent, hashed refresh token (7d).
   */
  private async generateTokenPair(
    userId: string,
    email: string,
    role: string | UserRole,
    ipAddress?: string,
    deviceInfo?: string,
    firmId?: string,
    consultantProfileId?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessSecret = this.config.get<string>('jwt.secret');
    const accessExpiresIn = this.config.get<string>('jwt.expiresIn', '15m');
    const refreshSecret = this.config.get<string>('jwt.refreshSecret');
    const refreshExpiresIn = this.config.get<string>('jwt.refreshExpiresIn', '7d');

    // 1. Sign access token
    const accessPayload: JwtAccessPayload = {
      sub: userId,
      email,
      role: role as UserRole,
      type: 'access',
      firmId,
      consultantProfileId,
    };

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: accessSecret,
      expiresIn: accessExpiresIn,
    });

    // 2. Prepare refresh token record
    const tokenId = crypto.randomUUID();
    const refreshPayload: JwtRefreshPayload = {
      sub: userId,
      jti: tokenId,
      type: 'refresh',
    };

    const rawRefreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn,
    });

    // 3. Hash refresh token using SHA-256 for secure DB persistence
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    // 4. Calculate expiresAt (7 days from now)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 5. Store in Prisma
    await this.prisma.refreshToken.create({
      data: {
        id: tokenId,
        userId,
        tokenHash,
        ipAddress: ipAddress ? ipAddress.slice(0, 45) : null,
        deviceInfo: deviceInfo ? deviceInfo.slice(0, 255) : null,
        expiresAt,
        isRevoked: false,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  /**
   * Strip sensitive fields from user object.
   */
  private sanitizeUser(user: {
    id: string;
    email: string;
    fullName: string;
    role: string | UserRole;
    status: string | UserStatus;
    avatarUrl?: string | null;
    emailVerifiedAt?: Date | null;
    mfaEnabled: boolean;
    createdAt: Date;
  }): SanitizedUserDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as UserRole,
      status: user.status as UserStatus,
      avatarUrl: user.avatarUrl ?? null,
      emailVerifiedAt: user.emailVerifiedAt ?? null,
      mfaEnabled: user.mfaEnabled,
      createdAt: user.createdAt,
    };
  }
}
