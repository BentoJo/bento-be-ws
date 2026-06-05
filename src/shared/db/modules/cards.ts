import {
  AnyPgColumn,
  bigint,
  boolean,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { teams, workspaceMembers, workspaces } from './workspace';
import { boardColumns, boardMembers, boards } from './boards';
import {
  assigneeTypeEnum,
  cardPriorityEnum,
  labelTypeEnum,
  tsvector,
  watchableTypeEnum,
} from '../enums';

export const labels = pgTable(
  'labels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    name: varchar('name', { length: 100 }).notNull(),
    icon: varchar('icon', { length: 100 }),
    type: labelTypeEnum('type').default('default'),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('labels_workspace_id_idx').on(table.workspaceId),
    index('labels_name_idx').on(table.name),
  ],
);

export const cards = pgTable(
  'cards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    boardId: uuid('board_id')
      .notNull()
      .references(() => boards.id),
    columnId: uuid('column_id')
      .notNull()
      .references(() => boardColumns.id),
    title: varchar('title', { length: 500 }).notNull(),
    description: jsonb('description').$type<Record<string, unknown>>(),
    descriptionText: text('description_text'),
    searchVector: tsvector('search_vector'),
    startDate: timestamp('start_date'),
    dueDate: timestamp('due_date'),
    recurrenceRule: text('recurrence_rule'),
    priority: cardPriorityEnum('priority').default('medium'),
    isCompleted: boolean('is_completed').default(false),
    progress: numeric('progress', { precision: 5, scale: 2 }).default('0'),
    isPrivate: boolean('is_private').default(false),
    position: numeric('position', { precision: 10, scale: 4 }).notNull(),
    createdBy: uuid('created_by').notNull(),
    archivedAt: timestamp('archived_at'),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at'),
  },
  (table) => [
    index('cards_workspace_id_idx').on(table.workspaceId),
    index('cards_board_id_idx').on(table.boardId),
    index('cards_column_id_idx').on(table.columnId),
    index('cards_due_date_idx').on(table.dueDate),
    index('cards_created_by_idx').on(table.createdBy),
    index('cards_column_id_position_idx').on(table.columnId, table.position),
    index('cards_search_vector_idx').using('gin', table.searchVector),
  ],
);

export const cardLabels = pgTable(
  'card_labels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    cardId: uuid('card_id')
      .notNull()
      .references(() => cards.id),
    labelId: uuid('label_id')
      .notNull()
      .references(() => labels.id),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('card_labels_card_id_idx').on(table.cardId),
    index('card_labels_label_id_idx').on(table.labelId),
    unique('card_labels_card_label_unique').on(table.cardId, table.labelId),
  ],
);

export const cardVisibilityMembers = pgTable(
  'card_visibility_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    cardId: uuid('card_id')
      .notNull()
      .references(() => cards.id),
    boardMemberId: uuid('board_member_id')
      .notNull()
      .references(() => boardMembers.id),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('card_visibility_members_card_id_idx').on(table.cardId),
    index('card_visibility_members_board_member_id_idx').on(
      table.boardMemberId,
    ),
    unique('card_visibility_members_card_board_member_unique').on(
      table.cardId,
      table.boardMemberId,
    ),
  ],
);

export const cardAssignees = pgTable(
  'card_assignees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    cardId: uuid('card_id')
      .notNull()
      .references(() => cards.id),
    assigneeType: assigneeTypeEnum('assignee_type').notNull(),
    boardMemberId: uuid('board_member_id').references(() => boardMembers.id),
    teamId: uuid('team_id').references(() => teams.id),
    assignedBy: uuid('assigned_by').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('card_assignees_card_id_idx').on(table.cardId),
    index('card_assignees_board_member_id_idx').on(table.boardMemberId),
    index('card_assignees_team_id_idx').on(table.teamId),
  ],
);

export const cardAttachments = pgTable(
  'card_attachments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    cardId: uuid('card_id')
      .notNull()
      .references(() => cards.id),
    uploadedBy: uuid('uploaded_by').notNull(),
    fileName: varchar('file_name', { length: 500 }).notNull(),
    fileUrl: text('file_url').notNull(),
    storageKey: text('storage_key'),
    mimeType: varchar('mime_type', { length: 255 }),
    size: bigint('size', { mode: 'bigint' }),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('card_attachments_card_id_idx').on(table.cardId),
    index('card_attachments_workspace_id_idx').on(table.workspaceId),
  ],
);

export const cardChecklists = pgTable(
  'card_checklists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    cardId: uuid('card_id')
      .notNull()
      .references(() => cards.id),
    title: varchar('title', { length: 255 }).notNull(),
    position: numeric('position', { precision: 10, scale: 4 }).notNull(),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at'),
  },
  (table) => [index('card_checklists_card_id_idx').on(table.cardId)],
);

export const cardChecklistItems = pgTable(
  'card_checklist_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    checklistId: uuid('checklist_id')
      .notNull()
      .references(() => cardChecklists.id),
    title: varchar('title', { length: 500 }).notNull(),
    isCompleted: boolean('is_completed').default(false),
    position: numeric('position', { precision: 10, scale: 4 }).notNull(),
    completedBy: uuid('completed_by'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at'),
  },
  (table) => [
    index('card_checklist_items_checklist_id_idx').on(table.checklistId),
  ],
);

export const cardComments = pgTable(
  'card_comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    cardId: uuid('card_id')
      .notNull()
      .references(() => cards.id),
    parentCommentId: uuid('parent_comment_id').references(
      (): AnyPgColumn => cardComments.id,
    ),
    workspaceMemberId: uuid('workspace_member_id')
      .notNull()
      .references(() => workspaceMembers.id),
    content: jsonb('content').notNull().$type<Record<string, unknown>>(),
    contentText: text('content_text'),
    searchVector: tsvector('search_vector'),
    editedAt: timestamp('edited_at'),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at'),
  },
  (table) => [
    index('card_comments_workspace_id_idx').on(table.workspaceId),
    index('card_comments_card_id_idx').on(table.cardId),
    index('card_comments_workspace_member_id_idx').on(table.workspaceMemberId),
    index('card_comments_parent_comment_id_idx').on(table.parentCommentId),
    index('card_comments_search_vector_idx').using('gin', table.searchVector),
  ],
);

export const mentions = pgTable(
  'mentions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    mentionedUserId: uuid('mentioned_user_id').notNull(),
    mentionedBy: uuid('mentioned_by').notNull(),
    cardId: uuid('card_id').references(() => cards.id),
    commentId: uuid('comment_id').references(() => cardComments.id),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('mentions_workspace_id_idx').on(table.workspaceId),
    index('mentions_mentioned_user_id_idx').on(table.mentionedUserId),
    index('mentions_card_id_idx').on(table.cardId),
    index('mentions_comment_id_idx').on(table.commentId),
  ],
);

export const watchers = pgTable(
  'watchers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    workspaceMemberId: uuid('workspace_member_id')
      .notNull()
      .references(() => workspaceMembers.id),
    watchableId: uuid('watchable_id').notNull(),
    watchableType: watchableTypeEnum('watchable_type').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('watchers_workspace_id_idx').on(table.workspaceId),
    index('watchers_workspace_member_id_idx').on(table.workspaceMemberId),
    unique('watchers_member_watchable_unique').on(
      table.workspaceMemberId,
      table.watchableId,
      table.watchableType,
    ),
  ],
);
