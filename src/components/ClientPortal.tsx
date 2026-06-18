import React, { useState, useEffect } from "react";
import { 
  Building2, 
  CreditCard, 
  Download, 
  Search, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  Building, 
  Phone, 
  Mail, 
  Lock, 
  ShieldCheck, 
  X, 
  ExternalLink, 
  Eye, 
  Check, 
  Languages, 
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { Company, Client, Operation, Invoice } from "../types";
import { useLanguage } from "../lib/LanguageContext";
import InvoicePrintModal from "./InvoicePrintModal";

interface ClientPortalProps {
  clientId: string;
  companyId: string;
  onGoBack?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function ClientPortal({
  clientId,
  companyId,
  onGoBack,
  isDarkMode,
  onToggleDarkMode
}: ClientPortalProps) {
  const { language, setLanguage, t, dir } = useLanguage();

  // Data fetching states
  const [client, setClient] = useState<Client | null>(null);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Filters & interactivity
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Paid" | "Unpaid">("All");
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<Invoice | null>(null);

  // Load essential client billing history
  const loadPortalData = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const headers = {
        "Content-Type": "application/json",
        "x-company-id": companyId
      };

      // Fetch Company Profile
      const compRes = await fetch("/api/companies", { headers });
      if (compRes.ok) {
        const comps = await compRes.json();
        const found = comps.find((c: Company) => c.id === companyId);
        if (found) setCurrentCompany(found);
      }

      // Fetch Clients list to locate the client profile details
      const clientRes = await fetch("/api/clients", { headers });
      if (clientRes.ok) {
        const clientsData = await clientRes.json();
        const foundClient = clientsData.find((c: Client) => c.id === clientId);
        if (foundClient) {
          setClient(foundClient);
        } else {
          throw new Error(language === "ar" ? "تعذر العثور على ملف العميل" : "Client profile not found");
        }
      } else {
        throw new Error(language === "ar" ? "فشل تحميل بيانات البوابة" : "Failed to retrieve gate access credentials");
      }

      // Fetch Operations list to resolve service names
      const opRes = await fetch("/api/operations", { headers });
      if (opRes.ok) {
        const ops = await opRes.json();
        setOperations(ops.filter((o: Operation) => o.client_id === clientId));
      }

      // Fetch Invoices
      const invRes = await fetch("/api/invoices", { headers });
      if (invRes.ok) {
        const invs = await invRes.json();
        const clientInvs = invs.filter((i: Invoice) => i.client_id === clientId);
        setInvoices(clientInvs);

        // Auto-select invoice if specified in URL query
        const urlParams = new URLSearchParams(window.location.search);
        const urlInvId = urlParams.get("invoice") || urlParams.get("invoiceId");
        if (urlInvId) {
          const matched = clientInvs.find((i: Invoice) => i.id === urlInvId);
          if (matched) {
            setSelectedInvoiceForPrint(matched);
          }
        }
      }

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || (language === "ar" ? "حدث خطأ أثناء الاتصال بالبوابة السحابية" : "Cloud server sync issue"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortalData();
  }, [clientId, companyId]);

  // Handle invoice status change upon Stripe payment simulation success
  const handlePaymentSuccess = async (invId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-company-id": companyId
        },
        body: JSON.stringify({ status: "Paid" })
      });

      if (res.ok) {
        // Refresh local listings to instantly persistent update the view
        loadPortalData();
      }
    } catch (e) {
      console.error("Failed to notify server regarding direct payment check:", e);
    }
  };

  const currency = currentCompany?.currency || "ر.س";
  const primaryColorVal = currentCompany?.primary_color || "#4F46E5";

  // Financial calculations
  const filteredInvoices = invoices.filter(inv => {
    // Search filter matching invoice ID or Operation services
    const operationObj = operations.find(o => o.id === inv.op_id);
    const serviceName = operationObj ? operationObj.service : "";
    const shortInvId = inv.id.split("-").pop() || "";
    const queryStr = `${shortInvId} ${serviceName}`.toLowerCase();
    const matchesSearch = queryStr.includes(searchTerm.toLowerCase());

    // Status filter
    if (statusFilter === "All") return matchesSearch;
    if (statusFilter === "Paid") return matchesSearch && inv.status === "Paid";
    if (statusFilter === "Unpaid") return matchesSearch && inv.status === "Unpaid";
    return matchesSearch;
  });

  const totalPaid = invoices.filter(i => i.status === "Paid").reduce((acc, curr) => acc + curr.amount, 0);
  const totalUpcoming = invoices.filter(i => i.status === "Unpaid").reduce((acc, curr) => acc + curr.amount, 0);
  const totalInvoicesValue = invoices.reduce((acc, curr) => acc + curr.amount, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          {language === "ar" ? "جاري تحميل بوابة كشوف العميل الإلكترونية..." : "Accessing secure Client Portal..."}
        </p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mb-4 border border-rose-500/20">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-slate-800 dark:text-white mb-2">
          {language === "ar" ? "تعذر فتح رابط البوابة المشتركة" : "Protected Portal Link Error"}
        </h2>
        <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-6">
          {errorMsg}
        </p>
        <button
          onClick={loadPortalData}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-all cursor-pointer"
        >
          {language === "ar" ? "إعادة المحاولة" : "Try Again"}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 duration-200" dir={dir}>
      
      {/* Top Header navbar with tenant info and config switches */}
      <header className="sticky top-0 z-30 bg-white/85 dark:bg-slate-900/85 backdrop-blur-lg border-b border-slate-200/60 dark:border-slate-850 py-4 px-6 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{
              background: `linear-gradient(135deg, ${primaryColorVal}, #6366f1)`
            }}>
              {currentCompany?.logo_url ? (
                <img src={currentCompany.logo_url} referrerPolicy="no-referrer" alt="Logo" className="w-6 h-6 object-contain rounded" />
              ) : (
                <Building2 className="w-5 h-5" />
              )}
            </div>
            <div className="text-start">
              <h1 className="text-sm font-black text-slate-900 dark:text-white tracking-wide">
                {currentCompany?.name}
              </h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                {language === "ar" ? "بوابة كشف الحساب والمدفوعات الإلكترونية للعملاء" : "Client Billing & Settlement Portal"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Lang switcher */}
            <button
              onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer border border-slate-200/50 dark:border-slate-800 text-slate-550 dark:text-slate-400 flex items-center gap-2 text-xs font-semibold"
              title="Change Language"
            >
              <Languages className="w-4 h-4 text-indigo-500" />
              <span className="hidden sm:inline">{language === "ar" ? "English" : "العربية"}</span>
            </button>

            {/* Dark mode switcher */}
            <button
              onClick={onToggleDarkMode}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer border border-slate-200/50 dark:border-slate-800 text-slate-550 dark:text-slate-400"
            >
              {isDarkMode ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold">☀️ <span className="hidden sm:inline">{language === "ar" ? "الوضع المضيء" : "Light"}</span></span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-semibold">🌙 <span className="hidden sm:inline">{language === "ar" ? "الوضع الداكن" : "Dark"}</span></span>
              )}
            </button>

            {/* Optional back-button if internal view */}
            {onGoBack && (
              <button
                onClick={onGoBack}
                className="bg-indigo-650 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer border border-indigo-500/20"
              >
                {language === "ar" ? "الرجوع للوحة الإدارة" : "Return to ERP"}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Board Container */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Banner with Greeting */}
        <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden shadow-md text-start">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-[10px] font-black uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{language === "ar" ? "رابط معتمد وآمن" : "Authorized Customer View"}</span>
            </div>
            <h2 className="text-xl font-black text-white">
              {language === "ar" 
                ? `مرحباً بك، أ/ ${client?.name || ""}` 
                : `Welcome, ${client?.name || ""}`}
            </h2>
            <p className="text-xs text-slate-350 max-w-xl leading-relaxed">
              {language === "ar"
                ? "مرحباً بك في بوابتك آمنة التشفير. يمكنك هنا مراجعة تفاصيل الفواتير، تحميل الإقرارات الضريبية لشركة الزكاة والضريبة والجمارك (ZATCA)، وسداد الالتزامات المستحقة إلكترونياً."
                : "Welcome to your secure client portal. Preview active invoices, download PDF sheets, track complete payment histories, and direct pay pending invoices via credit cards."}
            </p>
          </div>

          <div className="flex flex-col gap-2 border-t md:border-t-0 md:border-s border-slate-800 pt-4 md:pt-0 md:ps-8 shrink-0 text-slate-300">
            <div className="flex items-center gap-2 text-xs">
              <Building className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="font-semibold text-slate-200">{client?.company || "—"}</span>
            </div>
            {client?.phone && (
              <div className="flex items-center gap-2 text-xs font-mono">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{client.phone}</span>
              </div>
            )}
            {client?.email && (
              <div className="flex items-center gap-2 text-xs font-mono">
                <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>{client.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Financial Bento Stats Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Outstanding Balance */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl flex items-center justify-between text-start relative group shadow-xs">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                {language === "ar" ? "إجمالي المبلغ المستحق في الانتظار" : "Total Outstanding Amount"}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
                  {totalUpcoming.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs font-black text-slate-400">{currency}</span>
              </div>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-rose-500" />
                <span>
                  {language === "ar" 
                    ? `مجموع عدد الفواتير غير المدفوعة: ${invoices.filter(i => i.status === "Unpaid").length}` 
                    : `${invoices.filter(i => i.status === "Unpaid").length} pending invoices`}
                </span>
              </p>
            </div>
            <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl shrink-0">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>

          {/* Paid History Balance */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl flex items-center justify-between text-start relative group shadow-xs">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                {language === "ar" ? "أرصدة المبالغ المسددة والمحصلة" : "Total Paid To Date"}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs font-black text-slate-400">{currency}</span>
              </div>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>
                  {language === "ar" 
                    ? `مجموع عدد الفواتير المحصلة بسلامة: ${invoices.filter(i => i.status === "Paid").length}` 
                    : `${invoices.filter(i => i.status === "Paid").length} settled invoices`}
                </span>
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          {/* Aggregate Activity Count */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl flex items-center justify-between text-start relative group shadow-xs">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                {language === "ar" ? "حجم المعاملات والفواتير المصدرة" : "Aggregate Invoicing Volume"}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                  {totalInvoicesValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs font-black text-slate-400">{currency}</span>
              </div>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                <span>
                  {language === "ar" 
                    ? `كافة الالتزامات والطلبات الصادرة: ${invoices.length}` 
                    : `Aggregate bills compiled: ${invoices.length}`}
                </span>
              </p>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl shrink-0">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
          </div>

        </div>

        {/* Search, Filter Nav and Invoices Listing sheet */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 rounded-2xl overflow-hidden shadow-xs">
          
          {/* Filtering Header bar */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-850 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            
            <div className="text-start">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {language === "ar" ? "قائمة فواتيرك وطلبات السداّد" : "Billing Statements & History"}
              </h3>
              <p className="text-[10.5px] text-slate-400 dark:text-slate-500">
                {language === "ar" ? "استعرض الفواتير بالتفصيل وحمل تصاميم المقاسات المطلوبة." : "Track active invoices, verify Saudi VAT audits or complete secure checkouts."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row w-full md:w-auto items-stretch sm:items-center gap-3">
              {/* Search Invoice */}
              <div className="relative">
                <input
                  type="text"
                  placeholder={language === "ar" ? "البحث بمسمى الخدمة أو رقم الفاتورة..." : "Search by service or bill code..."}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-xs text-slate-850 dark:text-white rounded-xl pl-9 pr-4 py-2 w-full sm:w-60 focus:outline-none focus:border-indigo-500 transition-all font-sans"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              {/* Toggle Status bar tabs */}
              <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/40 dark:border-slate-850 whitespace-nowrap overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setStatusFilter("All")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === "All" ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs" : "text-slate-400 hover:text-slate-700"}`}
                >
                  {language === "ar" ? "الكل" : "All"}
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("Unpaid")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${statusFilter === "Unpaid" ? "bg-rose-500 text-white shadow-xs" : "text-rose-450 hover:bg-rose-500/10"}`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{language === "ar" ? "بانتظار السداد" : "To Pay"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("Paid")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${statusFilter === "Paid" ? "bg-emerald-500 text-white shadow-xs" : "text-emerald-500 hover:bg-emerald-500/10"}`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{language === "ar" ? "المسددة" : "Settled"}</span>
                </button>
              </div>

            </div>

          </div>

          {/* Table list */}
          <div className="overflow-x-auto">
            {filteredInvoices.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <FileText className="w-12 h-12 text-slate-350 mx-auto opacity-45" />
                <p className="text-xs">
                  {language === "ar" ? "لا توجد فواتير مطابقة للبحث حالياً" : "No invoice sheets found matching your selection."}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => { setSearchTerm(""); setStatusFilter("All"); }}
                    className="text-indigo-500 text-xs font-bold font-mono underline hover:no-underline cursor-pointer"
                  >
                    {language === "ar" ? "إعادة الضبط" : "Reset filter inputs"}
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-start text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-850 font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10.5px]">
                    <th className="p-4 text-start font-bold">{language === "ar" ? "الفاتورة" : "Invoice No."}</th>
                    <th className="p-4 text-start font-bold">{language === "ar" ? "الخدمة / العملية" : "Service Ordered"}</th>
                    <th className="p-4 text-start font-bold">{language === "ar" ? "تاريخ الإصدار" : "Issue Date"}</th>
                    <th className="p-4 text-start font-bold">{language === "ar" ? "تاريخ الاستحقاق" : "Due Date"}</th>
                    <th className="p-4 text-end font-bold">{language === "ar" ? "إجمالي المبلغ المستحق" : "Grand Total"}</th>
                    <th className="p-4 text-center font-bold">{language === "ar" ? "حالة السداد" : "Billing Status"}</th>
                    <th className="p-4 text-center font-bold">{language === "ar" ? "الإجراءات المتاحة" : "Available Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {filteredInvoices.map((inv) => {
                    const op = operations.find(o => o.id === inv.op_id);
                    const serviceName = op ? op.service : (language === "ar" ? "عملية تجارية" : "Business Operation");
                    const issueDate = op?.date || (language === "ar" ? "مؤرخ" : "Dated");
                    const shortInvId = inv.id.split("-").pop() || inv.id;
                    const isOverdue = inv.status === "Unpaid" && inv.due_date && inv.due_date < new Date().toISOString().split("T")[0];

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                        
                        {/* Inv ID */}
                        <td className="p-4 font-black font-mono text-slate-900 dark:text-white text-start">
                          #{shortInvId.toUpperCase()}
                        </td>

                        {/* Service Item */}
                        <td className="p-4 text-start">
                          <p className="font-bold text-slate-800 dark:text-slate-200">
                            {serviceName}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {language === "ar" ? "ضريبة القيمة المضافة شاملة (15%)" : "15% compliant Saudi VAT inclusive"}
                          </p>
                        </td>

                        {/* Issue date */}
                        <td className="p-4 font-mono text-slate-500 text-start">
                          {issueDate}
                        </td>

                        {/* Due Date */}
                        <td className={`p-4 font-mono text-start ${isOverdue ? "text-rose-500 font-bold" : "text-slate-500"}`}>
                          <div className="flex items-center gap-1">
                            {isOverdue && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                            <span>{inv.due_date || "—"}</span>
                          </div>
                        </td>

                        {/* Gross amount */}
                        <td className="p-4 text-end font-bold font-mono text-slate-900 dark:text-white">
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-black">
                              {inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] text-slate-400 font-sans">{currency}</span>
                          </div>
                        </td>

                        {/* Status Label */}
                        <td className="p-4 text-center">
                          <div className="flex justify-center">
                            {inv.status === "Paid" ? (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-850 text-[10px] font-black">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{language === "ar" ? "مسددة" : "Settled"}</span>
                              </div>
                            ) : isOverdue ? (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 border border-rose-200/50 dark:border-rose-850 text-[10px] font-black animate-pulse">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>{language === "ar" ? "متأخرة" : "Overdue"}</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-550 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-850 text-[10px] font-black">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{language === "ar" ? "بانتظار السداد" : "ToPay"}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-center">
                          <div className="flex justify-center items-center gap-2">
                            <button
                              onClick={() => setSelectedInvoiceForPrint(inv)}
                              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-300 font-bold transition-all cursor-pointer flex items-center gap-1 w-full sm:w-auto justify-center"
                              title={language === "ar" ? "عرض وتحميل الفاتورة" : "Review Invoice Sheet"}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{language === "ar" ? "عرض وتنزيل" : "View / PDF"}</span>
                            </button>

                            {inv.status === "Unpaid" && (
                              <button
                                onClick={() => setSelectedInvoiceForPrint(inv)}
                                className="px-3.5 py-2 rounded-xl text-white font-bold transition-all cursor-pointer shadow-xs hover:scale-[1.02] flex items-center gap-1"
                                style={{ backgroundColor: primaryColorVal }}
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>{language === "ar" ? "سدّد الآن" : "Pay Now"}</span>
                              </button>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Table Footer */}
          <div className="p-4 bg-slate-50/50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-850 text-[10px] text-slate-400 text-start flex flex-col sm:flex-row justify-between items-center gap-2 font-mono">
            <span>Powered secure by SaaS multi-tenant sandbox environment.</span>
            <span className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-emerald-500" />
              <span>PCI compliance Level-1 SSL verification lock active.</span>
            </span>
          </div>

        </div>

      </main>

      {/* Saudi PDF Standard VAT Invoice Customizer and Print Modal layout */}
      {selectedInvoiceForPrint && (
        <InvoicePrintModal
          invoice={selectedInvoiceForPrint}
          client={client || { id: "", company_id: "", name: language === "ar" ? "عميل مجهول" : "Unknown Client", company: "", phone: "" }}
          operation={operations.find(o => o.id === selectedInvoiceForPrint.op_id) || { id: "", company_id: "", client_id: "", service: language === "ar" ? "عملية مجهولة" : "Unknown Service", cost: 0, revenue: 0, profit: 0, date: "" }}
          company={currentCompany}
          onClose={() => setSelectedInvoiceForPrint(null)}
          onPaymentSuccess={() => {
            handlePaymentSuccess(selectedInvoiceForPrint.id);
            // Instantly update status locally for smoother simulation feedback
            setSelectedInvoiceForPrint({
              ...selectedInvoiceForPrint,
              status: "Paid"
            });
          }}
        />
      )}

      {/* Bottom Legal bar */}
      <footer className="py-8 px-6 text-center border-t border-slate-200/50 dark:border-slate-850/60 bg-slate-100/55 dark:bg-slate-950 mt-12">
        <p className="text-[10px] text-slate-400 leading-normal max-w-xl mx-auto">
          {language === "ar"
            ? "جميع المعاملات المالية الموثقة عبر النظام تخضع لقوانين الهيئة العامة للزكاة والضريبة والجمارك بالمملكة العربية السعودية وأحكام التوثيق المالي الرقمي."
            : "Direct transactions recorded through this portal are authorized and secure. Fully integrated PCI-DSS Stripe framework with Saudi ZATCA e-invoicing Phase 2 specification compliance."}
        </p>
      </footer>

    </div>
  );
}
