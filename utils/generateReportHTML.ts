// ─────────────────────────────────────────────────────────────────────────────
// utils/generateReportHTML.ts
// Reporte financiero mensual ADI — estilo formal/documental.
// ─────────────────────────────────────────────────────────────────────────────

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface DepartmentPayment {
    depId: number;
    depName: string;
    amountPaid: number;
    amountExpected: number;
    paid: boolean;
    isPartial: boolean;    // ← nuevo: pagó pero no cubrió el monto completo
    paidAt: string | null;
}

export interface MonthlyExpenseItem {
    date: string;
    concept: string;
    amount: number;
}

export interface MonthlyReportData {
    month: string;
    year: number;
    condominioName: string;
    towerName: string;
    logoBase64?: string;

    totalIncome: number;
    totalExpenses: number;
    totalIncidentCosts: number;
    totalExpected: number;
    activeDepts: number;

    departments: DepartmentPayment[];
    expenses: MonthlyExpenseItem[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
    return `$${Number(n).toLocaleString("es-MX", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function fmtDate(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("es-MX", {
        day: "2-digit", month: "2-digit", year: "numeric",
    });
}

// ── Generador HTML ────────────────────────────────────────────────────────────

export function generateMonthlyReportHTML(data: MonthlyReportData): string {
    const {
        month, year,
        condominioName, towerName, logoBase64,
        totalIncome, totalExpenses, totalIncidentCosts, totalExpected,
        departments, expenses,
    } = data;

    const totalEgresos = totalExpenses + totalIncidentCosts;
    const netFlow = totalIncome - totalEgresos;

    // Contadores de estado (con isPartial)
    const paidCount = departments.filter(d => d.paid && !d.isPartial).length;
    const partialCount = departments.filter(d => d.isPartial).length;
    const unpaidCount = departments.filter(d => !d.paid).length;

    // Total pendiente por cobrar (pendientes + diferencia de los parciales)
    const totalPending =
        departments.filter(d => !d.paid).reduce((s, d) => s + d.amountExpected, 0) +
        departments.filter(d => d.isPartial).reduce((s, d) => s + (d.amountExpected - d.amountPaid), 0);

    const collectionRate = totalExpected > 0
        ? Math.min(Math.round((totalIncome / totalExpected) * 100), 100) : 0;

    // Ordenar: completos → parciales → pendientes → nombre
    const sorted = [...departments].sort((a, b) => {
        const score = (d: DepartmentPayment) => d.paid && !d.isPartial ? 0 : d.isPartial ? 1 : 2;
        return score(a) - score(b) || a.depName.localeCompare(b.depName);
    });

    // ── Filas de departamentos ────────────────────────────────────────────────
    const deptRows = sorted.map((d, i) => {
        const isEven = i % 2 === 0;
        // Diferencia: negativa si falta algo, 0 si cubrió exacto, positiva si pagó de más
        const diff = d.amountPaid - d.amountExpected;

        // Determinar estado
        let estadoStyle: string;
        let estadoLabel: string;
        if (d.isPartial) {
            estadoStyle = `font-size:9px;font-weight:700;color:#92400E;background:#FFFBEB;padding:2px 8px;border-radius:3px;border:1px solid #FDE68A;`;
            estadoLabel = "PARCIAL";
        } else if (d.paid) {
            estadoStyle = `font-size:9px;font-weight:700;color:#2d6a2d;background:#eaf4ea;padding:2px 8px;border-radius:3px;border:1px solid #b7d9b7;`;
            estadoLabel = "PAGADO";
        } else {
            estadoStyle = `font-size:9px;font-weight:700;color:#b91c1c;background:#fef2f2;padding:2px 8px;border-radius:3px;border:1px solid #fecaca;`;
            estadoLabel = "PENDIENTE";
        }

        // Color del monto pagado
        const montoColor = d.paid ? (d.isPartial ? "#92400E" : "#2d6a2d") : "#b91c1c";

        // Diferencia: si parcial muestra lo que falta (negativo), si pendiente lo que falta, si completo "/"
        let difText: string;
        let difColor = "#1a1a1a";
        if (!d.paid) {
            difText = fmt(-d.amountExpected);
            difColor = "#b91c1c";
        } else if (d.isPartial) {
            difText = fmt(diff); // diff es negativo (amountPaid - amountExpected)
            difColor = "#92400E";
        } else {
            difText = diff !== 0 ? (diff > 0 ? `+${fmt(diff)}` : fmt(diff)) : "/";
            difColor = diff !== 0 ? (diff > 0 ? "#2d6a2d" : "#b91c1c") : "#555555";
        }

