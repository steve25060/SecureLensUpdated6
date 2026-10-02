import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface FindingRecord {
  id: string;
  scanId: string;
  workspaceId: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  status: 'NEW' | 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_POSITIVE';
  source: string;
  category?: string;
  target: string;
  url?: string;
  parameter?: string;
  cvss?: number;
  cwe?: string;
  owasp?: string;
  remediation?: string;
  createdAt: string;
  firstSeen: string;
  updatedAt: string;
}

const DATA_DIR = process.env.NODE_ENV === 'production'
  ? '/tmp/securelens-data'
  : join(process.cwd(), '.securelens-data');
const FINDINGS_FILE = join(DATA_DIR, 'findings.json');

@Injectable()
export class FindingsService {
  private readonly logger = new Logger(FindingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private ownerWhere(userId: string) {
    return {
      OR: [
        { scan: { userId } },
        { workspace: { userId } },
      ],
    };
  }

  private filterFileForUser(items: FindingRecord[], userId: string): FindingRecord[] {
    if (!userId) return [];
    const scansFile = join(DATA_DIR, 'scans.json');
    const wsFile = join(DATA_DIR, 'workspaces.json');
    const userScanIds = new Set<string>();
    const userWsIds = new Set<string>();
    try {
      if (existsSync(scansFile)) {
        const scans = JSON.parse(readFileSync(scansFile, 'utf8'));
        if (Array.isArray(scans)) {
          scans.filter((scan: any) => scan.userId === userId).forEach((scan: any) => userScanIds.add(scan.id));
        }
      }
      if (existsSync(wsFile)) {
        const workspaces = JSON.parse(readFileSync(wsFile, 'utf8'));
        if (Array.isArray(workspaces)) {
          workspaces
            .filter((workspace: any) => workspace.userId === userId)
            .forEach((workspace: any) => userWsIds.add(workspace.id));
        }
      }
    } catch {}

    return items.filter((finding: any) =>
      finding.userId === userId ||
      userScanIds.has(finding.scanId) ||
      userWsIds.has(finding.workspaceId),
    );
  }

  private fileStore(): FindingRecord[] {
    try {
      if (!existsSync(FINDINGS_FILE)) return [];
      const buf = readFileSync(FINDINGS_FILE, 'utf8');
      return JSON.parse(buf) as FindingRecord[];
    } catch {
      return [];
    }
  }

  private writeFile(items: FindingRecord[]): void {
    try {
      mkdirSync(dirname(FINDINGS_FILE), { recursive: true });
      writeFileSync(FINDINGS_FILE, JSON.stringify(items, null, 2), 'utf8');
    } catch (err: any) {
      this.logger.warn(`Failed to write findings file: ${err.message}`);
    }
  }

  async findAll(userId: string, query: { scanId?: string; workspaceId?: string; severity?: string; status?: string; source?: string; search?: string; target?: string; category?: string; page?: number | string; limit?: number | string; [key: string]: any }) {
    const page = typeof query.page === 'string' ? parseInt(query.page, 10) || 1 : (query.page ?? 1);
    const limit = typeof query.limit === 'string' ? parseInt(query.limit, 10) || 100 : (query.limit ?? 100);
    const { page: _p, limit: _l, ...filters } = query;

    if (!userId) {
      return { items: [], total: 0, page: 1, limit, pages: 0 };
    }

    if (this.prisma.connected) {
      try {
        const where: any = { AND: [this.ownerWhere(userId)] };
        if (query.scanId) where.scanId = query.scanId;
        if (filters.workspaceId) where.workspaceId = filters.workspaceId;

        if (filters.severity) where.severity = filters.severity;
        if (filters.status) where.status = filters.status;
        if (filters.source) where.source = { contains: filters.source, mode: 'insensitive' };
        if (filters.target) where.target = { contains: filters.target, mode: 'insensitive' };
        if (filters.category) where.category = { contains: filters.category, mode: 'insensitive' };

        if (filters.search) {
          const searchClause = [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { target: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
            { source: { contains: filters.search, mode: 'insensitive' } },
            { category: { contains: filters.search, mode: 'insensitive' } },
            { cwe: { contains: filters.search, mode: 'insensitive' } },
          ];
          where.AND.push({ OR: searchClause });
        }

        const [items, total] = await Promise.all([
          this.prisma.finding.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { firstSeen: 'desc' },
          }),
          this.prisma.finding.count({ where }),
        ]);

        return { items, total, page, limit, pages: Math.ceil(total / limit) || 0 };
      } catch (error: any) {
        this.logger.warn(`Failed to fetch DB findings (${error?.message}) → file fallback`);
      }
    }

    // File store fallback (development only): owner-filter first, then query-filter.
    let fileFindings = this.filterFileForUser(this.fileStore(), userId);
    if (query.scanId) {
      fileFindings = fileFindings.filter(f => f.scanId === query.scanId);
    }
    if (filters.workspaceId) {
      fileFindings = fileFindings.filter(f => f.workspaceId === filters.workspaceId);
    }

    if (filters.severity) {
      fileFindings = fileFindings.filter(f => f.severity === filters.severity);
    }
    if (filters.status) {
      fileFindings = fileFindings.filter(f => f.status === filters.status);
    }
    if (filters.target) {
      fileFindings = fileFindings.filter(f => f.target.toLowerCase().includes(filters.target.toLowerCase()));
    }
    if (filters.category) {
      fileFindings = fileFindings.filter(f => (f.category || '').toLowerCase().includes(filters.category.toLowerCase()));
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      fileFindings = fileFindings.filter(f =>
        f.title.toLowerCase().includes(q) ||
        f.target.toLowerCase().includes(q) ||
        (f.description || '').toLowerCase().includes(q)
      );
    }

    const total = fileFindings.length;
    const items = fileFindings.slice((page - 1) * limit, page * limit);
    return { items, total, page, limit, pages: Math.ceil(total / limit) || (total === 0 ? 0 : 1) };
  }

