import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { RepeatDto } from '../common/repeat.dto';

@UseGuards(JwtGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  findAll(
    @Request() req,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.expensesService.findAll(
      req.user.id,
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined,
    );
  }

  @Post()
  create(@Request() req, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(req.user.id, dto);
  }

  @Put(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(req.user.id, id, dto);
  }

  /// ?scope=following borra también las repeticiones de los meses siguientes
  @Delete(':id')
  remove(@Request() req, @Param('id') id: string, @Query('scope') scope?: string) {
    return this.expensesService.remove(req.user.id, id, scope);
  }

  /// Amplía la serie del gasto hasta el mes indicado
  @Post(':id/repeat')
  repeat(@Request() req, @Param('id') id: string, @Body() dto: RepeatDto) {
    return this.expensesService.repeat(req.user.id, id, dto);
  }

}
