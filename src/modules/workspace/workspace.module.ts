import { Module } from '@nestjs/common';
import { AuthzModule } from '../authz/authz.module';
import { WorkspaceController } from './wrorkspace.controller';
import { HealthService } from './services/health.service';
import { CreateWorkspaceService } from './services/create.workspace.service';
import { WorkspaceFuncs } from '../../shared/func/workspace';

@Module({
  imports: [AuthzModule],
  controllers: [WorkspaceController],
  providers: [WorkspaceFuncs, CreateWorkspaceService, HealthService],
})
export class WorkspaceModule {}
