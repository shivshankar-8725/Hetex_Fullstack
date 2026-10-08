import { getCurrentUser } from "@/lib/auth";
import { Card, CardHeader } from "@/components/ui/Card";
import { EkycPanel } from "@/components/settings/EkycPanel";
import { EditProfileModal } from "@/components/settings/EditProfileModal";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="w-full space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Business Profile</h1>
        <EditProfileModal initialName={user.name} initialBusinessName={user.businessName} />
      </div>

      <Card>
        <CardHeader title="Account Details" />
        <div className="grid grid-cols-2 gap-4 p-5 text-sm">
          <div><p className="text-muted">Name</p><p className="font-medium">{user.name}</p></div>
          <div><p className="text-muted">Business Name</p><p className="font-medium">{user.businessName ?? "—"}</p></div>
          <div><p className="text-muted">Mobile Number</p><p className="font-medium">{user.phone}</p></div>
          <div><p className="text-muted">Email</p><p className="font-medium">{user.email ?? "—"}</p></div>
        </div>
      </Card>

      <EkycPanel kycStatus={user.kycStatus} panNumber={user.panNumber} gstNumber={user.gstNumber} />
    </div>
  );
}
