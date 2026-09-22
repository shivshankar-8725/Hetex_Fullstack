package com.hetex.grpc;

import com.google.protobuf.Empty;
import com.hetex.entity.*;
import com.hetex.grpc.proto.*;
import com.hetex.repository.*;
import com.hetex.service.JwtService;
import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@GrpcService
public class TicketServiceImpl extends TicketServiceGrpc.TicketServiceImplBase {

    private static final List<String> VENDOR_REPLIES = List.of(
        "Thanks for reaching out — we're looking into this shipment and will update you within 24 hours.",
        "We've escalated this to our operations team. Apologies for the inconvenience caused.",
        "Your shipment is currently at the destination hub; delivery is expected within 1-2 business days.",
        "We've noted the discrepancy and will process a resolution shortly."
    );

    private final SupportTicketRepository ticketRepository;
    private final TicketMessageRepository messageRepository;
    private final OrderRepository orderRepository;
    private final ShipmentRepository shipmentRepository;
    private final CourierRepository courierRepository;

    public TicketServiceImpl(
        SupportTicketRepository ticketRepository, TicketMessageRepository messageRepository,
        OrderRepository orderRepository, ShipmentRepository shipmentRepository, CourierRepository courierRepository
    ) {
        this.ticketRepository = ticketRepository;
        this.messageRepository = messageRepository;
        this.orderRepository = orderRepository;
        this.shipmentRepository = shipmentRepository;
        this.courierRepository = courierRepository;
    }

    private TicketMessageMsg toMessageMsg(TicketMessage m) {
        return TicketMessageMsg.newBuilder()
            .setId(m.getId())
            .setSenderRole(m.getSenderRole().name())
            .setMessage(m.getMessage())
            .setCreatedAt(m.getCreatedAt().toString())
            .build();
    }

    private TicketDetail toDetail(SupportTicket ticket) {
        Order order = orderRepository.findById(ticket.getOrderId()).orElseThrow();
        Courier courier = courierRepository.findById(ticket.getCourierId()).orElseThrow();
        TicketDetail.Builder builder = TicketDetail.newBuilder()
            .setId(ticket.getId())
            .setOrderNumber(order.getOrderNumber())
            .setCourierName(courier.getName())
            .setSubject(ticket.getSubject())
            .setStatus(ticket.getStatus().name())
            .setCreatedAt(ticket.getCreatedAt().toString());
        messageRepository.findByTicketIdOrderByCreatedAtAsc(ticket.getId()).forEach(m -> builder.addMessages(toMessageMsg(m)));
        return builder.build();
    }

    @Override
    public void createTicket(CreateTicketRequest request, StreamObserver<TicketDetail> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        Order order = orderRepository.findById(request.getOrderId()).orElse(null);
        if (order == null || !order.getUserId().equals(session.userId())) {
            responseObserver.onError(Status.INVALID_ARGUMENT.withDescription("Invalid order").asRuntimeException());
            return;
        }
        Shipment shipment = shipmentRepository.findByOrderId(order.getId()).orElse(null);
        if (shipment == null) {
            responseObserver.onError(Status.FAILED_PRECONDITION.withDescription("This order has no shipment yet to raise a query about").asRuntimeException());
            return;
        }

        SupportTicket ticket = new SupportTicket();
        ticket.setUserId(session.userId());
        ticket.setOrderId(order.getId());
        ticket.setCourierId(shipment.getCourierId());
        ticket.setSubject(request.getSubject());
        SupportTicket savedTicket = ticketRepository.save(ticket);

        TicketMessage message = new TicketMessage();
        message.setTicketId(savedTicket.getId());
        message.setSenderRole(SenderRole.SELLER);
        message.setMessage(request.getMessage());
        messageRepository.save(message);

        responseObserver.onNext(toDetail(savedTicket));
        responseObserver.onCompleted();
    }

    @Override
    public void listTickets(Empty request, StreamObserver<ListTicketsResponse> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        ListTicketsResponse.Builder builder = ListTicketsResponse.newBuilder();
        for (SupportTicket ticket : ticketRepository.findByUserIdOrderByCreatedAtDesc(session.userId())) {
            Order order = orderRepository.findById(ticket.getOrderId()).orElseThrow();
            Courier courier = courierRepository.findById(ticket.getCourierId()).orElseThrow();
            int messageCount = messageRepository.findByTicketIdOrderByCreatedAtAsc(ticket.getId()).size();
            builder.addTickets(TicketMsg.newBuilder()
                .setId(ticket.getId())
                .setOrderNumber(order.getOrderNumber())
                .setCourierName(courier.getName())
                .setSubject(ticket.getSubject())
                .setStatus(ticket.getStatus().name())
                .setCreatedAt(ticket.getCreatedAt().toString())
                .setMessageCount(messageCount)
                .build());
        }
        responseObserver.onNext(builder.build());
        responseObserver.onCompleted();
    }

    private SupportTicket loadOwnedTicket(String ticketId, JwtService.SessionPayload session) {
        SupportTicket ticket = ticketRepository.findById(ticketId).orElseThrow(() -> Status.NOT_FOUND.asRuntimeException());
        if (!ticket.getUserId().equals(session.userId())) throw Status.NOT_FOUND.asRuntimeException();
        return ticket;
    }

    @Override
    public void getTicket(TicketIdRequest request, StreamObserver<TicketDetail> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        SupportTicket ticket = loadOwnedTicket(request.getTicketId(), session);
        responseObserver.onNext(toDetail(ticket));
        responseObserver.onCompleted();
    }

    @Override
    public void addTicketMessage(AddTicketMessageRequest request, StreamObserver<TicketDetail> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        SupportTicket ticket = loadOwnedTicket(request.getTicketId(), session);

        TicketMessage message = new TicketMessage();
        message.setTicketId(ticket.getId());
        message.setSenderRole(SenderRole.SELLER);
        message.setMessage(request.getMessage());
        messageRepository.save(message);

        if (ticket.getStatus() == TicketStatus.RESOLVED) {
            ticket.setStatus(TicketStatus.OPEN);
            ticketRepository.save(ticket);
        }

        responseObserver.onNext(toDetail(ticket));
        responseObserver.onCompleted();
    }

    /** Demo trigger standing in for the courier's support desk replying — no live vendor helpdesk API exists yet. */
    @Override
    public void simulateVendorReply(TicketIdRequest request, StreamObserver<TicketDetail> responseObserver) {
        JwtService.SessionPayload session = AuthContext.requireSession();
        SupportTicket ticket = loadOwnedTicket(request.getTicketId(), session);

        TicketMessage message = new TicketMessage();
        message.setTicketId(ticket.getId());
        message.setSenderRole(SenderRole.VENDOR);
        message.setMessage(VENDOR_REPLIES.get(ThreadLocalRandom.current().nextInt(VENDOR_REPLIES.size())));
        messageRepository.save(message);

        ticket.setStatus(TicketStatus.RESOLVED);
        ticketRepository.save(ticket);

        responseObserver.onNext(toDetail(ticket));
        responseObserver.onCompleted();
    }
}
