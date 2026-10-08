package com.hetex.service.courier.shipmozo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ShipmozoCancelOrderRequest(
    @JsonProperty("order_id") String orderId,
    @JsonProperty("awb_number") String awbNumber
) {}
