import InputField from "@/components/InputField";
import PrimaryButton from "@/components/PrimaryButton";
import { Colors } from "@/constants/colors";
import { useSession } from "@/context/AuthContext";
import { useMonthlyQuota } from "@/hooks/useMonthlyQuota";
import { MONTHS, MONTH_ORDER } from "@/hooks/useRecipes";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH_NAME = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
][new Date().getMonth()];
const YEARS = [CURRENT_YEAR, CURRENT_YEAR + 1];

function formatCurrency(n: number) {
    return `$${Number(n).toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// Month Grid

function MonthGrid({
    selectedMonth,
    selectedYear,
    existingQuotas,
    onSelectMonth,
    onSelectYear,
}: {
    selectedMonth: string;
    selectedYear: number;
    existingQuotas: Array<{ month: string; year: number; amount: number }>;
    onSelectMonth: (m: string) => void;
    onSelectYear: (y: number) => void;
}) {
    return (
        <View>
            {/* Year pills */}
            <View style={grid.yearRow}>
                {YEARS.map(y => (
                    <TouchableOpacity
                        key={y}
                        style={[grid.yearBtn, selectedYear === y && grid.yearBtnActive]}
                        onPress={() => onSelectYear(y)}
                        activeOpacity={0.8}
                    >
                        <Text style={[grid.yearBtnText, selectedYear === y && grid.yearBtnTextActive]}>{y}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Month grid */}
            <View style={grid.monthGrid}>
                {MONTHS.map(m => {
                    const existing = existingQuotas.find(q => q.month === m.value && q.year === selectedYear);
                    const isSelected = selectedMonth === m.value;
                    const isCurrent = m.value === CURRENT_MONTH_NAME && selectedYear === CURRENT_YEAR;

                    return (
                        <TouchableOpacity
                            key={m.value}
                            style={[
                                grid.monthBtn,
                                isSelected && grid.monthBtnActive,
                                existing && !isSelected && grid.monthBtnHasQuota,
                            ]}
                            onPress={() => onSelectMonth(m.value)}
                            activeOpacity={0.8}
                        >
                            <Text style={[
                                grid.monthText,
                                isSelected && grid.monthTextActive,
                                existing && !isSelected && grid.monthTextHasQuota,
                            ]}>
                                {m.label.slice(0, 3)}
                            </Text>
                            {isCurrent && !isSelected && (
                                <View style={grid.currentDot} />
                            )}
                            {existing && (
                                <Text style={[grid.quotaAmount, isSelected && { color: "#fff" }]}>
                                    {formatCurrency(existing.amount)}
                                </Text>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

// Main Screen

export default function AdminQuotaScreen() {
    const { user } = useSession();
    const { quotas, isLoading, fetchAllQuotas, createQuota, updateQuota } = useMonthlyQuota();

    const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH_NAME);
    const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
    const [amount, setAmount] = useState("");
    const [amountError, setAmountError] = useState<string | undefined>();
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchAllQuotas();
    }, []);

    // Cuota existente para el mes/año seleccionado
    const existingQuota = useMemo(
        () => quotas.find(q => q.month === selectedMonth && q.year === selectedYear) ?? null,
        [quotas, selectedMonth, selectedYear]
    );

    // Pre-llenar monto si existe
    useEffect(() => {
        if (existingQuota) {
            setAmount(String(existingQuota.amount));
        } else {
            setAmount("");
        }
        setAmountError(undefined);
    }, [existingQuota, selectedMonth, selectedYear]);

    const validate = () => {
        if (!amount.trim()) { setAmountError("Ingresa el monto de la cuota."); return false; }
        const n = parseFloat(amount.replace(/,/g, ""));
        if (isNaN(n) || n <= 0) { setAmountError("El monto debe ser mayor a 0."); return false; }
        return true;
    };

    const handleSave = async () => {
        if (!validate()) return;
        const parsedAmount = parseFloat(amount.replace(/,/g, ""));

        Alert.alert(
            existingQuota ? "Actualizar cuota" : "Crear cuota",
            `¿${existingQuota ? "Actualizar" : "Registrar"} la cuota de ${selectedMonth} ${selectedYear} a ${formatCurrency(parsedAmount)}?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Confirmar",
                    onPress: async () => {
                        setSaving(true);
                        let ok: boolean;
                        if (existingQuota) {
                            ok = await updateQuota(existingQuota.id, parsedAmount);
                        } else {
                            ok = await createQuota(selectedMonth, selectedYear, parsedAmount);
                        }
                        setSaving(false);

                        if (ok) {
                            Alert.alert("¡Listo!", `Cuota de ${selectedMonth} ${selectedYear} ${existingQuota ? "actualizada" : "registrada"} correctamente.`);
                            await fetchAllQuotas();
                        } else {
                            Alert.alert("Error", "No se pudo guardar la cuota. Intenta de nuevo.");
                        }
                    },
                },
            ]
        );
    };

    const existingQuotasList = useMemo(
        () => quotas.map(q => ({ month: q.month, year: q.year, amount: q.amount })),
        [quotas]
    );

    // Ordenar historial por año desc, luego por mes desc
    const sortedQuotas = useMemo(
        () => [...quotas].sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return (MONTH_ORDER[b.month] ?? 0) - (MONTH_ORDER[a.month] ?? 0);
        }),
        [quotas]
    );

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
                        <Text style={styles.headerTitle}>Cuota mensual</Text>
                        <Text style={styles.headerSubtitle}>Define la cuota por período</Text>
                    </View>
                    {isLoading && <ActivityIndicator size="small" color={Colors.primary.main} />}
                </View>

                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Info banner */}
                    <View style={styles.infoBanner}>
                        <Ionicons name="information-circle-outline" size={16} color="#0891B2" />
                        <Text style={styles.infoBannerText}>
                            La cuota mensual determina el monto esperado por departamento. Se usa para calcular el balance general y mostrárselo a los residentes.
                        </Text>
                    </View>

                    {/* Selector mes/año */}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardIconWrap}>
                                <Ionicons name="calendar-outline" size={18} color="#0891B2" />
                            </View>
                            <View>
                                <Text style={styles.cardTitle}>Selecciona el período</Text>
                                <Text style={styles.cardSubtitle}>Toca un mes para editarlo</Text>
                            </View>
                        </View>
                        <MonthGrid
                            selectedMonth={selectedMonth}
                            selectedYear={selectedYear}
                            existingQuotas={existingQuotasList}
                            onSelectMonth={setSelectedMonth}
                            onSelectYear={setSelectedYear}
                        />
                    </View>

                    {/* Formulario */}
                    <View style={[styles.card, styles.cardAccent]}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.cardIconWrap, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
                                <Ionicons name="cash-outline" size={18} color={Colors.status.success} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.cardTitle}>
                                    {existingQuota ? "Editar cuota" : "Nueva cuota"}
                                </Text>
                                <Text style={styles.cardSubtitle}>
                                    {selectedMonth} {selectedYear}
                                    {existingQuota ? ` · Actual: ${formatCurrency(existingQuota.amount)}` : " · Sin cuota registrada"}
                                </Text>
                            </View>
                            {existingQuota && (
                                <View style={styles.existingBadge}>
                                    <Ionicons name="checkmark-circle" size={12} color={Colors.status.success} />
                                    <Text style={styles.existingBadgeText}>Registrada</Text>
                                </View>
                            )}
                        </View>

                        <InputField
                            theme="light"
                            label="MONTO DE LA CUOTA (MXN)"
                            placeholder="Ej. 1500"
                            leftIcon="cash-outline"
                            keyboardType="decimal-pad"
                            maxLength={8}
                            value={amount}
                            onChangeText={(t) => {
                                setAmount(t.replace(/[^0-9.]/g, ""));
                                setAmountError(undefined);
                            }}
                            error={amountError}
                        />

                        {saving ? (
                            <View style={styles.loadingRow}>
                                <ActivityIndicator size="small" color={Colors.primary.main} />
                                <Text style={styles.loadingText}>Guardando cuota...</Text>
                            </View>
                        ) : (
                            <PrimaryButton
                                label={existingQuota ? "Actualizar cuota" : "Registrar cuota"}
                                onPress={handleSave}
                                disabled={saving}
                            />
                        )}
                    </View>

                    {/* Historial */}
                    {sortedQuotas.length > 0 && (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={[styles.cardIconWrap, { backgroundColor: Colors.secondary.soft, borderColor: "#FED7AA" }]}>
                                    <Ionicons name="time-outline" size={18} color={Colors.secondary.main} />
                                </View>
                                <View>
                                    <Text style={styles.cardTitle}>Historial</Text>
                                    <Text style={styles.cardSubtitle}>{sortedQuotas.length} períodos registrados</Text>
                                </View>
                            </View>
                            <View style={styles.historyList}>
                                {sortedQuotas.map((q, i) => (
                                    <TouchableOpacity
                                        key={q.id}
                                        style={[styles.historyRow, i < sortedQuotas.length - 1 && styles.historyRowBorder]}
                                        onPress={() => {
                                            setSelectedMonth(q.month);
                                            setSelectedYear(q.year);
                                        }}
                                        activeOpacity={0.7}
                                    >
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
                </ScrollView>
            </SafeAreaView>
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

    scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, gap: 12 },

    infoBanner: {
        flexDirection: "row", alignItems: "flex-start", gap: 10,
        backgroundColor: "#F0F9FF", borderWidth: 1, borderColor: "#BAE6FD",
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    },
    infoBannerText: {
        flex: 1, fontFamily: "Outfit_400Regular", fontSize: 12,
        color: "#0C4A6E", lineHeight: 18,
    },
    card: {
        backgroundColor: Colors.screen.card, borderRadius: 16,
        borderWidth: 1, borderColor: Colors.screen.border, padding: 16,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
        gap: 14,
    },
    cardAccent: {
        borderTopWidth: 3, borderTopColor: Colors.primary.main,
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
        flexDirection: "row", alignItems: "center", justifyContent: "center",
        gap: 10, paddingVertical: 14,
    },
    loadingText: { fontFamily: "Outfit_500Medium", fontSize: 14, color: Colors.primary.main },

    historyList: { gap: 0 },
    historyRow: {
        flexDirection: "row", alignItems: "center", gap: 10,
        paddingVertical: 12,
    },
    historyRowBorder: {
        borderBottomWidth: 1, borderBottomColor: Colors.screen.border,
    },
    historyLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
    historyPeriod: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: Colors.screen.textPrimary },
    historyAmount: { fontFamily: "Outfit_700Bold", fontSize: 14, color: Colors.primary.dark },
    currentTag: {
        paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
        backgroundColor: Colors.primary.soft, borderWidth: 1, borderColor: Colors.primary.muted,
    },
    currentTagText: { fontFamily: "Outfit_700Bold", fontSize: 9, color: Colors.primary.dark },
});
const grid = StyleSheet.create({
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
        width: "22%", paddingVertical: 10, paddingHorizontal: 4,
        alignItems: "center", borderRadius: 10,
        backgroundColor: Colors.screen.bg, borderWidth: 1, borderColor: Colors.screen.border,
        gap: 2,
    },
    monthBtnActive: { backgroundColor: "#0891B2", borderColor: "#0891B2" },
    monthBtnHasQuota: { backgroundColor: Colors.primary.soft, borderColor: Colors.primary.muted },
    monthText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: Colors.screen.textSecondary },
    monthTextActive: { fontFamily: "Outfit_700Bold", color: "#fff" },
    monthTextHasQuota: { fontFamily: "Outfit_600SemiBold", color: Colors.primary.dark },
    currentDot: {
        width: 5, height: 5, borderRadius: 3,
        backgroundColor: Colors.secondary.main,
    },
    quotaAmount: {
        fontFamily: "Outfit_500Medium", fontSize: 9,
        color: Colors.primary.dark, textAlign: "center",
    },
});