        return `
        <tr style="background:${isEven ? "#ffffff" : "#f9f9f9"};">
            <td style="padding:7px 12px;border-bottom:1px solid #e8e8e8;font-size:11px;font-weight:700;">
                ${d.depName}
            </td>
            <td style="padding:7px 12px;border-bottom:1px solid #e8e8e8;text-align:right;font-size:11px;">
                ${d.amountExpected > 0 ? fmt(d.amountExpected) : "—"}
            </td>
            <td style="padding:7px 12px;border-bottom:1px solid #e8e8e8;text-align:right;font-size:11px;font-weight:700;color:${montoColor};">
                ${d.paid ? fmt(d.amountPaid) : "—"}
            </td>
            <td style="padding:7px 12px;border-bottom:1px solid #e8e8e8;text-align:center;font-size:10px;color:#555;">
                ${fmtDate(d.paidAt)}
            </td>
            <td style="padding:7px 12px;border-bottom:1px solid #e8e8e8;text-align:center;">
                <span style="${estadoStyle}">${estadoLabel}</span>
            </td>
            <td style="padding:7px 12px;border-bottom:1px solid #e8e8e8;text-align:right;font-size:11px;color:${difColor};">
                ${difText}
            </td>
        </tr>`;
    }).join("");

    // Fila total departamentos
    const deptTotalRow = `
        <tr style="background:#f0f0f0;border-top:2px solid #1a1a1a;">
            <td style="padding:8px 12px;font-size:11px;font-weight:700;">
                TOTAL (${departments.length} deptos)
            </td>
            <td style="padding:8px 12px;text-align:right;font-size:11px;font-weight:700;">
                ${totalExpected > 0 ? fmt(totalExpected) : "—"}
            </td>
            <td style="padding:8px 12px;text-align:right;font-size:11px;font-weight:700;color:#2d6a2d;">
                ${fmt(totalIncome)}
            </td>
            <td colspan="2" style="padding:8px 12px;text-align:center;font-size:10px;color:#555;">
                ${paidCount} pagados · ${partialCount > 0 ? `${partialCount} parciales · ` : ""}${unpaidCount} pendientes
            </td>
            <td style="padding:8px 12px;text-align:right;font-size:11px;font-weight:700;color:#b91c1c;">
                ${totalPending > 0 ? fmt(-totalPending) : "/"}
            </td>
        </tr>`;

    // ── Filas de egresos (mismo estilo que ingresos) ──────────────────────────
    const expenseRows = expenses.map((e, i) => {
        const isEven = i % 2 === 0;
        return `
        <tr style="background:${isEven ? "#ffffff" : "#f9f9f9"};">
            <td style="padding:7px 12px;border-bottom:1px solid #e8e8e8;font-size:11px;color:#555;">
                ${e.date}
            </td>
            <td style="padding:7px 12px;border-bottom:1px solid #e8e8e8;font-size:11px;">
                ${e.concept}
            </td>
            <td style="padding:7px 12px;border-bottom:1px solid #e8e8e8;text-align:right;font-size:11px;font-weight:700;color:#b91c1c;">
                ${fmt(e.amount)}
            </td>
        </tr>`;
    }).join("");

    const expenseTotalRow = `
        <tr style="background:#f0f0f0;border-top:2px solid #1a1a1a;">
            <td colspan="2" style="padding:8px 12px;font-size:11px;font-weight:700;">
                TOTAL DE EGRESOS
            </td>
            <td style="padding:8px 12px;text-align:right;font-size:11px;font-weight:700;color:#b91c1c;">
                ${fmt(totalEgresos)}
            </td>
        </tr>`;

    // ── HTML ──────────────────────────────────────────────────────────────────
    return `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
        font-family: Helvetica, Arial, sans-serif;
        font-size: 12px;
        color: #1a1a1a;
        background: #ffffff;
        padding: 36px 44px 52px;
    }
    .divider-thick  { height:2px; background:#1a1a1a; margin:10px 0 0; }
    .divider-thin   { height:1px; background:#1a1a1a; margin:0; }

    .section-heading {
        text-align: center;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        color: #1a1a1a;
        margin: 26px 0 10px;
        padding-bottom: 6px;
        border-bottom: 1.5px solid #1a1a1a;
    }

    /* Tabla de resumen centrada */
    .summary-table {
        width: 62%;
        margin: 0 auto;
        border-collapse: collapse;
    }
    .summary-table td {
        padding: 5px 14px;
        font-size: 11px;
    }
    .summary-table td:last-child { text-align: right; }
    .summary-table .total-row td {
        font-weight: 700;
        border-top: 1px solid #d0d0d0;
        padding-top: 8px;
    }

    /* Tablas de datos */
    .data-table { width:100%; border-collapse:collapse; border:1px solid #d0d0d0; }
    .data-table thead th {
        background: #1a1a1a;
        color: #ffffff;
        padding: 8px 12px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.8px;
        text-transform: uppercase;
        text-align: left;
    }
    .data-table thead th.right { text-align: right; }
    .data-table thead th.center { text-align: center; }

    .footer-note {
        margin-top: 40px;
        border-top: 1px solid #cccccc;
        padding-top: 12px;
        font-size: 9px;
        color: #888888;
        text-align: center;
        font-style: italic;
        line-height: 1.7;
    }
</style>
</head>
<body>

<!-- ══ ENCABEZADO ════════════════════════════════════════════════════════════ -->
<table style="width:100%;border-collapse:collapse;">
    <tr>
        <td style="vertical-align:middle;width:72px;">
            ${logoBase64
            ? `<img src="${logoBase64}" alt="Logo" style="width:64px;height:64px;object-fit:contain;display:block;"/>`
            : `<div style="width:64px;height:64px;border-radius:50%;background:#1a1a1a;font-size:18px;font-weight:900;color:#fff;text-align:center;line-height:64px;letter-spacing:1px;">ADI</div>`
        }
        </td>
        <td style="vertical-align:middle;padding-left:14px;">
            <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#888;margin-bottom:2px;">
                Reporte financiero mensual
            </div>
            <div style="font-size:16px;font-weight:800;color:#1a1a1a;line-height:1.2;">
                ${towerName}, ${condominioName}
            </div>
            <div style="font-size:13px;font-weight:700;color:#1a1a1a;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;">
                Mes de ${month} ${year}
            </div>
        </td>
    </tr>
</table>

<div class="divider-thick"></div>
<div class="divider-thin" style="margin-top:2px;"></div>


<!-- ══ RESUMEN DEL ESTADO FINANCIERO ════════════════════════════════════════ -->
<div class="section-heading">Resumen del estado financiero</div>

<table class="summary-table">
    <tr>
        <td style="color:#555;">Total de ingresos (cuotas cobradas):</td>
        <td>${fmt(totalIncome)}</td>
    </tr>
    <tr>
        <td style="color:#555;">Total de egresos:</td>
        <td>${fmt(totalEgresos)}</td>
    </tr>
    ${totalIncidentCosts > 0 ? `
    <tr>
        <td style="color:#555;padding-left:24px;">— Gastos operativos:</td>
        <td style="color:#555;">${fmt(totalExpenses)}</td>
    </tr>
    <tr>
        <td style="color:#555;padding-left:24px;">— Costos por incidencias:</td>
        <td style="color:#555;">${fmt(totalIncidentCosts)}</td>
    </tr>` : ""}
    <tr class="total-row">
        <td>Balance del mes:</td>
        <td style="color:${netFlow >= 0 ? "#1a1a1a" : "#b91c1c"};">
            <strong>${netFlow >= 0 ? "+" : ""}${fmt(netFlow)}</strong>
        </td>
    </tr>
</table>


<!-- ══ DETALLE DE INGRESOS ══════════════════════════════════════════════════ -->
<div class="section-heading">Detalle de ingresos — Cuotas de ${month} ${year}</div>

<table class="summary-table">
    <tr>
        <td style="color:#555;">Departamentos con pago completo:</td>
        <td style="color:#2d6a2d;font-weight:700;">${paidCount}</td>
    </tr>
    ${partialCount > 0 ? `
    <tr>
        <td style="color:#555;">Departamentos con pago parcial:</td>
        <td style="color:#92400E;font-weight:700;">${partialCount}</td>
    </tr>` : ""}
    <tr>
        <td style="color:#555;">Departamentos con pago pendiente:</td>
        <td style="color:${unpaidCount > 0 ? "#b91c1c" : "#2d6a2d"};font-weight:700;">${unpaidCount}</td>
    </tr>
    ${totalExpected > 0 ? `
    <tr>
        <td style="color:#555;">Tasa de cobranza del mes:</td>
        <td style="font-weight:700;color:${collectionRate >= 80 ? "#2d6a2d" : "#b91c1c"};">
            ${collectionRate}%
        </td>
    </tr>` : ""}
    <tr class="total-row">
        <td>TOTAL COBRADO:</td>
        <td><strong>${fmt(totalIncome)}</strong></td>
    </tr>
    ${totalPending > 0 ? `
    <tr>
        <td style="color:#b91c1c;">Monto pendiente por cobrar:</td>
        <td style="font-weight:700;color:#b91c1c;">${fmt(totalPending)}</td>
    </tr>` : ""}
</table>


<!-- ══ PAGO POR DEPARTAMENTO ════════════════════════════════════════════════ -->
<div class="section-heading">Pago de cuotas por departamento — ${month} ${year}</div>

<table class="data-table">
    <thead>
        <tr>
            <th>Depto.</th>
            <th class="right">Cuota</th>
            <th class="right">Pagado</th>
            <th class="center">Fecha de pago</th>
            <th class="center">Estado</th>
            <th class="right">Diferencia</th>
        </tr>
    </thead>
    <tbody>${deptRows}</tbody>
    <tfoot>${deptTotalRow}</tfoot>
</table>


<!-- ══ DETALLE DE EGRESOS ════════════════════════════════════════════════════ -->
${expenses.length > 0 ? `
<div class="section-heading">Detalle de egresos — ${month} ${year}</div>

