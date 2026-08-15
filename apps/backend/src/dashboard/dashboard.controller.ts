import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../auth/jwt.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @UseGuards(OptionalJwtAuthGuard)
  async getOverview(@Request() req: any) {
    return this.dashboardService.getOverview(req.user);
  }
}
