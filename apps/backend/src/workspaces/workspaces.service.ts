import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';

/**
 * Shape used everywhere (frontend + file fallback). Mirrors the Prisma model.
 */
export interface WorkspaceRecord {
  id: string;
  name: string;
  description?: string | null;
  tags: string[];
  type: 'WEBSITE' | 'GITHUB' | 'COMBINED';
  targetUrl?: string | null;
  repoUrl?: string | null;
  userId: string;
  riskScore?: number | null;
  findingsCount?: number;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = process.env.NODE_ENV === 'production'
  ? '/tmp/securelens-data'
  : join(process.cwd(), '.securelens-data');
const WORKSPACES_FILE = join(DATA_DIR, 'workspaces.json');

const DEMO_SEED: Omit<WorkspaceRecord, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Acme Corp – Production',
    description: 'Primary production website & API surface for Acme Corp.',
    type: 'WEBSITE', targetUrl: 'https://acme.com', tags: ['production', 'external'], userId: 'demo-user-1',
    riskScore: 72, findingsCount: 14, status: 'active',
  },
  {
    name: 'Auth Service Repo',
    description: 'GitHub source scan for the authentication microservice.',
    type: 'GITHUB', repoUrl: 'https://github.com/acme/auth-service', tags: ['critical', 'internal'], userId: 'demo-user-1',
    riskScore: 45, findingsCount: 8, status: 'active',
  },
];

