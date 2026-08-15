import { Injectable, Logger } from '@nestjs/common';
import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import { FindingTemplate, EngineCommandConfig, getEngineCommand, getEngineCommandForProfile, ScanProfile } from './engine-commands-advanced';
import AdvancedResultParser from './advanced-result-parser';
import { CorrelationEngine } from './correlation-engine';
import { PrismaService } from '../../prisma/prisma.service';

const execAsync = promisify(exec);

/**
 * Orchestration Workflow for SecureLens Security Pipeline
 * Manages sequential execution of security scanning engines in proper order
 */

export interface OrchestrationConfig {
  target: string;
  engines: string[];
  profile?: ScanProfile;
  timeout?: number;
  stopOnFirstCritical?: boolean;
  enableCorrelation?: boolean;
  onLog?: (log: { ts: string; level: 'info' | 'warn' | 'error' | 'success'; engine?: string; message: string }) => void;
  onProgress?: (progress: number) => void;
}

export interface OrchestrationResult {
  success: boolean;
  findings: Array<FindingTemplate & { source: string; tool: string }>;
  correlatedFindings: any[];
  logs: Array<{ timestamp: Date; level: 'info' | 'warn' | 'error'; engine: string; message: string }>;
  executionTime: number;
  status: 'completed' | 'failed' | 'partial' | 'stopped';
}

