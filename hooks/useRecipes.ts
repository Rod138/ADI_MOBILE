import supabase from "@/lib/supabase";
import { useState } from "react";

export interface Recipe {
    id: number;
    year: number;
    month: string;
    img: string | null;
    usr_id: number;
    validated: boolean | null;
    // joins
    users?: { name: string; ap: string; am: string; dep_id: number } | null;
    departments?: { name: string } | null;
}

export interface CreateRecipePayload {
    year: number;
    month: string;
    img: string | null;
    usr_id: number;
    validated: boolean;
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

    // Fetch del usuario actual
    const fetchMyRecipes = async (userId: number) => {
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: dbError } = await supabase
                .from("recipes")
                .select("*")
                .eq("usr_id", userId)
                .order("year", { ascending: false });

            if (dbError) { setError("Error al cargar los comprobantes."); return; }
            setRecipes((data as Recipe[]) ?? []);
        } catch {
            setError("No se pudo conectar al servidor.");
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch de todos (admin/tesorero)
    const fetchAllRecipes = async (year?: number) => {
        setIsLoading(true);
        setError(null);
        try {
            let query = supabase
                .from("recipes")
                .select(`
                    *,
                    users ( name, ap, am, dep_id ),
                    departments: users ( departments ( name ) )
                `)
                .order("year", { ascending: false });

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

    const createRecipe = async (payload: CreateRecipePayload): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        try {
            const { error: dbError } = await supabase
                .from("recipes")
                .insert([payload]);

            if (dbError) { setError(dbError.message); return false; }
            return true;
        } catch {
            setError("No se pudo conectar al servidor.");
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const validateRecipe = async (id: number, validated: boolean): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        try {
            const { error: dbError } = await supabase
                .from("recipes")
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

    const deleteRecipe = async (id: number): Promise<boolean> => {
        setIsLoading(true);
        setError(null);
        try {
            const { error: dbError } = await supabase
                .from("recipes")
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