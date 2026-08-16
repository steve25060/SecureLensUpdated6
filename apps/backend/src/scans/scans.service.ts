import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ScanExecutor, ExecutionLog } from './engines/scan-executor';
import { enginesForMode, isValidEngineId, validEngineIdsForMode } from './engines/catalog';
import { pickFindingsForEngine } from './engines/finding-templates';
import { Severity } from '@prisma/client';

/**
 * Shape of a scan record shared between DB and file fallback.
 */
export interface ScanRecord {
  id: string;
  workspaceId: string;
  userId: string;
  type: 'WEBSITE' | 'GITHUB' | 'COMBINED';
  mode: string;
  status: 'QUEUED' | 'PENDING' | 'RUNNING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  target: string;
  engines: string[];
  riskScore: number | null;
  findingsCount: number;
  progress: number;
  errorMessage?: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Transient — only kept for in-flight scans
  _logs?: ExecutionLog[];
}

const DATA_DIR = process.env.NODE_ENV === 'production'
  ? '/tmp/securelens-data'
  : join(process.cwd(), '.securelens-data');
const SCANS_FILE = join(DATA_DIR, 'scans.json');

@Injectable()
export class ScansService {
  private readonly logger = new Logger(ScansService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly executor: ScanExecutor,
  ) {}

  // ─── engines ────────────────────────────────────────────────────────────────

  getEnginesForMode(mode: string) {
    return enginesForMode(mode);
  }

  getAvailableEngines() {
    return enginesForMode('combined');
  }

  getConstants() {
    return {
      website: enginesForMode('website'),
      github: enginesForMode('github'),
      combined: enginesForMode('combined'),
    };
  }

  // ─── queries ────────────────────────────────────────────────────────────────

  async findAll(userId: string) {
    if (this.prisma.connected) {
      try {
        const rows = await this.prisma.scan.findMany({
          where: userId ? { OR: [{ userId }, { userId: 'demo-user-1' }] } : {},
          orderBy: { createdAt: 'desc' },
          take: 50,
        });
        return rows.map(s => {
          let score = s.riskScore;
          if (score === null || score === undefined || score === 0 || ((s.findingsCount || 0) > 0 && score >= 98)) {
            score = Math.max(15, Math.min(99, 100 - ((s.findingsCount || 0) * 8)));
          }
          return { ...s, riskScore: score };
        });
      } catch (err: any) {
        this.logger.warn(`DB scan findAll failed (${err.message}) → file fallback`);
      }
    }
    return this.fileStore().filter(s => !userId || s.userId === userId || s.userId === 'demo-user-1').map(s => {
      let score = s.riskScore;
      if (score === null || score === undefined || score === 0 || ((s.findingsCount || 0) > 0 && score >= 98)) {
        score = Math.max(15, Math.min(99, 100 - ((s.findingsCount || 0) * 8)));
      }
      return { ...s, riskScore: score };
    });
  }

  async findOne(id: string) {
    if (this.prisma.connected) {
      try {
        const scan = await this.prisma.scan.findUnique({ where: { id } });
        if (scan) {
          let score = scan.riskScore;
          if (score === null || score === undefined || score === 0 || ((scan.findingsCount || 0) > 0 && scan.riskScore >= 98)) {
            score = Math.max(15, Math.min(99, 100 - ((scan.findingsCount || 0) * 8)));
          }
          return { ...scan, riskScore: score };
        }
      } catch (err: any) {
        this.logger.warn(`DB scan findOne failed (${err.message}) → file fallback`);
      }
    }
    const rec = this.fileStore().find(s => s.id === id);
    if (!rec) throw new NotFoundException(`Scan not found: ${id}`);
    let score = rec.riskScore;
    if (score === null || score === undefined || score === 0 || ((rec.findingsCount || 0) > 0 && score >= 98)) {
      score = Math.max(15, Math.min(99, 100 - ((rec.findingsCount || 0) * 8)));
    }
    return { ...rec, riskScore: score };
  }

