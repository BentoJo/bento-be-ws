import { Controller } from '@nestjs/common';
import { GrpcMethod, Payload } from '@nestjs/microservices';
import { HealthService } from './services/health.service';
import type { InviteWorkspaceMemberRequest } from './types';
import { GrpcUser } from '../../../shared/decorators/meta.decorator';
import { InviteWorkspaceMemberService } from './services/invite-workspace-member.service';

@Controller()
export class MembersController {
  constructor(
    private readonly healthService: HealthService,
    private readonly inviteWorkspaceMemberService: InviteWorkspaceMemberService,
  ) {}

  @GrpcMethod('WorkspaceService', 'HealthCheck')
  healthCheck() {
    return { status: this.healthService.healthCheck() };
  }

  @GrpcMethod('WorkspaceService', 'InviteWorkspaceMember')
  inviteWorkspaceMember(
    @Payload() data: InviteWorkspaceMemberRequest,
    @GrpcUser() user: GrpcUser,
  ) {
    return this.inviteWorkspaceMemberService.inviteWorkspaceMember(data, user);
  }
}
