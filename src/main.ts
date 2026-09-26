import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // FRONTEND_URL restringe qué webs pueden llamar a la API (admite varias,
  // separadas por comas, por ejemplo para incluir localhost en desarrollo).
  // Sin configurar, se admite cualquier origen para no romper nada por defecto.
  const allowedOrigins = process.env.FRONTEND_URL?.split(',').map((o) => o.trim());
  app.enableCors({
    origin: allowedOrigins?.length ? allowedOrigins : '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Cuentas Claras API arriba en http://localhost:${port}`);
}

bootstrap();
