import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../auth/jwt.guard';
import { AnalyticsService } from './analytics.service';

interface AuthRequest { user?: { userId?: string; id?: string } }

@Controller('analytics')
@UseGuards(OptionalJwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  getOverview(@Req() req: AuthRequest) {
    return this.analyticsService.getOverview(req.user?.userId ?? req.user?.id ?? '');
  }
}
