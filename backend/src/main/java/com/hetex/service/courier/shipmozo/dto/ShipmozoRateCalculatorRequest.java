package com.hetex.service.courier.shipmozo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record ShipmozoRateCalculatorRequest(
    @JsonProperty("pickup_pincode") String pickupPincode,
    @JsonProperty("delivery_pincode") String deliveryPincode,
    @JsonProperty("payment_type") String paymentType,
    @JsonProperty("shipment_type") String shipmentType,
    @JsonProperty("order_amount") double orderAmount,
    @JsonProperty("type_of_package") String typeOfPackage,
    @JsonProperty("rov_type") String rovType,
    double weight,
    List<ShipmozoDimension> dimensions,
    @JsonProperty("order_id") String orderId,
    @JsonProperty("cod_amount") Double codAmount
) {}
