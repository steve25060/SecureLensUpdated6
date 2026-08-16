import { Job } from 'bullmq';
import { BaseProcessor } from './base.processor';
import { PrismaClient } from '@prisma/client';

/**
 * Parser Processor
 * Converts raw scanner results into unified findings
 */
export class ParserProcessor extends BaseProcessor {
  private prisma: PrismaClient;

  constructor() {
    super('parser', async (job) => this.process(job));
    this.setupPrisma();
  }

  /**
   * Setup Prisma client
   */
  private setupPrisma() {
    this.prisma = new PrismaClient();
  }

  /**
   * Process parser job
   */
  async process(job: Job): Promise<any> {
    try {
      const { scanId, engineId, rawResults } = job.data;

      this.logger.log(
        `Parsing results from ${engineId} for scan ${scanId}`,
      );

      // Parse results based on engine type
      const findings = this.parseResults(engineId, rawResults, scanId);

      // Get scan to retrieve workspaceId
      const scan = await this.prisma.scan.findUnique({
        where: { id: scanId },
      });

      if (!scan) {
        throw new Error(`Scan not found: ${scanId}`);
      }

      // Create findings in database
      const createdFindings = [];
      for (const finding of findings) {
        try {
          const created = await this.prisma.finding.create({
            data: {
              ...finding,
              scanId,
              workspaceId: scan.workspaceId,
              severity: finding.severity,
              status: 'NEW',
            },
          });
          createdFindings.push(created);
        } catch (error) {
          this.logger.error(`Failed to create finding: ${error}`);
        }
      }

      this.logger.log(
        `Created ${createdFindings.length} findings from ${engineId}`,
      );

      return {
        scanId,
        engine: engineId,
        findingsCount: createdFindings.length,
        findings: createdFindings,
      };
    } catch (error) {
      this.logger.error(
        `Parsing failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Parse raw results based on engine type
   */
  private parseResults(
    engineId: string,
    rawResults: any,
    scanId: string,
  ): any[] {
    const findings: any[] = [];

    switch (engineId.toLowerCase()) {
      case 'gitleaks':
        findings.push(...this.parseGitleaks(rawResults));
        break;
      case 'nuclei':
        findings.push(...this.parseNuclei(rawResults));
        break;
      case 'semgrep':
        findings.push(...this.parseSemgrep(rawResults));
        break;
      case 'trivy':
        findings.push(...this.parseTrivy(rawResults));
        break;
      case 'zap':
        findings.push(...this.parseZAP(rawResults));
        break;
      default:
        this.logger.warn(`Unknown engine: ${engineId}`);
    }

    return findings;
  }

  /**
   * Parse Gitleaks results
   */
  private parseGitleaks(results: any): any[] {
    const findings: any[] = [];

    if (!results?.findings || !Array.isArray(results.findings)) {
      return findings;
    }

    for (const result of results.findings) {
      findings.push({
        title: `${result.RuleTitle} Secret Detected`,
        description: `Secret type: ${result.RuleTitle} found in repository`,
        severity: 'CRITICAL',
        source: 'gitleaks',
        category: 'Secret Detection',
        target: results.target || 'unknown',
        url: `${results.target}/${result.File}`,
        parameter: `Line ${result.Line}`,
        evidence: `Match: ${result.Match}`,
        cvss: 9.1,
        cwe: 'CWE-798',
        owasp: 'A07:2021',
      });
    }

    return findings;
  }

  /**
   * Parse Nuclei results
   */
  private parseNuclei(results: any): any[] {
    const findings: any[] = [];

    if (!results?.findings || !Array.isArray(results.findings)) {
      return findings;
    }

    for (const result of results.findings) {
      findings.push({
        title: result.info?.name || 'Vulnerability Detected',
        description: result.info?.description || '',
        severity: this.mapSeverity(result.info?.severity),
        source: 'nuclei',
        category: 'Vulnerability',
        target: results.target || 'unknown',
        url: result.matched_at || results.target,
        evidence: result.curl_command || result.extracted,
        cvss: result.info?.cvss_score,
        cwe: result.info?.cwe,
        owasp: result.info?.owasp_category,
      });
    }

    return findings;
  }

  /**
   * Parse Semgrep results
   */
  private parseSemgrep(results: any): any[] {
    const findings: any[] = [];

    if (!results?.findings || !Array.isArray(results.findings)) {
      return findings;
    }

    for (const result of results.findings) {
      findings.push({
        title: result.message || 'Code Issue',
        description: result.extra?.message || '',
        severity: this.mapSeverity(result.extra?.severity),
        source: 'semgrep',
        category: 'Code Quality',
        target: results.target || 'unknown',
        url: results.target,
        parameter: `${result.start?.line}:${result.start?.col}`,
        evidence: result.extra?.code,
        cwe: result.extra?.cwe,
      });
    }

    return findings;
  }

  /**
   * Parse Trivy results
   */
  private parseTrivy(results: any): any[] {
    const findings: any[] = [];

    if (!results?.findings || !Array.isArray(results.findings)) {
      return findings;
    }

    for (const result of results.findings) {
      findings.push({
        title: result.VulnerabilityID || 'Vulnerability',
        description: result.Description || '',
        severity: this.mapSeverity(result.Severity),
        source: 'trivy',
        category: 'Dependencies',
        target: results.target || 'unknown',
        parameter: `${result.PkgName}:${result.InstalledVersion}`,
        cvss: result.CVSS?.nvd?.V3Score,
        cwe: result.CweID,
        evidence: result.FixedVersion
          ? `Upgrade to ${result.FixedVersion}`
          : '',
      });
    }

    return findings;
  }

  /**
   * Parse ZAP results
   */
  private parseZAP(results: any): any[] {
    const findings: any[] = [];

    if (!results?.findings || !Array.isArray(results.findings)) {
      return findings;
    }

    for (const result of results.findings) {
      findings.push({
        title: result.name || 'Security Issue',
        description: result.description || '',
        severity: this.mapRiskCode(result.riskcode),
        source: 'owasp_zap',
        category: 'Web Vulnerability',
        target: results.target || 'unknown',
        url: result.uri,
        evidence: result.evidence,
        cwe: result.cwe,
        owasp: result.owasp,
      });
    }

    return findings;
  }

  /**
   * Map severity strings to enum values
   */
  private mapSeverity(severity: string): string {
    const map: Record<string, string> = {
      critical: 'CRITICAL',
      high: 'HIGH',
      medium: 'MEDIUM',
      low: 'LOW',
      info: 'INFO',
      unknown: 'INFO',
    };
    return map[severity?.toLowerCase()] || 'MEDIUM';
  }

  /**
   * Map ZAP risk code to severity
   */
  private mapRiskCode(riskCode: number): string {
    const map: Record<number, string> = {
      3: 'HIGH',
      2: 'MEDIUM',
      1: 'LOW',
      0: 'INFO',
    };
    return map[riskCode] || 'MEDIUM';
  }

  /**
   * Get concurrency level for parser processor
   */
  protected getConcurrency(): number {
    return 5; // Process 5 parse jobs concurrently
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
