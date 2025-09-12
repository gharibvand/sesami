import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointments.dto';
import { FindAppointmentsDto } from './dto/find-appointments.dto';

const PATH = 'appointments';

@ApiTags(PATH)
@Controller({ path: PATH, version: '1' })
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}

  @Post()
  @HttpCode(200)
  async create(@Body() dto: CreateAppointmentDto) {
    return await this.service.upsert(dto);
  }

  @Get()
  async find(@Query() query: FindAppointmentsDto) {
    return await this.service.list(query);
  }
}
