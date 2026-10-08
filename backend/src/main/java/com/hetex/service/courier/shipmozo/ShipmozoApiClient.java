package com.hetex.service.courier.shipmozo;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hetex.service.courier.shipmozo.dto.ShipmozoInfoResponse;
import com.hetex.service.courier.shipmozo.dto.ShipmozoLoginRequest;
import com.hetex.service.courier.shipmozo.dto.ShipmozoLoginResponse;
import com.hetex.service.courier.shipmozo.dto.ShipmozoResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

@Service
public class ShipmozoApiClient {
    private static final Logger log = LoggerFactory.getLogger(ShipmozoApiClient.class);

    @Value("${hetex.shipmozo.base-url:https://shipping-api.com/app/api/v1}")
    private String baseUrl;

    @Value("${hetex.shipmozo.public-key:}")
    private String publicKey;

    @Value("${hetex.shipmozo.private-key:}")
    private String privateKey;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public ShipmozoApiClient() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    public ShipmozoApiClient(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    public boolean isConfigured() {
        return baseUrl != null && !baseUrl.isBlank()
                && publicKey != null && !publicKey.isBlank()
                && privateKey != null && !privateKey.isBlank();
    }

    private HttpHeaders createHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (isConfigured()) {
            headers.set("public-key", publicKey);
            headers.set("private-key", privateKey);
        }
        return headers;
    }

    public <T> ShipmozoResponse<T> get(String endpoint, ParameterizedTypeReference<ShipmozoResponse<T>> responseType) {
        return execute(endpoint, HttpMethod.GET, null, responseType);
    }

    public <T, R> ShipmozoResponse<T> post(String endpoint, R request, ParameterizedTypeReference<ShipmozoResponse<T>> responseType) {
        return execute(endpoint, HttpMethod.POST, request, responseType);
    }

    private <T, R> ShipmozoResponse<T> execute(String endpoint, HttpMethod method, R request, ParameterizedTypeReference<ShipmozoResponse<T>> responseType) {
        String url = baseUrl + endpoint;
        HttpHeaders headers = createHeaders();
        HttpEntity<R> entity = new HttpEntity<>(request, headers);

        try {
            log.info("Shipmozo API {} {}", method, endpoint); // Safe logging: url/endpoint, no secrets
            ResponseEntity<ShipmozoResponse<T>> response = restTemplate.exchange(url, method, entity, responseType);
            
            ShipmozoResponse<T> body = response.getBody();
            if (body == null) {
                throw new ShipmozoException("Received null response body from Shipmozo API");
            }
            if (!body.isSuccess()) {
                log.warn("Shipmozo API {} {} returned business error: {}", method, endpoint, body.message());
                throw new ShipmozoException("Shipmozo API Error: " + body.message());
            }
            return body;

        } catch (HttpStatusCodeException e) {
            log.error("Shipmozo HTTP Error {} {}: {}", method, endpoint, e.getStatusCode());
            throw new ShipmozoException("Shipmozo HTTP Error " + e.getStatusCode() + ": " + e.getResponseBodyAsString(), e);
        } catch (ResourceAccessException e) {
            log.error("Shipmozo Network/Timeout Error {} {}: {}", method, endpoint, e.getMessage());
            throw new ShipmozoException("Shipmozo Network Error: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("Shipmozo Unexpected Error {} {}: {}", method, endpoint, e.getMessage());
            throw new ShipmozoException("Shipmozo Unexpected Error: " + e.getMessage(), e);
        }
    }

    // --- Specific API Calls ---

    public ShipmozoResponse<ShipmozoLoginResponse> login(String username, String password) {
        ShipmozoLoginRequest request = new ShipmozoLoginRequest(username, password);
        return post("/login", request, new ParameterizedTypeReference<ShipmozoResponse<ShipmozoLoginResponse>>() {});
    }

    public ShipmozoResponse<ShipmozoInfoResponse> getInfo() {
        return get("/info", new ParameterizedTypeReference<ShipmozoResponse<ShipmozoInfoResponse>>() {});
    }
}
