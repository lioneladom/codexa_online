import { Controller, Get, Param, Res, UseGuards, Request } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get(':examId/excel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  async exportExcel(
    @Param('examId') examId: string,
    @Res() res: Response,
  ) {
    const report = await this.reportsService.buildExamReport(examId);
    if (!report) {
      return res.status(404).send({ message: 'Exam not found' });
    }
    await this.reportsService.exportToExcel(report, res);
  }

  @Get(':examId/html')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('LECTURER', 'ADMIN')
  async exportHtml(
    @Param('examId') examId: string,
    @Res() res: Response,
  ) {
    const report = await this.reportsService.buildExamReport(examId);
    if (!report) {
      return res.status(404).send({ message: 'Exam not found' });
    }
    await this.reportsService.exportToHtml(report, res);
  }
}
