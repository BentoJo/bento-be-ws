import { Controller } from '@nestjs/common';
import { GrpcMethod, Payload } from '@nestjs/microservices';
import { HealthService } from './services/health.service';
import type {
  AcceptWorkspaceInviteRequest,
  GetWorkspaceMemberRequest,
  GetWorkspaceMemberRoleRequest,
  InviteWorkspaceMemberRequest,
  RejectWorkspaceInviteRequest,
  RemoveWorkspaceMemberRequest,
  ListWorkspaceMembersRequest,
  ListWorkspaceInvitesRequest,
  UpdateWorkspaceMemberRoleRequest,
  ValidateWorkspaceMembershipRequest,
} from './types';
import { GrpcUser } from '../../../shared/decorators/meta.decorator';
import { InviteWorkspaceMemberService } from './services/invite-workspace-member.service';
import { GetWorkspaceMemberService } from './services/get-workspace-member.service';
import { ListWorkspaceMembersService } from './services/list-workspace-members.service';
import { ListWorkspaceInvitesService } from './services/list-workspace-invites.service';
import { RemoveWorkspaceMemberService } from './services/remove-workspace-member.service';
import { AcceptWorkspaceInviteService } from './services/accept-workspace-member.service';
import { RejectWorkspaceInviteService } from './services/reject-workspace-member.service';
import { UpdateWorkspaceMemberRoleService } from './services/update-workspace-member-role.service';
import { GetWorkspaceMemberRoleService } from './services/get-workspace-member-role.service';
import { ValidateWorkspaceMembershipService } from './services/validate-workspace-membership.service';

@Controller()
export class MembersController {
  constructor(
    private readonly healthService: HealthService,
    private readonly inviteWorkspaceMemberService: InviteWorkspaceMemberService,
    private readonly getWorkspaceMemberService: GetWorkspaceMemberService,
    private readonly listWorkspaceMembersService: ListWorkspaceMembersService,
    private readonly listWorkspaceInvitesService: ListWorkspaceInvitesService,
    private readonly acceptWorkspaceInviteService: AcceptWorkspaceInviteService,
    private readonly removeWorkspaceMemberService: RemoveWorkspaceMemberService,
    private readonly rejectWorkspaceInviteService: RejectWorkspaceInviteService,
    private readonly updateWorkspaceMemberRoleService: UpdateWorkspaceMemberRoleService,
    private readonly getWorkspaceMemberRoleService: GetWorkspaceMemberRoleService,
    private readonly validateWorkspaceMembershipService: ValidateWorkspaceMembershipService,
  ) {}

  @GrpcMethod('WorkspaceService', 'HealthCheck')
  healthCheck() {
    return { status: this.healthService.healthCheck() };
  }

  @GrpcMethod('WorkspaceMemberService', 'InviteWorkspaceMember')
  inviteWorkspaceMember(
    @Payload() data: InviteWorkspaceMemberRequest,
    @GrpcUser() user: GrpcUser,
  ) {
    return this.inviteWorkspaceMemberService.inviteWorkspaceMember(data, user);
  }

  @GrpcMethod('WorkspaceMemberService', 'AcceptWorkspaceInvite')
  acceptWorkspaceInvite(
    @Payload() data: AcceptWorkspaceInviteRequest,
    @GrpcUser() user: GrpcUser,
  ) {
    return this.acceptWorkspaceInviteService.acceptWorkspaceInvite(data, user);
  }

  @GrpcMethod('WorkspaceMemberService', 'GetWorkspaceMember')
  getWorkspaceMember(
    @Payload() data: GetWorkspaceMemberRequest,
    @GrpcUser() user: GrpcUser,
  ) {
    return this.getWorkspaceMemberService.getWorkspaceMember(data, user);
  }

  @GrpcMethod('WorkspaceMemberService', 'ListWorkspaceMembers')
  listWorkspaceMembers(
    @Payload() data: ListWorkspaceMembersRequest,
    @GrpcUser() user: GrpcUser,
  ) {
    return this.listWorkspaceMembersService.listWorkspaceMembers(data, user);
  }

  @GrpcMethod('WorkspaceMemberService', 'ListWorkspaceInvites')
  listWorkspaceInvites(
    @Payload() data: ListWorkspaceInvitesRequest,
    @GrpcUser() user: GrpcUser,
  ) {
    return this.listWorkspaceInvitesService.listWorkspaceInvites(data, user);
  }

  @GrpcMethod('WorkspaceMemberService', 'RejectWorkspaceInvite')
  rejectWorkspaceInvite(@Payload() data: RejectWorkspaceInviteRequest) {
    return this.rejectWorkspaceInviteService.rejectWorkspaceInvite(data);
  }

  @GrpcMethod('WorkspaceMemberService', 'RemoveWorkspaceMember')
  removeWorkspaceMember(
    @Payload() data: RemoveWorkspaceMemberRequest,
    @GrpcUser() user: GrpcUser,
  ) {
    return this.removeWorkspaceMemberService.removeWorkspaceMember(data, user);
  }

  @GrpcMethod('WorkspaceMemberService', 'UpdateWorkspaceMemberRole')
  updateWorkspaceMemberRole(
    @Payload() data: UpdateWorkspaceMemberRoleRequest,
    @GrpcUser() user: GrpcUser,
  ) {
    return this.updateWorkspaceMemberRoleService.updateWorkspaceMemberRole(
      data,
      user,
    );
  }

  @GrpcMethod('WorkspaceMemberService', 'GetWorkspaceMemberRole')
  getWorkspaceMemberRole(
    @Payload() data: GetWorkspaceMemberRoleRequest,
    @GrpcUser() user: GrpcUser,
  ) {
    return this.getWorkspaceMemberRoleService.getWorkspaceMemberRole(
      data,
      user,
    );
  }

  @GrpcMethod('WorkspaceMemberService', 'ValidateWorkspaceMembership')
  validateWorkspaceMembership(
    @Payload() data: ValidateWorkspaceMembershipRequest,
  ) {
    return this.validateWorkspaceMembershipService.validateWorkspaceMembership(
      data,
    );
  }
}
