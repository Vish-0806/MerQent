import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request, Response, CookieOptions } from 'express';
import { ConfigService } from '@nestjs/config';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto, LoginDto, RefreshTokenDto, AuthResponseDto, SanitizedUserDto } from './dto';

const REFRESH_COOKIE_NAME = 'refresh_token';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new enterprise user account',
    description:
      'Creates a user with Argon2id password hashing, assigns the role, sets an HttpOnly refresh cookie, and returns an access token.',
  })
  @SwaggerResponse({
    status: HttpStatus.CREATED,
    description: 'User registered successfully with access token and session cookie.',
    type: AuthResponseDto,
  })
  @SwaggerResponse({ status: HttpStatus.CONFLICT, description: 'Email address already in use.' })
  @SwaggerResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation constraints failed.',
  })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await this.authService.register(dto, ip, userAgent);

    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate user credentials',
    description:
      'Validates email and Argon2id password, sets an HttpOnly refresh cookie, and returns a short-lived access token.',
  })
  @SwaggerResponse({
    status: HttpStatus.OK,
    description: 'Authentication successful.',
    type: AuthResponseDto,
  })
  @SwaggerResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials or inactive account.',
  })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await this.authService.login(dto, ip, userAgent);

    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate refresh token and issue new access token',
    description:
      'Consumes the existing refresh token (via HttpOnly cookie or body), revokes it, issues a rotated pair, and invalidates on reuse.',
  })
  @SwaggerResponse({
    status: HttpStatus.OK,
    description: 'Session rotated successfully.',
    type: AuthResponseDto,
  })
  @SwaggerResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid, expired, or revoked refresh token.',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto?: RefreshTokenDto,
  ): Promise<AuthResponseDto> {
    const rawToken =
      req.cookies?.[REFRESH_COOKIE_NAME] ||
      dto?.refreshToken ||
      (req.headers['x-refresh-token'] as string | undefined);

    if (!rawToken) {
      throw new UnauthorizedException('Refresh token is required via cookie, body, or header');
    }

    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await this.authService.refresh(rawToken, ip, userAgent);

    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Terminate current session',
    description:
      'Revokes the refresh token in database, blacklists it in Redis, and clears the HttpOnly cookie.',
  })
  @SwaggerResponse({ status: HttpStatus.OK, description: 'Session terminated successfully.' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto?: RefreshTokenDto,
  ): Promise<{ success: boolean; message: string }> {
    const rawToken =
      req.cookies?.[REFRESH_COOKIE_NAME] ||
      dto?.refreshToken ||
      (req.headers['x-refresh-token'] as string | undefined);

    const result = await this.authService.logout(rawToken);

    this.clearRefreshTokenCookie(res);

    return result;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer-jwt')
  @ApiOperation({
    summary: 'Retrieve authenticated user identity',
    description: 'Returns the sanitized user profile for the current valid JWT access token.',
  })
  @SwaggerResponse({
    status: HttpStatus.OK,
    description: 'Current user profile.',
    type: SanitizedUserDto,
  })
  @SwaggerResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or expired access token.',
  })
  async me(@CurrentUser('id') userId: string): Promise<SanitizedUserDto> {
    return this.authService.getMe(userId);
  }

  private setRefreshTokenCookie(res: Response, token: string): void {
    const options = this.getCookieOptions();
    res.cookie(REFRESH_COOKIE_NAME, token, options);
  }

  private clearRefreshTokenCookie(res: Response): void {
    const isSecure = this.config.get<boolean>('jwt.cookieSecure', false);
    const domain = this.config.get<string>('jwt.cookieDomain', 'localhost');
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? 'strict' : 'lax',
      path: '/',
      domain: domain !== 'localhost' ? domain : undefined,
    });
  }

  private getCookieOptions(): CookieOptions {
    const isSecure = this.config.get<boolean>('jwt.cookieSecure', false);
    const domain = this.config.get<string>('jwt.cookieDomain', 'localhost');

    return {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? 'strict' : 'lax',
      path: '/',
      domain: domain !== 'localhost' ? domain : undefined,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    };
  }
}
