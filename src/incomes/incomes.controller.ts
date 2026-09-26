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
import { IncomesService } from './incomes.service';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { RepeatDto } from '../common/repeat.dto';

@UseGuards(JwtGuard)
@Controller('incomes')
export class IncomesController {
  constructor(private readonly incomesService: IncomesService) {}

  @Get()
  findAll(
    @Request() req,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.incomesService.findAll(
      req.user.id,
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined,
    );
  }

  @Post()
  create(@Request() req, @Body() dto: CreateIncomeDto) {
    return this.incomesService.create(req.user.id, dto);
  }

  @Put(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateIncomeDto,
  ) {
    return this.incomesService.update(req.user.id, id, dto);
  }

  /// ?scope=following borra también las repeticiones de los meses siguientes
  @Delete(':id')
  remove(@Request() req, @Param('id') id: string, @Query('scope') scope?: string) {
    return this.incomesService.remove(req.user.id, id, scope);
  }

  /// Amplía la serie del ingreso hasta el mes indicado
  @Post(':id/repeat')
  repeat(@Request() req, @Param('id') id: string, @Body() dto: RepeatDto) {
    return this.incomesService.repeat(req.user.id, id, dto);
  }

  /// Propaga los recurrentes del mes anterior al mes/año indicado.
  @Post('propagate')
  propagate(
    @Request() req,
    @Body() body: { month: number; year: number },
  ) {
    return this.incomesService.propagate(req.user.id, body.month, body.year);
  }
}
