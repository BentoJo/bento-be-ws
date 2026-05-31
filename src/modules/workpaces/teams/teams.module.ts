import { Module } from '@nestjs/common';
import { AuthzModule } from '../../authz/authz.module';
import { WorkspaceFuncs } from '../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../shared/func/workspace-members';
import { TeamsFuncs } from '../../../shared/func/teams';
import { TeamsController } from './teams.controller';
import { CreateTeamService } from './services/create-team.service';
import { AddTeamMemberService } from './services/add-team-member.service';
import { UpdateTeamService } from './services/update-team.service';
import { DeleteTeamService } from './services/delete-team.service';
import { RestoreTeamService } from './services/restore-team.service';
import { UnarchiveTeamService } from './services/unarchive-team.service';
import { ArchiveTeamService } from './services/archive-team.service';
import { RemoveTeamMemberService } from './services/remove-team-member.service';
import { ListTeamMembersService } from './services/list-team-members.service';
import { ListTeamsService } from './services/list-teams.service';
import { BulkAddTeamMembersService } from './services/bulk-add-team-members.service';
import { BulkRemoveTeamMembersService } from './services/bulk-remove-team-members.service';
import { ListMemberTeamsService } from './services/list-member-teams.service';
import { GetTeamService } from './services/get-team.service';

@Module({
  imports: [AuthzModule],
  controllers: [TeamsController],
  providers: [
    WorkspaceFuncs,
    WorkspaceMembersFuncs,
    TeamsFuncs,
    CreateTeamService,
    AddTeamMemberService,
    UpdateTeamService,
    DeleteTeamService,
    RestoreTeamService,
    UnarchiveTeamService,
    ArchiveTeamService,
    RemoveTeamMemberService,
    ListTeamMembersService,
    ListTeamsService,
    BulkAddTeamMembersService,
    BulkRemoveTeamMembersService,
    ListMemberTeamsService,
    GetTeamService,
  ],
})
export class TeamsModule {}
