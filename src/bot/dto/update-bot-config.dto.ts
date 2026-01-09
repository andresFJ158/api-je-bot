import { IsString, IsOptional, IsNumber, Min, Max, IsArray, ArrayMinSize, IsBoolean } from 'class-validator';

export class UpdateBotConfigDto {
  @IsString()
  @IsOptional()
  systemPrompt?: string;

  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  temperature?: number;

  @IsNumber()
  @Min(1)
  @Max(4000)
  @IsOptional()
  maxTokens?: number;

  @IsString()
  @IsOptional()
  model?: string;

  @IsNumber()
  @Min(1)
  @Max(20)
  @IsOptional()
  contextMessages?: number;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @IsOptional()
  classificationCategories?: string[];

  @IsString()
  @IsOptional()
  orderInstructions?: string;

  @IsString()
  @IsOptional()
  locationInstructions?: string;

  @IsString()
  @IsOptional()
  locationKeywords?: string;

  // Feature flags for bot rules
  @IsBoolean()
  @IsOptional()
  autoCreateOrderOnPaymentRequest?: boolean;

  @IsBoolean()
  @IsOptional()
  autoSendQRImages?: boolean;

  @IsBoolean()
  @IsOptional()
  notifyOrderStatusChanges?: boolean;

  @IsBoolean()
  @IsOptional()
  findNearestBranchOnLocationShare?: boolean;

  @IsBoolean()
  @IsOptional()
  showLocationInstructions?: boolean;

  @IsBoolean()
  @IsOptional()
  prepareOrderInsteadOfCreate?: boolean;

  @IsBoolean()
  @IsOptional()
  extractOrderFromContext?: boolean;

  // Configurable messages
  @IsString()
  @IsOptional()
  orderSuccessMessage?: string;

  @IsString()
  @IsOptional()
  orderErrorMessage?: string;

  @IsString()
  @IsOptional()
  orderNotFoundMessage?: string;

  @IsString()
  @IsOptional()
  orderPrepareErrorMessage?: string;

  @IsString()
  @IsOptional()
  paymentMethodsMessage?: string;

  @IsString()
  @IsOptional()
  paymentMethodsNotFoundMessage?: string;

  @IsString()
  @IsOptional()
  locationDefaultMessage?: string;

  @IsString()
  @IsOptional()
  nearestBranchMessage?: string;

  @IsString()
  @IsOptional()
  generalErrorMessage?: string;

  @IsString()
  @IsOptional()
  branchNotFoundMessage?: string;

  @IsString()
  @IsOptional()
  productsRequiredMessage?: string;

  @IsString()
  @IsOptional()
  paymentConfirmationMessage?: string;
}

