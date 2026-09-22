package com.hetex.service.courier;

import com.hetex.entity.ShipmentStatus;

public record TrackingUpdate(ShipmentStatus status, String description, String location) {}
