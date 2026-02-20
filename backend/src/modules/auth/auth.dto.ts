import { IsEmail, IsString, MinLength, IsOptional, IsIn, IsArray } from 'class-validator';

export class SavedPaymentMethodDto {
  @IsString()
  id: string;

  @IsIn(['card', 'paypal', 'bank'])
  method: 'card' | 'paypal' | 'bank';

  @IsString()
  maskedLabel: string;

  @IsOptional()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  paypalEmail?: string;

  @IsOptional()
  @IsString()
  cardBrand?: string;

  @IsOptional()
  @IsString()
  cardLast4?: string;

  @IsOptional()
  @IsString()
  cardExpiry?: string;

  @IsOptional()
  @IsString()
  bankIbanLast4?: string;
}

export class RegisterDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  billingAddress?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  billingAddress?: string;

  @IsOptional()
  @IsIn(['card', 'paypal', 'bank'])
  paymentMethod?: 'card' | 'paypal' | 'bank';

  @IsOptional()
  @IsString()
  paymentCardHolder?: string;

  @IsOptional()
  @IsString()
  paymentCardBrand?: string;

  @IsOptional()
  @IsString()
  paymentCardLast4?: string;

  @IsOptional()
  @IsString()
  paymentCardExpiry?: string;

  @IsOptional()
  @IsArray()
  paymentMethods?: SavedPaymentMethodDto[];
}

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}
