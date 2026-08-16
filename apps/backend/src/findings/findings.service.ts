import { Injectable, Logger } from '@nestjs/common';
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

  async findAll(query: { scanId?: string; workspaceId?: string; severity?: string; status?: string; source?: string; search?: string; target?: string; category?: string; page?: number | string; limit?: number | string; [key: string]: any }) {
    const page = typeof query.page === 'string' ? parseInt(query.page, 10) || 1 : (query.page ?? 1);
    const limit = typeof query.limit === 'string' ? parseInt(query.limit, 10) || 100 : (query.limit ?? 100);
    const { page: _p, limit: _l, ...filters } = query;

    if (this.prisma.connected) {
      try {
        const where: any = {};
        if (query.scanId) where.scanId = query.scanId;
        if (filters.workspaceId) where.workspaceId = filters.workspaceId;
        if (filters.severity) where.severity = filters.severity;
        if (filters.status) where.status = filters.status;
        if (filters.source) where.source = { contains: filters.source, mode: 'insensitive' };
        if (filters.target) where.target = { contains: filters.target, mode: 'insensitive' };
        if (filters.category) where.category = { contains: filters.category, mode: 'insensitive' };

        if (filters.search) {
          where.OR = [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { target: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
            { source: { contains: filters.search, mode: 'insensitive' } },
            { category: { contains: filters.search, mode: 'insensitive' } },
            { cwe: { contains: filters.search, mode: 'insensitive' } },
          ];
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

        if (items.length > 0 || total > 0) {
          return { items, total, page, limit, pages: Math.ceil(total / limit) };
        }
      } catch (error: any) {
        this.logger.warn(`Failed to fetch DB findings (${error?.message}) → file fallback`);
      }
    }

    // File store fallback
    let fileFindings = this.fileStore();
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
    return { items, total, page, limit, pages: Math.ceil(total / limit) || 1 };
  }

  async findByScanId(scanId: string) {
    if (this.prisma.connected) {
      try {
        const rows = await this.prisma.finding.findMany({
          where: { scanId },
          orderBy: { severity: 'desc' },
        });
        if (rows.length > 0) return rows;
      } catch {}
    }
    return this.fileStore().filter(f => f.scanId === scanId);
  }

  async findOne(id: string) {
    if (this.prisma.connected) {
      try {
        const finding = await this.prisma.finding.findUnique({ where: { id } });
        if (finding) return finding;
      } catch (error) {
        this.logger.error(`Failed to fetch finding ${id}:`, error);
      }
    }
    const finding = this.fileStore().find(f => f.id === id);
    if (!finding) throw new Error(`Finding not found: ${id}`);
    return finding;
  }

  async updateStatus(id: string, status: string) {
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
    const item = store.find(f => f.id === id);
    if (item) {
      item.status = status as any;
      item.updatedAt = new Date().toISOString();
      this.writeFile(store);
      return item;
    }
    return { id, status };
  }

  async remove(id: string) {
    if (this.prisma.connected) {
      try {
        await this.prisma.finding.delete({ where: { id } });
      } catch (error) {}
    }
    const store = this.fileStore();
    const filtered = store.filter(f => f.id !== id);
    if (filtered.length !== store.length) {
      this.writeFile(filtered);
    }
    return { success: true, id };
  }

  async removeBulk(ids: string[]) {
    if (this.prisma.connected) {
      try {
        await this.prisma.finding.deleteMany({ where: { id: { in: ids } } });
      } catch (error) {}
    }
    const store = this.fileStore();
    const idSet = new Set(ids);
    const filtered = store.filter(f => !idSet.has(f.id));
    this.writeFile(filtered);
    return { success: true, count: ids.length };
  }

  async removeByTarget(target: string) {
    if (this.prisma.connected) {
      try {
        await this.prisma.finding.deleteMany({
          where: { target: { contains: target, mode: 'insensitive' } },
        });
      } catch (error) {}
    }
    const store = this.fileStore();
    const filtered = store.filter(f => !f.target.toLowerCase().includes(target.toLowerCase()));
    this.writeFile(filtered);
    return { success: true, target };
  }

  async removeByScan(scanId: string) {
    if (this.prisma.connected) {
      try {
        await this.prisma.finding.deleteMany({ where: { scanId } });
      } catch (error) {}
    }
    const store = this.fileStore();
    const filtered = store.filter(f => f.scanId !== scanId);
    this.writeFile(filtered);
    return { success: true, scanId };
  }

  async removeAll() {
    if (this.prisma.connected) {
      try {
        await this.prisma.finding.deleteMany({});
      } catch (error) {}
    }
    this.writeFile([]);
    return { success: true };
  }

  async getStats() {
    if (this.prisma.connected) {
      try {
        const total = await this.prisma.finding.count();
        if (total > 0) {
          const critical = await this.prisma.finding.count({ where: { severity: 'CRITICAL' } });
          const high = await this.prisma.finding.count({ where: { severity: 'HIGH' } });
          const medium = await this.prisma.finding.count({ where: { severity: 'MEDIUM' } });
          const low = await this.prisma.finding.count({ where: { severity: 'LOW' } });
          const info = await this.prisma.finding.count({ where: { severity: 'INFO' } });

          return {
            total,
            bySeverity: { critical, high, medium, low, info },
            bySource: {},
            byCategory: {},
          };
        }
      } catch (error) {}
    }

    const store = this.fileStore();
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
