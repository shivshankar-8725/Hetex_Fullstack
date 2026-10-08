package com.hetex.service.courier.shipmozo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ShipmozoLabelResponse(
    String label,
    @JsonProperty("created_at") String createdAt
) {}
