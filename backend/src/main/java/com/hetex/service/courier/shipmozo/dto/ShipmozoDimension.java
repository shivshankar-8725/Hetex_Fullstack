package com.hetex.service.courier.shipmozo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ShipmozoDimension(
    @JsonProperty("no_of_box") String noOfBox,
    String length,
    String width,
    String height
) {}
