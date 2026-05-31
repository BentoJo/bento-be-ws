import { Controller } from '@nestjs/common';
import { GrpcMethod, Payload } from '@nestjs/microservices';
import { GrpcUser } from '../../../shared/decorators/meta.decorator';
import { CreateTeamService } from './services/create-team.service';
import type {
  AddTeamMemberRequest,
  BulkAddTeamMembersRequest,
  BulkRemoveTeamMembersRequest,
  CreateTeamRequest,
  GetTeamRequest,
  TeamDeleteRequest,
  ListMemberTeamsRequest,
  TeamRestoreRequest,
  TeamUpdateRequest,
  TeamUnarchiveRequest,
  TeamArchiveRequest,
  TeamRemoveMemberRequest,
  TeamListMembersRequest,
  TeamListRequest,
} from './types';
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

@Controller()
export class TeamsController {
  constructor(
    private readonly createTeamService: CreateTeamService,
    private readonly addTeamMemberService: AddTeamMemberService,
    private readonly updateTeamService: UpdateTeamService,
    private readonly deleteTeamService: DeleteTeamService,
    private readonly restoreTeamService: RestoreTeamService,
    private readonly unarchiveTeamService: UnarchiveTeamService,
    private readonly archiveTeamService: ArchiveTeamService,
    private readonly removeTeamMemberService: RemoveTeamMemberService,
    private readonly listTeamMembersService: ListTeamMembersService,
    private readonly listTeamsService: ListTeamsService,
    private readonly bulkAddTeamMembersService: BulkAddTeamMembersService,
    private readonly bulkRemoveTeamMembersService: BulkRemoveTeamMembersService,
    private readonly listMemberTeamsService: ListMemberTeamsService,
    private readonly getTeamService: GetTeamService,
  ) {}

  @GrpcMethod('TeamService', 'CreateTeam')
  createTeam(@Payload() data: CreateTeamRequest, @GrpcUser() user: GrpcUser) {
    return this.createTeamService.createTeam(data, user);
  }

  @GrpcMethod('TeamService', 'GetTeam')
  getTeam(@Payload() data: GetTeamRequest, @GrpcUser() user: GrpcUser) {
    return this.getTeamService.getTeam(data, user);
  }

  @GrpcMethod('TeamService', 'AddTeamMember')
  addTeamMember(
    @Payload() data: AddTeamMemberRequest,
    @GrpcUser() user: GrpcUser,
  ) {
    return this.addTeamMemberService.addTeamMember(data, user);
  }

  @GrpcMethod('TeamService', 'UpdateTeam')
  updateTeam(@Payload() data: TeamUpdateRequest, @GrpcUser() user: GrpcUser) {
    return this.updateTeamService.updateTeam(data, user);
  }

  @GrpcMethod('TeamService', 'DeleteTeam')
  deleteTeam(@Payload() data: TeamDeleteRequest, @GrpcUser() user: GrpcUser) {
    return this.deleteTeamService.deleteTeam(data, user);
  }

  @GrpcMethod('TeamService', 'RestoreTeam')
  restoreTeam(@Payload() data: TeamRestoreRequest, @GrpcUser() user: GrpcUser) {
    return this.restoreTeamService.restoreTeam(data, user);
  }

  @GrpcMethod('TeamService', 'UnarchiveTeam')
  unarchiveTeam(
    @Payload() data: TeamUnarchiveRequest,
    @GrpcUser() user: GrpcUser,
  ) {
    return this.unarchiveTeamService.unarchiveTeam(data, user);
  }

  @GrpcMethod('TeamService', 'ArchiveTeam')
  archiveTeam(@Payload() data: TeamArchiveRequest, @GrpcUser() user: GrpcUser) {
    return this.archiveTeamService.archiveTeam(data, user);
  }

  @GrpcMethod('TeamService', 'RemoveTeamMember')
  removeTeamMember(
    @Payload() data: TeamRemoveMemberRequest,
    @GrpcUser() user: GrpcUser,
  ) {
    return this.removeTeamMemberService.removeTeamMember(data, user);
  }

  @GrpcMethod('TeamService', 'ListTeamMembers')
  listTeamMembers(
    @Payload() data: TeamListMembersRequest,
    @GrpcUser() user: GrpcUser,
  ) {
    return this.listTeamMembersService.listTeamMembers(data, user);
  }

  @GrpcMethod('TeamService', 'ListTeams')
  listTeams(@Payload() data: TeamListRequest, @GrpcUser() user: GrpcUser) {
    return this.listTeamsService.listTeams(data, user);
  }

  @GrpcMethod('TeamService', 'BulkAddTeamMembers')
  bulkAddTeamMembers(
    @Payload() data: BulkAddTeamMembersRequest,
    @GrpcUser() user: GrpcUser,
  ) {
    return this.bulkAddTeamMembersService.bulkAddTeamMembers(data, user);
  }

  @GrpcMethod('TeamService', 'BulkRemoveTeamMembers')
  bulkRemoveTeamMembers(
    @Payload() data: BulkRemoveTeamMembersRequest,
    @GrpcUser() user: GrpcUser,
  ) {
    return this.bulkRemoveTeamMembersService.bulkRemoveTeamMembers(data, user);
  }

  @GrpcMethod('TeamService', 'ListMemberTeams')
  listMemberTeams(
    @Payload() data: ListMemberTeamsRequest,
    @GrpcUser() user: GrpcUser,
  ) {
    return this.listMemberTeamsService.listMemberTeams(data, user);
  }
}
