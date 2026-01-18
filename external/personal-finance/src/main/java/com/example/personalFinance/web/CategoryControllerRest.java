package com.example.personalFinance.web;

import com.example.personalFinance.dto.CategoryDto;
import com.example.personalFinance.dto.CategoryReactDto;
import com.example.personalFinance.dto.ResponceCategoryDto;
import com.example.personalFinance.mapper.CategoryMapper;
import com.example.personalFinance.service.CategoryService;
import com.example.personalFinance.service.UserCategoryService;
import com.example.personalFinance.utils.ExtractJWT;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@CrossOrigin("http://localhost:3000")
@RestController
public class CategoryControllerRest {
    @Autowired
    UserCategoryService userCategoryService;

    @Autowired
    CategoryService categoryService;

    @Autowired
    CategoryMapper categoryMapper;

    @GetMapping("/api/v1/categories")
    public ResponceCategoryDto getCategories(@RequestParam(value = "type") String type,
                                             @RequestParam(value = "disabled", defaultValue = "false", required = false) String disabled) {
        UserDetails currentUserDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        List<CategoryDto> categories = userCategoryService.getCategoriesByUserAndType(
                currentUserDetails.getUsername(), type, Boolean.valueOf(disabled));
        return new ResponceCategoryDto(true, "", categories);
    }

    @GetMapping("/api/v2/categories/tree")
    public ResponseEntity showCategories(@RequestHeader(value = "Authorization") String token, @RequestParam(value = "type") String type) throws Exception {
        String userEmail = ExtractJWT.payloadJWTExtraction(token);
        if (userEmail == null) {
            throw new Exception("User email is missing");
        }
        List<CategoryReactDto> categoryReactDtos = categoryService
                .getCategoryTree(categoryMapper.toModelList(userCategoryService.getCategoriesByUserAndType(userEmail, type, false)));

        return ResponseEntity.ok(categoryReactDtos);
    }
}
