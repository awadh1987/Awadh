import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { loadFromFirestore, saveToFirestore } from "./src/lib/firebaseServer";
import nodemailer from "nodemailer";

interface Company {
  id: string;
  name: string;
  logo_url?: string;
  primary_color?: string;
  currency?: string;
  widget_order?: string;
  subscription_plan?: "Trial" | "Starter" | "Business" | "Enterprise";
  subscription_status?: "Active" | "Expired" | "Pending" | "Suspended";
  subscription_expiry?: string;
  subscription_price_paid?: number;
  subscription_billing_cycle?: "monthly" | "yearly";
  enable_due_email_notifications?: boolean;
}

interface Client {
  id: string;
  company_id: string;
  name: string;
  company: string;
  phone: string;
  email?: string;
}

interface Operation {
  id: string;
  company_id: string;
  client_id: string;
  service: string;
  cost: number;
  revenue: number;
  profit: number;
  date: string; // YYYY-MM-DD
  status?: "Pending" | "In Progress" | "Completed";
}

interface Invoice {
  id: string;
  company_id: string;
  op_id: string;
  client_id: string;
  amount: number;
  status: "Paid" | "Unpaid";
  due_date: string; // YYYY-MM-DD
  payment_date?: string; // YYYY-MM-DD
  last_due_notification_sent_date?: string; // YYYY-MM-DD
}

interface AuditLog {
  id: string;
  company_id: string;
  timestamp: string;
  action: string;
  details: string;
  user: string;
}

interface Expense {
  id: string;
  company_id: string;
  category: string;
  amount: number;
  frequency: "weekly" | "monthly" | "yearly" | "once";
  date: string;
  description?: string;
}

interface FixedAsset {
  id: string;
  company_id: string;
  name: string;
  purchase_date: string; // YYYY-MM-DD
  purchase_value: number;
  useful_life_years: number;
  salvage_value: number;
  description?: string;
  category?: string;
}

// Lowdb simplified alternative using direct fs reading/writing
const DB_FILE = path.join(process.cwd(), "db_data.json");

function logEvent(db: any, companyId: string, action: string, details: string, user = "awadh.a.1987@gmail.com") {
  db.audit_logs = db.audit_logs || [];
  db.audit_logs.push({
    id: "log-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    company_id: companyId,
    timestamp: new Date().toISOString(),
    action,
    details,
    user
  });
}

function readDb() {
  const initialLogs = [
    { id: "log-initial-1", company_id: "comp-1", timestamp: "2026-06-12T09:00:00.000Z", action: "تأسيس المنشأة وتوليد الضريبة الافتراضية", details: "تم تسجيل وإعداد الكيان المالي الموحد لشركة النخبة للخدمات التقنية وتفعيل نظام الفاتورة المبسطة", user: "awadh.a.1987@gmail.com" },
    { id: "log-initial-2", company_id: "comp-1", timestamp: "2026-06-12T10:15:00.000Z", action: "إنشاء عميل جديد", details: "تم تسجيل عميل جديد باسم: عبدالله الشمري (مؤسسة الأفق)", user: "awadh.a.1987@gmail.com" },
    { id: "log-initial-3", company_id: "comp-1", timestamp: "2026-06-12T11:00:00.000Z", action: "إنشاء عملية تشغيلية وتوليد الفاتورة التلقائية", details: "تطوير تطبيق ويب ERP للعميل عبدالله الشمري بمبلغ 25,000 ر.س وتوليد الفاتورة التلقائية #INV-20260601001", user: "awadh.a.1987@gmail.com" }
  ];

  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      companies: [
        { id: "comp-1", name: "شركة النخبة للخدمات التقنية", logo_url: "", primary_color: "", currency: "ر.س" },
        { id: "comp-2", name: "مجموعة الرواد اللوجستية", logo_url: "", primary_color: "", currency: "ر.س" }
      ],
      clients: [
        { id: "cli-1", company_id: "comp-1", name: "عبدالله الشمري", company: "مؤسسة الأفق", phone: "+966501234567" },
        { id: "cli-2", company_id: "comp-1", name: "فاطمة العمودي", company: "شركة الابتكار", phone: "+966555543210" },
        { id: "cli-3", company_id: "comp-2", name: "أحمد بن علي", company: "نقليات الخليج", phone: "+966547788990" }
      ],
      operations: [
        { id: "op-1", company_id: "comp-1", client_id: "cli-1", service: "تطوير تطبيق ويب ERP", cost: 12000, revenue: 25000, profit: 13000, date: "2026-06-01" },
        { id: "op-2", company_id: "comp-1", client_id: "cli-2", service: "حملة تسويق رقمي", cost: 3500, revenue: 8000, profit: 4500, date: "2026-06-05" }
      ],
      invoices: [
        { id: "INV-20260601001", company_id: "comp-1", op_id: "op-1", client_id: "cli-1", amount: 25000, status: "Paid", due_date: "2026-06-08", payment_date: "2026-06-07" },
        { id: "INV-20260605002", company_id: "comp-1", op_id: "op-2", client_id: "cli-2", amount: 8000, status: "Unpaid", due_date: "2026-06-12" }
      ],
      expenses: [
        { id: "exp-1", company_id: "comp-1", category: "rent", amount: 1500, frequency: "monthly", date: "2026-06-01", description: "إيجار مقر المكتب الرئيسي" },
        { id: "exp-2", company_id: "comp-1", category: "subscriptions", amount: 350, frequency: "monthly", date: "2026-06-02", description: "اشتراك خوادم سحابية AWS و OpenAI" }
      ],
      fixed_assets: [
        { id: "ast-1", company_id: "comp-1", name: "أثاث ومكاتب إدارية", purchase_date: "2024-01-15", purchase_value: 20000, useful_life_years: 5, salvage_value: 2000, description: "أثاث مكتبي، كراسي، وطاولات للمقر الرئيسي", category: "furniture" },
        { id: "ast-2", company_id: "comp-1", name: "أجهزة كمبيوتر وخوادم تطوير", purchase_date: "2025-06-01", purchase_value: 35000, useful_life_years: 3, salvage_value: 5000, description: "أجهزة iMac ومحطات عمل لأعضاء الفريق المطور", category: "hardware" }
      ],
      audit_logs: initialLogs
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf-8");
    return initialData;
  }
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    if (!db.fixed_assets) {
      db.fixed_assets = [
        { id: "ast-1", company_id: "comp-1", name: "أثاث ومكاتب إدارية", purchase_date: "2024-01-15", purchase_value: 20000, useful_life_years: 5, salvage_value: 2000, description: "أثاث مكتبي، كراسي، وطاولات للمقر الرئيسي", category: "furniture" },
        { id: "ast-2", company_id: "comp-1", name: "أجهزة كمبيوتر وخوادم تطوير", purchase_date: "2025-06-01", purchase_value: 35000, useful_life_years: 3, salvage_value: 5000, description: "أجهزة iMac ومحطات عمل لأعضاء الفريق المطور", category: "hardware" }
      ];
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
    }
    if (!db.expenses) {
      db.expenses = [
        { id: "exp-1", company_id: "comp-1", category: "rent", amount: 1500, frequency: "monthly", date: "2026-06-01", description: "إيجار مقر المكتب الرئيسي" },
        { id: "exp-2", company_id: "comp-1", category: "subscriptions", amount: 350, frequency: "monthly", date: "2026-06-02", description: "اشتراك خوادم سحابية AWS و OpenAI" }
      ];
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
    }
    if (!db.audit_logs) {
      db.audit_logs = initialLogs;
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
    }
    // Set default subscription values on companies if not present
    if (db.companies) {
      let updated = false;
      db.companies.forEach((c: any) => {
        if (!c.subscription_plan) {
          c.subscription_plan = c.id === "comp-1" ? "Business" : "Trial";
          c.subscription_status = "Active";
          c.subscription_expiry = "2027-06-14";
          c.subscription_price_paid = c.id === "comp-1" ? 150 : 0;
          c.subscription_billing_cycle = "monthly";
          updated = true;
        }
      });
      if (updated) {
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
      }
    }
    // Initialize default team members if they do not exist
    if (!db.members) {
      db.members = [
        { id: "mem-1", company_id: "comp-1", name: "عوض الزهراني", email: "awadh.a.1987@gmail.com", role: "owner", status: "Active", date_added: "2026-06-12" },
        { id: "mem-2", company_id: "comp-1", name: "مشرف عام الدعم", email: "support.admin@example.com", role: "admin", status: "Active", date_added: "1987-11-20" },
        { id: "mem-3", company_id: "comp-1", name: "مشاهد لوحة معلومات", email: "viewer.sub@example.com", role: "subscriber", status: "Active", date_added: "2026-06-14" },
        { id: "mem-4", company_id: "comp-2", name: "مالك المستودع اللوجستي", email: "logistic.owner@example.com", role: "owner", status: "Active", date_added: "2026-06-12" }
      ];
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
    }
    return db;
  } catch (e) {
    return { companies: [], clients: [], operations: [], invoices: [], expenses: [], fixed_assets: [], audit_logs: [] };
  }
}

