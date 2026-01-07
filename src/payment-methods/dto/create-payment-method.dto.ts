import { IsString, IsOptional, IsBoolean, IsInt, IsNotEmpty, IsIn, Min } from 'class-validator';

export class CreatePaymentMethodDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['QR', 'BANK_ACCOUNT'])
  type: 'QR' | 'BANK_ACCOUNT';

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  // Para tipo QR
  @IsString()
  @IsOptional()
  qrImageUrl?: string;

  // Para tipo BANK_ACCOUNT
  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  accountNumber?: string;

  @IsString()
  @IsOptional()
  @IsIn(['AHORROS', 'CORRIENTE'])
  accountType?: 'AHORROS' | 'CORRIENTE';

  @IsString()
  @IsOptional()
  cci?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}

