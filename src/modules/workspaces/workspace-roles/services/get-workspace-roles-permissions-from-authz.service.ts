import { Injectable } from '@nestjs/common';

import { AuthzService } from '../../../authz/authz.service';
import { WorkspaceFuncs } from '../../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../../shared/func/workspace-members';
import type {
  GetWorkspaceRolesPermissionsFromAuthZRequest,
  WorkspaceRolePermissionsResponse,
} from '../types';
import { WorkspaceRolesBaseService } from './workspace-roles.base';

@Injectable()
export class GetWorkspaceRolesPermissionsFromAuthZService extends WorkspaceRolesBaseService {
  constructor(
    workspaceFuncs: WorkspaceFuncs,
    workspaceMembersFuncs: WorkspaceMembersFuncs,
    authZ: AuthzService,
  ) {
    super(workspaceFuncs, workspaceMembersFuncs, authZ);
  }

  getWorkspaceRolesPermissionsFromAuthZ(
    data: GetWorkspaceRolesPermissionsFromAuthZRequest,
  ): Promise<WorkspaceRolePermissionsResponse> {
    return super.getWorkspaceRolesPermissionsFromAuthZ(data);
  }
}
