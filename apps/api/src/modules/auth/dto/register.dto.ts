import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MinLength, Matches } from 'class-validator';
import { UserRole } from '@merqent/shared-types';
import { RegisterUserInput } from '@merqent/validation';

export class RegisterDto implements RegisterUserInput {
  @ApiProperty({ example: 'operator@merqent.com', description: 'Business email address' })
  @IsEmail({}, { message: 'Invalid business email address' })
  email!: string;

  @ApiProperty({
    example: 'P@ssword12345!',
    description:
      'Strong password (minimum 12 characters, uppercase, lowercase, number, special character)',
  })
  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number' })
  @Matches(/[^A-Za-z0-9]/, { message: 'Password must contain at least one special character' })
  password!: string;

  @ApiProperty({ example: 'Johnathan Doe', description: 'User full legal name' })
  @IsString()
  @MinLength(2, { message: 'Full name is required' })
  fullName!: string;

  @ApiProperty({
    enum: [UserRole.PE_FIRM_ADMIN, UserRole.CONSULTANT_OPERATOR],
    example: UserRole.CONSULTANT_OPERATOR,
    description: 'Initial account role type',
  })
  @IsEnum([UserRole.PE_FIRM_ADMIN, UserRole.CONSULTANT_OPERATOR], {
    message: 'Role must be either PE_FIRM_ADMIN or CONSULTANT_OPERATOR',
  })
  role!: UserRole.PE_FIRM_ADMIN | UserRole.CONSULTANT_OPERATOR;
}
