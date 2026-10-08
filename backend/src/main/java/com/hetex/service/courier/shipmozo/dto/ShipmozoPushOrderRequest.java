package com.hetex.service.courier.shipmozo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record ShipmozoPushOrderRequest(
    @JsonProperty("order_id") String orderId,
    @JsonProperty("order_date") String orderDate,
    @JsonProperty("order_type") String orderType,
    @JsonProperty("consignee_name") String consigneeName,
    @JsonProperty("consignee_phone") String consigneePhone,
    @JsonProperty("consignee_alternate_phone") String consigneeAlternatePhone,
    @JsonProperty("consignee_email") String consigneeEmail,
    @JsonProperty("consignee_address_line_one") String consigneeAddressLineOne,
    @JsonProperty("consignee_address_line_two") String consigneeAddressLineTwo,
    @JsonProperty("consignee_pin_code") String consigneePinCode,
    @JsonProperty("consignee_city") String consigneeCity,
    @JsonProperty("consignee_state") String consigneeState,
    @JsonProperty("product_detail") List<ShipmozoProductDetail> productDetail,
    @JsonProperty("payment_type") String paymentType,
    @JsonProperty("cod_amount") Double codAmount,
    double weight,
    double length,
    double width,
    double height,
    @JsonProperty("warehouse_id") String warehouseId,
    @JsonProperty("gst_ewaybill_number") String gstEwaybillNumber,
    @JsonProperty("gstin_number") String gstinNumber
) {}
