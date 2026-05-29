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
  GetStaticRolesResponse,
  CreateSystemRolesRequest,
  CreateSystemRolesResponse,
  GetStaticRolesRequest,
} from './types';

@Injectable()
export class AuthzService implements OnModuleInit {
  private svc?: AuthorizationService;

  constructor(@Inject('AUTHORIZATION_SERVICE') private client: ClientGrpc) {}

  onModuleInit() {
    this.svc = this.client.getService<AuthorizationService>(
      'AuthorizationService',
    );
  }

  private get service(): AuthorizationService {
    if (!this.svc) {
      this.svc = this.client.getService<AuthorizationService>(
        'AuthorizationService',
      );
    }

    return this.svc;
  }

  healthCheck(): Observable<{ status: string }> {
    return this.service.HealthCheck({}) as Observable<{ status: string }>;
  }

  listRoles(req: ListRolesRequest): Observable<ListRolesResponse> {
    return this.service.ListRoles(req) as Observable<ListRolesResponse>;
  }

  checkPermission(
    req: CheckPermissionRequest,
  ): Observable<CheckPermissionResponse> {
    return this.service.CheckPermission(
      req,
    ) as Observable<CheckPermissionResponse>;
  }

  createRole(req: CreateRoleRequest): Observable<CreateRoleResponse> {
    return this.service.CreateRole(req) as Observable<CreateRoleResponse>;
  }

  updateRole(req: UpdateRoleRequest): Observable<UpdateRoleResponse> {
    return this.service.UpdateRole(req) as Observable<UpdateRoleResponse>;
  }

  deleteRole(req: DeleteRoleRequest): Observable<DeleteRoleResponse> {
    return this.service.DeleteRole(req) as Observable<DeleteRoleResponse>;
  }

  assignPermissions(
    req: AssignPermissionsRequest,
  ): Observable<AssignPermissionsResponse> {
    return this.service.AssignPermissionsToRole(
      req,
    ) as Observable<AssignPermissionsResponse>;
  }

  removePermissions(
    req: RemovePermissionsRequest,
  ): Observable<RemovePermissionsResponse> {
    return this.service.RemovePermissionsFromRole(
      req,
    ) as Observable<RemovePermissionsResponse>;
  }

  getRolePermissions(
    req: GetRolePermissionsRequest,
  ): Observable<GetRolePermissionsResponse> {
    return this.service.GetRolePermissions(
      req,
    ) as Observable<GetRolePermissionsResponse>;
  }

  getRolesByIds(req: GetUserRolesRequest): Observable<GetUserRolesResponse> {
    return this.service.GetRolesByIds(req) as Observable<GetUserRolesResponse>;
  }

  listPermissions(): Observable<ListPermissionsResponse> {
    return this.service.ListPermissions(
      {},
    ) as Observable<ListPermissionsResponse>;
  }

  searchRoles(req: SearchRolesRequest): Observable<SearchRolesResponse> {
    return this.service.SearchRoles(req) as Observable<SearchRolesResponse>;
  }

  batchCheckPermissions(
    req: BatchCheckPermissionsRequest,
  ): Observable<BatchCheckPermissionsResponse> {
    return this.service.BatchCheckPermissions(
      req,
    ) as Observable<BatchCheckPermissionsResponse>;
  }

  getStaticRoles(
    data: GetStaticRolesRequest,
  ): Observable<GetStaticRolesResponse> {
    return this.service.GetStaticRoles(
      data,
    ) as Observable<GetStaticRolesResponse>;
  }

  createSystemRoles(
    req: CreateSystemRolesRequest,
  ): Observable<CreateSystemRolesResponse> {
    return this.service.CreateSystemRoles(
      req,
    ) as Observable<CreateSystemRolesResponse>;
  }
}
