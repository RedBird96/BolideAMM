# Strategy Server

Strategy Server for the Bolide project

# Preparation for Development
- VSC configured for work (sample configuration below)
- Recommended modules installed (config below)
- node.js, npm (see dependencies in Docker)
- husky and understanding of its operation
- ncu installed globally for package updates

# Local Launch
redis and postgres installed locally or running in containers, for example
- Create a database user with the command
`
CREATE USER postgres WITH SUPERUSER PASSWORD 'postgres';
CREATE USER staging WITH SUPERUSER PASSWORD 'staging';
`
- Create Docker volumes with the name postgres_database
- `npm run dc:dev`  launches the project in Docker; once completed, postgres and redis will remain active
- `npm run start:dev` starts the project locally

# Working with Migrations
Migrations - modify the database structure from one version to another. They are located in `src/migrations` for easier maintenance. This directory also 
contains seeds—operations to populate the database without altering its structure.

The database connection configuration file `src/shared/services/ormconfig` is used by both the application and the typeorm CLI, which connects to the database to generate migrations.

```js
{
  migrationsRun: true, // запускает при старте приложения актуальные миграции(названия которых еще нет в таблице public.migrations)
  synchronize: false, // не синхронизирует(меняет структуру БД) автоматически при старте приложения
}
```

Commands for working with migrations:
- `migration:create` -  creates a template migration in `src/migration`
- `migration:generate` - generates a migration in `src/migration` based on changes in `.entity.ts` files. Specify a name, e.g., RenameFieldToValue.
- `migration:run` - Runs the latest migrations from `src/migration`
- `migration:revert` - Rolls back the last migration (using the `down` method) recorded in the `public.migrations` table. Run this command multiple times for multiple rollbacks.

Event Chronology During Startup

1. The npm run start command triggers TypeORM to execute `SELECT * FROM "migrations" "migrations" ORDER BY "id" DESC`
2. If `src/migrations` contains `migrations` not recorded in the database, typeorm applies them sequentially.
3. A transaction is created, migration code from `src/migrations/*.ts` is executed, and the migration is recorded with: `INSERT INTO "migrations"("timestamp", "name") VALUES (1649396297132, "SeedInit1649396297132");
` Finally, a `COMMIT TRANSACTION` is performed, and Nest.js starts the application.
4. If there are no new migrations, the app starts without database changes.


# Contract Synchronization/Exchange Paths Across Environments

This mechanism creates missing records and updates attributes of existing records. Records not included in the uploaded data are not deleted, nor are links between records changed.

1. Export Current State:
```bash
curl --location --request GET '/blockchains/1/state' \
--header 'Accept: application/json' \
--header 'Authorization: Bearer <token>' > state.json
```

2. Loading new state:
```bash
curl --location --request PUT '/blockchains/1/state' \
--header 'Accept: application/json' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
-d @./state.json
```

# Working with Docker

## Create volumes:

- postgres_database

## Launch in Docker

- `npm run dc:dev`

# Updating `node_modules`
- `npm i -g npm-check-updates`
- `ncu`

# Working with Husky
- Initialize Husky `npx husky-init && npm install`
- Husky configuration is located in package.json
# ENV

### Logs
- `ROLLBAR_TOKEN` - Access token
- `LOG_LEVEL` - Log level in Pino format (trace, debug, info, warn, error, fatal, silent)

### Common
- `IS_NOTIFY_TO_SLACK_AFTER_START` - Notify Slack on app start/restart
- `IS_NOTIFY_TO_SLACK_BROCKEN_SETTINGS` - Notify Slack on incorrect strategy settings
- `IS_USE_VAULT` - Use Vault or only ENV
- `IS_USE_PINO_PRETTY_TRANSPORT` - Enable log formatting via pino-pretty

### Blockchain
- `OPERATIONS_PRIVATE_KEY` - Wallet for strategy operations
- `BOOSTING_PRIVATE_KEY` - Wallet for strategy boosting
- `BSC_NETWORK_URL` - RPC URL for Binance Smart Chain
- `ETH_NETWORK_URL` - RPC URL for Ethereum
- `BSC_QUIKNODE_NETWORK_URL` - RPC URL for BSC via QuickNode service

### Swagger
- `IS_SHOW_DOCS` - Show Swagger documentation

### JWT, Cookies
- `JWT_SECRET_KEY` - random string
- `JWT_EXPIRATION_TIME` - default 3600
- `STRATEGY_SERVER_COOKIE_DOMAIN` - Domain for cookies
- `ACCESS_TOKEN_COOKIE_NAME` - Name of the access token in cookies
- `COOKIE_MAX_AGE` - Cookie lifespan in seconds

### Admin

- `ADMIN_EMAIL` - Administrator email (default: strategy-admin@tencoins.org)
- `ADMIN_LOGIN` - Admin login (admin)
- `ADMIN_PASSWORD` - Admin password (admin)

### Postgre DB

- `DB_HOST` - localhost
- `DB_PORT` - 35432
- `DB_USERNAME` - user
- `DB_PASSWORD` - pass
- `DB_DATABASE` - strategy_bolide_local

### Redis
- `REDIS_URL`

### Swagger
  Project documentation is available at http://localhost${PORT}/swagger/#

# Tests
  To run tests, create a test database strategy_server_local_test. For Docker,

  `BASE=$(docker ps -f name=postgres --format="{{.ID}}")`
  `docker exec -it $BASE psql -U user -d strategy_bolide_local -c "create database strategy_server_local_test"`

# Scripts

- `npm run start` Starts the Nest application
- `npm run stat:dec` Starts in dev mode with file watching
- `npm run start:prod` Starts in production mode
- `npm run start:debug` Starts in dev mode with debugging enabled
- `npm run dc:dev` - Starts in dev mode inside Docker

# VSC
## config settings.json
`{
  "files.autoSave": "afterDelay",
  "git.ignoreLimitWarning": true,
  "files.trimTrailingWhitespace": true,
  "files.eol": "\n",
  "explorer.autoReveal": false,
  "workbench.editor.enablePreviewFromQuickOpen": false,
  "search.quickOpen.includeHistory": false,
  "workbench.editor.enablePreview": false,
  "editor.suggestSelection": "first",
  "workbench.iconTheme": "vscode-icons",
  "editor.renderControlCharacters": true,
  "eslint.enable": true,
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
}`

## Recommended Extensions
- DotENV
- Docker
- ESLint
- GitLens

