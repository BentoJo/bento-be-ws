import { createHash } from 'node:crypto';
import db from './shared/configs/db.config';
import {
  workspaces,
  workspaceRoles,
  workspaceMembers,
  teams,
  teamMembers,
} from './shared/db/modules/workspace';
import {
  boards,
  boardColumns,
  boardMembers,
  boardFavorites,
} from './shared/db/modules/boards';
import {
  labels,
  cards,
  cardLabels,
  cardAssignees,
  cardComments,
  cardChecklists,
  cardChecklistItems,
  cardAttachments,
  mentions,
  watchers,
} from './shared/db/modules/cards';

/* =====================================================================
   DETERMINISTIC IDS — identical algorithm + names as iam / authz seeds
   so cross-service references line up (userId, workspaceId, authzRoleId).
===================================================================== */

function detUuid(name: string): string {
  const h = createHash('sha1').update(`bento:${name}`).digest('hex');
  const variant = ((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80)
    .toString(16)
    .padStart(2, '0');
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    '5' + h.slice(13, 16),
    variant + h.slice(18, 20),
    h.slice(20, 32),
  ].join('-');
}

const userId = (i: number) => detUuid(`user:${i}`);
const workspaceId = (w: number) => detUuid(`workspace:${w}`);
const authzRoleId = (w: number, role: string) =>
  detUuid(`authzrole:${w}:${role}`);
const wsMemberId = (w: number, u: number) => detUuid(`wsmember:${w}:${u}`);
const boardMemberId = (w: number, b: number, u: number) =>
  detUuid(`bmember:${w}:${b}:${u}`);

const ROLE_NAMES = ['OWNER', 'ADMIN', 'EDITOR', 'VIEWER'] as const;
const roleForIndex = (n: number) =>
  n === 0 ? 'OWNER' : n === 1 ? 'ADMIN' : n <= 3 ? 'EDITOR' : 'VIEWER';

/* =====================================================================
   TOPOLOGY (replicated in iam + authz seeds)
===================================================================== */

const WORKSPACES = [
  { idx: 0, name: 'Acme Product', owner: 1, members: [1, 2, 3, 4, 5, 6, 7, 8] },
  { idx: 1, name: 'Nova Labs', owner: 9, members: [9, 10, 11, 12, 13, 14, 15, 16] },
  { idx: 2, name: 'Orbit Studio', owner: 17, members: [17, 18, 19, 20, 21, 22, 23, 24, 25] },
];

const TEAM_NAMES = ['Engineering', 'Design', 'Marketing'];
const BOARD_NAMES = ['Roadmap', 'Sprint Board', 'Bugs & Support'];
const COLUMNS = ['Backlog', 'To Do', 'In Progress', 'Done'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
const LABELS = [
  { name: 'Bug', type: 'bug', icon: '🐛' },
  { name: 'Feature', type: 'feature', icon: '✨' },
  { name: 'Enhancement', type: 'enhancement', icon: '⚡' },
  { name: 'Urgent', type: 'default', icon: '🔥' },
  { name: 'Docs', type: 'default', icon: '📝' },
];
const CARD_TITLES = [
  'Set up CI pipeline', 'Design onboarding flow', 'Fix login redirect bug',
  'Write API docs', 'Optimize DB queries', 'Add dark mode', 'Refactor auth module',
  'Implement search', 'Update dependencies', 'Improve test coverage',
  'Add rate limiting', 'Build settings page', 'Migrate to new schema',
  'Create landing page', 'Add export feature',
];

const CARDS_PER_BOARD = 10;
const pos = (n: number) => (n * 1000).toFixed(4);
const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000);
const doc = (text: string) => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

async function insertBatch<T>(
  table: any,
  rows: T[],
  conflictTarget?: any,
): Promise<void> {
  for (let i = 0; i < rows.length; i += 500) {
    await db
      .insert(table)
      .values(rows.slice(i, i + 500))
      .onConflictDoNothing(conflictTarget);
  }
}

/* =====================================================================
   SEED
===================================================================== */

