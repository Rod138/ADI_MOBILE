import PrimaryButton from "@/components/PrimaryButton";
import { Colors } from "@/constants/colors";
import { useSession } from "@/context/AuthContext";
import { MONTH_ORDER, MONTHS, useRecipes, type Recipe } from "@/hooks/useRecipes";
import { uploadImage } from "@/lib/cloudinary";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getValidationStyle(validated: boolean | null) {
    if (validated === true)
        return { color: Colors.status.success, bg: Colors.status.successBg, border: Colors.status.successBorder, icon: "checkmark-circle" as const, label: "Validado" };
    if (validated === false)
        return { color: Colors.status.error, bg: Colors.status.errorBg, border: Colors.status.errorBorder, icon: "close-circle" as const, label: "Rechazado" };
    return { color: Colors.status.warning, bg: Colors.status.warningBg, border: Colors.status.warningBorder, icon: "time" as const, label: "Pendiente" };
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

// ── Receipt Card ──────────────────────────────────────────────────────────────

function ReceiptCard({
    item,
    isAdmin,
    onValidate,
    onDelete,
    onViewImage,
}: {
    item: Recipe;
    isAdmin: boolean;
    onValidate?: (id: number, val: boolean) => void;
    onDelete?: (id: number) => void;
    onViewImage: (url: string) => void;
}) {
    const vs = getValidationStyle(item.validated ?? null);

    return (
        <View style={card.root}>
            <View style={[card.accentBar, { backgroundColor: vs.color }]} />
            <View style={card.inner}>
                {/* Header */}
                <View style={card.header}>
                    <View style={[card.monthBadge, { backgroundColor: vs.bg, borderColor: vs.border }]}>
                        <Ionicons name="calendar" size={14} color={vs.color} />
                        <Text style={[card.monthText, { color: vs.color }]}>
                            {item.month} {item.year}
                        </Text>
                    </View>
                    <View style={[card.statusBadge, { backgroundColor: vs.bg, borderColor: vs.border }]}>
                        <Ionicons name={vs.icon} size={12} color={vs.color} />
                        <Text style={[card.statusText, { color: vs.color }]}>{vs.label}</Text>
                    </View>
                </View>

                {/* Image preview */}
                {item.img ? (
                    <TouchableOpacity activeOpacity={0.85} onPress={() => onViewImage(item.img!)}>
                        <Image source={{ uri: item.img }} style={card.img} resizeMode="cover" />
                        <View style={card.imgOverlay}>
                            <Ionicons name="expand-outline" size={18} color="#fff" />
                            <Text style={card.imgOverlayText}>Ver comprobante</Text>
                        </View>
                    </TouchableOpacity>
                ) : (
                    <View style={card.noImg}>
                        <Ionicons name="document-outline" size={20} color={Colors.screen.textMuted} />
                        <Text style={card.noImgText}>Sin imagen adjunta</Text>
                    </View>
                )}

                {/* Admin actions */}
                {isAdmin && item.validated === null && (
                    <View style={card.adminActions}>
                        <TouchableOpacity
                            style={[card.actionBtn, card.actionBtnApprove]}
                            onPress={() => onValidate?.(item.id, true)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="checkmark" size={15} color={Colors.status.success} />
                            <Text style={[card.actionBtnText, { color: Colors.status.success }]}>Aprobar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[card.actionBtn, card.actionBtnReject]}
                            onPress={() => onValidate?.(item.id, false)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="close" size={15} color={Colors.status.error} />
                            <Text style={[card.actionBtnText, { color: Colors.status.error }]}>Rechazar</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Delete (owner or admin) */}
                {onDelete && item.validated !== true && (
                    <TouchableOpacity style={card.deleteBtn} onPress={() => onDelete(item.id)} activeOpacity={0.7}>
                        <Ionicons name="trash-outline" size={13} color={Colors.screen.textMuted} />
                        <Text style={card.deleteBtnText}>Eliminar</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

// ── Month Picker ──────────────────────────────────────────────────────────────

function MonthPicker({ value, year, onSelectMonth, onSelectYear, error }: {
    value: string;
    year: number;
    onSelectMonth: (m: string) => void;
    onSelectYear: (y: number) => void;
    error?: string;
}) {
    const [open, setOpen] = useState(false);

    return (
        <View style={mp.container}>
            <Text style={mp.label}>MES Y AÑO</Text>
            <TouchableOpacity
                style={[mp.trigger, error && mp.triggerError]}
                onPress={() => setOpen(true)}
                activeOpacity={0.8}
            >
                <Ionicons name="calendar-outline" size={17} color={Colors.screen.iconMuted} style={{ marginRight: 10 }} />
                <Text style={[mp.triggerText, !value && mp.placeholder]}>
                    {value ? `${value} ${year}` : "Selecciona mes y año"}
                </Text>
                <Ionicons name="chevron-down" size={15} color={Colors.screen.iconMuted} />
            </TouchableOpacity>
            {error && (
                <View style={mp.errorRow}>
                    <Ionicons name="alert-circle-outline" size={12} color={Colors.status.error} />
                    <Text style={mp.errorText}>{error}</Text>
                </View>
            )}
            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <View style={mp.overlay}>
                    <View style={mp.sheet}>
                        <View style={mp.handle} />
                        <Text style={mp.sheetTitle}>Selecciona período</Text>

                        {/* Year selector */}
                        <View style={mp.yearRow}>
                            {YEARS.map(y => (
                                <TouchableOpacity
                                    key={y}
                                    style={[mp.yearBtn, year === y && mp.yearBtnActive]}
                                    onPress={() => onSelectYear(y)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[mp.yearBtnText, year === y && mp.yearBtnTextActive]}>{y}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Month grid */}
                        <View style={mp.monthGrid}>
                            {MONTHS.map(m => (
                                <TouchableOpacity
                                    key={m.value}
                                    style={[mp.monthBtn, value === m.value && mp.monthBtnActive]}
                                    onPress={() => { onSelectMonth(m.value); setOpen(false); }}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[mp.monthBtnText, value === m.value && mp.monthBtnTextActive]}>
                                        {m.label.slice(0, 3)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity style={mp.cancelBtn} onPress={() => setOpen(false)}>
                            <Text style={mp.cancelText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ── Image Viewer Modal ────────────────────────────────────────────────────────

function ImageViewer({ uri, onClose }: { uri: string; onClose: () => void }) {
    return (
        <Modal visible animationType="fade" transparent onRequestClose={onClose}>
            <View style={viewer.overlay}>
                <TouchableOpacity style={viewer.closeBtn} onPress={onClose} activeOpacity={0.8}>
                    <Ionicons name="close" size={22} color="#fff" />
                </TouchableOpacity>
                <Image source={{ uri }} style={viewer.img} resizeMode="contain" />
            </View>
        </Modal>
    );
}

// ── Upload Form ───────────────────────────────────────────────────────────────

function UploadForm({
    userId,
    existingMonths,
    onSuccess,
}: {
    userId: number;
    existingMonths: Set<string>;
    onSuccess: () => void;
}) {
    const { createRecipe, isLoading } = useRecipes();
    const [month, setMonth] = useState("");
    const [year, setYear] = useState(CURRENT_YEAR);
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [errors, setErrors] = useState<{ month?: string; image?: string }>({});

    const pickImage = async () => {
        const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!p.granted) { Alert.alert("Permiso requerido", "Necesitamos acceso a tu galería."); return; }
        const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [3, 4], quality: 0.85 });
        if (!r.canceled && r.assets[0]) setImageUri(r.assets[0].uri);
    };

    const takePhoto = async () => {
        const p = await ImagePicker.requestCameraPermissionsAsync();
        if (!p.granted) { Alert.alert("Permiso requerido", "Necesitamos acceso a tu cámara."); return; }
        const r = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [3, 4], quality: 0.85 });
        if (!r.canceled && r.assets[0]) setImageUri(r.assets[0].uri);
    };

    const showImageOptions = () => Alert.alert("Adjuntar comprobante", "¿Cómo deseas agregar la imagen?", [
        { text: "Cámara", onPress: takePhoto },
        { text: "Galería", onPress: pickImage },
        { text: "Cancelar", style: "cancel" },
    ]);

    const validate = () => {
        const e: typeof errors = {};
        if (!month) e.month = "Selecciona el mes de la cuota.";
        else if (existingMonths.has(`${month}-${year}`)) e.month = "Ya existe un comprobante para ese mes y año.";
        if (!imageUri) e.image = "Adjunta la imagen del comprobante.";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setUploading(true);
        let imageUrl: string | null = null;
        try {
            imageUrl = (await uploadImage(imageUri!, "comprobantes")).url;
        } catch {
            Alert.alert("Error", "No se pudo subir la imagen. Intenta de nuevo.");
            setUploading(false);
            return;
        } finally {
            setUploading(false);
        }

        const ok = await createRecipe({ year, month, img: imageUrl, usr_id: userId, validated: false });
        if (ok) {
            setMonth(""); setImageUri(null); setErrors({});
            onSuccess();
        } else {
            Alert.alert("Error", "No se pudo guardar el comprobante.");
        }
    };

    return (
        <View style={form.root}>
            <View style={form.header}>
                <View style={form.headerIcon}>
                    <Ionicons name="cloud-upload-outline" size={20} color={Colors.primary.main} />
                </View>
                <View>
                    <Text style={form.headerTitle}>Subir comprobante</Text>
                    <Text style={form.headerSubtitle}>Cuota mensual de mantenimiento</Text>
                </View>
            </View>

            <MonthPicker
                value={month}
                year={year}
                onSelectMonth={(m) => { setMonth(m); setErrors(p => ({ ...p, month: undefined })); }}
                onSelectYear={setYear}
                error={errors.month}
            />

            {/* Image picker */}
            <View style={form.field}>
                <Text style={form.fieldLabel}>COMPROBANTE</Text>
                {imageUri ? (
                    <View>
                        <Image source={{ uri: imageUri }} style={form.imgPreview} resizeMode="cover" />
                        <View style={form.imgActions}>
                            <TouchableOpacity style={form.imgBtn} onPress={showImageOptions}>
                                <Ionicons name="camera-outline" size={14} color={Colors.primary.main} />
                                <Text style={form.imgBtnText}>Cambiar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[form.imgBtn, form.imgBtnDanger]} onPress={() => setImageUri(null)}>
                                <Ionicons name="trash-outline" size={14} color={Colors.status.error} />
                                <Text style={[form.imgBtnText, { color: Colors.status.error }]}>Quitar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity style={[form.imgPicker, errors.image && form.imgPickerError]} onPress={showImageOptions} activeOpacity={0.8}>
                        <Ionicons name="receipt-outline" size={30} color={errors.image ? Colors.status.error : Colors.screen.iconMuted} />
                        <Text style={[form.imgPickerText, errors.image && { color: Colors.status.error }]}>Toca para adjuntar el comprobante</Text>
                        <Text style={form.imgPickerHint}>Foto del recibo o transferencia</Text>
                    </TouchableOpacity>
                )}
                {errors.image && (
                    <View style={form.errorRow}>
                        <Ionicons name="alert-circle-outline" size={12} color={Colors.status.error} />
                        <Text style={form.errorText}>{errors.image}</Text>
                    </View>
                )}
            </View>

            {uploading || isLoading ? (
                <View style={form.loadingRow}>
                    <ActivityIndicator size="small" color={Colors.primary.light} />
                    <Text style={form.loadingText}>{uploading ? "Subiendo imagen..." : "Guardando..."}</Text>
                </View>
            ) : (
                <PrimaryButton label="Enviar comprobante" onPress={handleSubmit} disabled={isLoading || uploading} />
            )}
        </View>
    );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function RecipesScreen() {
    const { user } = useSession();
    const { recipes, isLoading, error, fetchMyRecipes, validateRecipe, deleteRecipe } = useRecipes();
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const formHeight = useRef(new Animated.Value(0)).current;

    // Admins (rol 3 y 4) y Tesoreros (rol 2) ven todos
    const isAdmin = (user?.rol_id ?? 0) >= 2;

    useEffect(() => {
        if (user) fetchMyRecipes(user.id);
    }, [user]);

    const toggleForm = () => {
        if (showForm) {
            Animated.timing(formHeight, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => setShowForm(false));
        } else {
            setShowForm(true);
            Animated.timing(formHeight, { toValue: 1, duration: 300, useNativeDriver: false }).start();
        }
    };

    const handleSuccess = () => {
        if (user) fetchMyRecipes(user.id);
        toggleForm();
        Alert.alert("¡Listo!", "Comprobante enviado correctamente. El administrador lo revisará pronto.");
    };

    const handleDelete = (id: number) => {
        Alert.alert("Eliminar comprobante", "¿Estás seguro de que deseas eliminar este comprobante?", [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Eliminar", style: "destructive",
                onPress: async () => {
                    await deleteRecipe(id);
                    if (user) fetchMyRecipes(user.id);
                }
            },
        ]);
    };

    const handleValidate = async (id: number, val: boolean) => {
        await validateRecipe(id, val);
        if (user) fetchMyRecipes(user.id);
    };

    // Meses que ya tienen comprobante (para evitar duplicados)
    const existingMonths = new Set(recipes.map(r => `${r.month}-${r.year}`));

    // Ordenar por año desc, luego por mes desc
    const sorted = [...recipes].sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return (MONTH_ORDER[b.month] ?? 0) - (MONTH_ORDER[a.month] ?? 0);
    });

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.screen.bg} />
            <SafeAreaView style={{ flex: 1 }}>

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={() => router.push("/(finance)" as any)}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="chevron-back" size={18} color={Colors.screen.textSecondary} />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.headerTitle}>Mis cuotas</Text>
                            <Text style={styles.headerSubtitle}>Comprobantes de pago</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[styles.uploadBtn, showForm && styles.uploadBtnActive]}
                        onPress={toggleForm}
                        activeOpacity={0.8}
                    >
                        <Ionicons name={showForm ? "close" : "add"} size={18} color={showForm ? Colors.status.error : Colors.primary.dark} />
                        <Text style={[styles.uploadBtnText, showForm && { color: Colors.status.error }]}>
                            {showForm ? "Cancelar" : "Subir"}
                        </Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Upload Form (collapsible) */}
                    {showForm && (
                        <Animated.View style={{ opacity: formHeight }}>
                            <UploadForm
                                userId={user!.id}
                                existingMonths={existingMonths}
                                onSuccess={handleSuccess}
                            />
                        </Animated.View>
                    )}

                    {/* List */}
                    {isLoading ? (
                        <View style={styles.centered}>
                            <ActivityIndicator size="large" color={Colors.primary.main} />
                            <Text style={styles.emptyText}>Cargando comprobantes...</Text>
                        </View>
                    ) : error ? (
                        <View style={styles.centered}>
                            <Ionicons name="cloud-offline-outline" size={40} color={Colors.screen.textMuted} />
                            <Text style={styles.emptyText}>{error}</Text>
                        </View>
                    ) : sorted.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <View style={styles.emptyIcon}>
                                <Ionicons name="receipt-outline" size={32} color={Colors.screen.textMuted} />
                            </View>
                            <Text style={styles.emptyTitle}>Sin comprobantes</Text>
                            <Text style={styles.emptyText}>
                                No has subido ningún comprobante.{"\n"}
                                Toca "Subir" para agregar uno.
                            </Text>
                        </View>
                    ) : (
                        sorted.map(item => (
                            <ReceiptCard
                                key={item.id}
                                item={item}
                                isAdmin={isAdmin}
                                onValidate={handleValidate}
                                onDelete={handleDelete}
                                onViewImage={setViewingImage}
                            />
                        ))
                    )}
                </ScrollView>
            </SafeAreaView>

            {/* Image viewer */}
            {viewingImage && (
                <ImageViewer uri={viewingImage} onClose={() => setViewingImage(null)} />
            )}
        </View>
    );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const card = StyleSheet.create({
    root: {
        backgroundColor: Colors.screen.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.screen.border,
        overflow: "hidden",
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    accentBar: { height: 3, width: "100%" },
    inner: { padding: 14, gap: 10 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    monthBadge: {
        flexDirection: "row", alignItems: "center", gap: 5,
        paddingHorizontal: 10, paddingVertical: 5,
        borderRadius: 10, borderWidth: 1,
    },
    monthText: { fontFamily: "Outfit_700Bold", fontSize: 14 },
    statusBadge: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: 20, borderWidth: 1,
    },
    statusText: { fontFamily: "Outfit_600SemiBold", fontSize: 11 },
    img: { width: "100%", height: 180, borderRadius: 10, marginTop: 4 },
    imgOverlay: {
        position: "absolute", bottom: 4, right: 0, left: 0,
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 6, paddingVertical: 8,
        backgroundColor: "rgba(0,0,0,0.35)",
        borderBottomLeftRadius: 10, borderBottomRightRadius: 10,
    },
    imgOverlayText: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: "#fff" },
    noImg: {
        height: 60, borderRadius: 10, borderWidth: 1.5,
        borderColor: Colors.screen.border, borderStyle: "dashed",
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    },
    noImgText: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.screen.textMuted },
    adminActions: { flexDirection: "row", gap: 8 },
    actionBtn: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
        paddingVertical: 10, borderRadius: 10, borderWidth: 1,
    },
    actionBtnApprove: { backgroundColor: Colors.status.successBg, borderColor: Colors.status.successBorder },
    actionBtnReject: { backgroundColor: Colors.status.errorBg, borderColor: Colors.status.errorBorder },
    actionBtnText: { fontFamily: "Outfit_600SemiBold", fontSize: 13 },
    deleteBtn: {
        flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-end",
        paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: 8, borderWidth: 1, borderColor: Colors.screen.border,
    },
    deleteBtnText: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted },
});

