import { Controller, Get, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../auth/jwt.guard';
import { FindingsService } from './findings.service';

@Controller('findings')
@UseGuards(OptionalJwtAuthGuard)
export class FindingsController {
  constructor(private readonly findingsService: FindingsService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.findingsService.findAll(query);
  }

  @Get('stats')
  getStats() {
    return this.findingsService.getStats();
  }

  @Delete('bulk')
  removeBulk(@Body() body: { ids: string[] }) {
    return this.findingsService.removeBulk(body?.ids || []);
  }

  @Delete('target/:target')
  removeByTarget(@Param('target') target: string) {
    return this.findingsService.removeByTarget(decodeURIComponent(target));
  }

  @Delete('scan/:scanId')
  removeByScan(@Param('scanId') scanId: string) {
    return this.findingsService.removeByScan(scanId);
  }

  @Delete('all')
  removeAll() {
    return this.findingsService.removeAll();
  }

  @Get('scan/:scanId')
  findByScan(@Param('scanId') scanId: string) {
    return this.findingsService.findAll({ scanId, limit: 100 });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.findingsService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.findingsService.updateStatus(id, body.status);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.findingsService.remove(id);
  }
}
