package com.example.personalFinance.telegrambot;

import com.example.personalFinance.dto.CategoryDto;
import com.example.personalFinance.model.Account;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.ReplyKeyboard;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.ReplyKeyboardMarkup;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.buttons.KeyboardRow;

import java.util.ArrayList;
import java.util.List;

public class KeyboardFactory {

    public static ReplyKeyboard getCategoryList(List<CategoryDto> categoryList) {
        List<KeyboardRow> buttonList = new ArrayList<>();
        categoryList.stream().map(c -> c.getName()).forEach(category -> {
            KeyboardRow row = new KeyboardRow();
            row.add(category);
            buttonList.add(row);
        });
        return new ReplyKeyboardMarkup(buttonList);
    }

    public static ReplyKeyboard getAccountList(List<Account> accountList) {
        List<KeyboardRow> buttonList = new ArrayList<>();
        accountList.stream().map(account -> account.getName()).forEach(category -> {
            KeyboardRow row = new KeyboardRow();
            row.add(category);
            buttonList.add(row);
        });
        return new ReplyKeyboardMarkup(buttonList);
    }

    public static ReplyKeyboard getYesOrNo() {
        KeyboardRow row = new KeyboardRow();
        row.add("Yes");
        row.add("No");
        return new ReplyKeyboardMarkup(List.of(row));
    }

    public static ReplyKeyboard getEmptySelection() {
        return null;
    }
}
