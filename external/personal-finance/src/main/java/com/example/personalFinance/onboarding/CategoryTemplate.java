package com.example.personalFinance.onboarding;

import com.example.personalFinance.model.CategoryType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "category_template")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CategoryTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID) // Hibernate 6 / Spring Boot 3+
    private UUID id;

    @Column(name = "code", length = 100, nullable = false, unique = true)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", length = 20, nullable = false)
    private CategoryType type;

    @Column(name = "group_code", length = 50)
    private String groupCode;

    @Builder.Default
    @Column(name = "popularity_score", nullable = false)
    private int popularityScore = 0;

    @Column(name = "default_color", length = 7)
    private String defaultColor;

    @Column(name = "icon", length = 50)
    private String icon;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
