import { Module } from '@nestjs/common';

import { AuthzModule } from '../../authz/authz.module';
import { WorkspaceFuncs } from '../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../shared/func/workspace-members';
import { WorkspaceRolesController } from './workspace-roles.controller';
import { GetWorkspaceRoleFromAuthZService } from './services/get-workspace-role-from-authz.service';
import { GetWorkspaceRolesPermissionsFromAuthZService } from './services/get-workspace-roles-permissions-from-authz.service';
import { DeleteWorkspaceRoleService } from './services/delete-workspace-role.service';
import { GetWorkspaceMemberRoleService } from './services/get-workspace-member-role.service';
import { CheckPermissionService } from './services/check-permission.service';
import { GetWorkspaceRolesService } from './services/get-workspace-roles.service';

@Module({
  imports: [AuthzModule],
  controllers: [WorkspaceRolesController],
  providers: [
    WorkspaceFuncs,
    WorkspaceMembersFuncs,
    GetWorkspaceRoleFromAuthZService,
    GetWorkspaceRolesPermissionsFromAuthZService,
    DeleteWorkspaceRoleService,
    GetWorkspaceMemberRoleService,
    CheckPermissionService,
    GetWorkspaceRolesService,
  ],
})
export class WorkspaceRolesModule {}
