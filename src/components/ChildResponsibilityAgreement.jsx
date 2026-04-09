import React, { useEffect, useRef, useState, useCallback } from "react";
import SignaturePad from "signature_pad";
import jsPDF from "jspdf";
import { supabase } from "../lib/supabase";
import { X, Check, Loader2, FileText, ArrowLeft, Download } from "lucide-react";

// ─── constants ────────────────────────────────────────────────────────────────

const MINT_LOGO_URL = "https://mfxnghmuccevsxwcetej.supabase.co/storage/v1/object/public/Mint%20Assets/tMOmeIOo4KE20Yh1bIuk8PFMlFHZ421rVESa2dcn.jpg";
const MINT_PURPLE = [91, 33, 182];
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 15;
const COL1 = 62;
const COL2 = PAGE_W - MARGIN * 2 - COL1;

// ─── helpers ─────────────────────────────────────────────────────────────

function formatDateLong(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function formatAge(dob) {
  if (!dob) return "—";
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return `${age} years old`;
}

async function fetchImageBase64(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const data = await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result);
      r.readAsDataURL(blob);
    });
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ data, width: img.width, height: img.height });
      img.onerror = () => resolve({ data, width: 0, height: 0 });
      img.src = data;
    });
  } catch { return null; }
}

function drawRow(doc, y, label, value, labelW, valueW, margin) {
  const px = 3, py = 2.5, lh = 5.5;
  const valLines = doc.splitTextToSize(String(value || "—"), valueW - px * 2);
  const rowH = Math.max(valLines.length * lh + py * 2, 10);

  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.2);
  doc.rect(margin, y, labelW, rowH);
  doc.rect(margin + labelW, y, valueW, rowH);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(label.toUpperCase(), margin + px, y + py + 3.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  valLines.forEach((l, i) => doc.text(l, margin + labelW + px, y + py + 3.5 + i * lh));

  return y + rowH;
}

// ─── PDF builder ──────────────────────────────────────────────────────────────

