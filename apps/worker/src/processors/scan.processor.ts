import { Job } from 'bullmq';
import { BaseProcessor } from './base.processor';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { WhatwebScanner } from '../scanners/whatweb.scanner';
import { SemgrepScanner } from '../scanners/semgrep.scanner';
import { DnsxScanner } from '../scanners/dnsx.scanner';
import { HttpxScanner } from '../scanners/httpx.scanner';
import { NmapScanner } from '../scanners/nmap.scanner';
import { NucleiScanner } from '../scanners/nuclei.scanner';
import { TestsslScanner } from '../scanners/testssl.scanner';
import { ZapScanner } from '../scanners/zap.scanner';
import { TrivyScanner } from '../scanners/trivy.scanner';

/**
 * Scan Processor
 * Handles scan execution via Docker containers
 */
export class ScanProcessor extends BaseProcessor {
  private prisma: PrismaClient;
  private whatwebScanner: WhatwebScanner;
  private semgrepScanner: SemgrepScanner;
  private dnsxScanner: DnsxScanner;
  private httpxScanner: HttpxScanner;
  private nmapScanner: NmapScanner;
  private nucleiScanner: NucleiScanner;
  private testsslScanner: TestsslScanner;
  private zapScanner: ZapScanner;
  private trivyScanner: TrivyScanner;

  constructor() {
    super('scans', async (job) => this.process(job));
    this.setupPrisma();
    this.whatwebScanner = new WhatwebScanner();
    this.semgrepScanner = new SemgrepScanner();
    this.dnsxScanner = new DnsxScanner();
    this.httpxScanner = new HttpxScanner();
    this.nmapScanner = new NmapScanner();
    this.nucleiScanner = new NucleiScanner();
    this.testsslScanner = new TestsslScanner();
    this.zapScanner = new ZapScanner();
    this.trivyScanner = new TrivyScanner();
  }

  /**
   * Setup Prisma client
   */
  private setupPrisma() {
    this.prisma = new PrismaClient();
  }

  /**
   * Process scan job
   */
  async process(job: Job): Promise<any> {
    try {
      const { scanId, target, engines, mode } = job.data;

      this.logger.log(
        `Processing scan ${scanId}: target=${target}, engines=[${engines.join(', ')}], mode=${mode}`,
      );

      // Update scan status to RUNNING
      await this.prisma.scan.update({
        where: { id: scanId },
        data: { status: 'RUNNING', startedAt: new Date() },
      });

      // Execute each engine
      const results: Record<string, any> = {};
      const totalEngines = engines.length;

      for (let i = 0; i < engines.length; i++) {
        const engine = engines[i];
        try {
          this.logger.log(`Running engine: ${engine} for scan ${scanId}`);

          // Execute scanner based on engine type
          const engineResult = await this.executeEngine(
            engine,
            target,
            mode,
            scanId,
          );

          results[engine] = engineResult;

          // Update progress
          const progress = Math.round(((i + 1) / totalEngines) * 100);
          await this.prisma.scan.update({
            where: { id: scanId },
            data: {
              progress,
              engineResults: results as any,
            },
          });

          // Report job progress
          job.updateProgress(progress);

          this.logger.log(
            `Engine ${engine} completed - Progress: ${progress}%`,
          );
        } catch (error) {
          this.logger.error(
            `Engine ${engine} failed: ${error instanceof Error ? error.message : String(error)}`,
          );
          results[engine] = {
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }

      // Mark scan as completed
      await this.prisma.scan.update({
        where: { id: scanId },
        data: {
          status: 'PROCESSING',
          finishedAt: new Date(),
          engineResults: results as any,
        },
      });

      this.logger.log(`Scan ${scanId} processing completed`);

      return {
        scanId,
        status: 'PROCESSING',
        results,
        message: 'Scan completed, awaiting result parsing',
      };
    } catch (error) {
      const { scanId } = job.data;

      this.logger.error(
        `Scan processing failed: ${error instanceof Error ? error.message : String(error)}`,
      );

      // Update scan status to FAILED
      await this.prisma.scan.update({
        where: { id: scanId },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : String(error),
          finishedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Execute a specific engine/scanner
   */
  private async executeEngine(
    engine: string,
    target: string,
    mode: string,
    scanId: string,
  ): Promise<any> {
    // Map engine to scanner docker image
    const scannerMap: Record<string, string> = {
      asset_discovery_engine: 'httpx',
      tech_detection_engine: 'whatweb',
      vulnerability_detection_engine: 'nuclei',
      ssl_tls_analysis_engine: 'testssl',
      runtime_security_engine: 'zap',
      code_security_engine: 'semgrep',
      secret_detection_engine: 'gitleaks',
      dependency_analysis_engine: 'trivy',
    };

    const scanner = scannerMap[engine];
    if (!scanner) {
      throw new Error(`Unknown engine: ${engine}`);
    }

    this.logger.log(`Executing ${scanner} scanner for target: ${target}`);

    try {
      // Execute actual scanners
      if (scanner === 'whatweb') {
        return await this.whatwebScanner.scan(target);
      }

      if (scanner === 'semgrep') {
        return await this.semgrepScanner.scan(target);
      }

      if (scanner === 'dnsx') {
        return await this.dnsxScanner.scan(target);
      }

      if (scanner === 'httpx') {
        return await this.httpxScanner.scan(target);
      }

      if (scanner === 'nmap') {
        return await this.nmapScanner.scan(target);
      }

      if (scanner === 'nuclei') {
        return await this.nucleiScanner.scan(target);
      }

      if (scanner === 'testssl') {
        return await this.testsslScanner.scan(target);
      }

      if (scanner === 'zap') {
        return await this.zapScanner.scan(target);
      }

      if (scanner === 'trivy') {
        return await this.trivyScanner.scan(target);
      }

      // For other scanners, return mock data for now
      this.logger.log(`Using mock data for ${scanner} scanner`);
      return this.getMockScannerResult(scanner, target);
    } catch (error) {
      this.logger.error(
        `Error executing ${scanner}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Get mock scanner result for testing (when real scanner not implemented yet)
   */
  private getMockScannerResult(scanner: string, target: string): any {
    const results: Record<string, any> = {
      httpx: {
        scanner: 'httpx',
        target,
        discoveries: [
          { url: target, status: 200, title: 'Target Website' },
        ],
      },
      nuclei: {
        scanner: 'nuclei',
        target,
        findings: [
          {
            info: {
              name: 'CVE-2021-41773 Apache Path Traversal',
              severity: 'high',
              description: 'Apache HTTP Server 2.4.49 and 2.4.50 path traversal',
            },
            matched_at: target,
          },
        ],
      },
      gitleaks: {
        scanner: 'gitleaks',
        target,
        findings: [
          {
            RuleTitle: 'AWS API Key',
            Match: 'AKIAIOSFODNN7EXAMPLE',
            File: 'src/config.ts',
            Line: 42,
            Column: 10,
          },
        ],
      },
      trivy: {
        scanner: 'trivy',
        target,
        findings: [
          {
            VulnerabilityID: 'CVE-2021-44228',
            PkgName: 'log4j',
            InstalledVersion: '2.14.1',
            FixedVersion: '2.17.1',
            Severity: 'CRITICAL',
          },
        ],
      },
      testssl: {
        scanner: 'testssl',
        target,
        findings: [],
      },
      zap: {
        scanner: 'zap',
        target,
        findings: [],
      },
    };

    return results[scanner] || { scanner, target, findings: [] };
  }

  /**
   * Get concurrency level for scan processor
   */
  protected getConcurrency(): number {
    return 2; // Process 2 scans concurrently
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
