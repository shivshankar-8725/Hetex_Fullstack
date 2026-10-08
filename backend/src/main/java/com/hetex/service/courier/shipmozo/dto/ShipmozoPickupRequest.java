package com.hetex.service.courier.shipmozo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ShipmozoPickupRequest(
    @JsonProperty("order_id") String orderId
) {}
