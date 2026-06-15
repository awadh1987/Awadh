import React, { useState, useEffect } from "react";
import { Company } from "../types";
import { Database, RefreshCw, Check, AlertCircle, Info } from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";

interface BackupsProps {
  company: Company | null;
}

export default function Backups({ company }: BackupsProps) {
  const { language } = useLanguage();

  // Backup Management States
  const [backups, setBackups] = useState<any[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [triggeringBackup, setTriggeringBackup] = useState(false);
  const [backupError, setBackupError] = useState("");
  const [backupSuccess, setBackupSuccess] = useState("");

  // Archive Management States
  const [archiveStatus, setArchiveStatus] = useState<any>(null);
  const [archiveStatusLoading, setArchiveStatusLoading] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveSuccess, setArchiveSuccess] = useState("");
  const [archiveError, setArchiveError] = useState("");

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
        // Trigger audit logs updates implicitly on the server
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
        <Database className="w-12 h-12 mx-auto mb-3 opacity-25" />
        <p className="text-sm">
          {language === "ar" 
            ? "الرجاء اختيار المنشأة أولاً للوصول إلى مركز النسخ الاحتياطي والأرشفة." 
            : "Please choose an enterprise workspace first to edit parameters."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-start">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-black text-txtmain">
          {language === "ar" ? "النسخ الاحتياطي والأرشفة" : "Cloud Backups & Archiving"}
        </h2>
        <p className="text-xs text-txtmuted mt-1 leading-relaxed">
          {language === "ar" 
            ? "إدارة أمان ومرونة قاعدة البيانات، جدولة الحفظ، والتحكم بالملفات المؤرشفة لتسريع أداء الاستعلام على الفواتير والعمليات."
            : "Manage financial ledger backups, storage containers, archive old records and optimize memory speed."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Database Resilience & Cloud Storage Backups */}
        <div id="backups-card" className="bg-cardbk p-6 rounded-2xl shadow-sm border border-borderline space-y-4">
          <div className="flex items-center justify-between border-b border-borderline pb-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-500 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-txtmain">
                  {language === "ar" ? "النسخ الاحتياطي وقاعدة البيانات" : "Cloud Backups & Resilience"}
                </h3>
                <p className="text-[10px] text-txtmuted mt-0.5">
                  {language === "ar" ? "نسخ احتياطي تلقائي يومي آمن" : "Automated daily state copies in encrypted containers"}
                </p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{language === "ar" ? "نشط" : "Active"}</span>
            </span>
          </div>

          {backupSuccess && (
            <div className="p-3 bg-emerald-500/10 text-emerald-400 text-xs rounded-xl border border-emerald-500/20 flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 shrink-0" />
              <span>{backupSuccess}</span>
            </div>
          )}

          {backupError && (
            <div className="p-3 bg-rose-500/10 text-rose-400 text-xs rounded-xl border border-rose-500/20 flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{backupError}</span>
            </div>
          )}

          {/* Backup Action Widget */}
          <div className="p-4 bg-appbk rounded-xl border border-borderline/80 space-y-3">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-txtmain block text-start">
                  {language === "ar" ? "موقع الحاوية الآمنة لملفات الباك آب:" : "Secure Storage Bucket Destination:"}
                </span>
                <code className="text-[10px] text-indigo-400 font-mono block select-all break-all bg-indigo-500/5 px-2 py-1 rounded">
                  secure_storage_bucket/backup-*.json
                </code>
              </div>
            </div>

            <p className="text-[10.5px] text-txtmuted leading-relaxed">
              {language === "ar" 
                ? "يقوم النظام بإجراء عملية نسخ احتياطية كاملة ومؤتمتة لقاعدة البيانات (شركاء، فواتير، عمليات، قيود مصروفات وعمليات التدقيق) كل 24 ساعة، مع إمكانية إطلاقها يدويًا بأي وقت."
                : "The host triggers a fully snapshot-coherent transaction backup (covering tenants, invoices, operations, expenses and audit logs) automatically every 24 hours."}
            </p>

            <button
              type="button"
              onClick={handleTriggerBackup}
              disabled={triggeringBackup}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-indigo-500/10"
              id="trigger-backup-btn"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${triggeringBackup ? "animate-spin" : ""}`} />
              <span>
                {triggeringBackup 
                  ? (language === "ar" ? "جاري تشغيل عملية النسخ الاحتياطي..." : "Triggering Safe Copy Process...") 
                  : (language === "ar" ? "بدء نسخ احتياطي يدوي" : "Trigger Backup")}
              </span>
            </button>
          </div>

          {/* List of Backups */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-txtmain">
              <span>{language === "ar" ? "سجل النسخ الاحتياطية الأخيرة" : "Historical Database Snapshots"}</span>
              <span className="text-[9px] text-txtmuted font-mono bg-borderline/25 px-1.5 py-0.5 rounded">
                {backups.length} {language === "ar" ? "نسخ متوفرة" : "copies saved"}
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 text-xs">
              {backupLoading && backups.length === 0 ? (
                <div className="py-4 text-center text-txtmuted">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-indigo-500" />
                  <span>{language === "ar" ? "جاري تحديث قائمة النسخ..." : "Syncing backups list..."}</span>
                </div>
              ) : backups.length === 0 ? (
                <div className="py-4 text-center text-txtmuted border border-dashed border-borderline rounded-xl bg-appbk/40">
                  <Database className="w-5 h-5 mx-auto mb-1 opacity-25 text-indigo-500/40" />
                  <span>{language === "ar" ? "لم يتم العثور على أي نسخ احتياطية حتى الآن." : "No historic snapshots created yet."}</span>
                </div>
              ) : (
                backups.map((b) => {
                  const sizeKB = (b.size / 1024).toFixed(1);
                  const isAuto = b.type === "auto";
                  const dateStr = new Date(b.created_at).toLocaleString(language === "ar" ? "ar-SA" : "en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "numeric",
                    hour12: true
                  });
                  return (
                    <div key={b.filename} className="flex items-center justify-between p-2.5 bg-appbk/75 border border-borderline/80 rounded-xl hover:bg-borderline/10 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <Database className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <div className="min-w-0 text-start">
                          <span className="text-[11px] font-bold text-txtmain font-mono truncate block" title={b.filename}>
                            {b.filename}
                          </span>
                          <span className="text-[9.5px] text-txtmuted block leading-none mt-0.5">
                            {dateStr}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold border ${isAuto ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/15' : 'bg-indigo-500/5 text-indigo-400 border-indigo-500/15'}`}>
                          {isAuto ? (language === "ar" ? "تلقائي" : "Auto") : (language === "ar" ? "يدوي" : "Manual")}
                        </span>
                        <span className="text-[10px] text-txtmuted font-bold font-mono">
                          {sizeKB} KB
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Database Archival & Performance Tuning */}
        <div id="archives-card" className="bg-cardbk p-6 rounded-2xl shadow-sm border border-borderline space-y-4">
          <div className="flex items-center justify-between border-b border-borderline pb-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-500 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-txtmain">
                  {language === "ar" ? "أرشفة وتنظيف قاعدة البيانات" : "Database Archival & Cleanup"}
                </h3>
                <p className="text-[10px] text-txtmuted mt-0.5">
                  {language === "ar" ? "ترحيل السجلات والعمليات والفواتير القديمة لزيادة سرعة وسلاسة الاستعلام" : "Move legacy records older than 1 year to archive"}
                </p>
              </div>
            </div>
            
            {archiveStatus && (archiveStatus.archivableOpsCount > 0 || archiveStatus.archivableInvsCount > 0) ? (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold">
                <span>{language === "ar" ? "بحاجة لترحيل" : "Optimization Pending"}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">
                <span>{language === "ar" ? "أداء مثالي" : "Optimized Speed"}</span>
              </span>
            )}
          </div>

          {archiveSuccess && (
            <div className="p-3 bg-emerald-500/10 text-emerald-400 text-xs rounded-xl border border-emerald-500/20 flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 shrink-0" />
              <span>{archiveSuccess}</span>
            </div>
          )}

          {archiveError && (
            <div className="p-3 bg-rose-500/10 text-rose-400 text-xs rounded-xl border border-rose-500/20 flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{archiveError}</span>
            </div>
          )}

          {/* Quick Stats Panel */}
          {archiveStatusLoading ? (
            <div className="py-6 text-center text-txtmuted">
              <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-indigo-500" />
              <span>{language === "ar" ? "جاري تحليل بنية الجداول وقراءة القيود..." : "Analyzing table sizes..."}</span>
            </div>
          ) : archiveStatus ? (
            <div className="space-y-3">
              <p className="text-[10.5px] text-txtmuted leading-relaxed">
                {language === "ar"
                  ? `بناءً على روزنامة المنشأة المالية مع الفوترة الضريبية، تاريخ القص والقصور الافتراضي المعين هو (${archiveStatus.cutoffDate}). كافة السجلات السابقة لهذا التاريخ تعتبر "قديمة" ويمكن نقلها بأمان خارج جداول التشغيل النشطة.`
                  : `All historical receipts and contracts compiled prior to the tax cutoff anchor (${archiveStatus.cutoffDate}) are candidates for active table extraction.`}
              </p>

              {/* Status Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Candidates */}
                <div className="p-3 bg-appbk/80 border border-borderline/50 rounded-xl space-y-1">
                  <span className="text-[10px] text-txtmuted block leading-none">{language === "ar" ? "السجلات المرشحة للأرشفة" : "Archivable Active Candidates"}</span>
                  <div className="font-mono text-lg font-bold text-amber-500">
                    {archiveStatus.archivableOpsCount + archiveStatus.archivableInvsCount}
                  </div>
                  <span className="text-[9px] text-txtmuted/70 block font-normal leading-none">
                    {archiveStatus.archivableOpsCount} {language === "ar" ? "عمليات" : "ops"} | {archiveStatus.archivableInvsCount} {language === "ar" ? "فواتير" : "invs"}
                  </span>
                </div>

                {/* Already archived count */}
                <div className="p-3 bg-appbk/80 border border-borderline/50 rounded-xl space-y-1">
                  <span className="text-[10px] text-txtmuted block leading-none">{language === "ar" ? "السجلات المؤرشفة حالياً" : "Cold Archive Table Size"}</span>
                  <div className="font-mono text-lg font-bold text-indigo-400">
                    {archiveStatus.archivedOpsCount + archiveStatus.archivedInvsCount}
                  </div>
                  <span className="text-[9px] text-txtmuted/70 block font-normal leading-none">
                    {archiveStatus.archivedOpsCount} {language === "ar" ? "عمليات" : "ops"} | {archiveStatus.archivedInvsCount} {language === "ar" ? "فواتير" : "invs"}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10 text-[10.5px] text-txtmuted leading-relaxed">
                <span className="font-bold text-txtmain block mb-0.5">{language === "ar" ? "أثر الأرشفة والترحيل الفوري:" : "Database Performance Benefits:"}</span>
                {language === "ar"
                  ? "عملية الاستعلام وبناء الفواتير والتقارير المالية ستتخطى فحص مئات العمليات والقيود القديمة، مما يضمن فتح التطبيق بمرونة تامة وسرعة استعلام عالية."
                  : "Dramatically reduces in-memory search overhead, resulting in significantly faster query speeds on active modules."}
              </div>

              <button
                type="button"
                onClick={handleRunArchive}
                disabled={archiving || (archiveStatus.archivableOpsCount === 0 && archiveStatus.archivableInvsCount === 0)}
                className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-amber-500/10 mt-1"
                id="archive-data-btn"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${archiving ? "animate-spin" : ""}`} />
                <span>
                  {archiving 
                    ? (language === "ar" ? "جاري نقل وتأمين البيانات..." : "Moving and indexing legacy data...") 
                    : (language === "ar" ? "ترحيل وأرشفة العمليات القديمة الآن" : "Archive Old Operations & Invoices")}
                </span>
              </button>
            </div>
          ) : null}
        </div>

      </div>
    </div>
  );
}