@Injectable()
export class ScanOrchestrator {
  private readonly logger = new Logger(ScanOrchestrator.name);
  private onLogCb?: (log: { ts: string; level: 'info' | 'warn' | 'error' | 'success'; engine?: string; message: string }) => void;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Execute the full scanning pipeline in proper order
   */
  async executeFullPipeline(config: OrchestrationConfig): Promise<OrchestrationResult> {
    this.onLogCb = config.onLog;
    const startTime = Date.now();
    const totalStages = 7;
    let completedStages = 0;
    const reportProgress = () => {
      completedStages++;
      if (config.onProgress) {
        config.onProgress(Math.round((completedStages / totalStages) * 100));
      }
    };
    const logs: OrchestrationResult['logs'] = [];
    const allFindings: Array<FindingTemplate & { source: string; tool: string }> = [];
    let pipelineStatus: 'completed' | 'failed' | 'partial' | 'stopped' = 'completed';

    this.addLog(logs, 'info', 'orchestrator', `Starting pipeline for target: ${config.target}`);

    // Check if target or requested engines is a GitHub / Repository scan
    const isGitHubTarget = config.target.includes('github.com') || config.target.includes('gitlab.com') || config.target.includes('/');
    const hasGitHubEngines = config.engines.some(e => [
      'repository_overview', 'code_security', 'secret_detection', 'dependency_analysis',
      'infrastructure_security', 'cicd_security', 'license_compliance', 'container_security',
      'code_scanner', 'secret_finder', 'container_checker'
    ].includes(e));

    if (isGitHubTarget && hasGitHubEngines) {
      this.addLog(logs, 'info', 'orchestrator', 'Executing Dedicated 9-Stage GitHub & Repository Security Pipeline');
      const ghTotalStages = 9;
      let ghCompleted = 0;
      const reportGhProgress = () => {
        ghCompleted++;
        if (config.onProgress) {
          config.onProgress(Math.round((ghCompleted / ghTotalStages) * 100));
        }
      };

      // GH Stage 1: Repository Overview
      this.addLog(logs, 'info', 'orchestrator', 'STAGE 1: Repository Overview & Structure Discovery');
      const ghStage1 = await this.executeStage(['repository_overview'], config, logs);
      allFindings.push(...ghStage1);
      reportGhProgress();

      // GH Stage 2: Code Security Check (Semgrep OSS)
      this.addLog(logs, 'info', 'orchestrator', 'STAGE 2: Code Security Check (Semgrep OSS - SAST)');
      const ghStage2 = await this.executeStage(['code_security', 'code_scanner'], config, logs);
      allFindings.push(...ghStage2);
      reportGhProgress();

      // GH Stage 3: Secret Detection (Gitleaks)
      this.addLog(logs, 'info', 'orchestrator', 'STAGE 3: Secret Detection (Gitleaks - API Keys & Tokens)');
      const ghStage3 = await this.executeStage(['secret_detection', 'secret_finder'], config, logs);
      allFindings.push(...ghStage3);
      reportGhProgress();

      // GH Stage 4: Dependency Security Check (Trivy)
      this.addLog(logs, 'info', 'orchestrator', 'STAGE 4: Dependency Security Check (Trivy - Vulnerable Packages)');
      const ghStage4 = await this.executeStage(['dependency_analysis', 'container_checker'], config, logs);
      allFindings.push(...ghStage4);
      reportGhProgress();

      // GH Stage 5: Infrastructure Security Check (Checkov)
      this.addLog(logs, 'info', 'orchestrator', 'STAGE 5: Infrastructure Security Check (Checkov - Terraform & K8s)');
      const ghStage5 = await this.executeStage(['infrastructure_security'], config, logs);
      allFindings.push(...ghStage5);
      reportGhProgress();

      // GH Stage 6: CI/CD & Pipeline Security Check
      this.addLog(logs, 'info', 'orchestrator', 'STAGE 6: CI/CD & Pipeline Security Check (GitHub Actions)');
      const ghStage6 = await this.executeStage(['cicd_security'], config, logs);
      allFindings.push(...ghStage6);
      reportGhProgress();

      // GH Stage 7: License Compliance & Legal Risk Check
      this.addLog(logs, 'info', 'orchestrator', 'STAGE 7: License Compliance & Legal Risk Check');
      const ghStage7 = await this.executeStage(['license_compliance'], config, logs);
      allFindings.push(...ghStage7);
      reportGhProgress();

      // GH Stage 8: Container & Dockerfile Security
      this.addLog(logs, 'info', 'orchestrator', 'STAGE 8: Container & Dockerfile Security Check');
      const ghStage8 = await this.executeStage(['container_security'], config, logs);
      allFindings.push(...ghStage8);
      reportGhProgress();

      // GH Stage 9: Security Intelligence & Correlation Engine
      this.addLog(logs, 'info', 'orchestrator', 'STAGE 9: Security Intelligence Engine (Attack Paths & Correlation)');
      const ghStage9 = await this.executeStage(['security_intelligence', 'results_cleaner'], config, logs);
      allFindings.push(...ghStage9);
      reportGhProgress();

      this.addLog(logs, 'info', 'orchestrator', `GitHub Security Pipeline completed. Collected ${allFindings.length} findings across 9 engines`);
      return this.buildResult(allFindings, logs, startTime, pipelineStatus, true);
    }

    // Default Enterprise Website Scanning Pipeline (Stages 1 - 13)
    const webTotalStages = 13;
    let webCompleted = 0;
    const reportWebProgress = () => {
      webCompleted++;
      if (config.onProgress) {
        config.onProgress(Math.round((webCompleted / webTotalStages) * 100));
      }
    };

    // Stage 1: DNS & Subdomain Discovery
    this.addLog(logs, 'info', 'orchestrator', 'STAGE 1: DNS & Subdomain Discovery');
    const stage1Findings = await this.executeStage(
      ['dnsx', 'dns_check', 'subfinder', 'subdomain_discovery'],
      config,
      logs
    );
    allFindings.push(...stage1Findings);
    reportWebProgress();

    if (stage1Findings.some(f => f.severity === 'CRITICAL') && config.stopOnFirstCritical) {
      pipelineStatus = 'stopped';
      this.addLog(logs, 'warn', 'orchestrator', 'Stopping: Critical finding in Stage 1');
      return this.buildResult(allFindings, logs, startTime, pipelineStatus, false);
    }

    // Stage 2: Live Asset Detection
    this.addLog(logs, 'info', 'orchestrator', 'STAGE 2: Live Asset Detection');
    const stage2Findings = await this.executeStage(
      ['httpx', 'asset_discovery'],
      config,
      logs
    );
    allFindings.push(...stage2Findings);
    reportWebProgress();

    // Stage 3: Technology Detection
    this.addLog(logs, 'info', 'orchestrator', 'STAGE 3: Technology Detection');
    const stage3Findings = await this.executeStage(
      ['whatweb', 'tech_detection'],
      config,
      logs
    );
    allFindings.push(...stage3Findings);
    reportWebProgress();

    // Stage 4: HTTP Security Headers & Cookies
    this.addLog(logs, 'info', 'orchestrator', 'STAGE 4: HTTP Security Headers & Cookies');
    const stage4Findings = await this.executeStage(
      ['http_security'],
      config,
      logs
    );
    allFindings.push(...stage4Findings);
    reportWebProgress();

    // Stage 5: SSL/TLS Cryptographic Analysis
    this.addLog(logs, 'info', 'orchestrator', 'STAGE 5: SSL/TLS Analysis & Certificate Validation');
    const stage5Findings = await this.executeStage(
      ['testssl', 'ssl_tls_analysis', 'ssl_checker'],
      config,
      logs
    );
    allFindings.push(...stage5Findings);
    reportWebProgress();

    if (stage5Findings.some(f => f.severity === 'CRITICAL') && config.stopOnFirstCritical) {
      pipelineStatus = 'stopped';
      this.addLog(logs, 'warn', 'orchestrator', 'Stopping: Critical SSL/HTTP finding in Stage 5');
      return this.buildResult(allFindings, logs, startTime, pipelineStatus, false);
    }

    // Stage 6: WAF & Cloud Perimeter Defense
    this.addLog(logs, 'info', 'orchestrator', 'STAGE 6: WAF & Cloud Perimeter Defense');
    const stage6Findings = await this.executeStage(
      ['waf_detection'],
      config,
      logs
    );
    allFindings.push(...stage6Findings);
    reportWebProgress();

    // Stage 7: Email Security & Anti-Spoofing
    this.addLog(logs, 'info', 'orchestrator', 'STAGE 7: Email Security & Anti-Spoofing (DMARC/SPF)');
    const stage7Findings = await this.executeStage(
      ['email_security'],
      config,
      logs
    );
    allFindings.push(...stage7Findings);
    reportWebProgress();

    // Stage 8: API Security & GraphQL Auditor
    this.addLog(logs, 'info', 'orchestrator', 'STAGE 8: API Security & GraphQL Auditor');
    const stage8Findings = await this.executeStage(
      ['api_security'],
      config,
      logs
    );
    allFindings.push(...stage8Findings);
    reportWebProgress();

    // Stage 9: Web Crawling & Endpoint Discovery
    this.addLog(logs, 'info', 'orchestrator', 'STAGE 9: Endpoint Discovery & Web Crawling');
    const stage9Findings = await this.executeStage(
      ['katana', 'endpoint_discovery'],
      config,
      logs
    );
    allFindings.push(...stage9Findings);
    reportWebProgress();

    // Stage 10: Privacy & Cookie Compliance
    this.addLog(logs, 'info', 'orchestrator', 'STAGE 10: Privacy & Cookie Compliance');
    const stage10Findings = await this.executeStage(
      ['privacy_compliance'],
      config,
      logs
    );
    allFindings.push(...stage10Findings);
    reportWebProgress();

    // Stage 11: Network Exposure & Port Scanning
    this.addLog(logs, 'info', 'orchestrator', 'STAGE 11: Network Exposure Mapping (Port Scanning)');
    const stage11Findings = await this.executeStage(
      ['nmap', 'network_exposure', 'port_scanner'],
      config,
      logs
    );
    allFindings.push(...stage11Findings);
    reportWebProgress();

    if (stage11Findings.some(f => f.severity === 'CRITICAL') && config.stopOnFirstCritical) {
      pipelineStatus = 'stopped';
      this.addLog(logs, 'warn', 'orchestrator', 'Stopping: Critical network finding in Stage 11');
      return this.buildResult(allFindings, logs, startTime, pipelineStatus, false);
    }

    // Stage 12: Vulnerability Detection
    this.addLog(logs, 'info', 'orchestrator', 'STAGE 12: Vulnerability Detection (Nuclei)');
    const stage12Findings = await this.executeStage(
      ['nuclei', 'vulnerability_detection', 'vulnerability_scanner'],
      config,
      logs
    );
    allFindings.push(...stage12Findings);
    reportWebProgress();

    // Stage 13: Security Intelligence & Attack Surface Correlation
    this.addLog(logs, 'info', 'orchestrator', 'STAGE 13: Security Intelligence & Correlation Engine');
    const stage13Findings = await this.executeStage(
      ['security_intelligence', 'results_cleaner'],
      config,
      logs
    );
    allFindings.push(...stage13Findings);
    reportWebProgress();

    this.addLog(logs, 'info', 'orchestrator', `Pipeline completed. Collected ${allFindings.length} findings across all enterprise engines`);

    return this.buildResult(allFindings, logs, startTime, pipelineStatus, true);
  }

