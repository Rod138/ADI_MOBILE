// ─────────────────────────────────────────────────────────────────────────────
// generateReportHTML.ts
// Genera el HTML del reporte financiero ADI con estilo formal/documental.
// ─────────────────────────────────────────────────────────────────────────────

export interface MonthlyReportRow {
    month: string;
    year: number;
    income: number;
    expenses: number;
    incidentCosts: number;
    expectedIncome: number;
    deficit: number;
    netFlow: number;
    paidDepts: number;
    totalDepts: number;
}

export interface AnnualSummaryData {
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
    return `$${Number(n).toLocaleString("es-MX", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function pct(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.min(Math.round((value / total) * 100), 100);
}

// ── Gráfica SVG de barras ─────────────────────────────────────────────────────

function buildBarChart(months: MonthlyReportRow[]): string {
    if (months.length === 0) return "";

    const BAR_W = 16;
    const GAP = 4;
    const GRP_W = BAR_W * 2 + GAP + 18;
    const MAX_H = 100;
    const BOT = 120;
    const SVG_H = BOT + 30;
    const SVG_W = Math.max(months.length * GRP_W + 40, 480);

    const maxVal = Math.max(
        ...months.map(r => Math.max(r.income, r.expenses + r.incidentCosts)),
        1
    );

    const guides = [0.25, 0.5, 0.75, 1].map(f => {
        const y = BOT - f * MAX_H;
        return `
            <line x1="30" y1="${y}" x2="${SVG_W}" y2="${y}"
                  stroke="#e0e0e0" stroke-width="0.8" stroke-dasharray="3,3"/>
            <text x="26" y="${y + 3}" text-anchor="end"
                  font-family="Helvetica,Arial,sans-serif" font-size="7" fill="#aaa">
                ${((maxVal * f) / 1000).toFixed(0)}k
            </text>`;
    }).join("");

    const bars = months.map((r, i) => {
        const x = 34 + i * GRP_W;
        const incH = Math.max((r.income / maxVal) * MAX_H, r.income > 0 ? 2 : 0);
        const expH = Math.max(((r.expenses + r.incidentCosts) / maxVal) * MAX_H, (r.expenses + r.incidentCosts) > 0 ? 2 : 0);
        const cx = x + BAR_W + GAP / 2;
        return `
            <rect x="${x}" y="${BOT - incH}" width="${BAR_W}" height="${incH}" fill="#2d6a2d" rx="2"/>
            <rect x="${x + BAR_W + GAP}" y="${BOT - expH}" width="${BAR_W}" height="${expH}" fill="#b35900" rx="2"/>
            <text x="${cx}" y="${BOT + 12}" text-anchor="middle"
                  font-family="Helvetica,Arial,sans-serif" font-size="8" fill="#555">
                ${r.month.slice(0, 3)}
            </text>
            <text x="${cx}" y="${BOT + 21}" text-anchor="middle"
                  font-family="Helvetica,Arial,sans-serif" font-size="7" fill="#aaa">
                ${String(r.year).slice(2)}
            </text>`;
    }).join("");

    return `
        <svg xmlns="http://www.w3.org/2000/svg" width="${SVG_W}" height="${SVG_H}"
             viewBox="0 0 ${SVG_W} ${SVG_H}" style="max-width:100%;display:block;">
            <line x1="30" y1="${BOT}" x2="${SVG_W}" y2="${BOT}" stroke="#ccc" stroke-width="1"/>
            ${guides}
            ${bars}
        </svg>`;
}

// ── HTML principal ────────────────────────────────────────────────────────────

export function generateReportHTML(params: {
    label: string;
    annual: AnnualSummaryData;
    activeMonths: MonthlyReportRow[];
    activeDepts: number;
    condominioName?: string;
    towerName?: string;
    logoBase64?: string;
}): string {
    const {
        label,
        annual,
        activeMonths,
        activeDepts,
        condominioName = "Residencial del Parque",
        towerName = "Torre M",
        logoBase64,
    } = params;

    const today = new Date().toLocaleDateString("es-MX", {
        day: "2-digit", month: "long", year: "numeric",
    });

    const totalEgresos = annual.totalExpenses + annual.totalIncidentCosts;

    // ── Filas de la tabla mensual ─────────────────────────────────
    const tableRows = activeMonths.map((r, i) => {
        const isEven = i % 2 === 0;
        const isPos = r.netFlow >= 0;
        const cov = r.expectedIncome > 0 ? pct(r.income, r.expectedIncome) : null;

        return `
        <tr style="background:${isEven ? "#ffffff" : "#f9f9f9"};">
            <td style="padding:7px 10px;border-bottom:1px solid #ebebeb;font-size:11px;">
                <strong>${r.month} ${r.year}</strong>
                ${cov !== null
                ? `<span style="margin-left:8px;font-size:9px;color:${cov >= 100 ? "#2d6a2d" : "#b35900"};">(${cov}% cobranza)</span>`
                : ""}
            </td>
            <td style="padding:7px 10px;border-bottom:1px solid #ebebeb;text-align:right;font-size:11px;color:#2d6a2d;font-weight:700;">
                ${fmt(r.income)}
                <div style="font-size:9px;color:#aaa;font-weight:400;">${r.paidDepts}/${r.totalDepts} deptos</div>
            </td>
            <td style="padding:7px 10px;border-bottom:1px solid #ebebeb;text-align:right;font-size:11px;color:#b35900;font-weight:700;">
                ${fmt(r.expenses + r.incidentCosts)}
                ${r.incidentCosts > 0
                ? `<div style="font-size:9px;color:#aaa;font-weight:400;">inc. ${fmt(r.incidentCosts)}</div>`
                : ""}
            </td>
            <td style="padding:7px 10px;border-bottom:1px solid #ebebeb;text-align:right;font-size:11px;font-weight:700;color:${isPos ? "#1a1a1a" : "#b91c1c"};">
                ${isPos ? "+" : ""}${fmt(r.netFlow)}
            </td>
        </tr>`;
    }).join("");

    // ── Desglose de egresos ───────────────────────────────────────
    const pctOp = pct(annual.totalExpenses, totalEgresos);
    const pctInc = pct(annual.totalIncidentCosts, totalEgresos);

    const expenseRows = totalEgresos > 0 ? `
        <tr>
            <td style="padding:6px 10px;border-bottom:1px solid #ebebeb;font-size:11px;">Gastos operativos</td>
            <td style="padding:6px 10px;border-bottom:1px solid #ebebeb;text-align:right;font-size:11px;">${fmt(annual.totalExpenses)}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #ebebeb;text-align:right;font-size:10px;color:#888;">${pctOp}%</td>
        </tr>
        <tr>
            <td style="padding:6px 10px;border-bottom:1px solid #ebebeb;font-size:11px;">Costos por incidencias</td>
            <td style="padding:6px 10px;border-bottom:1px solid #ebebeb;text-align:right;font-size:11px;">${fmt(annual.totalIncidentCosts)}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #ebebeb;text-align:right;font-size:10px;color:#888;">${pctInc}%</td>
        </tr>
        <tr style="background:#f5f5f5;">
            <td style="padding:8px 10px;font-size:11px;font-weight:700;">TOTAL DE EGRESOS:</td>
            <td style="padding:8px 10px;text-align:right;font-size:11px;font-weight:700;">${fmt(totalEgresos)}</td>
            <td></td>
        </tr>` : "";

    const chart = buildBarChart(activeMonths);

    // ─────────────────────────────────────────────────────────────
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
        padding: 36px 44px 48px;
    }

    .section-heading {
        text-align: center;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        color: #1a1a1a;
        margin: 28px 0 10px;
        padding-bottom: 6px;
        border-bottom: 1.5px solid #1a1a1a;
    }

    .summary-table {
        width: 64%;
        margin: 0 auto;
        border-collapse: collapse;
    }
    .summary-table td {
        padding: 5px 12px;
        font-size: 11px;
    }
    .summary-table td:last-child {
        text-align: right;
    }

    .data-table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #d0d0d0;
    }
    .data-table thead th {
        background: #1a1a1a;
        color: #ffffff;
        padding: 8px 10px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.8px;
        text-transform: uppercase;
    }
    .data-table thead th:not(:first-child) {
        text-align: right;
    }

    .footer-line {
        margin-top: 40px;
        border-top: 1px solid #ccc;
        padding-top: 12px;
        font-size: 9px;
        color: #888;
        text-align: center;
        font-style: italic;
        line-height: 1.6;
    }
</style>
</head>
<body>

<!-- ══ ENCABEZADO ════════════════════════════════════════════════════════════ -->
<table style="width:100%;border-collapse:collapse;margin-bottom:6px;">
    <tr>
        <td style="vertical-align:middle;width:72px;">
            ${logoBase64
            ? `<img src="${logoBase64}" alt="Logo"
                        style="width:64px;height:64px;object-fit:contain;display:block;"/>`
            : `<div style="
                        width:64px;height:64px;border-radius:50%;
                        background:#1a1a1a;
                        font-size:18px;font-weight:900;color:#fff;
                        text-align:center;line-height:64px;letter-spacing:1px;
                   ">ADI</div>`
        }
        </td>
        <td style="vertical-align:middle;padding-left:14px;">
            <div style="font-size:9px;letter-spacing:2px;text-transform:uppercase;color:#888;margin-bottom:2px;">
                Reporte financiero
            </div>
            <div style="font-size:16px;font-weight:800;color:#1a1a1a;line-height:1.2;">
                ${towerName}, ${condominioName}
            </div>
            <div style="font-size:11px;color:#555;margin-top:3px;">
                Período: <strong>${label}</strong>
            </div>
        </td>
        <td style="vertical-align:middle;text-align:right;">
            <div style="font-size:10px;color:#888;">Fecha de emisión:</div>
            <div style="font-size:11px;font-weight:700;color:#1a1a1a;margin-top:2px;">${today}</div>
            <div style="font-size:10px;color:#888;margin-top:6px;">Departamentos activos:</div>
            <div style="font-size:14px;font-weight:800;color:#1a1a1a;">${activeDepts}</div>
        </td>
    </tr>
