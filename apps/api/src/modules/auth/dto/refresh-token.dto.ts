import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiPropertyOptional({
    description: 'Refresh token string (fallback when not submitted via HttpOnly cookie)',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
