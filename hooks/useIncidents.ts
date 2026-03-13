import supabase from "@/lib/supabase";
import { useEffect, useState } from "react";

export interface Area {
    id: number;
    name: string;
}

export interface IncStatus {
    id: number;
    name: string;
}

export interface IncType {
    id: number;
    name: string;
    area_id: number | null;
}

export interface Incident {
    id: number;
    created_at: string;
    description: string;
    image: string | null;
    usr_id: number;
    area_id: number;
    completed_at: string | null;  // antes: solved_at
    notes: string | null;
    cost: number | null;
    closed_at: string | null;
    status_id: number;
    type_id: number;
    // joins
    users: { name: string; ap: string; am: string } | null;
    areas: { name: string } | null;
    inc_status: { name: string } | null;
    inc_types: { name: string } | null;
}

export interface CreateIncidentPayload {
    description: string;
    image: string | null;
    usr_id: number;
    area_id: number;
    status_id: number;
    type_id: number;
    cost: number;
}

export interface UpdateIncidentPayload {
    description: string;
    image: string | null;
    area_id: number;
    type_id: number;
}

// ─────────────────────────────────────────────
// Hook — Catálogos (áreas, status, tipos)
// Se usa en index.tsx y create.tsx por separado
// ─────────────────────────────────────────────
export function useCatalogs() {
    const [areas, setAreas] = useState<Area[]>([]);
    const [statuses, setStatuses] = useState<IncStatus[]>([]);
    const [types, setTypes] = useState<IncType[]>([]);
    const [catalogsLoading, setCatalogsLoading] = useState(false);

    useEffect(() => {
        fetchCatalogs();
    }, []);

    const fetchCatalogs = async () => {
        setCatalogsLoading(true);
        const [areasRes, statusRes, typesRes] = await Promise.all([
            supabase.from("areas").select("id, name").order("name"),
            supabase.from("inc_status").select("id, name"),
            supabase.from("inc_types").select("id, name, area_id").order("name"),
        ]);
        if (areasRes.data) setAreas(areasRes.data);
        if (statusRes.data) setStatuses(statusRes.data);
        if (typesRes.data) setTypes(typesRes.data);
        setCatalogsLoading(false);
    };

    return { areas, statuses, types, catalogsLoading };
}

// ─────────────────────────────────────────────
// Hook — Incidencias (lista + crear + editar)
// ─────────────────────────────────────────────
export function useIncidents() {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchIncidents = async (statusId?: number, areaId?: number) => {
        setIsLoading(true);
        setError(null);

        try {
            let query = supabase
                .from("incidents")
                .select(`
                    *,
                    users ( name, ap, am ),
                    areas ( name ),
                    inc_status ( name ),
                    inc_types ( name )
                `)
                .order("created_at", { ascending: false });

            if (statusId !== undefined) query = query.eq("status_id", statusId);
            if (areaId !== undefined) query = query.eq("area_id", areaId);

            const { data, error: dbError } = await query;

            if (dbError) {
                setError("Error al cargar las incidencias.");
                return;
            }

            setIncidents((data as Incident[]) ?? []);
        } catch {
            setError("No se pudo conectar al servidor.");
        } finally {
            setIsLoading(false);
        }
    };

    const createIncident = async (payload: CreateIncidentPayload): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            console.log("Insertando incidencia:", JSON.stringify(payload));
            const { data, error: dbError } = await supabase
                .from("incidents")
                .insert([payload])
                .select();

            if (dbError) {
                console.error("Error Supabase:", dbError.message, dbError.details, dbError.hint);
                setError(dbError.message);
                return false;
            }

            console.log("Incidencia creada:", JSON.stringify(data));
            return true;
        } catch (e: any) {
            console.error("Error inesperado:", e?.message);
            setError("No se pudo conectar al servidor.");
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const updateIncident = async (
        id: number,
        payload: UpdateIncidentPayload
    ): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            const { error: dbError } = await supabase
                .from("incidents")
                .update(payload)
                .eq("id", id);

            if (dbError) {
                console.error("Error Supabase update:", dbError.message, dbError.details, dbError.hint);
                setError(dbError.message);
                return false;
            }

            // Refleja los cambios en el estado local sin refetch
            setIncidents((prev) =>
                prev.map((inc) =>
                    inc.id === id ? { ...inc, ...payload } : inc
                )
            );

            return true;
        } catch (e: any) {
            console.error("Error inesperado:", e?.message);
            setError("No se pudo conectar al servidor.");
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return { incidents, isLoading, error, fetchIncidents, createIncident, updateIncident };
}