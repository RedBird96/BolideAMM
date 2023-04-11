import { Injectable } from '@nestjs/common';
import { isEmail, isUUID } from 'class-validator';
import { omit } from 'lodash';
import { ACCOUNT_ROLES } from 'src/common/constants/account-roles';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { ORDER } from 'src/common/constants/order';
import { PageMetaDto } from 'src/common/dto/PageMetaDto';
import type { SuccessDto } from 'src/common/dto/SuccessDto';
import type { PageOptions } from 'src/common/interfaces/PageOptions';
import { LogicException } from 'src/common/logic.exception';
import { getSkip } from 'src/common/utils/get-skip';
import type {
  DeleteResult,
  FindConditions,
  FindManyOptions,
  ObjectID,
} from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import type { AccountEntity } from './account.entity';
import { AccountsRepository } from './accounts.repository';
import { AccountsPageDto } from './dto/AccountsPageDto';

export interface CreateAccountData {
  name: string;
  password: string;
  code: string;
  telegram?: string;
  email?: string;
}

interface UpdateAccountData {
  name?: string;
  password?: string;
  code?: string;
  telegram?: string;
  email?: string;
}

interface GetAllOoptions {
  search?: string;
  isChatBlockedByUser?: boolean;
}

interface AccountsPageOptions extends PageOptions {
  roles?: ACCOUNT_ROLES[];
  name?: string;
  email?: string;
  isActive?: boolean;
  isRegComplite?: boolean;
  tariffId?: number;
  search?: string;
  isShowOpenedOrdersCount?: boolean;
  order?: ORDER;
  orderField?: string;
  page: number;
  take: number;
}

@Injectable()
export class AccountsService {
  constructor(public readonly accountsRepository: AccountsRepository) {}

  async findOne(query: { id: string }): Promise<AccountEntity | undefined> {
    return this.accountsRepository.findOne(query);
  }

  async find(
    query: FindManyOptions<AccountEntity>,
  ): Promise<AccountEntity[] | undefined> {
    return this.accountsRepository.find({ ...query });
  }

  async findOneAndCheckExist(
    findData: FindConditions<AccountEntity>,
  ): Promise<AccountEntity> {
    if (typeof findData === 'number') {
      throw new LogicException(ERROR_CODES.NOT_FOUND_ACCOUNT);
    }

    const account = await this.accountsRepository.findOne(findData);

    if (!account) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_ACCOUNT);
    }

    return account;
  }

  findByNameOrEmail(
    options: Partial<{ name: string; email: string }>,
  ): Promise<AccountEntity | undefined> {
    const queryBuilder = this.accountsRepository.createQueryBuilder('account');

    if (options.email) {
      queryBuilder.orWhere('account.email = :email', {
        email: options.email,
      });
    }

    if (options.name) {
      queryBuilder.orWhere('account.name = :name', {
        name: options.name,
      });
    }

    return queryBuilder.getOne();
  }

  async createAccount(data: CreateAccountData): Promise<AccountEntity> {
    const account = this.accountsRepository.create({
      ...data,
    });

    return this.accountsRepository.save(account);
  }

  async setRole(data: {
    id: string;
    role: ACCOUNT_ROLES;
  }): Promise<SuccessDto> {
    await this.accountsRepository.update(data.id, {
      role: data.role,
    });

    return { message: 'role was updated' };
  }

  async getListAll(
    data: GetAllOoptions,
    roles: ACCOUNT_ROLES[],
  ): Promise<AccountsPageDto> {
    const order = ORDER.ASC;
    const orderField = 'email';
    const page = 1;
    const isActive = true;

    return this.getAccounts({
      roles,
      take: 100,
      order,
      orderField,
      page,
      isActive,
      ...data,
    });
  }

  async getAccounts(
    pageOptionsDto: AccountsPageOptions,
  ): Promise<AccountsPageDto> {
    const queryBuilder = this.accountsRepository.createQueryBuilder('account');

    const where: any = omit(pageOptionsDto, [
      'skip',
      'take',
      'order',
      'page',
      'orderField',
      'search',
      'roles',
    ]);

    const {
      search,
      order = ORDER.ASC,
      orderField = 'id',
      roles,
      page,
      take,
    } = pageOptionsDto;

    const orderBy: any = {};

    orderBy[`account.${orderField}`] = order;

    if (search) {
      if (isUUID(search)) {
        where.id = search;
      } else if (isEmail(search)) {
        where.email = search;
      }
    }

    queryBuilder.where(where);

    if (search && !isUUID(search) && !isEmail(search)) {
      queryBuilder.andWhere(
        `(account.email LIKE '%${search}%' OR account.name LIKE '%${search}%')`,
      );
    }

    if (roles) {
      queryBuilder.andWhere('account.role IN (:...roles)', {
        roles,
      });
    }

    const [accounts, accountsCount] = await queryBuilder
      .orderBy(orderBy)
      .skip(getSkip(page, take))
      .take(take)
      .getManyAndCount();

    const pageMetaDto = new PageMetaDto({
      pageOptionsDto,
      itemCount: accountsCount,
    });

    const dtos = [];

    for (const item of accounts) {
      dtos.push(item.toDto());
    }

    return new AccountsPageDto(dtos, pageMetaDto);
  }

  async createOrUpdateAccounts(
    accounts: UpdateAccountData[],
  ): Promise<AccountEntity[]> {
    const results: any[] = [];

    for (const account of accounts) {
      const exist = await this.accountsRepository.findOne({
        email: account.email,
      });

      if (!exist) {
        const insertResult = await this.accountsRepository.insert(account);

        results.push(insertResult.raw[0]);
      } else {
        results.push(
          await this.accountsRepository.save({
            ...exist,
            ...omit(account, ['password']),
          }),
        );
      }
    }

    return results;
  }

  async isAdmin(accountId: string): Promise<boolean> {
    const account = await this.accountsRepository.findOne(accountId);

    if (!account) {
      return false;
    }

    return account && account.role === ACCOUNT_ROLES.ADMIN;
  }

  async deleteAccount(id: string): Promise<DeleteResult> {
    return this.accountsRepository.delete({ id });
  }

  async updatePassword(data: {
    id: string;
    password: string;
  }): Promise<AccountEntity> {
    await this.accountsRepository.save(data);

    return this.accountsRepository.findOne({ id: data.id });
  }

  async getAdminAccount(): Promise<AccountEntity> {
    return this.accountsRepository.getAdminAccount();
  }

  async setTelegramBotOwner(telegramId: string): Promise<void> {
    const adminAccount = await this.accountsRepository.findOne({
      role: ACCOUNT_ROLES.ADMIN,
    });

    const foundByTgAcc = await this.accountsRepository.findOne({
      telegramId,
    });

    if (foundByTgAcc) {
      await this.accountsRepository.delete({ telegramId });
    }

    await this.accountsRepository.update(
      {
        id: adminAccount.id,
      },
      {
        telegramId,
      },
    );
  }

  async update(
    criteria:
      | string
      | string[]
      | number
      | number[]
      | Date
      | Date[]
      | ObjectID
      | ObjectID[]
      | FindConditions<AccountEntity>,
    partialEntity: QueryDeepPartialEntity<AccountEntity>,
  ): Promise<AccountEntity> {
    await this.accountsRepository.update(criteria, partialEntity);

    return this.accountsRepository.findOne(criteria as any);
  }
}
