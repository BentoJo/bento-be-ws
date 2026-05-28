import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { AuthorizationService } from './authz.interfaces';
import type {
  CreateRoleRequest,
  CreateRoleResponse,
  UpdateRoleRequest,
  UpdateRoleResponse,
  DeleteRoleRequest,
  DeleteRoleResponse,
  AssignPermissionsRequest,
  AssignPermissionsResponse,
  RemovePermissionsRequest,
  RemovePermissionsResponse,
  GetRolePermissionsRequest,
  GetRolePermissionsResponse,
  ListRolesRequest,
  ListRolesResponse,
  CheckPermissionRequest,
  CheckPermissionResponse,
  GetUserRolesRequest,
  GetUserRolesResponse,
  ListPermissionsResponse,
  SearchRolesRequest,
  SearchRolesResponse,
  BatchCheckPermissionsRequest,
  BatchCheckPermissionsResponse,
} from './types';

@Injectable()
export class AuthzService implements OnModuleInit {
  private svc!: AuthorizationService;

  constructor(@Inject('AUTHORIZATION_SERVICE') private client: ClientGrpc) {}

  onModuleInit() {
    this.svc = this.client.getService<AuthorizationService>(
      'AuthorizationService',
    );
  }

  healthCheck(): Observable<{ status: string }> {
    return this.svc.HealthCheck({}) as Observable<{ status: string }>;
  }

  listRoles(req: ListRolesRequest): Observable<ListRolesResponse> {
    return this.svc.ListRoles(req) as Observable<ListRolesResponse>;
  }

  checkPermission(
    req: CheckPermissionRequest,
  ): Observable<CheckPermissionResponse> {
    return this.svc.CheckPermission(req) as Observable<CheckPermissionResponse>;
  }

  createRole(req: CreateRoleRequest): Observable<CreateRoleResponse> {
    return this.svc.CreateRole(req) as Observable<CreateRoleResponse>;
  }

  updateRole(req: UpdateRoleRequest): Observable<UpdateRoleResponse> {
    return this.svc.UpdateRole(req) as Observable<UpdateRoleResponse>;
  }

  deleteRole(req: DeleteRoleRequest): Observable<DeleteRoleResponse> {
    return this.svc.DeleteRole(req) as Observable<DeleteRoleResponse>;
  }

  assignPermissions(
    req: AssignPermissionsRequest,
  ): Observable<AssignPermissionsResponse> {
    return this.svc.AssignPermissionsToRole(
      req,
    ) as Observable<AssignPermissionsResponse>;
  }

  removePermissions(
    req: RemovePermissionsRequest,
  ): Observable<RemovePermissionsResponse> {
    return this.svc.RemovePermissionsFromRole(
      req,
    ) as Observable<RemovePermissionsResponse>;
  }

  getRolePermissions(
    req: GetRolePermissionsRequest,
  ): Observable<GetRolePermissionsResponse> {
    return this.svc.GetRolePermissions(
      req,
    ) as Observable<GetRolePermissionsResponse>;
  }

  getRolesByIds(req: GetUserRolesRequest): Observable<GetUserRolesResponse> {
    return this.svc.GetRolesByIds(req) as Observable<GetUserRolesResponse>;
  }

  listPermissions(): Observable<ListPermissionsResponse> {
    return this.svc.ListPermissions({}) as Observable<ListPermissionsResponse>;
  }

  searchRoles(req: SearchRolesRequest): Observable<SearchRolesResponse> {
    return this.svc.SearchRoles(req) as Observable<SearchRolesResponse>;
  }

  batchCheckPermissions(
    req: BatchCheckPermissionsRequest,
  ): Observable<BatchCheckPermissionsResponse> {
    return this.svc.BatchCheckPermissions(
      req,
    ) as Observable<BatchCheckPermissionsResponse>;
  }
}
