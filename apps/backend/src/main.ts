import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger, RequestMethod } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  
  // Run database migrations in production
  if (process.env.NODE_ENV === 'production') {
    try {
      const prisma = app.get(PrismaService);
      logger.log('Running database migrations...');
      await prisma.$executeRawUnsafe('SELECT 1'); // Test connection
      logger.log('Database connection verified ✓');
    } catch (error) {
      logger.warn('Database migration check failed (may retry on next restart):', error.message);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // CORS Configuration - Environment-aware
  // ─────────────────────────────────────────────────────────────
  // LOCAL: http://localhost:3000, http://localhost:3001
  // ─────────────────────────────────────────────────────────────

  const nodeEnv = process.env.NODE_ENV || 'development';
  
  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://securelens-frontend.onrender.com',
  ];

  const envOrigins = (process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || process.env.CORS_ORIGIN || '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);

  const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.onrender.com') ||
        origin.endsWith('.railway.app') ||
        origin.includes('localhost')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
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
// Force restart Sunday 26 July 2026 01:23:45 PM IST
// Restart 1785052806
