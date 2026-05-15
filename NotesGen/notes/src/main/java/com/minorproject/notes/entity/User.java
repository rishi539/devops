package com.minorproject.notes.entity;




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
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    // Bidirectional relation with Notes
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JsonManagedReference // tells JSON serializer to go forward (User → Notes)
    private List<Notes> notesList = new ArrayList<>();
    public User(String username,String password) {
        this.username=username;
        this.password=password;
        notesList=new ArrayList<>();
    }
}
