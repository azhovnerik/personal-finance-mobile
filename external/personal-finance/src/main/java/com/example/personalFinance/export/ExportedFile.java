package com.example.personalFinance.export;

public record ExportedFile(byte[] content, String fileName, String contentType) {
}
