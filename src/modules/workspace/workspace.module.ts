import { Module } from '@nestjs/common';
import { AuthzService } from '../authz/authz.service';
import { WorkspaceController } from './wrorkspace.controller';
import { HealthService } from './services/health.service';
import { CreateWorkspaceService } from './services/create.workspace.service';

@Module({
  imports: [AuthzService],
  controllers: [WorkspaceController],
  providers: [AuthzService, CreateWorkspaceService, HealthService],
})
export class WorkspaceModule {}
