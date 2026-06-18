import React, { useState, useEffect } from "react";
import { AuditLog } from "../types";
import { Search, ShieldAlert, Calendar, FileSpreadsheet, RefreshCw } from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";

interface AuditTrailProps {
  selectedCompanyId: string;
}

export default function AuditTrail({ selectedCompanyId }: AuditTrailProps) {
  const { language } = useLanguage();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audit-logs`, {
        headers: {
          "X-Company-ID": selectedCompanyId
        }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCompanyId) {
      fetchLogs();
    }
  }, [selectedCompanyId]);

  // Unique list of actions and users for filters
  const uniqueActions = Array.from(new Set(logs.map(l => l.action).filter(Boolean)));
  const uniqueUsers = Array.from(new Set(logs.map(l => l.user).filter(Boolean)));

  const filteredLogs = logs.filter(log => {
    const searchLower = search.toLowerCase();
    const actionMatch = !actionFilter || log.action === actionFilter;
    const userMatch = !userFilter || log.user === userFilter;
    const textMatch = !search || 
      log.action.toLowerCase().includes(searchLower) || 
      log.details.toLowerCase().includes(searchLower) || 
      log.user.toLowerCase().includes(searchLower);

    return actionMatch && userMatch && textMatch;
  });

  const handleExportCSV = () => {
    const headers = ["ID", "Timestamp", "Action", "Details", "User"];
    const rows = filteredLogs.map(log => [
      log.id,
      log.timestamp,
      `"${log.action.replace(/"/g, '""')}"`,
      `"${log.details.replace(/"/g, '""')}"`,
      log.user
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `audit_trail_${selectedCompanyId}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-start">
      {/* Header Banner */}
      <div className="bg-cardbk rounded-2xl p-6 border border-borderline shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/10">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black text-txtmain flex items-center gap-2">
              <span>{language === "ar" ? "سجل التدقيق والرقابة للمشرف" : "Administrative Audit Trail Log"}</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-rose-500/10 text-rose-450 border border-rose-500/20 rounded font-black tracking-widest">{language === "ar" ? "صلاحيات المالك" : "OWNER ACCESS"}</span>
            </h2>
            <p className="text-xs text-txtmuted mt-1 leading-relaxed max-w-2xl">
              {language === "ar" 
                ? "مراقبة وتتبع كامل لكافة العمليات الحساسة في الكيان المالي الموحد بما في ذلك تاريخ الحركة، الإجراء المنفذ، تفاصيل المعاملة، وهوية الموظف المسؤول."
                : "Comprehensive immutable stream recording sensitive system updates, financial actions, and role state mutations."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
          <button
            onClick={fetchLogs}
            className="p-2.5 bg-appbk hover:bg-borderline border border-borderline hover:text-indigo-500 rounded-xl transition-all cursor-pointer text-txtmuted flex items-center gap-1.5 font-bold text-xs"
            title={language === "ar" ? "تحديث السجلات" : "Refresh logs"}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{language === "ar" ? "تحديث" : "Refresh"}</span>
          </button>
          
          <button
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-indigo-950/10 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{language === "ar" ? "تصدير كسجل طبيعي CSV" : "Export Audit CSV"}</span>
          </button>
        </div>
      </div>

      {/* Advanced Filters Card */}
      <div className="bg-cardbk rounded-2xl p-5 border border-borderline shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-txtmuted uppercase tracking-widest">{language === "ar" ? "فرز وتصفية السجلات الحساسة" : "Filter System Operations & Activities"}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* General Search */}
          <div>
            <label className="block text-[10px] text-txtmuted font-semibold mb-1.5">{language === "ar" ? "البحث بالاسم والتفاصيل" : "Search Action or Detail"}</label>
            <div className="relative">
              <span className={`absolute inset-y-0 ${language === "ar" ? "right-3" : "left-3"} flex items-center text-txtmuted`}>
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder={language === "ar" ? "بحث عن إجراء، مستخدم..." : "Search actions, context, user..."}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={`w-full bg-appbk text-txtmain border border-borderline rounded-xl py-2.5 text-xs focus:outline-none focus:border-indigo-500 transition-colors ${language === "ar" ? "pr-9 pl-3.5" : "pl-9 pr-3.5"}`}
              />
            </div>
          </div>

          {/* Action Category Filter */}
          <div>
            <label className="block text-[10px] text-txtmuted font-semibold mb-1.5">{language === "ar" ? "تصنيف الإجراء" : "Action Type"}</label>
            <select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              className="w-full bg-appbk text-txtmain border border-borderline rounded-xl p-2.5 text-xs focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer appearance-none"
            >
              <option value="">{language === "ar" ? "جميع التصنيفات" : "All Action Typologies"}</option>
              {uniqueActions.map((act, idx) => (
                <option key={idx} value={act}>{act}</option>
              ))}
            </select>
          </div>

          {/* User Filter */}
          <div>
            <label className="block text-[10px] text-txtmuted font-semibold mb-1.5">{language === "ar" ? "المسؤول عن الحركة" : "Employee/User Responsible"}</label>
            <select
              value={userFilter}
              onChange={e => setUserFilter(e.target.value)}
              className="w-full bg-appbk text-txtmain border border-borderline rounded-xl p-2.5 text-xs focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer appearance-none"
            >
              <option value="">{language === "ar" ? "جميع المستخدمين" : "All Personnel / Users"}</option>
              {uniqueUsers.map((usr, idx) => (
                <option key={idx} value={usr}>{usr}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table Area */}
      <div className="bg-cardbk rounded-2xl border border-borderline shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-txtmuted gap-3">
              <div className="w-8 h-8 border-3 border-borderline border-t-indigo-500 rounded-full animate-spin" />
              <p className="text-xs">{language === "ar" ? "جاري تحميل سجلات التدقيق والمراقبة..." : "Loading security logs trail..."}</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-20 text-center text-txtmuted">
              <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-25" />
              <p className="text-sm">{language === "ar" ? "لم يتم العثور على أي حركات مسجلة تطابق محددات البحث." : "No critical operations logged match the filter criteria."}</p>
            </div>
          ) : (
            <table className="w-full text-start border-collapse text-xs">
              <thead>
                <tr className="bg-appbk/40 border-b border-borderline text-txtmuted">
                  <th className="py-3.5 px-4 font-extrabold text-start w-48">{language === "ar" ? "التوقيت والزمن" : "Timestamp (UTC)"}</th>
                  <th className="py-3.5 px-4 font-extrabold text-start w-56">{language === "ar" ? "الحركة / الإجراء" : "Action/Category"}</th>
                  <th className="py-3.5 px-4 font-extrabold text-start">{language === "ar" ? "بيان تفاصيل العملية" : "Operational Log details"}</th>
                  <th className="py-3.5 px-4 font-extrabold text-start w-64">{language === "ar" ? "المسؤول" : "Executor User"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderline">
                {filteredLogs.map(log => {
                  const localTime = new Date(log.timestamp).toLocaleString(language === "ar" ? "ar-SA" : "en-US", {
                    year: "numeric",
                    month: "short",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                  });

                  // Stylize certain actions
                  const isDelete = log.action.includes("حذف") || log.action.toLowerCase().includes("delete") || log.action.toLowerCase().includes("remove");
                  const isRoleUpdate = log.action.includes("رتب") || log.action.toLowerCase().includes("role") || log.action.toLowerCase().includes("privilege");
                  const isStatus = log.action.includes("حالة") || log.action.toLowerCase().includes("status");

                  return (
                    <tr key={log.id} className="hover:bg-appbk/50 transition-colors">
                      <td className="py-4 px-4 font-mono text-[11px] text-txtmuted flex items-center gap-1.5 whitespace-nowrap">
                        <Calendar className="w-3.5 h-3.5 opacity-60 text-indigo-400 shrink-0" />
                        <span>{localTime}</span>
                      </td>
                      <td className="py-4 px-4 font-bold text-txtmain">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black border uppercase tracking-wide ${
                          isDelete 
                            ? "bg-rose-500/10 text-rose-450 border-rose-500/20" 
                            : isRoleUpdate 
                              ? "bg-amber-500/10 text-amber-500 border-amber-500/30" 
                              : isStatus 
                                ? "bg-emerald-500/10 text-emerald-450 border-emerald-500/20" 
                                : "bg-indigo-500/10 text-indigo-400 border-indigo-500/25"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isDelete ? "bg-rose-500" : isRoleUpdate ? "bg-amber-500" : isStatus ? "bg-emerald-450" : "bg-indigo-500"}`} />
                          <span>{log.action}</span>
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs font-mono text-txtmain break-words max-w-md leading-relaxed whitespace-pre-wrap">{log.details}</td>
                      <td className="py-4 px-4 text-txtmuted">
                        <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400">
                          <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[9px] text-txtmain shrink-0">
                            {log.user.charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate max-w-[180px] block" title={log.user}>{log.user}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
