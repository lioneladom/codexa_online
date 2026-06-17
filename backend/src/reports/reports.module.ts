import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ExamsModule } from '../exams/exams.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ExamsModule, PrismaModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
