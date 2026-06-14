import React, { useState, useMemo } from "react";
import { Operation, Client } from "../types";
import { 
  PlusCircle, Search, DollarSign, HelpCircle, Activity, Briefcase, Trash2, 
  Calendar, SlidersHorizontal, X, Filter 
} from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";

interface OperationsProps {
  operations: Operation[];
  clients: Client[];
  companyCurrency?: string;
  onCreateOperation: (data: { service: string; client_id: string; cost: number; revenue: number; status?: "Pending" | "In Progress" | "Completed" }) => Promise<void>;
  onDeleteOperation?: (id: string) => Promise<void>;
  onUpdateOperationStatus?: (id: string, status: "Pending" | "In Progress" | "Completed") => Promise<void>;
}

export default function Operations({ operations, clients, companyCurrency = "ر.س", onCreateOperation, onDeleteOperation, onUpdateOperationStatus }: OperationsProps) {
  const { language, t } = useLanguage();
  const [service, setService] = useState("");
  const [clientId, setClientId] = useState("");
  const [cost, setCost] = useState<number | "">("");
  const [revenue, setRevenue] = useState<number | "">("");
  const [status, setStatus] = useState<"Pending" | "In Progress" | "Completed">("In Progress");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Advanced Filtering States
  const [filterClientId, setFilterClientId] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterMinVal, setFilterMinVal] = useState<number | "">("");
  const [filterMaxVal, setFilterMaxVal] = useState<number | "">("");
  const [showFilters, setShowFilters] = useState(false);

  const calculatedProfit = (Number(revenue) || 0) - (Number(cost) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!service.trim()) {
      setError(language === "ar" ? "الرجاء إدخال اسم الخدمة أو العملية" : "Please fill in the service or operation name");
      return;
    }

    setLoading(true);
    try {
      await onCreateOperation({
        service,
        client_id: clientId,
        cost: Number(cost) || 0,
        revenue: Number(revenue) || 0,
        status
      });
      // Reset form
      setService("");
      setClientId("");
      setCost("");
      setRevenue("");
      setStatus("In Progress");
    } catch (err: any) {
      setError(err?.message || (language === "ar" ? "حدث خطأ أثناء حفظ العملية." : "An error occurred while saving the operation."));
    } finally {
      setLoading(false);
    }
  };

  // Resolve client name
  const getClientName = (id: string) => {
    const cli = clients.find(c => c.id === id);
    if (!cli) return language === "ar" ? "بلا عميل محدد" : "No client specified";
    return cli.company ? `${cli.name} (${cli.company})` : cli.name;
  };

  // Filtered operations using advanced parameters (service name, date, value, client name)
  const filteredOps = useMemo(() => {
    return operations.filter(op => {
      // 1. Text Search: matches service name or client name or client company
      const serviceMatch = op.service.toLowerCase().includes(search.toLowerCase());
      
      const client = clients.find(c => c.id === op.client_id);
      const clientNameMatch = client ? client.name.toLowerCase().includes(search.toLowerCase()) : false;
      const clientCompanyMatch = client && client.company ? client.company.toLowerCase().includes(search.toLowerCase()) : false;
      
      if (search && !serviceMatch && !clientNameMatch && !clientCompanyMatch) {
        return false;
      }

      // 2. Client dropdown filter
      if (filterClientId && op.client_id !== filterClientId) {
        return false;
      }

      // 3. Date range filter
      if (filterStartDate && op.date < filterStartDate) {
        return false;
      }
      if (filterEndDate && op.date > filterEndDate) {
        return false;
      }

      // 4. Value filter (revenue)
      if (filterMinVal !== "" && op.revenue < Number(filterMinVal)) {
        return false;
      }
      if (filterMaxVal !== "" && op.revenue > Number(filterMaxVal)) {
        return false;
      }

      return true;
    });
  }, [operations, clients, search, filterClientId, filterStartDate, filterEndDate, filterMinVal, filterMaxVal]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-start">
      
      {/* Creation form on the edit side */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-cardbk p-6 rounded-2xl shadow-sm border border-borderline">
          <div className="flex items-center gap-2 border-b border-borderline pb-4 mb-4">
            <PlusCircle className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg font-bold text-txtmain">{t("ops_record_title")}</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-500/10 text-rose-500 text-xs rounded-xl font-medium border border-rose-500/20">
                {error}
              </div>
            )}

            {/* Service input */}
            <div>
              <label className="block text-txtmain text-xs font-semibold mb-1.5">{t("ops_service_label")}</label>
              <input
                type="text"
                placeholder={t("ops_service_placeholder")}
                value={service}
                onChange={e => setService(e.target.value)}
                className="w-full bg-appbk border border-borderline rounded-xl px-3.5 py-2.5 text-sm text-txtmain placeholder-txtmuted/50 focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>

            {/* Client selector */}
            <div>
              <label className="block text-txtmain text-xs font-semibold mb-1.5">{t("ops_client_label")}</label>
              {clients.length === 0 ? (
                <div className="text-[11px] text-amber-500 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                  {language === "ar" 
                    ? "لا يوجد عملاء متاحين حالياً. الرجاء إضافة عميل من قسم \"العملاء\" أولاً لربطه بالعملية." 
                    : "No clients configured. Please create a client record first to link it."}
                </div>
              ) : (
                <select
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  className="w-full bg-appbk text-txtmain border border-borderline rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="">{language === "ar" ? "-- اختر عميل من القائمة --" : "-- Select linked client --"}</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id} className="bg-cardbk text-txtmain">
                      {c.name} {c.company ? `(${c.company})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Costs & revenue side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-txtmain text-xs font-semibold mb-1.5">{t("ops_cost_lbl")} ({companyCurrency})</label>
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={cost}
                  onChange={e => setCost(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full bg-appbk border border-borderline rounded-xl px-3 py-2.5 text-sm text-txtmain placeholder-txtmuted/50 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-txtmain text-xs font-semibold mb-1.5">{t("ops_revenue_lbl")} ({companyCurrency})</label>
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={revenue}
                  onChange={e => setRevenue(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full bg-appbk border border-borderline rounded-xl px-3 py-2.5 text-sm text-txtmain placeholder-txtmuted/50 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {/* Status Selector */}
            <div>
              <label className="block text-txtmain text-xs font-semibold mb-1.5">{language === "ar" ? "حالة العملية" : "Operation Status"}</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full bg-appbk text-txtmain border border-borderline rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                id="operation-status-create"
              >
                <option value="In Progress" className="bg-cardbk text-txtmain">{language === "ar" ? "قيد التنفيذ (In Progress)" : "In Progress"}</option>
                <option value="Completed" className="bg-cardbk text-txtmain">{language === "ar" ? "مكتملة (Completed)" : "Completed"}</option>
                <option value="Pending" className="bg-cardbk text-txtmain">{language === "ar" ? "معلقة (Pending)" : "Pending"}</option>
              </select>
            </div>

            {/* Dynamic visual preview of the calculated profit */}
            <div className={`p-4 rounded-xl border flex justify-between items-center ${calculatedProfit > 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : calculatedProfit < 0 ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-appbk border-borderline text-txtmain'}`}>
              <div>
                <p className="text-[10px] font-semibold opacity-75">{t("ops_profit_preview")}</p>
                <p className="text-sm font-extrabold mt-0.5">{language === "ar" ? "الربح = الإيراد - التكلفة" : "Profit = Inflow - Outflow"}</p>
              </div>
              <div className="text-start font-mono">
                <span className="text-lg font-black pr-1">{calculatedProfit.toLocaleString()}</span>
                <span className="text-xs">{companyCurrency}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all duration-150 disabled:opacity-50 cursor-pointer"
            >
              {loading 
                ? (language === "ar" ? "جاري الحفظ والجدولة..." : "Saving records...") 
                : (language === "ar" ? "حفظ وحساب الأرباح تلقائياً" : "Save & Calculate Earnings")}
            </button>

            <p className="text-[10px] text-txtmuted text-center leading-relaxed">
              ⚠️ {language === "ar" 
                ? "عند تسجيل العملية، سيقوم النظام بتوليد فاتورة غير مدفوعة تلقائية مستحقة الدفع بعد 7 أيام تماشياً مع معايير الفوترة الذكية." 
                : "Upon logging operations, a clean unpaid invoice due in 7 days is auto-issued under active accounts."}
            </p>
          </form>
        </div>
      </div>

      {/* Operations Directory Table */}
      <div className="lg:col-span-8 space-y-4">
        <div className="bg-cardbk p-6 rounded-2xl shadow-sm border border-borderline">
          
          {/* Header search with Advanced Filters */}
          <div className="space-y-4 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-txtmain">{t("ops_history")}</h3>
                <p className="text-xs text-txtmuted mt-0.5">{t("ops_history_desc")}</p>
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-grow sm:w-64">
                  <span className={`absolute inset-y-0 ${language === "ar" ? "right-0 pr-3" : "left-0 pl-3"} flex items-center pointer-events-none text-txtmuted`}>
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder={language === "ar" ? "ابحث بالخدمة، العميل..." : "Search action, client..."}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className={`w-full bg-appbk text-txtmain border border-borderline rounded-xl py-2 text-xs focus:outline-none focus:border-indigo-500 transition-colors ${language === "ar" ? "pr-9 pl-3" : "pl-9 pr-3"}`}
                  />
                </div>
                
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2 rounded-xl border border-borderline flex items-center gap-1.5 text-xs font-bold transition-all ${showFilters || filterClientId || filterStartDate || filterEndDate || filterMinVal !== "" || filterMaxVal !== "" ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' : 'bg-appbk text-txtmuted hover:text-txtmain'} cursor-pointer`}
                  title={language === "ar" ? "خيارات التصفية المتقدمة" : "Advanced Filters"}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="hidden md:inline">{language === "ar" ? "تصفية مخصصة" : "Advanced"}</span>
                </button>

                {(search || filterClientId || filterStartDate || filterEndDate || filterMinVal !== "" || filterMaxVal !== "") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setFilterClientId("");
                      setFilterStartDate("");
                      setFilterEndDate("");
                      setFilterMinVal("");
                      setFilterMaxVal("");
                    }}
                    className="p-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all text-xs cursor-pointer"
                    title={language === "ar" ? "إعادة تعيين الكل" : "Reset All"}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Advanced Filters Panel */}
            {showFilters && (
              <div className="p-4 bg-appbk/60 rounded-xl border border-borderline/80 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Filter by Client */}
                  <div>
                    <label className="block text-[10px] text-txtmuted font-semibold mb-1">{language === "ar" ? "تصفية حسب العميل" : "Filter by Client"}</label>
                    <select
                      value={filterClientId}
                      onChange={e => setFilterClientId(e.target.value)}
                      className="w-full bg-cardbk text-txtmain border border-borderline rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="">{language === "ar" ? "كل العملاء" : "All Clients"}</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filter by Date Range */}
                  <div className="sm:col-span-2 grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-txtmuted font-semibold mb-1">{language === "ar" ? "من تاريخ" : "From Date"}</label>
                      <input
                        type="date"
                        value={filterStartDate}
                        onChange={e => setFilterStartDate(e.target.value)}
                        className="w-full bg-cardbk text-txtmain border border-borderline rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-txtmuted font-semibold mb-1">{language === "ar" ? "إلى تاريخ" : "To Date"}</label>
                      <input
                        type="date"
                        value={filterEndDate}
                        onChange={e => setFilterEndDate(e.target.value)}
                        className="w-full bg-cardbk text-txtmain border border-borderline rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1">
                  {/* Minimum Contract value */}
                  <div>
                    <label className="block text-[10px] text-txtmuted font-semibold mb-1">{language === "ar" ? "قيمة الإيراد الأدنى" : "Min Inflow/Revenue"}</label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        placeholder="0"
                        value={filterMinVal}
                        onChange={e => setFilterMinVal(e.target.value === "" ? "" : Number(e.target.value))}
                        className={`w-full bg-cardbk text-txtmain border border-borderline rounded-xl py-1.5 text-xs focus:outline-none focus:border-indigo-500 transition-colors ${language === "ar" ? "pl-14 pr-2.5" : "pr-14 pl-2.5"}`}
                      />
                      <span className={`absolute ${language === "ar" ? "left-2.5" : "right-2.5"} text-[9px] text-txtmuted font-mono`}>{companyCurrency}</span>
                    </div>
                  </div>

                  {/* Maximum Contract value */}
                  <div>
                    <label className="block text-[10px] text-txtmuted font-semibold mb-1">{language === "ar" ? "قيمة الإيراد الأقصى" : "Max Inflow/Revenue"}</label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        placeholder="1,000,000"
                        value={filterMaxVal}
                        onChange={e => setFilterMaxVal(e.target.value === "" ? "" : Number(e.target.value))}
                        className={`w-full bg-cardbk text-txtmain border border-borderline rounded-xl py-1.5 text-xs focus:outline-none focus:border-indigo-500 transition-colors ${language === "ar" ? "pl-14 pr-2.5" : "pr-14 pl-2.5"}`}
                      />
                      <span className={`absolute ${language === "ar" ? "left-2.5" : "right-2.5"} text-[9px] text-txtmuted font-mono`}>{companyCurrency}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Table container */}
          <div className="overflow-x-auto">
            {filteredOps.length === 0 ? (
              <div className="text-center py-12 text-txtmuted">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-25" />
                <p className="text-sm">{language === "ar" ? "لا يوجد أي عمليات مسجّلة توافق البحث." : "No operations match seeking filters."}</p>
              </div>
            ) : (
              <table className="w-full text-start border-collapse text-xs">
                <thead>
                  <tr className="border-b border-borderline text-txtmuted pb-3">
                    <th className="font-bold py-3 px-2 text-start">{language === "ar" ? "الخدمة / العملية" : "Service / Action"}</th>
                    <th className="font-bold py-3 px-2 text-start">{language === "ar" ? "العميل" : "Client"}</th>
                    <th className="font-bold py-3 px-2 text-start">{language === "ar" ? "التكلفة" : "Production Cost"}</th>
                    <th className="font-bold py-3 px-2 text-start">{language === "ar" ? "الإيراد" : "Inflow Revenue"}</th>
                    <th className="font-bold py-3 px-2 text-start">{language === "ar" ? "صافي الربح" : "Net Margin"}</th>
                    <th className="font-bold py-3 px-2 text-center">{language === "ar" ? "الحالة" : "Status"}</th>
                    <th className="font-bold py-3 px-2 text-center">{language === "ar" ? "التاريخ" : "Logging Date"}</th>
                    {onDeleteOperation && <th className="font-bold py-3 px-2 text-center">{language === "ar" ? "الإجراء" : "Action"}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderline">
                  {filteredOps.map(op => (
                    <tr key={op.id} className="hover:bg-appbk/50 transition-colors">
                      <td className="py-3.5 px-2 font-bold text-txtmain flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        {op.service}
                      </td>
                      <td className="py-3.5 px-2 text-txtmuted">{getClientName(op.client_id)}</td>
                      <td className="py-3.5 px-2 text-start text-rose-500 font-mono font-medium">{op.cost.toLocaleString()} {companyCurrency}</td>
                      <td className="py-3.5 px-2 text-start text-emerald-500 font-mono font-medium">{op.revenue.toLocaleString()} {companyCurrency}</td>
                      <td className="py-3.5 px-2 text-start">
                        <span className={`inline-block font-mono font-bold px-2 py-0.5 rounded ${op.profit >= 0 ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"}`}>
                          {op.profit >= 0 ? "+" : ""}{op.profit.toLocaleString()} {companyCurrency}
                        </span>
                      </td>
                      <td className="py-3.5 px-2 text-center">
                        {onUpdateOperationStatus ? (
                          <div className="relative inline-block text-start">
                            <select
                              value={op.status || "Completed"}
                              onChange={(e) => onUpdateOperationStatus(op.id, e.target.value as any)}
                              className={`text-[10px] font-bold px-3 py-1 rounded-full outline-none border transition-colors cursor-pointer text-center appearance-none ${
                                (op.status || "Completed") === "Completed"
                                  ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/25"
                                  : (op.status || "Completed") === "In Progress"
                                  ? "bg-blue-500/15 text-blue-400 border-blue-500/20 hover:bg-blue-500/25"
                                  : "bg-amber-500/15 text-amber-500 border-amber-500/20 hover:bg-amber-500/25"
                              }`}
                            >
                              <option value="Completed" className="bg-cardbk text-emerald-500 font-bold">{language === "ar" ? "مكتملة" : "Completed"}</option>
                              <option value="In Progress" className="bg-cardbk text-blue-400 font-bold">{language === "ar" ? "قيد التنفيذ" : "In Progress"}</option>
                              <option value="Pending" className="bg-cardbk text-amber-500 font-bold">{language === "ar" ? "معلقة" : "Pending"}</option>
                            </select>
                          </div>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                              (op.status || "Completed") === "Completed"
                                ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/20"
                                : (op.status || "Completed") === "In Progress"
                                ? "bg-blue-500/15 text-blue-400 border-blue-500/20"
                                : "bg-amber-500/15 text-amber-500 border-amber-500/20"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              (op.status || "Completed") === "Completed"
                                ? "bg-emerald-500"
                                : (op.status || "Completed") === "In Progress"
                                ? "bg-blue-400"
                                : "bg-amber-500"
                            }`}></span>
                            <span>
                              {(op.status || "Completed") === "Completed"
                                ? (language === "ar" ? "مكتملة" : "Completed")
                                : (op.status || "Completed") === "In Progress"
                                ? (language === "ar" ? "قيد التنفيذ" : "In Progress")
                                : (language === "ar" ? "معلقة" : "Pending")}
                            </span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-2 text-center text-txtmuted font-mono">{op.date}</td>
                      {onDeleteOperation && (
                        <td className="py-3.5 px-2 text-center">
                          <button
                            onClick={() => {
                              if (window.confirm(language === "ar" ? "هل أنت متأكد من رغبتك في حذف هذه العملية بشكل نهائي؟ سيؤدي ذلك أيضاً إلى إلغاء وتدمير الفاتورة الضريبية التلقائية التابعة لها." : "Are you sure you want to permanently delete this operation? This will also cancel and remove the automated tax invoice linked to it.")) {
                                onDeleteOperation(op.id);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all text-[10.5px] font-black cursor-pointer"
                            title={language === "ar" ? "حذف وإلغاء الفواتير" : "Cancel operations & invoices"}
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{language === "ar" ? "حذف" : "Delete"}</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
