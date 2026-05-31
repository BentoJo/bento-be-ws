import { Injectable } from '@nestjs/common';

import { AuthzService } from '../../../authz/authz.service';
import { WorkspaceFuncs } from '../../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../../shared/func/workspace-members';
import type { CheckPermissionRequest, CheckPermissionResponse } from '../types';
import { WorkspaceRolesBaseService } from './workspace-roles.base';

@Injectable()
export class CheckPermissionService extends WorkspaceRolesBaseService {
  constructor(
    workspaceFuncs: WorkspaceFuncs,
    workspaceMembersFuncs: WorkspaceMembersFuncs,
    authZ: AuthzService,
  ) {
    super(workspaceFuncs, workspaceMembersFuncs, authZ);
  }

  checkPermission(
    data: CheckPermissionRequest,
  ): Promise<CheckPermissionResponse> {
    return super.checkPermission(data);
  }
}
