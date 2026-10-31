import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import cors from 'cors';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';

let app: INestApplication;

async function getNestApp(): Promise<INestApplication> {
  if (app) {
    return app;
  }

  const expressApp = express();

  expressApp.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  }));

  app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    logger: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['log', 'error', 'warn'],
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  });

  await app.init();
  return app;
}

let isSwaggerSetup = false;
function setupSwagger(nestApp: INestApplication) {
  if (isSwaggerSetup) return;
  const config = new DocumentBuilder()
    .setTitle('DevPlus API')
    .setDescription('Internship Management System API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(nestApp, config);
  SwaggerModule.setup('api/docs', nestApp, document, {
    customCssUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui.min.css',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui-bundle.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui-standalone-preset.js',
    ],
  });
  isSwaggerSetup = true;
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );
    res.status(200).end();
    return;
  }

  const nestApp = await getNestApp();

  // Lazy-load Swagger only when requesting Swagger documentation endpoint
  const url = req.url || '';
  if (url.includes('/docs') || url.includes('/api/docs')) {
    setupSwagger(nestApp);
  }

  nestApp.getHttpAdapter().getInstance().handle(req, res);
}