async function seedWorkspace() {
  console.log('🌱 Seeding Workspace service...');

  const wsRows: any[] = [];
  const wsRoleRows: any[] = [];
  const memberRows: any[] = [];
  const teamRows: any[] = [];
  const teamMemberRows: any[] = [];
  const boardRows: any[] = [];
  const columnRows: any[] = [];
  const boardMemberRows: any[] = [];
  const favoriteRows: any[] = [];
  const labelRows: any[] = [];
  const cardRows: any[] = [];
  const cardLabelRows: any[] = [];
  const assigneeRows: any[] = [];
  const commentRows: any[] = [];
  const checklistRows: any[] = [];
  const checklistItemRows: any[] = [];
  const attachmentRows: any[] = [];
  const mentionRows: any[] = [];
  const watcherRows: any[] = [];

  for (const ws of WORKSPACES) {
    const w = ws.idx;
    const wid = workspaceId(w);
    const owner = userId(ws.owner);

    wsRows.push({
      id: wid,
      name: ws.name,
      logoUrl: `https://logo.bento.test/${w}.png`,
      ownerUserId: owner,
      createdBy: owner,
    });

    // workspace roles (mirror of authz roles)
    for (const role of ROLE_NAMES) {
      wsRoleRows.push({
        id: detUuid(`wsrole:${w}:${role}`),
        workspaceId: wid,
        authzRoleId: authzRoleId(w, role),
        isSystem: true,
        createdBy: owner,
      });
    }

    // members
    ws.members.forEach((u, n) => {
      memberRows.push({
        id: wsMemberId(w, u),
        workspaceId: wid,
        userId: userId(u),
        authzRoleId: authzRoleId(w, roleForIndex(n)),
        isActive: true,
      });
    });

    // teams + team members
    TEAM_NAMES.forEach((tname, t) => {
      const teamId = detUuid(`team:${w}:${t}`);
      teamRows.push({
        id: teamId,
        workspaceId: wid,
        name: tname,
        description: `${tname} team for ${ws.name}.`,
        icon: '👥',
        createdBy: owner,
      });
      // ~1/3 of members per team, round-robin
      ws.members
        .filter((_, n) => n % TEAM_NAMES.length === t)
        .forEach((u) => {
          teamMemberRows.push({
            id: detUuid(`teammember:${w}:${t}:${u}`),
            workspaceId: wid,
            teamId,
            workspaceMemberId: userId(u), // FK -> workspace_members.user_id
          });
        });
    });

    // labels
    LABELS.forEach((lb, l) => {
      labelRows.push({
        id: detUuid(`label:${w}:${l}`),
        workspaceId: wid,
        name: lb.name,
        icon: lb.icon,
        type: lb.type,
        createdBy: owner,
      });
    });

    // boards
    BOARD_NAMES.forEach((bname, b) => {
      const boardId = detUuid(`board:${w}:${b}`);
      boardRows.push({
        id: boardId,
        workspaceId: wid,
        name: bname,
        icon: '📋',
        visibility: b === 2 ? 'private' : 'public',
        createdBy: owner,
      });

      // columns
      const columnIds = COLUMNS.map((cname, c) => {
        const colId = detUuid(`col:${w}:${b}:${c}`);
        columnRows.push({
          id: colId,
          workspaceId: wid,
          boardId,
          name: cname,
          position: pos(c + 1),
        });
        return colId;
      });

      // all workspace members are board members (keeps refs valid)
      ws.members.forEach((u) => {
        boardMemberRows.push({
          id: boardMemberId(w, b, u),
          workspaceId: wid,
          boardId,
          workspaceMemberId: wsMemberId(w, u),
        });
      });

      // owner favorites the first board
      if (b === 0) {
        favoriteRows.push({
          id: detUuid(`fav:${w}:${b}:${ws.owner}`),
          workspaceId: wid,
          boardId,
          workspaceMemberId: wsMemberId(w, ws.owner),
        });
      }

      // cards
      for (let k = 0; k < CARDS_PER_BOARD; k++) {
        const cardId = detUuid(`card:${w}:${b}:${k}`);
        const colId = columnIds[k % columnIds.length];
        const creator = ws.members[k % ws.members.length];
        const assignee = ws.members[(k + 1) % ws.members.length];
        const title = CARD_TITLES[(b * CARDS_PER_BOARD + k) % CARD_TITLES.length];
        const completed = k % columnIds.length === columnIds.length - 1;

        cardRows.push({
          id: cardId,
          workspaceId: wid,
          boardId,
          columnId: colId,
          title,
          description: doc(`Details for "${title}".`),
          descriptionText: `Details for "${title}".`,
          dueDate: daysFromNow((k % 14) - 3),
          priority: PRIORITIES[k % PRIORITIES.length],
          isCompleted: completed,
          progress: (completed ? 100 : (k % 10) * 10).toFixed(2),
          isPrivate: false,
          position: pos(k + 1),
          createdBy: userId(creator),
        });

        // 1 label per card
        cardLabelRows.push({
          id: detUuid(`cardlabel:${w}:${b}:${k}`),
          workspaceId: wid,
          cardId,
          labelId: detUuid(`label:${w}:${k % LABELS.length}`),
        });

        // 1 member assignee per card
        assigneeRows.push({
          id: detUuid(`assignee:${w}:${b}:${k}`),
          workspaceId: wid,
          cardId,
          assigneeType: 'member',
          boardMemberId: boardMemberId(w, b, assignee),
          assignedBy: userId(creator),
        });

        // 2 comments per card
        for (let cm = 0; cm < 2; cm++) {
          const commenter = ws.members[(k + cm) % ws.members.length];
          commentRows.push({
            id: detUuid(`comment:${w}:${b}:${k}:${cm}`),
            workspaceId: wid,
            cardId,
            workspaceMemberId: wsMemberId(w, commenter),
            content: doc(`Comment ${cm + 1} on "${title}".`),
            contentText: `Comment ${cm + 1} on "${title}".`,
          });
        }

        // 1 checklist + 3 items per card
        const checklistId = detUuid(`checklist:${w}:${b}:${k}`);
        checklistRows.push({
          id: checklistId,
          workspaceId: wid,
          cardId,
          title: 'Subtasks',
          position: pos(1),
          createdBy: userId(creator),
        });
        for (let it = 0; it < 3; it++) {
          checklistItemRows.push({
            id: detUuid(`clitem:${w}:${b}:${k}:${it}`),
            workspaceId: wid,
            checklistId,
            title: `Step ${it + 1}`,
            isCompleted: it === 0,
            position: pos(it + 1),
            completedBy: it === 0 ? userId(creator) : null,
            completedAt: it === 0 ? daysFromNow(-1) : null,
          });
        }

        // attachment on every 3rd card
        if (k % 3 === 0) {
          attachmentRows.push({
            id: detUuid(`attach:${w}:${b}:${k}`),
            workspaceId: wid,
            cardId,
            uploadedBy: userId(creator),
            fileName: `spec-${k}.pdf`,
            fileUrl: `https://files.bento.test/${w}/${b}/${k}.pdf`,
            storageKey: `ws/${w}/board/${b}/card/${k}/spec.pdf`,
            mimeType: 'application/pdf',
            size: BigInt(10240 + k * 512),
          });
        }

        // mention on first card of each board
        if (k === 0) {
          mentionRows.push({
            id: detUuid(`mention:${w}:${b}`),
            workspaceId: wid,
            mentionedUserId: userId(assignee),
            mentionedBy: userId(creator),
            cardId,
          });
        }
      }

      // each member watches the first board of their workspace
      if (b === 0) {
        ws.members.forEach((u) => {
          watcherRows.push({
            id: detUuid(`watch:${w}:${b}:${u}`),
            workspaceId: wid,
            workspaceMemberId: wsMemberId(w, u),
            watchableId: boardId,
            watchableType: 'board',
          });
        });
      }
    });
  }

  // FK-safe insert order
  await insertBatch(workspaces, wsRows);
  await insertBatch(workspaceRoles, wsRoleRows);
  await insertBatch(workspaceMembers, memberRows);
  await insertBatch(teams, teamRows);
  await insertBatch(teamMembers, teamMemberRows);
  await insertBatch(boards, boardRows);
  await insertBatch(boardColumns, columnRows);
  await insertBatch(boardMembers, boardMemberRows);
  await insertBatch(boardFavorites, favoriteRows);
  await insertBatch(labels, labelRows);
  await insertBatch(cards, cardRows);
  await insertBatch(cardLabels, cardLabelRows);
  await insertBatch(cardAssignees, assigneeRows);
  await insertBatch(cardComments, commentRows);
  await insertBatch(cardChecklists, checklistRows);
  await insertBatch(cardChecklistItems, checklistItemRows);
  await insertBatch(cardAttachments, attachmentRows);
  await insertBatch(mentions, mentionRows);
  await insertBatch(watchers, watcherRows);

  console.log('✅ Workspace service seeded:');
  console.table({
    workspaces: wsRows.length,
    workspaceRoles: wsRoleRows.length,
    members: memberRows.length,
    teams: teamRows.length,
    teamMembers: teamMemberRows.length,
    boards: boardRows.length,
    columns: columnRows.length,
    boardMembers: boardMemberRows.length,
    labels: labelRows.length,
    cards: cardRows.length,
    cardLabels: cardLabelRows.length,
    assignees: assigneeRows.length,
    comments: commentRows.length,
    checklists: checklistRows.length,
    checklistItems: checklistItemRows.length,
    attachments: attachmentRows.length,
    mentions: mentionRows.length,
    watchers: watcherRows.length,
  });
}

void seedWorkspace()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Workspace seed failed');
    console.error(error);
    process.exit(1);
  });
