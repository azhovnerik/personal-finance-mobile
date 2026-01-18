package com.example.personalFinance.onboarding;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "category_template_i18n")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CategoryTemplateI18n {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "template_id")
    private UUID categoryTemplateId;

    private String locale;

    private String name;

    private String description;
}
