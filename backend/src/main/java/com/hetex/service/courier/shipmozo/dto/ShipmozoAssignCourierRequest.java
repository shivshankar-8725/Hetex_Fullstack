package com.hetex.service.courier.shipmozo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ShipmozoAssignCourierRequest(
    @JsonProperty("order_id") String orderId,
    @JsonProperty("courier_id") Integer courierId
) {}