  /**
   * Execute a single stage of the pipeline
   */
  private async executeStage(
    engineIds: string[],
    config: OrchestrationConfig,
    logs: OrchestrationResult['logs']
  ): Promise<Array<FindingTemplate & { source: string; tool: string }>> {
    const stageFindings: Array<FindingTemplate & { source: string; tool: string }> = [];

    for (const engineId of engineIds) {
      if (!config.engines.includes(engineId)) {
        continue; // Skip if not in requested engines
      }

      try {
        const profile = config.profile || 'normal';
        const engineConfig = getEngineCommandForProfile(engineId, profile);
        if (!engineConfig) {
          this.addLog(logs, 'warn', engineId, `Engine not found: ${engineId}`);
          continue;
        }

        this.addLog(logs, 'info', engineId, `Starting: ${engineConfig.description}`);

        const findings = await this.executeEngine(engineId, engineConfig, config.target, logs);
        stageFindings.push(
          ...findings.map(f => ({
            ...f,
            source: engineId,
            tool: this.getToolName(engineId),
          }))
        );

        this.addLog(logs, 'info', engineId, `Completed: Found ${findings.length} findings`);
      } catch (error: any) {
        this.addLog(logs, 'error', engineId, `Error: ${error.message}`);
      }
    }

    return stageFindings;
  }

