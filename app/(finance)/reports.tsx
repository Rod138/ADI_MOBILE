import { Colors } from "@/constants/colors";
import { useSession } from "@/context/AuthContext";
import supabase from "@/lib/supabase";
import { generateReportHTML } from "@/utils/generateReportHTML";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import { router } from "expo-router";
import * as Sharing from 'expo-sharing';
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const CURRENT_MONTH = NOW.getMonth(); // 0-indexed

// Generate year range (5 years back, 1 ahead)
const YEARS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR - 5 + i);

type ReportMode = "monthly" | "annual";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DateRange {
    fromYear: number;
    fromMonth: number; // 0-indexed
    toYear: number;
    toMonth: number;   // 0-indexed
}

interface MonthlyReport {
    month: string;
    monthIndex: number;
    year: number;
    income: number;
    expenses: number;
    incidentCosts: number;
    expectedIncome: number;
    deficit: number;
    netFlow: number;
    paymentCount: number;
    paidDepts: number;
    totalDepts: number;
}

interface AnnualSummary {
    totalIncome: number;
    totalExpenses: number;
    totalIncidentCosts: number;
    totalExpected: number;
    totalDeficit: number;
    netFlow: number;
    collectionRate: number;
    bestMonth: string;
    worstMonth: string;
    avgMonthlyExpense: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
    return `$${Number(n).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function fmtShort(n: number): string {
    if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
    if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}k`;
    return fmt(n);
}

function pct(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.min(Math.round((value / total) * 100), 100);
}

/** Returns an array of { year, monthIndex } pairs within the range (inclusive) */
function getMonthsInRange(range: DateRange): { year: number; monthIndex: number }[] {
    const result: { year: number; monthIndex: number }[] = [];
    let y = range.fromYear;
    let m = range.fromMonth;
    while (y < range.toYear || (y === range.toYear && m <= range.toMonth)) {
        result.push({ year: y, monthIndex: m });
        m++;
        if (m > 11) { m = 0; y++; }
    }
    return result;
}

function rangeLabel(range: DateRange, mode: ReportMode): string {
    if (mode === "annual") {
        if (range.fromYear === range.toYear) return `${range.fromYear}`;
        return `${range.fromYear} – ${range.toYear}`;
    }
    const from = `${MONTH_NAMES[range.fromMonth].slice(0, 3)} ${range.fromYear}`;
    const to = `${MONTH_NAMES[range.toMonth].slice(0, 3)} ${range.toYear}`;
    if (from === to) return from;
    return `${from} – ${to}`;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, color, bg, border }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    sub?: string;
    color: string;
    bg: string;
    border: string;
}) {
    return (
        <View style={[kpi.root, { backgroundColor: bg, borderColor: border }]}>
            <View style={[kpi.iconWrap, { backgroundColor: color + "20" }]}>
                <Ionicons name={icon} size={18} color={color} />
            </View>
            <Text style={[kpi.value, { color }]}>{value}</Text>
            <Text style={kpi.label}>{label}</Text>
            {sub && <Text style={kpi.sub}>{sub}</Text>}
        </View>
    );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
    const width = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <View style={pb.track}>
            <View style={[pb.fill, { width: `${width}%`, backgroundColor: color }]} />
        </View>
    );
}

// ─── Month Row ────────────────────────────────────────────────────────────────

function MonthRow({ report, isEven }: { report: MonthlyReport; isEven: boolean }) {
    const coverage = pct(report.income, report.expectedIncome);
    const isPositive = report.netFlow >= 0;

    return (
        <View style={[mrow.root, isEven && mrow.even]}>
            <View style={mrow.monthCol}>
                <Text style={mrow.monthName}>{report.month.slice(0, 3)}</Text>
                <Text style={mrow.monthYear}>{report.year}</Text>
                {report.expectedIncome > 0 && (
                    <View style={[mrow.coveragePill, {
                        backgroundColor: coverage >= 100 ? Colors.status.successBg : Colors.status.warningBg,
                    }]}>
                        <Text style={[mrow.coverageText, {
                            color: coverage >= 100 ? Colors.status.success : Colors.status.warning,
                        }]}>
                            {coverage}%
                        </Text>
                    </View>
                )}
            </View>
            <View style={mrow.incomCol}>
                <Text style={[mrow.amount, { color: Colors.status.success }]}>
                    {fmtShort(report.income)}
                </Text>
                <Text style={mrow.sub}>{report.paidDepts}/{report.totalDepts}</Text>
            </View>
            <View style={mrow.expCol}>
                <Text style={[mrow.amount, { color: Colors.status.error }]}>
                    {fmtShort(report.expenses + report.incidentCosts)}
                </Text>
                {report.incidentCosts > 0 && (
                    <Text style={mrow.sub}>+{fmtShort(report.incidentCosts)} inc.</Text>
                )}
            </View>
            <View style={mrow.netCol}>
                <Text style={[mrow.amount, { color: isPositive ? Colors.primary.dark : Colors.status.error }]}>
                    {isPositive ? "+" : ""}{fmtShort(report.netFlow)}
                </Text>
            </View>
        </View>
    );
}

// ─── Date Range Picker Modal ──────────────────────────────────────────────────

