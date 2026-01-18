package com.example.personalFinance.templates;

import static org.junit.jupiter.api.Assertions.assertFalse;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;

class BudgetDetailsTemplateTest {

    @Test
    void templateDoesNotContainBrokenClosingTags() throws IOException {
        String template = Files.readString(Path.of("src/main/resources/templates/budget-details.html"));

        assertFalse(template.contains("</s\n"), "Template contains a span closing tag split across lines");
        assertFalse(template.contains("</t\n"), "Template contains a table closing tag split across lines");
    }
}
