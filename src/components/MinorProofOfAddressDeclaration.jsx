import React, { useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";
import jsPDF from "jspdf";
import { Check, Home, Navigation, MapPin, Users, X, AlertCircle, PenTool } from "lucide-react";

const MINT_PURPLE = [91, 33, 182];
const MINT_LOGO_URL =
  "https://mfxnghmuccevsxwcetej.supabase.co/storage/v1/object/public/Mint%20Assets/tMOmeIOo4KE20Yh1bIuk8PFMlFHZ421rVESa2dcn.jpg";
const CEO_SIGNATURE_URL = "/assets/ceo-signature.png";
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 15;
const COL1 = 65;
const COL2 = PAGE_W - MARGIN * 2 - COL1;

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

function addPageHeader(doc, logoB64, pageNum, totalPages) {
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");
  if (logoB64?.data) {
    const aspect = logoB64.width / logoB64.height;
    const h = 10, w = h * aspect;
    doc.addImage(logoB64.data, "JPEG", PAGE_W - MARGIN - w, MARGIN - 2, w, h, undefined, "FAST");
  }
  doc.setFillColor(...MINT_PURPLE);
  doc.rect(MARGIN, MARGIN + 12, PAGE_W - MARGIN * 2, 1.5, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  if (totalPages > 1) doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_W - MARGIN, PAGE_H - MARGIN, { align: "right" });
  doc.text("CONFIDENTIAL — Mint Platforms (Pty) Ltd", MARGIN, PAGE_H - MARGIN);
}

function addCeoSignature(doc, ceoSigB64, y) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(60, 50, 90);
  doc.text("For and on behalf of Mint Platforms (Pty) Ltd:", MARGIN, y);
  y += 5;
  doc.text("Name: Lonwabo Damane", MARGIN, y);
  y += 4;
  doc.text("Title: Chief Executive Officer", MARGIN, y);
  y += 2;
  if (ceoSigB64?.data && ceoSigB64.width > 0) {
    const aspect = ceoSigB64.width / ceoSigB64.height;
    let h = 16, w = h * aspect;
    if (w > 65) { w = 65; h = w / aspect; }
    doc.addImage(ceoSigB64.data, "PNG", MARGIN, y, w, h, undefined, "FAST");
    y += h + 2;
  } else {
    y += 14;
  }
  doc.setDrawColor(180, 170, 210);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, MARGIN + 75, y);
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 27, 75);
  doc.text("Lonwabo Damane", MARGIN, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 110, 150);
  doc.text("Chief Executive Officer — Mint Platforms (Pty) Ltd", MARGIN, y);
  return y + 5;
}

// ─── PDF builders ─────────────────────────────────────────────────────────────

