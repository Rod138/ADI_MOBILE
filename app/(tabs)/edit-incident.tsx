import PrimaryButton from "@/components/PrimaryButton";
import { BackButton, FormPageHeader, ScreenShell, SectionCard, StatusBanner } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { useCatalogs, useIncidents, type Incident, type UpdateIncidentPayload } from "@/hooks/useIncidents";
import { uploadImage } from "@/lib/cloudinary";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator, Alert, Image, Modal,
    ScrollView, StyleSheet, Text, TextInput,
    TouchableOpacity, View,
} from "react-native";

// ── PickerField (reutilizado de create, tema light) ───────────────────────────
function PickerField({ label, value, placeholder, options, onSelect, error, disabled = false }: {
    label: string; value: number | undefined; placeholder: string;
    options: { id: number; name: string }[]; onSelect: (id: number) => void;
    error?: string; disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const selected = options.find((o) => o.id === value)?.name ?? "";

    return (
        <View style={pick.container}>
            <Text style={pick.label}>{label}</Text>
            <TouchableOpacity
                onPress={() => !disabled && setOpen(true)}
                style={[pick.trigger, error && pick.triggerError, disabled && pick.triggerDisabled]}
                activeOpacity={disabled ? 1 : 0.8}
            >
                <Ionicons name="grid-outline" size={17} color={Colors.screen.iconMuted} style={{ marginRight: 10 }} />
                <Text style={[pick.triggerText, !selected && pick.placeholder]}>
                    {selected || placeholder}
                </Text>
                <Ionicons name="chevron-down" size={15} color={Colors.screen.iconMuted} />
            </TouchableOpacity>
            {error ? (
                <View style={pick.errorRow}>
                    <Ionicons name="alert-circle-outline" size={12} color={Colors.status.error} />
                    <Text style={pick.errorText}>{error}</Text>
                </View>
            ) : null}
            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <View style={pick.overlay}>
                    <View style={pick.sheet}>
                        <View style={pick.handle} />
                        <Text style={pick.sheetTitle}>{label}</Text>
                        <ScrollView>
                            {options.map((opt) => (
                                <TouchableOpacity
                                    key={opt.id}
                                    onPress={() => { onSelect(opt.id); setOpen(false); }}
                                    style={[pick.option, value === opt.id && pick.optionActive]}
                                >
                                    <Text style={[pick.optionText, value === opt.id && pick.optionTextActive]}>
                                        {opt.name}
                                    </Text>
                                    {value === opt.id && <Ionicons name="checkmark" size={17} color={Colors.primary.main} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity onPress={() => setOpen(false)} style={pick.cancelBtn}>
                            <Text style={pick.cancelText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ── Pantalla ──────────────────────────────────────────────────────────────────
export default function EditIncidentScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const incidentId = Number(id);

    const { areas, types, catalogsLoading } = useCatalogs();
    const { fetchIncidents, updateIncident, isLoading, error: hookError } = useIncidents();

    // Estado del formulario
    const [original, setOriginal] = useState<Incident | null>(null);
    const [loadingIncident, setLoadingIncident] = useState(true);
    const [description, setDescription] = useState("");
    const [areaId, setAreaId] = useState<number | undefined>();
    const [typeId, setTypeId] = useState<number | undefined>();
    const [imageUri, setImageUri] = useState<string | null>(null);   // nueva imagen local
    const [currentImage, setCurrentImage] = useState<string | null>(null); // imagen guardada
    const [uploadingImage, setUploadingImage] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [descFocused, setDescFocused] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<{ description?: string; area?: string; type?: string }>({});
    const [submitError, setSubmitError] = useState<string | null>(null);

    const filteredTypes = areaId
        ? types.filter((t) => t.area_id === null || t.area_id === areaId)
        : types;

    // Cargar la incidencia al montar
    useEffect(() => {
        loadIncident();
    }, [incidentId]);

    // Si el área cambia, limpiar tipo si ya no aplica
    useEffect(() => {
        if (typeId && areaId && !filteredTypes.find((t) => t.id === typeId)) {
            setTypeId(undefined);
        }
    }, [areaId]);

    const loadIncident = async () => {
        setLoadingIncident(true);
        try {
            const { data, error } = await (await import("@/lib/supabase")).default
                .from("incidents")
                .select(`
                    *,
                    users ( name, ap, am ),
                    areas ( name ),
                    inc_status ( name ),
                    inc_types ( name )
                `)
                .eq("id", incidentId)
                .single();

            if (error || !data) {
                setSubmitError("No se pudo cargar la incidencia.");
                return;
            }

            const inc = data as Incident;
            setOriginal(inc);
            setDescription(inc.description);
            setAreaId(inc.area_id);
            setTypeId(inc.type_id);
            setCurrentImage(inc.image);
        } finally {
            setLoadingIncident(false);
        }
    };

    // ── Imágenes ──────────────────────────────────────────────────────────────
    const pickImage = async () => {
        const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!p.granted) { Alert.alert("Permiso requerido", "Necesitamos acceso a tu galería."); return; }
        const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.8 });
        if (!r.canceled && r.assets[0]) setImageUri(r.assets[0].uri);
    };

    const takePhoto = async () => {
        const p = await ImagePicker.requestCameraPermissionsAsync();
        if (!p.granted) { Alert.alert("Permiso requerido", "Necesitamos acceso a tu cámara."); return; }
        const r = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.8 });
        if (!r.canceled && r.assets[0]) setImageUri(r.assets[0].uri);
    };

    const showImageOptions = () => Alert.alert("Cambiar imagen", "¿Cómo deseas agregar la imagen?", [
        { text: "Cámara", onPress: takePhoto },
        { text: "Galería", onPress: pickImage },
        { text: "Cancelar", style: "cancel" },
    ]);

    const removeImage = () => {
        setImageUri(null);
        setCurrentImage(null);
    };

    // ── Validación ────────────────────────────────────────────────────────────
    const validate = () => {
        const e: typeof fieldErrors = {};
        if (!description.trim()) e.description = "La descripción es obligatoria.";
        else if (description.trim().length < 10) e.description = "Mínimo 10 caracteres.";
        if (!areaId) e.area = "Selecciona un área.";
        if (!typeId) e.type = "Selecciona el tipo de incidencia.";
        setFieldErrors(e);
        return Object.keys(e).length === 0;
    };

    // ── Guardar ───────────────────────────────────────────────────────────────
    const handleSave = async () => {
        setShowConfirm(false);
        setSubmitError(null);

        let finalImage = currentImage; // usa la imagen guardada por default

        if (imageUri) {
            // hay una nueva imagen local — subirla
            setUploadingImage(true);
            try {
                const uploaded = await uploadImage(imageUri, "incidencias");
                finalImage = uploaded.url;
            } catch {
                Alert.alert("Error", "No se pudo subir la imagen. Se guardará sin cambiar la imagen.");
                finalImage = currentImage;
            } finally {
                setUploadingImage(false);
            }
        }

        const payload: UpdateIncidentPayload = {
            description: description.trim(),
            image: finalImage,
            area_id: areaId!,
            type_id: typeId!,
            edited_at: new Date().toISOString(),
        };

        const ok = await updateIncident(incidentId, payload);

        if (ok) {
            setShowSuccess(true);
        } else {
            setSubmitError(hookError ?? "No se pudieron guardar los cambios.");
        }
    };

    // ── Haschanged ────────────────────────────────────────────────────────────
    const hasChanges = original
        ? description.trim() !== original.description ||
        areaId !== original.area_id ||
        typeId !== original.type_id ||
        imageUri !== null ||
        currentImage !== original.image
        : false;

    // ── Render ────────────────────────────────────────────────────────────────
    if (loadingIncident || catalogsLoading) {
        return (
            <ScreenShell theme="light">
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Colors.primary.light} />
                    <Text style={styles.loadingText}>Cargando incidencia...</Text>
                </View>
            </ScreenShell>
        );
    }

    if (!original) {
        return (
            <ScreenShell theme="light" scroll>
                <BackButton theme="light" label="Volver" onPress={() => router.back()} />
                <StatusBanner theme="light" type="error" message={submitError ?? "No se encontró la incidencia."} />
            </ScreenShell>
        );
    }

    const displayImage = imageUri ?? currentImage;

    return (
        <ScreenShell theme="light" scroll>
            <BackButton theme="light" label="Volver a incidencias" onPress={() => router.back()} />

            <FormPageHeader
                theme="light"
                icon="pencil-outline"
                title="Editar incidencia"
                subtitle={`${original.created_at.slice(0, 10)}`}
            />

            <SectionCard theme="light">
                {submitError && <StatusBanner theme="light" type="error" message={submitError} />}

                {/* Descripción */}
                <View style={styles.field}>
                    <Text style={styles.fieldLabel}>DESCRIPCIÓN</Text>
                    <View style={[
                        styles.textArea,
                        descFocused && styles.textAreaFocused,
                        fieldErrors.description && styles.textAreaError,
                    ]}>
                        <Ionicons
                            name="document-text-outline" size={17}
                            color={descFocused ? Colors.primary.light : Colors.screen.iconMuted}
                            style={{ marginRight: 10, marginTop: 2 }}
                        />
                        <TextInput
                            style={styles.textInput}
                            placeholder="Describe el problema..."
                            placeholderTextColor={Colors.screen.textMuted}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            value={description}
                            onChangeText={(t) => {
                                setDescription(t);
                                if (fieldErrors.description) setFieldErrors(p => ({ ...p, description: undefined }));
                            }}
                            onFocus={() => setDescFocused(true)}
                            onBlur={() => setDescFocused(false)}
                            maxLength={500}
                        />
                    </View>
                    {fieldErrors.description && (
                        <View style={styles.errorRow}>
                            <Ionicons name="alert-circle-outline" size={12} color={Colors.status.error} />
                            <Text style={styles.errorText}>{fieldErrors.description}</Text>
                        </View>
                    )}
                </View>

                {/* Imagen */}
                <View style={styles.field}>
                    <Text style={styles.fieldLabel}>IMAGEN</Text>
                    {displayImage ? (
                        <View>
                            <Image source={{ uri: displayImage }} style={styles.imagePreview} resizeMode="cover" />
                            <View style={styles.imageActions}>
                                <TouchableOpacity style={styles.imageBtn} onPress={showImageOptions}>
                                    <Ionicons name="camera-outline" size={15} color={Colors.primary.main} />
                                    <Text style={styles.imageBtnText}>Cambiar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.imageBtn, styles.imageBtnDanger]} onPress={removeImage}>
                                    <Ionicons name="trash-outline" size={15} color={Colors.status.error} />
                                    <Text style={[styles.imageBtnText, { color: Colors.status.error }]}>Eliminar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.imagePicker} onPress={showImageOptions} activeOpacity={0.8}>
                            <Ionicons name="camera-outline" size={26} color={Colors.screen.iconMuted} />
                            <Text style={styles.imagePickerText}>Toca para adjuntar una foto</Text>
                            <Text style={styles.imagePickerHint}>Opcional</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Área */}
                <PickerField
                    label="Área"
                    placeholder="Selecciona el área"
                    value={areaId}
                    options={areas}
                    onSelect={(id) => { setAreaId(id); if (fieldErrors.area) setFieldErrors(p => ({ ...p, area: undefined })); }}
                    error={fieldErrors.area}
                />

                {/* Tipo */}
                <PickerField
                    label="Tipo de incidencia"
                    placeholder={areaId ? "Selecciona el tipo" : "Primero selecciona un área"}
                    value={typeId}
                    options={filteredTypes}
                    onSelect={(id) => { setTypeId(id); if (fieldErrors.type) setFieldErrors(p => ({ ...p, type: undefined })); }}
                    error={fieldErrors.type}
                    disabled={!areaId}
                />

                {/* Botón guardar */}
                {uploadingImage ? (
                    <View style={styles.uploadingRow}>
                        <ActivityIndicator size="small" color={Colors.primary.light} />
                        <Text style={styles.uploadingText}>Subiendo imagen...</Text>
                    </View>
                ) : (
                    <PrimaryButton
                        label="Guardar cambios"
                        onPress={() => { if (validate()) setShowConfirm(true); }}
                        isLoading={isLoading}
                        disabled={isLoading || !hasChanges}
                    />
                )}

                {!hasChanges && (
                    <Text style={styles.noChangesHint}>No hay cambios por guardar</Text>
                )}
            </SectionCard>

            {/* Modal confirmación */}
            <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
                <View style={modal.overlay}>
                    <View style={modal.sheet}>
                        <View style={[modal.icon, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }]}>
                            <Ionicons name="save-outline" size={30} color={Colors.status.warning} />
                        </View>
                        <Text style={modal.title}>¿Guardar cambios?</Text>
                        <Text style={modal.body}>Los cambios que realices serán visibles para el equipo de administración.</Text>
                        <View style={modal.actions}>
                            <TouchableOpacity style={[modal.btn, modal.btnCancel]} onPress={() => setShowConfirm(false)}>
                                <Text style={modal.btnCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[modal.btn, modal.btnConfirm]} onPress={handleSave}>
                                <Text style={modal.btnConfirmText}>Guardar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal éxito */}
            <Modal visible={showSuccess} transparent animationType="fade" onRequestClose={() => setShowSuccess(false)}>
                <View style={modal.overlay}>
                    <View style={modal.sheet}>
                        <View style={[modal.icon, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}>
                            <Ionicons name="checkmark-circle-outline" size={30} color={Colors.status.success} />
                        </View>
                        <Text style={modal.title}>¡Cambios guardados!</Text>
                        <Text style={modal.body}>La incidencia fue actualizada correctamente.</Text>
                        <TouchableOpacity
                            style={[modal.btn, modal.btnConfirm, { width: "100%" }]}
                            onPress={() => { setShowSuccess(false); router.back(); }}
                        >
                            <Text style={modal.btnConfirmText}>Volver a incidencias</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScreenShell>
    );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const pick = StyleSheet.create({
    container: { marginBottom: 18 },
    label: { fontFamily: "Outfit_700Bold", fontSize: 11, color: Colors.screen.textSecondary, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 },
    trigger: {
        flexDirection: "row", alignItems: "center", height: 52, borderRadius: 12,
        paddingHorizontal: 14, borderWidth: 1.5,
        borderColor: Colors.screen.border, backgroundColor: Colors.screen.card,
    },
    triggerError: { borderColor: Colors.status.error },
    triggerDisabled: { opacity: 0.5 },
    triggerText: { flex: 1, fontFamily: "Outfit_400Regular", fontSize: 15, color: Colors.screen.textPrimary },
    placeholder: { color: Colors.screen.textMuted },
    errorRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 },
    errorText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.status.error },
    overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
    sheet: {
        backgroundColor: Colors.screen.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingBottom: 32, maxHeight: "70%",
        borderTopWidth: 1, borderTopColor: Colors.screen.border,
    },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.screen.border, alignSelf: "center", marginTop: 12, marginBottom: 8 },
    sheetTitle: { fontFamily: "Outfit_700Bold", fontSize: 16, color: Colors.screen.textPrimary, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.screen.border },
    option: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: Colors.screen.border },
    optionActive: { backgroundColor: Colors.screen.chipBlue },
    optionText: { flex: 1, fontFamily: "Outfit_400Regular", fontSize: 14, color: Colors.screen.textSecondary },
    optionTextActive: { fontFamily: "Outfit_600SemiBold", color: Colors.primary.main },
    cancelBtn: { marginHorizontal: 20, marginTop: 12, paddingVertical: 13, borderRadius: 12, backgroundColor: Colors.screen.bg, alignItems: "center", borderWidth: 1, borderColor: Colors.screen.border },
    cancelText: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.screen.textSecondary },
});

