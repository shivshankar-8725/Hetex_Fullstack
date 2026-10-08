package com.hetex.service.courier.shipmozo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ShipmozoServiceabilityRequest(
    @JsonProperty("pickup_pincode") String pickupPincode,
    @JsonProperty("delivery_pincode") String deliveryPincode
) {}
