import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { Appointment } from './appointment.entity';

@Entity({ tableName: 'appointment_versions' })
export class AppointmentVersion {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @ManyToOne(() => Appointment)
  appointment!: Appointment;

  @Property({ columnType: 'int' })
  version!: number;

  @Property({ columnType: 'timestamptz' })
  start!: Date;

  @Property({ columnType: 'timestamptz' })
  end!: Date;

  @Property({ columnType: 'timestamptz' })
  payloadCreatedAt!: Date;

  @Property({ columnType: 'timestamptz' })
  payloadUpdatedAt!: Date;

  @Property({ columnType: 'timestamptz', defaultRaw: 'now()' })
  receivedAt!: Date;
}
