const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

export interface CloudinaryUploadResult {
    url: string;        // URL con transformaciones (https)
    publicId: string;   // ID para referenciar/eliminar la imagen después
}

export async function uploadImage(
    uri: string,
    folder?: string
): Promise<CloudinaryUploadResult> {
    // Obtener el nombre y tipo del archivo desde la URI
    const filename = uri.split("/").pop() ?? "image.jpg";
    const extension = filename.split(".").pop()?.toLowerCase() ?? "jpg";
    const mimeType = extension === "png" ? "image/png" : "image/jpeg";

    // Construir el FormData que espera la REST API de Cloudinary
    const formData = new FormData();
    formData.append("file", {
        uri,
        name: filename,
        type: mimeType,
    } as any);
    formData.append("upload_preset", UPLOAD_PRESET);
    if (folder) formData.append("folder", folder);

    const response = await fetch(UPLOAD_URL, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error?.message ?? "Error al subir la imagen.");
    }

    const data = await response.json();

    return {
        url: data.secure_url,
        publicId: data.public_id,
    };
}