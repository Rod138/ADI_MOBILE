import PrimaryButton from "@/components/PrimaryButton";
import { Colors } from "@/constants/colors";
import { useSession } from "@/context/AuthContext";
import { useCatalogs, useIncidents } from "@/hooks/useIncidents";
import { uploadImage } from "@/lib/cloudinary";
import { globalStyles } from "@/utils/globalStyles";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─────────────────────────────────────────────
// PickerField — selector con modal bottom sheet
// ─────────────────────────────────────────────
function PickerField({
    label, value, placeholder, options, onSelect, error, disabled = false,
}: {
    label: string; value: number | undefined; placeholder: string;
    options: { id: number; name: string }[]; onSelect: (id: number) => void;
    error?: string; disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const selectedLabel = options.find((o) => o.id === value)?.name ?? "";

    return (
        <View style={pickerStyles.container}>
            <Text style={pickerStyles.label}>{label}</Text>
            <TouchableOpacity
                onPress={() => !disabled && setOpen(true)}
                style={[pickerStyles.trigger, error ? pickerStyles.triggerError : null, disabled && pickerStyles.triggerDisabled]}
                activeOpacity={disabled ? 1 : 0.8}
            >
                <Ionicons name="grid-outline" size={18} color="rgba(255,255,255,0.40)" style={{ marginRight: 12 }} />
                <Text style={[pickerStyles.triggerText, !selectedLabel && pickerStyles.placeholder]}>
                    {selectedLabel || placeholder}
                </Text>
                <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.35)" />
            </TouchableOpacity>
            {error ? (
                <View style={pickerStyles.errorRow}>
                    <Ionicons name="alert-circle-outline" size={12} color="#FCA5A5" />
                    <Text style={pickerStyles.errorText}>{error}</Text>
                </View>
            ) : null}

            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <View style={pickerStyles.modalOverlay}>
                    <View style={pickerStyles.modalSheet}>
                        <View style={pickerStyles.sheetHandle} />
                        <Text style={pickerStyles.sheetTitle}>{label}</Text>
                        <ScrollView>
                            {options.map((opt) => (
                                <TouchableOpacity
                                    key={opt.id}
                                    onPress={() => { onSelect(opt.id); setOpen(false); }}
                                    style={[pickerStyles.option, value === opt.id && pickerStyles.optionActive]}
                                >
                                    <Text style={[pickerStyles.optionText, value === opt.id && pickerStyles.optionTextActive]}>
                                        {opt.name}
                                    </Text>
                                    {value === opt.id && <Ionicons name="checkmark" size={18} color={Colors.primary.light} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity onPress={() => setOpen(false)} style={pickerStyles.cancelBtn}>
                            <Text style={pickerStyles.cancelText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ─────────────────────────────────────────────
// Pantalla principal
// ─────────────────────────────────────────────
export default function CreateIncidentScreen() {
    const { user } = useSession();
    const { areas, statuses, types, catalogsLoading } = useCatalogs();
    const { createIncident, isLoading } = useIncidents();

    const [description, setDescription] = useState("");
    const [areaId, setAreaId] = useState<number | undefined>();
    const [typeId, setTypeId] = useState<number | undefined>();
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [descFocused, setDescFocused] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<{
        description?: string; area?: string; type?: string;
    }>({});

    // Tipos filtrados por área seleccionada
    const filteredTypes = areaId
        ? types.filter((t) => t.area_id === null || t.area_id === areaId)
        : types;

    // Al cambiar área, resetear tipo si ya no aplica
    useEffect(() => {
        if (typeId && areaId) {
            const valid = filteredTypes.find((t) => t.id === typeId);
            if (!valid) setTypeId(undefined);
        }
    }, [areaId]);

    const validate = (): boolean => {
        const errors: typeof fieldErrors = {};
        if (!description.trim()) errors.description = "La descripción es obligatoria.";
        else if (description.trim().length < 10) errors.description = "Mínimo 10 caracteres.";
        if (!areaId) errors.area = "Selecciona un área.";
        if (!typeId) errors.type = "Selecciona el tipo de incidencia.";
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const pickImage = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            Alert.alert("Permiso requerido", "Necesitamos acceso a tu galería para adjuntar una imagen.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, aspect: [4, 3], quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
    };

    const takePhoto = async () => {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
            Alert.alert("Permiso requerido", "Necesitamos acceso a tu cámara.");
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true, aspect: [4, 3], quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
    };

    const showImageOptions = () => {
        Alert.alert("Adjuntar imagen", "¿Cómo deseas agregar la imagen?", [
            { text: "Cámara", onPress: takePhoto },
            { text: "Galería", onPress: pickImage },
            { text: "Cancelar", style: "cancel" },
        ]);
    };

    const handleSubmitPress = () => {
        if (!validate()) return;
        setShowConfirm(true);
    };

    const handleConfirm = async () => {
        setShowConfirm(false);
        const defaultStatus = statuses[0]?.id ?? 1;

        let imageUrl: string | null = null;
        if (imageUri) {
            setUploadingImage(true);
            try {
                const uploaded = await uploadImage(imageUri, "incidencias");
                imageUrl = uploaded.url;
            } catch {
                Alert.alert("Error", "No se pudo subir la imagen. La incidencia se creará sin imagen.");
            } finally {
                setUploadingImage(false);
            }
        }

        const payload = {
            description: description.trim(),
            image: imageUrl,
            usr_id: user!.id,
            area_id: areaId!,
            type_id: typeId!,
            status_id: defaultStatus,
            cost: 0,
        };
        console.log("📤 Payload a enviar:", JSON.stringify(payload));

        const success = await createIncident(payload);

        if (success) {
            setShowSuccess(true);
            setDescription(""); setAreaId(undefined); setTypeId(undefined);
            setImageUri(null); setFieldErrors({});
        } else {
            Alert.alert("Error al crear", "No se pudo guardar la incidencia. Revisa la consola para más detalles.");
        }
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor="#0C1F5C" />
            <View style={styles.blobTR} />

            <KeyboardAvoidingView style={globalStyles.flex1} behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <SafeAreaView style={globalStyles.flex1}>
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Header */}
                        <View style={styles.pageHeader}>
                            <Text style={styles.pageTitle}>Crear Incidencia</Text>
                            <Text style={styles.pageSubtitle}>Reporta un problema en tu condominio</Text>
                        </View>

                        <View style={globalStyles.glassCard}>
                            <View style={styles.shimmer} />
                            <View style={styles.cardContent}>

                                {/* ── Descripción — TextInput directo para soporte multiline ── */}
                                <View style={styles.fieldWrapper}>
                                    <Text style={styles.fieldLabel}>DESCRIPCIÓN</Text>
                                    <View style={[
                                        styles.textAreaContainer,
                                        descFocused && styles.textAreaFocused,
                                        fieldErrors.description ? styles.textAreaError : null,
                                    ]}>
                                        <Ionicons
                                            name="document-text-outline"
                                            size={18}
                                            color={descFocused ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.40)"}
                                            style={styles.textAreaIcon}
                                        />
                                        <TextInput
                                            style={styles.textArea}
                                            placeholder="Describe detalladamente el problema..."
                                            placeholderTextColor="rgba(255,255,255,0.32)"
                                            multiline
                                            numberOfLines={4}
                                            textAlignVertical="top"
                                            value={description}
                                            onChangeText={(t) => {
                                                setDescription(t);
                                                if (fieldErrors.description)
                                                    setFieldErrors((p) => ({ ...p, description: undefined }));
                                            }}
                                            onFocus={() => setDescFocused(true)}
                                            onBlur={() => setDescFocused(false)}
                                            maxLength={500}
                                        />
                                    </View>
                                    {fieldErrors.description ? (
                                        <View style={styles.errorRow}>
                                            <Ionicons name="alert-circle-outline" size={12} color="#FCA5A5" />
                                            <Text style={styles.errorText}>{fieldErrors.description}</Text>
                                        </View>
                                    ) : null}
                                </View>

                                {/* ── Imagen ── */}
                                <View style={styles.imageSection}>
                                    <Text style={styles.fieldLabel}>IMAGEN</Text>
                                    {imageUri ? (
                                        <View style={styles.imagePreviewWrapper}>
                                            <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
                                            <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImageUri(null)}>
                                                <Ionicons name="close-circle" size={24} color="#FCA5A5" />
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <TouchableOpacity style={styles.imagePicker} onPress={showImageOptions} activeOpacity={0.8}>
                                            <Ionicons name="camera-outline" size={28} color="rgba(255,255,255,0.30)" />
                                            <Text style={styles.imagePickerText}>Toca para adjuntar una foto</Text>
                                            <Text style={styles.imagePickerHint}>Opcional</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>

                                {/* ── Área ── */}
                                {catalogsLoading ? (
                                    <View style={styles.loadingRow}>
                                        <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />
                                        <Text style={styles.loadingText}>Cargando catálogos...</Text>
                                    </View>
                                ) : (
                                    <>
                                        <PickerField
                                            label="Área"
                                            placeholder="Selecciona el área"
                                            value={areaId}
                                            options={areas}
                                            onSelect={(id) => {
                                                setAreaId(id);
                                                if (fieldErrors.area) setFieldErrors((p) => ({ ...p, area: undefined }));
                                            }}
                                            error={fieldErrors.area}
                                        />

                                        <PickerField
                                            label="Tipo de Incidencia"
                                            placeholder={areaId ? "Selecciona el tipo" : "Primero selecciona un área"}
                                            value={typeId}
                                            options={filteredTypes}
                                            onSelect={(id) => {
                                                setTypeId(id);
                                                if (fieldErrors.type) setFieldErrors((p) => ({ ...p, type: undefined }));
                                            }}
                                            error={fieldErrors.type}
                                            disabled={!areaId}
                                        />
                                    </>
                                )}

                                {/* ── Costo ── */}
                                <View style={styles.costRow}>
                                    <Ionicons name="cash-outline" size={16} color="rgba(255,255,255,0.35)" />
                                    <Text style={styles.costLabel}>Costo inicial:</Text>
                                    <Text style={styles.costValue}>$0.00</Text>
                                </View>

                                {/* ── Botón ── */}
                                {uploadingImage ? (
                                    <View style={styles.uploadingRow}>
                                        <ActivityIndicator size="small" color={Colors.primary.light} />
                                        <Text style={styles.uploadingText}>Subiendo imagen...</Text>
                                    </View>
                                ) : (
                                    <PrimaryButton
                                        label="Enviar reporte"
                                        onPress={handleSubmitPress}
                                        isLoading={isLoading}
                                        disabled={isLoading || catalogsLoading}
                                        variant="light"
                                    />
                                )}
                            </View>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </KeyboardAvoidingView>

            {/* MODAL CONFIRMACIÓN */}
            <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
                <View style={modalStyles.overlay}>
                    <View style={modalStyles.sheet}>
                        <View style={modalStyles.iconCircle}>
                            <Ionicons name="help-circle-outline" size={36} color={Colors.status.warning} />
                        </View>
                        <Text style={modalStyles.title}>¿Confirmar reporte?</Text>
                        <Text style={modalStyles.body}>
                            Asegúrate de que los datos sean correctos. Si son incorrectos, la solución puede tardar más.
                        </Text>
                        <View style={modalStyles.actions}>
                            <TouchableOpacity
                                style={[modalStyles.btn, modalStyles.btnCancel]}
                                onPress={() => setShowConfirm(false)}
                            >
                                <Text style={modalStyles.btnCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[modalStyles.btn, modalStyles.btnConfirm]}
                                onPress={handleConfirm}
                            >
                                <Text style={modalStyles.btnConfirmText}>Aceptar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* MODAL ÉXITO */}
            <Modal visible={showSuccess} transparent animationType="fade" onRequestClose={() => setShowSuccess(false)}>
                <View style={modalStyles.overlay}>
                    <View style={modalStyles.sheet}>
                        <View style={[modalStyles.iconCircle, { borderColor: "rgba(5,150,105,0.35)", backgroundColor: "rgba(5,150,105,0.14)" }]}>
                            <Ionicons name="checkmark-circle-outline" size={36} color={Colors.status.success} />
                        </View>
                        <Text style={modalStyles.title}>¡Reporte enviado!</Text>
                        <Text style={modalStyles.body}>
                            La incidencia fue reportada con éxito. El equipo de administración la revisará pronto.
                        </Text>
                        <TouchableOpacity
                            style={[modalStyles.btn, modalStyles.btnConfirm, { width: "100%" }]}
                            onPress={() => { setShowSuccess(false); router.replace("/(tabs)" as any); }}
                        >
                            <Text style={modalStyles.btnConfirmText}>Ver incidencias</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const pickerStyles = StyleSheet.create({
    container: { marginBottom: 18 },
    label: {
        fontFamily: "Outfit_700Bold", fontSize: 11,
        color: "rgba(255,255,255,0.65)", letterSpacing: 1.2,
        textTransform: "uppercase", marginBottom: 8,
    },
    trigger: {
        flexDirection: "row", alignItems: "center", height: 54,
        borderRadius: 14, paddingHorizontal: 16,
        borderWidth: 1.5, borderColor: "rgba(255,255,255,0.18)",
        backgroundColor: "rgba(255,255,255,0.07)",
    },
    triggerError: { borderColor: "#FCA5A5" },
    triggerDisabled: { opacity: 0.45 },
    triggerText: { flex: 1, fontFamily: "Outfit_500Medium", fontSize: 15, color: Colors.white },
    placeholder: { color: "rgba(255,255,255,0.32)" },
    errorRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 },
    errorText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: "#FCA5A5" },
    modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
    modalSheet: {
        backgroundColor: "#0F2470", borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingBottom: 32, maxHeight: "70%",
        borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.10)",
    },
    sheetHandle: {
        width: 36, height: 4, borderRadius: 2,
        backgroundColor: "rgba(255,255,255,0.20)",
        alignSelf: "center", marginTop: 12, marginBottom: 8,
    },
    sheetTitle: {
        fontFamily: "Outfit_700Bold", fontSize: 16, color: Colors.white,
        paddingHorizontal: 20, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)",
    },
    option: {
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 20, paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)",
    },
    optionActive: { backgroundColor: "rgba(59,130,246,0.12)" },
    optionText: { flex: 1, fontFamily: "Outfit_400Regular", fontSize: 14, color: "rgba(255,255,255,0.65)" },
    optionTextActive: { fontFamily: "Outfit_600SemiBold", color: Colors.white },
    cancelBtn: {
        marginHorizontal: 20, marginTop: 12, paddingVertical: 14,
        borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center",
    },
    cancelText: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: "rgba(255,255,255,0.55)" },
});

const modalStyles = StyleSheet.create({
    overlay: {
        flex: 1, backgroundColor: "rgba(0,0,0,0.65)",
        justifyContent: "center", alignItems: "center", paddingHorizontal: 24,
    },
    sheet: {
        width: "100%", backgroundColor: "#0F2470", borderRadius: 28, padding: 28,
        alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", gap: 14,
    },
    iconCircle: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: "rgba(217,119,6,0.14)",
        borderWidth: 1.5, borderColor: "rgba(217,119,6,0.35)",
        alignItems: "center", justifyContent: "center",
    },
    title: { fontFamily: "Outfit_800ExtraBold", fontSize: 20, color: Colors.white, textAlign: "center" },
    body: { fontFamily: "Outfit_400Regular", fontSize: 14, color: "rgba(255,255,255,0.60)", textAlign: "center", lineHeight: 22 },
    actions: { flexDirection: "row", gap: 12, width: "100%", marginTop: 4 },
    btn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
    btnCancel: { backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
    btnConfirm: { backgroundColor: Colors.primary.light },
    btnCancelText: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: "rgba(255,255,255,0.55)" },
    btnConfirmText: { fontFamily: "Outfit_700Bold", fontSize: 14, color: Colors.white },
});

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#0C1F5C" },
    blobTR: {
        position: "absolute", top: -60, right: -70,
        width: 220, height: 220, borderRadius: 110,
        backgroundColor: "rgba(59,130,246,0.12)",
    },
    scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, gap: 20 },
    pageHeader: { gap: 4 },
    pageTitle: { fontFamily: "Outfit_800ExtraBold", fontSize: 26, color: Colors.white },
    pageSubtitle: { fontFamily: "Outfit_400Regular", fontSize: 14, color: "rgba(255,255,255,0.45)" },
    shimmer: { height: 1, backgroundColor: "rgba(255,255,255,0.15)" },
    cardContent: { padding: 20, paddingTop: 24 },

    // Descripción multiline
    fieldWrapper: { marginBottom: 18 },
    fieldLabel: {
        fontFamily: "Outfit_700Bold", fontSize: 11, color: "rgba(255,255,255,0.65)",
        letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8,
    },
    textAreaContainer: {
        flexDirection: "row",
        borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
        borderWidth: 1.5, borderColor: "rgba(255,255,255,0.18)",
        backgroundColor: "rgba(255,255,255,0.07)",
        minHeight: 110,
    },
    textAreaFocused: { borderColor: "rgba(255,255,255,0.85)", backgroundColor: "rgba(255,255,255,0.12)" },
    textAreaError: { borderColor: "#FCA5A5" },
    textAreaIcon: { marginRight: 12, marginTop: 2 },
    textArea: {
        flex: 1,
        fontFamily: "Outfit_400Regular",
        fontSize: 15,
        color: Colors.white,
        textAlignVertical: "top",
        minHeight: 86,
    },
    errorRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 },
    errorText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: "#FCA5A5" },

    // Imagen
    imageSection: { marginBottom: 18 },
    imagePicker: {
        height: 110, borderRadius: 14, borderWidth: 1.5,
        borderColor: "rgba(255,255,255,0.14)", borderStyle: "dashed",
        backgroundColor: "rgba(255,255,255,0.04)",
        alignItems: "center", justifyContent: "center", gap: 6,
    },
    imagePickerText: { fontFamily: "Outfit_500Medium", fontSize: 13, color: "rgba(255,255,255,0.40)" },
    imagePickerHint: { fontFamily: "Outfit_400Regular", fontSize: 11, color: "rgba(255,255,255,0.22)" },
    imagePreviewWrapper: { position: "relative" },
    imagePreview: { width: "100%", height: 180, borderRadius: 14 },
    removeImageBtn: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 12 },

    // Costo
    costRow: {
        flexDirection: "row", alignItems: "center", gap: 8,
        paddingVertical: 12, paddingHorizontal: 16,
        backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 12,
        marginBottom: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    },
    costLabel: { fontFamily: "Outfit_400Regular", fontSize: 13, color: "rgba(255,255,255,0.40)", flex: 1 },
    costValue: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: "rgba(255,255,255,0.60)" },

    // Loading catálogos
    loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 20 },
    loadingText: { fontFamily: "Outfit_400Regular", fontSize: 13, color: "rgba(255,255,255,0.40)" },

    // Uploading
    uploadingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
    uploadingText: { fontFamily: "Outfit_500Medium", fontSize: 14, color: Colors.primary.light },
});