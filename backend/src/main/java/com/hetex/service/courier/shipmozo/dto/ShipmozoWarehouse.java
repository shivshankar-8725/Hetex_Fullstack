package com.hetex.service.courier.shipmozo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ShipmozoWarehouse(
    String id,
    String address_title,
    String name,
    String email,
    String phone,
    @JsonProperty("alt_phone") String altPhone,
    @JsonProperty("address_line_one") String addressLineOne,
    @JsonProperty("address_line_two") String addressLineTwo,
    String pincode,
    String city,
    String state,
    String country,
    String status,
    @JsonProperty("default") String isDefault
) {}
