import { Controller, Get, Post, Delete, Param, Req, UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../auth/jwt.guard';
import { NotificationsService } from './notifications.service';

interface AuthRequest { user?: { userId?: string; id?: string } }

@Controller('notifications')
@UseGuards(OptionalJwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@Req() req: AuthRequest) {
    return this.notificationsService.findAll(req.user?.userId ?? req.user?.id ?? '');
  }

  @Post(':id/read')
  markRead(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.notificationsService.markRead(id, req.user?.userId ?? req.user?.id ?? '');
  }

  @Post('read-all')
  markAllRead(@Req() req: AuthRequest) {
    return this.notificationsService.markAllRead(req.user?.userId ?? req.user?.id ?? '');
  }

  @Delete(':id')
  remove(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.notificationsService.remove(id, req.user?.userId ?? req.user?.id ?? '');
  }
}
