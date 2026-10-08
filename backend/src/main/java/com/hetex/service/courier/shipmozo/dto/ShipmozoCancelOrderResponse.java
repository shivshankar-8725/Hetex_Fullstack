package com.hetex.service.courier.shipmozo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ShipmozoCancelOrderResponse(
    @JsonProperty("order_id") String orderId,
    @JsonProperty("reference_id") String referenceId
) {}