function DateRangePicker({
    visible,
    mode,
    range,
    onApply,
    onClose,
}: {
    visible: boolean;
    mode: ReportMode;
    range: DateRange;
    onApply: (r: DateRange) => void;
    onClose: () => void;
}) {
    const [draft, setDraft] = useState<DateRange>(range);
    const [selecting, setSelecting] = useState<"from" | "to">("from");

    useEffect(() => {
        if (visible) {
            setDraft(range);
            setSelecting("from");
        }
    }, [visible]);

    const setField = (field: "fromYear" | "fromMonth" | "toYear" | "toMonth", val: number) => {
        setDraft(prev => {
            let next = { ...prev, [field]: val };
            // Ensure from <= to
            const fromTs = next.fromYear * 12 + next.fromMonth;
            const toTs = next.toYear * 12 + next.toMonth;
            if (fromTs > toTs) {
                if (field.startsWith("from")) {
                    next = { ...next, toYear: next.fromYear, toMonth: next.fromMonth };
                } else {
                    next = { ...next, fromYear: next.toYear, fromMonth: next.toMonth };
                }
            }
            return next;
        });
    };

    const handleApply = () => {
        onApply(draft);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={drp.overlay}>
                <View style={drp.sheet}>
                    {/* Header */}
                    <View style={drp.sheetHeader}>
                        <View>
                            <Text style={drp.sheetTitle}>Rango de fechas</Text>
                            <Text style={drp.sheetSub}>
                                {mode === "annual" ? "Selecciona años" : "Selecciona meses"}
                            </Text>
                        </View>
                        <TouchableOpacity style={drp.closeBtn} onPress={onClose} activeOpacity={0.7}>
                            <Ionicons name="close" size={18} color={Colors.screen.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Tabs: Desde / Hasta */}
                    <View style={drp.tabs}>
                        {(["from", "to"] as const).map(tab => (
                            <TouchableOpacity
                                key={tab}
                                style={[drp.tab, selecting === tab && drp.tabActive]}
                                onPress={() => setSelecting(tab)}
                                activeOpacity={0.8}
                            >
                                <Ionicons
                                    name={tab === "from" ? "play-forward-outline" : "flag-outline"}
                                    size={13}
                                    color={selecting === tab ? Colors.primary.dark : Colors.screen.textMuted}
                                />
                                <Text style={[drp.tabText, selecting === tab && drp.tabTextActive]}>
                                    {tab === "from" ? "Desde" : "Hasta"}
                                </Text>
                                <Text style={[drp.tabDate, selecting === tab && drp.tabDateActive]}>
                                    {mode === "annual"
                                        ? (tab === "from" ? draft.fromYear : draft.toYear)
                                        : `${MONTH_NAMES[tab === "from" ? draft.fromMonth : draft.toMonth].slice(0, 3)} ${tab === "from" ? draft.fromYear : draft.toYear}`
                                    }
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
                        {/* Month picker (only for monthly mode) */}
                        {mode === "monthly" && (
                            <>
                                <Text style={drp.pickerLabel}>Mes</Text>
                                <View style={drp.monthGrid}>
                                    {MONTH_NAMES.map((name, idx) => {
                                        const current = selecting === "from" ? draft.fromMonth : draft.toMonth;
                                        const isSelected = current === idx;
                                        return (
                                            <TouchableOpacity
                                                key={name}
                                                style={[drp.monthChip, isSelected && drp.monthChipActive]}
                                                onPress={() => setField(selecting === "from" ? "fromMonth" : "toMonth", idx)}
                                                activeOpacity={0.75}
                                            >
                                                <Text style={[drp.monthChipText, isSelected && drp.monthChipTextActive]}>
                                                    {name.slice(0, 3)}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </>
                        )}

                        {/* Year picker */}
                        <Text style={drp.pickerLabel}>Año</Text>
                        <View style={drp.yearList}>
                            {YEARS.map(y => {
                                const current = selecting === "from" ? draft.fromYear : draft.toYear;
                                const isSelected = current === y;
                                return (
                                    <TouchableOpacity
                                        key={y}
                                        style={[drp.yearItem, isSelected && drp.yearItemActive]}
                                        onPress={() => setField(selecting === "from" ? "fromYear" : "toYear", y)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[drp.yearItemText, isSelected && drp.yearItemTextActive]}>{y}</Text>
                                        {isSelected && (
                                            <Ionicons name="checkmark-circle" size={18} color={Colors.primary.main} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>

                    {/* Acciones */}
                    <View style={drp.actions}>
                        <TouchableOpacity style={drp.cancelBtn} onPress={onClose} activeOpacity={0.8}>
                            <Text style={drp.cancelText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={drp.applyBtn} onPress={handleApply} activeOpacity={0.8}>
                            <Ionicons name="checkmark" size={16} color="#fff" />
                            <Text style={drp.applyText}>Aplicar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ReportsScreen() {
    const { user } = useSession();

    const [mode, setMode] = useState<ReportMode>("annual");
    const [range, setRange] = useState<DateRange>({
        fromYear: CURRENT_YEAR,
        fromMonth: 0,
        toYear: CURRENT_YEAR,
        toMonth: CURRENT_MONTH,
    });
    const [showPicker, setShowPicker] = useState(false);

    const [reports, setReports] = useState<MonthlyReport[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeDepts, setActiveDepts] = useState(0);
    const [sharing, setSharing] = useState(false);

    useEffect(() => {
        loadData();
    }, [range, mode]);

    const loadData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Compute effective range
            const effectiveRange: DateRange = mode === "annual"
                ? { fromYear: range.fromYear, fromMonth: 0, toYear: range.toYear, toMonth: 11 }
                : range;

            const rangeStart = new Date(effectiveRange.fromYear, effectiveRange.fromMonth, 1);
            const rangeEnd = new Date(effectiveRange.toYear, effectiveRange.toMonth + 1, 0, 23, 59, 59, 999);
            const startISO = rangeStart.toISOString();
            const endISO = rangeEnd.toISOString();

            // Get all years in range for quota queries
            const yearsInRange: number[] = [];
            for (let y = effectiveRange.fromYear; y <= effectiveRange.toYear; y++) yearsInRange.push(y);

            // Deptos activos
            const { count: deptCount } = await supabase
                .from("departments")
                .select("id", { count: "exact", head: true })
                .eq("is_in_use", true);
            const depts = deptCount ?? 0;
            setActiveDepts(depts);

            // Cuotas validadas del rango
            const { data: quotaPayments } = await supabase
                .from("recipes_payment")
                .select("month, year, amount_paid, dep_id")
                .eq("validated", true)
                .in("year", yearsInRange);

            // Gastos del rango
            const { data: expensesData } = await supabase
                .from("tower_expenses")
                .select("amount, expense_date")
                .gte("expense_date", startISO)
                .lte("expense_date", endISO);

            // Incidencias resueltas del rango
            const { data: incidentsData } = await supabase
                .from("incidents")
                .select("cost, completed_at")
                .gte("completed_at", startISO)
                .lte("completed_at", endISO)
                .not("cost", "is", null);

            // Cuotas configuradas
            const { data: quotaConfig } = await supabase
                .from("monthly_quota")
                .select("month, year, amount")
                .in("year", yearsInRange);

            // Build month-by-month report for all months in range
            const monthsInRange = getMonthsInRange(effectiveRange);

            const monthReports: MonthlyReport[] = monthsInRange.map(({ year, monthIndex }) => {
                const month = MONTH_NAMES[monthIndex];

                const monthPayments = (quotaPayments ?? []).filter(
                    p => p.month === month && p.year === year
                );
                const income = monthPayments.reduce((s, p) => s + Number(p.amount_paid), 0);
                const paidDepts = new Set(monthPayments.map(p => p.dep_id)).size;

                const monthExpenses = (expensesData ?? []).filter(e => {
                    const d = new Date(e.expense_date);
                    return d.getMonth() === monthIndex && d.getFullYear() === year;
                });
                const expenses = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);

                const monthIncidents = (incidentsData ?? []).filter(i => {
                    const d = new Date(i.completed_at);
                    return d.getMonth() === monthIndex && d.getFullYear() === year;
                });
                const incidentCosts = monthIncidents.reduce((s, i) => s + Number(i.cost ?? 0), 0);

                const quotaCfg = (quotaConfig ?? []).find(q => q.month === month && q.year === year);
                const expectedIncome = quotaCfg ? Number(quotaCfg.amount) * depts : 0;
                const deficit = expectedIncome > 0 ? Math.max(expectedIncome - income, 0) : 0;
                const netFlow = income - expenses - incidentCosts;

                return {
                    month, monthIndex, year, income, expenses, incidentCosts,
                    expectedIncome, deficit, netFlow,
                    paymentCount: monthPayments.length,
                    paidDepts, totalDepts: depts,
                };
            });

            setReports(monthReports);
        } catch (e: any) {
            setError(e?.message ?? "Error al cargar los reportes.");
        } finally {
            setIsLoading(false);
        }
    };

    // ── Resumen del período ───────────────────────────────────────────────────
    const annual: AnnualSummary = useMemo(() => {
        const monthsWithData = reports.filter(r => r.income > 0 || r.expenses > 0);
        const totalIncome = reports.reduce((s, r) => s + r.income, 0);
        const totalExpenses = reports.reduce((s, r) => s + r.expenses, 0);
        const totalIncidentCosts = reports.reduce((s, r) => s + r.incidentCosts, 0);
        const totalExpected = reports.reduce((s, r) => s + r.expectedIncome, 0);
        const totalDeficit = reports.reduce((s, r) => s + r.deficit, 0);
        const netFlow = totalIncome - totalExpenses - totalIncidentCosts;
        const collectionRate = pct(totalIncome, totalExpected);

        const sortedByIncome = [...monthsWithData].sort((a, b) => b.income - a.income);
        const bestMonth = sortedByIncome[0]?.month ?? "—";
        const worstMonth = sortedByIncome[sortedByIncome.length - 1]?.month ?? "—";

        const avgMonthlyExpense = monthsWithData.length > 0
            ? (totalExpenses + totalIncidentCosts) / monthsWithData.length
            : 0;

        return {
            totalIncome, totalExpenses, totalIncidentCosts, totalExpected,
            totalDeficit, netFlow, collectionRate, bestMonth, worstMonth, avgMonthlyExpense,
        };
    }, [reports]);

    const activeMonths = useMemo(
        () => reports.filter(r => r.income > 0 || r.expenses > 0 || r.incidentCosts > 0),
        [reports]
    );

    // ── Share ─────────────────────────────────────────────────────────────────

    const handleShare = async () => {
        setSharing(true);
        try {
            const label = rangeLabel(range, mode);

            const html = generateReportHTML({
                label,
                annual,
                activeMonths,
                activeDepts,
                condominioName: "Residencial del Parque",
                towerName: "Torre M",
                // logoBase64: "data:image/png;base64,..." // ← cuando tengas el logo
            });

            const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });

            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(uri, {
                    mimeType: "application/pdf",
                    dialogTitle: `Reporte Financiero ADI — ${label}`,
                    UTI: "com.adobe.pdf",
                });
            }
        } catch (e) {
            console.error("Error generando PDF:", e);
        } finally {
            setSharing(false);
        }
    };

    const currentLabel = rangeLabel(range, mode);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.screen.bg} />
            <SafeAreaView style={{ flex: 1 }}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => router.push("/(finance)" as any)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="chevron-back" size={18} color={Colors.screen.textSecondary} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>Reportes financieros</Text>
                        <Text style={styles.headerSubtitle}>Análisis de ingresos y egresos</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.shareBtn}
                        onPress={handleShare}
                        disabled={sharing || isLoading}
                        activeOpacity={0.8}
                    >
                        {sharing
                            ? <ActivityIndicator size="small" color={Colors.primary.main} />
                            : <Ionicons name="share-outline" size={18} color={Colors.primary.main} />
                        }
                    </TouchableOpacity>
                </View>

                {/* ── Barra de filtros (SIEMPRE VISIBLE) ─────────────────── */}
                <View style={styles.filterBar}>
                    {/* Mode toggle */}
                    <View style={styles.modeToggle}>
                        {(["annual", "monthly"] as ReportMode[]).map(m => (
                            <TouchableOpacity
                                key={m}
                                style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
                                onPress={() => setMode(m)}
                                activeOpacity={0.8}
                            >
                                <Ionicons
                                    name={m === "annual" ? "calendar" : "calendar-outline"}
                                    size={13}
                                    color={mode === m ? Colors.primary.dark : Colors.screen.textMuted}
                                />
                                <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                                    {m === "annual" ? "Anual" : "Mensual"}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Date range button */}
                    <TouchableOpacity
                        style={styles.rangeBtn}
                        onPress={() => setShowPicker(true)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="options-outline" size={14} color={Colors.primary.dark} />
                        <Text style={styles.rangeBtnText} numberOfLines={1}>{currentLabel}</Text>
                        <Ionicons name="chevron-down" size={12} color={Colors.primary.dark} />
                    </TouchableOpacity>
                </View>

                {/* Content */}
                {isLoading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={Colors.primary.main} />
                        <Text style={styles.stateText}>Generando reporte...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.centered}>
                        <Ionicons name="cloud-offline-outline" size={36} color={Colors.screen.textMuted} />
                        <Text style={styles.stateText}>{error}</Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
                            <Ionicons name="refresh" size={14} color={Colors.primary.dark} />
                            <Text style={styles.retryText}>Reintentar</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <ScrollView
                        contentContainerStyle={styles.scroll}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* ── KPIs ─────────────────────────────────────────── */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>RESUMEN DEL PERÍODO</Text>
                            <View style={styles.sectionLine} />
                        </View>

                        <View style={styles.kpiGrid}>
                            <KpiCard
                                icon="arrow-up-circle"
                                label="Ingresos"
                                value={fmtShort(annual.totalIncome)}
                                sub={annual.totalExpected > 0 ? `${annual.collectionRate}% cobranza` : undefined}
                                color={Colors.status.success}
                                bg={Colors.status.successBg}
                                border={Colors.status.successBorder}
                            />
                            <KpiCard
                                icon="arrow-down-circle"
                                label="Egresos"
                                value={fmtShort(annual.totalExpenses + annual.totalIncidentCosts)}
                                sub={annual.avgMonthlyExpense > 0 ? `${fmtShort(annual.avgMonthlyExpense)}/mes` : undefined}
                                color={Colors.status.error}
                                bg={Colors.status.errorBg}
                                border={Colors.status.errorBorder}
                            />
                        </View>

                        {/* Flujo neto */}
                        <View style={[styles.netFlowCard, {
                            borderTopColor: annual.netFlow >= 0 ? Colors.status.success : Colors.status.error,
                        }]}>
                            <View style={styles.netFlowLeft}>
                                <Text style={styles.netFlowLabel}>FLUJO NETO · {currentLabel}</Text>
                                <Text style={[styles.netFlowValue, {
                                    color: annual.netFlow >= 0 ? Colors.primary.dark : Colors.status.error,
                                }]}>
                                    {annual.netFlow >= 0 ? "+" : ""}{fmt(annual.netFlow)}
                                </Text>
                            </View>
                            <View style={[styles.netFlowBadge, {
                                backgroundColor: annual.netFlow >= 0 ? Colors.status.successBg : Colors.status.errorBg,
                                borderColor: annual.netFlow >= 0 ? Colors.status.successBorder : Colors.status.errorBorder,
                            }]}>
                                <Ionicons
                                    name={annual.netFlow >= 0 ? "trending-up" : "trending-down"}
                                    size={20}
                                    color={annual.netFlow >= 0 ? Colors.status.success : Colors.status.error}
                                />
                                <Text style={[styles.netFlowBadgeText, {
                                    color: annual.netFlow >= 0 ? Colors.status.success : Colors.status.error,
                                }]}>
                                    {annual.netFlow >= 0 ? "Superávit" : "Déficit"}
                                </Text>
                            </View>
                        </View>

                        {/* ── Cobranza ──────────────────────────────────────── */}
                        {annual.totalExpected > 0 && (
                            <>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>COBRANZA DE CUOTAS</Text>
                                    <View style={styles.sectionLine} />
                                </View>

                                <View style={styles.collectionCard}>
                                    <View style={styles.collectionHeader}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.collectionTitle}>Tasa de cobranza</Text>
                                            <Text style={styles.collectionSub}>
                                                {fmt(annual.totalIncome)} de {fmt(annual.totalExpected)} esperados
                                            </Text>
                                        </View>
                                        <Text style={[styles.collectionPct, {
                                            color: annual.collectionRate >= 80
                                                ? Colors.status.success
                                                : annual.collectionRate >= 50
                                                    ? Colors.status.warning
                                                    : Colors.status.error,
                                        }]}>
                                            {annual.collectionRate}%
                                        </Text>
                                    </View>
                                    <ProgressBar
                                        value={annual.totalIncome}
                                        max={annual.totalExpected}
                                        color={
                                            annual.collectionRate >= 80
                                                ? Colors.status.success
                                                : annual.collectionRate >= 50
                                                    ? Colors.status.warning
                                                    : Colors.status.error
                                        }
                                    />
                                    {annual.totalDeficit > 0 && (
                                        <View style={styles.deficitNote}>
                                            <Ionicons name="alert-circle-outline" size={13} color={Colors.status.error} />
                                            <Text style={styles.deficitNoteText}>
                                                Déficit acumulado:{" "}
                                                <Text style={{ fontFamily: "Outfit_700Bold" }}>
                                                    {fmt(annual.totalDeficit)}
                                                </Text>
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </>
                        )}

                        {/* ── Stats ─────────────────────────────────────────── */}
                        <View style={styles.statsGrid}>
                            <View style={styles.statCard}>
                                <Ionicons name="medal-outline" size={18} color="#0891B2" />
                                <Text style={styles.statCardValue}>{annual.bestMonth.slice(0, 3)}</Text>
                                <Text style={styles.statCardLabel}>Mejor mes</Text>
                                <Text style={styles.statCardSub}>en ingresos</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Ionicons name="construct-outline" size={18} color={Colors.status.warning} />
                                <Text style={styles.statCardValue}>{fmtShort(annual.totalIncidentCosts)}</Text>
                                <Text style={styles.statCardLabel}>Incidencias</Text>
                                <Text style={styles.statCardSub}>costo total</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Ionicons name="business-outline" size={18} color={Colors.primary.main} />
                                <Text style={styles.statCardValue}>{activeDepts}</Text>
                                <Text style={styles.statCardLabel}>Deptos</Text>
                                <Text style={styles.statCardSub}>activos</Text>
                            </View>
                        </View>

                        {/* ── Tabla mensual ─────────────────────────────────── */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>DETALLE POR MES</Text>
                            <View style={styles.sectionLine} />
                        </View>

                        {activeMonths.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <View style={styles.emptyIconWrap}>
                                    <Ionicons name="document-text-outline" size={32} color={Colors.screen.textMuted} />
                                </View>
                                <Text style={styles.emptyTitle}>Sin actividad en este período</Text>
                                <Text style={styles.stateText}>
                                    No hay registros de ingresos ni gastos para las fechas seleccionadas.
                                </Text>
                                <TouchableOpacity
                                    style={styles.retryBtn}
                                    onPress={() => setShowPicker(true)}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="options-outline" size={14} color={Colors.primary.dark} />
                                    <Text style={styles.retryText}>Cambiar rango</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.tableCard}>
                                <View style={styles.tableHeader}>
                                    <Text style={[styles.tableHeaderText, { width: 70 }]}>MES</Text>
                                    <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right", color: Colors.status.success }]}>
                                        INGRESO
                                    </Text>
                                    <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right", color: Colors.status.error }]}>
                                        EGRESO
                                    </Text>
                                    <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>
                                        NETO
                                    </Text>
                                </View>
                                <View style={styles.tableDivider} />
                                {activeMonths.map((r, i) => (
                                    <MonthRow key={`${r.year}-${r.monthIndex}`} report={r} isEven={i % 2 === 0} />
                                ))}
                                <View style={styles.tableDivider} />
                                <View style={styles.tableTotal}>
                                    <Text style={[styles.tableTotalText, { width: 70 }]}>TOTAL</Text>
                                    <Text style={[styles.tableTotalText, { flex: 1, textAlign: "right", color: Colors.status.success }]}>
                                        {fmtShort(annual.totalIncome)}
                                    </Text>
                                    <Text style={[styles.tableTotalText, { flex: 1, textAlign: "right", color: Colors.status.error }]}>
                                        {fmtShort(annual.totalExpenses + annual.totalIncidentCosts)}
                                    </Text>
                                    <Text style={[styles.tableTotalText, {
                                        flex: 1, textAlign: "right",
                                        color: annual.netFlow >= 0 ? Colors.primary.dark : Colors.status.error,
                                    }]}>
                                        {annual.netFlow >= 0 ? "+" : ""}{fmtShort(annual.netFlow)}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* ── Gráfica ───────────────────────────────────────── */}
                        {activeMonths.length > 0 && (
                            <>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>INGRESOS VS EGRESOS</Text>
                                    <View style={styles.sectionLine} />
                                </View>
                                <View style={styles.chartCard}>
                                    <View style={styles.chartLegend}>
                                        {[
                                            { color: Colors.status.success, label: "Ingresos" },
                                            { color: Colors.status.error, label: "Egresos" },
                                            { color: Colors.primary.main, label: "Esperado" },
                                        ].map((item) => (
                                            <View key={item.label} style={styles.legendItem}>
                                                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                                                <Text style={styles.legendText}>{item.label}</Text>
                                            </View>
                                        ))}
                                    </View>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        <View style={styles.chartBars}>
                                            {activeMonths.map(r => {
                                                const maxVal = Math.max(r.income, r.expenses + r.incidentCosts, r.expectedIncome, 1);
                                                const incomeH = Math.max((r.income / maxVal) * 110, r.income > 0 ? 4 : 0);
                                                const expenseH = Math.max(((r.expenses + r.incidentCosts) / maxVal) * 110, (r.expenses + r.incidentCosts) > 0 ? 4 : 0);
                                                const expectedH = Math.max((r.expectedIncome / maxVal) * 110, r.expectedIncome > 0 ? 4 : 0);
                                                return (
                                                    <View key={`${r.year}-${r.monthIndex}`} style={styles.barGroup}>
                                                        <View style={styles.barRow}>
                                                            <View style={[styles.bar, { height: incomeH, backgroundColor: Colors.status.success }]} />
                                                            <View style={[styles.bar, { height: expenseH, backgroundColor: Colors.status.error }]} />
                                                            {r.expectedIncome > 0 && (
                                                                <View style={[styles.bar, { height: expectedH, backgroundColor: Colors.primary.main, opacity: 0.45 }]} />
                                                            )}
                                                        </View>
                                                        <Text style={styles.barLabel}>{r.month.slice(0, 3)}</Text>
                                                        {activeMonths.some(m => m.year !== activeMonths[0].year) && (
                                                            <Text style={styles.barLabelYear}>{String(r.year).slice(2)}</Text>
                                                        )}
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    </ScrollView>
                                </View>
                            </>
                        )}

                        {/* ── Desglose egresos ──────────────────────────────── */}
                        {(annual.totalExpenses > 0 || annual.totalIncidentCosts > 0) && (
                            <>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>DESGLOSE DE EGRESOS</Text>
                                    <View style={styles.sectionLine} />
                                </View>
                                <View style={styles.card}>
                                    <View style={styles.egresosRow}>
                                        <View style={[styles.egresosDot, { backgroundColor: Colors.status.error }]} />
                                        <Text style={styles.egresosLabel}>Gastos operativos</Text>
                                        <Text style={styles.egresosValue}>{fmt(annual.totalExpenses)}</Text>
                                        <Text style={styles.egresosPct}>
                                            {pct(annual.totalExpenses, annual.totalExpenses + annual.totalIncidentCosts)}%
                                        </Text>
                                    </View>
                                    <ProgressBar value={annual.totalExpenses} max={annual.totalExpenses + annual.totalIncidentCosts} color={Colors.status.error} />
                                    <View style={[styles.egresosRow, { marginTop: 14 }]}>
                                        <View style={[styles.egresosDot, { backgroundColor: Colors.status.warning }]} />
                                        <Text style={styles.egresosLabel}>Costos incidencias</Text>
                                        <Text style={styles.egresosValue}>{fmt(annual.totalIncidentCosts)}</Text>
                                        <Text style={styles.egresosPct}>
                                            {pct(annual.totalIncidentCosts, annual.totalExpenses + annual.totalIncidentCosts)}%
                                        </Text>
                                    </View>
                                    <ProgressBar value={annual.totalIncidentCosts} max={annual.totalExpenses + annual.totalIncidentCosts} color={Colors.status.warning} />
                                    <View style={styles.egresosTotalRow}>
                                        <Text style={styles.egresosTotalLabel}>Total egresos</Text>
                                        <Text style={styles.egresosTotalValue}>
                                            {fmt(annual.totalExpenses + annual.totalIncidentCosts)}
                                        </Text>
                                    </View>
                                </View>
                            </>
                        )}

                        {/* ── Alertas ───────────────────────────────────────── */}
                        {(annual.totalDeficit > 0 || annual.collectionRate < 80 || annual.netFlow < 0) && (
                            <>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>ALERTAS</Text>
                                    <View style={styles.sectionLine} />
                                </View>
                                {annual.netFlow < 0 && (
                                    <View style={[styles.alertCard, styles.alertCardError]}>
                                        <View style={styles.alertIconWrap}>
                                            <Ionicons name="trending-down" size={18} color={Colors.status.error} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.alertTitle, { color: Colors.status.error }]}>Flujo negativo</Text>
                                            <Text style={styles.alertBody}>
                                                Los egresos superan los ingresos en {fmt(Math.abs(annual.netFlow))} en este período.
                                            </Text>
                                        </View>
                                    </View>
                                )}
                                {annual.collectionRate < 80 && annual.totalExpected > 0 && (
                                    <View style={[styles.alertCard, styles.alertCardWarning]}>
                                        <View style={styles.alertIconWrap}>
                                            <Ionicons name="alert-circle-outline" size={18} color={Colors.status.warning} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.alertTitle, { color: Colors.status.warning }]}>
                                                Cobranza baja ({annual.collectionRate}%)
                                            </Text>
                                            <Text style={styles.alertBody}>
                                                Se han dejado de recaudar {fmt(annual.totalDeficit)} del total esperado.
                                            </Text>
                                        </View>
                                    </View>
                                )}
                                {annual.totalIncidentCosts > annual.totalExpenses && (
                                    <View style={[styles.alertCard, styles.alertCardWarning]}>
                                        <View style={styles.alertIconWrap}>
                                            <Ionicons name="construct-outline" size={18} color={Colors.status.warning} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.alertTitle, { color: Colors.status.warning }]}>Alto costo en incidencias</Text>
                                            <Text style={styles.alertBody}>
                                                Los costos de reparaciones ({fmt(annual.totalIncidentCosts)}) superan los gastos operativos regulares.
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </>
                        )}

                        <View style={styles.footerNote}>
                            <Ionicons name="information-circle-outline" size={13} color={Colors.screen.textMuted} />
                            <Text style={styles.footerNoteText}>
                                Reporte generado automáticamente · {new Date().toLocaleDateString("es-MX")}
                            </Text>
                        </View>
                    </ScrollView>
                )}
            </SafeAreaView>

            {/* Date Range Picker */}
            <DateRangePicker
                visible={showPicker}
                mode={mode}
                range={range}
                onApply={setRange}
                onClose={() => setShowPicker(false)}
            />
        </View>
    );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.screen.bg },

    header: {
        flexDirection: "row", alignItems: "center", gap: 8,
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
    shareBtn: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: Colors.primary.soft, borderWidth: 1, borderColor: Colors.primary.muted,
        alignItems: "center", justifyContent: "center",
    },

    // Filter bar
    filterBar: {
        flexDirection: "row", alignItems: "center", gap: 10,
        paddingHorizontal: 16, paddingVertical: 10,
        backgroundColor: Colors.screen.card,
        borderBottomWidth: 1, borderBottomColor: Colors.screen.border,
    },
    modeToggle: {
        flexDirection: "row", borderRadius: 10, overflow: "hidden",
        borderWidth: 1, borderColor: Colors.screen.border,
        backgroundColor: Colors.screen.bg,
    },
    modeBtn: {
        flexDirection: "row", alignItems: "center", gap: 5,
        paddingHorizontal: 12, paddingVertical: 7,
    },
    modeBtnActive: {
        backgroundColor: Colors.primary.soft,
    },
    modeBtnText: {
        fontFamily: "Outfit_600SemiBold", fontSize: 12,
        color: Colors.screen.textMuted,
    },
    modeBtnTextActive: { color: Colors.primary.dark },

    rangeBtn: {
        flex: 1, flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
        backgroundColor: Colors.primary.soft, borderWidth: 1, borderColor: Colors.primary.muted,
    },
    rangeBtnText: {
        flex: 1, fontFamily: "Outfit_700Bold", fontSize: 12, color: Colors.primary.dark,
    },

    scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48, gap: 12 },

    centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
    stateText: {
        fontFamily: "Outfit_400Regular", fontSize: 13,
        color: Colors.screen.textMuted, textAlign: "center", lineHeight: 20,
    },
    retryBtn: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10,
        backgroundColor: Colors.primary.soft, borderWidth: 1, borderColor: Colors.primary.muted,
    },
    retryText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.primary.dark },

    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
    sectionTitle: {
        fontFamily: "Outfit_700Bold", fontSize: 10,
        color: Colors.screen.textMuted, letterSpacing: 1.8,
    },
    sectionLine: { flex: 1, height: 1, backgroundColor: Colors.screen.border },

    kpiGrid: { flexDirection: "row", gap: 10 },

    netFlowCard: {
        backgroundColor: Colors.screen.card, borderRadius: 16,
        borderWidth: 1, borderColor: Colors.screen.border,
        borderTopWidth: 4, padding: 16,
        flexDirection: "row", alignItems: "center", gap: 14,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    },
    netFlowLeft: { flex: 1 },
    netFlowLabel: {
        fontFamily: "Outfit_700Bold", fontSize: 10,
        color: Colors.screen.textMuted, letterSpacing: 1.5, marginBottom: 4,
    },
    netFlowValue: { fontFamily: "Outfit_900Black", fontSize: 28, letterSpacing: -0.5 },
    netFlowBadge: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 12, borderWidth: 1,
    },
    netFlowBadgeText: { fontFamily: "Outfit_700Bold", fontSize: 13 },

    collectionCard: {
        backgroundColor: Colors.screen.card, borderRadius: 14,
        borderWidth: 1, borderColor: Colors.screen.border, padding: 16, gap: 10,
    },
    collectionHeader: { flexDirection: "row", alignItems: "center" },
    collectionTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.screen.textPrimary },
    collectionSub: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted, marginTop: 2 },
    collectionPct: { fontFamily: "Outfit_900Black", fontSize: 32, letterSpacing: -1 },
    deficitNote: {
        flexDirection: "row", alignItems: "center", gap: 6,
        backgroundColor: Colors.status.errorBg, borderRadius: 8,
        borderWidth: 1, borderColor: Colors.status.errorBorder,
        paddingHorizontal: 10, paddingVertical: 7,
    },
    deficitNoteText: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.status.error },

    statsGrid: { flexDirection: "row", gap: 8 },
    statCard: {
        flex: 1, backgroundColor: Colors.screen.card, borderRadius: 13,
        borderWidth: 1, borderColor: Colors.screen.border,
        padding: 12, alignItems: "center", gap: 3,
    },
    statCardValue: { fontFamily: "Outfit_800ExtraBold", fontSize: 15, color: Colors.screen.textPrimary, marginTop: 4 },
    statCardLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 11, color: Colors.screen.textSecondary },
    statCardSub: { fontFamily: "Outfit_400Regular", fontSize: 10, color: Colors.screen.textMuted },

    tableCard: {
        backgroundColor: Colors.screen.card, borderRadius: 14,
        borderWidth: 1, borderColor: Colors.screen.border, overflow: "hidden",
    },
    tableHeader: {
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 14, paddingVertical: 10,
        backgroundColor: Colors.screen.bg,
    },
    tableHeaderText: {
        fontFamily: "Outfit_700Bold", fontSize: 9,
        color: Colors.screen.textMuted, letterSpacing: 1.2,
    },
    tableDivider: { height: 1, backgroundColor: Colors.screen.border },
    tableTotal: {
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 14, paddingVertical: 12,
        backgroundColor: Colors.primary.soft,
    },
    tableTotalText: { fontFamily: "Outfit_700Bold", fontSize: 12, color: Colors.screen.textPrimary },

    chartCard: {
        backgroundColor: Colors.screen.card, borderRadius: 14,
        borderWidth: 1, borderColor: Colors.screen.border, padding: 16, gap: 14,
    },
    chartLegend: { flexDirection: "row", gap: 16 },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textSecondary },
    chartBars: { flexDirection: "row", alignItems: "flex-end", gap: 12, height: 140, paddingBottom: 4 },
    barGroup: { alignItems: "center", gap: 3, width: 52 },
    barRow: { flexDirection: "row", alignItems: "flex-end", gap: 3, height: 110 },
    bar: { width: 12, borderRadius: 4, minHeight: 2 },
    barLabel: { fontFamily: "Outfit_500Medium", fontSize: 10, color: Colors.screen.textMuted },
    barLabelYear: { fontFamily: "Outfit_400Regular", fontSize: 9, color: Colors.screen.textMuted },

    card: {
        backgroundColor: Colors.screen.card, borderRadius: 14,
        borderWidth: 1, borderColor: Colors.screen.border, padding: 16, gap: 10,
    },
    egresosRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    egresosDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
    egresosLabel: { flex: 1, fontFamily: "Outfit_500Medium", fontSize: 13, color: Colors.screen.textSecondary },
    egresosValue: { fontFamily: "Outfit_700Bold", fontSize: 13, color: Colors.screen.textPrimary },
    egresosPct: {
        fontFamily: "Outfit_600SemiBold", fontSize: 11,
        color: Colors.screen.textMuted, width: 32, textAlign: "right",
    },
    egresosTotalRow: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.screen.border, marginTop: 4,
    },
    egresosTotalLabel: { fontFamily: "Outfit_700Bold", fontSize: 13, color: Colors.screen.textPrimary },
    egresosTotalValue: { fontFamily: "Outfit_800ExtraBold", fontSize: 16, color: Colors.status.error },

    alertCard: {
        flexDirection: "row", alignItems: "flex-start", gap: 12,
        borderRadius: 13, borderWidth: 1, padding: 14,
    },
    alertCardError: { backgroundColor: Colors.status.errorBg, borderColor: Colors.status.errorBorder },
    alertCardWarning: { backgroundColor: Colors.status.warningBg, borderColor: Colors.status.warningBorder },
    alertIconWrap: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: "rgba(255,255,255,0.7)",
        alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    alertTitle: { fontFamily: "Outfit_700Bold", fontSize: 13, marginBottom: 4 },
    alertBody: {
        fontFamily: "Outfit_400Regular", fontSize: 12,
        color: Colors.screen.textSecondary, lineHeight: 18,
    },

    emptyCard: {
        backgroundColor: Colors.screen.card, borderRadius: 16,
        borderWidth: 1, borderColor: Colors.screen.border,
        padding: 36, alignItems: "center", gap: 10,
    },
    emptyIconWrap: {
        width: 64, height: 64, borderRadius: 20,
        backgroundColor: Colors.neutral[100], alignItems: "center", justifyContent: "center",
    },
    emptyTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 16, color: Colors.screen.textSecondary },

    footerNote: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 6, paddingTop: 4,
    },
    footerNoteText: {
        fontFamily: "Outfit_400Regular", fontSize: 10,
        color: Colors.screen.textMuted, textAlign: "center", lineHeight: 15,
    },
});

