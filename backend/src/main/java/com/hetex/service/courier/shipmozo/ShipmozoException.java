package com.hetex.service.courier.shipmozo;

public class ShipmozoException extends RuntimeException {
    public ShipmozoException(String message) {
        super(message);
    }

    public ShipmozoException(String message, Throwable cause) {
        super(message, cause);
    }
}
