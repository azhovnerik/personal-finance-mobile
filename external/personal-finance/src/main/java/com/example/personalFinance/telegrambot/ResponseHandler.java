package com.example.personalFinance.telegrambot;

import com.example.personalFinance.dto.CategoryDto;
import com.example.personalFinance.model.*;
import com.example.personalFinance.service.*;
import com.example.personalFinance.usecase.GetCategorySelectListForBudgetUseCase;
import com.example.personalFinance.utils.DateTimeUtils;
import org.telegram.abilitybots.api.db.DBContext;
import org.telegram.abilitybots.api.sender.SilentSender;
import org.telegram.telegrambots.meta.api.methods.send.SendMessage;
import org.telegram.telegrambots.meta.api.objects.Message;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.ReplyKeyboard;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.ReplyKeyboardRemove;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static com.example.personalFinance.telegrambot.UserState.*;
import static com.example.personalFinance.utils.DateTimeUtils.getEndOfMonth;
import static com.example.personalFinance.utils.DateTimeUtils.getStartOfMonth;


public class ResponseHandler {
    private final SilentSender sender;

    private final Map<Long, UserState> chatStates;

    private CategoryService categoryService;

    private BudgetService budgetService;

    private AccountService accountService;

    private TransactionService transactionService;

    private GetCategorySelectListForBudgetUseCase getCategorySelectListForBudgetUseCase;

    private UserService userService;

    private Optional<UserApp> userApp;

    private Category chosenCategory;

    private Account chosenAccount;

    private BigDecimal transactionAmount;


    public ResponseHandler(SilentSender sender, DBContext db, CategoryService categoryService, UserService userService,
                           GetCategorySelectListForBudgetUseCase getCategorySelectListForBudgetUseCase
            , TransactionService transactionService, AccountService accountService, BudgetService budgetService) {
        this.sender = sender;
        this.categoryService = categoryService;
        this.userService = userService;
        this.getCategorySelectListForBudgetUseCase = getCategorySelectListForBudgetUseCase;
        this.transactionService = transactionService;
        this.accountService = accountService;
        this.budgetService = budgetService;
        chatStates = db.getMap(Constants.CHAT_STATES);
    }

    public void sendText(long chatId, String text) {
        SendMessage message = new SendMessage();
        message.setChatId(chatId);
        message.setText(text);
        sender.execute(message);
    }

    public void replyToButtons(long chatId, Message message) {
        if (message.getText().equalsIgnoreCase("/stop")) {
            stopChat(chatId);
        }
        UserState userState = chatStates.get(chatId);
        if (userState.equals(AWAITING_CATEGORY)) {
            replyToStart(chatId, message);
        } else if (userState.equals(CATEGORY_SELECTED)) {
            replyToChosenCategory(chatId, message);
        } else if (userState.equals(AWAITING_AMOUNT)) {
            replyToAmount(chatId, message);
        } else if (userState.equals(AWAITING_ACCOUNT)) {
            replyToChosenAccount(chatId, message);
        } else if (userState.equals(STOP_CHAT)) {
            stopChat(chatId);
        } else {
            unexpectedMessage(chatId);
        }
    }

    private void unexpectedMessage(long chatId) {
        SendMessage sendMessage = new SendMessage();
        sendMessage.setChatId(chatId);
        sendMessage.setText("I did not expect that.");
        sender.execute(sendMessage);
    }

    private void stopChat(long chatId) {
        SendMessage sendMessage = new SendMessage();
        sendMessage.setChatId(chatId);
        sendMessage.setText("Thank you. See you soon!\nPress /start to add new transaction");
        chatStates.remove(chatId);
        sendMessage.setReplyMarkup(new ReplyKeyboardRemove(true));
        sender.execute(sendMessage);
    }

    private void promptWithKeyboardForState(long chatId, String text, ReplyKeyboard YesOrNo, UserState awaitingReorder) {
        SendMessage sendMessage = new SendMessage();
        sendMessage.setChatId(chatId);
        sendMessage.setText(text);
        sendMessage.setReplyMarkup(YesOrNo);
        sender.execute(sendMessage);
        chatStates.put(chatId, awaitingReorder);
    }

    public void replyToStart(long chatId, Message message) {
        userApp = userService.findByTelegramName(message.getFrom().getUserName());
        if (userApp.isPresent()) {
            List<CategoryDto> categoryList = categoryService.findByUserAndTypeWithoutParentsOrderByFrequency(userApp.get().getId(), CategoryType.EXPENSES, false);
            promptWithKeyboardForState(chatId, "Hello " + userApp.get().getName() + ". Please, select caregory for transaction:",
                    KeyboardFactory.getCategoryList(categoryList),
                    CATEGORY_SELECTED);
        } else {
            promptWithKeyboardForState(chatId, "Hello " + message.getFrom().getUserName() + ". Unfortunately," +
                            " your telegram name " + message.getFrom().getUserName() + " hasn't linked to your MyFinancies App profile. Please, go to https://my-financies.herokuapp.com/ and link your telegram name " +
                            "to your MyFinancies profile! Finish chat?"
                    ,
                    KeyboardFactory.getEmptySelection(),
                    STOP_CHAT);
            stopChat(chatId);
        }
    }

