import { Module } from '@nestjs/common';
import { MonitoringGateway } from './monitoring.gateway';

@Module({
  providers: [MonitoringGateway],
  exports: [MonitoringGateway],
})
export class MonitoringModule {}
