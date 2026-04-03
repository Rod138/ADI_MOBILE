import InputField from "@/components/InputField";
import PrimaryButton from "@/components/PrimaryButton";
import { Colors } from "@/constants/colors";
import { useMonthlyQuota } from "@/hooks/useMonthlyQuota";
import { notifyQuotaPublished } from "@/hooks/useNotificationSender";
import { MONTHS, MONTH_ORDER } from "@/hooks/useRecipes";
import { useTowerFund } from "@/hooks/useTowerFund";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// ── Constants ─────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH_NAME = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
][new Date().getMonth()];
const YEARS = [CURRENT_YEAR, CURRENT_YEAR + 1];
const MONTH_NAMES_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MONTH_NAMES_FULL = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function formatCurrency(n: number) {
    return `$${Number(n).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}

/**
 * Dado el startDate del fondo, devuelve un Set de claves "MesNombre-año"
 * de períodos habilitados (desde startDate hasta el año siguiente).
 * Incluye también el año siguiente completo (para cuotas futuras).
 */
function buildEnabledPeriods(startDate: string | null): Set<string> {
    if (!startDate) return new Set(); // Si no hay fondo, ninguno habilitado

    const start = new Date(startDate);
    const startYear = start.getFullYear();
    const startMonthIdx = start.getMonth(); // 0-indexed

    const enabled = new Set<string>();

    // Desde startDate hasta fin del próximo año
    const endYear = CURRENT_YEAR + 1;
    const MONTH_NAMES_ALL = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
    ];

    for (let y = startYear; y <= endYear; y++) {
        for (let m = 0; m < 12; m++) {
            if (y === startYear && m < startMonthIdx) continue; // Antes del inicio
            enabled.add(`${MONTH_NAMES_ALL[m]}-${y}`);
        }
    }

    return enabled;
}

// ── Date Picker Modal ─────────────────────────────────────────────────────────

function DatePickerModal({
    visible, selectedDate, onSelect, onClose, title,
}: {
    visible: boolean; selectedDate: string;
    onSelect: (date: string) => void; onClose: () => void; title: string;
}) {
    const parsed = selectedDate ? new Date(selectedDate) : new Date();
    const [selYear, setSelYear] = useState(parsed.getFullYear());
    const [selMonth, setSelMonth] = useState(parsed.getMonth());
    const [selDay, setSelDay] = useState(parsed.getDate());
    const years = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];
    const daysInMonth = new Date(selYear, selMonth + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const handleConfirm = () => {
        const d = new Date(selYear, selMonth, selDay, 0, 0, 0);
        onSelect(d.toISOString());
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={dpk.overlay}>
                <View style={dpk.sheet}>
                    <View style={dpk.handle} />
                    <Text style={dpk.title}>{title}</Text>
                    <Text style={dpk.sectionLabel}>AÑO</Text>
                    <View style={dpk.yearRow}>
                        {years.map(y => (
                            <TouchableOpacity key={y} style={[dpk.yearBtn, selYear === y && dpk.yearBtnActive]}
                                onPress={() => setSelYear(y)} activeOpacity={0.8}>
                                <Text style={[dpk.yearBtnText, selYear === y && dpk.yearBtnTextActive]}>{y}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={dpk.sectionLabel}>MES</Text>
                    <View style={dpk.monthGrid}>
                        {MONTH_NAMES_SHORT.map((m, i) => (
                            <TouchableOpacity key={i} style={[dpk.monthBtn, selMonth === i && dpk.monthBtnActive]}
                                onPress={() => {
                                    setSelMonth(i);
                                    const max = new Date(selYear, i + 1, 0).getDate();
                                    if (selDay > max) setSelDay(max);
                                }} activeOpacity={0.8}>
                                <Text style={[dpk.monthBtnText, selMonth === i && dpk.monthBtnTextActive]}>{m}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={dpk.sectionLabel}>DÍA</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={dpk.dayScroll}>
                        <View style={dpk.dayRow}>
                            {days.map(d => (
                                <TouchableOpacity key={d} style={[dpk.dayBtn, selDay === d && dpk.dayBtnActive]}
                                    onPress={() => setSelDay(d)} activeOpacity={0.8}>
                                    <Text style={[dpk.dayBtnText, selDay === d && dpk.dayBtnTextActive]}>{d}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                    <View style={dpk.preview}>
                        <Ionicons name="calendar-outline" size={14} color={Colors.primary.main} />
                        <Text style={dpk.previewText}>
                            {selDay} de {MONTH_NAMES_FULL[selMonth]} de {selYear}
                        </Text>
                    </View>
                    <View style={dpk.actions}>
                        <TouchableOpacity style={dpk.cancelBtn} onPress={onClose} activeOpacity={0.8}>
                            <Text style={dpk.cancelText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={dpk.confirmBtn} onPress={handleConfirm} activeOpacity={0.8}>
                            <Text style={dpk.confirmText}>Confirmar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ── Tower Fund Section ────────────────────────────────────────────────────────

function TowerFundSection({ onFundSaved }: { onFundSaved?: (startDate: string) => void }) {
    const { fund, isLoading, fetchFund, initFund, updateFund } = useTowerFund();
    const [amount, setAmount] = useState("");
    const [amountError, setAmountError] = useState<string | undefined>();
    const [startDate, setStartDate] = useState(new Date().toISOString());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [saving, setSaving] = useState(false);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        fetchFund().then(f => {
            if (f) {
                setAmount(String(f.initial_amount));
                setStartDate(f.updated_at);
                setInitialized(true);
            }
        });
    }, []);

    const validate = () => {
        if (!amount.trim()) { setAmountError("Ingresa el monto del fondo."); return false; }
        const n = parseFloat(amount.replace(/,/g, ""));
        if (isNaN(n) || n < 0) { setAmountError("El monto debe ser 0 o mayor."); return false; }
        return true;
    };

    const handleSave = () => {
        if (!validate()) return;
        const parsedAmount = parseFloat(amount.replace(/,/g, ""));
        Alert.alert(
            initialized ? "Actualizar fondo inicial" : "Configurar fondo inicial",
            `¿${initialized ? "Actualizar" : "Configurar"} el fondo inicial a ${formatCurrency(parsedAmount)}?\n\nFecha de inicio: ${formatDate(startDate)}\n\nA partir de esta fecha se calcularán todos los movimientos y los períodos disponibles para cuotas.`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Confirmar", onPress: async () => {
                        setSaving(true);
                        const ok = initialized && fund
                            ? await updateFund(parsedAmount, startDate)
                            : await initFund(parsedAmount, startDate);
                        setSaving(false);
                        if (ok) {
                            setInitialized(true);
                            onFundSaved?.(startDate);
                            Alert.alert("¡Listo!", `Fondo ${initialized ? "actualizado" : "configurado"} correctamente.\n\nLos períodos para cuotas se han actualizado.`);
                        } else {
                            Alert.alert("Error", "No se pudo guardar el fondo. Intenta de nuevo.");
                        }
                    }
                },
            ]
        );
    };

    return (
        <View style={fundSec.card}>
            {/* Header */}
            <View style={fundSec.header}>
                <View style={fundSec.iconWrap}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#7C3AED" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={fundSec.title}>Fondo inicial de la torre</Text>
                    <Text style={fundSec.subtitle}>
                        {initialized ? `Configurado · Inicio: ${formatDate(startDate)}` : "Sin configurar — requerido para el balance"}
                    </Text>
                </View>
                {initialized && (
                    <View style={fundSec.badge}>
                        <Ionicons name="checkmark-circle" size={13} color="#7C3AED" />
                        <Text style={fundSec.badgeText}>Activo</Text>
                    </View>
                )}
            </View>

            {/* Monto actual */}
            {initialized && fund && (
                <View style={fundSec.currentRow}>
                    <Text style={fundSec.currentLabel}>Monto actual</Text>
                    <Text style={fundSec.currentValue}>{formatCurrency(fund.initial_amount)}</Text>
                </View>
            )}

            {/* Info */}
            <View style={fundSec.infoBanner}>
                <Ionicons name="information-circle-outline" size={14} color="#7C3AED" />
                <Text style={fundSec.infoText}>
                    El fondo inicial es el saldo de arranque de la torre. La <Text style={{ fontFamily: "Outfit_700Bold" }}>Fecha de inicio del cálculo</Text> también determina desde qué mes se pueden registrar cuotas.
                </Text>
            </View>

            {/* Input monto */}
            <InputField
                theme="light"
                label="MONTO INICIAL (MXN)"
                placeholder="Ej. 50000  (puede ser 0)"
                leftIcon="wallet-outline"
                keyboardType="decimal-pad"
                maxLength={12}
                value={amount}
                onChangeText={t => { setAmount(t.replace(/[^0-9.]/g, "")); setAmountError(undefined); }}
                error={amountError}
            />

            {/* Fecha de inicio */}
            <View style={fundSec.dateField}>
                <Text style={fundSec.dateLabel}>FECHA DE INICIO DEL CÁLCULO</Text>
                <TouchableOpacity style={fundSec.dateTrigger} onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
                    <Ionicons name="calendar-outline" size={17} color={Colors.primary.main} />
                    <Text style={fundSec.dateTriggerText}>{formatDate(startDate)}</Text>
                    <Ionicons name="chevron-down" size={14} color={Colors.screen.iconMuted} />
                </TouchableOpacity>
                <Text style={fundSec.dateHint}>
                    Solo se contabilizarán movimientos posteriores a esta fecha. Los períodos de cuotas comenzarán desde este mes.
                </Text>
            </View>

            {saving || isLoading ? (
                <View style={fundSec.loadingRow}>
                    <ActivityIndicator size="small" color="#7C3AED" />
                    <Text style={fundSec.loadingText}>Guardando...</Text>
                </View>
            ) : (
                <TouchableOpacity style={fundSec.saveBtn} onPress={handleSave} activeOpacity={0.85}>
                    <Ionicons name={initialized ? "refresh-outline" : "checkmark-circle-outline"} size={18} color="#fff" />
                    <Text style={fundSec.saveBtnText}>{initialized ? "Actualizar fondo" : "Configurar fondo"}</Text>
                </TouchableOpacity>
            )}

            <DatePickerModal
                visible={showDatePicker}
                selectedDate={startDate}
                onSelect={setStartDate}
                onClose={() => setShowDatePicker(false)}
                title="Fecha de inicio del cálculo"
            />
        </View>
    );
}

// ── Month Grid (con restricción de fecha de inicio) ───────────────────────────

function MonthGrid({
    selectedMonth, selectedYear, existingQuotas,
    onSelectMonth, onSelectYear, enabledPeriods, fundConfigured,
}: {
    selectedMonth: string; selectedYear: number;
    existingQuotas: Array<{ month: string; year: number; amount: number }>;
    onSelectMonth: (m: string) => void; onSelectYear: (y: number) => void;
    enabledPeriods: Set<string>;
    fundConfigured: boolean;
}) {
    return (
        <View>
            {/* Aviso si no hay fondo configurado */}
            {!fundConfigured && (
                <View style={grid.noFundNote}>
                    <Ionicons name="warning-outline" size={14} color={Colors.status.warning} />
                    <Text style={grid.noFundNoteText}>
                        Configura el fondo inicial primero para habilitar los períodos.
                    </Text>
                </View>
            )}

            <View style={grid.yearRow}>
                {YEARS.map(y => (
                    <TouchableOpacity key={y} style={[grid.yearBtn, selectedYear === y && grid.yearBtnActive]}
                        onPress={() => onSelectYear(y)} activeOpacity={0.8}>
                        <Text style={[grid.yearBtnText, selectedYear === y && grid.yearBtnTextActive]}>{y}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={grid.monthGrid}>
                {MONTHS.map(m => {
                    const periodKey = `${m.value}-${selectedYear}`;
                    const isEnabled = !fundConfigured ? false : enabledPeriods.has(periodKey);
                    const existing = existingQuotas.find(q => q.month === m.value && q.year === selectedYear);
                    const isSelected = selectedMonth === m.value;
                    const isCurrent = m.value === CURRENT_MONTH_NAME && selectedYear === CURRENT_YEAR;

                    return (
                        <TouchableOpacity key={m.value}
                            style={[
                                grid.monthBtn,
                                isSelected && grid.monthBtnActive,
                                existing && !isSelected && grid.monthBtnHasQuota,
                                !isEnabled && grid.monthBtnDisabled,
                            ]}
                            onPress={() => isEnabled && onSelectMonth(m.value)}
                            activeOpacity={isEnabled ? 0.8 : 1}
                            disabled={!isEnabled}
                        >
                            <Text style={[
                                grid.monthText,
                                isSelected && grid.monthTextActive,
                                existing && !isSelected && grid.monthTextHasQuota,
                                !isEnabled && grid.monthTextDisabled,
                            ]}>
                                {m.label.slice(0, 3)}
                            </Text>
                            {isCurrent && !isSelected && isEnabled && <View style={grid.currentDot} />}
                            {existing && isEnabled && (
                                <Text style={[grid.quotaAmount, isSelected && { color: "#fff" }]}>
                                    {formatCurrency(existing.amount)}
                                </Text>
                            )}
                            {!isEnabled && (
                                <Ionicons name="lock-closed" size={8} color={Colors.screen.textMuted} style={{ opacity: 0.5 }} />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {fundConfigured && (
                <View style={grid.legendRow}>
                    <View style={grid.legendItem}>
                        <View style={[grid.legendDot, { backgroundColor: Colors.primary.soft, borderColor: Colors.primary.muted, borderWidth: 1 }]} />
                        <Text style={grid.legendText}>Con cuota</Text>
                    </View>
                    <View style={grid.legendItem}>
                        <View style={[grid.legendDot, { backgroundColor: Colors.screen.border }]} />
                        <Text style={grid.legendText}>Bloqueado</Text>
                    </View>
                </View>
            )}
        </View>
    );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function AdminQuotaScreen() {
    const { quotas, isLoading, fetchAllQuotas, createQuota, updateQuota } = useMonthlyQuota();
    const { fetchFund } = useTowerFund();

    const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH_NAME);
    const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
    const [amount, setAmount] = useState("");
    const [amountError, setAmountError] = useState<string | undefined>();
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<"fondo" | "cuota">("fondo");

    // Períodos habilitados según fecha de inicio del fondo
    const [enabledPeriods, setEnabledPeriods] = useState<Set<string>>(new Set());
    const [fundConfigured, setFundConfigured] = useState(false);
    const [fundStartDate, setFundStartDate] = useState<string | null>(null);

    const loadFundPeriods = async (startDate?: string) => {
        try {
            const fund = await fetchFund();
            const sd = startDate ?? (fund as any)?.updated_at ?? null;
            setFundStartDate(sd);
            setFundConfigured(!!sd);
            setEnabledPeriods(buildEnabledPeriods(sd));

            // Si el mes seleccionado no está habilitado, mover al primer mes habilitado
            if (sd) {
                const start = new Date(sd);
                const startY = start.getFullYear();
                const startM = start.getMonth();
                const curMonthIdx = MONTH_NAMES_FULL.indexOf(CURRENT_MONTH_NAME);
                // Si el mes actual está habilitado, usarlo; si no, usar el mes de inicio
                if (CURRENT_YEAR > startY || (CURRENT_YEAR === startY && curMonthIdx >= startM)) {
                    setSelectedMonth(CURRENT_MONTH_NAME);
                    setSelectedYear(CURRENT_YEAR);
                } else {
                    setSelectedMonth(MONTH_NAMES_FULL[startM]);
                    setSelectedYear(startY);
                }
            }
        } catch {
            setFundConfigured(false);
            setEnabledPeriods(new Set());
        }
    };

    useEffect(() => {
        fetchAllQuotas();
        loadFundPeriods();
    }, []);

    const existingQuota = useMemo(
        () => quotas.find(q => q.month === selectedMonth && q.year === selectedYear) ?? null,
        [quotas, selectedMonth, selectedYear]
    );

    useEffect(() => {
        setAmount(existingQuota ? String(existingQuota.amount) : "");
        setAmountError(undefined);
    }, [existingQuota, selectedMonth, selectedYear]);

    const handleSave = async () => {
        if (!amount.trim()) { setAmountError("Ingresa el monto de la cuota."); return; }
        const n = parseFloat(amount.replace(/,/g, ""));
        if (isNaN(n) || n <= 0) { setAmountError("El monto debe ser mayor a 0."); return; }

        Alert.alert(
            existingQuota ? "Actualizar cuota" : "Crear cuota",
            `¿${existingQuota ? "Actualizar" : "Registrar"} la cuota de ${selectedMonth} ${selectedYear} a ${formatCurrency(n)}?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Confirmar", onPress: async () => {
                        setSaving(true);
                        const ok = existingQuota
                            ? await updateQuota(existingQuota.id, n)
                            : await createQuota(selectedMonth, selectedYear, n);
                        setSaving(false);
                        if (ok) {
                            if (!existingQuota) {
                                notifyQuotaPublished({
                                    month: selectedMonth,
                                    year: selectedYear,
                                    amount: n,
                                }).catch(() => { });
                            }
                            Alert.alert("¡Listo!", `Cuota de ${selectedMonth} ${selectedYear} ${existingQuota ? "actualizada" : "registrada"}.`);
                            fetchAllQuotas();
                        } else {
                            Alert.alert("Error", "No se pudo guardar la cuota.");
                        }
                    }
                },
            ]
        );
    };

    const existingQuotasList = useMemo(() => quotas.map(q => ({ month: q.month, year: q.year, amount: q.amount })), [quotas]);
    const sortedQuotas = useMemo(() =>
        [...quotas].sort((a, b) => a.year !== b.year ? b.year - a.year : (MONTH_ORDER[b.month] ?? 0) - (MONTH_ORDER[a.month] ?? 0)),
        [quotas]
    );

    // Cuotas visibles en historial (solo las habilitadas por el fondo)
    const filteredHistoryQuotas = useMemo(() =>
        sortedQuotas.filter(q => enabledPeriods.has(`${q.month}-${q.year}`)),
        [sortedQuotas, enabledPeriods]
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
                        <Text style={styles.headerTitle}>Configuración financiera</Text>
                        <Text style={styles.headerSubtitle}>Fondo inicial y cuotas mensuales</Text>
                    </View>
                    {isLoading && <ActivityIndicator size="small" color={Colors.primary.main} />}
                </View>

                {/* Tabs */}
                <View style={styles.tabBar}>
                    {([
                        { key: "fondo", label: "Fondo inicial", icon: "shield-checkmark-outline", activeColor: "#7C3AED" },
                        { key: "cuota", label: "Cuota mensual", icon: "calculator-outline", activeColor: Colors.primary.dark },
                    ] as const).map(tab => (
                        <TouchableOpacity key={tab.key}
                            style={[styles.tab, activeTab === tab.key && { borderBottomColor: tab.activeColor }]}
                            onPress={() => setActiveTab(tab.key)} activeOpacity={0.8}>
                            <Ionicons name={tab.icon} size={15} color={activeTab === tab.key ? tab.activeColor : Colors.screen.textMuted} />
                            <Text style={[styles.tabText, activeTab === tab.key && { color: tab.activeColor }]}>{tab.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                    {activeTab === "fondo" && (
                        <TowerFundSection
                            onFundSaved={(startDate) => {
                                loadFundPeriods(startDate);
                                // Cambiar a pestaña de cuota para que el admin la configure
                                setTimeout(() => setActiveTab("cuota"), 600);
                            }}
                        />
                    )}

                    {activeTab === "cuota" && (
                        <>
                            <View style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <View style={[styles.cardIconWrap, { backgroundColor: "#F0F9FF", borderColor: "#BAE6FD" }]}>
                                        <Ionicons name="calendar-outline" size={18} color="#0891B2" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.cardTitle}>Selecciona el período</Text>
                                        <Text style={styles.cardSubtitle}>
                                            {fundConfigured
                                                ? "Solo los meses desde la fecha de inicio están habilitados"
                                                : "Configura el fondo inicial para habilitar períodos"}
                                        </Text>
                                    </View>
                                </View>
                                <MonthGrid
                                    selectedMonth={selectedMonth}
                                    selectedYear={selectedYear}
                                    existingQuotas={existingQuotasList}
                                    onSelectMonth={setSelectedMonth}
                                    onSelectYear={setSelectedYear}
                                    enabledPeriods={enabledPeriods}
                                    fundConfigured={fundConfigured}
                                />
                            </View>

                            {/* Formulario de cuota — solo si el período está habilitado */}
                            {fundConfigured && enabledPeriods.has(`${selectedMonth}-${selectedYear}`) ? (
                                <View style={[styles.card, { borderTopWidth: 3, borderTopColor: Colors.primary.main }]}>
                                    <View style={styles.cardHeader}>
                                        <View style={[styles.cardIconWrap, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
                                            <Ionicons name="cash-outline" size={18} color={Colors.status.success} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.cardTitle}>{existingQuota ? "Editar cuota" : "Nueva cuota"}</Text>
                                            <Text style={styles.cardSubtitle}>
                                                {selectedMonth} {selectedYear}
                                                {existingQuota ? ` · Actual: ${formatCurrency(existingQuota.amount)}` : " · Sin registrar"}
                                            </Text>
                                        </View>
                                        {existingQuota && (
                                            <View style={styles.existingBadge}>
                                                <Ionicons name="checkmark-circle" size={12} color={Colors.status.success} />
                                                <Text style={styles.existingBadgeText}>Registrada</Text>
                                            </View>
                                        )}
                                    </View>
                                    <InputField theme="light" label="MONTO DE LA CUOTA (MXN)" placeholder="Ej. 1500"
                                        leftIcon="cash-outline" keyboardType="decimal-pad" maxLength={8}
                                        value={amount}
                                        onChangeText={t => { setAmount(t.replace(/[^0-9.]/g, "")); setAmountError(undefined); }}
                                        error={amountError} />
                                    {saving ? (
                                        <View style={styles.loadingRow}>
                                            <ActivityIndicator size="small" color={Colors.primary.main} />
                                            <Text style={styles.loadingText}>Guardando cuota...</Text>
                                        </View>
                                    ) : (
                                        <PrimaryButton label={existingQuota ? "Actualizar cuota" : "Registrar cuota"} onPress={handleSave} disabled={saving} />
                                    )}
                                </View>
                            ) : fundConfigured ? (
                                <View style={styles.blockedNote}>
                                    <Ionicons name="lock-closed-outline" size={16} color={Colors.screen.textMuted} />
                                    <Text style={styles.blockedNoteText}>
                                        Este período está fuera del rango definido por la fecha de inicio del fondo.
                                        Cambia la fecha de inicio en la pestaña "Fondo inicial" para habilitarlo.
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.blockedNote}>
                                    <Ionicons name="warning-outline" size={16} color={Colors.status.warning} />
                                    <Text style={[styles.blockedNoteText, { color: Colors.status.warning }]}>
                                        Configura el fondo inicial primero para registrar cuotas.
                                    </Text>
                                    <TouchableOpacity onPress={() => setActiveTab("fondo")} activeOpacity={0.8}>
                                        <Text style={styles.blockedNoteLink}>Ir al fondo →</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {filteredHistoryQuotas.length > 0 && (
                                <View style={styles.card}>
                                    <View style={styles.cardHeader}>
                                        <View style={[styles.cardIconWrap, { backgroundColor: Colors.secondary.soft, borderColor: "#FED7AA" }]}>
                                            <Ionicons name="time-outline" size={18} color={Colors.secondary.main} />
                                        </View>
                                        <View>
                                            <Text style={styles.cardTitle}>Historial</Text>
                                            <Text style={styles.cardSubtitle}>{filteredHistoryQuotas.length} períodos registrados</Text>
                                        </View>
                                    </View>
                                    <View style={styles.historyList}>
                                        {filteredHistoryQuotas.map((q, i) => (
                                            <TouchableOpacity key={q.id}
                                                style={[styles.historyRow, i < filteredHistoryQuotas.length - 1 && styles.historyRowBorder]}
                                                onPress={() => {
                                                    setSelectedMonth(q.month);
                                                    setSelectedYear(q.year);
                                                }}
                                                activeOpacity={0.7}>
                                                <View style={styles.historyLeft}>
                                                    <Text style={styles.historyPeriod}>{q.month} {q.year}</Text>
                                                    {q.month === CURRENT_MONTH_NAME && q.year === CURRENT_YEAR && (
                                                        <View style={styles.currentTag}>
                                                            <Text style={styles.currentTagText}>Actual</Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <Text style={styles.historyAmount}>{formatCurrency(q.amount)}</Text>
                                                <Ionicons name="chevron-forward" size={14} color={Colors.screen.textMuted} />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}
                        </>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

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
    tabBar: {
        flexDirection: "row", backgroundColor: Colors.screen.card,
        borderBottomWidth: 1, borderBottomColor: Colors.screen.border, paddingHorizontal: 16,
    },
    tab: {
        flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent",
    },
    tabText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.screen.textMuted },
    scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, gap: 12 },
    card: {
        backgroundColor: Colors.screen.card, borderRadius: 16,
        borderWidth: 1, borderColor: Colors.screen.border, padding: 16,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, gap: 14,
    },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
    cardIconWrap: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: "#F0F9FF", borderWidth: 1, borderColor: "#BAE6FD",
        alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    cardTitle: { fontFamily: "Outfit_700Bold", fontSize: 14, color: Colors.screen.textPrimary },
    cardSubtitle: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted, marginTop: 2 },
    existingBadge: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
        backgroundColor: Colors.status.successBg, borderWidth: 1, borderColor: Colors.status.successBorder,
    },
    existingBadgeText: { fontFamily: "Outfit_600SemiBold", fontSize: 10, color: Colors.status.success },
    loadingRow: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 14,
    },
    loadingText: { fontFamily: "Outfit_500Medium", fontSize: 14, color: Colors.primary.main },
    blockedNote: {
        flexDirection: "row", alignItems: "flex-start", gap: 10,
        backgroundColor: Colors.neutral[100], borderRadius: 12,
        borderWidth: 1, borderColor: Colors.screen.border,
        paddingHorizontal: 14, paddingVertical: 12,
    },
    blockedNoteText: {
        flex: 1, fontFamily: "Outfit_400Regular", fontSize: 12,
        color: Colors.screen.textMuted, lineHeight: 18,
    },
    blockedNoteLink: {
        fontFamily: "Outfit_700Bold", fontSize: 12, color: Colors.primary.dark, marginTop: 6,
    },
    historyList: { gap: 0 },
    historyRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
    historyRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.screen.border },
    historyLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
    historyPeriod: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.screen.textPrimary },
    historyAmount: { fontFamily: "Outfit_700Bold", fontSize: 14, color: Colors.primary.dark },
    currentTag: {
        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
        backgroundColor: Colors.primary.soft, borderWidth: 1, borderColor: Colors.primary.muted,
    },
    currentTagText: { fontFamily: "Outfit_700Bold", fontSize: 9, color: Colors.primary.dark },
});

const fundSec = StyleSheet.create({
    card: {
        backgroundColor: Colors.screen.card, borderRadius: 16,
        borderWidth: 1, borderColor: "#DDD6FE", padding: 16,
        borderTopWidth: 3, borderTopColor: "#7C3AED",
        shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1, shadowRadius: 8, elevation: 3, gap: 14,
    },
    header: { flexDirection: "row", alignItems: "center", gap: 12 },
    iconWrap: {
        width: 44, height: 44, borderRadius: 13,
        backgroundColor: "#F5F3FF", borderWidth: 1.5, borderColor: "#DDD6FE",
        alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    title: { fontFamily: "Outfit_700Bold", fontSize: 15, color: Colors.screen.textPrimary },
    subtitle: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted, marginTop: 2 },
    badge: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
        backgroundColor: "#F5F3FF", borderWidth: 1, borderColor: "#DDD6FE",
    },
    badgeText: { fontFamily: "Outfit_600SemiBold", fontSize: 10, color: "#7C3AED" },
    currentRow: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        backgroundColor: "#F5F3FF", borderRadius: 10, borderWidth: 1, borderColor: "#DDD6FE",
        paddingHorizontal: 14, paddingVertical: 10,
    },
    currentLabel: { fontFamily: "Outfit_500Medium", fontSize: 12, color: "#7C3AED" },
    currentValue: { fontFamily: "Outfit_800ExtraBold", fontSize: 20, color: "#7C3AED" },
    infoBanner: {
        flexDirection: "row", alignItems: "flex-start", gap: 8,
        backgroundColor: "#F5F3FF", borderWidth: 1, borderColor: "#DDD6FE",
        borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    },
    infoText: { flex: 1, fontFamily: "Outfit_400Regular", fontSize: 12, color: "#5B21B6", lineHeight: 18 },
    dateField: { gap: 8 },
    dateLabel: {
        fontFamily: "Outfit_700Bold", fontSize: 11,
        color: Colors.screen.textSecondary, letterSpacing: 1.2, textTransform: "uppercase",
    },
    dateTrigger: {
        flexDirection: "row", alignItems: "center", gap: 10,
        height: 52, borderRadius: 12, paddingHorizontal: 14,
        borderWidth: 1.5, borderColor: Colors.primary.muted, backgroundColor: Colors.primary.soft,
    },
    dateTriggerText: { flex: 1, fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.primary.dark },
    dateHint: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted, lineHeight: 16 },
    loadingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 14 },
    loadingText: { fontFamily: "Outfit_500Medium", fontSize: 14, color: "#7C3AED" },
    saveBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        paddingVertical: 14, borderRadius: 13, backgroundColor: "#7C3AED",
        shadowColor: "#7C3AED", shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
    },
    saveBtnText: { fontFamily: "Outfit_700Bold", fontSize: 15, color: "#fff" },
});

