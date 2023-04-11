import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import * as env from 'env-var';

import { AccountSubscriber } from '../entity-subscribers/account-subscriber';
import ormconfig from './ormconfig';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface BullQueuesConfig {
  lbfQueueName: string;
}

export interface TelegramConfig {
  token: string;
  url: string;
  botName: string;
  isTelegramBotEnabled: boolean;
}

export interface SlackConfig {
  restartNotifyWebhookUrl: string;
}

export class ConfigService {
  constructor() {
    dotenv.config({ path: `.${this.nodeEnv}.env` });

    // Replace \\n with \n to support multiline strings in AWS
    for (const envName of Object.keys(process.env)) {
      process.env[envName] = process.env[envName].replace(/\\n/g, '\n');
    }
  }

  getHostFromCookieDomain(cookieDomain: string): string {
    if (cookieDomain && cookieDomain[0] === '.') {
      return cookieDomain.slice(1);
    }

    return cookieDomain;
  }

  getKeyValue(name: string): string {
    return env.get(name).asString();
  }

  get isNotifyToSlackAfterStart(): boolean {
    return env
      .get('IS_NOTIFY_TO_SLACK_AFTER_START')
      .default('false')
      .asBoolStrict();
  }

  get isNotifyToSlackBrockenSettings(): boolean {
    return env
      .get('IS_NOTIFY_TO_SLACK_BROCKEN_SETTINGS')
      .default('false')
      .asBoolStrict();
  }

  get telegramConfig(): TelegramConfig {
    return {
      token: env.get('TELEGRAM_TOKEN').asString(),
      url: env
        .get('TELEGRAM_URL')
        .default('https://t.me/')
        .required()
        .asString(),
      botName: env.get('TELEGRAM_BOT_NAME').asString(),
      isTelegramBotEnabled: env
        .get('IS_TELEGRAM_BOT_ENABLED')
        .default('false')
        .asBoolStrict(),
    };
  }

  get slackConfig(): SlackConfig {
    return {
      restartNotifyWebhookUrl: env
        .get('RESTART_NOTIFY_WEBHOOK_URL')
        .default(
          'https://hooks.slack.com/services/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',
        )
        .asString(),
    };
  }

  get appPort(): number {
    return env.get('PORT').default(3000).asIntPositive();
  }

  get isShowDocs(): boolean {
    return env.get('IS_SHOW_DOCS').required().asBoolStrict();
  }

  get isUsePinoPrettyTransport(): boolean {
    return env
      .get('IS_USE_PINO_PRETTY_TRANSPORT')
      .default('false')
      .asBoolStrict();
  }

  get nodeEnv(): string {
    return env.get('NODE_ENV').default('development').required().asString();
  }

  get redis(): {
    url: string;
  } {
    return {
      url: env.get('REDIS_URL').required().asString(),
    };
  }

  get bullQConfig(): BullQueuesConfig {
    return {
      lbfQueueName: env.get('LBF_QUEUE_NAME').default('lbf-queue').asString(),
    };
  }

  get githash(): string {
    return env.get('GITHASH').required().asString();
  }

  get isMonitoringPairsCronEnabled(): boolean {
    return env
      .get('IS_MONITORING_PAIRS_CRON_ENABLED')
      .default('false')
      .required()
      .asBoolStrict();
  }

  get tokensRationChangePercentForReaction(): number {
    return env
      .get('TOKENS_RATION_CHANGE_PERCENT_FOR_REACTION')
      .default(5)
      .required()
      .asIntPositive();
  }

