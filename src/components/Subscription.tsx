import React, { useState, useMemo, useEffect } from "react";
import { Company, AuditLog, TeamMember } from "../types";
import { useLanguage } from "../lib/LanguageContext";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  CreditCard,
  CheckCircle,
  HelpCircle,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Zap,
  Globe,
  Database,
  Building,
  ShieldCheck,
  ChevronRight,
  UserCheck,
  Users,
  Shield,
  UserPlus,
  Trash2,
  Edit,
  Lock,
  Unlock,
  ShieldAlert
} from "lucide-react";

interface SubscriptionProps {
  currentCompany: Company | null;
  companyCurrency: string;
  onRefreshCompanyData: () => Promise<void>;
  auditLogs?: AuditLog[];
  currentUserEmail?: string | null;
  userRole?: "owner" | "admin" | "subscriber";
  onChangeRole?: (role: "owner" | "admin" | "subscriber") => void;
}

export default function Subscription({
  currentCompany,
  companyCurrency = "ر.س",
  onRefreshCompanyData,
  auditLogs = [],
  currentUserEmail = null,
  userRole = "owner",
  onChangeRole
}: SubscriptionProps) {
  const { language, t } = useLanguage();
  const isAr = language === "ar";

  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"Trial" | "Starter" | "Business" | "Enterprise" | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCVV, setCardCVV] = useState("");
  const [localLogs, setLocalLogs] = useState<AuditLog[]>([]);

  // Core Sub-Tab choosing between pricing plans and Team governance
  const [activeSubTab, setActiveSubTab] = useState<"plans" | "team_roles">("plans");

  // Personnel Team states
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberFormName, setMemberFormName] = useState("");
  const [memberFormEmail, setMemberFormEmail] = useState("");
  const [memberFormRole, setMemberFormRole] = useState<"owner" | "admin" | "subscriber">("subscriber");
  const [memberFormStatus, setMemberFormStatus] = useState<"Active" | "Invited" | "Suspended">("Active");
  const [memberError, setMemberError] = useState("");
  const [memberSuccess, setMemberSuccess] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  const fetchMembers = async () => {
    if (!currentCompany?.id) return;
    setMembersLoading(true);
    try {
      const res = await fetch("/api/members", {
        headers: {
          "x-company-id": currentCompany.id
        }
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (e) {
      console.error("Error fetching team members:", e);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany?.id) return;
    setMemberError("");
    setMemberSuccess("");
    try {
      const isEdit = !!editingMemberId;
      const url = isEdit ? `/api/members/${editingMemberId}` : "/api/members";
      const method = isEdit ? "PUT" : "POST";
      const payload = isEdit 
        ? { name: memberFormName, role: memberFormRole, status: memberFormStatus }
        : { name: memberFormName, email: memberFormEmail, role: memberFormRole, status: memberFormStatus };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-company-id": currentCompany.id
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "خطأ أثناء حفظ البيانات");
      }

      setMemberSuccess(isAr ? (isEdit ? "تم تحديث منصب عضو الفريق بنجاح!" : "تمت دعوة وإضافة عضو الفريق الجديد!") : (isEdit ? "Member roles saved successfully!" : "Team member registered successfully!"));
      setMemberFormName("");
      setMemberFormEmail("");
      setEditingMemberId(null);
      setIsAddingMember(false);
      await fetchMembers();
    } catch (err: any) {
      setMemberError(err.message || "حدث خطأ");
    }
  };

  const handleEditMemberClick = (member: TeamMember) => {
    setEditingMemberId(member.id);
    setMemberFormName(member.name);
    setMemberFormEmail(member.email);
    setMemberFormRole(member.role);
    setMemberFormStatus(member.status);
    setIsAddingMember(true);
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!currentCompany?.id) return;
    if (!confirm(isAr ? `هل أنت متأكد من إلغاء صلاحية واستبعاد العضو "${name}" من المنشأة؟` : `Are you sure you want to decommission role access for "${name}"?`)) return;

    setMemberError("");
    setMemberSuccess("");
    try {
      const res = await fetch(`/api/members/${id}`, {
        method: "DELETE",
        headers: {
          "x-company-id": currentCompany.id
        }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "فشل حذف العضو");
      }
      setMemberSuccess(isAr ? "تم إزالة وإلغاء صلاحيات العضو بنجاح" : "Member removed successfully");
      await fetchMembers();
    } catch (err: any) {
      setMemberError(err.message || "حدث خطأ");
    }
  };

  useEffect(() => {
    if (currentCompany?.id) {
      fetchMembers();
    }
  }, [currentCompany?.id, activeSubTab]);

  useEffect(() => {
    if (currentCompany?.id) {
      fetch("/api/audit-logs", {
        headers: {
          "x-company-id": currentCompany.id
        }
      })
        .then((res) => {
          if (res.ok) return res.json();
          return [];
        })
        .then((data) => {
          setLocalLogs(data);
        })
        .catch((err) => console.error("Failed to load subscription logs:", err));
    }
  }, [currentCompany?.id, success]);

  const currentPlan = currentCompany?.subscription_plan || "Trial";
  const currentStatus = currentCompany?.subscription_status || "Active";
  const currentExpiry = currentCompany?.subscription_expiry || "2026-12-31";
  const currentCycle = currentCompany?.subscription_billing_cycle || "monthly";

  // Subscription plan prices in USD & SAR
  const plans = useMemo(() => {
    const isSar = companyCurrency === "ر.س" || companyCurrency === "SAR";
    const symbol = companyCurrency;
    
    const multiplier = isSar ? 3.75 : 1; // Basic conversion if not SAR or USD, let's keep prices matched

    return [
      {
        id: "Trial" as const,
        nameAr: "الباقة التجريبية",
        nameEn: "Trial Plan",
        priceMonthly: 0,
        priceYearly: 0,
        color: "from-slate-500 to-slate-700",
        textColor: "text-slate-400",
        featuresAr: [
          "دعم حتى 3 عمليات تشغيلية",
          "دعم حتى 3 عملاء فقط",
          "إعداد الميزانية في وضع القراءة فقط",
          "تصاميم فواتير افتراضية قياسية"
        ],
        featuresEn: [
          "Standard default layouts",
          "Up to 3 operational logs",
          "Up to 3 client contacts",
          "Read-only dashboard statistics"
        ],
        badgeAr: "مبتدئ",
        badgeEn: "Sandbox"
      },
      {
        id: "Starter" as const,
        nameAr: "باقة الخطوة الأولى",
        nameEn: "Starter Plan",
        priceMonthly: Math.round(19 * multiplier),
        priceYearly: Math.round(190 * multiplier),
        color: "from-blue-500 to-indigo-600",
        textColor: "text-blue-400",
        featuresAr: [
          "دعم حتى 30 عملية تشغيلية/شهر",
          "دعم حتى 20 عميلاً ومؤسسة",
          "منظومة كشف ضريبي مبسط",
          "تصدير التقارير بصيغة PDF",
          "دعم فني عبر البريد الإلكتروني"
        ],
        featuresEn: [
          "Up to 30 active operations/mo",
          "Up to 20 client accounts",
          "Simplified VAT ledger reporting",
          "PDF report exporting",
          "Email support desk access"
        ],
        badgeAr: "الأنسب للأفراد",
        badgeEn: "For Freelancers"
      },
      {
        id: "Business" as const,
        nameAr: "الباقة التجارية الاحترافية",
        nameEn: "Business Premium",
        priceMonthly: Math.round(49 * multiplier),
        priceYearly: Math.round(490 * multiplier),
        color: "from-indigo-500 to-violet-600",
        textColor: "text-indigo-400",
        featuresAr: [
          "عمليات تشغيلية غير محدودة للخدمات",
          "عملاء غير محدودين للمؤسسة",
          "نظام طباعة الفاتورة الضريبية ZATCA",
          "تعديل الهوية واللون وشعار المنشأة",
          "تزامن تلقائي مع Google Sheets",
          "إدارة المصروفات التشغيلية والرسوم البيانية"
        ],
        featuresEn: [
          "Unlimited operational services",
          "Unlimited corporate client registry",
          "ZATCA compliance and QR generator",
          "Custom branding color and logos",
          "Automatic Google Sheets synchronization",
          "Operational expenses distribution charts"
        ],
        badgeAr: "الأكثر مبيعاً",
        badgeEn: "Popular Choice"
      },
      {
        id: "Enterprise" as const,
        nameAr: "باقة الشركات الكبرى",
        nameEn: "Enterprise Solution",
        priceMonthly: Math.round(149 * multiplier),
        priceYearly: Math.round(1490 * multiplier),
        color: "from-amber-500 to-rose-600",
        textColor: "text-amber-500",
        featuresAr: [
          "قاعدة بيانات سحابية معزولة بالكامل (SQL)",
          "تعديل كامل لواجهة الدخول والصلاحيات",
          "مدير حساب مالي تقني مخصص",
          "توافق ISO 27001 للأمن السيبراني",
          "دعم فني متميز عبر الهاتف والواتساب 24/7",
          "تكامل مخصص مع API الخارجي للمؤسسة"
        ],
        featuresEn: [
          "Fully dedicated sandboxed cloud server",
          "Advanced role and access control governance",
          "Dedicated technical account manager",
          "ISO 27001 and high-security hosting",
          "24/7 priority phone & web support access",
          "Custom API and webhook integrations"
        ],
        badgeAr: "للشركات الرائدة",
        badgeEn: "Scale-up Corporates"
      }
    ];
  }, [companyCurrency]);

  const handleOpenCheckout = (planId: "Trial" | "Starter" | "Business" | "Enterprise") => {
    setSelectedPlan(planId);
    setCardHolder("");
    setCardNumber("");
    setCardExpiry("");
    setCardCVV("");
    setSuccess(false);
    setShowCheckout(true);
  };

  const handleConfirmUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !currentCompany) return;

    setLoading(true);
    try {
      const selectedPlanData = plans.find((p) => p.id === selectedPlan);
      const price =
        billingCycle === "yearly"
          ? selectedPlanData?.priceYearly || 0
          : selectedPlanData?.priceMonthly || 0;

      const res = await fetch(`/api/companies/${currentCompany.id}/subscription`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-company-id": currentCompany.id
        },
        body: JSON.stringify({
          subscription_plan: selectedPlan,
          subscription_billing_cycle: billingCycle,
          price_paid: price
        })
      });

      if (!res.ok) {
        throw new Error("حدث خطأ أثناء ترقية الاشتراك");
      }

      setSuccess(true);
      await onRefreshCompanyData();
      setTimeout(() => {
        setShowCheckout(false);
        setSuccess(false);
        setSelectedPlan(null);
      }, 2500);
    } catch (err) {
      console.error(err);
      alert(isAr ? "عذراً، فشل تحديث الاشتراك." : "Failed to update package.");
    } finally {
      setLoading(false);
    }
  };

  // Filter subscription audit logs
  const subLogs = useMemo(() => {
    const logs = localLogs.length > 0 ? localLogs : auditLogs;
    return logs
      .filter((log) => log.action === "ترقية خطة الاشتراك والخدمات" || log.action.includes("خطة الاشتراك") || log.action.includes("الاشتراك"))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [localLogs, auditLogs]);

  return (
    <div className="space-y-6">
      {/* Visual Banner Header */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 rounded-2xl border border-indigo-500/20 p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAr ? "تحليل النماذج السحابية والاشتراكات" : "SaaS Instance Control"}</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white leading-tight">
              {isAr ? "إدارة خطط اشتراكات ومميزات الشركة" : "SaaS Subscription & Plan Portal"}
            </h2>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl leading-relaxed">
              {isAr
                ? "اختر الباقة المناسبة لتفعيل مميزات إضافية معززة، ورفع قيود عدد العمليات، والعملاء، وتخصيص العلامة التجارية لفواتير ZATCA."
                : "Manage your cloud system limits, expand active records, configure custom PDF designs and synchronize Google Sheets modules instantly."}
            </p>
          </div>

          {/* Current plan badge element */}
          <div className="bg-slate-900/80 border border-slate-700/60 p-5 rounded-xl shrink-0 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Zap className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-black tracking-wider">
                {isAr ? "الاشتراك الحالي للمنشأة" : "Current Active Plan"}
              </div>
              <div className="text-md font-bold text-slate-100 flex items-center gap-2 mt-0.5">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-sky-400 font-extrabold text-lg">
                  {currentPlan}
                </span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                  {isAr ? "نشط ومفعل" : "Fully Active"}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                <span>
                  {isAr ? "تاريخ التجديد التالي:" : "Next renewal:"} {currentExpiry}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Cycle Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-txtmain text-md">
            {isAr ? "الباقات والأسعار المتاحة" : "Available System Subscriptions"}
          </h3>
          <p className="text-xs text-txtmuted">
            {isAr ? "الأسعار معروضة بناءً على العملة الرسمية المعتمدة لشركتك حالياً." : "Subscription fees are rendered dynamic to your Selected Company Currency."}
          </p>
        </div>

        {/* Pricing toggle */}
        <div className="p-1 bg-cardbk border border-borderline rounded-xl inline-flex self-start sm:self-auto shadow-inner">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              billingCycle === "monthly"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-txtmuted hover:text-txtmain"
            }`}
          >
            {isAr ? "فاتورة شهرية" : "Bill Monthly"}
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              billingCycle === "yearly"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-txtmuted hover:text-txtmain"
            }`}
          >
            <span>{isAr ? "فاتورة سنوية" : "Bill Yearly"}</span>
            <span className="text-[9px] bg-emerald-500 text-white font-extrabold px-1.5 py-0.5 rounded-md leading-none">
              {isAr ? "وفر 20%" : "Save 20%"}
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const price = billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
          const cycleLabel = billingCycle === "yearly" ? (isAr ? "/سنوياً" : "/yr") : (isAr ? "/شهرياً" : "/mo");

          return (
            <div
              key={plan.id}
              className={`bg-cardbk rounded-2xl border transition-all flex flex-col justify-between overflow-hidden relative ${
                isCurrent
                  ? "border-indigo-500 shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-500/30"
                  : "border-borderline hover:border-slate-700/80 hover:shadow-md"
              }`}
            >
              {/* Highlight header if current */}
              {isCurrent && (
                <div className="bg-indigo-600 text-center text-white py-1.5 text-[10px] font-black uppercase tracking-wider">
                  {isAr ? "باقتك النشطة الحالية" : "Your Current Subscription"}
                </div>
              )}

              {/* Package Details header */}
              <div className="p-6 pb-4 border-b border-borderline">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] bg-slate-500/10 text-txtmuted px-2 py-0.5 rounded-md font-bold text-xs">
                      {isAr ? plan.badgeAr : plan.badgeEn}
                    </span>
                    <h4 className="text-base font-black text-txtmain mt-1.5">
                      {isAr ? plan.nameAr : plan.nameEn}
                    </h4>
                  </div>
                  {isCurrent && (
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                  )}
                </div>

                {/* Price Label */}
                <div className="mt-4 flex items-baseline">
                  {price === 0 ? (
                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-400 font-sans">
                      {isAr ? "مجاني" : "FREE"}
                    </span>
                  ) : (
                    <>
                      <span className="text-2xl font-black text-txtmain font-sans">
                        {price.toLocaleString()}
                      </span>
                      <span className="text-xs text-txtmuted font-bold ms-1">
                        {companyCurrency}
                      </span>
                      <span className="text-[10px] text-txtmuted ms-0.5">
                        {cycleLabel}
                      </span>
                    </>
                  )}
                </div>
                {billingCycle === "yearly" && price > 0 && (
                  <p className="text-[9px] text-emerald-400 font-bold mt-1">
                    {isAr ? `توفير مع التجديد السنوي` : `Includes extra premium discounts`}
                  </p>
                )}
              </div>

              {/* Plan limits info panel */}
              <div className="p-6 pt-5 space-y-4 flex-grow">
                <div className="text-[10px] text-txtmuted uppercase font-bold tracking-wider">
                  {isAr ? "المميزات والحدود المتاحة" : "Features & Records Limits"}
                </div>
                <ul className="space-y-3">
                  {(isAr ? plan.featuresAr : plan.featuresEn).map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-txtmain leading-relaxed">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA Upgrade Trigger Button */}
              <div className="p-6 border-t border-borderline bg-appbk/40">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full text-center py-2.5 bg-slate-800 text-slate-500 rounded-xl text-xs font-bold font-sans cursor-default"
                  >
                    {isAr ? "الباقة مفعلة حالياً" : "Currently Active Plan"}
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenCheckout(plan.id)}
                    className="w-full text-center py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                  >
                    {isAr ? `تفعيل أو ترقية إلى (${plan.id})` : `Upgrade to ${plan.id}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Subscription FAQ and ISO Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-cardbk rounded-2xl border border-borderline p-6 space-y-4">
          <h3 className="font-bold text-md text-txtmain flex items-center gap-2 pb-2 border-b border-borderline">
            <HelpCircle className="w-5 h-5 text-indigo-500" />
            <span>{isAr ? "الأسئلة الشائعة وسياسات الدفع" : "Subscription Billing Rules"}</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-txtmain">
                {isAr ? "هل يمكنني الترقية أو إلغاء الاشتراك في أي وقت؟" : "Can I upgrade or downgrade anytime?"}
              </h4>
              <p className="text-[11px] text-txtmuted leading-relaxed">
                {isAr
                  ? "نعم، يمكنك تعديل باقة الاشتراك الحالية والترقية فوراً للحصول على المزيد من السعة. يعاد حساب مبالغ الفواتيرة بصورة تناسبية."
                  : "Yes, you can upgrade your plan at any point. Your storage limits and client capacities will instantly scale to match the upgraded plan."}
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-bold text-txtmain">
                {isAr ? "هل فواتير ZATCA والرموز معتمدة؟" : "Are ZATCA basic invoices supported?"}
              </h4>
              <p className="text-[11px] text-txtmuted leading-relaxed">
                {isAr
                  ? "نعم، إن فواتير الباقتين التجارية والشركات مجهزة لدعم متطلبات هيئة الزكاة والضريبة والجمارك كفواتير مبسطة بالرمز الذاتي QR."
                  : "Absolutely, starter and premium plans generate fully compliant basic simplified tax invoices featuring real-time generated secure QR codes."}
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-bold text-txtmain">
                {isAr ? "كيف تحتسب العملات المختلفة في التحصيل المالي؟" : "How are multiple currencies handled?"}
              </h4>
              <p className="text-[11px] text-txtmuted leading-relaxed">
                {isAr
                  ? "يحتسب الاشتراك ويعرض تلقائياً بناءً على العملة التي اخترتها كعملة رسمية في المنشأة الحالية لتجنب فارق الصرف البنكي."
                  : "Subscription pricing dynamically translates to the selected base currency in your accounting set-up to preserve localized ledger consistency."}
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-bold text-txtmain">
                {isAr ? "هل بياناتي معزولة ومحمية؟" : "Is my company SaaS data isolated?"}
              </h4>
              <p className="text-[11px] text-txtmuted leading-relaxed">
                {isAr
                  ? "نعم، يتم عزل بيانات كل منشأة على حدة (Schema-Level Isolation) لضمان عدم تداخل الفواتير والعمليات مع الحسابات الأخرى."
                  : "Our system isolates each business unit under its separate storage sandbox, rendering financial files completely cross-contamination safe."}
              </p>
            </div>
          </div>
        </div>

        {/* Security Shield Info */}
        <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-borderline rounded-2xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                {isAr ? "أمان مدفوعات معتمد ومحمي" : "Secure Verified Payments"}
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {isAr
                  ? "عملية الترقية والدفع مشفرة بالكامل بنسبة 100٪ ببروتوكولات الأمان ومتوافقة مع معايير PCI-DSS وهيئة الأمن السيبراني."
                  : "All subscription upgrading processes are fully compliant with standard PCI-DSS specifications. Payment cards are never stored on plain text databases."}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between text-[10px] text-slate-500">
            <span>ISO 27001 Secure Node</span>
            <span>PCI-DSS Secured</span>
          </div>
        </div>
      </div>

      {/* Subscription Audit Logs History */}
      <div className="bg-cardbk rounded-2xl border border-borderline p-6">
        <h3 className="font-bold text-md text-txtmain pb-2 border-b border-borderline">
          {isAr ? "سجل اشتراكات وعمليات المنشأة الحالية" : "SaaS Upgrade & Subscription History"}
        </h3>

        {subLogs.length === 0 ? (
          <div className="py-8 text-center text-txtmuted">
            <p className="text-xs">
              {isAr ? "لا توجد ترقيات سابقة مسجلة لهذه المنشأة." : "No historic payment operations detected for this tenant."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-xs text-right whitespace-nowrap">
              <thead>
                <tr className="text-txtmuted border-b border-borderline pb-2">
                  <th className="py-2.5 px-2 text-start">{isAr ? "الحدث / الحركة" : "Event / Log"}</th>
                  <th className="py-2.5 px-2 text-start">{isAr ? "التفاصيل" : "Details"}</th>
                  <th className="py-2.5 px-2 text-center">{isAr ? "المستخدم" : "Responsible Employee"}</th>
                  <th className="py-2.5 px-2 text-center">{isAr ? "التاريخ ووقت التسجيل" : "Timestamp"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderline">
                {subLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/20 text-txtmain">
                    <td className="py-3 px-2 font-bold text-start flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <span>{log.action}</span>
                    </td>
                    <td className="py-3 px-2 text-start text-txtmuted leading-normal max-w-sm truncate">
                      {log.details}
                    </td>
                    <td className="py-3 px-2 text-center font-mono text-[11px] text-txtmuted">{log.user}</td>
                    <td className="py-3 px-2 text-center text-txtmuted font-mono">
                      {new Date(log.timestamp).toLocaleString(undefined, {
                        dateStyle: "short",
                        timeStyle: "short"
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex border-b border-borderline gap-6 mb-4">
        <button
          onClick={() => setActiveSubTab("plans")}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all relative cursor-pointer ${
            activeSubTab === "plans"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-extrabold"
              : "border-transparent text-txtmuted hover:text-txtmain"
          }`}
        >
          <Zap className="w-4.5 h-4.5" />
          <span>{isAr ? "باقات الترخيص للشركة" : "SaaS Core Licenses"}</span>
        </button>

        <button
          onClick={() => setActiveSubTab("team_roles")}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all relative cursor-pointer ${
            activeSubTab === "team_roles"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-extrabold"
              : "border-transparent text-txtmuted hover:text-txtmain"
          }`}
        >
          <Users className="w-4.5 h-4.5" />
          <span>{isAr ? "صلاحيات الوصول وأعضاء الفريق" : "Governance Roles & Team Roster"}</span>
          <span className="text-[10px] bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full font-bold">
            {members.length}
          </span>
        </button>
      </div>

      {activeSubTab === "plans" && (
        <>
          {/* Subscription Cycle Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-txtmain text-md">
                {isAr ? "الباقات والأسعار المتاحة" : "Available System Subscriptions"}
              </h3>
              <p className="text-xs text-txtmuted">
                {isAr ? "الأسعار معروضة بناءً على العملة الرسمية المعتمدة لشركتك حالياً." : "Subscription fees are rendered dynamic to your Selected Company Currency."}
              </p>
            </div>

            {/* Pricing toggle */}
            <div className="p-1 bg-cardbk border border-borderline rounded-xl inline-flex self-start sm:self-auto shadow-inner">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  billingCycle === "monthly"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-txtmuted hover:text-txtmain"
                }`}
              >
                {isAr ? "فاتورة شهرية" : "Bill Monthly"}
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  billingCycle === "yearly"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-txtmuted hover:text-txtmain"
                }`}
              >
                <span>{isAr ? "فاتورة سنوية" : "Bill Yearly"}</span>
                <span className="text-[9px] bg-emerald-500 text-white font-extrabold px-1.5 py-0.5 rounded-md leading-none">
                  {isAr ? "وفر 20%" : "Save 20%"}
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const isCurrent = plan.id === currentPlan;
              const price = billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
              const cycleLabel = billingCycle === "yearly" ? (isAr ? "/سنوياً" : "/yr") : (isAr ? "/شهرياً" : "/mo");

              return (
                <div
                  key={plan.id}
                  className={`bg-cardbk rounded-2xl border transition-all flex flex-col justify-between overflow-hidden relative ${
                    isCurrent
                      ? "border-indigo-500 shadow-lg shadow-indigo-500/5 ring-1 ring-indigo-500/30"
                      : "border-borderline hover:border-slate-700/80 hover:shadow-md"
                  }`}
                >
                  {/* Badge */}
                  {isCurrent && (
                    <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                      {isAr ? "مفعّل" : "Active"}
                    </div>
                  )}

                  <div className="p-5 space-y-4 flex-grow">
                    <div>
                      <span className="text-[10px] text-txtmuted uppercase font-black tracking-wider block">
                        {isAr ? plan.badgeAr : plan.badgeEn}
                      </span>
                      <h4 className="text-md font-extrabold text-txtmain mt-0.5">
                        {isAr ? plan.nameAr : plan.nameEn}
                      </h4>
                    </div>

                    <div className="flex items-baseline gap-1 py-2 border-b border-borderline">
                      <span className="text-2xl font-mono font-black text-txtmain">
                        {price.toLocaleString("en-US")}
                      </span>
                      <span className="text-[10px] text-txtmuted font-bold">
                        {companyCurrency} {cycleLabel}
                      </span>
                    </div>

                    <ul className="space-y-2.5 pt-2">
                      {(isAr ? plan.featuresAr : plan.featuresEn).map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-[11px] text-txtmain leading-normal text-start">
                          <CheckCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-appbk/40 border-t border-borderline">
                    {isCurrent ? (
                      <button
                        disabled
                        className="w-full text-center py-2.5 bg-slate-800 disabled:opacity-60 text-slate-400 rounded-xl text-xs font-bold"
                      >
                        {isAr ? "الباقة مفعلة حالياً" : "Currently Active Plan"}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenCheckout(plan.id)}
                        className="w-full text-center py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                      >
                        {isAr ? `تفعيل أو ترقية إلى (${plan.id})` : `Upgrade to ${plan.id}`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Subscription FAQ and ISO Block */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-cardbk rounded-2xl border border-borderline p-6 space-y-4">
              <h3 className="font-bold text-md text-txtmain flex items-center gap-2 pb-2 border-b border-borderline">
                <HelpCircle className="w-5 h-5 text-indigo-500" />
                <span>{isAr ? "الأسئلة الشائعة وسياسات الدفع" : "Subscription Billing Rules"}</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-txtmain">
                    {isAr ? "هل يمكنني الترقية أو إلغاء الاشتراك في أي وقت؟" : "Can I upgrade or downgrade anytime?"}
                  </h4>
                  <p className="text-[11px] text-txtmuted leading-relaxed">
                    {isAr
                      ? "نعم، يمكنك تعديل باقة الاشتراك الحالية والترقية فوراً للحصول على المزيد من السعة. يعاد حساب مبالغ الفواتيرة بصورة تناسبية."
                      : "Yes, you can upgrade your plan at any point. Your storage limits and client capacities will instantly scale to match the upgraded plan."}
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-txtmain">
                    {isAr ? "هل فواتير ZATCA والرموز معتمدة؟" : "Are ZATCA basic invoices supported?"}
                  </h4>
                  <p className="text-[11px] text-txtmuted leading-relaxed">
                    {isAr
                      ? "نعم، إن فواتير الباقتين التجارية والشركات مجهزة لدعم متطلبات هيئة الزكاة والضريبة والجمارك كفواتير مبسطة بالرمز الذاتي QR."
                      : "Absolutely, starter and premium plans generate fully compliant basic simplified tax invoices featuring real-time generated secure QR codes."}
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-txtmain">
                    {isAr ? "كيف تحتسب العملات المختلفة في التحصيل المالي؟" : "How are multiple currencies handled?"}
                  </h4>
                  <p className="text-[11px] text-txtmuted leading-relaxed">
                    {isAr
                      ? "يحتسب الاشتراك ويعرض تلقائياً بناءً على العملة التي اخترتها كعملة رسمية في المنشأة الحالية لتجنب فارق الصرف البنكي."
                      : "Subscription pricing dynamically translates to the selected base currency in your accounting set-up to preserve localized ledger consistency."}
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-txtmain">
                    {isAr ? "هل بياناتي معزولة ومحمية؟" : "Is my company SaaS data isolated?"}
                  </h4>
                  <p className="text-[11px] text-txtmuted leading-relaxed">
                    {isAr
                      ? "نعم، يتم عزل بيانات كل منشأة على حدة (Schema-Level Isolation) لضمان عدم تداخل الفواتير والعمليات مع الحسابات الأخرى."
                      : "Our system isolates each business unit under its separate storage sandbox, rendering financial files completely cross-contamination safe."}
                  </p>
                </div>
              </div>
            </div>

            {/* Security Shield Info */}
            <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-borderline rounded-2xl p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    {isAr ? "أمان مدفوعات معتمد ومحمي" : "Secure Verified Payments"}
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {isAr
                      ? "عملية الترقية والدفع مشفرة بالكامل بنسبة 100٪ ببروتوكولات الأمان ومتوافقة مع معايير PCI-DSS وهيئة الأمن السيبراني."
                      : "All subscription upgrading processes are fully compliant with standard PCI-DSS specifications. Payment cards are never stored on plain text databases."}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between text-[10px] text-slate-500">
                <span>ISO 27001 Secure Node</span>
                <span>PCI-DSS Secured</span>
              </div>
            </div>
          </div>

          {/* Subscription Audit Logs History */}
          <div className="bg-cardbk rounded-2xl border border-borderline p-6">
            <h3 className="font-bold text-md text-txtmain pb-2 border-b border-borderline">
              {isAr ? "سجل اشتراكات وعمليات المنشأة الحالية" : "SaaS Upgrade & Subscription History"}
            </h3>

            {subLogs.length === 0 ? (
              <div className="py-8 text-center text-txtmuted">
                <p className="text-xs">
                  {isAr ? "لا توجد ترقيات سابقة مسجلة لهذه المنشأة." : "No historic payment operations detected for this tenant."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-xs text-right whitespace-nowrap">
                  <thead>
                    <tr className="text-txtmuted border-b border-borderline pb-2">
                      <th className="py-2.5 px-2 text-start">{isAr ? "الحدث / الحركة" : "Event / Log"}</th>
                      <th className="py-2.5 px-2 text-start">{isAr ? "التفاصيل" : "Details"}</th>
                      <th className="py-2.5 px-2 text-center">{isAr ? "المستخدم" : "Responsible Employee"}</th>
                      <th className="py-2.5 px-2 text-center">{isAr ? "التاريخ ووقت التسجيل" : "Timestamp"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borderline">
                    {subLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/20 text-txtmain">
                        <td className="py-3 px-2 font-bold text-start flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                          <span>{log.action}</span>
                        </td>
                        <td className="py-3 px-2 text-start text-txtmuted leading-normal max-w-sm truncate">
                          {log.details}
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-[11px] text-txtmuted">{log.user}</td>
                        <td className="py-3 px-2 text-center text-txtmuted font-mono">
                          {new Date(log.timestamp).toLocaleString(undefined, {
                            dateStyle: "short",
                            timeStyle: "short"
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Team Roles & Enterprise Permissions Subtab */}
      {activeSubTab === "team_roles" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Active Sandbox Role Simulator Notification */}
          <div className="bg-gradient-to-r from-amber-600/10 via-amber-700/5 to-transparent border border-amber-600/30 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-400">
                  {isAr ? "محاكي صلاحيات الفحص والاختيار للمنشأة (مدير التجربة)" : "Workspace Role-Based Simulation & Audit Panel"}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xl">
                  {isAr 
                    ? "بصفتك مطوراً، يمكنك تبديل دورك النشط لتجربة ميزات النظام وكيف يتم تقييد 'مشتركي وعملاء الفواتير' تلقائياً بنظام العرض فقط." 
                    : "For testing purposes, you can dynamically swap your current session role to check how our RBAC guards enforce read-only and command limits."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-bold whitespace-nowrap">
                {isAr ? "الصلاحية النشطة حالياً:" : "Selected Simulated Role:"}
              </span>
              <select
                value={userRole}
                onChange={(e) => onChangeRole?.(e.target.value as any)}
                className="bg-slate-900 border border-amber-500/40 text-amber-300 font-bold px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="owner">{isAr ? "المالك (Owner) - كامل الصلاحيات" : "Owner - Full Access Keys"}</option>
                <option value="admin">{isAr ? "مشرف عام (Admin) - عدا الإعدادات والباقات" : "Admin - Operations Control"}</option>
                <option value="subscriber">{isAr ? "مشترك قارئ (Subscriber) - للقراءة فقط" : "Subscriber - Read Only"}</option>
              </select>
            </div>
          </div>

          {/* Role Specification Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Owner Details */}
            <div className="bg-cardbk border border-amber-500/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h4 className="font-extrabold text-xs text-txtmain uppercase tracking-wider">{isAr ? "المالك الكلي للمنشأة" : "Company Owner"}</h4>
              </div>
              <p className="text-[11px] text-txtmuted line-clamp-2">
                {isAr ? "يمتلك كامل المفاتيح التشغيلية والمالية بما فيها باقات الترقية والدعم الفني وإدارة الهوية وعمليات الحذف." : "Holds master root keys. Authorized on subscription billing tiers, full team management, and structural data deletions."}
              </p>
              <span className="inline-block text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-black">
                {isAr ? "كامل الصلاحيات الفردية" : "Full Root Control"}
              </span>
            </div>

            {/* Admin Details */}
            <div className="bg-cardbk border border-indigo-500/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <h4 className="font-extrabold text-xs text-txtmain uppercase tracking-wider">{isAr ? "مشرف عام النظام" : "Admin Super User"}</h4>
              </div>
              <p className="text-[11px] text-txtmuted line-clamp-2">
                {isAr ? "يمتلك مفاتيح التشغيل وتسجيل الأصول والعملاء وإصدار الفواتير. محمي من تغيير الباقة أو السيرفر أو حذف المنشأة." : "Can manage operational desks (clients, assets, logs, invoices). Prohibited from modifying subscription or billing settings."}
              </p>
              <span className="inline-block text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-black">
                {isAr ? "إدارة تشغيلية عليا" : "Operational Management"}
              </span>
            </div>

            {/* Subscriber Details */}
            <div className="bg-cardbk border border-teal-500/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                <h4 className="font-extrabold text-xs text-txtmain uppercase tracking-wider">{isAr ? "مشترك مشاهد" : "Subscriber / Reader"}</h4>
              </div>
              <p className="text-[11px] text-txtmuted line-clamp-2">
                {isAr ? "يمكنه تصفح لوحات المعلومات ومراجعة التقارير والمطبوعات والفواتير ولكن بشكل مصفى ومحمي من أي إضافة أو تعديل." : "Assigned read-only credentials. Permitted to inspect graphs, review clients, or pull bills, but strictly guarded from editing."}
              </p>
              <span className="inline-block text-[10px] bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded font-black">
                {isAr ? "للعرض فقط" : "Read-Only Viewer"}
              </span>
            </div>
          </div>

          {/* Members Table Card */}
          <div className="bg-cardbk rounded-2xl border border-borderline p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-xs text-txtmain uppercase tracking-wider">
                  {isAr ? "جدول أعضاء فريق العمل في المنشأة" : "Personnel Team & Governance Register"}
                </h3>
                <p className="text-[11px] text-txtmuted">
                  {isAr ? "مقر لإدارة وتعديل مناصب موظفي شركتك النشطين والتحكم بصلاحية تحرير الدفاتر." : "Add or invite registered specialists, modify operational credentials and configure access roles."}
                </p>
              </div>

              {userRole === "subscriber" ? (
                <div className="text-xs text-amber-500 font-bold bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5 self-start">
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isAr ? "الصلاحية المحدودة تمنع دعوة أعضاء" : "Viewer role blocks inviting members"}</span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditingMemberId(null);
                    setMemberFormName("");
                    setMemberFormEmail("");
                    setMemberFormRole("subscriber");
                    setMemberFormStatus("Active");
                    setIsAddingMember(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-2 transition-all self-start shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isAr ? "دعوة عضو فريق جديد" : "Invite Associate"}</span>
                </button>
              )}
            </div>

            {/* Notification alert panels */}
            {memberError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold text-start whitespace-pre-line">
                {memberError}
              </div>
            )}
            {memberSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold text-start whitespace-pre-line">
                {memberSuccess}
              </div>
            )}

            {membersLoading ? (
              <div className="py-12 text-center text-txtmuted">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs">{isAr ? "جاري مزامنة الصلاحيات والتحقق..." : "Retrieving team registers..."}</p>
              </div>
            ) : members.length === 0 ? (
              <div className="py-12 border-2 border-dashed border-borderline rounded-2xl text-center text-txtmuted">
                <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-bold">{isAr ? "لم يتم العثور على أي موظف مسجل" : "No registers catalogued in this unit"}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right whitespace-nowrap">
                  <thead>
                    <tr className="text-txtmuted border-b border-borderline">
                      <th className="py-3 px-3 text-start font-bold">{isAr ? "الاسم الكامل والبريد الإلكتروني" : "Team Member Profile"}</th>
                      <th className="py-3 px-3 text-center font-bold">{isAr ? "صلاحية الوصول" : "Access Credentials"}</th>
                      <th className="py-3 px-3 text-center font-bold">{isAr ? "حالة الحساب" : "Access Status"}</th>
                      <th className="py-3 px-3 text-center font-bold">{isAr ? "تاريخ التفعيل" : "Registration Date"}</th>
                      <th className="py-3 px-3 text-center font-bold">{isAr ? "إجراءات" : "Actions Desk"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borderline">
                    {members.map((member) => {
                      const isSelf = currentUserEmail && member.email.toLowerCase() === currentUserEmail.toLowerCase();
                      return (
                        <tr key={member.id} className="hover:bg-slate-800/25 transition-colors text-txtmain">
                          {/* Profile block */}
                          <td className="py-4 px-3 text-start">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600/30 to-indigo-500/10 border border-indigo-500/20 flex items-center justify-center font-extrabold text-xs text-indigo-400 uppercase">
                                {member.name.substring(0, 2)}
                              </div>
                              <div>
                                <p className="font-extrabold text-txtmain flex items-center gap-1.5">
                                  <span>{member.name}</span>
                                  {isSelf && (
                                    <span className="text-[9px] bg-indigo-500/10 text-indigo-400 font-extrabold px-1.5 py-0.5 rounded-full">
                                      {isAr ? "أنت الحالي" : "You"}
                                    </span>
                                  )}
                                </p>
                                <p className="text-[10px] text-txtmuted font-mono">{member.email}</p>
                              </div>
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td className="py-4 px-3 text-center">
                            {member.role === "owner" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/25 px-2.5 py-0.5 rounded-full font-black">
                                <Shield className="w-3 h-3" />
                                <span>{isAr ? "المالك الكلي" : "Global Owner"}</span>
                              </span>
                            ) : member.role === "admin" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 px-2.5 py-0.5 rounded-full font-black">
                                <UserCheck className="w-3 h-3" />
                                <span>{isAr ? "مشرف تشغيلي" : "Active Admin"}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-teal-500/10 text-teal-400 border border-teal-500/25 px-2.5 py-0.5 rounded-full font-black">
                                <Users className="w-3 h-3" />
                                <span>{isAr ? "مشترك (قارئ فقط)" : "Subscriber Viewer"}</span>
                              </span>
                            )}
                          </td>

                          {/* Access Status */}
                          <td className="py-4 px-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              member.status === "Active"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : member.status === "Invited"
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                member.status === "Active" ? "bg-emerald-500" : member.status === "Invited" ? "bg-blue-500" : "bg-rose-500"
                              }`} />
                              <span>{isAr ? (member.status === "Active" ? "نشط" : member.status === "Invited" ? "بانتظار الدعوة" : "موقوف مؤقتاً") : member.status}</span>
                            </span>
                          </td>

                          {/* Date added */}
                          <td className="py-4 px-3 text-center font-mono text-[10px] text-txtmuted">
                            {member.date_added}
                          </td>

                          {/* Action desk */}
                          <td className="py-4 px-3 text-center">
                            {userRole === "subscriber" ? (
                              <Lock className="w-3.5 h-3.5 text-txtmuted mx-auto" />
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleEditMemberClick(member)}
                                  className="p-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                  title={isAr ? "تعديل الصلاحيات" : "Change credentials"}
                                >
                                  <Edit className="w-3 h-3" />
                                  <span>{isAr ? "تعديل" : "Edit"}</span>
                                </button>

                                {/* Delete Member if not self and userRole is Owner */}
                                {(!isSelf || member.role !== "owner") && (
                                  <button
                                    onClick={() => handleDeleteMember(member.id, member.name)}
                                    className="p-1 px-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 rounded-lg transition-all text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                    title={isAr ? "استبعاد/حذف الصلاحية" : "Revoke role"}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>{isAr ? "حذف" : "Revoke"}</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Form Modal Drawer sheet for Inviting/Updating dynamic personnel */}
          <AnimatePresence>
            {isAddingMember && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-cardbk border border-borderline rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative"
                >
                  <div className="bg-gradient-to-r from-indigo-700 to-indigo-800 p-5 text-white flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm">
                        {editingMemberId ? (isAr ? "تعديل رتبة وصلاحيات العضو" : "Edit Associate Credentials") : (isAr ? "دعوة عضو فريق وموظف جديد" : "Invite Associate Specialist")}
                      </h4>
                      <p className="text-[10px] text-indigo-100 mt-0.5">
                        {isAr ? "تعديل وإصدار الرتب والصلاحيات للشركات" : "Configure role-guards parameters on database entries."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddingMember(false)}
                      className="text-white hover:text-indigo-200 text-xs font-bold cursor-pointer bg-black/10 px-2.5 py-1 rounded-md"
                    >
                      {isAr ? "إلغاء بطلان" : "Close"}
                    </button>
                  </div>

                  <form onSubmit={handleAddMember} className="p-5 space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-txtmain mb-1">
                        {isAr ? "اسم الموظف الكامل *" : "Specialist Employee Full Name *"}
                      </label>
                      <input
                        type="text"
                        required
                        value={memberFormName}
                        onChange={(e) => setMemberFormName(e.target.value)}
                        placeholder={isAr ? "مثال: رائد الحربي" : "e.g. Raed Al-Harbi"}
                        className="w-full bg-appbk border border-borderline rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-txtmain text-start"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-txtmain mb-1">
                        {isAr ? "البريد الإلكتروني للوجين وعمليات المنشأة *" : "Employee Email Endpoint *"}
                      </label>
                      <input
                        type="email"
                        required
                        disabled={!!editingMemberId}
                        value={memberFormEmail}
                        onChange={(e) => setMemberFormEmail(e.target.value)}
                        placeholder="e.g. user@domain.com"
                        className="w-full bg-appbk border border-borderline rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-txtmain text-start disabled:opacity-50 font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-txtmain mb-1">
                          {isAr ? "الصلاحية الممنوحة *" : "Access Permission Guard *"}
                        </label>
                        <select
                          value={memberFormRole}
                          onChange={(e) => setMemberFormRole(e.target.value as any)}
                          className="w-full bg-appbk border border-borderline rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-txtmain"
                        >
                          <option value="owner">{isAr ? "مالك كامل الصلاحية (Owner)" : "Owner - Universal Access"}</option>
                          <option value="admin">{isAr ? "مشرف تشغيل (Admin)" : "Admin - Operations Office"}</option>
                          <option value="subscriber">{isAr ? "مشاهد مشترك (Subscriber)" : "Subscriber - Read Only"}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-txtmain mb-1">
                          {isAr ? "الحالة الحالية للاعتماد *" : "Assigned Status Tier *"}
                        </label>
                        <select
                          value={memberFormStatus}
                          onChange={(e) => setMemberFormStatus(e.target.value as any)}
                          className="w-full bg-appbk border border-borderline rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-txtmain"
                        >
                          <option value="Active">{isAr ? "نشط ومفعل" : "Fully Active"}</option>
                          <option value="Invited">{isAr ? "مرسل بانتظار الترخيص" : "Pending Invitation"}</option>
                          <option value="Suspended">{isAr ? "موقوف مؤقتاً" : "Suspended Control"}</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                    >
                      {editingMemberId ? (isAr ? "حفظ وتثبيت التعديلات" : "Apply Access Overrides") : (isAr ? "تأكيد وإصدار دعوة الفريق" : "Send Official Invite")}
                    </button>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </div>
      )}

      {/* Elegant Simulated Checkout Modal Component */}
      <AnimatePresence>
        {showCheckout && selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-cardbk border border-borderline rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative"
            >
              <div className="bg-gradient-to-r from-indigo-700 to-indigo-800 p-5 text-white flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm">{isAr ? "بوابة الدفع التلقائي الآمنة" : "Secure Payment Portal"}</h4>
                  <p className="text-[10px] text-indigo-100 flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>{isAr ? "مشفر وآمن بالكامل (SSL)" : "Secured, ISO 27001 Compliant Node"}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCheckout(false)}
                  className="text-white hover:text-indigo-200 text-xs font-bold cursor-pointer bg-black/10 px-2.5 py-1 rounded-md"
                >
                  {isAr ? "إلغاء" : "Close"}
                </button>
              </div>

              <div className="p-6">
                {success ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="py-12 text-center space-y-4"
                  >
                    <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                      <CheckCircle className="w-8 h-8 animate-bounce" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-black text-txtmain text-md">
                        {isAr ? "تهانينا! تم تفعيل اشتراكك بنجاح" : "Subscription Activated Successfully!"}
                      </h4>
                      <p className="text-xs text-txtmuted">
                        {isAr
                          ? "تمت ترقية المنشأة وإعادة إعداد قيود الحساب لتكون صالحة للاستخدام."
                          : "Your business unit limits are successfully restructured in real time."}
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <form onSubmit={handleConfirmUpgrade} className="space-y-4">
                    {/* Invoice items panel summary */}
                    <div className="bg-appbk rounded-xl p-4 border border-borderline text-xs space-y-2">
                      <div className="flex justify-between items-center text-txtmuted">
                        <span>{isAr ? "المنشأة المستفيدة:" : "Beneficiary tenant:"}</span>
                        <span className="font-bold text-txtmain">{currentCompany?.name}</span>
                      </div>
                      <div className="flex justify-between items-center text-txtmuted">
                        <span>{isAr ? "الترقية للمنتج الرقمي:" : "Upgraded service plan:"}</span>
                        <span className="font-bold text-indigo-400">{selectedPlan}</span>
                      </div>
                      <div className="flex justify-between items-center text-txtmuted">
                        <span>{isAr ? "دورية إصدار الفواتير:" : "Billing frequency:"}</span>
                        <span className="font-bold text-txtmain capitalize">{isAr && billingCycle === "yearly" ? "سنوي (20% توفير)" : billingCycle}</span>
                      </div>
                      <hr className="border-borderline/60" />
                      <div className="flex justify-between items-center text-sm font-bold text-txtmain">
                        <span>{isAr ? "الإجمالي المطلوب للتجهيز:" : "Grand Total Due:"}</span>
                        <span>
                          {billingCycle === "yearly"
                            ? plans.find((p) => p.id === selectedPlan)?.priceYearly.toLocaleString()
                            : plans.find((p) => p.id === selectedPlan)?.priceMonthly.toLocaleString()}{" "}
                          {companyCurrency}
                        </span>
                      </div>
                    </div>

                    {/* Sim card credentials */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-txtmain mb-1">
                          {isAr ? "اسم حامل بطاقة الدفع الالكتروني *" : "Card Holder Name *"}
                        </label>
                        <input
                          type="text"
                          required
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          placeholder={isAr ? "مثال: عوض الزهراني" : "e.g. Awadh Al-Zahrani"}
                          className="w-full bg-appbk border border-borderline rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-txtmain text-start"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-txtmain mb-1">
                          {isAr ? "رقم بطاقة الائتمان / مدى *" : "Credit / Mada Card Number *"}
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            maxLength={19}
                            value={cardNumber}
                            onChange={(e) => {
                              // Fast auto spacing format helper for credit card
                              const val = e.target.value.replace(/\D/g, "");
                              const matches = val.match(/\d{4,16}/g);
                              const match = (matches && matches[0]) || "";
                              const parts = [];
                              for (let i = 0, len = match.length; i < len; i += 4) {
                                parts.push(match.substring(i, i + 4));
                              }
                              if (parts.length > 0) {
                                setCardNumber(parts.join(" "));
                              } else {
                                setCardNumber(val);
                              }
                            }}
                            placeholder="4000 1234 5678 9010"
                            className="w-full bg-appbk border border-borderline rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-txtmain tracking-widest text-start"
                          />
                          <CreditCard className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-txtmain mb-1">
                            {isAr ? "تاريخ معيار الانتهاء (MM/YY) *" : "Expiry Date (MM/YY) *"}
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={5}
                            value={cardExpiry}
                            onChange={(e) => {
                              let val = e.target.value.replace(/\D/g, "");
                              if (val.length > 2) {
                                val = val.substring(0, 2) + "/" + val.substring(2);
                              }
                              setCardExpiry(val);
                            }}
                            placeholder="12/29"
                            className="w-full bg-appbk border border-borderline rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-txtmain text-center"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-txtmain mb-1">
                            {isAr ? "الرمز الأمني (CVV) *" : "Secure CVV *"}
                          </label>
                          <input
                            type="password"
                            required
                            maxLength={3}
                            value={cardCVV}
                            onChange={(e) => setCardCVV(e.target.value.replace(/\D/g, ""))}
                            placeholder="•••"
                            className="w-full bg-appbk border border-borderline rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-txtmain text-center tracking-widest"
                          />
                        </div>
                      </div>
                    </div>

                    <p className="text-[9px] text-txtmuted text-start leading-normal">
                      * {isAr ? "بالنقر على الترقية، فإنك تأذن بتفعيل هذه الهوية وتحديث رصيد العمليات المرتبط بقاعدة بيانات هذه المنشأة حالياً." : "By confirming transaction, you authorize updating internal record limit pools and activating this enterprise plan configuration."}
                    </p>

                    {/* Confirm Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 mt-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-extrabold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/10 active:scale-[0.98] cursor-pointer"
                    >
                      {loading ? (isAr ? "جاري الترخيص والتحقق..." : "Processing...") : (isAr ? `تأكيد الدفع والتفعيل (${billingCycle === "yearly" ? "سنوياً" : "شهرياً"})` : "Confirm Secure Payment")}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
