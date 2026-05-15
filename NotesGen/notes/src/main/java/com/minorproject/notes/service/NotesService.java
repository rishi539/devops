package com.minorproject.notes.service;



import com.minorproject.notes.DTO.Model;
import com.minorproject.notes.DTO.ModelDTO;
import com.minorproject.notes.entity.Data;
import com.minorproject.notes.entity.Notes;
import com.minorproject.notes.repo.DataRepo;
import jakarta.persistence.Entity;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.ai.chat.client.ChatClient;

import org.springframework.ai.document.Document;
import org.springframework.ai.google.genai.GoogleGenAiChatModel;
import org.springframework.ai.ollama.OllamaChatModel;
import org.springframework.ai.ollama.api.OllamaApi;
import org.springframework.ai.ollama.api.OllamaOptions;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;


import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;


import java.util.List;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter

public class NotesService {

    private ChatClient chatClient;
    private Notes notes;
    private List<String> chunks;
    private String summarySize;
    private String previousSummary = "";
    @Autowired
    DataRepo dataRepo;

    ModelDTO modelDTO;

    @Autowired
    GoogleGenAiChatModel g;

    public void setChatClient(ModelDTO modelDTO) {
        this.modelDTO=modelDTO;
        if(modelDTO.getModel()==Model.ollama) {
            System.out.println(modelDTO.getBaseUrl());
            OllamaApi ollamaApi = OllamaApi.builder()
                    .baseUrl(modelDTO.getBaseUrl())
                    .build();

            // === 2️⃣ Build Ollama Chat Model dynamically ===
            this.chatClient=ChatClient.create(OllamaChatModel.builder()
                    .ollamaApi(ollamaApi)
                    .defaultOptions(OllamaOptions.builder()
                            .model(modelDTO.getModelName())
                            .temperature(0.8)
                            .build())
                    .build());
        }
        else {
            this.chatClient=ChatClient.create(g);
        }
    }

    // Split transcript into chunks
    public List<String> tokenSplitter(String transcript) {
        TokenTextSplitter splitter;
        if(modelDTO.getModel()==Model.ollama)
            splitter= new TokenTextSplitter(500, 100, 5, 1000, false);
        else
            splitter= new TokenTextSplitter(1000,100,50,2000,false);
        List<Document> documents = splitter.split(List.of(new Document(transcript)));
        this.chunks = documents.stream().map(Document::getText).toList();
        return chunks;
    }

    // Generate HTML notes for ALL chunks
    public String generateHtmlNotes(String transcript) {
        StringBuilder finalNotes = new StringBuilder();
        for (int i = 0; i < chunks.size(); i++) {
            finalNotes.append(generateHtmlChunk(i)).append("\n");
        }
        return finalNotes.toString();
    }

    public static String cleanModelHtml(String html) {
        if (html == null || html.isBlank()) return "<body><div></div></body>";

        String cleaned = html.trim();

        // 1️⃣ If <body> exists → keep only what’s inside <body>...</body>
        Matcher bodyMatcher = Pattern.compile("<body[^>]*>([\\s\\S]*?)</body>", Pattern.CASE_INSENSITIVE)
                .matcher(cleaned);
        if (bodyMatcher.find()) {
            cleaned = bodyMatcher.group(1).trim();
        } else {
            // 2️⃣ Otherwise → keep content from first <div> to last </div>
            Matcher divMatcher = Pattern.compile("<div[\\s\\S]*</div>", Pattern.CASE_INSENSITIVE)
                    .matcher(cleaned);
            if (divMatcher.find()) {
                cleaned = divMatcher.group(0).trim();  // ✅ get the full matched div block
            } else {
                // 3️⃣ If no <div> found, just return everything (fallback)
                cleaned = cleaned.trim();
            }
        }

        // 4️⃣ Ensure single <body><div> wrapper if not present
        if (!cleaned.startsWith("<body>")) {
            cleaned = "<body>" + cleaned + "</body>";
        }

        return cleaned;
    }
    // 🔹 NEW METHOD: Generate HTML for one chunk by index
    public String generateHtmlChunk(int index) {
        if (chunks == null || index < 0 || index >= chunks.size()) {
            return "Invalid chunk index.";
        }

        String chunk = chunks.get(index);
        String prompt = buildPrompt(chunk, previousSummary, index + 1, chunks.size());

        // Call LLM model
        String response = chatClient
                .prompt()
                .user(prompt)
                .call()
                .content();
        System.out.println("Done");

        // Update summary context for continuity
        previousSummary = createShortSummary(response);
        Data data=new Data(response,notes);
        dataRepo.save(data);
        return response;
    }

