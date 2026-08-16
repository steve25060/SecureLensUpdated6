import { Job } from 'bullmq';
import { BaseProcessor } from './base.processor';
import { PrismaClient } from '@prisma/client';

/**
 * Correlation Processor
 * Correlates and deduplicates findings across multiple scans
 */
export class CorrelationProcessor extends BaseProcessor {
  private prisma: PrismaClient;

  constructor() {
    super('correlation', async (job) => this.process(job));
    this.setupPrisma();
  }

  /**
   * Setup Prisma client
   */
  private setupPrisma() {
    this.prisma = new PrismaClient();
  }

  /**
   * Process correlation job
   */
  async process(job: Job): Promise<any> {
    try {
      const { scanId, findings } = job.data;

      this.logger.log(
        `Correlating ${findings.length} findings from scan ${scanId}`,
      );

      // Get workspace findings for correlation
      const scan = await this.prisma.scan.findUnique({
        where: { id: scanId },
        include: { workspace: true },
      });

      if (!scan) {
        throw new Error(`Scan not found: ${scanId}`);
      }

      // Get existing findings in workspace to detect duplicates
      const existingFindings = await this.prisma.finding.findMany({
        where: { workspaceId: scan.workspaceId },
      });

      let correlatedCount = 0;
      let duplicateCount = 0;

      for (const finding of findings) {
        // Check for duplicates based on title, severity, and target
        const duplicate = existingFindings.find(
          (existing) =>
            existing.title === finding.title &&
            existing.severity === finding.severity &&
            existing.target === finding.target,
        );

        if (duplicate) {
          // Update last seen time for duplicate
          await this.prisma.finding.update({
            where: { id: duplicate.id },
            data: { lastSeen: new Date() },
          });
          duplicateCount++;
        } else {
          correlatedCount++;
        }
      }

      this.logger.log(
        `Correlation complete: ${correlatedCount} new, ${duplicateCount} duplicates`,
      );

      return {
        scanId,
        findingsProcessed: findings.length,
        newFindings: correlatedCount,
        duplicates: duplicateCount,
      };
    } catch (error) {
      this.logger.error(
        `Correlation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Get concurrency level for correlation processor
   */
  protected getConcurrency(): number {
    return 3;
  }

  /**
   * Cleanup on destroy
   */
  async stop() {
    if (this.prisma) {
      await this.prisma.$disconnect();
      this.logger.log('Prisma disconnected');
    }
    await super.stop();
  }
}
