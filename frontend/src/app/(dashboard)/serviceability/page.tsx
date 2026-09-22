import { ServiceabilityChecker } from "@/components/serviceability/ServiceabilityChecker";

export default function ServiceabilityPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Pincode Serviceability</h1>
        <p className="text-sm text-muted">Check which couriers deliver a route before you enter full package details.</p>
      </div>
      <ServiceabilityChecker />
    </div>
  );
}
