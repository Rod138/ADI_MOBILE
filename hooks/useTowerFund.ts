import supabase from "@/lib/supabase";
import { useState } from "react";

export interface TowerFund {
    id: number;
    initial_amount: number;
    updated_at: string; // fecha desde la cual se empieza a calcular el balance
}

export function useTowerFund() {
    const [fund, setFund] = useState<TowerFund | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── Fetch el registro único del fondo ────────────────────────────────────
    const fetchFund = async (): Promise<TowerFund | null> => {
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: dbError } = await supabase
                .from("tower_fund")
                .select("*")
                .order("id", { ascending: true })
                .limit(1)
                .maybeSingle();

            if (dbError) { setError("Error al cargar el fondo."); return null; }
            setFund(data as TowerFund | null);
            return data as TowerFund | null;
        } catch {
            setError("No se pudo conectar al servidor.");
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    // ── Crear el fondo por primera vez ───────────────────────────────────────
    const initFund = async (amount: number, startDate: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: dbError } = await supabase
                .from("tower_fund")
                .insert([{ initial_amount: amount, updated_at: startDate }])
                .select()
                .single();

            if (dbError) { setError(dbError.message); return false; }
            setFund(data as TowerFund);
            return true;
        } catch {
            setError("No se pudo conectar al servidor.");
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    // ── Actualizar monto y/o fecha de inicio del fondo ───────────────────────
    const updateFund = async (amount: number, startDate?: string): Promise<boolean> => {
        if (!fund) return false;
        setIsLoading(true);
        setError(null);
        try {
            const payload: Record<string, unknown> = { initial_amount: amount };
            if (startDate) payload.updated_at = startDate;

            const { error: dbError } = await supabase
                .from("tower_fund")
                .update(payload)
                .eq("id", fund.id);

            if (dbError) { setError(dbError.message); return false; }
            setFund({
                ...fund,
                initial_amount: amount,
                updated_at: startDate ?? fund.updated_at,
            });
            return true;
        } catch {
            setError("No se pudo conectar al servidor.");
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return { fund, isLoading, error, fetchFund, initFund, updateFund };
}