import { Module } from '@nestjs/common';
import { AuthzModule } from '../authz/authz.module';
import { BoardFuncs } from '../../shared/func/board';
import { CardFuncs } from '../../shared/func/card';
import { WorkspaceFuncs } from '../../shared/func/workspace';
import { WorkspaceMembersFuncs } from '../../shared/func/workspace-members';
import { CardsController } from './cards.controller';
import { CreateCardService } from './services/create.card.service';
import { GetCardService } from './services/get.card.service';
import { UpdateCardService } from './services/update.card.service';
import { DeleteCardService } from './services/delete.card.service';
import { RestoreCardService } from './services/restore.card.service';
import { ArchiveCardService } from './services/archive.card.service';
import { MoveCardService } from './services/move.card.service';
import { ListCardsService } from './services/list.cards.service';
import { AssigneesCardService } from './services/assignees.card.service';
import { LabelsCardService } from './services/labels.card.service';
import { CommentsCardService } from './services/comments.card.service';
import { ChecklistsCardService } from './services/checklists.card.service';
import { CommonFuncs } from '../../shared/func/common';

@Module({
  imports: [AuthzModule],
  controllers: [CardsController],
  providers: [
    BoardFuncs,
    CardFuncs,
    WorkspaceFuncs,
    CommonFuncs,
    WorkspaceMembersFuncs,
    CreateCardService,
    GetCardService,
    UpdateCardService,
    DeleteCardService,
    RestoreCardService,
    ArchiveCardService,
    MoveCardService,
    ListCardsService,
    AssigneesCardService,
    LabelsCardService,
    CommentsCardService,
    ChecklistsCardService,
  ],
  exports: [
    CardFuncs,
    CreateCardService,
    GetCardService,
    UpdateCardService,
    DeleteCardService,
    RestoreCardService,
    ArchiveCardService,
    MoveCardService,
    ListCardsService,
    AssigneesCardService,
    LabelsCardService,
    CommentsCardService,
    ChecklistsCardService,
  ],
})
export class CardsModule {}
