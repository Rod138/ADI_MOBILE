/**
 * useNotificationSender
 *
 * Centraliza el envío de notificaciones para todos los módulos de ADI.
 * Cada función corresponde a un evento específico del sistema.
 *
 * Tipos de notificación:
 *  1 → INCIDENT_STATUS_CHANGE  (residente que reportó)
 *  2 → QUOTA_PUBLISHED         (todos los residentes)
 *  3 → QUOTA_REJECTED          (residente del depto)
 *  4 → QUOTA_VALIDATED         (residente del depto)
 *  5 → NEW_EXPENSE             (todos los residentes)
 *  6 → NEW_INCIDENT            (todos los admins)
 *  7 → NEW_RECEIPT             (todos los tesoreros)
 */

import {
    createNotification,
    createNotificationBatch,
    NOTIFICATION_TYPE,
} from "@/hooks/useNotifications";
import supabase from "@/lib/supabase";

// ── Helper interno: obtener IDs de usuarios por rol ───────────────────────────

async function getUserIdsByRole(rolIds: number[]): Promise<number[]> {
    try {
        const { data } = await supabase
            .from("users")
            .select("id")
            .in("rol_id", rolIds);
        return (data ?? []).map((u: { id: number }) => u.id);
    } catch {
        return [];
    }
}

// rol_id: 1=Residente, 2=Tesorero, 3=Admin, 4=Tesorero+Admin
async function getAllResidentIds(): Promise<number[]> {
    return getUserIdsByRole([1, 2, 3, 4]);
}
async function getAdminIds(): Promise<number[]> {
    return getUserIdsByRole([3, 4]);
}
async function getTreasurerIds(): Promise<number[]> {
    return getUserIdsByRole([2, 4]);
}

// ── Notificaciones para RESIDENTES ───────────────────────────────────────────

/**
 * 1. Cambio de estado de incidencia → al residente que la reportó
 */
export async function notifyIncidentStatusChange({
    reporterUserId,
    newStatus,
    area,
}: {
    reporterUserId: number;
    newStatus: string;
    area?: string;
}): Promise<void> {
    const areaLabel = area ? ` en ${area}` : "";
    await createNotification({
        usr_id: reporterUserId,
        type_id: NOTIFICATION_TYPE.INCIDENT_STATUS_CHANGE,
        title: "Estado de incidencia actualizado",
        description: `La incidencia ${areaLabel} cambió a "${newStatus}".`,
    });
}

/**
 * 2. Nueva cuota del mes publicada → todos los usuarios
 */
export async function notifyQuotaPublished({
    month,
    year,
    amount,
}: {
    month: string;
    year: number;
    amount: number;
}): Promise<void> {
    const userIds = await getAllResidentIds();
    const formatted = `$${Number(amount).toLocaleString("es-MX")}`;
    const payloads = userIds.map((uid) => ({
        usr_id: uid,
        type_id: NOTIFICATION_TYPE.QUOTA_PUBLISHED,
        title: `Cuota de ${month} ${year} registrada`,
        description: `La cuota de mantenimiento de ${month} ${year} es ${formatted}. Ya puedes subir tu comprobante.`,
    }));
    await createNotificationBatch(payloads as any);
}

/**
 * 3. Cuota rechazada → al residente del departamento
 */
export async function notifyQuotaRejected({
    depId,
    month,
    year,
}: {
    depId: number;
    month: string;
    year: number;
}): Promise<void> {
    // Obtener el usuario del departamento
    try {
        const { data } = await supabase
            .from("users")
            .select("id")
            .eq("dep_id", depId);

        const userIds: number[] = (data ?? []).map((u: { id: number }) => u.id);
        const payloads = userIds.map((uid) => ({
            usr_id: uid,
            type_id: NOTIFICATION_TYPE.QUOTA_REJECTED,
            title: "Comprobante rechazado",
            description: `Tu comprobante de cuota de ${month} ${year} fue rechazado. Por favor sube uno nuevo.`,
        }));
        await createNotificationBatch(payloads as any);
    } catch {
        // Silencioso para no interrumpir el flujo principal
    }
}

/**
 * 4. Cuota validada/aprobada → al residente del departamento
 */
export async function notifyQuotaValidated({
    depId,
    month,
    year,
    amountPaid,
}: {
    depId: number;
    month: string;
    year: number;
    amountPaid: number;
}): Promise<void> {
    try {
        const { data } = await supabase
            .from("users")
            .select("id")
            .eq("dep_id", depId);

        const userIds: number[] = (data ?? []).map((u: { id: number }) => u.id);
        const formatted = `$${Number(amountPaid).toLocaleString("es-MX")}`;
        const payloads = userIds.map((uid) => ({
            usr_id: uid,
            type_id: NOTIFICATION_TYPE.QUOTA_VALIDATED,
            title: "Cuota aprobada ✓",
            description: `Tu pago de ${formatted} para ${month} ${year} fue aprobado correctamente.`,
        }));
        await createNotificationBatch(payloads as any);
    } catch {
        // Silencioso
    }
}

/**
 * 5. Nuevo gasto registrado en la torre → todos los usuarios
 */
export async function notifyNewExpense({
    description,
    amount,
}: {
    description: string;
    amount: number;
}): Promise<void> {
    const userIds = await getAllResidentIds();
    const formatted = `$${Number(amount).toLocaleString("es-MX")}`;
    const payloads = userIds.map((uid) => ({
        usr_id: uid,
        type_id: NOTIFICATION_TYPE.NEW_EXPENSE,
        title: "Nuevo gasto registrado",
        description: `Se registró un gasto de ${formatted}: "${description}".`,
    }));
    await createNotificationBatch(payloads as any);
}

// ── Notificaciones para ADMINS / TESOREROS ────────────────────────────────────

/**
 * 6. Nueva incidencia creada → todos los admins
 */
export async function notifyNewIncident({
    reporterName,
    area,
    description,
}: {
    reporterName: string;
    area?: string;
    description: string;
}): Promise<void> {
    const adminIds = await getAdminIds();
    const areaLabel = area ? ` en ${area}` : "";
    const shortDesc =
        description.length > 60 ? description.slice(0, 57) + "..." : description;

    const payloads = adminIds.map((uid) => ({
        usr_id: uid,
        type_id: NOTIFICATION_TYPE.NEW_INCIDENT,
        title: `Nueva incidencia en ${areaLabel}`,
        description: `${reporterName} reportó: "${shortDesc}"`,
    }));
    await createNotificationBatch(payloads as any);
}

/**
 * 7. Nuevo comprobante de cuota recibido → todos los tesoreros
 */
export async function notifyNewReceipt({
    depName,
    month,
    year,
    amountPaid,
}: {
    depName: string;
    month: string;
    year: number;
    amountPaid: number;
}): Promise<void> {
    const treasurerIds = await getTreasurerIds();
    const formatted = `$${Number(amountPaid).toLocaleString("es-MX")}`;
    const payloads = treasurerIds.map((uid) => ({
        usr_id: uid,
        type_id: NOTIFICATION_TYPE.NEW_RECEIPT,
        title: "Nuevo comprobante recibido",
        description: `${depName} subió su comprobante de ${formatted} para ${month} ${year}. Pendiente de revisión.`,
    }));
    await createNotificationBatch(payloads as any);
}