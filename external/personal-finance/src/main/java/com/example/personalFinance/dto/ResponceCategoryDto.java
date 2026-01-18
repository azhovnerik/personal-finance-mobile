package com.example.personalFinance.dto;

import lombok.AllArgsConstructor;

import java.util.List;

@AllArgsConstructor
public class ResponceCategoryDto {
    public boolean success;
    public String errmsg = "";
    public List<CategoryDto> categoryDtoList;
}
