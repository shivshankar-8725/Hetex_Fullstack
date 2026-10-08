package com.hetex.service.courier.shipmozo.dto;

public record ShipmozoResponse<T>(
    String result,
    String message,
    T data
) {
    public boolean isSuccess() {
        return "1".equals(result);
    }
}
