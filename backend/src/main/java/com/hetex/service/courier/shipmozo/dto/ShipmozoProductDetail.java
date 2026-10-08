package com.hetex.service.courier.shipmozo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ShipmozoProductDetail(
    String name,
    @JsonProperty("sku_number") String skuNumber,
    int quantity,
    String discount,
    String hsn,
    @JsonProperty("unit_price") double unitPrice,
    @JsonProperty("product_category") String productCategory
) {}
