package com.hetex.service.courier;

import java.time.Instant;

public record ShipmentCreationResult(String awbNumber, boolean labelReady, Instant pickupScheduledFor) {}