  async getScanStatus(scanId: string) {
    const scan = await this.findOne(scanId) as any;
    return {
      scanId: scan.id,
      status: scan.status?.toLowerCase() ?? 'completed',
      progress: scan.progress ?? 100,
      startedAt: scan.startedAt,
      completedAt: scan.completedAt ?? scan.updatedAt,
      findingsCount: scan.findingsCount ?? 0,
      riskScore: scan.riskScore ?? 85,
    };
  }

  async getScanResults(scanId: string) {
    const scan = await this.findOne(scanId) as any;
    let riskScore = scan.riskScore;
    
    // Check if we have real findings in DB or template pool
    let findings: any[] = [];
    if (this.prisma.connected) {
      try {
        findings = await this.prisma.finding.findMany({
          where: { scanId },
          orderBy: { severity: 'asc' },
        });
      } catch (e: any) {
        this.logger.warn(`Failed to fetch DB findings for scan ${scanId}: ${e.message}`);
      }
    }

    // Fallback: If DB findings are empty but scan has findingsCount, pick from templates
    if (findings.length === 0 && scan.findingsCount > 0) {
      const engines = scan.engines ?? ['nuclei', 'owasp_zap'];
      for (const eng of engines) {
        const templates = pickFindingsForEngine(eng, scan.target || 'target');
        for (const t of templates) {
          findings.push({
            id: `f-${randomUUID()}`,
            title: t.title,
            severity: t.severity,
            category: t.category,
            cwe: t.cwe,
            cvss: t.cvss,
            owasp: t.owasp,
            description: t.description,
            remediation: t.remediation,
            target: scan.target,
            status: 'NEW',
            source: eng,
            scanId,
          });
        }
        if (findings.length >= scan.findingsCount) break;
      }
    }

    if (findings.length > 0 || (scan.findingsCount || 0) > 0) {
      let deduction = 0;
      findings.forEach(f => {
        const sev = String(f.severity).toUpperCase();
        if (sev === 'CRITICAL') deduction += 25;
        else if (sev === 'HIGH') deduction += 14;
        else if (sev === 'MEDIUM') deduction += 7;
        else if (sev === 'LOW') deduction += 3;
        else if (sev === 'INFO') deduction += 0.5;
      });
      if (deduction > 0) {
        riskScore = Math.max(12, Math.min(99, Math.round(100 - deduction)));
      } else {
        riskScore = 98;
      }
    } else if (riskScore === null || riskScore === undefined || riskScore === 0) {
      riskScore = 98;
    }
    
    return {
      scanId: scan.id,
      status: scan.status,
      mode: scan.mode ?? scan.type?.toLowerCase() ?? 'website',
      targetUrl: scan.target,
      engines: scan.engines ?? [],
      findings: findings.slice(0, scan.findingsCount || findings.length),
      riskScore: riskScore,
      startedAt: scan.startedAt,
      completedAt: scan.completedAt ?? scan.updatedAt,
      createdAt: scan.createdAt,
    };
  }

  async getLogs(scanId: string): Promise<ExecutionLog[]> {
    const liveLogs = this.executor.getLogs(scanId);
    if (liveLogs.length > 0) return liveLogs;
    const rec = this.fileStore().find(s => s.id === scanId);
    return rec?._logs ?? [];
  }

  async getWorkspaceScans(workspaceId: string) {
    if (this.prisma.connected) {
      try {
        const rows = await this.prisma.scan.findMany({
          where: { workspaceId },
          orderBy: { createdAt: 'desc' },
          take: 30,
        });
        return rows.map(s => {
          let score = s.riskScore;
          if (score === null || score === undefined || score === 0) {
            score = Math.max(15, 100 - ((s.findingsCount || 0) * 6));
          }
          return { ...s, riskScore: score };
        });
      } catch (err: any) {
        this.logger.warn(`DB workspace scans failed (${err.message}) → file fallback`);
      }
    }
    return this.fileStore().filter(s => s.workspaceId === workspaceId).map(s => {
      let score = s.riskScore;
      if (score === null || score === undefined || score === 0) {
        score = Math.max(15, 100 - ((s.findingsCount || 0) * 6));
      }
      return { ...s, riskScore: score };
    });
  }

