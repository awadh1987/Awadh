import React, { useState, useMemo } from "react";
import { Client, Operation, Invoice, Company } from "../types";
import { 
  PlusCircle, Search, Users, Phone, Building, UserPlus,
  BarChart3, Award, Clock, DollarSign, ArrowUpRight, 
  CheckCircle2, AlertCircle, ChevronRight, FileSpreadsheet, TrendingUp, Sparkles, Building2,
  SlidersHorizontal, X, Calendar, Filter, Mail, Lock, Unlock, FileCheck, CheckCircle, Eye, LogOut, ShieldCheck, Share2, ExternalLink
} from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";
import InvoicePrintModal from "./InvoicePrintModal";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from "recharts";

interface ClientsProps {
  clients: Client[];
  operations: Operation[];
  invoices: Invoice[];
  companyCurrency: string;
  currentCompany?: Company | null;
  onCreateClient: (data: { name: string; company: string; phone: string; email?: string }) => Promise<void>;
  userRole?: "owner" | "admin" | "subscriber";
}

export default function Clients({ 
  clients, 
  operations = [], 
  invoices = [], 
  companyCurrency = "ر.س", 
  currentCompany = null,
  onCreateClient,
  userRole = "owner"
}: ClientsProps) {
  const { language, t } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<"manage" | "analytics" | "portal">("manage");
  
  // Client Portal State hooks
  const [portalLoginInput, setPortalLoginInput] = useState("");
  const [portalSelectedClient, setPortalSelectedClient] = useState<Client | null>(null);
  const [portalError, setPortalError] = useState("");
  const [portalSubtab, setPortalSubtab] = useState<"outstanding" | "paid">("outstanding");
  const [portalSelectedInvoiceForPrint, setPortalSelectedInvoiceForPrint] = useState<Invoice | null>(null);
  
  // Create client form state
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Advanced filtration states for Clients list
  const [filterMinClientLtv, setFilterMinClientLtv] = useState<number | "">("");
  const [filterMinClientProfit, setFilterMinClientProfit] = useState<number | "">("");
  const [filterClientStartDate, setFilterClientStartDate] = useState("");
  const [filterClientEndDate, setFilterClientEndDate] = useState("");
  const [showClientFilters, setShowClientFilters] = useState(false);

  // Select client timeline state
  const [selectedTimelineClientId, setSelectedTimelineClientId] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError(language === "ar" ? "الرجاء إدخال اسم العميل" : "Please input client name");
      return;
    }

    setLoading(true);
    try {
      await onCreateClient({ name, company, phone, email });
      setName("");
      setCompany("");
      setPhone("");
      setEmail("");
    } catch (err: any) {
      setError(err?.message || (language === "ar" ? "حدث خطأ أثناء حفظ العميل" : "An error occurred while saving the client."));
    } finally {
      setLoading(false);
    }
  };

  // Filter clients using advanced parameters (name/company/phone, cumulative spent, deal date bounds)
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      // 1. Text Search matching name, company, or phone
      const textMatch = 
        c.name.toLowerCase().includes(search.toLowerCase()) || 
        c.company.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search);

      if (!textMatch) return false;

      // Filter based on transactions/operations
      const clientOps = operations.filter(o => o.client_id === c.id);

      // 2. Date Range Filter: does the client have operations in this date range?
      if (filterClientStartDate || filterClientEndDate) {
        const hasMatchingDeals = clientOps.some(o => {
          if (filterClientStartDate && o.date < filterClientStartDate) return false;
          if (filterClientEndDate && o.date > filterClientEndDate) return false;
          return true;
        });
        if (!hasMatchingDeals) return false;
      }

      // 3. Min Revenue value (LTV sum)
      if (filterMinClientLtv !== "") {
        const totalRev = clientOps.reduce((sum, o) => sum + (Number(o.revenue) || 0), 0);
        if (totalRev < Number(filterMinClientLtv)) return false;
      }

      // 4. Min Pure profit
      if (filterMinClientProfit !== "") {
        const totalProfit = clientOps.reduce((sum, o) => sum + ((Number(o.revenue) || 0) - (Number(o.cost) || 0)), 0);
        if (totalProfit < Number(filterMinClientProfit)) return false;
      }

      return true;
    });
  }, [clients, operations, search, filterClientStartDate, filterClientEndDate, filterMinClientLtv, filterMinClientProfit]);

  // Compile detailed financial intelligence for each customer
  const clientStats = useMemo(() => {
    const computed = clients.map(client => {
      const clientOps = operations.filter(o => o.client_id === client.id);
      const clientInvoices = invoices.filter(i => i.client_id === client.id);

      const totalRevenue = clientOps.reduce((sum, o) => sum + (Number(o.revenue) || 0), 0);
      const totalCost = clientOps.reduce((sum, o) => sum + (Number(o.cost) || 0), 0);
      const pureProfit = clientOps.reduce((sum, o) => sum + ((Number(o.revenue) || 0) - (Number(o.cost) || 0)), 0);

      const totalInvoiced = clientInvoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
      const paidInvoiced = clientInvoices.filter(i => i.status === "Paid").reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
      const unpaidInvoiced = clientInvoices.filter(i => i.status === "Unpaid").reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

      const reliabilityIndex = totalInvoiced > 0 ? Math.round((paidInvoiced / totalInvoiced) * 100) : 100;
      const profitMargin = totalRevenue > 0 ? Math.round((pureProfit / totalRevenue) * 100) : 0;

      return {
        client,
        opsCount: clientOps.length,
        invoicesCount: clientInvoices.length,
        totalRevenue,
        totalCost,
        pureProfit,
        totalInvoiced,
        paidInvoiced,
        unpaidInvoiced,
        reliabilityIndex,
        profitMargin
      };
    });

    // Sort by profit generated chronologically
    return computed;
  }, [clients, operations, invoices]);

  // Top clients by pure generated profit
  const topProfitableClients = useMemo(() => {
    return [...clientStats].sort((a, b) => b.pureProfit - a.pureProfit);
  }, [clientStats]);

  // Set the default client for the timeline drilldown once stats load
  React.useEffect(() => {
    if (topProfitableClients.length > 0 && !selectedTimelineClientId) {
      setSelectedTimelineClientId(topProfitableClients[0].client.id);
    }
  }, [topProfitableClients, selectedTimelineClientId]);

  // Compile selected client's transaction history timeline
  const selectedClientTimeline = useMemo(() => {
    if (!selectedTimelineClientId) return [];
    
    const clientOps = operations.filter(o => o.client_id === selectedTimelineClientId);
    const clientInvoices = invoices.filter(i => i.client_id === selectedTimelineClientId);

    const timelineItems: Array<{
      type: "operation" | "invoice";
      id: string;
      date: string;
      title: string;
      detail: string;
      amount: number;
      extra?: string;
      status?: string;
    }> = [];

    clientOps.forEach(o => {
      timelineItems.push({
        type: "operation",
        id: o.id,
        date: o.date,
        title: language === "ar" ? `عملية تشغيلية: ${o.service}` : `Operation: ${o.service}`,
        detail: language === "ar" 
          ? `قيمة العقد: ${(o.revenue).toLocaleString()} ${companyCurrency} | التكلفة الأساسية: ${(o.cost).toLocaleString()} ${companyCurrency}`
          : `Revenue: ${(o.revenue).toLocaleString()} ${companyCurrency} | Core Cost: ${(o.cost).toLocaleString()} ${companyCurrency}`,
        amount: o.revenue,
        extra: language === "ar" 
          ? `هامش صافي ربح التعاقد: ${(o.revenue - o.cost).toLocaleString()} ${companyCurrency}` 
          : `Contract Profit Margin: ${(o.revenue - o.cost).toLocaleString()} ${companyCurrency}`
      });
    });

    clientInvoices.forEach(i => {
      timelineItems.push({
        type: "invoice",
        id: i.id,
        date: i.due_date || i.payment_date || "",
        title: language === "ar" ? `إصدار فاتورة رقم ${i.id.substring(0, 6).toUpperCase()}` : `Invoice Bill #${i.id.substring(0, 6).toUpperCase()}`,
        detail: language === "ar" 
          ? `حالة السداد: ${i.status === "Paid" ? "مكتمل السداد" : "ذمم دائنة معلقة"}` 
          : `Settlement: ${i.status === "Paid" ? "Fully Settled" : "Accrued Receivables"}`,
        amount: i.amount,
        status: i.status
      });
    });

    // Sort chronologically descending
    return timelineItems.sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedTimelineClientId, operations, invoices, language, companyCurrency]);

  const selectedTimelineClientData = useMemo(() => {
    return clientStats.find(s => s.client.id === selectedTimelineClientId);
  }, [clientStats, selectedTimelineClientId]);

  // Compile LTV Cumulative spent over time for area chart
  const selectedClientCumulativeSpent = useMemo(() => {
    if (!selectedTimelineClientId) return [];
    
    // Get operations linked to this client, sort chronologically ascending
    const clientOps = [...operations]
      .filter(o => o.client_id === selectedTimelineClientId)
      .sort((a, b) => a.date.localeCompare(b.date));

    let runningTotal = 0;
    return clientOps.map(o => {
      runningTotal += Number(o.revenue) || 0;
      return {
        date: o.date,
        [language === "ar" ? "قيمة الصفقة" : "Contract Value"]: Number(o.revenue) || 0,
        [language === "ar" ? "القيمة المتراكمة (LTV)" : "Cumulative LTV"]: runningTotal
      };
    });
  }, [selectedTimelineClientId, operations, language]);

  // Overall average customer collection security index
  const averageReliabilityIndex = useMemo(() => {
    if (clientStats.length === 0) return 100;
    const total = clientStats.reduce((sum, s) => sum + s.reliabilityIndex, 0);
    return Math.round(total / clientStats.length);
  }, [clientStats]);

  // Bar chart top spending vs profit data
  const topClientsChartData = useMemo(() => {
    return topProfitableClients.slice(0, 7).map(s => ({
      name: s.client.name.length > 12 ? `${s.client.name.substring(0, 10)}...` : s.client.name,
      [language === "ar" ? "إجمالي الإنفاق (العميل)" : "Client Total Spent"]: s.totalRevenue,
      [language === "ar" ? "صافي أرباح المنشأة" : "Net Profit Earned"]: s.pureProfit
    }));
  }, [topProfitableClients, language]);

  return (
    <div className="space-y-6 text-start">
      
      {/* Sub-tabs header */}
      <div className="flex border-b border-borderline gap-2 select-none overflow-x-auto">
        <button
          onClick={() => setActiveSubTab("manage")}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === "manage"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400"
              : "border-transparent text-txtmuted hover:text-txtmain"
          }`}
          id="clients_subtab_manage"
        >
          <Users className="w-4 h-4" />
          <span>{language === "ar" ? "قائمة وإدارة العملاء" : "Clients Directory"}</span>
        </button>
        <button
          onClick={() => setActiveSubTab("analytics")}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === "analytics"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400"
              : "border-transparent text-txtmuted hover:text-txtmain"
          }`}
          id="clients_subtab_analytics"
        >
          <BarChart3 className="w-4 h-4" />
          <span>{language === "ar" ? "تحليلات الإنفاق والربحية" : "Client Spending & Profitability"}</span>
          <span className="text-[9px] bg-indigo-500/10 text-indigo-500 px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider">
            {language === "ar" ? "جديد" : "New"}
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab("portal")}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold text-xs transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === "portal"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400"
              : "border-transparent text-txtmuted hover:text-txtmain"
          }`}
          id="clients_subtab_portal"
        >
          <Lock className="w-4 h-4 text-emerald-500 animate-pulse" />
          <span>{language === "ar" ? "بوابة الخدمات ودفع الفواتير آمنة" : "Clients Portal & Access Gate"}</span>
          <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider">
            {language === "ar" ? "آمن" : "Secure Gate"}
          </span>
        </button>
      </div>

      {activeSubTab === "manage" && (
        /* Original Clients Directory Layout Grid */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="clients_manage_grid">
          
          {/* Create Client Form */}
          <div className="lg:col-span-4" id="clients_add_form_panel">
            <div className="bg-cardbk p-6 rounded-2xl shadow-sm border border-borderline">
              <div className="flex items-center gap-2 border-b border-borderline pb-4 mb-4">
                <UserPlus className="w-5 h-5 text-indigo-500" />
                <h3 className="text-lg font-bold text-txtmain">{t("clients_add_title")}</h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-rose-500/10 text-rose-500 text-xs rounded-xl border border-rose-500/20">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-txtmain text-xs font-semibold mb-1.5">{t("clients_name_lbl")}</label>
                  <input
                    type="text"
                    placeholder={t("clients_name_placeholder")}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-appbk border border-borderline text-txtmain placeholder-txtmuted/50 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-txtmain text-xs font-semibold mb-1.5">{t("clients_company_lbl")}</label>
                  <div className="relative">
                    <span className={`absolute inset-y-0 ${language === "ar" ? "right-0 pr-3" : "left-0 pl-3"} flex items-center pb-0.5 text-txtmuted`}>
                      <Building className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder={t("clients_company_placeholder")}
                      value={company}
                      onChange={e => setCompany(e.target.value)}
                      className={`w-full bg-appbk border border-borderline text-txtmain placeholder-txtmuted/50 rounded-xl py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors ${language === "ar" ? "pr-9 pl-3.5" : "pl-9 pr-3.5"}`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-txtmain text-xs font-semibold mb-1.5">{t("clients_phone_lbl")}</label>
                  <div className="relative">
                    <span className={`absolute inset-y-0 ${language === "ar" ? "right-0 pr-3" : "left-0 pl-3"} flex items-center pb-0.5 text-txtmuted`}>
                      <Phone className="w-4 h-4" />
                    </span>
                    <input
                      type="tel"
                      placeholder={t("clients_phone_placeholder")}
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className={`w-full bg-appbk border border-borderline text-txtmain placeholder-txtmuted/50 rounded-xl py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors ${language === "ar" ? "pr-9 pl-3.5" : "pl-9 pr-3.5"}`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-txtmain text-xs font-semibold mb-1.5">
                    {language === "ar" ? "البريد الإلكتروني للعميل" : "Client Email Address"}
                  </label>
                  <div className="relative">
                    <span className={`absolute inset-y-0 ${language === "ar" ? "right-0 pr-3" : "left-0 pl-3"} flex items-center pb-0.5 text-txtmuted`}>
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      placeholder="client@company.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className={`w-full bg-appbk border border-borderline text-txtmain placeholder-txtmuted/50 rounded-xl py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-left font-medium ${language === "ar" ? "pr-9" : "pl-9"}`}
                      style={{ direction: "ltr" }}
                    />
                  </div>
                </div>

                {userRole === "subscriber" ? (
                  <button
                    type="button"
                    disabled
                    className="w-full bg-slate-800 border border-slate-700/60 text-slate-400 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-not-allowed"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{language === "ar" ? "الحساب مخصص للعرض فقط" : "Viewer Account (Read-Only)"}</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all duration-150 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (language === "ar" ? "جاري الإضافة..." : "Adding...") : t("clients_save_btn")}
                  </button>
                )}
              </form>
            </div>
          </div>

          {/* Clients List/Table */}
          <div className="lg:col-span-8" id="clients_table_panel">
            <div className="bg-cardbk p-6 rounded-2xl shadow-sm border border-borderline">
              
              {/* Header search with Advanced Filters */}
              <div className="space-y-4 mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-txtmain">{t("clients_list_title")}</h3>
                    <p className="text-xs text-txtmuted mt-0.5">{t("clients_list_subtitle")}</p>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-grow sm:w-64">
                      <span className={`absolute inset-y-0 ${language === "ar" ? "right-0 pr-3" : "left-0 pl-3"} flex items-center pointer-events-none text-txtmuted`}>
                        <Search className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        placeholder={language === "ar" ? "البحث بالاسم، المنشأة، الهاتف..." : "Search client, company..."}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className={`w-full bg-appbk text-txtmain border border-borderline rounded-xl py-2 text-xs focus:outline-none focus:border-indigo-500 transition-colors ${language === "ar" ? "pr-9 pl-3" : "pl-9 pr-3"}`}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowClientFilters(!showClientFilters)}
                      className={`p-2 rounded-xl border border-borderline flex items-center gap-1.5 text-xs font-bold transition-all ${showClientFilters || filterMinClientLtv !== "" || filterMinClientProfit !== "" || filterClientStartDate || filterClientEndDate ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' : 'bg-appbk text-txtmuted hover:text-txtmain'} cursor-pointer`}
                      title={language === "ar" ? "خيارات التصفية المتقدمة للعملاء" : "Advanced Client Filters"}
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                      <span className="hidden md:inline">{language === "ar" ? "تصفية مخصصة" : "Advanced"}</span>
                    </button>

                    {(search || filterMinClientLtv !== "" || filterMinClientProfit !== "" || filterClientStartDate || filterClientEndDate) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearch("");
                          setFilterMinClientLtv("");
                          setFilterMinClientProfit("");
                          setFilterClientStartDate("");
                          setFilterClientEndDate("");
                        }}
                        className="p-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all text-xs cursor-pointer"
                        title={language === "ar" ? "إعادة تعيين الكل" : "Reset All"}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Collapsible Client Filters Panel */}
                {showClientFilters && (
                  <div className="p-4 bg-appbk/60 rounded-xl border border-borderline/80 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200 text-start">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Filter by deal Date range */}
                      <div>
                        <label className="block text-[10px] text-txtmuted font-semibold mb-1">{language === "ar" ? "تاريخ الصفقة أو العملية (من)" : "Operations Deal Date (from)"}</label>
                        <input
                          type="date"
                          value={filterClientStartDate}
                          onChange={e => setFilterClientStartDate(e.target.value)}
                          className="w-full bg-cardbk text-txtmain border border-borderline rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-txtmuted font-semibold mb-1">{language === "ar" ? "تاريخ الصفقة أو العملية (إلى)" : "Operations Deal Date (to)"}</label>
                        <input
                          type="date"
                          value={filterClientEndDate}
                          onChange={e => setFilterClientEndDate(e.target.value)}
                          className="w-full bg-cardbk text-txtmain border border-borderline rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Filter by Min cumulative spent */}
                      <div>
                        <label className="block text-[10px] text-txtmuted font-semibold mb-1">{language === "ar" ? "إجمالي الإنفاق الأدنى (LTV)" : "Min Cumulative Spending (LTV)"}</label>
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            placeholder="0"
                            value={filterMinClientLtv}
                            onChange={e => setFilterMinClientLtv(e.target.value === "" ? "" : Number(e.target.value))}
                            className={`w-full bg-cardbk text-txtmain border border-borderline rounded-xl py-1.5 text-xs focus:outline-none focus:border-indigo-500 transition-colors ${language === "ar" ? "pl-14 pr-2.5" : "pr-14 pl-2.5"}`}
                          />
                          <span className={`absolute ${language === "ar" ? "left-2.5" : "right-2.5"} text-[9px] text-txtmuted font-mono`}>{companyCurrency}</span>
                        </div>
                      </div>

                      {/* Filter by Min generated pure profit */}
                      <div>
                        <label className="block text-[10px] text-txtmuted font-semibold mb-1">{language === "ar" ? "صافي أرباح المنشأة المدفوعة الأدنى" : "Min Contribution Net Profit"}</label>
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            placeholder="0"
                            value={filterMinClientProfit}
                            onChange={e => setFilterMinClientProfit(e.target.value === "" ? "" : Number(e.target.value))}
                            className={`w-full bg-cardbk text-txtmain border border-borderline rounded-xl py-1.5 text-xs focus:outline-none focus:border-indigo-500 transition-colors ${language === "ar" ? "pl-14 pr-2.5" : "pr-14 pl-2.5"}`}
                          />
                          <span className={`absolute ${language === "ar" ? "left-2.5" : "right-2.5"} text-[9px] text-txtmuted font-mono`}>{companyCurrency}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                {filteredClients.length === 0 ? (
                  <div className="text-center py-12 text-txtmuted">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-25" />
                    <p className="text-sm">{language === "ar" ? "لا يوجد عملاء مضافون يتطابقون مع عملية البحث." : "No client profiles match search query."}</p>
                  </div>
                ) : (
                  <table className="w-full text-start border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-borderline text-txtmuted pb-3 font-semibold">
                        <th className="font-bold py-3 px-2 text-start">{language === "ar" ? "الاسم بالكامل" : "Full Name"}</th>
                        <th className="font-bold py-3 px-2 text-start">{language === "ar" ? "المنشأة / الشركة" : "Enterprise / Business"}</th>
                        <th className="font-bold py-3 px-2 text-start">{language === "ar" ? "رقم التواصل" : "Contact Phone"}</th>
                        <th className="font-bold py-3 px-2 text-start">{language === "ar" ? "البريد الإلكتروني" : "Email Address"}</th>
                        <th className="font-bold py-3 px-2 text-center">{language === "ar" ? "الرمز المعرّف (ID)" : "Unique Identifier (ID)"}</th>
                        <th className="font-bold py-3 px-2 text-center">{language === "ar" ? "بوابة العميل" : "Client Portal"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-borderline">
                      {filteredClients.map(c => (
                        <tr key={c.id} className="hover:bg-appbk/50 transition-colors">
                          <td className="py-3.5 px-2 font-bold text-txtmain flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-[10px]">
                              {c.name.substring(0, 1).toUpperCase()}
                            </div>
                            {c.name}
                          </td>
                          <td className="py-3.5 px-2 text-txtmuted">
                            {c.company ? (
                              <span className="bg-appbk text-txtmain px-2.5 py-1 rounded-md font-medium border border-borderline">
                                {c.company}
                              </span>
                            ) : (
                              <span className="text-txtmuted italic">{language === "ar" ? "غير محدد" : "Unspecified"}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-2 text-txtmuted font-mono">{c.phone || "—"}</td>
                          <td className="py-3.5 px-2 text-txtmuted font-sans text-start" style={{ direction: "ltr" }}>{c.email || "—"}</td>
                          <td className="py-3.5 px-2 text-center">
                            <span className="font-mono text-txtmuted bg-appbk px-2 py-0.5 rounded text-[10px] border border-borderline">
                              {c.id.substring(0, 8)}...
                            </span>
                          </td>
                          <td className="py-3.5 px-2 text-center text-xs">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  const companyId = currentCompany?.id || "comp-1";
                                  const shareUrl = `${window.location.origin}/?clientView=${c.id}&companyId=${companyId}`;
                                  navigator.clipboard.writeText(shareUrl);
                                  alert(language === "ar" 
                                    ? `تم نسخ رابط كشف حساب العميل [${c.name}] لصحيفة الحافظة!` 
                                    : `Shared client billing statement portal link for [${c.name}] copied to clipboard successfully!`
                                  );
                                }}
                                className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 border border-indigo-500/20 font-bold transition-all duration-155 flex items-center gap-1 cursor-pointer text-[10.5px]"
                                title={language === "ar" ? "نسخ رابط البوابة المشترك للعميل" : "Copy Shared Portal Link"}
                              >
                                <Share2 className="w-3.5 h-3.5" />
                                <span>{language === "ar" ? "نسخ الرابط" : "Copy Link"}</span>
                              </button>
                              <a
                                href={`/?clientView=${c.id}&companyId=${currentCompany?.id || "comp-1"}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 px-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-550 dark:text-slate-350 border border-slate-300/40 dark:border-slate-800 transition-all text-center flex items-center justify-center cursor-pointer shrink-0"
                                title={language === "ar" ? "معاينة بوابة العميل" : "Preview Client Portal"}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

            </div>
          </div>

        </div>
      )}

      {activeSubTab === "analytics" && (
        /* Advanced Financial Analytics & Lifetime Value Tab Layout */
        <div className="space-y-6 animate-in fade-in duration-300" id="clients_analytics_workspace">
          
          {/* Key Metric Snapshot Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="client_analytics_kpi_cards">
            
            {/* Top Revenue Client */}
            <div className="bg-cardbk p-5 rounded-2xl border border-borderline shadow-xs flex items-center gap-4 text-start">
              <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-500 border border-indigo-500/20 shrink-0">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-txtmuted font-bold uppercase tracking-wider">
                  {language === "ar" ? "العميل الأعلى تعاقداً وإنفاقاً" : "Highest Spending Client"}
                </p>
                <h4 className="text-sm font-black text-txtmain truncate mt-1">
                  {topProfitableClients[0]?.client.name || "—"}
                </h4>
                <p className="text-xs font-mono font-bold text-indigo-500 mt-0.5">
                  {(topProfitableClients[0]?.totalRevenue || 0).toLocaleString()} {companyCurrency}
                </p>
              </div>
            </div>

            {/* Top Profit Contribution */}
            <div className="bg-cardbk p-5 rounded-2xl border border-borderline shadow-xs flex items-center gap-4 text-start">
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20 shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-txtmuted font-bold uppercase tracking-wider">
                  {language === "ar" ? "العميل الأكثر ربحية خالصة" : "Most Profitable Client"}
                </p>
                <h4 className="text-sm font-black text-emerald-600 dark:text-emerald-400 truncate mt-1">
                  {topProfitableClients[0]?.client.name || "—"}
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                  <span className="text-xs font-mono font-black text-txtmain">
                    {(topProfitableClients[0]?.pureProfit || 0).toLocaleString()} {companyCurrency}
                  </span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-600 py-0.5 px-1.5 rounded-sm shrink-0">
                    {topProfitableClients[0]?.profitMargin || 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Average Reliability Index */}
            <div className="bg-cardbk p-5 rounded-2xl border border-borderline shadow-xs flex items-center gap-4 text-start">
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500 border border-amber-500/20 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-txtmuted font-bold uppercase tracking-wider">
                  {language === "ar" ? "مؤشر موثوقية دفع الفواتير" : "Receivables Safety Index"}
                </p>
                <h4 className="text-lg font-mono font-black text-txtmain mt-0.5">
                  {averageReliabilityIndex}%
                </h4>
                <p className="text-[10px] text-txtmuted">
                  {language === "ar" ? "متوسط التزام العملاء بسداد الفواتير المستحقة" : "Company-wide invoice settlement reliability"}
                </p>
              </div>
            </div>

          </div>

          {/* Top customer charts & ranking grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="client_charts_container">
            
            {/* Visual Recharts Bar Representation */}
            <div className="lg:col-span-7 bg-cardbk p-6 rounded-2xl border border-borderline text-start space-y-4" id="client_bar_graph">
              <div>
                <h3 className="font-bold text-sm text-txtmain">
                  {language === "ar" ? "مقارنة الحجم المالي والأرباح لكل عميل" : "Client Financial Magnitude & Net Profits"}
                </h3>
                <p className="text-[10px] text-txtmuted mt-0.5">
                  {language === "ar" ? "توضيح العلاقة بين إجمالي النفقات الملزمة وصافي أرباح التشغيل الناتجة" : "Direct visual comparing client's gross billing value versus the actual net enterprise margin achieved"}
                </p>
              </div>

              {topClientsChartData.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center border border-dashed border-borderline rounded-xl text-txtmuted">
                  <FileSpreadsheet className="w-8 h-8 opacity-30 mb-2" />
                  <p className="text-xs">{language === "ar" ? "بانتظار تسجيل عمليات لتمثيل المخطط البياني" : "Log operations to populate comparative graph."}</p>
                </div>
              ) : (
                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topClientsChartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
                      <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} />
                      <YAxis stroke="#888888" fontSize={10} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--color-bg-cardbk)', 
                          borderColor: 'var(--color-border-borderline)',
                          borderRadius: '12px',
                          color: 'var(--color-text-txtmain)',
                          fontSize: '11px',
                          textAlign: 'start'
                        }} 
                      />
                      <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                      <Bar 
                        name={language === "ar" ? "إجمالي الإنفاق" : "Gross Contracted Spent"} 
                        dataKey={language === "ar" ? "إجمالي الإنفاق (العميل)" : "Client Total Spent"} 
                        fill="#4f46e5" 
                        radius={[4, 4, 0, 0]} 
                      />
                      <Bar 
                        name={language === "ar" ? "صافي أرباح المنشأة" : "Net Profit Contribution"} 
                        dataKey={language === "ar" ? "صافي أرباح المنشأة" : "Net Profit Earned"} 
                        fill="#10b981" 
                        radius={[4, 4, 0, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Profitability Medal Leaderboard list */}
            <div className="lg:col-span-5 bg-cardbk p-6 rounded-2xl border border-borderline text-start space-y-4 flex flex-col justify-between" id="client_leaderboard_ledger">
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-txtmain">
                  {language === "ar" ? "تصنيف كفاءة وعوائد العملاء" : "Account Profit Efficiency Ranking"}
                </h3>
                <p className="text-[10px] text-txtmuted">
                  {language === "ar" ? "ترتيب العملاء تنازلياً حسب إسهام الأرباح الصافية الحقيقية" : "Accounts structured sequentially based on cumulative net profit yield contribution"}
                </p>
              </div>

              <div className="divide-y divide-borderline/50 overflow-y-auto max-h-72 mt-2 w-full pr-1">
                {topProfitableClients.length === 0 ? (
                  <div className="py-12 text-center text-txtmuted text-xs">
                    {language === "ar" ? "لا تتوفر جهات اتصال" : "No client records registered."}
                  </div>
                ) : (
                  topProfitableClients.map((item, idx) => {
                    const isSelected = selectedTimelineClientId === item.client.id;
                    const medals = ["🥇", "🥈", "🥉"];
                    return (
                      <div 
                        key={item.client.id}
                        onClick={() => setSelectedTimelineClientId(item.client.id)}
                        className={`flex items-center justify-between py-3 px-2 rounded-xl transition-all cursor-pointer group hover:bg-slate-500/5 ${isSelected ? "bg-indigo-600/5 border border-indigo-500/10" : "border border-transparent"}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-sm shrink-0 font-bold select-none text-center w-5">
                            {idx < 3 ? medals[idx] : idx + 1}
                          </span>
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs text-txtmain group-hover:text-indigo-500 transition-colors truncate">
                              {item.client.name}
                            </h4>
                            <p className="text-[9px] text-txtmuted truncate">
                              {item.client.company || "—"}
                            </p>
                          </div>
                        </div>

                        <div className="text-end shrink-0">
                          <span className="block font-mono font-extrabold text-xs text-txtmain">
                            {item.pureProfit.toLocaleString()} {companyCurrency}
                          </span>
                          <span className="text-[9px] font-mono text-txtmuted">
                            {language === "ar" ? "هامش" : "Margin"}: {item.profitMargin}%
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="bg-indigo-50/50 dark:bg-slate-800/30 border border-indigo-100/30 rounded-xl p-2.5 text-[9px] text-txtmuted leading-relaxed mt-2">
                💡 {language === "ar" 
                  ? "انقر على أي عميل في القائمة لتنشيط تفاصيل تاريخ تعاملاته السابقة ومخطط القيمة المتكاملة له بالأسفل." 
                  : "Click on any client profile registered above to populate their transaction audit path and cumulative value track below."
                }
              </div>
            </div>

          </div>

          {/* Interactive Drilldown section: selected client historical timeline & LTV trend */}
          {selectedTimelineClientId && selectedTimelineClientData && (
            <div className="bg-cardbk rounded-2xl border border-borderline p-6 space-y-6 animate-in fade-in duration-300 text-start" id="client_drilldown_workspace">
              
              {/* Header block details */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-borderline pb-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center font-black">
                    {selectedTimelineClientData.client.name.substring(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-txtmain flex items-center gap-1.5 flex-wrap">
                      <span>{selectedTimelineClientData.client.name}</span>
                      {selectedTimelineClientData.client.company && (
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                          <Building2 className="w-3 h-3" />
                          {selectedTimelineClientData.client.company}
                        </span>
                      )}
                    </h3>
                    <p className="text-[10px] text-txtmuted mt-0.5">
                      {language === "ar" ? "رقم الهاتف والاتصال:" : "Associated phone line:"} <span className="font-mono">{selectedTimelineClientData.client.phone || "—"}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <div className="px-3.5 py-1.5 bg-appbk border border-borderline rounded-xl text-center">
                    <span className="block text-[9px] text-txtmuted uppercase font-bold">{language === "ar" ? "الصفقات المنجزة" : "Contracts"}</span>
                    <span className="font-mono font-black text-xs text-txtmain">{selectedTimelineClientData.opsCount}</span>
                  </div>
                  <div className="px-3.5 py-1.5 bg-appbk border border-borderline rounded-xl text-center">
                    <span className="block text-[9px] text-txtmuted uppercase font-bold">{language === "ar" ? "قيمة المبيعات اللحظية" : "Sub-bills"}</span>
                    <span className="font-mono font-black text-xs text-txtmain">{selectedTimelineClientData.invoicesCount}</span>
                  </div>
                  <div className="px-3.5 py-1.5 bg-appbk border border-borderline rounded-xl text-center">
                    <span className="block text-[9px] text-txtmuted uppercase font-bold">{language === "ar" ? "معدل موثوقية العميل" : "Credit Rating"}</span>
                    <span className={`font-mono font-black text-xs ${selectedTimelineClientData.reliabilityIndex > 75 ? "text-emerald-500" : "text-amber-500"}`}>{selectedTimelineClientData.reliabilityIndex}%</span>
                  </div>
                </div>
              </div>

              {/* Multi Graph Sub-Split */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Visual cumulative LTV track over time chart (AreaChart) */}
                <div className="lg:col-span-6 space-y-3" id="client_ltv_growth_trend">
                  <div>
                    <h4 className="font-bold text-xs text-txtmain">
                      {language === "ar" ? "مسار نمو القيمة الكلية للعميل (LTV Growth Chart)" : "Lifetime Customer Value Growth Chart"}
                    </h4>
                    <p className="text-[10px] text-txtmuted mt-0.5">
                      {language === "ar" ? "تتبع بياني تراكمي لعوائد العميل المالية منذ بداية التعاقدات والعمليات" : "Graphical cumulative spent progress showing dynamic value maturation over operational milestones"}
                    </p>
                  </div>

                  {selectedClientCumulativeSpent.length === 0 ? (
                    <div className="h-64 border border-dashed border-borderline rounded-xl flex flex-col items-center justify-center text-txtmuted">
                      <Clock className="w-8 h-8 opacity-30 mb-2" />
                      <p className="text-xs">{language === "ar" ? "لا تتوفر تعاقدات مسجلة لهذا العميل لتخطيط مساره المالي" : "No registered contracts logged for this specific customer."}</p>
                    </div>
                  ) : (
                    <div className="h-64 w-full pt-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={selectedClientCumulativeSpent}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="colorLtv" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
                          <XAxis dataKey="date" stroke="#888888" fontSize={9} tickLine={false} />
                          <YAxis stroke="#888888" fontSize={9} tickLine={false} />
                          <Tooltip
                            contentStyle={{ 
                              backgroundColor: 'var(--color-bg-cardbk)', 
                              borderColor: 'var(--color-border-borderline)',
                              borderRadius: '12px',
                              color: 'var(--color-text-txtmain)',
                              fontSize: '11px',
                              textAlign: 'start'
                            }} 
                          />
                          <Area 
                            type="monotone" 
                            name={language === "ar" ? "القيمة التراكمية المستلمة" : "Cumulative Real LTV"} 
                            dataKey={language === "ar" ? "القيمة المتراكمة (LTV)" : "Cumulative LTV"} 
                            stroke="#4f46e5" 
                            fillOpacity={1} 
                            fill="url(#colorLtv)" 
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Vertical interactive chronological timeline of interactions (Contracts & Invoices) */}
                <div className="lg:col-span-6 space-y-4" id="client_history_chronicle">
                  <div>
                    <h4 className="font-bold text-xs text-txtmain">
                      {language === "ar" ? "سجل المعاملات والتعاملات التفصيلي" : "Chronological Interaction Timeline"}
                    </h4>
                    <p className="text-[10px] text-txtmuted mt-0.5">
                      {language === "ar" ? "دفتر مالي وتاريخي يوثق فواتير العميل المصدرة وعقوده التشغيلية حسب تتابعها الزمني" : "Historical record indexing bills, settled items, and operations arranged chronologically"}
                    </p>
                  </div>

                  <div className="overflow-y-auto max-h-64 space-y-3.5 pr-2 w-full">
                    {selectedClientTimeline.length === 0 ? (
                      <div className="py-12 text-center text-txtmuted text-xs border border-dashed border-borderline rounded-xl">
                        {language === "ar" ? "لا توجد معاملات مسجلة" : "No operations or bills published for this entity yet."}
                      </div>
                    ) : (
                      selectedClientTimeline.map((item, index) => {
                        const isOp = item.type === "operation";
                        return (
                          <div 
                            key={`${item.id}-${index}`} 
                            className="relative flex gap-3.5 text-xs animate-in slide-in-from-bottom-2 duration-200"
                          >
                            {/* Date Column representation */}
                            <div className="w-20 sm:w-24 shrink-0 text-end font-mono text-[10px] text-txtmuted pt-1">
                              {item.date}
                            </div>

                            {/* Bullet Connector Line circle */}
                            <div className="relative flex flex-col items-center select-none shrink-0">
                              <div className={`w-3 h-3 rounded-full border-2 ${
                                isOp 
                                  ? "border-indigo-500 bg-white dark:bg-slate-900" 
                                  : item.status === "Paid" 
                                    ? "border-emerald-500 bg-emerald-500" 
                                    : "border-amber-500 bg-amber-500"
                              }`} />
                              {index !== selectedClientTimeline.length - 1 && (
                                <div className="w-0.5 grow bg-borderline mt-1.5" style={{ minHeight: "26px" }} />
                              )}
                            </div>

                            {/* Detailed content info card */}
                            <div className="grow bg-appbk/90 border border-borderline/80 rounded-xl p-3 space-y-1">
                              <div className="flex justify-between items-start gap-2 flex-wrap">
                                <span className="font-bold text-xs text-txtmain leading-tight">
                                  {item.title}
                                </span>
                                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                  isOp 
                                    ? "bg-indigo-500/10 text-indigo-500" 
                                    : item.status === "Paid" 
                                      ? "bg-emerald-500/10 text-emerald-500" 
                                      : "bg-amber-500/10 text-amber-500"
                                }`}>
                                  {isOp 
                                    ? (language === "ar" ? "عقد تشغيلي" : "Contract") 
                                    : (item.status === "Paid" ? (language === "ar" ? "فاتورة مدفوعة" : "Fully Settled") : (language === "ar" ? "فاتورة معلقة" : "Accrued Bill"))
                                  }
                                </span>
                              </div>

                              <p className="text-[10px] text-txtmuted line-clamp-1">
                                {item.detail}
                              </p>

                              <div className="flex items-center justify-between pt-1 border-t border-borderline/30">
                                <span className="text-[9px] text-txtmuted">
                                  {item.extra || ""}
                                </span>
                                <span className="font-mono font-extrabold text-[11px] text-txtmain">
                                  {(item.amount).toLocaleString()} {companyCurrency}
                                </span>
                              </div>
                            </div>

                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {activeSubTab === "portal" && (
        <div className="space-y-6 animate-in fade-in duration-200" id="client_portal_workspace">
          
          {!portalSelectedClient ? (
            /* Portal Login View */
            <div className="max-w-4xl mx-auto bg-cardbk rounded-2xl border border-borderline overflow-hidden shadow-xl grid grid-cols-1 md:grid-cols-12" id="portal_unauth_gate">
              
              {/* Educational branding side */}
              <div className="md:col-span-5 bg-gradient-to-br from-indigo-950 to-indigo-900 text-white p-8 flex flex-col justify-between relative border-b md:border-b-0 md:border-r border-borderline/20">
                <div className="absolute inset-0 bg-radial-gradient from-indigo-500/10 to-transparent pointer-events-none" />
                
                <div className="space-y-4 relative z-10">
                  <div className="p-3 bg-white/10 rounded-xl w-fit border border-white/20">
                    <Lock className="w-6 h-6 text-emerald-400 animate-pulse" />
                  </div>
                  <h3 className="text-xl font-black leading-tight">
                    {language === "ar" ? "بوابة الخدمات وتسوية الفواتير" : "Enterprise Financial Clearing Gate"}
                  </h3>
                  <p className="text-xs text-indigo-200 leading-relaxed">
                    {language === "ar" 
                      ? "نظام الحوكمة الرقمي للشركاء يتيح لعملائنا الكرام تتبع عقود التشغيل، والتحقق من الفواتير المعلقة، والاطلاع على كشف المدفوعات التاريخية، وطباعة إيصالات القبض المعتمدة فضاءً آمنًا وبشكل مستقل."
                      : "The partner dynamic logging gate allows our commercial clients to inspect active services, verify outstanding billing parameters, audit previous clearances, and render compliant receipts autonomously."}
                  </p>
                </div>

                <div className="pt-8 border-t border-white/10 space-y-3 relative z-10 text-[11px] text-indigo-300">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{language === "ar" ? "اتصال مشفر وجلسات معزولة بالكامل" : "SSL Encrypted Secure Tunnel Active"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{language === "ar" ? "الامتثال الكامل لمتطلبات الفاتورة الإلكترونية" : "Tax Invoice Standard Compliant"}</span>
                  </div>
                </div>
              </div>

              {/* Secure Login Form card */}
              <div className="md:col-span-7 p-8 flex flex-col justify-center" id="portal_login_panel">
                <div className="max-w-md mx-auto w-full space-y-6">
                  <div className="space-y-1">
                    <h4 className="text-md font-extrabold text-txtmain">
                      {language === "ar" ? "تسجيل الدخول الآمن للعميل" : "Secure Client Authentication"}
                    </h4>
                    <p className="text-xs text-txtmuted">
                      {language === "ar" 
                        ? "استخدم بريدك الإلكتروني، أو رقم الجوال، أو رقم المعرف الخاص بك PIN المسجل في النظام."
                        : "Log in with your registered Email, Contact Phone, or Unique Client ID Passcode."}
                    </p>
                  </div>

                  {portalError && (
                    <div className="p-3.5 bg-rose-500/10 text-rose-500 text-xs rounded-xl border border-rose-500/15 flex items-center gap-2 font-bold animate-shake">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{portalError}</span>
                    </div>
                  )}

                  <form onSubmit={(e) => {
                    e.preventDefault();
                    setPortalError("");
                    const trimmedInput = portalLoginInput.trim().toLowerCase();
                    if (!trimmedInput) {
                      setPortalError(language === "ar" ? "يرجى تعبئة الحقل للمتابعة" : "Credential parameter is required to initialize session");
                      return;
                    }
                    const found = clients.find(c => 
                      c.id.toLowerCase() === trimmedInput || 
                      (c.email && c.email.toLowerCase() === trimmedInput) ||
                      (c.phone && c.phone.replace(/[^\d]/g, "") === trimmedInput.replace(/[^\d]/g, ""))
                    );
                    if (found) {
                      setPortalSelectedClient(found);
                      setPortalError("");
                      setPortalLoginInput("");
                    } else {
                      setPortalError(language === "ar" ? "لم نتمكن من مطابقة البيانات. يرجى التحقق من المدخلات أو استخدام بوابة الفحص السريع بالأسفل." : "Failed to associate client profile with input index. Check credentials or try fast developer tabs below.");
                    }
                  }} className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-extrabold text-txtmain leading-relaxed">
                        {language === "ar" ? "معرف العميل أو البريد الإلكتروني *" : "Secure Credential Token / Email *"}
                      </label>
                      <input
                        type="text"
                        placeholder={language === "ar" ? "أدخل المعرف (مثال: client-1) أو بريدك الإلكتروني..." : "e.g. client@domain.com or Client ID PIN"}
                        value={portalLoginInput}
                        onChange={(e) => setPortalLoginInput(e.target.value)}
                        className={`w-full bg-appbk border border-borderline text-txtmain placeholder-txtmuted/45 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 font-mono tracking-wide ${language === "ar" ? "text-right" : "text-left"}`}
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/15"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>{language === "ar" ? "التحقق وفتح الجلسة الآمنة" : "Verify Token & Set Session"}</span>
                    </button>
                  </form>

                  {/* Sandbox helper for demonstration */}
                  <div className="border-t border-borderline pt-5 space-y-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-extrabold text-indigo-500 uppercase flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        {language === "ar" ? "الوصول التجريبي السريع لمحاكاة العميل" : "Sandbox Fast Evaluation Tool"}
                      </span>
                      <span className="text-txtmuted bg-appbk px-2 py-0.5 rounded-full border border-borderline text-[9px]">
                        {language === "ar" ? "أداة الفحص" : "Sandbox Linker"}
                      </span>
                    </div>
                    
                    {clients.length === 0 ? (
                      <p className="text-[10px] text-txtmuted">
                        {language === "ar" ? "يرجى إضافة عملاء أولاً لتجربة المحاكاة." : "Register clients directory indexes first to engage checkout simulation."}
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {clients.slice(0, 4).map(c => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setPortalSelectedClient(c);
                              setPortalError("");
                              setPortalLoginInput("");
                            }}
                            className="bg-appbk hover:bg-indigo-500/10 hover:border-indigo-500 text-start p-2 rounded-xl text-xs border border-borderline/60 transition-all flex flex-col gap-0.5 justify-center group"
                          >
                            <span className="font-bold text-txtmain group-hover:text-indigo-500 truncate">{c.name}</span>
                            <span className="text-[9px] text-txtmuted font-mono">{c.company}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>

            </div>
          ) : (
            /* Authenticated Portal Dashboard View */
            <div className="space-y-6" id="portal_auth_dashboard_workspace">
              
              {/* Dynamic portal header with details */}
              <div className="bg-cardbk p-6 rounded-2xl border border-borderline shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0 uppercase">
                      <ShieldCheck className="w-3 h-3 text-emerald-500 animate-pulse" />
                      <span>{language === "ar" ? "جلسة مشفرة نشطة" : "Active Encrypted Connection"}</span>
                    </span>
                    <span className="text-[10px] text-txtmuted font-mono bg-appbk border border-borderline px-1.5 rounded">
                      ID: {portalSelectedClient.id}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-txtmain flex items-center gap-1.5">
                      {portalSelectedClient.name}
                    </h3>
                    <p className="text-xs text-txtmuted">
                      {language === "ar" ? `الشركة والمؤسسة التابعة: ${portalSelectedClient.company}` : `Affiliated Business Unit: ${portalSelectedClient.company}`}
                      {portalSelectedClient.email && ` | ${portalSelectedClient.email}`}
                      {portalSelectedClient.phone && ` | ${portalSelectedClient.phone}`}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setPortalSelectedClient(null);
                    setPortalSubtab("outstanding");
                    setPortalError("");
                  }}
                  className="bg-rose-500/10 hover:bg-rose-500 hover:text-white px-4 py-2 text-rose-500 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-rose-500/20 cursor-pointer w-full md:w-auto justify-center"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{language === "ar" ? "تسجيل الخروج والإنهاء" : "Terminate Connection"}</span>
                </button>
              </div>

              {/* Sub-KPI analysis computed dynamically */}
              {(() => {
                const clientInvoices = invoices.filter(inv => inv.client_id === portalSelectedClient.id);
                const paidInvoices = clientInvoices.filter(inv => inv.status === "Paid");
                const unpaidInvoices = clientInvoices.filter(inv => inv.status === "Unpaid");

                const totalInvoiced = clientInvoices.reduce((sum, inv) => sum + inv.amount, 0);
                const totalPaid = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0);
                const totalOutstanding = unpaidInvoices.reduce((sum, inv) => sum + inv.amount, 0);

                const reliabilityScore = clientInvoices.length > 0 
                  ? Math.round((paidInvoices.length / clientInvoices.length) * 100) 
                  : 100;

                return (
                  <>
                    {/* KPI Widget Cards Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="portal_stats_row">
                      
                      {/* Total invoices */}
                      <div className="bg-cardbk p-4 rounded-xl border border-borderline flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                          <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-txtmuted uppercase font-bold">{language === "ar" ? "مجموع الفواتير المصدرة" : "Deed Ledger Bills"}</p>
                          <p className="text-md font-mono font-black text-txtmain truncate">
                            {totalInvoiced.toLocaleString()} <span className="text-xs font-sans text-txtmuted">{companyCurrency}</span>
                          </p>
                        </div>
                      </div>

                      {/* Outstanding remaining */}
                      <div className="bg-cardbk p-4 rounded-xl border border-borderline flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-txtmuted uppercase font-bold">{language === "ar" ? "رصيد الفواتير غير المسددة" : "Outstanding Carrying Due"}</p>
                          <p className="text-md font-mono font-black text-brand-colors text-amber-500 truncate">
                            {totalOutstanding.toLocaleString()} <span className="text-xs font-sans text-txtmuted">{companyCurrency}</span>
                          </p>
                        </div>
                      </div>

                      {/* Paid cleared */}
                      <div className="bg-cardbk p-4 rounded-xl border border-borderline flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-txtmuted uppercase font-bold">{language === "ar" ? "إجمالي المطالبات المسددة" : "Fully Cleared Payments"}</p>
                          <p className="text-md font-mono font-black text-emerald-500 truncate">
                            {totalPaid.toLocaleString()} <span className="text-xs font-sans text-txtmuted">{companyCurrency}</span>
                          </p>
                        </div>
                      </div>

                      {/* Financial commit score indicator */}
                      <div className="bg-cardbk p-4 rounded-xl border border-borderline flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0">
                          <Award className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 w-full">
                          <p className="text-[10px] text-txtmuted uppercase font-bold">{language === "ar" ? "مؤشر الالتزام وموثوقية السداد" : "Financial Clearance Score"}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-md font-mono font-black text-teal-500">{reliabilityScore}%</span>
                            <div className="w-full bg-slate-350 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-teal-500 h-full rounded-full transition-all duration-500" style={{ width: `${reliabilityScore}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Main Ledger Area */}
                    <div className="bg-cardbk p-6 rounded-2xl border border-borderline text-start space-y-4">
                      
                      {/* Sub tab toggles */}
                      <div className="flex border-b border-borderline gap-1 overflow-x-auto">
                        <button
                          onClick={() => setPortalSubtab("outstanding")}
                          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-extrabold text-xs transition-colors whitespace-nowrap cursor-pointer ${
                            portalSubtab === "outstanding"
                              ? "border-amber-500 text-amber-500"
                              : "border-transparent text-txtmuted hover:text-txtmain"
                          }`}
                        >
                          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>{language === "ar" ? "فواتير مستحقة الدفع" : "Accrued Outstanding Bills"}</span>
                          {unpaidInvoices.length > 0 && (
                            <span className="text-[10px] bg-amber-500/10 text-amber-500 font-extrabold px-1.5 py-0.5 rounded-full font-mono shrink-0">
                              {unpaidInvoices.length}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => setPortalSubtab("paid")}
                          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-extrabold text-xs transition-colors whitespace-nowrap cursor-pointer ${
                            portalSubtab === "paid"
                              ? "border-emerald-500 text-emerald-500"
                              : "border-transparent text-txtmuted hover:text-txtmain"
                          }`}
                        >
                          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>{language === "ar" ? "المدفوعات السابقة وإيصالات القبض" : "Payment History & Clearance Receipts"}</span>
                          {paidInvoices.length > 0 && (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 font-extrabold px-1.5 py-0.5 rounded-full font-mono shrink-0">
                              {paidInvoices.length}
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Display Table/List depending on selected toggle sub-tab */}
                      {portalSubtab === "outstanding" ? (
                        /* Outstanding Bills Section */
                        unpaidInvoices.length === 0 ? (
                          <div className="py-12 text-center bg-slate-500/5 dark:bg-slate-900/10 rounded-2xl border-2 border-dashed border-borderline">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                            <p className="text-xs text-txtmain font-bold">{language === "ar" ? "رصيدك صفري! لا توجد فواتير معلقة" : "All Accounts Settle Up!"}</p>
                            <p className="text-[10px] text-txtmuted max-w-xs mx-auto leading-normal mt-0.5">
                              {language === "ar" ? "نشكركم على التزامكم الميمون بالسداد. تم سداد وتسوية كافة المطالبات بالكامل." : "No accrued bills registered to your customer profile. Thank you for keeping outstanding levels to zero."}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="overflow-x-auto rounded-xl border border-borderline bg-appbk/20">
                              <table className="w-full text-xs">
                                <thead className="bg-appbk text-txtmuted border-b border-borderline text-[10px] uppercase font-bold">
                                  <tr>
                                    <th className="py-3 px-4 text-start">{language === "ar" ? "رقم الفاتورة" : "Invoice Code"}</th>
                                    <th className="py-3 px-3 text-start">{language === "ar" ? "الخدمة أو العقد" : "Service Description"}</th>
                                    <th className="py-3 px-3 text-start">{language === "ar" ? "تاريخ الاستحقاق" : "Payment Due"}</th>
                                    <th className="py-3 px-3 text-end">{language === "ar" ? "المبلغ المستحق" : "Accrued carrying"}</th>
                                    <th className="py-3 px-4 text-center">{language === "ar" ? "خيارات وإجراءات" : "Actions Gate"}</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-borderline/45 font-medium text-txtmain">
                                  {unpaidInvoices.map(inv => {
                                    const relativeOp = operations.find(o => o.id === inv.op_id) || { service: language === "ar" ? "عقد خدمات ومشاريع" : "Contract Delivery" };
                                    const rawInvoiceCode = inv.id.split("-").pop()?.toUpperCase() || "BILL";
                                    return (
                                      <tr key={inv.id} className="hover:bg-appbk/45 transition-colors">
                                        <td className="py-3.5 px-4 font-mono font-bold text-txtmain select-all">
                                          INV-{rawInvoiceCode}
                                        </td>
                                        <td className="py-3.5 px-3">
                                          <div className="font-bold">{relativeOp.service}</div>
                                          <span className="text-[10px] text-txtmuted select-none">
                                            {language === "ar" ? "إيراد تجاري" : "B2B Operation"}
                                          </span>
                                        </td>
                                        <td className="py-3.5 px-3 font-mono text-txtmuted">
                                          <span className="text-red-400 font-bold block">{inv.id ? (language === "ar" ? "قريباً / مستحق السداد" : "Accrued Term") : ""}</span>
                                          <span className="text-[10px]">{language === "ar" ? "تسوية عاجلة" : "Standard Terms"}</span>
                                        </td>
                                        <td className="py-3.5 px-3 text-end font-mono font-black text-txtmain">
                                          {inv.amount.toLocaleString()} <span className="text-[10px] font-sans text-txtmuted">{companyCurrency}</span>
                                        </td>
                                        <td className="py-3.5 px-4">
                                          <div className="flex items-center justify-center gap-1.5">
                                            <button
                                              onClick={() => setPortalSelectedInvoiceForPrint(inv)}
                                              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                                            >
                                              <Eye className="w-3.5 h-3.5" />
                                              <span>{language === "ar" ? "استعراض وجدول الفاتورة" : "Review Terms"}</span>
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Dynamic Mock Bank Transfer Details / Payment instructions */}
                            <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/15 text-xs space-y-2 text-txtmain max-w-4xl">
                              <p className="font-black text-amber-500 flex items-center gap-1.5">
                                <AlertCircle className="w-4 h-4" />
                                <span>{language === "ar" ? "سياسة وأقنية التسوية والتحصيل المالي" : "Fast Payment instructions & gateways"}</span>
                              </p>
                              <p className="text-[11px] leading-relaxed text-txtmuted">
                                {language === "ar" 
                                  ? "لتسوية أي من الفواتير المعلقة أعلاه، يرجى القيام بالتحويل المصرفي المباشر لحسابات الشركة الرئيسية وإشعار محاسب الشركة، أو النقر على استعراض الفاتورة بالأعلى ومسح رمز الاستجابة السريع للفوترة."
                                  : "To settle any outstanding accrued balance listed above, please direct standard bank wire transfer directly using compliant routing codes, or press 'Review Terms' to query invoice's online payment links & barcode."}
                              </p>
                            </div>
                          </div>
                        )
                      ) : (
                        /* Paid Clearance Receipts Section */
                        paidInvoices.length === 0 ? (
                          <div className="py-12 text-center bg-slate-500/5 dark:bg-slate-900/10 rounded-2xl border-2 border-dashed border-borderline">
                            <Clock className="w-8 h-8 text-txtmuted/45 mx-auto mb-2 animate-spin" />
                            <p className="text-xs text-txtmain font-bold">{language === "ar" ? "لا تتوفر إيصالات سابقة" : "No Cleared Receipts Registers"}</p>
                            <p className="text-[10px] text-txtmuted max-w-xs mx-auto leading-normal mt-0.5">
                              {language === "ar" ? "لم نسجل أي مدفوعات تاريخية مكتملة لهذا العميل حالياً في نظام الحسابات الختامي." : "No settled payments linked to your client ID indexes. History will display receipts once bills are solved."}
                            </p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border border-borderline bg-appbk/20">
                            <table className="w-full text-xs">
                              <thead className="bg-appbk text-txtmuted border-b border-borderline text-[10px] uppercase font-bold">
                                <tr>
                                  <th className="py-3 px-4 text-start">{language === "ar" ? "رقم إيصال القبض" : "Receipt Index"}</th>
                                  <th className="py-3 px-3 text-start">{language === "ar" ? "الخدمات المغطاة" : "Operations Cleared"}</th>
                                  <th className="py-3 px-3 text-center">{language === "ar" ? "تأكيد الدفع وموثق السجل" : "Security Stamp"}</th>
                                  <th className="py-3 px-3 text-end">{language === "ar" ? "المبلغ المسدد" : "Cleared Carrying"}</th>
                                  <th className="py-3 px-4 text-center">{language === "ar" ? "تصديق السند" : "Compliance Receipt"}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-borderline/45 font-medium text-txtmain">
                                {paidInvoices.map(inv => {
                                  const relativeOp = operations.find(o => o.id === inv.op_id) || { service: language === "ar" ? "خدمات تجارية مطابقة" : "Technical Delivery" };
                                  const rawReceiptCode = inv.id.split("-").pop()?.toUpperCase() || "REC";
                                  return (
                                    <tr key={inv.id} className="hover:bg-appbk/45 transition-colors">
                                      <td className="py-3.5 px-4 font-mono font-bold text-txtmain select-all text-emerald-500">
                                        REC-{rawReceiptCode}
                                      </td>
                                      <td className="py-3.5 px-3">
                                        <div className="font-bold">{relativeOp.service}</div>
                                        <span className="text-[9px] bg-slate-350 dark:bg-slate-800 text-txtmuted px-1.5 py-0.5 rounded font-bold font-mono">
                                          {language === "ar" ? "سند مقبوض" : "INVOICE SETTLED"}
                                        </span>
                                      </td>
                                      <td className="py-3.5 px-3">
                                        <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-bold py-1 px-2.5 rounded-full flex items-center justify-center gap-1 max-w-[150px] mx-auto select-none">
                                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                          <span>{language === "ar" ? "مسدد بالكامل" : "Paid & Verified"}</span>
                                        </span>
                                      </td>
                                      <td className="py-3.5 px-3 text-end font-mono font-black text-emerald-500">
                                        +{inv.amount.toLocaleString()} <span className="text-[10px] font-sans text-txtmuted">{companyCurrency}</span>
                                      </td>
                                      <td className="py-3.5 px-4">
                                        <div className="flex items-center justify-center">
                                          <button
                                            onClick={() => setPortalSelectedInvoiceForPrint(inv)}
                                            className="border border-emerald-500/20 hover:border-emerald-500 bg-emerald-500/10 text-emerald-500 font-extrabold px-3 py-1.5 rounded-lg text-[10px] duration-150 flex items-center gap-1 cursor-pointer"
                                          >
                                            <FileCheck className="w-3.5 h-3.5 text-emerald-500" />
                                            <span>{language === "ar" ? "تحميل إيصال سداد مختوم" : "Print Compliance Receipt"}</span>
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )
                      )}

                    </div>
                  </>
                );
              })()}

            </div>
          )}

        </div>
      )}

      {/* RENDER MODAL: Shared detailed Print Receipt Template */}
      {portalSelectedInvoiceForPrint && portalSelectedClient && (
        <InvoicePrintModal
          invoice={portalSelectedInvoiceForPrint}
          client={portalSelectedClient}
          operation={operations.find(o => o.id === portalSelectedInvoiceForPrint.op_id) || { id: "", company_id: "", client_id: "", service: language === "ar" ? "عملية تسليم فنية مجهولة" : "Corporate Delivery Project", cost: 0, revenue: 0, profit: 0, date: "" }}
          company={currentCompany}
          onClose={() => setPortalSelectedInvoiceForPrint(null)}
        />
      )}

    </div>
  );
}
