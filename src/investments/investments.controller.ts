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
import { InvestmentsService } from './investments.service';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { CreateValuationDto } from './dto/create-valuation.dto';
import { CreateContributionDto } from './dto/create-contribution.dto';

@Controller('investments')
@UseGuards(JwtGuard)
export class InvestmentsController {
  constructor(private readonly service: InvestmentsService) {}

  @Get()
  findAll(@Request() req) {
    return this.service.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.service.findOne(req.user.id, id);
  }

  @Post()
  create(@Request() req, @Body() dto: CreateInvestmentDto) {
    return this.service.create(req.user.id, dto);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateInvestmentDto) {
    return this.service.update(req.user.id, id, dto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.service.remove(req.user.id, id);
  }

  @Post(':id/valuations')
  addValuation(@Request() req, @Param('id') id: string, @Body() dto: CreateValuationDto) {
    return this.service.addValuation(req.user.id, id, dto);
  }

  @Delete(':id/valuations/:valuationId')
  removeValuation(
    @Request() req,
    @Param('id') id: string,
    @Param('valuationId') valuationId: string,
  ) {
    return this.service.removeValuation(req.user.id, id, valuationId);
  }

  @Post(':id/contributions')
  addContribution(@Request() req, @Param('id') id: string, @Body() dto: CreateContributionDto) {
    return this.service.addContribution(req.user.id, id, dto);
  }

  @Delete(':id/contributions/:contributionId')
  removeContribution(
    @Request() req,
    @Param('id') id: string,
    @Param('contributionId') contributionId: string,
  ) {
    return this.service.removeContribution(req.user.id, id, contributionId);
  }
}
