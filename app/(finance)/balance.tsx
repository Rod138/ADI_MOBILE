import { Colors } from "@/constants/colors";
import { useSession } from "@/context/AuthContext";
import { useBalance } from "@/hooks/useBalance";
import { MONTHS } from "@/hooks/useRecipes";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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

// Helpers
function formatCurrency(n: number) {
    return `$${Number(n).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

const CURRENT_YEAR = new Date().getFullYear();
const MONTH_NAMES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const CURRENT_MONTH = MONTH_NAMES[new Date().getMonth()];

// Stat Card
function StatCard({
    icon, label, value, color, bg, border, note,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    color: string;
    bg: string;
    border: string;
    note?: string;
}) {
    return (
        <View style={[sc.root, { borderColor: border, backgroundColor: bg }]}>
            <View style={[sc.iconWrap, { backgroundColor: color + "20" }]}>
                <Ionicons name={icon} size={18} color={color} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[sc.label, { color }]}>{label}</Text>
                <Text style={[sc.value, { color }]}>{value}</Text>
                {note && <Text style={sc.note}>{note}</Text>}
            </View>
        </View>
    );
}

// Period Picker Modal
function PeriodPickerModal({
    visible,
    selectedMonth,
    selectedYear,
    onSelect,
    onClose,
}: {
    visible: boolean;
    selectedMonth: string;
    selectedYear: number;
    onSelect: (month: string, year: number) => void;
    onClose: () => void;
}) {
    const [year, setYear] = useState(selectedYear);
    const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={pm.overlay}>
                <View style={pm.sheet}>
                    <View style={pm.handle} />
                    <Text style={pm.title}>Seleccionar período</Text>

                    <View style={pm.yearRow}>
                        {YEARS.map(y => (
                            <TouchableOpacity
                                key={y}
                                style={[pm.yearBtn, year === y && pm.yearBtnActive]}
                                onPress={() => setYear(y)}
                                activeOpacity={0.8}
                            >
                                <Text style={[pm.yearBtnText, year === y && pm.yearBtnTextActive]}>{y}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={pm.monthGrid}>
                        {MONTHS.map(m => {
                            const isSelected = selectedMonth === m.value && selectedYear === year;
                            return (
                                <TouchableOpacity
                                    key={m.value}
                                    style={[pm.monthBtn, isSelected && pm.monthBtnActive]}
                                    onPress={() => { onSelect(m.value, year); onClose(); }}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[pm.monthBtnText, isSelected && pm.monthBtnTextActive]}>
                                        {m.label.slice(0, 3)}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <TouchableOpacity style={pm.cancelBtn} onPress={onClose}>
                        <Text style={pm.cancelText}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

// Balance Bar

function BalanceBar({
    income, expenses, expected,
}: {
    income: number;
    expenses: number;
    expected: number;
}) {
    const max = Math.max(expected, income + expenses, 1);
    const incomeWidth = Math.min((income / max) * 100, 100);
    const expenseWidth = Math.min((expenses / max) * 100, 100);
    const expectedWidth = Math.min((expected / max) * 100, 100);

    return (
        <View style={bar.root}>
            <View style={bar.row}>
                <Text style={bar.label}>Ingresos</Text>
                <View style={bar.track}>
                    <View style={[bar.fill, { width: `${incomeWidth}%`, backgroundColor: Colors.status.success }]} />
                </View>
                <Text style={[bar.value, { color: Colors.status.success }]}>{formatCurrency(income)}</Text>
            </View>
            <View style={bar.row}>
                <Text style={bar.label}>Egresos</Text>
                <View style={bar.track}>
                    <View style={[bar.fill, { width: `${expenseWidth}%`, backgroundColor: Colors.status.error }]} />
                </View>
                <Text style={[bar.value, { color: Colors.status.error }]}>{formatCurrency(expenses)}</Text>
            </View>
            <View style={bar.row}>
                <Text style={bar.label}>Esperado</Text>
                <View style={bar.track}>
                    <View style={[bar.fill, { width: `${expectedWidth}%`, backgroundColor: Colors.primary.main }]} />
                </View>
                <Text style={[bar.value, { color: Colors.primary.dark }]}>{formatCurrency(expected)}</Text>
            </View>
        </View>
    );
}

// Main Screen

export default function BalanceScreen() {
    const { user } = useSession();
    const { balance, isLoading, error, fetchBalance } = useBalance();

    const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH);
    const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
    const [showPicker, setShowPicker] = useState(false);

    useEffect(() => {
        loadBalance();
    }, [selectedMonth, selectedYear]);

    const loadBalance = () => {
        fetchBalance({ month: selectedMonth, year: selectedYear });
    };

    const isDeficit = (balance?.monthlyDeficit ?? 0) > 0;
    const coveragePercent = balance && balance.monthlyExpected > 0
        ? Math.min(Math.round((balance.monthlyIncome / balance.monthlyExpected) * 100), 100)
        : 0;

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
                        <Text style={styles.headerTitle}>Estado de cuenta</Text>
                        <Text style={styles.headerSubtitle}>Balance general del condominio</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.periodBtn}
                        onPress={() => setShowPicker(true)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="calendar-outline" size={14} color={Colors.primary.dark} />
                        <Text style={styles.periodBtnText}>{selectedMonth.slice(0, 3)} {selectedYear}</Text>
                        <Ionicons name="chevron-down" size={12} color={Colors.primary.dark} />
                    </TouchableOpacity>
                </View>

                {isLoading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={Colors.primary.main} />
                        <Text style={styles.stateText}>Calculando balance...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.centered}>
                        <Ionicons name="cloud-offline-outline" size={36} color={Colors.screen.textMuted} />
                        <Text style={styles.stateText}>{error}</Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={loadBalance}>
                            <Ionicons name="refresh" size={14} color={Colors.primary.dark} />
                            <Text style={styles.retryText}>Reintentar</Text>
                        </TouchableOpacity>
                    </View>
                ) : balance ? (
                    <ScrollView
                        contentContainerStyle={styles.scroll}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* SALDO DISPONIBLE */}
                        <View style={[
                            styles.heroCard,
                            { borderTopColor: balance.availableBalance >= 0 ? Colors.status.success : Colors.status.error },
                        ]}>
                            <Text style={styles.heroLabel}>SALDO DISPONIBLE</Text>
                            <Text style={[
                                styles.heroAmount,
                                { color: balance.availableBalance >= 0 ? Colors.primary.dark : Colors.status.error }
                            ]}>
                                {formatCurrency(balance.availableBalance)}
                            </Text>
                            <View style={styles.heroSub}>
                                <View style={styles.heroSubItem}>
                                    <Ionicons name="business-outline" size={12} color={Colors.screen.textMuted} />
                                    <Text style={styles.heroSubText}>
                                        Fondo inicial: {formatCurrency(balance.initialFund)}
                                    </Text>
                                </View>
                                <View style={styles.heroSubItem}>
                                    <Ionicons name="people-outline" size={12} color={Colors.screen.textMuted} />
                                    <Text style={styles.heroSubText}>
                                        {balance.activeDepartments} dptos activos
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* RESUMEN ACUMULADO */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>ACUMULADO TOTAL</Text>
                            <View style={styles.sectionLine} />
                        </View>

                        <View style={styles.statsGrid}>
                            <StatCard
                                icon="arrow-up-circle-outline"
                                label="Ingresos totales"
                                value={formatCurrency(balance.totalIncome)}
                                color={Colors.status.success}
                                bg={Colors.status.successBg}
                                border={Colors.status.successBorder}
                                note="Cuotas validadas"
                            />
                            <StatCard
                                icon="arrow-down-circle-outline"
                                label="Gastos totales"
                                value={formatCurrency(balance.totalExpenses)}
                                color={Colors.status.error}
                                bg={Colors.status.errorBg}
                                border={Colors.status.errorBorder}
                                note="Gastos registrados"
                            />
                            <StatCard
                                icon="construct-outline"
                                label="Incidencias"
                                value={formatCurrency(balance.totalIncidentCosts)}
                                color={Colors.status.warning}
                                bg={Colors.status.warningBg}
                                border={Colors.status.warningBorder}
                                note="Costos resueltos"
                            />
                        </View>

                        {/* BALANCE MENSUAL  */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>MES: {selectedMonth.toUpperCase()} {selectedYear}</Text>
                            <View style={styles.sectionLine} />
                        </View>

                        {/* Cobertura */}
                        {balance.monthlyExpected > 0 && (
                            <View style={styles.coverageCard}>
                                <View style={styles.coverageHeader}>
                                    <Text style={styles.coverageTitle}>Cobertura de cuotas</Text>
                                    <Text style={[
                                        styles.coveragePct,
                                        { color: coveragePercent >= 100 ? Colors.status.success : Colors.status.warning }
                                    ]}>
                                        {coveragePercent}%
                                    </Text>
                                </View>
                                <View style={styles.coverageTrack}>
                                    <View style={[
                                        styles.coverageFill,
                                        {
                                            width: `${coveragePercent}%`,
                                            backgroundColor: coveragePercent >= 100 ? Colors.status.success : Colors.status.warning,
                                        }
                                    ]} />
                                </View>
                                <Text style={styles.coverageNote}>
                                    {formatCurrency(balance.monthlyIncome)} de {formatCurrency(balance.monthlyExpected)} esperados
                                </Text>
                            </View>
                        )}

                        {/* Barras comparativas */}
                        {(balance.monthlyExpected > 0 || balance.monthlyIncome > 0 || balance.monthlyExpenses > 0) && (
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>Comparativa del mes</Text>
                                <BalanceBar
                                    income={balance.monthlyIncome}
                                    expenses={balance.monthlyExpenses + balance.monthlyIncidentCosts}
                                    expected={balance.monthlyExpected}
                                />
                            </View>
                        )}

                        {/* Stats mensuales */}
                        <View style={styles.monthlyGrid}>
                            <View style={[styles.monthlyCard, { borderTopColor: Colors.status.success }]}>
                                <Ionicons name="arrow-up-circle" size={20} color={Colors.status.success} />
                                <Text style={styles.monthlyValue}>{formatCurrency(balance.monthlyIncome)}</Text>
                                <Text style={styles.monthlyLabel}>Ingresos</Text>
                            </View>
                            <View style={[styles.monthlyCard, { borderTopColor: Colors.status.error }]}>
                                <Ionicons name="arrow-down-circle" size={20} color={Colors.status.error} />
                                <Text style={styles.monthlyValue}>{formatCurrency(balance.monthlyExpenses + balance.monthlyIncidentCosts)}</Text>
                                <Text style={styles.monthlyLabel}>Egresos</Text>
                            </View>
                        </View>

                        {/* Déficit / Superávit */}
                        {balance.monthlyExpected > 0 && (
                            <View style={[
                                styles.deficitCard,
                                {
                                    backgroundColor: isDeficit ? Colors.status.errorBg : Colors.status.successBg,
                                    borderColor: isDeficit ? Colors.status.errorBorder : Colors.status.successBorder,
                                }
                            ]}>
                                <Ionicons
                                    name={isDeficit ? "alert-circle-outline" : "checkmark-circle-outline"}
                                    size={20}
                                    color={isDeficit ? Colors.status.error : Colors.status.success}
                                />
                                <View style={{ flex: 1 }}>
                                    <Text style={[
                                        styles.deficitLabel,
                                        { color: isDeficit ? Colors.status.error : Colors.status.success }
                                    ]}>
                                        {isDeficit ? "Déficit del mes" : "Sin déficit"}
                                    </Text>
                                    <Text style={[
                                        styles.deficitAmount,
                                        { color: isDeficit ? Colors.status.error : Colors.status.success }
                                    ]}>
                                        {isDeficit
                                            ? `Faltan ${formatCurrency(balance.monthlyDeficit)} por recaudar`
                                            : `Cobertura completa`}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Nota: sin cuota configurada */}
                        {balance.monthlyExpected === 0 && (
                            <View style={styles.noQuotaNote}>
                                <Ionicons name="information-circle-outline" size={14} color={Colors.screen.textMuted} />
                                <Text style={styles.noQuotaText}>
                                    No hay cuota configurada para este mes. Ve a "Cuota mensual" para registrarla.
                                </Text>
                            </View>
                        )}
                    </ScrollView>
                ) : null}
            </SafeAreaView>

            {/* Period Picker Modal */}
            <PeriodPickerModal
                visible={showPicker}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                onSelect={(month, year) => {
                    setSelectedMonth(month);
                    setSelectedYear(year);
                }}
                onClose={() => setShowPicker(false)}
            />
        </View>
    );
}

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
    periodBtn: {
        flexDirection: "row", alignItems: "center", gap: 5,
        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
        backgroundColor: Colors.primary.soft, borderWidth: 1, borderColor: Colors.primary.muted,
    },
    periodBtnText: { fontFamily: "Outfit_600SemiBold", fontSize: 12, color: Colors.primary.dark },
    scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, gap: 12 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
    stateText: { fontFamily: "Outfit_400Regular", fontSize: 13, color: Colors.screen.textMuted, textAlign: "center" },
    retryBtn: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10,
        backgroundColor: Colors.primary.soft, borderWidth: 1, borderColor: Colors.primary.muted,
    },
    retryText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.primary.dark },
    heroCard: {
        backgroundColor: Colors.screen.card, borderRadius: 16,
        borderWidth: 1, borderColor: Colors.screen.border,
        borderTopWidth: 4, padding: 20, gap: 8, alignItems: "center",
        shadowColor: "#000", shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    },
    heroLabel: {
        fontFamily: "Outfit_700Bold", fontSize: 10,
        color: Colors.screen.textMuted, letterSpacing: 2,
    },
    heroAmount: {
        fontFamily: "Outfit_900Black", fontSize: 36,
        letterSpacing: -0.5,
    },
    heroSub: { flexDirection: "row", gap: 16, marginTop: 4 },
    heroSubItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    heroSubText: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted },
    sectionHeader: {
        flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4,
    },
    sectionTitle: {
        fontFamily: "Outfit_700Bold", fontSize: 10,
        color: Colors.screen.textMuted, letterSpacing: 1.8,
    },
    sectionLine: { flex: 1, height: 1, backgroundColor: Colors.screen.border },
    statsGrid: { gap: 8 },
    monthlyGrid: { flexDirection: "row", gap: 8 },
    monthlyCard: {
        flex: 1, backgroundColor: Colors.screen.card, borderRadius: 14,
        borderWidth: 1, borderColor: Colors.screen.border,
        borderTopWidth: 3, padding: 14, alignItems: "center", gap: 6,
    },
    monthlyValue: { fontFamily: "Outfit_700Bold", fontSize: 15, color: Colors.screen.textPrimary },
    monthlyLabel: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted },
    coverageCard: {
        backgroundColor: Colors.screen.card, borderRadius: 14,
        borderWidth: 1, borderColor: Colors.screen.border, padding: 16, gap: 8,
    },
    coverageHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    coverageTitle: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.screen.textPrimary },
    coveragePct: { fontFamily: "Outfit_800ExtraBold", fontSize: 20 },
    coverageTrack: {
        height: 8, borderRadius: 4,
        backgroundColor: Colors.screen.border, overflow: "hidden",
    },
    coverageFill: { height: "100%", borderRadius: 4 },
    coverageNote: { fontFamily: "Outfit_400Regular", fontSize: 11, color: Colors.screen.textMuted },
    card: {
        backgroundColor: Colors.screen.card, borderRadius: 14,
        borderWidth: 1, borderColor: Colors.screen.border, padding: 16, gap: 12,
    },
    cardTitle: { fontFamily: "Outfit_700Bold", fontSize: 13, color: Colors.screen.textPrimary },
    deficitCard: {
        flexDirection: "row", alignItems: "center", gap: 12,
        borderRadius: 12, borderWidth: 1, padding: 14,
    },
    deficitLabel: { fontFamily: "Outfit_700Bold", fontSize: 13 },
    deficitAmount: { fontFamily: "Outfit_400Regular", fontSize: 12, marginTop: 2 },
    noQuotaNote: {
        flexDirection: "row", alignItems: "flex-start", gap: 8,
        backgroundColor: Colors.neutral[100], borderRadius: 10,
        borderWidth: 1, borderColor: Colors.screen.border,
        paddingHorizontal: 12, paddingVertical: 10,
    },
    noQuotaText: {
        flex: 1, fontFamily: "Outfit_400Regular", fontSize: 12,
        color: Colors.screen.textMuted, lineHeight: 17,
    },
});
const sc = StyleSheet.create({
    root: {
        flexDirection: "row", alignItems: "center", gap: 12,
        borderRadius: 12, borderWidth: 1, padding: 14,
    },
    iconWrap: {
        width: 40, height: 40, borderRadius: 12,
        alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    label: { fontFamily: "Outfit_500Medium", fontSize: 11, marginBottom: 2 },
    value: { fontFamily: "Outfit_700Bold", fontSize: 16 },
    note: { fontFamily: "Outfit_400Regular", fontSize: 10, color: Colors.screen.textMuted, marginTop: 2 },
});
const bar = StyleSheet.create({
    root: { gap: 10 },
    row: { flexDirection: "row", alignItems: "center", gap: 8 },
    label: { fontFamily: "Outfit_500Medium", fontSize: 11, color: Colors.screen.textSecondary, width: 64 },
    track: {
        flex: 1, height: 8, borderRadius: 4,
        backgroundColor: Colors.screen.border, overflow: "hidden",
    },
    fill: { height: "100%", borderRadius: 4 },
    value: { fontFamily: "Outfit_700Bold", fontSize: 11, width: 80, textAlign: "right" },
});
const pm = StyleSheet.create({
    overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
    sheet: {
        backgroundColor: Colors.screen.card,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingHorizontal: 20, paddingBottom: 36,
        borderTopWidth: 1, borderTopColor: Colors.screen.border,
    },
    handle: {
        width: 36, height: 4, borderRadius: 2,
        backgroundColor: Colors.screen.border, alignSelf: "center",
        marginTop: 12, marginBottom: 16,
    },
    title: { fontFamily: "Outfit_700Bold", fontSize: 16, color: Colors.screen.textPrimary, marginBottom: 16 },
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