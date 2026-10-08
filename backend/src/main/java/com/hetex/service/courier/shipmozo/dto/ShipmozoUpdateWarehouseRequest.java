package com.hetex.service.courier.shipmozo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ShipmozoUpdateWarehouseRequest(
    @JsonProperty("order_id") String orderId,
    @JsonProperty("warehouse_id") String warehouseId
) {}
