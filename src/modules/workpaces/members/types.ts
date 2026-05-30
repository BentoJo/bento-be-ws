export interface InviteWorkspaceMemberRequest {
  workspaceId: string;

  email: string;

  authzRoleId: string;

  message?: string;
}

// enum WorkspaceInviteStatus {
//   WORKSPACE_INVITE_STATUS_UNSPECIFIED = 'UNSPECIFIED',
//   WORKSPACE_INVITE_STATUS_PENDING = 'PENDING',
//   WORKSPACE_INVITE_STATUS_ACCEPTED = 'ACCEPTED',
//   WORKSPACE_INVITE_STATUS_EXPIRED = 'EXPIRED',
//   WORKSPACE_INVITE_STATUS_REVOKED = 'REVOKED',
// }

export interface WorkspaceInviteResponse {
  inviteId: string;

  workspaceId: string;

  email: string;

  authzRoleId: string;

  token: string;

  expiresAt: Date;

  invitedBy: string;

  status: 'unspecified' | 'pending' | 'accepted' | 'expired' | 'revoked';

  createdAt: Date;
}

export interface AcceptWorkspaceInviteRequest {
  token: string;
}

export interface WorkspaceMembershipResponse {
  membershipId: string;

  workspaceId: string;

  userId: string;

  authzRoleId: string;

  joinedAt: Date;
}

export interface WorkspaceMemberResponse {
  id: string;

  workspaceId: string;

  userId: string;

  authzRoleId: string;

  joinedAt: Date;
}

export interface UpdateWorkspaceMemberRoleRequest {
  workspaceId: string;

  memberId: string;

  authzRoleId: string;
}

export interface GetWorkspaceMemberRoleRequest {
  workspaceId: string;

  memberId: string;
}

export interface WorkspaceMemberRoleResponse {
  authzRoleId: string;
}

export interface ValidateWorkspaceMembershipRequest {
  workspaceId: string;

  userId: string;
}

export interface ValidateWorkspaceMembershipResponse {
  isMember: boolean;

  membershipId?: string;

  authzRoleId?: string;
}

export interface RejectWorkspaceInviteRequest {
  token: string;
}

export interface RejectWorkspaceInviteResponse {
  membershipId: string;

  workspaceId: string;

  userId: string;

  authzRoleId: string;

  joinedAt: Date;
}

export interface GetWorkspaceMemberRequest {
  workspaceId: string;

  memberId: string;
}

export interface RemoveWorkspaceMemberRequest {
  workspaceId: string;

  memberId: string;
}

export interface ListWorkspaceMembersRequest {
  workspaceId: string;

  page?: number;

  limit?: number;

  search?: string;
}

export interface WorkspaceMemberListItem {
  id: string;

  userId: string;

  authzRoleId: string;
  joinedAt: Date;
}

export interface ListWorkspaceMembersResponse {
  members: WorkspaceMemberListItem[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListWorkspaceInvitesRequest {
  workspaceId: string;

  page?: number;

  limit?: number;

  status?: 'pending' | 'accepted' | 'expired' | 'revoked';

  search?: string;
}

export interface WorkspaceInviteListItem {
  id: string;

  workspaceId: string;

  email: string;

  authzRoleId: string;

  status: string;

  expiresAt: Date;

  createdAt: Date;
}

export interface ListWorkspaceInvitesResponse {
  invites: WorkspaceInviteListItem[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateWorkspaceRequest {
  name: string;
  logoUrl?: string;
}

export interface UpdateWorkspaceRequest {
  workspaceId: string;

  name?: string;

  logoUrl?: string | null;

  logoKey?: string | null;
}

export interface GetWorkspaceOverviewRequest {
  workspaceId: string;
}

export type GetWorkspaceOverviewResponse = {
  totalBoards: number;
  totalMembers: number;
  totalTeams: number;
  totalCards: number;
  completedCards: number;
  overdueCards: number;
  boardsPreview: {
    id: string;
    name: string;
    visibility: string;
    columnsCount: number;
    cardCount: number;
  }[];
  permissions: {
    canCreateBoard: boolean;
    canInviteMembers: boolean;
    canEditWorkspace: boolean;
  };
  lastUpdatedAt: string;
};

export interface WorkspaceResponse {
  id: string;

  name: string;

  logoUrl?: string;

  ownerId: string;

  createdAt: Date;

  updatedAt?: Date;
}

export interface GetWorkspaceRequest {
  workspaceId: string;
}

export interface DeleteWorkspaceRequest {
  workspaceId: string;
}

export interface RestoreWorkspaceRequest {
  workspaceId: string;
}

export interface TransferWorkspaceOwnershipRequest {
  workspaceId: string;

  newOwnerId: string;
}
