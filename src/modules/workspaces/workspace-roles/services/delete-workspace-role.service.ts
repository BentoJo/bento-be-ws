import { Injectable } from '@nestjs/common';

import { AuthzService } from '../../../authz/authz.service';
import { WorkspaceFuncs } from '../../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../../shared/func/workspace-members';
import type { GrpcUser } from '../../../../shared/decorators/meta.decorator';
import type { DeleteWorkspaceRoleReferenceRequest } from '../types';
import { WorkspaceRolesBaseService } from './workspace-roles.base';

@Injectable()
export class DeleteWorkspaceRoleService extends WorkspaceRolesBaseService {
  constructor(
    workspaceFuncs: WorkspaceFuncs,
    workspaceMembersFuncs: WorkspaceMembersFuncs,
    authZ: AuthzService,
  ) {
    super(workspaceFuncs, workspaceMembersFuncs, authZ);
  }

  deleteWorkspaceRole(
    data: DeleteWorkspaceRoleReferenceRequest,
    user: GrpcUser,
  ) {
    return super.deleteWorkspaceRole(data, user);
  }
}
