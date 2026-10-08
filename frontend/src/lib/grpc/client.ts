import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "path";

const PROTO_DIR = path.join(process.cwd(), "..", "proto");
const PROTO_FILES = [
  "common.proto", "auth.proto", "address.proto", "rate.proto", "order.proto",
  "shipment.proto", "wallet.proto", "ndr.proto", "cod.proto", "analytics.proto",
  "channel.proto", "settings.proto", "admin.proto", "ticket.proto", "notification.proto",
];

const packageDefinition = protoLoader.loadSync(
  PROTO_FILES.map((f) => path.join(PROTO_DIR, f)),
  { keepCase: false, longs: String, enums: String, defaults: true, oneofs: true, includeDirs: [PROTO_DIR] }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const proto = (grpc.loadPackageDefinition(packageDefinition) as any).hetex;

const GRPC_ADDRESS = process.env.GRPC_BACKEND_ADDRESS ?? "localhost:9090";
const channelCredentials = grpc.credentials.createInsecure();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeClient(ServiceCtor: any) {
  return new ServiceCtor(GRPC_ADDRESS, channelCredentials);
}

export const authClient = makeClient(proto.AuthService);
export const addressClient = makeClient(proto.AddressService);
export const rateClient = makeClient(proto.RateService);
export const orderClient = makeClient(proto.OrderService);
export const shipmentClient = makeClient(proto.ShipmentService);
export const walletClient = makeClient(proto.WalletService);
export const ndrClient = makeClient(proto.NdrService);
export const codClient = makeClient(proto.CodService);
export const analyticsClient = makeClient(proto.AnalyticsService);
export const channelClient = makeClient(proto.ChannelService);
export const settingsClient = makeClient(proto.SettingsService);
export const adminClient = makeClient(proto.AdminService);
export const ticketClient = makeClient(proto.TicketService);
export const notificationClient = makeClient(proto.NotificationService);

export function authMetadata(token?: string | null): grpc.Metadata {
  const metadata = new grpc.Metadata();
  if (token) metadata.set("authorization", `Bearer ${token}`);
  return metadata;
}

interface GrpcClientLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [method: string]: any;
}

/** Promisifies a unary gRPC call, optionally attaching the caller's JWT as metadata. */
export function callUnary<TRequest extends object, TResponse>(
  client: GrpcClientLike,
  method: string,
  request: TRequest,
  token?: string | null
): Promise<TResponse> {
  return new Promise((resolve, reject) => {
    const callback = (err: grpc.ServiceError | null, response: TResponse) => {
      if (err) reject(err);
      else resolve(response);
    };
    client[method](request, authMetadata(token), callback);
  });
}

export class GrpcHttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Maps a gRPC status code to the HTTP status + message an API route should respond with. */
export function toHttpError(err: unknown): GrpcHttpError {
  const serviceError = err as grpc.ServiceError;
  const message = serviceError?.details || serviceError?.message || "Something went wrong";
  switch (serviceError?.code) {
    case grpc.status.UNAUTHENTICATED:
      return new GrpcHttpError(401, message);
    case grpc.status.PERMISSION_DENIED:
      return new GrpcHttpError(403, message);
    case grpc.status.NOT_FOUND:
      return new GrpcHttpError(404, message);
    case grpc.status.INVALID_ARGUMENT:
    case grpc.status.FAILED_PRECONDITION:
      return new GrpcHttpError(400, message);
    case grpc.status.ALREADY_EXISTS:
      return new GrpcHttpError(409, message);
    case grpc.status.UNAVAILABLE:
      return new GrpcHttpError(503, "Backend service is currently unavailable. Please try again later.");
    default:
      return new GrpcHttpError(500, message.replace(/^\d+\s+[A-Z_]+:\s*/, ""));
  }
}
