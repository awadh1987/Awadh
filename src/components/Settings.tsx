import React, { useState, useEffect } from "react";
import { Company, AuditLog } from "../types";
import { Building2, Image, Palette, Save, Check, Sparkles, AlertCircle, Info, Coins, ShieldAlert, RefreshCw, Search, GripVertical, ArrowUp, ArrowDown, Database, Mail, Users, Shield, Crown, UserPlus, Lock, Ban, ShieldCheck, ChevronRight, CheckCircle2 } from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";

interface SettingsProps {
  company: Company | null;
  onUpdateCompany: (updated: Company) => void;
  userRole?: string;
  currentUserEmail?: string;
}

const BRAND_COLORS = (lang: string) => [
  { name: lang === "ar" ? "أزرق نيلي قالب (Default)" : "Indigo Blue (Default)", value: "#4f46e5" },
  { name: lang === "ar" ? "أخضر زمردي" : "Emerald Green", value: "#059669" },
  { name: lang === "ar" ? "أزرق رسمي" : "Official Blue", value: "#2563eb" },
  { name: lang === "ar" ? "بنفسجي ملكي" : "Royal Violet", value: "#7c3aed" },
  { name: lang === "ar" ? "وردي داكن" : "Deep Pink", value: "#db2777" },
  { name: lang === "ar" ? "برتقالي حيوي" : "Vibrant Orange", value: "#ea580c" },
  { name: lang === "ar" ? "رمادي حجري" : "Slate Gray", value: "#334155" },
];

const POPULAR_CURRENCIES = (lang: string) => [
  { code: "ر.س", name: lang === "ar" ? "ريال سعودي (SAR)" : "Saudi Riyal (SAR)" },
  { code: "د.إ", name: lang === "ar" ? "درهم إماراتي (AED)" : "UAE Dirham (AED)" },
  { code: "د.ك", name: lang === "ar" ? "دينار كويتي (KWD)" : "Kuwaiti Dinrar (KWD)" },
  { code: "ر.ق", name: lang === "ar" ? "ريال قطرري (QAR)" : "Qatari Riyal (QAR)" },
  { code: "د.ب", name: lang === "ar" ? "دينار بحريني (BHD)" : "Bahraini Dinar (BHD)" },
  { code: "ر.ع", name: lang === "ar" ? "ريال عماني (OMR)" : "Omani Rial (OMR)" },
  { code: "$", name: lang === "ar" ? "دولار أمريكي (USD)" : "US Dollar (USD)" },
  { code: "€", name: lang === "ar" ? "يورو (EUR)" : "Euro (EUR)" },
  { code: "£", name: lang === "ar" ? "جنيه إسترليني (GBP)" : "British Pound (GBP)" },
];

