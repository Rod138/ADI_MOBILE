import { Colors } from "@/constants/colors";
import { useSession } from "@/context/AuthContext";
import supabase from "@/lib/supabase";
import { generateMonthlyReportHTML } from "@/utils/generateReportHTML";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface AvailableMonth {
    monthIndex: number;
    monthName: string;
    year: number;
    key: string;
}

interface Department { id: number; name: string; }

interface DeptPaymentRow {
    depId: number;
    depName: string;
    amountExpected: number;
    amountPaid: number;
    paid: boolean;
    isPartial: boolean;
    paidAt: string | null;
}

interface ExpenseRow {
    date: string;
    description: string;
    amount: number;
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
    paidDepts: number;
    partialDepts: number;
    totalDepts: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
    return `$${Number(n).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
function fmtShort(n: number): string {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
    return fmt(n);
}
function pct(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.min(Math.round((value / total) * 100), 100);
}
function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/**
 * Genera meses disponibles desde startDate hasta el mes actual (desc).
 * Si startDate es null solo devuelve el mes actual.
 */
function buildAvailableMonths(startDate: string | null): AvailableMonth[] {
    const result: AvailableMonth[] = [];
    let startYear = CURRENT_YEAR;
    let startMonthIdx = CURRENT_MONTH;

    if (startDate) {
        const d = new Date(startDate);
        startYear = d.getFullYear();
        startMonthIdx = d.getMonth();
    }

    let y = CURRENT_YEAR;
    let m = CURRENT_MONTH;

    while (y > startYear || (y === startYear && m >= startMonthIdx)) {
        result.push({
            monthIndex: m,
            monthName: MONTH_NAMES[m],
            year: y,
            key: `${MONTH_NAMES[m]}-${y}`,
        });
        m--;
        if (m < 0) { m = 11; y--; }
        if (result.length >= 60) break;
    }

    return result;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, color, bg, border }: {
    icon: keyof typeof Ionicons.glyphMap; label: string; value: string; sub?: string;
    color: string; bg: string; border: string;
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

// ─── Month Picker ─────────────────────────────────────────────────────────────

function MonthYearPicker({
    visible, availableMonths, selectedKey, onApply, onClose,
}: {
    visible: boolean; availableMonths: AvailableMonth[];
    selectedKey: string; onApply: (m: AvailableMonth) => void; onClose: () => void;
}) {
    const [draftKey, setDraftKey] = useState(selectedKey);

    useEffect(() => { if (visible) setDraftKey(selectedKey); }, [visible]);

    const handleApply = () => {
        const found = availableMonths.find(m => m.key === draftKey);
        if (found) { onApply(found); onClose(); }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={picker.overlay}>
                <View style={picker.sheet}>
                    <View style={picker.handle} />
                    <View style={picker.sheetHeader}>
                        <View>
                            <Text style={picker.sheetTitle}>Seleccionar período</Text>
                            <Text style={picker.sheetSub}>Meses disponibles desde el inicio del fondo</Text>
                        </View>
                        <TouchableOpacity style={picker.closeBtn} onPress={onClose} activeOpacity={0.7}>
                            <Ionicons name="close" size={18} color={Colors.screen.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {availableMonths.length === 0 ? (
                        <View style={picker.emptyNote}>
                            <Ionicons name="warning-outline" size={18} color={Colors.status.warning} />
                            <Text style={picker.emptyNoteText}>
                                No hay períodos disponibles. Configura el fondo inicial en "Configuración financiera".
                            </Text>
                        </View>
                    ) : (
                        <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                            <View style={picker.monthList}>
                                {availableMonths.map(m => {
                                    const isSelected = m.key === draftKey;
                                    return (
                                        <TouchableOpacity
                                            key={m.key}
                                            style={[picker.monthItem, isSelected && picker.monthItemActive]}
                                            onPress={() => setDraftKey(m.key)}
                                            activeOpacity={0.75}
                                        >
                                            <View>
                                                <Text style={[picker.monthItemName, isSelected && picker.monthItemNameActive]}>
                                                    {m.monthName}
                                                </Text>
                                                <Text style={[picker.monthItemYear, isSelected && { color: Colors.primary.main }]}>
                                                    {m.year}
                                                </Text>
                                            </View>
                                            {isSelected && (
                                                <Ionicons name="checkmark-circle" size={20} color={Colors.primary.main} />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>
                    )}

                    <View style={picker.actions}>
                        <TouchableOpacity style={picker.cancelBtn} onPress={onClose} activeOpacity={0.8}>
                            <Text style={picker.cancelText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[picker.applyBtn, availableMonths.length === 0 && { opacity: 0.5 }]}
                            onPress={handleApply}
                            disabled={availableMonths.length === 0}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="checkmark" size={16} color="#fff" />
                            <Text style={picker.applyText}>Aplicar</Text>
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

    const [availableMonths, setAvailableMonths] = useState<AvailableMonth[]>([]);
    const [fundLoading, setFundLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState<AvailableMonth | null>(null);
    const [showPicker, setShowPicker] = useState(false);

    const [report, setReport] = useState<MonthlyReport | null>(null);
    const [deptRows, setDeptRows] = useState<DeptPaymentRow[]>([]);
    const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sharing, setSharing] = useState(false);

    // ── Cargar fondo → construir lista de meses ───────────────────────────────
    useEffect(() => {
        const loadFund = async () => {
            setFundLoading(true);
            try {
                const { data } = await supabase
                    .from("tower_fund")
                    .select("updated_at")
                    .order("id", { ascending: true })
                    .limit(1)
                    .maybeSingle();

                const months = buildAvailableMonths(data?.updated_at ?? null);
                setAvailableMonths(months);
                if (months.length > 0) setSelectedMonth(months[0]);
            } catch {
                setAvailableMonths([]);
            } finally {
                setFundLoading(false);
            }
        };
        loadFund();
    }, []);

    useEffect(() => {
        if (selectedMonth) loadData(selectedMonth);
    }, [selectedMonth]);

    // ── loadData ──────────────────────────────────────────────────────────────
    const loadData = async (period: AvailableMonth) => {
        setIsLoading(true);
        setError(null);
        try {
            const { monthName, monthIndex, year } = period;
            const monthStart = new Date(year, monthIndex, 1).toISOString();
            const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999).toISOString();

            const [deptsRes, quotaPayRes, expensesRes, incidentsRes, quotaCfgRes] = await Promise.all([
                supabase.from("departments").select("id, name").eq("is_in_use", true).order("name"),
                supabase.from("recipes_payment").select("dep_id, amount_paid, amount_expected, created_at")
                    .eq("month", monthName).eq("year", year).eq("validated", true),
                supabase.from("tower_expenses").select("amount, expense_date, description")
                    .gte("expense_date", monthStart).lte("expense_date", monthEnd).order("expense_date"),
                supabase.from("incidents").select("cost, completed_at")
                    .gte("completed_at", monthStart).lte("completed_at", monthEnd).not("cost", "is", null),
                supabase.from("monthly_quota").select("amount").eq("year", year).eq("month", monthName).maybeSingle(),
            ]);

            const depts = (deptsRes.data ?? []) as Department[];
            const deptCount = depts.length;
            const quotaPayments = quotaPayRes.data ?? [];
            const expensesData = expensesRes.data ?? [];
            const incidentsData = incidentsRes.data ?? [];
            const quotaPerDept = quotaCfgRes.data ? Number(quotaCfgRes.data.amount) : 0;

            const income = quotaPayments.reduce((s, p) => s + Number(p.amount_paid), 0);
            const expenses = expensesData.reduce((s, e) => s + Number(e.amount), 0);
            const incidentCosts = incidentsData.reduce((s, i) => s + Number(i.cost ?? 0), 0);
            const expectedIncome = quotaPerDept * deptCount;
            const deficit = expectedIncome > 0 ? Math.max(expectedIncome - income, 0) : 0;
            const netFlow = income - expenses - incidentCosts;

            // Mapa de pagos agrupados por depto
            const paymentsMap = new Map<number, { totalPaid: number; expected: number; createdAt: string }>();
            quotaPayments.forEach(p => {
                const ex = paymentsMap.get(p.dep_id);
                if (ex) {
                    ex.totalPaid += Number(p.amount_paid);
                    if (p.created_at > ex.createdAt) ex.createdAt = p.created_at;
                } else {
                    paymentsMap.set(p.dep_id, {
                        totalPaid: Number(p.amount_paid),
                        expected: Number(p.amount_expected),
                        createdAt: p.created_at,
                    });
                }
            });

            // Filas por departamento
            const rows: DeptPaymentRow[] = depts.map(dept => {
                const payment = paymentsMap.get(dept.id);
                const amountExpected = payment?.expected ?? quotaPerDept;
                const amountPaid = payment?.totalPaid ?? 0;
                const paid = !!payment && amountPaid > 0;
                const isPartial = paid && amountExpected > 0 && amountPaid < amountExpected;
                return {
                    depId: dept.id, depName: dept.name,
                    amountExpected, amountPaid, paid, isPartial,
                    paidAt: payment?.createdAt ?? null,
                };
            });

            // Orden: completos → parciales → pendientes → por nombre
            rows.sort((a, b) => {
                const score = (r: DeptPaymentRow) => r.paid && !r.isPartial ? 0 : r.isPartial ? 1 : 2;
                return score(a) - score(b) || a.depName.localeCompare(b.depName);
            });
            setDeptRows(rows);

            const paidDepts = rows.filter(r => r.paid && !r.isPartial).length;
            const partialDepts = rows.filter(r => r.isPartial).length;

            setReport({
                month: monthName, monthIndex, year,
                income, expenses, incidentCosts, expectedIncome, deficit, netFlow,
                paidDepts, partialDepts, totalDepts: deptCount,
            });

            // Lista de egresos individuales
            const expList: ExpenseRow[] = [
                ...expensesData.map(e => ({
                    date: fmtDate(e.expense_date),
                    description: e.description ?? "Sin descripción",
                    amount: Number(e.amount),
                })),
                ...incidentsData.map(i => ({
                    date: fmtDate(i.completed_at),
                    description: "Incidencia resuelta",
                    amount: Number(i.cost ?? 0),
                })),
            ];
            expList.sort((a, b) => a.date.localeCompare(b.date));
            setExpenseRows(expList);

        } catch (e: any) {
            setError(e?.message ?? "Error al cargar el reporte.");
        } finally {
            setIsLoading(false);
        }
    };

    const collectionRate = report ? pct(report.income, report.expectedIncome) : 0;
    const periodLabel = selectedMonth ? `${selectedMonth.monthName} ${selectedMonth.year}` : "—";

    // ── Exportar PDF ──────────────────────────────────────────────────────────
    const handleShare = async () => {
        if (!report) return;
        setSharing(true);
        try {
            const html = generateMonthlyReportHTML({
                month: report.month,
                year: report.year,
                condominioName: "Residencial del Parque",
                towerName: "Torre M",
                totalIncome: report.income,
                totalExpenses: report.expenses,
                totalIncidentCosts: report.incidentCosts,
                totalExpected: report.expectedIncome,
                activeDepts: report.totalDepts,
                departments: deptRows.map(d => ({
                    depId: d.depId,
                    depName: d.depName,
                    amountPaid: d.amountPaid,
                    amountExpected: d.amountExpected,
                    paid: d.paid,
                    isPartial: d.isPartial,
                    paidAt: d.paidAt,
                })),
                expenses: expenseRows.map(e => ({
                    date: e.date,
                    concept: e.description,
                    amount: e.amount,
                })),
            });

            const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(uri, {
                    mimeType: "application/pdf",
                    dialogTitle: `Reporte ${report.month} ${report.year} — ADI`,
                    UTI: "com.adobe.pdf",
                });
            }
        } catch (e) {
            console.error("Error generando PDF:", e);
        } finally {
            setSharing(false);
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <View style={styles.root}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.screen.bg} />
            <SafeAreaView style={{ flex: 1 }}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.push("/(finance)" as any)} activeOpacity={0.7}>
                        <Ionicons name="chevron-back" size={18} color={Colors.screen.textSecondary} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>Reporte financiero</Text>
                        <Text style={styles.headerSubtitle}>Estado mensual de ingresos y egresos</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.shareBtn, (!report || sharing) && { opacity: 0.5 }]}
                        onPress={handleShare}
                        disabled={!report || sharing || isLoading}
                        activeOpacity={0.8}
                    >
                        {sharing
                            ? <ActivityIndicator size="small" color={Colors.primary.main} />
                            : <Ionicons name="document-outline" size={18} color={Colors.primary.main} />
                        }
                    </TouchableOpacity>
                </View>

                {/* Selector de mes */}
                <View style={styles.filterBar}>
                    <Ionicons name="calendar-outline" size={15} color={Colors.screen.textMuted} />
                    <Text style={styles.filterLabel}>Período:</Text>
                    <TouchableOpacity style={styles.periodBtn} onPress={() => setShowPicker(true)} activeOpacity={0.8}>
                        <Text style={styles.periodBtnText}>
                            {fundLoading ? "Cargando..." : periodLabel}
                        </Text>
                        <Ionicons name="chevron-down" size={12} color={Colors.primary.dark} />
                    </TouchableOpacity>
                    {!fundLoading && availableMonths.length === 0 && (
                        <TouchableOpacity onPress={() => router.push("/(finance)/admin-quota" as any)} activeOpacity={0.8}>
                            <Text style={styles.configLink}>Configurar →</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Contenido */}
                {fundLoading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={Colors.primary.main} />
                        <Text style={styles.stateText}>Cargando configuración...</Text>
                    </View>
                ) : availableMonths.length === 0 ? (
                    <View style={styles.centered}>
                        <View style={styles.emptyIconWrap}>
                            <Ionicons name="settings-outline" size={32} color={Colors.screen.textMuted} />
                        </View>
                        <Text style={styles.emptyTitle}>Fondo inicial no configurado</Text>
                        <Text style={styles.stateText}>
                            Para ver reportes, configura el fondo inicial y fecha de inicio en "Configuración financiera".
                        </Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={() => router.push("/(finance)/admin-quota" as any)}>
                            <Ionicons name="settings-outline" size={14} color={Colors.primary.dark} />
                            <Text style={styles.retryText}>Ir a configuración</Text>
                        </TouchableOpacity>
                    </View>
                ) : isLoading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={Colors.primary.main} />
                        <Text style={styles.stateText}>Cargando reporte...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.centered}>
                        <Ionicons name="cloud-offline-outline" size={36} color={Colors.screen.textMuted} />
                        <Text style={styles.stateText}>{error}</Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={() => selectedMonth && loadData(selectedMonth)}>
                            <Ionicons name="refresh" size={14} color={Colors.primary.dark} />
                            <Text style={styles.retryText}>Reintentar</Text>
                        </TouchableOpacity>
                    </View>
                ) : !report ? null : (
                    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                        {/* ── KPIs ─────────────────────────────────────────── */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>RESUMEN DEL MES</Text>
                            <View style={styles.sectionLine} />
                        </View>

                        <View style={styles.kpiGrid}>
                            <KpiCard
                                icon="arrow-up-circle" label="Ingresos" value={fmtShort(report.income)}
                                sub={report.expectedIncome > 0 ? `${collectionRate}% cobranza` : undefined}
                                color={Colors.status.success} bg={Colors.status.successBg} border={Colors.status.successBorder}
                            />
                            <KpiCard
                                icon="arrow-down-circle" label="Egresos" value={fmtShort(report.expenses + report.incidentCosts)}
                                color={Colors.status.error} bg={Colors.status.errorBg} border={Colors.status.errorBorder}
                            />
                        </View>

                        {/* Balance */}
                        <View style={[styles.netFlowCard, {
                            borderTopColor: report.netFlow >= 0 ? Colors.status.success : Colors.status.error,
                        }]}>
                            <View style={styles.netFlowLeft}>
                                <Text style={styles.netFlowLabel}>BALANCE · {periodLabel.toUpperCase()}</Text>
                                <Text style={[styles.netFlowValue, {
                                    color: report.netFlow >= 0 ? Colors.primary.dark : Colors.status.error,
                                }]}>
                                    {report.netFlow >= 0 ? "+" : ""}{fmt(report.netFlow)}
                                </Text>
                            </View>
                            <View style={[styles.netFlowBadge, {
                                backgroundColor: report.netFlow >= 0 ? Colors.status.successBg : Colors.status.errorBg,
                                borderColor: report.netFlow >= 0 ? Colors.status.successBorder : Colors.status.errorBorder,
                            }]}>
                                <Ionicons name={report.netFlow >= 0 ? "trending-up" : "trending-down"} size={20}
                                    color={report.netFlow >= 0 ? Colors.status.success : Colors.status.error} />
                                <Text style={[styles.netFlowBadgeText, {
                                    color: report.netFlow >= 0 ? Colors.status.success : Colors.status.error,
                                }]}>
                                    {report.netFlow >= 0 ? "Superávit" : "Déficit"}
                                </Text>
                            </View>
                        </View>

                        {/* Cobranza */}
                        {report.expectedIncome > 0 && (
                            <>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>COBRANZA DE CUOTAS</Text>
                                    <View style={styles.sectionLine} />
                                </View>
                                <View style={styles.card}>
                                    <View style={styles.collectionHeader}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.collectionTitle}>Tasa de cobranza</Text>
                                            <Text style={styles.collectionSub}>
                                                {fmt(report.income)} de {fmt(report.expectedIncome)} esperados
                                            </Text>
                                        </View>
                                        <Text style={[styles.collectionPct, {
                                            color: collectionRate >= 80 ? Colors.status.success
                                                : collectionRate >= 50 ? Colors.status.warning : Colors.status.error,
                                        }]}>{collectionRate}%</Text>
                                    </View>
                                    <ProgressBar value={report.income} max={report.expectedIncome}
                                        color={collectionRate >= 80 ? Colors.status.success
                                            : collectionRate >= 50 ? Colors.status.warning : Colors.status.error} />
                                    {report.deficit > 0 && (
                                        <View style={styles.deficitNote}>
                                            <Ionicons name="alert-circle-outline" size={13} color={Colors.status.error} />
                                            <Text style={styles.deficitNoteText}>
                                                Déficit:{" "}
                                                <Text style={{ fontFamily: "Outfit_700Bold" }}>{fmt(report.deficit)}</Text>
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </>
                        )}

                        {/* Tabla de departamentos */}
                        {deptRows.length > 0 && (
                            <>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>PAGO POR DEPARTAMENTO</Text>
                                    <View style={styles.sectionLine} />
                                </View>

                                <View style={styles.deptSummaryRow}>
                                    <View style={[styles.deptSummaryChip, { backgroundColor: Colors.status.successBg, borderColor: Colors.status.successBorder }]}>
                                        <Ionicons name="checkmark-circle" size={13} color={Colors.status.success} />
                                        <Text style={[styles.deptSummaryText, { color: Colors.status.success }]}>
                                            {report.paidDepts} pagados
                                        </Text>
                                    </View>
                                    {report.partialDepts > 0 && (
                                        <View style={[styles.deptSummaryChip, { backgroundColor: Colors.status.warningBg, borderColor: Colors.status.warningBorder }]}>
                                            <Ionicons name="pie-chart-outline" size={13} color={Colors.status.warning} />
                                            <Text style={[styles.deptSummaryText, { color: Colors.status.warning }]}>
                                                {report.partialDepts} parciales
                                            </Text>
                                        </View>
                                    )}
                                    <View style={[styles.deptSummaryChip, { backgroundColor: Colors.status.errorBg, borderColor: Colors.status.errorBorder }]}>
                                        <Ionicons name="time-outline" size={13} color={Colors.status.error} />
                                        <Text style={[styles.deptSummaryText, { color: Colors.status.error }]}>
                                            {report.totalDepts - report.paidDepts - report.partialDepts} pendientes
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.tableCard}>
                                    <View style={styles.tableHeader}>
                                        <Text style={[styles.tableHeaderText, { width: 52 }]}>DEPTO</Text>
                                        <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>CUOTA</Text>
                                        <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>PAGADO</Text>
                                        <Text style={[styles.tableHeaderText, { width: 76, textAlign: "center" }]}>ESTADO</Text>
                                    </View>
                                    <View style={styles.tableDivider} />

                                    {deptRows.map((row, i) => {
                                        let sColor: string = Colors.status.error;
                                        let sBg: string = Colors.status.errorBg;
                                        let sBorder: string = Colors.status.errorBorder;
                                        let sLabel: string = "Pendiente";
                                        if (row.isPartial) {
                                            sColor = Colors.status.warning; sBg = Colors.status.warningBg;
                                            sBorder = Colors.status.warningBorder; sLabel = "Parcial";
                                        } else if (row.paid) {
                                            sColor = Colors.status.success; sBg = Colors.status.successBg;
                                            sBorder = Colors.status.successBorder; sLabel = "Pagado";
                                        }
                                        return (
                                            <View key={row.depId} style={[styles.deptRow, i % 2 !== 0 && styles.deptRowAlt]}>
                                                <View style={{ width: 52 }}>
                                                    <Text style={styles.deptName}>{row.depName}</Text>
                                                    {row.paidAt && <Text style={styles.deptDate}>{fmtDate(row.paidAt)}</Text>}
                                                </View>
                                                <Text style={[styles.deptAmount, { flex: 1, textAlign: "right", color: Colors.screen.textSecondary }]}>
                                                    {row.amountExpected > 0 ? fmt(row.amountExpected) : "—"}
                                                </Text>
                                                <Text style={[styles.deptAmount, {
                                                    flex: 1, textAlign: "right",
                                                    color: row.paid ? (row.isPartial ? Colors.status.warning : Colors.status.success) : Colors.status.error,
                                                }]}>
                                                    {row.paid ? fmt(row.amountPaid) : "—"}
                                                </Text>
                                                <View style={{ width: 76, alignItems: "center" }}>
                                                    <View style={[styles.statusBadge, { backgroundColor: sBg, borderColor: sBorder }]}>
                                                        <Text style={[styles.statusBadgeText, { color: sColor }]}>{sLabel}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        );
                                    })}

                                    <View style={styles.tableDivider} />
                                    <View style={styles.tableTotal}>
                                        <Text style={[styles.tableTotalText, { width: 52 }]}>TOTAL</Text>
                                        <Text style={[styles.tableTotalText, { flex: 1, textAlign: "right", color: Colors.screen.textSecondary }]}>
                                            {report.expectedIncome > 0 ? fmt(report.expectedIncome) : "—"}
                                        </Text>
                                        <Text style={[styles.tableTotalText, { flex: 1, textAlign: "right", color: Colors.status.success }]}>
                                            {fmt(report.income)}
                                        </Text>
                                        <View style={{ width: 76 }} />
                                    </View>
                                </View>
                            </>
                        )}

                        {/* Egresos */}
                        {expenseRows.length > 0 && (
                            <>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>DETALLE DE EGRESOS</Text>
                                    <View style={styles.sectionLine} />
                                </View>
                                <View style={styles.tableCard}>
                                    <View style={styles.tableHeader}>
                                        <Text style={[styles.tableHeaderText, { width: 80 }]}>FECHA</Text>
                                        <Text style={[styles.tableHeaderText, { flex: 1 }]}>CONCEPTO</Text>
                                        <Text style={[styles.tableHeaderText, { width: 80, textAlign: "right" }]}>MONTO</Text>
                                    </View>
                                    <View style={styles.tableDivider} />
                                    {expenseRows.map((row, i) => (
                                        <View key={i} style={[styles.expenseRow, i % 2 !== 0 && styles.deptRowAlt]}>
                                            <Text style={[styles.expenseDate, { width: 80 }]}>{row.date}</Text>
                                            <Text style={[styles.expenseConcept, { flex: 1 }]} numberOfLines={2}>{row.description}</Text>
                                            <Text style={[styles.expenseAmount, { width: 80, textAlign: "right" }]}>{fmt(row.amount)}</Text>
                                        </View>
                                    ))}
                                    <View style={styles.tableDivider} />
                                    <View style={styles.tableTotal}>
                                        <Text style={[styles.tableTotalText, { width: 80 }]}>TOTAL</Text>
                                        <View style={{ flex: 1 }} />
                                        <Text style={[styles.tableTotalText, { width: 80, textAlign: "right", color: Colors.status.error }]}>
                                            {fmt(report.expenses + report.incidentCosts)}
                                        </Text>
                                    </View>
                                </View>
                            </>
                        )}

                        {/* Alertas */}
                        {(report.netFlow < 0 || collectionRate < 80) && report.expectedIncome > 0 && (
                            <>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>ALERTAS</Text>
                                    <View style={styles.sectionLine} />
                                </View>
                                {report.netFlow < 0 && (
                                    <View style={[styles.alertCard, styles.alertCardError]}>
                                        <View style={styles.alertIconWrap}>
                                            <Ionicons name="trending-down" size={18} color={Colors.status.error} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.alertTitle, { color: Colors.status.error }]}>Flujo negativo</Text>
                                            <Text style={styles.alertBody}>
                                                Los egresos superan los ingresos en{" "}
                                                <Text style={{ fontFamily: "Outfit_700Bold" }}>{fmt(Math.abs(report.netFlow))}</Text>.
                                            </Text>
                                        </View>
                                    </View>
                                )}
                                {collectionRate < 80 && (
                                    <View style={[styles.alertCard, styles.alertCardWarning]}>
                                        <View style={styles.alertIconWrap}>
                                            <Ionicons name="alert-circle-outline" size={18} color={Colors.status.warning} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.alertTitle, { color: Colors.status.warning }]}>
                                                Cobranza baja ({collectionRate}%)
                                            </Text>
                                            <Text style={styles.alertBody}>
                                                {report.totalDepts - report.paidDepts - report.partialDepts} departamentos pendientes.
                                                Déficit:{" "}
                                                <Text style={{ fontFamily: "Outfit_700Bold" }}>{fmt(report.deficit)}</Text>.
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </>
                        )}

                        {/* Botón exportar */}
                        <TouchableOpacity
                            style={[styles.pdfBtn, sharing && { opacity: 0.7 }]}
                            onPress={handleShare}
                            disabled={sharing}
                            activeOpacity={0.85}
                        >
                            {sharing
                                ? <ActivityIndicator size="small" color="#fff" />
                                : <Ionicons name="document-outline" size={18} color="#fff" />
                            }
                            <Text style={styles.pdfBtnText}>
                                {sharing ? "Generando PDF..." : "Exportar reporte PDF"}
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.footerNote}>
                            <Ionicons name="information-circle-outline" size={13} color={Colors.screen.textMuted} />
                            <Text style={styles.footerNoteText}>
                                El PDF incluye tabla detallada por departamento · {new Date().toLocaleDateString("es-MX")}
                            </Text>
                        </View>
                    </ScrollView>
                )}
            </SafeAreaView>

            <MonthYearPicker
                visible={showPicker}
                availableMonths={availableMonths}
                selectedKey={selectedMonth?.key ?? ""}
                onApply={(m) => setSelectedMonth(m)}
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
        backgroundColor: Colors.screen.card, borderBottomWidth: 1, borderBottomColor: Colors.screen.border,
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
    filterBar: {
        flexDirection: "row", alignItems: "center", gap: 8,
        paddingHorizontal: 16, paddingVertical: 10,
        backgroundColor: Colors.screen.card, borderBottomWidth: 1, borderBottomColor: Colors.screen.border,
    },
    filterLabel: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: Colors.screen.textMuted },
    periodBtn: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10,
        backgroundColor: Colors.primary.soft, borderWidth: 1, borderColor: Colors.primary.muted,
    },
    periodBtnText: { fontFamily: "Outfit_700Bold", fontSize: 13, color: Colors.primary.dark },
    configLink: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: Colors.status.warning, marginLeft: 4 },
    scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48, gap: 12 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
    emptyIconWrap: {
        width: 64, height: 64, borderRadius: 20,
        backgroundColor: Colors.neutral[100], alignItems: "center", justifyContent: "center",
    },
    emptyTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 16, color: Colors.screen.textSecondary },
    stateText: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.screen.textMuted, textAlign: "center", lineHeight: 20 },
    retryBtn: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10,
        backgroundColor: Colors.primary.soft, borderWidth: 1, borderColor: Colors.primary.muted,
    },
    retryText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.primary.dark },
    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
    sectionTitle: { fontFamily: "Outfit_700Bold", fontSize: 10, color: Colors.screen.textMuted, letterSpacing: 1.8 },
    sectionLine: { flex: 1, height: 1, backgroundColor: Colors.screen.border },
    kpiGrid: { flexDirection: "row", gap: 10 },
    netFlowCard: {
        backgroundColor: Colors.screen.card, borderRadius: 16, borderWidth: 1,
        borderColor: Colors.screen.border, borderTopWidth: 4, padding: 16,
        flexDirection: "row", alignItems: "center", gap: 14,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    },
    netFlowLeft: { flex: 1 },
    netFlowLabel: { fontFamily: "Outfit_700Bold", fontSize: 10, color: Colors.screen.textMuted, letterSpacing: 1.5, marginBottom: 4 },
    netFlowValue: { fontFamily: "Outfit_900Black", fontSize: 28, letterSpacing: -0.5 },
    netFlowBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
    netFlowBadgeText: { fontFamily: "Outfit_700Bold", fontSize: 13 },
    card: { backgroundColor: Colors.screen.card, borderRadius: 14, borderWidth: 1, borderColor: Colors.screen.border, padding: 16, gap: 10 },
    collectionHeader: { flexDirection: "row", alignItems: "center" },
    collectionTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.screen.textPrimary },
    collectionSub: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted, marginTop: 2 },
    collectionPct: { fontFamily: "Outfit_900Black", fontSize: 32, letterSpacing: -1 },
    deficitNote: {
        flexDirection: "row", alignItems: "center", gap: 6,
        backgroundColor: Colors.status.errorBg, borderRadius: 8,
        borderWidth: 1, borderColor: Colors.status.errorBorder, paddingHorizontal: 10, paddingVertical: 7,
    },
    deficitNoteText: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.status.error },
    deptSummaryRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    deptSummaryChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
    deptSummaryText: { fontFamily: "Outfit_600SemiBold", fontSize: 12 },
    tableCard: { backgroundColor: Colors.screen.card, borderRadius: 14, borderWidth: 1, borderColor: Colors.screen.border, overflow: "hidden" },
    tableHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 9, backgroundColor: Colors.screen.bg },
    tableHeaderText: { fontFamily: "Outfit_700Bold", fontSize: 9, color: Colors.screen.textMuted, letterSpacing: 1.1 },
    tableDivider: { height: 1, backgroundColor: Colors.screen.border },
    tableTotal: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 11, backgroundColor: Colors.primary.soft },
    tableTotalText: { fontFamily: "Outfit_700Bold", fontSize: 12, color: Colors.screen.textPrimary },
    deptRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10 },
    deptRowAlt: { backgroundColor: Colors.neutral[50] },
    deptName: { fontFamily: "Outfit_700Bold", fontSize: 12, color: Colors.screen.textPrimary },
    deptDate: { fontFamily: "Outfit_400Regular", fontSize: 9, color: Colors.screen.textMuted, marginTop: 1 },
    deptAmount: { fontFamily: "Outfit_700Bold", fontSize: 12 },
    statusBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
    statusBadgeText: { fontFamily: "Outfit_700Bold", fontSize: 9 },
    expenseRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 9, gap: 8 },
    expenseDate: { fontFamily: "Outfit_400Regular", fontSize: 10, color: Colors.screen.textMuted },
    expenseConcept: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textSecondary },
    expenseAmount: { fontFamily: "Outfit_700Bold", fontSize: 12, color: Colors.screen.textPrimary },
    alertCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 13, borderWidth: 1, padding: 14 },
    alertCardError: { backgroundColor: Colors.status.errorBg, borderColor: Colors.status.errorBorder },
    alertCardWarning: { backgroundColor: Colors.status.warningBg, borderColor: Colors.status.warningBorder },
    alertIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.7)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    alertTitle: { fontFamily: "Outfit_700Bold", fontSize: 13, marginBottom: 4 },
    alertBody: { fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.screen.textSecondary, lineHeight: 18 },
    pdfBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 10, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.primary.main, marginTop: 4,
        shadowColor: Colors.primary.dark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
    },
    pdfBtnText: { fontFamily: "Outfit_700Bold", fontSize: 14, color: "#fff" },
    footerNote: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingTop: 4 },
    footerNoteText: { fontFamily: "Outfit_400Regular", fontSize: 10, color: Colors.screen.textMuted, textAlign: "center", lineHeight: 15 },
});

const kpi = StyleSheet.create({
    root: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center", gap: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    iconWrap: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center", marginBottom: 4 },
    value: { fontFamily: "Outfit_800ExtraBold", fontSize: 22, letterSpacing: -0.5 },
    label: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: Colors.screen.textSecondary },
    sub: { fontFamily: "Outfit_400Regular", fontSize: 10, color: Colors.screen.textMuted, textAlign: "center" },
});

const pb = StyleSheet.create({
    track: { height: 8, borderRadius: 4, backgroundColor: Colors.screen.border, overflow: "hidden" },
    fill: { height: "100%", borderRadius: 4 },
});

const picker = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    sheet: {
        backgroundColor: Colors.screen.card, borderTopLeftRadius: 26, borderTopRightRadius: 26,
        padding: 20, paddingBottom: 36, gap: 14, maxHeight: "80%",
        shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20,
    },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.screen.border, alignSelf: "center" },
    sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    sheetTitle: { fontFamily: "Outfit_700Bold", fontSize: 17, color: Colors.screen.textPrimary },
    sheetSub: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted, marginTop: 2 },
    closeBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.neutral[100], borderWidth: 1, borderColor: Colors.screen.border, alignItems: "center", justifyContent: "center" },
    emptyNote: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: Colors.status.warningBg, borderRadius: 10, borderWidth: 1, borderColor: Colors.status.warningBorder, padding: 14 },
    emptyNoteText: { flex: 1, fontFamily: "Outfit_400Regular", fontSize: 12, color: Colors.status.warning, lineHeight: 18 },
    monthList: { gap: 6, paddingBottom: 4 },
    monthItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: Colors.screen.border, backgroundColor: Colors.screen.bg },
    monthItemActive: { backgroundColor: Colors.primary.soft, borderColor: Colors.primary.muted },
    monthItemName: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.screen.textSecondary },
    monthItemNameActive: { color: Colors.primary.dark },
    monthItemYear: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted, marginTop: 1 },
    actions: { flexDirection: "row", gap: 10 },
    cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center", backgroundColor: Colors.screen.bg, borderWidth: 1, borderColor: Colors.screen.border },
    cancelText: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: Colors.screen.textSecondary },
    applyBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 12, backgroundColor: Colors.primary.main },
    applyText: { fontFamily: "Outfit_700Bold", fontSize: 14, color: "#fff" },
});