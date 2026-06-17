import React, { useState } from "react";
import { Invoice, Client, Operation, Company } from "../types";
import Invoices from "./Invoices";
import SettingsComponent from "./Settings";
import { FileText, Settings, ShieldAlert, BadgeCheck } from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";

interface BillingManagerProps {
  invoices: Invoice[];
  clients: Client[];
  operations: Operation[];
  currentCompany: Company | null;
  onToggleInvoice: (id: string, currentStatus: "Paid" | "Unpaid") => void;
  onUpdateCompany: (updated: Company) => void;
  userRole?: string;
  currentUserEmail?: string;
}

export default function BillingManager({
  invoices,
  clients,
  operations,
  currentCompany,
  onToggleInvoice,
  onUpdateCompany,
  userRole,
  currentUserEmail,
}: BillingManagerProps) {
  const { language } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<"ledger" | "settings">("ledger");

  const brandColor = currentCompany?.primary_color || "#4F46E5";

  return (
    <div className="space-y-6 text-start">
      {/* Tab Switcher Navigation */}
      <div className="flex border-b border-borderline/80 gap-1 pb-px overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveSubTab("ledger")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
            activeSubTab === "ledger"
              ? "border-indigo-500 text-indigo-500 dark:text-indigo-400"
              : "border-transparent text-txtmuted hover:text-txtmain"
          }`}
          style={{
            borderBottomColor: activeSubTab === "ledger" ? brandColor : "transparent",
            color: activeSubTab === "ledger" ? brandColor : undefined,
          }}
          id="billing-subtab-ledger"
        >
          <FileText className="w-4 h-4" />
          <span>
            {language === "ar" ? "دفتر الفواتير الضريبية" : "Invoice Book Ledger"}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab("settings")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
            activeSubTab === "settings"
              ? "border-indigo-500 text-indigo-500 dark:text-indigo-400"
              : "border-transparent text-txtmuted hover:text-txtmain"
          }`}
          style={{
            borderBottomColor: activeSubTab === "settings" ? brandColor : "transparent",
            color: activeSubTab === "settings" ? brandColor : undefined,
          }}
          id="billing-subtab-settings"
        >
          <Settings className="w-4 h-4" />
          <span>
            {language === "ar" ? "إعداد وهُوية الفاتورة" : "Billing Setup & Identity"}
          </span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="transit-fade duration-200">
        {activeSubTab === "ledger" ? (
          <Invoices
            invoices={invoices}
            clients={clients}
            operations={operations}
            currentCompany={currentCompany}
            onToggleInvoice={onToggleInvoice}
          />
        ) : (
          <SettingsComponent
            company={currentCompany}
            onUpdateCompany={onUpdateCompany}
            userRole={userRole}
            currentUserEmail={currentUserEmail}
          />
        )}
      </div>
    </div>
  );
}
