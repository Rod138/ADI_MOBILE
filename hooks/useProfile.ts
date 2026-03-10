import supabase from "@/lib/supabase";
import { useState } from "react";

export interface UpdatePasswordPayload {
    userId: number;
    newPassword: string;
}

export interface UpdatePhonePayload {
    userId: number;
    newPhone: string;
}

// ─────────────────────────────────────────────
// Hook — Perfil
// ─────────────────────────────────────────────
export function useProfile() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const clearMessages = () => {
        setError(null);
        setSuccess(null);
    };

    // ── Cambiar contraseña ─────────────────────
    // TODO: migrar a hash cuando esté listo
    const updatePassword = async ({ userId, newPassword }: UpdatePasswordPayload): Promise<boolean> => {
        setIsLoading(true);
        clearMessages();

        try {
            const { error: dbError } = await supabase
                .from("users")
                .update({ password: newPassword })
                .eq("id", userId);

            if (dbError) {
                setError("Error al actualizar la contraseña.");
                return false;
            }

            setSuccess("Contraseña actualizada correctamente.");
            return true;
        } catch {
            setError("No se pudo conectar al servidor.");
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    // ── Cambiar teléfono ───────────────────────
    const updatePhone = async ({ userId, newPhone }: UpdatePhonePayload): Promise<boolean> => {
        setIsLoading(true);
        clearMessages();

        try {
            const { error: dbError } = await supabase
                .from("users")
                .update({ phone: newPhone })
                .eq("id", userId);

            if (dbError) {
                setError("Error al actualizar el teléfono.");
                return false;
            }

            setSuccess("Teléfono actualizado correctamente.");
            return true;
        } catch {
            setError("No se pudo conectar al servidor.");
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    return { updatePassword, updatePhone, isLoading, error, success, clearMessages };
}