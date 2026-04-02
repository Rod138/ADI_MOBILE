import PrimaryButton from "@/components/PrimaryButton";
import { Colors } from "@/constants/colors";
import { useSession } from "@/context/AuthContext";
import { useMonthlyQuota } from "@/hooks/useMonthlyQuota";
import { getCurrentMonthName, getCurrentYear, useRecipes, type Recipe } from "@/hooks/useRecipes";
import { uploadFile } from "@/lib/cloudinary";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    Linking,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ── Constants ─────────────────────────────────────────────────────────────────

const CURRENT_MONTH = getCurrentMonthName();
const CURRENT_YEAR = getCurrentYear();

// ── Helpers ───────────────────────────────────────────────────────────────────

function getValidationStyle(validated: boolean | null) {
    if (validated === true)
        return { color: Colors.status.success, bg: Colors.status.successBg, border: Colors.status.successBorder, icon: "checkmark-circle" as const, label: "Validado" };
    if (validated === false)
        return { color: Colors.status.error, bg: Colors.status.errorBg, border: Colors.status.errorBorder, icon: "close-circle" as const, label: "Rechazado" };
    return { color: Colors.status.warning, bg: Colors.status.warningBg, border: Colors.status.warningBorder, icon: "time" as const, label: "Pendiente" };
}

