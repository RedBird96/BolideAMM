import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { LoggerModule as RollbarLoggerModule } from 'nestjs-rollbar';
import stdSerializers from 'pino-std-serializers';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { contextMiddleware } from './middlewares';
import { AccountsModule } from './modules/accounts/accounts.module';
import { AuthModule } from './modules/auth/auth.module';
import { BnbModule } from './modules/bnb/bnb.module';
import { EthModule } from './modules/eth/eth.module';
import { ExternalApiModule } from './modules/external-api/external-api.module';
import { LbfStrategyModule } from './modules/land-borrow-farm-strategy/lbf.module';
import { PairsModule } from './modules/pairs/pairs.module';
import { QueuesModule } from './modules/queues/queues.module';
import { RuntimeKeysModule } from './modules/runtime-keys/runtime-keys.module';
import { SlackModule } from './modules/slack/slack.module';
import { SlackService } from './modules/slack/slack.service';
import { StrategiesModule } from './modules/strategies/strategies.module';
import { TelegramSettingsModule } from './modules/telegram/settings/tg-settings.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { ConfigService } from './shared/services/config.service';
import { SharedModule } from './shared/shared.module';

const pinoPrettyLogsTransport = {
  target: 'pino-pretty',
  options: {
    singleLine: true,
    colorize: true,
    levelFirst: true,
    translateTime: 'h:MM:ss',
  },
};

const imports = [
  PinoLoggerModule.forRootAsync({
    imports: [SharedModule],
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => ({
      pinoHttp: {
        quietReqLogger: true,
        base: null,
        level: configService.logLevel,
        timestamp: () => `,"time":"${new Date().toISOString()}"`,
        serializers: {
          error: stdSerializers.err,
        },
        formatters: {
          level: (label) => ({ level: label }),
          log: (msgObject: any) => {
            if (msgObject.context && msgObject.message) {
              const { context, message, ...rest } = msgObject;

              return { msg: `${context} > ${message}`, ...rest };
            }

            return msgObject;
          },
        },
        redact: {
          paths: ['req.id', 'req.headers', 'res.headers'],
          censor: '[Redacted]',
        },
        useLevelLabels: true,
        transport: configService.isUsePinoPrettyTransport
          ? pinoPrettyLogsTransport
          : null,
      },
    }),
  }),
  RollbarLoggerModule.forRootAsync({
    imports: [SharedModule],
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => ({
      accessToken: configService.rollbar.token,
      environment: configService.nodeEnv,
    }),
  }),
  EventEmitterModule.forRoot({
    maxListeners: 100,
  }),
  TypeOrmModule.forRootAsync({
    imports: [SharedModule],
    useFactory: (configService: ConfigService) => configService.typeOrmConfig,
    inject: [ConfigService],
  }),
  AuthModule,
  AccountsModule,
  StrategiesModule,
  PairsModule,
  RuntimeKeysModule,
  QueuesModule,
  SlackModule,
  TelegramModule,
  TelegramSettingsModule,
  BnbModule,
  EthModule,
  LbfStrategyModule,
  ExternalApiModule,
];
@Module({
  imports,
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  constructor(
    private readonly configService: ConfigService,
    private readonly slackService: SlackService,
  ) {}

  configure(consumer: MiddlewareConsumer): MiddlewareConsumer | void {
    consumer.apply(contextMiddleware).forRoutes('*');
  }

  async onModuleInit() {
    if (this.configService.isNotifyToSlackAfterStart) {
      await this.slackService.sendRestartNestAppMessage({
        env: this.configService.nodeEnv,
        pid: process.pid,
      });
    }
  }
}
