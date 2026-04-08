import supabase from "@/lib/supabase";
import { useState } from "react";

export interface Expense {
    id: number;
    description: string;
    url_image: string | null;
    amount: number;
    expense_date: string;
}

export interface CreateExpensePayload {
    description: string;
    url_image: string | null;
    amount: number;
    expense_date?: string;
}

export function useExpenses() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch todos los gastos 
    const fetchExpenses = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: dbError } = await supabase
                .from("tower_expenses")
                .select("*")
                .order("expense_date", { ascending: false });

            if (dbError) {
                setError("Error al cargar los gastos.");
                return;
            }
            setExpenses((data as Expense[]) ?? []);
        } catch {
            setError("No se pudo conectar al servidor.");
        } finally {
            setIsLoading(false);
        }
    };

    // Crear gasto 
    const createExpense = async (payload: CreateExpensePayload): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        try {
            const now = new Date().toISOString();
            const { error: dbError } = await supabase
                .from("tower_expenses")
                .insert([{ ...payload, expense_date: payload.expense_date ?? now }]);

            if (dbError) {
                console.error("Error Supabase createExpense:", dbError.message, dbError.details);
                setError(dbError.message);
                return false;
            }
            return true;
        } catch (e: any) {
            console.error("Error inesperado createExpense:", e?.message);
            setError("No se pudo conectar al servidor.");
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    // Eliminar gasto 
    const deleteExpense = async (id: number): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        try {
            const { error: dbError } = await supabase
                .from("tower_expenses")
                .delete()
                .eq("id", id);

            if (dbError) {
                setError(dbError.message);
                return false;
            }
            setExpenses(prev => prev.filter(e => e.id !== id));
            return true;
        } catch {
            setError("No se pudo conectar al servidor.");
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        expenses, isLoading, error,
        fetchExpenses, createExpense, deleteExpense,
    };
}