const form = StyleSheet.create({
    root: {
        backgroundColor: Colors.screen.card, borderRadius: 16,
        borderWidth: 1, borderColor: Colors.screen.border, padding: 18,
        marginBottom: 4,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
    headerIcon: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: Colors.primary.soft, borderWidth: 1, borderColor: Colors.primary.muted,
        alignItems: "center", justifyContent: "center",
    },
    headerTitle: { fontFamily: "Outfit_700Bold", fontSize: 15, color: Colors.screen.textPrimary },
    headerSubtitle: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted, marginTop: 1 },
    field: { marginBottom: 18 },
    fieldLabel: {
        fontFamily: "Outfit_700Bold", fontSize: 11,
        color: Colors.screen.textSecondary, letterSpacing: 1.2,
        textTransform: "uppercase", marginBottom: 8,
    },
    imgPicker: {
        height: 110, borderRadius: 12, borderWidth: 1.5,
        borderColor: Colors.screen.border, borderStyle: "dashed",
        backgroundColor: Colors.screen.bg,
        alignItems: "center", justifyContent: "center", gap: 6,
    },
    imgPickerError: { borderColor: Colors.status.error },
    imgPickerText: { fontFamily: "Outfit_500Medium", fontSize: 13, color: Colors.screen.textSecondary },
    imgPickerHint: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted },
    imgPreview: { width: "100%", height: 180, borderRadius: 12, marginBottom: 10 },
    imgActions: { flexDirection: "row", gap: 8 },
    imgBtn: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
        paddingVertical: 9, borderRadius: 10,
        backgroundColor: Colors.screen.chipBlue, borderWidth: 1, borderColor: Colors.screen.border,
    },
    imgBtnDanger: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
    imgBtnText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.primary.main },
    loadingRow: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 10, paddingVertical: 16,
    },
    loadingText: { fontFamily: "Outfit_500Medium", fontSize: 14, color: Colors.primary.main },
    errorRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 },
    errorText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.status.error },
});