  async findByScanId(scanId: string, userId: string) {
    if (this.prisma.connected) {
      try {
        const rows = await this.prisma.finding.findMany({
          where: { scanId, ...this.ownerWhere(userId) },
          orderBy: { severity: 'desc' },
        });
        if (rows.length > 0) return rows;
      } catch {}
    }
    return this.filterFileForUser(this.fileStore(), userId).filter(f => f.scanId === scanId);
  }

  async findOne(id: string, userId: string) {
    if (this.prisma.connected) {
      try {
        const finding = await this.prisma.finding.findFirst({
          where: { id, ...this.ownerWhere(userId) },
        });
        if (finding) return finding;
      } catch (error) {
        this.logger.error(`Failed to fetch finding ${id}:`, error);
      }
    }
    const finding = this.filterFileForUser(this.fileStore(), userId).find(f => f.id === id);
    if (!finding) throw new NotFoundException(`Finding not found: ${id}`);
    return finding;
  }

  async updateStatus(id: string, status: string, userId: string) {
    await this.findOne(id, userId);
    if (this.prisma.connected) {
      try {
        const finding = await this.prisma.finding.update({
          where: { id },
          data: { status: status as any },
        });
        return finding;
      } catch (error) {}
    }
    const store = this.fileStore();
    const item = this.filterFileForUser(store, userId).find(f => f.id === id);
    if (item) {
      item.status = status as any;
      item.updatedAt = new Date().toISOString();
      this.writeFile(store);
      return item;
    }
    return { id, status };
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    if (this.prisma.connected) {
      try {
        await this.prisma.finding.delete({ where: { id } });
      } catch (error) {}
    }
    const store = this.fileStore();
    const filtered = store.filter(f => !(f.id === id && this.filterFileForUser([f], userId).length > 0));
    if (filtered.length !== store.length) {
      this.writeFile(filtered);
    }
    return { success: true, id };
  }

  async removeBulk(ids: string[], userId: string) {
    const uniqueIds = Array.from(new Set((ids || []).filter(Boolean)));
    if (uniqueIds.length === 0) return { success: true, count: 0 };

    let deletedCount = 0;
    if (this.prisma.connected) {
      try {
        const result = await this.prisma.finding.deleteMany({
          where: { id: { in: uniqueIds }, ...this.ownerWhere(userId) },
        });
        deletedCount = result.count;
      } catch (error: any) {
        this.logger.warn(`DB finding bulk delete failed (${error?.message ?? error})`);
        throw error;
      }
    }

    const store = this.fileStore();
    const ownedIds = new Set(
      this.filterFileForUser(store, userId)
        .filter(f => uniqueIds.includes(f.id))
        .map(f => f.id),
    );
    const filtered = store.filter(f => !ownedIds.has(f.id));
    if (filtered.length !== store.length) this.writeFile(filtered);
    return { success: true, count: this.prisma.connected ? deletedCount : ownedIds.size };
  }

