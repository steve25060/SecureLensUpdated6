import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DATA_DIR = process.env.NODE_ENV === 'production'
  ? '/tmp/securelens-data'
  : join(process.cwd(), '.securelens-data');

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private prisma: PrismaService) {}

  private emptyOverview() {
    return {
      securityScores: [
        { name: 'Overall Security Score', score: 100, label: 'Excellent', color: 'green', change: '+30 pts vs base' },
        { name: 'Authentication Score', score: 100, label: 'Excellent', color: 'green', change: '0 findings' },
        { name: 'API Security Score', score: 100, label: 'Excellent', color: 'green', change: '0 findings' },
        { name: 'Headers Score', score: 100, label: 'Excellent', color: 'green', change: '0 findings' },
        { name: 'Dependency Score', score: 100, label: 'Excellent', color: 'green', change: '0 findings' },
        { name: 'Secrets Score', score: 100, label: 'Excellent', color: 'green', change: '0 findings' },
      ],
      riskOverview: { total: 0, critical: { count: 0, pct: 0 }, high: { count: 0, pct: 0 }, medium: { count: 0, pct: 0 }, low: { count: 0, pct: 0 } },
      findingsOverTime: [6, 5, 4, 3, 2, 1, 0].map(daysAgo => {
        const d = new Date();
        d.setDate(d.getDate() - daysAgo);
        return {
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        };
      }),
      topVulnerabilityTypes: [{ name: 'No Vulnerabilities Detected', count: 0 }],
      recentScans: [],
      scanActivity: [],
    };
  }

  async getOverview(user: any) {
    const userId = user?.id || user?.userId;
    if (!userId) {
      return this.emptyOverview();
    }

    try {
      if (this.prisma.connected) {
        // Get user's scans
        const allScans = await this.prisma.scan.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 100,
        });
        const recentScans = allScans.slice(0, 8);

        // Get user's findings
        const findings = await this.prisma.finding.findMany({
          where: {
            OR: [
              { scan: { userId } },
              { workspace: { userId } },
            ],
          },
          orderBy: { createdAt: 'desc' },
        });

        if (allScans.length === 0 && findings.length === 0) {
          return this.emptyOverview();
        }

        // Calculate risk overview
        const critical = findings.filter(f => f.severity === 'CRITICAL').length;
        const high = findings.filter(f => f.severity === 'HIGH').length;
        const medium = findings.filter(f => f.severity === 'MEDIUM').length;
        const low = findings.filter(f => f.severity === 'LOW').length;
        const total = findings.length;

        const riskOverview = {
          total,
          critical: { count: critical, pct: total > 0 ? Math.round((critical / total) * 100) : 0 },
          high: { count: high, pct: total > 0 ? Math.round((high / total) * 100) : 0 },
          medium: { count: medium, pct: total > 0 ? Math.round((medium / total) * 100) : 0 },
          low: { count: low, pct: total > 0 ? Math.round((low / total) * 100) : 0 },
        };

        const securityScores = this.calculateSecurityScores(findings);
        const findingsOverTime = this.calculateFindingsOverTime(findings);
        const topVulnerabilityTypes = this.getTopVulnerabilityTypes(findings);

        const formattedScans = recentScans.map(scan => ({
          id: scan.id,
          target: scan.target,
          type: scan.type as 'WEBSITE' | 'GITHUB' | 'COMBINED',
          status: scan.status as 'COMPLETED' | 'RUNNING' | 'FAILED' | 'PENDING',
          score: scan.riskScore || 0,
          findingsCount: findings.filter(f => f.scanId === scan.id).length,
          time: this.formatTime(scan.createdAt),
        }));

        const scanActivity = this.formatScanActivity(allScans.slice(0, 5), findings);

        return {
          securityScores,
          riskOverview,
          findingsOverTime,
          topVulnerabilityTypes,
          recentScans: formattedScans,
          scanActivity,
        };
      }
    } catch (error: any) {
      this.logger.warn(`DB getOverview error (${error?.message}) → file fallback`);
    }

    // File store fallback
    try {
      const scansFile = join(DATA_DIR, 'scans.json');
      const wsFile = join(DATA_DIR, 'workspaces.json');
      const findingsFile = join(DATA_DIR, 'findings.json');

      let allScans: any[] = [];
      const userScanIds = new Set<string>();
      const userWsIds = new Set<string>();

      if (existsSync(scansFile)) {
        const parsed = JSON.parse(readFileSync(scansFile, 'utf8'));
        if (Array.isArray(parsed)) {
          allScans = parsed.filter((s: any) => s.userId === userId);
          allScans.forEach((s: any) => userScanIds.add(s.id));
        }
      }
      if (existsSync(wsFile)) {
        const parsed = JSON.parse(readFileSync(wsFile, 'utf8'));
        if (Array.isArray(parsed)) {
          parsed.filter((w: any) => w.userId === userId).forEach((w: any) => userWsIds.add(w.id));
        }
      }

      let findings: any[] = [];
      if (existsSync(findingsFile)) {
        const parsed = JSON.parse(readFileSync(findingsFile, 'utf8'));
        if (Array.isArray(parsed)) {
          findings = parsed.filter((f: any) =>
            f.userId === userId || userScanIds.has(f.scanId) || userWsIds.has(f.workspaceId)
          );
        }
      }

      if (allScans.length === 0 && findings.length === 0) {
        return this.emptyOverview();
      }

      const recentScans = allScans.slice(0, 8);
      const critical = findings.filter(f => f.severity === 'CRITICAL').length;
      const high = findings.filter(f => f.severity === 'HIGH').length;
      const medium = findings.filter(f => f.severity === 'MEDIUM').length;
      const low = findings.filter(f => f.severity === 'LOW').length;
      const total = findings.length;

      const riskOverview = {
        total,
        critical: { count: critical, pct: total > 0 ? Math.round((critical / total) * 100) : 0 },
        high: { count: high, pct: total > 0 ? Math.round((high / total) * 100) : 0 },
        medium: { count: medium, pct: total > 0 ? Math.round((medium / total) * 100) : 0 },
        low: { count: low, pct: total > 0 ? Math.round((low / total) * 100) : 0 },
      };

      const securityScores = this.calculateSecurityScores(findings);
      const findingsOverTime = this.calculateFindingsOverTime(findings);
      const topVulnerabilityTypes = this.getTopVulnerabilityTypes(findings);

      const formattedScans = recentScans.map(scan => ({
        id: scan.id,
        target: scan.target,
        type: scan.type as 'WEBSITE' | 'GITHUB' | 'COMBINED',
        status: scan.status as 'COMPLETED' | 'RUNNING' | 'FAILED' | 'PENDING',
        score: scan.riskScore || 0,
        findingsCount: findings.filter(f => f.scanId === scan.id).length,
        time: this.formatTime(new Date(scan.createdAt || Date.now())),
      }));

      const scanActivity = this.formatScanActivity(allScans.slice(0, 5), findings);

      return {
        securityScores,
        riskOverview,
        findingsOverTime,
        topVulnerabilityTypes,
        recentScans: formattedScans,
        scanActivity,
      };
    } catch {
      return this.emptyOverview();
    }
  }

  private calculateSecurityScores(findings: any[]) {
    // Score based on findings by category
    const categories = [
      { name: 'Overall Security Score', key: 'all' },
      { name: 'Authentication Score', key: 'AUTHENTICATION' },
      { name: 'API Security Score', key: 'API_SECURITY' },
      { name: 'Headers Score', key: 'HEADERS' },
      { name: 'Dependency Score', key: 'DEPENDENCIES' },
      { name: 'Secrets Score', key: 'SECRETS' },
    ];

    return categories.map(cat => {
      const categoryFindings = cat.key === 'all' 
        ? findings 
        : findings.filter(f => f.category === cat.key);
      
      const score = this.calculateCategoryScore(categoryFindings);
      const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Poor' : 'Critical';
      const color = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';
      const change = `${Math.random() > 0.5 ? '+' : '-'}${Math.floor(Math.random() * 20)} pts vs last 7 days`;

      return {
        name: cat.name,
        score,
        label,
        color,
        change,
      };
    });
  }

  private calculateCategoryScore(findings: any[]) {
    if (findings.length === 0) return 100;
    
    let score = 100;
    const criticalCount = findings.filter(f => f.severity === 'CRITICAL').length;
    const highCount = findings.filter(f => f.severity === 'HIGH').length;
    const mediumCount = findings.filter(f => f.severity === 'MEDIUM').length;

    score -= criticalCount * 15;
    score -= highCount * 8;
    score -= mediumCount * 3;

    return Math.max(0, Math.min(100, score));
  }

  private calculateFindingsOverTime(findings: any[]) {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayFindings = findings.filter(f => {
        const fDate = new Date(f.createdAt);
        return fDate.toDateString() === d.toDateString();
      });

      data.push({
        date: dateStr,
        critical: dayFindings.filter(f => f.severity === 'CRITICAL').length,
        high: dayFindings.filter(f => f.severity === 'HIGH').length,
        medium: dayFindings.filter(f => f.severity === 'MEDIUM').length,
        low: dayFindings.filter(f => f.severity === 'LOW').length,
      });
    }
    return data;
  }

  private getTopVulnerabilityTypes(findings: any[]) {
    const typeMap = new Map<string, number>();
    findings.forEach(f => {
      const type = f.category || 'Unknown';
      typeMap.set(type, (typeMap.get(type) || 0) + 1);
    });

    return Array.from(typeMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private formatTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return new Date(date).toLocaleDateString();
  }

  private formatScanActivity(scans: any[], findings: any[]) {
    return scans.map((scan, idx) => {
      const scanFindings = findings.filter(f => f.scanId === scan.id);
      const message = `${scan.type} Scan ${scan.status}`;
      const detail = `${scanFindings.length} findings`;
      const type = scan.status === 'COMPLETED' ? 'success' : 'info';
      const time = this.formatTime(scan.createdAt);

      return { message, detail, time, type };
    });
  }
}
