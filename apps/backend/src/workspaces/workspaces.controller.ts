import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';

interface AuthRequest { user?: { id?: string; userId?: string; username?: string } }

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  private userId(req: AuthRequest): string {
    return req.user?.id || req.user?.userId || '';
  }

  @Get()
  findAll(@Req() req: AuthRequest) {
    return this.workspacesService.findAll(this.userId(req));
  }

  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateWorkspaceDto) {
    return this.workspacesService.create(this.userId(req), dto);
  }

  @Get(':id')
  findOne(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.workspacesService.findOne(id, this.userId(req));
  }

  @Patch(':id')
  update(@Req() req: AuthRequest, @Param('id') id: string, @Body() dto: Partial<CreateWorkspaceDto>) {
    return this.workspacesService.update(id, this.userId(req), dto);
  }

  @Delete(':id')
  remove(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.workspacesService.remove(id, this.userId(req));
  }
}