async function buildSameAddressPdf({ parentProfile, coGuardianProfiles, childData, signatureDataUrl, signedAt }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const [logoB64, ceoSigB64] = await Promise.all([
    fetchImageBase64(MINT_LOGO_URL),
    fetchImageBase64(CEO_SIGNATURE_URL),
  ]);

  const parentName = [parentProfile?.firstName, parentProfile?.lastName].filter(Boolean).join(" ") || "—";
  const parentId = parentProfile?.idNumber || "—";
  const parentAddress = parentProfile?.address || "Registered address on file with Mint";
  const childName = `${childData?.first_name || ""} ${childData?.last_name || ""}`.trim() || "—";
  const childId = childData?.id_number || "—";
  const childDob = formatDateLong(childData?.date_of_birth);
  const signedDateLong = formatDateLong(signedAt?.split("T")[0]);
  const signedDateTime = new Date(signedAt).toLocaleString("en-ZA", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const allGuardianNames = [parentName, ...coGuardianProfiles.map(g => [g.firstName, g.lastName].filter(Boolean).join(" "))].join(" and ");

  addPageHeader(doc, logoB64, 1, 1);

  let y = MARGIN + 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...MINT_PURPLE);
  doc.text("MINOR PROOF OF RESIDENCE DECLARATION", MARGIN, y);
  y += 6;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(130, 100, 170);
  doc.text("Financial Intelligence Centre Act 38 of 2001 (FICA) — Minor Account Compliance", MARGIN, y);
  y += 4;
  doc.text("Scenario: Minor resides with parent / guardian at registered address", MARGIN, y);
  y += 10;

  // Primary guardian
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 27, 75);
  doc.text("PRIMARY GUARDIAN", MARGIN, y);
  y += 4;
  y = drawRow(doc, y, "Name", parentName);
  y = drawRow(doc, y, "Identity Number", parentId);
  y = drawRow(doc, y, "Registered Address", parentAddress);
  y += 4;

  // Co-guardians
  coGuardianProfiles.forEach((cg, idx) => {
    const cgName = [cg.firstName, cg.lastName].filter(Boolean).join(" ") || "—";
    const cgId = cg.idNumber || "—";
    const cgAddress = cg.address || "Registered address on file with Mint";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 27, 75);
    doc.text(`CO-GUARDIAN ${coGuardianProfiles.length > 1 ? idx + 1 : ""}`.trim(), MARGIN, y);
    y += 4;
    y = drawRow(doc, y, "Name", cgName);
    y = drawRow(doc, y, "Identity Number", cgId);
    y = drawRow(doc, y, "Registered Address", cgAddress);
    y += 4;
  });

  // Child
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 27, 75);
  doc.text("MINOR (CHILD)", MARGIN, y);
  y += 4;
  y = drawRow(doc, y, "Name", childName);
  y = drawRow(doc, y, "Date of Birth", childDob);
  y = drawRow(doc, y, "Identity Number", childId);
  y = drawRow(doc, y, "Residential Address", parentAddress);
  y = drawRow(doc, y, "Declaration Date", signedDateLong);
  y += 10;

  const writePara = (text, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(9);
    doc.setTextColor(50, 40, 80);
    const lines = doc.splitTextToSize(text, PAGE_W - MARGIN * 2);
    lines.forEach((line) => { doc.text(line, MARGIN, y); y += 4.8; });
    y += 2;
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 27, 75);
  doc.text("DECLARATION BY PARENT / LEGAL GUARDIAN", MARGIN, y);
  y += 8;

  const guardianParty = coGuardianProfiles.length > 0
    ? `We, ${allGuardianNames},`
    : `I, ${parentName} (Identity Number: ${parentId}),`;

  writePara(`${guardianParty} being the parent(s) and/or legal guardian(s) of the minor known as ${childName} (Date of Birth: ${childDob}; Identity Number: ${childId}), do hereby solemnly declare that:`);
  writePara(`1.  The above-mentioned minor currently resides with ${coGuardianProfiles.length > 0 ? "us" : "me"} at ${coGuardianProfiles.length > 0 ? "our" : "my"} registered residential address on file with Mint Financial Services (Pty) Ltd.`);
  writePara(`2.  The shared residential address is: ${parentAddress}.`);
  if (coGuardianProfiles.length > 0) {
    coGuardianProfiles.forEach(cg => {
      const cgName = [cg.firstName, cg.lastName].filter(Boolean).join(" ") || "co-guardian";
      const cgAddr = cg.address;
      if (cgAddr) writePara(`    Co-guardian ${cgName} is also registered at: ${cgAddr}.`);
    });
  }
  writePara("3.  This declaration is submitted in compliance with the Financial Intelligence Centre Act 38 of 2001 and applicable FICA Guidance Notes governing minor investment accounts.");
  writePara(`4.  ${coGuardianProfiles.length > 0 ? "We undertake" : "I undertake"} to notify Mint Financial Services (Pty) Ltd in writing within 14 (fourteen) calendar days should the minor's residential address change.`);
  writePara("5.  Providing false or misleading information in this declaration constitutes a criminal offence under South African law.");
  y += 6;

  if (y > PAGE_H - 110) {
    doc.addPage();
    addPageHeader(doc, logoB64, 2, 2);
    y = MARGIN + 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 27, 75);
  doc.text("GUARDIAN SIGNATURE:", MARGIN, y);
  y += 6;

  if (signatureDataUrl) {
    doc.addImage(signatureDataUrl, "PNG", MARGIN, y, 60, 22, undefined, "FAST");
    y += 26;
  } else {
    y += 30;
  }

  doc.setDrawColor(180, 170, 210);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, MARGIN + 75, y);
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 27, 75);
  doc.text(parentName, MARGIN, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 110, 150);
  doc.text("Legal Guardian / Parent", MARGIN, y);
  y += 4;
  doc.text(`Signed electronically via Mint App — ${signedDateTime}`, MARGIN, y);
  y += 14;

  y = addCeoSignature(doc, ceoSigB64, y);
  y += 6;

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

