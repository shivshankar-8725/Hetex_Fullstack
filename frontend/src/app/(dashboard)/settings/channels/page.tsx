import { getCurrentUser, getSessionToken } from "@/lib/auth";
import { channelClient, callUnary } from "@/lib/grpc/client";
import { ChannelsPanel } from "@/components/settings/ChannelsPanel";

interface ChannelConnectionMsg { id: string; platform: string; storeName: string; connected: boolean }

export default async function ChannelsPage() {
  const user = await getCurrentUser();
  const token = await getSessionToken();
  if (!user || !token) return null;

  interface ListChannelsResponse { connections: ChannelConnectionMsg[] }
  const data = await callUnary<object, ListChannelsResponse>(channelClient, "listChannels", {}, token);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Channel Integrations</h1>
        <p className="text-sm text-muted">Connect your storefronts to pull orders into HetEx automatically.</p>
      </div>
      <ChannelsPanel initialConnections={data.connections} />
    </div>
  );
}
