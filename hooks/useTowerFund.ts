import supabase from "@/lib/supabase";
import { useState } from "react";

export interface TowerFund {
    id: number;
    initial_amount: number;
    updated_at: string;
}

export function useTowerFund() {
    const [fund, setFund] = useState<TowerFund | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch el registro único del fondo 
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

            if (dbError) {
                setError("Error al cargar el fondo.");
                return null;
            }
            setFund(data as TowerFund | null);
            return data as TowerFund | null;
        } catch {
            setError("No se pudo conectar al servidor.");
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    // Actualizar monto inicial del fondo 
    const updateFund = async (amount: number): Promise<boolean> => {
        if (!fund) return false;
        setIsLoading(true);
        setError(null);
        try {
            const now = new Date().toISOString();
            const { error: dbError } = await supabase
                .from("tower_fund")
                .update({ initial_amount: amount, updated_at: now })
                .eq("id", fund.id);

            if (dbError) {
                setError(dbError.message);
                return false;
            }
            setFund({ ...fund, initial_amount: amount, updated_at: now });
            return true;
        } catch {
            setError("No se pudo conectar al servidor.");
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return { fund, isLoading, error, fetchFund, updateFund };
}