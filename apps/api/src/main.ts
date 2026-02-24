import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('ListaCerta API')
    .setDescription('REST API for products, stores and prices')
    .setVersion('0.1.0')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);

  // eslint-disable-next-line no-console
  console.log(`ListaCerta API running on http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`Swagger docs on http://localhost:${port}/docs`);
}

bootstrap();
