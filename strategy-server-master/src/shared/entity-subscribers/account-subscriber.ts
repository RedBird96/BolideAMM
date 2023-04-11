import { AccountEntity } from 'src/modules/accounts/account.entity';
import { UtilsService } from 'src/providers/utils.service';
import type {
  EntitySubscriberInterface,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { EventSubscriber } from 'typeorm';

@EventSubscriber()
export class AccountSubscriber
  implements EntitySubscriberInterface<AccountEntity>
{
  listenTo(): any {
    return AccountEntity;
  }

  beforeInsert(event: InsertEvent<AccountEntity>): any {
    if (event.entity.password) {
      event.entity.password = UtilsService.generateHash(event.entity.password);
    }
  }

  beforeUpdate(event: UpdateEvent<AccountEntity>): any {
    if (
      event.databaseEntity &&
      event.entity.password !== event.databaseEntity.password
    ) {
      event.entity.password = UtilsService.generateHash(event.entity.password);
    }
  }
}