const grid = StyleSheet.create({
    noFundNote: {
        flexDirection: "row", alignItems: "flex-start", gap: 8,
        backgroundColor: Colors.status.warningBg, borderRadius: 10,
        borderWidth: 1, borderColor: Colors.status.warningBorder,
        paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
    },
    noFundNoteText: {
        flex: 1, fontFamily: "Outfit_400Regular", fontSize: 12,
        color: Colors.status.warning, lineHeight: 17,
    },
    yearRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
    yearBtn: {
        flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center",
        backgroundColor: Colors.screen.bg, borderWidth: 1, borderColor: Colors.screen.border,
    },
    yearBtnActive: { backgroundColor: "#0891B2", borderColor: "#0891B2" },
    yearBtnText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.screen.textSecondary },
    yearBtnTextActive: { color: "#fff" },
    monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    monthBtn: {
        width: "22%", paddingVertical: 10, paddingHorizontal: 4, alignItems: "center",
        borderRadius: 10, backgroundColor: Colors.screen.bg, borderWidth: 1, borderColor: Colors.screen.border, gap: 2,
    },
    monthBtnActive: { backgroundColor: "#0891B2", borderColor: "#0891B2" },
    monthBtnHasQuota: { backgroundColor: Colors.primary.soft, borderColor: Colors.primary.muted },
    monthBtnDisabled: { backgroundColor: Colors.neutral[50], borderColor: Colors.screen.border, opacity: 0.45 },
    monthText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.screen.textSecondary },
    monthTextActive: { fontFamily: "Outfit_700Bold", color: "#fff" },
    monthTextHasQuota: { fontFamily: "Outfit_600SemiBold", color: Colors.primary.dark },
    monthTextDisabled: { color: Colors.screen.textMuted },
    currentDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.secondary.main },
    quotaAmount: { fontFamily: "Outfit_500Medium", fontSize: 9, color: Colors.primary.dark, textAlign: "center" },
    legendRow: { flexDirection: "row", gap: 12, marginTop: 10, justifyContent: "flex-end" },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
    legendDot: { width: 10, height: 10, borderRadius: 3 },
    legendText: { fontFamily: "Outfit_400Regular", fontSize: 10, color: Colors.screen.textMuted },
});

