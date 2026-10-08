package com.hetex.service.courier.shipmozo;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hetex.service.courier.shipmozo.dto.ShipmozoInfoResponse;
import com.hetex.service.courier.shipmozo.dto.ShipmozoLoginResponse;
import com.hetex.service.courier.shipmozo.dto.ShipmozoResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class ShipmozoApiClientTest {

    private ShipmozoApiClient apiClient;
    private MockRestServiceServer mockServer;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        RestTemplate restTemplate = new RestTemplate();
        objectMapper = new ObjectMapper();
        apiClient = new ShipmozoApiClient(restTemplate, objectMapper);
        mockServer = MockRestServiceServer.createServer(restTemplate);

        ReflectionTestUtils.setField(apiClient, "baseUrl", "https://api.test");
        ReflectionTestUtils.setField(apiClient, "publicKey", "test-pub");
        ReflectionTestUtils.setField(apiClient, "privateKey", "test-priv");
    }

    @Test
    void testGetInfoSuccess() throws Exception {
        String responseJson = """
            {
              "result": "1",
              "message": "Success",
              "data": {
                "Info": "Hello External V1 Api World!"
              }
            }
            """;

        mockServer.expect(requestTo("https://api.test/info"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("public-key", "test-pub"))
                .andExpect(header("private-key", "test-priv"))
                .andRespond(withSuccess(responseJson, MediaType.APPLICATION_JSON));

        ShipmozoResponse<ShipmozoInfoResponse> response = apiClient.getInfo();

        assertTrue(response.isSuccess());
        assertEquals("Success", response.message());
        assertNotNull(response.data());
        assertEquals("Hello External V1 Api World!", response.data().info());
        mockServer.verify();
    }

    @Test
    void testLoginSuccess() throws Exception {
        String responseJson = """
            {
              "result": "1",
              "message": "Success",
              "data": {
                "name": "testuser",
                "public_key": "new-pub",
                "private_key": "new-priv"
              }
            }
            """;

        mockServer.expect(requestTo("https://api.test/login"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(responseJson, MediaType.APPLICATION_JSON));

        ShipmozoResponse<ShipmozoLoginResponse> response = apiClient.login("user", "pass");

        assertTrue(response.isSuccess());
        assertEquals("new-pub", response.data().publicKey());
        assertEquals("new-priv", response.data().privateKey());
        mockServer.verify();
    }

    @Test
    void testApiBusinessError() {
        String responseJson = """
            {
              "result": "0",
              "message": "Invalid Credentials",
              "data": null
            }
            """;

        mockServer.expect(requestTo("https://api.test/info"))
                .andRespond(withSuccess(responseJson, MediaType.APPLICATION_JSON));

        ShipmozoException exception = assertThrows(ShipmozoException.class, () -> apiClient.getInfo());
        assertTrue(exception.getMessage().contains("Invalid Credentials"));
        mockServer.verify();
    }

    @Test
    void testHttpError() {
        mockServer.expect(requestTo("https://api.test/info"))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR).body("Server Down"));

        ShipmozoException exception = assertThrows(ShipmozoException.class, () -> apiClient.getInfo());
        assertTrue(exception.getMessage().contains("500"));
        mockServer.verify();
    }
}
