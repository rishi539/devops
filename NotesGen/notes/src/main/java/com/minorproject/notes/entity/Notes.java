package com.minorproject.notes.entity;



import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Entity
public class Notes {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    // Link back to User
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id")
    @JsonBackReference // prevents recursion (Notes → User)
    private User user;

    // Link to Data
    @OneToMany(mappedBy = "notes", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JsonManagedReference // forward direction (Notes → Data)
    private List<Data> dataList = new ArrayList<>();

    public Notes(String name,User user) {
        this.name=name;
        this.user=user;
        dataList=new ArrayList<>();
    }
}

