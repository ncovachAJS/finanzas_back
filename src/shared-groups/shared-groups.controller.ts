import { Body, Controller, Delete, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { SharedGroupsService } from './shared-groups.service';
import { CreateSharedGroupDto } from './dto/create-shared-group.dto';

@Controller('shared-groups')
@UseGuards(JwtGuard)
export class SharedGroupsController {
  constructor(private readonly service: SharedGroupsService) {}

  @Get()
  findAll(@Request() req) {
    return this.service.findAll(req.user.id);
  }

  @Post()
  create(@Request() req, @Body() dto: CreateSharedGroupDto) {
    return this.service.create(req.user.id, dto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.service.remove(req.user.id, id);
  }
}
