import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export class RegisterDto {
  @IsString()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}
