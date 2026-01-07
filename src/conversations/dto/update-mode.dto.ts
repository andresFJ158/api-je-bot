import { IsString, IsIn } from 'class-validator';

export class UpdateModeDto {
  @IsString()
  @IsIn(['BOT', 'HUMAN'])
  mode: 'BOT' | 'HUMAN';
}

