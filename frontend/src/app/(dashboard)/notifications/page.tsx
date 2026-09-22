import { getSessionToken } from "@/lib/auth";
import { notificationClient, callUnary } from "@/lib/grpc/client";
import { Card, CardHeader } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";

interface NotificationRow {
  id: string;
  channel: string;
  recipient: string;
  message: string;
  orderId: string;
  createdAt: string;
}

const CHANNEL_ICON: Record<string, string> = {
  WHATSAPP: "message-circle",
  SMS: "message-circle",
  EMAIL: "message-circle",
};

export default async function NotificationsPage() {
  const token = await getSessionToken();
  if (!token) return null;

  interface ListNotificationsResponse { notifications: NotificationRow[] }
  const data = await callUnary<object, ListNotificationsResponse>(notificationClient, "listNotifications", {}, token);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Notifications</h1>
        <p className="text-sm text-muted">Every WhatsApp, SMS, and email alert sent to you by HetEx.</p>
      </div>

      <Card>
        <CardHeader title={`${data.notifications.length} Notifications`} />
        <div className="divide-y divide-border">
          {data.notifications.map((n) => (
            <div key={n.id} className="flex items-start gap-3 px-5 py-4 text-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand">
                <Icon name={CHANNEL_ICON[n.channel] ?? "bell"} className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">{n.channel} · {n.recipient}</p>
                  <p className="shrink-0 text-xs text-muted">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                <p className="mt-1 text-foreground">{n.message}</p>
              </div>
            </div>
          ))}
          {data.notifications.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted">No notifications yet.</p>}
        </div>
      </Card>
    </div>
  );
}