  get ethSettings() {
    return {
      blidAddress: env
        .get('ETH_BLID_ADDRESS')
        .default('0x8A7aDc1B690E81c758F1BD0F72DFe27Ae6eC56A5')
        .required()
        .asString(),

      privateSaleWallet: env
        .get('ETH_PRIVATE_SALE_WALLET')
        .default('0x68fade08bb93144eac5bab8e8262d957c1726b36')
        .required()
        .asString(),

      timelockMarketingContract: env
        .get('ETH_TIMELOCK_MARKETING_CONTRACT')
        .default('0xebd39539ac8bc8f4986c53aef8676d24e3e3a5a0')
        .required()
        .asString(),

      timelockMarketingRecipientWallet: env
        .get('ETH_TIMELOCK_RECIPIENT_WALLET')
        .default('0xcc27a1020F874baD6A5a740F224b9ad973541159')
        .required()
        .asString(),

      timelockIncentivesContract: env
        .get('ETH_TIMELOCK_INCENTIVES_CONTRACT')
        .default('0x036D131DDEA85e6ba256531376bE3d371BB9436B')
        .required()
        .asString(),

      timelockIncentivesRecipientWallet: env
        .get('ETH_TIMELOCK_INCENTIVES_RECIPIENT_WALLET')
        .default('0x2E095F3520C7B09110940A974eF3786CB4865444')
        .required()
        .asString(),

      timelockCompanyContract: env
        .get('ETH_TIMELOCK_COMPANY_CONTRACT')
        .default('0x1392210fb364faaafD87895aD8aAE3b49fb92fB3')
        .required()
        .asString(),

      timelockCompanyRecipientWallet: env
        .get('ETH_TIMELOCK_COMPANY_RECIPIENT_WALLET')
        .default('0x5d96e14801FD8760F03dAF094A532E4f242F870C')
        .required()
        .asString(),

      timelockTeamContractFirst: env
        .get('ETH_TIMELOCK_TEAM_CONTRACT_FIRST')
        .default('0xb281304be67381a68a91131d1f07bc1319476832')
        .required()
        .asString(),

      timelockTeamContractSecond: env
        .get('ETH_TIMELOCK_TEAM_CONTRACT_SECOND')
        .default('0x899a7b40b39cb92f389d2aa965f21c440ea3bf82')
        .required()
        .asString(),

      timelockTeamRecipientWalletFirst: env
        .get('ETH_TIMELOCK_RECIPIENT_WALLET_FIRST')
        .default('0xB4DC5B15Eb8Db344e64df2706F5BcB0ac88283f9')
        .required()
        .asString(),

      timelockTeamRecipientWalletSecond: env
        .get('ETH_TIMELOCK_RECIPIENT_WALLET_SECOND')
        .default('0x5d96e14801FD8760F03dAF094A532E4f242F870C')
        .required()
        .asString(),

      futureDaoWallet: env
        .get('ETH_FUTURE_DAO_WALLET')
        .default('0x8256477ef616b71992476e13c492ce94fee8b337')
        .required()
        .asString(),

      futurePrivateSalesWallet: env
        .get('ETH_FUTURE_PRIVATE_SALES_WALLET')
        .default('0x9bbd057269e1f76bc3551cdae16c7c5de67417db')
        .required()
        .asString(),
    };
  }

  get logLevel(): string {
    return env.get('LOG_LEVEL').default('debug').asString();
  }

  get accessTokenCookieName(): string {
    return env
      .get('ACCESS_TOKEN_COOKIE_NAME')
      .default('accessToken')
      .required()
      .asString();
  }

  getCookieDomain(): string {
    return env
      .get('STRATEGY_SERVER_COOKIE_DOMAIN')
      .default('localhost')
      .required()
      .asString();
  }

  get cookieMaxAge(): number {
    return env
      .get('COOKIE_MAX_AGE')
      .default(86_400_000)
      .required()
      .asIntPositive();
  }

  get jwt() {
    return {
      expirationTime: 1_231_323, // 'JWT_EXPIRATION_TIME',
      secretKey: 'JWT_SECRET_KEY',
    };
  }

  get rollbar() {
    return {
      token: env.get('ROLLBAR_TOKEN').default('').asString(),
    };
  }

  get isUseVault(): boolean {
    return env.get('IS_USE_VAULT').default('false').asBoolStrict();
  }

  get vault(): {
    tokenPath: string;
    secretsPath: string;
    addr: string;
  } {
    return {
      tokenPath: env.get('VAULT_TOKEN_PATH').default('').asString(),
      secretsPath: env.get('VAULT_SECRETS_PATH').default('').asString(),
      addr: env.get('VAULT_ADDR').default('').asString(),
    };
  }

  get admin() {
    return {
      email: env.get('ADMIN_EMAIL').required().asString(),
      password: env.get('ADMIN_PASSWORD').required().asString(),
      name: env.get('ADMIN_LOGIN').default('admin').asString(),
    };
  }

  get networkUrls() {
    return {
      bsc: env
        .get('BSC_NETWORK_URL')
        .default('https://bsc-dataseed1.binance.org:443')
        .required()
        .asString(),
      eth: env
        .get('ETH_NETWORK_URL')
        .default('https://api.mycryptoapi.com/eth')
        .required()
        .asString(),
      bscQuikNode: env
        .get('BSC_QUIKNODE_NETWORK_URL')
        .default(
          'https://white-snowy-wildflower.bsc.quiknode.pro/bafac38b78d7c3a3e20b380f64dd530ef03fbceb/',
        )
        .required()
        .asString(),
    };
  }

  get typeOrmConfig(): TypeOrmModuleOptions {
    const databaseConfig = { ...ormconfig };

    if ((<any>module).hot) {
      const entityContext = (<any>require).context(
        './../../modules',
        true,
        /\.entity\.ts$/,
      );
      databaseConfig.entities = entityContext.keys().map((id) => {
        const entityModule = entityContext(id);
        const [entity] = Object.values(entityModule);

        return entity;
      });
      const migrationContext = (<any>require).context(
        './../../migrations',
        false,
        /\.ts$/,
      );
      databaseConfig.migrations = migrationContext.keys().map((id) => {
        const migrationModule = migrationContext(id);
        const [migration] = Object.values(migrationModule);

        return migration;
      });
    }

    return {
      ...databaseConfig,
      keepConnectionAlive: true,
      subscribers: [AccountSubscriber],
    };
  }
}