const dpk = StyleSheet.create({
    overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
    sheet: {
        backgroundColor: Colors.screen.card, borderTopLeftRadius: 26, borderTopRightRadius: 26,
        paddingHorizontal: 20, paddingBottom: 36, borderTopWidth: 1, borderTopColor: Colors.screen.border,
    },
    handle: {
        width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.screen.border,
        alignSelf: "center", marginTop: 12, marginBottom: 16,
    },
    title: { fontFamily: "Outfit_700Bold", fontSize: 16, color: Colors.screen.textPrimary, marginBottom: 16 },
    sectionLabel: {
        fontFamily: "Outfit_700Bold", fontSize: 10, color: Colors.screen.textMuted,
        letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8, marginTop: 4,
    },
    yearRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
    yearBtn: {
        flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center",
        backgroundColor: Colors.screen.bg, borderWidth: 1, borderColor: Colors.screen.border,
    },
    yearBtnActive: { backgroundColor: Colors.primary.main, borderColor: Colors.primary.main },
    yearBtnText: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.screen.textSecondary },
    yearBtnTextActive: { color: "#fff" },
    monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
    monthBtn: {
        width: "22%", paddingVertical: 10, alignItems: "center", borderRadius: 10,
        backgroundColor: Colors.screen.bg, borderWidth: 1, borderColor: Colors.screen.border,
    },
    monthBtnActive: { backgroundColor: Colors.primary.main, borderColor: Colors.primary.main },
    monthBtnText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.screen.textSecondary },
    monthBtnTextActive: { fontFamily: "Outfit_700Bold", color: "#fff" },
    dayScroll: { marginBottom: 8 },
    dayRow: { flexDirection: "row", gap: 6, paddingVertical: 4 },
    dayBtn: {
        width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center",
        backgroundColor: Colors.screen.bg, borderWidth: 1, borderColor: Colors.screen.border,
    },
    dayBtnActive: { backgroundColor: Colors.primary.main, borderColor: Colors.primary.main },
    dayBtnText: { fontFamily: "Outfit_500Medium", fontSize: 13, color: Colors.screen.textSecondary },
    dayBtnTextActive: { fontFamily: "Outfit_700Bold", color: "#fff" },
    preview: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: Colors.primary.soft, borderRadius: 10,
        borderWidth: 1, borderColor: Colors.primary.muted,
        paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16,
    },
    previewText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.primary.dark },
    actions: { flexDirection: "row", gap: 10 },
    cancelBtn: {
        flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center",
        backgroundColor: Colors.screen.bg, borderWidth: 1, borderColor: Colors.screen.border,
    },
    cancelText: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.screen.textSecondary },
    confirmBtn: { flex: 2, paddingVertical: 13, borderRadius: 12, alignItems: "center", backgroundColor: Colors.primary.main },
    confirmText: { fontFamily: "Outfit_700Bold", fontSize: 14, color: "#fff" },
});