const mp = StyleSheet.create({
    container: { marginBottom: 18 },
    label: {
        fontFamily: "Outfit_700Bold", fontSize: 11,
        color: Colors.screen.textSecondary, letterSpacing: 1.2,
        textTransform: "uppercase", marginBottom: 8,
    },
    trigger: {
        flexDirection: "row", alignItems: "center", height: 52,
        borderRadius: 12, paddingHorizontal: 14,
        borderWidth: 1.5, borderColor: Colors.screen.border,
        backgroundColor: Colors.screen.card,
    },
    triggerError: { borderColor: Colors.status.error },
    triggerText: { flex: 1, fontFamily: "Outfit_400Regular", fontSize: 15, color: Colors.screen.textPrimary },
    placeholder: { color: Colors.screen.textMuted },
    errorRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 },
    errorText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.status.error },
    overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
    sheet: {
        backgroundColor: Colors.screen.card,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingBottom: 32, paddingHorizontal: 20,
        borderTopWidth: 1, borderTopColor: Colors.screen.border,
    },
    handle: {
        width: 36, height: 4, borderRadius: 2,
        backgroundColor: Colors.screen.border, alignSelf: "center",
        marginTop: 12, marginBottom: 16,
    },
    sheetTitle: {
        fontFamily: "Outfit_700Bold", fontSize: 16,
        color: Colors.screen.textPrimary, marginBottom: 16,
    },
    yearRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
    yearBtn: {
        flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center",
        backgroundColor: Colors.screen.bg, borderWidth: 1, borderColor: Colors.screen.border,
    },
    yearBtnActive: { backgroundColor: Colors.primary.main, borderColor: Colors.primary.main },
    yearBtnText: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.screen.textSecondary },
    yearBtnTextActive: { color: "#fff" },
    monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
    monthBtn: {
        width: "22%", paddingVertical: 12, alignItems: "center", borderRadius: 10,
        backgroundColor: Colors.screen.bg, borderWidth: 1, borderColor: Colors.screen.border,
    },
    monthBtnActive: { backgroundColor: Colors.primary.main, borderColor: Colors.primary.main },
    monthBtnText: { fontFamily: "Outfit_500Medium", fontSize: 13, color: Colors.screen.textSecondary },
    monthBtnTextActive: { fontFamily: "Outfit_700Bold", color: "#fff" },
    cancelBtn: {
        paddingVertical: 13, borderRadius: 12, alignItems: "center",
        backgroundColor: Colors.screen.bg, borderWidth: 1, borderColor: Colors.screen.border,
    },
    cancelText: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.screen.textSecondary },
});

