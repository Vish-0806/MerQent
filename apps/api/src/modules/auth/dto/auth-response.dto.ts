import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@merqent/shared-types';

export class SanitizedUserDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'operator@merqent.com' })
  email!: string;

  @ApiProperty({ example: 'Johnathan Doe' })
  fullName!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.CONSULTANT_OPERATOR })
  role!: UserRole;

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE })
  status!: UserStatus;

  @ApiPropertyOptional({ example: 'https://cdn.merqent.com/avatars/user.jpg' })
  avatarUrl?: string | null;

  @ApiPropertyOptional({ example: '2026-10-09T18:00:00.000Z' })
  emailVerifiedAt?: Date | null;

  @ApiProperty({ example: false })
  mfaEnabled!: boolean;

  @ApiProperty({ example: '2026-10-09T18:00:00.000Z' })
  createdAt!: Date;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'Short-lived JWT access token (15m)' })
  accessToken!: string;

  @ApiProperty({ type: SanitizedUserDto, description: 'Authenticated user profile' })
  user!: SanitizedUserDto;
}
