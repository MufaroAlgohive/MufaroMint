import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Shared helpers ──────────────────────────────────────────────────────────
const getMintAccountNumber = (profile) =>
    profile?.mintNumber ||
    profile?.accountNumber ||
    (profile?.id ? `MINT-${String(profile.id).slice(0, 8).toUpperCase()}` : 'MINT-XXXXXXXX');

const parseAmount = (str) => {
    if (!str) return 0;
    const v = parseFloat(String(str).replace(/[R$,\s]/g, '').replace(/\+/, ''));
    return isNaN(v) ? 0 : v;
};

// ─────────────────────────────────────────────────────────────────────────────
//  generateMintPDF  — jsPDF statement, layout guaranteed not to overlap
// ─────────────────────────────────────────────────────────────────────────────
export const generateMintStatement = async (
    profile,
    displayName,
    holdingsRows,
    strategyRows = [],
    activityItems = [],
    dateFrom = null,
    dateTo = null,
) => {
    const doc       = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const PW        = doc.internal.pageSize.getWidth();   // 595
    const PH        = doc.internal.pageSize.getHeight();  // 842
    const M         = 40;   // margin
    const SAFE_FOOT = 60;   // space to keep at bottom for footer

    // Brand colours
    const PURPLE     = [59,  27,  122];
    const PURPLE_MID = [80,  45,  155];
    const GREEN      = [62,  180, 137];
    const RED        = [220, 38,  38 ];
    const DARK       = [33,  37,  41 ];
    const PALE       = [248, 247, 252];  // very light lavender stripe

    const mintAcct = getMintAccountNumber(profile);
    const fromStr  = dateFrom ? new Date(dateFrom).toLocaleDateString('en-GB') : '—';
    const toStr    = dateTo   ? new Date(dateTo).toLocaleDateString('en-GB')   : new Date().toLocaleDateString('en-GB');
    const isoDate  = new Date().toISOString().split('T')[0];

    // ── Y cursor helpers ─────────────────────────────────────────────────────
    let y = M;

    const newPage = () => {
        doc.addPage();
        y = M + 10;
    };

    // Ensure at least `need` pts remain; if not, start new page
    const need = (pts) => { if (y + pts > PH - SAFE_FOOT) newPage(); };

    // ── Section heading ──────────────────────────────────────────────────────
    const sectionHeading = (label) => {
        need(34);
        y += 8;
        doc.setFillColor(...PURPLE);
        doc.rect(M, y, PW - M * 2, 22, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text(label, M + 10, y + 14.5);
        y += 22 + 6;
    };

    // ── Logo ─────────────────────────────────────────────────────────────────
    try {
        const res = await fetch('/assets/mint-logo.svg');
        if (res.ok) {
            const blob = new Blob([await res.text()], { type: 'image/svg+xml' });
            const url  = URL.createObjectURL(blob);
            const img  = new Image();
            await new Promise((ok, fail) => { img.onload = ok; img.onerror = fail; img.src = url; });
            const cv = document.createElement('canvas');
            cv.width = img.width; cv.height = img.height;
            cv.getContext('2d').drawImage(img, 0, 0);
            doc.addImage(cv.toDataURL('image/png'), 'PNG', M, y, 65, 24);
            URL.revokeObjectURL(url);
        }
    } catch (_) {}

    // ── Title bar ────────────────────────────────────────────────────────────
    y += 34;
    doc.setFillColor(...PURPLE);
    doc.rect(M, y, PW - M * 2, 30, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('MINT INVESTMENT STATEMENT', M + 10, y + 20);
    y += 30 + 10;

    // ── Client / Statement info box ──────────────────────────────────────────
    const boxH = 80;
    doc.setFillColor(248, 247, 252);
    doc.roundedRect(M, y, PW - M * 2, boxH, 3, 3, 'F');
    doc.setDrawColor(...PURPLE);
    doc.setLineWidth(0.8);
    doc.roundedRect(M, y, PW - M * 2, boxH, 3, 3, 'S');

    const LC = M + 12;
    const RC = PW / 2 + 8;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...PURPLE);
    doc.text('CLIENT DETAILS',  LC, y + 14);
    doc.text('STATEMENT INFO',  RC, y + 14);

    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...DARK);
    const leftLines  = [`Name:        ${displayName || 'Client'}`, `Client ID:   ${profile?.idNumber || '—'}`, `Account:     ${mintAcct}`, `Email:       ${profile?.email || '—'}`];
    const rightLines = [`Period:      ${fromStr} – ${toStr}`, `Generated:   ${new Date().toLocaleDateString('en-GB')}`, 'Currency:    ZAR', 'Platform:    MINT'];
    leftLines .forEach((l, i) => doc.text(l, LC, y + 26 + i * 13));
    rightLines.forEach((l, i) => doc.text(l, RC, y + 26 + i * 13));
    y += boxH + 16;

    // ── 1. Portfolio Summary ─────────────────────────────────────────────────
    const holdingsForPdf = holdingsRows.filter(r => r.type === 'Holdings');

    const totalValue = holdingsForPdf.reduce((s, r) => s + parseAmount(r.marketValue), 0);
    const totalPL    = holdingsForPdf.reduce((s, r) => s + parseAmount(r.unrealizedPL), 0);

    sectionHeading('1.  PORTFOLIO SUMMARY');

    autoTable(doc, {
        startY: y,
        margin: { left: M, right: M },
        tableWidth: PW - M * 2,
        head: [['Metric', 'Value (ZAR)']],
        body: [
            ['Total Holdings Market Value', `R ${totalValue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`],
            ['Total Unrealised P/L',        `${totalPL >= 0 ? '+' : '−'}R ${Math.abs(totalPL).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`],
            ['Holdings Count',              `${holdingsForPdf.length}`],
            ['Active Strategies',           `${strategyRows.length}`],
            ['Transactions in Period',      `${activityItems.length}`],
        ],
        styles:             { font: 'helvetica', fontSize: 9.5, cellPadding: 7 },
        headStyles:         { fillColor: PURPLE_MID, textColor: [255,255,255], fontStyle: 'bold', fontSize: 9 },
        alternateRowStyles: { fillColor: PALE },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
        didParseCell(d) {
            if (d.section === 'body' && d.column.index === 1) {
                const txt = d.cell.text[0] || '';
                if (txt.startsWith('+')) d.cell.styles.textColor = GREEN;
                if (txt.startsWith('−')) d.cell.styles.textColor = RED;
            }
        },
    });
    y = doc.lastAutoTable.finalY + 16;

    // ── 2. Strategy Allocation ───────────────────────────────────────────────
    sectionHeading('2.  STRATEGY ALLOCATION & PERFORMANCE');

    if (strategyRows.length > 0) {
        autoTable(doc, {
            startY: y,
            margin: { left: M, right: M },
            tableWidth: PW - M * 2,
            head: [['Strategy', 'Risk Level', 'Current Value', 'Day Return', '1M Return']],
            body: strategyRows.map(s => {
                const pct = s.changePct != null && isFinite(+s.changePct) ? +s.changePct : null;
                const r1m = s.r1m      != null && isFinite(+s.r1m)        ? +s.r1m        : null;
                return [
                    s.fullName || s.title || '—',
                    s.riskLevel || '—',
                    s.amount || '—',
                    pct != null ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` : '—',
                    r1m != null ? `${r1m >= 0 ? '+' : ''}${r1m.toFixed(2)}%` : '—',
                ];
            }),
            styles:             { font: 'helvetica', fontSize: 9, cellPadding: 7 },
            headStyles:         { fillColor: PURPLE_MID, textColor: [255,255,255], fontStyle: 'bold', fontSize: 9 },
            alternateRowStyles: { fillColor: PALE },
            columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
            didParseCell(d) {
                if (d.section === 'body' && d.column.index >= 3) {
                    const v = parseFloat(d.cell.text[0]);
                    if (!isNaN(v)) d.cell.styles.textColor = v >= 0 ? GREEN : RED;
                }
            },
        });
        y = doc.lastAutoTable.finalY + 16;
    } else {
        doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(150, 150, 150);
        need(18); doc.text('No strategies subscribed.', M + 4, y + 12); y += 28;
    }

    // ── 3. Holdings Detail ───────────────────────────────────────────────────
    sectionHeading('3.  HOLDINGS DETAIL');

    if (holdingsForPdf.length > 0) {
        autoTable(doc, {
            startY: y,
            margin: { left: M, right: M },
            tableWidth: PW - M * 2,
            head: [['Instrument', 'Ticker', 'Qty', 'Avg Cost', 'Mkt Price', 'Mkt Value', 'Unreal. P/L']],
            body: holdingsForPdf.map(r => [
                r.instrument || r.title || '—',
                r.ticker    || '—',
                r.quantity  || '—',
                r.avgCost   || '—',
                r.marketPrice || '—',
                r.marketValue || '—',
                r.unrealizedPL || '—',
            ]),
            styles:             { font: 'helvetica', fontSize: 8.5, cellPadding: 6 },
            headStyles:         { fillColor: PURPLE_MID, textColor: [255,255,255], fontStyle: 'bold', fontSize: 8.5 },
            alternateRowStyles: { fillColor: PALE },
            columnStyles: {
                1: { halign: 'center' },
                2: { halign: 'right'  },
                3: { halign: 'right'  },
                4: { halign: 'right'  },
                5: { halign: 'right', fontStyle: 'bold' },
                6: { halign: 'right', fontStyle: 'bold' },
            },
            didParseCell(d) {
                if (d.section === 'body' && d.column.index === 6) {
                    const v = parseAmount(d.cell.text[0]);
                    const raw = d.cell.text[0] || '';
                    const isNeg = raw.startsWith('-');
                    d.cell.styles.textColor = (!isNeg && v !== 0) ? GREEN : (isNeg ? RED : DARK);
                }
            },
        });
        y = doc.lastAutoTable.finalY + 16;
    } else {
        doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(150, 150, 150);
        need(18); doc.text('No holdings found.', M + 4, y + 12); y += 28;
    }

    // ── 4. Transaction History ───────────────────────────────────────────────
    sectionHeading('4.  TRANSACTION HISTORY');

    if (activityItems.length > 0) {
        autoTable(doc, {
            startY: y,
            margin: { left: M, right: M },
            tableWidth: PW - M * 2,
            head: [['Date', 'Description', 'Type', 'Status', 'Amount']],
            body: activityItems.map(t => [
                t.displayDate || t.date || '—',
                t.title || '—',
                t.direction === 'credit' ? 'IN' : 'OUT',
                t.status ? t.status.charAt(0).toUpperCase() + t.status.slice(1) : '—',
                t.amount || '—',
            ]),
            styles:             { font: 'helvetica', fontSize: 8.5, cellPadding: 6 },
            headStyles:         { fillColor: PURPLE_MID, textColor: [255,255,255], fontStyle: 'bold', fontSize: 8.5 },
            alternateRowStyles: { fillColor: PALE },
            columnStyles: {
                2: { halign: 'center', fontStyle: 'bold' },
                3: { halign: 'center' },
                4: { halign: 'right',  fontStyle: 'bold' },
            },
            didParseCell(d) {
                if (d.section === 'body') {
                    if (d.column.index === 2) d.cell.styles.textColor = d.cell.text[0] === 'IN' ? GREEN : RED;
                    if (d.column.index === 4) {
                        const raw = d.cell.text[0] || '';
                        // amounts on activity are already formatted; they're all positive display
                        d.cell.styles.textColor = DARK;
                    }
                }
            },
        });
        y = doc.lastAutoTable.finalY + 16;
    } else {
        doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(150, 150, 150);
        need(18); doc.text('No transactions in period.', M + 4, y + 12); y += 28;
    }

    // ── Disclosures ──────────────────────────────────────────────────────────
    need(80);
    doc.setDrawColor(...PURPLE); doc.setLineWidth(0.5);
    doc.line(M, y, PW - M, y); y += 12;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...PURPLE);
    doc.text('Important Disclosures', M, y); y += 12;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(120, 120, 120);
    const disclosures = [
        'MINT is a regulated financial services platform operating under the Financial Advisory and Intermediary Services Act, 2002 (FAIS). Client assets are held in custody with an approved third-party custodian and are fully segregated from MINT\'s own assets.',
        'Past performance is not indicative of future results. Market values may fluctuate and capital invested is not guaranteed. This statement is for informational purposes only and does not constitute investment advice.',
        'Tax treatment depends on individual circumstances. Clients are responsible for obtaining independent tax advice. 3 Gwen Ln, Sandown, Sandton, 2031 | info@mymint.co.za | +27 10 276 0531',
    ];
    disclosures.forEach(para => {
        const lines = doc.splitTextToSize(para, PW - M * 2);
        need(lines.length * 9 + 6);
        doc.text(lines, M, y);
        y += lines.length * 9 + 6;
    });

    // ── Footer on every page ─────────────────────────────────────────────────
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        const fy = PH - 28;
        doc.setFillColor(...PURPLE);
        doc.rect(0, fy, PW, 28, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
        doc.text('MINT — Regulated Financial Services Platform', M, fy + 11);
        doc.text(`${mintAcct}`, M, fy + 21);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
        doc.text(`Page ${p} of ${totalPages}`, PW - M, fy + 16, { align: 'right' });
        doc.text(`Generated ${isoDate}`, PW - M, fy + 25, { align: 'right' });
    }

    // ── Save ─────────────────────────────────────────────────────────────────
    const safeName = (displayName || 'Client').trim().replace(/\s+/g, '_');
    const safeAcct = mintAcct.replace(/[^A-Z0-9\-]/gi, '');
    doc.save(`MINT_Statement_${safeName}_${safeAcct}_${isoDate}.pdf`);
};


// ─────────────────────────────────────────────────────────────────────────────
//  buildStatementHTML  — dark-terminal HTML styled to match the purple PDF
// ─────────────────────────────────────────────────────────────────────────────
export const buildStatementHTML = (
    profile,
    displayName,
    holdingsRows,
    strategyRows = [],
    activityItems = [],
    dateFrom = null,
    dateTo = null,
) => {
    const mintAcct = getMintAccountNumber(profile);
    const fromStr  = dateFrom ? new Date(dateFrom).toLocaleDateString('en-GB') : '—';
    const toStr    = dateTo   ? new Date(dateTo).toLocaleDateString('en-GB')   : new Date().toLocaleDateString('en-GB');
    const today    = new Date().toLocaleDateString('en-GB');
    const isoDate  = new Date().toISOString().split('T')[0];

    const holdingsForPdf = holdingsRows.filter(r => r.type === 'Holdings');

    const totalValue = holdingsForPdf.reduce((s, r) => s + parseAmount(r.marketValue),   0);
    const totalPL    = holdingsForPdf.reduce((s, r) => s + parseAmount(r.unrealizedPL),  0);
    const pnlSign    = totalPL >= 0 ? '+' : '−';
    const pnlClass   = totalPL >= 0 ? 'pos' : 'neg';

    const fmtZAR = n =>
        `R&nbsp;${Math.abs(n).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // ── Table row builders ────────────────────────────────────────────────────
    const holdingTRs = holdingsForPdf.length > 0
        ? holdingsForPdf.map(row => {
            const isPos = (row.unrealizedPL || '').startsWith('+');
            const isNeg = (row.unrealizedPL || '').startsWith('-');
            const cls   = isPos ? 'pos' : isNeg ? 'neg' : '';
            return `<tr class="dr">
                <td>${row.instrument || row.title || '—'}</td>
                <td><span class="chip">${row.ticker || '—'}</span></td>
                <td class="r">${row.quantity || '—'}</td>
                <td class="r">${row.avgCost || '—'}</td>
                <td class="r">${row.marketPrice || '—'}</td>
                <td class="r bold">${row.marketValue || '—'}</td>
                <td class="r bold ${cls}">${row.unrealizedPL || '—'}</td>
            </tr>`;
        }).join('')
        : `<tr><td colspan="7" class="empty">No holdings found</td></tr>`;

    const strategyTRs = strategyRows.length > 0
        ? strategyRows.map(s => {
            const pct    = s.changePct != null && isFinite(+s.changePct) ? +s.changePct : null;
            const r1m    = s.r1m != null && isFinite(+s.r1m) ? +s.r1m : null;
            const pctStr = pct != null ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` : '—';
            const r1mStr = r1m != null ? `${r1m >= 0 ? '+' : ''}${r1m.toFixed(2)}%` : '—';
            const pCls   = pct != null ? (pct >= 0 ? 'pos' : 'neg') : '';
            const mCls   = r1m != null ? (r1m >= 0 ? 'pos' : 'neg') : '';
            return `<tr class="dr">
                <td>${s.fullName || s.title || '—'}</td>
                <td>${s.riskLevel || '—'}</td>
                <td class="r bold">${s.amount || '—'}</td>
                <td class="r bold ${pCls}">${pctStr}</td>
                <td class="r bold ${mCls}">${r1mStr}</td>
            </tr>`;
        }).join('')
        : `<tr><td colspan="5" class="empty">No strategies subscribed</td></tr>`;

    const activityTRs = activityItems.length > 0
        ? activityItems.map(item => {
            const isIn   = item.direction === 'credit';
            const cls    = isIn ? 'pos' : 'neg';
            const status = item.status
                ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : '—';
            return `<tr class="dr">
                <td>${item.displayDate || '—'}</td>
                <td>${item.title || '—'}</td>
                <td><span class="badge ${cls}">${isIn ? 'IN' : 'OUT'}</span></td>
                <td>${status}</td>
                <td class="r bold ${cls}">${item.amount || '—'}</td>
            </tr>`;
        }).join('')
        : `<tr><td colspan="5" class="empty">No transactions in period</td></tr>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>MINT Statement — ${displayName || 'Client'} — ${isoDate}</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
:root{
  --p:#3b1b7a;    /* brand purple */
  --pm:#5b21b6;   /* mid purple */
  --pl:#ede9fe;   /* pale lavender */
  --bg:#0d0d0d;
  --panel:#141414;
  --raised:#1c1c1c;
  --bdr:#2a2a2a;
  --bdrhi:#383838;
  --txt:#d4d4d4;
  --dim:#666;
  --mid:#999;
  --pos:#3EB489;
  --neg:#e05c5c;
  --pos-bg:rgba(62,180,137,.12);
  --neg-bg:rgba(224,92,92,.10);
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

@page{margin:0;size:A4}
@media print{
  body{background:#0d0d0d!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .no-print{display:none!important}
  .container{box-shadow:none!important}
}

body{
  background:var(--bg);
  color:var(--txt);
  font-family:'Inter',sans-serif;
  font-size:12.5px;
  line-height:1.65;
  padding:32px 20px 60px;
}

/* Scanlines */
body::after{
  content:'';
  position:fixed;inset:0;
  background:repeating-linear-gradient(0deg,transparent 0,transparent 2px,rgba(0,0,0,.022) 2px,rgba(0,0,0,.022) 4px);
  pointer-events:none;
  z-index:9999;
}

.container{
  max-width:960px;
  margin:0 auto;
  background:var(--panel);
  border:1px solid var(--bdr);
  box-shadow:0 24px 80px rgba(0,0,0,.75),0 0 0 1px rgba(91,33,182,.08),inset 0 1px 0 rgba(255,255,255,.025);
  overflow:hidden;
}

/* ── Window chrome ── */
.chrome{
  display:flex;align-items:center;gap:7px;
  padding:10px 24px;
  background:#0a0a0a;
  border-bottom:1px solid var(--bdr);
}
.dot{width:12px;height:12px;border-radius:50%}
.dr{background:#ff5f57}.dy{background:#febc2e}.dg{background:#28c840}
.chrome-label{
  margin-left:auto;
  font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--dim);letter-spacing:.1em;
}

/* ── Toolbar ── */
.toolbar{
  display:flex;align-items:center;gap:10px;
  padding:10px 24px;
  background:var(--raised);
  border-bottom:1px solid var(--bdr);
}
.btn{
  font-family:'JetBrains Mono',monospace;
  font-size:9.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
  padding:7px 16px;border-radius:2px;cursor:pointer;border:none;transition:opacity .15s;
}
.btn-primary{background:var(--p);color:#fff}
.btn-primary:hover{opacity:.85}
.btn-ghost{background:transparent;border:1px solid var(--bdrhi);color:var(--mid)}
.btn-ghost:hover{background:var(--bdr)}
.hint{margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--dim)}

/* ── Header ── */
header{
  display:flex;justify-content:space-between;align-items:flex-start;
  padding:32px 32px 26px;
  border-bottom:1px solid var(--bdr);
  position:relative;
  background:linear-gradient(135deg,#111 60%,rgba(59,27,122,.18));
}
header::after{
  content:'';position:absolute;bottom:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,var(--pm) 0%,rgba(91,33,182,.3) 50%,transparent 80%);
}

.brand{
  font-family:'JetBrains Mono',monospace;font-weight:700;font-size:16px;
  color:#fff;letter-spacing:.06em;
  text-shadow:0 0 28px rgba(91,33,182,.6);
}
.brand em{color:var(--pm);font-style:normal;}
.brand-sub{
  font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:300;
  letter-spacing:.22em;text-transform:uppercase;color:var(--dim);margin-top:4px;
}
.client-block{margin-top:18px}
.client-name{
  font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:600;
  color:#fff;letter-spacing:.03em;
}
.client-id{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--mid);margin-top:2px}
.acct-pill{
  display:inline-block;margin-top:9px;
  padding:4px 12px;border-radius:2px;
  border:1px solid rgba(91,33,182,.5);
  background:rgba(59,27,122,.25);
  color:var(--pm);
  font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.14em;
  text-shadow:0 0 10px rgba(91,33,182,.4);
}

.hdr-right{
  text-align:right;
  font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--dim);line-height:1.9;
}
.hdr-right .hl{color:var(--txt);font-weight:500}

/* ── Info grid ── */
.info-grid{
  display:grid;grid-template-columns:1fr 1fr;
  gap:1px;background:var(--bdr);
  border-top:1px solid var(--bdr);
}
.info-cell{
  background:var(--raised);padding:14px 20px;
  display:flex;flex-direction:column;gap:2px;
}
.info-label{font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:.18em;text-transform:uppercase;color:var(--dim)}
.info-val  {font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--txt)}

/* ── Section title ── */
.sec{
  display:flex;align-items:center;gap:12px;
  padding:26px 32px 0;
  font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;
  letter-spacing:.26em;text-transform:uppercase;color:var(--pm);
}
.sec::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,var(--bdrhi),transparent)}
.sec-num{color:var(--dim);font-size:8px}

.sec-body{padding:14px 32px 28px}

/* ── Summary cards ── */
.cards{
  display:grid;grid-template-columns:repeat(4,1fr);
  gap:1px;background:var(--bdr);border:1px solid var(--bdr);
}
.card{
  background:var(--raised);padding:16px 14px;position:relative;overflow:hidden;
  transition:background .15s;
}
.card:first-child{border-left:3px solid var(--pm)}
.card::before{
  content:'';position:absolute;top:0;left:0;right:0;height:1px;
  background:var(--pm);transform:scaleX(0);transform-origin:left;transition:transform .25s;
}
.card:hover::before{transform:scaleX(1)}
.card-lbl{font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:.16em;text-transform:uppercase;color:var(--dim);margin-bottom:7px}
.card-val{font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:600;color:var(--pm);text-shadow:0 0 12px rgba(91,33,182,.3);white-space:nowrap}
.card-val.ntrl{color:var(--txt);text-shadow:none}
.card-val.neg {color:var(--neg);text-shadow:none}

/* ── Tables ── */
table{width:100%;border-collapse:collapse;font-size:11.5px}
thead tr{border-bottom:2px solid var(--pm)}
th{
  font-family:'JetBrains Mono',monospace;font-size:8.5px;font-weight:700;
  letter-spacing:.14em;text-transform:uppercase;
  color:#fff;background:var(--p);
  padding:10px 12px;text-align:left;white-space:nowrap;
}
th.r{text-align:right}
td{padding:10px 12px;border-bottom:1px solid #1d1d1d;color:var(--txt);vertical-align:middle}
td.r{text-align:right;font-family:'JetBrains Mono',monospace;font-size:11px}
td.bold{font-weight:600}
.dr:last-child td{border-bottom:none}
.dr:hover{background:rgba(91,33,182,.04)}
.empty{text-align:center;color:var(--dim);padding:28px!important;font-style:italic}

.pos{color:var(--pos)!important}
.neg{color:var(--neg)!important}

.badge{
  display:inline-block;
  font-family:'JetBrains Mono',monospace;font-size:8.5px;font-weight:700;
  letter-spacing:.08em;padding:2px 8px;border-radius:2px;
}
.badge.pos{background:var(--pos-bg);color:var(--pos);border:1px solid rgba(62,180,137,.3)}
.badge.neg{background:var(--neg-bg);color:var(--neg);border:1px solid rgba(224,92,92,.25)}

.chip{
  font-family:'JetBrains Mono',monospace;font-size:9.5px;
  background:var(--raised);border:1px solid var(--bdrhi);
  color:var(--mid);padding:1px 7px;border-radius:2px;
}

.divider{height:1px;background:linear-gradient(90deg,transparent,var(--bdr),transparent);margin:0 32px}

/* ── Disclosures ── */
.disc{
  padding:4px 32px 22px;
  font-family:'JetBrains Mono',monospace;font-size:9.5px;font-weight:300;
  font-style:italic;color:var(--dim);line-height:1.85;
}
.disc p+p{margin-top:5px}

/* ── Footer ── */
footer{
  display:flex;justify-content:space-between;align-items:flex-end;
  padding:20px 32px;
  background:var(--p);
  position:relative;
}
.foot-l,.foot-r{font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(255,255,255,.6);line-height:1.85}
.foot-r{text-align:right}
.foot-brand{color:#fff;font-weight:700;letter-spacing:.06em}
</style>
</head>
<body>
<div class="container">

  <!-- macOS chrome -->
  <div class="chrome no-print">
    <div class="dot dr"></div>
    <div class="dot dy"></div>
    <div class="dot dg"></div>
    <div class="chrome-label">MINT // CLIENT STATEMENT — ${isoDate}</div>
  </div>

  <!-- Toolbar -->
  <div class="toolbar no-print">
    <button class="btn btn-primary" onclick="window.print()">⎙ &nbsp;PRINT / SAVE PDF</button>
    <button class="btn btn-ghost"   onclick="window.close()">✕ &nbsp;CLOSE</button>
    <span class="hint">Browser print → Save as PDF preserves dark theme</span>
  </div>

  <!-- Header -->
  <header>
    <div>
      <div class="brand"><em>MINT</em> // CLIENT STATEMENT</div>
      <div class="brand-sub">Investment Portfolio Report</div>
      <div class="client-block">
        <div class="client-name">${displayName || 'Client'}</div>
        <div class="client-id">ID: ${profile?.idNumber || profile?.id || '—'}</div>
        <div class="acct-pill">${mintAcct}</div>
      </div>
    </div>
    <div class="hdr-right">
      <div>www.mymint.co.za</div>
      <div>+27 10 276 0531</div>
      <div>info@mymint.co.za</div>
      <div style="margin-top:10px">Period&emsp;<span class="hl">${fromStr} – ${toStr}</span></div>
      <div>Generated&emsp;<span class="hl">${today}</span></div>
      <div>Currency&emsp;<span class="hl">ZAR</span></div>
    </div>
  </header>

  <!-- Info strip -->
  <div class="info-grid">
    <div class="info-cell">
      <span class="info-label">Client Name</span>
      <span class="info-val">${displayName || '—'}</span>
    </div>
    <div class="info-cell">
      <span class="info-label">Account Number</span>
      <span class="info-val">${mintAcct}</span>
    </div>
    <div class="info-cell">
      <span class="info-label">Client ID / ID Number</span>
      <span class="info-val">${profile?.idNumber || profile?.id || '—'}</span>
    </div>
    <div class="info-cell">
      <span class="info-label">Email</span>
      <span class="info-val">${profile?.email || '—'}</span>
    </div>
  </div>

  <!-- 01 Summary -->
  <div class="sec"><span class="sec-num">01_</span>Account_Summary</div>
  <div class="sec-body">
    <div class="cards">
      <div class="card">
        <div class="card-lbl">Total Holdings Value</div>
        <div class="card-val">${fmtZAR(totalValue)}</div>
      </div>
      <div class="card">
        <div class="card-lbl">Unrealised P/L</div>
        <div class="card-val ${pnlClass}">${pnlSign}${fmtZAR(totalPL)}</div>
      </div>
      <div class="card">
        <div class="card-lbl">Holdings Count</div>
        <div class="card-val ntrl">${holdingsForPdf.length}</div>
      </div>
      <div class="card">
        <div class="card-lbl">Active Strategies</div>
        <div class="card-val ntrl">${strategyRows.length}</div>
      </div>
    </div>
  </div>

  <div class="divider"></div>

  <!-- 02 Strategies -->
  <div class="sec"><span class="sec-num">02_</span>Strategy_Exposure</div>
  <div class="sec-body">
    <table>
      <thead><tr>
        <th>Strategy</th><th>Risk Level</th>
        <th class="r">Current Value</th><th class="r">Day Return</th><th class="r">1M Return</th>
      </tr></thead>
      <tbody>${strategyTRs}</tbody>
    </table>
  </div>

  <div class="divider"></div>

  <!-- 03 Holdings -->
  <div class="sec"><span class="sec-num">03_</span>Holdings_Detail</div>
  <div class="sec-body">
    <table>
      <thead><tr>
        <th>Instrument</th><th>Ticker</th>
        <th class="r">Qty</th><th class="r">Avg Cost</th>
        <th class="r">Mkt Price</th><th class="r">Mkt Value</th><th class="r">Unreal. P/L</th>
      </tr></thead>
      <tbody>${holdingTRs}</tbody>
    </table>
  </div>

  <div class="divider"></div>

  <!-- 04 Transactions -->
  <div class="sec"><span class="sec-num">04_</span>Transaction_History</div>
  <div class="sec-body">
    <table>
      <thead><tr>
        <th>Date</th><th>Description</th><th>Type</th><th>Status</th><th class="r">Amount</th>
      </tr></thead>
      <tbody>${activityTRs}</tbody>
    </table>
  </div>

  <div class="divider" style="margin-bottom:6px"></div>

  <!-- Disclosures -->
  <div class="disc">
    <p>MINT is a regulated financial services platform operating under the Financial Advisory and Intermediary Services Act, 2002 (FAIS). Client assets are held in custody with an approved third-party custodian and are fully segregated from MINT's own assets.</p>
    <p>Past performance is not indicative of future results. Market values may fluctuate and capital is not guaranteed. This statement is for informational purposes only and does not constitute investment advice.</p>
    <p>Tax treatment depends on individual circumstances. Clients are responsible for obtaining independent tax advice. 3 Gwen Ln, Sandown, Sandton, 2031.</p>
  </div>

  <!-- Footer -->
  <footer>
    <div class="foot-l">
      3 Gwen Ln, Sandown, Sandton, 2031<br>
      info@mymint.co.za &nbsp;|&nbsp; +27 10 276 0531<br>
      Assets held via [Bank X]
    </div>
    <div class="foot-r">
      <span class="foot-brand">MINT</span> — Regulated Financial Services Platform<br>
      ${mintAcct}<br>
      Generated ${isoDate}
    </div>
  </footer>

</div>
</body>
</html>`;
};


// ─────────────────────────────────────────────────────────────────────────────
//  openStatementWindow  — opens the HTML statement in a new browser tab
// ─────────────────────────────────────────────────────────────────────────────
export const openStatementWindow = (
    profile, displayName, holdingsRows,
    strategyRows = [], activityItems = [],
    dateFrom = null, dateTo = null,
) => {
    const html = buildStatementHTML(profile, displayName, holdingsRows, strategyRows, activityItems, dateFrom, dateTo);
    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank');
    if (win) win.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
};
