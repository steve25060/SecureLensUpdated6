import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger, RequestMethod } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  
  // Run database migrations in production
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required in production');
    }

    try {
      const prisma = app.get(PrismaService);
      logger.log('Verifying database connection...');
      await prisma.$queryRaw`SELECT 1`;
      logger.log('Database connection verified ✓');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Database connection check failed: ${message}`);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // CORS Configuration - Environment-aware
  // ─────────────────────────────────────────────────────────────
  // LOCAL: http://localhost:3000, http://localhost:3001
  // ─────────────────────────────────────────────────────────────

  const nodeEnv = process.env.NODE_ENV || 'development';
  
  const defaultOrigins = nodeEnv === 'production'
    ? ['https://web-production-13bf9.up.railway.app']
    : ['http://localhost:3000', 'http://localhost:3001'];

  const envOrigins = (process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || process.env.CORS_ORIGIN || '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);

  const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (nodeEnv !== 'production' && origin.includes('localhost')) {
        return callback(null, true);
      }
      logger.warn(`Blocked CORS origin: ${origin}`);
      return callback(new Error('Origin not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 3600, // Cache preflight for 1 hour in production
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Set global API prefix but exclude root and health routes so visiting the root backend URL renders the status landing page
  app.setGlobalPrefix('api', {
    exclude: [
      { path: '/', method: RequestMethod.GET },
      { path: '/health', method: RequestMethod.GET },
      { path: '/ping', method: RequestMethod.GET },
      { path: '/status', method: RequestMethod.GET },
    ],
  });

  // Get port from environment
  const port = process.env.PORT || 4000;

  await app.listen(port, '0.0.0.0');
  
  logger.log(`═══════════════════════════════════════════════════════════════`);
  logger.log(`Backend Server Started`);
  logger.log(`═══════════════════════════════════════════════════════════════`);
  logger.log(`Environment: ${nodeEnv}`);
  logger.log(`Port: ${port}`);
  logger.log(`CORS enabled for: ${allowedOrigins.join(', ')}`);
  logger.log(`Backend URL: http://0.0.0.0:${port}`);
  logger.log(`═══════════════════════════════════════════════════════════════`);
}

bootstrap().catch((err) => {
  console.error('Bootstrap error:', err);
  process.exit(1);
});
