import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3030',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    exceptionFactory: (errors) => {
      const messages = errors.map((error) => {
        const constraints = Object.values(error.constraints || {});
        return constraints.join(', ');
      });
      return new BadRequestException({
        message: messages.join('; '),
        errors: errors,
      });
    },
  }));

  // Global exception filter for better error handling
  app.useGlobalFilters(new AllExceptionsFilter());

  // Serve static files from uploads directory
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  const port = process.env.PORT || 9090;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Backend server running on port ${port}`);
}

bootstrap();

