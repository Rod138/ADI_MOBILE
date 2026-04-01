import supabase from "@/lib/supabase";
import { useState } from "react";

export interface Recipe {
    id: number;
    dep_id: number;
    year: number;
    month: string;
    amount_paid: number;
    amount_expected: number;
    img: string | null;
    validated: boolean | null;
    created_at: string;
    departments?: { name: string } | null;
}

export interface CreateRecipePayload {
    dep_id: number;
    year: number;
    month: string;
    amount_paid: number;
    amount_expected: number;
    img: string | null;
    validated: boolean | null;
}

export const MONTHS = [
    { value: "Enero", label: "Enero" },
    { value: "Febrero", label: "Febrero" },
    { value: "Marzo", label: "Marzo" },
    { value: "Abril", label: "Abril" },
    { value: "Mayo", label: "Mayo" },
    { value: "Junio", label: "Junio" },
    { value: "Julio", label: "Julio" },
    { value: "Agosto", label: "Agosto" },
    { value: "Septiembre", label: "Septiembre" },
    { value: "Octubre", label: "Octubre" },
    { value: "Noviembre", label: "Noviembre" },
    { value: "Diciembre", label: "Diciembre" },
];

export const MONTH_ORDER: Record<string, number> = {
    Enero: 1, Febrero: 2, Marzo: 3, Abril: 4,
    Mayo: 5, Junio: 6, Julio: 7, Agosto: 8,
    Septiembre: 9, Octubre: 10, Noviembre: 11, Diciembre: 12,
};

export function useRecipes() {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── Fetch del departamento del usuario actual 
    const fetchMyRecipes = async (depId: number) => {
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: dbError } = await supabase
                .from("recipes_payment")
                .select("*, departments ( name )")
                .eq("dep_id", depId)
                .order("year", { ascending: false })
                .order("created_at", { ascending: false });

            if (dbError) { setError("Error al cargar los comprobantes."); return; }
            setRecipes((data as Recipe[]) ?? []);
        } catch {
            setError("No se pudo conectar al servidor.");
        } finally {
            setIsLoading(false);
        }
    };

    // ── Fetch de todos (admin/tesorero) 
    const fetchAllRecipes = async (year?: number) => {
        setIsLoading(true);
        setError(null);
        try {
            let query = supabase
                .from("recipes_payment")
                .select("*, departments ( name )")
                .order("year", { ascending: false })
                .order("created_at", { ascending: false });

            if (year) query = query.eq("year", year);

            const { data, error: dbError } = await query;
            if (dbError) { setError("Error al cargar los comprobantes."); return; }
            setRecipes((data as Recipe[]) ?? []);
        } catch {
            setError("No se pudo conectar al servidor.");
        } finally {
            setIsLoading(false);
        }
    };

    // ── Crear comprobante / pago 
    const createRecipe = async (payload: CreateRecipePayload): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        try {
            const { error: dbError } = await supabase
                .from("recipes_payment")
                .insert([{ ...payload, created_at: new Date().toISOString() }]);

            if (dbError) {
                console.error("Error Supabase createRecipe:", dbError.message, dbError.details);
                setError(dbError.message);
                return false;
            }
            return true;
        } catch (e: any) {
            console.error("Error inesperado createRecipe:", e?.message);
            setError("No se pudo conectar al servidor.");
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    // ── Validar (aprobar / rechazar) 
    const validateRecipe = async (id: number, validated: boolean): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        try {
            const { error: dbError } = await supabase
                .from("recipes_payment")
                .update({ validated })
                .eq("id", id);

            if (dbError) { setError(dbError.message); return false; }

            setRecipes(prev =>
                prev.map(r => r.id === id ? { ...r, validated } : r)
            );
            return true;
        } catch {
            setError("No se pudo conectar al servidor.");
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    // ── Eliminar 
    const deleteRecipe = async (id: number): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        try {
            const { error: dbError } = await supabase
                .from("recipes_payment")
                .delete()
                .eq("id", id);

            if (dbError) { setError(dbError.message); return false; }
            setRecipes(prev => prev.filter(r => r.id !== id));
            return true;
        } catch {
            setError("No se pudo conectar al servidor.");
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        recipes, isLoading, error,
        fetchMyRecipes, fetchAllRecipes,
        createRecipe, validateRecipe, deleteRecipe,
    };
}