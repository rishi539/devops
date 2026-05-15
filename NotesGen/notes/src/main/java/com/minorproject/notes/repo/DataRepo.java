package com.minorproject.notes.repo;

import com.minorproject.notes.entity.Data;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DataRepo extends JpaRepository<Data,Long> {
}