async function buildChildAgreementPdf({ parentProfile, childData, signatureDataUrl, signedAt }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logoB64 = await fetchImageBase64(MINT_LOGO_URL);
  
  const parentName = [parentProfile?.firstName, parentProfile?.lastName].filter(Boolean).join(" ") || parentProfile?.full_name || "—";
  const parentId = parentProfile?.idNumber || "—";
  const childName = `${childData.first_name} ${childData.last_name || ""}`.trim();
  const childDob = formatDateLong(childData.date_of_birth);
  const childMint = childData.mint_number || "PENDING";

  // ── PAGE 1: Details ───────────────────────────────────────────────
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");

  if (logoB64?.data) {
    const logoAspect = logoB64.width / logoB64.height;
    const logoH = 12;
    const logoW = logoH * logoAspect;
    doc.addImage(logoB64.data, "JPEG", PAGE_W - MARGIN - logoW, MARGIN, logoW, logoH, undefined, "FAST");
  }

  let y = MARGIN + 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...MINT_PURPLE);
  doc.text("CLIENT SECURITIES ADMINISTRATION AND NOMINEE", MARGIN, y);
  y += 6;
  doc.text("APPOINTMENT AGREEMENT (MINOR ACCOUNT)", MARGIN, y);
  y += 7;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("ACCORDING TO THE MINT PLATFORMS (PTY) LTD SERVICE FRAMEWORK", MARGIN, y);
  y += 12;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("1. PARTIES TO THE AGREEMENT", MARGIN, y);
  y += 6;

  y = drawRow(doc, y, "The Minor (Client)", childName, COL1, COL2, MARGIN);
  y = drawRow(doc, y, "Minor Identity Number", childData.id_number || "—", COL1, COL2, MARGIN);
  y = drawRow(doc, y, "Minor Mint ID", childMint, COL1, COL2, MARGIN);
  y = drawRow(doc, y, "The Legal Guardian", parentName, COL1, COL2, MARGIN);
  y = drawRow(doc, y, "Guardian Identity Number", parentId, COL1, COL2, MARGIN);
  y = drawRow(doc, y, "Relationship to Minor", "Parent/Legal Guardian", COL1, COL2, MARGIN);
  y = drawRow(doc, y, "Date of Agreement", formatDateLong(signedAt), COL1, COL2, MARGIN);

  y += 12;
  doc.setFont("helvetica", "bold");
  doc.text("2. REPRESENTATION AND WARRANTY", MARGIN, y);
  y += 6;

  const writePara = (text, indent = 0) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(text, PAGE_W - MARGIN * 2 - indent);
    lines.forEach(line => {
      // Check for page break
      if (y > PAGE_H - MARGIN - 10) {
        doc.addPage();
        y = MARGIN + 10;
      }
      doc.text(line, MARGIN + indent, y);
      y += 5;
    });
    y += 2;
  };

  writePara("2.1 The Guardian hereby warrants that they are the legal parent or court-appointed guardian of the Minor and have the necessary legal capacity to enter into this Agreement on the Minor’s behalf.");
  writePara("2.2 The Guardian warrants that all information provided regarding the Minor and the Guardian's relationship to the Minor is true, accurate, and complete.");

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("3. APPOINTMENT", MARGIN, y);
  y += 6;
  writePara("3.1 The Guardian, acting for and on behalf of the Minor, hereby appoints Mint Platforms (Pty) Ltd ('the Platform') as its nominee and administrator to manage the Minor's securities and investment account subject to the Platform's general Terms and Conditions.");

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("4. INDEMNITY AND RESPONSIBILITY", MARGIN, y);
  y += 6;
  writePara("4.1 The Guardian accepts full and exclusive legal and financial responsibility for the account, including all instructions (buy, sell, or transfer) provided to the Platform.");
  writePara("4.2 The Guardian warrants that all funds utilized for investments in the Minor's account are for the sole benefit of the Minor and comply with South African anti-money laundering and tax regulations.");
  writePara("4.3 The Guardian hereby indemnifies the Platform, its directors, and employees against any and all claims, losses, or damages made by the Minor upon reaching the age of majority, or by any third party, in relation to the management of this account.");
  writePara("4.4 The Guardian acknowledges that they are responsible for any fees, costs, or tax liabilities associated with the account.");

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("5. TRANSITION OF AUTHORITY", MARGIN, y);
  y += 6;
  writePara("5.1 Upon the Minor reaching the age of majority (18 years), all control and authority over the account shall vest in the Minor, subject to the Minor confirming their identity and signing a new Client Agreement in their own capacity.");

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.text("3. SIGNATURES", MARGIN, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Signed by Guardian, acting in their capacity as parent/legal guardian of ${childName}:`, MARGIN, y);
  
  if (signatureDataUrl) {
    doc.addImage(signatureDataUrl, "PNG", MARGIN, y + 2, 40, 15);
  }
  
  y += 20;
  doc.setDrawColor(200, 200, 200);
  doc.line(MARGIN, y, MARGIN + 60, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.text(parentName, MARGIN, y);
  
  return doc.output("arraybuffer");
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChildResponsibilityAgreement({ 
  parentProfile, 
  childData, 
  onBack, 
  onComplete,
  saving = false
}) {
  const [error, setError] = useState("");
  const [sigEmpty, setSigEmpty] = useState(true);
  const canvasRef = useRef(null);
  const sigPadRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      canvas.getContext("2d").scale(ratio, ratio);
      sigPadRef.current?.clear();
    };

    sigPadRef.current = new SignaturePad(canvas, {
      backgroundColor: "rgb(255,255,255)",
      penColor: "rgb(30,30,30)",
      minWidth: 1.5,
      maxWidth: 3,
    });
    sigPadRef.current.addEventListener("endStroke", () => setSigEmpty(sigPadRef.current.isEmpty()));

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const handleSignAndFinish = async () => {
    if (sigEmpty) {
      setError("Please sign the agreement to continue.");
      return;
    }
    setError("");
    const sigUrl = sigPadRef.current.toDataURL("image/png");
    const now = new Date().toISOString();

    try {
      const pdfBuffer = await buildChildAgreementPdf({
        parentProfile,
        childData,
        signatureDataUrl: sigUrl,
        signedAt: now
      });

      onComplete({
        pdfBuffer,
        signedAt: now,
        signatureDataUrl: sigUrl
      });
    } catch (err) {
      setError("Failed to generate agreement PDF. Please try again.");
    }
  };

  return (
    <div className="flex flex-col gap-5 pt-2">
      <div className="flex flex-col gap-1.5">
        <p className="text-sm text-slate-600 leading-relaxed">
          As the legal guardian of <strong>{childData.first_name}</strong>, you are responsible for the management of their investment account. Please review and sign the agreement below.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 max-h-[220px] overflow-y-auto custom-scrollbar">
        <div className="flex flex-col gap-3 text-[12px] text-slate-600 font-medium">
          <p className="font-bold text-slate-900 border-b pb-2 uppercase tracking-wide">Legal Appointment Summary</p>
          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span>Legal Guardian</span>
            <span className="text-slate-900 font-bold">{parentProfile.firstName} {parentProfile.lastName}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-100">
            <span>Minor (Client)</span>
            <span className="text-slate-900 font-bold">{childData.first_name} {childData.last_name || ""}</span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed italic">
            "I warrant my legal authority as guardian and accept full fiduciary responsibility for this minor investment account under the Securities Administration Agreement."
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider ml-1">
          Signature
        </label>
        <div className="relative rounded-2xl border-2 border-slate-200 bg-white overflow-hidden" style={{ height: "140px" }}>
          <canvas
            ref={canvasRef}
            className="h-full w-full cursor-crosshair"
            style={{ touchAction: "none" }}
          />
          <button
            onClick={() => { sigPadRef.current?.clear(); setSigEmpty(true); }}
            className="absolute top-2 right-2 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-200 transition"
          >
            Clear
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 border border-red-100">
          <X className="h-3.5 w-3.5 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 mt-2">
        <button
          onClick={handleSignAndFinish}
          disabled={saving}
          className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)" }}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Finalizing Account...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Sign & Finish
            </>
          )}
        </button>
        <button
          onClick={onBack}
          disabled={saving}
          className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 transition"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
