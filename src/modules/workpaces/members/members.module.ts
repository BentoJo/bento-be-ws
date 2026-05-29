import { Module } from '@nestjs/common';
import { AuthzModule } from '../../authz/authz.module';
import { HealthService } from './services/health.service';
import { WorkspaceFuncs } from '../../../shared/func/workspace';

@Module({
  imports: [AuthzModule],
  controllers: [],
  providers: [WorkspaceFuncs, HealthService],
})
export class MembersModule {}
