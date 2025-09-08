import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class FindAppointmentsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  org?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  at?: string;
}