export default function Settings({ company, onUpdateCompany, userRole = "subscriber", currentUserEmail }: SettingsProps) {
  const { language, t } = useLanguage();
  const [settingsTab, setSettingsTab] = useState<"general" | "members">("general");
  
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#4f46e5");
  const [currency, setCurrency] = useState("ر.س");
  const [widgetOrder, setWidgetOrder] = useState<string[]>(["revenue", "costs", "net_profit", "profit_margin"]);
  const [enableDueEmailNotifications, setEnableDueEmailNotifications] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // System Team Members states
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberForm, setMemberForm] = useState({ name: "", email: "", role: "subscriber", status: "Active" });
  const [memberMessage, setMemberMessage] = useState({ error: "", success: "" });

  const fetchMembers = async () => {
    if (!company?.id) return;
    setMembersLoading(true);
    try {
      const res = await fetch("/api/members", {
        headers: {
          "x-company-id": company.id
        }
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (err) {
      console.error("Failed to fetch corporate members:", err);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setMemberMessage({ error: "", success: "" });
    
    // Safety check: Only Owners are authorized
    if (userRole !== "owner") {
      setMemberMessage({ error: language === "ar" ? "خطأ: ميزة إضافة وإدارة الأعضاء حصرية لمالك النظام (Owner) فقط" : "Error: Only owners are authorized to register crew members.", success: "" });
      return;
    }

    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-company-id": company.id
        },
        body: JSON.stringify(memberForm)
      });
      const data = await res.json();
      if (!res.ok) {
        setMemberMessage({ error: data.error || (language === "ar" ? "تعذر إضافة العضو" : "Failed to insert member"), success: "" });
        return;
      }
      setMemberMessage({ error: "", success: language === "ar" ? "تم إضافة العضو الضريبي بنجاح ومزامنته مع نظام Firebase!" : "Roster member successfully registered & synced with active Firebase Vault!" });
      setMemberForm({ name: "", email: "", role: "subscriber", status: "Active" });
      fetchMembers();
      fetchAuditLogs();
    } catch (err: any) {
      setMemberMessage({ error: err.message || "Unexpected event occurred", success: "" });
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    if (!company) return;
    setMemberMessage({ error: "", success: "" });

    // Safety check: Only Owners can edit roles
    if (userRole !== "owner") {
      setMemberMessage({ error: language === "ar" ? "حظر: لا تمتلك صلاحيات تعديل رتب الأعضاء" : "Unauthorized: You do not have permissions to modify member roles", success: "" });
      return;
    }

    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-company-id": company.id
        },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (!res.ok) {
        setMemberMessage({ error: data.error || "Failed roles write", success: "" });
        return;
      }
      setMemberMessage({ error: "", success: language === "ar" ? "تم تحديث الصلاحيات والتحكم المركزي بنجاح!" : "Permissions and credentials successfully updated!" });
      fetchMembers();
      fetchAuditLogs();
    } catch (err: any) {
      setMemberMessage({ error: err.message || "Failed update role trigger", success: "" });
    }
  };

  const handleUpdateStatus = async (memberId: string, newStatus: string) => {
    if (!company) return;
    setMemberMessage({ error: "", success: "" });

    // Safety check: Only Owners can edit status
    if (userRole !== "owner") {
      setMemberMessage({ error: language === "ar" ? "حظر: لا تمتلك صلاحيات تعديل حالة الأعضاء" : "Unauthorized: Only owners can alter corporate roster status", success: "" });
      return;
    }

    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-company-id": company.id
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) {
        setMemberMessage({ error: data.error || "Failed status update", success: "" });
        return;
      }
      setMemberMessage({ error: "", success: language === "ar" ? "تم تعديل حالة الحساب والقدرة على تسجيل الدخول!" : "Roster state successfully saved in system directories!" });
      fetchMembers();
      fetchAuditLogs();
    } catch (err: any) {
      setMemberMessage({ error: err.message || "Failed status transition", success: "" });
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!company) return;

    // Safety check: Only Owners
    if (userRole !== "owner") {
      setMemberMessage({ error: language === "ar" ? "حظر: حصرية لملاك الحساب فقط" : "Unauthorized: Roster deletion is restricted to account owners", success: "" });
      return;
    }

    if (!window.confirm(language === "ar" ? "هل أنت متأكد من إلغاء وحذف هذا العضو تماماً من النظام والشركة؟" : "Confirm secure deletion and revoking credentials?")) return;
    setMemberMessage({ error: "", success: "" });
    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: "DELETE",
        headers: {
          "x-company-id": company.id
        }
      });
      const data = await res.json();
      if (!res.ok) {
        setMemberMessage({ error: data.error || "Failed member deletion", success: "" });
        return;
      }
      setMemberMessage({ error: "", success: language === "ar" ? "تم إقصاء العضو وحذف صلاحيات الدخول من الكود الضريبي." : "Roster access successfully revoked!" });
      fetchMembers();
      fetchAuditLogs();
    } catch (err: any) {
      setMemberMessage({ error: err.message || "Failed execution", success: "" });
    }
  };

  useEffect(() => {
    if (company?.id) {
      fetchMembers();
    }
  }, [company?.id]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const items = [...widgetOrder];
    const draggedItem = items[draggedIndex];
    items.splice(draggedIndex, 1);
    items.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    setWidgetOrder(items);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const moveWidget = (index: number, direction: "up" | "down") => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= widgetOrder.length) return;
    
    const items = [...widgetOrder];
    const temp = items[index];
    items[index] = items[nextIndex];
    items[nextIndex] = temp;
    setWidgetOrder(items);
  };

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"All" | "Creation" | "Settings" | "Deletion" | "InvoiceStatus">("All");

  const colorsList = BRAND_COLORS(language);
  const currenciesList = POPULAR_CURRENCIES(language);

  const fetchAuditLogs = async () => {
    if (!company) return;
    setLogsLoading(true);
    try {
      const res = await fetch("/api/audit-logs", {
        headers: {
          "x-company-id": company.id
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (company?.id) {
      fetchAuditLogs();
    }
  }, [company?.id]);

  const filteredLogs = auditLogs.filter((log) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = 
      log.action.toLowerCase().includes(query) || 
      log.details.toLowerCase().includes(query) ||
      log.user.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    if (activeCategory === "All") return true;
    if (activeCategory === "Creation" && (log.action.includes("إنشاء") || log.action.includes("تسجيل") || log.action.toLowerCase().includes("create") || log.action.toLowerCase().includes("add") || log.action.toLowerCase().includes("register"))) return true;
    if (activeCategory === "Settings" && (log.action.includes("تعديل") || log.action.includes("هوية") || log.action.toLowerCase().includes("update") || log.action.toLowerCase().includes("edit") || log.action.toLowerCase().includes("setting"))) return true;
    if (activeCategory === "Deletion" && (log.action.includes("حذف") || log.action.toLowerCase().includes("delete") || log.action.toLowerCase().includes("remove"))) return true;
    if (activeCategory === "InvoiceStatus" && (log.action.includes("تحديث") || log.action.includes("سداد") || log.action.includes("تحصيل") || log.action.toLowerCase().includes("status") || log.action.toLowerCase().includes("collect") || log.action.toLowerCase().includes("invoice"))) return true;

    return false;
  });

  // Populate data when company changes
  useEffect(() => {
    if (company) {
      setName(company.name || "");
      setLogoUrl(company.logo_url || "");
      setPrimaryColor(company.primary_color || "#4f46e5");
      setCurrency(company.currency || "ر.س");
      setEnableDueEmailNotifications(company.enable_due_email_notifications || false);
      if (company.widget_order) {
        setWidgetOrder(company.widget_order.split(","));
      } else {
        setWidgetOrder(["revenue", "costs", "net_profit", "profit_margin"]);
      }
      setError("");
      setSuccess("");
    }
  }, [company]);

  // Backup Management States
  const [backups, setBackups] = useState<any[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [triggeringBackup, setTriggeringBackup] = useState(false);
  const [backupError, setBackupError] = useState("");
  const [backupSuccess, setBackupSuccess] = useState("");

  const fetchBackups = async () => {
    try {
      setBackupLoading(true);
      const res = await fetch("/api/backups");
      if (res.ok) {
        const data = await res.json();
        setBackups(data);
      }
    } catch (err) {
      console.error("Failed to fetch backups:", err);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleTriggerBackup = async () => {
    if (!company) return;
    setTriggeringBackup(true);
    setBackupError("");
    setBackupSuccess("");
    try {
      const res = await fetch("/api/backups/trigger", {
        method: "POST",
        headers: {
          "x-company-id": company.id
        }
      });
      if (res.ok) {
        const result = await res.json();
        setBackupSuccess(language === "ar" 
          ? `تم إنشاء نسخة احتياطية آمنة بنجاح باسم ${result.filename} وحفظها في الحاوية السحابية.`
          : `Secure database backup snapshot ${result.filename} created and written successfully.`
        );
        fetchBackups();
        fetchAuditLogs();
      } else {
        throw new Error("API reported failure");
      }
    } catch (err: any) {
      console.error("Manual backup trigger failed:", err);
      setBackupError(language === "ar" 
        ? "تعذر إنشاء النسخة الاحتياطية يدويًا. يرجى مراجعة الخادم."
        : "Failed to compile manual database backup snapshot. Verify connection status."
      );
    } finally {
      setTriggeringBackup(false);
    }
  };

  // Archive Management States
  const [archiveStatus, setArchiveStatus] = useState<any>(null);
  const [archiveStatusLoading, setArchiveStatusLoading] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveSuccess, setArchiveSuccess] = useState("");
  const [archiveError, setArchiveError] = useState("");

  const fetchArchiveStatus = async () => {
    if (!company?.id) return;
    try {
      setArchiveStatusLoading(true);
      const res = await fetch("/api/archive/status", {
        headers: {
          "x-company-id": company.id
        }
      });
      if (res.ok) {
        const data = await res.json();
        setArchiveStatus(data);
      }
    } catch (err) {
      console.error("Failed to fetch archive status:", err);
    } finally {
      setArchiveStatusLoading(false);
    }
  };

  const handleRunArchive = async () => {
    if (!company?.id) return;
    setArchiving(true);
    setArchiveSuccess("");
    setArchiveError("");
    try {
      const res = await fetch("/api/archive/run", {
        method: "POST",
        headers: {
          "x-company-id": company.id
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setArchiveSuccess(data.message);
        fetchArchiveStatus();
        fetchAuditLogs();
        // Since we archived old operations, they will disappear from screens, let's refresh settings context or general lists if parent supplied updates.
      } else {
        throw new Error(data.message || "Failed archive trigger");
      }
    } catch (err: any) {
      console.error("Manual archive processing failed:", err);
      setArchiveError(language === "ar"
        ? "حدث خطأ أثناء أرشفة البيانات القديمة."
        : "Failed running automated db archival process."
      );
    } finally {
      setArchiving(false);
    }
  };

  useEffect(() => {
    if (company?.id) {
      fetchBackups();
      fetchArchiveStatus();
    }
  }, [company?.id]);

  if (!company) {
    return (
      <div className="text-center py-12 text-txtmuted">
        <Building2 className="w-12 h-12 mx-auto mb-3 opacity-25" />
        <p className="text-sm">{language === "ar" ? "الرجاء اختيار المنشأة أولاً للوصول إلى الإعدادات." : "Please choose an enterprise workspace first to edit parameters."}</p>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/companies/${company.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          logo_url: logoUrl.trim(),
          primary_color: primaryColor,
          currency: currency,
          widget_order: widgetOrder.join(","),
          enable_due_email_notifications: enableDueEmailNotifications
        }),
      });

      if (!res.ok) {
        throw new Error(language === "ar" ? "تعذر حفظ إعدادات المنشأة الحالية" : "Could not commit enterprise profile changes");
      }

      const updatedCompany: Company = await res.json();
      onUpdateCompany(updatedCompany);
      setSuccess(language === "ar" 
        ? "تم حفظ هويتك التجارية بنجاح! ستظهر التعديلات والعملة المختارة مباشرة على الفاتورة والعمليات التشغيلية والتقارير." 
        : "Corporate profile details saved cleanly! These overrides take effect immediately across all statistics, invoices and logs."
      );
      fetchAuditLogs();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || (language === "ar" ? "حدث خطأ غير متوقع أثناء حفظ الإعدادات." : "An unexpected event failed the save action."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-start">
      {/* Settings Sub-Tabs */}
      <div className="flex border-b border-borderline gap-1 pb-px overflow-x-auto scrollbar-none">
        <button
          onClick={() => setSettingsTab("general")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
            settingsTab === "general"
              ? "border-indigo-500 text-indigo-500 dark:text-indigo-400"
              : "border-transparent text-txtmuted hover:text-txtmain"
          }`}
          style={{
            borderBottomColor: settingsTab === "general" ? primaryColor : "transparent",
            color: settingsTab === "general" ? primaryColor : undefined,
          }}
        >
          <Building2 className="w-4 h-4" />
          <span>{language === "ar" ? "الهوية التجارية للفواتير" : "Branding & Layout Identity"}</span>
        </button>

        <button
          onClick={() => setSettingsTab("members")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
            settingsTab === "members"
              ? "border-indigo-500 text-indigo-500 dark:text-indigo-400"
              : "border-transparent text-txtmuted hover:text-txtmain"
          }`}
          style={{
            borderBottomColor: settingsTab === "members" ? primaryColor : "transparent",
            color: settingsTab === "members" ? primaryColor : undefined,
          }}
        >
          <Users className="w-4 h-4" />
          <span>{language === "ar" ? "إدارة مستخدمي الشركة" : "Enterprise Team & Roster"}</span>
        </button>
      </div>

      {settingsTab === "general" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Settings Form */}
          <div className="lg:col-span-7">
            <div className="bg-cardbk p-6 rounded-2xl shadow-sm border border-borderline">
              <div className="flex items-center gap-2 border-b border-borderline pb-4 mb-5">
                <Building2 className="w-5 h-5 text-indigo-500" />
                <h3 className="text-lg font-bold text-txtmain">{t("settings_title")}</h3>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                
                {success && (
                  <div className="p-3 bg-emerald-500/10 text-emerald-400 text-xs rounded-xl border border-emerald-500/20 flex items-center gap-2 animate-in fade-in">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>{success}</span>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-rose-500/10 text-rose-400 text-xs rounded-xl border border-rose-500/20 flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Company Name */}
                <div>
                  <label className="block text-txtmain text-xs font-semibold mb-1.5">{t("settings_company_name_lbl")}</label>
                  <input
                    type="text"
                    placeholder={t("settings_placeholder_name")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-appbk border border-borderline text-txtmain placeholder-txtmuted/50 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors font-medium"
                    required
                  />
                </div>

                {/* Currency Selector */}
                <div>
                  <label className="block text-txtmain text-xs font-semibold mb-1.5 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{t("settings_currency_lbl")}</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {currenciesList.map((curr) => (
                      <button
                        key={curr.code}
                        type="button"
                        onClick={() => setCurrency(curr.code)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all text-center cursor-pointer ${
                          currency === curr.code
                            ? "border-indigo-500 bg-indigo-500/10 text-txtmain ring-1 ring-indigo-500"
                            : "border-borderline bg-appbk text-txtmuted hover:bg-borderline/30"
                        }`}
                      >
                        <span className="text-sm font-bold">{curr.code}</span>
                        <span className="text-[9px] text-txtmuted mt-0.5 truncate max-w-full">{curr.name.split(" ")[0]}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-txtmuted mt-1 leading-normal">
                    {t("settings_currency_hint")}
                  </p>
                </div>

                {/* Logo Link URL */}
                <div>
                  <label className="block text-txtmain text-xs font-semibold mb-1.5 flex items-center gap-1">
                    <Image className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{t("settings_logo_lbl")}</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full bg-appbk border border-borderline text-txtmain placeholder-txtmuted/50 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-left"
                    style={{ direction: "ltr" }}
                  />
                  <p className="text-[10px] text-txtmuted mt-1 leading-normal">
                    {t("settings_logo_hint")}
                  </p>
                </div>

                {/* Brand Color Picker */}
                <div className="space-y-3">
                  <label className="block text-txtmain text-xs font-semibold flex items-center gap-1">
                    <Palette className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{t("settings_color_lbl")}</span>
                  </label>

                  {/* Predefined Colors Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {colorsList.map((bc) => (
                      <button
                        key={bc.value}
                        type="button"
                        onClick={() => setPrimaryColor(bc.value)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] font-medium transition-all duration-150 cursor-pointer ${
                          primaryColor === bc.value
                            ? "border-indigo-500 bg-indigo-500/10 text-txtmain"
                            : "border-borderline bg-appbk text-txtmuted hover:bg-borderline/30"
                        }`}
                      >
                        <span 
                          className="w-3.5 h-3.5 rounded-md border border-slate-500/20 shrink-0" 
                          style={{ backgroundColor: bc.value }}
                        />
                        <span className="truncate">{bc.name.split(" ")[0]}</span>
                        {primaryColor === bc.value && <Check className={`w-3.5 h-3.5 text-indigo-500 shrink-0 ${language === "ar" ? "mr-auto" : "ml-auto"}`} />}
                      </button>
                    ))}
                  </div>

                  {/* Custom hex selector */}
                  <div className="flex gap-2.5 items-center pt-2">
                    <div className="w-9 h-9 rounded-xl border border-borderline shrink-0" style={{ backgroundColor: primaryColor }} />
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Hex: #4f46e5"
                        value={primaryColor}
                        onChange={(e) => {
                          if (e.target.value.startsWith("#") || e.target.value === "") {
                            setPrimaryColor(e.target.value);
                          } else {
                            setPrimaryColor("#" + e.target.value);
                          }
                        }}
                        maxLength={7}
                        className="w-full bg-appbk border border-borderline text-txtmain placeholder-txtmuted/50 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 transition-colors text-left"
                        style={{ direction: "ltr" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Widgets layout config - Drag & Drop / Arrows */}
                <div className="pt-5 border-t border-borderline space-y-3.5 text-start">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-5 h-5 text-indigo-500" />
                    <h4 className="text-xs font-bold text-txtmain">{t("set_widgets_title")}</h4>
                  </div>
                  <p className="text-[11px] text-txtmuted leading-relaxed">
                    {t("set_widgets_desc")}
                  </p>

                  <div className="space-y-2">
                    {widgetOrder.map((widgetId, idx) => {
                      let textKey: any = "set_widget_revenue";
                      if (widgetId === "costs") textKey = "set_widget_costs";
                      else if (widgetId === "net_profit") textKey = "set_widget_net_profit";
                      else if (widgetId === "profit_margin") textKey = "set_widget_profit_margin";

                      return (
                        <div
                          key={widgetId}
                          draggable
                          onDragStart={() => handleDragStart(idx)}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDragEnd={handleDragEnd}
                          className={`flex items-center justify-between p-3 bg-appbk border rounded-xl duration-150 transition-all select-none hover:bg-borderline/10 ${
                            draggedIndex === idx
                              ? "border-indigo-500 bg-indigo-500/5 opacity-50 scale-[0.98] cursor-grabbing"
                              : "border-borderline cursor-grab"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <GripVertical className="w-4 h-4 text-txtmuted shrink-0" />
                            <span className="text-xs font-medium text-txtmain">
                              {t(textKey)}
                            </span>
                          </div>

                          {/* Manual Quick Button support */}
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => moveWidget(idx, "up")}
                              disabled={idx === 0}
                              title={language === "ar" ? "نقل لأعلى" : "Move Up"}
                              className="p-1 text-txtmain bg-cardbk border border-borderline hover:bg-borderline/25 rounded-md disabled:opacity-30 transition-colors cursor-pointer"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveWidget(idx, "down")}
                              disabled={idx === widgetOrder.length - 1}
                              title={language === "ar" ? "نقل لأسفل" : "Move Down"}
                              className="p-1 text-txtmain bg-cardbk border border-borderline hover:bg-borderline/25 rounded-md disabled:opacity-30 transition-colors cursor-pointer"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Automatic Email Notifications Module */}
                <div className="p-4 bg-appbk/50 rounded-2xl border border-borderline/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-xs text-txtmain flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{language === "ar" ? "تفعيل التذكير البريدي التلقائي" : "Auto-due Invoice Email Alerts"}</span>
                      </h4>
                      <p className="text-[10px] text-txtmuted max-w-xs leading-normal">
                        {language === "ar"
                          ? "إرسال رسالة تذكيرية للعميل تلقائياً عبر البريد الإلكتروني عند اقتراب موعد استحقاق الفاتورة بـ 3 أيام أو أقل."
                          : "Dispatch automated warning remind logs to client mail lines 3 days before their billing targets mature."}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEnableDueEmailNotifications(!enableDueEmailNotifications)}
                      className={`w-11 h-6 rounded-full transition-all relative flex items-center px-1 duration-200 shrink-0 ${
                        enableDueEmailNotifications ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-750'
                      }`}
                      id="notifications-email-toggle"
                    >
                      <span
                        className={`w-4 h-4 rounded-full bg-white shadow-md transition-all duration-200 ${
                          enableDueEmailNotifications ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4 border-t border-borderline">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{loading ? (language === "ar" ? "جاري الحفظ..." : "Saving...") : t("settings_save_btn")}</span>
                  </button>
                </div>

              </form>
            </div>
          </div>

          {/* Brand Identity Preview Card */}
          <div className="lg:col-span-5">
            <div className="bg-cardbk p-6 rounded-2xl shadow-sm border border-borderline space-y-4">
              <div className="flex items-center gap-2 border-b border-borderline pb-4">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-md font-bold text-txtmain">{language === "ar" ? "معاينة الهوية التلقائية" : "Adaptive Invoice Preview"}</h3>
              </div>

              <p className="text-[11px] text-txtmuted leading-relaxed">
                {language === "ar" 
                  ? "توضح هذه البطاقة كيف ستبدو ترويسة منشأتك على الفاتورة المبسطة وفي التصدير عند جاهزية الطباعة وتوليد PDF:" 
                  : "This outline previews how company banners layout across standard printed sheets and compiled PDF/Tax models:"}
              </p>

              <div className="border border-slate-200 rounded-xl p-4 bg-white text-slate-800 space-y-4" style={{ direction: "rtl" }}>
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  
                  {/* Logo / First Letter Preview */}
                  <div className="flex items-center gap-2.5 text-right w-full">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={name || "Sch"}
                        className="w-10 h-10 rounded-lg object-contain border border-slate-200 p-1 font-sans font-medium"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : null}
                    <div 
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs uppercase shadow-sm transition-colors duration-150 shrink-0"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {name ? name.substring(0, 1) : "؟"}
                    </div>
                    <div className="text-right flex-1 min-w-0">
                      <h4 className="text-xs font-black text-slate-900 leading-tight truncate">{name || "المنشأة الحالية"}</h4>
                      <span className="text-[9px] text-slate-400 font-mono">الرقم الضريبي: 3000xxxxxxxxx83</span>
                    </div>
                  </div>

                  <div className="text-left font-mono shrink-0">
                    <span 
                      className="text-[8px] text-white px-2 py-0.5 rounded-full font-bold whitespace-nowrap"
                      style={{ backgroundColor: primaryColor }}
                    >
                      فاتورة ضريبية مبسطة
                    </span>
                    <div className="text-[9px] text-slate-500 mt-1">#INV-PREVIEW</div>
                  </div>

                </div>

                {/* Mini Table header colored by brand identity */}
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-1 text-[9px] font-bold text-white p-2 rounded-lg" style={{ backgroundColor: primaryColor }}>
                    <span className="col-span-8 text-right">بيان الخدمة</span>
                    <span className="col-span-4 text-left font-sans">الإجمالي ({currency})</span>
                  </div>
                  <div className="grid grid-cols-12 gap-1 text-[9px] text-slate-600 px-2">
                    <span className="col-span-8 text-right font-medium">عملية تشغيلية منجزة</span>
                    <span className="col-span-4 text-left font-mono font-bold">{currency} 45,000.00</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[8px] text-slate-400">
                  <span>مطابقة لمواصفات ZATCA / Fatoora Standard</span>
                  <span className="font-bold shrink-0" style={{ color: primaryColor }}>هوية المنشأة ✓</span>
                </div>
              </div>

              <div className="p-3.5 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-[10px] text-txtmuted flex gap-2 leading-relaxed">
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <p>
                  {language === "ar" 
                    ? "يتم حفظ هذا الإعداد محلياً ومركزياً، وينطبق تلقائياً على كل مستخدمي هذا الحساب الضريبي المتعدد المستأجرين." 
                    : "This dataset is bound centrally, updating the layout of your client-facing receipts under sandbox compliance."}
                </p>
              </div>

            </div>
          </div>

        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          {/* Members console split */}
          
          {/* Left panel: Add Member */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-cardbk p-5 rounded-2xl border border-borderline shadow-sm">
              <div className="flex items-center gap-2 border-b border-borderline pb-3 mb-4">
                <UserPlus className="w-4.5 h-4.5 text-indigo-500" />
                <h3 className="text-md font-bold text-txtmain">
                  {language === "ar" ? "تسجيل عضو جديد" : "Register Team Member"}
                </h3>
              </div>

              {userRole !== "owner" ? (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>{language === "ar" ? "رتبة غير كافية" : "Role Restriction"}</span>
                  </div>
                  <p className="leading-relaxed">
                    {language === "ar"
                      ? "عذراً! ميزة تسجيل مستخدمين جدد وتعديل الأدوار حصرية فقط لمالك الشركة (Owner). صلاحيتك الحالية لا تسمح لك بالتحكم."
                      : "Access denied. Roster modifications can only be requested by the structural account Owner."}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleAddMember} className="space-y-4">
                  {memberMessage.error && (
                    <div className="p-3 bg-rose-500/10 text-rose-400 text-xs rounded-xl border border-rose-500/20 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{memberMessage.error}</span>
                    </div>
                  )}

                  {memberMessage.success && (
                    <div className="p-3 bg-emerald-500/10 text-emerald-400 text-xs rounded-xl border border-emerald-500/20 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{memberMessage.success}</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="block text-txtmain text-[11px] font-semibold mb-1">
                        {language === "ar" ? "الاسم الكامل" : "Full Name"}
                      </label>
                      <input
                        type="text"
                        placeholder={language === "ar" ? "مثل: محمد علي" : "e.g. John Doe"}
                        value={memberForm.name}
                        onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                        required
                        className="w-full bg-appbk border border-borderline text-txtmain placeholder-txtmuted/45 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 transition-colors font-medium text-start"
                      />
                    </div>

                    <div>
                      <label className="block text-txtmain text-[11px] font-semibold mb-1">
                        {language === "ar" ? "البريد الإلكتروني" : "Email Address"}
                      </label>
                      <input
                        type="email"
                        placeholder="user@enterprise.com"
                        value={memberForm.email}
                        onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value.toLowerCase() })}
                        required
                        className="w-full bg-appbk border border-borderline text-txtmain placeholder-txtmuted/45 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 transition-colors font-medium text-left"
                        style={{ direction: "ltr" }}
                      />
                    </div>

                    <div>
                      <label className="block text-txtmain text-[11px] font-semibold mb-1">
                        {language === "ar" ? "رتبة الصلاحية" : "System Access Privilege"}
                      </label>
                      <select
                        value={memberForm.role}
                        onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                        className="w-full bg-appbk border border-borderline text-txtmain rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 transition-colors font-medium text-start"
                      >
                        <option value="admin">{language === "ar" ? "مشرف (Admin)" : "Admin"}</option>
                        <option value="subscriber">{language === "ar" ? "مشترك قارئ (Subscriber)" : "Subscriber"}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-txtmain text-[11px] font-semibold mb-1">
                        {language === "ar" ? "حالة العضوية" : "Roster State"}
                      </label>
                      <select
                        value={memberForm.status}
                        onChange={(e) => setMemberForm({ ...memberForm, status: e.target.value })}
                        className="w-full bg-appbk border border-borderline text-txtmain rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 transition-colors font-medium text-start"
                      >
                        <option value="Active">{language === "ar" ? "نشط (Active)" : "Active"}</option>
                        <option value="Inactive">{language === "ar" ? "معطل (Inactive)" : "Inactive"}</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{language === "ar" ? "تسجيل العضو في المنشأة" : "Create Enterprise Account"}</span>
                  </button>
                </form>
              )}
            </div>

            {/* enterprise stats widget for members */}
            <div className="bg-cardbk p-4 rounded-2xl border border-borderline space-y-3.5 shadow-sm">
              <h4 className="text-xs font-extrabold text-txtmain uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>{language === "ar" ? "الامتيازات والصلاحيات" : "Roster Permissions Matrix"}</span>
              </h4>
              <div className="space-y-2.5 text-[10.5px]">
                <div className="p-2.5 rounded-xl border border-borderline bg-appbk/50 space-y-1">
                  <div className="flex items-center gap-1 text-indigo-400 font-extrabold">
                    <Crown className="w-3.5 h-3.5 shrink-0" />
                    <span>{language === "ar" ? "المالك (Owner)" : "Account Owner"}</span>
                  </div>
                  <p className="text-txtmuted leading-normal">
                    {language === "ar" 
                      ? "صلاحية قصوى كاملة على الكيان المالي والمؤسساتي، إدارة الفواتير والاشتراكات والسيرفر والنسخ والتحكم بقوائم المستخدمين الضريبية." 
                      : "Absolute governance of enterprise. Authorized to manage budgets, server snapshots, client directories, subscription structures & rosters."}
                  </p>
                </div>

                <div className="p-2.5 rounded-xl border border-borderline bg-appbk/50 space-y-1">
                  <div className="flex items-center gap-1 text-amber-500 font-extrabold">
                    <Shield className="w-3.5 h-3.5 shrink-0" />
                    <span>{language === "ar" ? "المشرف (Admin)" : "Enterprise Admin"}</span>
                  </div>
                  <p className="text-txtmuted leading-normal">
                    {language === "ar" 
                      ? "يمتلك الصلاحية التشغيلية اليومية الكاملة: إضافة خدمات، عملاء، فواتير ضريبية، عمليات مالية. لا يمكنه إوقاف الاشتراك أو إدارة قوائم المستخدمين." 
                      : "Operational power. Can manage clients, services, tax operations & invoice books. Prohibited from editing subscriptions or users rosters."}
                  </p>
                </div>

                <div className="p-2.5 rounded-xl border border-borderline bg-appbk/50 space-y-1">
                  <div className="flex items-center gap-1 text-slate-400 font-extrabold">
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span>{language === "ar" ? "مشترك قارئ (Subscriber)" : "Subscriber Reader"}</span>
                  </div>
                  <p className="text-txtmuted leading-normal">
                    {language === "ar" 
                      ? "صلاحية مخصصة للقراءة والتدقيق: استعراض لوحة القيادة، التقارير المالية والضريبية، جدول العمليات، الفواتير كقارئ غير مصرح له بتدوين أو حذف أي بند." 
                      : "Inspection view. Allowed to read accounting books, dashboards, audit trails, operations sheets & printable tax receipts. Blocked from writes."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right panel: Members Table */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-cardbk p-5 rounded-2xl border border-borderline space-y-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <Users className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="text-md font-bold text-txtmain">
                      {language === "ar" ? "أعضاء كادر المنشأة" : "Enterprise Workspace Roster"}
                    </h3>
                    <p className="text-[11px] text-txtmuted1">
                      {language === "ar" 
                        ? "تنظيم رتب الدخول والتحكم في حوكمة الكيان المالي ومطابقة Cloud Firestore"
                        : "Track corporate accounts, access states and credentials synchronized with secure Firestore."}
                    </p>
                  </div>
                </div>

                {/* Counter Badge */}
                <div className="px-3 py-1 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 text-xs font-black">
                  <span>{members.length}</span>
                  <span className="text-[10px] font-normal mr-1">{language === "ar" ? "أعضاء" : "members"}</span>
                </div>
              </div>

              {/* Roster Table */}
              <div className="overflow-x-auto rounded-xl border border-borderline bg-appbk">
                <table className="w-full text-start border-collapse text-xs">
                  <thead>
                    <tr className="bg-borderline/10 text-txtmuted text-[10.5px] font-bold border-b border-borderline">
                      <th className="py-2.5 px-3 text-start">{language === "ar" ? "الاسم" : "Member Name"}</th>
                      <th className="py-2.5 px-3 text-start font-mono">{language === "ar" ? "البريد الإلكتروني" : "Email Address"}</th>
                      <th className="py-2.5 px-3 text-center">{language === "ar" ? "الصلاحية الرتبية" : "Role Privilege"}</th>
                      <th className="py-2.5 px-3 text-center">{language === "ar" ? "الحالة" : "Access State"}</th>
                      {userRole === "owner" && <th className="py-2.5 px-3 text-center">{language === "ar" ? "التحكم المباشر" : "Direct Action"}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {membersLoading ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-txtmuted">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                          <span>{language === "ar" ? "جاري تعبئة القائمة الآمنة من Firebase..." : "Loading crew details..."}</span>
                        </td>
                      </tr>
                    ) : members.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-txtmuted font-mono">
                          {language === "ar" ? "لم يتم العثور على أي كادر مسجل." : "Roster directory is empty."}
                        </td>
                      </tr>
                    ) : (
                      members.map((member) => {
                        const isSelf = member.email.toLowerCase() === currentUserEmail?.toLowerCase();
                        
                        return (
                          <tr key={member.id} className="border-b border-borderline/40 hover:bg-borderline/10 transition-colors">
                            <td className="py-3 px-3 text-txtmain font-bold">
                              <div className="flex flex-col">
                                <span className="text-xs truncate max-w-[150px]">{member.name}</span>
                                {isSelf && (
                                  <span className="text-[9px] text-indigo-400 font-extrabold mt-0.5">
                                    {language === "ar" ? "حسابك الحالي" : "(you)"}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-3 text-txtmuted font-semibold font-mono text-[10.5px] text-left">
                              {member.email}
                            </td>

                            <td className="py-3 px-3 text-center">
                              {userRole === "owner" && !isSelf && member.role !== "owner" ? (
                                <select
                                  value={member.role}
                                  onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                                  className="mx-auto bg-appbk border border-borderline text-txtmain rounded-lg px-2 py-1 text-[10.5px] focus:outline-none focus:border-indigo-500 font-bold max-w-[110px]"
                                >
                                  <option value="admin">{language === "ar" ? "مشرف" : "Admin"}</option>
                                  <option value="subscriber">{language === "ar" ? "مشترك قارئ" : "Subscriber"}</option>
                                </select>
                              ) : (
                                <div className="inline-flex items-center justify-center gap-1">
                                  {member.role === "owner" ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black border border-emerald-500/20">
                                      <Crown className="w-3 h-3 text-emerald-400" />
                                      <span>{language === "ar" ? "المالك" : "Owner"}</span>
                                    </span>
                                  ) : member.role === "admin" ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black border border-amber-500/20">
                                      <Shield className="w-3 h-3 text-amber-500" />
                                      <span>{language === "ar" ? "مشرف" : "Admin"}</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 text-[10px] font-black border border-slate-500/20">
                                      <Users className="w-3 h-3 text-slate-400" />
                                      <span>{language === "ar" ? "مشترك قارئ" : "Subscriber"}</span>
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-3 text-center">
                              {userRole === "owner" && !isSelf && member.role !== "owner" ? (
                                <select
                                  value={member.status}
                                  onChange={(e) => handleUpdateStatus(member.id, e.target.value)}
                                  className="mx-auto bg-appbk border border-borderline text-txtmain rounded-lg px-2 py-1 text-[10.5px] focus:outline-none focus:border-indigo-500 font-bold max-w-[100px]"
                                >
                                  <option value="Active">{language === "ar" ? "نشط" : "Active"}</option>
                                  <option value="Inactive">{language === "ar" ? "معطل" : "Inactive"}</option>
                                </select>
                              ) : (
                                <div className="inline-flex items-center">
                                  {member.status === "Active" ? (
                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-extrabold border border-emerald-500/20">
                                      <span className="w-1 h-1 rounded-full bg-emerald-400" />
                                      <span>{language === "ar" ? "نشط" : "Active"}</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500 text-[9px] font-extrabold border border-slate-500/20">
                                      <span className="w-1 h-1 rounded-full bg-slate-400" />
                                      <span>{language === "ar" ? "معطل" : "Inactive"}</span>
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            {userRole === "owner" && (
                              <td className="py-3 px-3 text-center">
                                {isSelf || member.role === "owner" ? (
                                  <span className="text-[10px] text-txtmuted italic">
                                    {language === "ar" ? "مثبت حماية الضمانات" : "locked"}
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleDeleteMember(member.id)}
                                    title={language === "ar" ? "حذف وإلغاء حساب العضو" : "Delete Member"}
                                    className="p-1 px-2 text-rose-500 hover:text-rose-400 border border-rose-500/20 hover:bg-rose-500/10 rounded-lg text-[10px] font-bold duration-150 transition-colors cursor-pointer"
                                  >
                                    <span>{language === "ar" ? "حذف وإقصاء" : "Revoke"}</span>
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Section */}
      <div className="lg:col-span-12 mt-4">
        <div className="bg-cardbk p-6 rounded-2xl shadow-sm border border-borderline">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-borderline pb-4 mb-5">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <ShieldAlert className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-txtmain">{t("audit_title")}</h3>
                <p className="text-xs text-txtmuted mt-0.5">{t("audit_subtitle")}</p>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.preventDefault();
                fetchAuditLogs();
              }}
              disabled={logsLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-borderline bg-appbk text-txtmain hover:bg-borderline/30 transition-all text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? "animate-spin" : ""}`} />
              <span>{t("audit_refresh")}</span>
            </button>
          </div>

          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className={`absolute ${language === "ar" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-txtmuted`} />
              <input
                type="text"
                placeholder={language === "ar" ? "البحث في سجل الإجراءات..." : "Search action logs..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full bg-appbk border border-borderline text-txtmain placeholder-txtmuted/50 rounded-xl py-2 text-xs focus:outline-none focus:border-indigo-500 transition-colors ${language === "ar" ? "pr-9 pl-3.5" : "pl-9 pr-3.5"}`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-txtmuted font-medium">{language === "ar" ? "تصنيف الحدث:" : "Category:"}</span>
              <div className="flex items-center gap-1.5">
                {(["All", "Creation", "Settings", "Deletion", "InvoiceStatus"] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                      activeCategory === cat
                        ? "bg-indigo-500 border-indigo-500 text-white"
                        : "bg-appbk border-borderline text-txtmuted hover:border-txtmuted"
                    }`}
                  >
                    {cat === "All" && (language === "ar" ? "الكل" : "All Rows")}
                    {cat === "Creation" && (language === "ar" ? "الإنشاء والتسجيل" : "Registration")}
                    {cat === "Settings" && (language === "ar" ? "الهوية والإعدادات" : "Settings overrides")}
                    {cat === "Deletion" && (language === "ar" ? "عمليات الحذف" : "Deletions")}
                    {cat === "InvoiceStatus" && (language === "ar" ? "تعديل الفواتير" : "Cash collection")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto rounded-xl border border-borderline bg-appbk">
            <table className="w-full text-start border-collapse text-xs">
              <thead>
                <tr className="bg-borderline/10 text-txtmuted text-[11px] font-bold border-b border-borderline">
                  <th className="py-3 px-4 text-start">{language === "ar" ? "موجز الحدث" : "Event Tag"}</th>
                  <th className="py-3 px-4 text-start">{language === "ar" ? "تفاصيل الإجراء" : "Action Metadata Details"}</th>
                  <th className="py-3 px-4 text-start">{language === "ar" ? "التاريخ والتوقيت" : "Timestamp"}</th>
                  <th className="py-3 px-4 text-center">{language === "ar" ? "المستخدم" : "Invoker / User"}</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-txtmuted text-sm font-medium">
                      {logsLoading ? (
                        <div className="flex flex-col items-center gap-2">
                          <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                          <span>{language === "ar" ? "جاري قراءة سجل الأحداث من المخدم الآمن..." : "Reading audit logs from secure vaults..."}</span>
                        </div>
                      ) : (
                        <span>{language === "ar" ? "لا توجد أي سجلات أحداث تطابق معايير البحث الحالية." : "No actions logged for the active enterprise scope."}</span>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    let badgeColor = "bg-slate-500/10 text-slate-400 border-slate-500/20";
                    if (log.action.includes("إنشاء") || log.action.includes("تسجيل") || log.action.toLowerCase().includes("create") || log.action.toLowerCase().includes("add")) {
                      badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                    } else if (log.action.includes("تعديل") || log.action.includes("هوية") || log.action.toLowerCase().includes("update") || log.action.toLowerCase().includes("edit")) {
                      badgeColor = "bg-purple-500/10 text-purple-400 border-purple-500/20";
                    } else if (log.action.includes("حذف") || log.action.toLowerCase().includes("delete")) {
                      badgeColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                    } else if (log.action.includes("تحديث") || log.action.includes("سداد") || log.action.toLowerCase().includes("status") || log.action.toLowerCase().includes("collect")) {
                      badgeColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                    } else if (log.action.includes("مشاركة") || log.action.includes("تصدير") || log.action.toLowerCase().includes("export")) {
                      badgeColor = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
                    }

                    const formattedDate = new Date(log.timestamp).toLocaleString(language === "ar" ? "ar-SA" : "en-US", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: true
                    });

                    return (
                      <tr key={log.id} className="border-b border-borderline/50 hover:bg-borderline/10 transition-colors text-xs">
                        <td className="py-3.5 px-4 font-bold text-txtmain">
                          <span className={`inline-block px-2.5 py-1 rounded-lg border text-[10.5px] font-black ${badgeColor}`}>
                            {log.action}
                          </span>
                        </td>
                        
                        <td className="py-3.5 px-4 text-txtmuted font-medium" title={log.details}>
                          {log.details}
                        </td>

                        <td className="py-3.5 px-4 text-start font-mono font-bold text-txtmuted">
                          {formattedDate}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-500/5 text-txtmain font-bold border border-borderline/30 text-[10.5px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            <span>{log.user}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-3 text-[10px] text-txtmuted">
            <span>{language === "ar" ? `عرض ${filteredLogs.length} من أصل ${auditLogs.length} سجل` : `Showing ${filteredLogs.length} of ${auditLogs.length} records`}</span>
            <span className="font-mono">{language === "ar" ? "نظام ERP الآمن لتدقيق العمليات الموحد (System Audit Vault v1.1)" : "System Audit Logs Shield Vault (v1.1)"}</span>
          </div>

        </div>
      </div>

    </div>
  );
}
