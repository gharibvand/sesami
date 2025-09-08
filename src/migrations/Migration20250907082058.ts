import { Migration } from '@mikro-orm/migrations';

export class Migration20250907082058 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create extension if not exists btree_gist;`);
    this.addSql(
      `create table "appointments" ("id" uuid not null default gen_random_uuid(), "org_id" text not null default 'default', "external_id" text not null, "start" timestamptz not null, "end" timestamptz not null, "payload_created_at" timestamptz not null, "payload_updated_at" timestamptz not null, "version" int not null default 1, constraint "appointments_pkey" primary key ("id"));`,
    );
    this.addSql(
      `alter table "appointments" add constraint "appointments_org_id_external_id_unique" unique ("org_id", "external_id");`,
    );

    this.addSql(
      `alter table "appointments" add constraint "no_overlap_per_org" exclude using gist ("org_id" with =, tstzrange("start", "end") with &&);`,
    );

    this.addSql(
      `create table "appointment_versions" ("id" uuid not null default gen_random_uuid(), "appointment_id" uuid not null, "version" int not null, "start" timestamptz not null, "end" timestamptz not null, "payload_created_at" timestamptz not null, "payload_updated_at" timestamptz not null, "received_at" timestamptz not null default now(), constraint "appointment_versions_pkey" primary key ("id"));`,
    );

    this.addSql(
      `alter table "appointment_versions" add constraint "appointment_versions_appointment_id_foreign" foreign key ("appointment_id") references "appointments" ("id") on update cascade;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "appointment_versions" drop constraint "appointment_versions_appointment_id_foreign";`,
    );

    this.addSql(`drop table if exists "appointments" cascade;`);

    this.addSql(`drop table if exists "appointment_versions" cascade;`);
  }
}
