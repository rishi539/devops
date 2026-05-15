package com.minorproject.notes.controller;

import com.minorproject.notes.DTO.NoteId;
import com.minorproject.notes.DTO.Youtube;
import com.minorproject.notes.entity.Data;
import com.minorproject.notes.entity.Notes;
import com.minorproject.notes.entity.User;
import com.minorproject.notes.repo.DataRepo;
import com.minorproject.notes.repo.NotesRepo;
import com.minorproject.notes.repo.UserRepo;
import com.minorproject.notes.service.NotesService;
import com.minorproject.notes.service.TranscriptionService;
import com.sun.jdi.PrimitiveValue;
import org.springframework.context.ApplicationContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Date;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.web.bind.annotation.*;
import org.stringtemplate.v4.DateRenderer;

@RestController
@RequestMapping("/notes")
public class NotesController {

    private final ConcurrentHashMap<Long, NotesService> concurrentHashMap;

    @Autowired
    private TranscriptionService transcriptionService;

    @Autowired
    private ApplicationContext context;

    @Autowired
    private UserRepo userRepo;
    @Autowired
    private NotesRepo notesRepo;
    @Autowired
    private DataRepo dataRepo;
    public NotesController() {
        this.concurrentHashMap = new ConcurrentHashMap<>();
    }

    // 🔹 STEP 1: Generate transcript + split into chunks
    @PostMapping("/getNotes")
    public NoteId getNotes(@RequestBody Youtube yt) {
        User user=userRepo.getById(yt.getId());
        Notes notes=new Notes(yt.getName(),user);
        notes=notesRepo.save(notes);
        // 1. Get transcript
        String transcript = transcriptionService.getTranscript(yt.getUrl());

        // 2. Create a new NotesService instance
        NotesService notesService = context.getBean(NotesService.class);
        notesService.setChatClient(yt.getModelDTO());
        notesService.setSummarySize(yt.getSummaryType());
        notesService.setNotes(notes);
        // 3. Split transcript into chunks
        int size = notesService.tokenSplitter(transcript).size();

        // 4. Store NotesService for later retrieval
        concurrentHashMap.put(notes.getId(), notesService); // can map by user/session later
        return new NoteId(size, notes.getId());
    }

    // 🔹 STEP 2: Generate HTML for a specific chunk index
    @GetMapping("/generateChunk/{id}/{index}")
    public String generateChunk(@PathVariable Long id, @PathVariable int index) {
        NotesService notesService = concurrentHashMap.get(id);
        if (notesService == null) {
            return "Error: No session found for ID " + id;
        }
        return notesService.generateHtmlChunk(index);
    }

    // 🔹 Optional: Generate full HTML (for completeness)
    @GetMapping("/generateAll/{id}")
    public String generateAll(@PathVariable Long id) {
        NotesService notesService = concurrentHashMap.get(id);
        if (notesService == null) {
            return "Error: No session found for ID " + id;
        }
        return notesService.generateHtmlNotes("");
    }

    @PostMapping("/saveNotes")
    public void saveNotes(@RequestBody Data data) {
        Data d=dataRepo.findById(data.getId()).orElseThrow(()->new Error("NOt found"));
        d.setHtmlCode(data.getHtmlCode());
        dataRepo.save(d);
    }
    @DeleteMapping("/deleteNotes/{id}")
    public void deleteNotes(@PathVariable Long id) {
        System.out.println("Deleting Note ID: " + id);
        Notes note = notesRepo.findById(id).orElse(null);
        if (note != null) {
            if (note.getUser() != null) {
                note.getUser().getNotesList().remove(note);
            }
            notesRepo.delete(note);
        }
    }
}

