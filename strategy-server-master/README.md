# Strategy Server

Strategy Server для проекта Bolide

# Подготовка к разработке
- VSC настроенное для работы (конфиг примерный ниже)
- Установленные рекомендуемые модули (конфиг ниже)
- node.js, npm (см. зависимости в Docker)
- husky и понимание его работы
- ncu установленный глобально для обновления пакетов

# Локальный запуск
redis и postgres установленные локально или запущенные в контейнере, например:
- создать в базе данных пользователей с правами
`
CREATE USER postgres WITH SUPERUSER PASSWORD 'postgres';
CREATE USER staging WITH SUPERUSER PASSWORD 'staging';
`
- создать в docker volumes с именем postgres_database
- `npm run dc:dev` запустит проект в docker, после завершения работы postgres и redis будут далее работать
- `npm run start:dev` запустить проект локально

# Работа с миграциями
Миграции - изменения структуры базы данных от одной версии до другой. Миграции находятся в `src/migrations`, чтобы было легче поддерживать изменения структуры БД
Также в этой директории лежат сиды - операции по наполнению БД данным без изменения ее структуры.

Конфиг файл с подключением к БД `src/shared/services/ormconfig` используется как самим приложением, так и typeorm cli, которому нужно подключиться к базе для генерации миграций

```js
{
  migrationsRun: true, // запускает при старте приложения актуальные миграции(названия которых еще нет в таблице public.migrations)
  synchronize: false, // не синхронизирует(меняет структуру БД) автоматически при старте приложения
}
```

Для работы есть следующие команды
- `migration:create` - создает template миграции в `src/migration`
- `migration:generate` - генерирует миграцию в `src/migration` на основе изменений в `*.entity.ts` файлах кодовой базы проекта, вызывать с указанием имени миграции, например RenameFieldToValue
- `migration:run` - Запускает актуальные миграции из `src/migration`
- `migration:revert` - Запускает откат миграции(метод `down`), крайней миграции в таблице `public.migrations`. Если нужно несколько откатов, то необходимо выполнить эту команду несколько раз

Хронология событий при запуске

1. После команды npm run start TypeORM делает запрос `SELECT * FROM "migrations" "migrations" ORDER BY "id" DESC`
1. Если в `src/migrations` есть названия миграций, которых нет в БД в таблице `migrations`, то typeorm начинает их прогон один за одним.
1. Создается транзакция, выполняется код миграции в одном из файлов `src/migrations/*.ts`, затем записывается в таблицу `INSERT INTO "migrations"("timestamp", "name") VALUES (1649396297132, "SeedInit1649396297132");`, после чего происходит `COMMIT TRANSACTION;` и в конце Nest.js поднимает приложение
1. Если актуальных миграций нет, то приложение поднимается без изменений в БД


# Синхронизация/изменение контрактов и путей обмена между средами
Данный механизм создает недостающие записи, а так же меняет атрибуты текущих записей. При этом никакие записи в БД, которые не присутствуют в выгрузке, не удалюятся. Так же не меняются никакие ссылки между записями в БД.

1. Выгрузка текущего состояния:
```bash
curl --location --request GET '/blockchains/1/state' \
--header 'Accept: application/json' \
--header 'Authorization: Bearer <token>' > state.json
```

2. Если необходимо, в выгрузку из п1 вносятся необходимые изменения. Свойства, которые не нужно синхронизировать или менять, можно удалить.

3. Загрузка нового состояния:
```bash
curl --location --request PUT '/blockchains/1/state' \
--header 'Accept: application/json' \
--header 'Authorization: Bearer <token>' \
--header 'Content-Type: application/json' \
-d @./state.json
```

# Работа с Docker

## Нужно создать volumes

- postgres_database

## Что бы запустить в docker

- `npm run dc:dev`

# Обновление node_modules
- `npm i -g npm-check-updates`
- `ncu`

# Работа с husky
- инициализация работы husky `npx husky-init && npm install`
- конфиг husky находится в package.json
# ENV

### Logs
- `ROLLBAR_TOKEN` - токен доступа
- `LOG_LEVEL` - уровень логов в pino формате (trace, debug, info, warn, error, fatal, silent)

### Common
- `IS_NOTIFY_TO_SLACK_AFTER_START` - отправлять оповещение в slack о старте / рестарте приложения
- `IS_NOTIFY_TO_SLACK_BROCKEN_SETTINGS` - отправлять оповещения в slack при неправильных настройках стратегии
- `IS_USE_VAULT` - использовать vault или брать только из env
- `IS_USE_PINO_PRETTY_TRANSPORT` - разрешает использовать форматирование логов через pino-pretty

### Blockchain
- `OPERATIONS_PRIVATE_KEY` - кошелек для запуска операций по стратегии
- `BOOSTING_PRIVATE_KEY` - кошелек для бустинга стратегии
- `BSC_NETWORK_URL` - RPC URL для Binance Smart Chain
- `ETH_NETWORK_URL` - RPC URL для Ethereum
- `BSC_QUIKNODE_NETWORK_URL` - RPC URL для BSC через сервис quiknode

### Swagger
- `IS_SHOW_DOCS` - показывать ли swagger документацию

### JWT, Cookies
- `JWT_SECRET_KEY` - random string
- `JWT_EXPIRATION_TIME` - default 3600
- `STRATEGY_SERVER_COOKIE_DOMAIN` - домен для которого проставляются куки
- `ACCESS_TOKEN_COOKIE_NAME` - имя access token в куках
- `COOKIE_MAX_AGE` - время жизни куки в секундах

### Admin

- `ADMIN_EMAIL` - email для администратора (по умолчанию strategy-admin@tencoins.org)
- `ADMIN_LOGIN` - логин администратора (admin)
- `ADMIN_PASSWORD` - пароль администратора (admin)

### Postgre DB

- `DB_HOST` - localhost
- `DB_PORT` - 35432
- `DB_USERNAME` - user
- `DB_PASSWORD` - pass
- `DB_DATABASE` - strategy_bolide_local

### Redis
- `REDIS_URL`

### Swagger
  На проекте реализована документация Swagger,
  после равертывания среды, прочесть документацию можно по адресу:
  http://localhost${PORT}/swagger/#

# Tests
  Для запуска тестов, требуется создать тестовую базу данных strategy_server_local_test,

  для докер среды, это можно сделать через терминал, коммандами:
  `BASE=$(docker ps -f name=postgres --format="{{.ID}}")`
  `docker exec -it $BASE psql -U user -d strategy_bolide_local -c "create database strategy_server_local_test"`

# Scripts

- `npm run start` стартует nest приложение
- `npm run stat:dec` стартует nest приложение в dev режиме с отслеживанием изменений в файлах
- `npm run start:prod` стартует приложение в production режиме
- `npm run start:debug` стартует приложение в dev режиме с включенным debug
- `npm run dc:dev` - стартует приложение в dev режиме внутри Docker

# VSC
## конфиг settings.json
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

## рекомендуемые расширения
- DotENV
- Docker
- ESLint
- GitLens

