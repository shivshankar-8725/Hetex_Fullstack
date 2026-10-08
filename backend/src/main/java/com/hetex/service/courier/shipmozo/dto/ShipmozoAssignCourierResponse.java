package com.hetex.service.courier.shipmozo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ShipmozoAssignCourierResponse(
    @JsonProperty("order_id") String orderId,
    @JsonProperty("reference_id") String referenceId,
    String courier,
    @JsonProperty("awb_number") String awbNumber,
    @JsonProperty("courier_company") String courierCompany,
    @JsonProperty("courier_company_service") String courierCompanyService
) {}
