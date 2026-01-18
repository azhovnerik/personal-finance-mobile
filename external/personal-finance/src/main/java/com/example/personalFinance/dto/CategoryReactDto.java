package com.example.personalFinance.dto;

import com.example.personalFinance.model.CategoryType;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.io.Serializable;
import java.util.List;
import java.util.UUID;


@ToString
@Getter
@Setter
public class CategoryReactDto implements Serializable {

    @NotNull
    private UUID id;

    @NotNull
    @NotEmpty
    private String name;

    private String description;

    @NotNull
    private CategoryType type;

    @NotNull
    private Boolean disabled;

    private List<CategoryReactDto> subcategories;

    private String icon;

    private UUID categoryTemplateId;

    public CategoryReactDto() {
    }
}
