import { Controller, Get, Post, Body, Param, UseGuards, Req, Delete } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ScansService } from './scans.service';

interface AuthRequest { user?: { id?: string; userId?: string } }

@Controller('scans')
export class ScansController {
  constructor(private readonly scansService: ScansService) {}

  private userId(req: AuthRequest): string {
    return req.user?.id || req.user?.userId || '';
  }

  // Public engine metadata.
  @Get('engines/mode/:mode')
  getEnginesForMode(@Param('mode') mode: string) {
    return this.scansService.getEnginesForMode(mode);
  }

  @Get('engines/available')
  getAvailableEngines() {
    return this.scansService.getAvailableEngines();
  }

  @Get('constants')
  getConstants() {
    return this.scansService.getConstants();
  }

  // Put static authenticated routes before :id routes.
  @Get('stats')
  @UseGuards(JwtAuthGuard)
  getStats(@Req() req: AuthRequest) {
    return this.scansService.getStats(this.userId(req));
  }

  @Get('workspace/:workspaceId')
  @UseGuards(JwtAuthGuard)
  getWorkspaceScans(@Req() req: AuthRequest, @Param('workspaceId') workspaceId: string) {
    return this.scansService.getWorkspaceScans(workspaceId, this.userId(req));
  }

  @Get(':id/status')
  @UseGuards(JwtAuthGuard)
  getScanStatus(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.scansService.getScanStatus(id, this.userId(req));
  }

  @Get(':id/results')
  @UseGuards(JwtAuthGuard)
  getScanResults(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.scansService.getScanResults(id, this.userId(req));
  }

  @Get(':id/logs')
  @UseGuards(JwtAuthGuard)
  getLogs(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.scansService.getLogs(id, this.userId(req));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.scansService.findOne(id, this.userId(req));
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Req() req: AuthRequest) {
    return this.scansService.findAll(this.userId(req));
  }

  @Post('create')
  @UseGuards(JwtAuthGuard)
  create(@Req() req: AuthRequest, @Body() body: any) {
    return this.scansService.create(this.userId(req), body);
  }

  @Post(':id/start')
  @UseGuards(JwtAuthGuard)
  startScan(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.scansService.startScan(id, this.userId(req));
  }

  @Delete('bulk')
  @UseGuards(JwtAuthGuard)
  removeBulk(@Req() req: AuthRequest, @Body() body: { ids: string[] }) {
    return this.scansService.removeBulk(body?.ids || [], this.userId(req));
  }

  @Delete('target/:target')
  @UseGuards(JwtAuthGuard)
  removeByTarget(@Req() req: AuthRequest, @Param('target') target: string) {
    return this.scansService.removeByTarget(decodeURIComponent(target), this.userId(req));
  }

  @Delete('all')
  @UseGuards(JwtAuthGuard)
  removeAll(@Req() req: AuthRequest) {
    return this.scansService.removeAll(this.userId(req));
  }

  @Delete(':id/cancel')
  @UseGuards(JwtAuthGuard)
  cancelScan(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.scansService.cancelScan(id, this.userId(req));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.scansService.remove(id, this.userId(req));
  }
}
