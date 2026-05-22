import supabase from "@/lib/supabase";
import { hashPassword } from "@/utils/bcrypt";
import { useState } from "react";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface Department {
    id: number;
    name: string;
    is_in_use: boolean;
}

export interface DeptUser {
    id: number;
    name: string;
    ap: string;
    am: string | null;
    email: string;
    phone: string;
    dep_id: number;
    rol_id: number;
}

export interface CreateUserPayload {
    name: string;
    ap: string;
    am?: string;
    email: string;
    phone: string;
    password: string;
    dep_id: number;
    rol_id: 1;
}

export interface UpdateUserPayload {
    id: number;
    name: string;
    ap: string;
    am?: string;
    email: string;
    phone: string;
    dep_id: number;
    rol_id: number;
    old_dep_id: number;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDepartments() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [users, setUsers] = useState<DeptUser[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const clearMessages = () => { setError(null); setSuccess(null); };

    // ── Fetch todos los departamentos ────────────────────────────────────────
    const fetchDepartments = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: dbError } = await supabase
                .from("departments")
                .select("*")
                .order("name");

            if (dbError) { setError("Error al cargar los departamentos."); return; }
            setDepartments((data as Department[]) ?? []);
        } catch {
            setError("No se pudo conectar al servidor.");
        } finally {
            setIsLoading(false);
        }
    };

    // ── Fetch todos los usuarios de un departamento (sin filtrar por rol) ────
    // Admins y tesoreros también son residentes del condominio.
    const fetchUsersByDept = async (depId: number) => {
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: dbError } = await supabase
                .from("users")
                .select("id, name, ap, am, email, phone, dep_id, rol_id")
                .eq("dep_id", depId);

            if (dbError) { setError("Error al cargar los usuarios."); return; }
            setUsers((data as DeptUser[]) ?? []);
        } catch {
            setError("No se pudo conectar al servidor.");
        } finally {
            setIsLoading(false);
        }
    };

    // ── Verificar si hay usuarios en un depto (cualquier rol) ───────────────
    const deptHasResidents = async (depId: number): Promise<boolean> => {
        const { count } = await supabase
            .from("users")
            .select("id", { count: "exact", head: true })
            .eq("dep_id", depId);
        return (count ?? 0) > 0;
    };

    // ── Toggle is_in_use ─────────────────────────────────────────────────────
    // Activar requiere al menos un residente. Desactivar siempre permitido.
    const toggleDeptInUse = async (
        deptId: number,
        inUse: boolean
    ): Promise<{ ok: boolean; noResidents?: boolean }> => {
        setIsLoading(true);
        clearMessages();
        try {
            if (inUse) {
                const hasResidents = await deptHasResidents(deptId);
                if (!hasResidents) {
                    setError("Agrega al menos un residente antes de activar el departamento.");
                    return { ok: false, noResidents: true };
                }
            }

            const { error: dbError } = await supabase
                .from("departments")
                .update({ is_in_use: inUse })
                .eq("id", deptId);

            if (dbError) { setError("Error al actualizar el departamento."); return { ok: false }; }

            setDepartments(prev =>
                prev.map(d => d.id === deptId ? { ...d, is_in_use: inUse } : d)
            );
            setSuccess(`Departamento marcado como ${inUse ? "en uso" : "desocupado"}.`);
            return { ok: true };
        } catch {
            setError("No se pudo conectar al servidor.");
            return { ok: false };
        } finally {
            setIsLoading(false);
        }
    };

    // ── Crear residente ──────────────────────────────────────────────────────
    const createUser = async (payload: CreateUserPayload): Promise<boolean> => {
        setIsLoading(true);
        clearMessages();
        try {
            // 1. Verificar email duplicado
            const { data: existing } = await supabase
                .from("users")
                .select("id")
                .eq("email", payload.email)
                .maybeSingle();

            if (existing) {
                setError("Ya existe un usuario con ese correo electrónico.");
                return false;
            }

            // 2. Verificar teléfono duplicado
            const { data: existingPhone, error: phoneError } = await supabase
                .from("users")
                .select("id")
                .eq("phone", payload.phone)
                .maybeSingle();

            if (phoneError || existingPhone) {
                setError("El teléfono ya está registrado por otro usuario.");
                return false;
            }

            // 3. Calcular el siguiente ID igual que la web
            const { data: maxRow } = await supabase
                .from("users")
                .select("id")
                .order("id", { ascending: false })
                .limit(1)
                .maybeSingle();

            const newId = (maxRow?.id ?? 0) + 1;

            // 4. Hashear la contraseña antes de guardar
            const hashedPassword = await hashPassword(payload.password);

            // 5. Insertar con el ID calculado y la contraseña hasheada
            const { error: dbError } = await supabase
                .from("users")
                .insert([{
                    id: newId,
                    name: payload.name,
                    ap: payload.ap,
                    am: payload.am || null,
                    email: payload.email,
                    phone: payload.phone,
                    password: hashedPassword,   // ← hash, no texto plano
                    dep_id: payload.dep_id,
                    rol_id: 1,
                }]);

            if (dbError) {
                if (dbError.code === "23505") {
                    setError("Conflicto al asignar ID. Intenta de nuevo.");
                    return false;
                }
                setError(dbError.message);
                return false;
            }

            setSuccess("Usuario creado correctamente.");
            return true;
        } catch (e: any) {
            setError(`Error interno: ${e?.message || "No se pudo conectar al servidor."}`);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    // ── Actualizar residente ─────────────────────────────────────────────────
    const updateUser = async (payload: UpdateUserPayload): Promise<boolean> => {
        setIsLoading(true);
        clearMessages();
        try {
            // 1. Verificar email duplicado
            const { data: existing } = await supabase
                .from("users")
                .select("id")
                .eq("email", payload.email)
                .neq("id", payload.id)
                .maybeSingle();

            if (existing) {
                setError("Ya existe un usuario con ese correo electrónico.");
                return false;
            }

            // 2. Verificar teléfono duplicado
            const { data: existingPhone, error: phoneError } = await supabase
                .from("users")
                .select("id")
                .eq("phone", payload.phone)
                .neq("id", payload.id)
                .maybeSingle();

            if (phoneError || existingPhone) {
                setError("El teléfono ya está registrado por otro usuario.");
                return false;
            }

            // 3. Actualizar datos en la BD
            const { error: dbError } = await supabase
                .from("users")
                .update({
                    name: payload.name,
                    ap: payload.ap,
                    am: payload.am || null,
                    email: payload.email,
                    phone: payload.phone,
                    dep_id: payload.dep_id,
                    rol_id: payload.rol_id,
                })
                .eq("id", payload.id);

            if (dbError) {
                setError(dbError.message);
                return false;
            }

            // 4. Si cambió de departamento, verificar el departamento anterior
            if (payload.old_dep_id !== payload.dep_id) {
                const { count } = await supabase
                    .from("users")
                    .select("id", { count: "exact", head: true })
                    .eq("dep_id", payload.old_dep_id);

                if ((count ?? 0) === 0) {
                    await supabase
                        .from("departments")
                        .update({ is_in_use: false })
                        .eq("id", payload.old_dep_id);
                }

                // Asegurar que el nuevo departamento esté activo
                await supabase
                    .from("departments")
                    .update({ is_in_use: true })
                    .eq("id", payload.dep_id);
            }

            setSuccess("Usuario actualizado correctamente.");
            return true;
        } catch (e: any) {
            setError(`Error interno: ${e?.message || "No se pudo conectar al servidor."}`);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    // ── Eliminar residente ───────────────────────────────────────────────────
    // Si era el último residente → desactiva el depto automáticamente.
    const deleteUser = async (userId: number, depId: number): Promise<boolean> => {
        setIsLoading(true);
        clearMessages();
        try {
            const { error: dbError } = await supabase
                .from("users")
                .delete()
                .eq("id", userId);

            if (dbError) { setError("Error al eliminar el usuario."); return false; }

            const updatedUsers = users.filter(u => u.id !== userId);
            setUsers(updatedUsers);

            // Si no quedan usuarios en el depto → desactivar automáticamente
            const remaining = updatedUsers.filter(u => u.dep_id === depId);
            if (remaining.length === 0) {
                await supabase
                    .from("departments")
                    .update({ is_in_use: false })
                    .eq("id", depId);
            }

            setSuccess("Usuario eliminado correctamente.");
            return true;
        } catch {
            setError("No se pudo conectar al servidor.");
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return {
        departments, users,
        isLoading, error, success,
        clearMessages,
        fetchDepartments,
        fetchUsersByDept,
        toggleDeptInUse,
        createUser,
        updateUser,
        deleteUser,
    };
}