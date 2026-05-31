import { Injectable } from '@nestjs/common';

import { AuthzService } from '../../../authz/authz.service';
import { WorkspaceFuncs } from '../../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../../shared/func/workspace-members';
import type {
  GetWorkspaceMemberRoleRequest,
  GetWorkspaceMemberRoleResponse,
} from '../types';
import { WorkspaceRolesBaseService } from './workspace-roles.base';

@Injectable()
export class GetWorkspaceMemberRoleService extends WorkspaceRolesBaseService {
  constructor(
    workspaceFuncs: WorkspaceFuncs,
    workspaceMembersFuncs: WorkspaceMembersFuncs,
    authZ: AuthzService,
  ) {
    super(workspaceFuncs, workspaceMembersFuncs, authZ);
  }

  getWorkspaceMemberRole(
    data: GetWorkspaceMemberRoleRequest,
  ): Promise<GetWorkspaceMemberRoleResponse> {
    return super.getWorkspaceMemberRole(data);
  }
}
