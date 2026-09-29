package com.hetex.service.courier;

import com.hetex.entity.Shipment;
import com.hetex.entity.SupportTicket;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class DelhiverySupportIntegration {

    private static final Logger log = LoggerFactory.getLogger(DelhiverySupportIntegration.class);

    public record SupportResult(
        boolean apiSupported,
        String vendorTicketId,
        String vendorStatus,
        String vendorNotes
    ) {}

    /**
     * Evaluates Delhivery Support Ticket Integration.
     * Note: Delhivery provides REST APIs for CMU order creation, tracking, pincodes, and rates,
     * but does NOT expose a public REST API endpoint for creating or managing support/helpdesk tickets.
     * Support queries must be logged via Delhivery Client Portal (ucp.delhivery.com) or client.support@delhivery.com.
     */
    public SupportResult createVendorTicket(SupportTicket ticket, Shipment shipment, String initialMessage) {
        String awb = shipment != null ? shipment.getAwbNumber() : "N/A";
        log.info("Processing delivery support ticket for order {}, AWB {}", ticket.getOrderId(), awb);

        // Explicitly identify missing Delhivery REST API capability
        String note = String.format(
            "Delhivery Express API capability limit: No public REST API endpoint for ticket creation. " +
            "Support ticket linked to AWB %s internally and queued for Delhivery Portal (ucp.delhivery.com).",
            awb
        );

        return new SupportResult(
            false, // vendorApiSupported = false
            "",    // vendorTicketId
            "INTERNAL_QUEUED",
            note
        );
    }

    public SupportResult syncVendorTicketStatus(SupportTicket ticket) {
        String note = "Delhivery REST API status sync not available. Internal status active.";
        return new SupportResult(false, ticket.getVendorTicketId(), ticket.getVendorStatus(), note);
    }
}
