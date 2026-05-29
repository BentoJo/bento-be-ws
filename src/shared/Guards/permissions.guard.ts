import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthzService } from '../../modules/authz/authz.service';
import { firstValueFrom } from 'rxjs';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';

type RpcAuthContext = {
  get: (key: string) => unknown;
};

type RpcRequestData = {
  workspaceId?: string;
  roleId?: string;
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly authz: AuthzService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<string>(
      'permission',
      context.getHandler(),
    );

    if (!requiredPermission) return true;

    const rpcContext = context.switchToRpc();
    const data: RpcRequestData = rpcContext.getData();
    const metadata: RpcAuthContext = rpcContext.getContext();

    const userIdValue = metadata.get('x-user-id');
    const userId = Array.isArray(userIdValue)
      ? (userIdValue[0] as string | undefined)
      : typeof userIdValue === 'string'
        ? userIdValue
        : undefined;

    const workspaceId = data.workspaceId;

    if (!userId || !workspaceId) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Missing auth context or workspace ID',
      });
    }

    if (!data.roleId) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Missing role ID in request data',
      });
    }

    const result = await firstValueFrom(
      this.authz.checkPermission({
        roleId: data.roleId,
        scopeId: workspaceId,
        permission: requiredPermission,
      }),
    );

    if (!result.allowed) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Permission denied',
      });
    }

    return true;
  }
}
