import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/core';

@Entity({ tableName: 'appointments' })
@Unique({ properties: ['orgId', 'externalId'] })
export class Appointment {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property({ columnType: 'text', default: 'default' })
  orgId!: string;

  @Property({ columnType: 'text' })
  externalId!: string;

  @Property({ columnType: 'timestamptz' })
  start!: Date;

  @Property({ columnType: 'timestamptz' })
  end!: Date;

  @Property({ columnType: 'timestamptz' })
  payloadCreatedAt!: Date;

  @Property({ columnType: 'timestamptz' })
  payloadUpdatedAt!: Date;

  @Property({ columnType: 'int', default: 1 })
  version!: number;
}
