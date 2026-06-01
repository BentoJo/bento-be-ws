import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { workspaceInviteStatusEnum } from '../enums';

export const workspaces = pgTable(
  'workspaces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    logoUrl: text('logo_url'),
    logoKey: text('logo_key'),
    ownerUserId: uuid('owner_user_id').notNull(),
    createdBy: uuid('created_by').notNull(),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at'),
  },
  (table) => [index('workspaces_owner_user_id_idx').on(table.ownerUserId)],
);

export const workspaceRoles = pgTable(
  'workspace_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    authzRoleId: uuid('authz_role_id').notNull(),
    isSystem: boolean('is_system').default(false),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('workspace_roles_workspace_id_idx').on(table.workspaceId),
    index('workspace_roles_authz_role_id_idx').on(table.authzRoleId),
  ],
);

export const workspaceMembers = pgTable(
  'workspace_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    userId: uuid('user_id').notNull(),
    authzRoleId: uuid('authz_role_id').notNull(),
    joinedAt: timestamp('joined_at').defaultNow(),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at'),
  },
  (table) => [
    index('workspace_members_workspace_id_idx').on(table.workspaceId),
    index('workspace_members_user_id_idx').on(table.userId),
    unique('workspace_members_user_id_unique').on(table.userId),
    unique('workspace_members_workspace_user_unique').on(
      table.workspaceId,
      table.userId,
    ),
  ],
);

export const workspaceInvites = pgTable(
  'workspace_invites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    email: varchar('email', { length: 255 }).notNull(),
    invitedBy: uuid('invited_by').notNull(),
    authzRoleId: uuid('authz_role_id').notNull(),
    token: varchar('token', { length: 500 }).notNull().unique(),
    status: workspaceInviteStatusEnum('status').default('pending'),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('workspace_invites_workspace_id_idx').on(table.workspaceId),
    index('workspace_invites_email_idx').on(table.email),
  ],
);

export const teams = pgTable(
  'teams',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    icon: varchar('icon', { length: 100 }),
    createdBy: uuid('created_by').notNull(),
    archivedAt: timestamp('archived_at'),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at'),
  },
  (table) => [index('teams_workspace_id_idx').on(table.workspaceId)],
);

export const teamMembers = pgTable(
  'team_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id),
    workspaceMemberId: uuid('workspace_member_user_id')
      .notNull()
      .references(() => workspaceMembers.userId),
    joinedAt: timestamp('joined_at').defaultNow(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('team_members_team_id_idx').on(table.teamId),
    index('team_members_workspace_member_user_idx').on(table.workspaceMemberId),
    unique('team_members_team_workspace_member_unique').on(
      table.teamId,
      table.workspaceMemberId,
    ),
  ],
);
