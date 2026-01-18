package com.example.personalFinance.dto;

import com.example.personalFinance.model.CategoryType;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;


@ToString
@Getter
@Setter
public class CategoryDto implements Serializable {

//    @NotNull
    private UUID id;

    private UUID parentId;

    private String parentName;

    @NotNull
    @NotEmpty
    private String name;

    private String description;

    private UUID userId;

    @NotNull
    private CategoryType type;

    @NotNull
    private Boolean disabled;

    private String icon;

    private UUID categoryTemplateId;

    public CategoryDto() {

    }
    
    public CategoryDto get(){
        return this;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        CategoryDto that = (CategoryDto) o;
        return id == that.id && Objects.equals(userId, that.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, userId);
    }
}
