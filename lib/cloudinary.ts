const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

// Cloudinary tiene endpoints separados para imágenes y archivos "raw"
const IMAGE_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
const RAW_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`;

export interface CloudinaryUploadResult {
    url: string;
    publicId: string;
    resourceType: "image" | "raw";
}

/**
 * Sube una imagen (jpg/png) o PDF a Cloudinary.
 * - Las imágenes van al endpoint /image/upload
 * - Los PDFs van al endpoint /raw/upload
 */
export async function uploadFile(
    uri: string,
    folder?: string
): Promise<CloudinaryUploadResult> {
    const filename = uri.split("/").pop() ?? "file";
    const extension = filename.split(".").pop()?.toLowerCase() ?? "";

    const isPdf = extension === "pdf";
    const mimeType = isPdf
        ? "application/pdf"
        : extension === "png"
            ? "image/png"
            : "image/jpeg";

    const uploadUrl = isPdf ? RAW_UPLOAD_URL : IMAGE_UPLOAD_URL;

    const formData = new FormData();
    formData.append("file", {
        uri,
        name: filename,
        type: mimeType,
    } as any);
    formData.append("upload_preset", UPLOAD_PRESET);
    if (folder) formData.append("folder", folder);

    const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message ?? "Error al subir el archivo.");
    }

    const data = await response.json();

    return {
        url: data.secure_url,
        publicId: data.public_id,
        resourceType: isPdf ? "raw" : "image",
    };
}

// Mantén el nombre anterior como alias para no romper otros usos
export const uploadImage = uploadFile;