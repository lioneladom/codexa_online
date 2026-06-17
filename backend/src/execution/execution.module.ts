import { Module } from '@nestjs/common';
import { ExecutionService } from './execution.service';
import { ExecutionController } from './execution.controller';
import { ExecutionGateway } from './execution.gateway';

@Module({
  controllers: [ExecutionController],
  providers: [ExecutionService, ExecutionGateway],
  exports: [ExecutionService],
})
export class ExecutionModule {}