const modal = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
    sheet: {
        width: "100%", backgroundColor: Colors.screen.card, borderRadius: 24,
        padding: 28, alignItems: "center", borderWidth: 1, borderColor: Colors.screen.border, gap: 14,
        shadowColor: "#1E2D4A", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 12,
    },
    icon: { width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
    title: { fontFamily: "Outfit_700Bold", fontSize: 20, color: Colors.screen.textPrimary, textAlign: "center" },
    body: { fontFamily: "Outfit_400Regular", fontSize: 14, color: Colors.screen.textSecondary, textAlign: "center", lineHeight: 22 },
    actions: { flexDirection: "row", gap: 12, width: "100%", marginTop: 4 },
    btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
    btnCancel: { backgroundColor: Colors.screen.bg, borderWidth: 1, borderColor: Colors.screen.border },
    btnConfirm: { backgroundColor: Colors.primary.main },
    btnCancelText: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.screen.textSecondary },
    btnConfirmText: { fontFamily: "Outfit_700Bold", fontSize: 14, color: Colors.white },
});

const styles = StyleSheet.create({
    centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
    loadingText: { fontFamily: "Outfit_400Regular", fontSize: 14, color: Colors.screen.textSecondary },
    field: { marginBottom: 18 },
    fieldLabel: { fontFamily: "Outfit_700Bold", fontSize: 11, color: Colors.screen.textSecondary, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 },
    textArea: {
        flexDirection: "row", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
        borderWidth: 1.5, borderColor: Colors.screen.border, backgroundColor: Colors.screen.card, minHeight: 110,
    },
    textAreaFocused: { borderColor: Colors.primary.light, backgroundColor: "#F0F6FF" },
    textAreaError: { borderColor: Colors.status.error },
    textInput: { flex: 1, fontFamily: "Outfit_400Regular", fontSize: 15, color: Colors.screen.textPrimary, minHeight: 90, textAlignVertical: "top" },
    errorRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 },
    errorText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.status.error },
    imagePreview: { width: "100%", height: 180, borderRadius: 12, marginBottom: 10 },
    imageActions: { flexDirection: "row", gap: 8 },
    imageBtn: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
        paddingVertical: 10, borderRadius: 10,
        backgroundColor: Colors.screen.chipBlue, borderWidth: 1, borderColor: Colors.screen.border,
    },
    imageBtnDanger: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
    imageBtnText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.primary.main },
    imagePicker: {
        height: 104, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.screen.border,
        borderStyle: "dashed", backgroundColor: Colors.screen.bg,
        alignItems: "center", justifyContent: "center", gap: 6,
    },
    imagePickerText: { fontFamily: "Outfit_500Medium", fontSize: 13, color: Colors.screen.textSecondary },
    imagePickerHint: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted },
    uploadingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
    uploadingText: { fontFamily: "Outfit_500Medium", fontSize: 14, color: Colors.primary.light },
    noChangesHint: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.screen.textMuted, textAlign: "center", marginTop: 8 },
});