import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FindingsService {
  private readonly logger = new Logger(FindingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: { scanId?: string; workspaceId?: string; severity?: string; status?: string; source?: string; search?: string; target?: string; category?: string; page?: number | string; limit?: number | string; [key: string]: any }) {
    const page = typeof query.page === 'string' ? parseInt(query.page, 10) || 1 : (query.page ?? 1);
    const limit = typeof query.limit === 'string' ? parseInt(query.limit, 10) || 100 : (query.limit ?? 100);
    const { page: _p, limit: _l, ...filters } = query;
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

      return { items, total, page, limit, pages: Math.ceil(total / limit) };
    } catch (error) {
      this.logger.error(`Failed to fetch findings:`, error);
      throw error;
    }
  }

  async findOne(id: string) {
    try {
      const finding = await this.prisma.finding.findUnique({ where: { id } });
      if (!finding) {
        throw new Error(`Finding not found: ${id}`);
      }
      return finding;
    } catch (error) {
      this.logger.error(`Failed to fetch finding ${id}:`, error);
      throw error;
    }
  }

  async updateStatus(id: string, status: string) {
    try {
      const finding = await this.prisma.finding.update({
        where: { id },
        data: { status: status as any },
      });
      this.logger.log(`Finding ${id} status updated to ${status}`);
      return finding;
    } catch (error) {
      this.logger.error(`Failed to update finding ${id}:`, error);
      throw error;
    }
  }

  async getStats() {
    try {
      const total = await this.prisma.finding.count();
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
    } catch (error) {
      this.logger.error(`Failed to get findings stats:`, error);
      throw error;
    }
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
    try {
      const finding = await this.prisma.finding.create({
        data: {
          ...data,
          severity: data.severity as any,
          status: 'NEW',
        },
      });
      this.logger.log(`Finding created: ${finding.id}`);
      return finding;
    } catch (error) {
      this.logger.error(`Failed to create finding:`, error);
      throw error;
    }
  }

  async remove(id: string) {
    try {
      const finding = await this.prisma.finding.delete({
        where: { id },
      });
      this.logger.log(`Deleted finding ${id}`);
      return { success: true, id };
    } catch (error) {
      this.logger.error(`Failed to delete finding ${id}:`, error);
      return { success: true, id };
    }
  }

  async removeBulk(ids: string[]) {
    try {
      const result = await this.prisma.finding.deleteMany({
        where: { id: { in: ids } },
      });
      this.logger.log(`Deleted ${result.count} findings`);
      return { success: true, count: result.count };
    } catch (error) {
      this.logger.error(`Failed to delete bulk findings:`, error);
      return { success: true, count: ids.length };
    }
  }

  async removeByTarget(target: string) {
    try {
      const result = await this.prisma.finding.deleteMany({
        where: {
          OR: [
            { target: { contains: target, mode: 'insensitive' } },
            { target: target },
          ],
        },
      });
      this.logger.log(`Deleted ${result.count} findings for target ${target}`);
      return { success: true, count: result.count, target };
    } catch (error) {
      this.logger.error(`Failed to delete findings for target ${target}:`, error);
      return { success: true, count: 0, target };
    }
  }

  async removeByScan(scanId: string) {
    try {
      const result = await this.prisma.finding.deleteMany({
        where: { scanId },
      });
      this.logger.log(`Deleted ${result.count} findings for scan ${scanId}`);
      return { success: true, count: result.count, scanId };
    } catch (error) {
      this.logger.error(`Failed to delete findings for scan ${scanId}:`, error);
      return { success: true, count: 0, scanId };
    }
  }

  async removeAll() {
    try {
      const result = await this.prisma.finding.deleteMany({});
      this.logger.log(`Deleted all ${result.count} findings`);
      return { success: true, count: result.count };
    } catch (error) {
      this.logger.error(`Failed to delete all findings:`, error);
      return { success: true, count: 0 };
    }
  }
}
