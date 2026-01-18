package com.example.personalFinance.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.lang.Nullable;

import java.util.UUID;

@Entity
@Table(name = "category")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Category {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Nullable
    private UUID parentId;

    private String name;

    private String description;

    @Column(name = "user_id")
    private UUID userId;

    @Enumerated(EnumType.STRING)
    private CategoryType type;

    private Boolean disabled;

    @Column(length = 50)
    private String icon;

    @Column(name = "category_template_id")
    private UUID categoryTemplateId;
}
