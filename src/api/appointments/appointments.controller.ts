import { Body, Controller, Get, Post, Query } from '@nestjs/common';
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
  async create(@Body() dto: CreateAppointmentDto) {
    return await this.service.upsert(dto);
  }

  @Get()
  find(@Query() query: FindAppointmentsDto) {
    return this.service.list({ orgId: query.org, at: query.at });
  }
}