    public void replyToAmount(long chatId, Message message) {
        userApp = userService.findByTelegramName(message.getFrom().getUserName());
        if (userApp.isPresent()) {
            String inputAmount = message.getText();
            if (isNumeric(inputAmount)) {
                transactionAmount = BigDecimal.valueOf(Double.parseDouble(inputAmount));
            } else {
                promptWithKeyboardForState(chatId, "Sorry, amount should be a number .Please, input amount once again:",
                        KeyboardFactory.getEmptySelection(),
                        AWAITING_AMOUNT);
                return;
            }
            List<Account> accountList = accountService.findByUserId(userApp.get().getId());
            promptWithKeyboardForState(chatId, " Please, select account for transaction:",
                    KeyboardFactory.getAccountList(accountList),
                    AWAITING_ACCOUNT);
        } else {
            promptWithKeyboardForState(chatId, "Hello " + message.getFrom().getUserName() + ". Unfortunately," +
                            " your telegram name " + message.getFrom().getUserName() + " hasn't linked to your MyFinancies App profile. Please, go to https://my-financies.herokuapp.com/ and link your telegram name " +
                            "to your MyFinancies profile! Finish chat?"
                    ,
                    KeyboardFactory.getEmptySelection(),
                    STOP_CHAT);
            stopChat(chatId);
        }
    }

    private void replyToChosenCategory(long chatId, Message message) {
        userApp = userService.findByTelegramName(message.getFrom().getUserName());

        if (userApp.isPresent()) {
            String chosenCategoryName = message.getText();
            List<Category> chosenCategoryList = categoryService.findByUserIdAndName(userApp.get().getId(), chosenCategoryName);
            if (chosenCategoryList.size() > 0) {
                chosenCategory = chosenCategoryList.get(0);
                promptWithKeyboardForState(chatId, "Please, input an amount of transaction:",
                        KeyboardFactory.getEmptySelection(),
                        AWAITING_AMOUNT);
            } else {
                promptWithKeyboardForState(chatId, "Sorry, there is no category with name " + chosenCategoryName + ".Please, chose category once again:",
                        KeyboardFactory.getEmptySelection(),
                        AWAITING_CATEGORY);
            }

        } else {
            promptWithKeyboardForState(chatId, "Hello " + message.getFrom().getUserName() + ". Unfortunately," +
                            " your telegram name " + message.getFrom().getUserName() + " hasn't linked to your MyFinancies App profile. Please, go to https://my-financies.herokuapp.com/ and link your telegram name " +
                            "to your MyFinancies profile! Finish chat?"
                    ,
                    KeyboardFactory.getEmptySelection(),
                    STOP_CHAT);
            stopChat(chatId);
        }
    }

    private void replyToChosenAccount(long chatId, Message message) {
        userApp = userService.findByTelegramName(message.getFrom().getUserName());

        if (userApp.isPresent()) {
            String chosenAccountName = message.getText();
            Optional<Account> maybeAccount = accountService.findByUserIdAndName(userApp.get().getId(), chosenAccountName);
            if (maybeAccount.isPresent()) {
                chosenAccount = maybeAccount.get();
                Transaction transaction = new Transaction();
                transaction.setDirection(TransactionDirection.DECREASE);
                transaction.setAmount(transactionAmount);
                transaction.setAccount(chosenAccount);
                LocalDateTime dt = LocalDateTime.now();
                Instant instant = dt.toInstant(ZoneOffset.UTC);
                transaction.setDate(instant.getEpochSecond());
                transaction.setType(TransactionType.EXPENSE);
                transaction.setUser(userApp.get());
                transaction.setCategory(chosenCategory);
                transaction.setComment("Created by bot");
                transactionService.save(transaction);
                sendText(chatId, "Transaction with amount: " + transactionAmount + " category: " + chosenCategory.getName() + " account: " +
                        chosenAccount.getName() + " was successfully created!");
                Optional<BudgetCategory> maybeBudgetCategory = budgetService.getBudgetCategoryByUserIdAndCategoryAndMonth(userApp.get().getId(),
                        chosenCategory, LocalDate.now().withDayOfMonth(1));
                BigDecimal budgetCategoryLeftover;
                BigDecimal spentAmount = transactionService.calculateTotalByCategoryForPeriod(userApp.get().getId(),
                        chosenCategory,
                        getStartOfMonth(LocalDate.now()),
                        getEndOfMonth(LocalDate.now()));
                if (maybeBudgetCategory.isPresent()) {
                    budgetCategoryLeftover = maybeBudgetCategory.get().getAmount().subtract(spentAmount);
                } else {
                    budgetCategoryLeftover = spentAmount.negate();
                }

                sendText(chatId, "You have  " + budgetCategoryLeftover + " to spent till end of current month by category " + chosenCategory.getName());
                stopChat(chatId);
            } else {
                List<Account> accountList = accountService.findByUserId(userApp.get().getId());
                promptWithKeyboardForState(chatId, "Sorry, there is no account with name " + chosenAccountName + ".Please, chose account once again:",
                        KeyboardFactory.getAccountList(accountList),
                        AWAITING_ACCOUNT);
            }


        } else {
            promptWithKeyboardForState(chatId, "Hello " + message.getFrom().getUserName() + ". Unfortunately," +
                            " your telegram name " + message.getFrom().getUserName() + " hasn't linked to your MyFinancies App profile. Please, go to https://my-financies.herokuapp.com/ and link your telegram name " +
                            "to your MyFinancies profile! Finish chat?"
                    ,
                    KeyboardFactory.getEmptySelection(),
                    STOP_CHAT);
            stopChat(chatId);
        }
    }

    public static boolean isNumeric(String str) {
        return str.matches("-?\\d+(\\.\\d+)?");  //match a number with optional '-' and decimal.
    }

    public boolean userIsActive(Long chatId) {
        return chatStates.containsKey(chatId);
    }
}

