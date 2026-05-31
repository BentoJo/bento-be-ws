import { Module } from '@nestjs/common';
import { AuthzModule } from '../../authz/authz.module';
import { BoardFuncs } from '../../../shared/func/board';
import { WorkspaceFuncs } from '../../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../../shared/func/workspace-members';
import { BoardController } from './board.controller';
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

@Module({
  imports: [AuthzModule],
  controllers: [BoardController],
  providers: [
    BoardFuncs,
    WorkspaceFuncs,
    WorkspaceMembersFuncs,
    CreateBoardService,
    GetBoardService,
    UpdateBoardService,
    DeleteBoardService,
    RestoreBoardService,
    FavoriteBoardService,
    UnfavoriteBoardService,
    ArchiveBoardService,
    UnarchiveBoardService,
    ListFavoriteBoardsService,
    ListBoardsService,
  ],
  exports: [
    BoardFuncs,
    WorkspaceFuncs,
    WorkspaceMembersFuncs,
    CreateBoardService,
    GetBoardService,
    UpdateBoardService,
    DeleteBoardService,
    RestoreBoardService,
    FavoriteBoardService,
    UnfavoriteBoardService,
    ArchiveBoardService,
    UnarchiveBoardService,
    ListFavoriteBoardsService,
    ListBoardsService,
  ],
})
export class BoardModule {}
