package com.hetex.service.courier.shipmozo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record ShipmozoPushReturnOrderRequest(
    @JsonProperty("order_id") String orderId,
    @JsonProperty("order_date") String orderDate,
    @JsonProperty("pickup_name") String pickupName,
    @JsonProperty("pickup_phone") String pickupPhone,
    @JsonProperty("pickup_email") String pickupEmail,
    @JsonProperty("pickup_address_line_one") String pickupAddressLineOne,
    @JsonProperty("pickup_address_line_two") String pickupAddressLineTwo,
    @JsonProperty("pickup_pin_code") String pickupPinCode,
    @JsonProperty("pickup_city") String pickupCity,
    @JsonProperty("pickup_state") String pickupState,
    @JsonProperty("product_detail") List<ShipmozoProductDetail> productDetail,
    @JsonProperty("payment_type") String paymentType,
    double weight,
    double length,
    double width,
    double height,
    @JsonProperty("warehouse_id") String warehouseId,
    @JsonProperty("return_reason_id") String returnReasonId,
    @JsonProperty("customer_request") String customerRequest,
    @JsonProperty("reason_comment") String reasonComment,
    @JsonProperty("order_type") String orderType
) {}
