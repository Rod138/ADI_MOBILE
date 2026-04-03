import PrimaryButton from "@/components/PrimaryButton";
import { SectionCard } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { useSession } from "@/context/AuthContext";
import { useCatalogs, useIncidents } from "@/hooks/useIncidents";
import { notifyNewIncident } from "@/hooks/useNotificationSender";
import { uploadImage } from "@/lib/cloudinary";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator, Alert, Image, Modal, ScrollView,
    StatusBar, StyleSheet, Text, TextInput,
    TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ── PickerField ──────────────────────────────────────────────────────────────
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

// ── Pantalla principal ───────────────────────────────────────────────────────
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
    const [fieldErrors, setFieldErrors] = useState<{ description?: string; area?: string; type?: string }>({});

    const filteredTypes = areaId ? types.filter((t) => t.area_id === null || t.area_id === areaId) : types;

    useEffect(() => {
        if (typeId && areaId && !filteredTypes.find((t) => t.id === typeId)) setTypeId(undefined);
    }, [areaId]);

    const validate = () => {
        const e: typeof fieldErrors = {};
        if (!description.trim()) e.description = "La descripción es obligatoria.";
        else if (description.trim().length < 10) e.description = "Mínimo 10 caracteres.";
        if (!areaId) e.area = "Selecciona un área.";
        if (!typeId) e.type = "Selecciona el tipo de incidencia.";
        setFieldErrors(e);
        return Object.keys(e).length === 0;
    };

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
    const showImageOptions = () => Alert.alert("Adjuntar imagen", "¿Cómo deseas agregar la imagen?", [
        { text: "Cámara", onPress: takePhoto },
        { text: "Galería", onPress: pickImage },
        { text: "Cancelar", style: "cancel" },
    ]);

    const handleConfirm = async () => {
        setShowConfirm(false);
        let imageUrl: string | null = null;
        if (imageUri) {
            setUploadingImage(true);
            try { imageUrl = (await uploadImage(imageUri, "incidencias")).url; }
            catch { Alert.alert("Error", "No se pudo subir la imagen. Se creará sin imagen."); }
            finally { setUploadingImage(false); }
        }
        const ok = await createIncident({
            description: description.trim(), image: imageUrl,
            usr_id: user!.id, area_id: areaId!, type_id: typeId!,
            status_id: statuses[0]?.id ?? 1, cost: 0,
        });
        if (ok) {
            const areaName = areas.find(a => a.id === areaId)?.name;
            const reporterName = `${user!.name} ${user!.ap}`.trim();
            notifyNewIncident({
                reporterName,
                area: areaName,
                description: description.trim(),
            }).catch(() => { });
            setShowSuccess(true);
            setDescription(""); setAreaId(undefined); setTypeId(undefined);
            setImageUri(null); setFieldErrors({});
        } else {
            Alert.alert("Error al crear", "No se pudo guardar la incidencia.");
        }
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" backgroundColor="#0C1F5C" />
            <SafeAreaView style={styles.safe}>
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.pageHeader}>
                        <Text style={styles.pageTitle}>Crear Incidencia</Text>
                        <Text style={styles.pageSubtitle}>Reporta un problema en la torre</Text>
                    </View>

                    <SectionCard theme="light" padding={20} paddingTop={20}>
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
                                    placeholder="Describe detalladamente el problema..."
                                    placeholderTextColor={Colors.screen.textMuted}
                                    multiline numberOfLines={4} textAlignVertical="top"
                                    value={description}
                                    onChangeText={(t) => { setDescription(t); if (fieldErrors.description) setFieldErrors(p => ({ ...p, description: undefined })); }}
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
                            {imageUri ? (
                                <View>
                                    <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
                                    <TouchableOpacity style={styles.removeImage} onPress={() => setImageUri(null)}>
                                        <Ionicons name="close-circle" size={24} color={Colors.status.error} />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity style={styles.imagePicker} onPress={showImageOptions} activeOpacity={0.8}>
                                    <Ionicons name="camera-outline" size={26} color={Colors.screen.iconMuted} />
                                    <Text style={styles.imagePickerText}>Toca para adjuntar una foto</Text>
                                    <Text style={styles.imagePickerHint}>Opcional</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Catálogos */}
                        {catalogsLoading ? (
                            <View style={styles.loadingRow}>
                                <ActivityIndicator size="small" color={Colors.screen.textMuted} />
                                <Text style={styles.loadingText}>Cargando catálogos...</Text>
                            </View>
                        ) : (
                            <>
                                <PickerField
                                    label="Área" placeholder="Selecciona el área"
                                    value={areaId} options={areas}
                                    onSelect={(id) => { setAreaId(id); if (fieldErrors.area) setFieldErrors(p => ({ ...p, area: undefined })); }}
                                    error={fieldErrors.area}
                                />
                                <PickerField
                                    label="Tipo de Incidencia"
                                    placeholder={areaId ? "Selecciona el tipo" : "Primero selecciona un área"}
                                    value={typeId} options={filteredTypes}
                                    onSelect={(id) => { setTypeId(id); if (fieldErrors.type) setFieldErrors(p => ({ ...p, type: undefined })); }}
                                    error={fieldErrors.type} disabled={!areaId}
                                />
                            </>
                        )}

                        {/* Costo */}
                        <View style={styles.costRow}>
                            <Ionicons name="cash-outline" size={15} color={Colors.screen.iconMuted} />
                            <Text style={styles.costLabel}>Costo inicial:</Text>
                            <Text style={styles.costValue}>$0.00</Text>
                        </View>

                        {uploadingImage ? (
                            <View style={styles.uploadingRow}>
                                <ActivityIndicator size="small" color={Colors.primary.light} />
                                <Text style={styles.uploadingText}>Subiendo imagen...</Text>
                            </View>
                        ) : (
                            <PrimaryButton
                                label="Enviar reporte"
                                onPress={() => { if (validate()) setShowConfirm(true); }}
                                isLoading={isLoading}
                                disabled={isLoading || catalogsLoading}
                            />
                        )}
                    </SectionCard>
                </ScrollView>
            </SafeAreaView>

            {/* Modal confirmación */}
            <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
                <View style={modal.overlay}>
                    <View style={modal.sheet}>
                        <View style={[modal.icon, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }]}>
                            <Ionicons name="help-circle-outline" size={32} color={Colors.status.warning} />
                        </View>
                        <Text style={modal.title}>¿Confirmar reporte?</Text>
                        <Text style={modal.body}>Asegúrate de que los datos sean correctos. Si son incorrectos, la solución puede tardar más.</Text>
                        <View style={modal.actions}>
                            <TouchableOpacity style={[modal.btn, modal.btnCancel]} onPress={() => setShowConfirm(false)}>
                                <Text style={modal.btnCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[modal.btn, modal.btnConfirm]} onPress={handleConfirm}>
                                <Text style={modal.btnConfirmText}>Aceptar</Text>
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
                            <Ionicons name="checkmark-circle-outline" size={32} color={Colors.status.success} />
                        </View>
                        <Text style={modal.title}>¡Reporte enviado!</Text>
                        <Text style={modal.body}>La incidencia fue reportada con éxito. El equipo de administración la revisará pronto.</Text>
                        <TouchableOpacity
                            style={[modal.btn, modal.btnConfirm, { width: "100%" }]}
                            onPress={() => { setShowSuccess(false); router.replace("/(tabs)/home" as any); }}
                        >
                            <Text style={modal.btnConfirmText}>Ver incidencias</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const pick = StyleSheet.create({
    container: { marginBottom: 18 },
    label: { fontFamily: "Outfit_700Bold", fontSize: 11, color: Colors.screen.textSecondary, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 },
    trigger: {
        flexDirection: "row", alignItems: "center", height: 52, borderRadius: 12,
        paddingHorizontal: 14, borderWidth: 1.5, borderColor: Colors.screen.border,
        backgroundColor: Colors.screen.card,
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
        padding: 28, alignItems: "center",
        borderWidth: 1, borderColor: Colors.screen.border, gap: 14,
        shadowColor: "#1E2D4A", shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12, shadowRadius: 24, elevation: 12,
    },
    icon: { width: 68, height: 68, borderRadius: 34, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
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
    root: { flex: 1, backgroundColor: Colors.screen.bg },
    safe: { flex: 1 },
    scroll: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 32, gap: 18 },
    pageHeader: { gap: 3 },
    pageTitle: { fontFamily: "Outfit_800ExtraBold", fontSize: 24, color: Colors.screen.textPrimary },
    pageSubtitle: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.screen.textSecondary },
    field: { marginBottom: 18 },
    fieldLabel: { fontFamily: "Outfit_700Bold", fontSize: 11, color: Colors.screen.textSecondary, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 },
    textArea: {
        flexDirection: "row", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
        borderWidth: 1.5, borderColor: Colors.screen.border, backgroundColor: Colors.screen.card, minHeight: 110,
    },
    textAreaFocused: { borderColor: Colors.primary.light, backgroundColor: "#F0F6FF" },
    textAreaError: { borderColor: Colors.status.error },
    textInput: { flex: 1, fontFamily: "Outfit_400Regular", fontSize: 15, color: Colors.screen.textPrimary, textAlignVertical: "top", minHeight: 86 },
    errorRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 },
    errorText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.status.error },
    imagePicker: {
        height: 104, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.screen.border,
        borderStyle: "dashed", backgroundColor: Colors.screen.bg,
        alignItems: "center", justifyContent: "center", gap: 6,
    },
    imagePickerText: { fontFamily: "Outfit_500Medium", fontSize: 13, color: Colors.screen.textSecondary },
    imagePickerHint: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted },
    imagePreview: { width: "100%", height: 180, borderRadius: 12 },
    removeImage: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 12 },
    costRow: {
        flexDirection: "row", alignItems: "center", gap: 8,
        paddingVertical: 12, paddingHorizontal: 14,
        backgroundColor: Colors.screen.bg, borderRadius: 10,
        marginBottom: 20, borderWidth: 1, borderColor: Colors.screen.border,
    },
    costLabel: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.screen.textSecondary, flex: 1 },
    costValue: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.screen.textPrimary },
    loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 20 },
    loadingText: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.screen.textMuted },
    uploadingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
    uploadingText: { fontFamily: "Outfit_500Medium", fontSize: 14, color: Colors.primary.light },
});