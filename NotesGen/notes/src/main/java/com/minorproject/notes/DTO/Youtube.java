package com.minorproject.notes.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class Youtube {
    String url;
    String summaryType;
    String name;
    Long id;
    ModelDTO modelDTO;
    public Youtube(String url ,String summaryType,ModelDTO modelDTO) {
        this.url = url;
        this.summaryType = summaryType;
        this.modelDTO=modelDTO;
    }

}

