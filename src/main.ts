import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppointmentsModule } from './api';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppointmentsModule,
    new FastifyAdapter(),
  );
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Sesami Appointment Management API')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Sesami API Documentation',
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
