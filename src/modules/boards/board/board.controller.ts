import { Controller } from '@nestjs/common';
import { GrpcMethod, Payload } from '@nestjs/microservices';
import { GrpcUser } from '../../../shared/decorators/meta.decorator';
import { CreateBoardService } from './services/create.board.service';
import { GetBoardService } from './services/get.board.service';
import { UpdateBoardService } from './services/update.board.service';
import { DeleteBoardService } from './services/delete.board.service';
import { RestoreBoardService } from './services/restore.board.service';
import { ListBoardsService } from './services/list.board.service';
import type {
  CreateBoardRequest,
  DeleteBoardRequest,
  GetBoardRequest,
  ListBoardsRequest,
  ListBoardsResponse,
  UpdateBoardRequest,
  BoardResponse,
  RestoreBoardRequest,
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
    private readonly listBoardsService: ListBoardsService,
  ) {}

  @GrpcMethod('BoardService', 'CreateBoard')
  createBoard(
    @Payload() data: CreateBoardRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<BoardResponse> {
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

  @GrpcMethod('BoardService', 'ListWorkspaceBoards')
  listBoards(
    @Payload() data: ListBoardsRequest,
    @GrpcUser() user: GrpcUser,
  ): Promise<ListBoardsResponse> {
    return this.listBoardsService.listBoards(data, user);
  }
}
