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
} from './shared/db/modules/cards';

/* =====================================================================
   SHARED CONTRACT — IDENTICAL across iam / authz / ws seeds.
   Do NOT change ids/keys/names. (Pasted verbatim.)
===================================================================== */
import { createHash } from 'node:crypto';
export function detUuid(name: string): string {
  const h = createHash('sha1').update(`bento:${name}`).digest('hex');
  const variant = ((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0');
  return [h.slice(0,8), h.slice(8,12), '4'+h.slice(13,16), variant+h.slice(18,20), h.slice(20,32)].join('-');
}
const REAL_USER = { key: 'me', id: 'b2fcf3fe-8b7c-44b3-9552-e51ae0ab35dc' };
const USERS = [
  REAL_USER,
  ...['omar','lina','yousef','sara','khaled','nour'].map(k => ({ key: k, id: detUuid(`user:${k}`) })),
];
const uid = (key: string) => USERS.find(u => u.key === key)!.id;
const WORKSPACES = [
  { key: 'acme',  name: 'Acme Product', ownerKey: 'me'   },
  { key: 'nova',  name: 'Nova Labs',    ownerKey: 'omar' },
  { key: 'orbit', name: 'Orbit Studio', ownerKey: 'me'   },
].map(w => ({ ...w, id: detUuid(`ws:${w.key}`) }));
const wsId = (key: string) => WORKSPACES.find(w => w.key === key)!.id;
// wsKey -> [userKey, role]
const MEMBERSHIPS: Record<string, [string, string][]> = {
  acme:  [['me','OWNER'],['omar','ADMIN'],['lina','EDITOR'],['sara','EDITOR'],['yousef','VIEWER'],['nour','VIEWER']],
  nova:  [['omar','OWNER'],['me','ADMIN'],['yousef','EDITOR'],['khaled','VIEWER']],
  orbit: [['me','OWNER'],['lina','ADMIN'],['sara','EDITOR'],['nour','VIEWER']],
};
const wsRoleId = (workspaceId: string, role: string) => detUuid(`role:${workspaceId}:${role}`);   // authz roles.id (already created by authz seed)
const memberRowId = (workspaceId: string, userKey: string) => detUuid(`member:${workspaceId}:${userKey}`); // workspace_members.id

/* =====================================================================
   WS-LOCAL DETERMINISTIC IDS (only this service inserts these rows)
===================================================================== */

const ROLE_NAMES = ['OWNER', 'ADMIN', 'EDITOR', 'VIEWER'] as const;
const wsRoleRowId = (workspaceId: string, role: string) =>
  detUuid(`wsrole:${workspaceId}:${role}`); // workspace_roles.id
const teamRowId = (workspaceId: string, teamKey: string) =>
  detUuid(`team:${workspaceId}:${teamKey}`); // teams.id
const boardRowId = (workspaceId: string, n: number) =>
  detUuid(`board:${workspaceId}:${n}`); // boards.id
const colRowId = (boardId: string, n: number) => detUuid(`col:${boardId}:${n}`); // board_columns.id
const boardMemberRowId = (boardId: string, userKey: string) =>
  detUuid(`bmember:${boardId}:${userKey}`); // board_members.id
const labelRowId = (workspaceId: string, n: number) =>
  detUuid(`label:${workspaceId}:${n}`); // labels.id
const cardRowId = (columnId: string, n: number) =>
  detUuid(`card:${columnId}:${n}`); // cards.id

/* =====================================================================
   STATIC DATA
===================================================================== */

const TEAMS = [
  { key: 'design', name: 'Design', icon: '🎨' },
  { key: 'engineering', name: 'Engineering', icon: '🛠️' },
];
const BOARD_NAMES = ['Roadmap', 'Sprint Board', 'Bugs & Support'];
const COLUMNS = ['Backlog', 'To Do', 'In Progress', 'Done'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
const LABELS = [
  { name: 'UI/UX', icon: '🎨', type: 'default' as const },
  { name: 'Bug', icon: '🐛', type: 'bug' as const },
  { name: 'Feature', icon: '✨', type: 'feature' as const },
  { name: 'High Priority', icon: '🔥', type: 'enhancement' as const },
];
const CARD_TITLES = [
  'Set up CI pipeline', 'Design onboarding flow', 'Fix login redirect bug',
  'Write API docs', 'Optimize DB queries', 'Add dark mode', 'Refactor auth module',
  'Implement search', 'Update dependencies', 'Improve test coverage',
  'Add rate limiting', 'Build settings page', 'Migrate to new schema',
];

const CARDS_PER_BOARD = 9;
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
  if (rows.length === 0) return;
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

  for (const ws of WORKSPACES) {
    const wid = ws.id;
    const ownerId = uid(ws.ownerKey);
    const members = MEMBERSHIPS[ws.key]; // [userKey, role][]
    const memberKeys = members.map(([k]) => k);

    // 1) workspace
    wsRows.push({
      id: wid,
      name: ws.name,
      logoUrl: null,
      ownerUserId: ownerId,
      createdBy: ownerId,
    });

    // 2) workspace_roles — one per role name, references authz roles.id
    for (const role of ROLE_NAMES) {
      wsRoleRows.push({
        id: wsRoleRowId(wid, role),
        workspaceId: wid,
        authzRoleId: wsRoleId(wid, role),
        isSystem: true,
        createdBy: ownerId,
      });
    }

    // 3) workspace_members — canonical member rows (everything references these)
    for (const [userKey, role] of members) {
      memberRows.push({
        id: memberRowId(wid, userKey), // workspace_members.id
        workspaceId: wid,
        userId: uid(userKey),
        authzRoleId: wsRoleId(wid, role),
        isActive: true,
      });
    }

    // 4) teams — 2 per workspace
    TEAMS.forEach((team) => {
      const teamId = teamRowId(wid, team.key);
      teamRows.push({
        id: teamId,
        workspaceId: wid,
        name: team.name,
        description: `${team.name} team for ${ws.name}.`,
        icon: team.icon,
        createdBy: ownerId,
      });

      // 5) team_members — ~3 members per team, round-robin over this ws's members.
      // CRITICAL: workspace_member_id MUST be workspace_members.id (memberRowId),
      // not a user id. Only members that exist in THIS workspace are used.
      const teamIdx = TEAMS.findIndex((t) => t.key === team.key);
      memberKeys
        .filter((_, n) => n % TEAMS.length === teamIdx)
        .forEach((userKey) => {
          teamMemberRows.push({
            id: detUuid(`teammember:${teamId}:${userKey}`),
            workspaceId: wid,
            teamId,
            workspaceMemberId: memberRowId(wid, userKey), // -> workspace_members.id
          });
        });
    });

    // 9) labels — a few per workspace
    LABELS.forEach((lb, l) => {
      labelRows.push({
        id: labelRowId(wid, l),
        workspaceId: wid,
        name: lb.name,
        icon: lb.icon,
        type: lb.type,
        createdBy: ownerId,
      });
    });

    // 6) boards — 3 per workspace
    BOARD_NAMES.forEach((bname, b) => {
      const boardId = boardRowId(wid, b);
      boardRows.push({
        id: boardId,
        workspaceId: wid,
        name: bname,
        icon: '📋',
        visibility: b === 2 ? 'private' : 'public',
        createdBy: ownerId,
      });

      // 7) board_columns — 4 per board, position 0..3
      const columnIds = COLUMNS.map((cname, c) => {
        const colId = colRowId(boardId, c);
        columnRows.push({
          id: colId,
          workspaceId: wid,
          boardId,
          name: cname,
          position: pos(c),
        });
        return colId;
      });

      // 8) board_members — all ws members are members of each board.
      // workspace_member_id -> workspace_members.id (memberRowId).
      memberKeys.forEach((userKey) => {
        boardMemberRows.push({
          id: boardMemberRowId(boardId, userKey), // board_members.id
          workspaceId: wid,
          boardId,
          workspaceMemberId: memberRowId(wid, userKey), // -> workspace_members.id
        });
      });

      // owner favorites the first board (workspace_member_id -> workspace_members.id)
      if (b === 0) {
        favoriteRows.push({
          id: detUuid(`fav:${boardId}:${ws.ownerKey}`),
          workspaceId: wid,
          boardId,
          workspaceMemberId: memberRowId(wid, ws.ownerKey),
        });
      }

      // 10) cards — spread across columns
      for (let k = 0; k < CARDS_PER_BOARD; k++) {
        const colId = columnIds[k % columnIds.length];
        const cardId = cardRowId(colId, k);
        const creatorKey = memberKeys[k % memberKeys.length];
        const assigneeKey = memberKeys[(k + 1) % memberKeys.length];
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
          createdBy: uid(creatorKey), // bare user id (no FK)
        });

        // 12) card_labels — 1-2 labels per card
        const labelCount = 1 + (k % 2);
        for (let li = 0; li < labelCount; li++) {
          const labelIdx = (k + li) % LABELS.length;
          cardLabelRows.push({
            id: detUuid(`cardlabel:${cardId}:${labelIdx}`),
            workspaceId: wid,
            cardId,
            labelId: labelRowId(wid, labelIdx),
          });
        }

        // 11) card_assignees — assign 1-2 board members per card.
        // assigneeType 'member' -> board_member_id references board_members.id.
        const assigneeKeys = [assigneeKey];
        if (k % 3 === 0) {
          const second = memberKeys[(k + 2) % memberKeys.length];
          if (second !== assigneeKey) assigneeKeys.push(second);
        }
        assigneeKeys.forEach((aKey) => {
          assigneeRows.push({
            id: detUuid(`assignee:${cardId}:${aKey}`),
            workspaceId: wid,
            cardId,
            assigneeType: 'member',
            boardMemberId: boardMemberRowId(boardId, aKey), // -> board_members.id
            teamId: null,
            assignedBy: uid(creatorKey), // bare user id (no FK)
          });
        });

        // 13) card_comments — 1-2 per some cards.
        // author workspace_member_id -> workspace_members.id (memberRowId).
        if (k % 2 === 0) {
          const commentCount = 1 + (k % 2 === 0 ? (k % 4 === 0 ? 1 : 0) : 0);
          for (let cm = 0; cm < commentCount; cm++) {
            const commenterKey = memberKeys[(k + cm) % memberKeys.length];
            commentRows.push({
              id: detUuid(`comment:${cardId}:${cm}`),
              workspaceId: wid,
              cardId,
              workspaceMemberId: memberRowId(wid, commenterKey), // -> workspace_members.id
              content: doc(`Comment ${cm + 1} on "${title}".`),
              contentText: `Comment ${cm + 1} on "${title}".`,
            });
          }
        }

        // 14) card_checklists + items — 1 checklist w/ 3-4 items on some cards.
        if (k % 2 === 0) {
          const checklistId = detUuid(`checklist:${cardId}`);
          checklistRows.push({
            id: checklistId,
            workspaceId: wid,
            cardId,
            title: 'Subtasks',
            position: pos(1),
            createdBy: uid(creatorKey), // bare user id (no FK)
          });
          const itemCount = 3 + (k % 2);
          for (let it = 0; it < itemCount; it++) {
            checklistItemRows.push({
              id: detUuid(`clitem:${checklistId}:${it}`),
              workspaceId: wid,
              checklistId,
              title: `Step ${it + 1}`,
              isCompleted: it === 0,
              position: pos(it + 1),
              completedBy: it === 0 ? uid(creatorKey) : null, // bare user id (no FK)
              completedAt: it === 0 ? daysFromNow(-1) : null,
            });
          }
        }
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
    favorites: favoriteRows.length,
    labels: labelRows.length,
    cards: cardRows.length,
    cardLabels: cardLabelRows.length,
    assignees: assigneeRows.length,
    comments: commentRows.length,
    checklists: checklistRows.length,
    checklistItems: checklistItemRows.length,
  });
}

void seedWorkspace()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Workspace seed failed');
    console.error(error);
    process.exit(1);
  });