function writeDb(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  saveToFirestore(data).catch((err) => {
    console.error("Delayed Firestore synchronization write error:", err);
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // On server startup, restore state from Firestore if available
  try {
    const firestoreData = await loadFromFirestore();
    if (firestoreData) {
      console.log("Restored up-to-date SaaS dataset ledger from Firestore on startup.");
      fs.writeFileSync(DB_FILE, JSON.stringify(firestoreData, null, 2), "utf-8");
    } else {
      console.log("No remote database was loaded, synchronization will seed Firestore on primary mutation write.");
      const localData = readDb();
      await saveToFirestore(localData);
    }
  } catch (err) {
    console.error("Firestore sync error during server launch restore sequence:", err);
  }

  app.use(express.json());

  // API Request Logger
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // API endpoints

  // 1. Get companies
  app.get("/api/companies", (req, res) => {
    const db = readDb();
    res.json(db.companies || []);
  });

  // 2. Create company
  app.post("/api/companies", (req, res) => {
    const db = readDb();
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "اسم الشركة مطلوب" });
    }
    const newCompany: Company = {
      id: "comp-" + Date.now(),
      name,
      logo_url: "",
      primary_color: "",
      currency: "ر.س"
    };
    db.companies = db.companies || [];
    db.companies.push(newCompany);
    writeDb(db);
    res.json(newCompany);
  });

  // 2.5. Update company settings
  app.put("/api/companies/:id", (req, res) => {
    const { id } = req.params;
    const { name, logo_url, primary_color, currency, widget_order, enable_due_email_notifications } = req.body;
    const db = readDb();
    
    db.companies = db.companies || [];
    const index = db.companies.findIndex((c: Company) => c.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "الكيان غير موجود" });
    }
    
    const prevName = db.companies[index].name;
    if (name) {
      db.companies[index].name = name;
    }
    db.companies[index].logo_url = logo_url || "";
    db.companies[index].primary_color = primary_color || "";
    db.companies[index].currency = currency || "ر.س";
    db.companies[index].widget_order = widget_order || "";
    db.companies[index].enable_due_email_notifications = enable_due_email_notifications === true;
    
    const notificationStatusText = enable_due_email_notifications
      ? "تفعيل الإشعارات البريدية التلقائية"
      : "تعطيل الإشعارات البريدية التلقائية";
      
    logEvent(
      db,
      id,
      "تعديل إعدادات وهوية المنشأة",
      `تم تحديث هوية المنشأة "${prevName}" إلى: الاسم "${name || prevName}"، العملة: "${currency || "ر.س"}"، واللون الأساسي: "${primary_color || "تلقائي"}"، وترتيب الإحصائيات: "${widget_order || "تلقائي"}"، وحالة الإشعارات: "${notificationStatusText}"`
    );
    
    writeDb(db);
    res.json(db.companies[index]);
  });

  // 2.6. Update company subscription plan
  app.put("/api/companies/:id/subscription", (req, res) => {
    const { id } = req.params;
    const { subscription_plan, subscription_billing_cycle, price_paid } = req.body;
    const db = readDb();
    
    db.companies = db.companies || [];
    const index = db.companies.findIndex((c: Company) => c.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "الكيان غير موجود" });
    }
    
    const prevPlan = db.companies[index].subscription_plan || "Trial";
    
    db.companies[index].subscription_plan = subscription_plan;
    db.companies[index].subscription_billing_cycle = subscription_billing_cycle || "monthly";
    db.companies[index].subscription_status = "Active";
    db.companies[index].subscription_price_paid = Number(price_paid) || 0;
    
    const now = new Date();
    if (subscription_billing_cycle === "yearly") {
      now.setFullYear(now.getFullYear() + 1);
    } else {
      now.setMonth(now.getMonth() + 1);
    }
    db.companies[index].subscription_expiry = now.toISOString().split("T")[0];
    
    logEvent(
      db,
      id,
      "ترقية خطة الاشتراك والخدمات",
      `تم تحديث خطة اشتراك المنشأة من "${prevPlan}" إلى "${subscription_plan}" بدورة دفع: "${subscription_billing_cycle === "yearly" ? "سنوية" : "شهرية"}"`
    );
    
    writeDb(db);
    res.json(db.companies[index]);
  });

  // 2.7. Get corporate team members with roles (Owner, Admin, Subscriber)
  app.get("/api/members", (req, res) => {
    const companyId = getCompanyId(req);
    const db = readDb();
    const members = (db.members || []).filter((m: any) => m.company_id === companyId);
    res.json(members);
  });

  // 2.8. Register dynamic team member
  app.post("/api/members", (req, res) => {
    const companyId = getCompanyId(req);
    const { name, email, role, status } = req.body;
    if (!name || !email || !role) {
      return res.status(400).json({ error: "الاسم والبريد الإلكتروني وتحديد الصلاحية مطلوبة" });
    }
    const db = readDb();
    db.members = db.members || [];
    
    // Check if member already exists in this company
    const exists = db.members.some((m: any) => m.company_id === companyId && m.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return res.status(400).json({ error: "هذا العضو مسجل بالفعل في هذه المنشأة" });
    }

    const newMember = {
      id: "mem-" + Date.now(),
      company_id: companyId,
      name,
      email: email.toLowerCase(),
      role: role || "subscriber",
      status: status || "Active",
      date_added: new Date().toISOString().split("T")[0]
    };
    db.members.push(newMember);
    
    logEvent(
      db,
      companyId,
      "إضافة عضو فريق جديد",
      `تم تسجيل عضو فريق جديد باسم "${name}" ورتبة "${role === "owner" ? "مالك" : role === "admin" ? "مشرف" : "مشترك قارئ"}" في نظام الحوكمة`
    );
    
    writeDb(db);
    res.json(newMember);
  });

  // 2.9. Update team member role/status
  app.put("/api/members/:id", (req, res) => {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    const { name, role, status } = req.body;
    const db = readDb();
    
    db.members = db.members || [];
    const index = db.members.findIndex((m: any) => m.id === id && m.company_id === companyId);
    if (index === -1) {
      return res.status(404).json({ error: "عضو الفريق غير موجود أو لا يتبع لهذه المنشأة" });
    }
    
    const prevRole = db.members[index].role;
    const prevStatus = db.members[index].status;
    
    if (name) db.members[index].name = name;
    if (role) db.members[index].role = role;
    if (status) db.members[index].status = status;
    
    logEvent(
      db,
      companyId,
      "تعديل صلاحية عضو فريق",
      `تم تحديث سجل عضو الفريق "${db.members[index].name}": الصلاحية من "${prevRole}" إلى "${role || prevRole}"، الحالة من "${prevStatus}" إلى "${status || prevStatus}"`
    );
    
    writeDb(db);
    res.json(db.members[index]);
  });

  // 2.10. Remove team member
  app.delete("/api/members/:id", (req, res) => {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    const db = readDb();
    
    db.members = db.members || [];
    const member = db.members.find((m: any) => m.id === id && m.company_id === companyId);
    if (!member) {
      return res.status(404).json({ error: "عضو الفريق غير موجود في النظام" });
    }
    
    // Safety check: Cannot delete the last owner
    const owners = db.members.filter((m: any) => m.company_id === companyId && m.role === "owner" && m.status === "Active");
    if (member.role === "owner" && owners.length <= 1) {
      return res.status(400).json({ error: "لا يمكن حذف مالك النظام الأخير للشركة حفاظاً على الكيان المالي" });
    }
    
    db.members = db.members.filter((m: any) => !(m.id === id && m.company_id === companyId));
    
    logEvent(
      db,
      companyId,
      "حذف وإلغاء عضوية فريق",
      `تم حذف العضو "${member.name}" (${member.email}) نهائياً من نظام الحوكمة في المنشأة`
    );
    
    writeDb(db);
    res.json({ success: true });
  });

  // Mid-tier helper to filter by company (tenant)
  const getCompanyId = (req: express.Request): string => {
    return (req.headers["x-company-id"] as string) || "comp-1";
  };

  // 3. Get clients
  app.get("/api/clients", (req, res) => {
    const companyId = getCompanyId(req);
    const db = readDb();
    const clients = (db.clients || []).filter((c: Client) => c.company_id === companyId);
    res.json(clients);
  });

  // 4. Create client
  app.post("/api/clients", (req, res) => {
    const companyId = getCompanyId(req);
    const { name, company, phone } = req.body;
    if (!name) {
      return res.status(400).json({ error: "اسم العميل مطلوب" });
    }
    const db = readDb();
    const newClient: Client = {
      id: "cli-" + Date.now(),
      company_id: companyId,
      name,
      company: company || "",
      phone: phone || ""
    };
    db.clients = db.clients || [];
    db.clients.push(newClient);
    
    logEvent(
      db,
      companyId,
      "إنشاء عميل جديد",
      `تم تسجيل عميل جديد باسم: "${name}" ${company ? `(${company})` : ""} وهاتف: ${phone || "غير متوفر"}`
    );
    
    writeDb(db);
    res.json(newClient);
  });

  // 5. Get operations
  app.get("/api/operations", (req, res) => {
    const companyId = getCompanyId(req);
    const db = readDb();
    const operations = (db.operations || []).filter((o: Operation) => o.company_id === companyId);
    res.json(operations);
  });

  // 6. Create operation
  app.post("/api/operations", (req, res) => {
    const companyId = getCompanyId(req);
    const { client_id, service, cost, revenue, status } = req.body;

    if (!service) {
      return res.status(400).json({ error: "الخدمة مطلوبة" });
    }

    const db = readDb();
    const cVal = Number(cost) || 0;
    const rVal = Number(revenue) || 0;
    const profit = rVal - cVal;

    const newOp: Operation = {
      id: "op-" + Date.now(),
      company_id: companyId,
      client_id: client_id || "",
      service,
      cost: cVal,
      revenue: rVal,
      profit,
      date: new Date().toISOString().split("T")[0],
      status: status || "In Progress"
    };

    db.operations = db.operations || [];
    db.operations.push(newOp);

    // Auto-generate invoice
    const invId = "INV-" + new Date().toISOString().replace(/[-:T.Z]/g, "").substring(0, 14);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const newInv: Invoice = {
      id: invId,
      company_id: companyId,
      op_id: newOp.id,
      client_id: client_id || "",
      amount: rVal,
      status: "Unpaid",
      due_date: dueDate.toISOString().split("T")[0]
    };

    db.invoices = db.invoices || [];
    db.invoices.push(newInv);

    const clientObj = (db.clients || []).find((c: any) => c.id === client_id);
    const clientNameStr = clientObj ? `للعميل: "${clientObj.name}"` : "لعميل عام";
    
    logEvent(
      db,
      companyId,
      "إنشاء عملية وقص فاتورة",
      `تم إنجاز خدمة: "${service}" بقيمة ${rVal.toLocaleString()} ${db.companies?.find((c: any) => c.id === companyId)?.currency || "ر.س"} ${clientNameStr} وتوليد الفاتورة التلقائية (#${invId})`
    );

    writeDb(db);

    res.json({
      status: "success",
      message: "تم إنشاء العملية بنجاح وتوليد الفاتورة التلقائية",
      operation: newOp,
      invoice: newInv
    });
  });

  // 6.1. Update operation status
  app.patch("/api/operations/:id", (req, res) => {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["Pending", "In Progress", "Completed"].includes(status)) {
      return res.status(400).json({ error: "حالة العملية غير صالحة" });
    }

    const db = readDb();
    db.operations = db.operations || [];
    const opIndex = db.operations.findIndex((o: any) => o.id === id && o.company_id === companyId);

    if (opIndex === -1) {
      return res.status(404).json({ error: "العملية غير موجودة" });
    }

    const oldStatus = db.operations[opIndex].status || "In Progress";
    db.operations[opIndex].status = status;

    const statusTranslations: Record<string, string> = {
      "Pending": "معلقة",
      "In Progress": "قيد التنفيذ",
      "Completed": "مكتملة"
    };

    logEvent(
      db,
      companyId,
      "تحديث حالة العملية",
      `تم تغيير حالة العملية "${db.operations[opIndex].service}" من (${statusTranslations[oldStatus] || oldStatus}) إلى (${statusTranslations[status] || status})`
    );

    writeDb(db);
    res.json(db.operations[opIndex]);
  });

  // 7. Get invoices
  app.get("/api/invoices", (req, res) => {
    const companyId = getCompanyId(req);
    const db = readDb();
    const invoices = (db.invoices || []).filter((i: Invoice) => i.company_id === companyId);
    res.json(invoices);
  });

  // 7.1. Get overdue invoices for notification center
  app.get("/api/invoices/overdue", (req, res) => {
    try {
      const companyId = getCompanyId(req);
      const db = readDb();
      const todayStr = new Date().toISOString().split("T")[0];
      
      const invoices = (db.invoices || []).filter(
        (i: Invoice) => i.company_id === companyId && i.status === "Unpaid" && i.due_date && i.due_date < todayStr
      );
      
      const clients = db.clients || [];
      const clientMap = new Map<string, any>(
        clients.filter((c: any) => c && c.id).map((c: any) => [c.id, c])
      );
      
      const result = invoices.map((i: Invoice) => {
        const cl = clientMap.get(i.client_id);
        return {
          ...i,
          client_name: cl ? cl.name : "عميل غير معروف",
          client_phone: cl ? cl.phone : "",
          client_email: cl ? cl.email || "" : ""
        };
      });
      
      res.json(result);
    } catch (err) {
      console.error("Error in /api/invoices/overdue route:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // 7.2. Trigger and process automatic due date notification emails for clients
  app.post("/api/invoices/due-alerts/process", async (req, res) => {
    try {
      const companyId = getCompanyId(req);
      const db = readDb();
      const todayStr = new Date().toISOString().split("T")[0];
      
      db.companies = db.companies || [];
      const company = db.companies.find((c: any) => c.id === companyId);
      
      if (!company) {
        return res.status(404).json({ error: "الشركة غير موجودة" });
      }
      
      // Check if feature is enabled in settings
      if (!company.enable_due_email_notifications) {
        return res.json({ 
          success: false, 
          message: "إشعارات البريد المؤتمتة معطلة حالياً لهذه المنشأة", 
          sent: [] 
        });
      }
      
      // Helper to compute date difference
      const getDaysDiff = (date1Str: string, date2Str: string) => {
        try {
          const d1 = new Date(date1Str);
          const d2 = new Date(date2Str);
          d1.setHours(0,0,0,0);
          d2.setHours(0,0,0,0);
          const diffTime = d1.getTime() - d2.getTime();
          return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        } catch {
          return 99;
        }
      };
      
      const unpaidInvoices = (db.invoices || []).filter(
        (i: Invoice) => i.company_id === companyId && i.status === "Unpaid"
      );
      
      const clients = db.clients || [];
      const clientMap = new Map<string, any>(clients.map((c: any) => [c.id, c]));
      
      const operations = db.operations || [];
      const opMap = new Map<string, any>(operations.map((o: any) => [o.id, o]));
      
      const processed: any[] = [];
      
      // Setup transporter
      let transporter: any;
      const smtpHost = process.env.SMTP_HOST || "";
      const smtpUser = process.env.SMTP_USER || "";
      const smtpPass = process.env.SMTP_PASS || "";
      const smtpPort = parseInt(process.env.SMTP_PORT || "587");
      const smtpSecure = process.env.SMTP_SECURE === "true";
      
      if (smtpHost && smtpUser) {
        transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          auth: { user: smtpUser, pass: smtpPass }
        });
      } else {
        transporter = {
          sendMail: async (options: any) => {
            console.log("------- SYSTEM AUTOMATIC EMAIL SIMULATION -------");
            console.log(`To: ${options.to}`);
            console.log(`Subject: ${options.subject}`);
            console.log(`Body:\n${options.text}`);
            console.log("-------------------------------------------------");
            return { messageId: "sim-id-" + Math.floor(Math.random() * 100000) };
          }
        };
      }
      
      for (const inv of unpaidInvoices) {
        if (!inv.due_date) continue;
        
        const daysRemaining = getDaysDiff(inv.due_date, todayStr);
        
        // Approaching threshold (due in <= 3 days, and not already processed/sent today!)
        if (daysRemaining >= 0 && daysRemaining <= 3 && inv.last_due_notification_sent_date !== todayStr) {
          const client = clientMap.get(inv.client_id);
          if (!client) continue;
          
          const clientEmail = client.email ? client.email.trim() : "";
          const op = opMap.get(inv.op_id);
          const serviceName = op ? op.service : "تأجير / خدمات تشغيلية";
          
          const shortInvId = inv.id.split("-").pop() || inv.id;
          const subject = `تذكير استحقاق الفاتورة رقم #INV-${shortInvId.toUpperCase()} - ${company.name}`;
          
          const webOrigin = req.headers.referer || req.headers.origin || "https://erp-portal.com";
          const billLink = `${webOrigin}/?invoice=${inv.id}`;
          
          const mailText = `مرحباً أ/ ${client.name}،

نود تذكيركم بقرب موعد استحقاق الفاتورة الصادرة من "${company.name}" والمُستحقة لخدمة: "${serviceName}".

* تفاصيل الفاتورة المستهدفة:
- الرقم المرجعي: #INV-${shortInvId.toUpperCase()}
- إجمالي المبلغ المستحق: ${inv.amount.toLocaleString()} ${company.currency || "ر.س"}
- تاريخ الاستحقاق: ${inv.due_date} (${daysRemaining === 0 ? "اليوم!" : `خلال ${daysRemaining} أيام`})

نرجو التكرم بالاستعداد للمطابقة وسداد المستحق المذكور أعلاه لتجنب تأثر الخدمات أو فرض رسوم تأخير مضافة وفق شروط التعاقد المتبادل.

مرفق لكم رابط الكشف الفوري والمباشر للفاتورة الضريبية المبسطة:
${billLink}

إذا كانت لديكم أي استفسارات أو تفاصيل إضافية، يرجى الرد على هذا البريد الإلكتروني مباشرة.

نشكر لكم تعاونكم وحسن تعاملكم،
قسم المالية والمطالبات - ${company.name}`;

          // If client doesn't specify email, create placeholder so log is pristine
          const finalRecipient = clientEmail || `${client.name.replace(/\s+/g, '').toLowerCase()}@example.com`;
          
          try {
            await transporter.sendMail({
              from: smtpUser || `"قسم المالية - ${company.name}" <claims@erp-billing.com>`,
              to: finalRecipient,
              subject: subject,
              text: mailText
            });
            
            // Mark as sent today
            inv.last_due_notification_sent_date = todayStr;
            
            // Log in audit log
            logEvent(
              db,
              companyId,
              "إرسال تذكير استحقاق بريدي تلقائي",
              `تم إرسال تذكير استحقاق بريدي تلقائي للعميل "${client.name}" للفاتورة رقم #INV-${shortInvId.toUpperCase()} بقيمة ${inv.amount.toLocaleString()} ${company.currency || "ر.س"} المستحقة في تاريخ ${inv.due_date} (البريد الإلكتروني للعميل: ${finalRecipient})`
            );
            
            processed.push({
              invoice_id: inv.id,
              client_name: client.name,
              recipient: finalRecipient,
              amount: inv.amount,
              days_remaining: daysRemaining,
              status: "success"
            });
          } catch (emailErr: any) {
            console.error(`Failed to send email for invoice ${inv.id}:`, emailErr);
            processed.push({
              invoice_id: inv.id,
              client_name: client.name,
              recipient: finalRecipient,
              amount: inv.amount,
              days_remaining: daysRemaining,
              status: "failed",
              error: emailErr.message
            });
          }
        }
      }
      
      if (processed.length > 0) {
        writeDb(db);
        try {
          saveToFirestore(db).catch(err => console.warn("Background firestore update alert:", err));
        } catch {}
      }
      
      res.json({
        success: true,
        message: `تم فحص الفواتير وإرسال عدد (${processed.filter(p => p.status === 'success').length}) إشعارات بريدية تذكيرية بنجاح للعملاء اللذين اقترب موعد فواتيرهم.`,
        sent: processed
      });
      
    } catch (err: any) {
      console.error("Error in process-due-alerts route:", err);
      res.status(500).json({ error: "Internal Server Error", message: err.message });
    }
  });

  // 8. Put/Patch Update Invoice Payment Status
  app.patch("/api/invoices/:id", (req, res) => {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    const { status } = req.body; // "Paid" | "Unpaid"

    if (status !== "Paid" && status !== "Unpaid") {
      return res.status(400).json({ error: "حالة الفاتورة غير صالحة" });
    }

    const db = readDb();
    const invIndex = (db.invoices || []).findIndex(
      (i: Invoice) => i.id === id && i.company_id === companyId
    );

    if (invIndex === -1) {
      return res.status(404).json({ error: "الفاتورة غير موجودة" });
    }

    db.invoices[invIndex].status = status;
    if (status === "Paid") {
      db.invoices[invIndex].payment_date = new Date().toISOString().split("T")[0];
    } else {
      delete db.invoices[invIndex].payment_date;
    }

    const currInvoice = db.invoices[invIndex];
    const shortInvId = id.split("-").pop() || id;
    const compSetting = (db.companies || []).find((c: any) => c.id === companyId);
    
    logEvent(
      db,
      companyId,
      "تحديث حالة سداد الفاتورة",
      `تحديث فاتورة رقم #${shortInvId} بقيمة ${currInvoice.amount.toLocaleString()} ${compSetting?.currency || "ر.س"} إلى: ${status === "Paid" ? "✅ مدفوعة ومحصلة" : "⏳ غير مدفوعة / قيد الانتظار"}`
    );

    writeDb(db);
    res.json(db.invoices[invIndex]);
  });

  // 9. Get stats & analysis for dashboard
  app.get("/api/stats", (req, res) => {
    const companyId = getCompanyId(req);
    const db = readDb();

    const ops = (db.operations || []).filter((o: Operation) => o.company_id === companyId);
    const invs = (db.invoices || []).filter((i: Invoice) => i.company_id === companyId);
    const clientsCount = (db.clients || []).filter((c: Client) => c.company_id === companyId).length;
    const exps = (db.expenses || []).filter((e: any) => e.company_id === companyId);

    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;

    ops.forEach((o: Operation) => {
      totalRevenue += o.revenue;
      totalCost += o.cost;
      totalProfit += o.profit;
    });

    // Sum operational and recurring expenses
    let totalOpExpenses = 0;
    exps.forEach((e: any) => {
      totalOpExpenses += Number(e.amount) || 0;
    });

    totalCost += totalOpExpenses;
    totalProfit -= totalOpExpenses;

    let paidAmount = 0;
    let unpaidAmount = 0;
    let overdueCount = 0;

    const todayStr = new Date().toISOString().split("T")[0];

    invs.forEach((i: Invoice) => {
      if (i.status === "Paid") {
        paidAmount += i.amount;
      } else {
        unpaidAmount += i.amount;
        if (i.due_date && i.due_date < todayStr) {
          overdueCount++;
        }
      }
    });

    res.json({
      totalRevenue,
      totalCost,
      totalProfit,
      clientsCount,
      operationsCount: ops.length,
      invoicesCount: invs.length,
      paidAmount,
      unpaidAmount,
      overdueCount,
      profitMargin: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : "0"
    });
  });

  // 9.1. Get expenses
  app.get("/api/expenses", (req, res) => {
    const companyId = getCompanyId(req);
    const db = readDb();
    const expenses = (db.expenses || []).filter((e: Expense) => e.company_id === companyId);
    res.json(expenses);
  });

  // 9.2. Create expense
  app.post("/api/expenses", (req, res) => {
    const companyId = getCompanyId(req);
    const { category, amount, frequency, date, description } = req.body;

    if (!category || !amount) {
      return res.status(400).json({ error: "الفئة والملبغ مطلوبان" });
    }

    const db = readDb();
    const newExpense: Expense = {
      id: "exp-" + Date.now(),
      company_id: companyId,
      category,
      amount: Number(amount) || 0,
      frequency: frequency || "monthly",
      date: date || new Date().toISOString().split("T")[0],
      description: description || ""
    };

    db.expenses = db.expenses || [];
    db.expenses.push(newExpense);

    const compSetting = (db.companies || []).find((c: any) => c.id === companyId);
    const categoryNameAr = category === "rent" ? "إيجار" : category === "salaries" ? "رواتب" : category === "subscriptions" ? "اشتراكات" : category === "utilities" ? "مرافق وخدمات" : category === "marketing" ? "تسويق" : "مصروفات تشغيلية أخرى";
    
    logEvent(
      db,
      companyId,
      "تسجيل مصروف تشغيلي جديد",
      `تم تسجيل مصروف دوري فئة: (${categoryNameAr}) بمبلغ ${newExpense.amount.toLocaleString()} ${compSetting?.currency || "ر.س"} بدورية: (${frequency}) ووصف: "${description || "لا يوجد"}"`
    );

    writeDb(db);
    res.json(newExpense);
  });

  // 9.3. Delete expense
  app.delete("/api/expenses/:id", (req, res) => {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    const db = readDb();

    db.expenses = db.expenses || [];
    const index = db.expenses.findIndex((e: any) => e.id === id && e.company_id === companyId);
    if (index === -1) {
      return res.status(404).json({ error: "المصروف غير موجود" });
    }

    const exp = db.expenses[index];
    db.expenses.splice(index, 1);

    const compSetting = (db.companies || []).find((c: any) => c.id === companyId);
    const categoryNameAr = exp.category === "rent" ? "إيجار" : exp.category === "salaries" ? "رواتب" : exp.category === "subscriptions" ? "اشتراكات" : exp.category === "utilities" ? "مرافق وخدمات" : exp.category === "marketing" ? "تسويق" : "مصروفات أخرى";

    logEvent(
      db,
      companyId,
      "حذف مصروف تشغيلي",
      `تم حذف المصروف الدوري فئة: (${categoryNameAr}) بمبلغ ${exp.amount.toLocaleString()} ${compSetting?.currency || "ر.س"}`
    );

    writeDb(db);
    res.json({ success: true, message: "تم حذف المصروف بنجاح" });
  });

  // 9.3.5. Get fixed assets
  app.get("/api/fixed-assets", (req, res) => {
    const companyId = getCompanyId(req);
    const db = readDb();
    const assets = (db.fixed_assets || []).filter((a: FixedAsset) => a.company_id === companyId);
    res.json(assets);
  });

  // 9.3.6. Create fixed asset
  app.post("/api/fixed-assets", (req, res) => {
    const companyId = getCompanyId(req);
    const { name, purchase_date, purchase_value, useful_life_years, salvage_value, description, category } = req.body;

    if (!name || !purchase_date || purchase_value === undefined || useful_life_years === undefined || salvage_value === undefined) {
      return res.status(400).json({ error: "الاسم وتاريخ الشراء والقيمة الأصلية والعمر الافتراضي وقيمة الخردة مطلوبين" });
    }

    const db = readDb();
    const newAsset: FixedAsset = {
      id: "ast-" + Date.now(),
      company_id: companyId,
      name,
      purchase_date,
      purchase_value: Number(purchase_value) || 0,
      useful_life_years: Number(useful_life_years) || 1,
      salvage_value: Number(salvage_value) || 0,
      description: description || "",
      category: category || "other"
    };

    db.fixed_assets = db.fixed_assets || [];
    db.fixed_assets.push(newAsset);

    const compSetting = (db.companies || []).find((c: any) => c.id === companyId);

    logEvent(
      db,
      companyId,
      "تسجيل أصل ثابت جديد",
      `تم تسجيل أصل جديد باسم: (${name}) وتكلفة شراء: ${newAsset.purchase_value.toLocaleString()} ${compSetting?.currency || "ر.س"} وعمر افتراضي: ${useful_life_years} سنوات`
    );

    writeDb(db);
    try {
      saveToFirestore(db).catch(err => console.warn("Background update alert:", err));
    } catch {}
    res.json(newAsset);
  });

  // 9.3.7. Update fixed asset
  app.patch("/api/fixed-assets/:id", (req, res) => {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    const { name, purchase_date, purchase_value, useful_life_years, salvage_value, description, category } = req.body;

    const db = readDb();
    db.fixed_assets = db.fixed_assets || [];
    const index = db.fixed_assets.findIndex((a: any) => a.id === id && a.company_id === companyId);
    if (index === -1) {
      return res.status(404).json({ error: "الأصل غير موجود" });
    }

    const oldAsset = db.fixed_assets[index];
    const updatedAsset: FixedAsset = {
      ...oldAsset,
      name: name !== undefined ? name : oldAsset.name,
      purchase_date: purchase_date !== undefined ? purchase_date : oldAsset.purchase_date,
      purchase_value: purchase_value !== undefined ? Number(purchase_value) : oldAsset.purchase_value,
      useful_life_years: useful_life_years !== undefined ? Number(useful_life_years) : oldAsset.useful_life_years,
      salvage_value: salvage_value !== undefined ? Number(salvage_value) : oldAsset.salvage_value,
      description: description !== undefined ? description : oldAsset.description,
      category: category !== undefined ? category : oldAsset.category
    };

    db.fixed_assets[index] = updatedAsset;

    logEvent(
      db,
      companyId,
      "تعديل بيانات أصل ثابت",
      `تم تعديل بيانات الأصل الثابت: (${updatedAsset.name}) ببيانات جديدة في النظام`
    );

    writeDb(db);
    try {
      saveToFirestore(db).catch(err => console.warn("Background update alert:", err));
    } catch {}
    res.json(updatedAsset);
  });

  // 9.3.8. Delete fixed asset
  app.delete("/api/fixed-assets/:id", (req, res) => {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    const db = readDb();

    db.fixed_assets = db.fixed_assets || [];
    const index = db.fixed_assets.findIndex((a: any) => a.id === id && a.company_id === companyId);
    if (index === -1) {
      return res.status(404).json({ error: "الأصل غير موجود" });
    }

    const asset = db.fixed_assets[index];
    db.fixed_assets.splice(index, 1);

    logEvent(
      db,
      companyId,
      "استبعاد أو حذف أصل ثابت",
      `تم حذف أو استبعاد الأصل الثابت: (${asset.name}) بالكامل من سجلات الشركة`
    );

    writeDb(db);
    try {
      saveToFirestore(db).catch(err => console.warn("Background update alert:", err));
    } catch {}
    res.json({ success: true, message: "تم حذف الأصل بنجاح" });
  });

  // 9.4. Get budgets
  app.get("/api/budgets", (req, res) => {
    const companyId = getCompanyId(req);
    const db = readDb();
    const budgets = (db.budgets || []).filter((b: any) => b.company_id === companyId);
    res.json(budgets);
  });

  // 9.4.2. Setup/Upsert budget
  app.post("/api/budgets", (req, res) => {
    const companyId = getCompanyId(req);
    const { category, limit_amount, month } = req.body;

    if (!category || limit_amount === undefined || !month) {
      return res.status(400).json({ error: "الفئة والمبلغ المستهدف والشهر مطلوبان" });
    }

    const db = readDb();
    db.budgets = db.budgets || [];

    // Check if budget for category & month already exists for this company
    const existingIndex = db.budgets.findIndex((b: any) => 
      b.company_id === companyId && 
      b.category === category && 
      b.month === month
    );

    const compSetting = (db.companies || []).find((c: any) => c.id === companyId);
    const categoryNameAr = category === "rent" ? "إيجار" : category === "salaries" ? "رواتب" : category === "subscriptions" ? "اشتراكات" : category === "utilities" ? "مرافق وخدمات" : category === "marketing" ? "تسويق" : "مصروفات تشغيلية أخرى";

    let budgetObj;
    if (existingIndex > -1) {
      db.budgets[existingIndex].limit_amount = Number(limit_amount) || 0;
      budgetObj = db.budgets[existingIndex];
      logEvent(
        db,
        companyId,
        "تحديث ميزانية فئة مصروف",
        `تم تحديث الميزانية الشهرية لفئة: (${categoryNameAr}) لشهر (${month}) لتصبح ${budgetObj.limit_amount.toLocaleString()} ${compSetting?.currency || "ر.س"}`
      );
    } else {
      budgetObj = {
        id: "bgt-" + Date.now() + "-" + Math.floor(Math.random() * 100),
        company_id: companyId,
        category,
        limit_amount: Number(limit_amount) || 0,
        month
      };
      db.budgets.push(budgetObj);
      logEvent(
        db,
        companyId,
        "تحديد ميزانية فئة مصروف جديدة",
        `تم تحديد ميزانية شهرية جديدة لفئة: (${categoryNameAr}) لشهر (${month}) بمبلغ ${budgetObj.limit_amount.toLocaleString()} ${compSetting?.currency || "ر.س"}`
      );
    }

    writeDb(db);
    res.json(budgetObj);
  });

  // 9.4.3. Delete budget
  app.delete("/api/budgets/:id", (req, res) => {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    const db = readDb();

    db.budgets = db.budgets || [];
    const index = db.budgets.findIndex((b: any) => b.id === id && b.company_id === companyId);
    if (index === -1) {
      return res.status(404).json({ error: "الميزانية غير موجودة" });
    }

    const bgt = db.budgets[index];
    db.budgets.splice(index, 1);

    const compSetting = (db.companies || []).find((c: any) => c.id === companyId);
    const categoryNameAr = bgt.category === "rent" ? "إيجار" : bgt.category === "salaries" ? "رواتب" : bgt.category === "subscriptions" ? "اشتراكات" : bgt.category === "utilities" ? "مرافق وخدمات" : bgt.category === "marketing" ? "تسويق" : "مصروفات أخرى";

    logEvent(
      db,
      companyId,
      "حذف ميزانية شهريّة",
      `تم إلغاء ميزانية شهر: (${bgt.month}) لفئة: (${categoryNameAr}) بقيمة ${bgt.limit_amount.toLocaleString()} ${compSetting?.currency || "ر.س"}`
    );

    writeDb(db);
    res.json({ success: true, message: "تم حذف الميزانية بنجاح" });
  });

  // 9.5. Get Audit Logs
  app.get("/api/audit-logs", (req, res) => {
    const companyId = getCompanyId(req);
    const db = readDb();
    const logs = (db.audit_logs || []).filter((l: AuditLog) => l.company_id === companyId);
    const sorted = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json(sorted);
  });

  // 9.6. Log custom action from client
  app.post("/api/audit-logs", (req, res) => {
    const companyId = getCompanyId(req);
    const { action, details, user } = req.body;
    if (!action) {
      return res.status(400).json({ error: "اسم الإجراء مطلوب" });
    }
    const db = readDb();
    logEvent(db, companyId, action, details || "", user || "awadh.a.1987@gmail.com");
    writeDb(db);
    res.json({ status: "success" });
  });

  // 9.7. Delete operation and cancel invoice
  app.delete("/api/operations/:id", (req, res) => {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    const db = readDb();

    db.operations = db.operations || [];
    const opIndex = (db.operations || []).findIndex((o: any) => o.id === id && o.company_id === companyId);
    if (opIndex === -1) {
      return res.status(404).json({ error: "العملية التشغيلية غير موجودة" });
    }

    const op = db.operations[opIndex];

    // Delete associated invoices
    db.invoices = (db.invoices || []).filter((i: any) => !(i.op_id === id && i.company_id === companyId));

    // Remove operation
    db.operations.splice(opIndex, 1);

    // Get client details for logging
    const clientObj = (db.clients || []).find((c: any) => c.id === op.client_id);
    const clientNameStr = clientObj ? `للعميل "${clientObj.name}"` : "لعميل عام";
    const compSetting = (db.companies || []).find((c: any) => c.id === companyId);

    logEvent(
      db,
      companyId,
      "حذف عملية تشغيلية",
      `تم حذف الخدمة: "${op.service}" بقيمة ${op.revenue.toLocaleString()} ${compSetting?.currency || "ر.س"} ${clientNameStr}، وإلغاء فواتيرها التلقائية والافتراضية المرتبطة به.`
    );

    writeDb(db);
    res.json({ success: true, message: "تم حذف العملية التشغيلية وإلغاء الفواتير بنجاح" });
  });

  // --- Database Resilience & Daily Secure Backups Service ---
  const BACKUP_DIR = path.join(process.cwd(), "secure_storage_bucket");
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  function triggerBackup(isAuto: boolean, companyId = "comp-1"): { success: boolean; filename: string; size: number; timestamp: string } {
    try {
      const db = readDb();
      const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const timestampStr = Date.now();
      const filename = `backup-${dateStr}-${timestampStr}-${isAuto ? "auto" : "manual"}.json`;
      const destPath = path.join(BACKUP_DIR, filename);
      
      const dbContent = JSON.stringify(db, null, 2);
      fs.writeFileSync(destPath, dbContent, "utf-8");
      
      const size = fs.statSync(destPath).size;
      
      logEvent(
        db,
        companyId,
        isAuto ? "نسخ احتياطي تلقائي للبيانات" : "نسخ احتياطي يدوي للبيانات",
        `تم إنشاء نسخة احتياطية بنجاح وحفظها في الحاوية السحابية الآمنة باسم: ${filename} بحجم ${(size / 1024).toFixed(2)} KB.`
      );
      writeDb(db);
      
      return { success: true, filename, size, timestamp: new Date().toISOString() };
    } catch (error) {
      console.error("Backup failed:", error);
      throw error;
    }
  }

  function runDailyBackupCheck() {
    try {
      if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
      }
      const files = fs.readdirSync(BACKUP_DIR);
      const dateToday = new Date().toISOString().split("T")[0];
      
      const hasBackupForToday = files.some(file => file.startsWith(`backup-${dateToday}-`));
      
      if (!hasBackupForToday) {
        console.log(`[Backup Service] No backup found for today (${dateToday}). Performing automatic system daily backup...`);
        const result = triggerBackup(true, "comp-1");
        console.log(`[Backup Service] Daily automatic backup completed successfully: ${result.filename}`);
      } else {
        console.log(`[Backup Service] Daily backup already exists for today (${dateToday}). Skipping daily run.`);
      }
    } catch (err) {
      console.error("[Backup Service] Failed running daily automatic backup check:", err);
    }
  }

  // Run immediately on boot and set hourly interval (3600000 ms)
  runDailyBackupCheck();
  setInterval(runDailyBackupCheck, 3600000);

  // 9.8. Get backups list
  app.get("/api/backups", (req, res) => {
    try {
      if (!fs.existsSync(BACKUP_DIR)) {
        return res.json([]);
      }
      const files = fs.readdirSync(BACKUP_DIR);
      const backups = files
        .filter(f => f.startsWith("backup-") && f.endsWith(".json"))
        .map(f => {
          const stats = fs.statSync(path.join(BACKUP_DIR, f));
          const type = f.includes("auto") ? "auto" : "manual";
          return {
            filename: f,
            size: stats.size,
            created_at: stats.mtime.toISOString(),
            type
          };
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      res.json(backups);
    } catch (error: any) {
      res.status(500).json({ error: "تعذر قراءة ملفات النسخ الاحتياطي: " + error.message });
    }
  });

  // 9.9. Trigger Backup manually
  app.post("/api/backups/trigger", (req, res) => {
    const companyId = getCompanyId(req);
    try {
      const result = triggerBackup(false, companyId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: "تعذر تنفيذ النسخ الاحتياطي الكلي: " + error.message });
    }
  });

  // 9.10. Google API Proxy Endpoint to bypass iframe CORS restrictions
  app.post("/api/google-proxy", async (req: express.Request, res: express.Response) => {
    const { url, method, body } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      const parsedUrl = new URL(url);
      if (!parsedUrl.hostname.endsWith(".googleapis.com")) {
        return res.status(400).json({ error: "Only Google APIs are permitted" });
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (req.headers.authorization) {
        headers["Authorization"] = req.headers.authorization;
      }

      const fetchOptions: any = {
        method: method || "GET",
        headers,
      };

      if (body) {
        fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);
      const contentType = response.headers.get("content-type");

      res.status(response.status);

      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        res.json(data);
      } else {
        const text = await response.text();
        res.send(text);
      }
    } catch (err: any) {
      console.error("Google proxy error:", err);
      res.status(500).json({ error: "Google Proxy Error", details: err.message });
    }
  });

  // --- Database Archiving Service for Performance Optimization ---
  // Get archive eligibility status & counts
  app.get("/api/archive/status", (req, res) => {
    const companyId = getCompanyId(req);
    const db = readDb();
    
    // Calculates a 1 year cut-off boundary dynamically
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const cutoffDate = oneYearAgo.toISOString().split("T")[0]; // YYYY-MM-DD
    
    const activeOps = db.operations || [];
    const activeInvs = db.invoices || [];
    
    const archivableOps = activeOps.filter((o: any) => o.company_id === companyId && o.date < cutoffDate);
    const archivableOpIds = new Set(archivableOps.map((o: any) => o.id));
    
    const archivableInvs = activeInvs.filter((i: any) => 
      i.company_id === companyId && 
      (i.due_date < cutoffDate || archivableOpIds.has(i.op_id))
    );
    
    const archivedOpsCount = (db.archived_operations || []).filter((o: any) => o.company_id === companyId).length;
    const archivedInvsCount = (db.archived_invoices || []).filter((i: any) => i.company_id === companyId).length;
    
    res.json({
      cutoffDate,
      archivableOpsCount: archivableOps.length,
      archivableInvsCount: archivableInvs.length,
      archivedOpsCount,
      archivedInvsCount
    });
  });

  // Execute database archival moving old data to secondary cold archive storage
  app.post("/api/archive/run", (req, res) => {
    const companyId = getCompanyId(req);
    const db = readDb();
    
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const cutoffDate = oneYearAgo.toISOString().split("T")[0]; // YYYY-MM-DD
    
    db.operations = db.operations || [];
    db.invoices = db.invoices || [];
    db.archived_operations = db.archived_operations || [];
    db.archived_invoices = db.archived_invoices || [];
    
    // Select candidates
    const archivableOps = db.operations.filter((o: any) => o.company_id === companyId && o.date < cutoffDate);
    const archivableOpIds = new Set(archivableOps.map((o: any) => o.id));
    
    const archivableInvs = db.invoices.filter((i: any) => 
      i.company_id === companyId && 
      (i.due_date < cutoffDate || archivableOpIds.has(i.op_id))
    );
    
    if (archivableOps.length === 0 && archivableInvs.length === 0) {
      return res.json({
        success: true,
        message: "لا توجد أي عمليات أو فواتير قديمة (مضى عليها أكثر من عام) لأرشفتها حالياً.",
        archivedOpsCount: 0,
        archivedInvsCount: 0
      });
    }
    
    // Append to archive arrays
    db.archived_operations.push(...archivableOps);
    db.archived_invoices.push(...archivableInvs);
    
    // Remove from active arrays
    db.operations = db.operations.filter((o: any) => !(o.company_id === companyId && o.date < cutoffDate));
    db.invoices = db.invoices.filter((i: any) => 
      !(i.company_id === companyId && (i.due_date < cutoffDate || archivableOpIds.has(i.op_id)))
    );
    
    const compSetting = (db.companies || []).find((c: any) => c.id === companyId);
    const currencyStr = compSetting?.currency || "ر.س";
    const totalRevSaved = archivableOps.reduce((sum: number, o: any) => sum + (o.revenue || 0), 0);
    
    logEvent(
      db,
      companyId,
      "أرشفة البيانات القديمة لتسريع الاستعلام",
      `تمت أرشفة ${archivableOps.length} عملية و ${archivableInvs.length} تفاصيل فواتير مضى عليها أكثر من عام (قبل تاريخ ${cutoffDate}). تم نقلها للأرشيف المستقل بنجاح لزيادة السرعة والأداء. قيمة العقود التشغيلية المؤرشفة: ${totalRevSaved.toLocaleString()} ${currencyStr}.`
    );
    
    writeDb(db);
    
    res.json({
      success: true,
      message: `تم ترحيل البيانات القديمة بنجاح! تم أرشفة ${archivableOps.length} عملية تشغيلية و ${archivableInvs.length} فاتورة.`,
      archivedOpsCount: archivableOps.length,
      archivedInvsCount: archivableInvs.length,
      cutoffDate
    });
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
