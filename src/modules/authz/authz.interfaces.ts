import { Observable } from 'rxjs';

export interface AuthorizationService {
  HealthCheck(request: any): Observable<any>;
  ListRoles(request: any): Observable<any>;
  CheckPermission(request: any): Observable<any>;
  CreateRole(request: any): Observable<any>;
  UpdateRole(request: any): Observable<any>;
  DeleteRole(request: any): Observable<any>;
  AssignPermissionsToRole(request: any): Observable<any>;
  RemovePermissionsFromRole(request: any): Observable<any>;
  GetRolePermissions(request: any): Observable<any>;
  GetRolesByIds(request: any): Observable<any>;
  ListPermissions(request: any): Observable<any>;
  SearchRoles(request: any): Observable<any>;
  BatchCheckPermissions(request: any): Observable<any>;
}
