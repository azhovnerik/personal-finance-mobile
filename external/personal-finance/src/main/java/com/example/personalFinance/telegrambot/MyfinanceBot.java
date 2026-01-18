package com.example.personalFinance.telegrambot;

import com.example.personalFinance.service.*;
import com.example.personalFinance.usecase.GetCategorySelectListForBudgetUseCase;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Conditional;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.telegram.abilitybots.api.bot.AbilityBot;
import org.telegram.abilitybots.api.bot.BaseAbilityBot;
import org.telegram.abilitybots.api.objects.Ability;
import org.telegram.abilitybots.api.objects.Flag;
import org.telegram.abilitybots.api.objects.Reply;
import org.telegram.telegrambots.meta.api.objects.Update;

import java.util.function.BiConsumer;

import static org.telegram.abilitybots.api.objects.Locality.USER;
import static org.telegram.abilitybots.api.objects.Privacy.PUBLIC;
import static org.telegram.abilitybots.api.util.AbilityUtils.getChatId;

@Component
@Profile("!test")
@Conditional(BotTokenCondition.class)
public class MyfinanceBot extends AbilityBot {
    private  ResponseHandler responseHandler;

    @Autowired
    private  CategoryService categoryService;

    @Autowired
    private GetCategorySelectListForBudgetUseCase getCategorySelectListForBudgetUseCase;

    @Autowired
    private UserService userService;

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private AccountService accountService;

    @Autowired
    private BudgetService budgetService;

    private static final String PRIMARY_TOKEN_PROPERTY = "botToken";
    private static final String ALT_TOKEN_PROPERTY = "BOT_TOKEN";
    private static final String DOT_TOKEN_PROPERTY = "bot.token";

    @Autowired
    public MyfinanceBot(Environment env) {
        super(resolveBotToken(env), "addtransactionbot");

    }

    private static String resolveBotToken(Environment env) {
        String token = env.getProperty(PRIMARY_TOKEN_PROPERTY);
        if (token == null || token.isBlank()) {
            token = env.getProperty(ALT_TOKEN_PROPERTY);
        }
        if (token == null || token.isBlank()) {
            token = env.getProperty(DOT_TOKEN_PROPERTY);
        }
        if (token == null || token.isBlank()) {
            token = System.getenv(ALT_TOKEN_PROPERTY);
        }
        if (token == null || token.isBlank()) {
            token = System.getenv(PRIMARY_TOKEN_PROPERTY);
        }

        if (token == null || token.isBlank()) {
            throw new IllegalStateException("Telegram bot token is not configured");
        }
        return token;
    }

    @PostConstruct
    private void initializeResponseHandler() {
        responseHandler = new ResponseHandler(silent, db, categoryService, userService,
                getCategorySelectListForBudgetUseCase, transactionService, accountService, budgetService);
    }

    public Ability startBot() {
        return Ability
                .builder()
                .name("start")
                .info(Constants.START_DESCRIPTION)
                .locality(USER)
                .privacy(PUBLIC)
                .action(ctx -> responseHandler.replyToStart(ctx.chatId(), ctx.update().getMessage()))
                .build();
    }

    public Reply replyToButtons() {
        BiConsumer<BaseAbilityBot, Update> action = (abilityBot, upd) -> responseHandler.replyToButtons(getChatId(upd), upd.getMessage());
        return Reply.of(action, Flag.TEXT, upd -> responseHandler.userIsActive(getChatId(upd)));
    }

    @Override
    public long creatorId() {
        return 1L;
    }
}