</table>

<!-- Línea de marca -->
<div style="height:2px;background:#1a1a1a;margin-top:10px;"></div>
<div style="height:3px;background:linear-gradient(90deg,#4a8a00 0%,#c45c00 100%);margin-bottom:0;"></div>


<!-- ══ RESUMEN DEL ESTADO FINANCIERO ════════════════════════════════════════ -->
<div class="section-heading">Resumen del estado financiero</div>

<table class="summary-table">
    <tr>
        <td style="color:#555;">Total de ingresos:</td>
        <td>${fmt(annual.totalIncome)}</td>
    </tr>
    <tr>
        <td style="color:#555;">Total de egresos:</td>
        <td>${fmt(totalEgresos)}</td>
    </tr>
    <tr style="border-top:1px solid #ddd;">
        <td style="padding-top:8px;font-weight:700;">Flujo neto del período:</td>
        <td style="padding-top:8px;font-weight:700;color:${annual.netFlow >= 0 ? "#1a1a1a" : "#b91c1c"};">
            <strong>${annual.netFlow >= 0 ? "+" : ""}${fmt(annual.netFlow)}</strong>
        </td>
    </tr>
    <tr>
        <td style="color:#555;">Departamentos activos:</td>
        <td>${activeDepts}</td>
    </tr>
    <tr>
        <td style="color:#555;">Mejor mes en ingresos:</td>
        <td>${annual.bestMonth}</td>
    </tr>
    <tr>
        <td style="color:#555;">Promedio de egresos / mes:</td>
        <td>${fmt(annual.avgMonthlyExpense)}</td>
    </tr>