    private String buildPrompt(String chunk, String prevSummary, int current, int total) {
        String summaryType = this.summarySize;
        String summaryGuidelines = switch (summaryType.toLowerCase()) {
            case "short" -> """
            - Keep it **very concise**, focusing only on **core definitions, formulas, and key ideas**.
            - Omit examples, stories, or repetitive explanations.
            - Use bullet points or numbered lists where possible.
            - Output length should be about **25–35%** of the original text.
            """;
            case "medium" -> """
            - Maintain **balanced detail**: include main ideas, important examples, and transitions.
            - Explain topics clearly but briefly, ensuring readability and logical flow.
            - Output length should be about **50–60%** of the transcript.
            """;
            case "detailed" -> """
            - Include **every concept and example** relevant to understanding the lecture.
            - Expand slightly with brief explanations and smooth transitions between sections.
            - Use subheadings and lists to improve clarity.
            - Output length can be **70–90%** of the transcript.
            """;
            default -> """
            - Keep a moderate level of detail (similar to medium mode).
            - Focus on clarity, conciseness, and structure.
            """;
        };

        return """
You are an expert technical educator and instructional designer creating **structured, professional course notes** from lecture transcripts.

TASK:
Transform this transcript segment (%d/%d) into a clean, well-structured **set of HTML study notes** suitable for a course website.

OUTPUT REQUIREMENTS:
- Output only valid HTML (no <html> or <head> tags).
- Wrap everything inside:
  <div class="p-8 max-w-4xl mx-auto leading-relaxed text-gray-800">
- Use Tailwind CSS classes for spacing, typography, and readability.
- Organize content using headings (<h2>, <h3>), lists, and highlighted key terms (<strong>, <code>, etc.).
- Maintain logical flow as if preparing notes for student revision.
- DO NOT include:
   Greetings, YouTube/video-style phrases, or personal commentary.
   Any jokes, humor, sarcasm, filler words, or casual chatter.
   Off-topic dialogue or conversational banter between speakers.
- Include only **technical, conceptual, or educationally relevant content**.
- Summarize and organize the material clearly and neutrally.
- Write in a **formal, academic, and professional** tone suitable for study notes.
- Focus on content quality, clarity, and clean UI/UX.
- Continue smoothly from previous context if relevant.

NOTES DEPTH & STYLE: (%s mode)
%s

PREVIOUS CONTEXT:
%s

TRANSCRIPT SEGMENT:
%s
""".formatted(current, total, summaryType, summaryGuidelines, prevSummary, chunk);

    }







    private String createShortSummary(String htmlChunk) {
        String plain = htmlChunk.replaceAll("<[^>]+>", " ")
                .replaceAll("\\s+", " ")
                .trim();
        return plain.length() > 400 ? plain.substring(0, 400) + "..." : plain;
    }
}



//public class NotesService {
//    @Autowired
//    private ChatClient chatClient;
//    List<String> chunks;
//    String summarySize;
//    public NotesService(String summarySize) {
//        this.summarySize=summarySize;
//    }
//
//    public List<String> tokenSplitter(String transcript) {
//        // ✅ TokenTextSplitter tuned for small models
//        TokenTextSplitter tokenTextSplitter = new TokenTextSplitter(500, 100, 5, 1000, false);
//
//        // ✅ Wrap transcript into a single Document (no need for TextReader)
//        List<Document> documents = tokenTextSplitter.split(List.of(new Document(transcript)));
//
//        // ✅ Extract chunks
//        this.chunks= documents.stream()
//                .map(Document::getText)
//                .toList();
//        return chunks;
//    }
//
//    public String generateHtmlNotes(String transcript) {
//
//        StringBuilder finalNotes = new StringBuilder();
//        String previousSummary = "";
//
//        for (int i = 0; i < chunks.size(); i++) {
//            String currentChunk = chunks.get(i);
//            String prompt = buildPrompt(currentChunk, previousSummary, i + 1, chunks.size());
//
//            // Call the model using ChatClient
//            String response = chatClient
//                    .prompt()
//                    .user(prompt)
//                    .call()
//                    .content();
//
//            // Append this chunk’s HTML output
//
//            System.out.println(response);
//
//            finalNotes.append(response).append("\n");
//
//            // Generate short summary of this chunk for continuity
//            previousSummary = createShortSummary(response);
//        }
//
//        return finalNotes.toString(); // Full HTML <body> content
//    }
//
//    private String buildPrompt(String chunk, String prevSummary, int current, int total) {
//        return """
//            You are an expert technical educator generating course notes from transcripts.
//
//            TASK:
//            Convert this transcript segment (%d/%d) into concise, readable HTML inside <body> (no <html> or <head> tags).
//            Keep design consistent using Tailwind CSS.
//            Assume earlier sections have already been summarized — continue naturally.
//
//            STYLE:
//            - Use <div class="p-8 max-w-4xl mx-auto"> as the main wrapper.
//            - Use <h1>, <h2>, <p>, <ul>, <li>, <strong> appropriately.
//            - Add Tailwind classes for spacing, typography, and clarity.
//            - Keep the flow engaging and educational.
//
//            PREVIOUS CONTEXT:
//            %s
//
//            TRANSCRIPT SEGMENT:
//            %s
//            """.formatted(current, total, prevSummary, chunk);
//    }
//
//    private String createShortSummary(String htmlChunk) {
//        String plain = htmlChunk.replaceAll("<[^>]+>", " ")
//                .replaceAll("\\s+", " ")
//                .trim();
//
//        return plain.length() > 400 ? plain.substring(0, 400) + "..." : plain;
//    }
//}

