import { Controller } from '@nestjs/common';
import { GrpcMethod, Payload } from '@nestjs/microservices';
import { HealthService } from './services/health.service';
import { CreateWorkspaceService } from './services/create.workspace.service';
import type { CreateWorkspaceRequest } from './types';
import { GrpcUser } from '../../shared/decorators/meta.decorator';

@Controller()
export class WorkspaceController {
  constructor(
    private readonly healthService: HealthService,
    private readonly createWorkspaceService: CreateWorkspaceService,
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
}
