import { Colors } from "@/constants/colors";
import { useSession } from "@/context/AuthContext";
import { useRecipes, type Recipe } from "@/hooks/useRecipes";
import supabase from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Linking,
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

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Department {
    id: number;
    name: string;
    is_in_use: boolean;
}

type ViewMode = "board" | "list";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(n: number) {
    return `$${Number(n).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function getStatusConfig(validated: boolean | null) {
    if (validated === true)
        return {
            label: "Aprobado", color: Colors.status.success,
            bg: Colors.status.successBg, border: Colors.status.successBorder,
            icon: "checkmark-circle" as const,
        };
    if (validated === false)
        return {
            label: "Rechazado", color: Colors.status.error,
            bg: Colors.status.errorBg, border: Colors.status.errorBorder,
            icon: "close-circle" as const,
        };
    return {
        label: "Pendiente", color: Colors.status.warning,
        bg: Colors.status.warningBg, border: Colors.status.warningBorder,
        icon: "time" as const,
    };
}

// Genera los últimos N meses a partir del mes actual, en orden desc
function buildMonthList(count = 6): { month: string; year: number; key: string }[] {
    const now = new Date();
    const result: { month: string; year: number; key: string }[] = [];
    const MONTH_NAMES = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
    ];
    for (let i = 0; i < count; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const month = MONTH_NAMES[d.getMonth()];
        const year = d.getFullYear();
        result.push({ month, year, key: `${month}-${year}` });
    }
    return result;
}

// ─── Image Viewer ─────────────────────────────────────────────────────────────

function ImageViewer({ uri, onClose }: { uri: string; onClose: () => void }) {
    const fade = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    }, []);
    return (
        <Modal visible animationType="none" transparent onRequestClose={onClose}>
            <Animated.View style={[viewer.overlay, { opacity: fade }]}>
                <TouchableOpacity style={viewer.closeBtn} onPress={onClose} activeOpacity={0.8}>
                    <Ionicons name="close" size={20} color="#fff" />
                </TouchableOpacity>
                <Image source={{ uri }} style={viewer.img} resizeMode="contain" />
            </Animated.View>
        </Modal>
    );
}

// ─── Month Tab ────────────────────────────────────────────────────────────────

function MonthTab({
    label, isActive, pendingCount, onPress,
}: {
    label: string; isActive: boolean; pendingCount: number; onPress: () => void;
}) {
    return (
        <TouchableOpacity
            style={[mtab.root, isActive && mtab.rootActive]}
            onPress={onPress}
            activeOpacity={0.75}
        >
            <Text style={[mtab.label, isActive && mtab.labelActive]}>{label}</Text>
            {pendingCount > 0 && (
                <View style={[mtab.badge, isActive && mtab.badgeActive]}>
                    <Text style={[mtab.badgeText, isActive && mtab.badgeTextActive]}>
                        {pendingCount}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

// ─── Cash Payment Modal ───────────────────────────────────────────────────────

function CashPaymentModal({
    dept,
    month,
    year,
    onClose,
    onConfirm,
}: {
    dept: Department;
    month: string;
    year: number;
    onClose: () => void;
    onConfirm: (depId: number, month: string, year: number, amount: number) => Promise<void>;
}) {
    const [amount, setAmount] = useState("");
    const [amountError, setAmountError] = useState<string | undefined>();
    const [saving, setSaving] = useState(false);

    const validateAmount = (val: string) => {
        if (!val.trim()) return "Ingresa el monto del pago.";
        const n = parseInt(val, 10);
        if (isNaN(n) || n <= 0) return "El monto debe ser mayor a 0.";
        if (val.length > 6) return "Máximo 6 dígitos.";
        return undefined;
    };

    const handleConfirm = async () => {
        Keyboard.dismiss();
        const err = validateAmount(amount);
        if (err) { setAmountError(err); return; }

        Alert.alert(
            "Registrar pago en efectivo",
            `¿Confirmar pago de ${dept.name} por $${amount} correspondiente a ${month} ${year}?\n\nEste registro quedará aprobado de inmediato.`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Confirmar",
                    onPress: async () => {
                        setSaving(true);
                        await onConfirm(dept.id, month, year, parseInt(amount, 10));
                        setSaving(false);
                        onClose();
                    },
                },
            ]
        );
    };

    return (
        <Modal visible animationType="slide" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <View style={cash.overlay}>
                    <View style={cash.sheet}>
                        {/* Handle */}
                        <View style={cash.handle} />

                        {/* Header */}
                        <View style={cash.header}>
                            <View style={cash.headerIconWrap}>
                                <Ionicons name="cash" size={22} color="#16A34A" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={cash.headerTitle}>Pago en efectivo</Text>
                                <Text style={cash.headerSub}>Registro manual por tesorero</Text>
                            </View>
                            <TouchableOpacity style={cash.closeBtn} onPress={onClose} activeOpacity={0.7}>
                                <Ionicons name="close" size={16} color={Colors.screen.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Info pills — dept + period (pre-filled, read-only) */}
                        <View style={cash.infoRow}>
                            <View style={cash.infoPill}>
                                <Ionicons name="business-outline" size={13} color={Colors.primary.dark} />
                                <Text style={cash.infoPillText} numberOfLines={1}>{dept.name}</Text>
                            </View>
                            <View style={cash.infoPill}>
                                <Ionicons name="calendar-outline" size={13} color={Colors.primary.dark} />
                                <Text style={cash.infoPillText}>{month} {year}</Text>
                            </View>
                        </View>

                        {/* Divider */}
                        <View style={cash.divider} />

                        {/* Amount input */}
                        <View style={cash.fieldWrap}>
                            <Text style={cash.fieldLabel}>MONTO RECIBIDO</Text>
                            <View style={[cash.inputRow, amountError && cash.inputRowError]}>
                                <Text style={cash.currencySymbol}>$</Text>
                                <TextInput
                                    style={cash.input}
                                    placeholder="0"
                                    placeholderTextColor={Colors.screen.textMuted}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    value={amount}
                                    onChangeText={(v) => {
                                        setAmount(v.replace(/[^0-9]/g, ""));
                                        setAmountError(undefined);
                                    }}
                                    autoFocus
                                    returnKeyType="done"
                                    onSubmitEditing={handleConfirm}
                                />
                                {amount.length > 0 && (
                                    <TouchableOpacity onPress={() => { setAmount(""); setAmountError(undefined); }}>
                                        <Ionicons name="close-circle" size={18} color={Colors.screen.textMuted} />
                                    </TouchableOpacity>
                                )}
                            </View>
                            {amountError && (
                                <View style={cash.errorRow}>
                                    <Ionicons name="alert-circle-outline" size={12} color={Colors.status.error} />
                                    <Text style={cash.errorText}>{amountError}</Text>
                                </View>
                            )}
                        </View>

                        {/* Notice */}
                        <View style={cash.notice}>
                            <Ionicons name="information-circle-outline" size={14} color={Colors.primary.dark} />
                            <Text style={cash.noticeText}>
                                Este registro se aprobará automáticamente y quedará visible para el residente.
                            </Text>
                        </View>

                        {/* Actions */}
                        <View style={cash.actions}>
                            <TouchableOpacity style={cash.cancelBtn} onPress={onClose} activeOpacity={0.8}>
                                <Text style={cash.cancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[cash.confirmBtn, saving && { opacity: 0.6 }]}
                                onPress={handleConfirm}
                                disabled={saving}
                                activeOpacity={0.85}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark-circle" size={17} color="#fff" />
                                        <Text style={cash.confirmText}>Registrar pago</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ─── Dept Row (board view) ────────────────────────────────────────────────────

function DeptRow({
    dept,
    recipe,
    onValidate,
    onViewImage,
    onViewReceipt,
    onCashPayment,
}: {
    dept: Department;
    recipe: Recipe | null;
    onValidate: (id: number, validated: boolean) => void;
    onViewImage: (url: string) => void;
    onViewReceipt: (recipe: Recipe) => void;
    onCashPayment: (dept: Department) => void;
}) {
    const sc = recipe ? getStatusConfig(recipe.validated ?? null) : null;
    const missing = !recipe;
    const isPending = recipe && (recipe.validated === null || recipe.validated === undefined);

    return (
        <TouchableOpacity
            style={[drow.root, missing && drow.rootMissing]}
            activeOpacity={recipe ? 0.82 : 0.95}
            onPress={() => recipe && onViewReceipt(recipe)}
        >
            {/* Left — dept icon */}
            <View style={[drow.deptIcon, missing && drow.deptIconMissing]}>
                <Text style={[drow.deptInitial, missing && { color: Colors.screen.textMuted }]}>
                    {dept.name[0]}
                </Text>
            </View>

            {/* Center — dept info */}
            <View style={drow.info}>
                <Text style={drow.deptName}>{dept.name}</Text>
                {recipe ? (
                    <Text style={drow.sub}>
                        {recipe.amount != null ? formatCurrency(Number(recipe.amount)) : "—"}
                    </Text>
                ) : (
                    <Text style={[drow.sub, { color: Colors.status.error }]}>Sin comprobante</Text>
                )}
            </View>

            {/* Right — status badge or missing badge */}
            {missing ? (
                <View style={drow.missingBadge}>
                    <Ionicons name="alert-circle-outline" size={13} color={Colors.status.error} />
                    <Text style={drow.missingText}>Falta</Text>
                </View>
            ) : (
                <View style={[drow.statusPill, { backgroundColor: sc!.bg, borderColor: sc!.border }]}>
                    <Ionicons name={sc!.icon} size={12} color={sc!.color} />
                    <Text style={[drow.statusText, { color: sc!.color }]}>{sc!.label}</Text>
                </View>
            )}

            {/* Cash button — only when missing */}
            {missing && (
                <TouchableOpacity
                    style={drow.cashBtn}
                    onPress={(e) => { e.stopPropagation?.(); onCashPayment(dept); }}
                    activeOpacity={0.8}
                >
                    <Ionicons name="cash-outline" size={15} color="#16A34A" />
                </TouchableOpacity>
            )}

            {/* Quick approve — only for pending uploads */}
            {isPending && (
                <TouchableOpacity
                    style={drow.approveBtn}
                    onPress={(e) => {
                        e.stopPropagation?.();
                        Alert.alert(
                            "Aprobar comprobante",
                            `¿Aprobar cuota de ${dept.name}?`,
                            [
                                { text: "Cancelar", style: "cancel" },
                                { text: "Aprobar", onPress: () => onValidate(recipe!.id, true) },
                            ]
                        );
                    }}
                    activeOpacity={0.8}
                >
                    <Ionicons name="checkmark" size={14} color={Colors.status.success} />
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
}

// ─── Receipt Detail Modal ─────────────────────────────────────────────────────

function ReceiptModal({
    recipe,
    deptName,
    onClose,
    onValidate,
}: {
    recipe: Recipe;
    deptName: string;
    onClose: () => void;
    onValidate: (id: number, validated: boolean) => void;
}) {
    const sc = getStatusConfig(recipe.validated ?? null);
    const isPdf = recipe.img?.toLowerCase().includes(".pdf") || recipe.img?.includes("/raw/");
    const isPending = recipe.validated === null || recipe.validated === undefined;
    const [viewingImg, setViewingImg] = useState(false);

    const handleApprove = () => {
        Alert.alert(
            "Aprobar comprobante",
            `¿Confirmar aprobación de ${deptName} — ${recipe.month} ${recipe.year}?`,
            [
                { text: "Cancelar", style: "cancel" },
                { text: "Aprobar", onPress: () => { onValidate(recipe.id, true); onClose(); } },
            ]
        );
    };

    const handleReject = () => {
        Alert.alert(
            "Rechazar comprobante",
            `¿Confirmar rechazo del comprobante de ${deptName}?`,
            [
                { text: "Cancelar", style: "cancel" },
                { text: "Rechazar", style: "destructive", onPress: () => { onValidate(recipe.id, false); onClose(); } },
            ]
        );
    };

    return (
        <Modal visible animationType="slide" transparent onRequestClose={onClose}>
            <View style={rmodal.overlay}>
                <View style={rmodal.sheet}>
                    {/* Handle */}
                    <View style={rmodal.handle} />

                    {/* Header */}
                    <View style={rmodal.header}>
                        <View style={[rmodal.avatar, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                            <Text style={[rmodal.avatarText, { color: sc.color }]}>{deptName[0]}</Text>
                        </View>
                        <View style={rmodal.headerInfo}>
                            <Text style={rmodal.deptName}>{deptName}</Text>
                            <Text style={rmodal.period}>{recipe.month} {recipe.year}</Text>
                        </View>
                        <View style={[rmodal.statusPill, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                            <Ionicons name={sc.icon} size={12} color={sc.color} />
                            <Text style={[rmodal.statusText, { color: sc.color }]}>{sc.label}</Text>
                        </View>
                        <TouchableOpacity style={rmodal.closeBtn} onPress={onClose}>
                            <Ionicons name="close" size={16} color={Colors.screen.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Amount */}
                        <View style={rmodal.amountRow}>
                            <Ionicons name="cash-outline" size={16} color={Colors.primary.main} />
                            <Text style={rmodal.amountLabel}>Monto pagado</Text>
                            <Text style={rmodal.amountValue}>{formatCurrency(Number(recipe.amount))}</Text>
                        </View>

                        {/* Attachment */}
                        <View style={rmodal.section}>
                            <Text style={rmodal.sectionLabel}>COMPROBANTE</Text>
                            {recipe.img ? (
                                isPdf ? (
                                    <TouchableOpacity
                                        style={rmodal.pdfRow}
                                        onPress={() => Linking.openURL(recipe.img!)}
                                        activeOpacity={0.85}
                                    >
                                        <View style={rmodal.pdfIcon}>
                                            <Ionicons name="document-text" size={24} color={Colors.status.error} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={rmodal.pdfLabel}>Comprobante PDF</Text>
                                            <Text style={rmodal.pdfHint}>Toca para abrir</Text>
                                        </View>
                                        <Ionicons name="open-outline" size={16} color={Colors.screen.textMuted} />
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity activeOpacity={0.85} onPress={() => setViewingImg(true)}>
                                        <Image source={{ uri: recipe.img }} style={rmodal.img} resizeMode="cover" />
                                        <View style={rmodal.imgOverlay}>
                                            <Ionicons name="expand-outline" size={14} color="#fff" />
                                            <Text style={rmodal.imgOverlayText}>Ver imagen completa</Text>
                                        </View>
                                    </TouchableOpacity>
                                )
                            ) : (
                                <View style={rmodal.noImg}>
                                    <Ionicons name="image-outline" size={18} color={Colors.screen.textMuted} />
                                    <Text style={rmodal.noImgText}>Sin comprobante adjunto</Text>
                                </View>
                            )}
                        </View>

                        {/* Actions */}
                        {isPending && (
                            <View style={rmodal.actions}>
                                <TouchableOpacity style={[rmodal.actionBtn, rmodal.rejectBtn]} onPress={handleReject} activeOpacity={0.8}>
                                    <Ionicons name="close" size={16} color={Colors.status.error} />
                                    <Text style={[rmodal.actionBtnText, { color: Colors.status.error }]}>Rechazar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[rmodal.actionBtn, rmodal.approveBtn]} onPress={handleApprove} activeOpacity={0.8}>
                                    <Ionicons name="checkmark" size={16} color={Colors.status.success} />
                                    <Text style={[rmodal.actionBtnText, { color: Colors.status.success }]}>Aprobar</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>

            {viewingImg && recipe.img && (
                <ImageViewer uri={recipe.img} onClose={() => setViewingImg(false)} />
            )}
        </Modal>
    );
}

// ─── Summary Bar ──────────────────────────────────────────────────────────────

function SummaryBar({
    depts, recipes,
}: {
    depts: Department[];
    recipes: Recipe[];
}) {
    const total = depts.length;
    const uploaded = recipes.filter(r => r.validated !== false).length;
    const approved = recipes.filter(r => r.validated === true).length;
    const missing = total - uploaded;
    const totalAmount = recipes.filter(r => r.validated === true).reduce((acc, r) => acc + Number(r.amount ?? 0), 0);

    const items = [
        { label: "Subieron", value: uploaded, color: Colors.primary.main, icon: "cloud-upload-outline" as const },
        { label: "Aprobados", value: approved, color: Colors.status.success, icon: "checkmark-circle-outline" as const },
        { label: "Faltan", value: missing, color: Colors.status.error, icon: "alert-circle-outline" as const },
    ];

    return (
        <View style={sbar.root}>
            <View style={sbar.amountRow}>
                <Ionicons name="wallet-outline" size={14} color={Colors.primary.main} />
                <Text style={sbar.amountLabel}>Total aprobado del mes</Text>
                <Text style={sbar.amountValue}>{formatCurrency(totalAmount)}</Text>
            </View>
            <View style={sbar.divider} />
            <View style={sbar.statsRow}>
                {items.map((item, i) => (
                    <View key={i} style={sbar.statItem}>
                        <View style={[sbar.statIcon, { backgroundColor: item.color + "18" }]}>
                            <Ionicons name={item.icon} size={13} color={item.color} />
                        </View>
                        <Text style={[sbar.statValue, { color: item.color }]}>{item.value}</Text>
                        <Text style={sbar.statLabel}>{item.label}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AdminRecipesScreen() {
    const { user } = useSession();
    const { recipes, isLoading, error, fetchAllRecipes, validateRecipe } = useRecipes();

    const [departments, setDepartments] = useState<Department[]>([]);
    const [depsLoading, setDepsLoading] = useState(true);

    const MONTHS_LIST = useMemo(() => buildMonthList(6), []);
    const [selectedMonthIdx, setSelectedMonthIdx] = useState(0);
    const selectedMonth = MONTHS_LIST[selectedMonthIdx];

    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [validatingId, setValidatingId] = useState<number | null>(null);
    const [cashTarget, setCashTarget] = useState<Department | null>(null);

    const selectedYear = new Date().getFullYear();

    // ── Fetch departments (is_in_use = true) ──────────────────────────────────
    useEffect(() => {
        const fetchDepts = async () => {
            setDepsLoading(true);
            const { data } = await supabase
                .from("departments")
                .select("id, name, is_in_use")
                .eq("is_in_use", true)
                .order("name");
            setDepartments((data as Department[]) ?? []);
            setDepsLoading(false);
        };
        fetchDepts();
    }, []);

    // ── Fetch recipes for current year ────────────────────────────────────────
    useEffect(() => {
        fetchAllRecipes(selectedYear);
    }, [selectedYear]);

    // ── Filter recipes for selected month ─────────────────────────────────────
    const monthRecipes = useMemo(() => {
        return recipes.filter(
            r => r.month === selectedMonth.month && r.year === selectedMonth.year
        );
    }, [recipes, selectedMonth]);

    // Map dep_id → recipe for this month (only non-rejected)
    const recipeByDept = useMemo(() => {
        const map = new Map<number, Recipe>();
        for (const r of monthRecipes) {
            if (r.validated !== false) map.set(r.dep_id, r);
        }
        return map;
    }, [monthRecipes]);

    // Pending count per month tab (for badge)
    const pendingCountByMonth = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const m of MONTHS_LIST) {
            const mRecipes = recipes.filter(r => r.month === m.month && r.year === m.year && r.validated !== false);
            const uploaded = new Set(mRecipes.map(r => r.dep_id));
            counts[m.key] = departments.filter(d => !uploaded.has(d.id)).length;
        }
        return counts;
    }, [recipes, departments, MONTHS_LIST]);

    // ── Validate ──────────────────────────────────────────────────────────────
    const handleValidate = async (id: number, validated: boolean) => {
        setValidatingId(id);
        await validateRecipe(id, validated);
        setValidatingId(null);
    };

    // ── Register cash payment — inserts a new recipe pre-approved ─────────────
    const handleCashPayment = async (
        depId: number,
        month: string,
        year: number,
        amount: number
    ) => {
        try {
            const { error: dbError } = await supabase
                .from("recipes")
                .insert([{
                    dep_id: depId,
                    month,
                    year,
                    amount,
                    img: null,
                    validated: true,   // aprobado directo
                }]);

            if (dbError) {
                Alert.alert("Error", "No se pudo registrar el pago. Intenta de nuevo.");
                return;
            }

            // Refrescar la lista para reflejar el nuevo registro
            await fetchAllRecipes(selectedYear);
        } catch {
            Alert.alert("Error", "No se pudo conectar al servidor.");
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    const isReady = !isLoading && !depsLoading;

    const getDeptName = (depId: number) =>
        departments.find(d => d.id === depId)?.name ?? "Departamento";

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.screen.bg} />
            <SafeAreaView style={{ flex: 1 }}>

                {/* ── Header ───────────────────────────────────────────── */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => router.push("/(finance)" as any)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="chevron-back" size={18} color={Colors.screen.textSecondary} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>Tablón de cuotas</Text>
                        <Text style={styles.headerSubtitle}>Comprobantes por mes y departamento</Text>
                    </View>
                </View>

                {/* ── Month Tabs ────────────────────────────────────────── */}
                <View style={styles.tabsWrapper}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.tabsRow}
                    >
                        {MONTHS_LIST.map((m, i) => (
                            <MonthTab
                                key={m.key}
                                label={`${m.month.slice(0, 3)} ${m.year}`}
                                isActive={selectedMonthIdx === i}
                                pendingCount={isReady ? (pendingCountByMonth[m.key] ?? 0) : 0}
                                onPress={() => setSelectedMonthIdx(i)}
                            />
                        ))}
                    </ScrollView>
                </View>

                {/* ── Content ───────────────────────────────────────────── */}
                {!isReady ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={Colors.primary.main} />
                        <Text style={styles.stateText}>Cargando datos...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.centered}>
                        <Ionicons name="cloud-offline-outline" size={32} color={Colors.screen.textMuted} />
                        <Text style={styles.stateText}>{error}</Text>
                        <TouchableOpacity
                            style={styles.retryBtn}
                            onPress={() => fetchAllRecipes(selectedYear)}
                        >
                            <Ionicons name="refresh" size={14} color={Colors.primary.dark} />
                            <Text style={styles.retryText}>Reintentar</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={departments}
                        keyExtractor={(d) => String(d.id)}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        ListHeaderComponent={
                            <SummaryBar
                                depts={departments}
                                recipes={monthRecipes.filter(r => r.validated !== false)}
                            />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyCard}>
                                <Ionicons name="business-outline" size={32} color={Colors.screen.textMuted} />
                                <Text style={styles.stateText}>Sin departamentos activos registrados.</Text>
                            </View>
                        }
                        renderItem={({ item: dept }) => {
                            const recipe = recipeByDept.get(dept.id) ?? null;
                            const isValidating = recipe ? validatingId === recipe.id : false;
                            return (
                                <View style={{ opacity: isValidating ? 0.55 : 1 }}>
                                    {isValidating && (
                                        <View style={styles.validatingOverlay}>
                                            <ActivityIndicator size="small" color={Colors.primary.main} />
                                        </View>
                                    )}
                                    <DeptRow
                                        dept={dept}
                                        recipe={recipe}
                                        onValidate={handleValidate}
                                        onViewImage={setViewingImage}
                                        onViewReceipt={setSelectedRecipe}
                                        onCashPayment={setCashTarget}
                                    />
                                </View>
                            );
                        }}
                        onRefresh={() => fetchAllRecipes(selectedYear)}
                        refreshing={isLoading}
                    />
                )}
            </SafeAreaView>

            {/* Receipt Detail Modal */}
            {selectedRecipe && (
                <ReceiptModal
                    recipe={selectedRecipe}
                    deptName={getDeptName(selectedRecipe.dep_id)}
                    onClose={() => setSelectedRecipe(null)}
                    onValidate={handleValidate}
                />
            )}

            {/* Cash Payment Modal */}
            {cashTarget && (
                <CashPaymentModal
                    dept={cashTarget}
                    month={selectedMonth.month}
                    year={selectedMonth.year}
                    onClose={() => setCashTarget(null)}
                    onConfirm={handleCashPayment}
                />
            )}

            {/* Image Viewer */}
            {viewingImage && (
                <ImageViewer uri={viewingImage} onClose={() => setViewingImage(null)} />
            )}
        </View>
    );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.screen.bg },
    header: {
        flexDirection: "row", alignItems: "center", gap: 10,
        paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: Colors.screen.card,
        borderBottomWidth: 1, borderBottomColor: Colors.screen.border,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: Colors.neutral[100], borderWidth: 1, borderColor: Colors.screen.border,
        alignItems: "center", justifyContent: "center",
    },
    headerTitle: { fontFamily: "Outfit_700Bold", fontSize: 16, color: Colors.screen.textPrimary },
    headerSubtitle: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted },
    tabsWrapper: {
        backgroundColor: Colors.screen.card,
        borderBottomWidth: 1, borderBottomColor: Colors.screen.border,
    },
    tabsRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
    list: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40, gap: 8 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
    stateText: {
        fontFamily: "Outfit_400Regular", fontSize: 13,
        color: Colors.screen.textMuted, textAlign: "center",
    },
    retryBtn: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10,
        backgroundColor: Colors.primary.soft, borderWidth: 1, borderColor: Colors.primary.muted,
    },
    retryText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.primary.dark },
    emptyCard: {
        backgroundColor: Colors.screen.card, borderRadius: 16,
        borderWidth: 1, borderColor: Colors.screen.border,
        padding: 32, alignItems: "center", gap: 10, marginTop: 8,
    },
    validatingOverlay: {
        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 10, alignItems: "center", justifyContent: "center",
    },
});

// Month Tab
const mtab = StyleSheet.create({
    root: {
        flexDirection: "row", alignItems: "center", gap: 5,
        paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: 20, borderWidth: 1.5,
        borderColor: Colors.screen.border, backgroundColor: Colors.screen.bg,
    },
    rootActive: {
        borderColor: Colors.primary.main, backgroundColor: Colors.primary.soft,
    },
    label: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: Colors.screen.textMuted },
    labelActive: { color: Colors.primary.dark },
    badge: {
        minWidth: 18, height: 18, borderRadius: 9,
        backgroundColor: Colors.screen.border,
        alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
    },
    badgeActive: { backgroundColor: Colors.status.error },
    badgeText: { fontFamily: "Outfit_700Bold", fontSize: 9, color: Colors.screen.textMuted },
    badgeTextActive: { color: "#fff" },
});

// Dept Row
const drow = StyleSheet.create({
    root: {
        flexDirection: "row", alignItems: "center", gap: 10,
        backgroundColor: Colors.screen.card, borderRadius: 14,
        borderWidth: 1, borderColor: Colors.screen.border,
        padding: 12,
        shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    rootMissing: {
        backgroundColor: "#FEF2F2", borderColor: "#FECACA",
    },
    deptIcon: {
        width: 38, height: 38, borderRadius: 11,
        backgroundColor: Colors.primary.soft, borderWidth: 1, borderColor: Colors.primary.muted,
        alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    deptIconMissing: {
        backgroundColor: "#FEF2F2", borderColor: "#FECACA",
    },
    deptInitial: {
        fontFamily: "Outfit_700Bold", fontSize: 16, color: Colors.primary.dark,
    },
    info: { flex: 1, gap: 2 },
    deptName: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.screen.textPrimary },
    sub: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted },
    statusPill: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1, flexShrink: 0,
    },
    statusText: { fontFamily: "Outfit_600SemiBold", fontSize: 10 },
    missingBadge: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
        backgroundColor: Colors.status.errorBg, borderWidth: 1, borderColor: Colors.status.errorBorder,
        flexShrink: 0,
    },
    missingText: { fontFamily: "Outfit_600SemiBold", fontSize: 10, color: Colors.status.error },
    cashBtn: {
        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0",
        alignItems: "center", justifyContent: "center", marginLeft: 4,
    },
    approveBtn: {
        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        backgroundColor: Colors.status.successBg, borderWidth: 1, borderColor: Colors.status.successBorder,
        alignItems: "center", justifyContent: "center", marginLeft: 4,
    },
});

// Summary Bar
const sbar = StyleSheet.create({
    root: {
        backgroundColor: Colors.screen.card, borderRadius: 16,
        borderWidth: 1, borderColor: Colors.screen.border,
        marginBottom: 12, overflow: "hidden",
        borderTopWidth: 3, borderTopColor: Colors.primary.main,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    amountRow: {
        flexDirection: "row", alignItems: "center", gap: 8,
        paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12,
    },
    amountLabel: { fontFamily: "Outfit_500Medium", fontSize: 13, color: Colors.screen.textSecondary, flex: 1 },
    amountValue: { fontFamily: "Outfit_800ExtraBold", fontSize: 18, color: Colors.primary.dark },
    divider: { height: 1, backgroundColor: Colors.screen.border, marginHorizontal: 16 },
    statsRow: {
        flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12,
    },
    statItem: { flex: 1, alignItems: "center", gap: 4 },
    statIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    statValue: { fontFamily: "Outfit_800ExtraBold", fontSize: 18 },
    statLabel: { fontFamily: "Outfit_400Regular", fontSize: 10, color: Colors.screen.textMuted },
});

// Receipt Modal
const rmodal = StyleSheet.create({
    overlay: {
        flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)",
    },
    sheet: {
        backgroundColor: Colors.screen.card,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingHorizontal: 20, paddingBottom: 36, maxHeight: "85%",
        borderTopWidth: 1, borderTopColor: Colors.screen.border,
    },
    handle: {
        width: 36, height: 4, borderRadius: 2,
        backgroundColor: Colors.screen.border, alignSelf: "center",
        marginTop: 12, marginBottom: 16,
    },
    header: {
        flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16,
    },
    avatar: {
        width: 40, height: 40, borderRadius: 12, borderWidth: 1.5,
        alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    avatarText: { fontFamily: "Outfit_700Bold", fontSize: 16 },
    headerInfo: { flex: 1, gap: 2 },
    deptName: { fontFamily: "Outfit_700Bold", fontSize: 15, color: Colors.screen.textPrimary },
    period: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.screen.textMuted },
    statusPill: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1,
    },
    statusText: { fontFamily: "Outfit_600SemiBold", fontSize: 10 },
    closeBtn: {
        width: 32, height: 32, borderRadius: 10,
        backgroundColor: Colors.neutral[100], borderWidth: 1, borderColor: Colors.screen.border,
        alignItems: "center", justifyContent: "center",
    },
    amountRow: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: Colors.primary.soft, borderRadius: 12,
        borderWidth: 1, borderColor: Colors.primary.muted,
        paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
    },
    amountLabel: { fontFamily: "Outfit_500Medium", fontSize: 13, color: Colors.primary.dark, flex: 1 },
    amountValue: { fontFamily: "Outfit_800ExtraBold", fontSize: 18, color: Colors.primary.dark },
    section: { marginBottom: 16 },
    sectionLabel: {
        fontFamily: "Outfit_700Bold", fontSize: 10,
        color: Colors.screen.textMuted, letterSpacing: 1.4,
        textTransform: "uppercase", marginBottom: 10,
    },
    img: { width: "100%", height: 200, borderRadius: 12 },
    imgOverlay: {
        position: "absolute", bottom: 0, left: 0, right: 0,
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 6, paddingVertical: 8, backgroundColor: "rgba(0,0,0,0.38)",
        borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
    },
    imgOverlayText: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: "#fff" },
    pdfRow: {
        flexDirection: "row", alignItems: "center", gap: 12,
        padding: 12, borderRadius: 10,
        backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA",
    },
    pdfIcon: {
        width: 44, height: 44, borderRadius: 10,
        backgroundColor: "#fff", borderWidth: 1, borderColor: "#FECACA",
        alignItems: "center", justifyContent: "center",
    },
    pdfLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.screen.textPrimary },
    pdfHint: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted, marginTop: 2 },
    noImg: {
        height: 56, borderRadius: 10, borderWidth: 1.5,
        borderColor: Colors.screen.border, borderStyle: "dashed",
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    },
    noImgText: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.screen.textMuted },
    actions: { flexDirection: "row", gap: 10, marginTop: 4, marginBottom: 8 },
    actionBtn: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5,
    },
    approveBtn: { backgroundColor: Colors.status.successBg, borderColor: Colors.status.successBorder },
    rejectBtn: { backgroundColor: Colors.status.errorBg, borderColor: Colors.status.errorBorder },
    actionBtnText: { fontFamily: "Outfit_700Bold", fontSize: 14 },
});

// Image Viewer
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

// Cash Payment Modal
const cash = StyleSheet.create({
    overlay: {
        flex: 1, justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.45)",
    },
    sheet: {
        backgroundColor: Colors.screen.card,
        borderTopLeftRadius: 26, borderTopRightRadius: 26,
        paddingHorizontal: 20, paddingBottom: 36,
        borderTopWidth: 1, borderTopColor: Colors.screen.border,
    },
    handle: {
        width: 36, height: 4, borderRadius: 2,
        backgroundColor: Colors.screen.border,
        alignSelf: "center", marginTop: 12, marginBottom: 18,
    },
    header: {
        flexDirection: "row", alignItems: "center",
        gap: 12, marginBottom: 16,
    },
    headerIconWrap: {
        width: 44, height: 44, borderRadius: 13,
        backgroundColor: "#F0FDF4", borderWidth: 1.5, borderColor: "#BBF7D0",
        alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    headerTitle: {
        fontFamily: "Outfit_700Bold", fontSize: 16, color: Colors.screen.textPrimary,
    },
    headerSub: {
        fontFamily: "Outfit_400Regular", fontSize: 11,
        color: Colors.screen.textMuted, marginTop: 1,
    },
    closeBtn: {
        width: 32, height: 32, borderRadius: 10,
        backgroundColor: Colors.neutral[100], borderWidth: 1, borderColor: Colors.screen.border,
        alignItems: "center", justifyContent: "center",
    },
    infoRow: {
        flexDirection: "row", gap: 8, marginBottom: 16,
    },
    infoPill: {
        flexDirection: "row", alignItems: "center", gap: 6,
        flex: 1, paddingHorizontal: 12, paddingVertical: 9,
        backgroundColor: Colors.primary.soft, borderRadius: 12,
        borderWidth: 1, borderColor: Colors.primary.muted,
    },
    infoPillText: {
        fontFamily: "Outfit_600SemiBold", fontSize: 12,
        color: Colors.primary.dark, flex: 1,
    },
    divider: {
        height: 1, backgroundColor: Colors.screen.border, marginBottom: 18,
    },
    fieldWrap: { marginBottom: 14 },
    fieldLabel: {
        fontFamily: "Outfit_700Bold", fontSize: 11,
        color: Colors.screen.textSecondary, letterSpacing: 1.2,
        textTransform: "uppercase", marginBottom: 8,
    },
    inputRow: {
        flexDirection: "row", alignItems: "center",
        height: 60, borderRadius: 14,
        borderWidth: 2, borderColor: "#16A34A",
        backgroundColor: "#F0FDF4",
        paddingHorizontal: 16, gap: 6,
    },
    inputRowError: {
        borderColor: Colors.status.error, backgroundColor: Colors.status.errorBg,
    },
    currencySymbol: {
        fontFamily: "Outfit_800ExtraBold", fontSize: 26,
        color: "#16A34A",
    },
    input: {
        flex: 1, fontFamily: "Outfit_800ExtraBold",
        fontSize: 30, color: Colors.screen.textPrimary,
    },
    errorRow: {
        flexDirection: "row", alignItems: "center",
        gap: 4, marginTop: 6,
    },
    errorText: {
        fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.status.error,
    },
    notice: {
        flexDirection: "row", alignItems: "flex-start", gap: 8,
        backgroundColor: Colors.primary.soft, borderRadius: 10,
        borderWidth: 1, borderColor: Colors.primary.muted,
        paddingHorizontal: 12, paddingVertical: 10, marginBottom: 20,
    },
    noticeText: {
        flex: 1, fontFamily: "Outfit_400Regular", fontSize: 12,
        color: Colors.primary.dark, lineHeight: 17,
    },
    actions: { flexDirection: "row", gap: 10 },
    cancelBtn: {
        flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center",
        backgroundColor: Colors.screen.bg, borderWidth: 1, borderColor: Colors.screen.border,
    },
    cancelText: {
        fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.screen.textSecondary,
    },
    confirmBtn: {
        flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 8, paddingVertical: 14, borderRadius: 12,
        backgroundColor: "#16A34A",
        shadowColor: "#16A34A", shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
    },
    confirmText: {
        fontFamily: "Outfit_700Bold", fontSize: 15, color: "#fff",
    },
});