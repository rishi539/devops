package com.minorproject.notes.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class ConfigPrinter implements CommandLineRunner {

    @Value("${spring.ai.ollama.base-url}")
    private String baseUrl;

    @Value("${spring.ai.ollama.model}")
    private String model;

    @Override
    public void run(String... args) {
        System.out.println(">>> Using Ollama endpoint: " + baseUrl);
        System.out.println(">>> Using model: " + model);
    }
}

