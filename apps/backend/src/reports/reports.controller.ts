import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../auth/jwt.guard';
import { ReportsService } from './reports.service';

interface AuthRequest { user?: { userId?: string; id?: string } }

@Controller('reports')
@UseGuards(OptionalJwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  findAll(@Req() req: AuthRequest) {
    const userId = req.user?.id || req.user?.userId || 'demo-user-1';
    return this.reportsService.findAll(userId);
  }

  @Get('stats')
  getStats(@Req() req: AuthRequest) {
    const userId = req.user?.id || req.user?.userId || 'demo-user-1';
    return this.reportsService.getStats(userId);
  }

  @Post()
  create(@Req() req: AuthRequest, @Body() body: any) {
    const userId = req.user?.id || req.user?.userId || 'demo-user-1';
    return this.reportsService.create(userId, body ?? {});
  }

  @Delete('bulk')
  removeBulk(@Body() body: { ids: string[] }) {
    return this.reportsService.removeBulk(body?.ids || []);
  }

  @Delete('all')
  removeAll(@Req() req: AuthRequest) {
    const userId = req.user?.id || req.user?.userId || 'demo-user-1';
    return this.reportsService.removeAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reportsService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reportsService.remove(id);
  }
}
