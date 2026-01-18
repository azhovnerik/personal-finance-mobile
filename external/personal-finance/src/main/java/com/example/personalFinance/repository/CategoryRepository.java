package com.example.personalFinance.repository;

import com.example.personalFinance.model.Category;
import com.example.personalFinance.model.CategoryProjection;
import com.example.personalFinance.model.CategoryType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CategoryRepository extends JpaRepository<Category, UUID> {

    @Query(value = "                         with user_categories as (select name, id\n" +
                   "                         from category\n" +
                   "                         where user_id = :userId\n" +
                  "                           and type = :categoryType\n" +
                   "                           and disabled = :disabled),\n" +
                   "\n" +
                   "     transactions as (select category_id, count(category_id) as frequency\n" +
                   "                      from transaction\n" +
                   "                      where user_id = :userId\n" +
                   "                      group by category_id)\n" +
                   "\n" +
                   "select coalesce(c.name, '') as name, coalesce(t.frequency, 0) as frequency\n" +
                   "from user_categories c\n" +
                   "         left join transactions t\n" +
                   "                   on c.id = t.category_id\n" +
                   "order by frequency desc, name\n",
            nativeQuery = true)
    List<CategoryProjection> findByUserIdAndTypeAndDisabledOrderByName(@Param("userId") UUID userId,@Param("categoryType") String categoryType, @Param("disabled") boolean disabled);

    List<Category> findByUserIdAndTypeAndDisabledOrderByParentId(UUID Id, CategoryType type, boolean disabled);

    List<Category> findByUserIdAndTypeOrderByParentId(UUID Id, CategoryType type);

    List<Category> findByUserIdAndTypeOrderByName(UUID userId, CategoryType type);

    List<Category> findByUserIdAndNameIgnoreCase(UUID id, String name);

    List<Category> findByUserIdAndTypeAndParentIdIsNull(UUID userId, CategoryType type);

    Optional<Category> findByUserIdAndId(UUID userId, UUID id);

    List<Category> findByParentIdAndDisabledIsFalse(UUID parentId);

}