const kpi = StyleSheet.create({
    root: {
        flex: 1, borderRadius: 14, borderWidth: 1,
        padding: 14, alignItems: "center", gap: 4,
        shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    iconWrap: {
        width: 38, height: 38, borderRadius: 11,
        alignItems: "center", justifyContent: "center", marginBottom: 4,
    },
    value: { fontFamily: "Outfit_800ExtraBold", fontSize: 22, letterSpacing: -0.5 },
    label: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: Colors.screen.textSecondary },
    sub: { fontFamily: "Outfit_400Regular", fontSize: 10, color: Colors.screen.textMuted, textAlign: "center" },
});

const pb = StyleSheet.create({
    track: {
        height: 8, borderRadius: 4,
        backgroundColor: Colors.screen.border, overflow: "hidden",
    },
    fill: { height: "100%", borderRadius: 4 },
});

const mrow = StyleSheet.create({
    root: {
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 14, paddingVertical: 10,
    },
    even: { backgroundColor: Colors.neutral[50] },
    monthCol: { width: 70, gap: 2 },
    monthName: { fontFamily: "Outfit_700Bold", fontSize: 13, color: Colors.screen.textPrimary },
    monthYear: { fontFamily: "Outfit_400Regular", fontSize: 9, color: Colors.screen.textMuted },
    coveragePill: {
        alignSelf: "flex-start", paddingHorizontal: 5, paddingVertical: 1,
        borderRadius: 4,
    },
    coverageText: { fontFamily: "Outfit_700Bold", fontSize: 9 },
    incomCol: { flex: 1, alignItems: "flex-end", gap: 2 },
    expCol: { flex: 1, alignItems: "flex-end", gap: 2 },
    netCol: { flex: 1, alignItems: "flex-end" },
    amount: { fontFamily: "Outfit_700Bold", fontSize: 12 },
    sub: { fontFamily: "Outfit_400Regular", fontSize: 9, color: Colors.screen.textMuted },
});

