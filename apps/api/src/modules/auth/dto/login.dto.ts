import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { LoginUserInput } from '@merqent/validation';

export class LoginDto implements LoginUserInput {
  @ApiProperty({ example: 'operator@merqent.com', description: 'Registered business email' })
  @IsEmail({}, { message: 'Invalid email address' })
  email!: string;

  @ApiProperty({ example: 'P@ssword12345!', description: 'Account password' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password!: string;
}
