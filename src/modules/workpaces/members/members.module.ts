import { Module } from '@nestjs/common';
import { AuthzModule } from '../../authz/authz.module';
import { HealthService } from './services/health.service';
import { WorkspaceFuncs } from '../../../shared/func/workspace';
import { MembersController } from './members.controller';
import { WorkspaceMembersFuncs } from '../../../shared/func/workspace-members';
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

@Module({
  imports: [AuthzModule],
  controllers: [MembersController],
  providers: [
    WorkspaceFuncs,
    WorkspaceMembersFuncs,
    HealthService,
    InviteWorkspaceMemberService,
    GetWorkspaceMemberService,
    ListWorkspaceMembersService,
    ListWorkspaceInvitesService,
    AcceptWorkspaceInviteService,
    RejectWorkspaceInviteService,
    RemoveWorkspaceMemberService,
    UpdateWorkspaceMemberRoleService,
    GetWorkspaceMemberRoleService,
    ValidateWorkspaceMembershipService,
  ],
})
export class MembersModule {}
