import { Colors } from "@/constants/colors";
import { useSession } from "@/context/AuthContext";
import { useRecipes, type Recipe } from "@/hooks/useRecipes";
import { useTowerFund } from "@/hooks/useTowerFund";
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

interface MonthEntry {
    month: string;
    year: number;
    key: string;
}

interface DeptPaymentSummary {
    totalPaid: number;
    expected: number;
    payments: Recipe[];
    isPartial: boolean;
    latestRecipe: Recipe | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function formatCurrency(n: number) {
    return `$${Number(n).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function getStatusConfig(validated: boolean | null) {
    if (validated === true)
        return { label: "Aprobado", color: Colors.status.success, bg: Colors.status.successBg, border: Colors.status.successBorder, icon: "checkmark-circle" as const };
    if (validated === false)
        return { label: "Rechazado", color: Colors.status.error, bg: Colors.status.errorBg, border: Colors.status.errorBorder, icon: "close-circle" as const };
    return { label: "Pendiente", color: Colors.status.warning, bg: Colors.status.warningBg, border: Colors.status.warningBorder, icon: "time" as const };
}

function buildMonthList(startDate: string | null): MonthEntry[] {
    const now = new Date();
    const result: MonthEntry[] = [];
    const startFrom = startDate ? new Date(startDate) : now;
    const startYear = startFrom.getFullYear();
    const startMonth = startFrom.getMonth();
    let y = now.getFullYear();
    let m = now.getMonth();
    while (y > startYear || (y === startYear && m >= startMonth)) {
        const monthName = MONTH_NAMES[m];
        result.push({ month: monthName, year: y, key: `${monthName}-${y}` });
        m--;
        if (m < 0) { m = 11; y--; }
        if (result.length >= 60) break;
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

function MonthTab({ label, isActive, pendingCount, onPress }: {
    label: string; isActive: boolean; pendingCount: number; onPress: () => void;
}) {
    return (
        <TouchableOpacity style={[mtab.root, isActive && mtab.rootActive]} onPress={onPress} activeOpacity={0.75}>
            <Text style={[mtab.label, isActive && mtab.labelActive]}>{label}</Text>
            {pendingCount > 0 && (
                <View style={[mtab.badge, isActive && mtab.badgeActive]}>
                    <Text style={[mtab.badgeText, isActive && mtab.badgeTextActive]}>{pendingCount}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

// ─── Cash Payment Modal ───────────────────────────────────────────────────────

function CashPaymentModal({
    dept, month, year, amountExpected, onClose, onConfirm,
}: {
    dept: Department; month: string; year: number; amountExpected: number;
    onClose: () => void;
    onConfirm: (depId: number, month: string, year: number, amount: number, amountExpected: number) => Promise<void>;
}) {
    const [amount, setAmount] = useState(amountExpected > 0 ? String(amountExpected) : "");
    const [amountError, setAmountError] = useState<string | undefined>();
    const [saving, setSaving] = useState(false);

    const handleConfirm = async () => {
        Keyboard.dismiss();
        if (!amount.trim() || parseInt(amount, 10) <= 0) { setAmountError("El monto debe ser mayor a 0."); return; }
        Alert.alert(
            "Registrar pago en efectivo",
            `¿Confirmar pago de ${dept.name} por $${amount} para ${month} ${year}?\n\nEste registro quedará aprobado de inmediato.`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Confirmar", onPress: async () => {
                        setSaving(true);
                        await onConfirm(dept.id, month, year, parseInt(amount, 10), amountExpected > 0 ? amountExpected : parseInt(amount, 10));
                        setSaving(false);
                        onClose();
                    }
                },
            ]
        );
    };

    return (
        <Modal visible animationType="slide" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <View style={cash.overlay}>
                    <View style={cash.sheet}>
                        <View style={cash.handle} />
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
                        {amountExpected > 0 && (
                            <View style={cash.expectedNote}>
                                <Ionicons name="information-circle-outline" size={13} color="#0891B2" />
                                <Text style={cash.expectedNoteText}>
                                    Cuota esperada: <Text style={{ fontFamily: "Outfit_700Bold" }}>{formatCurrency(amountExpected)}</Text>
                                </Text>
                            </View>
                        )}
                        <View style={cash.divider} />
                        <View style={cash.fieldWrap}>
                            <Text style={cash.fieldLabel}>MONTO RECIBIDO</Text>
                            <View style={[cash.inputRow, amountError && cash.inputRowError]}>
                                <Text style={cash.currencySymbol}>$</Text>
                                <TextInput
                                    style={cash.input} placeholder="0" placeholderTextColor={Colors.screen.textMuted}
                                    keyboardType="number-pad" maxLength={8} value={amount}
                                    onChangeText={v => { setAmount(v.replace(/[^0-9]/g, "")); setAmountError(undefined); }}
                                    autoFocus returnKeyType="done" onSubmitEditing={handleConfirm}
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
                        <View style={cash.notice}>
                            <Ionicons name="information-circle-outline" size={14} color={Colors.primary.dark} />
                            <Text style={cash.noticeText}>
                                Este registro se aprobará automáticamente y quedará visible para el residente.
                            </Text>
                        </View>
                        <View style={cash.actions}>
                            <TouchableOpacity style={cash.cancelBtn} onPress={onClose} activeOpacity={0.8}>
                                <Text style={cash.cancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[cash.confirmBtn, saving && { opacity: 0.6 }]} onPress={handleConfirm} disabled={saving} activeOpacity={0.85}>
                                {saving ? <ActivityIndicator size="small" color="#fff" /> : (
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

// ─── Dept Row ─────────────────────────────────────────────────────────────────

function DeptRow({ dept, summary, onValidate, onViewReceipt, onCashPayment }: {
    dept: Department;
    summary: DeptPaymentSummary | null;
    onValidate: (id: number, validated: boolean) => void;
    onViewReceipt: (recipe: Recipe) => void;
    onCashPayment: (dept: Department) => void;
}) {
    const missing = !summary || summary.totalPaid === 0;
    const isApproved = summary?.latestRecipe?.validated === true && !summary.isPartial;
    const isPending = summary?.latestRecipe && (summary.latestRecipe.validated === null || summary.latestRecipe.validated === undefined);
    const isPartial = summary?.isPartial && summary?.latestRecipe?.validated === true;

    const rowBg = missing ? "#FEF2F2" : isPartial ? Colors.status.warningBg : isApproved ? Colors.status.successBg : Colors.screen.card;
    const rowBorder = missing ? "#FECACA" : isPartial ? Colors.status.warningBorder : isApproved ? Colors.status.successBorder : Colors.screen.border;

    return (
        <TouchableOpacity
            style={[drow.root, { backgroundColor: rowBg, borderColor: rowBorder }]}
            activeOpacity={summary ? 0.82 : 0.95}
            onPress={() => summary?.latestRecipe && onViewReceipt(summary.latestRecipe)}
        >
            <View style={[drow.deptIcon, missing && drow.deptIconMissing]}>
                <Text style={[drow.deptInitial, missing && { color: Colors.screen.textMuted }]}>{dept.name[0]}</Text>
            </View>
            <View style={drow.info}>
                <Text style={drow.deptName}>{dept.name}</Text>
                {summary ? (
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text style={[drow.paidText, { color: isApproved ? Colors.status.success : Colors.screen.textMuted }]}>
                            {formatCurrency(summary.totalPaid)}
                        </Text>
                        {summary.expected > 0 && (
                            <Text style={drow.expectedText}> / {formatCurrency(summary.expected)}</Text>
                        )}
                    </View>
                ) : (
                    <Text style={[drow.sub, { color: Colors.status.error }]}>Sin pago</Text>
                )}
            </View>

            {missing ? (
                <View style={drow.missingBadge}>
                    <Ionicons name="alert-circle-outline" size={12} color={Colors.status.error} />
                    <Text style={drow.missingText}>Falta</Text>
                </View>
            ) : isPartial ? (
                <View style={drow.partialBadge}>
                    <Ionicons name="pie-chart-outline" size={11} color={Colors.status.warning} />
                    <Text style={drow.partialText}>Parcial</Text>
                </View>
            ) : isPending ? (
                <View style={drow.pendingBadge}>
                    <Ionicons name="time" size={11} color={Colors.status.warning} />
                    <Text style={drow.pendingText}>Pendiente</Text>
                </View>
            ) : isApproved ? (
                <View style={drow.approvedBadge}>
                    <Ionicons name="checkmark-circle" size={11} color={Colors.status.success} />
                    <Text style={drow.approvedText}>OK</Text>
                </View>
            ) : null}

            {missing && (
                <TouchableOpacity style={drow.cashBtn}
                    onPress={(e) => { e.stopPropagation?.(); onCashPayment(dept); }}
                    activeOpacity={0.8}>
                    <Ionicons name="cash-outline" size={14} color="#16A34A" />
                </TouchableOpacity>
            )}

            {isPending && summary?.latestRecipe && (
                <TouchableOpacity style={drow.approveBtn}
                    onPress={(e) => {
                        e.stopPropagation?.();
                        Alert.alert("Aprobar comprobante", `¿Aprobar cuota de ${dept.name}?`, [
                            { text: "Cancelar", style: "cancel" },
                            { text: "Aprobar", onPress: () => onValidate(summary.latestRecipe!.id, true) },
                        ]);
                    }}
                    activeOpacity={0.8}>
                    <Ionicons name="checkmark" size={13} color={Colors.status.success} />
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
}

// ─── Edit Amount Modal ────────────────────────────────────────────────────────
// Modal para que el admin edite el monto manualmente (pago del restante en efectivo)

function EditAmountModal({
    recipe, deptName, onClose, onConfirm,
}: {
    recipe: Recipe;
    deptName: string;
    onClose: () => void;
    onConfirm: (recipeId: number, newAmount: number) => Promise<void>;
}) {
    const remaining = recipe.amount_expected > 0
        ? Math.max(recipe.amount_expected - recipe.amount_paid, 0)
        : 0;

    const [amount, setAmount] = useState(remaining > 0 ? String(remaining) : "");
    const [amountError, setAmountError] = useState<string | undefined>();
    const [saving, setSaving] = useState(false);

    const handleConfirm = async () => {
        Keyboard.dismiss();
        const n = parseFloat(amount.replace(/[^0-9.]/g, ""));
        if (!amount.trim() || isNaN(n) || n <= 0) {
            setAmountError("El monto debe ser mayor a 0.");
            return;
        }
        const newTotal = recipe.amount_paid + n;
        Alert.alert(
            "Registrar pago adicional",
            `¿Agregar ${formatCurrency(n)} al pago de ${deptName}?\n\nTotal resultante: ${formatCurrency(newTotal)}${recipe.amount_expected > 0 ? ` de ${formatCurrency(recipe.amount_expected)} esperados` : ""}`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Confirmar", onPress: async () => {
                        setSaving(true);
                        await onConfirm(recipe.id, newTotal);
                        setSaving(false);
                        onClose();
                    }
                },
            ]
        );
    };

    return (
        <Modal visible animationType="slide" transparent onRequestClose={onClose}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <View style={editModal.overlay}>
                    <View style={editModal.sheet}>
                        <View style={editModal.handle} />

                        {/* Header */}
                        <View style={editModal.header}>
                            <View style={editModal.headerIconWrap}>
                                <Ionicons name="pencil" size={20} color={Colors.primary.dark} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={editModal.headerTitle}>Registrar pago adicional</Text>
                                <Text style={editModal.headerSub}>{deptName} · {recipe.month} {recipe.year}</Text>
                            </View>
                            <TouchableOpacity style={editModal.closeBtn} onPress={onClose} activeOpacity={0.7}>
                                <Ionicons name="close" size={16} color={Colors.screen.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Resumen de montos actuales */}
                        <View style={editModal.summaryCard}>
                            <View style={editModal.summaryItem}>
                                <Text style={editModal.summaryLabel}>PAGADO</Text>
                                <Text style={[editModal.summaryValue, { color: Colors.primary.dark }]}>
                                    {formatCurrency(recipe.amount_paid)}
                                </Text>
                            </View>
                            {recipe.amount_expected > 0 && (
                                <>
                                    <View style={editModal.summaryDivider} />
                                    <View style={editModal.summaryItem}>
                                        <Text style={editModal.summaryLabel}>ESPERADO</Text>
                                        <Text style={[editModal.summaryValue, { color: Colors.screen.textSecondary }]}>
                                            {formatCurrency(recipe.amount_expected)}
                                        </Text>
                                    </View>
                                    <View style={editModal.summaryDivider} />
                                    <View style={editModal.summaryItem}>
                                        <Text style={editModal.summaryLabel}>RESTANTE</Text>
                                        <Text style={[editModal.summaryValue, { color: remaining > 0 ? Colors.status.error : Colors.status.success }]}>
                                            {remaining > 0 ? formatCurrency(remaining) : "Completo"}
                                        </Text>
                                    </View>
                                </>
                            )}
                        </View>

                        {/* Sugerencia rápida: pagar el restante completo */}
                        {remaining > 0 && (
                            <TouchableOpacity
                                style={editModal.quickFillBtn}
                                onPress={() => setAmount(String(remaining))}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="flash-outline" size={13} color={Colors.primary.dark} />
                                <Text style={editModal.quickFillText}>
                                    Completar monto restante: <Text style={{ fontFamily: "Outfit_700Bold" }}>{formatCurrency(remaining)}</Text>
                                </Text>
                            </TouchableOpacity>
                        )}

                        <View style={editModal.divider} />

                        {/* Input de monto adicional */}
                        <View style={editModal.fieldWrap}>
                            <Text style={editModal.fieldLabel}>MONTO ADICIONAL RECIBIDO EN EFECTIVO</Text>
                            <View style={[editModal.inputRow, amountError && editModal.inputRowError]}>
                                <Text style={editModal.currencySymbol}>$</Text>
                                <TextInput
                                    style={editModal.input}
                                    placeholder="0"
                                    placeholderTextColor={Colors.screen.textMuted}
                                    keyboardType="decimal-pad"
                                    maxLength={8}
                                    value={amount}
                                    onChangeText={v => { setAmount(v.replace(/[^0-9.]/g, "")); setAmountError(undefined); }}
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
                                <View style={editModal.errorRow}>
                                    <Ionicons name="alert-circle-outline" size={12} color={Colors.status.error} />
                                    <Text style={editModal.errorText}>{amountError}</Text>
                                </View>
                            )}
                            {/* Preview del nuevo total */}
                            {amount.length > 0 && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && (
                                <View style={editModal.previewTotal}>
                                    <Ionicons name="calculator-outline" size={13} color={Colors.primary.dark} />
                                    <Text style={editModal.previewTotalText}>
                                        Nuevo total:{" "}
                                        <Text style={{ fontFamily: "Outfit_700Bold", color: Colors.primary.dark }}>
                                            {formatCurrency(recipe.amount_paid + parseFloat(amount))}
                                        </Text>
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={editModal.notice}>
                            <Ionicons name="information-circle-outline" size={14} color={Colors.primary.dark} />
                            <Text style={editModal.noticeText}>
                                El monto adicional se sumará al pago existente. El comprobante permanecerá aprobado si ya lo estaba.
                            </Text>
                        </View>

                        {/* Acciones */}
                        <View style={editModal.actions}>
                            <TouchableOpacity style={editModal.cancelBtn} onPress={onClose} activeOpacity={0.8}>
                                <Text style={editModal.cancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[editModal.confirmBtn, saving && { opacity: 0.6 }]}
                                onPress={handleConfirm}
                                disabled={saving}
                                activeOpacity={0.85}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark-circle" size={17} color="#fff" />
                                        <Text style={editModal.confirmText}>Registrar pago</Text>
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

// ─── Receipt Detail Modal ─────────────────────────────────────────────────────

function ReceiptModal({ recipe, deptName, onClose, onValidate, onEditAmount }: {
    recipe: Recipe; deptName: string;
    onClose: () => void;
    onValidate: (id: number, validated: boolean) => void;
    onEditAmount: (recipe: Recipe) => void;
}) {
    const sc = getStatusConfig(recipe.validated ?? null);
    const isPdf = recipe.url_image?.toLowerCase().includes(".pdf") || recipe.url_image?.includes("/raw/");
    const isPending = recipe.validated === null || recipe.validated === undefined;
    const isApproved = recipe.validated === true;
    const [viewingImg, setViewingImg] = useState(false);
    const isPartial = recipe.amount_expected > 0 && recipe.amount_paid < recipe.amount_expected;

    return (
        <Modal visible animationType="slide" transparent onRequestClose={onClose}>
            <View style={rmodal.overlay}>
                <View style={rmodal.sheet}>
                    <View style={rmodal.handle} />
                    <View style={rmodal.header}>
                        <View style={[rmodal.avatar, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                            <Text style={[rmodal.avatarText, { color: sc.color }]}>{deptName[0]}</Text>
                        </View>
                        <View style={rmodal.headerInfo}>
                            <Text style={rmodal.deptName}>{deptName}</Text>
                            <Text style={rmodal.period}>{recipe.month} {recipe.year}</Text>
                        </View>
                        <View style={[rmodal.statusPill, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                            <Ionicons name={sc.icon} size={11} color={sc.color} />
                            <Text style={[rmodal.statusText, { color: sc.color }]}>{sc.label}</Text>
                        </View>
                        <TouchableOpacity style={rmodal.closeBtn} onPress={onClose}>
                            <Ionicons name="close" size={15} color={Colors.screen.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Montos */}
                        <View style={rmodal.amountsCard}>
                            <View style={rmodal.amountItem}>
                                <Text style={rmodal.amountItemLabel}>PAGADO</Text>
                                <Text style={[rmodal.amountItemValue, { color: Colors.primary.dark }]}>{formatCurrency(recipe.amount_paid)}</Text>
                            </View>
                            {recipe.amount_expected > 0 && (
                                <>
                                    <View style={rmodal.amountDivider} />
                                    <View style={rmodal.amountItem}>
                                        <Text style={rmodal.amountItemLabel}>ESPERADO</Text>
                                        <Text style={[rmodal.amountItemValue, { color: Colors.screen.textSecondary }]}>{formatCurrency(recipe.amount_expected)}</Text>
                                    </View>
                                </>
                            )}
                        </View>

                        {/* Alerta de pago parcial + botón de editar monto */}
                        {isPartial && (
                            <View style={rmodal.partialSection}>
                                <View style={rmodal.partialAlert}>
                                    <Ionicons name="pie-chart-outline" size={14} color={Colors.status.warning} />
                                    <Text style={rmodal.partialAlertText}>
                                        Pago parcial — faltan {formatCurrency(recipe.amount_expected - recipe.amount_paid)}
                                    </Text>
                                </View>
                                {/* Botón para registrar el restante en efectivo */}
                                <TouchableOpacity
                                    style={rmodal.editAmountBtn}
                                    onPress={() => { onClose(); onEditAmount(recipe); }}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name="cash-outline" size={16} color={Colors.primary.dark} />
                                    <Text style={rmodal.editAmountBtnText}>
                                        Registrar pago del restante en efectivo
                                    </Text>
                                    <Ionicons name="chevron-forward" size={14} color={Colors.primary.dark} />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Botón de edición manual de monto siempre visible para admin (aunque esté aprobado) */}
                        {!isPartial && isApproved && (
                            <TouchableOpacity
                                style={rmodal.editAmountBtnSecondary}
                                onPress={() => { onClose(); onEditAmount(recipe); }}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="pencil-outline" size={14} color={Colors.screen.textMuted} />
                                <Text style={rmodal.editAmountBtnSecondaryText}>Agregar pago adicional</Text>
                            </TouchableOpacity>
                        )}

                        {/* Comprobante */}
                        <View style={rmodal.section}>
                            <Text style={rmodal.sectionLabel}>COMPROBANTE</Text>
                            {recipe.url_image ? (
                                isPdf ? (
                                    <TouchableOpacity style={rmodal.pdfRow} onPress={() => Linking.openURL(recipe.url_image!)} activeOpacity={0.85}>
                                        <View style={rmodal.pdfIcon}>
                                            <Ionicons name="document-text" size={22} color={Colors.status.error} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={rmodal.pdfLabel}>Comprobante PDF</Text>
                                            <Text style={rmodal.pdfHint}>Toca para abrir</Text>
                                        </View>
                                        <Ionicons name="open-outline" size={15} color={Colors.screen.textMuted} />
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity activeOpacity={0.85} onPress={() => setViewingImg(true)}>
                                        <Image source={{ uri: recipe.url_image }} style={rmodal.img} resizeMode="cover" />
                                        <View style={rmodal.imgOverlay}>
                                            <Ionicons name="expand-outline" size={13} color="#fff" />
                                            <Text style={rmodal.imgOverlayText}>Ver imagen completa</Text>
                                        </View>
                                    </TouchableOpacity>
                                )
                            ) : (
                                <View style={rmodal.noImg}>
                                    <Ionicons name="cash-outline" size={16} color={Colors.screen.textMuted} />
                                    <Text style={rmodal.noImgText}>Pago en efectivo</Text>
                                </View>
                            )}
                        </View>

                        {/* Acciones de validación */}
                        {isPending && (
                            <View style={rmodal.actions}>
                                <TouchableOpacity style={[rmodal.actionBtn, rmodal.rejectBtn]}
                                    onPress={() => {
                                        Alert.alert("Rechazar", `¿Rechazar comprobante de ${deptName}?`, [
                                            { text: "Cancelar", style: "cancel" },
                                            { text: "Rechazar", style: "destructive", onPress: () => { onValidate(recipe.id, false); onClose(); } }
                                        ]);
                                    }} activeOpacity={0.8}>
                                    <Ionicons name="close" size={15} color={Colors.status.error} />
                                    <Text style={[rmodal.actionBtnText, { color: Colors.status.error }]}>Rechazar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[rmodal.actionBtn, rmodal.approveBtn]}
                                    onPress={() => {
                                        Alert.alert("Aprobar", `¿Aprobar comprobante de ${deptName}?`, [
                                            { text: "Cancelar", style: "cancel" },
                                            { text: "Aprobar", onPress: () => { onValidate(recipe.id, true); onClose(); } }
                                        ]);
                                    }} activeOpacity={0.8}>
                                    <Ionicons name="checkmark" size={15} color={Colors.status.success} />
                                    <Text style={[rmodal.actionBtnText, { color: Colors.status.success }]}>Aprobar</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
            {viewingImg && recipe.url_image && (
                <ImageViewer uri={recipe.url_image} onClose={() => setViewingImg(false)} />
            )}
        </Modal>
    );
}

// ─── Summary Bar ──────────────────────────────────────────────────────────────

function SummaryBar({ depts, recipes, amountExpected }: {
    depts: Department[]; recipes: Recipe[]; amountExpected: number;
}) {
    const approvedRecipes = recipes.filter(r => r.validated === true);
    const approvedDepts = new Set(approvedRecipes.map(r => r.dep_id)).size;
    const pending = recipes.filter(r => r.validated === null || r.validated === undefined).length;
    const missing = depts.length - new Set(recipes.filter(r => r.validated !== false).map(r => r.dep_id)).size;
    const totalAmount = approvedRecipes.reduce((acc, r) => acc + Number(r.amount_paid), 0);
    const expectedTotal = amountExpected > 0 ? amountExpected * depts.length : 0;

    return (
        <View style={sbar.root}>
            <View style={sbar.amountRow}>
                <Ionicons name="wallet-outline" size={14} color={Colors.primary.main} />
                <Text style={sbar.amountLabel}>Total aprobado</Text>
                <View style={{ alignItems: "flex-end" }}>
                    <Text style={sbar.amountValue}>{formatCurrency(totalAmount)}</Text>
                    {expectedTotal > 0 && <Text style={sbar.expectedText}>de {formatCurrency(expectedTotal)} esperado</Text>}
                </View>
            </View>
            <View style={sbar.divider} />
            <View style={sbar.statsRow}>
                {[
                    { label: "Pagaron", value: approvedDepts, color: Colors.status.success, icon: "checkmark-circle-outline" as const },
                    { label: "Pendientes", value: pending, color: Colors.status.warning, icon: "time-outline" as const },
                    { label: "Faltan", value: missing, color: Colors.status.error, icon: "alert-circle-outline" as const },
                ].map((item, i) => (
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
    const { fetchFund } = useTowerFund();

    const [departments, setDepartments] = useState<Department[]>([]);
    const [depsLoading, setDepsLoading] = useState(true);
    const [monthlyAmountExpected, setMonthlyAmountExpected] = useState(0);
    const [monthsList, setMonthsList] = useState<MonthEntry[]>([]);
    const [selectedMonthIdx, setSelectedMonthIdx] = useState(0);
    const [fundLoading, setFundLoading] = useState(true);

    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [validatingId, setValidatingId] = useState<number | null>(null);
    const [cashTarget, setCashTarget] = useState<Department | null>(null);
    const [editAmountRecipe, setEditAmountRecipe] = useState<Recipe | null>(null); // ← NUEVO

    const currentYear = new Date().getFullYear();

    useEffect(() => {
        setFundLoading(true);
        fetchFund().then(fund => {
            const startDate = fund?.updated_at ?? null;
            const months = buildMonthList(startDate);
            setMonthsList(months);
            setFundLoading(false);
        });
    }, []);

    const selectedMonth = monthsList[selectedMonthIdx] ?? null;

    useEffect(() => {
        const fetchDepts = async () => {
            setDepsLoading(true);
            const { data } = await supabase
                .from("departments").select("id, name, is_in_use")
                .eq("is_in_use", true).order("name");
            setDepartments((data as Department[]) ?? []);
            setDepsLoading(false);
        };
        fetchDepts();
    }, []);

    useEffect(() => {
        fetchAllRecipes(currentYear);
    }, [currentYear]);

    useEffect(() => {
        if (!selectedMonth) return;
        const fetchQuota = async () => {
            const { data } = await supabase
                .from("monthly_quota").select("amount")
                .eq("month", selectedMonth.month).eq("year", selectedMonth.year).maybeSingle();
            setMonthlyAmountExpected(data ? Number(data.amount) : 0);
        };
        fetchQuota();
    }, [selectedMonth]);

    const deptSummaries = useMemo(() => {
        if (!selectedMonth) return new Map<number, DeptPaymentSummary>();
        const monthRecipes = recipes.filter(r => r.month === selectedMonth.month && r.year === selectedMonth.year);
        const map = new Map<number, DeptPaymentSummary>();

        for (const r of monthRecipes) {
            if (r.validated === false) continue;
            const existing = map.get(r.dep_id) ?? { totalPaid: 0, expected: r.amount_expected, payments: [], isPartial: false, latestRecipe: null };
            existing.payments.push(r);
            if (r.validated === true) existing.totalPaid += Number(r.amount_paid);
            if (!existing.latestRecipe || new Date(r.created_at) > new Date(existing.latestRecipe.created_at)) {
                existing.latestRecipe = r;
            }
            map.set(r.dep_id, existing);
        }

        for (const [, summary] of map) {
            const effectiveExpected = summary.expected > 0 ? summary.expected : monthlyAmountExpected;
            summary.isPartial = effectiveExpected > 0 && summary.totalPaid < effectiveExpected && summary.totalPaid > 0;
        }
        return map;
    }, [recipes, selectedMonth, monthlyAmountExpected]);

    const pendingCountByMonth = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const m of monthsList) {
            const mRecipes = recipes.filter(r => r.month === m.month && r.year === m.year && r.validated !== false);
            const paid = new Set(mRecipes.filter(r => r.validated === true).map(r => r.dep_id));
            counts[m.key] = departments.filter(d => !paid.has(d.id)).length;
        }
        return counts;
    }, [recipes, departments, monthsList]);

    const handleValidate = async (id: number, validated: boolean) => {
        setValidatingId(id);
        await validateRecipe(id, validated);
        setValidatingId(null);
    };

    const handleCashPayment = async (depId: number, month: string, year: number, amount: number, amountExpected: number) => {
        try {
            const { error: dbError } = await supabase.from("recipes_payment").insert([{
                dep_id: depId, month, year,
                amount_paid: amount, amount_expected: amountExpected,
                url_image: null, validated: true,
                created_at: new Date().toISOString(),
            }]);
            if (dbError) { Alert.alert("Error", "No se pudo registrar el pago."); return; }
            await fetchAllRecipes(currentYear);
        } catch { Alert.alert("Error", "No se pudo conectar al servidor."); }
    };

    // ── Actualizar monto de pago de un recibo existente ────────────────────────
    const handleEditAmount = async (recipeId: number, newTotalAmount: number) => {
        try {
            const { error: dbError } = await supabase
                .from("recipes_payment")
                .update({ amount_paid: newTotalAmount })
                .eq("id", recipeId);

            if (dbError) {
                Alert.alert("Error", "No se pudo actualizar el monto. Intenta de nuevo.");
                return;
            }
            await fetchAllRecipes(currentYear);
            Alert.alert("¡Listo!", `Monto actualizado a ${formatCurrency(newTotalAmount)} correctamente.`);
        } catch {
            Alert.alert("Error", "No se pudo conectar al servidor.");
        }
    };

    const isReady = !isLoading && !depsLoading && !fundLoading;
    const getDeptName = (depId: number) => departments.find(d => d.id === depId)?.name ?? "Departamento";
    const monthRecipesForSummary = useMemo(() =>
        selectedMonth ? recipes.filter(r => r.month === selectedMonth.month && r.year === selectedMonth.year) : [],
        [recipes, selectedMonth]
    );

    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.screen.bg} />
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.push("/(finance)" as any)} activeOpacity={0.7}>
                        <Ionicons name="chevron-back" size={18} color={Colors.screen.textSecondary} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>Tablón de cuotas</Text>
                        <Text style={styles.headerSubtitle}>Comprobantes por departamento</Text>
                    </View>
                </View>

                {/* Tabs de meses */}
                {fundLoading ? (
                    <View style={styles.tabsLoading}>
                        <ActivityIndicator size="small" color={Colors.primary.main} />
                        <Text style={styles.tabsLoadingText}>Cargando períodos...</Text>
                    </View>
                ) : monthsList.length === 0 ? (
                    <View style={styles.noFundBanner}>
                        <Ionicons name="warning-outline" size={16} color={Colors.status.warning} />
                        <Text style={styles.noFundText}>
                            Configura el fondo inicial en "Configuración financiera" para ver los períodos disponibles.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.tabsWrapper}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
                            {monthsList.map((m, i) => (
                                <MonthTab key={m.key}
                                    label={`${m.month.slice(0, 3)} ${m.year}`}
                                    isActive={selectedMonthIdx === i}
                                    pendingCount={isReady ? (pendingCountByMonth[m.key] ?? 0) : 0}
                                    onPress={() => setSelectedMonthIdx(i)}
                                />
                            ))}
                        </ScrollView>
                    </View>
                )}

                {!isReady ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={Colors.primary.main} />
                        <Text style={styles.stateText}>Cargando datos...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.centered}>
                        <Ionicons name="cloud-offline-outline" size={32} color={Colors.screen.textMuted} />
                        <Text style={styles.stateText}>{error}</Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchAllRecipes(currentYear)}>
                            <Ionicons name="refresh" size={14} color={Colors.primary.dark} />
                            <Text style={styles.retryText}>Reintentar</Text>
                        </TouchableOpacity>
                    </View>
                ) : monthsList.length === 0 ? (
                    <View style={styles.centered}>
                        <Ionicons name="calendar-outline" size={36} color={Colors.screen.textMuted} />
                        <Text style={styles.stateText}>
                            No hay períodos disponibles.{"\n"}Configura el fondo inicial para comenzar.
                        </Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={() => router.push("/(finance)/admin-quota" as any)}>
                            <Ionicons name="settings-outline" size={14} color={Colors.primary.dark} />
                            <Text style={styles.retryText}>Ir a configuración</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={departments}
                        keyExtractor={d => String(d.id)}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        ListHeaderComponent={
                            selectedMonth ? (
                                <SummaryBar depts={departments} recipes={monthRecipesForSummary} amountExpected={monthlyAmountExpected} />
                            ) : null
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyCard}>
                                <Ionicons name="business-outline" size={32} color={Colors.screen.textMuted} />
                                <Text style={styles.stateText}>Sin departamentos activos.</Text>
                            </View>
                        }
                        renderItem={({ item: dept }) => {
                            const summary = deptSummaries.get(dept.id) ?? null;
                            const isValidating = summary?.latestRecipe ? validatingId === summary.latestRecipe.id : false;
                            return (
                                <View style={{ opacity: isValidating ? 0.55 : 1, position: "relative" }}>
                                    {isValidating && (
                                        <View style={styles.validatingOverlay}>
                                            <ActivityIndicator size="small" color={Colors.primary.main} />
                                        </View>
                                    )}
                                    <DeptRow
                                        dept={dept}
                                        summary={summary}
                                        onValidate={handleValidate}
                                        onViewReceipt={setSelectedRecipe}
                                        onCashPayment={setCashTarget}
                                    />
                                </View>
                            );
                        }}
                        onRefresh={() => fetchAllRecipes(currentYear)}
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
                    onEditAmount={(recipe) => {
                        setSelectedRecipe(null);
                        setEditAmountRecipe(recipe);
                    }}
                />
            )}

            {/* Edit Amount Modal */}
            {editAmountRecipe && (
                <EditAmountModal
                    recipe={editAmountRecipe}
                    deptName={getDeptName(editAmountRecipe.dep_id)}
                    onClose={() => setEditAmountRecipe(null)}
                    onConfirm={handleEditAmount}
                />
            )}

            {/* Cash Payment Modal */}
            {cashTarget && selectedMonth && (
                <CashPaymentModal
                    dept={cashTarget}
                    month={selectedMonth.month}
                    year={selectedMonth.year}
                    amountExpected={monthlyAmountExpected}
                    onClose={() => setCashTarget(null)}
                    onConfirm={handleCashPayment}
                />
            )}

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
        backgroundColor: Colors.screen.card, borderBottomWidth: 1, borderBottomColor: Colors.screen.border,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: Colors.neutral[100], borderWidth: 1, borderColor: Colors.screen.border,
        alignItems: "center", justifyContent: "center",
    },
    headerTitle: { fontFamily: "Outfit_700Bold", fontSize: 16, color: Colors.screen.textPrimary },
    headerSubtitle: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted },
    tabsWrapper: { backgroundColor: Colors.screen.card, borderBottomWidth: 1, borderBottomColor: Colors.screen.border },
    tabsRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
    tabsLoading: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        backgroundColor: Colors.screen.card, borderBottomWidth: 1, borderBottomColor: Colors.screen.border,
        paddingVertical: 12,
    },
    tabsLoadingText: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.screen.textMuted },
    noFundBanner: {
        flexDirection: "row", alignItems: "flex-start", gap: 8,
        backgroundColor: Colors.status.warningBg, borderBottomWidth: 1, borderBottomColor: Colors.status.warningBorder,
        paddingHorizontal: 16, paddingVertical: 12,
    },
    noFundText: { flex: 1, fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.status.warning, lineHeight: 17 },
    list: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40, gap: 8 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
    stateText: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.screen.textMuted, textAlign: "center" },
    retryBtn: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10,
        backgroundColor: Colors.primary.soft, borderWidth: 1, borderColor: Colors.primary.muted,
    },
    retryText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.primary.dark },
    emptyCard: {
        backgroundColor: Colors.screen.card, borderRadius: 16, borderWidth: 1, borderColor: Colors.screen.border,
        padding: 32, alignItems: "center", gap: 10, marginTop: 8,
    },
    validatingOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, alignItems: "center", justifyContent: "center" },
});

const mtab = StyleSheet.create({
    root: {
        flexDirection: "row", alignItems: "center", gap: 5,
        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
        borderWidth: 1.5, borderColor: Colors.screen.border, backgroundColor: Colors.screen.bg,
    },
    rootActive: { borderColor: Colors.primary.main, backgroundColor: Colors.primary.soft },
    label: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: Colors.screen.textMuted },
    labelActive: { color: Colors.primary.dark },
    badge: {
        minWidth: 18, height: 18, borderRadius: 9, backgroundColor: Colors.screen.border,
        alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
    },
    badgeActive: { backgroundColor: Colors.status.error },
    badgeText: { fontFamily: "Outfit_700Bold", fontSize: 9, color: Colors.screen.textMuted },
    badgeTextActive: { color: "#fff" },
});

const drow = StyleSheet.create({
    root: {
        flexDirection: "row", alignItems: "center", gap: 10,
        borderRadius: 14, borderWidth: 1, padding: 12,
        shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    deptIcon: {
        width: 38, height: 38, borderRadius: 11,
        backgroundColor: Colors.primary.soft, borderWidth: 1, borderColor: Colors.primary.muted,
        alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    deptIconMissing: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
    deptInitial: { fontFamily: "Outfit_700Bold", fontSize: 16, color: Colors.primary.dark },
    info: { flex: 1, gap: 2 },
    deptName: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.screen.textPrimary },
    paidText: { fontFamily: "Outfit_700Bold", fontSize: 12 },
    expectedText: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted },
    sub: { fontFamily: "Outfit_400Regular", fontSize: 11 },
    missingBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, backgroundColor: Colors.status.errorBg, borderWidth: 1, borderColor: Colors.status.errorBorder },
    missingText: { fontFamily: "Outfit_600SemiBold", fontSize: 10, color: Colors.status.error },
    partialBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, backgroundColor: Colors.status.warningBg, borderWidth: 1, borderColor: Colors.status.warningBorder },
    partialText: { fontFamily: "Outfit_600SemiBold", fontSize: 10, color: Colors.status.warning },
    pendingBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, backgroundColor: Colors.status.warningBg, borderWidth: 1, borderColor: Colors.status.warningBorder },
    pendingText: { fontFamily: "Outfit_600SemiBold", fontSize: 10, color: Colors.status.warning },
    approvedBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, backgroundColor: Colors.status.successBg, borderWidth: 1, borderColor: Colors.status.successBorder },
    approvedText: { fontFamily: "Outfit_600SemiBold", fontSize: 10, color: Colors.status.success },
    cashBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#BBF7D0", alignItems: "center", justifyContent: "center", marginLeft: 4 },
    approveBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.status.successBg, borderWidth: 1, borderColor: Colors.status.successBorder, alignItems: "center", justifyContent: "center", marginLeft: 4 },
});

const sbar = StyleSheet.create({
    root: {
        backgroundColor: Colors.screen.card, borderRadius: 16, borderWidth: 1, borderColor: Colors.screen.border,
        marginBottom: 12, overflow: "hidden", borderTopWidth: 3, borderTopColor: Colors.primary.main,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    amountRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 },
    amountLabel: { fontFamily: "Outfit_500Medium", fontSize: 13, color: Colors.screen.textSecondary, flex: 1 },
    amountValue: { fontFamily: "Outfit_800ExtraBold", fontSize: 18, color: Colors.primary.dark },
    expectedText: { fontFamily: "Outfit_400Regular", fontSize: 10, color: Colors.screen.textMuted, textAlign: "right" },
    divider: { height: 1, backgroundColor: Colors.screen.border, marginHorizontal: 16 },
    statsRow: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12 },
    statItem: { flex: 1, alignItems: "center", gap: 4 },
    statIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    statValue: { fontFamily: "Outfit_800ExtraBold", fontSize: 18 },
    statLabel: { fontFamily: "Outfit_400Regular", fontSize: 10, color: Colors.screen.textMuted },
});

const rmodal = StyleSheet.create({
    overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
    sheet: { backgroundColor: Colors.screen.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 36, maxHeight: "90%", borderTopWidth: 1, borderTopColor: Colors.screen.border },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.screen.border, alignSelf: "center", marginTop: 12, marginBottom: 16 },
    header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
    avatar: { width: 38, height: 38, borderRadius: 11, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
    avatarText: { fontFamily: "Outfit_700Bold", fontSize: 15 },
    headerInfo: { flex: 1, gap: 2 },
    deptName: { fontFamily: "Outfit_700Bold", fontSize: 14, color: Colors.screen.textPrimary },
    period: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted },
    statusPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
    statusText: { fontFamily: "Outfit_600SemiBold", fontSize: 10 },
    closeBtn: { width: 30, height: 30, borderRadius: 9, backgroundColor: Colors.neutral[100], borderWidth: 1, borderColor: Colors.screen.border, alignItems: "center", justifyContent: "center" },
    amountsCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.screen.bg, borderRadius: 12, borderWidth: 1, borderColor: Colors.screen.border, marginBottom: 12, overflow: "hidden" },
    amountItem: { flex: 1, alignItems: "center", paddingVertical: 12 },
    amountDivider: { width: 1, height: 40, backgroundColor: Colors.screen.border },
    amountItemLabel: { fontFamily: "Outfit_700Bold", fontSize: 9, color: Colors.screen.textMuted, letterSpacing: 1.2, marginBottom: 4 },
    amountItemValue: { fontFamily: "Outfit_700Bold", fontSize: 16 },
    // Sección de pago parcial
    partialSection: { gap: 8, marginBottom: 12 },
    partialAlert: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.status.warningBg, borderRadius: 10, borderWidth: 1, borderColor: Colors.status.warningBorder, paddingHorizontal: 12, paddingVertical: 9 },
    partialAlertText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.status.warning },
    // Botón de editar monto (principal - para pagos parciales)
    editAmountBtn: {
        flexDirection: "row", alignItems: "center", gap: 10,
        paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12,
        backgroundColor: Colors.primary.soft, borderWidth: 1.5, borderColor: Colors.primary.muted,
    },
    editAmountBtnText: { flex: 1, fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.primary.dark },
    // Botón de editar monto secundario (para pagos ya completos)
    editAmountBtnSecondary: {
        flexDirection: "row", alignItems: "center", gap: 8,
        paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10,
        backgroundColor: Colors.screen.bg, borderWidth: 1, borderColor: Colors.screen.border,
        alignSelf: "flex-end", marginBottom: 12,
    },
    editAmountBtnSecondaryText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.screen.textMuted },
    section: { marginBottom: 14 },
    sectionLabel: { fontFamily: "Outfit_700Bold", fontSize: 10, color: Colors.screen.textMuted, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 10 },
    img: { width: "100%", height: 200, borderRadius: 12 },
    imgOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8, backgroundColor: "rgba(0,0,0,0.38)", borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
    imgOverlayText: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: "#fff" },
    pdfRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 10, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA" },
    pdfIcon: { width: 42, height: 42, borderRadius: 10, backgroundColor: "#fff", borderWidth: 1, borderColor: "#FECACA", alignItems: "center", justifyContent: "center" },
    pdfLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.screen.textPrimary },
    pdfHint: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted, marginTop: 2 },
    noImg: { height: 52, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.screen.border, borderStyle: "dashed", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
    noImgText: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.screen.textMuted },
    actions: { flexDirection: "row", gap: 10, marginTop: 4, marginBottom: 8 },
    actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5 },
    approveBtn: { backgroundColor: Colors.status.successBg, borderColor: Colors.status.successBorder },
    rejectBtn: { backgroundColor: Colors.status.errorBg, borderColor: Colors.status.errorBorder },
    actionBtnText: { fontFamily: "Outfit_700Bold", fontSize: 14 },
});

const editModal = StyleSheet.create({
    overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
    sheet: {
        backgroundColor: Colors.screen.card,
        borderTopLeftRadius: 26, borderTopRightRadius: 26,
        paddingHorizontal: 20, paddingBottom: 36,
        borderTopWidth: 1, borderTopColor: Colors.screen.border,
    },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.screen.border, alignSelf: "center", marginTop: 12, marginBottom: 18 },
    header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
    headerIconWrap: {
        width: 44, height: 44, borderRadius: 13,
        backgroundColor: Colors.primary.soft, borderWidth: 1.5, borderColor: Colors.primary.muted,
        alignItems: "center", justifyContent: "center",
    },
    headerTitle: { fontFamily: "Outfit_700Bold", fontSize: 16, color: Colors.screen.textPrimary },
    headerSub: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted, marginTop: 1 },
    closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.neutral[100], borderWidth: 1, borderColor: Colors.screen.border, alignItems: "center", justifyContent: "center" },
    summaryCard: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: Colors.screen.bg, borderRadius: 12,
        borderWidth: 1, borderColor: Colors.screen.border,
        overflow: "hidden", marginBottom: 12,
    },
    summaryItem: { flex: 1, alignItems: "center", paddingVertical: 12 },
    summaryDivider: { width: 1, height: 40, backgroundColor: Colors.screen.border },
    summaryLabel: {
        fontFamily: "Outfit_700Bold", fontSize: 9,
        color: Colors.screen.textMuted, letterSpacing: 1.2, marginBottom: 4,
    },
    summaryValue: { fontFamily: "Outfit_700Bold", fontSize: 15 },
    quickFillBtn: {
        flexDirection: "row", alignItems: "center", gap: 8,
        paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
        backgroundColor: Colors.primary.soft, borderWidth: 1, borderColor: Colors.primary.muted,
        marginBottom: 12,
    },
    quickFillText: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.primary.dark },
    divider: { height: 1, backgroundColor: Colors.screen.border, marginBottom: 18 },
    fieldWrap: { marginBottom: 14 },
    fieldLabel: {
        fontFamily: "Outfit_700Bold", fontSize: 11, color: Colors.screen.textSecondary,
        letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8,
    },
    inputRow: {
        flexDirection: "row", alignItems: "center", height: 60, borderRadius: 14,
        borderWidth: 2, borderColor: Colors.primary.main,
        backgroundColor: Colors.primary.soft, paddingHorizontal: 16, gap: 6,
    },
    inputRowError: { borderColor: Colors.status.error, backgroundColor: Colors.status.errorBg },
    currencySymbol: { fontFamily: "Outfit_800ExtraBold", fontSize: 24, color: Colors.primary.dark },
    input: { flex: 1, fontFamily: "Outfit_800ExtraBold", fontSize: 28, color: Colors.screen.textPrimary },
    errorRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
    errorText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.status.error },
    previewTotal: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: Colors.primary.soft, borderRadius: 8,
        borderWidth: 1, borderColor: Colors.primary.muted,
        paddingHorizontal: 12, paddingVertical: 8, marginTop: 8,
    },
    previewTotalText: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.screen.textSecondary },
    notice: {
        flexDirection: "row", alignItems: "flex-start", gap: 8,
        backgroundColor: Colors.primary.soft, borderRadius: 10,
        borderWidth: 1, borderColor: Colors.primary.muted,
        paddingHorizontal: 12, paddingVertical: 10, marginBottom: 20,
    },
    noticeText: { flex: 1, fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.primary.dark, lineHeight: 17 },
    actions: { flexDirection: "row", gap: 10 },
    cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", backgroundColor: Colors.screen.bg, borderWidth: 1, borderColor: Colors.screen.border },
    cancelText: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.screen.textSecondary },
    confirmBtn: {
        flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.primary.main,
        shadowColor: Colors.primary.dark, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
    },
    confirmText: { fontFamily: "Outfit_700Bold", fontSize: 15, color: "#fff" },
});

const viewer = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" },
    closeBtn: { position: "absolute", top: 52, right: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
    img: { width: "92%", height: "75%" },
});

const cash = StyleSheet.create({
    overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
    sheet: { backgroundColor: Colors.screen.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingBottom: 36, borderTopWidth: 1, borderTopColor: Colors.screen.border },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.screen.border, alignSelf: "center", marginTop: 12, marginBottom: 18 },
    header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
    headerIconWrap: { width: 44, height: 44, borderRadius: 13, backgroundColor: "#F0FDF4", borderWidth: 1.5, borderColor: "#BBF7D0", alignItems: "center", justifyContent: "center" },
    headerTitle: { fontFamily: "Outfit_700Bold", fontSize: 16, color: Colors.screen.textPrimary },
    headerSub: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted, marginTop: 1 },
    closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.neutral[100], borderWidth: 1, borderColor: Colors.screen.border, alignItems: "center", justifyContent: "center" },
    infoRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
    infoPill: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: Colors.primary.soft, borderRadius: 12, borderWidth: 1, borderColor: Colors.primary.muted },
    infoPillText: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: Colors.primary.dark, flex: 1 },
    expectedNote: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F0F9FF", borderRadius: 8, borderWidth: 1, borderColor: "#BAE6FD", paddingHorizontal: 10, paddingVertical: 7, marginBottom: 12 },
    expectedNoteText: { fontFamily: "Outfit_400Regular", fontSize: 12, color: "#0C4A6E" },
    divider: { height: 1, backgroundColor: Colors.screen.border, marginBottom: 18 },
    fieldWrap: { marginBottom: 14 },
    fieldLabel: { fontFamily: "Outfit_700Bold", fontSize: 11, color: Colors.screen.textSecondary, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 },
    inputRow: { flexDirection: "row", alignItems: "center", height: 60, borderRadius: 14, borderWidth: 2, borderColor: "#16A34A", backgroundColor: "#F0FDF4", paddingHorizontal: 16, gap: 6 },
    inputRowError: { borderColor: Colors.status.error, backgroundColor: Colors.status.errorBg },
    currencySymbol: { fontFamily: "Outfit_800ExtraBold", fontSize: 24, color: "#16A34A" },
    input: { flex: 1, fontFamily: "Outfit_800ExtraBold", fontSize: 28, color: Colors.screen.textPrimary },
    errorRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
    errorText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.status.error },
    notice: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: Colors.primary.soft, borderRadius: 10, borderWidth: 1, borderColor: Colors.primary.muted, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 20 },
    noticeText: { flex: 1, fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.primary.dark, lineHeight: 17 },
    actions: { flexDirection: "row", gap: 10 },
    cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", backgroundColor: Colors.screen.bg, borderWidth: 1, borderColor: Colors.screen.border },
    cancelText: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.screen.textSecondary },
    confirmBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: "#16A34A", shadowColor: "#16A34A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
    confirmText: { fontFamily: "Outfit_700Bold", fontSize: 15, color: "#fff" },
});