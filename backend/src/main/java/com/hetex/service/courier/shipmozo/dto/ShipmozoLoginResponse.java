package com.hetex.service.courier.shipmozo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ShipmozoLoginResponse(
    String name,
    @JsonProperty("public_key") String publicKey,
    @JsonProperty("private_key") String privateKey
) {}
