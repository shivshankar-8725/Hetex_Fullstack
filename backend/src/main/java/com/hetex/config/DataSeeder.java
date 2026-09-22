package com.hetex.config;

import com.hetex.entity.*;
import com.hetex.repository.*;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DataSeeder {

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Autowired private CourierRepository courierRepository;
    @Autowired private CommissionRuleRepository commissionRuleRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private WalletRepository walletRepository;
    @Autowired private AddressRepository addressRepository;
    @Autowired private OrderRepository orderRepository;
    @Autowired private ShipmentRepository shipmentRepository;
    @Autowired private TrackingEventRepository trackingEventRepository;
    @Autowired private TrackingPageConfigRepository trackingPageConfigRepository;

    private record CourierSeed(String name, String code, String logoColor, double baseRatePerKg, double rating, int etaMin, int etaMax, double rtoRisk) {}

    private static final List<CourierSeed> COURIERS = List.of(
        new CourierSeed("Delhivery", "DLV", "#e91e63", 32, 4.3, 2, 5, 7),
        new CourierSeed("Ekart", "EKT", "#ffcc00", 28, 4.0, 3, 6, 9),
        new CourierSeed("Xpressbees", "XPB", "#f97316", 27, 4.1, 2, 5, 8),
        new CourierSeed("BlueDart", "BLD", "#0b3d91", 42, 4.6, 1, 3, 4),
        new CourierSeed("DTDC", "DTDC", "#facc15", 26, 3.9, 3, 7, 10),
        new CourierSeed("Ecom Express", "ECM", "#16a34a", 29, 4.0, 2, 6, 8.5),
        new CourierSeed("Shadowfax", "SDF", "#7c3aed", 30, 4.2, 1, 4, 6)
    );

    @PostConstruct
    public void seed() {
        seedCouriers();
        seedCommissionRule();
        User admin = seedAdmin();
        User seller = seedSeller();
        Address pickup = seedPickupAddress(seller);
        Address buyer = seedBuyerAddress(seller);
        seedSampleOrder(seller, pickup, buyer);
    }

    private void seedCouriers() {
        for (CourierSeed c : COURIERS) {
            Courier courier = courierRepository.findByCode(c.code()).orElseGet(Courier::new);
            courier.setName(c.name());
            courier.setCode(c.code());
            courier.setLogoColor(c.logoColor());
            courier.setBaseRatePerKg(c.baseRatePerKg());
            courier.setRating(c.rating());
            courier.setEtaMinDays(c.etaMin());
            courier.setEtaMaxDays(c.etaMax());
            courier.setRtoRiskPercent(c.rtoRisk());
            courierRepository.save(courier);
        }
    }

    private void seedCommissionRule() {
        boolean hasFallback = commissionRuleRepository.findByCourierIdIsNullOrCourierId(null)
            .stream().anyMatch(r -> r.getCourierId() == null);
        if (!hasFallback) {
            CommissionRule rule = new CommissionRule();
            rule.setCourierId(null);
            rule.setMinWeight(0);
            rule.setMaxWeight(1000);
            rule.setMarginType(MarginType.PERCENT);
            rule.setMarginValue(15);
            commissionRuleRepository.save(rule);
        }
    }

    private User seedAdmin() {
        User admin = userRepository.findByPhone("9999900000").orElseGet(User::new);
        admin.setName("HetEx Admin");
        admin.setPhone("9999900000");
        admin.setEmail("admin@hetex.com");
        admin.setRole(Role.ADMIN);
        admin.setKycStatus(KycStatus.VERIFIED);
        admin.setPasswordHash(passwordEncoder.encode("Admin@123"));
        admin.setEmailVerified(true);
        User saved = userRepository.save(admin);
        walletRepository.findByUserId(saved.getId()).orElseGet(() -> {
            Wallet w = new Wallet();
            w.setUserId(saved.getId());
            w.setBalance(0);
            return walletRepository.save(w);
        });
        return saved;
    }

    private User seedSeller() {
        User seller = userRepository.findByPhone("9876543210").orElseGet(User::new);
        seller.setName("Meena Lodhi");
        seller.setPhone("9876543210");
        seller.setEmail("meena@zubera.one");
        seller.setBusinessName("Zubera Retail");
        seller.setRole(Role.SELLER);
        seller.setKycStatus(KycStatus.VERIFIED);
        seller.setPanNumber("ABCDE1234F");
        seller.setGstNumber("27ABCDE1234F1Z5");
        seller.setPasswordHash(passwordEncoder.encode("Demo@123"));
        seller.setEmailVerified(true);
        User saved = userRepository.save(seller);

        walletRepository.findByUserId(saved.getId()).orElseGet(() -> {
            Wallet w = new Wallet();
            w.setUserId(saved.getId());
            w.setBalance(5000);
            return walletRepository.save(w);
        });
        trackingPageConfigRepository.findByUserId(saved.getId()).orElseGet(() -> {
            TrackingPageConfig cfg = new TrackingPageConfig();
            cfg.setUserId(saved.getId());
            cfg.setBrandName("Zubera Retail");
            cfg.setPrimaryColor("#2563eb");
            return trackingPageConfigRepository.save(cfg);
        });
        return saved;
    }

    private Address seedPickupAddress(User seller) {
        return addressRepository.findByUserIdAndTypeOrderByIsDefaultDescCreatedAtDesc(seller.getId(), AddressType.PICKUP)
            .stream().findFirst()
            .orElseGet(() -> {
                Address a = new Address();
                a.setUserId(seller.getId());
                a.setType(AddressType.PICKUP);
                a.setLabel("Main Warehouse");
                a.setContactName("Meena Lodhi");
                a.setPhone("9876543210");
                a.setAddressLine1("Plot 12, Industrial Area Phase 2");
                a.setCity("Bengaluru");
                a.setState("Karnataka");
                a.setPincode("560058");
                a.setDefault(true);
                return addressRepository.save(a);
            });
    }

    private Address seedBuyerAddress(User seller) {
        return addressRepository.findByUserIdAndTypeOrderByIsDefaultDescCreatedAtDesc(seller.getId(), AddressType.BUYER)
            .stream().findFirst()
            .orElseGet(() -> {
                Address a = new Address();
                a.setUserId(seller.getId());
                a.setType(AddressType.BUYER);
                a.setLabel("Home");
                a.setContactName("Rohit Sharma");
                a.setPhone("9123456780");
                a.setAddressLine1("24 MG Road");
                a.setCity("Mumbai");
                a.setState("Maharashtra");
                a.setPincode("400001");
                return addressRepository.save(a);
            });
    }

    private void seedSampleOrder(User seller, Address pickup, Address buyer) {
        if (orderRepository.findByOrderNumber("HTX-SEED-0001").isPresent()) return;

        Courier delhivery = courierRepository.findByCode("DLV").orElseThrow();
        double weight = 0.4;
        double length = 30, width = 20, height = 5;
        double volumetric = (length * width * height) / 5000;

        Order order = new Order();
        order.setOrderNumber("HTX-SEED-0001");
        order.setUserId(seller.getId());
        order.setPickupAddressId(pickup.getId());
        order.setBuyerAddressId(buyer.getId());
        order.setItemDescription("Cotton T-Shirt (Pack of 2)");
        order.setDeclaredValue(899);
        order.setWeight(weight);
        order.setLength(length);
        order.setWidth(width);
        order.setHeight(height);
        order.setVolumetricWeight(volumetric);
        order.setBillableWeight(Math.max(weight, volumetric));
        order.setPaymentMode(PaymentMode.PREPAID);
        order.setCodAmount(0);
        order.setStatus(OrderStatus.BOOKED);
        order.setSource("MANUAL");
        Order savedOrder = orderRepository.save(order);

        Shipment shipment = new Shipment();
        shipment.setOrderId(savedOrder.getId());
        shipment.setCourierId(delhivery.getId());
        shipment.setAwbNumber("DLV00001234567");
        shipment.setRateCharged(62);
        shipment.setMarginEarned(9.3);
        shipment.setStatus(ShipmentStatus.IN_TRANSIT);
        shipment.setCurrentLocation("Delhivery Sort Facility, Mumbai");
        shipment.setLabelGenerated(true);
        Shipment savedShipment = shipmentRepository.save(shipment);

        saveEvent(savedShipment.getId(), ShipmentStatus.MANIFESTED, "Shipment manifested with courier", "Bengaluru Hub");
        saveEvent(savedShipment.getId(), ShipmentStatus.PICKUP_SCHEDULED, "Pickup scheduled", "Bengaluru Hub");
        saveEvent(savedShipment.getId(), ShipmentStatus.IN_TRANSIT, "Shipment picked up and in transit", "Delhivery Sort Facility, Mumbai");
    }

    private void saveEvent(String shipmentId, ShipmentStatus status, String description, String location) {
        TrackingEvent event = new TrackingEvent();
        event.setShipmentId(shipmentId);
        event.setStatus(status);
        event.setDescription(description);
        event.setLocation(location);
        trackingEventRepository.save(event);
    }
}
