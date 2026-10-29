import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { SharedExpensesService } from './shared-expenses.service';
import { CreateSharedExpenseDto } from './dto/create-shared-expense.dto';
import { UpdateSharedExpenseDto } from './dto/update-shared-expense.dto';
import { SettleDto } from './dto/settle.dto';

@Controller('shared-expenses')
@UseGuards(JwtGuard)
export class SharedExpensesController {
  constructor(private readonly service: SharedExpensesService) {}

  @Get()
  findAll(@Request() req, @Query('groupId') groupId?: string) {
    return this.service.findAll(req.user.id, groupId);
  }

  @Post()
  create(@Request() req, @Body() dto: CreateSharedExpenseDto) {
    return this.service.create(req.user.id, dto);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateSharedExpenseDto) {
    return this.service.update(req.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.service.remove(req.user.id, id);
  }

  @Post('settle')
  settle(@Request() req, @Body() dto: SettleDto) {
    return this.service.settle(req.user.id, dto);
  }

  @Delete('settle/:id')
  removeSettlement(@Request() req, @Param('id') id: string) {
    return this.service.removeSettlement(req.user.id, id);
  }
}
