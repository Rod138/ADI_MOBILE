import { useSession } from "@/context/AuthContext";
import { useCallback, useState } from "react";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL!;

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface TicketArea {
  id: number;
  name: string;
}

export interface TicketErrorType {
  id: number;
  name: string;
}

export interface TicketStatus {
  id: number;
  name: string;
}

export interface TicketPriority {
  id: number;
  name: string;
  sla_hours: number;
}

export interface Ticket {
  id: number;
  description: string;
  evidence_url: string | null;
  resolution_note: string | null;
  reopened_count: number;
  created_at: string;
  updated_at: string;
  areas: TicketArea;
  error_types: TicketErrorType;
  status: TicketStatus;
  priority: TicketPriority;
}

export interface TicketDetail extends Ticket {
  sla_deadline: string | null;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMyTickets() {
  const { user } = useSession();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  // ── Obtener todos los tickets del usuario ─────────────────────────────────
  const fetchMyTickets = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/tickets/user/${user.id}`);
      const data = await res.json();
      if (res.status === 404) {
        setTickets([]);
        return;
      }
      if (!res.ok || !data.ok) {
        setError("No se pudieron cargar tus reportes.");
        return;
      }
      setTickets(data.data as Ticket[]);
    } catch {
      setError("No se pudo conectar al servidor.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // ── Obtener detalle de un ticket ──────────────────────────────────────────
  const fetchTicketDetail = useCallback(
    async (ticketId: number) => {
      if (!user) return;
      setIsLoadingDetail(true);
      setDetailError(null);
      setDetail(null);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/tickets/user/${user.id}/${ticketId}`
        );
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setDetailError("No se pudo cargar el detalle del reporte.");
          return;
        }
        setDetail(data.data as TicketDetail);
      } catch {
        setDetailError("No se pudo conectar al servidor.");
      } finally {
        setIsLoadingDetail(false);
      }
    },
    [user]
  );

  return {
    tickets,
    detail,
    isLoading,
    isLoadingDetail,
    error,
    detailError,
    fetchMyTickets,
    fetchTicketDetail,
  };
}