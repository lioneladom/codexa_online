import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ExamsModule } from './exams/exams.module';
import { QuestionBankModule } from './question-bank/question-bank.module';
import { ExecutionModule } from './execution/execution.module';
import { AstModule } from './ast/ast.module';
import { ReportsModule } from './reports/reports.module';
import { MonitoringModule } from './monitoring/monitoring.module';

@Module({
  imports: [PrismaModule, AuthModule, ExamsModule, QuestionBankModule, ExecutionModule, AstModule, ReportsModule, MonitoringModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
