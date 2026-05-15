package com.minorproject.notes.service;

import com.minorproject.notes.entity.User;
import com.minorproject.notes.repo.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class UserService {
    @Autowired
    UserRepo userRepo;
    public void createUser(String username,String password) {
        User user=new User(username,password);
        userRepo.save(user);
    }

    public User login(String username,String password) {
        User user=userRepo.getByUsername(username);
        if(user.getPassword().equals(password))
            return user;
        return null;
    }

}
