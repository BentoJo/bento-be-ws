import { Controller } from '@nestjs/common';
import { GrpcMethod, Payload } from '@nestjs/microservices';
import { HealthService } from './services/health.service';
import { CreateWorkspaceService } from './services/create.workspace.service';
import { UpdateWorkspaceService } from './services/update.workspace.service';
import type {
  CreateWorkspaceRequest,
  GetWorkspaceRequest,
  RestoreWorkspaceRequest,
  UpdateWorkspaceRequest,
  GetWorkspaceOverviewRequest,
} from './types';
import { GetWorkspaceOverviewService } from './services/get-workspace-overview.service';

import { DeleteWorkspaceService } from './services/delete-workspace.service';
import { RestoreWorkspaceService } from './services/restore-workspace.service';
import { GetWorkspaceService } from './services/get-workspace.service';
import { GrpcUser } from '../../../shared/decorators/meta.decorator';

@Controller()
export class WorkspaceController {
  constructor(
    private readonly healthService: HealthService,
    private readonly createWorkspaceService: CreateWorkspaceService,
    private readonly getWorkspaceService: GetWorkspaceService,
    private readonly updateWorkspaceService: UpdateWorkspaceService,
    private readonly deleteWorkspaceService: DeleteWorkspaceService,
    private readonly restoreWorkspaceService: RestoreWorkspaceService,
    private readonly getWorkspaceOverviewService: GetWorkspaceOverviewService,
  ) {}

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

  @GrpcMethod('WorkspaceService', 'UpdateWorkspace')
  updateWorkspace(
    @Payload() data: UpdateWorkspaceRequest,
    @GrpcUser() user: GrpcUser,
  ) {
    return this.updateWorkspaceService.updateWorkspace(data, user);
  }

  @GrpcMethod('WorkspaceService', 'GetWorkspaceOverview')
  getWorkspaceOverview(
    @Payload() data: GetWorkspaceOverviewRequest,
    @GrpcUser() user: GrpcUser,
  ) {
    return this.getWorkspaceOverviewService.getOverview(data, user);
  }

  @GrpcMethod('WorkspaceService', 'DeleteWorkspace')
  deleteWorkspace(
    @Payload() data: GetWorkspaceRequest,
    @GrpcUser() user: GrpcUser,
  ) {
    return this.deleteWorkspaceService.deleteWorkspace(data, user);
  }

  @GrpcMethod('WorkspaceService', 'RestoreWorkspace')
  restoreWorkspace(
    @Payload() data: RestoreWorkspaceRequest,
    @GrpcUser() user: GrpcUser,
  ) {
    return this.restoreWorkspaceService.restoreWorkspace(data, user);
  }

  @GrpcMethod('WorkspaceService', 'TransferWorkspaceOwnership')
  transferWorkspaceOwnership(
    @Payload() data: RestoreWorkspaceRequest,
    @GrpcUser() user: GrpcUser,
  ) {
    return this.restoreWorkspaceService.restoreWorkspace(data, user);
  }
}
