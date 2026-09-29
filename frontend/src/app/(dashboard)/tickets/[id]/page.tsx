import { notFound } from "next/navigation";
import { getSessionToken } from "@/lib/auth";
import { ticketClient, callUnary, toHttpError } from "@/lib/grpc/client";
import { TicketThread } from "@/components/tickets/TicketThread";

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getSessionToken();
  if (!token) return null;

  try {
    const ticket = await callUnary(ticketClient, "getTicket", { ticketId: id }, token);
    return (
      <div className="w-full space-y-5">
        <TicketThread initial={ticket as never} />
      </div>
    );
  } catch (err) {
    if (toHttpError(err).status === 404) notFound();
    throw err;
  }
}
