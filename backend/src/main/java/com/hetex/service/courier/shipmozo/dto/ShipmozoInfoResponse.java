package com.hetex.service.courier.shipmozo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ShipmozoInfoResponse(
    @JsonProperty("Info") String info
) {}
