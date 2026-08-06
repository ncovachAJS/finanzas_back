import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { SavingsGoalsService } from './savings-goals.service';
import { CreateSavingsGoalDto } from './dto/create-savings-goal.dto';
import { UpdateSavingsGoalDto } from './dto/update-savings-goal.dto';

@Controller('savings-goals')
@UseGuards(JwtGuard)
export class SavingsGoalsController {
  constructor(private readonly service: SavingsGoalsService) {}

  @Get()
  findAll(@Request() req) {
    return this.service.findAll(req.user.id);
  }

  @Post()
  create(@Request() req, @Body() dto: CreateSavingsGoalDto) {
    return this.service.create(req.user.id, dto);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateSavingsGoalDto) {
    return this.service.update(req.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.service.remove(req.user.id, id);
  }
}
