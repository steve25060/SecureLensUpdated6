import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ReportsService } from './reports.service';

interface AuthRequest { user?: { userId?: string; id?: string } }

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private userId(req: AuthRequest): string {
    return req.user?.id || req.user?.userId || '';
  }

  @Get()
  findAll(@Req() req: AuthRequest) {
    return this.reportsService.findAll(this.userId(req));
  }

  @Get('stats')
  getStats(@Req() req: AuthRequest) {
    return this.reportsService.getStats(this.userId(req));
  }

  @Post()
  create(@Req() req: AuthRequest, @Body() body: any) {
    return this.reportsService.create(this.userId(req), body ?? {});
  }

  @Delete('bulk')
  removeBulk(@Req() req: AuthRequest, @Body() body: { ids: string[] }) {
    return this.reportsService.removeBulk(body?.ids || [], this.userId(req));
  }

  @Delete('all')
  removeAll(@Req() req: AuthRequest) {
    return this.reportsService.removeAll(this.userId(req));
  }

  @Get(':id')
  findOne(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.reportsService.findOne(id, this.userId(req));
  }

  @Delete(':id')
  remove(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.reportsService.remove(id, this.userId(req));
  }
}
