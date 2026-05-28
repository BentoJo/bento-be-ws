import {
  index,
  numeric,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { workspaces, workspaceMembers } from './workspace';
import { boardVisibilityEnum } from '../enums';

export const boards = pgTable(
  'boards',
  {
    id: uuid('id').primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    name: varchar('name', { length: 255 }).notNull(),
    icon: varchar('icon', { length: 100 }),
    visibility: boardVisibilityEnum('visibility').default('public'),
    position: numeric('position', { precision: 10, scale: 4 }).notNull(),
    createdBy: uuid('created_by').notNull(),
    archivedAt: timestamp('archived_at'),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at'),
  },
  (table) => [
    index('boards_workspace_id_idx').on(table.workspaceId),
    index('boards_workspace_id_position_idx').on(
      table.workspaceId,
      table.position,
    ),
  ],
);

export const boardFavorites = pgTable(
  'board_favorites',
  {
    id: uuid('id').primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    boardId: uuid('board_id')
      .notNull()
      .references(() => boards.id),
    workspaceMemberId: uuid('workspace_member_id')
      .notNull()
      .references(() => workspaceMembers.id),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('board_favorites_board_id_idx').on(table.boardId),
    index('board_favorites_workspace_member_id_idx').on(
      table.workspaceMemberId,
    ),
    unique('board_favorites_board_member_unique').on(
      table.boardId,
      table.workspaceMemberId,
    ),
  ],
);

export const boardMembers = pgTable(
  'board_members',
  {
    id: uuid('id').primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    boardId: uuid('board_id')
      .notNull()
      .references(() => boards.id),
    workspaceMemberId: uuid('workspace_member_id')
      .notNull()
      .references(() => workspaceMembers.id),
    overriddenAuthzRoleId: uuid('overridden_authz_role_id'),
    joinedAt: timestamp('joined_at').defaultNow(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('board_members_board_id_idx').on(table.boardId),
    index('board_members_workspace_member_id_idx').on(table.workspaceMemberId),
    unique('board_members_board_workspace_member_unique').on(
      table.boardId,
      table.workspaceMemberId,
    ),
  ],
);

export const boardColumns = pgTable(
  'board_columns',
  {
    id: uuid('id').primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    boardId: uuid('board_id')
      .notNull()
      .references(() => boards.id),
    name: varchar('name', { length: 255 }).notNull(),
    position: numeric('position', { precision: 10, scale: 4 }).notNull(),
    archivedAt: timestamp('archived_at'),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at'),
  },
  (table) => [
    index('board_columns_board_id_idx').on(table.boardId),
    index('board_columns_board_id_position_idx').on(
      table.boardId,
      table.position,
    ),
  ],
);
