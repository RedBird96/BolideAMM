import * as dotenv from 'dotenv';
import * as env from 'env-var';

import { SnakeNamingStrategy } from './snake-naming.strategy';

const nodeEnv = env
  .get('NODE_ENV')
  .default('development')
  .required()
  .asString();

dotenv.config({ path: `.${nodeEnv}.env` });

const config = {
  type: 'postgres' as const,
  host: env.get('DB_HOST').required().asString(),
  port: env.get('DB_PORT').required().asIntPositive(),
  username: env.get('DB_USERNAME').required().asString(),
  password: env.get('DB_PASSWORD').required().asString(),
  database: env.get('DB_DATABASE').required().asString(),
  isUseSSL: env.get('DB_USE_SSL').default('false').required().asBoolStrict(),
  isLogging: env
    .get('DB_IS_LOGGING')
    .default('false')
    .required()
    .asBoolStrict(),
};

let url = `postgres://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}`;
let ssl = null;

if (config.isUseSSL) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  ssl = {
    rejectUnauthorized: false,
  };
  url += '?sslmode=require';
}

const isDropSchema = env.get('NODE_ENV').required().asString() === 'test';

export = {
  entities: [__dirname + '/../../modules/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../../migrations/*{.ts,.js}'],
  cli: {
    migrationsDir: __dirname + '/../../migrations',
  },
  type: config.type,
  database: config.database,
  url,
  migrationsRun: true,
  namingStrategy: new SnakeNamingStrategy(),
  synchronize: false,
  logging: config.isLogging,
  ssl: config.isUseSSL ? ssl : null,
  dropSchema: isDropSchema,
};
