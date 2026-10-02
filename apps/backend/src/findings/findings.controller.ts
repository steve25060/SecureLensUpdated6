import { Controller, Get, Patch, Delete, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { FindingsService } from './findings.service';

interface AuthRequest { user?: { id?: string; userId?: string } }

@Controller('findings')
@UseGuards(JwtAuthGuard)
export class FindingsController {
  constructor(private readonly findingsService: FindingsService) {}

  private userId(req: AuthRequest): string {
    return req.user?.id || req.user?.userId || '';
  }

  @Get()
  findAll(@Req() req: AuthRequest, @Query() query: any) {
    return this.findingsService.findAll(this.userId(req), query);
  }

  @Get('stats')
  getStats(@Req() req: AuthRequest) {
    return this.findingsService.getStats(this.userId(req));
  }

  @Get('scan/:scanId')
  findByScan(@Req() req: AuthRequest, @Param('scanId') scanId: string) {
    return this.findingsService.findAll(this.userId(req), { scanId, limit: 100 });
  }

  @Get(':id')
  findOne(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.findingsService.findOne(id, this.userId(req));
  }

  @Patch(':id/status')
  updateStatus(@Req() req: AuthRequest, @Param('id') id: string, @Body() body: { status: string }) {
    return this.findingsService.updateStatus(id, body.status, this.userId(req));
  }

  @Delete('bulk')
  removeBulk(@Req() req: AuthRequest, @Body() body: { ids: string[] }) {
    return this.findingsService.removeBulk(body?.ids || [], this.userId(req));
  }

  @Delete('target/:target')
  removeByTarget(@Req() req: AuthRequest, @Param('target') target: string) {
    return this.findingsService.removeByTarget(decodeURIComponent(target), this.userId(req));
  }

  @Delete('scan/:scanId')
  removeByScan(@Req() req: AuthRequest, @Param('scanId') scanId: string) {
    return this.findingsService.removeByScan(scanId, this.userId(req));
  }

  @Delete('all')
  removeAll(@Req() req: AuthRequest) {
    return this.findingsService.removeAll(this.userId(req));
  }

  @Delete(':id')
  remove(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.findingsService.remove(id, this.userId(req));
  }
}
