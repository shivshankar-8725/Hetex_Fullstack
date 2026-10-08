package com.hetex.service.courier.shipmozo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ShipmozoOrderDetailResponse(
    @JsonProperty("order_id") String orderId,
    @JsonProperty("reference_id") String referenceId,
    String status,
    @JsonProperty("awb_number") String awbNumber,
    @JsonProperty("courier_name") String courierName
    // Other fields can be added as necessary
) {}
