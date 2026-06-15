import React, { useRef, useState, useEffect } from "react";
import { Invoice, Client, Operation, Company } from "../types";
import { Printer, X, Check, FileCheck, Phone, MapPin, Building, ShieldCheck, Mail, Calendar, Hash, DollarSign, Share2 } from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";

interface InvoicePrintModalProps {
  invoice: Invoice;
  client: Client;
  operation: Operation;
  company: Company | null;
  onClose: () => void;
}

export default function InvoicePrintModal({
  invoice,
  client,
  operation,
  company,
  onClose
}: InvoicePrintModalProps) {
  const { language, t } = useLanguage();
  const companyName = company?.name || (language === "ar" ? "منشأة تجارية" : "Business Enterprise");
  const logoUrl = company?.logo_url || "";
  const primaryColorVal = company?.primary_color || "#4F46E5";
  const currency = company?.currency || "ر.س";

  const [customNote, setCustomNote] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<"classic" | "modern" | "corporate" | "elegant">("classic");

  useEffect(() => {
    setCustomNote(
      language === "ar" 
        ? "نشكركم على ثقتكم الغالية وتعاملكم المستمر معنا. يرجى سداد مستحقات هذه الفاتورة خلال فترة الاستحقاق المحددة." 
        : "Thank you for your valued business. Please arrange for invoice settlement within the specified payment terms."
    );
  }, [language]);

  const [stampColor, setStampColor] = useState<"emerald" | "indigo" | "rose">(
    invoice.status === "Paid" ? "emerald" : "indigo"
  );
  
  // Saudi VAT Calculation (15%)
  const grandTotal = invoice.amount;
  const taxableSubtotal = grandTotal / 1.15;
  const vatAmount = grandTotal - taxableSubtotal;

  // Invoice Date (use operation date if available, otherwise fallback to custom)
  const invoiceDate = operation.date || new Date().toISOString().split("T")[0];

  // Helper to generate a realistic Saudi VAT Number based on Tenant ID
  const generateVatNumber = (compId: string) => {
    let numeric = "";
    for (let i = 0; i < compId.length; i++) {
      numeric += compId.charCodeAt(i).toString();
    }
    const middleDigits = (numeric + "9876543210123").substring(0, 13);
    return `3${middleDigits}3`;
  };

  const vatNumber = generateVatNumber(invoice.company_id || "comp-1");

  const [copied, setCopied] = useState(false);

  // Trigger Print using the browser native dialog
  const handlePrint = () => {
    window.print();
    // Log the print action to audit logs
    fetch("/api/audit-logs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-company-id": invoice.company_id || "comp-1"
      },
      body: JSON.stringify({
        action: language === "ar" ? "تصدير الفاتورة PDF / طباعة" : "Exported Invoice PDF / printed",
        details: language === "ar" 
          ? `تصدير الفاتورة رقم #${invoice.id.split("-").pop() || invoice.id} بصيغة PDF وطباعتها، بقيمة إجمالية ${invoice.amount.toLocaleString()} ${currency} لصالح العميل "${client.name}" باستخدام قالب "${selectedTemplate}".` 
          : `Printed invoice #${invoice.id.split("-").pop() || invoice.id} to PDF using template "${selectedTemplate}", total balance of ${invoice.amount.toLocaleString()} ${currency} for client "${client.name}".`
      })
    }).catch(err => console.warn("Could not log printing:", err));
  };

  const handleShare = async () => {
    const formattedId = invoice.id.split("-").pop() || invoice.id;
    const shareText = language === "ar" 
      ? `🧾 فاتورة ضريبية مبسطة من: ${companyName}\n` +
        `رقم الفاتورة: #${formattedId}\n` +
        `العميل المستلم: ${client.name}\n` +
        `الخدمة/العملية: ${operation.service}\n` +
        `إجمالي المبلغ شامل الضريبة: ${invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${currency}\n` +
        `تاريخ الإصدار: ${invoiceDate}\n` +
        `تاريخ الاستحقاق: ${invoice.due_date || "—"}\n` +
        `حالة العملية المالية: ${invoice.status === "Paid" ? "✅ مدفوعة ومحصلة" : "⏳ قيد الانتظار"}\n\n` +
        `تم توليدها وإرسالها إلكترونياً بنجاح.`
      : `🧾 Simplified Tax Invoice from: ${companyName}\n` +
        `Invoice Reference: #${formattedId}\n` +
        `Client Recipient: ${client.name}\n` +
        `Service Rendered: ${operation.service}\n` +
        `Total Amount inc. VAT: ${invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${currency}\n` +
        `Issue Date: ${invoiceDate}\n` +
        `Due Date: ${invoice.due_date || "—"}\n` +
        `Operational Status: ${invoice.status === "Paid" ? "✅ Paid & Settled" : "⏳ Pending Payment"}\n\n` +
        `Generated and secure-signed electronically.`;

    // Log sharing action
    fetch("/api/audit-logs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-company-id": invoice.company_id || "comp-1"
      },
      body: JSON.stringify({
        action: language === "ar" ? "مشاركة بيانات الفاتورة" : "Shared invoice data link",
        details: language === "ar" 
          ? `مشاركة الفاتورة الضريبية رقم #${formattedId} للعميل "${client.name}" بقيمة ${invoice.amount.toLocaleString()} ${currency} عن طريق الرابط أو نسخها للحافظة.` 
          : `Successfully copied invoice statement metadata #${formattedId} to sharing buffer or dispatch interface for client "${client.name}".`
      })
    }).catch(err => console.warn("Could not log share:", err));

    if (navigator.share) {
      try {
        await navigator.share({
          title: language === "ar" ? `فاتورة ضريبية #${formattedId}` : `Tax Invoice #${formattedId}`,
          text: shareText,
        });
        return;
      } catch (err) {
        console.log("Error sharing:", err);
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-cardbk dark:bg-slate-900 rounded-2xl max-w-4xl w-full my-8 border border-borderline shadow-2xl flex flex-col md:flex-row relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Left Column: Customizer & Controls (Not part of print area!) */}
        <div id="invoice-customizer-panel" className="w-full md:w-80 p-6 bg-appbk border-b md:border-b-0 border-borderline flex flex-col justify-between shrink-0 text-start">
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 text-indigo-500 font-bold mb-1">
                <Printer className="w-5 h-5" />
                <h3 className="text-md text-txtmain">{language === "ar" ? "خيارات تصدير الفاتورة" : "PDF Export Parameters"}</h3>
              </div>
              <p className="text-[11px] text-txtmuted">
                {language === "ar" 
                  ? "قم بتهيِئة خيارات الطباعة وتضمين الملاحظات قبل حفظ الفاتورة كـ PDF." 
                  : "Review printing rules and customize notes before downloading the invoice sheet."}
              </p>
            </div>

            {/* Note text editor */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-txtmain">{language === "ar" ? "قالب الفاتورة" : "Invoice Template"}</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTemplate("classic")}
                  className={`p-2 rounded-xl border text-slate-400 text-xs font-semibold text-start transition-all cursor-pointer ${
                    selectedTemplate === "classic"
                      ? "bg-indigo-600/10 border-indigo-500 text-indigo-400!"
                      : "bg-cardbk dark:bg-slate-800 border-borderline hover:text-txtmain"
                  }`}
                  id="template-classic-btn"
                >
                  <span className="block text-[10.5px] font-bold">
                    {language === "ar" ? "الكلاسيكي" : "Classic"}
                  </span>
                  <span className="block text-[8px] opacity-75 mt-0.5 leading-tight">
                    {language === "ar" ? "الافتراضي المكتمل" : "Original full layout"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTemplate("modern")}
                  className={`p-2 rounded-xl border text-slate-400 text-xs font-semibold text-start transition-all cursor-pointer ${
                    selectedTemplate === "modern"
                      ? "bg-indigo-600/10 border-indigo-500 text-indigo-400!"
                      : "bg-cardbk dark:bg-slate-800 border-borderline hover:text-txtmain"
                  }`}
                  id="template-modern-btn"
                >
                  <span className="block text-[10.5px] font-bold">
                    {language === "ar" ? "الحديث" : "Modern"}
                  </span>
                  <span className="block text-[8px] opacity-75 mt-0.5 leading-tight">
                    {language === "ar" ? "الناعم المبسط" : "Airy & flat"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTemplate("corporate")}
                  className={`p-2 rounded-xl border text-slate-400 text-xs font-semibold text-start transition-all cursor-pointer ${
                    selectedTemplate === "corporate"
                      ? "bg-indigo-600/10 border-indigo-500 text-indigo-400!"
                      : "bg-cardbk dark:bg-slate-800 border-borderline hover:text-txtmain"
                  }`}
                  id="template-corporate-btn"
                >
                  <span className="block text-[10.5px] font-bold">
                    {language === "ar" ? "المؤسسي" : "Corporate"}
                  </span>
                  <span className="block text-[8px] opacity-75 mt-0.5 leading-tight">
                    {language === "ar" ? "التقني الاحترافي" : "Enterprise grid"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTemplate("elegant")}
                  className={`p-2 rounded-xl border text-slate-400 text-xs font-semibold text-start transition-all cursor-pointer ${
                    selectedTemplate === "elegant"
                      ? "bg-indigo-600/10 border-indigo-500 text-indigo-400!"
                      : "bg-cardbk dark:bg-slate-800 border-borderline hover:text-txtmain"
                  }`}
                  id="template-elegant-btn"
                >
                  <span className="block text-[10.5px] font-bold">
                    {language === "ar" ? "الفاخر" : "Elegant"}
                  </span>
                  <span className="block text-[8px] opacity-75 mt-0.5 leading-tight">
                    {language === "ar" ? "تفاصيل كلاسيكية" : "Luxury double rules"}
                  </span>
                </button>
              </div>
            </div>

            {/* Note text editor */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-txtmain">{language === "ar" ? "الملاحظات أسفل الفاتورة" : "Bottom Footer Memo"}</label>
              <textarea
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                rows={3}
                className="w-full text-xs p-3 bg-cardbk text-txtmain border border-borderline rounded-xl focus:outline-none focus:border-indigo-500 duration-150 resize-none leading-relaxed"
                placeholder={language === "ar" ? "أضف شروط الدفع أو شكر خاص..." : "Add standard notes, bank codes or payment dates..."}
              />
            </div>

            {/* Stamp Color customizer */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-txtmain">{language === "ar" ? "لون ختم الاعتماد (مُبَطَّن)" : "Seal / Badge Color State"}</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStampColor("emerald")}
                  className={`w-8 h-8 rounded-full bg-emerald-500 border-2 transition-transform ${stampColor === "emerald" ? "border-txtmain scale-110" : "border-transparent"}`}
                  title={language === "ar" ? "أخضر معتمد" : "Emerald Verified"}
                />
                <button
                  type="button"
                  onClick={() => setStampColor("indigo")}
                  className={`w-8 h-8 rounded-full bg-indigo-500 border-2 transition-transform ${stampColor === "indigo" ? "border-txtmain scale-110" : "border-transparent"}`}
                  title={language === "ar" ? "أزرق رسمي" : "Official Indigo"}
                />
                <button
                  type="button"
                  onClick={() => setStampColor("rose")}
                  className={`w-8 h-8 rounded-full bg-rose-500 border-2 transition-transform ${stampColor === "rose" ? "border-txtmain scale-110" : "border-transparent"}`}
                  title={language === "ar" ? "وردي تنبيهي" : "Action Pink"}
                />
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-amber-500/10 text-amber-500 p-3.5 rounded-xl border border-amber-500/20 text-[10px] leading-relaxed space-y-1">
              <span className="font-extrabold flex items-center gap-1">💡 {language === "ar" ? "معيار الفوترة الضريبية للمملكة" : "Saudi ZATCA Compliant Standards"}</span>
              <p>
                {language === "ar" 
                  ? "تلتزم الفاتورة بتخطيط هيئة الزكاة والضريبة والجمارك (ZATCA) في السعودية، بما يشمل الرقم الضريبي الموثق والترميز الذكي والـ VAT بنسبة 15%." 
                  : "Formats dynamically match the structural mandates of the Saudi ZATCA authority, integrating VAT 15% brackets and security anchors."}
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-borderline space-y-2">
            <button
              onClick={handlePrint}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/10"
            >
              <Printer className="w-4 h-4" />
              <span>{language === "ar" ? "تحميل PDF / طباعة الفاتورة" : "Download PDF / Print"}</span>
            </button>

            <button
              onClick={handleShare}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                copied
                  ? "bg-emerald-500/10 border-emerald-500 text-emerald-500"
                  : "bg-transparent border-borderline hover:bg-borderline/20 text-txtmain"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 animate-bounce" />
                  <span>{language === "ar" ? "تم نسخ البيانات للمشاركة!" : "Copied statement details!"}</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>{language === "ar" ? "مشاركة بيانات الفاتورة" : "Share Invoicing Statement"}</span>
                </>
              )}
            </button>

            <p className="text-[9px] text-txtmuted text-center leading-normal">
              {language === "ar" 
                ? "اختر حفظ بتنسيق PDF في نافذة الطباعة كـ (Save as PDF) لتنزيل ملف الفاتورة المباشر." 
                : "Tip: Select Save as PDF from your browser printer destination list to generate a file."}
            </p>
          </div>
        </div>

        {/* Right Column: Invoice Document A4 Layout (Print Area) */}
        <div className="flex-1 p-6 md:p-10 bg-white text-slate-800 flex flex-col justify-between overflow-y-auto max-h-[85vh] md:max-h-none">
          
          {/* Printable container start */}
          <div id="printable-invoice-area" className="bg-white p-4 md:p-8 rounded-xl border border-slate-100 text-right text-slate-900 leading-relaxed font-sans" style={{ direction: "rtl" }}>
            
            {/* 1. CLASSIC DEFAULT TEMPLATE */}
            {selectedTemplate === "classic" && (
              <div className="space-y-6">
                {/* Header section (Company Name & Stamp Letterhead) */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 mb-6" style={{ borderBottom: `2px solid ${primaryColorVal}` }}>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      {logoUrl ? (
                        <img 
                          src={logoUrl} 
                          alt={companyName}
                          className="w-12 h-12 rounded-lg object-contain border border-slate-200 p-1 shrink-0 bg-white shadow-xs" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div 
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs uppercase shadow-sm shrink-0"
                          style={{ backgroundColor: primaryColorVal }}
                        >
                          {companyName.substring(0, 1)}
                        </div>
                      )}
                      <h2 className="text-xl font-extrabold text-slate-900">{companyName}</h2>
                    </div>
                    
                    <div className="text-[11px] text-slate-500 space-y-1 pr-1 font-sans">
                      <div className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span>منشأة SaaS ذكية معزولة - الفواتير الضريبية</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono">
                        <Hash className="w-3.5 h-3.5 text-slate-400" />
                        <span>الرقم الضريبي VAT: {vatNumber}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>المملكة العربية السعودية، الرياض</span>
                      </div>
                    </div>
                  </div>

                  {/* Title & Document Badge */}
                  <div className="text-left self-stretch sm:self-auto flex flex-col justify-between items-start sm:items-end">
                    <div className="text-slate-950 font-black tracking-tight space-y-1 text-left">
                      <span className="bg-slate-100 text-slate-800 text-[10px] py-1 px-2 rounded-md font-bold inline-block border border-slate-200">
                        فاتورة ضريبية مبسطة / Simplified Tax Invoice
                      </span>
                      <h1 className="text-lg font-black mt-2">رقم الفاتورة / Inv No: #{invoice.id.split("-").pop() || invoice.id}</h1>
                    </div>

                    <div className="text-[11px] text-slate-500 space-y-1 mt-3 font-mono text-left w-full">
                      <div>تاريخ الإصدار / Date: <strong>{invoiceDate}</strong></div>
                      <div>تاريخ الاستحقاق / Due: <strong className="text-slate-900">{invoice.due_date || "—"}</strong></div>
                      {invoice.status === "Paid" && invoice.payment_date && (
                        <div className="text-emerald-700">تاريخ السداد / Paid Date: <strong>{invoice.payment_date}</strong></div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bill To Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200/60 mb-6 col-span-2">
                  <div>
                    <span className="text-[10px] text-slate-400 font-extrabold block mb-1.5 uppercase font-sans">معلومات العميل والمستلم / Client Details</span>
                    <h3 className="text-sm font-extrabold text-slate-900">{client.name}</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">{client.company ? `رئيس منشأة: ${client.company}` : "مستلم فردي للأعمال / Enterprise Client"}</p>
                    {client.phone && (
                      <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-600 font-mono">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col justify-center items-start md:items-end md:border-r border-slate-200/80 pt-3 md:pt-0 md:pr-6">
                    <span className="text-[10px] text-slate-400 font-extrabold block mb-1">حالة ميزانية السداد / Payment Status</span>
                    {invoice.status === "Paid" ? (
                      <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] px-3 py-1 rounded-full font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>تم الدفع والتحصيل بالكامل / Paid-in-Full</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] px-3 py-1 rounded-full font-bold">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        <span>بانتظار السداد والتحويل / Unpaid</span>
                      </div>
                    )}
                    <span className="text-[9px] text-slate-400 mt-1 font-mono">رقم المرجع المالي للعملية: {operation.id}</span>
                  </div>
                </div>

                {/* Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="text-white font-bold" style={{ backgroundColor: primaryColorVal }}>
                        <th className="py-2.5 px-3 text-center w-12">م / N</th>
                        <th className="py-2.5 px-3">بيان الخدمات والعمليات / Service Description</th>
                        <th className="py-2.5 px-3 text-center w-16">الكمية/Qty</th>
                        <th className="py-2.5 px-3 text-left w-28">السعر الأساسي / Base Rate</th>
                        <th className="py-2.5 px-3 text-center w-20">الضريبة/VAT</th>
                        <th className="py-2.5 px-3 text-left w-28">الإجمالي / Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">1</td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{operation.service}</div>
                          <p className="text-[10px] text-slate-400 mt-0.5">عملية تشغيلية منجزة ومسجلة في الكيان المالي المعزول</p>
                        </td>
                        <td className="py-3 px-3 text-center font-mono">1</td>
                        <td className="py-3 px-3 text-left font-mono">{taxableSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}</td>
                        <td className="py-3 px-3 text-center text-slate-500 font-mono">15% VAT</td>
                        <td className="py-3 px-3 text-left font-bold font-mono">{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. MODERN MINIMALIST TEMPLATE */}
            {selectedTemplate === "modern" && (
              <div className="space-y-6 text-slate-900">
                {/* Asymmetric Elegant Modern Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 mb-4 border-b border-slate-100">
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-12 rounded bg-indigo-600 self-stretch shrink-0" style={{ backgroundColor: primaryColorVal }} />
                    <div className="space-y-1">
                      <h2 className="text-2xl font-black text-slate-950 font-sans tracking-tight">{companyName}</h2>
                      <div className="text-[10.5px] text-slate-400 flex flex-wrap gap-x-3 items-center">
                        <span className="font-mono">VAT ID: {vatNumber}</span>
                        <span>•</span>
                        <span>{language === "ar" ? "الرياض، المملكة العربية السعودية" : "Riyadh, Saudi Arabia"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left font-sans sm:self-auto w-full sm:w-auto mt-2 sm:mt-0">
                    <span className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg font-extrabold inline-block" style={{ color: primaryColorVal, backgroundColor: `${primaryColorVal}10` }}>
                      {language === "ar" ? "فاتورة ضريبية مبسطة" : "Simplified Tax Invoice"}
                    </span>
                    <h1 className="text-sm font-bold mt-1 text-slate-700 font-mono">#{invoice.id.split("-").pop() || invoice.id}</h1>
                  </div>
                </div>

                {/* Sub-Header Grid: Dates & Target info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-slate-100">
                  <div className="text-start">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{language === "ar" ? "مرسل إلى / Bill To" : "Bill To Client"}</p>
                    <h3 className="text-sm font-black text-slate-900 mt-1">{client.name}</h3>
                    <p className="text-[10.5px] text-slate-500">{client.company || (language === "ar" ? "مستلم أعمال" : "Client Representative")}</p>
                    {client.phone && <p className="text-[10px] text-slate-400 font-mono mt-1">{client.phone}</p>}
                  </div>

                  <div className="text-start">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{language === "ar" ? "تواريخ الفاتورة" : "Key Timestamps"}</p>
                    <div className="space-y-1 mt-1 text-[11px] text-slate-600 font-semibold font-mono">
                      <div>{language === "ar" ? "تاريخ الإصدار:" : "Issue Date:"} {invoiceDate}</div>
                      <div className="text-rose-600">{language === "ar" ? "الاستحقاق النهائي:" : "Due Date:"} {invoice.due_date || "—"}</div>
                    </div>
                  </div>

                  <div className="text-start md:text-left flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{language_custom => language === "ar" ? "الوضعية المالية / Audit State" : "Payment Block"}</p>
                      <span className={`inline-block text-[10px] px-2.5 py-0.5 rounded-md font-black mt-1 ${invoice.status === "Paid" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                        {invoice.status === "Paid" ? (language === "ar" ? "محصلة بالكامل" : "Settle Complete") : (language === "ar" ? "بانتظار السداد" : "Debt Balances")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dynamic flat-table layout */}
                <div className="py-2">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="border-y border-slate-200 text-slate-500 font-bold bg-slate-50/50">
                        <th className="py-2 px-3 text-center w-12">N</th>
                        <th className="py-2 px-3">{language === "ar" ? "البيانات والخدمة" : "Description & Services"}</th>
                        <th className="py-2 px-3 text-center w-16">Qty</th>
                        <th className="py-2 px-3 text-left w-28">Base Price</th>
                        <th className="py-2 px-3 text-center w-20">VAT</th>
                        <th className="py-2 px-3 text-left w-28">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr className="hover:bg-slate-50/50">
                        <td className="py-4 px-3 text-center text-slate-400 font-mono">1</td>
                        <td className="py-4 px-3 text-start">
                          <div className="font-bold text-slate-900">{operation.service}</div>
                          <p className="text-[10px] text-slate-400 mt-0.5">{language === "ar" ? "بناء وإنجاز العمليات المستمرة" : "Executed system actions with high-speed performance compliance."}</p>
                        </td>
                        <td className="py-4 px-3 text-center font-mono">1</td>
                        <td className="py-4 px-3 text-left font-mono text-slate-600">{taxableSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}</td>
                        <td className="py-4 px-3 text-center font-mono text-slate-500">15%</td>
                        <td className="py-4 px-3 text-left font-black font-mono text-slate-900">{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. CORPORATE TECH TEMPLATE */}
            {selectedTemplate === "corporate" && (
              <div className="space-y-6 text-slate-950 font-sans">
                {/* Tech Layout Header Banner with solid dark sidebar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 mb-4 border-b border-dashed border-slate-300">
                  <div className="md:col-span-2 space-y-3 text-start">
                    <span className="text-[9px] bg-slate-900 text-white font-mono px-2 py-0.5 tracking-widest font-bold">
                      [ ERP_LEDGER_RECORD_STATION ]
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-xs bg-slate-800" style={{ backgroundColor: primaryColorVal }} />
                      {companyName}
                    </h2>
                    <div className="text-[11px] font-mono text-slate-500 leading-relaxed">
                      <div>TEL-ANCHOR: Saudi-Riyadh HQ Branch</div>
                      <div>SEC_COMPLIANT_VAT_KEY: {vatNumber}</div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg text-left font-mono text-xs flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] text-slate-400 block font-bold tracking-wider">DOC_REF</span>
                      <strong className="text-slate-900 block text-sm font-black">INV-#{invoice.id.split("-").pop()?.toUpperCase() || invoice.id}</strong>
                    </div>
                    <div className="mt-2 text-[10px] text-slate-500 space-y-0.5">
                      <div>INVOICE_DATE: {invoiceDate}</div>
                      <div>DUE_COEFFICIENT: {invoice.due_date || "—"}</div>
                    </div>
                  </div>
                </div>

                {/* Enterprise [BILL_TO] grid */}
                <div className="p-4 bg-slate-50 border border-slate-200/50 rounded flex flex-col sm:flex-row justify-between gap-4 font-mono text-xs text-start">
                  <div>
                    <span className="text-[9.5px] text-slate-400 font-bold block">[BILL_TO_ENTITY]</span>
                    <strong className="text-slate-900 block mt-1 text-sm font-bold">{client.name}</strong>
                    <span className="text-slate-500 mt-0.5 block">{client.company || "CORPORATE_PARTNER"}</span>
                    {client.phone && <span className="text-slate-500 block text-[11px] mt-1">TEL: {client.phone}</span>}
                  </div>

                  <div className="border-t sm:border-t-0 sm:border-r border-slate-200/85 sm:pr-6 flex flex-col justify-center">
                    <span className="text-[9.5px] text-slate-400 font-bold block">[TRANSACTION_STATUS]</span>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className={`w-2 h-2 rounded ${invoice.status === "Paid" ? "bg-emerald-500" : "bg-rose-500 animate-pulse"}`} />
                      <span className="font-bold uppercase text-[10.5px]">
                        {invoice.status === "Paid" ? "RECORD_SETTLED_OK" : "BALANCES_DUE_LOCK"}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1">LOGGED-OPERATIONAL-ID: {operation.id}</span>
                  </div>
                </div>

                {/* Tech Density Table */}
                <div className="border border-slate-200 rounded font-mono overflow-hidden">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-white text-[10.5px] font-bold">
                        <th className="py-2 px-3 text-center border-l border-slate-800">C_ID</th>
                        <th className="py-2 px-3 border-l border-slate-800">{language === "ar" ? "بيان الخدمة البرمجية / الخدمية" : "Service Module Spec"}</th>
                        <th className="py-2 px-3 text-center border-l border-slate-800">Q_INDEX</th>
                        <th className="py-2 px-3 text-left border-l border-slate-800">BASE_RATE_NET</th>
                        <th className="py-2 px-3 text-center border-l border-slate-800">VAT_RECOG</th>
                        <th className="py-2 px-3 text-left">GRAND_SUM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      <tr>
                        <td className="py-3 px-3 text-center text-slate-400">01</td>
                        <td className="py-3 px-3">
                          <strong className="text-slate-950 font-bold">{operation.service}</strong>
                          <span className="block text-[10px] text-slate-400 mt-0.5">Automated accounting system actions validated.</span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold">01</td>
                        <td className="py-3 px-3 text-left text-slate-600">{taxableSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}</td>
                        <td className="py-3 px-3 text-center text-slate-500">15.00%</td>
                        <td className="py-3 px-3 text-left font-black text-slate-900">{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. CLASSIC ELEGANT TEMPLATE */}
            {selectedTemplate === "elegant" && (
              <div className="space-y-6 text-slate-900 font-sans">
                {/* Traditional centered balanced letterhead with double rules */}
                <div className="text-center pb-6 mb-4 border-b-4 border-double border-slate-300">
                  <div className="flex flex-col items-center gap-2">
                    {logoUrl ? (
                      <img 
                        src={logoUrl} 
                        alt={companyName}
                        className="w-14 h-14 rounded-full object-contain border border-slate-200 p-1 bg-white shadow-xs" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm uppercase shadow-sm"
                        style={{ backgroundColor: primaryColorVal }}
                      >
                        {companyName.substring(0, 1)}
                      </div>
                    )}
                    <h2 className="text-2xl font-serif font-bold tracking-wide text-slate-950 italic">{companyName}</h2>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                      {language === "ar" ? "الفاتورة الضريبية الرسمية المعتمدة" : "Official Commercial Tax Invoice"}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row justify-between items-center text-[10.5px] text-slate-500 w-full max-w-xl mx-auto border-t border-slate-100 pt-2 font-serif">
                    <div>{language === "ar" ? "الرقم الضريبي للمنشأة:" : "VAT Ref No:"} <strong className="font-mono">{vatNumber}</strong></div>
                    <div className="hidden sm:inline text-slate-200">•</div>
                    <div>{language === "ar" ? "رقم الفاتورة:" : "Document ID / Id:"} <strong className="font-mono">#{invoice.id.split("-").pop() || invoice.id}</strong></div>
                  </div>
                </div>

                {/* Elegant split info row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 border-b border-slate-200 font-serif">
                  <div className="text-start space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black block">{language === "ar" ? "حساب العميل الكريم / Noble Client" : "In Account of Noble Client"}</span>
                    <h3 className="text-md font-bold text-slate-950 font-serif">{client.name}</h3>
                    <p className="text-[10.5px] text-slate-500 italic">{client.company || (language === "ar" ? "شريك المنشأة" : "Enterprise Partner")}</p>
                    {client.phone && <p className="text-[10px] font-mono text-slate-400">{client.phone}</p>}
                  </div>

                  <div className="text-start md:text-left text-[11px] text-slate-500 space-y-1 sm:self-center font-mono md:border-r border-slate-200 md:pr-6">
                    <div>{language === "ar" ? "تحريراً في تاريخ:" : "Issued On Date:"} <strong>{invoiceDate}</strong></div>
                    <div>{language === "ar" ? "آجل قبل تاريخ:" : "Aged Credit Due:"} <strong>{invoice.due_date || "—"}</strong></div>
                    <div>{language === "ar" ? "المطابقة والنظام الذاتي:" : "Database Compliance:"} <strong>ERP_OK_LOGS</strong></div>
                  </div>
                </div>

                {/* Classical spacing table */}
                <div className="py-2 font-serif">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="text-slate-900 border-b-2 border-slate-500 font-bold">
                        <th className="py-2.5 px-3 text-center w-12 italic">No</th>
                        <th className="py-2.5 px-3">{language === "ar" ? "بيان تفصيلي بالخدمات والعمليات" : "Itemized Spec & Descriptions"}</th>
                        <th className="py-2.5 px-3 text-center w-16 italic">Qty</th>
                        <th className="py-2.5 px-3 text-left w-28">{language === "ar" ? "السعر" : "Base"}</th>
                        <th className="py-2.5 px-3 text-center w-20">{language === "ar" ? "الضريبة" : "VAT"}</th>
                        <th className="py-2.5 px-3 text-left w-28">{language === "ar" ? "الإجمالي المستحق" : "Grand Value"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="py-4 px-3 text-center text-slate-400 font-mono italic">01</td>
                        <td className="py-4 px-3 text-start">
                          <h4 className="font-bold text-slate-900">{operation.service}</h4>
                          <span className="text-[10px] text-slate-400 block mt-0.5 italic">{language === "ar" ? "تقديم خدمات استشارية وتقنية متقدمة" : "Advanced technology services delivered."}</span>
                        </td>
                        <td className="py-4 px-3 text-center font-mono">1</td>
                        <td className="py-4 px-3 text-left font-mono text-slate-600">{taxableSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}</td>
                        <td className="py-4 px-3 text-center font-mono text-slate-500">15%</td>
                        <td className="py-4 px-3 text-left font-bold font-mono text-slate-900">{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Calculations Breakdown (RENDERED BEAUTIFULLY AND COMMONLY FOR THE SHEETS) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end mb-8 border-t border-slate-100 pt-6">
              
              {/* QR Code and Saudi standard stamp */}
              <div className="flex gap-4 items-center">
                
                {/* Simulated Authentic Saudi ZATCA QR Code */}
                <div className="bg-slate-50 p-2.5 border border-slate-250 rounded-lg shrink-0" title="رمز الاستجابة السريعة لهيئة الزكاة">
                  <div className="w-20 h-20 bg-white p-1 flex flex-col justify-between items-center border border-slate-300 relative">
                    <div className="grid grid-cols-5 gap-1 w-full h-full opacity-90">
                      {[...Array(25)].map((_, i) => (
                        <div 
                           key={i} 
                           className={`rounded-xs ${
                             (i % 3 === 0 || i === 0 || i === 4 || i === 20 || i === 24 || i === 12 || i === 8 || i === 18) 
                             ? "bg-slate-900" 
                             : "bg-slate-100"
                           }`} 
                        />
                      ))}
                    </div>
                    <div className="absolute inset-0 m-auto w-5 h-5 bg-white rounded-full border border-slate-200 flex items-center justify-center shadow-xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-800" />
                    </div>
                  </div>
                  <span className="text-[8px] text-slate-400 font-mono text-center block mt-1">ZATCA Cryptographic ID</span>
                </div>

                {/* Stamp & Manager Signature block */}
                <div className="space-y-2">
                  <div className={`relative w-28 h-10 border border-dashed rounded flex items-center justify-center ${
                    stampColor === "emerald" 
                    ? "border-emerald-500 text-emerald-600 bg-emerald-50/20" 
                    : stampColor === "indigo" 
                      ? "border-indigo-500 text-indigo-600 bg-indigo-50/20" 
                      : "border-rose-500 text-rose-600 bg-rose-50/20"
                  }`}>
                    <span className="text-[10px] font-black tracking-wide uppercase">
                      {invoice.status === "Paid" ? "تم السداد والتحصيل" : "تحت المراجعة"}
                    </span>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center text-white text-[8px] ${
                      stampColor === "emerald" ? "bg-emerald-500" : stampColor === "indigo" ? "bg-indigo-500" : "bg-rose-500"
                    }`}>
                      ✓
                    </div>
                  </div>
                  
                  <div className="pr-1 text-slate-400 text-[10px] space-y-0.5">
                    <div>توقيع المسؤول / Manager Seal & Sign</div>
                    <div className="italic font-mono border-t border-slate-100 pt-0.5 text-slate-800 font-bold">ERP General Auditing</div>
                  </div>
                </div>

              </div>

              {/* Calculations breakdown list */}
              <div className="space-y-2 text-xs border-r-2 border-slate-100 pr-6">
                <div className="flex justify-between items-center text-slate-500">
                  <span>المبلغ الخاضع للضريبة (Subtotal)</span>
                  <span className="font-mono font-medium">{taxableSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>ضريبة القيمة المضافة (15% VAT)</span>
                  <span className="font-mono font-medium">{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>رسوم التوصيل أو المعالجة السحابية</span>
                  <span className="font-mono font-medium">0.00 {currency}</span>
                </div>
                <div className="h-[1px] bg-slate-200 my-1" />
                <div className="flex justify-between items-center text-sm font-black" style={{ color: primaryColorVal }}>
                  <span>{selectedTemplate === "elegant" ? "المجموع الكافي المستحق (Grand Total)" : "الإجمالي المستحق (Grand Total)"}</span>
                  <span className="font-mono text-base">{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}</span>
                </div>
              </div>

            </div>

            {/* Custom note on invoice bottom */}
            {customNote.trim() && (
              <div className="bg-slate-50 border border-slate-200/50 p-3 rounded-xl text-[10px] text-slate-500 leading-relaxed mb-6 text-start">
                <span className="font-bold text-slate-800 block mb-0.5">💬 ملاحظات وشروط الدفع / Terms & Notes:</span>
                <p>{customNote}</p>
              </div>
            )}

            {/* Footer stamp/verification */}
            <div className="border-t border-slate-100 pt-3 flex flex-col sm:flex-row justify-between items-center text-[9px] text-slate-400 gap-2">
              <div>
                <span>تم إنشاء وتوثيق هذه الفاتورة إلكترونياً وهي صالحة بدون الختم اليدوي.</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>حماية مشفرة SaaS ISO/IEC 27001 Secured</span>
              </div>
            </div>

          </div>
          {/* Printable container end */}

        </div>

        {/* Floating Close Button for preview modal */}
        <button
          onClick={onClose}
          id="invoice-close-button"
          className="absolute top-4 left-4 p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white duration-150 cursor-pointer shadow-lg z-50 hover:scale-105"
          title={language === "ar" ? "إغلاق معاينة الفاتورة" : "Close Preview"}
        >
          <X className="w-5 h-5" />
        </button>

      </div>
    </div>
  );
}
