import supabase from "@/lib/supabase";
import { useState } from "react";

export interface BalanceData {
    // Totales acumulados desde updated_at del fondo
    totalIncome: number;
    totalExpenses: number;
    totalIncidentCosts: number;
    availableBalance: number;
    initialFund: number;

    // Por mes seleccionado
    monthlyIncome: number;
    monthlyExpenses: number;
    monthlyIncidentCosts: number;
    monthlyExpected: number;
    monthlyDeficit: number;

    // Meta del mes
    activeDepartments: number;
}

export interface BalanceFilters {
    month?: string;
    year?: number;
    startDate?: string;
    endDate?: string;
}

function monthBounds(month: string, year: number) {
    const MONTH_ORDER: Record<string, number> = {
        Enero: 0, Febrero: 1, Marzo: 2, Abril: 3,
        Mayo: 4, Junio: 5, Julio: 6, Agosto: 7,
        Septiembre: 8, Octubre: 9, Noviembre: 10, Diciembre: 11,
    };
    const monthIndex = MONTH_ORDER[month] ?? 0;
    const start = new Date(year, monthIndex, 1).toISOString();
    const end = new Date(year, monthIndex + 1, 0, 23, 59, 59).toISOString();
    return { start, end };
}

export function useBalance() {
    const [balance, setBalance] = useState<BalanceData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchBalance = async (filters: BalanceFilters) => {
        setIsLoading(true);
        setError(null);

        try {
            // 1. Tower fund (fondo inicial + fecha de corte)
            const { data: fundData, error: fundError } = await supabase
                .from("tower_fund")
                .select("*")
                .limit(1)
                .maybeSingle();

            if (fundError) throw new Error("Error al cargar el fondo.");

            const fund = fundData ?? { initial_amount: 0, updated_at: new Date(0).toISOString() };
            const cutoffDate = fund.updated_at;

            // 2. Ingresos validados desde la fecha de corte
            const { data: incomeData } = await supabase
                .from("recipes_payment")
                .select("amount_paid")
                .eq("validated", true)
                .gte("created_at", cutoffDate);

            const totalIncome = (incomeData ?? []).reduce((s, r) => s + Number(r.amount_paid), 0);

            // 3. Gastos desde la fecha de corte
            const { data: expensesData } = await supabase
                .from("tower_expenses")
                .select("amount")
                .gte("expense_date", cutoffDate);

            const totalExpenses = (expensesData ?? []).reduce((s, e) => s + Number(e.amount), 0);

            // 4. Costos de incidencias resueltas desde la fecha de corte
            const { data: incidentsData } = await supabase
                .from("incidents")
                .select("cost")
                .gte("completed_at", cutoffDate)
                .not("cost", "is", null);

            const totalIncidentCosts = (incidentsData ?? []).reduce((s, i) => s + Number(i.cost ?? 0), 0);

            const availableBalance = Number(fund.initial_amount) + totalIncome - totalExpenses - totalIncidentCosts;

            // 5. Departamentos activos
            const { count: deptCount } = await supabase
                .from("departments")
                .select("id", { count: "exact", head: true })
                .eq("is_in_use", true);

            const activeDepartments = deptCount ?? 0;

            // 6. Balance mensual (si se seleccionó mes)
            let monthlyIncome = 0;
            let monthlyExpenses = 0;
            let monthlyIncidentCosts = 0;
            let monthlyExpected = 0;

            if (filters.month && filters.year) {
                const { start, end } = monthBounds(filters.month, filters.year);

                const { data: mIncome } = await supabase
                    .from("recipes_payment")
                    .select("amount_paid")
                    .eq("validated", true)
                    .eq("month", filters.month)
                    .eq("year", filters.year);

                monthlyIncome = (mIncome ?? []).reduce((s, r) => s + Number(r.amount_paid), 0);

                const { data: mExpenses } = await supabase
                    .from("tower_expenses")
                    .select("amount")
                    .gte("expense_date", start)
                    .lte("expense_date", end);

                monthlyExpenses = (mExpenses ?? []).reduce((s, e) => s + Number(e.amount), 0);

                const { data: mIncidents } = await supabase
                    .from("incidents")
                    .select("cost")
                    .gte("completed_at", start)
                    .lte("completed_at", end)
                    .not("cost", "is", null);

                monthlyIncidentCosts = (mIncidents ?? []).reduce((s, i) => s + Number(i.cost ?? 0), 0);

                // Cuota esperada del mes
                const { data: quotaData } = await supabase
                    .from("monthly_quota")
                    .select("amount")
                    .eq("month", filters.month)
                    .eq("year", filters.year)
                    .maybeSingle();

                if (quotaData) {
                    monthlyExpected = Number(quotaData.amount) * activeDepartments;
                }
            } else if (filters.startDate && filters.endDate) {
                // Rango de fechas personalizado
                const { data: rIncome } = await supabase
                    .from("recipes_payment")
                    .select("amount_paid")
                    .eq("validated", true)
                    .gte("created_at", filters.startDate)
                    .lte("created_at", filters.endDate);

                monthlyIncome = (rIncome ?? []).reduce((s, r) => s + Number(r.amount_paid), 0);

                const { data: rExpenses } = await supabase
                    .from("tower_expenses")
                    .select("amount")
                    .gte("expense_date", filters.startDate)
                    .lte("expense_date", filters.endDate);

                monthlyExpenses = (rExpenses ?? []).reduce((s, e) => s + Number(e.amount), 0);

                const { data: rIncidents } = await supabase
                    .from("incidents")
                    .select("cost")
                    .gte("completed_at", filters.startDate)
                    .lte("completed_at", filters.endDate)
                    .not("cost", "is", null);

                monthlyIncidentCosts = (rIncidents ?? []).reduce((s, i) => s + Number(i.cost ?? 0), 0);
            }

            const monthlyDeficit = monthlyExpected - monthlyIncome;

            setBalance({
                totalIncome,
                totalExpenses,
                totalIncidentCosts,
                availableBalance,
                initialFund: Number(fund.initial_amount),
                monthlyIncome,
                monthlyExpenses,
                monthlyIncidentCosts,
                monthlyExpected,
                monthlyDeficit,
                activeDepartments,
            });
        } catch (e: any) {
            setError(e?.message ?? "Error al calcular el balance.");
        } finally {
            setIsLoading(false);
        }
    };

    return { balance, isLoading, error, fetchBalance };
}