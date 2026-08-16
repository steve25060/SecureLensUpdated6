import { Job } from 'bullmq';
import { BaseProcessor } from './base.processor';
import { PrismaClient } from '@prisma/client';

/**
 * Scoring Processor
 * Calculates security scores and risk levels for scans
 */
export class ScoringProcessor extends BaseProcessor {
  private prisma: PrismaClient;

  constructor() {
    super('scoring', async (job) => this.process(job));
    this.setupPrisma();
  }

  /**
   * Setup Prisma client
   */
  private setupPrisma() {
    this.prisma = new PrismaClient();
  }

  /**
   * Process scoring job
   */
  async process(job: Job): Promise<any> {
    try {
      const { scanId, findings } = job.data;

      this.logger.log(`Calculating risk scores for scan ${scanId}`);

      // Fetch scan and findings from database
      const scan = await this.prisma.scan.findUnique({
        where: { id: scanId },
        include: { findings: true },
      });

      if (!scan) {
        throw new Error(`Scan not found: ${scanId}`);
      }

      // Calculate overall risk score
      const riskScore = this.calculateRiskScore(scan.findings);

      // Update scan with risk score
      await this.prisma.scan.update({
        where: { id: scanId },
        data: {
          riskScore,
          findingsCount: scan.findings.length,
          status: 'COMPLETED',
        },
      });

      this.logger.log(`Risk score calculated: ${riskScore} for scan ${scanId}`);

      return {
        scanId,
        riskScore,
        findingsCount: scan.findings.length,
        status: 'COMPLETED',
      };
    } catch (error) {
      this.logger.error(
        `Scoring failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Calculate overall risk score based on findings
   */
  private calculateRiskScore(findings: any[]): number {
    if (findings.length === 0) {
      return 0;
    }

    const severityScores: Record<string, number> = {
      CRITICAL: 100,
      HIGH: 75,
      MEDIUM: 50,
      LOW: 25,
      INFO: 10,
    };

    let totalScore = 0;
    const severityCount: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0,
    };

    // Count findings by severity
    for (const finding of findings) {
      const severity = finding.severity || 'INFO';
      severityCount[severity] = (severityCount[severity] || 0) + 1;
      totalScore += severityScores[severity] || 0;
    }

    // Calculate average score
    let averageScore = Math.round(totalScore / findings.length);

    // Boost score for critical findings
    if (severityCount.CRITICAL > 0) {
      averageScore = Math.min(100, averageScore + severityCount.CRITICAL * 5);
    }

    // Cap at 100
    return Math.min(100, averageScore);
  }

  /**
   * Get concurrency level for scoring processor
   */
  protected getConcurrency(): number {
    return 4;
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