  /**
   * Execute a single engine/tool
   */
  private async executeEngine(
    engineId: string,
    config: EngineCommandConfig,
    target: string,
    logs: OrchestrationResult['logs']
  ): Promise<FindingTemplate[]> {
    try {
      if (!config.cmd) {
        return [];
      }

      let cleanTarget = target.trim();
      let hostname = cleanTarget;
      try {
        if (cleanTarget.startsWith('http://') || cleanTarget.startsWith('https://')) {
          const u = new URL(cleanTarget);
          hostname = u.hostname;
        } else if (cleanTarget.includes('/')) {
          hostname = cleanTarget.split('/')[0];
        }
      } catch {}

      let targetUrl = cleanTarget;
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = `https://${cleanTarget}`;
      }

      const hostOnlyEngines = ['dnsx', 'subfinder', 'nmap', 'testssl'];
      const targetParam = hostOnlyEngines.includes(engineId) ? hostname : targetUrl;

      const cmd = config.cmd.replace(/<TARGET>/g, targetParam);
      this.addLog(logs, 'info', engineId, `Executing: ${cmd.substring(0, 90)}...`);

      const { stdout, stderr } = await execAsync(cmd, {
        timeout: (config.timeout || 60) * 1000,
        maxBuffer: 10 * 1024 * 1024,
        env: {
          ...process.env,
          PATH: `${process.env.PATH || ''}:/home/stavan/go/bin:/usr/bin:/usr/local/bin:/usr/sbin:/bin`,
        },
      });

      if (stderr) {
        this.addLog(logs, 'warn', engineId, `Stderr: ${stderr.substring(0, 200)}`);
      }

      // Parse output based on engine
      let findings = config.parser(stdout, target);

      // Apply specific parsers if available
      findings = this.applySpecializedParser(engineId, stdout, target, findings);

      return findings;
    } catch (error: any) {
      if (error.killed) {
        this.addLog(logs, 'error', engineId, `Timeout exceeded`);
      } else {
        this.addLog(logs, 'error', engineId, `Execution failed: ${error.message}`);
      }
      return [];
    }
  }

  /**
   * Apply specialized parsers for complex outputs
   */
  private applySpecializedParser(
    engineId: string,
    output: string,
    target: string,
    findings: FindingTemplate[]
  ): FindingTemplate[] {
    switch (engineId) {
      case 'nuclei':
        return AdvancedResultParser.parseNucleiOutput(output);
      case 'testssl':
        return AdvancedResultParser.parseTestsslOutput(output);
      case 'whatweb':
        return AdvancedResultParser.parseWhatwebOutput(output);
      case 'nmap':
        return AdvancedResultParser.parseNmapOutput(output);
      case 'katana':
        return AdvancedResultParser.parseKatanaOutput(output);
      case 'subfinder':
        return AdvancedResultParser.parseSubfinderOutput(output);
      case 'httpx':
        return AdvancedResultParser.parseHttpxOutput(output);
      default:
        return findings;
    }
  }

  /**
   * Get human-readable tool name
   */
  private getToolName(engineId: string): string {
    const names: Record<string, string> = {
      dnsx: 'dnsx',
      dns_check: 'dnsx',
      subfinder: 'Subfinder',
      subdomain_discovery: 'Subfinder',
      httpx: 'httpx',
      asset_discovery: 'httpx',
      whatweb: 'WhatWeb',
      tech_detection: 'WhatWeb',
      http_security: 'SecureLens Native HTTP Engine',
      testssl: 'testssl.sh',
      ssl_tls_analysis: 'testssl.sh',
      katana: 'Katana',
      endpoint_discovery: 'Katana',
      nmap: 'Nmap',
      network_exposure: 'Nmap',
      nuclei: 'Nuclei',
      vulnerability_detection: 'Nuclei',
      security_intelligence: 'SecureLens Security Intelligence Engine',
      results_cleaner: 'SecureLens Security Intelligence Engine',
    };
    return names[engineId] || engineId;
  }

  /**
   * Build final result with correlation
   */
  private buildResult(
    findings: Array<FindingTemplate & { source: string; tool: string }>,
    logs: OrchestrationResult['logs'],
    startTime: number,
    status: 'completed' | 'failed' | 'partial' | 'stopped',
    success: boolean
  ): OrchestrationResult {
    const correlatedFindings = CorrelationEngine.processFindings(findings);

    this.addLog(logs, 'info', 'orchestrator', 
      `Correlation completed: ${findings.length} findings → ${correlatedFindings.length} unique issues`);

    return {
      success,
      findings,
      correlatedFindings,
      logs,
      executionTime: Date.now() - startTime,
      status,
    };
  }

  /**
   * Helper to add log entry
   */
  private addLog(
    logs: OrchestrationResult['logs'],
    level: 'info' | 'warn' | 'error',
    engine: string,
    message: string,
    onLog?: (log: { ts: string; level: 'info' | 'warn' | 'error' | 'success'; engine?: string; message: string }) => void
  ): void {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
    logs.push({
      timestamp: new Date(),
      level,
      engine,
      message,
    });
    this.logger.log(`[${engine}] ${message}`);
    if (this.onLogCb) {
      this.onLogCb({ ts, level, engine, message });
    }
  }

  /**
   * Execute optimized pipeline (skip slow tools if needed)
   */
  async executeOptimizedPipeline(config: OrchestrationConfig): Promise<OrchestrationResult> {
    const fastEngines = ['dnsx', 'subfinder', 'httpx', 'whatweb'];
    const mediumEngines = ['katana', 'nuclei'];
    const slowEngines = ['nmap', 'testssl'];

    const requestedEngines = config.engines || fastEngines;
    const optimizedConfig: OrchestrationConfig = {
      ...config,
      engines: requestedEngines.filter(e => fastEngines.includes(e) || mediumEngines.includes(e)),
    };

    return this.executeFullPipeline(optimizedConfig);
  }

  /**
   * Execute quick scan (only fast engines)
   */
  async executeQuickScan(config: OrchestrationConfig): Promise<OrchestrationResult> {
    const quickEngines = ['dnsx', 'subfinder', 'httpx', 'whatweb'];
    const quickConfig: OrchestrationConfig = {
      ...config,
      engines: config.engines.filter(e => quickEngines.includes(e)),
      timeout: 30,
    };

    return this.executeFullPipeline(quickConfig);
  }

  /**
   * Execute deep scan (all engines with longer timeout)
   */
  async executeDeepScan(config: OrchestrationConfig): Promise<OrchestrationResult> {
    return this.executeFullPipeline({
      ...config,
      timeout: 300,
    });
  }
}

export default ScanOrchestrator;
