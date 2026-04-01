import supabase from "@/lib/supabase";
import { useState } from "react";

export interface MonthlyQuota {
    id: number;
    month: string;
    year: number;
    amount: number;
    created_at: string;
}

export function useMonthlyQuota() {
    const [quota, setQuota] = useState<MonthlyQuota | null>(null);
    const [quotas, setQuotas] = useState<MonthlyQuota[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch cuota de un mes/año específico 
    const fetchQuota = async (month: string, year: number): Promise<MonthlyQuota | null> => {
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: dbError } = await supabase
                .from("monthly_quota")
                .select("*")
                .eq("month", month)
                .eq("year", year)
                .maybeSingle();

            if (dbError) {
                setError("Error al cargar la cuota mensual.");
                return null;
            }
            setQuota(data as MonthlyQuota | null);
            return data as MonthlyQuota | null;
        } catch {
            setError("No se pudo conectar al servidor.");
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch todas las cuotas 
    const fetchAllQuotas = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: dbError } = await supabase
                .from("monthly_quota")
                .select("*")
                .order("year", { ascending: false })
                .order("created_at", { ascending: false });

            if (dbError) {
                setError("Error al cargar las cuotas.");
                return;
            }
            setQuotas((data as MonthlyQuota[]) ?? []);
        } catch {
            setError("No se pudo conectar al servidor.");
        } finally {
            setIsLoading(false);
        }
    };

    // Crear cuota mensual 
    const createQuota = async (month: string, year: number, amount: number): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        try {
            const { error: dbError } = await supabase
                .from("monthly_quota")
                .insert([{ month, year, amount, created_at: new Date().toISOString() }]);

            if (dbError) {
                setError(dbError.message);
                return false;
            }
            await fetchAllQuotas();
            return true;
        } catch {
            setError("No se pudo conectar al servidor.");
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    // Actualizar cuota mensual 
    const updateQuota = async (id: number, amount: number): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        try {
            const { error: dbError } = await supabase
                .from("monthly_quota")
                .update({ amount })
                .eq("id", id);

            if (dbError) {
                setError(dbError.message);
                return false;
            }
            setQuotas(prev => prev.map(q => q.id === id ? { ...q, amount } : q));
            if (quota?.id === id) setQuota(prev => prev ? { ...prev, amount } : prev);
            return true;
        } catch {
            setError("No se pudo conectar al servidor.");
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        quota, quotas, isLoading, error,
        fetchQuota, fetchAllQuotas, createQuota, updateQuota,
    };
}