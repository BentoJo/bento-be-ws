import { Controller } from '@nestjs/common';
import { GrpcMethod, Payload } from '@nestjs/microservices';
import { GrpcUser } from '../../../shared/decorators/meta.decorator';
import { CreateBoardService } from './services/create.board.service';
import { GetBoardService } from './services/get.board.service';
import { UpdateBoardService } from './services/update.board.service';
import { DeleteBoardService } from './services/delete.board.service';
import { RestoreBoardService } from './services/restore.board.service';
import { FavoriteBoardService } from './services/favorite.board.service';
import { UnfavoriteBoardService } from './services/unfavorite.board.service';
import { ArchiveBoardService } from './services/archive.board.service';
import { UnarchiveBoardService } from './services/unarchive.board.service';
import { ListFavoriteBoardsService } from './services/list-favorite-boards.service';
import { ListBoardsService } from './services/list.board.service';
import type {
  CreateBoardRequest,
  DeleteBoardRequest,
  ArchiveBoardRequest,
  UnarchiveBoardRequest,
  GetBoardRequest,
  FavoriteBoardRequest,
  ListBoardsRequest,
  ListBoardsResponse,
  ListFavoriteBoardsRequest,
  ListFavoriteBoardsResponse,
  UpdateBoardRequest,
  BoardResponse,
  RestoreBoardRequest,
  UnfavoriteBoardRequest,
} from './types';
import type { ActionResponse } from '../../../shared/types/genereal';

@Controller()
export class BoardController {
  constructor(
    private readonly createBoardService: CreateBoardService,
    private readonly getBoardService: GetBoardService,
    private readonly updateBoardService: UpdateBoardService,
    private readonly deleteBoardService: DeleteBoardService,
    private readonly restoreBoardService: RestoreBoardService,
    private readonly favoriteBoardService: FavoriteBoardService,
    private readonly unfavoriteBoardService: UnfavoriteBoardService,
    private readonly archiveBoardService: ArchiveBoardService,
    private readonly unarchiveBoardService: UnarchiveBoardService,
    private readonly listFavoriteBoardsService: ListFavoriteBoardsService,
    private readonly listBoardsService: ListBoardsService,
  ) {}

  @GrpcMethod('BoardService', 'CreateBoard')
  createBoard(
    @Payload() data: CreateBoardRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<BoardResponse> {
    console.log(
      'Received CreateBoard request with data:',
      data,
      'and user:',
      user,
    );
    return this.createBoardService.createBoard(data, user);
  }

  @GrpcMethod('BoardService', 'GetBoard')
  getBoard(
    @Payload() data: GetBoardRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<BoardResponse> {
    return this.getBoardService.getBoard(data, user);
  }

  @GrpcMethod('BoardService', 'UpdateBoard')
  updateBoard(
    @Payload() data: UpdateBoardRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<BoardResponse> {
    return this.updateBoardService.updateBoard(data, user);
  }

  @GrpcMethod('BoardService', 'DeleteBoard')
  deleteBoard(
    @Payload() data: DeleteBoardRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ActionResponse> {
    return this.deleteBoardService.deleteBoard(data, user);
  }

  @GrpcMethod('BoardService', 'RestoreBoard')
  restoreBoard(
    @Payload() data: RestoreBoardRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ActionResponse> {
    return this.restoreBoardService.restoreBoard(data, user);
  }

  @GrpcMethod('BoardService', 'FavoriteBoard')
  favoriteBoard(
    @Payload() data: FavoriteBoardRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ActionResponse> {
    return this.favoriteBoardService.favoriteBoard(data, user);
  }

  @GrpcMethod('BoardService', 'UnfavoriteBoard')
  unfavoriteBoard(
    @Payload() data: UnfavoriteBoardRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ActionResponse> {
    return this.unfavoriteBoardService.unfavoriteBoard(data, user);
  }

  @GrpcMethod('BoardService', 'ArchiveBoard')
  archiveBoard(
    @Payload() data: ArchiveBoardRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ActionResponse> {
    return this.archiveBoardService.archiveBoard(data, user);
  }

  @GrpcMethod('BoardService', 'UnarchiveBoard')
  unarchiveBoard(
    @Payload() data: UnarchiveBoardRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ActionResponse> {
    return this.unarchiveBoardService.unarchiveBoard(data, user);
  }

  @GrpcMethod('BoardService', 'ListFavoriteBoards')
  listFavoriteBoards(
    @Payload() data: ListFavoriteBoardsRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ListFavoriteBoardsResponse> {
    return this.listFavoriteBoardsService.listFavoriteBoards(data, user);
  }

  @GrpcMethod('BoardService', 'ListWorkspaceBoards')
  listBoards(
    @Payload() data: ListBoardsRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ListBoardsResponse> {
    return this.listBoardsService.listBoards(data, user);
  }
}
