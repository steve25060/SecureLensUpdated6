import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../auth/jwt.guard';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';

interface AuthRequest { user?: { id?: string; userId?: string; username?: string } }

@Controller('workspaces')
@UseGuards(OptionalJwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  findAll(@Req() req: AuthRequest) {
    const userId = req.user?.id || req.user?.userId || 'demo-user-1';
    return this.workspacesService.findAll(userId);
  }

  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateWorkspaceDto) {
    const userId = req.user?.id || req.user?.userId || 'demo-user-1';
    return this.workspacesService.create(userId, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workspacesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateWorkspaceDto>) {
    return this.workspacesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.workspacesService.remove(id);
  }
}
