package com.hetex.service.courier.shipmozo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ShipmozoCourierRate(
    @JsonProperty("courier_id") Integer courierId,
    @JsonProperty("courier_name") String courierName,
    @JsonProperty("expected_delivery") String expectedDelivery,
    @JsonProperty("estimated_amount") double estimatedAmount,
    double rate,
    @JsonProperty("cod_charges") double codCharges,
    @JsonProperty("pickup_charges") double pickupCharges,
    @JsonProperty("total_amount") double totalAmount
) {}
