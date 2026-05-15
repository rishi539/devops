package com.minorproject.notes.util;



import java.util.ArrayList;
import java.util.List;

/**
 * Character-based chunking for long transcripts.
 * Small models benefit from smaller chunks (≈1500 chars) + overlap context.
 */
public class TokenSplitter {

    private final int chunkSize;
    private final int overlap;

    public TokenSplitter(int chunkSize, int overlap) {
        this.chunkSize = chunkSize;
        this.overlap = overlap;
    }

    public List<String> split(String text) {
        List<String> parts = new ArrayList<>();
        if (text == null || text.isEmpty()) return parts;

        int idx = 0;
        while (idx < text.length()) {
            int end = Math.min(idx + chunkSize, text.length());
            String chunk = text.substring(idx, end);
            parts.add(chunk.trim());
            idx = end - overlap;
            if (idx < 0) idx = 0;
        }
        return parts;
    }
}