</table>


<!-- ══ DETALLE DE INGRESOS ══════════════════════════════════════════════════ -->
<div class="section-heading">Detalle de ingresos</div>

<table class="summary-table">
    ${annual.totalExpected > 0 ? `
    <tr>
        <td style="color:#555;">Cuota esperada (${activeDepts} deptos):</td>
        <td>${fmt(annual.totalExpected)}</td>
    </tr>` : ""}
    <tr>
        <td style="color:#555;">Meses con actividad:</td>
        <td>${activeMonths.length}</td>
    </tr>
    <tr style="border-top:1px solid #ddd;">
        <td style="padding-top:8px;font-weight:700;">TOTAL DE INGRESOS:</td>
        <td style="padding-top:8px;font-weight:700;">${fmt(annual.totalIncome)}</td>
    </tr>
    ${annual.totalExpected > 0 ? `
    <tr>
        <td style="color:#555;">Tasa de cobranza:</td>
        <td style="font-weight:700;color:${annual.collectionRate >= 80 ? "#2d6a2d" : "#b35900"};">
            ${annual.collectionRate}%
        </td>
    </tr>` : ""}
    ${annual.totalDeficit > 0 ? `
    <tr>
        <td style="color:#b91c1c;">Déficit acumulado:</td>
        <td style="font-weight:700;color:#b91c1c;">${fmt(annual.totalDeficit)}</td>
    </tr>` : ""}
