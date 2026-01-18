package com.example.personalFinance.web;

import com.example.personalFinance.dto.CategoryDto;
import com.example.personalFinance.exception.DuplicateCategoryException;
import com.example.personalFinance.exception.NonExistedException;
import com.example.personalFinance.mapper.CategoryMapper;
import com.example.personalFinance.model.Category;
import com.example.personalFinance.model.CategoryType;
import com.example.personalFinance.service.IconService;
import com.example.personalFinance.security.SecurityService;
import com.example.personalFinance.service.CategoryService;
import com.example.personalFinance.service.UserCategoryService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.List;
import java.util.UUID;

@Controller
public class CategoryController {
    @Autowired
    UserCategoryService userCategoryService;

    @Autowired
    CategoryService categoryService;

    @Autowired
    SecurityService securityService;

    @Autowired
    CategoryMapper categoryMapper;

    @Autowired
    IconService iconService;


    @GetMapping("/categories")
    public String getCategoriesPage() {
        return "categories";
    }

    @GetMapping("/categories/add")
    public String addCategory(Model model, @RequestParam(value = "type") String type,
                              @RequestParam(value = "parentId", required = false) UUID parentId) {
        if (!model.containsAttribute("category")) {
            CategoryDto categoryDto = new CategoryDto();
            categoryDto.setType(CategoryType.valueOf(type));
            categoryDto.setParentId(parentId);
            model.addAttribute("category", categoryDto);
        }
        CategoryDto categoryDto = (CategoryDto) model.asMap().get("category");
        model.addAttribute("icons", iconService.getAvailableIcons());
        return "category-add";
    }

    @PostMapping("/categories")
    public String saveNewCategory(@Valid @ModelAttribute("category") CategoryDto categoryDto, BindingResult result,
                                  RedirectAttributes redirectAttributes, Model model, HttpServletRequest request) {
        if (result.hasErrors()) {
            model.addAttribute("category", categoryDto);
            model.addAttribute("icons", iconService.getAvailableIcons());
            return "category-add";
        }
        try {
            UserDetails currentUserDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            userCategoryService.addCategory(currentUserDetails.getUsername(), categoryDto);
        } catch (DuplicateCategoryException e) {
            redirectAttributes.addFlashAttribute("errorMessage"
                    , "The category with this name is existed! New category couldn't be saved!");
            redirectAttributes.addFlashAttribute("category", categoryDto);
            String referer = request.getHeader("Referer");
            return "redirect:" + referer;
        }
        return "redirect:/categories";
    }

    @GetMapping("/categories/{id}")
    public String editCategory(@PathVariable(value = "id") UUID id, @RequestParam(value = "type") String type, Model model) {
        if (!model.containsAttribute("errorMessage")) {
            UserDetails userDetail = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            Category category;
            try {
                category = userCategoryService.findCategoryById(userDetail.getUsername(), id);
                model.addAttribute("category", categoryMapper.toDto(category, categoryService));
            } catch (NonExistedException e) {
                model.addAttribute("message", "There is no category with such id!");
                return "error";
            }
            List<Category> rootCategories = userCategoryService.getRootCategoriesByUserAndType(userDetail.getUsername(), type);
            rootCategories.remove(category);
            model.addAttribute("rootCategories", rootCategories);
            if (category.getParentId() != null) {
                model.addAttribute("currentParent", userCategoryService.findCategoryById(userDetail.getUsername(), category.getParentId()));
            } else {
                model.addAttribute("currentParent", "");
            }
            model.addAttribute("icons", iconService.getAvailableIcons());
        }
        CategoryDto categoryDto = (CategoryDto) model.asMap().get("category");
        if (!model.containsAttribute("icons") && categoryDto != null) {
            model.addAttribute("icons", iconService.getAvailableIcons());
        }
        return "category-details";
    }

    @PutMapping("/categories/{id}")
    public String saveCategoryChanges(
            @PathVariable(value = "id") UUID id,
            @ModelAttribute("category") CategoryDto categoryDto,
            BindingResult result,
            @RequestParam String name,
            @RequestParam String description,
            @RequestParam String newParentId,
            RedirectAttributes redirectAttributes, Model model, HttpServletRequest request) {
        if (result.hasErrors()) {
            model.addAttribute("category", categoryDto);
            model.addAttribute("icons", iconService.getAvailableIcons());
            return "category-details";
        }
        UserDetails currentUserDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        try {
            userCategoryService.save(currentUserDetails.getUsername(), categoryDto, newParentId);
        } catch (DuplicateCategoryException e) {
            categoryDto.setName(name);
            categoryDto.setDescription(description);
            categoryDto.setParentId(categoryDto.getParentId());
            categoryDto.setDisabled(categoryDto.getDisabled());

            redirectAttributes.addFlashAttribute("errorMessage"
                    , "The category with this name is already existed! Changes to category couldn't be saved!");
            redirectAttributes.addFlashAttribute("category", categoryDto);

            List<Category> rootCategories = userCategoryService.getRootCategoriesByUserAndType(currentUserDetails.getUsername(), categoryDto.getType().toString());
            rootCategories.remove(categoryDto);
            redirectAttributes.addFlashAttribute("rootCategories", rootCategories);
            if (categoryDto.getParentId() != null) {
                redirectAttributes.addFlashAttribute("currentParent"
                        , userCategoryService.findCategoryById(currentUserDetails.getUsername(), categoryDto.getParentId()));
            } else {
                redirectAttributes.addFlashAttribute("currentParent", "");
            }
            String referer = request.getHeader("Referer");
            return "redirect:" + referer;
        } catch (NonExistedException e) {
            categoryDto.setName(name);
            categoryDto.setDescription(description);
            categoryDto.setParentId(categoryDto.getParentId());
            redirectAttributes.addFlashAttribute("errorMessage", "The category is not exist!");
            redirectAttributes.addFlashAttribute("category", categoryDto);
            String referer = request.getHeader("Referer");
            return "redirect:" + referer;
        }
        return "redirect:/categories";
    }

    @DeleteMapping("/categories/{id}")
    public String deleteCategory(@PathVariable(value = "id") UUID id,
                                 RedirectAttributes redirectAttributes, HttpServletRequest request) {
        UserDetails currentUserDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        boolean success = userCategoryService.deleteCategory(currentUserDetails.getUsername(), id);
        if (!success) {
            Category category = userCategoryService.findCategoryById(currentUserDetails.getUsername(), id);
            CategoryDto categoryDto = categoryMapper.toDto(category, categoryService);
            redirectAttributes.addFlashAttribute("errorMessage", "There are links to this category. It's impossible to delete it!");
            redirectAttributes.addFlashAttribute("category", categoryDto);
            String referer = request.getHeader("Referer");
            return "redirect:" + referer;
        }
        return "redirect:/categories";
    }
}
