import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  cardAssignees,
  cardChecklistItems,
  cardChecklists,
  cardComments,
  cardLabels,
  cards,
  labels,
} from '../db/schema';
import db from '../configs/db.config';

type DB = NodePgDatabase;

export type CardRow = typeof cards.$inferSelect;
export type LabelRow = typeof labels.$inferSelect;
export type CardAssigneeRow = typeof cardAssignees.$inferSelect;
export type CardCommentRow = typeof cardComments.$inferSelect;
export type CardChecklistRow = typeof cardChecklists.$inferSelect;
export type CardChecklistItemRow = typeof cardChecklistItems.$inferSelect;

@Injectable()
export class CardFuncs {
  // ---------------------------
  // CARDS
  // ---------------------------

  async getActiveCard(id: string, tx?: DB): Promise<CardRow | undefined> {
    const client = tx || db;
    const [row] = await client
      .select()
      .from(cards)
      .where(and(eq(cards.id, id), isNull(cards.deletedAt)))
      .limit(1);

    return row;
  }

  async getById(id: string, tx?: DB): Promise<CardRow | undefined> {
    const client = tx || db;
    const [row] = await client
      .select()
      .from(cards)
      .where(eq(cards.id, id))
      .limit(1);

    return row;
  }

  async nextColumnPosition(columnId: string, tx?: DB): Promise<number> {
    const client = tx || db;
    const [row] = await client
      .select({ max: sql<string | null>`MAX(${cards.position})` })
      .from(cards)
      .where(and(eq(cards.columnId, columnId), isNull(cards.deletedAt)));

    const max = row?.max ? Number(row.max) : 0;
    return max + 1000;
  }

  async create(
    data: {
      workspaceId: string;
      boardId: string;
      columnId: string;
      title: string;
      descriptionText?: string | null;
      startDate?: Date | null;
      dueDate?: Date | null;
      priority?: CardRow['priority'];
      isPrivate?: boolean;
      position: number;
      createdBy: string;
    },
    tx?: DB,
  ): Promise<CardRow> {
    const client = tx || db;
    const [row] = await client
      .insert(cards)
      .values({
        workspaceId: data.workspaceId,
        boardId: data.boardId,
        columnId: data.columnId,
        title: data.title,
        descriptionText: data.descriptionText ?? null,
        startDate: data.startDate ?? null,
        dueDate: data.dueDate ?? null,
        priority: data.priority ?? 'medium',
        isPrivate: data.isPrivate ?? false,
        position: data.position.toString(),
        createdBy: data.createdBy,
      })
      .returning();

    return row;
  }

  async update(
    id: string,
    patch: Partial<{
      title: string;
      descriptionText: string | null;
      startDate: Date | null;
      dueDate: Date | null;
      priority: CardRow['priority'];
      isCompleted: boolean;
      progress: string;
      isPrivate: boolean;
      columnId: string;
      position: number;
      archivedAt: Date | null;
      deletedAt: Date | null;
    }>,
    tx?: DB,
  ): Promise<CardRow | undefined> {
    const client = tx || db;
    const updateObj: Partial<typeof cards.$inferInsert> = {};

    if (patch.title !== undefined) updateObj.title = patch.title;
    if (patch.descriptionText !== undefined)
      updateObj.descriptionText = patch.descriptionText;
    if (patch.startDate !== undefined) updateObj.startDate = patch.startDate;
    if (patch.dueDate !== undefined) updateObj.dueDate = patch.dueDate;
    if (patch.priority !== undefined) updateObj.priority = patch.priority;
    if (patch.isCompleted !== undefined)
      updateObj.isCompleted = patch.isCompleted;
    if (patch.progress !== undefined) updateObj.progress = patch.progress;
    if (patch.isPrivate !== undefined) updateObj.isPrivate = patch.isPrivate;
    if (patch.columnId !== undefined) updateObj.columnId = patch.columnId;
    if (patch.position !== undefined)
      updateObj.position = patch.position.toString();
    if (patch.archivedAt !== undefined) updateObj.archivedAt = patch.archivedAt;
    if (patch.deletedAt !== undefined) updateObj.deletedAt = patch.deletedAt;

    updateObj.updatedAt = new Date();

    const [row] = await client
      .update(cards)
      .set(updateObj)
      .where(eq(cards.id, id))
      .returning();

    return row;
  }

  // cards should also check in the card visibility table (if the card is private to appear for the assignees and the creator only)
  async listByColumn(
    columnId: string,
    opts?: { includeArchived?: boolean },
    tx?: DB,
  ): Promise<CardRow[]> {
    const client = tx || db;
    const conditions = [eq(cards.columnId, columnId), isNull(cards.deletedAt)];

    if (!opts?.includeArchived) {
      conditions.push(isNull(cards.archivedAt));
    }

    return client
      .select()
      .from(cards)
      .where(and(...conditions))
      .orderBy(asc(cards.position));
  }

