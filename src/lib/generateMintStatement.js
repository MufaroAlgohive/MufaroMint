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
//  generateMintPDF  — jsPDF statement
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
    const PALE       = [248, 247, 252];

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
                    if (d.column.index === 4) d.cell.styles.textColor = DARK;
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
