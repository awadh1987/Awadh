import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Lock, 
  ShieldCheck, 
  Database, 
  Sparkles, 
  Building2, 
  Sun, 
  Moon, 
  Coins, 
  LayoutDashboard,
  Mail,
  User as LucideUser,
  Eye,
  EyeOff
} from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";
import { 
  googleSignIn, 
  signUpWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from "../lib/firebaseAuth";
import firebaseConfig from "../../firebase-applet-config.json";

interface LoginProps {
  onSuccess: (user: any) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export default function Login({ onSuccess, darkMode, setDarkMode }: LoginProps) {
  const { language, setLanguage, t, dir } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Custom Email/Password auth states
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthDisabledError, setIsAuthDisabledError] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    setErrorMsg("");
    setIsAuthDisabledError(false);
    try {
      const result = await googleSignIn();
      if (result) {
        onSuccess(result.user);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        language === "ar" 
          ? "فشل تسجيل الدخول عبر Google. يرجى التحقق من أذونات متصفحك أو المحاولة لاحقاً." 
          : "Google Sign-In failed. Please check browser permissions and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg(language === "ar" ? "يرجى تعبئة كافة الحقول المطلوبة." : "Please fill in all required fields.");
      return;
    }
    if (authMode === "signup" && !displayName.trim()) {
      setErrorMsg(language === "ar" ? "يرجى كتابة الاسم الكامل." : "Please write your full name.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setIsAuthDisabledError(false);
    try {
      let user;
      if (authMode === "signup") {
        user = await signUpWithEmailAndPassword(email.trim(), password, displayName.trim());
      } else {
        user = await signInWithEmailAndPassword(email.trim(), password);
      }
      if (user) {
        onSuccess(user);
      }
    } catch (err: any) {
      console.error(err);
      let message = err.message || "";
      if (message.includes("auth/email-already-in-use")) {
        message = language === "ar" ? "هذا البريد الإلكتروني مستخدم بالفعل لنظام آخر." : "This email address is already in use by another workspace.";
      } else if (message.includes("auth/weak-password")) {
        message = language === "ar" ? "كلمة المرور ضعيفة جداً. يجب أن تتكون من 6 خانات على الأقل." : "Weak password. It must be at least 6 characters long.";
      } else if (message.includes("auth/invalid-email") || message.includes("auth/invalid-value-") || message.includes("auth/invalid-credential")) {
        message = language === "ar" ? "البريد الإلكتروني المدخل غير صالح أو البيانات غير مطابقة." : "The email format is invalid or password didn't match.";
      } else if (message.includes("auth/wrong-password") || message.includes("auth/user-not-found")) {
        message = language === "ar" ? "البريد الإلكتروني أو كلمة المرور غير صحيحة." : "Invalid email or password.";
      } else if (message.includes("auth/operation-not-allowed")) {
        setIsAuthDisabledError(true);
        message = language === "ar" 
          ? "ميزة التسجيل بـ Email/Password غير مفعلة بفرع الـ Auth بوحدة تحكم Google Firebase. تواصل مع المدير." 
          : "Standard Email/Password auth is disabled in Firebase console. Please enable it there.";
      } else {
        message = language === "ar" ? "خطأ في الاتصال بنظام الأمان. يرجى المتابعة لاحقاً." : "An authentication request error occurred. Please try again.";
      }
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between transition-colors duration-300 font-sans" dir={dir}>
      
      {/* Header controls */}
      <header className="max-w-7xl mx-auto w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center text-white font-extrabold text-xs shadow-md shadow-indigo-500/10">
            ERP
          </div>
          <span className="text-sm font-black text-slate-800 dark:text-white">{t("saas_erp_suite")}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Language selector */}
          <div className="flex bg-slate-200/50 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setLanguage("ar")}
              className={`py-1 px-3.5 rounded-lg text-xs font-bold transition-all ${language === "ar" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"}`}
            >
              العربية
            </button>
            <button
              onClick={() => setLanguage("en")}
              className={`py-1 px-3.5 rounded-lg text-xs font-bold transition-all ${language === "en" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"}`}
            >
              English
            </button>
          </div>

          {/* Theme toggler */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 bg-slate-200/50 dark:bg-slate-900/50 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>
        </div>
      </header>

      {/* Main card */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 flex items-center justify-center py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800/80 shadow-2xl shadow-indigo-500/5 relative">
          
          {/* Brand/Hero section - left/right depending on language */}
          <div className="lg:col-span-5 bg-gradient-to-br from-indigo-700 via-indigo-800 to-violet-900 p-8 lg:p-12 text-white flex flex-col justify-between gap-10">
            <div className="space-y-4">
              <span className="bg-indigo-500/20 text-indigo-200 border border-indigo-400/25 text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full inline-block">
                {t("data_security_iso")}
              </span>
              <h2 className="text-2xl font-black leading-tight tracking-tight">
                {t("auth_benefits_title")}
              </h2>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                  <Building2 className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">
                    Multi-Tenant Isolation
                  </h3>
                  <p className="text-xs text-indigo-200/80 leading-relaxed">
                    {t("auth_benefit_isolation")}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                  <Database className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">
                    Secure Firestore Encrypted Kernels
                  </h3>
                  <p className="text-xs text-indigo-200/80 leading-relaxed">
                    {t("auth_benefit_firestore")}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                  <Lock className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">
                    Unified Cloud Security
                  </h3>
                  <p className="text-xs text-indigo-200/80 leading-relaxed">
                    {language === "ar" 
                      ? "تسجيل دخول برقم الكيان السحابي الموحد وتشفير ذكي للحسابات بشكل كامل." 
                      : "Multi-factor authentication ready with end-to-end sandbox tenant separation layers."}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/10 flex gap-2 items-center text-xs text-indigo-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>{t("data_security_iso")}</span>
            </div>
          </div>

          {/* Form/Login box */}
          <div className="lg:col-span-7 p-8 lg:p-10 flex flex-col justify-center">
            <div className="max-w-md mx-auto w-full space-y-6">
              
              <div className="space-y-2">
                <div className="inline-flex p-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                  <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h1 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">
                  {t("auth_welcome_title")}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t("auth_welcome_subtitle")}
                </p>
              </div>

              {/* Mode Switcher Block */}
              <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => { setAuthMode("signin"); setErrorMsg(""); setIsAuthDisabledError(false); }}
                  className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${authMode === "signin" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-xs" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"}`}
                >
                  {language === "ar" ? "تسجيل الدخول" : "Sign In"}
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode("signup"); setErrorMsg(""); setIsAuthDisabledError(false); }}
                  className={`flex-1 py-2 text-center rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${authMode === "signup" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-white shadow-xs" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"}`}
                >
                  {language === "ar" ? "إنشاء حساب جديد" : "Sign Up"}
                </button>
              </div>

              {errorMsg && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/25 border border-rose-100 dark:border-rose-900/30 rounded-2xl text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 bg-rose-600 dark:bg-rose-500 rounded-full shrink-0 mt-1.5" />
                  <span className="leading-relaxed">{errorMsg}</span>
                </div>
              )}

              {isAuthDisabledError && (
                <div className="p-5 bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-100/80 dark:border-indigo-900/40 rounded-2xl text-xs text-slate-700 dark:text-slate-300 space-y-3">
                  <p className="font-extrabold text-indigo-700 dark:text-indigo-400">
                    {language === "ar" ? "🛠️ خطوات تفعيل ميزة التسجيل بالبريد وكلمة المرور:" : "🛠️ Steps to enable Email/Password Authentication:"}
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 leading-relaxed text-[11px] text-start">
                    <li>
                      {language === "ar" ? "انقر على الرابط التالي لفتح لوحة تحكم مشروعك في Firebase مباشرة:" : "Click the link below to open your Firebase Console project directly:"}
                      <a 
                        href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block mt-1 font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline break-all bg-white dark:bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/30 text-[10px]"
                      >
                        https://console.firebase.google.com/project/{firebaseConfig.projectId}/authentication/providers
                      </a>
                    </li>
                    <li>
                      {language === "ar" ? "اضغط على زر إضافة موفر جديد (Add new provider) في قسم موجهي تسجيل الدخول (Sign-in providers)." : "Under Sign-in providers, click on Add new provider."}
                    </li>
                    <li>
                      {language === "ar" ? "اختر البريد الإلكتروني/كلمة المرور (Email/Password) كطريقة تسجيل دخول." : "Select the Email/Password option."}
                    </li>
                    <li>
                      {language === "ar" ? "قم بتمكين خيار التفعيل الأول (Enable) واضغط على حفظ (Save)." : "Toggle the first Enable switch and save your changes."}
                    </li>
                  </ol>
                  <p className="text-[10px] text-slate-500 font-medium text-start">
                    {language === "ar" 
                      ? "💡 بمجرد تحديث الإعدادات في لوحة التحكم، يمكنك العودة هنا والمحاولة مجدداً دون الحاجة لإعادة تحميل الصفحة."
                      : "💡 Once enabled in your console, you can return here and try signing up again immediately."}
                  </p>
                </div>
              )}

              {/* Standard Email/Password Form */}
              <form onSubmit={handleEmailAuth} className="space-y-3.5">
                
                {authMode === "signup" && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <LucideUser className="w-3.5 h-3.5 text-slate-400" />
                      {language === "ar" ? "الاسم الكامل" : "Full Name"} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={language === "ar" ? "مثال: رائد المحميد" : "e.g., Raed Al-Mahmeed"}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-indigo-600 transition-colors duration-200 placeholder-slate-400"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {language === "ar" ? "البريد الإلكتروني" : "Email Address"} *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder={language === "ar" ? "finance@company.com" : "finance@company.com"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-indigo-600 transition-colors duration-200 placeholder-slate-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    {language === "ar" ? "كلمة المرور" : "Password"} *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder={language === "ar" ? "••••••••" : "••••••••"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white rounded-xl ps-3.5 pe-10 py-2.5 text-xs focus:outline-none focus:border-indigo-600 transition-colors duration-200 placeholder-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/60 text-white rounded-xl px-5 py-3 text-xs font-bold flex items-center justify-center gap-2 transition-all transform active:translate-y-0 cursor-pointer shadow-md shadow-indigo-500/10 mt-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  <span>
                    {loading 
                      ? t("auth_securing_access") 
                      : (authMode === "signin" 
                          ? (language === "ar" ? "تسجيل الدخول الآمن" : "Secure Log In") 
                          : (language === "ar" ? "إنشاء حساب ومتابعة" : "Create Account & Continue")
                        )
                    }
                  </span>
                </button>
              </form>

              {/* Styled Divider */}
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                <span className="flex-shrink mx-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {language === "ar" ? "أو المتابعة عبر" : "OR CONTINUE WITH"}
                </span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              </div>

              {/* Google Access SSO Trigger */}
              <div className="space-y-4">
                <button
                  onClick={handleSignIn}
                  disabled={loading}
                  className="w-full bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-950 dark:hover:bg-slate-800/60 dark:border dark:border-slate-850 text-slate-800 dark:text-slate-200 rounded-xl px-6 py-3 text-xs font-bold flex items-center justify-center gap-3 transition-all transform cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.3.65 4.5 1.8l2.422-2.422C17.218 1.636 14.89 1 12.24 1a10 10 0 100 20c5.388 0 9.873-3.882 9.873-10.3 0-.6-.057-1.127-.16-1.415H12.24z" />
                  </svg>
                  <span>{language === "ar" ? "الدخول الآمن بحساب Google" : "Secure Sign in with Google"}</span>
                </button>
              </div>

              <div className="text-[10px] text-slate-400 dark:text-slate-500 text-center leading-relaxed font-medium">
                {language === "ar" 
                  ? "تسجيل الدخول يحمي بياناتك. تأكد من تفعيل موفر البريد بالـ Firebase إذا كنت تستخدم حساباً جديداً أول مرة." 
                  : "Standard isolation safeguards apply. Ensure standard email auth is active in Google Firebase context."}
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Footer details */}
      <footer className="max-w-7xl mx-auto w-full px-6 py-6 border-t border-slate-200 dark:border-slate-900/60 text-center text-[10px] text-slate-400 dark:text-slate-600">
        <p className="leading-relaxed">
          {language === "ar"
            ? "المنصة المالية المتكاملة © 2026. كافة حقوق البيانات مشفرة سحابياً بموجب نظام حماية البيانات الشخصية ومقاييس ISO ومطورة سحابياً لـ SaaS."
            : "Integrated ERP © 2026. All company database schema components secure-certified and verified."}
        </p>
      </footer>

    </div>
  );
}
