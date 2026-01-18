# Repository Guidelines

## Project Structure
- Backend: `src/main/java/com/example/personalFinance` (controllers in `web`/`web.rest`, services in `service/Impl`, entities in `model`, security in `security`, config in `config`).
         don't see and modify AuthControllerRest, BudgetControllerRest due to first release will be only MVC with Thymeleaf with bootstrap
- Views & assets: `src/main/resources/templates` (Thymeleaf) and `src/main/resources`. UI should be adaptive for mobile devices
- DB migrations: `src/main/resources/db/migration` (Flyway `V####__description.sql`).
- Tests: `src/test/java` (unit, integration) and a small Kotlin test config in `src/test/java/.../config`.
- Generated code: `src/main/generated/**` (MapStruct). Do not edit by hand.

## Build, Test, Run
- Build: `./gradlew build` — compiles, runs tests, packages jars.
- Run app: `./gradlew bootRun` — starts on `http://localhost:8080`.
- Tests only: `./gradlew test` — JUnit 5 + Spring Boot Test.
- Flyway: `./gradlew flywayMigrate` — applies migrations to the configured DB.

Database defaults (local): `jdbc:postgresql://localhost:5433/myfinancesdb` with user/password `postgres`. Adjust via `application.properties` or env vars.

## Coding Style & Naming
- Language: Java 17. Use Lombok where present; MapStruct for mappers.
- Indentation: 4 spaces; UTF‑8; Unix line endings.
- Packages follow existing `com.example.personalFinance` structure; classes `PascalCase`, fields/methods `camelCase`.
- Do not commit formatting-only churn. Keep imports organized.

## Testing Guidelines
- Frameworks: JUnit 5, Spring Boot Test, Mockito, Testcontainers.
- Naming: `*Test.java` for unit, `*IntegrationTest.java` for integration.
- Run locally: `./gradlew test` (optionally `-Dspring.profiles.active=test`).
- Add/extend tests for new logic and regressions; prefer fast unit tests.

## Commit & PR Guidelines
- Commits: imperative mood, concise summary (e.g., “Fix…” “Add…”). Group related changes.
- PRs: clear description, link issues, include screenshots for UI/template changes, note DB migration impacts, and outline test coverage.
- Keep PRs focused; update docs/config when behavior changes.

## Security & Configuration
- Secrets via env vars: mail (`MAIL_SMTP_HOST`, `MAIL_SMTP_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`) and OAuth (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).
- Never commit credentials or `.env` files. Review CSP in `templates/blocks/content-security-policy.html` for UI changes.

## Agent-Specific Notes
- Do not edit `src/main/generated/**`; modify mapper interfaces in `src/main/java/.../mapper` and rebuild.
- Place new Flyway scripts in `src/main/resources/db/migration` with incremental version and clear description.
