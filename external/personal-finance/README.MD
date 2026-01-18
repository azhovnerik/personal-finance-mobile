
# My finance project
# money planning and accounting  service

## Getting started

### Setup local databases on PostgreSQL:
```
1.Create and run database
```
run java/com/example/personalFinance/docker/docker-compose.yml
```
2. Run PersonalFinanceApplication.java
3. Go to http://localhost:8080

### Проверка публичного эндпоинта логирования кликов

1. Запустите приложение локально:
   ```bash
   ./gradlew bootRun
   ```

2. Отправьте POST-запрос на эндпоинт без авторизации (`http://localhost:8080/api/landing-clicks`).

   **cURL пример:**
   ```bash
   curl -X POST http://localhost:8080/api/landing-clicks \
     -H "Content-Type: application/json" \
     -d '{
       "clickedAt": "2024-08-30T12:34:56+03:00",  # ISO 8601 с Kyiv (+03:00)
       "countryCode": "UA",
       "deviceType": "mobile",
       "ipAddress": "203.0.113.10"
     }'
   ```

   **Postman:** выберите метод **POST**, URL `http://localhost:8080/api/landing-clicks`, на вкладке *Body* → *raw* → *JSON* вставьте то же тело запроса.

3. Ожидаемый ответ – статус **202 Accepted** без тела. При превышении лимита запросов с одного IP (30 в минуту) вернётся **429 Too Many Requests**.

## Exporting stage data to CSV

The `scripts/export_stage_to_csv.sh` helper exports the production data from the `stage` branch into CSV files that can be safely transferred to another environment.

1. Make sure the Heroku CLI is authenticated and `psql` is available locally (Heroku Postgres provides temporary credentials via `heroku pg:credentials:url <DATABASE>` or `heroku config:get DATABASE_URL`).
2. Set the `STAGE_DATABASE_URL` environment variable to the connection string of the production (`stage`) database. Example:
   ```bash
   export STAGE_DATABASE_URL="$(heroku config:get DATABASE_URL --app your-stage-app)"
   ```
3. Run the export script. You can provide a custom output directory; otherwise `exported-stage-data/` will be created in the current folder.
   ```bash
   ./scripts/export_stage_to_csv.sh /path/to/output
   ```
   The script produces CSV files (`users.csv`, `category.csv`, `budget.csv`, `account.csv`, `change_balance.csv`, `transaction.csv`, `budget_categories.csv`) that include headers and quote every column to preserve special characters.

## Importing CSV data into the UUID schema

After applying the migrations from the `feature/old-front-release-branch` (so the schema already expects UUID primary keys), run `scripts/import_csv_to_feature_uuid.sh` against a clean Heroku database to populate it with the exported data.

1. Upload the CSV files to a secure location accessible from the machine that will run the import.
2. Set the `FEATURE_DATABASE_URL` environment variable to the destination database connection string (for example obtained with `heroku config:get DATABASE_URL --app your-feature-app`).
3. Execute the import script, pointing it to the directory that contains the CSV files.
   ```bash
   ./scripts/import_csv_to_feature_uuid.sh /path/to/output
   ```
   The script truncates the target tables, loads the CSVs into temporary staging tables that match the legacy `BIGINT` schema, and replays the deterministic `uuid_generate_v5` mapping (`users:`, `account:`, `category:`, etc.) that is defined in the Flyway migration so every legacy identifier is converted to the same UUID used by the application. Parent-child relationships are rebuilt automatically, and the helper drops itself after the import completes.

Both scripts stop immediately if a required CSV file or command is missing, providing clear diagnostics so the migration can be repeated safely.
