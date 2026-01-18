package com.example.personalFinance.web.rest;

import com.example.personalFinance.dto.BudgetCategoryDto;
import com.example.personalFinance.exception.DuplicateBudgetException;
import com.example.personalFinance.exception.NonExistedException;
import com.example.personalFinance.mapper.BudgetCategoryMapper;
import com.example.personalFinance.mapper.BudgetDetailedMapper;
import com.example.personalFinance.mapper.BudgetMapper;
import com.example.personalFinance.mapper.CategoryMapper;
import com.example.personalFinance.model.Budget;
import com.example.personalFinance.model.BudgetCategory;
import com.example.personalFinance.service.*;
import com.example.personalFinance.usecase.GetCategorySelectListForBudgetUseCase;
import com.example.personalFinance.utils.ExtractJWT;
import com.example.personalFinance.web.rest.dto.AddBudgetDto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@CrossOrigin("http://localhost:3000")
@RestController
@RequestMapping("/api/v2/budgets")
public class BudgetControllerRest {
    @Autowired
    UserBudgetService userBudgetService;

    @Autowired
    BudgetService budgetService;

    @Autowired
    TransactionService transactionService;

    @Autowired
    CategoryService categoryService;

    @Autowired
    UserService userService;

    @Autowired
    BudgetMapper budgetMapper;

    @Autowired
    CategoryMapper categoryMapper;

    @Autowired
    BudgetCategoryMapper budgetCategoryMapper;

    @Autowired
    BudgetDetailedMapper budgetDetailedMapper;

    @Autowired
    GetCategorySelectListForBudgetUseCase getCategorySelectListForBudgetUseCase;


    @GetMapping
    public ResponseEntity showBudgets(@RequestHeader(value = "Authorization") String token) throws Exception {
        String userEmail = ExtractJWT.payloadJWTExtraction(token);
        if (userEmail == null) {
            throw new Exception("User email is missing");
        }
        List<Budget> budgets = userBudgetService.getBudgetsByUserEmail(userEmail);

        return ResponseEntity.ok(budgetMapper.toDtoList(budgets));
    }

    @GetMapping("/{id}")
    public ResponseEntity getBudget(@RequestHeader(value = "Authorization") String token, @PathVariable(value = "id") String id) throws Exception {
        String userEmail = ExtractJWT.payloadJWTExtraction(token);
        if (userEmail == null) {
            throw new Exception("User email is missing");
        }
        Budget budget = userBudgetService.findBudget(userEmail, UUID.fromString(id));
        return ResponseEntity.ok(budgetDetailedMapper.toDto(budget, budgetService, transactionService, categoryService, categoryMapper));
    }

    @PostMapping("/{id}/category/add")
    public ResponseEntity saveNewBudgetCategory(@RequestHeader(value = "Authorization") String token,
                                                @RequestBody BudgetCategoryDto budgetCategoryDto) {

        BudgetCategory budgetCategory = budgetService.saveBudgetCategory(budgetCategoryDto.getBudgetId(), budgetCategoryMapper.toModel(budgetCategoryDto, budgetService));
        return ResponseEntity.ok(budgetCategory);
    }

    @PutMapping("/{id}/category/edit")
    public ResponseEntity saveExistedBudgetCategory(@RequestHeader(value = "Authorization") String token,
                                                    @RequestBody BudgetCategoryDto budgetCategoryDto) {

        BudgetCategory budgetCategory = budgetService.saveBudgetCategory(budgetCategoryDto.getBudgetId(), budgetCategoryMapper.toModel(budgetCategoryDto, budgetService));
        return ResponseEntity.ok(budgetCategory);
    }

    @DeleteMapping("/{id}/category/delete")
    public ResponseEntity deleteBudgetCategory(@RequestHeader(value = "Authorization") String token,
                                               @PathVariable(value = "id") String id, @RequestBody BudgetCategoryDto budgetCategoryDto) throws Exception {
        BudgetCategory budgetCategory = userBudgetService.findBudgetCategoryById(budgetCategoryDto.getId());
        String userEmail = ExtractJWT.payloadJWTExtraction(token);
        if (userEmail == null) {
            throw new Exception("User email is missing");
        }
        Budget budget = budgetCategory.getBudget();
        userBudgetService.deleteBudgetCategory(userEmail, UUID.fromString(id), budgetCategoryDto.getId());
        return ResponseEntity.ok(budgetCategory);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity deleteBudget(@RequestHeader(value = "Authorization") String token,
                                       @PathVariable(value = "id") String id) throws Exception {
        String userEmail = ExtractJWT.payloadJWTExtraction(token);
        if (userEmail == null) {
            throw new Exception("User email is missing");
        }
        userBudgetService.deleteBudget(userEmail, UUID.fromString(id));
        return ResponseEntity.ok(id);
    }

    @PostMapping("/add")
    public ResponseEntity saveNewBudget(@RequestHeader(value = "Authorization") String token,
                                        @RequestBody AddBudgetDto addBudgetDto) throws Exception {

        String userEmail = ExtractJWT.payloadJWTExtraction(token);
        if (userEmail == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(null); // Or use a custom error DTO
        }
        return userService.findByEmail(userEmail)
                .map(user -> {
                    Budget budget = userBudgetService.addBudget(userEmail, addBudgetDto.getMonth(), BigDecimal.ZERO, BigDecimal.ZERO);
                    return ResponseEntity.ok(budget);
                })
                .orElseGet(() -> ResponseEntity.badRequest().build());
    }

    @ExceptionHandler(DuplicateBudgetException.class)
    public ResponseEntity<Map<String, String>> handleDuplicateBudgetException(DuplicateBudgetException ex) {
        Map<String, String> response = new HashMap<>();
        response.put("error", "Duplicate Budget");
        response.put("message", ex.getMessage());

        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(NonExistedException.class)
    public ResponseEntity<Map<String, String>> handleNonExistedException(NonExistedException ex) {
        Map<String, String> response = new HashMap<>();
        response.put("error", "Non-existed exception");
        response.put("message", ex.getMessage());

        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }
}
