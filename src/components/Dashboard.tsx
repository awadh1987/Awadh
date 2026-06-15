import React from "react";
import { DashboardStats, Invoice, Client, Operation, Company } from "../types";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Layers, 
  FileText, 
  AlertTriangle, 
  Percent, 
  CheckCircle2, 
  Clock, 
  Briefcase,
  GripVertical,
  Sliders,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface DashboardProps {
  stats: DashboardStats;
  invoices: Invoice[];
  clients: Client[];
  operations: Operation[];
  companyCurrency?: string;
  widgetOrder?: string;
  primaryColor?: string;
  currentCompany?: Company | null;
  onUpdateCompany?: (company: Company) => void;
  onToggleInvoice: (id: string, currentStatus: "Paid" | "Unpaid") => void;
}

export default function Dashboard({ 
  stats, 
  invoices, 
  clients, 
  operations,
  companyCurrency = "ر.س",
  widgetOrder,
  primaryColor = "#4F46E5",
  currentCompany,
  onUpdateCompany,
  onToggleInvoice 
}: DashboardProps) {
  const { language, t } = useLanguage();

  // Aggregate operations into monthly values
  const monthlyData = React.useMemo(() => {
    const monthsMap: { [key: string]: { month: string; rawMonth: string; revenue: number; cost: number; profit: number } } = {};
    
    // Group and sum by year-month
    operations.forEach(op => {
      if (!op.date) return;
      const dateParts = op.date.split("-");
      if (dateParts.length >= 2) {
        const year = dateParts[0];
        const monthNum = dateParts[1];
        const key = `${year}-${monthNum}`;
        
        let monthName = "";
        if (language === "ar") {
          const monthsAr = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
          const idx = parseInt(monthNum, 10) - 1;
          monthName = idx >= 0 && idx < 12 ? `${monthsAr[idx]} ${year}` : key;
        } else {
          const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const idx = parseInt(monthNum, 10) - 1;
          monthName = idx >= 0 && idx < 12 ? `${monthsEn[idx]} ${year}` : key;
        }
        
        if (!monthsMap[key]) {
          monthsMap[key] = {
            month: monthName,
            rawMonth: key,
            revenue: 0,
            cost: 0,
            profit: 0
          };
        }
        monthsMap[key].revenue += op.revenue || 0;
        monthsMap[key].cost += op.cost || 0;
        monthsMap[key].profit += op.profit || 0;
      }
    });

    // Sort chronologically by rawMonth
    const sorted = Object.values(monthsMap).sort((a, b) => a.rawMonth.localeCompare(b.rawMonth));
    
    // Generate some empty placeholder months if no data is available
    if (sorted.length === 0) {
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const k = `${y}-${m}`;
        
        let mName = "";
        if (language === "ar") {
          const monthsAr = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
          mName = `${monthsAr[d.getMonth()]} ${y}`;
        } else {
          const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          mName = `${monthsEn[d.getMonth()]} ${y}`;
        }
        sorted.push({
          month: mName,
          rawMonth: k,
          revenue: 0,
          cost: 0,
          profit: 0
        });
      }
    }
    
    return sorted;
  }, [operations, language]);
  
  // Resolve client name
  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : (language === "ar" ? "عميل غير معروف" : "Unknown Client");
  };

  // Get overdue invoices from the list
  const todayStr = new Date().toISOString().split("T")[0];
  const overdueInvoices = invoices.filter(
    inv => inv.status === "Unpaid" && inv.due_date && inv.due_date < todayStr
  );

  const [order, setOrder] = React.useState<string[]>(() => {
    return widgetOrder && widgetOrder.trim()
      ? widgetOrder.split(",")
      : ["revenue", "costs", "net_profit", "profit_margin"];
  });

  const [draggedIdx, setDraggedIdx] = React.useState<number | null>(null);
  const [customizeOpen, setCustomizeOpen] = React.useState(false);
  
  const [visibleWidgets, setVisibleWidgets] = React.useState<{ [key: string]: boolean }>(() => {
    try {
      const saved = localStorage.getItem("visible_dashboard_metrics");
      return saved ? JSON.parse(saved) : { revenue: true, costs: true, net_profit: true, profit_margin: true };
    } catch {
      return { revenue: true, costs: true, net_profit: true, profit_margin: true };
    }
  });

  React.useEffect(() => {
    if (widgetOrder && widgetOrder.trim()) {
      setOrder(widgetOrder.split(","));
    } else {
      setOrder(["revenue", "costs", "net_profit", "profit_margin"]);
    }
  }, [widgetOrder]);

  const toggleWidgetVisibility = (widgetId: string) => {
    const updated = { ...visibleWidgets, [widgetId]: !visibleWidgets[widgetId] };
    setVisibleWidgets(updated);
    try {
      localStorage.setItem("visible_dashboard_metrics", JSON.stringify(updated));
    } catch (e) {
      console.warn("Storage write blocked:", e);
    }
  };

  const handleArrowMove = async (index: number, direction: "left" | "right") => {
    const items = [...order];
    if (direction === "left") {
      if (index === 0) return;
      const prevVal = items[index - 1];
      items[index - 1] = items[index];
      items[index] = prevVal;
    } else {
      if (index === items.length - 1) return;
      const nextVal = items[index + 1];
      items[index + 1] = items[index];
      items[index] = nextVal;
    }
    setOrder(items);

    if (currentCompany && onUpdateCompany) {
      try {
        const orderStr = items.join(",");
        const res = await fetch(`/api/companies/${currentCompany.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: currentCompany.name,
            logo_url: currentCompany.logo_url || "",
            primary_color: currentCompany.primary_color || "",
            currency: currentCompany.currency || "ر.س",
            widget_order: orderStr
          })
        });
        if (res.ok) {
          const updated: Company = await res.json();
          onUpdateCompany(updated);
        }
      } catch (err) {
        console.warn("Failed to update widget order via arrows:", err);
      }
    }
  };

  const resetWidgetsToDefault = async () => {
    const defaultOrder = ["revenue", "costs", "net_profit", "profit_margin"];
    const allVisible = { revenue: true, costs: true, net_profit: true, profit_margin: true };
    setOrder(defaultOrder);
    setVisibleWidgets(allVisible);
    try {
      localStorage.setItem("visible_dashboard_metrics", JSON.stringify(allVisible));
    } catch {}

    if (currentCompany && onUpdateCompany) {
      try {
        const res = await fetch(`/api/companies/${currentCompany.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: currentCompany.name,
            logo_url: currentCompany.logo_url || "",
            primary_color: currentCompany.primary_color || "",
            currency: currentCompany.currency || "ر.س",
            widget_order: "revenue,costs,net_profit,profit_margin"
          })
        });
        if (res.ok) {
          const updated: Company = await res.json();
          onUpdateCompany(updated);
        }
      } catch (err) {
        console.warn("Failed to reset widget order on DB:", err);
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;
    
    const items = [...order];
    const draggedItem = items[draggedIdx];
    items.splice(draggedIdx, 1);
    items.splice(index, 0, draggedItem);
    
    setDraggedIdx(index);
    setOrder(items);
  };

  const handleDragEnd = async () => {
    setDraggedIdx(null);
    if (currentCompany && onUpdateCompany) {
      try {
        const orderStr = order.join(",");
        const res = await fetch(`/api/companies/${currentCompany.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: currentCompany.name,
            logo_url: currentCompany.logo_url || "",
            primary_color: currentCompany.primary_color || "",
            currency: currentCompany.currency || "ر.س",
            widget_order: orderStr
          })
        });
        if (res.ok) {
          const updated: Company = await res.json();
          onUpdateCompany(updated);
        }
      } catch (err) {
        console.warn("Failed to update widget order via dashboard drag:", err);
      }
    }
  };

  const widgetList = order.filter(widgetId => visibleWidgets[widgetId] !== false);

  const renderKpiWidget = (widgetId: string) => {
    switch (widgetId) {
      case "revenue":
        return (
          <div key="revenue" className="bg-cardbk p-6 rounded-2xl shadow-sm border border-borderline flex items-center justify-between hover:shadow-md transition-all duration-200">
            <div className="space-y-2 text-start">
              <p className="text-txtmuted text-sm font-medium">{t("db_total_revenue")}</p>
              <h3 className="text-3xl font-extrabold text-txtmain tracking-tight">
                {stats.totalRevenue.toLocaleString()} <span className="text-sm font-normal text-txtmuted">{companyCurrency}</span>
              </h3>
              <div className="flex items-center gap-1 text-emerald-500 text-xs font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{t("db_liquidity_rate")}</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        );
      case "costs":
        return (
          <div key="costs" className="bg-cardbk p-6 rounded-2xl shadow-sm border border-borderline flex items-center justify-between hover:shadow-md transition-all duration-200">
            <div className="space-y-2 text-start">
              <p className="text-txtmuted text-sm font-medium">{t("db_total_costs")}</p>
              <h3 className="text-3xl font-extrabold text-txtmain tracking-tight">
                {stats.totalCost.toLocaleString()} <span className="text-sm font-normal text-txtmuted">{companyCurrency}</span>
              </h3>
              <div className="flex items-center gap-1 text-rose-500 text-xs font-semibold">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>{t("db_budget_consumption")}</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
              <TrendingDown className="w-6 h-6" />
            </div>
          </div>
        );
      case "net_profit":
        return (
          <div key="net_profit" className="bg-cardbk p-6 rounded-2xl shadow-sm border border-borderline flex items-center justify-between hover:shadow-md transition-all duration-200">
            <div className="space-y-2 text-start">
              <p className="text-txtmuted text-sm font-medium">{t("db_net_profit")}</p>
              <h3 className={`text-3xl font-extrabold tracking-tight ${stats.totalProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {stats.totalProfit.toLocaleString()} <span className="text-sm font-normal text-txtmuted">{companyCurrency}</span>
              </h3>
              <div className="flex items-center gap-1 text-emerald-500 text-xs font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{t("db_net_return")}</span>
              </div>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stats.totalProfit >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              <Briefcase className="w-6 h-6" />
            </div>
          </div>
        );
      case "profit_margin":
        return (
          <div key="profit_margin" className="bg-cardbk p-6 rounded-2xl shadow-sm border border-borderline flex items-center justify-between hover:shadow-md transition-all duration-200">
            <div className="space-y-2 text-start">
              <p className="text-txtmuted text-sm font-medium">{t("db_operating_margin")}</p>
              <h3 className="text-3xl font-extrabold text-txtmain tracking-tight">
                {stats.profitMargin}%
              </h3>
              <div className="flex items-center gap-1 text-txtmuted text-xs">
                <Percent className="w-3.5 h-3.5 text-txtmuted" />
                <span>{t("db_profit_percentage")}</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Percent className="w-6 h-6" />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Head */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-txtmain">{t("db_title")}</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-x-3.5 gap-y-1 mt-1">
            <p className="text-txtmuted text-sm">{t("db_subtitle")}</p>
            <span className="hidden sm:inline text-txtmuted/30">•</span>
            <p className="text-[11px] text-indigo-500 dark:text-indigo-400 font-medium flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-pulse" />
              {language === "ar" 
                ? "يمكنك ترتيب مربعات الأداء بالسحب والإفلات أو تخصيصها عبر لوحة التحكم!" 
                : "Drag/drop widgets or customize them from the settings block below!"}
            </p>
          </div>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5 border border-emerald-100 dark:border-emerald-900/30">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          {t("db_isolated_secured")}
        </div>
      </div>

      {/* Widget Customizer Control Panel */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/65 dark:border-slate-800/80 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button 
            onClick={() => setCustomizeOpen(!customizeOpen)}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-500" />
            <span>{language === "ar" ? "تخصيص ترتيب وظهور المربعات" : "Customize Widget Layout & Presence"}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${customizeOpen ? "rotate-180" : ""}`} />
          </button>

          <button 
            type="button"
            onClick={resetWidgetsToDefault}
            className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{language === "ar" ? "إعادة تعيين للمظهر الافتراضي" : "Reset Layout to Defaults"}</span>
          </button>
        </div>

        {customizeOpen && (
          <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800 space-y-4">
            <div>
              <h4 className="text-xs font-bold text-txtmain mb-1.5">{language === "ar" ? "1. حدد مربعات الأداء النشطة لتظهر أو تختفي:" : "1. Toggle Active KPI Widgets:"}</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: "revenue", label: language === "ar" ? "إجمالي الإيرادات" : "Total Revenue" },
                  { id: "costs", label: language === "ar" ? "إجمالي التكاليف" : "Total Costs" },
                  { id: "net_profit", label: language === "ar" ? "صافي الأرباح" : "Net Profit" },
                  { id: "profit_margin", label: language === "ar" ? "هامش التشغيل" : "Operating Margin" },
                ].map((item) => {
                  const isActive = visibleWidgets[item.id] !== false;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleWidgetVisibility(item.id)}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold justify-between transition cursor-pointer ${
                        isActive 
                          ? "bg-indigo-50/70 border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900/50 dark:text-indigo-300"
                          : "bg-white border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700"
                      }`}
                    >
                      <span>{item.label}</span>
                      {isActive ? (
                        <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-txtmain mb-1.5">
                {language === "ar" ? "2. التحكم بالترتيب الحالي للودجات (اسحب وأفلت المربعات أو اضغط الأسهم للترتيب الفوري):" : "2. Set sequence order (Drag directly or tap arrow button controls):"}
              </h4>
              <div className="flex flex-wrap gap-2">
                {order.map((widgetId, index) => {
                  const label = widgetId === "revenue" ? (language === "ar" ? "إجمالي الإيرادات" : "Total Revenue")
                    : widgetId === "costs" ? (language === "ar" ? "إجمالي التكاليف" : "Total Costs")
                    : widgetId === "net_profit" ? (language === "ar" ? "صافي الأرباح" : "Net Profit")
                    : (language === "ar" ? "هامش التشغيل" : "Operating Margin");
                  const isVisible = visibleWidgets[widgetId] !== false;

                  return (
                    <div 
                      key={widgetId}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium ${
                        isVisible 
                          ? "bg-white border-slate-250 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                          : "bg-slate-100 border-slate-200 text-slate-400 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-500 line-through"
                      }`}
                    >
                      <GripVertical className="w-3.5 h-3.5 text-slate-400 cursor-move shrink-0" />
                      <span className="truncate max-w-[120px]">{label}</span>
                      
                      <div className="flex items-center gap-0.5 border-r border-slate-205 dark:border-slate-700 pr-1.5 mr-0.5">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleArrowMove(index, "left")}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md text-slate-400 hover:text-slate-600 disabled:opacity-30 cursor-pointer"
                          title={language === "ar" ? "تحريك لليمين" : "Move Left"}
                        >
                          <ArrowRight className="w-3 h-3 rotate-180 rtl:rotate-0" />
                        </button>
                        <button
                          type="button"
                          disabled={index === order.length - 1}
                          onClick={() => handleArrowMove(index, "right")}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md text-slate-400 hover:text-slate-600 disabled:opacity-30 cursor-pointer"
                          title={language === "ar" ? "تحريك لليسار" : "Move Right"}
                        >
                          <ArrowLeft className="w-3 h-3 rotate-180 rtl:rotate-0" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      {widgetList.length === 0 ? (
        <div className="bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 p-8 rounded-2xl text-center">
          <Sliders className="w-8 h-8 mx-auto text-slate-400 mb-2 animate-pulse" />
          <h3 className="text-sm font-bold text-txtmain">{language === "ar" ? "جميع الودجات مخفية حالياً" : "All Widgets are Hidden"}</h3>
          <p className="text-xs text-txtmuted mt-1">{language === "ar" ? "بإمكانك إعادة تفعيلها مجدداً عبر الضغط على تخصيص ترتيب المربعات بالأعلى." : "Toggle them back on from customization drawer above."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
          {widgetList.map((widgetId, index) => (
            <div
              key={widgetId}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`relative group transition-all duration-200 cursor-grab active:cursor-grabbing hover:scale-[1.01] hover:shadow-md rounded-2xl ${
                draggedIdx === index 
                  ? "opacity-30 border-2 border-dashed border-indigo-500 scale-95" 
                  : ""
              }`}
            >
              {/* Grip handle indicator appearing beautifully on hover */}
              <div className={`absolute top-3 ${language === "ar" ? "left-3" : "right-3"} opacity-0 group-hover:opacity-60 duration-200 text-txtmuted pointer-events-none z-10`}>
                <GripVertical className="w-4 h-4" />
              </div>
              {renderKpiWidget(widgetId)}
            </div>
          ))}
        </div>
      )}

      {/* Invoice Overview cards (Unpaid vs Paid vs Overdue Alerts) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Paid Money Metric */}
        <div className="bg-slate-900 dark:bg-cardbk dark:border-borderline text-white p-6 rounded-2xl shadow-sm border border-slate-850 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-slate-400 dark:text-txtmuted text-xs font-medium">{t("db_paid_settled")}</p>
            <h4 className="text-xl font-bold mt-1 text-slate-100 dark:text-indigo-400">{stats.paidAmount.toLocaleString()} {companyCurrency}</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">{t("db_deposited_cash")}</p>
          </div>
        </div>

        {/* Unpaid Money Metric */}
        <div className="bg-cardbk p-6 rounded-2xl shadow-sm border border-borderline flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-appbk text-txtmuted flex items-center justify-center shrink-0">
            <Clock className="w-5.5 h-5.5 text-indigo-500 font-bold" />
          </div>
          <div>
            <p className="text-txtmuted text-xs font-medium">{t("db_unpaid_invoices")}</p>
            <h4 className="text-xl font-bold mt-1 text-txtmain">{stats.unpaidAmount.toLocaleString()} {companyCurrency}</h4>
            <p className="text-[10px] text-txtmuted mt-0.5">{t("db_unreceived_notes")}</p>
          </div>
        </div>

        {/* Overdue alert indicator */}
        <div className={`p-6 rounded-2xl shadow-sm flex items-center gap-4 border ${stats.overdueCount > 0 ? "bg-amber-500/10 border-amber-500/30 text-amber-500" : "bg-teal-500/10 border-teal-500/20 text-teal-600"}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${stats.overdueCount > 0 ? "bg-amber-500 text-white animate-bounce" : "bg-teal-500 text-white"}`}>
            {stats.overdueCount > 0 ? <AlertTriangle className="w-5.5 h-5.5" /> : <CheckCircle2 className="w-5.5 h-5.5" />}
          </div>
          <div>
            <p className="text-xs font-medium opacity-85">{t("db_overdue_alerts")}</p>
            <h4 className="text-xl font-bold mt-1">{stats.overdueCount} {language === "ar" ? "فواتير" : "Invoices"}</h4>
            <p className="text-[10px] opacity-75 mt-0.5">
              {stats.overdueCount > 0 
                ? (language === "ar" ? "تتطلب إجراء ومتابعة سريعة مع العملاء" : "Urgent payment tracking or customer alerts needed") 
                : (language === "ar" ? "جميع الفواتير معتمدة وضمن فترة السداد المسموحة" : "All active unpaid invoices are within correct terms")}
            </p>
          </div>
        </div>

      </div>

      {/* Monthly Revenue Trend (Recharts Area Chart) */}
      <div className="bg-cardbk p-6 rounded-2xl shadow-sm border border-borderline">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="text-start">
            <h4 className="text-lg font-bold text-txtmain">
              {language === "ar" ? "منحنى نمو الإيرادات والأرباح الشهري" : "Monthly Revenue & Profits Growth Trend"}
            </h4>
            <p className="text-xs text-txtmuted mt-1">
              {language === "ar" ? "تحليل اتجاه التدفقات المالية وتراكم الأرباح المكتسبة على مدار الأشهر" : "Visualizing accumulated cash inflows and net earnings across operational months"}
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-appbk px-3.5 py-2 rounded-xl border border-borderline">
            <div className="flex items-center gap-1.5 text-xs text-txtmain font-medium">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primaryColor }} />
              <span>{language === "ar" ? "إجمالي الإيرادات" : "Total Revenue"}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-txtmain font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>{language === "ar" ? "صافي الربح" : "Net Profit"}</span>
            </div>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={monthlyData}
              margin={{ top: 15, right: 10, left: -10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borderline, #e2e8f0)" vertical={false} />
              <XAxis 
                dataKey="month" 
                tickLine={false} 
                axisLine={false}
                tick={{ fill: 'currentColor', fontSize: 10 }}
                className="text-txtmuted"
              />
              <YAxis 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(value) => `${value.toLocaleString()}`}
                tick={{ fill: 'currentColor', fontSize: 10 }}
                className="text-txtmuted"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--color-cardbk, #ffffff)', 
                  borderColor: 'var(--color-borderline, #e2e8f0)',
                  borderRadius: '12px',
                  fontSize: '11px',
                  color: 'var(--color-txtmain, #1e293b)',
                  textAlign: language === "ar" ? "right" : "left"
                }}
                formatter={(value: any, name: string) => {
                  const formattedVal = `${Number(value).toLocaleString()} ${companyCurrency}`;
                  const label = name === "revenue" 
                    ? (language === "ar" ? "الإيرادات" : "Revenue")
                    : (language === "ar" ? "الأرباح" : "Profit");
                  return [formattedVal, label];
                }}
                labelFormatter={(label) => `${language === "ar" ? "فترة: " : "Period: "} ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke={primaryColor} 
                strokeWidth={3.5}
                dot={{ r: 4, stroke: primaryColor, strokeWidth: 1.5, fill: "#fff" }}
                activeDot={{ r: 7 }}
                name="revenue"
              />
              <Line 
                type="monotone" 
                dataKey="profit" 
                stroke="#10b981" 
                strokeWidth={3}
                dot={{ r: 4, stroke: "#10b981", strokeWidth: 1.5, fill: "#fff" }}
                activeDot={{ r: 7 }}
                name="profit"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Custom Interactive SVG Chart (Income comparison) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-8 flex flex-col justify-between">
          <div>
            <h4 className="text-lg font-bold text-slate-800">{language === "ar" ? "التحليل البياني للخدمات والأرباح" : "Service Earnings & Net Profits Chart"}</h4>
            <p className="text-xs text-slate-400 mt-1">{language === "ar" ? "عرض مقارنة التكلفة مقابل الإيراد وصافي الأرباح لمختلف عمليات الشركة" : "Comparison chart of production cost versus client billing revenue"}</p>
          </div>

          {/* SVG Vector Chart Area */}
          <div className="my-6 min-h-[220px] flex items-end justify-between px-2 sm:px-6 py-4 border-b border-l border-slate-100 gap-2 sm:gap-4 overflow-x-auto">
            {operations.length === 0 ? (
              <div className="w-full text-center py-12 text-slate-400 text-sm">
                {language === "ar" ? "لا توجد عمليات كافية لتمثيل المخطط البياني. قم بإضافة عمليات جديدة للبدء." : "No operations cataloged yet to construct visual metric diagrams."}
              </div>
            ) : (
              operations.map((op, idx) => {
                const maxVal = Math.max(...operations.map(o => Math.max(o.revenue, o.cost, 1)));
                const revHeight = `${Math.max(10, (op.revenue / maxVal) * 160)}px`;
                const costHeight = `${Math.max(5, (op.cost / maxVal) * 160)}px`;

                return (
                  <div key={op.id} className="flex flex-col items-center flex-1 min-w-[60px] group relative">
                    {/* Tooltip on hovering */}
                    <div className="absolute bottom-full mb-2 bg-slate-850 text-white text-[10px] py-1.5 px-2.5 rounded shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 w-32 text-start">
                      <p className="font-bold border-b border-slate-700 pb-1 mb-1 truncate">{op.service}</p>
                      <p className="text-emerald-300">{language === "ar" ? "الإيراد:" : "Revenue:"} {op.revenue.toLocaleString()} {companyCurrency}</p>
                      <p className="text-rose-300">{language === "ar" ? "التكلفة:" : "Cost:"} {op.cost.toLocaleString()} {companyCurrency}</p>
                      <p className="text-indigo-300 font-medium">{language === "ar" ? "الربح:" : "Profit:"} {op.profit.toLocaleString()} {companyCurrency}</p>
                    </div>

                    <div className="flex items-end gap-1 mb-3">
                      {/* Revenue Bar */}
                      <div 
                        style={{ height: revHeight }} 
                        className="w-4 bg-emerald-500 rounded-t-md hover:bg-emerald-600 transition-all cursor-pointer relative"
                        title={`Revenue: ${op.revenue}`}
                      />
                      {/* Cost Bar */}
                      <div 
                        style={{ height: costHeight }} 
                        className="w-4 bg-rose-500 rounded-t-md hover:bg-rose-600 transition-all cursor-pointer relative"
                        title={`Cost: ${op.cost}`}
                      />
                    </div>

                    <p className="text-[10px] text-slate-500 text-center font-medium truncate w-full max-w-[70px]">
                      {op.service}
                    </p>
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                      {op.date.substring(5)}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {/* Chart Legends */}
          <div className="flex justify-center gap-6 text-xs text-slate-500 font-medium pt-2">
            <div className="flex items-center gap-2">
              <span className="w-3" style={{ height: "12px", backgroundColor: "#10b981", borderRadius: "2px" }} />
              <span>{language === "ar" ? "الإيرادات الكلية" : "Total Gross Inflow"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3" style={{ height: "12px", backgroundColor: "#f43f5e", borderRadius: "2px" }} />
              <span>{language === "ar" ? "التكاليف والأعباء" : "Total Direct Outflow"}</span>
            </div>
          </div>
        </div>

        {/* Overdue alert panel list */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-slate-800">{language === "ar" ? "إجراءات المتابعة العاجلة" : "Urgent Cash Collections"}</h4>
              <span className="bg-red-50 text-red-700 text-[11px] px-2 py-0.5 rounded font-black">{language === "ar" ? "هام" : "ALERT"}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">{t("db_overdue_subtitle")}</p>
          </div>

          <div className="my-4 flex-1 space-y-3 max-h-[240px] overflow-y-auto pr-1">
            {overdueInvoices.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8 text-slate-400">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
                <p className="text-xs">{t("db_no_overdue")}</p>
              </div>
            ) : (
              overdueInvoices.map(inv => (
                <div key={inv.id} className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-100 flex flex-col justify-between gap-2 text-slate-700 text-start">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">{language === "ar" ? "متأخرة" : "Overdue"}</span>
                      <h5 className="text-xs font-bold text-slate-800 mt-1.5">{getClientName(inv.client_id)}</h5>
                      <p className="text-[10px] text-slate-500 mt-0.5">{language === "ar" ? "كود الفاتورة:" : "Invoice Reference:"} <span className="font-mono text-[9px]">{inv.id.substring(0, 10)}...</span></p>
                    </div>
                    <div className="text-end">
                      <span className="text-slate-900 font-bold text-xs pl-1">{inv.amount.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-500">{companyCurrency}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] border-t border-amber-100/60 pt-2 mt-1">
                    <span className="text-rose-600 font-medium">{language === "ar" ? "تاريخ الاستحقاق:" : "Deadline:"} {inv.due_date}</span>
                    <button 
                      onClick={() => onToggleInvoice(inv.id, "Unpaid")}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-[9px] px-2.5 py-1 rounded-md transition-colors font-semibold"
                    >
                      {language === "ar" ? "تسجيل كمدفوعة" : "Mark Paid"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] text-slate-500 leading-normal">
            {language === "ar" ? (
              <>تاريخ اليوم في النظام: <strong>2026-06-12</strong>. تحتسب الفواتير متأخرة السداد إذا كانت غير مدفوعة وتاريخ استحقاقها يسبق تاريخ اليوم.</>
            ) : (
              <>System date: <strong>2026-06-12</strong>. Receivables are cataloged aged/overdue once they exceed their respective credit periods.</>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
