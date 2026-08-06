import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { DashboardService } from './dashboard.service';

@UseGuards(JwtGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('year/:year')
  getYear(@Request() req, @Param('year') year: string) {
    return this.dashboardService.getYearStats(req.user.id, parseInt(year));
  }

  @Get('month')
  getMonth(
    @Request() req,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.dashboardService.getMonthStats(
      req.user.id,
      parseInt(month),
      parseInt(year),
    );
  }

  @Get('history')
  getHistory(
    @Request() req,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.dashboardService.getHistory(
      req.user.id,
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined,
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );
  }
}
