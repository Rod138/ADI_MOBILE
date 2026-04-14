import InputField from "@/components/InputField";
import PrimaryButton from "@/components/PrimaryButton";
import { Colors } from "@/constants/colors";
import { useSession } from "@/context/AuthContext";
import { useExpenses, type Expense } from "@/hooks/useExpenses";
import { notifyNewExpense } from "@/hooks/useNotificationSender";
import { uploadFile } from "@/lib/cloudinary";
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

function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

function formatCurrency(amount: number) {
    return `$${Number(amount).toLocaleString("es-MX", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

// ── Image Viewer ──────────────────────────────────────────────────────────────

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

// ── Expense Card ──────────────────────────────────────────────────────────────

function ExpenseCard({
    item,
    canManage,
    onDelete,
    onViewImage,
}: {
    item: Expense;
    canManage: boolean;
    onDelete: (id: number) => void;
    onViewImage: (url: string) => void;
}) {
    return (
        <View style={card.root}>
            {/* Barra naranja */}
            <View style={card.accentBar} />

            <View style={card.inner}>
                {/* Header: descripción + monto */}
                <View style={card.header}>
                    <View style={card.iconWrap}>
                        <Ionicons name="receipt-outline" size={18} color={Colors.secondary.main} />
                    </View>
                    <View style={card.headerTexts}>
                        <Text style={card.description} numberOfLines={2}>
                            {item.description}
                        </Text>
                        <Text style={card.date}>{formatDate(item.expense_date)}</Text>
                    </View>
                    <View style={card.amountWrap}>
                        <Text style={card.amountLabel}>MONTO</Text>
                        <Text style={card.amount}>{formatCurrency(item.amount)}</Text>
                    </View>
                </View>

                {/* Imagen de prueba */}
                {item.url_image ? (
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => onViewImage(item.url_image!)}
                    >
                        <Image
                            source={{ uri: item.url_image }}
                            style={card.img}
                            resizeMode="cover"
                        />
                        <View style={card.imgOverlay}>
                            <Ionicons name="expand-outline" size={16} color="#fff" />
                            <Text style={card.imgOverlayText}>Ver comprobante</Text>
                        </View>
                    </TouchableOpacity>
                ) : (
                    <View style={card.noImg}>
                        <Ionicons name="image-outline" size={18} color={Colors.screen.textMuted} />
                        <Text style={card.noImgText}>Sin imagen adjunta</Text>
                    </View>
                )}

                {/* Eliminar — solo para admin/tesorero */}
                {canManage && (
                    <TouchableOpacity
                        style={card.deleteBtn}
                        onPress={() => onDelete(item.id)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="trash-outline" size={13} color={Colors.screen.textMuted} />
                        <Text style={card.deleteBtnText}>Eliminar</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

// ── Create Form ───────────────────────────────────────────────────────────────

function CreateForm({ onSuccess }: { onSuccess: () => void }) {
    const { createExpense, isLoading } = useExpenses();

    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [errors, setErrors] = useState<{
        description?: string;
        amount?: string;
        image?: string;
    }>({});

    const pickImage = async () => {
        const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!p.granted) {
            Alert.alert("Permiso requerido", "Necesitamos acceso a tu galería.");
            return;
        }
        const r = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.85,
        });
        if (!r.canceled && r.assets[0]) {
            setImageUri(r.assets[0].uri);
            setErrors(p => ({ ...p, image: undefined }));
        }
    };

    const takePhoto = async () => {
        const p = await ImagePicker.requestCameraPermissionsAsync();
        if (!p.granted) {
            Alert.alert("Permiso requerido", "Necesitamos acceso a tu cámara.");
            return;
        }
        const r = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.85,
        });
        if (!r.canceled && r.assets[0]) {
            setImageUri(r.assets[0].uri);
            setErrors(p => ({ ...p, image: undefined }));
        }
    };

    const showImageOptions = () =>
        Alert.alert("Adjuntar imagen", "¿Cómo deseas agregar la imagen?", [
            { text: "📷 Cámara", onPress: takePhoto },
            { text: "🖼️  Galería", onPress: pickImage },
            { text: "Cancelar", style: "cancel" },
        ]);

    const validate = () => {
        const e: typeof errors = {};

        if (!description.trim())
            e.description = "El asunto del gasto es obligatorio.";
        else if (description.trim().length < 5)
            e.description = "Mínimo 5 caracteres.";
        else if (description.trim().length > 30)
            e.description = "Máximo 30 caracteres.";

        if (!amount.trim()) {
            e.amount = "Introduce el monto del gasto.";
        } else {
            const parsed = parseFloat(amount.replace(/,/g, ""));
            if (isNaN(parsed) || parsed <= 0)
                e.amount = "El monto debe ser mayor a 0.";
        }

        if (!imageUri)
            e.image = "Adjunta la imagen de prueba del gasto.";

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setUploading(true);
        let imageUrl: string | null = null;

        try {
            imageUrl = (await uploadFile(imageUri!, "gastos")).url;
        } catch (err: any) {
            Alert.alert(
                "Error al subir",
                err?.message ?? "No se pudo subir la imagen. Intenta de nuevo."
            );
            setUploading(false);
            return;
        }

        setUploading(false);

        const ok = await createExpense({
            description: description.trim(),
            url_image: imageUrl,
            amount: parseFloat(amount.replace(/,/g, "")),
        });

        if (ok) {
            notifyNewExpense({
                description: description.trim(),
                amount: parseFloat(amount.replace(/,/g, "")),
            }).catch(() => { });
            setDescription("");
            setAmount("");
            setImageUri(null);
            setErrors({});
            onSuccess();
        } else {
            Alert.alert("Error", "No se pudo registrar el gasto. Intenta de nuevo.");
        }
    };

    return (
        <View style={form.root}>
            <View style={form.header}>
                <View style={form.headerIcon}>
                    <Ionicons name="add-circle-outline" size={20} color={Colors.secondary.main} />
                </View>
                <View>
                    <Text style={form.headerTitle}>Registrar gasto</Text>
                    <Text style={form.headerSubtitle}>Gastos del condominio</Text>
                </View>
            </View>

            <InputField
                theme="light"
                label="ASUNTO DEL GASTO"
                placeholder="Ej. Reparación bomba de agua"
                leftIcon="document-text-outline"
                value={description}
                onChangeText={(t) => {
                    setDescription(t);
                    setErrors(p => ({ ...p, description: undefined }));
                }}
                error={errors.description}
                maxLength={30}
            />

            <InputField
                theme="light"
                label="MONTO ($)"
                placeholder="Ej. 2500.00"
                leftIcon="cash-outline"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={(t) => {
                    setAmount(t.replace(/[^0-9.]/g, ""));
                    setErrors(p => ({ ...p, amount: undefined }));
                }}
                error={errors.amount}
                maxLength={10}
            />

            <View style={form.field}>
                <Text style={form.fieldLabel}>IMAGEN DE PRUEBA</Text>

                {imageUri ? (
                    <View>
                        <Image
                            source={{ uri: imageUri }}
                            style={form.imgPreview}
                            resizeMode="cover"
                        />
                        <View style={form.imgActions}>
                            <TouchableOpacity
                                style={[form.imgBtn, form.imgBtnDanger]}
                                onPress={() => setImageUri(null)}
                            >
                                <Ionicons name="trash-outline" size={14} color={Colors.status.error} />
                                <Text style={[form.imgBtnText, { color: Colors.status.error }]}>
                                    Quitar
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[form.imgPicker, errors.image && form.imgPickerError]}
                        onPress={showImageOptions}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name="camera-outline"
                            size={28}
                            color={errors.image ? Colors.status.error : Colors.screen.iconMuted}
                        />
                        <Text
                            style={[
                                form.imgPickerText,
                                errors.image && { color: Colors.status.error },
                            ]}
                        >
                            Toca para adjuntar imagen
                        </Text>
                        <Text style={form.imgPickerHint}>Foto de recibo, factura o evidencia</Text>
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
                    <ActivityIndicator size="small" color={Colors.secondary.main} />
                    <Text style={form.loadingText}>
                        {uploading ? "Subiendo imagen..." : "Guardando gasto..."}
                    </Text>
                </View>
            ) : (
                <PrimaryButton
                    label="Registrar gasto"
                    onPress={handleSubmit}
                    disabled={isLoading || uploading}
                    variant="orange"
                />
            )}
        </View>
    );
}

// ── Summary Banner ────────────────────────────────────────────────────────────

function SummaryBanner({ expenses, canManage }: { expenses: Expense[]; canManage: boolean }) {
    const total = expenses.reduce((acc, e) => acc + Number(e.amount), 0);
    const thisMonth = expenses.filter(e => {
        const d = new Date(e.expense_date);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((acc, e) => acc + Number(e.amount), 0);

    return (
        <View style={summary.root}>
            <View style={summary.item}>
                <Ionicons name="trending-down-outline" size={18} color={Colors.secondary.main} />
                <View>
                    <Text style={summary.label}>Total registrado</Text>
                    <Text style={summary.value}>{formatCurrency(total)}</Text>
                </View>
            </View>
            <View style={summary.divider} />
            <View style={summary.item}>
                <Ionicons name="calendar-outline" size={18} color={Colors.primary.main} />
                <View>
                    <Text style={summary.label}>Este mes</Text>
                    <Text style={[summary.value, { color: Colors.primary.dark }]}>
                        {formatCurrency(thisMonth)}
                    </Text>
                </View>
            </View>
            <View style={summary.divider} />
            <View style={summary.item}>
                <Ionicons name="receipt-outline" size={18} color={Colors.screen.textSecondary} />
                <View>
                    <Text style={summary.label}>Registros</Text>
                    <Text style={summary.value}>{expenses.length}</Text>
                </View>
            </View>
        </View>
    );
}

// ── Read-only notice for residents ────────────────────────────────────────────

function ReadOnlyNotice() {
    return (
        <View style={notice.root}>
            <View style={notice.iconWrap}>
                <Ionicons name="eye-outline" size={16} color={Colors.primary.dark} />
            </View>
            <Text style={notice.text}>
                Estás viendo los gastos del condominio. Solo administradores y tesoreros pueden registrar o eliminar gastos.
            </Text>
        </View>
    );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ExpensesScreen() {
    const { user } = useSession();
    const { expenses, isLoading, error, fetchExpenses, deleteExpense } = useExpenses();

    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const formAnim = useRef(new Animated.Value(0)).current;

    // Rol 1 = Residente (solo lectura), 2+ = Tesorero/Admin (puede gestionar)
    const canManage = (user?.rol_id ?? 0) >= 2;

    useEffect(() => {
        fetchExpenses();
    }, []);

    const toggleForm = () => {
        if (showForm) {
            Animated.timing(formAnim, {
                toValue: 0, duration: 220, useNativeDriver: false,
            }).start(() => setShowForm(false));
        } else {
            setShowForm(true);
            Animated.timing(formAnim, {
                toValue: 1, duration: 300, useNativeDriver: false,
            }).start();
        }
    };

    const handleSuccess = () => {
        fetchExpenses();
        toggleForm();
        Alert.alert("¡Gasto registrado!", "El gasto fue guardado correctamente.");
    };

    const handleDelete = (id: number) => {
        Alert.alert(
            "Eliminar gasto",
            "¿Estás seguro de que deseas eliminar este registro?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        await deleteExpense(id);
                        fetchExpenses();
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.screen.bg} />
            <SafeAreaView style={{ flex: 1 }}>

                {/* ── Header ───────────────────────────────────────────── */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={() => router.push("/(finance)" as any)}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name="chevron-back"
                                size={18}
                                color={Colors.screen.textSecondary}
                            />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.headerTitle}>Gastos del condominio</Text>
                            <Text style={styles.headerSubtitle}>
                                {canManage ? "Egresos registrados" : "Consulta de egresos"}
                            </Text>
                        </View>
                    </View>

                    {/* Botón "+" solo para roles con permisos */}
                    {canManage && (
                        <TouchableOpacity
                            style={[styles.addBtn, showForm && styles.addBtnActive]}
                            onPress={toggleForm}
                            activeOpacity={0.8}
                        >
                            <Ionicons
                                name={showForm ? "close" : "add"}
                                size={18}
                                color={showForm ? Colors.status.error : Colors.secondary.main}
                            />
                            <Text
                                style={[
                                    styles.addBtnText,
                                    showForm && { color: Colors.status.error },
                                ]}
                            >
                                {showForm ? "Cancelar" : "Nuevo"}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ── Formulario colapsable (solo admin/tesorero) ───── */}
                    {showForm && canManage && (
                        <Animated.View style={{ opacity: formAnim }}>
                            <CreateForm onSuccess={handleSuccess} />
                        </Animated.View>
                    )}

                    {/* ── Aviso solo lectura (solo residentes) ─────────── */}
                    {!canManage && !isLoading && expenses.length > 0 && (
                        <ReadOnlyNotice />
                    )}

                    {/* ── Resumen ────────────────────────────────────────── */}
                    {!isLoading && expenses.length > 0 && (
                        <SummaryBanner expenses={expenses} canManage={canManage} />
                    )}

                    {/* ── Lista de gastos ────────────────────────────────── */}
                    {isLoading ? (
                        <View style={styles.centered}>
                            <ActivityIndicator size="large" color={Colors.secondary.main} />
                            <Text style={styles.stateText}>Cargando gastos...</Text>
                        </View>
                    ) : error ? (
                        <View style={styles.centered}>
                            <View style={styles.stateIcon}>
                                <Ionicons name="cloud-offline-outline" size={28} color={Colors.screen.textMuted} />
                            </View>
                            <Text style={styles.stateTitle}>Sin conexión</Text>
                            <Text style={styles.stateText}>{error}</Text>
                            <TouchableOpacity style={styles.retryBtn} onPress={fetchExpenses}>
                                <Ionicons name="refresh" size={14} color={Colors.secondary.main} />
                                <Text style={styles.retryText}>Reintentar</Text>
                            </TouchableOpacity>
                        </View>
                    ) : expenses.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <View style={styles.emptyIcon}>
                                <Ionicons name="wallet-outline" size={32} color={Colors.screen.textMuted} />
                            </View>
                            <Text style={styles.emptyTitle}>Sin gastos registrados</Text>
                            <Text style={styles.stateText}>
                                {canManage
                                    ? "Toca \"Nuevo\" para registrar el primer gasto."
                                    : "Aún no hay gastos registrados por la administración."}
                            </Text>
                        </View>
                    ) : (
                        <>
                            <View style={styles.sectionLabel}>
                                <Text style={styles.sectionLabelText}>HISTORIAL DE GASTOS</Text>
                                <View style={styles.sectionLabelLine} />
                            </View>

                            {expenses.map(item => (
                                <ExpenseCard
                                    key={item.id}
                                    item={item}
                                    canManage={canManage}
                                    onDelete={handleDelete}
                                    onViewImage={setViewingImage}
                                />
                            ))}
                        </>
                    )}
                </ScrollView>
            </SafeAreaView>

            {/* Visor de imagen */}
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
    accentBar: {
        height: 3,
        width: "100%",
        backgroundColor: Colors.secondary.main,
    },
    inner: { padding: 14, gap: 10 },
    header: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    iconWrap: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: Colors.secondary.soft,
        borderWidth: 1, borderColor: "#FED7AA",
        alignItems: "center", justifyContent: "center",
        flexShrink: 0,
    },
    headerTexts: { flex: 1, gap: 3 },
    description: {
        fontFamily: "Outfit_600SemiBold",
        fontSize: 14,
        color: Colors.screen.textPrimary,
        lineHeight: 20,
    },
    date: {
        fontFamily: "Outfit_400Regular",
        fontSize: 11,
        color: Colors.screen.textMuted,
    },
    amountWrap: { alignItems: "flex-end", gap: 2, flexShrink: 0 },
    amountLabel: {
        fontFamily: "Outfit_700Bold",
        fontSize: 9,
        color: Colors.screen.textMuted,
        letterSpacing: 1,
    },
    amount: {
        fontFamily: "Outfit_800ExtraBold",
        fontSize: 16,
        color: Colors.secondary.main,
    },
    img: { width: "100%", height: 170, borderRadius: 10 },
    imgOverlay: {
        position: "absolute", bottom: 0, left: 0, right: 0,
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 6, paddingVertical: 8,
        backgroundColor: "rgba(0,0,0,0.35)",
        borderBottomLeftRadius: 10, borderBottomRightRadius: 10,
    },
    imgOverlayText: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: "#fff" },
    noImg: {
        height: 56, borderRadius: 10, borderWidth: 1.5,
        borderColor: Colors.screen.border, borderStyle: "dashed",
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    },
    noImgText: {
        fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.screen.textMuted,
    },
    deleteBtn: {
        flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-end",
        paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: 8, borderWidth: 1, borderColor: Colors.screen.border,
    },
    deleteBtnText: {
        fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted,
    },
});

const form = StyleSheet.create({
    root: {
        backgroundColor: Colors.screen.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.screen.border,
        padding: 18,
        marginBottom: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderTopWidth: 3,
        borderTopColor: Colors.secondary.main,
    },
    header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },
    headerIcon: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: Colors.secondary.soft,
        borderWidth: 1, borderColor: "#FED7AA",
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
        height: 104, borderRadius: 12, borderWidth: 1.5,
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
        backgroundColor: Colors.secondary.soft, borderWidth: 1, borderColor: "#FED7AA",
    },
    imgBtnDanger: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
    imgBtnText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.secondary.main },
    loadingRow: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 10, paddingVertical: 16,
    },
    loadingText: { fontFamily: "Outfit_500Medium", fontSize: 14, color: Colors.secondary.main },
    errorRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 },
    errorText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.status.error },
});

const summary = StyleSheet.create({
    root: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.screen.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.screen.border,
        padding: 14,
        marginBottom: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    item: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
    divider: { width: 1, height: 36, backgroundColor: Colors.screen.border, marginHorizontal: 4 },
    label: { fontFamily: "Outfit_400Regular", fontSize: 10, color: Colors.screen.textMuted },
    value: { fontFamily: "Outfit_700Bold", fontSize: 14, color: Colors.secondary.main, marginTop: 1 },
});

const notice = StyleSheet.create({
    root: {
        flexDirection: "row", alignItems: "flex-start", gap: 10,
        backgroundColor: Colors.primary.soft,
        borderWidth: 1, borderColor: Colors.primary.muted,
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    },
    iconWrap: {
        width: 28, height: 28, borderRadius: 8,
        backgroundColor: Colors.primary.muted,
        alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
    },
    text: {
        flex: 1, fontFamily: "Outfit_400Regular", fontSize: 12,
        color: Colors.primary.dark, lineHeight: 18,
    },
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

    addBtn: {
        flexDirection: "row", alignItems: "center", gap: 5,
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
        backgroundColor: Colors.secondary.soft, borderWidth: 1, borderColor: "#FED7AA",
    },
    addBtnActive: { backgroundColor: Colors.status.errorBg, borderColor: Colors.status.errorBorder },
    addBtnText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.secondary.main },

    scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, gap: 12 },

    sectionLabel: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
    sectionLabelText: {
        fontFamily: "Outfit_700Bold", fontSize: 10,
        color: Colors.screen.textMuted, letterSpacing: 1.8,
    },
    sectionLabelLine: { flex: 1, height: 1, backgroundColor: Colors.screen.border },

    centered: { paddingVertical: 40, alignItems: "center", gap: 10 },
    stateIcon: {
        width: 56, height: 56, borderRadius: 16,
        backgroundColor: Colors.neutral[100], alignItems: "center", justifyContent: "center",
        marginBottom: 4,
    },
    stateTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 15, color: Colors.screen.textSecondary },
    stateText: {
        fontFamily: "Outfit_400Regular", fontSize: 13,
        color: Colors.screen.textMuted, textAlign: "center", lineHeight: 20,
    },
    retryBtn: {
        flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4,
        paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10,
        backgroundColor: Colors.secondary.soft, borderWidth: 1, borderColor: "#FED7AA",
    },
    retryText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.secondary.main },

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
});