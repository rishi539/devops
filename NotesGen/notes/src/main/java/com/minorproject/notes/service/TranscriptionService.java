package com.minorproject.notes.service;



import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Value;
import java.util.HashMap;
import java.util.Map;

@Service
public class TranscriptionService {

    @Value("${FLASK_API_URL:http://127.0.0.1:5001/transcribe}")
    private String flaskApiUrl;

    public String getTranscript(String youtubeUrl) {
        try {
            // Create request body
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("url", youtubeUrl);
            requestBody.put("model", "small");
            requestBody.put("keep_audio", false);

            // Create headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // Wrap request
            HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(requestBody, headers);

            // Use RestTemplate to send POST request
            RestTemplate restTemplate = new RestTemplate();
            ResponseEntity<Map> response = restTemplate.exchange(
                    flaskApiUrl,
                    HttpMethod.POST,
                    requestEntity,
                    Map.class
            );

            // Extract text from response
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return (String) response.getBody().get("text");
            } else {
                return "Error: Invalid response from Flask API.";
            }

        } catch (Exception e) {
            e.printStackTrace();
            return "Error calling Flask API: " + e.getMessage();
        }
    }
}