<table class="summary-table">
    <tr>
        <td style="color:#555;">Registros de gastos del mes:</td>
        <td>${expenses.length}</td>
    </tr>
    ${totalExpenses > 0 ? `
    <tr>
        <td style="color:#555;">Gastos operativos:</td>
        <td>${fmt(totalExpenses)}</td>
    </tr>` : ""}
    ${totalIncidentCosts > 0 ? `
    <tr>
        <td style="color:#555;">Costos de incidencias:</td>
        <td>${fmt(totalIncidentCosts)}</td>
    </tr>` : ""}
    <tr class="total-row">
        <td>TOTAL DE EGRESOS:</td>
        <td style="color:#b91c1c;"><strong>${fmt(totalEgresos)}</strong></td>
    </tr>
</table>

<table class="data-table" style="margin-top:12px;">
    <thead>
        <tr>
            <th style="width:110px;">Fecha</th>
            <th>Concepto</th>
            <th class="right" style="width:120px;">Monto</th>
        </tr>
    </thead>
    <tbody>${expenseRows}</tbody>
    <tfoot>${expenseTotalRow}</tfoot>
</table>
` : `
<div class="section-heading">Detalle de egresos — ${month} ${year}</div>
<p style="text-align:center;color:#888;font-size:11px;margin:12px 0;">Sin egresos registrados para este mes.</p>
`}


<!-- ══ FIRMAS ════════════════════════════════════════════════════════════════ -->
<div style="margin-top:52px;">
    <table style="width:100%;border-collapse:collapse;">
        <tr>
            <td style="width:33%;text-align:center;padding-top:40px;border-top:1px solid #1a1a1a;font-size:10px;color:#555;">
                Administrador(a) del condominio
            </td>
            <td style="width:34%;"></td>
            <td style="width:33%;text-align:center;padding-top:40px;border-top:1px solid #1a1a1a;font-size:10px;color:#555;">
                Presidente del Comité de Vigilancia
            </td>
        </tr>
    </table>
</div>


<!-- ══ PIE DE PÁGINA ════════════════════════════════════════════════════════ -->
<div class="footer-note">
    Los ingresos y egresos están basados en los movimientos registrados en la aplicación ADI.<br/>
    Los pagos realizados fuera del período de ${month} se reflejarán en el reporte correspondiente.<br/>
    Documento generado automáticamente · ${towerName}, ${condominioName}
</div>

</body>
</html>`.trim();
}