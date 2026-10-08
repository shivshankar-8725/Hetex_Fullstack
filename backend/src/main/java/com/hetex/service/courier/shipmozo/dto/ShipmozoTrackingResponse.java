package com.hetex.service.courier.shipmozo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record ShipmozoTrackingResponse(
    @JsonProperty("order_id") String orderId,
    @JsonProperty("reference_id") String referenceId,
    @JsonProperty("awb_number") String awbNumber,
    String courier,
    @JsonProperty("expected_delivery_date") String expectedDeliveryDate,
    @JsonProperty("current_status") String currentStatus,
    @JsonProperty("status_time") String statusTime,
    @JsonProperty("scan_detail") List<ShipmozoScanDetail> scanDetail
) {}