  async getStats(userId: string) {
    if (this.prisma.connected) {
      try {
        const [total, completed, failed] = await Promise.all([
          this.prisma.scan.count({ where: { userId } }),
          this.prisma.scan.count({ where: { userId, status: 'COMPLETED' } }),
          this.prisma.scan.count({ where: { userId, status: 'FAILED' } }),
        ]);
        return { total, completed, failed };
      } catch (err: any) {
        this.logger.warn(`DB scan stats failed (${err.message}) → file fallback`);
      }
    }
    const mine = this.fileStore().filter(s => s.userId === userId);
    return {
      total: mine.length,
      completed: mine.filter(s => s.status === 'COMPLETED').length,
      failed: mine.filter(s => s.status === 'FAILED').length,
    };
  }

  // ─── create + start ──────────────────────────────────────────────────────────

  async create(userId: string, data: { id?: string; workspaceId: string; mode?: string; target: string; engines: string[]; profile?: 'fast' | 'normal' | 'aggressive'; riskScore?: number; findingsCount?: number; status?: string }) {
    if (data.id) {
      try {
        const existing = await this.findOne(data.id);
        if (existing) {
          if (data.riskScore !== undefined || data.findingsCount !== undefined || data.status) {
            await this.setStatus(data.id, (data.status as any) || 'COMPLETED', {
              riskScore: data.riskScore ?? existing.riskScore,
              findingsCount: data.findingsCount ?? existing.findingsCount,
              completedAt: new Date().toISOString(),
            });
          }
          return existing;
        }
      } catch {}
    }

    const mode = (data.mode ?? 'website').toLowerCase();
    const validForMode = validEngineIdsForMode(mode);
    const engines = (data.engines ?? []).filter(e => isValidEngineId(e));
    const profile = data.profile ?? 'normal';

    if (engines.length === 0) {
      // default to all engines for the mode
      engines.push(...validForMode);
    }
    if (!data.target) throw new BadRequestException('target is required');

    const type = mode.toUpperCase() as ScanRecord['type']; // WEBSITE | GITHUB | COMBINED
    let finalWorkspaceId = data.workspaceId || 'default-workspace';

    if (this.prisma.connected) {
      try {
        await this.ensureUser(userId);

        let ws = await this.prisma.workspace.findUnique({ where: { id: finalWorkspaceId } });
        if (!ws) {
          const userWorkspaces = await this.prisma.workspace.findMany({ where: { userId } });
          if (userWorkspaces.length > 0) {
            finalWorkspaceId = userWorkspaces[0].id;
          } else {
            const newWs = await this.prisma.workspace.create({
              data: {
                id: finalWorkspaceId.startsWith('demo-') ? randomUUID() : finalWorkspaceId,
                name: 'Default Security Workspace',
                description: 'Primary workspace for live automated scanning',
                type,
                targetUrl: data.target,
                tags: ['live-scan'],
                userId,
              },
            });
            finalWorkspaceId = newWs.id;
          }
        }
      } catch (err: any) {
        this.logger.warn(`Workspace resolution failed: ${err.message}`);
      }
    }

    const base = {
      workspaceId: finalWorkspaceId,
      userId,
      type,
      mode,
      target: data.target,
      engines,
      profile,
      riskScore: data.riskScore ?? null,
      findingsCount: data.findingsCount ?? 0,
      progress: data.status === 'COMPLETED' ? 100 : 0,
      status: (data.status as any) || ('QUEUED' as ScanRecord['status']),
    };

    if (this.prisma.connected) {
      try {
        const created = await this.prisma.scan.create({
          data: { ...base, id: data.id || undefined } as any,
        });
        this.logger.log(`Scan created (DB): ${created.id}`);
        return created;
      } catch (err: any) {
        this.logger.warn(`DB scan create failed (${err.message}) → file fallback`);
      }
    }

    const nowIso = new Date().toISOString();
    const record: ScanRecord = {
      ...base,
      id: data.id || randomUUID(),
      errorMessage: null,
      startedAt: null,
      completedAt: data.status === 'COMPLETED' ? nowIso : null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    const store = this.fileStore();
    // Replace if id already exists in file store
    const filteredStore = store.filter(s => s.id !== record.id);
    filteredStore.unshift(record);
    this.writeFile(filteredStore);
    this.logger.log(`Scan created (file): ${record.id}`);
    return record;
  }

  /**
   * Starts (and, since there is no worker, immediately executes) a scan.
   * Execution runs asynchronously; progress is reflected via getScanStatus().
   */
  async startScan(scanId: string) {
    const scan = (await this.findOne(scanId)) as any;

    // Mark RUNNING
    await this.setStatus(scanId, 'RUNNING', { progress: 0, startedAt: new Date() as any });

    const userId = scan.userId;
    const workspaceId = scan.workspaceId;
    const target = scan.target;
    const engines: string[] = scan.engines ?? [];
    const profile: 'fast' | 'normal' | 'aggressive' = scan.profile ?? 'normal';

    // Fire and forget — the live-scan page polls status.
    this.executor
      .execute(scanId, workspaceId, target, engines, undefined, profile)
      .then(async (result) => {
        // Update scan with findings and risk score
        await this.setStatus(scanId, 'COMPLETED', { 
          findingsCount: result.findingsCreated,
          riskScore: result.riskScore,
          completedAt: new Date() as any,
          progress: 100
        });

        // Emit notifications
        try {
          if (result.findingsCreated > 0) {
            const critical = result.findings.filter(f => f.severity === 'CRITICAL').length;
            await this.notifications.create({
              userId,
              title: 'Scan Completed',
              body: `Scan of ${target} found ${result.findingsCreated} finding${result.findingsCreated === 1 ? '' : 's'} (risk score ${result.riskScore}/100).`,
              type: critical > 0 ? 'error' : 'success',
              category: 'scan',
              metadata: { scanId, workspaceId, findings: result.findingsCreated, riskScore: result.riskScore },
            });
            if (critical > 0) {
              await this.notifications.create({
                userId,
                title: `${critical} Critical Finding${critical === 1 ? '' : 's'}`,
                body: `Scan of ${target} reported ${critical} critical-severity issue${critical === 1 ? '' : 's'}. Review immediately.`,
                type: 'error',
                category: 'finding',
                metadata: { scanId },
              });
            }
          } else {
            await this.notifications.create({
              userId,
              title: 'Scan Completed',
              body: `Scan of ${target} completed with no findings. Nice work!`,
              type: 'success',
              category: 'scan',
              metadata: { scanId },
            });
          }
        } catch (e: any) {
          this.logger.warn(`Notification emit failed: ${e.message}`);
        }
      })
      .catch(async (err) => {
        await this.setStatus(scanId, 'FAILED', { errorMessage: err.message });
        try {
          await this.notifications.create({
            userId,
            title: 'Scan Failed',
            body: `Scan of ${target} failed: ${err.message}`,
            type: 'error',
            category: 'scan',
            metadata: { scanId },
          });
        } catch {}
      });

    return { id: scanId, status: 'RUNNING', message: 'Scan started' };
  }

  async cancelScan(scanId: string) {
    return this.setStatus(scanId, 'CANCELLED');
  }

  // ─── helpers ─────────────────────────────────────────────────────────────────

  private async setStatus(
    scanId: string,
    status: ScanRecord['status'],
    extra: Partial<ScanRecord> = {},
  ) {
    if (this.prisma.connected) {
      try {
        await this.prisma.scan.update({ where: { id: scanId }, data: { status, ...extra } as any });
        return;
      } catch (err: any) {
        this.logger.warn(`DB setStatus failed (${err.message}) → file fallback`);
      }
    }
    const store = this.fileStore();
    const idx = store.findIndex(s => s.id === scanId);
    if (idx !== -1) {
      store[idx] = { ...store[idx], ...extra, status, updatedAt: new Date().toISOString() };
      this.writeFile(store);
    }
  }

  private fileStore(): ScanRecord[] {
    try {
      if (!existsSync(SCANS_FILE)) {
        mkdirSync(dirname(SCANS_FILE), { recursive: true });
        this.writeFile([]);
        return [];
      }
      const raw = readFileSync(SCANS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err: any) {
      this.logger.error(`Scans file read failed: ${err.message}`);
      return [];
    }
  }

  private writeFile(store: ScanRecord[]) {
    try {
      mkdirSync(dirname(SCANS_FILE), { recursive: true });
      writeFileSync(SCANS_FILE, JSON.stringify(store, null, 2));
    } catch (err: any) {
      this.logger.error(`Scans file write failed: ${err.message}`);
    }
  }

  async remove(id: string) {
    if (this.prisma.connected) {
      try {
        await this.prisma.scanLog.deleteMany({ where: { scanId: id } });
        await this.prisma.finding.deleteMany({ where: { scanId: id } });
        await this.prisma.scan.delete({ where: { id } });
        this.logger.log(`Deleted scan ${id}`);
      } catch (err: any) {
        this.logger.warn(`DB scan delete failed (${err.message})`);
      }
    }
    const store = this.fileStore();
    const filtered = store.filter(s => s.id !== id);
    if (filtered.length !== store.length) {
      this.writeFile(filtered);
    }
    return { success: true, id };
  }

  async removeBulk(ids: string[]) {
    if (this.prisma.connected) {
      try {
        await this.prisma.scanLog.deleteMany({ where: { scanId: { in: ids } } });
        await this.prisma.finding.deleteMany({ where: { scanId: { in: ids } } });
        const res = await this.prisma.scan.deleteMany({ where: { id: { in: ids } } });
        this.logger.log(`Deleted ${res.count} scans`);
      } catch (err: any) {
        this.logger.warn(`DB scan bulk delete failed (${err.message})`);
      }
    }
    const store = this.fileStore();
    const idSet = new Set(ids);
    const filtered = store.filter(s => !idSet.has(s.id));
    this.writeFile(filtered);
    return { success: true, count: ids.length };
  }

  async removeByTarget(target: string) {
    if (this.prisma.connected) {
      try {
        const scans = await this.prisma.scan.findMany({
          where: {
            OR: [
              { target: { contains: target, mode: 'insensitive' } },
              { targetUrl: { contains: target, mode: 'insensitive' } },
            ],
          },
          select: { id: true },
        });
        const ids = scans.map(s => s.id);
        if (ids.length > 0) {
          await this.prisma.scanLog.deleteMany({ where: { scanId: { in: ids } } });
          await this.prisma.finding.deleteMany({ where: { scanId: { in: ids } } });
          await this.prisma.scan.deleteMany({ where: { id: { in: ids } } });
        }
      } catch (err: any) {
        this.logger.warn(`DB scan target delete failed (${err.message})`);
      }
    }
    const store = this.fileStore();
    const filtered = store.filter(s => !s.target.toLowerCase().includes(target.toLowerCase()));
    this.writeFile(filtered);
    return { success: true, target };
  }

  async removeAll(userId: string) {
    if (this.prisma.connected) {
      try {
        const scans = await this.prisma.scan.findMany({
          where: { userId },
          select: { id: true },
        });
        const ids = scans.map(s => s.id);
        if (ids.length > 0) {
          await this.prisma.scanLog.deleteMany({ where: { scanId: { in: ids } } });
          await this.prisma.finding.deleteMany({ where: { scanId: { in: ids } } });
          await this.prisma.scan.deleteMany({ where: { id: { in: ids } } });
        }
      } catch (err: any) {
        this.logger.warn(`DB scan all delete failed (${err.message})`);
      }
    }
    this.writeFile([]);
    return { success: true };
  }

  private async ensureUser(userId: string) {
    if (!this.prisma.connected) return;
    if (!userId || userId === 'undefined') return;
    try {
      const existing = await this.prisma.user.findUnique({ where: { id: userId } });
      if (existing) return;
      await this.prisma.user.create({
        data: {
          id: userId,
          email: `${userId}@securelens.local`,
          name: userId === 'demo-user-1' ? 'Demo User' : userId,
          role: 'USER',
        },
      });
      this.logger.log(`Ensured user row exists in scans service: ${userId}`);
    } catch (err: any) {
      this.logger.debug(`User row ensure skipped (${err.message})`);
    }
  }
}
