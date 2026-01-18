package com.example.personalFinance.telegrambot;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.telegram.telegrambots.meta.TelegramBotsApi;
import org.telegram.telegrambots.updatesreceivers.DefaultBotSession;

@Configuration
public class TelegramConfig {

  @Bean
  @ConditionalOnBean(MyfinanceBot.class)
  public TelegramBotsApi telegramBotsApi(MyfinanceBot bot) throws Exception {
    TelegramBotsApi api = new TelegramBotsApi(DefaultBotSession.class);
    api.registerBot(bot);
    return api;
  }
}
