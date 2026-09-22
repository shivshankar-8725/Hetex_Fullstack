package com.hetex.service;

import com.hetex.entity.Address;
import com.hetex.entity.Order;
import com.hetex.entity.Shipment;
import com.hetex.entity.User;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.format.DateTimeFormatter;
import java.time.ZoneId;

@Service
public class PdfService {

    private static final PDFont FONT = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
    private static final PDFont FONT_BOLD = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);

    public byte[] generateLabel(Shipment shipment, Order order, Address pickup, Address buyer, String courierName) {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(new PDRectangle(288, 432));
            doc.addPage(page);

            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                float left = 16;
                float width = 288 - left * 2;
                float y = 410;

                y = text(cs, FONT_BOLD, 16, left, y, "HETEX");
                drawRightAligned(cs, FONT_BOLD, 12, 288 - left, 412, courierName.toUpperCase());
                y -= 6;
                cs.setLineWidth(1);
                cs.moveTo(left, y);
                cs.lineTo(288 - left, y);
                cs.stroke();
                y -= 18;

                y = text(cs, FONT, 8, left, y, "AWB");
                y = text(cs, FONT_BOLD, 18, left, y, shipment.getAwbNumber());
                y -= 6;
                drawFakeBarcode(cs, left, y);
                y -= 38;

                y = text(cs, FONT, 9, left, y, "Order: " + order.getOrderNumber());
                String paymentLine = order.getPaymentMode().name()
                    + (order.getPaymentMode().name().equals("COD") ? String.format(" - Collect Rs.%.2f", order.getCodAmount()) : "");
                y = text(cs, FONT_BOLD, 10, left, y, paymentLine);
                y -= 10;

                y = text(cs, FONT_BOLD, 8, left, y, "SHIP TO");
                y = text(cs, FONT_BOLD, 11, left, y, buyer.getContactName());
                y = text(cs, FONT, 9, left, y, buyer.getAddressLine1());
                y = text(cs, FONT, 9, left, y, buyer.getCity() + ", " + buyer.getState() + " - " + buyer.getPincode());
                y = text(cs, FONT, 9, left, y, "Ph: " + buyer.getPhone());
                y -= 10;

                cs.moveTo(left, y);
                cs.lineTo(288 - left, y);
                cs.stroke();
                y -= 16;

                y = text(cs, FONT_BOLD, 8, left, y, "SHIP FROM (RTO)");
                y = text(cs, FONT_BOLD, 9, left, y, pickup.getContactName());
                y = text(cs, FONT, 8, left, y, pickup.getAddressLine1());
                y = text(cs, FONT, 8, left, y, pickup.getCity() + ", " + pickup.getState() + " - " + pickup.getPincode());
                y -= 12;

                y = text(cs, FONT, 8, left, y, "Item: " + order.getItemDescription());
                text(cs, FONT, 8, left, y, String.format("Declared Value: Rs.%.2f  |  Wt: %.2fkg", order.getDeclaredValue(), order.getBillableWeight()));
            }

            return toBytes(doc);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public byte[] generateInvoice(Shipment shipment, Order order, Address pickup, Address buyer, User seller) {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(new PDRectangle(420, 595));
            doc.addPage(page);

            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                float left = 28;
                float y = 555;

                y = text(cs, FONT_BOLD, 16, left, y, "TAX INVOICE");
                String sellerLabel = (seller.getBusinessName() != null ? seller.getBusinessName() : seller.getName())
                    + (seller.getGstNumber() != null ? "  |  GSTIN: " + seller.getGstNumber() : "");
                y = text(cs, FONT, 9, left, y, sellerLabel);
                y -= 8;
                cs.moveTo(left, y);
                cs.lineTo(420 - left, y);
                cs.stroke();
                y -= 20;

                DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy").withZone(ZoneId.systemDefault());
                text(cs, FONT, 10, left, y, "Invoice / Order No: " + order.getOrderNumber());
                drawRightAligned(cs, FONT, 10, 420 - left, y, "Date: " + fmt.format(order.getCreatedAt()));
                y -= 15;
                y = text(cs, FONT, 10, left, y, "AWB Number: " + shipment.getAwbNumber());
                y -= 25;

                float half = (420 - left * 2) / 2;
                text(cs, FONT_BOLD, 8, left, y, "SOLD BY");
                text(cs, FONT_BOLD, 8, left + half, y, "SHIP TO");
                y -= 13;
                text(cs, FONT_BOLD, 10, left, y, seller.getBusinessName() != null ? seller.getBusinessName() : seller.getName());
                text(cs, FONT_BOLD, 10, left + half, y, buyer.getContactName());
                y -= 13;
                text(cs, FONT, 9, left, y, pickup.getAddressLine1());
                text(cs, FONT, 9, left + half, y, buyer.getAddressLine1());
                y -= 12;
                text(cs, FONT, 9, left, y, pickup.getCity() + ", " + pickup.getState() + " - " + pickup.getPincode());
                text(cs, FONT, 9, left + half, y, buyer.getCity() + ", " + buyer.getState() + " - " + buyer.getPincode());
                y -= 12;
                text(cs, FONT, 9, left + half, y, "Ph: " + buyer.getPhone());
                y -= 30;

                cs.moveTo(left, y);
                cs.lineTo(420 - left, y);
                cs.stroke();
                y -= 16;
                text(cs, FONT_BOLD, 9, left, y, "Description");
                text(cs, FONT_BOLD, 9, left + 200, y, "Payment Mode");
                text(cs, FONT_BOLD, 9, 420 - left - 60, y, "Amount");
                y -= 16;
                text(cs, FONT, 10, left, y, order.getItemDescription());
                text(cs, FONT, 10, left + 200, y, order.getPaymentMode().name());
                text(cs, FONT, 10, 420 - left - 60, y, String.format("Rs.%.2f", order.getDeclaredValue()));
                y -= 20;
                cs.moveTo(left, y);
                cs.lineTo(420 - left, y);
                cs.stroke();
                y -= 20;

                if (order.getPaymentMode().name().equals("COD")) {
                    y = text(cs, FONT_BOLD, 11, left, y, String.format("Amount to Collect (COD): Rs.%.2f", order.getCodAmount()));
                }
                y = text(cs, FONT_BOLD, 11, left, y, String.format("Total Declared Value: Rs.%.2f", order.getDeclaredValue()));
                y -= 20;
                text(cs, FONT, 8, left, y, "This is a system-generated invoice for shipping purposes.");
            }

            return toBytes(doc);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** Draws text and returns the y-coordinate for the next line (12pt leading). */
    private float text(PDPageContentStream cs, PDFont font, int size, float x, float y, String value) throws IOException {
        cs.beginText();
        cs.setFont(font, size);
        cs.newLineAtOffset(x, y);
        cs.showText(sanitize(value));
        cs.endText();
        return y - (size + 4);
    }

    private void drawRightAligned(PDPageContentStream cs, PDFont font, int size, float rightX, float y, String value) throws IOException {
        float textWidth = font.getStringWidth(sanitize(value)) / 1000 * size;
        cs.beginText();
        cs.setFont(font, size);
        cs.newLineAtOffset(rightX - textWidth, y);
        cs.showText(sanitize(value));
        cs.endText();
    }

    private void drawFakeBarcode(PDPageContentStream cs, float startX, float y) throws IOException {
        float x = startX;
        for (int i = 0; i < 40 && x < 272; i++) {
            float w = 1 + (i % 3);
            cs.addRect(x, y - 24, w, 24);
            x += w + 2;
        }
        cs.fill();
    }

    private String sanitize(String value) {
        return value == null ? "" : value.replaceAll("[^\\x20-\\x7E]", "");
    }

    private byte[] toBytes(PDDocument doc) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        doc.save(out);
        return out.toByteArray();
    }
}
