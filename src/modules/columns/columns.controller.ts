import { Controller } from '@nestjs/common';
import { GrpcMethod, Payload } from '@nestjs/microservices';
import { GrpcUser } from '../../shared/decorators/meta.decorator';
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
import type {
  CreateColumnRequest,
  GetColumnRequest,
  UpdateColumnRequest,
  DeleteColumnRequest,
  RestoreColumnRequest,
  ArchiveColumnRequest,
  UnarchiveColumnRequest,
  ListBoardColumnsRequest,
  ListBoardColumnsResponse,
  ReorderColumnRequest,
  BulkReorderColumnsRequest,
  WatchColumnRequest,
  UnwatchColumnRequest,
  ListColumnWatchersRequest,
  ListColumnWatchersResponse,
  ListColumnCardsRequest,
  ListColumnCardsResponse,
  MoveCardsBetweenColumnsRequest,
  ColumnResponse,
} from './types';
import type { ActionResponse } from '../../shared/types/genereal';

@Controller()
export class ColumnsController {
  constructor(
    private readonly createColumnService: CreateColumnService,
    private readonly getColumnService: GetColumnService,
    private readonly updateColumnService: UpdateColumnService,
    private readonly deleteColumnService: DeleteColumnService,
    private readonly restoreColumnService: RestoreColumnService,
    private readonly archiveColumnService: ArchiveColumnService,
    private readonly unarchiveColumnService: UnarchiveColumnService,
    private readonly listBoardColumnsService: ListBoardColumnsService,
    private readonly reorderColumnService: ReorderColumnService,
    private readonly bulkReorderColumnsService: BulkReorderColumnsService,
    private readonly watchColumnService: WatchColumnService,
    private readonly unwatchColumnService: UnwatchColumnService,
    private readonly listColumnWatchersService: ListColumnWatchersService,
    private readonly listColumnCardsService: ListColumnCardsService,
    private readonly moveCardsBetweenColumnsService: MoveCardsBetweenColumnsService,
  ) {}

  @GrpcMethod('ColumnService', 'CreateColumn')
  createColumn(
    @Payload() data: CreateColumnRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ColumnResponse> {
    return this.createColumnService.createColumn(data, user);
  }

  @GrpcMethod('ColumnService', 'GetColumn')
  getColumn(
    @Payload() data: GetColumnRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ColumnResponse> {
    return this.getColumnService.getColumn(data, user);
  }

  @GrpcMethod('ColumnService', 'UpdateColumn')
  updateColumn(
    @Payload() data: UpdateColumnRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ColumnResponse> {
    return this.updateColumnService.updateColumn(data, user);
  }

  @GrpcMethod('ColumnService', 'DeleteColumn')
  deleteColumn(
    @Payload() data: DeleteColumnRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ActionResponse> {
    return this.deleteColumnService.deleteColumn(data, user);
  }

  @GrpcMethod('ColumnService', 'RestoreColumn')
  restoreColumn(
    @Payload() data: RestoreColumnRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ActionResponse> {
    return this.restoreColumnService.restoreColumn(data, user);
  }

  @GrpcMethod('ColumnService', 'ArchiveColumn')
  archiveColumn(
    @Payload() data: ArchiveColumnRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ActionResponse> {
    return this.archiveColumnService.archiveColumn(data, user);
  }

  @GrpcMethod('ColumnService', 'UnarchiveColumn')
  unarchiveColumn(
    @Payload() data: UnarchiveColumnRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ActionResponse> {
    return this.unarchiveColumnService.unarchiveColumn(data, user);
  }

  @GrpcMethod('ColumnService', 'ListBoardColumns')
  listBoardColumns(
    @Payload() data: ListBoardColumnsRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ListBoardColumnsResponse> {
    return this.listBoardColumnsService.listBoardColumns(data, user);
  }

  @GrpcMethod('ColumnService', 'ReorderColumn')
  reorderColumn(
    @Payload() data: ReorderColumnRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ActionResponse> {
    return this.reorderColumnService.reorderColumn(data, user);
  }

  @GrpcMethod('ColumnService', 'BulkReorderColumns')
  bulkReorderColumns(
    @Payload() data: BulkReorderColumnsRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ActionResponse> {
    return this.bulkReorderColumnsService.bulkReorderColumns(data, user);
  }

  @GrpcMethod('ColumnService', 'WatchColumn')
  watchColumn(
    @Payload() data: WatchColumnRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ActionResponse> {
    return this.watchColumnService.watchColumn(data, user);
  }

  @GrpcMethod('ColumnService', 'UnwatchColumn')
  unwatchColumn(
    @Payload() data: UnwatchColumnRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ActionResponse> {
    return this.unwatchColumnService.unwatchColumn(data, user);
  }

  @GrpcMethod('ColumnService', 'ListColumnWatchers')
  listColumnWatchers(
    @Payload() data: ListColumnWatchersRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ListColumnWatchersResponse> {
    return this.listColumnWatchersService.listColumnWatchers(data, user);
  }

  @GrpcMethod('ColumnService', 'ListColumnCards')
  listColumnCards(
    @Payload() data: ListColumnCardsRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ListColumnCardsResponse> {
    return this.listColumnCardsService.listColumnCards(data, user);
  }

  @GrpcMethod('ColumnService', 'MoveCardsBetweenColumns')
  moveCardsBetweenColumns(
    @Payload() data: MoveCardsBetweenColumnsRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ActionResponse> {
    return this.moveCardsBetweenColumnsService.moveCardsBetweenColumns(
      data,
      user,
    );
  }
}
