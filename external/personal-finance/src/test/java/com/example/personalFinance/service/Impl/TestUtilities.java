package com.example.personalFinance.service.Impl;

import com.example.personalFinance.dto.UserDto;
import com.example.personalFinance.model.*;
import com.example.personalFinance.service.AccountService;
import com.example.personalFinance.service.CategoryService;
import com.example.personalFinance.service.TransactionService;
import com.example.personalFinance.service.TransferService;
import com.example.personalFinance.service.UserService;

import java.math.BigDecimal;
import java.util.UUID;

public class TestUtilities {

    public static final String STRONG_TEST_PASSWORD = "Password1!";

    public static UserApp createUser(UserService userService, String email, String name, String password) {
        UserDto userDto = new UserDto();
        userDto.setEmail(email);
        userDto.setName(name);
        userDto.setPassword(password);
        userDto.setMatchingPassword(password);
        UserApp userApp = userService.registerNewUserAccount(userDto);
        return userApp;
    }

    public static Category createCategory(CategoryService categoryService, UserApp userApp, String name, CategoryType type, String description, UUID parentId, boolean disabled) {
        Category category = new Category();
        category.setName(name);
        category.setType(type);
        category.setUserId(userApp.getId());
        category.setDescription(description);
        category.setParentId(parentId);
        category.setDisabled(disabled);

        Category categoryResult = categoryService.save(category);
        return categoryResult;
    }

    public static Transaction createTransaction(TransactionService transactionService, UserApp userApp, Long date, TransactionType type, Category category, Account account, TransactionDirection direction, BigDecimal amount, String comment) {
        Transaction transaction = new Transaction();
        transaction.setType(type);
        transaction.setCategory(category);
        transaction.setAccount(account);
        transaction.setDirection(direction);
        transaction.setUser(userApp);
        transaction.setDate(date);
        transaction.setAmount(amount);
        transaction.setComment(comment);

        Transaction transactionResult = transactionService.save(transaction);
        return transactionResult;
    }

    public static Transfer createTransfer(TransferService transferService,
                                          UserApp user,
                                          Account fromAccount,
                                          Account toAccount,
                                          Long date,
                                          BigDecimal amount,
                                          String comment) {
        Transfer transfer = Transfer.builder()
                .fromAccount(fromAccount)
                .toAccount(toAccount)
                .date(date)
                .comment(comment)
                .build();
        return transferService.create(user.getId(), transfer, amount);
    }

    public static Account createAccount(AccountService accountService, String name, AccountType type, UserApp userApp) {
        Account account = new Account();
        account.setName(name);
        account.setDescription(name);
        account.setUserId(userApp.getId());
        account.setType(type);

        return accountService.save(userApp.getId(), account);
    }
}