async function buildDifferentAddressPdf({ parentProfile, coGuardianProfiles, childData, childAddress, signatureDataUrl, signedAt }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const [logoB64, ceoSigB64] = await Promise.all([
    fetchImageBase64(MINT_LOGO_URL),
    fetchImageBase64(CEO_SIGNATURE_URL),
  ]);

  const parentName = [parentProfile?.firstName, parentProfile?.lastName].filter(Boolean).join(" ") || "—";
  const parentId = parentProfile?.idNumber || "—";
  const parentAddress = parentProfile?.address || "Registered address on file with Mint";
  const childName = `${childData?.first_name || ""} ${childData?.last_name || ""}`.trim() || "—";
  const childId = childData?.id_number || "—";
  const childDob = formatDateLong(childData?.date_of_birth);
  const signedDateLong = formatDateLong(signedAt?.split("T")[0]);
  const signedDateTime = new Date(signedAt).toLocaleString("en-ZA", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const fullChildAddress = [childAddress.line1, childAddress.suburb, childAddress.city, childAddress.province, childAddress.postalCode].filter(Boolean).join(", ");
  const allGuardianNames = [parentName, ...coGuardianProfiles.map(g => [g.firstName, g.lastName].filter(Boolean).join(" "))].join(" and ");

  addPageHeader(doc, logoB64, 1, 1);

  let y = MARGIN + 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...MINT_PURPLE);
  doc.text("MINOR PROOF OF RESIDENCE DECLARATION", MARGIN, y);
  y += 6;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(130, 100, 170);
  doc.text("Financial Intelligence Centre Act 38 of 2001 (FICA) — Minor Account Compliance", MARGIN, y);
  y += 4;
  doc.text("Scenario: Minor resides at a separate address from parent / guardian", MARGIN, y);
  y += 10;

  // Primary guardian
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 27, 75);
  doc.text("PRIMARY GUARDIAN", MARGIN, y);
  y += 4;
  y = drawRow(doc, y, "Name", parentName);
  y = drawRow(doc, y, "Identity Number", parentId);
  y = drawRow(doc, y, "Guardian's Address", parentAddress);
  y += 4;

  // Co-guardians
  coGuardianProfiles.forEach((cg, idx) => {
    const cgName = [cg.firstName, cg.lastName].filter(Boolean).join(" ") || "—";
    const cgId = cg.idNumber || "—";
    const cgAddress = cg.address || "Registered address on file with Mint";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 27, 75);
    doc.text(`CO-GUARDIAN ${coGuardianProfiles.length > 1 ? idx + 1 : ""}`.trim(), MARGIN, y);
    y += 4;
    y = drawRow(doc, y, "Name", cgName);
    y = drawRow(doc, y, "Identity Number", cgId);
    y = drawRow(doc, y, "Guardian's Address", cgAddress);
    y += 4;
  });

  // Child
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 27, 75);
  doc.text("MINOR (CHILD)", MARGIN, y);
  y += 4;
  y = drawRow(doc, y, "Name", childName);
  y = drawRow(doc, y, "Date of Birth", childDob);
  y = drawRow(doc, y, "Identity Number", childId);
  y = drawRow(doc, y, "Minor's Residential Address", fullChildAddress || "—");
  y = drawRow(doc, y, "Declaration Date", signedDateLong);
  y += 10;

  const writePara = (text, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(9);
    doc.setTextColor(50, 40, 80);
    const lines = doc.splitTextToSize(text, PAGE_W - MARGIN * 2);
    lines.forEach((line) => { doc.text(line, MARGIN, y); y += 4.8; });
    y += 2;
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 27, 75);
  doc.text("DECLARATION BY PARENT / LEGAL GUARDIAN", MARGIN, y);
  y += 8;

  const guardianParty = coGuardianProfiles.length > 0
    ? `We, ${allGuardianNames},`
    : `I, ${parentName} (Identity Number: ${parentId}),`;

  writePara(`${guardianParty} being the parent(s) and/or legal guardian(s) of the minor known as ${childName} (Date of Birth: ${childDob}; Identity Number: ${childId}), do hereby solemnly declare that:`);
  writePara(`1.  The above-mentioned minor currently resides at the following residential address: ${fullChildAddress || "as specified above"}.`);
  writePara(`2.  This address is separate from ${coGuardianProfiles.length > 0 ? "our" : "my"} own registered address(es). ${coGuardianProfiles.length > 0 ? "Our" : "My"} address on file with Mint is: ${parentAddress}.`);
  writePara("3.  The above minor's address is true and current, and is submitted as proof of residential address for FICA purposes relating to their Mint investment account, in compliance with the Financial Intelligence Centre Act 38 of 2001.");
  writePara(`4.  ${coGuardianProfiles.length > 0 ? "We are the" : "I am the"} legal parent(s) and/or guardian(s) of this minor and ${coGuardianProfiles.length > 0 ? "are" : "am"} authorised to make this declaration on their behalf.`);
  writePara(`5.  ${coGuardianProfiles.length > 0 ? "We undertake" : "I undertake"} to notify Mint Financial Services (Pty) Ltd in writing within 14 (fourteen) calendar days should the minor's residential address change.`);
  writePara("6.  Providing false or misleading information in this declaration constitutes a criminal offence under South African law.");
  y += 6;

  if (y > PAGE_H - 110) {
    doc.addPage();
    addPageHeader(doc, logoB64, 2, 2);
    y = MARGIN + 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 27, 75);
  doc.text("GUARDIAN SIGNATURE:", MARGIN, y);
  y += 6;

  if (signatureDataUrl) {
    doc.addImage(signatureDataUrl, "PNG", MARGIN, y, 60, 22, undefined, "FAST");
    y += 26;
  } else {
    y += 30;
  }

  doc.setDrawColor(180, 170, 210);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, MARGIN + 75, y);
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 27, 75);
  doc.text(parentName, MARGIN, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 110, 150);
  doc.text("Legal Guardian / Parent", MARGIN, y);
  y += 4;
  doc.text(`Signed electronically via Mint App — ${signedDateTime}`, MARGIN, y);
  y += 14;

  y = addCeoSignature(doc, ceoSigB64, y);
  y += 6;

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