const viewer = StyleSheet.create({
    overlay: {
        flex: 1, backgroundColor: "rgba(0,0,0,0.92)",
        alignItems: "center", justifyContent: "center",
    },
    closeBtn: {
        position: "absolute", top: 52, right: 20, zIndex: 10,
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.12)",
        alignItems: "center", justifyContent: "center",
    },
    img: { width: "92%", height: "75%" },
});

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.screen.bg },

    header: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: Colors.screen.card,
        borderBottomWidth: 1, borderBottomColor: Colors.screen.border,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    backBtn: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: Colors.neutral[100], borderWidth: 1, borderColor: Colors.screen.border,
        alignItems: "center", justifyContent: "center",
    },
    headerTitle: { fontFamily: "Outfit_700Bold", fontSize: 17, color: Colors.screen.textPrimary },
    headerSubtitle: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted },
    uploadBtn: {
        flexDirection: "row", alignItems: "center", gap: 5,
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
        backgroundColor: Colors.primary.soft, borderWidth: 1, borderColor: Colors.primary.muted,
    },
    uploadBtnActive: { backgroundColor: Colors.status.errorBg, borderColor: Colors.status.errorBorder },
    uploadBtnText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.primary.dark },

    scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, gap: 12 },

    centered: { paddingVertical: 40, alignItems: "center", gap: 12 },
    emptyCard: {
        backgroundColor: Colors.screen.card, borderRadius: 16,
        borderWidth: 1, borderColor: Colors.screen.border,
        padding: 32, alignItems: "center", gap: 10,
    },
    emptyIcon: {
        width: 64, height: 64, borderRadius: 20,
        backgroundColor: Colors.neutral[100], alignItems: "center", justifyContent: "center",
    },
    emptyTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 16, color: Colors.screen.textSecondary },
    emptyText: {
        fontFamily: "Outfit_400Regular", fontSize: 13,
        color: Colors.screen.textMuted, textAlign: "center", lineHeight: 20,
    },
});