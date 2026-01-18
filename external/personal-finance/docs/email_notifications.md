Ниже — где в коде определены письма и когда они отправляются при текущем триале 7 дней. Я опираюсь на найденные места в сервисах/планировщике и настройках.

1) Письмо «Welcome / старт триала»
   Когда уходит: сразу при создании триала (в момент провижининга подписки).
   Где в коде: SubscriptionService.provisionTrial(...) вызывает subscriptionNotificationService.sendTrialWelcomeEmail(...) сразу после сохранения подписки.
   Подтверждение: src/main/java/com/example/personalFinance/service/subscription/SubscriptionService.java (метод provisionTrial) — вызов отправки welcome-письма.

2) Письмо-напоминание «Trial ends soon»
   Когда уходит: за trialReminderDaysBefore дней до окончания триала.
   По умолчанию: trialReminderDaysBefore = 5 (из @Value("${app.subscription.trial.reminder-days-before:5}")).
   При триале 7 дней: напоминание пойдёт за 5 дней до конца, то есть на 2-й день после старта (пример: старт 1-го числа → напоминание на 2-й день, т.к. конец на 8-й).
   Точное окно: планировщик ищет подписки с trialEndsAt в диапазоне [now, now + 5 дней] и без trialReminderSentAt — то есть письмо уйдёт в день, когда триал входит в это окно.
   Где в коде:

SubscriptionService.sendTrialEndingSoonReminders() — вычисляет threshold = now.plusDays(trialReminderDaysBefore) и рассылает.

SubscriptionLifecycleScheduler.processTrialReminders() — запускается по cron (по умолчанию ежедневно в 09:00).
Подтверждение: src/main/java/com/example/personalFinance/service/subscription/SubscriptionService.java и src/main/java/com/example/personalFinance/service/subscription/SubscriptionLifecycleScheduler.java.

3) Письмо «Trial expired»
   Когда уходит: после окончания триала, когда trialEndsAt < now и письмо ещё не отправлялось.
   Запуск: ежедневный cron (по умолчанию в 09:05).
   Где в коде:

SubscriptionService.handleTrialExpirations() — переводит подписку в EXPIRED, отправляет sendTrialExpiredEmail(...).

SubscriptionLifecycleScheduler.processTrialExpirations() — планировщик.
Подтверждение: те же файлы в service/subscription.

Как это выглядит при триале 7 дней (по умолчанию)
Триал теперь 7 дней задаётся настройкой app.subscription.trial-length-days с дефолтом 7 в application.properties.
Это значит:

Сразу после старта — Welcome письмо.

На 2‑й день триала (за 5 дней до конца) — Reminder (в ближайший запуск cron 09:00).

После окончания триала — письмо о завершении (в ближайший запуск cron 09:05).

Ссылки на код и настройки
Триал длиной 7 дней по умолчанию: src/main/resources/application.properties (app.subscription.trial-length-days).

Провижининг и отправка welcome + логика напоминаний/окончаний: src/main/java/com/example/personalFinance/service/subscription/SubscriptionService.java.

Планировщик cron для напоминаний/окончаний: src/main/java/com/example/personalFinance/service/subscription/SubscriptionLifecycleScheduler.java.

Команды, которые я использовал
rg -n "trial|триал|trial period|trialPeriod|TRIAL" src/main/java src/main/resources

sed -n '1,220p' src/main/java/com/example/personalFinance/service/subscription/SubscriptionService.java

sed -n '220,520p' src/main/java/com/example/personalFinance/service/subscription/SubscriptionService.java

sed -n '1,120p' src/main/java/com/example/personalFinance/service/subscription/SubscriptionLifecycleScheduler.java

rg -n "trial.reminder|trial-length|trial" src/main/resources/application.properties

Если хотите, могу дополнительно указать точную дату/время для конкретного пользователя, если дадите дату старта триала и часовой пояс.