  async removeByTarget(target: string, userId: string) {
    if (this.prisma.connected) {
      try {
        await this.prisma.finding.deleteMany({
          where: {
            target: { contains: target, mode: 'insensitive' },
            ...this.ownerWhere(userId),
          },
        });
      } catch (error: any) {
        this.logger.warn(`DB finding target delete failed (${error?.message ?? error})`);
        throw error;
      }
    }
    const store = this.fileStore();
    const ownedIds = new Set(
      this.filterFileForUser(store, userId)
        .filter(f => f.target.toLowerCase().includes(target.toLowerCase()))
        .map(f => f.id),
    );
    const filtered = store.filter(f => !ownedIds.has(f.id));
    if (filtered.length !== store.length) this.writeFile(filtered);
    return { success: true, target };
  }

  async removeByScan(scanId: string, userId: string) {
    if (this.prisma.connected) {
      try {
        await this.prisma.finding.deleteMany({
          where: { scanId, ...this.ownerWhere(userId) },
        });
      } catch (error: any) {
        this.logger.warn(`DB finding scan delete failed (${error?.message ?? error})`);
        throw error;
      }
    }
    const store = this.fileStore();
    const ownedIds = new Set(
      this.filterFileForUser(store, userId)
        .filter(f => f.scanId === scanId)
        .map(f => f.id),
    );
    const filtered = store.filter(f => !ownedIds.has(f.id));
    if (filtered.length !== store.length) this.writeFile(filtered);
    return { success: true, scanId };
  }

  async removeAll(userId: string) {
    if (this.prisma.connected) {
      try {
        await this.prisma.finding.deleteMany({
          where: this.ownerWhere(userId),
        });
      } catch (error: any) {
        this.logger.warn(`DB finding delete-all failed (${error?.message ?? error})`);
        throw error;
      }
    }
    const store = this.fileStore();
    const ownedIds = new Set(this.filterFileForUser(store, userId).map(f => f.id));
    const filtered = store.filter(f => !ownedIds.has(f.id));
    if (filtered.length !== store.length) this.writeFile(filtered);
    return { success: true };
  }

  async getStats(userId?: string) {
    if (this.prisma.connected) {
      try {
        if (!userId) {
          return {
            total: 0,
            bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
            bySource: {},
            byCategory: {},
          };
        }
        const where: any = {
          OR: [
            { scan: { userId } },
            { workspace: { userId } },
          ],
        };
        const total = await this.prisma.finding.count({ where });
        const critical = await this.prisma.finding.count({ where: { ...where, severity: 'CRITICAL' } });
        const high = await this.prisma.finding.count({ where: { ...where, severity: 'HIGH' } });
        const medium = await this.prisma.finding.count({ where: { ...where, severity: 'MEDIUM' } });
        const low = await this.prisma.finding.count({ where: { ...where, severity: 'LOW' } });
        const info = await this.prisma.finding.count({ where: { ...where, severity: 'INFO' } });

        return {
          total,
          bySeverity: { critical, high, medium, low, info },
          bySource: {},
          byCategory: {},
        };
      } catch (error) {}
    }

    if (!userId) {
      return {
        total: 0,
        bySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        bySource: {},
        byCategory: {},
      };
    }

    const store = this.filterFileForUser(this.fileStore(), userId);
    const critical = store.filter(f => f.severity === 'CRITICAL').length;
    const high = store.filter(f => f.severity === 'HIGH').length;
    const medium = store.filter(f => f.severity === 'MEDIUM').length;
    const low = store.filter(f => f.severity === 'LOW').length;
    const info = store.filter(f => f.severity === 'INFO').length;

    return {
      total: store.length,
      bySeverity: { critical, high, medium, low, info },
      bySource: {},
      byCategory: {},
    };
  }

  async create(data: {
    scanId: string;
    workspaceId: string;
    title: string;
    description: string;
    severity: string;
    source: string;
    target: string;
    url?: string;
    parameter?: string;
    category?: string;
    cvss?: number;
    cwe?: string;
    owasp?: string;
  }) {
    if (this.prisma.connected) {
      try {
        const finding = await this.prisma.finding.create({
          data: {
            ...data,
            severity: data.severity as any,
            status: 'NEW',
          },
        });
        return finding;
      } catch (error) {}
    }

    const nowIso = new Date().toISOString();
    const record: FindingRecord = {
      id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      scanId: data.scanId,
      workspaceId: data.workspaceId,
      title: data.title,
      description: data.description,
      severity: (data.severity as any) || 'MEDIUM',
      status: 'NEW',
      source: data.source || 'scanner',
      category: data.category || 'Vulnerability',
      target: data.target,
      url: data.url,
      parameter: data.parameter,
      cvss: data.cvss,
      cwe: data.cwe,
      owasp: data.owasp,
      createdAt: nowIso,
      firstSeen: nowIso,
      updatedAt: nowIso,
    };
    const store = this.fileStore();
    store.unshift(record);
    this.writeFile(store);
    return record;
  }
}
