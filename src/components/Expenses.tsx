import React, { useState, useEffect, useMemo } from "react";
import { Expense } from "../types";
import {
  Coins,
  Plus,
  Trash2,
  Calendar,
  Home,
  UserCheck,
  Cloud,
  Zap,
  Megaphone,
  Briefcase,
  Search,
  DollarSign,
  TrendingDown,
  Info,
  Paperclip
} from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";
import { motion } from "motion/react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface ExpensesProps {
  companyCurrency?: string;
  selectedCompanyId: string;
  onRefreshStats: () => void;
}

export default function Expenses({
  companyCurrency = "ر.س",
  selectedCompanyId,
  onRefreshStats
}: ExpensesProps) {
  const { language, t } = useLanguage();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Budget feature states
  const [activeTab, setActiveTab] = useState<"ledger" | "budgets">("ledger");
  const [budgets, setBudgets] = useState<any[]>([]);
  const [selectedBudgetMonth, setSelectedBudgetMonth] = useState(() => new Date().toISOString().substring(0, 7));
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState<string>("");

  // Form states
  const [category, setCategory] = useState("rent");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<"weekly" | "monthly" | "yearly" | "once">("monthly");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Filter state
  const [search, setSearch] = useState("");

  const getHeaders = () => {
    return {
      "Content-Type": "application/json",
      "x-company-id": selectedCompanyId
    };
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/expenses", { headers: getHeaders() });
      if (!res.ok) throw new Error("تعذر تحميل المصروفات");
      const data = await res.json();
      setExpenses(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(language === "ar" ? "فشل قراءة المصروفات التشغيلية" : "Failed to load operational expenses");
    } finally {
      setLoading(false);
    }
  };

  const fetchBudgets = async () => {
    try {
      const res = await fetch("/api/budgets", { headers: getHeaders() });
      if (!res.ok) throw new Error("تعذر تحميل الميزانيات");
      const data = await res.json();
      setBudgets(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSaveBudget = async (categoryKey: string, limitAmount: number) => {
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          category: categoryKey,
          limit_amount: limitAmount,
          month: selectedBudgetMonth
        })
      });
      if (!res.ok) throw new Error("فشل الحفظ");
      setSuccessMsg(language === "ar" ? "تم تحديث الميزانية بنجاح" : "Budget updated successfully");
      await fetchBudgets();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(language === "ar" ? "فشل حفظ الميزانية" : "Failed to save budget");
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchBudgets();
  }, [selectedCompanyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setErrorMsg(language === "ar" ? "يرجى إدخال مبلغ صحيح أكبر من الصفر" : "Please input a positive non-zero amount");
      return;
    }

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          category,
          amount: Number(amount),
          frequency,
          date,
          description
        })
      });

      if (!res.ok) throw new Error("فشل الحفظ");

      // Reset form
      setAmount("");
      setDescription("");
      setDate(new Date().toISOString().split("T")[0]);

      setSuccessMsg(language === "ar" ? "تم تسجيل المصروف الدوري بنجاح" : "Operational expense recorded successfully");
      await fetchExpenses();
      onRefreshStats(); // Update dashboard values
    } catch (err: any) {
      console.error(err);
      setErrorMsg(language === "ar" ? "حدث خطأ أثناء حفظ المصروف" : "An error occurred while saving the expense");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(language === "ar" ? "هل أنت متأكد من حذف هذا المصروف التشغيلي؟" : "Are you sure you want to delete this operational expense?")) {
      return;
    }

    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: "DELETE",
        headers: getHeaders()
      });

      if (!res.ok) throw new Error("فشل الحذف");

      setSuccessMsg(language === "ar" ? "تم حذف المصروف بنجاح" : "Expense deleted successfully");
      await fetchExpenses();
      onRefreshStats(); // Update dashboard values
    } catch (err: any) {
      console.error(err);
      setErrorMsg(language === "ar" ? "حدث خطأ أثناء حذف المصروف" : "An error occurred while deleting the expense");
    }
  };

  // Get localized category name
  const getCategoryName = (cat: string) => {
    switch (cat) {
      case "rent":
        return t("exp_category_rent");
      case "salaries":
        return t("exp_category_salaries");
      case "office_supplies":
        return t("exp_category_office_supplies");
      case "subscriptions":
        return t("exp_category_subscriptions");
      case "utilities":
        return t("exp_category_utilities");
      case "marketing":
        return t("exp_category_marketing");
      default:
        return t("exp_category_other");
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "rent":
        return <Home className="w-4 h-4 text-amber-500" />;
      case "salaries":
        return <UserCheck className="w-4 h-4 text-emerald-500" />;
      case "office_supplies":
        return <Paperclip className="w-4 h-4 text-cyan-500" />;
      case "subscriptions":
        return <Cloud className="w-4 h-4 text-blue-500" />;
      case "utilities":
        return <Zap className="w-4 h-4 text-amber-400" />;
      case "marketing":
        return <Megaphone className="w-4 h-4 text-indigo-500" />;
      default:
        return <Briefcase className="w-4 h-4 text-slate-500" />;
    }
  };

  const getFrequencyName = (freq: string) => {
    switch (freq) {
      case "weekly":
        return t("exp_freq_weekly");
      case "yearly":
        return t("exp_freq_yearly");
      case "once":
        return t("exp_freq_once");
      default:
        return t("exp_freq_monthly");
    }
  };

  // Filter list
  const filtered = expenses.filter(exp => {
    const term = search.toLowerCase();
    const matchesDesc = (exp.description || "").toLowerCase().includes(term);
    const matchesCat = getCategoryName(exp.category).toLowerCase().includes(term);
    return matchesDesc || matchesCat;
  });

  // Monthly Recurring Burden Estimate
  const monthlyRecurringBurden = expenses.reduce((sum, exp) => {
    const amt = exp.amount;
    switch (exp.frequency) {
      case "weekly":
        return sum + amt * 4;
      case "monthly":
        return sum + amt;
      case "yearly":
        return sum + amt / 12;
      case "once":
        // Distribute manual one-time expenses over monthly estimate mildly or exclude based on taste
        return sum + amt / 12;
      default:
        return sum + amt;
    }
  }, 0);

  // Aggregated data for Pie Chart showing distribution per category
  const categorySummary = useMemo(() => {
    const summary: Record<string, number> = {};
    expenses.forEach((e) => {
      summary[e.category] = (summary[e.category] || 0) + Number(e.amount);
    });

    const totalAmount = Object.values(summary).reduce((a, b) => a + b, 0);

    const colors: Record<string, string> = {
      rent: "#eab308", // Yellow/Amber
      salaries: "#10b981", // Emerald
      office_supplies: "#06b6d4", // Cyan
      subscriptions: "#3b82f6", // Blue
      utilities: "#f97316", // Orange
      marketing: "#6366f1", // Indigo
      other: "#94a3b8" // Slate
    };

    return Object.entries(summary).map(([cat, val]) => ({
      name: getCategoryName(cat),
      category: cat,
      value: val,
      color: colors[cat] || "#94a3b8",
      percentage: totalAmount > 0 ? ((val / totalAmount) * 100).toFixed(1) : "0"
    })).sort((a, b) => b.value - a.value);
  }, [expenses, language]);

  // Actual spent per category for the selected budget month (YYYY-MM)
  const actualSpentByCategory = useMemo<Record<string, number>>(() => {
    const result: Record<string, number> = {};
    expenses.forEach((e) => {
      if (e.date && e.date.substring(0, 7) === selectedBudgetMonth) {
        result[e.category] = (result[e.category] || 0) + e.amount;
      }
    });
    return result;
  }, [expenses, selectedBudgetMonth]);

  // Budget limit per category for the selected budget month (YYYY-MM)
  const specifiedBudgetsByCategory = useMemo<Record<string, number>>(() => {
    const result: Record<string, number> = {};
    budgets.forEach((b) => {
      if (b.month === selectedBudgetMonth) {
        result[b.category] = Number(b.limit_amount);
      }
    });
    return result;
  }, [budgets, selectedBudgetMonth]);

  const totalBudgeted = useMemo<number>(() => {
    return (Object.values(specifiedBudgetsByCategory) as number[]).reduce((sum, val) => sum + val, 0);
  }, [specifiedBudgetsByCategory]);

  const totalSpentInMonth = useMemo<number>(() => {
    return (Object.values(actualSpentByCategory) as number[]).reduce((sum, val) => sum + val, 0);
  }, [actualSpentByCategory]);

  const overallProgressPercentage = useMemo(() => {
    if (totalBudgeted === 0) return 0;
    return Math.min(100, Math.round((totalSpentInMonth / totalBudgeted) * 100));
  }, [totalSpentInMonth, totalBudgeted]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-borderline pb-4">
        <div>
          <h2 className="text-2xl font-bold text-txtmain flex items-center gap-2">
            <Coins className="w-6 h-6 text-red-500" />
            {t("exp_title")}
          </h2>
          <p className="text-txtmuted text-sm mt-1 max-w-2xl">{t("exp_desc")}</p>
        </div>

        {/* Tab Switcher & Burden Counter Layout */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 border border-slate-200/50 dark:border-slate-700/50">
            <button
              onClick={() => {
                setActiveTab("ledger");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "ledger"
                  ? "bg-white dark:bg-slate-900 text-txtmain shadow-sm font-black"
                  : "text-txtmuted hover:text-txtmain"
              }`}
            >
              {language === "ar" ? "سجل المصروفات" : "Expenses Ledger"}
            </button>
            <button
              onClick={() => {
                setActiveTab("budgets");
                setErrorMsg("");
                setSuccessMsg("");
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "budgets"
                  ? "bg-white dark:bg-slate-900 text-txtmain shadow-sm font-black"
                  : "text-txtmuted hover:text-txtmain"
              }`}
            >
              {language === "ar" ? "الميزانيات والتقدم" : "Monthly Budgets & Progress"}
            </button>
          </div>

          <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 px-4 py-2 rounded-xl border border-rose-100 dark:border-rose-900/35 flex items-center gap-2 text-xs">
            <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <div>
              <span className="text-[9px] uppercase font-bold text-rose-500/90 tracking-wider block">
                {t("exp_total_monthly_recurring")}
              </span>
              <p className="font-extrabold leading-none">
                {monthlyRecurringBurden.toLocaleString("ar-SA", { maximumFractionDigits: 1 })}{" "}
                <span className="text-[10px] font-normal">{companyCurrency}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Instant Success / Error Banners */}
      {successMsg && (
        <div className="p-4 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <span>✓ {successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-rose-600 text-white rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <span>{errorMsg}</span>
        </div>
      )}

      {activeTab === "ledger" ? (
        /* Main Grid Content */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Record Expense Form Block */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-cardbk rounded-2xl border border-borderline p-6 space-y-4">
            <h3 className="font-bold text-md text-txtmain border-b border-borderline pb-2">
              {t("exp_add_title")}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-start">
              {/* Category */}
              <div>
                <label className="block text-txtmain text-xs font-bold mb-1.5">
                  {t("exp_category_label")}
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-appbk border border-borderline text-txtmain rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition-colors"
                >
                  <option value="rent">{t("exp_category_rent")}</option>
                  <option value="salaries">{t("exp_category_salaries")}</option>
                  <option value="office_supplies">{t("exp_category_office_supplies")}</option>
                  <option value="subscriptions">{t("exp_category_subscriptions")}</option>
                  <option value="utilities">{t("exp_category_utilities")}</option>
                  <option value="marketing">{t("exp_category_marketing")}</option>
                  <option value="other">{t("exp_category_other")}</option>
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-txtmain text-xs font-bold mb-1.5">
                  {t("exp_amount_label")} ({companyCurrency})
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full bg-appbk border border-borderline text-txtmain rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition-colors placeholder-slate-400"
                  required
                  min="1"
                  step="any"
                />
              </div>

              {/* Recurrence Periodicity */}
              <div>
                <label className="block text-txtmain text-xs font-bold mb-1.5">
                  {t("exp_frequency_label")}
                </label>
                <select
                  value={frequency}
                  onChange={e => setFrequency(e.target.value as any)}
                  className="w-full bg-appbk border border-borderline text-txtmain rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition-colors"
                >
                  <option value="weekly">{t("exp_freq_weekly")}</option>
                  <option value="monthly">{t("exp_freq_monthly")}</option>
                  <option value="yearly">{t("exp_freq_yearly")}</option>
                  <option value="once">{t("exp_freq_once")}</option>
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-txtmain text-xs font-bold mb-1.5">
                  {t("exp_date_label")}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-appbk border border-borderline text-txtmain rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-600 transition-colors"
                  required
                />
              </div>

              {/* Description Statement */}
              <div>
                <label className="block text-txtmain text-xs font-bold mb-1.5">
                  {t("exp_desc_label")}
                </label>
                <textarea
                  placeholder={t("exp_desc_placeholder")}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-appbk border border-borderline text-txtmain rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-600 transition-colors placeholder-slate-400 h-20 resize-none text-start"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/10 transition-colors disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                {saving ? (language === "ar" ? "تسجيل..." : "Recording...") : t("exp_submit_btn")}
              </button>
            </form>
          </div>

          {/* Categorized Expense Distribution Pie Chart */}
          <div className="bg-cardbk rounded-2xl border border-borderline p-6 space-y-4">
            <h3 className="font-bold text-sm text-txtmain border-b border-borderline pb-2.5">
              {language === "ar" ? "تحليل توزيع المصروفات التشغيلية" : "Operational Expenses Breakdown"}
            </h3>

            {expenses.length === 0 ? (
              <div className="py-12 text-center text-txtmuted">
                <p className="text-xs">{language === "ar" ? "لا توجد مصروفات مسجلة لعرض التوزيع البياني حالياً." : "No recorded expenses to display visual distribution yet."}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Recharts Pie Donut */}
                <div className="h-[180px] w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categorySummary}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categorySummary.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`${Number(value).toLocaleString()} ${companyCurrency}`, ""]}
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          borderColor: "#334155",
                          borderRadius: "12px",
                          color: "#f8fafc",
                          fontFamily: "inherit",
                          fontSize: "11px",
                          textAlign: language === "ar" ? "right" : "left"
                        }}
                        itemStyle={{ color: "#f8fafc" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Absolute Center Counter */}
                  <div className="absolute flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-[9px] text-txtmuted uppercase font-bold tracking-wider">
                      {language === "ar" ? "إجمالي المصاريف" : "Total Outflow"}
                    </span>
                    <span className="text-[13px] font-black text-txtmain font-sans mt-0.5">
                      {expenses.reduce((sum, e) => sum + Number(e.amount), 0).toLocaleString()}
                    </span>
                    <span className="text-[8.5px] text-txtmuted font-medium">
                      {companyCurrency}
                    </span>
                  </div>
                </div>

                {/* Elegant Custom Mini Table-Legend with Progress Bars */}
                <div className="space-y-2.5 pt-2 max-h-[220px] overflow-y-auto pr-1">
                  {categorySummary.map((entry) => (
                    <div key={entry.category} className="text-[11px] space-y-1 text-right select-none">
                      <div className="flex items-center justify-between font-medium">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                          <span className="text-txtmain font-bold text-xs">{entry.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-txtmuted font-mono text-[10.5px]">
                          <span>{entry.value.toLocaleString()} {companyCurrency}</span>
                          <span className="text-[9px] bg-sky-500/10 text-sky-500 dark:text-sky-400 font-bold px-1.5 py-0.5 rounded-md">
                            {entry.percentage}%
                          </span>
                        </div>
                      </div>
                      
                      {/* Interactive Visual Progress Bar */}
                      <div className="w-full bg-appbk border border-borderline/40 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${entry.percentage}%`, backgroundColor: entry.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Expenses List ledger Ledger Block */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-cardbk rounded-2xl border border-borderline p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-bold text-md text-txtmain">
                  {t("exp_ledger_title")}
                </h3>
              </div>

              {/* Quick Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute top-3 flex items-center left-3" />
                <input
                  type="text"
                  placeholder={t("exp_search_placeholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-appbk border border-borderline rounded-xl pl-9 pr-3.5 py-2 text-xs focus:outline-none focus:border-indigo-600 transition-colors placeholder-slate-400"
                />
              </div>
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                <div className="w-8 h-8 border-3 border-slate-200 border-t-rose-600 rounded-full animate-spin" />
                <p className="text-xs font-medium">{t("loading")}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 border-2 border-dashed border-borderline rounded-xl flex flex-col items-center justify-center text-txtmuted">
                <Coins className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
                <p className="text-xs font-semibold">{t("exp_no_expenses")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-borderline text-txtmuted">
                      <th className="py-3 px-4 font-bold text-start">{t("exp_col_category")}</th>
                      <th className="py-3 px-4 font-bold text-start">{t("exp_col_desc")}</th>
                      <th className="py-3 px-4 font-bold text-start">{t("exp_col_freq")}</th>
                      <th className="py-3 px-4 font-bold text-start">{t("exp_col_date")}</th>
                      <th className="py-3 px-4 font-bold text-start">{t("exp_col_amount")}</th>
                      <th className="py-3 px-4 font-bold text-center">{t("db_col_action")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borderline">
                    {filtered.map((exp) => (
                      <tr
                        key={exp.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"
                      >
                        {/* Category */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 font-bold text-txtmain">
                            <span className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0">
                              {getCategoryIcon(exp.category)}
                            </span>
                            <span>{getCategoryName(exp.category)}</span>
                          </div>
                        </td>

                        {/* Statement (Description) */}
                        <td className="py-3 px-4 max-w-[200px] truncate text-txtmuted font-medium">
                          {exp.description || "—"}
                        </td>

                        {/* Frequency */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                            exp.frequency === "once"
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                              : exp.frequency === "weekly"
                              ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400"
                              : "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400"
                          }`}>
                            {getFrequencyName(exp.frequency)}
                          </span>
                        </td>

                        {/* Rent/Outflow Date */}
                        <td className="py-3 px-4 whitespace-nowrap text-txtmuted font-mono">
                          {exp.date}
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-4 whitespace-nowrap font-black text-rose-600 dark:text-rose-400">
                          - {exp.amount.toLocaleString()} {companyCurrency}
                        </td>

                        {/* Action buttons */}
                        <td className="py-3 px-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleDelete(exp.id)}
                            className="p-1.5 text-txtmuted hover:text-red-600 dark:hover:text-red-400 bg-appbk hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                            title={t("delete")}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick Notice Card */}
          <div className="bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30 rounded-2xl p-4 flex gap-3 text-start">
            <Info className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
            <div className="text-xs">
              <h4 className="font-bold text-sky-800 dark:text-sky-300">
                {language === "ar" ? "تأثير المصروفات على الأرباح" : "Bottom-line Profit Impact"}
              </h4>
              <p className="text-sky-700/85 dark:text-sky-400/85 mt-1 leading-relaxed">
                {language === "ar"
                  ? "تُخصم هذه المصروفات المسجلة تلقائياً من 'صافي الأرباح التشغيلية' لتمنح الإدارة العليا وشركاء المنشأة رؤية واقعية ودقيقة لربحية الشركة وصافي هامش الربح بعد المصاريف الثابتة."
                  : "These entries are automatically subtracted from your Net Operating Profits, providing leadership and partners with a realistic accounting of cash-flow and net profit margin after fixed burden deduction."}
              </p>
            </div>
          </div>
        </div>
      </div>
      ) : (
        /* Intelligent Budgets View */
        <div className="space-y-6 animate-in fade-in duration-300 text-start">
          {/* Section Options / Selectors */}
          <div className="bg-cardbk border border-borderline p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="font-bold text-md text-txtmain">
                {language === "ar" ? "المراقبة الذكية لميزانيات الفئات" : "Category Budget Intelligence Tracker"}
              </h3>
              <p className="text-xs text-txtmuted mt-1 leading-relaxed">
                {language === "ar"
                  ? "حدد سقوفاً شهرية لكل فئة مصاريف لمقارنتها آلياً بالفواتير والمصروفات المسجلة فعلياً خلال الشهر المحدد لضبط الهدر المالي."
                  : "Specify monthly spending caps per expense category to automatically evaluate consumption rates vs actual outlays."}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-txtmuted">
                {language === "ar" ? "اختر الشهر المستهدف:" : "Select Target Month:"}
              </label>
              <input
                type="month"
                value={selectedBudgetMonth}
                onChange={(e) => {
                  setSelectedBudgetMonth(e.target.value);
                  setEditingCategory(null);
                }}
                className="bg-appbk border border-borderline text-txtmain text-xs font-bold rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Dynamic Months Summary Bento Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Total Budget Set */}
            <div className="bg-cardbk border border-borderline p-5 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-500/25">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-txtmuted font-bold block uppercase tracking-wider">
                  {language === "ar" ? "إجمالي الميزانية المحددة" : "Total Allocated Budget"}
                </span>
                <p className="text-xl font-black text-txtmain mt-1 font-mono">
                  {totalBudgeted.toLocaleString()} <span className="text-xs font-medium">{companyCurrency}</span>
                </p>
              </div>
            </div>

            {/* Card 2: Actual Spend this month */}
            <div className="bg-cardbk border border-borderline p-5 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400 border border-rose-500/25">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-txtmuted font-bold block uppercase tracking-wider">
                  {language === "ar" ? "إجمالي المصاريف الفعلية المسجلة" : "Total Outlays Spent"}
                </span>
                <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1 font-mono">
                  {totalSpentInMonth.toLocaleString()} <span className="text-xs font-medium">{companyCurrency}</span>
                </p>
                <span className="text-[9px] text-txtmuted font-medium">
                  {language === "ar" ? `في ${selectedBudgetMonth}` : `for ${selectedBudgetMonth}`}
                </span>
              </div>
            </div>

            {/* Card 3: Consumption Rate */}
            <div className="bg-cardbk border border-borderline p-5 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-500/25 shrink-0">
                <div className="text-sm font-black font-mono">{overallProgressPercentage}%</div>
              </div>
              <div className="flex-1 text-start">
                <span className="text-[10px] text-txtmuted font-bold block uppercase tracking-wider">
                  {language === "ar" ? "نسبة استهلاك الميزانية الكلية" : "Global Consumption Rate"}
                </span>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      overallProgressPercentage > 100
                        ? "bg-red-600"
                        : overallProgressPercentage > 85
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${overallProgressPercentage}%` }}
                  />
                </div>
                {totalBudgeted === 0 ? (
                  <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold block mt-1">
                    {language === "ar" ? "⚠️ حدد ميزانية لبعض الفئات لبدء الاحتساب" : "⚠️ Define budgets to start calculations"}
                  </span>
                ) : (
                  <span className="text-[9px] text-txtmuted font-medium block mt-1">
                    {language === "ar"
                      ? totalSpentInMonth > totalBudgeted 
                        ? "🛑 تجاوزت الميزانية الإجمالية لشهرك الحالي!"
                        : "✓ ضمن حدود السقف المصمم للميزانية الفخرية."
                      : totalSpentInMonth > totalBudgeted 
                        ? "🛑 You have exceeded global budget ceiling!"
                        : "✓ Safely within set monthly limits."}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Central Progress Table & Inline Limit Setters */}
          <div className="bg-cardbk rounded-2xl border border-borderline p-6 space-y-4">
            <h3 className="font-extrabold text-md text-txtmain border-b border-borderline pb-3">
              {language === "ar" ? `تحليل ومقارنة الفئات لشهر: (${selectedBudgetMonth})` : `Category Analytics & Targets for: (${selectedBudgetMonth})`}
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs border-collapse">
                <thead>
                  <tr className="border-b border-borderline text-txtmuted">
                    <th className="py-3 px-4 font-bold text-start">{language === "ar" ? "فئة المصروف" : "Expense Category"}</th>
                    <th className="py-3 px-4 font-bold text-start">{language === "ar" ? "سقف الميزانية" : "Budget Limit"}</th>
                    <th className="py-3 px-4 font-bold text-start">{language === "ar" ? "المصروف الفعلي" : "Actual Spent"}</th>
                    <th className="py-3 px-4 font-bold text-start">{language === "ar" ? "شريط وعاء الميزانية" : "Consumption Slider Bar"}</th>
                    <th className="py-3 px-4 font-bold text-center">{language === "ar" ? "الحالة والتقييم" : "Status Assessment"}</th>
                    <th className="py-3 px-4 font-bold text-center">{language === "ar" ? "إجراء ضبط الميزانية" : "Adjust Budget"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderline">
                  {["rent", "salaries", "office_supplies", "subscriptions", "utilities", "marketing", "other"].map((cat) => {
                    const limitVal = specifiedBudgetsByCategory[cat] || 0;
                    const spentVal = actualSpentByCategory[cat] || 0;
                    
                    let percent = 0;
                    if (limitVal > 0) {
                      percent = Math.round((spentVal / limitVal) * 100);
                    } else if (spentVal > 0) {
                      percent = 100;
                    }

                    // Compute Status Evaluation Badge
                    let bColor = "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300";
                    let bText = language === "ar" ? "غير محددة" : "Not Set";

                    if (limitVal > 0) {
                      if (spentVal > limitVal) {
                        bColor = "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200/50";
                        bText = language === "ar" ? "⚠️ تجاوز ميزان" : "⚠️ Exceeded";
                      } else if (spentVal > limitVal * 0.85) {
                        bColor = "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200/50";
                        bText = language === "ar" ? "⚡ تحذير" : "⚡ Warning";
                      } else {
                        bColor = "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50";
                        bText = language === "ar" ? "✓ آمنة" : "✓ Safe";
                      }
                    } else if (spentVal > 0) {
                      bColor = "bg-red-50 dark:bg-red-950/45 text-red-600 dark:text-red-400 border border-red-300/40";
                      bText = language === "ar" ? "⚠️ هدر غير مخطط" : "⚠️ Unbudgeted Outflow";
                    }

                    return (
                      <tr key={cat} className="hover:bg-slate-50 dark:hover:bg-slate-800/10 transition-colors">
                        {/* Category Name & Color Icon */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 font-bold text-txtmain text-sm">
                            <span className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0">
                              {getCategoryIcon(cat)}
                            </span>
                            <span>{getCategoryName(cat)}</span>
                          </div>
                        </td>

                        {/* Budget Limit Amount */}
                        <td className="py-4 px-4 whitespace-nowrap text-txtmain font-bold">
                          {editingCategory === cat ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={editingAmount}
                                onChange={(e) => setEditingAmount(e.target.value)}
                                className="w-24 bg-appbk border border-borderline font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-600"
                                placeholder={language === "ar" ? "المبلغ" : "Limit"}
                                autoFocus
                              />
                            </div>
                          ) : (
                            <span className="font-mono">
                              {limitVal > 0 ? (
                                `${limitVal.toLocaleString()} ${companyCurrency}`
                              ) : (
                                <span className="text-txtmuted text-xs font-normal">
                                  {language === "ar" ? "غير محددة (0)" : "Not Allocated (0)"}
                                </span>
                              )}
                            </span>
                          )}
                        </td>

                        {/* Actual Spent */}
                        <td className="py-4 px-4 whitespace-nowrap font-black text-rose-500 dark:text-rose-400 font-mono">
                          {spentVal > 0 ? (
                            `- ${spentVal.toLocaleString()} ${companyCurrency}`
                          ) : (
                            <span className="text-txtmuted font-normal text-xs font-sans">—</span>
                          )}
                        </td>

                        {/* Progress slider visually */}
                        <td className="py-4 px-4 min-w-[150px] max-w-[250px]">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  limitVal === 0 
                                    ? spentVal > 0 ? "bg-red-500" : "bg-slate-200"
                                    : percent > 100 
                                    ? "bg-red-500" 
                                    : percent > 85 
                                    ? "bg-amber-400" 
                                    : "bg-emerald-500"
                                }`}
                                style={{ width: `${limitVal > 0 ? Math.min(100, percent) : spentVal > 0 ? 100 : 0}%` }}
                              />
                            </div>
                            <span className="font-mono text-[10px] font-bold text-txtmuted shrink-0 w-8 text-end">
                              {limitVal > 0 ? `${percent}%` : spentVal > 0 ? "⚠️" : "0%"}
                            </span>
                          </div>
                        </td>

                        {/* Evaluation Badge */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${bColor}`}>
                            {bText}
                          </span>
                        </td>

                        {/* Action buttons (Inline Save/Cancel) */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          {editingCategory === cat ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={async () => {
                                  await handleSaveBudget(cat, Number(editingAmount) || 0);
                                  setEditingCategory(null);
                                }}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all"
                              >
                                {language === "ar" ? "حفظ" : "Save"}
                              </button>
                              <button
                                onClick={() => setEditingCategory(null)}
                                className="px-2 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-txtmain rounded-lg text-xs font-bold transition-all"
                              >
                                {language === "ar" ? "إلغاء" : "Cancel"}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingCategory(cat);
                                setEditingAmount(limitVal ? String(limitVal) : "");
                              }}
                              className="px-3 py-1 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-txtmain hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg text-xs font-bold border border-borderline transition-all cursor-pointer"
                            >
                              {limitVal > 0 
                                ? language === "ar" ? "تحديث الحد" : "Edit Cap" 
                                : language === "ar" ? "تحديد سقف الميزانية" : "Set Limit"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