// ─── Download helper ──────────────────────────────────────────────────────────

function downloadPdf(pdfBuffer, filename) {
  const blob = new Blob([pdfBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
}

// ─── Component ────────────────────────────────────────────────────────────────

const SA_PROVINCES = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal",
  "Limpopo", "Mpumalanga", "Northern Cape", "North West", "Western Cape",
];

export default function MinorProofOfAddressDeclaration({ childData, parentProfile, coGuardians = [], onComplete, onBack }) {
  const [answer, setAnswer] = useState(null); // null | "same" | "different"
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState("");
  const [coGuardianProfiles, setCoGuardianProfiles] = useState([]);

  // For "same address" path
  const sameCanvasRef = useRef(null);
  const samePadRef = useRef(null);

  // For "different address" path
  const [childAddress, setChildAddress] = useState({ line1: "", suburb: "", city: "", province: "", postalCode: "" });
  const [addressStep, setAddressStep] = useState("form"); // "form" | "sign"
  const diffCanvasRef = useRef(null);
  const diffPadRef = useRef(null);

  const childName = `${childData?.first_name || ""} ${childData?.last_name || ""}`.trim() || "your child";
  const parentName = [parentProfile?.firstName, parentProfile?.lastName].filter(Boolean).join(" ") || "the undersigned";
  const parentAddress = parentProfile?.address || null;

  // Fetch linked profiles for co-guardians
  useEffect(() => {
    if (!coGuardians || coGuardians.length === 0) return;
    Promise.all(
      coGuardians.map(async (cg) => {
        if (cg.linked_user_id) {
          try {
            const res = await fetch(`/api/linked-user-profile/${cg.linked_user_id}`);
            if (res.ok) return await res.json();
          } catch { /* ignore */ }
        }
        // Fallback: use what's on the family_member row itself
        return {
          firstName: cg.first_name,
          lastName: cg.last_name,
          idNumber: cg.id_number || null,
          address: null,
        };
      })
    ).then(setCoGuardianProfiles);
  }, [coGuardians]);

  // Init signature pads
  useEffect(() => {
    if (answer === "same" && sameCanvasRef.current && !samePadRef.current) {
      samePadRef.current = new SignaturePad(sameCanvasRef.current, {
        backgroundColor: "rgb(255,255,255)", penColor: "rgb(30,27,75)", minWidth: 1, maxWidth: 2.5,
      });
    }
  }, [answer]);

  useEffect(() => {
    if (answer === "different" && addressStep === "sign" && diffCanvasRef.current && !diffPadRef.current) {
      setTimeout(() => {
        if (diffCanvasRef.current && !diffPadRef.current) {
          diffPadRef.current = new SignaturePad(diffCanvasRef.current, {
            backgroundColor: "rgb(255,255,255)", penColor: "rgb(30,27,75)", minWidth: 1, maxWidth: 2.5,
          });
        }
      }, 100);
    }
  }, [answer, addressStep]);

  async function handleSameSign() {
    if (!samePadRef.current || samePadRef.current.isEmpty()) {
      setError("Please sign the declaration above."); return;
    }
    setSigning(true); setError("");
    try {
      const signatureDataUrl = samePadRef.current.toDataURL("image/png");
      const signedAt = new Date().toISOString();
      const pdfBuffer = await buildSameAddressPdf({ parentProfile, coGuardianProfiles, childData, signatureDataUrl, signedAt });
      const safeName = (childData?.first_name || "minor").toLowerCase().replace(/\s+/g, "-");
      downloadPdf(pdfBuffer, `mint-address-declaration-${safeName}.pdf`);
      onComplete({ livesWithParent: true, pdfBuffer, signedAt });
    } catch (e) {
      console.error("[poa]", e);
      setError("Failed to generate declaration. Please try again.");
    } finally { setSigning(false); }
  }

  function handleAddressNext() {
    if (!childAddress.line1.trim()) { setError("Please enter the street address."); return; }
    if (!childAddress.city.trim()) { setError("Please enter the city or town."); return; }
    if (!childAddress.province) { setError("Please select a province."); return; }
    setError(""); setAddressStep("sign");
  }

  async function handleDifferentSign() {
    if (!diffPadRef.current || diffPadRef.current.isEmpty()) {
      setError("Please sign the declaration above."); return;
    }
    setSigning(true); setError("");
    try {
      const signatureDataUrl = diffPadRef.current.toDataURL("image/png");
      const signedAt = new Date().toISOString();
      const pdfBuffer = await buildDifferentAddressPdf({ parentProfile, coGuardianProfiles, childData, childAddress, signatureDataUrl, signedAt });
      const safeName = (childData?.first_name || "minor").toLowerCase().replace(/\s+/g, "-");
      downloadPdf(pdfBuffer, `mint-address-declaration-${safeName}.pdf`);
      onComplete({ livesWithParent: false, childAddress, pdfBuffer, signedAt });
    } catch (e) {
      console.error("[poa]", e);
      setError("Failed to generate declaration. Please try again.");
    } finally { setSigning(false); }
  }

  const PURPLE = "#5B21B6";
  const P2 = "#7C3AED";
  const P_CARD = "#EDE9FE";
  const P_BG = "#F5F3FF";
  const BTN = `linear-gradient(135deg, ${P2}, ${PURPLE})`;
  const inputCls = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200";

  // ── Question ────────────────────────────────────────────────────────────────
  if (answer === null) {
    return (
      <div className="space-y-5">
        {/* Title */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-xl flex-shrink-0" style={{ background: P_CARD }}>
            <MapPin className="h-5 w-5" style={{ color: PURPLE }} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Address Verification</p>
            <p className="text-[18px] font-bold text-slate-900 leading-tight">Where does {childName} live?</p>
          </div>
        </div>

        {/* Guardian(s) card */}
        <div className="rounded-3xl bg-white border border-slate-100 px-5 py-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4" style={{ color: PURPLE }} />
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Guardian(s) on record</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: P_BG }}>
              <div className="p-2 rounded-lg flex-shrink-0" style={{ background: P_CARD }}>
                <Home className="h-4 w-4" style={{ color: PURPLE }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900">{parentName}</p>
                {parentAddress
                  ? <p className="text-xs text-slate-600 mt-1">{parentAddress}</p>
                  : <p className="text-xs text-slate-400 italic mt-1">Address on file with Mint</p>}
              </div>
            </div>
            {coGuardianProfiles.map((cg, i) => {
              const cgName = [cg.firstName, cg.lastName].filter(Boolean).join(" ") || "Co-guardian";
              return (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100">
                  <div className="p-2 rounded-lg flex-shrink-0 bg-slate-50">
                    <Users className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900">{cgName}</p>
                    {cg.address
                      ? <p className="text-xs text-slate-600 mt-1">{cg.address}</p>
                      : <p className="text-xs text-slate-400 italic mt-1">Address on file with Mint</p>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="pt-4 mt-3 border-t border-slate-100">
            <p className="text-sm text-slate-700 leading-relaxed">
              Does <strong style={{ color: PURPLE }}>{childName}</strong> currently reside with {coGuardianProfiles.length > 0 ? "one of the guardians above" : "you"} at their registered address?
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { setAnswer("same"); setError(""); }}
            className="flex flex-col items-center gap-2 rounded-2xl px-4 py-5 font-bold text-sm transition active:scale-95 border-2 duration-200"
            style={{ borderColor: PURPLE, background: P_CARD, color: PURPLE }}
          >
            <Home className="h-5 w-5" />
            Yes, same address
          </button>
          <button
            onClick={() => { setAnswer("different"); setError(""); setAddressStep("form"); diffPadRef.current = null; }}
            className="flex flex-col items-center gap-2 rounded-2xl bg-white px-4 py-5 text-slate-600 font-bold text-sm border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition active:scale-95 duration-200"
          >
            <Navigation className="h-5 w-5" />
            No, different address
          </button>
        </div>

        <button onClick={onBack} className="text-[11px] font-bold tracking-widest uppercase text-slate-400 hover:text-slate-600 py-2 transition">← Back</button>
      </div>
    );
  }

  // ── Same address: sign ──────────────────────────────────────────────────────
  if (answer === "same") {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl flex-shrink-0" style={{ background: P_CARD }}>
              <Check className="h-5 w-5" style={{ color: PURPLE }} />
            </div>
            <div>
              <p className="text-[11px] font-bold tracking-widest uppercase text-slate-400">Address Confirmation</p>
              <p className="text-[18px] font-bold text-slate-900 leading-tight">Confirm residence</p>
            </div>
          </div>
          <button onClick={() => { setAnswer(null); samePadRef.current = null; setError(""); }} className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Declaration text */}
        <div className="rounded-3xl bg-white border border-slate-100 px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Official Affirmation</p>
          <p className="text-sm leading-relaxed text-slate-700">
            I, <strong className="text-slate-900">{parentName}</strong>
            {parentAddress ? <span style={{ color: PURPLE }}> at {parentAddress}</span> : null},
            {coGuardianProfiles.length > 0 && (
              <>{" "}and {coGuardianProfiles.map((cg, i) => {
                const cgName = [cg.firstName, cg.lastName].filter(Boolean).join(" ") || "co-guardian";
                return <span key={i}><strong className="text-slate-900">{cgName}</strong>{i < coGuardianProfiles.length - 1 ? ", " : ""}</span>;
              })}</>
            )}{" "}
            hereby declare that <strong className="text-slate-900">{childName}</strong> currently resides with {coGuardianProfiles.length > 0 ? "us" : "me"} at the registered address on file with Mint. {coGuardianProfiles.length > 0 ? "We undertake" : "I undertake"} to notify Mint within 14 days if this changes.
          </p>
        </div>

        {/* Signature box */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
            <div className="p-2 rounded-lg" style={{ background: P_CARD }}>
              <PenTool className="h-4 w-4" style={{ color: PURPLE }} />
            </div>
            Sign here to declare
          </p>
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white overflow-hidden shadow-sm" style={{ touchAction: "none" }}>
            <canvas ref={sameCanvasRef} width={340} height={110} className="w-full" style={{ display: "block" }} />
          </div>
          <button onClick={() => samePadRef.current?.clear()} className="text-[11px] text-slate-400 hover:text-slate-600 mt-2.5 transition font-medium">↻ Clear signature</button>
        </div>

        {error && <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
        </div>}

        <button onClick={handleSameSign} disabled={signing} className="w-full rounded-2xl py-4 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-60 duration-200 shadow-lg shadow-purple-900/20 hover:shadow-lg" style={{ background: BTN }}>
          {signing ? "Generating declaration…" : "Sign & Continue →"}
        </button>
      </div>
    );
  }

  // ── Different address: form ─────────────────────────────────────────────────
  if (answer === "different" && addressStep === "form") {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl flex-shrink-0" style={{ background: P_CARD }}>
              <MapPin className="h-5 w-5" style={{ color: PURPLE }} />
            </div>
            <div>
              <p className="text-[11px] font-bold tracking-widest uppercase text-slate-400">Child's Address</p>
              <p className="text-[18px] font-bold text-slate-900 leading-tight">Where {childName} lives</p>
            </div>
          </div>
          <button onClick={() => { setAnswer(null); setError(""); }} className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">
          Enter where {childName} currently lives. You'll confirm this with a signed declaration.
        </p>

        <div className="rounded-3xl bg-white border border-slate-100 p-5 space-y-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2.5 flex items-center gap-1.5">
              <span className="relative flex h-2 w-2 rounded-full" style={{ background: PURPLE }}></span>
              Street Address
            </p>
            <input type="text" placeholder="e.g. 12 Oak Street" value={childAddress.line1} onChange={e => setChildAddress(a => ({ ...a, line1: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2.5">Suburb / Township</p>
            <input type="text" placeholder="e.g. Sandton" value={childAddress.suburb} onChange={e => setChildAddress(a => ({ ...a, suburb: e.target.value }))} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2.5 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2 rounded-full" style={{ background: PURPLE }}></span>
                City / Town
              </p>
              <input type="text" placeholder="e.g. Johannesburg" value={childAddress.city} onChange={e => setChildAddress(a => ({ ...a, city: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2.5">Postal Code</p>
              <input type="text" placeholder="e.g. 2196" value={childAddress.postalCode} maxLength={4} onChange={e => setChildAddress(a => ({ ...a, postalCode: e.target.value.replace(/\D/g, "") }))} className={inputCls} />
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2.5 flex items-center gap-1.5">
              <span className="relative flex h-2 w-2 rounded-full" style={{ background: PURPLE }}></span>
              Province
            </p>
            <select value={childAddress.province} onChange={e => setChildAddress(a => ({ ...a, province: e.target.value }))} className={inputCls}>
              <option value="">Select province…</option>
              {SA_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {error && <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
        </div>}

        <button onClick={handleAddressNext} className="w-full rounded-2xl py-4 text-sm font-bold text-white transition active:scale-[0.98] duration-200 shadow-lg shadow-purple-900/20 hover:shadow-lg" style={{ background: BTN }}>
          Next — Sign Declaration →
        </button>
      </div>
    );
  }

  // ── Different address: sign ──────────────────────────────────────────────────
  if (answer === "different" && addressStep === "sign") {
    const fullAddr = [childAddress.line1, childAddress.suburb, childAddress.city, childAddress.province, childAddress.postalCode].filter(Boolean).join(", ");
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl flex-shrink-0" style={{ background: P_CARD }}>
              <Check className="h-5 w-5" style={{ color: PURPLE }} />
            </div>
            <div>
              <p className="text-[11px] font-bold tracking-widest uppercase text-slate-400">Address Confirmation</p>
              <p className="text-[18px] font-bold text-slate-900 leading-tight">Sign to confirm</p>
            </div>
          </div>
          <button onClick={() => { setAddressStep("form"); setError(""); diffPadRef.current = null; }} className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Declaration text */}
        <div className="rounded-3xl bg-white border border-slate-100 px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Official Affirmation</p>
          <p className="text-sm leading-relaxed text-slate-700 mb-3">
            I, <strong className="text-slate-900">{parentName}</strong>
            {parentAddress ? <span style={{ color: PURPLE }}> at {parentAddress}</span> : null}
            {coGuardianProfiles.length > 0 && (
              <>{" "}and {coGuardianProfiles.map((cg, i) => {
                const cgName = [cg.firstName, cg.lastName].filter(Boolean).join(" ") || "co-guardian";
                return <span key={i}><strong className="text-slate-900">{cgName}</strong>{i < coGuardianProfiles.length - 1 ? ", " : ""}</span>;
              })}</>
            )}{" "}
            hereby declare that <strong className="text-slate-900">{childName}</strong> currently resides at:
          </p>
          <div className="p-3 rounded-xl" style={{ background: P_BG }}>
            <p className="text-sm font-bold" style={{ color: PURPLE }}>{fullAddr}</p>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mt-3">{coGuardianProfiles.length > 0 ? "We undertake" : "I undertake"} to notify Mint within 14 days if this address changes.</p>
        </div>

        {/* Signature box */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
            <div className="p-2 rounded-lg" style={{ background: P_CARD }}>
              <PenTool className="h-4 w-4" style={{ color: PURPLE }} />
            </div>
            Sign here to declare
          </p>
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white overflow-hidden shadow-sm" style={{ touchAction: "none" }}>
            <canvas ref={diffCanvasRef} width={340} height={110} className="w-full" style={{ display: "block" }} />
          </div>
          <button onClick={() => diffPadRef.current?.clear()} className="text-[11px] text-slate-400 hover:text-slate-600 mt-2.5 transition font-medium">↻ Clear signature</button>
        </div>

        {error && <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
        </div>}

        <button onClick={handleDifferentSign} disabled={signing} className="w-full rounded-2xl py-4 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-60 duration-200 shadow-lg shadow-purple-900/20 hover:shadow-lg" style={{ background: BTN }}>
          {signing ? "Generating declaration…" : "Sign & Continue →"}
        </button>
      </div>
    );
  }

  return null;
}
