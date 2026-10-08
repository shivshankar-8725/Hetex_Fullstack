package com.hetex.service.courier.shipmozo;

import com.hetex.entity.Order;
import com.hetex.entity.Address;
import com.hetex.entity.PaymentMode;
import com.hetex.service.courier.shipmozo.dto.ShipmozoProductDetail;
import com.hetex.service.courier.shipmozo.dto.ShipmozoPushOrderRequest;
import com.hetex.service.courier.shipmozo.dto.ShipmozoPushOrderResponse;
import com.hetex.service.courier.shipmozo.dto.ShipmozoResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ShipmozoOrderService {
    private static final Logger log = LoggerFactory.getLogger(ShipmozoOrderService.class);
    
    private final ShipmozoApiClient apiClient;

    public ShipmozoOrderService(ShipmozoApiClient apiClient) {
        this.apiClient = apiClient;
    }

    public ShipmozoPushOrderResponse pushOrder(Order order, Address buyer, String warehouseId, double length, double width, double height) {
        validateOrderDetails(order, buyer, warehouseId, length, width, height);

        ShipmozoProductDetail product = new ShipmozoProductDetail(
            order.getItemDescription() != null && !order.getItemDescription().isBlank() ? order.getItemDescription() : "Product",
            order.getOrderNumber(), // using order number as SKU for now if none provided
            1, // Assuming quantity 1
            "0",
            "",
            order.getDeclaredValue(),
            "Other"
        );

        String paymentType = order.getPaymentMode() == PaymentMode.COD ? "COD" : "PREPAID";
        Double codAmount = order.getPaymentMode() == PaymentMode.COD ? order.getCodAmount() : null;
        
        String orderDate = order.getCreatedAt() != null 
                ? java.time.LocalDate.ofInstant(order.getCreatedAt(), java.time.ZoneId.systemDefault()).format(DateTimeFormatter.ofPattern("yyyy-MM-dd")) 
                : java.time.LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));

        ShipmozoPushOrderRequest request = new ShipmozoPushOrderRequest(
            order.getOrderNumber(),
            orderDate,
            null, // optional order_type
            buyer.getContactName(),
            buyer.getPhone(),
            null, // alternate phone
            "", // no email field
            buyer.getAddressLine1(),
            buyer.getAddressLine2(),
            buyer.getPincode(),
            buyer.getCity(),
            buyer.getState(),
            List.of(product),
            paymentType,
            codAmount,
            order.getBillableWeight(),
            length,
            width,
            height,
            warehouseId,
            null,
            null
        );

        log.info("Pushing order {} to Shipmozo (Warehouse: {})", order.getOrderNumber(), warehouseId);
        
        ShipmozoResponse<ShipmozoPushOrderResponse> response = apiClient.post(
            "/push-order", 
            request, 
            new ParameterizedTypeReference<ShipmozoResponse<ShipmozoPushOrderResponse>>() {}
        );

        if (response.data() == null) {
            throw new ShipmozoException("Push order succeeded but returned empty data for order " + order.getOrderNumber());
        }

        log.info("Successfully pushed order {} to Shipmozo. Ref ID: {}", order.getOrderNumber(), response.data().referenceId());
        return response.data();
    }

    private void validateOrderDetails(Order order, Address buyer, String warehouseId, double length, double width, double height) {
        if (order == null || buyer == null) {
            throw new IllegalArgumentException("Order and buyer details are required");
        }
        if (warehouseId == null || warehouseId.isBlank()) {
            throw new IllegalArgumentException("warehouse_id is required");
        }
        if (order.getOrderNumber() == null || order.getOrderNumber().isBlank()) {
            throw new IllegalArgumentException("order_id is required");
        }
        if (buyer.getContactName() == null || buyer.getContactName().isBlank()) {
            throw new IllegalArgumentException("consignee_name is required");
        }
        if (buyer.getPhone() == null || buyer.getPhone().isBlank()) {
            throw new IllegalArgumentException("consignee_phone is required");
        }
        if (buyer.getAddressLine1() == null || buyer.getAddressLine1().isBlank()) {
            throw new IllegalArgumentException("consignee_address_line_one is required");
        }
        if (buyer.getPincode() == null || buyer.getPincode().isBlank()) {
            throw new IllegalArgumentException("consignee_pin_code is required");
        }
        if (buyer.getCity() == null || buyer.getCity().isBlank()) {
            throw new IllegalArgumentException("consignee_city is required");
        }
        if (buyer.getState() == null || buyer.getState().isBlank()) {
            throw new IllegalArgumentException("consignee_state is required");
        }
        if (order.getBillableWeight() <= 0) {
            throw new IllegalArgumentException("weight must be greater than 0");
        }
        if (length <= 0 || width <= 0 || height <= 0) {
            throw new IllegalArgumentException("dimensions (length, width, height) must be greater than 0");
        }
    }
}
