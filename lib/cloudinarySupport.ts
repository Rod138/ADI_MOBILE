/**
 * cloudinarySupport.ts
 *
 * Instancia de Cloudinary SEPARADA usada exclusivamente por el módulo
 * de soporte (tickets). Usa sus propias variables de entorno para que
 * las evidencias de tickets no se mezclen con los archivos de ADI.
 * Solo acepta imágenes (JPG / PNG).
 *
 * Variables de entorno requeridas (.env):
 *   EXPO_PUBLIC_SUPPORT_CLOUDINARY_CLOUD_NAME
 *   EXPO_PUBLIC_SUPPORT_CLOUDINARY_UPLOAD_PRESET
 */

const CLOUD_NAME = process.env.EXPO_PUBLIC_SUPPORT_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_SUPPORT_CLOUDINARY_UPLOAD_PRESET!;

const IMAGE_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

export interface SupportUploadResult {
    url: string;
    publicId: string;
}

/**
 * Sube una imagen (JPG / PNG) al bucket de soporte de Cloudinary.
 * Siempre guarda en la carpeta "tickets".
 */
export async function uploadSupportEvidence(
    uri: string
): Promise<SupportUploadResult> {
    const filename = uri.split("/").pop() ?? "image.jpg";
    const extension = filename.split(".").pop()?.toLowerCase() ?? "jpg";
    const mimeType = extension === "png" ? "image/png" : "image/jpeg";

    const formData = new FormData();
    formData.append("file", { uri, name: filename, type: mimeType } as any);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("folder", "tickets");

    const response = await fetch(IMAGE_UPLOAD_URL, { method: "POST", body: formData });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? "Error al subir la evidencia.");
    }

    const data = await response.json();
    return {
        url: data.secure_url,
        publicId: data.public_id,
    };
}