</table>


<!-- ══ DETALLE DE EGRESOS ════════════════════════════════════════════════════ -->
${totalEgresos > 0 ? `
<div class="section-heading">Detalle de egresos</div>
<table class="data-table">
    <thead>
        <tr>
            <th style="text-align:left;">Concepto</th>
            <th>Monto</th>
            <th>% del total</th>
        </tr>
    </thead>
    <tbody>
        ${expenseRows}
    </tbody>
</table>
` : ""}


<!-- ══ GRÁFICA INGRESOS VS EGRESOS ══════════════════════════════════════════ -->
${activeMonths.length > 1 ? `
<div class="section-heading">Comportamiento mensual — Ingresos vs. Egresos</div>
<div style="border:1px solid #d0d0d0;padding:16px 20px;">
    <div style="display:flex;gap:20px;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:6px;">
            <div style="width:14px;height:10px;background:#2d6a2d;border-radius:2px;"></div>
            <span style="font-size:10px;color:#555;">Ingresos</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
            <div style="width:14px;height:10px;background:#b35900;border-radius:2px;"></div>
            <span style="font-size:10px;color:#555;">Egresos</span>
        </div>
    </div>
    ${chart}
</div>
` : ""}


<!-- ══ TABLA MENSUAL DETALLADA ══════════════════════════════════════════════ -->
${activeMonths.length > 0 ? `
<div class="section-heading">Detalle por mes</div>
<table class="data-table">
    <thead>
        <tr>
            <th style="text-align:left;">Mes / Año</th>
            <th style="color:#90ee90;">Ingresos</th>
            <th style="color:#ffb347;">Egresos</th>
            <th>Flujo Neto</th>
        </tr>
    </thead>
    <tbody>
        ${tableRows}
    </tbody>
    <tfoot>
        <tr style="background:#1a1a1a;">
            <td style="padding:9px 10px;font-size:11px;font-weight:700;color:#fff;">
                TOTAL DEL PERÍODO
            </td>
            <td style="padding:9px 10px;text-align:right;font-size:11px;font-weight:700;color:#90ee90;">
                ${fmt(annual.totalIncome)}
            </td>
            <td style="padding:9px 10px;text-align:right;font-size:11px;font-weight:700;color:#ffb347;">
                ${fmt(totalEgresos)}
            </td>
            <td style="padding:9px 10px;text-align:right;font-size:11px;font-weight:700;color:${annual.netFlow >= 0 ? "#ffffff" : "#ff8a80"};">
                ${annual.netFlow >= 0 ? "+" : ""}${fmt(annual.netFlow)}
            </td>
        </tr>
    </tfoot>
</table>
` : ""}


<!-- ══ PIE DE PÁGINA ════════════════════════════════════════════════════════ -->
<div class="footer-line">
    Los ingresos y egresos están basados en los movimientos registrados en la aplicación ADI.<br/>
    Documento generado automáticamente · ${towerName}, ${condominioName} · ${today}
</div>

</body>
</html>`.trim();
}