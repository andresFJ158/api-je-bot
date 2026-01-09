import { IsArray, IsString, ArrayMinSize } from 'class-validator';

export class ReorderFAQsDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  ids: string[];
}

