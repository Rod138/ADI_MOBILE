import { useSession } from "@/context/AuthContext";
import { useCallback, useState } from "react";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL!;

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface SupportArea {
    id: number;
    name: string;
    description: string;
    created_at: string;
}

export interface SupportErrorType {
    id: number;
    name: string;
    created_at: string;
}

export interface CreateTicketPayload {
    adi_user_id: number;
    adi_rol_id: number;
    area_id: number;
    error_type_id: number;
    description: string;
    evidence_url?: string | null;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTickets() {
    const { user } = useSession();

    const [areas, setAreas] = useState<SupportArea[]>([]);
    const [errorTypes, setErrorTypes] = useState<SupportErrorType[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const clearMessages = () => {
        setError(null);
        setSuccess(false);
    };

    // ── Fetch áreas ───────────────────────────────────────────────────────────
    const fetchAreas = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/areas`);
            const data = await res.json();
            if (!res.ok || !data.ok) {
                setError("No se pudieron cargar las áreas.");
                return;
            }
            setAreas(data.data as SupportArea[]);
        } catch {
            setError("No se pudo conectar al servidor.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ── Fetch tipos de error por área ─────────────────────────────────────────
    const fetchErrorTypesByArea = useCallback(async (areaId: number) => {
        setErrorTypes([]);
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/error-types/area/${areaId}`);
            const data = await res.json();
            if (!res.ok || !data.ok) {
                // 404 = no hay tipos para esa área, no es error crítico
                return;
            }
            setErrorTypes(data.data as SupportErrorType[]);
        } catch {
            // silencioso — no interrumpir el formulario
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ── Crear ticket ──────────────────────────────────────────────────────────
    const submitTicket = async (payload: Omit<CreateTicketPayload, "adi_user_id" | "adi_rol_id">): Promise<boolean> => {
        if (!user) {
            setError("No hay sesión activa.");
            return false;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const body: CreateTicketPayload = {
                adi_user_id: user.id,
                adi_rol_id: user.rol_id,
                ...payload,
            };

            const res = await fetch(`${API_BASE_URL}/api/tickets`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (!res.ok || !data.ok) {
                const firstError = data?.errors?.[0]?.msg;
                setError(firstError ?? "No se pudo enviar el reporte.");
                return false;
            }

            setSuccess(true);
            return true;
        } catch {
            setError("No se pudo conectar al servidor. Verifica tu conexión.");
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        areas,
        errorTypes,
        isLoading,
        isSubmitting,
        error,
        success,
        clearMessages,
        fetchAreas,
        fetchErrorTypesByArea,
        submitTicket,
    };
}