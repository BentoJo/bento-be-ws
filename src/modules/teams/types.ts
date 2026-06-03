export interface CreateTeamRequest {
  workspaceId: string;

  name: string;

  description?: string;

  icon?: string;
}

export interface TeamResponse {
  id: string;

  workspaceId: string;

  name: string;

  description?: string;

  icon?: string;

  isArchived: boolean;

  createdAt: string;

  updatedAt?: string;
}

export interface GetTeamRequest {
  workspaceId: string;

  teamId: string;
}

export type TeamGetRequest = GetTeamRequest;

export interface AddTeamMemberRequest {
  workspaceId: string;

  teamId: string;

  workspaceMemberId: string;
}

export interface TeamMemberResponse {
  id: string;

  teamId: string;

  workspaceMemberId: string;

  joinedAt: string;
}

export interface UpdateTeamRequest {
  workspaceId: string;

  teamId: string;

  name?: string;

  description?: string;

  icon?: string;
}

export interface UpdateTeamResponse {
  id: string;

  workspaceId: string;

  name: string;

  description?: string;

  icon?: string;

  updatedAt: string;
}

export type TeamUpdateRequest = UpdateTeamRequest;
export type TeamUpdateResponse = UpdateTeamResponse;

export interface DeleteTeamRequest {
  workspaceId: string;

  teamId: string;
}

export interface DeleteTeamResponse {
  success: boolean;

  message: string;

  deletedAt: string;
}

export type TeamDeleteRequest = DeleteTeamRequest;
export type TeamDeleteResponse = DeleteTeamResponse;

export interface RestoreTeamRequest {
  workspaceId: string;

  teamId: string;
}

export interface RestoreTeamResponse {
  success: boolean;

  message: string;

  restoredAt: string;
}

export type TeamRestoreRequest = RestoreTeamRequest;
export type TeamRestoreResponse = RestoreTeamResponse;

export interface UnarchiveTeamRequest {
  workspaceId: string;

  teamId: string;
}

export interface UnarchiveTeamResponse {
  success: boolean;

  message: string;

  unarchivedAt: string;
}

export type TeamUnarchiveRequest = UnarchiveTeamRequest;
export type TeamUnarchiveResponse = UnarchiveTeamResponse;

export interface ArchiveTeamRequest {
  workspaceId: string;

  teamId: string;
}

export interface ArchiveTeamResponse {
  success: boolean;

  message: string;

  archivedAt: string;
}

export type TeamArchiveRequest = ArchiveTeamRequest;
export type TeamArchiveResponse = ArchiveTeamResponse;

export interface RemoveTeamMemberRequest {
  workspaceId: string;

  teamId: string;

  userId: string;
}

export interface RemoveTeamMemberResponse {
  success: boolean;

  message: string;
}

export type TeamRemoveMemberRequest = RemoveTeamMemberRequest;
export type TeamRemoveMemberResponse = RemoveTeamMemberResponse;

export interface ListTeamMembersRequest {
  workspaceId: string;

  teamId: string;

  page?: number;

  limit?: number;

  search?: string;
}

export interface TeamMemberDetail {
  workspaceMemberId: string;

  teamMemberId: string;

  userId: string;

  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  };

  joinedAt: string;
}

export interface PaginationInfo {
  page: number;

  limit: number;

  total: number;

  totalPages: number;
}

export interface ListTeamMembersResponse {
  members: TeamMemberDetail[];

  pagination: PaginationInfo;
}

export type TeamListMembersRequest = ListTeamMembersRequest;
export type TeamListMembersResponse = ListTeamMembersResponse;

export interface ListTeamsRequest {
  workspaceId: string;

  page?: number;

  limit?: number;

  search?: string;
}

export interface TeamDetail {
  id: string;

  name: string;

  description?: string;

  icon?: string;

  memberCount: number;

  createdAt: string;
}

export interface ListTeamsResponse {
  teams: TeamDetail[];

  pagination: PaginationInfo;
}

export type TeamListRequest = ListTeamsRequest;
export type TeamListResponse = ListTeamsResponse;

export interface BulkAddTeamMembersRequest {
  workspaceId: string;

  teamId: string;

  userIds: string[];
}

export interface BulkRemoveTeamMembersRequest {
  workspaceId: string;

  teamId: string;

  userIds: string[];
}

export interface BulkTeamMembersResponse {
  success: boolean;

  message: string;
}

export type TeamBulkAddMembersRequest = BulkAddTeamMembersRequest;
export type TeamBulkRemoveMembersRequest = BulkRemoveTeamMembersRequest;
export type TeamBulkMembersResponse = BulkTeamMembersResponse;

export interface ListMemberTeamsRequest {
  workspaceId: string;

  userId: string;
}

export interface MemberTeamDetail {
  teamId: string;

  name: string;

  icon?: string;
}

export interface ListMemberTeamsResponse {
  teams: MemberTeamDetail[];
}

export type TeamListMemberTeamsRequest = ListMemberTeamsRequest;
export type TeamListMemberTeamsResponse = ListMemberTeamsResponse;
