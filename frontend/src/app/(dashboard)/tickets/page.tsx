import Link from "next/link";
import { getSessionToken } from "@/lib/auth";
import { ticketClient, callUnary } from "@/lib/grpc/client";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface TicketRow {
  id: string;
  orderNumber: string;
  courierName: string;
  subject: string;
  status: string;
  createdAt: string;
  messageCount: number;
}

export default async function TicketsPage() {
  const token = await getSessionToken();
  if (!token) return null;

  interface ListTicketsResponse { tickets: TicketRow[] }
  const data = await callUnary<object, ListTicketsResponse>(ticketClient, "listTickets", {}, token);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Support Tickets</h1>
          <p className="text-sm text-muted">Raise an order inquiry directly with the courier handling that shipment.</p>
        </div>
        <Link href="/tickets/new"><Button>+ New Ticket</Button></Link>
      </div>

      <Card>
        <CardHeader title={`${data.tickets.length} Tickets`} />
        <div className="divide-y divide-border">
          {data.tickets.map((t) => (
            <Link key={t.id} href={`/tickets/${t.id}`} className="flex items-center justify-between px-5 py-4 text-sm transition-colors hover:bg-slate-50">
              <div>
                <p className="font-medium text-foreground">{t.subject}</p>
                <p className="text-xs text-muted">{t.orderNumber} · {t.courierName} · {t.messageCount} message{t.messageCount === 1 ? "" : "s"}</p>
              </div>
              <StatusBadge status={t.status} />
            </Link>
          ))}
          {data.tickets.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted">No support tickets yet.</p>}
        </div>
      </Card>
    </div>
  );
}
