import React, { useState, useEffect } from "react";
import { FixedAsset } from "../types";
import { 
  PlusCircle, Search, Trash2, Calendar, DollarSign, Edit,
  TrendingDown, ShieldAlert, FileText, Sparkles, Building2,
  CalendarCheck, Wrench, Laptop, Car, Armchair, HelpCircle,
  Clock, CheckCircle, ChevronRight, PieChart, ShieldCheck, RefreshCw, X
} from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";

interface FixedAssetsProps {
  companyCurrency: string;
  selectedCompanyId: string;
}

export default function FixedAssets({ companyCurrency, selectedCompanyId }: FixedAssetsProps) {
  const { language, t } = useLanguage();
  const isAr = language === "ar";

  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Search and filter
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  // Form State for creating/editing
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("other");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchaseValue, setPurchaseValue] = useState("");
  const [usefulLifeYears, setUsefulLifeYears] = useState("");
  const [salvageValue, setSalvageValue] = useState("");
  const [description, setDescription] = useState("");

  // Detailed simulation modal for selected asset
  const [selectedAssetForSim, setSelectedAssetForSim] = useState<FixedAsset | null>(null);

  // Fetch Assets
  const fetchAssets = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/fixed-assets", {
        headers: {
          "x-company-id": selectedCompanyId
        }
      });
      if (!res.ok) throw new Error(isAr ? "فشل تحميل قائمة الأصول" : "Failed to load assets");
      const data = await res.json();
      setAssets(data);
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? "حدث خطأ غير متوقع" : "An unexpected error occurred"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompanyId) {
      fetchAssets();
      // Reset form on company change
      resetForm();
    }
  }, [selectedCompanyId]);

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setName("");
    setCategory("other");
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setPurchaseValue("");
    setUsefulLifeYears("");
    setSalvageValue("0");
    setDescription("");
  };

  // Create or Update submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !purchaseDate || !purchaseValue || !usefulLifeYears || salvageValue === "") {
      setErrorMsg(isAr ? "يرجى تعبئة كافة الحقول الإلزامية" : "Please fill out all required fields");
      return;
    }

    if (Number(purchaseValue) <= 0 || Number(usefulLifeYears) <= 0) {
      setErrorMsg(isAr ? "يجب أن تكون التكلفة والعمر الافتراضي أكبر من صفر" : "Value and useful life must be greater than zero");
      return;
    }

    if (Number(salvageValue) > Number(purchaseValue)) {
      setErrorMsg(isAr ? "لا يمكن لقيمة الخردة أن تفوق قيمة الشراء الأساسية" : "Salvage value cannot exceed initial purchase value");
      return;
    }

    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const payload = {
      name,
      category,
      purchase_date: purchaseDate,
      purchase_value: Number(purchaseValue),
      useful_life_years: Number(usefulLifeYears),
      salvage_value: Number(salvageValue),
      description,
    };

    try {
      let url = "/api/fixed-assets";
      let method = "POST";

      if (isEditing && editingId) {
        url = `/api/fixed-assets/${editingId}`;
        method = "PATCH";
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-company-id": selectedCompanyId
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || (isAr ? "فشل حفظ بيانات الأصل" : "Failed to save asset details"));
      }

      setSuccessMsg(
        isEditing 
          ? (isAr ? "تم تحديث بيانات الأصل الثابت بنجاح!" : "Fixed asset updated successfully!")
          : (isAr ? "تم تسجيل الأصل الثابت الجديد وإدراجه بنجاح!" : "New fixed asset registered and audited successfully!")
      );
      resetForm();
      fetchAssets();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Action
  const handleDelete = async (id: string, assetName: string) => {
    const confirmText = isAr 
      ? `هل أنت متأكد من رغبتك في حذف واستبعاد الأصل الثابت: "${assetName}" بالكامل من النظام؟`
      : `Are you absolutely sure you want to completely decommission and delete asset: "${assetName}"?`;
    
    if (!window.confirm(confirmText)) return;

    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch(`/api/fixed-assets/${id}`, {
        method: "DELETE",
        headers: {
          "x-company-id": selectedCompanyId
        }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || (isAr ? "فشل حذف واستبعاد الأصل" : "Failed to delete asset"));
      }

      setSuccessMsg(isAr ? `تم استبعاد الأصل "${assetName}" بنجاح!` : `Asset "${assetName}" deleted successfully!`);
      fetchAssets();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Populate form for editing
  const startEdit = (asset: FixedAsset) => {
    setIsEditing(true);
    setEditingId(asset.id);
    setName(asset.name);
    setCategory(asset.category || "other");
    setPurchaseDate(asset.purchase_date);
    setPurchaseValue(asset.purchase_value.toString());
    setUsefulLifeYears(asset.useful_life_years.toString());
    setSalvageValue(asset.salvage_value.toString());
    setDescription(asset.description || "");
    // Scroll smoothly to form
    const formElement = document.getElementById("asset-form-section");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Depreciation dynamic calculation helper (annual, elapsed, accumulated, book value)
  const calculateDepreciation = (asset: FixedAsset) => {
    try {
      const pDate = new Date(asset.purchase_date);
      // Ensure we don't count future dates as elapsed
      const today = new Date();
      
      const diffTime = Math.max(0, today.getTime() - pDate.getTime());
      // Convert milliseconds to fractional years
      const yearsElapsedRaw = diffTime / (1000 * 60 * 60 * 24 * 365.25);
      
      // Annual straight-line rate
      const annualDepreciation = Math.max(0, (asset.purchase_value - asset.salvage_value) / asset.useful_life_years);
      
      // Years elapsed bounded by useful life
      const yearsElapsed = Math.min(yearsElapsedRaw, asset.useful_life_years);
      
      // Accumulated depreciation up to today
      const rawAccumulated = yearsElapsed * annualDepreciation;
      const maxDepreciableAmount = Math.max(0, asset.purchase_value - asset.salvage_value);
      const accumulatedDepreciation = Math.min(rawAccumulated, maxDepreciableAmount);
      
      // Current Net Book value = original cost - accumulated depreciation
      const currentBookValue = Math.max(asset.salvage_value, asset.purchase_value - accumulatedDepreciation);
      
      return {
        annualDepreciation,
        yearsElapsed,
        accumulatedDepreciation,
        currentBookValue,
        isFullyDepreciated: yearsElapsedRaw >= asset.useful_life_years
      };
    } catch {
      return {
        annualDepreciation: 0,
        yearsElapsed: 0,
        accumulatedDepreciation: 0,
        currentBookValue: asset.purchase_value,
        isFullyDepreciated: false
      };
    }
  };

  // Map category code to human readable text & icons
  const getCategoryDetails = (catCode: string) => {
    switch (catCode) {
      case "hardware":
        return {
          title: isAr ? "أجهزة تقنية وحواسيب" : "IT Hardware & Tech",
          icon: <Laptop className="w-4 h-4 text-sky-500" />
        };
      case "vehicles":
        return {
          title: isAr ? "سيارات ووسائل نقل" : "Vehicles & Transport",
          icon: <Car className="w-4 h-4 text-emerald-500" />
        };
      case "furniture":
        return {
          title: isAr ? "أثاث وتجهيز مكتبي" : "Furniture & Office",
          icon: <Armchair className="w-4 h-4 text-amber-500" />
        };
      case "realestate":
        return {
          title: isAr ? "عقارات وأبنية" : "Real Estate & Buildings",
          icon: <Building2 className="w-4 h-4 text-indigo-500" />
        };
      default:
        return {
          title: isAr ? "آلات ومعدات أخرى" : "Machinery & Others",
          icon: <Wrench className="w-4 h-4 text-purple-500" />
        };
    }
  };

  // Filter and search logic
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(search.toLowerCase()) || 
                          (asset.description || "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "All" || asset.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Aggregated KPIs across filtered assets
  const totalPurchaseValue = filteredAssets.reduce((sum, item) => sum + item.purchase_value, 0);
  const totalAccumDepreciation = filteredAssets.reduce((sum, item) => {
     const { accumulatedDepreciation } = calculateDepreciation(item);
     return sum + accumulatedDepreciation;
  }, 0);
  const totalCurrentBookValue = filteredAssets.reduce((sum, item) => {
     const { currentBookValue } = calculateDepreciation(item);
     return sum + currentBookValue;
  }, 0);

  // Straight line simulation generator for the schedule tool
  const generateSimulatedSchedule = (asset: FixedAsset) => {
    const schedule = [];
    const cost = asset.purchase_value;
    const salvage = asset.salvage_value;
    const life = asset.useful_life_years;
    const annualRate = (cost - salvage) / life;
    
    let cumDep = 0;
    const buyDate = new Date(asset.purchase_date);
    const buyYear = buyDate.getFullYear();

    for (let i = 1; i <= life; i++) {
      cumDep += annualRate;
      const nbv = cost - cumDep;
      schedule.push({
        yearIndex: i,
        yearLabel: buyYear + i,
        annualDep: annualRate,
        accumulated: cumDep,
        bookValue: Math.max(salvage, nbv)
      });
    }
    return schedule;
  };

  return (
    <div id="fixed-assets-module" className="space-y-6 animate-in fade-in duration-200">
      
      {/* Dynamic Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-cardbk p-5 rounded-2xl border border-borderline">
        <div className="space-y-1">
          <h2 className="text-lg font-black text-txtmain flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-indigo-500 animate-pulse" />
            <span>{isAr ? "إدارة الأصول الثابتة وحساب الإهلاك" : "Fixed Assets & Depreciations"}</span>
          </h2>
          <p className="text-xs text-txtmuted">
            {isAr 
              ? "تسجيل ومتابعة الأصول التشغيلية للشركة، وتواريخ شرائها، وحساب الإهلاك السنوي الديناميكي والقيمة الدفترية المتبقية تلقائياً وفق معادلة القسط الثابت."
              : "Register corporate operating capital assets, log cost, and dynamically audit annual straight-line amortizations with real-time Net Book Value evaluations."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-emerald-600/10 text-emerald-400 font-extrabold border border-emerald-500/20 text-[10px] px-2.5 py-1.5 rounded-xl flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isAr ? "ممتثلة للمعايير الدولية IAS 16" : "Compliant with IAS 16"}</span>
          </span>
        </div>
      </div>

      {/* Trigger Messages */}
      {successMsg && (
        <div className="p-4 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="hover:opacity-80 text-sm font-bold">×</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-600 text-white rounded-xl text-xs font-semibold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg("")} className="hover:opacity-80 text-sm font-bold">×</button>
        </div>
      )}

      {/* KPI Stats Widgets Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Registered Assets */}
        <div className="bg-cardbk p-4 rounded-2xl border border-borderline flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-txtmuted uppercase font-bold">{isAr ? "عدد الأصول الثابتة" : "Deed Assets Counter"}</span>
            <p className="text-md font-mono font-black text-txtmain">{filteredAssets.length}</p>
          </div>
        </div>

        {/* Initial purchase cost */}
        <div className="bg-cardbk p-4 rounded-2xl border border-borderline flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-txtmuted uppercase font-bold">{isAr ? "التكلفة الأصلية الإجمالية" : "Initial Purchase Cost"}</span>
            <p className="text-md font-mono font-black text-txtmain">
              {totalPurchaseValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-txtmuted">{companyCurrency}</span>
            </p>
          </div>
        </div>

        {/* Accumulated depreciation sum */}
        <div className="bg-cardbk p-4 rounded-2xl border border-borderline flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-txtmuted uppercase font-bold">{isAr ? "مجمع الإهلاك المتراكم" : "Total Accum Depreciation"}</span>
            <p className="text-md font-mono font-black text-destructive dark:text-red-400">
              {totalAccumDepreciation.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-txtmuted">{companyCurrency}</span>
            </p>
          </div>
        </div>

        {/* Current Net Book Value Bookkeeping */}
        <div className="bg-cardbk p-4 rounded-2xl border border-borderline flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
            <PieChart className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-txtmuted uppercase font-bold">{isAr ? "صافي القيمة الدفترية" : "Net Book Asset Value"}</span>
            <p className="text-md font-mono font-black text-brand-colors text-indigo-500 dark:text-indigo-400">
              {totalCurrentBookValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-txtmuted">{companyCurrency}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* Directory Listings Table Main (Left Span 2) */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-cardbk rounded-2xl border border-borderline p-5 space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-extrabold text-xs text-txtmain uppercase tracking-wider">{isAr ? "سجل وجدول الأصول الثابتة" : "Fixed Assets Registry"}</h3>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* Search text */}
                <div className="relative">
                  <span className={`absolute inset-y-0 ${isAr ? "right-0 pr-3" : "left-0 pl-3"} flex items-center text-txtmuted`}>
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder={isAr ? "بحث عن أصل..." : "Search assets..."}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className={`bg-appbk border border-borderline text-txtmain placeholder-txtmuted/40 rounded-xl py-1.5 text-xs focus:outline-none focus:border-indigo-500 w-36 sm:w-48 ${isAr ? "pr-8 text-right" : "pl-8 text-left"}`}
                  />
                </div>

                {/* Filter categories */}
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="bg-appbk border border-borderline text-txtmain rounded-xl py-1.5 px-3 text-xs focus:outline-none focus:border-indigo-500 font-bold"
                >
                  <option value="All">{isAr ? "كل الفئات" : "All Categories"}</option>
                  <option value="hardware">{isAr ? "حواسيب وأجهزة تقنية" : "IT Hardware"}</option>
                  <option value="vehicles">{isAr ? "سيارات ونقليات" : "Vehicles"}</option>
                  <option value="furniture">{isAr ? "أثاث وتجهيز مكتبي" : "Furniture"}</option>
                  <option value="realestate">{isAr ? "عقارات ومباني" : "Real Estate"}</option>
                  <option value="other">{isAr ? "أخرى / عام" : "Other Assets"}</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-txtmuted gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                <p className="text-[11px] font-bold">{isAr ? "جاري تحميل سجل الأصول..." : "Fetching registered assets inventory..."}</p>
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-borderline rounded-2xl">
                <ShieldAlert className="w-8 h-8 text-txtmuted/40 mx-auto mb-2" />
                <p className="text-xs text-txtmuted font-bold mb-1">{isAr ? "لا توجد أصول مسجلة حالياً" : "No fixed assets recorded in system"}</p>
                <p className="text-[10px] text-txtmuted/75 max-w-sm mx-auto leading-normal">
                  {isAr 
                    ? "ابدأ بتسجيل أول أصل ثابت للشركة من خلال تعبئة نموذج البيانات وحفظه لتوليد خطط الإهلاك المالي الآلي." 
                    : "Fill out the register desk details in the side drawer card to initialize corporate capital asset logs."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-appbk text-txtmuted border-b border-borderline">
                    <tr>
                      <th className={`py-3 px-3 text-start font-bold ${isAr ? "rounded-r-xl" : "rounded-l-xl"}`}>{isAr ? "الأصل الثابت والفئة" : "Asset & Category"}</th>
                      <th className="py-3 px-2 text-start font-bold">{isAr ? "تاريخ وقيمة الشراء" : "Purchase Specs"}</th>
                      <th className="py-3 px-2 text-center font-bold">{isAr ? "العمر الإجمالي المتبقي" : "Life Specs"}</th>
                      <th className="py-3 px-2 text-end font-bold">{isAr ? "الإهلاك المتراكم" : "Total Amortized"}</th>
                      <th className="py-3 px-2 text-end font-bold">{isAr ? "صافي القيمة الدفترية" : "Book Value"}</th>
                      <th className={`py-3 px-3 text-center font-bold ${isAr ? "rounded-l-xl" : "rounded-r-xl"}`}>{isAr ? "إجراءات" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borderline/40">
                    {filteredAssets.map(asset => {
                      const { annualDepreciation, yearsElapsed, accumulatedDepreciation, currentBookValue, isFullyDepreciated } = calculateDepreciation(asset);
                      const catInfo = getCategoryDetails(asset.category || "other");

                      return (
                        <tr key={asset.id} className="hover:bg-appbk/25 transition-colors group">
                          {/* Asset Name and Category Indicator */}
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 bg-appbk rounded-lg border border-borderline flex items-center justify-center shrink-0">
                                {catInfo.icon}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-txtmain truncate max-w-[140px] sm:max-w-[200px]" title={asset.name}>{asset.name}</p>
                                <p className="text-[10px] text-txtmuted">{catInfo.title}</p>
                              </div>
                            </div>
                          </td>

                          {/* Purchase Specs */}
                          <td className="py-3.5 px-2">
                            <span className="font-mono text-txtmain font-bold block">{asset.purchase_value.toLocaleString("en-US")} {companyCurrency}</span>
                            <span className="text-[10px] text-txtmuted flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-txtmuted shrink-0" />
                              <span>{asset.purchase_date}</span>
                            </span>
                          </td>

                          {/* Life specs & depreciation badge */}
                          <td className="py-3.5 px-2 text-center">
                            <div className="space-y-1">
                              {isFullyDepreciated ? (
                                <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-500 dark:text-red-400 font-bold text-[9px] px-2 py-0.5 rounded-full border border-rose-500/15">
                                  {isAr ? "مستهلك كلياً" : "Depreciated"}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 font-bold text-[9px] px-2 py-0.5 rounded-full border border-indigo-500/15">
                                  {isAr ? "نشط" : "Active"}
                                </span>
                              )}
                              <p className="text-[10px] font-mono text-txtmuted">
                                {yearsElapsed.toFixed(1)} / {asset.useful_life_years} {isAr ? "سنوات" : "yrs"}
                              </p>
                            </div>
                          </td>

                          {/* Accumulated Depreciation */}
                          <td className="py-3.5 px-2 text-end font-mono">
                            <span className="font-bold text-destructive dark:text-red-400">
                              -{accumulatedDepreciation.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                            </span>
                            <span className="block text-[9px] text-txtmuted">
                              ({isAr ? "سنوياً: " : "Yearly: "}{annualDepreciation.toLocaleString("en-US", { maximumFractionDigits: 0 })})
                            </span>
                          </td>

                          {/* Net Book Value */}
                          <td className="py-3.5 px-2 text-end font-mono font-bold text-txtmain">
                            <span className={isFullyDepreciated ? "text-txtmuted" : "text-emerald-500 dark:text-emerald-400"}>
                              {currentBookValue.toLocaleString("en-US", { maximumFractionDigits: 0 })} {companyCurrency}
                            </span>
                          </td>

                          {/* Action CTA */}
                          <td className="py-3.5 px-3">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Schedule Simulation tool */}
                              <button
                                onClick={() => setSelectedAssetForSim(asset)}
                                className="p-1 px-2 border border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded duration-150 cursor-pointer text-[10px] font-bold"
                                title={isAr ? "مخطط الإهلاك السنوي" : "Depreciation Schedule"}
                              >
                                <Clock className="w-3 h-3 inline-block align-middle mr-0.5" />
                                <span className="hidden sm:inline">{isAr ? "الخطة" : "Sim"}</span>
                              </button>

                              {/* Edit details */}
                              <button
                                onClick={() => startEdit(asset)}
                                className="p-1 text-txtmuted hover:text-indigo-500 hover:bg-indigo-500/20 rounded duration-150 cursor-pointer"
                                title={isAr ? "تعديل البيانات" : "Edit asset specs"}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {/* Decommission/Delete */}
                              <button
                                onClick={() => handleDelete(asset.id, asset.name)}
                                className="p-1 text-txtmuted hover:text-rose-500 hover:bg-rose-500/20 rounded duration-150 cursor-pointer"
                                title={isAr ? "استبعاد/حذف الأصل" : "Decommission asset"}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </div>

        {/* Create/Edit Assets Side Sheet Form (Right Span 1) */}
        <div id="asset-form-section" className="bg-cardbk rounded-2xl border border-borderline p-5 space-y-4">
          <div className="border-b border-borderline pb-3">
            <h3 className="font-extrabold text-xs text-txtmain flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-indigo-500 animate-pulse" />
              <span>
                {isEditing 
                  ? (isAr ? "تعديل بيانات الأصل الثابت" : "Modify Asset Records")
                  : (isAr ? "تسجيل أصل ثابت جديد" : "Register Capital Fixed Asset")}
              </span>
            </h3>
            <p className="text-[10px] text-txtmuted mt-1 leading-normal">
              {isAr 
                ? "أدخل تفاصيل التكلفة والتاريخ والعمر الافتراضي لحساب الإهلاك السنوي بموجب اتفاقيات المعايير المباشرة."
                : "Input asset specs to establish local depreciation indices and book keeping values."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-txtmain">{isAr ? "اسم الأصل الثابت *" : "Asset Name *"}</label>
              <input
                type="text"
                placeholder={isAr ? "مثال: خادم رئيسي للمطورين" : "e.g. Main Development Server"}
                value={name}
                onChange={e => setName(e.target.value)}
                className={`w-full bg-appbk border border-borderline text-txtmain placeholder-txtmuted/45 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-500 ${isAr ? "text-right" : "text-left"}`}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Category */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-txtmain">{isAr ? "فئة الأصل" : "Asset Category"}</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-appbk border border-borderline text-txtmain rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-500 font-bold"
                >
                  <option value="hardware">{isAr ? "حواسيب وتقنية" : "IT Hardware"}</option>
                  <option value="vehicles">{isAr ? "سيارات وحافلات" : "Vehicles"}</option>
                  <option value="furniture">{isAr ? "أثاث وتجهيزات" : "Furniture"}</option>
                  <option value="realestate">{isAr ? "عقارات ومباني" : "Real Estate"}</option>
                  <option value="other">{isAr ? "آلات أخرى عامة" : "Other category"}</option>
                </select>
              </div>

              {/* Purchase Date */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-txtmain">{isAr ? "تاريخ الشراء *" : "Purchase Date *"}</label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={e => setPurchaseDate(e.target.value)}
                  className="w-full bg-appbk border border-borderline text-txtmain rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-500 font-mono text-center"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Purchase price */}
              <div className="space-y-1 col-span-1">
                <label className="block text-[10px] font-bold text-txtmain leading-tight shrink-0">
                  {isAr ? "تكلفة الشراء *" : "Purchase Price *"}
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={purchaseValue}
                  onChange={e => setPurchaseValue(e.target.value)}
                  className="w-full bg-appbk border border-borderline text-txtmain rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-indigo-500 text-center font-mono font-bold"
                  required
                />
              </div>

              {/* Useful life years */}
              <div className="space-y-1 col-span-1">
                <label className="block text-[10px] font-bold text-txtmain leading-tight shrink-0">
                  {isAr ? "العمر (سنوات) *" : "Useful Life (Yrs) *"}
                </label>
                <input
                  type="number"
                  placeholder="5"
                  value={usefulLifeYears}
                  onChange={e => setUsefulLifeYears(e.target.value)}
                  className="w-full bg-appbk border border-borderline text-txtmain rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-indigo-500 text-center font-mono font-bold"
                  required
                />
              </div>

              {/* Salvage value */}
              <div className="space-y-1 col-span-1">
                <label className="block text-[10px] font-bold text-txtmain leading-tight shrink-0">
                  {isAr ? "القيمة المتخرّبة" : "Salvage Price"}
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={salvageValue}
                  onChange={e => setSalvageValue(e.target.value)}
                  className="w-full bg-appbk border border-borderline text-txtmain rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:border-indigo-500 text-center font-mono font-bold"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-txtmain">{isAr ? "ملاحظات وتفاصيل إضافية" : "Complementary Notes"}</label>
              <textarea
                placeholder={isAr ? "أية مواصفات فنية إضافية أو مكان وضع الأصل..." : "Hardware serial specs, warranty indices..."}
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className={`w-full bg-appbk border border-borderline text-txtmain placeholder-txtmuted/45 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-500 ${isAr ? "text-right" : "text-left"}`}
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={actionLoading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-500/10"
              >
                {actionLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5" />
                )}
                <span>{isEditing ? (isAr ? "تحديث التعديلات" : "Apply Modifications") : (isAr ? "تسجيل الأصل وحفظه" : "Authorize Asset Record")}</span>
              </button>

              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-appbk hover:bg-slate-200 dark:hover:bg-slate-800 text-txtmuted border border-borderline font-bold py-2.5 px-3 rounded-xl text-xs transition-all cursor-pointer mr-1"
                >
                  {isAr ? "إلغاء التعديل" : "Cancel"}
                </button>
              )}
            </div>
          </form>

        </div>

      </div>

      {/* MODAL: Straight Line Depreciation Year-by-Year Simulation Schedule */}
      {selectedAssetForSim && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-cardbk rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-borderline text-start animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex justify-between items-center border-b border-borderline pb-3.5 mb-4">
              <div className="space-y-0.5">
                <h4 className="font-extrabold text-txtmain text-md flex items-center gap-1.5">
                  <CalendarCheck className="w-5 h-5 text-indigo-500" />
                  <span>{isAr ? "مخطط محاكاة الإهلاك السنوي (IAS 16)" : "Dynamic Depreciation Timeline Schedule"}</span>
                </h4>
                <p className="text-[10px] text-txtmuted">
                  {isAr 
                    ? `الأصل: ${selectedAssetForSim.name} | تكلفة الشراء: ${selectedAssetForSim.purchase_value.toLocaleString()} ${companyCurrency}` 
                    : `Asset: ${selectedAssetForSim.name} | Original cost: ${selectedAssetForSim.purchase_value.toLocaleString()} ${companyCurrency}`}
                </p>
              </div>
              <button 
                onClick={() => setSelectedAssetForSim(null)}
                className="text-txtmuted hover:text-txtmain transition-colors bg-appbk border border-borderline p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-txtmuted leading-relaxed">
                {isAr 
                  ? "المخطط المالي أدناه يوضح توزيع قيمة الاستهلاك السنوي والقيمة الدفترية المتبقية للأصل على مدار سنوات عمره الافتراضي بالكامل طبقا لفرضية القسط الثابت:"
                  : "This chart projection displays straightline depreciation metrics and carrying value curves mapped periodically step wise:"}
              </p>

              <div className="overflow-x-auto rounded-xl border border-borderline bg-appbk/45">
                <table className="w-full text-xs text-start">
                  <thead className="bg-appbk text-txtmuted border-b border-borderline text-[10px] uppercase font-bold">
                    <tr>
                      <th className="py-2.5 px-3 text-center">{isAr ? "السنة" : "Year Index"}</th>
                      <th className="py-2.5 px-3 text-center">{isAr ? "صيغة السنة التقريبية" : "Target Year"}</th>
                      <th className="py-2.5 px-3 text-end">{isAr ? "مبلغ قسط الاستهلاك السنوي" : "Annual Amortization"}</th>
                      <th className="py-2.5 px-3 text-end">{isAr ? "مجمع الإهلاك المتراكم" : "Total Depreciation"}</th>
                      <th className="py-2.5 px-3 text-end">{isAr ? "القيمة المتبقية (الدفترية)" : "Net Carrying Value"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borderline/40 font-mono text-[11px] text-txtmain">
                    {generateSimulatedSchedule(selectedAssetForSim).map((row, index) => {
                      const curDate = new Date();
                      const elapsedYears = (curDate.getTime() - new Date(selectedAssetForSim.purchase_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
                      const isYearPassed = elapsedYears >= row.yearIndex;

                      return (
                        <tr key={index} className={`hover:bg-appbk/50 transition-colors ${isYearPassed ? "bg-indigo-500/5" : ""}`}>
                          <td className="py-2.5 px-3 text-center font-bold">{isAr ? `العام ${row.yearIndex}` : `Year ${row.yearIndex}`}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="bg-appbk px-2 py-0.5 rounded text-[10px] font-sans border border-borderline flex items-center justify-center gap-1 max-w-[80px] mx-auto font-bold text-txtmain">
                              {row.yearLabel}
                              {isYearPassed && (
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" title={isAr ? "منقضية" : "Elapsed"} />
                              )}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-end font-bold text-txtmain">{row.annualDep.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} {companyCurrency}</td>
                          <td className="py-2.5 px-3 text-end font-bold text-destructive dark:text-red-400">-{row.accumulated.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} {companyCurrency}</td>
                          <td className="py-2.5 px-3 text-end text-emerald-500 dark:text-emerald-400 font-black">
                            {row.bookValue.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} {companyCurrency}
                            {row.bookValue === selectedAssetForSim.salvage_value && (
                              <span className="block text-[8px] text-txtmuted font-sans font-normal">{isAr ? "(القيمة التخريدية المتبقية)" : "(Salvage Value reached)"}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAssetForSim(null)}
                  className="px-4 py-2 text-xs font-bold text-txtmain bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-colors text-white cursor-pointer"
                >
                  {isAr ? "إغلاق السجل" : "Close simulated logs"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
