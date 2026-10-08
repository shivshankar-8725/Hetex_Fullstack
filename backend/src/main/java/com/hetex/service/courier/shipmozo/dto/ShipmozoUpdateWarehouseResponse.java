package com.hetex.service.courier.shipmozo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ShipmozoUpdateWarehouseResponse(
    @JsonProperty("order_id") String orderId,
    @JsonProperty("reference_id") String referenceId
) {}
