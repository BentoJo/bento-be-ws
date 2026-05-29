import { Module } from '@nestjs/common';
import { AuthzModule } from '../authz/authz.module';
import { WorkspaceController } from './wrorkspace.controller';
import { HealthService } from './services/health.service';
import { CreateWorkspaceService } from './services/create.workspace.service';
import { WorkspaceFuncs } from '../../shared/func/workspace';
import { GetWorkspaceService } from './services/get-workspace.service';
import { WorkspaceMembersFuncs } from '../../shared/func/workspace-members';

@Module({
  imports: [AuthzModule],
  controllers: [WorkspaceController],
  providers: [
    WorkspaceFuncs,
    CreateWorkspaceService,
    GetWorkspaceService,
    HealthService,
    WorkspaceMembersFuncs,
  ],
})
export class WorkspaceModule {}
