import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAppointmentDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty({
    example: '2020-08-09 20:20',
  })
  @IsString()
  start!: string;

  @ApiProperty({
    example: '2025-08-09 20:30',
  })
  @IsString()
  end!: string;

  @ApiProperty({
    example: '2025-08-09 20:30',
  })
  @IsString()
  createdAt!: string;

  @ApiProperty({
    example: '2025-08-09 20:30',
  })
  @IsString()
  updatedAt!: string;

  @ApiPropertyOptional({
    example: 'org1',
    default: 'default',
  })
  @IsOptional()
  @IsString()
  orgId?: string;
}
