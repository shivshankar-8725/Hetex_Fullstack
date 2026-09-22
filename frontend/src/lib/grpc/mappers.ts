export interface RateQuote {
  courierId: string;
  courierName: string;
  courierCode: string;
  logoColor: string;
  rating: number;
  etaMinDays: number;
  etaMaxDays: number;
  billableWeight: number;
  freightCharge: number;
  codCharge: number;
  totalCharge: number;
  sellerPrice: number;
  margin: number;
  rtoRiskPercent: number;
}

export interface OrderSummaryMsg {
  id: string;
  orderNumber: string;
  paymentMode: string;
  billableWeight: number;
  createdAt: string;
  status: string;
  buyerContactName: string;
  buyerCity: string;
  hasShipment: boolean;
  shipment?: { status: string; awbNumber: string; courier: { name: string; logoColor: string } };
}

export function toOrderRow(o: OrderSummaryMsg) {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    paymentMode: o.paymentMode,
    billableWeight: o.billableWeight,
    createdAt: o.createdAt,
    status: o.status,
    buyerAddress: { contactName: o.buyerContactName, city: o.buyerCity },
    shipment: o.hasShipment && o.shipment
      ? { status: o.shipment.status, awbNumber: o.shipment.awbNumber, courier: { name: o.shipment.courier.name, logoColor: o.shipment.courier.logoColor } }
      : null,
  };
}

export interface AddressMsg {
  id: string;
  type: string;
  label: string;
  contactName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface CourierMsg {
  id: string;
  name: string;
  code: string;
  logoColor: string;
  active: boolean;
  baseRatePerKg: number;
  rating: number;
  etaMinDays: number;
  etaMaxDays: number;
  rtoRiskPercent: number;
}

export interface TrackingEventMsg {
  id: string;
  status: string;
  description: string;
  location: string;
  timestamp: string;
}

export interface NdrRecordMsg {
  id: string;
  shipmentId: string;
  attemptNumber: number;
  reason: string;
  action: string;
  notes: string;
  createdAt: string;
}

export interface CodRemittanceMsg {
  id: string;
  shipmentId: string;
  amount: number;
  status: string;
  settledAt: string;
}

export interface ShipmentMsg {
  id: string;
  orderId: string;
  courier: CourierMsg;
  awbNumber: string;
  rateCharged: number;
  marginEarned: number;
  status: string;
  currentLocation: string;
  trackingEvents: TrackingEventMsg[];
  ndrRecords: NdrRecordMsg[];
  codRemittance?: CodRemittanceMsg;
  hasCodRemittance: boolean;
}

export function toShipmentDetail(s: ShipmentMsg) {
  return {
    id: s.id,
    orderId: s.orderId,
    courier: s.courier,
    awbNumber: s.awbNumber,
    rateCharged: s.rateCharged,
    marginEarned: s.marginEarned,
    status: s.status,
    currentLocation: s.currentLocation,
    trackingEvents: s.trackingEvents,
    ndrRecords: s.ndrRecords,
    codRemittance: s.hasCodRemittance ? s.codRemittance : null,
  };
}

export interface OrderDetailMsg {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  itemDescription: string;
  declaredValue: number;
  weight: number;
  length: number;
  width: number;
  height: number;
  volumetricWeight: number;
  billableWeight: number;
  paymentMode: string;
  codAmount: number;
  pickupAddress: AddressMsg;
  buyerAddress: AddressMsg;
  shipment?: ShipmentMsg;
  hasShipment: boolean;
}

export function toOrderDetail(o: OrderDetailMsg) {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    createdAt: o.createdAt,
    status: o.status,
    itemDescription: o.itemDescription,
    declaredValue: o.declaredValue,
    weight: o.weight,
    length: o.length,
    width: o.width,
    height: o.height,
    volumetricWeight: o.volumetricWeight,
    billableWeight: o.billableWeight,
    paymentMode: o.paymentMode,
    codAmount: o.codAmount,
    pickupAddress: o.pickupAddress,
    buyerAddress: o.buyerAddress,
    shipment: o.hasShipment && o.shipment ? toShipmentDetail(o.shipment) : null,
  };
}