@Injectable()
export class WorkspacesService {
  private readonly logger = new Logger(WorkspacesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  // ─── findAll ─────────────────────────────────────────────────────────────────

  async findAll(userId: string): Promise<WorkspaceRecord[]> {
    await this.ensureUser(userId);

    if (this.prisma.connected) {
      try {
        let rows = await this.prisma.workspace.findMany({
          where: { userId },
          include: {
            scans: {
              select: {
                id: true,
                status: true,
                riskScore: true,
                findingsCount: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
            findings: {
              select: {
                id: true,
                severity: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (rows.length === 0) {
          const defaultWs = await this.prisma.workspace.create({
            data: {
              name: 'Default Security Workspace',
              description: 'Primary workspace for live automated scanning',
              type: 'COMBINED',
              targetUrl: 'https://example.com',
              tags: ['production', 'live-scan'],
              userId,
            },
          });
          rows = [defaultWs as any];
        }

        return rows.map(r => this.serializeDb(r));
      } catch (err: any) {
        this.logger.warn(`DB findAll failed (${err.message}) → file fallback`);
      }
    }

    let fileList = this.fileStore();
    const userFiltered = fileList.filter(w => w.userId === userId);
    if (userFiltered.length > 0) {
      return userFiltered;
    }

    if (fileList.length === 0) {
      const now = new Date().toISOString();
      const defaultWs: WorkspaceRecord = {
        id: randomUUID(),
        name: 'UptoSkills – Main Web Surface',
        description: 'Primary production website, API endpoints, and customer authentication portal.',
        tags: ['production', 'critical', 'web-app'],
        type: 'WEBSITE',
        targetUrl: 'https://uptoskills.com',
        repoUrl: null,
        userId,
        riskScore: 84,
        findingsCount: 6,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };
      fileList = [defaultWs, ...DEMO_SEED.map(s => ({ ...s, id: randomUUID(), userId, createdAt: now, updatedAt: now }))];
      this.writeFile(fileList);
    }
    return fileList;
  }

  // ─── findOne ─────────────────────────────────────────────────────────────────

  async findOne(id: string): Promise<WorkspaceRecord> {
    if (this.prisma.connected) {
      try {
        const ws = await this.prisma.workspace.findUnique({
          where: { id },
          include: {
            scans: {
              select: {
                id: true,
                status: true,
                riskScore: true,
                findingsCount: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
            findings: {
              select: {
                id: true,
                severity: true,
                status: true,
              },
            },
          },
        });
        if (ws) return this.serializeDb(ws);
      } catch (err: any) {
        this.logger.warn(`DB findOne failed (${err.message}) → file fallback`);
      }
    }
    const rec = this.fileStore().find(w => w.id === id);
    if (!rec) throw new NotFoundException(`Workspace not found: ${id}`);
    return rec;
  }

  // ─── create ──────────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateWorkspaceDto): Promise<WorkspaceRecord> {
    await this.ensureUser(userId);
    const type = (dto.type ?? 'WEBSITE') as WorkspaceRecord['type'];

    if (this.prisma.connected) {
      try {
        const created = await this.prisma.workspace.create({
          data: {
            name: dto.name,
            description: dto.description ?? null,
            tags: dto.tags ?? [],
            type,
            targetUrl: dto.targetUrl ?? null,
            repoUrl: dto.repoUrl ?? null,
            userId,
          },
        });
        this.logger.log(`Workspace created (DB): ${created.id} for ${userId}`);
        return this.serializeDb(created);
      } catch (err: any) {
        this.logger.warn(`DB create failed (${err.message}) → file fallback`);
      }
    }

    const now = new Date().toISOString();
    const record: WorkspaceRecord = {
      id: randomUUID(),
      name: dto.name,
      description: dto.description ?? null,
      tags: dto.tags ?? [],
      type,
      targetUrl: dto.targetUrl ?? null,
      repoUrl: dto.repoUrl ?? null,
      userId,
      createdAt: now,
      updatedAt: now,
    };
    const store = this.fileStore();
    store.push(record);
    this.writeFile(store);
    this.logger.log(`Workspace created (file): ${record.id} for ${userId}`);
    return record;
  }

  // ─── update ──────────────────────────────────────────────────────────────────

  async update(id: string, dto: Partial<CreateWorkspaceDto>): Promise<WorkspaceRecord> {
    if (this.prisma.connected) {
      try {
        const updated = await this.prisma.workspace.update({
          where: { id },
          data: {
            ...(dto.name !== undefined && { name: dto.name }),
            ...(dto.description !== undefined && { description: dto.description }),
            ...(dto.tags !== undefined && { tags: dto.tags }),
            ...(dto.type !== undefined && { type: dto.type as any }),
            ...(dto.targetUrl !== undefined && { targetUrl: dto.targetUrl }),
            ...(dto.repoUrl !== undefined && { repoUrl: dto.repoUrl }),
          },
        });
        return this.serializeDb(updated);
      } catch (err: any) {
        this.logger.warn(`DB update failed (${err.message}) → file fallback`);
      }
    }
    const store = this.fileStore();
    const idx = store.findIndex(w => w.id === id);
    if (idx === -1) throw new NotFoundException(`Workspace not found: ${id}`);
    store[idx] = { ...store[idx], ...dto, updatedAt: new Date().toISOString() } as WorkspaceRecord;
    this.writeFile(store);
    return store[idx];
  }

  // ─── remove ──────────────────────────────────────────────────────────────────

  async remove(id: string): Promise<{ success: boolean }> {
    if (this.prisma.connected) {
      try {
        await this.prisma.workspace.delete({ where: { id } });
        return { success: true };
      } catch (err: any) {
        this.logger.warn(`DB delete failed (${err.message}) → file fallback`);
      }
    }
    const store = this.fileStore();
    const idx = store.findIndex(w => w.id === id);
    if (idx === -1) throw new NotFoundException(`Workspace not found: ${id}`);
    store.splice(idx, 1);
    this.writeFile(store);
    return { success: true };
  }

  // ─── stats ───────────────────────────────────────────────────────────────────

  async getStats(userId: string) {
    const all = await this.findAll(userId);
    return { total: all.length };
  }

  // ─── File-backed fallback store ──────────────────────────────────────────────
  //
  // Used when Postgres is unreachable so that workspaces created in the UI still
  // persist across server restarts (unlike a pure in-memory map).

  private fileStore(): WorkspaceRecord[] {
    try {
      if (!existsSync(WORKSPACES_FILE)) {
        mkdirSync(dirname(WORKSPACES_FILE), { recursive: true });
        // Seed demo data on first use so the page isn't empty.
        const seeded = DEMO_SEED.map(s => ({
          ...s,
          id: randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
        this.writeFile(seeded);
        return seeded;
      }
      const raw = readFileSync(WORKSPACES_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err: any) {
      this.logger.error(`File store read failed: ${err.message}`);
      return [];
    }
  }

  private writeFile(store: WorkspaceRecord[]) {
    try {
      mkdirSync(dirname(WORKSPACES_FILE), { recursive: true });
      writeFileSync(WORKSPACES_FILE, JSON.stringify(store, null, 2));
    } catch (err: any) {
      this.logger.error(`File store write failed: ${err.message}`);
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /** Serialize a Prisma row (Date fields → ISO strings) for JSON responses. */
  private serializeDb(row: any): WorkspaceRecord {
    const findings = row.findings || [];
    const scans = row.scans || [];
    const activeFindings = findings.filter((f: any) => f.status !== 'FALSE_POSITIVE' && f.status !== 'RESOLVED');

    let score = row.riskScore ?? null;
    if (score === null || score === undefined || score === 0) {
      if (scans.length > 0 && scans[0].riskScore && scans[0].riskScore > 0) {
        score = scans[0].riskScore;
      } else if (activeFindings.length > 0) {
        let deduction = 0;
        activeFindings.forEach((f: any) => {
          const sev = String(f.severity).toUpperCase();
          if (sev === 'CRITICAL') deduction += 20;
          else if (sev === 'HIGH') deduction += 12;
          else if (sev === 'MEDIUM') deduction += 5;
          else if (sev === 'LOW') deduction += 2;
        });
        score = Math.max(15, Math.min(100, 100 - deduction));
      } else if (scans.length > 0) {
        score = 88;
      } else {
        score = 82;
      }
    }

    const findingsCount = activeFindings.length || (scans[0]?.findingsCount ?? (row.findingsCount ?? 0));
    const status = scans.some((s: any) => s.status === 'RUNNING') ? 'running' : 'active';

    return {
      id: row.id,
      name: row.name,
      description: row.description ?? null,
      tags: row.tags ?? [],
      type: row.type ?? 'WEBSITE',
      targetUrl: row.targetUrl ?? null,
      repoUrl: row.repoUrl ?? null,
      userId: row.userId,
      riskScore: score,
      findingsCount,
      status,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
    };
  }

  /**
   * Guarantee the user row exists in Postgres before inserting a workspace.
   * The demo login mints a JWT with `sub: 'demo-user-1'`; if that row isn't in
   * the DB the workspace insert violates the FK. We seed it on demand here.
   */
  private async ensureUser(userId: string) {
    if (!this.prisma.connected) return;
    if (!userId || userId === 'undefined') return;
    try {
      const existing = await this.prisma.user.findUnique({ where: { id: userId } });
      if (existing) return;
      // Best-effort create. If it collides (race) we ignore and move on.
      await this.prisma.user.create({
        data: {
          id: userId,
          email: `${userId}@securelens.local`,
          name: userId === 'demo-user-1' ? 'Demo User' : userId,
          role: 'USER',
        },
      });
      this.logger.log(`Ensured user row exists: ${userId}`);
    } catch (err: any) {
      // P2002 = unique violation → row already exists, which is fine.
      if (!String(err?.code).startsWith('P2002')) {
        this.logger.warn(`ensureUser(${userId}) failed: ${err.message}`);
      }
    }
  }
}
