import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { CEO_SIGNATURE_B64 } from "./pdfAssets";

const CONFIG = {
  COLORS: {
    P:        [15,  43,  61 ], // Dark Navy #0f2b3d
    P_ACCENT: [30,  74,  110], // Accent Blue #1e4a6e
    P_LITE:   [241, 245, 249], // slate-100
    WHITE:    [255, 255, 255],
    BODY:     [17,  24,  39 ], // gray-900 for serious text
    CLAUSE:   [55,  65,  81 ], // slate-700
    DIV:      [203, 213, 225], // slate-300
    AMBER:    [254, 243, 199], // Amber-100 for Confidential
  },
  PAGE: { WIDTH: 210, HEIGHT: 297 },
  MARGIN: { LEFT: 20, RIGHT: 20, TOP: 20 },
  FONT: { HEAD: 12, SUBHEAD: 10, BODY: 9, SMALL: 7 },
  LOGO_ASPECT: 1, 
};

function formatZAR(val) {
  return "R " + (val || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function generateLoanAgreementPdf({
  profile,
  principal,
  calculation,
  salaryDay,
  verifiedAcc,
  digitalSignature, 
  pledgedAssets = [],
  computerShareId = "no_id" 
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
  const isoDate = now.toISOString().split('T')[0];
  const agreementId = `MINT-PL-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const ML = CONFIG.MARGIN.LEFT;
  const TW = CONFIG.PAGE.WIDTH - CONFIG.MARGIN.LEFT - CONFIG.MARGIN.RIGHT;
  let y = CONFIG.MARGIN.TOP;

  // --- HEADER & CONFIDENTIAL TAG ---
  doc.setFillColor(...(CONFIG.COLORS.AMBER || [255, 255, 255]));
  doc.rect(ML, y, TW, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(CONFIG.FONT.SMALL);
  doc.setTextColor(...(CONFIG.COLORS.BODY || [0, 0, 0]));
  doc.text("CONFIDENTIAL", CONFIG.PAGE.WIDTH / 2, y + 5.5, { align: "center" });
  y += 15;

  doc.setFontSize(16);
  doc.setTextColor(...(CONFIG.COLORS.P || [0, 0, 0]));
  doc.text("SHARE PLEDGE AND SECURED LENDING AGREEMENT", CONFIG.PAGE.WIDTH / 2, y, { align: "center" });
  y += 6;
  doc.setDrawColor(...(CONFIG.COLORS.P || [0, 0, 0]));
  doc.setLineWidth(0.8);
  doc.line(ML + 10, y, CONFIG.PAGE.WIDTH - CONFIG.MARGIN.RIGHT - 10, y);
  y += 12;

  doc.setFontSize(CONFIG.FONT.BODY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...(CONFIG.COLORS.BODY || [0, 0, 0]));
  doc.text(`This Share Pledge and Secured Lending Agreement is entered into on ${dateStr}`, ML, y);
  y += 10;

  // --- BETWEEN ---
  doc.setFont("helvetica", "bold");
  doc.text("BETWEEN:", ML, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("(1) MINT PLATFORMS (PTY) LTD", ML, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text("Registration Number: 2024/644796/07\n(hereinafter referred to as the \"Lender\" or \"Mint\")", ML, y);
  y += 12;

  doc.setFont("helvetica", "bold");
  doc.text(`(2) ${profile?.firstName} ${profile?.lastName}`, ML, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(`Identity / Registration Number: ${profile?.idNumber || "Verified via truID"}\n(hereinafter referred to as the \"Borrower\")`, ML, y);
  y += 15;

  // --- RECITALS ---
  doc.setFont("helvetica", "bold");
  doc.text("RECITALS", ML, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  const recit = [
    "A. The Borrower holds certain financial instruments and securities in an investment account maintained on the Mint platform;",
    "B. The Borrower wishes to obtain a secured loan facility from the Lender against the pledge of such securities as collateral; and",
    "C. The Lender is willing to extend such credit facility on the terms and subject to the conditions set out in this Agreement."
  ];
  recit.forEach(r => {
    const lines = doc.splitTextToSize(r, TW);
    doc.text(lines, ML, y);
    y += (lines.length * 5);
  });
  y += 5;

  // --- 1. LOAN TERMS ---
  doc.setFont("helvetica", "bold");
  doc.text("1. LOAN TERMS", ML, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: CONFIG.MARGIN.RIGHT },
    body: [
      ["Loan Amount", formatZAR(calculation?.principal)],
      ["Interest Rate", `${((calculation?.monthlyRate || 0) * 12 * 100).toFixed(2)}% per annum (calculated daily, compounded monthly)`],
      ["Initiation Fee", formatZAR(calculation?.initiationFee)],
      ["Service Fee (Total)", formatZAR(calculation?.totalServiceFees)],
      ["Total Repayable", formatZAR(calculation?.totalRepayable)],
      ["Term", `${calculation?.termMonths || 0} month${(calculation?.termMonths || 0) > 1 ? 's' : ''}`],
      ["Repayment Structure", "Bullet / NAEDO Debit Order"]
    ],
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: 50, fontStyle: "bold", fillColor: CONFIG.COLORS.P_LITE }, 1: { cellWidth: "auto" } }
  });

  y = doc.lastAutoTable.finalY + 10;

  // --- 2. COLLATERAL AND PLEDGE ---
  doc.setFont("helvetica", "bold");
  doc.text("2. COLLATERAL AND PLEDGE", ML, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text("The Borrower hereby irrevocably pledges and cedes in securitament debit to the Lender all of the Borrower's right, title, and interest in and to the following securities:", ML, y, { maxWidth: TW });
  y += 10;

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: CONFIG.MARGIN.RIGHT },
    body: [
      ["Pledged Account Number", profile?.mintNumber || "MINT-ACC-PENDING"],
      ["Pledged Instruments", (pledgedAssets ?? []).map(a => `${a.name} (${a.code || a.symbol || 'N/A'})`).join(", ") || "No specific assets listed"],
      ["Total Market Value", formatZAR((pledgedAssets ?? []).reduce((sum, a) => sum + (a.balance || 0), 0))]
    ],
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: 50, fontStyle: "bold", fillColor: CONFIG.COLORS.P_LITE } }
  });

  y = doc.lastAutoTable.finalY + 10;

  // --- 3. LOAN-TO-VALUE RATIO ---
  doc.setFont("helvetica", "bold");
  doc.text("3. LOAN-TO-VALUE RATIO AND MARGIN REQUIREMENTS", ML, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: CONFIG.MARGIN.RIGHT },
    head: [["Threshold", "LTV Ratio"]],
    body: [
      ["Initial LTV", "≤ 70%"],
      ["Maintenance Margin", "70%"],
      ["Liquidation LTV", "85%"]
    ],
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: CONFIG.COLORS.P_ACCENT },
    columnStyles: { 0: { cellWidth: 50, fontStyle: "bold" } }
  });

  y = doc.lastAutoTable.finalY + 6;
  doc.setFontSize(7);
  doc.text("In the event that the LTV at any time exceeds the Maintenance LTV, Mint shall notify the Borrower and the Borrower shall be obliged to remedy the deficiency within 2 hours (Margin Call).", ML, y, { maxWidth: TW });
  y += 8;

  // --- Page Break for Clauses ---
  doc.addPage();
  y = CONFIG.MARGIN.TOP;

  const clauses = [
    { title: "4. REPRESENTATIONS AND WARRANTIES", content: "The Borrower represents and warrants that: It is the sole legal and beneficial owner of the pledged securities, free from any encumbrance; The pledged securities are not subject to any restriction on transfer, cession, or pledge; All information provided is true, accurate, and complete; It has full legal capacity to enter into this Agreement." },
    { title: "5. ENFORCEMENT UPON DEFAULT", content: "Upon an Event of Default (including payment default, breach of margin requirements, or insolvency), the Lender may: Declare all outstanding Secured Obligations immediately due and payable; Sell, transfer, or otherwise dispose of any or all of the Collateral; Apply proceeds towards costs, interest, and principal; The Borrower shall remain personally liable for any shortfall." },
    { title: "6. CONSENT TO REHYPOTHECATION", content: "The Borrower hereby consents that Mint may, to the extent permitted by applicable law, re-use, on-pledge, or otherwise rehypothecate the pledged securities for the purposes of funding its operations or hedging its exposures." },
    { title: "7. GOVERNING LAW", content: "This Agreement shall be governed by and construed in accordance with the laws of the Republic of South Africa." }
  ];

  clauses.forEach(c => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(CONFIG.FONT.SUBHEAD);
    doc.text(c.title, ML, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(CONFIG.FONT.BODY);
    const lines = doc.splitTextToSize(c.content, TW);
    doc.text(lines, ML, y);
    y += (lines.length * 5) + 8;
  });

  // --- SIGNATURES ---
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text("8. SIGNATURES", ML, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("IN WITNESS WHEREOF the Parties have caused this Agreement to be executed by their duly authorised representatives.", ML, y);
  y += 15;

  const colWidth = TW / 2 - 5;

  // Mint Signature
  doc.setFont("helvetica", "bold");
  doc.text("SIGNED for and on behalf of THE LENDER:", ML, y);
  y += 3;
  
  // CEO SIGNATURE IMAGE
  try {
    const ceoSigH = 12.22;
    const ceoSigW = 50;
    doc.addImage(CEO_SIGNATURE_B64, "PNG", ML, y, ceoSigW, ceoSigH);
    y += ceoSigH + 2;
  } catch (e) {
    console.warn("Failed to add CEO signature:", e);
    y += 12;
  }

  doc.setDrawColor(...(CONFIG.COLORS.DIV || [200, 200, 200]));
  doc.setLineWidth(0.3);
  doc.line(ML, y, ML + colWidth, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Lonwabo Damane", ML, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Chief Executive Officer (CEO)", ML, y);
  doc.text("Mint Platforms (Pty) Ltd", ML, y + 4);
  y += 15;

  // Borrower Signature
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("SIGNED by THE BORROWER:", ML, y);
  y += 6;

  if (digitalSignature && digitalSignature.startsWith("data:image")) {
    try {
      const sigH = 12;
      const sigW = 35;
      doc.addImage(digitalSignature, "PNG", ML, y, sigW, sigH);
      y += sigH + 2;
    } catch (e) {
      console.error("Failed to add signature image:", e);
      doc.text("Signature placeholder", ML, y + 8);
      y += 12;
    }
  } else {
    y += 12;
  }

  doc.setDrawColor(...(CONFIG.COLORS.DIV || [200, 200, 200]));
  doc.line(ML, y, ML + colWidth, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text(`${profile?.firstName} ${profile?.lastName}`, ML, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Full Name & Surname (The Borrower)", ML, y);
  doc.text(`Digital Sign-off: Verified via truID`, ML, y + 4);
  doc.text(`Date of Execution: ${dateStr}`, ML, y + 8);

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(CONFIG.FONT.SMALL);
    doc.setTextColor(150);
    doc.text(`Agreement ID: ${agreementId} | Page ${i} of ${pageCount}`, CONFIG.PAGE.WIDTH / 2, 287, { align: "center" });
    doc.text("Mint Platforms (Pty) Ltd is a registered credit provider.", CONFIG.PAGE.WIDTH / 2, 291, { align: "center" });
  }

  // Finalize & Save
  const safeName = (profile?.firstName || "user").replace(/\s/g, "_") + "_" + (profile?.lastName || "name").replace(/\s/g, "_");
  const fileName = `${safeName}_${profile?.mintNumber || "no_id"}_${computerShareId}_${isoDate}.pdf`;
  
  doc.save(fileName);
  
  const pdfOutput = doc.output("bloburl");
  const pdfBase64 = doc.output("datauristring");
  window.open(pdfOutput, "_blank");
  
  return { doc, agreementId, fileName, pdfBase64 };
}
