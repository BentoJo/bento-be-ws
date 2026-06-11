import { Module } from '@nestjs/common';
import { AuthzModule } from '../../authz/authz.module';
import { WorkspaceController } from './wrorkspace.controller';
import { HealthService } from './services/health.service';
import { CreateWorkspaceService } from './services/create.workspace.service';
import { UpdateWorkspaceService } from './services/update.workspace.service';
import { WorkspaceFuncs } from '../../../shared/func/workspace';
import { GetWorkspaceService } from './services/get-workspace.service';
import { ListUserWorkspacesService } from './services/list-user-workspaces.service';
import { WorkspaceMembersFuncs } from '../../../shared/func/workspace-members';
import { GetWorkspaceOverviewService } from './services/get-workspace-overview.service';
import { DeleteWorkspaceService } from './services/delete-workspace.service';
import { RestoreWorkspaceService } from './services/restore-workspace.service';
import { TransferWorkspaceOwnershipService } from './services/transfer-workspace-owner.service';

@Module({
  imports: [AuthzModule],
  controllers: [WorkspaceController],
  providers: [
    WorkspaceFuncs,
    CreateWorkspaceService,
    UpdateWorkspaceService,
    GetWorkspaceOverviewService,
    GetWorkspaceService,
    ListUserWorkspacesService,
    HealthService,
    WorkspaceMembersFuncs,
    DeleteWorkspaceService,
    RestoreWorkspaceService,
    TransferWorkspaceOwnershipService,
  ],
})
export class WorkspaceModule {}