// Date Range Picker styles
const drp = StyleSheet.create({
    overlay: {
        flex: 1, backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "flex-end",
    },
    sheet: {
        backgroundColor: Colors.screen.card,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, gap: 16,
        shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1, shadowRadius: 20, elevation: 20,
    },
    sheetHeader: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    },
    sheetTitle: { fontFamily: "Outfit_700Bold", fontSize: 18, color: Colors.screen.textPrimary },
    sheetSub: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.screen.textMuted, marginTop: 2 },
    closeBtn: {
        width: 32, height: 32, borderRadius: 10,
        backgroundColor: Colors.neutral[100], borderWidth: 1, borderColor: Colors.screen.border,
        alignItems: "center", justifyContent: "center",
    },

    tabs: { flexDirection: "row", gap: 10 },
    tab: {
        flex: 1, borderRadius: 12, padding: 12,
        backgroundColor: Colors.screen.bg,
        borderWidth: 1, borderColor: Colors.screen.border, gap: 2,
    },
    tabActive: {
        backgroundColor: Colors.primary.soft, borderColor: Colors.primary.muted,
    },
    tabText: {
        fontFamily: "Outfit_600SemiBold", fontSize: 11,
        color: Colors.screen.textMuted, letterSpacing: 0.5,
    },
    tabTextActive: { color: Colors.primary.dark },
    tabDate: {
        fontFamily: "Outfit_700Bold", fontSize: 14, color: Colors.screen.textSecondary,
    },
    tabDateActive: { color: Colors.primary.dark },

    pickerLabel: {
        fontFamily: "Outfit_700Bold", fontSize: 10,
        color: Colors.screen.textMuted, letterSpacing: 1.5,
        marginBottom: 8, marginTop: 4,
    },

    monthGrid: {
        flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8,
    },
    monthChip: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
        backgroundColor: Colors.screen.bg, borderWidth: 1, borderColor: Colors.screen.border,
    },
    monthChipActive: {
        backgroundColor: Colors.primary.soft, borderColor: Colors.primary.muted,
    },
    monthChipText: {
        fontFamily: "Outfit_600SemiBold", fontSize: 12, color: Colors.screen.textSecondary,
    },
    monthChipTextActive: { color: Colors.primary.dark },

    yearList: { gap: 6, marginBottom: 8 },
    yearItem: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12,
        backgroundColor: Colors.screen.bg, borderWidth: 1, borderColor: Colors.screen.border,
    },
    yearItemActive: {
        backgroundColor: Colors.primary.soft, borderColor: Colors.primary.muted,
    },
    yearItemText: { fontFamily: "Outfit_600SemiBold", fontSize: 15, color: Colors.screen.textSecondary },
    yearItemTextActive: { color: Colors.primary.dark },

    actions: { flexDirection: "row", gap: 10 },
    cancelBtn: {
        flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center",
        backgroundColor: Colors.screen.bg, borderWidth: 1, borderColor: Colors.screen.border,
    },
    cancelText: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.screen.textSecondary },
    applyBtn: {
        flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 8, paddingVertical: 13, borderRadius: 12,
        backgroundColor: Colors.primary.main,
    },
    applyText: { fontFamily: "Outfit_700Bold", fontSize: 14, color: "#fff" },
});