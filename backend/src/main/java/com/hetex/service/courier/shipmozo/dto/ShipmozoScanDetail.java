package com.hetex.service.courier.shipmozo.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record ShipmozoScanDetail(
    @JsonProperty("scan_date_time") String scanDateTime,
    String status,
    String location,
    String instruction
) {}
