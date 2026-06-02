import { Module } from '@nestjs/common';
import { AuthzModule } from '../authz/authz.module';
import { WorkspaceFuncs } from '../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../shared/func/workspace-members';
import { BoardFuncs } from '../../shared/func/board';
import { ColumnFuncs } from '../../shared/func/column';
import { WatcherFuncs } from '../../shared/func/watcher';
import { ColumnsController } from './columns.controller';
import { CreateColumnService } from './services/create.column.service';
import { GetColumnService } from './services/get.column.service';
import { UpdateColumnService } from './services/update.column.service';
import { DeleteColumnService } from './services/delete.column.service';
import { RestoreColumnService } from './services/restore.column.service';
import { ArchiveColumnService } from './services/archive.column.service';
import { UnarchiveColumnService } from './services/unarchive.column.service';
import { ListBoardColumnsService } from './services/list-board-columns.service';
import { ReorderColumnService } from './services/reorder.column.service';
import { BulkReorderColumnsService } from './services/bulk-reorder.column.service';
import { WatchColumnService } from './services/watch.column.service';
import { UnwatchColumnService } from './services/unwatch.column.service';
import { ListColumnWatchersService } from './services/list-column-watchers.service';
import { ListColumnCardsService } from './services/list-column-cards.service';
import { MoveCardsBetweenColumnsService } from './services/move-cards-between-columns.service';

@Module({
  imports: [AuthzModule],
  controllers: [ColumnsController],
  providers: [
    WorkspaceFuncs,
    WorkspaceMembersFuncs,
    BoardFuncs,
    ColumnFuncs,
    WatcherFuncs,
    CreateColumnService,
    GetColumnService,
    UpdateColumnService,
    DeleteColumnService,
    RestoreColumnService,
    ArchiveColumnService,
    UnarchiveColumnService,
    ListBoardColumnsService,
    ReorderColumnService,
    BulkReorderColumnsService,
    WatchColumnService,
    UnwatchColumnService,
    ListColumnWatchersService,
    ListColumnCardsService,
    MoveCardsBetweenColumnsService,
  ],
  exports: [
    WorkspaceFuncs,
    WorkspaceMembersFuncs,
    BoardFuncs,
    ColumnFuncs,
    WatcherFuncs,
    CreateColumnService,
    GetColumnService,
    UpdateColumnService,
    DeleteColumnService,
    RestoreColumnService,
    ArchiveColumnService,
    UnarchiveColumnService,
    ListBoardColumnsService,
    ReorderColumnService,
    BulkReorderColumnsService,
    WatchColumnService,
    UnwatchColumnService,
    ListColumnWatchersService,
    ListColumnCardsService,
    MoveCardsBetweenColumnsService,
  ],
})
export class ColumnsModule {}