  async listByBoard(
    boardId: string,
    opts?: { includeArchived?: boolean },
    tx?: DB,
  ): Promise<CardRow[]> {
    const client = tx || db;
    const conditions = [eq(cards.boardId, boardId), isNull(cards.deletedAt)];

    if (!opts?.includeArchived) {
      conditions.push(isNull(cards.archivedAt));
    }

    return client
      .select()
      .from(cards)
      .where(and(...conditions))
      .orderBy(asc(cards.columnId), asc(cards.position));
  }

  async listByWorkspaceDateRange(
    workspaceId: string,
    from: Date,
    to: Date,
    tx?: DB,
  ): Promise<CardRow[]> {
    const client = tx || db;

    return client
      .select()
      .from(cards)
      .where(
        and(
          eq(cards.workspaceId, workspaceId),
          isNull(cards.deletedAt),
          isNull(cards.archivedAt),
          gte(cards.dueDate, from),
          lte(cards.dueDate, to),
        ),
      )
      .orderBy(asc(cards.dueDate));
  }

  // ---------------------------
  // ASSIGNEES
  // ---------------------------

  async addAssignee(
    data: {
      workspaceId: string;
      cardId: string;
      assigneeType: CardAssigneeRow['assigneeType'];
      boardMemberId?: string | null;
      teamId?: string | null;
      assignedBy: string;
    },
    tx?: DB,
  ): Promise<CardAssigneeRow> {
    const client = tx || db;
    const [row] = await client
      .insert(cardAssignees)
      .values({
        workspaceId: data.workspaceId,
        cardId: data.cardId,
        assigneeType: data.assigneeType,
        boardMemberId: data.boardMemberId ?? null,
        teamId: data.teamId ?? null,
        assignedBy: data.assignedBy,
      })
      .returning();

    return row;
  }

  async removeAssignee(
    cardId: string,
    assigneeId: string,
    tx?: DB,
  ): Promise<void> {
    const client = tx || db;
    await client
      .delete(cardAssignees)
      .where(
        and(eq(cardAssignees.id, assigneeId), eq(cardAssignees.cardId, cardId)),
      );
  }

  async listAssignees(cardId: string, tx?: DB): Promise<CardAssigneeRow[]> {
    const client = tx || db;
    return client
      .select()
      .from(cardAssignees)
      .where(eq(cardAssignees.cardId, cardId))
      .orderBy(asc(cardAssignees.createdAt));
  }

  // ---------------------------
  // LABELS
  // ---------------------------

  async createLabel(
    data: {
      workspaceId: string;
      name: string;
      icon?: string | null;
      type?: LabelRow['type'];
      createdBy: string;
    },
    tx?: DB,
  ): Promise<LabelRow> {
    const client = tx || db;
    const [row] = await client
      .insert(labels)
      .values({
        workspaceId: data.workspaceId,
        name: data.name,
        icon: data.icon ?? null,
        type: data.type ?? 'default',
        createdBy: data.createdBy,
      })
      .returning();

    return row;
  }

  async getLabel(id: string, tx?: DB): Promise<LabelRow | undefined> {
    const client = tx || db;
    const [row] = await client
      .select()
      .from(labels)
      .where(eq(labels.id, id))
      .limit(1);

    return row;
  }

  async listWorkspaceLabels(workspaceId: string, tx?: DB): Promise<LabelRow[]> {
    const client = tx || db;
    return client
      .select()
      .from(labels)
      .where(eq(labels.workspaceId, workspaceId))
      .orderBy(asc(labels.name));
  }

  async deleteLabel(id: string, tx?: DB): Promise<void> {
    const client = tx || db;
    await client.delete(cardLabels).where(eq(cardLabels.labelId, id));
    await client.delete(labels).where(eq(labels.id, id));
  }

  async addCardLabel(
    data: { workspaceId: string; cardId: string; labelId: string },
    tx?: DB,
  ): Promise<void> {
    const client = tx || db;
    await client
      .insert(cardLabels)
      .values({
        workspaceId: data.workspaceId,
        cardId: data.cardId,
        labelId: data.labelId,
      })
      .onConflictDoNothing({
        target: [cardLabels.cardId, cardLabels.labelId],
      });
  }

  async removeCardLabel(
    cardId: string,
    labelId: string,
    tx?: DB,
  ): Promise<void> {
    const client = tx || db;
    await client
      .delete(cardLabels)
      .where(
        and(eq(cardLabels.cardId, cardId), eq(cardLabels.labelId, labelId)),
      );
  }

  // ---------------------------
  // COMMENTS
  // ---------------------------

  async addComment(
    data: {
      workspaceId: string;
      cardId: string;
      workspaceMemberId: string;
      contentText: string;
      parentCommentId?: string | null;
    },
    tx?: DB,
  ): Promise<CardCommentRow> {
    const client = tx || db;
    const [row] = await client
      .insert(cardComments)
      .values({
        workspaceId: data.workspaceId,
        cardId: data.cardId,
        workspaceMemberId: data.workspaceMemberId,
        parentCommentId: data.parentCommentId ?? null,
        content: { text: data.contentText },
        contentText: data.contentText,
      })
      .returning();

    return row;
  }

  async getComment(id: string, tx?: DB): Promise<CardCommentRow | undefined> {
    const client = tx || db;
    const [row] = await client
      .select()
      .from(cardComments)
      .where(and(eq(cardComments.id, id), isNull(cardComments.deletedAt)))
      .limit(1);

    return row;
  }

