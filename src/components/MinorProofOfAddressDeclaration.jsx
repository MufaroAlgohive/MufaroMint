import React, { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";
import jsPDF from "jspdf";
import { Check, X, MapPin } from "lucide-react";

const MINT_PURPLE = [91, 33, 182];
const MINT_LOGO_URL =
  "https://mfxnghmuccevsxwcetej.supabase.co/storage/v1/object/public/Mint%20Assets/tMOmeIOo4KE20Yh1bIuk8PFMlFHZ421rVESa2dcn.jpg";

function formatDateLong(iso) {
  if (!iso) return "—";
  const parts = iso.split("-").map(Number);
  if (parts.length === 3) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
  }
  return iso;
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
  } catch {
    return null;
  }
}

async function buildPoaPdf({ parentProfile, childData, signatureDataUrl, signedAt }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logoB64 = await fetchImageBase64(MINT_LOGO_URL);

  const PAGE_W = 210;
  const MARGIN = 15;
  const COL1 = 65;
  const COL2 = PAGE_W - MARGIN * 2 - COL1;

  const parentName =
    [parentProfile?.firstName, parentProfile?.lastName].filter(Boolean).join(" ") || "—";
  const parentId = parentProfile?.idNumber || "—";
  const childName =
    `${childData?.first_name || ""} ${childData?.last_name || ""}`.trim() || "—";
  const childId = childData?.id_number || "—";
  const childDob = formatDateLong(childData?.date_of_birth);
  const signedDateLong = formatDateLong(signedAt?.split("T")[0]);
  const signedDateTime = new Date(signedAt).toLocaleString("en-ZA", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  function drawRow(doc, y, label, value) {
    const px = 3, py = 2.5, lh = 5.5;
    const valLines = doc.splitTextToSize(String(value || "—"), COL2 - px * 2);
    const rowH = Math.max(valLines.length * lh + py * 2, 10);
    doc.setDrawColor(220, 220, 230);
    doc.setLineWidth(0.25);
    doc.setFillColor(248, 246, 255);
    doc.rect(MARGIN, y, COL1, rowH, "FD");
    doc.setFillColor(255, 255, 255);
    doc.rect(MARGIN + COL1, y, COL2, rowH, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(120, 100, 160);
    doc.text(label.toUpperCase(), MARGIN + px, y + py + 3.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 27, 75);
    valLines.forEach((l, i) => doc.text(l, MARGIN + COL1 + px, y + py + 3.5 + i * lh));
    return y + rowH;
  }

  // White background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PAGE_W, 297, "F");

  // Logo
  if (logoB64?.data) {
    const aspect = logoB64.width / logoB64.height;
    const h = 10, w = h * aspect;
    doc.addImage(logoB64.data, "JPEG", PAGE_W - MARGIN - w, MARGIN - 2, w, h, undefined, "FAST");
  }

  // Purple rule
  doc.setFillColor(...MINT_PURPLE);
  doc.rect(MARGIN, MARGIN + 12, PAGE_W - MARGIN * 2, 1.5, "F");

  let y = MARGIN + 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...MINT_PURPLE);
  doc.text("MINOR PROOF OF RESIDENCE DECLARATION", MARGIN, y);
  y += 6;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(130, 100, 170);
  doc.text(
    "Financial Intelligence Centre Act 38 of 2001 (FICA) — Minor Account Compliance",
    MARGIN,
    y
  );
  y += 10;

  y = drawRow(doc, y, "Declaring Parent / Guardian", parentName);
  y = drawRow(doc, y, "Guardian Identity Number", parentId);
  y = drawRow(doc, y, "Minor (Child)", childName);
  y = drawRow(doc, y, "Minor Date of Birth", childDob);
  y = drawRow(doc, y, "Minor Identity Number", childId);
  y = drawRow(doc, y, "Declaration Date", signedDateLong);
  y += 10;

  const writePara = (text, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(9);
    doc.setTextColor(50, 40, 80);
    const lines = doc.splitTextToSize(text, PAGE_W - MARGIN * 2);
    lines.forEach((line) => {
      doc.text(line, MARGIN, y);
      y += 4.8;
    });
    y += 2;
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 27, 75);
  doc.text("DECLARATION BY PARENT / LEGAL GUARDIAN", MARGIN, y);
  y += 6;

  writePara(
    `I, ${parentName} (Identity Number: ${parentId}), being the parent and/or legal guardian of the minor known as ${childName} (Date of Birth: ${childDob}; Identity Number: ${childId}), do hereby solemnly declare that:`
  );
  writePara(
    "1. The above-mentioned minor currently resides with me at my registered residential address on file with Mint Financial Services (Pty) Ltd (FSP No. 55118)."
  );
  writePara(
    "2. My registered residential address on file with Mint serves as the minor's proof of residential address for all FICA purposes relating to their Mint investment account, in compliance with the Financial Intelligence Centre Act 38 of 2001 and applicable FICA Guidance Notes."
  );
  writePara(
    "3. I undertake to notify Mint Financial Services (Pty) Ltd in writing within 14 (fourteen) calendar days should the minor's residential address change."
  );
  writePara(
    "4. I am aware that providing false or misleading information in this declaration constitutes a criminal offence under South African law."
  );
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 27, 75);
  doc.text("SIGNATURE OF DECLARING PARENT / GUARDIAN:", MARGIN, y);
  y += 6;

  if (signatureDataUrl) {
    doc.addImage(signatureDataUrl, "PNG", MARGIN, y, 60, 20, undefined, "FAST");
    y += 24;
  } else {
    doc.setDrawColor(180, 180, 200);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, y + 20, MARGIN + 80, y + 20);
    y += 28;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 80);
  doc.text(parentName, MARGIN, y);
  y += 5;
  doc.text(`Signed electronically via Mint App — ${signedDateTime}`, MARGIN, y);
  y += 12;

  doc.setDrawColor(200, 190, 220);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(150, 130, 170);
  const footer = doc.splitTextToSize(
    "This declaration was completed electronically via Mint App. Mint Financial Services (Pty) Ltd | FSP No. 55118 | support@mymint.co.za | www.mymint.co.za",
    PAGE_W - MARGIN * 2
  );
  footer.forEach((l) => { doc.text(l, MARGIN, y); y += 4; });

  return doc.output("arraybuffer");
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MinorProofOfAddressDeclaration({
  childData,
  parentProfile,
  onComplete,
  onBack,
}) {
  const [answer, setAnswer] = useState(null); // null | true | false
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState("");
  const [fileUpload, setFileUpload] = useState(null);

  const canvasRef = useRef(null);
  const padRef = useRef(null);

  const childName =
    `${childData?.first_name || ""} ${childData?.last_name || ""}`.trim() || "your child";

  useEffect(() => {
    if (answer === true && canvasRef.current && !padRef.current) {
      padRef.current = new SignaturePad(canvasRef.current, {
        backgroundColor: "rgb(255,255,255)",
        penColor: "rgb(30,27,75)",
        minWidth: 1,
        maxWidth: 2.5,
      });
    }
  }, [answer]);

  async function handleSign() {
    if (!padRef.current || padRef.current.isEmpty()) {
      setError("Please sign the declaration above.");
      return;
    }
    setSigning(true);
    setError("");
    try {
      const signatureDataUrl = padRef.current.toDataURL("image/png");
      const signedAt = new Date().toISOString();
      const pdfBuffer = await buildPoaPdf({ parentProfile, childData, signatureDataUrl, signedAt });
      onComplete({ livesWithParent: true, pdfBuffer, signedAt });
    } catch (e) {
      console.error("[poa]", e);
      setError("Failed to generate declaration. Please try again.");
    } finally {
      setSigning(false);
    }
  }

  function handleUploadContinue() {
    if (!fileUpload) {
      setError("Please upload a proof of address document.");
      return;
    }
    onComplete({ livesWithParent: false, fileUpload, signedAt: new Date().toISOString() });
  }

  /* ── Question step ──────────────────────────────────────────────────────── */
  if (answer === null) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#5b21b6,#7c3aed)" }}
          >
            <MapPin className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-900">Proof of Address</p>
            <p className="text-xs text-slate-400">FICA requirement for minor accounts</p>
          </div>
        </div>

        <div className="rounded-2xl bg-violet-50 border border-violet-100 px-4 py-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            Does <strong className="text-violet-700">{childName}</strong> currently reside with
            you at your registered address?
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setAnswer(true)}
            className="flex flex-col items-center gap-2 rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-5 text-emerald-700 font-bold text-sm hover:border-emerald-300 transition active:scale-95"
          >
            <Check className="h-5 w-5" />
            Yes, same address
          </button>
          <button
            onClick={() => setAnswer(false)}
            className="flex flex-col items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-4 py-5 text-slate-600 font-bold text-sm hover:border-slate-300 transition active:scale-95"
          >
            <X className="h-5 w-5 text-slate-400" />
            No, different address
          </button>
        </div>

        <button
          onClick={onBack}
          className="text-xs text-slate-400 hover:text-slate-600 font-medium transition"
        >
          ← Back
        </button>
      </div>
    );
  }

  /* ── Signature / declaration (YES) ─────────────────────────────────────── */
  if (answer === true) {
    const parentName =
      [parentProfile?.firstName, parentProfile?.lastName].filter(Boolean).join(" ") ||
      "the undersigned";

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-bold text-slate-900">Address Declaration</p>
            <p className="text-xs text-slate-400">Sign to confirm the minor lives with you</p>
          </div>
          <button
            onClick={() => { setAnswer(null); padRef.current = null; }}
            className="text-xs text-slate-400 hover:text-slate-600 transition"
          >
            Change
          </button>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-4 text-xs text-slate-600 leading-relaxed space-y-2">
          <p className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">
            Proof of Residence — Minor Declaration
          </p>
          <p>
            I, <strong>{parentName}</strong>, hereby declare that{" "}
            <strong>{childName}</strong>
            {childData?.date_of_birth ? ` (DOB: ${childData.date_of_birth})` : ""}
            {childData?.id_number ? `, ID: ${childData.id_number}` : ""} currently resides with
            me at my registered address on file with Mint Financial Services (Pty) Ltd.
          </p>
          <p>
            I understand this declaration serves as proof of residence for the minor's Mint
            account in compliance with FICA, and I undertake to notify Mint within 14 days if
            this changes.
          </p>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Sign here to declare
          </p>
          <div
            className="rounded-xl border-2 border-dashed border-slate-300 bg-white overflow-hidden"
            style={{ touchAction: "none" }}
          >
            <canvas
              ref={canvasRef}
              width={340}
              height={100}
              className="w-full"
              style={{ display: "block" }}
            />
          </div>
          <button
            onClick={() => padRef.current?.clear()}
            className="text-[10px] text-slate-400 hover:text-slate-600 mt-1 transition"
          >
            Clear signature
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
            {error}
          </p>
        )}

        <button
          onClick={handleSign}
          disabled={signing}
          className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)" }}
        >
          {signing ? "Generating declaration…" : "Sign & Continue"}
        </button>
      </div>
    );
  }

  /* ── Upload (NO — different address) ───────────────────────────────────── */
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-bold text-slate-900">Upload Proof of Address</p>
          <p className="text-xs text-slate-400">A document showing {childName}'s address</p>
        </div>
        <button
          onClick={() => setAnswer(null)}
          className="text-xs text-slate-400 hover:text-slate-600 transition"
        >
          Change
        </button>
      </div>

      <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
        <p className="text-xs text-amber-700 leading-relaxed">
          Accepted: utility bill, bank statement, lease agreement, or any official document
          showing the child's residential address (not older than 3 months).
        </p>
      </div>

      <label
        className={`block w-full cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition ${
          fileUpload
            ? "border-violet-300 bg-violet-50"
            : "border-slate-300 bg-slate-50 hover:border-violet-200"
        }`}
      >
        {fileUpload ? (
          <div>
            <Check className="h-5 w-5 text-violet-500 mx-auto mb-1" />
            <p className="text-sm font-semibold text-violet-700">{fileUpload.name}</p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-semibold text-slate-500">Tap to upload</p>
            <p className="text-xs text-slate-400 mt-1">PDF, JPG, or PNG — max 10 MB</p>
          </div>
        )}
        <input
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (f.size > 10 * 1024 * 1024) { setError("File must be under 10 MB."); return; }
            setFileUpload(f);
            setError("");
          }}
        />
      </label>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
          {error}
        </p>
      )}

      <button
        onClick={handleUploadContinue}
        disabled={!fileUpload}
        className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
        style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)" }}
      >
        Continue
      </button>
    </div>
  );
}
