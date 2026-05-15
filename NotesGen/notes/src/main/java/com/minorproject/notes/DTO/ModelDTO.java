package com.minorproject.notes.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;



@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class ModelDTO {
    private String baseUrl;
    private String modelName; // e.g. llama3.2:1b-instruct-q4_K_M or gemini-1.5-flash
    private Model model;      // e.g. gemini or ollama
}

