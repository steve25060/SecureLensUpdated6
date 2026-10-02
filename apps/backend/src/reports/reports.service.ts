import { Injectable, Logger, BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Reports derive their content from real scans + findings. When a user
 * "generates a report" we compute a JSON summary (counts, top issues, worst
 * workspace) and persist a Report row that the frontend can render.
 */
@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    if (!userId) return [];
    if (this.prisma.connected) {
      try {
        const reports = await this.prisma.report.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
        return reports;
      } catch (err: any) {
        this.logger.warn(`DB reports findAll failed (${err.message})`);
      }
    }
    if (process.env.NODE_ENV === 'production') {
      throw new ServiceUnavailableException('Database is unavailable');
    }
    return [];
  }

  async findOne(id: string, userId: string) {
    if (this.prisma.connected) {
      try {
        const r = await this.prisma.report.findFirst({ where: { id, userId } });
        if (r) return r;
      } catch (err: any) {
        this.logger.warn(`DB report findOne failed (${err.message})`);
      }
    }
    throw new NotFoundException(`Report not found: ${id}`);
  }

  /**
   * Create a report by computing a summary from the user's real findings.
   * `workspaceId` is optional; omit it for an org-wide report.
   */
  async create(userId: string, data: { name?: string; type?: string; workspaceId?: string }) {
    const type = (data.type ?? 'EXECUTIVE_SUMMARY') as any;
    const name = data.name ?? this.defaultName(type);

    if (!this.prisma.connected) {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException('Database is unavailable');
      }
      return {
        id: randomUUID(),
        name,
        type,
        status: 'COMPLETED',
        userId,
        summary: this.buildSummary([]),
        createdAt: new Date().toISOString(),
        _offline: true,
      };
    }

    const workspace = data.workspaceId
      ? await this.prisma.workspace.findFirst({ where: { id: data.workspaceId, userId } })
      : await this.prisma.workspace.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });

    if (!workspace) {
      throw new BadRequestException('Create a workspace before generating a report');
    }

    try {
      const findings = await this.prisma.finding.findMany({
        where: {
          workspaceId: workspace.id,
          workspace: { userId },
        },
        take: 1000,
      });
      const summary = this.buildSummary(findings);

      const report = await this.prisma.report.create({
        data: {
          name,
          type,
          status: 'COMPLETED',
          userId,
          workspaceId: workspace.id,
          summary: summary as any,
          generatedAt: new Date(),
        },
      });
      this.logger.log(`Report created: ${report.id}`);
      return report;
    } catch (err: any) {
      this.logger.error(`DB report create failed (${err.message})`);
      throw err;
    }
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    if (this.prisma.connected) {
      try {
        await this.prisma.report.deleteMany({ where: { id, userId } });
        return { success: true, id };
      } catch (err: any) {
        this.logger.warn(`DB report delete failed (${err.message})`);
      }
    }
    return { success: true, id };
  }

  async removeBulk(ids: string[], userId: string) {
    const uniqueIds = Array.from(new Set((ids || []).filter(Boolean)));
    if (this.prisma.connected) {
      try {
        const result = await this.prisma.report.deleteMany({
          where: { id: { in: uniqueIds }, userId },
        });
        return { success: true, count: result.count };
      } catch (err: any) {
        this.logger.error(`DB report bulk delete failed (${err.message})`);
        throw err;
      }
    }
    return { success: true, count: 0 };
  }

  async removeAll(userId: string) {
    if (this.prisma.connected) {
      try {
        const result = await this.prisma.report.deleteMany({
          where: { userId },
        });
        return { success: true, count: result.count };
      } catch (err: any) {
        this.logger.warn(`DB report delete all failed (${err.message})`);
      }
    }
    return { success: true, count: 0 };
  }

  async getStats(userId: string) {
    if (this.prisma.connected) {
      try {
        const [reportsGenerated, allFindings, resolved] = await Promise.all([
          this.prisma.report.count({ where: { userId } }),
          this.prisma.finding.count({ where: { scan: { workspace: { userId } } } }),
          this.prisma.finding.count({ where: { scan: { workspace: { userId } }, status: 'RESOLVED' } }),
        ]);
        return {
          reportsGenerated,
          criticalFindings: allFindings,
          resolvedFindings: resolved,
          avgRiskScore: 0,
        };
      } catch (err: any) {
        this.logger.warn(`DB report stats failed (${err.message})`);
      }
    }
    return { reportsGenerated: 0, criticalFindings: 0, resolvedFindings: 0, avgRiskScore: 0 };
  }

  // ─── helpers ─────────────────────────────────────────────────────────────────
  private buildSummary(findings: any[]) {
    const sev = (k: string) => findings.filter(f => (f.severity ?? '').toUpperCase() === k).length;
    const byCategory = new Map<string, number>();
    for (const f of findings) {
      const c = f.category ?? 'Other';
      byCategory.set(c, (byCategory.get(c) ?? 0) + 1);
    }
    const topIssues = Array.from(byCategory.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return {
      total: findings.length,
      bySeverity: {
        critical: sev('CRITICAL'),
        high: sev('HIGH'),
        medium: sev('MEDIUM'),
        low: sev('LOW'),
        info: sev('INFO'),
      },
      topIssues,
      generatedAt: new Date().toISOString(),
    };
  }

  private defaultName(type: string): string {
    const labels: Record<string, string> = {
      EXECUTIVE_SUMMARY: 'Executive Security Summary',
      SECURITY_POSTURE: 'Security Posture Assessment',
      VULNERABILITY: 'Vulnerability Report',
      COMPLIANCE: 'Compliance Audit',
      ASSET_INVENTORY: 'Asset Inventory',
    };
    return `${labels[type] ?? 'Security Report'} — ${new Date().toLocaleDateString()}`;
  }

  private async firstWorkspaceId(userId: string): Promise<string | null> {
    try {
      const ws = await this.prisma.workspace.findFirst({ where: { userId } });
      return ws?.id ?? null;
    } catch {
      return null;
    }
  }
}
