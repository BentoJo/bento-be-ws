import { customType, pgEnum } from 'drizzle-orm/pg-core';

export const workspaceInviteStatusEnum = pgEnum('workspace_invite_status', [
  'pending',
  'accepted',
  'expired',
  'revoked',
]);

export const boardVisibilityEnum = pgEnum('board_visibility', [
  'public',
  'private',
]);

export const cardPriorityEnum = pgEnum('card_priority', [
  'low',
  'medium',
  'high',
  'urgent',
]);

export const watchableTypeEnum = pgEnum('watchable_type', [
  'board',
  'column',
  'card',
]);

export const labelTypeEnum = pgEnum('label_type', [
  'default',
  'bug',
  'feature',
  'enhancement',
]);

export const assigneeTypeEnum = pgEnum('assignee_type', ['member', 'team']);

export const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'tsvector';
  },
});
