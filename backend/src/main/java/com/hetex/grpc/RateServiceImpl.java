package com.hetex.grpc;

import com.hetex.entity.Courier;
import com.hetex.entity.PaymentMode;
import com.hetex.grpc.proto.CheckServiceabilityRequest;
import com.hetex.grpc.proto.CheckServiceabilityResponse;
import com.hetex.grpc.proto.GetRatesRequest;
import com.hetex.grpc.proto.GetRatesResponse;
import com.hetex.grpc.proto.RateQuote;
import com.hetex.grpc.proto.RateServiceGrpc;
import com.hetex.grpc.proto.ServiceabilityRow;
import com.hetex.service.CommissionService;
import com.hetex.service.VolumetricUtil;
import com.hetex.service.courier.CourierAdapter;
import com.hetex.service.courier.CourierRegistry;
import com.hetex.service.courier.RateResult;
import com.hetex.service.courier.ServiceabilityResult;
import io.grpc.stub.StreamObserver;
import net.devh.boot.grpc.server.service.GrpcService;

@GrpcService
public class RateServiceImpl extends RateServiceGrpc.RateServiceImplBase {

    private final CourierRegistry courierRegistry;
    private final CommissionService commissionService;

    public RateServiceImpl(CourierRegistry courierRegistry, CommissionService commissionService) {
        this.courierRegistry = courierRegistry;
        this.commissionService = commissionService;
    }

    @Override
    public void getRates(GetRatesRequest request, StreamObserver<GetRatesResponse> responseObserver) {
        AuthContext.requireSession();

        double billable = VolumetricUtil.roundToSlab(
            VolumetricUtil.billableWeight(request.getWeight(), request.getLength(), request.getWidth(), request.getHeight())
        );
        PaymentMode paymentMode = PaymentMode.valueOf(request.getPaymentMode());

        GetRatesResponse.Builder response = GetRatesResponse.newBuilder().setBillableWeight(billable);

        for (CourierRegistry.ActiveAdapter active : courierRegistry.getActiveAdapters()) {
            Courier courier = active.courier();
            CourierAdapter adapter = active.adapter();

            ServiceabilityResult serviceability = adapter.checkServiceability(request.getFromPincode(), request.getToPincode());
            if (!serviceability.serviceable()) continue;
            if (paymentMode == PaymentMode.COD && !serviceability.codAvailable()) continue;

            RateResult rate = adapter.getRate(request.getFromPincode(), request.getToPincode(), billable, paymentMode);
            double courierCost = rate.freightCharge() + rate.codCharge();
            CommissionService.MarginResult margin = commissionService.computeMargin(courier.getId(), billable, courierCost);

            response.addQuotes(RateQuote.newBuilder()
                .setCourierId(courier.getId())
                .setCourierName(courier.getName())
                .setCourierCode(courier.getCode())
                .setLogoColor(courier.getLogoColor())
                .setRating(courier.getRating())
                .setEtaMinDays(serviceability.estimatedDays())
                .setEtaMaxDays(serviceability.estimatedDays() + (courier.getEtaMaxDays() - courier.getEtaMinDays() > 0 ? 1 : 0))
                .setBillableWeight(billable)
                .setFreightCharge(rate.freightCharge())
                .setCodCharge(rate.codCharge())
                .setTotalCharge(courierCost)
                .setSellerPrice(margin.sellerPrice())
                .setMargin(margin.margin())
                .setRtoRiskPercent(courier.getRtoRiskPercent())
                .build());
        }

        GetRatesResponse built = response.build();
        java.util.List<RateQuote> sorted = new java.util.ArrayList<>(built.getQuotesList());
        sorted.sort(java.util.Comparator.comparingDouble(RateQuote::getSellerPrice));
        responseObserver.onNext(GetRatesResponse.newBuilder().setBillableWeight(billable).addAllQuotes(sorted).build());
        responseObserver.onCompleted();
    }

    @Override
    public void checkServiceability(CheckServiceabilityRequest request, StreamObserver<CheckServiceabilityResponse> responseObserver) {
        AuthContext.requireSession();
        CheckServiceabilityResponse.Builder response = CheckServiceabilityResponse.newBuilder();

        for (CourierRegistry.ActiveAdapter active : courierRegistry.getActiveAdapters()) {
            Courier courier = active.courier();
            ServiceabilityResult result = active.adapter().checkServiceability(request.getFromPincode(), request.getToPincode());
            response.addCouriers(ServiceabilityRow.newBuilder()
                .setCourierName(courier.getName())
                .setLogoColor(courier.getLogoColor())
                .setServiceable(result.serviceable())
                .setCodAvailable(result.codAvailable())
                .setEstimatedDays(result.estimatedDays())
                .build());
        }

        responseObserver.onNext(response.build());
        responseObserver.onCompleted();
    }
}
