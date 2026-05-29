import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod, Payload } from '@nestjs/microservices';
import { HealthService } from './services/health.service';
import { CreateWorkspaceService } from './services/create.workspace.service';
import type { CreateWorkspaceRequest, GetWorkspaceRequest } from './types';
import { GrpcUser } from '../../shared/decorators/meta.decorator';
import { RequirePermission } from '../../shared/decorators/permission.decorator';
import { PermissionsGuard } from '../../shared/Guards/permissions.guard';
import { GetWorkspaceService } from './services/get-workspace.service';

@Controller()
export class WorkspaceController {
  constructor(
    private readonly healthService: HealthService,
    private readonly createWorkspaceService: CreateWorkspaceService,
    private readonly getWorkspaceService: GetWorkspaceService,
  ) {}

  @UseGuards(PermissionsGuard)
  @RequirePermission('workspace:workspace:manage')
  @GrpcMethod('WorkspaceService', 'HealthCheck')
  healthCheck() {
    return { status: this.healthService.healthCheck() };
  }

  @GrpcMethod('WorkspaceService', 'CreateWorkspace')
  createWorkspace(
    @Payload() data: CreateWorkspaceRequest,
    @GrpcUser() user: GrpcUser,
  ) {
    return this.createWorkspaceService.createWorkspace(data, user);
  }

  @GrpcMethod('WorkspaceService', 'GetWorkspace')
  getWorkspace(
    @Payload() data: GetWorkspaceRequest,
    @GrpcUser() user: GrpcUser,
  ) {
    return this.getWorkspaceService.getWorkspace(data, user);
  }
}
