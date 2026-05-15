package com.minorproject.notes.entity;


import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Entity
public class Data {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "LONGTEXT")
    private String htmlCode;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "notes_id")
    @JsonBackReference // prevents recursion (Data → Notes)
    private Notes notes;
    public  Data(String htmlCode,Notes notes) {
        this.htmlCode=htmlCode;
        this.notes=notes;
    }
    public Data(Long id,String htmlCode) {
        this.id=id;
        this.htmlCode=htmlCode;
    }
}
