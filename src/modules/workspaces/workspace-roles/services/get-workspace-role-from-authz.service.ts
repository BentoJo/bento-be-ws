import { Injectable } from '@nestjs/common';

import { AuthzService } from '../../../authz/authz.service';
import { WorkspaceFuncs } from '../../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../../shared/func/workspace-members';
import type { GrpcUser } from '../../../../shared/decorators/meta.decorator';
import type {
  GetWorkspaceRoleFromAuthZRequest,
  WorkspaceRoleReferenceResponse,
} from '../types';
import { WorkspaceRolesBaseService } from './workspace-roles.base';

@Injectable()
export class GetWorkspaceRoleFromAuthZService extends WorkspaceRolesBaseService {
  constructor(
    workspaceFuncs: WorkspaceFuncs,
    workspaceMembersFuncs: WorkspaceMembersFuncs,
    authZ: AuthzService,
  ) {
    super(workspaceFuncs, workspaceMembersFuncs, authZ);
  }

  getWorkspaceRoleFromAuthZ(
    data: GetWorkspaceRoleFromAuthZRequest,
    user: GrpcUser,
  ): Promise<WorkspaceRoleReferenceResponse> {
    return super.getWorkspaceRoleFromAuthZ(data, user);
  }
}
