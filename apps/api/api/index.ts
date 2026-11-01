import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import cors from 'cors';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';

let app: INestApplication;
let swaggerDocument: any;

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

  // Route to serve OpenAPI/Swagger JSON directly with full CORS headers
  expressApp.get(['/api/docs-json', '/docs-json'], (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(swaggerDocument);
  });

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

  // Setup Swagger before app.init() so routes are properly mounted in Express
  const config = new DocumentBuilder()
    .setTitle('DevPlus API')
    .setDescription('Internship Management System API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  swaggerDocument = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    customCssUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui.min.css',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui-bundle.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui-standalone-preset.js',
    ],
  });

  await app.init();
  return app;
}

export default async function handler(req: any, res: any) {
  // Set permissive CORS headers for all incoming requests (including Petstore Swagger UI)
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  if (req.headers.origin) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const nestApp = await getNestApp();
  nestApp.getHttpAdapter().getInstance().handle(req, res);
}