  async listComments(
    cardId: string,
    page: number,
    limit: number,
    tx?: DB,
  ): Promise<{ rows: CardCommentRow[]; total: number }> {
    const client = tx || db;
    const offset = (page - 1) * limit;

    const whereClause = and(
      eq(cardComments.cardId, cardId),
      isNull(cardComments.deletedAt),
    );

    const [countRow] = await client
      .select({ total: sql<number>`COUNT(*)` })
      .from(cardComments)
      .where(whereClause);

    const total = Number(countRow?.total ?? 0);

    const rows = await client
      .select()
      .from(cardComments)
      .where(whereClause)
      .orderBy(desc(cardComments.createdAt))
      .limit(limit)
      .offset(offset);

    return { rows, total };
  }

  async deleteComment(id: string, tx?: DB): Promise<void> {
    const client = tx || db;
    await client
      .update(cardComments)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(cardComments.id, id));
  }

  // ---------------------------
  // CHECKLISTS
  // ---------------------------

  async nextChecklistPosition(cardId: string, tx?: DB): Promise<number> {
    const client = tx || db;
    const [row] = await client
      .select({ max: sql<string | null>`MAX(${cardChecklists.position})` })
      .from(cardChecklists)
      .where(eq(cardChecklists.cardId, cardId));

    const max = row?.max ? Number(row.max) : 0;
    return max + 1000;
  }

  async nextChecklistItemPosition(
    checklistId: string,
    tx?: DB,
  ): Promise<number> {
    const client = tx || db;
    const [row] = await client
      .select({ max: sql<string | null>`MAX(${cardChecklistItems.position})` })
      .from(cardChecklistItems)
      .where(eq(cardChecklistItems.checklistId, checklistId));

    const max = row?.max ? Number(row.max) : 0;
    return max + 1000;
  }

  async createChecklist(
    data: {
      workspaceId: string;
      cardId: string;
      title: string;
      position: number;
      createdBy: string;
    },
    tx?: DB,
  ): Promise<CardChecklistRow> {
    const client = tx || db;
    const [row] = await client
      .insert(cardChecklists)
      .values({
        workspaceId: data.workspaceId,
        cardId: data.cardId,
        title: data.title,
        position: data.position.toString(),
        createdBy: data.createdBy,
      })
      .returning();

    return row;
  }

  async getChecklist(
    id: string,
    tx?: DB,
  ): Promise<CardChecklistRow | undefined> {
    const client = tx || db;
    const [row] = await client
      .select()
      .from(cardChecklists)
      .where(eq(cardChecklists.id, id))
      .limit(1);

    return row;
  }

  async listChecklists(cardId: string, tx?: DB): Promise<CardChecklistRow[]> {
    const client = tx || db;
    return client
      .select()
      .from(cardChecklists)
      .where(eq(cardChecklists.cardId, cardId))
      .orderBy(asc(cardChecklists.position));
  }

  async deleteChecklist(id: string, tx?: DB): Promise<void> {
    const client = tx || db;
    await client
      .delete(cardChecklistItems)
      .where(eq(cardChecklistItems.checklistId, id));
    await client.delete(cardChecklists).where(eq(cardChecklists.id, id));
  }

  async addChecklistItem(
    data: {
      workspaceId: string;
      checklistId: string;
      title: string;
      position: number;
    },
    tx?: DB,
  ): Promise<CardChecklistItemRow> {
    const client = tx || db;
    const [row] = await client
      .insert(cardChecklistItems)
      .values({
        workspaceId: data.workspaceId,
        checklistId: data.checklistId,
        title: data.title,
        position: data.position.toString(),
      })
      .returning();

    return row;
  }

  async getChecklistItem(
    id: string,
    tx?: DB,
  ): Promise<CardChecklistItemRow | undefined> {
    const client = tx || db;
    const [row] = await client
      .select()
      .from(cardChecklistItems)
      .where(eq(cardChecklistItems.id, id))
      .limit(1);

    return row;
  }

  async listChecklistItems(
    checklistId: string,
    tx?: DB,
  ): Promise<CardChecklistItemRow[]> {
    const client = tx || db;
    return client
      .select()
      .from(cardChecklistItems)
      .where(eq(cardChecklistItems.checklistId, checklistId))
      .orderBy(asc(cardChecklistItems.position));
  }

  async toggleChecklistItem(
    id: string,
    isCompleted: boolean,
    completedBy: string | null,
    tx?: DB,
  ): Promise<CardChecklistItemRow | undefined> {
    const client = tx || db;
    const [row] = await client
      .update(cardChecklistItems)
      .set({
        isCompleted,
        completedBy: isCompleted ? completedBy : null,
        completedAt: isCompleted ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(cardChecklistItems.id, id))
      .returning();

    return row;
  }

  async deleteChecklistItem(id: string, tx?: DB): Promise<void> {
    const client = tx || db;
    await client
      .delete(cardChecklistItems)
      .where(eq(cardChecklistItems.id, id));
  }
}
