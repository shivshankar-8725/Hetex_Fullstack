package com.hetex.service.courier.shipmozo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ShipmozoCreateWarehouseRequest(
    @JsonProperty("address_title") String addressTitle,
    @JsonProperty("pin_code") String pinCode,
    String name,
    String phone,
    @JsonProperty("alternate_phone") String alternatePhone,
    String email,
    @JsonProperty("address_line_two") String addressLineTwo
) {}