function formatCurrency(n: number) {
    return `$${Number(n).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

interface AttachedFile { uri: string; name: string; type: "image" | "pdf"; }

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

// ── Receipt Card ──────────────────────────────────────────────────────────────

function ReceiptCard({
    item, onDelete, onViewImage,
}: {
    item: Recipe; onDelete?: (id: number) => void; onViewImage: (url: string) => void;
}) {
    const vs = getValidationStyle(item.validated ?? null);
    const isPdf = item.url_image?.toLowerCase().includes(".pdf") || item.url_image?.includes("/raw/");
    const isPartial = item.amount_paid < item.amount_expected;

    return (
        <View style={card.root}>
            <View style={[card.accentBar, { backgroundColor: vs.color }]} />
            <View style={card.inner}>
                {/* Status + período */}
                <View style={card.header}>
                    <View style={[card.monthBadge, { backgroundColor: vs.bg, borderColor: vs.border }]}>
                        <Ionicons name="calendar" size={13} color={vs.color} />
                        <Text style={[card.monthText, { color: vs.color }]}>
                            {item.month} {item.year}
                        </Text>
                    </View>
                    {isPartial && (
                        <View style={[card.monthBadge, { backgroundColor: Colors.status.warningBg, borderColor: Colors.status.warningBorder }]}>
                            <Ionicons name="pie-chart-outline" size={11} color={Colors.status.warning} />
                            <Text style={[card.monthText, { color: Colors.status.warning, fontSize: 10 }]}>Parcial</Text>
                        </View>
                    )}
                    <View style={{ flex: 1 }} />
                    <View style={[card.statusBadge, { backgroundColor: vs.bg, borderColor: vs.border }]}>
                        <Ionicons name={vs.icon} size={12} color={vs.color} />
                        <Text style={[card.statusText, { color: vs.color }]}>{vs.label}</Text>
                    </View>
                </View>

                {/* Montos */}
                <View style={card.amountsRow}>
                    <View style={card.amountItem}>
                        <Text style={card.amountLabel}>PAGADO</Text>
                        <Text style={[card.amountValue, { color: Colors.primary.dark }]}>
                            {formatCurrency(item.amount_paid)}
                        </Text>
                    </View>
                    {item.amount_expected > 0 && (
                        <>
                            <View style={card.amountDivider} />
                            <View style={card.amountItem}>
                                <Text style={card.amountLabel}>CUOTA</Text>
                                <Text style={[card.amountValue, { color: Colors.screen.textSecondary }]}>
                                    {formatCurrency(item.amount_expected)}
                                </Text>
                            </View>
                            {isPartial && (
                                <>
                                    <View style={card.amountDivider} />
                                    <View style={card.amountItem}>
                                        <Text style={card.amountLabel}>RESTA</Text>
                                        <Text style={[card.amountValue, { color: Colors.status.error, fontSize: 13 }]}>
                                            {formatCurrency(item.amount_expected - item.amount_paid)}
                                        </Text>
                                    </View>
                                </>
                            )}
                        </>
                    )}
                </View>

                {/* Comprobante */}
                {item.url_image ? (
                    isPdf ? (
                        <TouchableOpacity style={card.pdfPreview} activeOpacity={0.85} onPress={() => Linking.openURL(item.url_image!)}>
                            <View style={card.pdfIcon}>
                                <Ionicons name="document-text" size={24} color={Colors.status.error} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={card.pdfLabel}>Comprobante PDF</Text>
                                <Text style={card.pdfHint}>Toca para abrir</Text>
                            </View>
                            <Ionicons name="open-outline" size={16} color={Colors.screen.textMuted} />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity activeOpacity={0.85} onPress={() => onViewImage(item.url_image!)}>
                            <Image source={{ uri: item.url_image }} style={card.img} resizeMode="cover" />
                            <View style={card.imgOverlay}>
                                <Ionicons name="expand-outline" size={16} color="#fff" />
                                <Text style={card.imgOverlayText}>Ver comprobante</Text>
                            </View>
                        </TouchableOpacity>
                    )
                ) : (
                    <View style={card.noImg}>
                        <Ionicons name="cash-outline" size={16} color={Colors.screen.textMuted} />
                        <Text style={card.noImgText}>Pago en efectivo registrado por admin</Text>
                    </View>
                )}

                {/* Nota si fue rechazado */}
                {item.validated === false && (
                    <View style={card.rejectedNote}>
                        <Ionicons name="alert-circle-outline" size={14} color={Colors.status.error} />
                        <Text style={card.rejectedNoteText}>
                            Comprobante rechazado. Puedes eliminarlo y subir uno nuevo.
                        </Text>
                    </View>
                )}

                {/* Eliminar */}
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

// ── Upload Form ───────────────────────────────────────────────────────────────

function UploadForm({
    depId,
    amountExpected,
    onSuccess,
}: {
    depId: number;
    amountExpected: number;
    onSuccess: () => void;
}) {
    const { createRecipe, isLoading } = useRecipes();
    const [amount, setAmount] = useState(amountExpected > 0 ? String(amountExpected) : "");
    const [amountError, setAmountError] = useState<string | undefined>();
    const [file, setFile] = useState<AttachedFile | null>(null);
    const [fileError, setFileError] = useState<string | undefined>();
    const [uploading, setUploading] = useState(false);

    // Actualizar monto si cambia la cuota esperada
    useEffect(() => {
        if (amountExpected > 0 && !amount) setAmount(String(amountExpected));
    }, [amountExpected]);

    const pickImage = async () => {
        const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!p.granted) { Alert.alert("Permiso requerido", "Necesitamos acceso a tu galería."); return; }
        const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [3, 4], quality: 0.85 });
        if (!r.canceled && r.assets[0]) {
            const asset = r.assets[0];
            setFile({ uri: asset.uri, name: asset.uri.split("/").pop() ?? "imagen.jpg", type: "image" });
            setFileError(undefined);
        }
    };

    const takePhoto = async () => {
        const p = await ImagePicker.requestCameraPermissionsAsync();
        if (!p.granted) { Alert.alert("Permiso requerido", "Necesitamos acceso a tu cámara."); return; }
        const r = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [3, 4], quality: 0.85 });
        if (!r.canceled && r.assets[0]) {
            const asset = r.assets[0];
            setFile({ uri: asset.uri, name: asset.uri.split("/").pop() ?? "foto.jpg", type: "image" });
            setFileError(undefined);
        }
    };

    const pickPdf = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
            if (!result.canceled && result.assets?.[0]) {
                const asset = result.assets[0];
                setFile({ uri: asset.uri, name: asset.name ?? "comprobante.pdf", type: "pdf" });
                setFileError(undefined);
            }
        } catch { Alert.alert("Error", "No se pudo seleccionar el PDF."); }
    };

    const showFileOptions = () =>
        Alert.alert("Adjuntar comprobante", "¿Cómo deseas agregar el comprobante?", [
            { text: "📷 Cámara", onPress: takePhoto },
            { text: "🖼️  Galería", onPress: pickImage },
            { text: "📄 PDF", onPress: pickPdf },
            { text: "Cancelar", style: "cancel" },
        ]);

    const validate = () => {
        let valid = true;
        if (!amount.trim()) { setAmountError("Ingresa el monto que estás pagando."); valid = false; }
        else {
            const n = parseFloat(amount);
            if (isNaN(n) || n <= 0) { setAmountError("El monto debe ser mayor a 0."); valid = false; }
        }
        if (!file) { setFileError("Adjunta el comprobante (imagen o PDF)."); valid = false; }
        return valid;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setUploading(true);
        let fileUrl: string | null = null;
        try {
            fileUrl = (await uploadFile(file!.uri, "comprobantes")).url;
        } catch (err: any) {
            Alert.alert("Error al subir", err?.message ?? "No se pudo subir el archivo.");
            setUploading(false);
            return;
        }
        setUploading(false);

        const parsedAmount = parseFloat(amount.replace(/,/g, ""));
        const ok = await createRecipe({
            dep_id: depId,
            year: CURRENT_YEAR,
            month: CURRENT_MONTH,
            amount_paid: parsedAmount,
            amount_expected: amountExpected > 0 ? amountExpected : parsedAmount,
            url_image: fileUrl,
            validated: null,
        });

        if (ok) {
            setAmount(""); setFile(null); setAmountError(undefined); setFileError(undefined);
            onSuccess();
        } else {
            Alert.alert("Error", "No se pudo guardar el comprobante. Intenta de nuevo.");
        }
    };

    return (
        <View style={form.root}>
            <View style={form.header}>
                <View style={form.headerIcon}>
                    <Ionicons name="cloud-upload-outline" size={20} color={Colors.primary.main} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={form.headerTitle}>Subir comprobante</Text>
                    <Text style={form.headerSubtitle}>{CURRENT_MONTH} {CURRENT_YEAR}</Text>
                </View>
            </View>

            {/* Cuota esperada */}
            {amountExpected > 0 && (
                <View style={form.quotaNote}>
                    <Ionicons name="information-circle-outline" size={14} color="#0891B2" />
                    <Text style={form.quotaNoteText}>
                        Cuota del mes:{" "}
                        <Text style={{ fontFamily: "Outfit_700Bold" }}>{formatCurrency(amountExpected)}</Text>
                    </Text>
                </View>
            )}

            {/* Monto a pagar */}
            <View style={form.field}>
                <Text style={form.fieldLabel}>MONTO QUE ESTÁS PAGANDO</Text>
                <View style={[form.amountInput, amountError && form.amountInputError]}>
                    <Text style={form.currencySymbol}>$</Text>
                    <TextInput
                        style={form.amountTextInput}
                        placeholder="0"
                        placeholderTextColor={Colors.screen.textMuted}
                        keyboardType="decimal-pad"
                        value={amount}
                        onChangeText={t => { setAmount(t.replace(/[^0-9.]/g, "")); setAmountError(undefined); }}
                        maxLength={8}
                    />
                    <Text style={form.mxnLabel}>MXN</Text>
                </View>
                {amountError && (
                    <View style={form.errorRow}>
                        <Ionicons name="alert-circle-outline" size={12} color={Colors.status.error} />
                        <Text style={form.errorText}>{amountError}</Text>
                    </View>
                )}
            </View>

            {/* Comprobante */}
            <View style={form.field}>
                <Text style={form.fieldLabel}>COMPROBANTE</Text>
                {file ? (
                    <View>
                        {file.type === "image" ? (
                            <Image source={{ uri: file.uri }} style={form.imgPreview} resizeMode="cover" />
                        ) : (
                            <View style={form.pdfPreview}>
                                <Ionicons name="document-text" size={32} color={Colors.status.error} />
                                <View style={{ flex: 1 }}>
                                    <Text style={form.pdfName} numberOfLines={1}>{file.name}</Text>
                                    <Text style={form.pdfHint}>PDF seleccionado</Text>
                                </View>
                            </View>
                        )}
                        <View style={form.imgActions}>
                            <TouchableOpacity style={[form.imgBtn, form.imgBtnDanger]} onPress={() => setFile(null)}>
                                <Ionicons name="trash-outline" size={14} color={Colors.status.error} />
                                <Text style={[form.imgBtnText, { color: Colors.status.error }]}>Quitar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={form.imgBtn} onPress={showFileOptions}>
                                <Ionicons name="swap-horizontal-outline" size={14} color={Colors.primary.main} />
                                <Text style={form.imgBtnText}>Cambiar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[form.imgPicker, fileError && form.imgPickerError]}
                        onPress={showFileOptions}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="attach-outline" size={30} color={fileError ? Colors.status.error : Colors.screen.iconMuted} />
                        <Text style={[form.imgPickerText, fileError && { color: Colors.status.error }]}>
                            Toca para adjuntar el comprobante
                        </Text>
                        <Text style={form.imgPickerHint}>Imagen (JPG/PNG) o PDF</Text>
                    </TouchableOpacity>
                )}
                {fileError && (
                    <View style={form.errorRow}>
                        <Ionicons name="alert-circle-outline" size={12} color={Colors.status.error} />
                        <Text style={form.errorText}>{fileError}</Text>
                    </View>
                )}
            </View>

            {uploading || isLoading ? (
                <View style={form.loadingRow}>
                    <ActivityIndicator size="small" color={Colors.primary.light} />
                    <Text style={form.loadingText}>{uploading ? "Subiendo archivo..." : "Guardando..."}</Text>
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
    const { recipes, isLoading, error, fetchMyCurrentMonthRecipes, deleteRecipe } = useRecipes();
    const { fetchQuota } = useMonthlyQuota();
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [amountExpected, setAmountExpected] = useState(0);
    const [loadingQuota, setLoadingQuota] = useState(true);
    const formAnim = useRef(new Animated.Value(0)).current;

    const depId = user?.dep_id;

    useEffect(() => {
        if (depId) {
            fetchMyCurrentMonthRecipes(depId);
            // Cargar cuota del mes actual
            setLoadingQuota(true);
            fetchQuota(CURRENT_MONTH, CURRENT_YEAR).then(q => {
                setAmountExpected(q ? Number(q.amount) : 0);
                setLoadingQuota(false);
            });
        }
    }, [depId]);

    const refresh = () => {
        if (depId) fetchMyCurrentMonthRecipes(depId);
    };

    const toggleForm = () => {
        if (showForm) {
            Animated.timing(formAnim, { toValue: 0, duration: 220, useNativeDriver: false })
                .start(() => setShowForm(false));
        } else {
            setShowForm(true);
            Animated.timing(formAnim, { toValue: 1, duration: 300, useNativeDriver: false }).start();
        }
    };

    const handleSuccess = () => {
        refresh();
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
                    refresh();
                },
            },
        ]);
    };

    // Estado del mes actual
    const approvedRecipe = recipes.find(r => r.validated === true);
    const pendingRecipe = recipes.find(r => r.validated === null || r.validated === undefined);
    const rejectedRecipes = recipes.filter(r => r.validated === false);
    const hasApproved = !!approvedRecipe;
    const totalPaid = recipes.filter(r => r.validated === true).reduce((s, r) => s + r.amount_paid, 0);
    const isComplete = amountExpected > 0 && totalPaid >= amountExpected;

    // Puede subir: si no hay aprobado que cubra el monto, o si hay rechazo
    const canUpload = !hasApproved || (amountExpected > 0 && totalPaid < amountExpected);
    // No mostrar botón de subir si ya está todo aprobado y cubierto
    const showUploadBtn = canUpload || rejectedRecipes.length > 0;

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.screen.bg} />
            <SafeAreaView style={{ flex: 1 }}>

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => router.push("/(finance)" as any)} activeOpacity={0.7}>
                            <Ionicons name="chevron-back" size={18} color={Colors.screen.textSecondary} />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.headerTitle}>Mis cuotas</Text>
                            <Text style={styles.headerSubtitle}>{CURRENT_MONTH} {CURRENT_YEAR}</Text>
                        </View>
                    </View>
                    {showUploadBtn && !isComplete && (
                        <TouchableOpacity
                            style={[styles.uploadBtn, showForm && styles.uploadBtnCancel]}
                            onPress={toggleForm}
                            activeOpacity={0.8}
                        >
                            <Ionicons name={showForm ? "close" : "add"} size={18}
                                color={showForm ? Colors.status.error : Colors.primary.dark} />
                            <Text style={[styles.uploadBtnText, showForm && { color: Colors.status.error }]}>
                                {showForm ? "Cancelar" : "Subir"}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ── Banner: mes cubierto ──────────────────────────────── */}
                    {isComplete && !showForm && (
                        <View style={styles.successBanner}>
                            <View style={styles.successBannerIconWrap}>
                                <Ionicons name="checkmark-circle" size={24} color={Colors.status.success} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.successBannerTitle}>¡Cuota cubierta!</Text>
                                <Text style={styles.successBannerSub}>
                                    Tu pago de {CURRENT_MONTH} {CURRENT_YEAR} fue aprobado correctamente.
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* ── Banner: cuota esperada (cuando no hay pagos) ──────── */}
                    {!loadingQuota && amountExpected > 0 && !isLoading && recipes.length === 0 && (
                        <View style={styles.quotaBanner}>
                            <View style={styles.quotaBannerIcon}>
                                <Ionicons name="cash-outline" size={20} color="#0891B2" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.quotaBannerTitle}>Cuota de {CURRENT_MONTH}</Text>
                                <Text style={styles.quotaBannerAmount}>{formatCurrency(amountExpected)}</Text>
                                <Text style={styles.quotaBannerSub}>Monto a pagar este mes</Text>
                            </View>
                        </View>
                    )}

                    {/* ── Progreso del pago (cuando hay cuota configurada y pagos) ── */}
                    {amountExpected > 0 && totalPaid > 0 && !isComplete && (
                        <View style={styles.progressCard}>
                            <View style={styles.progressHeader}>
                                <Text style={styles.progressLabel}>Progreso de pago</Text>
                                <Text style={styles.progressPct}>
                                    {Math.round((totalPaid / amountExpected) * 100)}%
                                </Text>
                            </View>
                            <View style={styles.progressTrack}>
                                <View style={[styles.progressFill, {
                                    width: `${Math.min((totalPaid / amountExpected) * 100, 100)}%`,
                                }]} />
                            </View>
                            <Text style={styles.progressNote}>
                                {formatCurrency(totalPaid)} pagado de {formatCurrency(amountExpected)}
                            </Text>
                        </View>
                    )}

                    {/* ── Formulario ─────────────────────────────────────────── */}
                    {showForm && depId && (
                        <Animated.View style={{ opacity: formAnim }}>
                            <UploadForm
                                depId={depId}
                                amountExpected={amountExpected}
                                onSuccess={handleSuccess}
                            />
                        </Animated.View>
                    )}

                    {/* ── Lista de comprobantes del mes ─────────────────────── */}
                    {isLoading ? (
                        <View style={styles.centered}>
                            <ActivityIndicator size="large" color={Colors.primary.main} />
                            <Text style={styles.stateText}>Cargando...</Text>
                        </View>
                    ) : error ? (
                        <View style={styles.centered}>
                            <Ionicons name="cloud-offline-outline" size={36} color={Colors.screen.textMuted} />
                            <Text style={styles.stateText}>{error}</Text>
                        </View>
                    ) : recipes.length === 0 && !showForm ? (
                        <View style={styles.emptyCard}>
                            <View style={styles.emptyIcon}>
                                <Ionicons name="receipt-outline" size={32} color={Colors.screen.textMuted} />
                            </View>
                            <Text style={styles.emptyTitle}>Sin comprobante este mes</Text>
                            <Text style={styles.stateText}>
                                {amountExpected > 0
                                    ? `Tu cuota de ${CURRENT_MONTH} es ${formatCurrency(amountExpected)}. Toca "Subir" para enviar tu comprobante.`
                                    : `Toca "Subir" para enviar tu comprobante de ${CURRENT_MONTH}.`}
                            </Text>
                        </View>
                    ) : recipes.length > 0 ? (
                        <>
                            {recipes.length > 1 && (
                                <View style={styles.sectionLabel}>
                                    <Text style={styles.sectionLabelText}>COMPROBANTES DEL MES</Text>
                                    <View style={styles.sectionLabelLine} />
                                    <View style={styles.countBadge}>
                                        <Text style={styles.countBadgeText}>{recipes.length}</Text>
                                    </View>
                                </View>
                            )}
                            {recipes.map(item => (
                                <ReceiptCard
                                    key={item.id}
                                    item={item}
                                    onDelete={handleDelete}
                                    onViewImage={setViewingImage}
                                />
                            ))}
                        </>
                    ) : null}
                </ScrollView>
            </SafeAreaView>

            {viewingImage && !viewingImage.toLowerCase().includes(".pdf") && (
                <ImageViewer uri={viewingImage} onClose={() => setViewingImage(null)} />
            )}
        </View>
    );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

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
    uploadBtnCancel: { backgroundColor: Colors.status.errorBg, borderColor: Colors.status.errorBorder },
    uploadBtnText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.primary.dark },

    scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, gap: 12 },

    successBanner: {
        flexDirection: "row", alignItems: "center", gap: 14,
        backgroundColor: Colors.status.successBg,
        borderWidth: 1, borderColor: Colors.status.successBorder,
        borderRadius: 16, padding: 16,
    },
    successBannerIconWrap: {
        width: 44, height: 44, borderRadius: 13,
        backgroundColor: "#fff", borderWidth: 1, borderColor: Colors.status.successBorder,
        alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    successBannerTitle: { fontFamily: "Outfit_700Bold", fontSize: 14, color: Colors.status.success },
    successBannerSub: {
        fontFamily: "Outfit_400Regular", fontSize: 12,
        color: Colors.status.success, opacity: 0.85, marginTop: 2, lineHeight: 17,
    },

    quotaBanner: {
        flexDirection: "row", alignItems: "center", gap: 14,
        backgroundColor: "#F0F9FF", borderWidth: 1, borderColor: "#BAE6FD",
        borderRadius: 16, padding: 16, borderTopWidth: 3, borderTopColor: "#0891B2",
    },
    quotaBannerIcon: {
        width: 44, height: 44, borderRadius: 13,
        backgroundColor: "#fff", borderWidth: 1, borderColor: "#BAE6FD",
        alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    quotaBannerTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: "#0891B2" },
    quotaBannerAmount: { fontFamily: "Outfit_900Black", fontSize: 24, color: "#0C4A6E", letterSpacing: -0.5 },
    quotaBannerSub: { fontFamily: "Outfit_400Regular", fontSize: 11, color: "#0891B2", opacity: 0.8 },

    progressCard: {
        backgroundColor: Colors.screen.card, borderRadius: 14,
        borderWidth: 1, borderColor: Colors.screen.border, padding: 14, gap: 8,
    },
    progressHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    progressLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.screen.textPrimary },
    progressPct: { fontFamily: "Outfit_800ExtraBold", fontSize: 18, color: Colors.status.warning },
    progressTrack: {
        height: 8, borderRadius: 4, backgroundColor: Colors.screen.border, overflow: "hidden",
    },
    progressFill: {
        height: "100%", borderRadius: 4, backgroundColor: Colors.status.warning,
    },
    progressNote: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted },

    centered: { paddingVertical: 40, alignItems: "center", gap: 12 },
    stateText: {
        fontFamily: "Outfit_400Regular", fontSize: 13,
        color: Colors.screen.textMuted, textAlign: "center", lineHeight: 20,
    },
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

    sectionLabel: { flexDirection: "row", alignItems: "center", gap: 10 },
    sectionLabelText: {
        fontFamily: "Outfit_700Bold", fontSize: 10,
        color: Colors.screen.textMuted, letterSpacing: 1.8,
    },
    sectionLabelLine: { flex: 1, height: 1, backgroundColor: Colors.screen.border },
    countBadge: {
        width: 20, height: 20, borderRadius: 10,
        backgroundColor: Colors.primary.muted, alignItems: "center", justifyContent: "center",
    },
    countBadgeText: { fontFamily: "Outfit_700Bold", fontSize: 10, color: Colors.primary.dark },
});

const card = StyleSheet.create({
    root: {
        backgroundColor: Colors.screen.card, borderRadius: 16,
        borderWidth: 1, borderColor: Colors.screen.border, overflow: "hidden",
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },
    accentBar: { height: 3, width: "100%" },
    inner: { padding: 14, gap: 10 },
    header: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
    monthBadge: {
        flexDirection: "row", alignItems: "center", gap: 5,
        paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, borderWidth: 1,
    },
    monthText: { fontFamily: "Outfit_700Bold", fontSize: 12 },
    statusBadge: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1,
    },
    statusText: { fontFamily: "Outfit_600SemiBold", fontSize: 11 },
    amountsRow: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: Colors.screen.bg, borderRadius: 10,
        borderWidth: 1, borderColor: Colors.screen.border, overflow: "hidden",
    },
    amountItem: { flex: 1, alignItems: "center", paddingVertical: 10 },
    amountDivider: { width: 1, height: 36, backgroundColor: Colors.screen.border },
    amountLabel: {
        fontFamily: "Outfit_700Bold", fontSize: 9,
        color: Colors.screen.textMuted, letterSpacing: 1.2, marginBottom: 3,
    },
    amountValue: { fontFamily: "Outfit_700Bold", fontSize: 14 },
    img: { width: "100%", height: 180, borderRadius: 10, marginTop: 4 },
    imgOverlay: {
        position: "absolute", bottom: 4, right: 0, left: 0,
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 6, paddingVertical: 8, backgroundColor: "rgba(0,0,0,0.35)",
        borderBottomLeftRadius: 10, borderBottomRightRadius: 10,
    },
    imgOverlayText: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: "#fff" },
    pdfPreview: {
        flexDirection: "row", alignItems: "center", gap: 12,
        padding: 12, borderRadius: 10, marginTop: 4,
        backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA",
    },
    pdfIcon: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: "#fff", borderWidth: 1, borderColor: "#FECACA",
        alignItems: "center", justifyContent: "center",
    },
    pdfLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.screen.textPrimary },
    pdfHint: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted, marginTop: 2 },
    noImg: {
        height: 52, borderRadius: 10, borderWidth: 1.5,
        borderColor: Colors.screen.border, borderStyle: "dashed",
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    },
    noImgText: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.screen.textMuted },
    rejectedNote: {
        flexDirection: "row", alignItems: "flex-start", gap: 8,
        backgroundColor: Colors.status.errorBg, borderRadius: 8,
        borderWidth: 1, borderColor: Colors.status.errorBorder,
        paddingHorizontal: 10, paddingVertical: 8,
    },
    rejectedNoteText: { flex: 1, fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.status.error, lineHeight: 17 },
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
        borderTopWidth: 3, borderTopColor: Colors.primary.main,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
    headerIcon: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: Colors.primary.soft, borderWidth: 1, borderColor: Colors.primary.muted,
        alignItems: "center", justifyContent: "center",
    },
    headerTitle: { fontFamily: "Outfit_700Bold", fontSize: 15, color: Colors.screen.textPrimary },
    headerSubtitle: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: Colors.primary.dark, marginTop: 2 },
    quotaNote: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: "#F0F9FF", borderWidth: 1, borderColor: "#BAE6FD",
        borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 16,
    },
    quotaNoteText: { flex: 1, fontFamily: "Outfit_400Regular", fontSize: 12, color: "#0C4A6E" },
    field: { marginBottom: 16 },
    fieldLabel: {
        fontFamily: "Outfit_700Bold", fontSize: 11,
        color: Colors.screen.textSecondary, letterSpacing: 1.2,
        textTransform: "uppercase", marginBottom: 8,
    },
    amountInput: {
        flexDirection: "row", alignItems: "center",
        height: 60, borderRadius: 14,
        borderWidth: 2, borderColor: Colors.primary.main,
        backgroundColor: Colors.primary.soft,
        paddingHorizontal: 16, gap: 6,
    },
    amountInputError: { borderColor: Colors.status.error, backgroundColor: Colors.status.errorBg },
    currencySymbol: { fontFamily: "Outfit_800ExtraBold", fontSize: 22, color: Colors.primary.dark },
    amountTextInput: {
        flex: 1, fontFamily: "Outfit_800ExtraBold",
        fontSize: 28, color: Colors.screen.textPrimary,
    },
    mxnLabel: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.screen.textMuted },
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
    pdfPreview: {
        flexDirection: "row", alignItems: "center", gap: 12,
        padding: 14, borderRadius: 12, marginBottom: 10,
        backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA",
    },
    pdfName: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.screen.textPrimary },
    pdfHint: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted, marginTop: 2 },
    imgActions: { flexDirection: "row", gap: 8 },
    imgBtn: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
        paddingVertical: 9, borderRadius: 10,
        backgroundColor: Colors.primary.soft, borderWidth: 1, borderColor: Colors.primary.muted,
    },
    imgBtnDanger: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
    imgBtnText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.primary.main },
    errorRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 },
    errorText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.status.error },
    loadingRow: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 10, paddingVertical: 16,
    },
    loadingText: { fontFamily: "Outfit_500Medium", fontSize: 14, color: Colors.primary.main },
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