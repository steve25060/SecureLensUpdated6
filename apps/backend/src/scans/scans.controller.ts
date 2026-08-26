import { Controller, Get, Post, Body, Param, UseGuards, Req, Delete } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../auth/jwt.guard';
import { ScansService } from './scans.service';

interface AuthRequest { user?: { id?: string; userId?: string } }

/**
 * Scan endpoints. Engine listing is PUBLIC (the live-scan page loads engines
 * before the user is fully authenticated); create/start require valid user or demo session.
 *
 * Engine names returned here are the friendly ones ("Port Scanner", etc.)
 * defined in engines/catalog.ts.
 */
@Controller('scans')
export class ScansController {
  constructor(private readonly scansService: ScansService) {}

  // ===== PUBLIC (no auth) =====

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

  @Get(':id/status')
  getScanStatus(@Param('id') id: string) {
    return this.scansService.getScanStatus(id);
  }

  @Get(':id/results')
  getScanResults(@Param('id') id: string) {
    return this.scansService.getScanResults(id);
  }

  @Get(':id/logs')
  getLogs(@Param('id') id: string) {
    return this.scansService.getLogs(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.scansService.findOne(id);
  }

  // ===== AUTHENTICATED & GUEST LIVE SCAN =====

  @Post('create')
  @UseGuards(OptionalJwtAuthGuard)
  create(@Req() req: AuthRequest, @Body() body: any) {
    const userId = req.user?.id || req.user?.userId || '';
    return this.scansService.create(userId, body);
  }

  @Post(':id/start')
  @UseGuards(OptionalJwtAuthGuard)
  startScan(@Param('id') id: string) {
    return this.scansService.startScan(id);
  }

  @Delete(':id/cancel')
  @UseGuards(OptionalJwtAuthGuard)
  cancelScan(@Param('id') id: string) {
    return this.scansService.cancelScan(id);
  }

  @Delete('bulk')
  @UseGuards(OptionalJwtAuthGuard)
  removeBulk(@Body() body: { ids: string[] }) {
    return this.scansService.removeBulk(body?.ids || []);
  }

  @Delete('target/:target')
  @UseGuards(OptionalJwtAuthGuard)
  removeByTarget(@Param('target') target: string) {
    return this.scansService.removeByTarget(decodeURIComponent(target));
  }

  @Delete('all')
  @UseGuards(OptionalJwtAuthGuard)
  removeAll(@Req() req: AuthRequest) {
    const userId = req.user?.id || req.user?.userId || '';
    return this.scansService.removeAll(userId);
  }

  @Delete(':id')
  @UseGuards(OptionalJwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.scansService.remove(id);
  }

  @Get('workspace/:workspaceId')
  @UseGuards(OptionalJwtAuthGuard)
  getWorkspaceScans(@Param('workspaceId') workspaceId: string) {
    return this.scansService.getWorkspaceScans(workspaceId);
  }

  @Get('stats')
  @UseGuards(OptionalJwtAuthGuard)
  getStats(@Req() req: AuthRequest) {
    const userId = req.user?.id || req.user?.userId || '';
    return this.scansService.getStats(userId);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findAll(@Req() req: AuthRequest) {
    const userId = req.user?.id || req.user?.userId || '';
    return this.scansService.findAll(userId);
  }
}
