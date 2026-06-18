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
  ChevronUp,
  Edit3,
  Target,
  Download,
  FileSpreadsheet,
  Printer,
  X
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

  // Selected planning year
  const [planningYear, setPlanningYear] = React.useState<number>(2026);

  // Compute actual results for the selected planning year
  const planningActuals = React.useMemo(() => {
    let yearRevenue = 0;
    let yearCost = 0;
    let yearProfit = 0;

    operations.forEach(op => {
      if (!op.date) return;
      const opYear = op.date.split("-")[0];
      if (opYear === planningYear.toString()) {
        yearRevenue += op.revenue || 0;
        yearCost += op.cost || 0;
        yearProfit += op.profit || 0;
      }
    });

    return {
      revenue: yearRevenue,
      cost: yearCost,
      profit: yearProfit
    };
  }, [operations, planningYear]);

  // Budget states for interactive inline forms
  const [isEditingPlanning, setIsEditingPlanning] = React.useState(false);
  const [revBudget, setRevBudget] = React.useState<number>(200000);
  const [costBudget, setCostBudget] = React.useState<number>(100000);
  const [profitBudget, setProfitBudget] = React.useState<number>(100000);
  const [isSavingPlanning, setIsSavingPlanning] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  // Sync inputs with currentCompany whenever it changes or editing is canceled
  React.useEffect(() => {
    if (currentCompany) {
      setRevBudget(currentCompany.annual_revenue_budget || 200000);
      setCostBudget(currentCompany.annual_cost_budget || 100000);
      setProfitBudget(currentCompany.annual_profit_budget || 100000);
    }
  }, [currentCompany, isEditingPlanning]);

  const handleSavePlanning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || !onUpdateCompany) return;

    setIsSavingPlanning(true);
    setSaveSuccess(false);

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
          widget_order: currentCompany.widget_order || "",
          enable_due_email_notifications: currentCompany.enable_due_email_notifications || false,
          annual_revenue_budget: Number(revBudget),
          annual_cost_budget: Number(costBudget),
          annual_profit_budget: Number(profitBudget)
        })
      });

      if (res.ok) {
        const updated = await res.json();
        onUpdateCompany(updated);
        setSaveSuccess(true);
        setIsEditingPlanning(false);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        console.error("Failed to update annual budgets");
      }
    } catch (err) {
      console.error("Error saving annual planning:", err);
    } finally {
      setIsSavingPlanning(false);
    }
  };

  const [showReportPrintModal, setShowReportPrintModal] = React.useState(false);

  const handleExportCSV = () => {
    const targetRevenue = currentCompany?.annual_revenue_budget || 200000;
    const targetCost = currentCompany?.annual_cost_budget || 100000;
    const targetProfit = currentCompany?.annual_profit_budget || 100000;

    const actualRevenue = planningActuals.revenue;
    const actualCost = planningActuals.cost;
    const actualProfit = planningActuals.profit;

    const revenuePercent = targetRevenue > 0 ? Math.round((actualRevenue / targetRevenue) * 100) : 0;
    const costPercent = targetCost > 0 ? Math.round((actualCost / targetCost) * 100) : 0;
    const profitPercent = targetProfit > 0 ? Math.round((actualProfit / targetProfit) * 100) : 0;

    const revVariance = actualRevenue - targetRevenue;
    const costVariance = actualCost - targetCost;
    const profitVariance = actualProfit - targetProfit;

    const currency = currentCompany?.currency || "ر.س";
    const isArabic = language === "ar";

    // Define columns
    const headers = isArabic 
      ? ["البند المالي", "الميزانية المتوقعة (المستهدف السنوي)", "المحقق الفعلي المالي", "نسبة التحقيق / الاستهلاك", "الفارق المالي المتبقي", "العملة"]
      : ["Financial Metric", "Expected Annual Target", "Actual Realized Amount", "Completion / Consumption %", "Variance / Gap", "Currency"];

    const rows = [
      [
        isArabic ? "الإيرادات الإجمالية" : "Total Revenue Inflow",
        targetRevenue,
        actualRevenue,
        `${revenuePercent}%`,
        `${revVariance >= 0 ? "+" : ""}${revVariance}`,
        currency
      ],
      [
        isArabic ? "تكاليف ومصروفات التشغيل" : "Operating Outflows / Costs",
        targetCost,
        actualCost,
        `${costPercent}%`,
        costVariance > 0 ? (isArabic ? "تجاوز السقف!" : "Limit Exceeded!") : (isArabic ? "في الحدود الآمنة" : "Within Buffer"),
        currency
      ],
      [
        isArabic ? "صافي الأرباح الاستراتيجية" : "Strategic Net Profits",
        targetProfit,
        actualProfit,
        `${profitPercent}%`,
        `${profitVariance >= 0 ? "+" : ""}${profitVariance}`,
        currency
      ]
    ];

    // CSV format creation
    const csvContent = "\uFEFF" + [
      [isArabic ? `تقرير التخطيط المالي السنوي - سنة ${planningYear}` : `Annual Financial Planning Report - Year ${planningYear}`],
      [],
      headers,
      ...rows,
      [],
      [isArabic ? "ملاحظة: تم التصدير تلقائياً من نظام الإدارة المالية الذكي." : "Note: Auto-exported from the Intelligent Financial Portal."]
    ].map(e => e.map(val => {
      const cell = val === undefined || val === null ? "" : String(val);
      if (cell.includes(",") || cell.includes("\n") || cell.includes("\"")) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", isArabic ? `تقرير_التخطيط_المالي_السنوي_${planningYear}.csv` : `Annual_Financial_Planning_Report_${planningYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Write to audit log if possible
    if (currentCompany) {
      fetch("/api/audit-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-company-id": currentCompany.id
        },
        body: JSON.stringify({
          action: isArabic ? "تصدير تقرير التخطيط المالي CSV" : "Exported planning report to CSV",
          details: isArabic 
            ? `تم تصدير تقرير التخطيط المالي والميزانية للسنة المالية ${planningYear} كملف CSV بنجاح.`
            : `Successfully exported sheet financial planning figures for ${planningYear} to CSV file format.`
        })
      }).catch(err => console.warn(err));
    }
  };

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

  // Aggregate invoice payments into monthly values based on payment dates and amounts
  const monthlyInvoiceData = React.useMemo(() => {
    const monthsMap: { [key: string]: { month: string; rawMonth: string; totalPaid: number; totalUnpaid: number; count: number } } = {};
    
    invoices.forEach(inv => {
      // Use payment_date for paid invoices, fallback to due_date. Use due_date for unpaid.
      const dateToUse = inv.status === "Paid" ? (inv.payment_date || inv.due_date) : inv.due_date;
      if (!dateToUse) return;
      
      const dateParts = dateToUse.split("-");
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
            totalPaid: 0,
            totalUnpaid: 0,
            count: 0
          };
        }
        
        if (inv.status === "Paid") {
          monthsMap[key].totalPaid += inv.amount || 0;
        } else {
          monthsMap[key].totalUnpaid += inv.amount || 0;
        }
        monthsMap[key].count += 1;
      }
    });

    // Sort chronologically by rawMonth
    const sorted = Object.values(monthsMap).sort((a, b) => a.rawMonth.localeCompare(b.rawMonth));
    
    // Generate empty placeholders if no invoice data is available
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
          totalPaid: 0,
          totalUnpaid: 0,
          count: 0
        });
      }
    }
    
    return sorted;
  }, [invoices, language]);
  
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
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

        {/* Monthly Invoiced Revenue Trend (Recharts Line Chart from Invoices) */}
        <div className="bg-cardbk p-6 rounded-2xl shadow-sm border border-borderline">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="text-start">
              <h4 className="text-lg font-bold text-txtmain">
                {language === "ar" ? "تحليل نمو إيرادات الفواتير الشهري" : "Monthly Invoiced Revenue Trends"}
              </h4>
              <p className="text-xs text-txtmuted mt-1">
                {language === "ar" ? "تتبع الإيرادات المحصلة حركياً من الفواتير المدفوعة وغير المدفوعة" : "Tracking actual revenue realized from paid vs pending unpaid invoices over time"}
              </p>
            </div>
            
            <div className="flex items-center gap-4 bg-appbk px-3.5 py-2 rounded-xl border border-borderline">
              <div className="flex items-center gap-1.5 text-xs text-txtmain font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>{language === "ar" ? "إيرادات محصلة" : "Paid Invoices"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-txtmain font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <span>{language === "ar" ? "فواتير غير مدفوعة" : "Unpaid / Due"}</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={monthlyInvoiceData}
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
                    let label = "";
                    if (name === "totalPaid") {
                      label = language === "ar" ? "مقبوضات محصلة" : "Collected Revenue";
                    } else if (name === "totalUnpaid") {
                      label = language === "ar" ? "ذمم مستحقة" : "Pending Invoiced";
                    }
                    return [formattedVal, label];
                  }}
                  labelFormatter={(label) => `${language === "ar" ? "فترة: " : "Period: "} ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="totalPaid" 
                  stroke="#10b981" 
                  strokeWidth={3.5}
                  dot={{ r: 4, stroke: "#10b981", strokeWidth: 1.5, fill: "#fff" }}
                  activeDot={{ r: 7 }}
                  name="totalPaid"
                />
                <Line 
                  type="monotone" 
                  dataKey="totalUnpaid" 
                  stroke="#6366f1" 
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                  dot={{ r: 3, stroke: "#6366f1", strokeWidth: 1.5, fill: "#fff" }}
                  activeDot={{ r: 6 }}
                  name="totalUnpaid"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Annual Financial Planning & Comparison Module */}
      <div className="bg-cardbk p-6 rounded-2xl shadow-sm border border-borderline">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-borderline pb-4">
          <div className="text-start flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Target className="w-5.5 h-5.5" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-txtmain">
                {language === "ar" ? "التخطيط المالي السنوي المقارن" : "Annual Financial Planning & Target Comparison"}
              </h4>
              <p className="text-xs text-txtmuted mt-0.5">
                {language === "ar" 
                  ? "تحديد الميزانية السنوية المتوقعة ومواءمتها مع نتائج الأداء المالي والتحليل التنبئي المحقق حتى الآن" 
                  : "Compare strategic annual budget targets with live financial performance results."}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-start">
            <div className="flex items-center gap-2">
              <span className="text-xs text-txtmuted font-medium">
                {language === "ar" ? "السنة المالية:" : "Fiscal Year:"}
              </span>
              <select 
                value={planningYear}
                onChange={(e) => setPlanningYear(Number(e.target.value))}
                className="bg-appbk border border-borderline text-txtmain text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
              >
                {[2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {!isEditingPlanning ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-2.5 py-1.5 rounded-xl cursor-pointer shadow-xs transition"
                  title={language === "ar" ? "تصدير كملف CSV" : "Export as CSV"}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{language === "ar" ? "تصدير CSV" : "Export CSV"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowReportPrintModal(true)}
                  className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-750 text-white font-bold text-xs px-2.5 py-1.5 rounded-xl cursor-pointer shadow-xs transition"
                  title={language === "ar" ? "تصدير PDF للتوقيع والطباعة" : "Export as PDF Report"}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{language === "ar" ? "تحميل PDF" : "Export PDF"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditingPlanning(true)}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-txtmain font-bold text-xs px-3 py-1.5 rounded-xl cursor-pointer shadow-xs transition"
                >
                  <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{language === "ar" ? "تعديل الخطة" : "Edit Targets"}</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingPlanning(false)}
                className="text-xs text-txtmuted font-semibold hover:underline cursor-pointer"
              >
                {language === "ar" ? "إلغاء التعديل" : "Cancel"}
              </button>
            )}
          </div>
        </div>

        {isEditingPlanning ? (
          <form onSubmit={handleSavePlanning} className="space-y-6 animate-fadeIn text-start">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Revenue budget input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-txtmain flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  {language === "ar" ? "الميزانية السنوية المتوقعة للإيرادات" : "Expected Annual Revenue Target"}
                </label>
                <div className="relative rounded-xl shadow-xs col-span-3">
                  <input
                    type="number"
                    value={revBudget}
                    onChange={(e) => setRevBudget(Number(e.target.value) || 0)}
                    className="block w-full bg-appbk border border-borderline rounded-xl px-3.5 py-2.5 text-sm text-txtmain focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold pl-12"
                    placeholder="200,000"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <span className="text-txtmuted text-sm font-bold">{companyCurrency}</span>
                  </div>
                </div>
                <p className="text-[10px] text-txtmuted">
                  {language === "ar" 
                    ? "إجمالي المبيعات أو الإيرادات المستهدفة خلال العام المحدد" 
                    : "Total gross billings or earnings targeted across this fiscal period."}
                </p>
              </div>

              {/* Cost budget input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-txtmain flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                  {language === "ar" ? "الميزانية السنوية لتكاليف التشغيل" : "Expected Annual Outflow/Costs"}
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <input
                    type="number"
                    value={costBudget}
                    onChange={(e) => setCostBudget(Number(e.target.value) || 0)}
                    className="block w-full bg-appbk border border-borderline rounded-xl px-3.5 py-2.5 text-sm text-txtmain focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold pl-12"
                    placeholder="100,000"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <span className="text-txtmuted text-sm font-bold">{companyCurrency}</span>
                  </div>
                </div>
                <p className="text-[10px] text-txtmuted">
                  {language === "ar" 
                    ? "التكاليف والمصروفات الإجمالية المقدرة لتشغيل الأعمال كحد أقصى" 
                    : "Maximum direct operating overhead budget authorized."}
                </p>
              </div>

              {/* Profit budget input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-txtmain flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                  {language === "ar" ? "صافي الأرباح السنوية المستهدفة" : "Expected Annual Net Profit Target"}
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <input
                    type="number"
                    value={profitBudget}
                    onChange={(e) => setProfitBudget(Number(e.target.value) || 0)}
                    className="block w-full bg-appbk border border-borderline rounded-xl px-3.5 py-2.5 text-sm text-txtmain focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold pl-12"
                    placeholder="100,000"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <span className="text-txtmuted text-sm font-bold">{companyCurrency}</span>
                  </div>
                </div>
                <p className="text-[10px] text-txtmuted">
                  {language === "ar" 
                    ? "العائد الصافي المطلوب تحقيقه بعد طرح كافة تكاليف التشغيل" 
                    : "Residual profit margin goal in actual retained earnings."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-borderline">
              <button
                type="submit"
                disabled={isSavingPlanning}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-55 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-xs transition flex items-center gap-2 font-sans"
              >
                {isSavingPlanning ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : null}
                <span>{language === "ar" ? "حفظ وتثبيت الميزانيات" : "Save Financial Milestones"}</span>
              </button>
              
              <button
                type="button"
                onClick={() => setIsEditingPlanning(false)}
                className="px-4 py-2.5 rounded-xl border border-borderline bg-white hover:bg-slate-50 text-xs font-bold text-txtmuted transition dark:bg-slate-800 dark:hover:bg-slate-750 cursor-pointer"
              >
                {language === "ar" ? "تراجع" : "Cancel"}
              </button>
            </div>
          </form>
        ) : (
          (() => {
            const targetRevenue = currentCompany?.annual_revenue_budget || 200000;
            const targetCost = currentCompany?.annual_cost_budget || 100000;
            const targetProfit = currentCompany?.annual_profit_budget || 100000;

            const actualRevenue = planningActuals.revenue;
            const actualCost = planningActuals.cost;
            const actualProfit = planningActuals.profit;

            const revenuePercent = targetRevenue > 0 ? Math.round((actualRevenue / targetRevenue) * 100) : 0;
            const costPercent = targetCost > 0 ? Math.round((actualCost / targetCost) * 100) : 0;
            const profitPercent = targetProfit > 0 ? Math.round((actualProfit / targetProfit) * 100) : 0;

            const revVariance = actualRevenue - targetRevenue;
            const costVariance = actualCost - targetCost;
            const profitVariance = actualProfit - targetProfit;

            // Pro-rated target calculation (June 2026 is month 6 of 12)
            const elapsedRatio = planningYear < 2026 ? 1.0 : (planningYear > 2026 ? 0.0 : 6 / 12);
            const elapsedMonths = Math.round(elapsedRatio * 12);
            const proRatedProfitTarget = targetProfit * elapsedRatio;
            const onTrack = actualProfit >= proRatedProfitTarget;

            const diffPercent = targetProfit > 0 ? Math.round((Math.abs(actualProfit - proRatedProfitTarget) / targetProfit) * 100) : 0;
            
            let statusBadgeAr = "";
            let statusBadgeEn = "";
            let recommendationAr = "";
            let recommendationEn = "";
            let badgeColorClass = "";

            if (planningYear < 2026) {
              statusBadgeAr = "سنة مالية مكتملة 🔒";
              statusBadgeEn = "Fiscal Completed 🔒";
              badgeColorClass = "bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-350 border-slate-200 dark:border-slate-800";
              
              if (actualProfit >= targetProfit) {
                recommendationAr = `انتهت السنة بنجاح باهر مع تحقيق أرباح تفوق المستهدف الاستراتيجي بمقدار ${profitVariance.toLocaleString()} ${companyCurrency} (بزيادة بلغت +${profitPercent - 100}%). الأداء متفوق جداً!`;
                recommendationEn = `Year concluded successfully, beating goals by ${profitVariance.toLocaleString()} ${companyCurrency} (+${profitPercent - 100}% gain). High performance status.`;
              } else {
                recommendationAr = `انتهت السنة بمستوى أرباح يقل عن الخطة بمقدار ${Math.abs(profitVariance).toLocaleString()} ${companyCurrency} (بنسبة تحقيق بلغت ${profitPercent}%). ننصح بدراسة الفجوة.`;
                recommendationEn = `Year finished below profit targets by ${Math.abs(profitVariance).toLocaleString()} ${companyCurrency} (${profitPercent}% achieved). Analyze gaps to adjust current schemas.`;
              }
            } else if (planningYear > 2026) {
              statusBadgeAr = "تخطيط مستقبلي ⏳";
              statusBadgeEn = "Future Planning ⏳";
              badgeColorClass = "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30";
              recommendationAr = "ميزانية تقديرية ممتازة لدعم الخطوات التوسعية المستقبلية. بانتظار تدوير الأنشطة وبدء المعاملات المالية لتشغيل التحليل والمقارنة.";
              recommendationEn = "Proactive projections for future cycles. Calculations and smart predictive tracking will initiate during fiscal lifecycle activation.";
            } else {
              // Current planning year 2026
              if (onTrack) {
                statusBadgeAr = "متقدم على الخطة 📈";
                statusBadgeEn = "Ahead of Target 📈";
                badgeColorClass = "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30";
                recommendationAr = `أداء رائع! تحقق المنشأة صافي أرباح يتجاوز المستهدف التناسبي التراكمي لهذه الفترة من السنة (6 أشهر / 50%) بقيمة ${(actualProfit - proRatedProfitTarget).toLocaleString()} ${companyCurrency} (بفارق إيجابي +${diffPercent}%). نسير بثبات تام لتجاوز ميزانية العام! 🎉`;
                recommendationEn = `Excellent trajectory! The entity is generating profits exceeding pro-rated target milestones (6 mos / 50%) by ${(actualProfit - proRatedProfitTarget).toLocaleString()} ${companyCurrency} (+${diffPercent}% relative surplus). Well positioned to beat year goals! 🎉`;
              } else {
                statusBadgeAr = "متأخر عن الخطة 📉";
                statusBadgeEn = "Behind Target 📉";
                badgeColorClass = "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30";
                recommendationAr = `مستوى الأرباح يقل عن المستهدف التناسبي للمدة المنقضية (6 أشهر / 50%) بمقدار ${Math.abs(actualProfit - proRatedProfitTarget).toLocaleString()} ${companyCurrency} (فجوة -${diffPercent}%). ينصح بزيادة وتيرة تسليم العقود وتحصيل المستحقات لتعويض العجز. ⚖️`;
                recommendationEn = `Performance metrics currently trail behind pro-rated target values (6 mos / 50%) by ${Math.abs(actualProfit - proRatedProfitTarget).toLocaleString()} ${companyCurrency} (-${diffPercent}% gap). Rationalize expenses or expand pipeline values to re-align. ⚖️`;
              }
            }

            return (
              <div className="space-y-6 text-start animate-fadeIn">
                {/* 3 Metric cards for Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Revenue comparison block */}
                  <div className="bg-appbk rounded-2xl p-4 border border-borderline space-y-3.5 hover:shadow-sm duration-150">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-500 font-bold px-2 py-0.5 rounded-full">
                          {language === "ar" ? "قناة الإيرادات" : "Revenue Inflow"}
                        </span>
                        <h5 className="text-xs text-txtmuted mt-1.5">{language === "ar" ? "الإيرادات المحققة" : "Revenue Achieved"}</h5>
                        <h4 className="text-xl font-extrabold text-txtmain tracking-tight mt-0.5 font-mono">
                          {actualRevenue.toLocaleString()} <span className="text-xs font-normal text-txtmuted">{companyCurrency}</span>
                        </h4>
                      </div>
                      <div className="text-end">
                        <span className="text-[10px] text-txtmuted">{language === "ar" ? "المستهدف السنوي" : "Annual Goal"}</span>
                        <h4 className="text-xs font-bold text-txtmain mt-0.5 font-mono">
                          {targetRevenue.toLocaleString()} <span className="text-[10px] font-normal text-txtmuted">{companyCurrency}</span>
                        </h4>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-semibold">
                        <span className="text-txtmuted">{language === "ar" ? "نسبة تحقيق الميزانية" : "Completion Ratio"}</span>
                        <span className="text-emerald-500 font-bold font-mono">{revenuePercent}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-150 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${Math.min(100, revenuePercent)}%` }} 
                          className="h-full bg-emerald-500 rounded-full transition-all duration-350"
                        />
                      </div>
                    </div>

                    <div className="text-[10px] text-txtmuted flex justify-between">
                      <span>{language === "ar" ? "الفارق والمتبقي:" : "Target Variance:"}</span>
                      <span className={`font-bold font-mono ${revVariance >= 0 ? "text-emerald-500" : "text-amber-500"}`}>
                        {revVariance >= 0 ? "+" : ""}{revVariance.toLocaleString()} {companyCurrency}
                      </span>
                    </div>
                  </div>

                  {/* Cost comparison block */}
                  <div className="bg-appbk rounded-2xl p-4 border border-borderline space-y-3.5 hover:shadow-sm duration-150">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] bg-rose-500/10 text-rose-500 font-bold px-2 py-0.5 rounded-full">
                          {language === "ar" ? "فاتورة التكاليف" : "Operating Outflow"}
                        </span>
                        <h5 className="text-xs text-txtmuted mt-1.5">{language === "ar" ? "التكاليف الفعلية" : "Costs Incurred"}</h5>
                        <h4 className="text-xl font-extrabold text-txtmain tracking-tight mt-0.5 font-mono">
                          {actualCost.toLocaleString()} <span className="text-xs font-normal text-txtmuted">{companyCurrency}</span>
                        </h4>
                      </div>
                      <div className="text-end">
                        <span className="text-[10px] text-txtmuted">{language === "ar" ? "الحد السقف المعتمد" : "Ceiling Limit"}</span>
                        <h4 className="text-xs font-bold text-txtmain mt-0.5 font-mono">
                          {targetCost.toLocaleString()} <span className="text-[10px] font-normal text-txtmuted">{companyCurrency}</span>
                        </h4>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-semibold">
                        <span className="text-txtmuted">{language === "ar" ? "نسبة استهلاك المخصص" : "Resource Consumption"}</span>
                        <span className={`font-bold font-mono ${costPercent > 100 ? "text-rose-500 animate-pulse" : "text-rose-500"}`}>{costPercent}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-150 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${Math.min(100, costPercent)}%` }} 
                          className={`h-full rounded-full transition-all duration-350 ${costPercent > 100 ? "bg-rose-500" : "bg-rose-400"}`}
                        />
                      </div>
                    </div>

                    <div className="text-[10px] text-txtmuted flex justify-between">
                      <span>{language === "ar" ? "الفارق والمتبقي:" : "Budget Status:"}</span>
                      <span className={`font-bold font-mono ${costVariance > 0 ? "text-rose-500" : "text-emerald-500"}`}>
                        {costVariance > 0 ? language === "ar" ? "متجاوز سقف النفقات!" : "Limit Exceeded!" : language === "ar" ? "في الحدود الآمنة" : "Within Budget Buffer"}
                      </span>
                    </div>
                  </div>

                  {/* Net Profit comparison block */}
                  <div className="bg-appbk rounded-2xl p-4 border border-borderline space-y-3.5 hover:shadow-sm duration-150">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] bg-indigo-505/10 text-indigo-500 font-bold px-2 py-0.5 rounded-full">
                          {language === "ar" ? "العائد والمكاسب" : "Strategic Profits"}
                        </span>
                        <h5 className="text-xs text-txtmuted mt-1.5">{language === "ar" ? "الأرباح الفعلية" : "Actual Profits"}</h5>
                        <h4 className="text-xl font-extrabold text-txtmain tracking-tight mt-0.5 font-mono">
                          {actualProfit.toLocaleString()} <span className="text-xs font-normal text-txtmuted">{companyCurrency}</span>
                        </h4>
                      </div>
                      <div className="text-end">
                        <span className="text-[10px] text-txtmuted">{language === "ar" ? "الهدف الاستراتيجي" : "Annual Target"}</span>
                        <h4 className="text-xs font-bold text-txtmain mt-0.5 font-mono">
                          {targetProfit.toLocaleString()} <span className="text-[10px] font-normal text-txtmuted">{companyCurrency}</span>
                        </h4>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-semibold">
                        <span className="text-txtmuted">{language === "ar" ? "نسبة تحقيق الأرباح" : "Profit Target Achieved"}</span>
                        <span className="text-indigo-500 font-bold font-mono">{profitPercent}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-150 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${Math.min(100, profitPercent)}%` }} 
                          className="h-full bg-indigo-500 rounded-full transition-all duration-350"
                        />
                      </div>
                    </div>

                    <div className="text-[10px] text-txtmuted flex justify-between">
                      <span>{language === "ar" ? "الفارق التراكمي:" : "Target Discrepancy:"}</span>
                      <span className={`font-bold font-mono ${profitVariance >= 0 ? "text-emerald-500" : "text-amber-500"}`}>
                        {profitVariance >= 0 ? "+" : ""}{profitVariance.toLocaleString()} {companyCurrency}
                      </span>
                    </div>
                  </div>

                </div>

                {/* Intelligent Advisor Banner */}
                <div className="p-4 rounded-xl border border-borderline/80 bg-slate-50 dark:bg-slate-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-[80%] text-start">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-pulse" />
                      <h6 className="text-xs font-bold text-txtmain">
                        {language === "ar" ? "الذكاء التنبئي وتحليل الخطة التشغيلية" : "Predictive Analytics & Executive Guidance"}
                      </h6>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColorClass}`}>
                        {language === "ar" ? statusBadgeAr : statusBadgeEn}
                      </span>
                    </div>
                    <p className="text-[11px] text-txtmuted leading-relaxed">
                      {language === "ar" ? recommendationAr : recommendationEn}
                    </p>
                  </div>
                  
                  {/* Small Circular representation */}
                  <div className="shrink-0 flex items-center justify-center p-2 rounded-full bg-white dark:bg-slate-800 border border-borderline w-14 h-14 shadow-xs self-center">
                    <div className="text-center">
                      <p className="text-[11.5px] font-black text-indigo-500 font-mono leading-none">{profitPercent}%</p>
                      <p className="text-[8px] text-txtmuted font-medium mt-1 leading-none">{language === "ar" ? "أرباح" : "Profit"}</p>
                    </div>
                  </div>
                </div>

                {/* Sub-text notes regarding calculations */}
                <div className="text-[10px] text-txtmuted italic text-center">
                  {language === "ar" 
                    ? `* يتم بناء وتحليل التنبؤ بالسنة المالية 2026 بمعدل زمني تبلغ نسبته ${Math.round(elapsedRatio * 100)}% (مكافئ لـ ${elapsedMonths} أشهر من أصل 12 من الخطة السنوية الحالية).`
                    : `* Multi-factor forecasting is calibrated to a progress ratio of ${Math.round(elapsedRatio * 100)}% (pro-rated equivalent of ${elapsedMonths} parsed calendar months out of 12).`}
                </div>
              </div>
            );
          })()
        )}
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

      {/* Annual Financial Planning Report Printable Modal */}
      {showReportPrintModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-cardbk rounded-2xl max-w-4xl w-full my-8 border border-borderline shadow-2xl flex flex-col relative animate-fadeIn text-start">
            
            {/* Modal Header Controls (Hidden during print) */}
            <div id="invoice-customizer-panel" className="flex items-center justify-between p-4 border-b border-borderline bg-appbk rounded-t-2xl">
              <div className="flex items-center gap-2 text-indigo-500 font-bold">
                <Printer className="w-5 h-5" />
                <h4 className="text-md font-bold text-txtmain">
                  {language === "ar" ? "معاينة تقرير التخطيط المالي وطباعته" : "Financial Planning Report Print Preview"}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    window.print();
                    if (currentCompany) {
                      fetch("/api/audit-logs", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          "x-company-id": currentCompany.id
                        },
                        body: JSON.stringify({
                          action: language === "ar" ? "تصدير تقرير التخطيط المالي PDF" : "Exported planning report to PDF",
                          details: language === "ar"
                            ? `تصدير وطباعة تقرير التخطيط المالي المقارن للسنة المالية ${planningYear} بصيغة PDF.`
                            : `Successfully generated and printed comparative annual budget targets to A4 PDF document for fiscal year ${planningYear}.`
                        })
                      }).catch(err => console.warn(err));
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-750 text-white font-bold py-1.5 px-4 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>{language === "ar" ? "طباعة التقرير / حفظ PDF" : "Print / Save PDF"}</span>
                </button>
                <button
                  onClick={() => setShowReportPrintModal(false)}
                  className="p-1.5 text-txtmuted hover:text-txtmain hover:bg-borderline/30 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Hint alert (Hidden during print) */}
            <div id="invoice-close-button" className="p-3 bg-indigo-500/10 text-indigo-500 border-b border-indigo-500/20 text-xs flex items-center gap-2">
              <span className="font-extrabold flex shrink-0">💡 {language === "ar" ? "نصيحة الحفظ التلقائي:" : "PDF Saving Tip:"}</span>
              <p>
                {language === "ar"
                  ? "لحفظ التقرير كملف PDF رقمي دائم، يرجى اختيار 'الحفظ بتنسيق PDF' (Save as PDF) من وجهات الطابعة في قائمة الصفحة المنبثقة."
                  : "To download as a permanent digital PDF, simply select 'Save as PDF' from your native print settings window."}
              </p>
            </div>

            {/* A4 Report Area */}
            <div className="p-6 md:p-10 bg-slate-100 dark:bg-slate-900 flex-1 overflow-y-auto max-h-[75vh]">
              <div
                id="printable-report-area"
                className="bg-white p-8 md:p-12 rounded-xl border border-slate-200 text-right text-slate-900 leading-relaxed font-sans shadow-sm w-full max-w-3xl mx-auto"
                style={{ direction: language === "ar" ? "rtl" : "ltr" }}
              >
                {/* Printable Header Section */}
                <div className="pb-6 mb-6 border-b-2 border-indigo-600 flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      {currentCompany?.logo_url ? (
                        <img
                          src={currentCompany.logo_url}
                          alt={currentCompany?.name}
                          className="w-12 h-12 rounded-lg object-contain border border-slate-200 p-1 bg-white animate-fadeIn"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm uppercase shadow-sm"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {currentCompany ? currentCompany.name.substring(0, 1) : "F"}
                        </div>
                      )}
                      <div>
                        <h2 className="text-xl font-black text-slate-900 font-sans tracking-tight">
                          {currentCompany?.name || (language === "ar" ? "مجموعة منشآت الأعمال" : "Enterprise business group")}
                        </h2>
                        <span className="text-[10px] text-slate-400 font-mono tracking-wider block mt-0.5">
                          SYSTEM_LEDGER_AUDIT_STAMP
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-start sm:text-end">
                    <span className="bg-slate-100 text-slate-800 text-[9.5px] py-1 px-2.5 rounded-md font-bold inline-block border border-slate-200 uppercase tracking-wide">
                      {language === "ar" ? "تقرير تخطيط الميزانية السنوي" : "Annual Budget Performance Report"}
                    </span>
                    <h1 className="text-md font-black mt-2 text-slate-900">
                      {language === "ar" ? "السنة المالية:" : "Fiscal Year:"} {planningYear}
                    </h1>
                    <p className="text-[10px] text-slate-500 font-mono mt-1">
                      {language === "ar" ? "تاريخ الإصدار:" : "Date Generated:"} {new Date().toISOString().substring(0, 10)}
                    </p>
                  </div>
                </div>

                {/* Subtitle / Intro */}
                <div className="mb-6">
                  <p className="text-xs text-slate-600 leading-relaxed font-sans">
                    {language === "ar"
                      ? `تم إعداد وتدقيق هذا التقرير لتوضيح كفاءة مواءمة الأهداف المالية الإستراتيجية التي تم تحديدها كـميزانية سنوية متوقعة، ومقارنتها بنتائج الأداء المالي والعمليات الفعلية المحققة حتى تاريخ الاستحقاق الفعلي الحالي للعام المالي ${planningYear}.`
                      : `This formal statement evaluates compliance with strategic annual budget targets against real-time operational results achieved during fiscal period ${planningYear}.`}
                  </p>
                </div>

                {/* Primary Data Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden mb-8">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold text-[11px]">
                        <th className="py-3 px-4 text-start">{language === "ar" ? "البند المالي والهدف" : "Financial Target Metric"}</th>
                        <th className="py-3 px-4 text-center">{language === "ar" ? "الميزانية السنوية المستهدفة" : "Expected Budget"}</th>
                        <th className="py-3 px-4 text-center">{language === "ar" ? "المحقق الفعلي حركياً" : "Realized Actual"}</th>
                        <th className="py-3 px-4 text-center">{language === "ar" ? "معدل الإنجاز / الاستهلاك" : "Completion / Burn %"}</th>
                        <th className="py-3 px-4 text-end">{language === "ar" ? "الفارق والموثوقية" : "Variance & Accuracy"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                      {/* Revenue row */}
                      <tr className="hover:bg-slate-50">
                        <td className="py-3.5 px-4 font-bold text-slate-900 text-start">
                          {language === "ar" ? "إجمالي التدفقات والإيرادات" : "Gross Inflow / Revenue"}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono">
                          {(currentCompany?.annual_revenue_budget || 200000).toLocaleString()} {companyCurrency}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-emerald-700 font-bold">
                          {planningActuals.revenue.toLocaleString()} {companyCurrency}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                            planningActuals.revenue >= (currentCompany?.annual_revenue_budget || 200000)
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-indigo-50 text-indigo-800"
                          }`}>
                            {currentCompany?.annual_revenue_budget ? Math.round((planningActuals.revenue / currentCompany.annual_revenue_budget) * 100) : 0}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-end font-mono">
                          {planningActuals.revenue - (currentCompany?.annual_revenue_budget || 200000) >= 0 ? "+" : ""}
                          {(planningActuals.revenue - (currentCompany?.annual_revenue_budget || 200000)).toLocaleString()} {companyCurrency}
                        </td>
                      </tr>

                      {/* Cost row */}
                      <tr className="hover:bg-slate-50">
                        <td className="py-3.5 px-4 font-bold text-slate-900 text-start">
                          {language === "ar" ? "مصاريف وتكاليف التشغيل" : "Direct Overhead / Costs"}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono">
                          {(currentCompany?.annual_cost_budget || 100000).toLocaleString()} {companyCurrency}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-rose-700 font-bold">
                          {planningActuals.cost.toLocaleString()} {companyCurrency}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                            planningActuals.cost <= (currentCompany?.annual_cost_budget || 100000)
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}>
                            {currentCompany?.annual_cost_budget ? Math.round((planningActuals.cost / currentCompany.annual_cost_budget) * 100) : 0}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-end font-mono">
                          {(planningActuals.cost - (currentCompany?.annual_cost_budget || 100000)).toLocaleString()} {companyCurrency}
                        </td>
                      </tr>

                      {/* Profit row */}
                      <tr className="hover:bg-slate-50 bg-slate-50/50">
                        <td className="py-3.5 px-4 font-black text-slate-900 text-start">
                          {language === "ar" ? "صافي العمليات والأرباح الاستراتيجية" : "Strategic Net Operations Profit"}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold">
                          {(currentCompany?.annual_profit_budget || 100000).toLocaleString()} {companyCurrency}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-indigo-700 font-black">
                          {planningActuals.profit.toLocaleString()} {companyCurrency}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black ${
                            planningActuals.profit >= (currentCompany?.annual_profit_budget || 100000)
                              ? "bg-emerald-500 text-white"
                              : "bg-amber-500 text-white"
                          }`}>
                            {currentCompany?.annual_profit_budget ? Math.round((planningActuals.profit / currentCompany.annual_profit_budget) * 100) : 0}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-end font-mono font-black text-slate-900">
                          {planningActuals.profit - (currentCompany?.annual_profit_budget || 100000) >= 0 ? "+" : ""}
                          {(planningActuals.profit - (currentCompany?.annual_profit_budget || 100000)).toLocaleString()} {companyCurrency}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Analytical Commentary Section */}
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-start space-y-2 mb-8">
                  <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-2 h-2 rounded bg-indigo-500" />
                    {language === "ar" ? "التقرير والتحليل التوجيهي المالي" : "Executive Advisor Summary & Analysis"}
                  </h5>
                  <p className="text-[11.5px] text-slate-600 leading-relaxed">
                    {(() => {
                      const netVariance = planningActuals.profit - (currentCompany?.annual_profit_budget || 100000);
                      if (netVariance >= 0) {
                        return language === "ar"
                          ? `تحليل ممتاز: سجلت المنشأة أداءً متفوقاً متجاوزاً المبرمج للأهداف المالية بمعدل زيادة فائض يبلغ +${netVariance.toLocaleString()} ${companyCurrency}. الإيرادات تسير بمعدل نمو استثنائي مدعومة بكفاءة ترشيد المصاريف التشغيلية ضمن النطاق الآمن المعقول.`
                          : `Positive Appraisal: Net profits represent a healthy budget overflow of +${netVariance.toLocaleString()} ${companyCurrency}. Sales trajectory remains strong combined with highly optimized utility pricing protocols holding cost lines safe.`;
                      } else {
                        return language === "ar"
                          ? `تنبيه تخطيطي: يقل صافي الأرباح المحققة عن السقف السنوي بمقدار ${Math.abs(netVariance).toLocaleString()} ${companyCurrency}. يوصى الفريق بمراجعة هيكل تسعير الخدمات التنافسية أو تقليص النفقات الإدارية التشغيلية غير الضرورية خلال الأرباع القادمة للوصول للهدف.`
                          : `Budget Gap Noted: Net profits are currently short of the target margin by ${Math.abs(netVariance).toLocaleString()} ${companyCurrency}. Refined monitoring of direct variable overhead rates or upward adjustments to premium base services is advised.`;
                      }
                    })()}
                  </p>
                </div>

                {/* Signing and Stamp layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-8 border-t border-dashed border-slate-200">
                  <div className="text-start space-y-6">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">
                      {language === "ar" ? "[ إعداد وتدقيق الحسابات ]" : "[ Accountant audit signature ]"}
                    </span>
                    <div className="space-y-1">
                      <div className="border-b border-slate-300 w-44 h-8" />
                      <p className="text-[10px] text-slate-600">
                        {language === "ar" ? "مسؤول التقارير المالية والتحول الرقمي" : "Financial reporting & automation division"}
                      </p>
                    </div>
                  </div>

                  <div className="text-start space-y-6">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">
                      {language === "ar" ? "[ اعتماد الإدارة العليا والختم ]" : "[ Chief controller authorization stamp ]"}
                    </span>
                    <div className="space-y-1">
                      <div className="border-b border-slate-300 w-44 h-8" />
                      <p className="text-[10px] text-slate-600">
                        {language === "ar" ? "توقيع رئيس مجلس الإدارة / المدير المالي" : "Executive officer & controller board seal"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Secure footer stamp */}
                <div className="mt-10 text-center text-[10.5px] text-slate-400 font-mono border-t border-slate-100 pt-4 flex justify-between">
                  <span>SYSTEM_STATION_UID_SECURE</span>
                  <span>{language === "ar" ? "أوتوماكس - التقرير المالي الذكي الموحد" : "AutoMax - Intelligent Unified Financial System"}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer (Hidden during print) */}
            <div id="invoice-customizer-panel" className="p-4 bg-appbk border-t border-borderline rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={() => setShowReportPrintModal(false)}
                className="py-2 px-4 bg-transparent border border-borderline hover:bg-borderline/20 rounded-xl text-xs font-semibold text-txtmain transition cursor-pointer"
              >
                {language === "ar" ? "إغلاق المعاينة" : "Close Preview"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
