import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * PrismaService wraps PrismaClient with the required Driver Adapter (Prisma v7+).
 *
 * If PostgreSQL is not reachable, `connected` stays `false` and services that
 * consult it fall back to file-backed storage instead of throwing.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  /** True only after a successful `$connect()`. Read by services to decide
   *  whether to use the database or a fallback store. */
  connected = false;

  constructor() {
    // Default port 5432 (standard PostgreSQL port)
    const connectionString =
      process.env.DATABASE_URL ??
      'postgresql://securelens:securelens@localhost:5433/securelens';

    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    super({ adapter } as any);

    // Log only after super() — TypeScript forbids touching `this` before it.
    this.logger.log(
      `Database adapter configured (DATABASE_URL=${process.env.DATABASE_URL ? 'set' : 'unset, using default :5433'})`,
    );
  }

  async onModuleInit() {
    try {
      await this.$connect();
      // Probe with a trivial query — $connect can succeed against a wrong/empty
      // DB, so we confirm the schema actually responds before trusting it.
      await this.$queryRaw`SELECT 1`;
      this.connected = true;
      this.logger.log('Database connected & responsive');
    } catch (err: any) {
      this.connected = false;
      this.logger.warn(
        `Database not reachable (${err?.message ?? err}) – services will use file fallback`,
      );
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch {}
  }
}
