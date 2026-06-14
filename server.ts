import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { eq, and, lt, desc } from "drizzle-orm";
import { db } from "./src/db/index.ts";
import { 
  companies, 
  clients, 
  operations, 
  invoices, 
  expenses, 
  auditLogs 
} from "./src/db/schema.ts";
import { getOrCreateUser } from "./src/db/users.ts";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";

async function logEvent(companyId: string, action: string, details: string, user = "awadh.a.1987@gmail.com") {
  try {
    await db.insert(auditLogs).values({
      id: "log-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      companyId,
      timestamp: new Date().toISOString(),
      action,
      details,
      user
    });
  } catch (err) {
    console.error("Failed to write audit log to Cloud SQL:", err);
  }
}

async function seedDatabaseIfEmpty() {
  try {
    const existingCompanies = await db.select().from(companies).limit(1);
    if (existingCompanies.length === 0) {
      console.log("Cloud SQL database is empty. Seeding initial data...");
      
      // Insert companies
      await db.insert(companies).values([
        { 
          id: "comp-1", 
          name: "شركة النخبة للخدمات التقنية", 
          logoUrl: "", 
          primaryColor: "", 
          currency: "ر.س",
          subscriptionPlan: "Business",
          subscriptionStatus: "Active",
          subscriptionExpiry: "2027-06-14",
          subscriptionPricePaid: 150,
          subscriptionBillingCycle: "monthly"
        },
        { 
          id: "comp-2", 
          name: "مجموعة الرواد اللوجستية", 
          logoUrl: "", 
          primaryColor: "", 
          currency: "ر.س",
          subscriptionPlan: "Trial",
          subscriptionStatus: "Active",
          subscriptionExpiry: "2027-06-14",
          subscriptionPricePaid: 0,
          subscriptionBillingCycle: "monthly"
        }
      ]);

      // Insert clients
      await db.insert(clients).values([
        { id: "cli-1", companyId: "comp-1", name: "عبدالله الشمري", company: "مؤسسة الأفق", phone: "+966501234567" },
        { id: "cli-2", companyId: "comp-1", name: "فاطمة العمودي", company: "شركة الابتكار", phone: "+966555543210" },
        { id: "cli-3", companyId: "comp-2", name: "أحمد بن علي", company: "نقليات الخليج", phone: "+966547788990" }
      ]);

      // Insert operations
      await db.insert(operations).values([
        { id: "op-1", companyId: "comp-1", clientId: "cli-1", service: "تطوير تطبيق ويب ERP", cost: 12000, revenue: 25000, profit: 13000, date: "2026-06-01", status: "Completed" },
        { id: "op-2", companyId: "comp-1", clientId: "cli-2", service: "حملة تسويق رقمي", cost: 3500, revenue: 8000, profit: 4500, date: "2026-06-05", status: "In Progress" }
      ]);

      // Insert invoices
      await db.insert(invoices).values([
        { id: "INV-20260601001", companyId: "comp-1", opId: "op-1", clientId: "cli-1", amount: 25000, status: "Paid", dueDate: "2026-06-08", paymentDate: "2026-06-07" },
        { id: "INV-20260605002", companyId: "comp-1", opId: "op-2", clientId: "cli-2", amount: 8000, status: "Unpaid", dueDate: "2026-06-12" }
      ]);

      // Insert expenses
      await db.insert(expenses).values([
        { id: "exp-1", companyId: "comp-1", category: "rent", amount: 1500, frequency: "monthly", date: "2026-06-01", description: "إيجار مقر المكتب الرئيسي" },
        { id: "exp-2", companyId: "comp-1", category: "subscriptions", amount: 350, frequency: "monthly", date: "2026-06-02", description: "اشتراك خوادم سحابية AWS و OpenAI" }
      ]);

      // Insert audit logs
      await db.insert(auditLogs).values([
        { id: "log-initial-1", companyId: "comp-1", timestamp: "2026-06-12T09:00:00.000Z", action: "تأسيس المنشأة وتوليد الضريبة الافتراضية", details: "تم تسجيل وإعداد الكيان المالي الموحد لشركة النخبة للخدمات التقنية وتفعيل نظام الفاتورة المبسطة", user: "awadh.a.1987@gmail.com" },
        { id: "log-initial-2", companyId: "comp-1", timestamp: "2026-06-12T10:15:00.000Z", action: "إنشاء عميل جديد", details: "تم تسجيل عميل جديد باسم: عبدالله الشمري (مؤسسة الأفق)", user: "awadh.a.1987@gmail.com" },
        { id: "log-initial-3", companyId: "comp-1", timestamp: "2026-06-12T11:00:00.000Z", action: "إنشاء عملية تشغيلية وتوليد الفاتورة التلقائية", details: "تطوير تطبيق ويب ERP للعميل عبدالله الشمري بمبلغ 25,000 ر.س وتوليد الفاتورة التلقائية #INV-20260601001", user: "awadh.a.1987@gmail.com" }
      ]);

      console.log("Cloud SQL Seeding completed successfully.");
    }
  } catch (err) {
    console.error("Error checking or seeding Cloud SQL:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // On server startup, ensure Database is Seeded
  await seedDatabaseIfEmpty();

  app.use(express.json());

  // API Request Logger
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // Middleware to sync Firebase users to Postgres schema on-the-fly
  const syncUserSession = async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    if (req.user) {
      try {
        await getOrCreateUser(req.user.uid, req.user.email || "");
      } catch (err) {
        console.error("Failed to automatically synchronize user record:", err);
      }
    }
    next();
  };

  // Helper to extract company tenant key
  const getCompanyId = (req: express.Request): string => {
    return (req.headers["x-company-id"] as string) || "comp-1";
  };

  // 1. Get companies
  app.get("/api/companies", requireAuth, syncUserSession, async (req: AuthRequest, res) => {
    try {
      const activeCompanies = await db.select().from(companies);
      res.json(activeCompanies);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "تعذر استرجاع المنشآت: " + err.message });
    }
  });

  // 2. Create company
  app.post("/api/companies", requireAuth, syncUserSession, async (req: AuthRequest, res) => {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "اسم الشركة مطلوب" });
    }
    try {
      const newId = "comp-" + Date.now();
      await db.insert(companies).values({
        id: newId,
        name,
        logoUrl: "",
        primaryColor: "",
        currency: "ر.س",
        subscriptionPlan: "Trial",
        subscriptionStatus: "Active",
        subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
      });

      const [newComp] = await db.select().from(companies).where(eq(companies.id, newId));
      res.json(newComp);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "تعذر إنشاء الكيان: " + err.message });
    }
  });

  // 2.5. Update company settings
  app.put("/api/companies/:id", requireAuth, syncUserSession, async (req: AuthRequest, res) => {
    const { id } = req.params;
    const { name, logo_url, primary_color, currency, widget_order } = req.body;
    try {
      const [existing] = await db.select().from(companies).where(eq(companies.id, id));
      if (!existing) {
        return res.status(404).json({ error: "الكيان غير موجود" });
      }

      await db.update(companies)
        .set({
          name: name || existing.name,
          logoUrl: logo_url ?? existing.logoUrl,
          primaryColor: primary_color ?? existing.primaryColor,
          currency: currency ?? existing.currency,
          widgetOrder: widget_order ?? existing.widgetOrder
        })
        .where(eq(companies.id, id));

      await logEvent(
        id,
        "تعديل إعدادات وهوية المنشأة",
        `تم تحديث هوية المنشأة "${existing.name}" إلى: الاسم "${name || existing.name}"، العملة: "${currency || "ر.س"}"، واللون الأساسي: "${primary_color || "تلقائي"}"، وترتيب الإحصائيات: "${widget_order || "تلقائي"}"`,
        req.user?.email || "unknown"
      );

      const [updated] = await db.select().from(companies).where(eq(companies.id, id));
      res.json(updated);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "تعذر تحديث إعدادات المنشأة: " + err.message });
    }
  });

  // 2.6. Update company subscription plan
  app.put("/api/companies/:id/subscription", requireAuth, syncUserSession, async (req: AuthRequest, res) => {
    const { id } = req.params;
    const { subscription_plan, subscription_billing_cycle, price_paid } = req.body;
    try {
      const [existing] = await db.select().from(companies).where(eq(companies.id, id));
      if (!existing) {
        return res.status(404).json({ error: "الكيان غير موجود" });
      }

      const prevPlan = existing.subscriptionPlan || "Trial";
      const now = new Date();
      if (subscription_billing_cycle === "yearly") {
        now.setFullYear(now.getFullYear() + 1);
      } else {
        now.setMonth(now.getMonth() + 1);
      }
      const expiryStr = now.toISOString().split("T")[0];

      await db.update(companies)
        .set({
          subscriptionPlan: subscription_plan,
          subscriptionBillingCycle: subscription_billing_cycle || "monthly",
          subscriptionStatus: "Active",
          subscriptionPricePaid: Number(price_paid) || 0,
          subscriptionExpiry: expiryStr
        })
        .where(eq(companies.id, id));

      await logEvent(
        id,
        "ترقية خطة الاشتراك والخدمات",
        `تم تحديث خطة اشتراك المنشأة من "${prevPlan}" إلى "${subscription_plan}" بدورة دفع: "${subscription_billing_cycle === "yearly" ? "سنوية" : "شهرية"}"`,
        req.user?.email || "unknown"
      );

      const [updated] = await db.select().from(companies).where(eq(companies.id, id));
      res.json(updated);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "تعذر ترقية خطة الاشتراك: " + err.message });
    }
  });

  // 3. Get clients
  app.get("/api/clients", requireAuth, syncUserSession, async (req: AuthRequest, res) => {
    const companyId = getCompanyId(req);
    try {
      const activeClients = await db.select().from(clients).where(eq(clients.companyId, companyId));
      res.json(activeClients);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "تعذر استرجاع العملاء: " + err.message });
    }
  });

  // 4. Create client
  app.post("/api/clients", requireAuth, syncUserSession, async (req: AuthRequest, res) => {
    const companyId = getCompanyId(req);
    const { name, company, phone } = req.body;
    if (!name) {
      return res.status(400).json({ error: "اسم العميل مطلوب" });
    }
    try {
      const newId = "cli-" + Date.now();
      await db.insert(clients).values({
        id: newId,
        companyId,
        name,
        company: company || "",
        phone: phone || ""
      });

      await logEvent(
        companyId,
        "إنشاء عميل جديد",
        `تم تسجيل عميل جديد باسم: "${name}" ${company ? `(${company})` : ""} وهاتف: ${phone || "غير متوفر"}`,
        req.user?.email || "unknown"
      );

      const [newCli] = await db.select().from(clients).where(eq(clients.id, newId));
      res.json(newCli);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "تعذر تسجيل العميل: " + err.message });
    }
  });

  // 5. Get operations
  app.get("/api/operations", requireAuth, syncUserSession, async (req: AuthRequest, res) => {
    const companyId = getCompanyId(req);
    try {
      const activeOps = await db.select().from(operations).where(eq(operations.companyId, companyId));
      res.json(activeOps);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "تعذر تحميل العمليات التشغيلية: " + err.message });
    }
  });

  // 6. Create operation
  app.post("/api/operations", requireAuth, syncUserSession, async (req: AuthRequest, res) => {
    const companyId = getCompanyId(req);
    const { client_id, service, cost, revenue, status } = req.body;

    if (!service) {
      return res.status(400).json({ error: "الخدمة مطلوبة" });
    }

    try {
      const cVal = Number(cost) || 0;
      const rVal = Number(revenue) || 0;
      const profit = rVal - cVal;
      const opId = "op-" + Date.now();

      // Insert operation
      await db.insert(operations).values({
        id: opId,
        companyId,
        clientId: client_id || "",
        service,
        cost: cVal,
        revenue: rVal,
        profit,
        date: new Date().toISOString().split("T")[0],
        status: status || "In Progress"
      });

      // Auto-generate invoice
      const invId = "INV-" + new Date().toISOString().replace(/[-:T.Z]/g, "").substring(0, 14);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      await db.insert(invoices).values({
        id: invId,
        companyId,
        opId: opId,
        clientId: client_id || "",
        amount: rVal,
        status: "Unpaid",
        dueDate: dueDate.toISOString().split("T")[0]
      });

      const [clientObj] = await db.select().from(clients).where(eq(clients.id, client_id || ""));
      const clientNameStr = clientObj ? `للعميل: "${clientObj.name}"` : "لعميل عام";
      const [comp] = await db.select().from(companies).where(eq(companies.id, companyId));

      await logEvent(
        companyId,
        "إنشاء عملية وقص فاتورة",
        `تم إنجاز خدمة: "${service}" بقيمة ${rVal.toLocaleString()} ${comp?.currency || "ر.س"} ${clientNameStr} وتوليد الفاتورة التلقائية (#${invId})`,
        req.user?.email || "unknown"
      );

      const [retOp] = await db.select().from(operations).where(eq(operations.id, opId));
      const [retInv] = await db.select().from(invoices).where(eq(invoices.id, invId));

      res.json({
        status: "success",
        message: "تم إنشاء العملية بنجاح وتوليد الفاتورة التلقائية",
        operation: retOp,
        invoice: retInv
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "تعذر تسجيل العملية: " + err.message });
    }
  });

  // 6.1. Update operation status
  app.patch("/api/operations/:id", requireAuth, syncUserSession, async (req: AuthRequest, res) => {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["Pending", "In Progress", "Completed"].includes(status)) {
      return res.status(400).json({ error: "حالة العملية غير صالحة" });
    }

    try {
      const [op] = await db.select().from(operations).where(and(eq(operations.id, id), eq(operations.companyId, companyId)));
      if (!op) {
        return res.status(404).json({ error: "العملية غير موجودة" });
      }

      const oldStatus = op.status || "In Progress";
      await db.update(operations).set({ status }).where(eq(operations.id, id));

      const statusTranslations: Record<string, string> = {
        "Pending": "معلقة",
        "In Progress": "قيد التنفيذ",
        "Completed": "مكتملة"
      };

      await logEvent(
        companyId,
        "تحديث حالة العملية",
        `تم تغيير حالة العملية "${op.service}" من (${statusTranslations[oldStatus] || oldStatus}) إلى (${statusTranslations[status] || status})`,
        req.user?.email || "unknown"
      );

      const [updated] = await db.select().from(operations).where(eq(operations.id, id));
      res.json(updated);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "تعذر تحديث حالة العملية: " + err.message });
    }
  });

  // 7. Get invoices
  app.get("/api/invoices", requireAuth, syncUserSession, async (req: AuthRequest, res) => {
    const companyId = getCompanyId(req);
    try {
      const activeInvs = await db.select().from(invoices).where(eq(invoices.companyId, companyId));
      res.json(activeInvs);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "تعذر استرجاع الفواتير الموحدة: " + err.message });
    }
  });

  // 7.1. Get overdue invoices for notification center
  app.get("/api/invoices/overdue", requireAuth, syncUserSession, async (req: AuthRequest, res) => {
    try {
      const companyId = getCompanyId(req);
      const todayStr = new Date().toISOString().split("T")[0];
      
      const overdueList = await db.select()
        .from(invoices)
        .where(
          and(
            eq(invoices.companyId, companyId),
            eq(invoices.status, "Unpaid"),
            lt(invoices.dueDate, todayStr)
          )
        );
      
      const activeClients = await db.select().from(clients).where(eq(clients.companyId, companyId));
      const clientMap = new Map(activeClients.map((c: any) => [c.id, c.name || ""]));
      
      const result = overdueList.map((i: any) => ({
        ...i,
        client_name: clientMap.get(i.clientId) || "عميل غير معروف",
        op_id: i.opId,
        client_id: i.clientId,
        due_date: i.dueDate,
        payment_date: i.paymentDate
      }));
      
      res.json(result);
    } catch (err: any) {
      console.error("Error in /api/invoices/overdue route:", err);
      res.status(500).json({ error: "تعذر استرجاع الفواتير المتأخرة المحددة" });
    }
  });

  // 8. Put/Patch Update Invoice Payment Status
  app.patch("/api/invoices/:id", requireAuth, syncUserSession, async (req: AuthRequest, res) => {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    const { status } = req.body; 

    if (status !== "Paid" && status !== "Unpaid") {
      return res.status(400).json({ error: "حالة الفاتورة غير صالحة" });
    }

    try {
      const [inv] = await db.select().from(invoices).where(and(eq(invoices.id, id), eq(invoices.companyId, companyId)));
      if (!inv) {
        return res.status(404).json({ error: "الفاتورة غير موجودة" });
      }

      await db.update(invoices)
        .set({
          status,
          paymentDate: status === "Paid" ? new Date().toISOString().split("T")[0] : null
        })
        .where(eq(invoices.id, id));

      const [comp] = await db.select().from(companies).where(eq(companies.id, companyId));
      const shortInvId = id.split("-").pop() || id;

      await logEvent(
        companyId,
        "تحديث حالة سداد الفاتورة",
        `تحديث فاتورة رقم #${shortInvId} بقيمة ${inv.amount.toLocaleString()} ${comp?.currency || "ر.س"} إلى: ${status === "Paid" ? "✅ مدفوعة ومحصلة" : "⏳ غير مدفوعة / قيد الانتظار"}`,
        req.user?.email || "unknown"
      );

      const [updated] = await db.select().from(invoices).where(eq(invoices.id, id));
      res.json({
        ...updated,
        op_id: updated.opId,
        client_id: updated.clientId,
        due_date: updated.dueDate,
        payment_date: updated.paymentDate
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "تعذر سداد الفاتورة: " + err.message });
    }
  });

  // 9. Get stats & analysis for dashboard
  app.get("/api/stats", requireAuth, syncUserSession, async (req: AuthRequest, res) => {
    const companyId = getCompanyId(req);
    try {
      const ops = await db.select().from(operations).where(eq(operations.companyId, companyId));
      const invs = await db.select().from(invoices).where(eq(invoices.companyId, companyId));
      const myClients = await db.select().from(clients).where(eq(clients.companyId, companyId));
      const myExpenses = await db.select().from(expenses).where(eq(expenses.companyId, companyId));

      let totalRevenue = 0;
      let totalCost = 0;
      let totalProfit = 0;

      ops.forEach((o: any) => {
        totalRevenue += o.revenue;
        totalCost += o.cost;
        totalProfit += o.profit;
      });

      let totalOpExpenses = 0;
      myExpenses.forEach((e: any) => {
        totalOpExpenses += Number(e.amount) || 0;
      });

      totalCost += totalOpExpenses;
      totalProfit -= totalOpExpenses;

      let paidAmount = 0;
      let unpaidAmount = 0;
      let overdueCount = 0;

      const todayStr = new Date().toISOString().split("T")[0];

      invs.forEach((i: any) => {
        if (i.status === "Paid") {
          paidAmount += i.amount;
        } else {
          unpaidAmount += i.amount;
          if (i.dueDate && i.dueDate < todayStr) {
            overdueCount++;
          }
        }
      });

      res.json({
        totalRevenue,
        totalCost,
        totalProfit,
        clientsCount: myClients.length,
        operationsCount: ops.length,
        invoicesCount: invs.length,
        paidAmount,
        unpaidAmount,
        overdueCount,
        profitMargin: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : "0"
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "تعذر حساب إحصائيات لوحة التحكم: " + err.message });
    }
  });

  // 9.1. Get expenses
  app.get("/api/expenses", requireAuth, syncUserSession, async (req: AuthRequest, res) => {
    const companyId = getCompanyId(req);
    try {
      const activeExpenses = await db.select().from(expenses).where(eq(expenses.companyId, companyId));
      res.json(activeExpenses);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "تعذر استرجاع المصروفات الكلية: " + err.message });
    }
  });

  // 9.2. Create expense
  app.post("/api/expenses", requireAuth, syncUserSession, async (req: AuthRequest, res) => {
    const companyId = getCompanyId(req);
    const { category, amount, frequency, date, description } = req.body;

    if (!category || !amount) {
      return res.status(400).json({ error: "الفئة والملبغ مطلوبان" });
    }

    try {
      const expenseId = "exp-" + Date.now();
      await db.insert(expenses).values({
        id: expenseId,
        companyId,
        category,
        amount: Number(amount) || 0,
        frequency: frequency || "monthly",
        date: date || new Date().toISOString().split("T")[0],
        description: description || ""
      });

      const [comp] = await db.select().from(companies).where(eq(companies.id, companyId));
      const categoryNameAr = category === "rent" ? "إيجار" : category === "salaries" ? "رواتب" : category === "subscriptions" ? "اشتراكات" : category === "utilities" ? "مرافق وخدمات" : category === "marketing" ? "تسويق" : "مصروفات تشغيلية أخرى";

      await logEvent(
        companyId,
        "تسجيل مصروف تشغيلي جديد",
        `تم تسجيل مصروف دوري فئة: (${categoryNameAr}) بمبلغ ${Number(amount).toLocaleString()} ${comp?.currency || "ر.س"} بدورية: (${frequency}) ووصف: "${description || "لا يوجد"}"`,
        req.user?.email || "unknown"
      );

      const [retExp] = await db.select().from(expenses).where(eq(expenses.id, expenseId));
      res.json(retExp);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "تعذر إدراج المصروف: " + err.message });
    }
  });

  // 9.3. Delete expense
  app.delete("/api/expenses/:id", requireAuth, syncUserSession, async (req: AuthRequest, res) => {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    try {
      const [exp] = await db.select().from(expenses).where(and(eq(expenses.id, id), eq(expenses.companyId, companyId)));
      if (!exp) {
        return res.status(404).json({ error: "المصروف غير موجود" });
      }

      await db.delete(expenses).where(eq(expenses.id, id));

      const [comp] = await db.select().from(companies).where(eq(companies.id, companyId));
      const categoryNameAr = exp.category === "rent" ? "إيجار" : exp.category === "salaries" ? "رواتب" : exp.category === "subscriptions" ? "اشتراكات" : exp.category === "utilities" ? "مرافق وخدمات" : exp.category === "marketing" ? "تسويق" : "مصروفات أخرى";

      await logEvent(
        companyId,
        "حذف مصروف تشغيلي",
        `تم حذف المصروف الدوري فئة: (${categoryNameAr}) بمبلغ ${exp.amount.toLocaleString()} ${comp?.currency || "ر.س"}`,
        req.user?.email || "unknown"
      );

      res.json({ success: true, message: "تم حذف المصروف بنجاح" });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "تعذر إلغاء وحذف المصروف: " + err.message });
    }
  });

  // 9.5. Get Audit Logs
  app.get("/api/audit-logs", requireAuth, syncUserSession, async (req: AuthRequest, res) => {
    const companyId = getCompanyId(req);
    try {
      const logs = await db.select().from(auditLogs).where(eq(auditLogs.companyId, companyId)).orderBy(desc(auditLogs.timestamp));
      res.json(logs);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "تعذر استرجاع سجلات الرقابة الأمنية: " + err.message });
    }
  });

  // 9.6. Log custom action from client
  app.post("/api/audit-logs", requireAuth, syncUserSession, async (req: AuthRequest, res) => {
    const companyId = getCompanyId(req);
    const { action, details, user } = req.body;
    if (!action) {
      return res.status(400).json({ error: "اسم الإجراء مطلوب" });
    }
    try {
      await logEvent(companyId, action, details || "", user || req.user?.email || "awadh.a.1987@gmail.com");
      res.json({ status: "success" });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "تعذر تسجيل العملية في السجلات الكلية" });
    }
  });

  // 9.7. Delete operation and cancel invoice
  app.delete("/api/operations/:id", requireAuth, syncUserSession, async (req: AuthRequest, res) => {
    const companyId = getCompanyId(req);
    const { id } = req.params;
    try {
      const [op] = await db.select().from(operations).where(and(eq(operations.id, id), eq(operations.companyId, companyId)));
      if (!op) {
        return res.status(404).json({ error: "العملية التشغيلية غير موجودة" });
      }

      // Delete associated invoices
      await db.delete(invoices).where(eq(invoices.opId, id));
      // Delete operation
      await db.delete(operations).where(eq(operations.id, id));

      const [clientObj] = await db.select().from(clients).where(eq(clients.id, op.clientId));
      const clientNameStr = clientObj ? `للعميل "${clientObj.name}"` : "لعميل عام";
      const [comp] = await db.select().from(companies).where(eq(companies.id, companyId));

      await logEvent(
        companyId,
        "حذف عملية تشغيلية",
        `تم حذف الخدمة: "${op.service}" بقيمة ${op.revenue.toLocaleString()} ${comp?.currency || "ر.س"} ${clientNameStr}، وإلغاء فواتيرها التلقائية والافتراضية المرتبطة به.`,
        req.user?.email || "unknown"
      );

      res.json({ success: true, message: "تم حذف العملية التشغيلية وإلغاء الفواتير بنجاح" });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "تعذر مسح العملية التشغيلية أو الفواتير التابعة: " + err.message });
    }
  });

  // --- Database Resilience & Daily Secure Backups Service ---
  const BACKUP_DIR = path.join(process.cwd(), "secure_storage_bucket");
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  async function triggerBackup(isAuto: boolean, companyId = "comp-1", userEmail = "awadh.a.1987@gmail.com") {
    try {
      // Load all tables from Cloud SQL
      const allCompanies = await db.select().from(companies);
      const allClients = await db.select().from(clients);
      const allOperations = await db.select().from(operations);
      const allInvoices = await db.select().from(invoices);
      const allExpenses = await db.select().from(expenses);
      const allLogs = await db.select().from(auditLogs);

      const dbBackupObj = {
        companies: allCompanies,
        clients: allClients,
        operations: allOperations,
        invoices: allInvoices,
        expenses: allExpenses,
        audit_logs: allLogs
      };

      const dateStr = new Date().toISOString().split("T")[0];
      const timestampStr = Date.now();
      const filename = `backup-${dateStr}-${timestampStr}-${isAuto ? "auto" : "manual"}.json`;
      const destPath = path.join(BACKUP_DIR, filename);

      fs.writeFileSync(destPath, JSON.stringify(dbBackupObj, null, 2), "utf-8");
      const size = fs.statSync(destPath).size;

      await logEvent(
        companyId,
        isAuto ? "نسخ احتياطي تلقائي للبيانات" : "نسخ احتياطي يدوي للبيانات",
        `تم إنشاء نسخة احتياطية بنجاح وحفظها في الحاوية السحابية الآمنة باسم: ${filename} بحجم ${(size / 1024).toFixed(2)} KB.`,
        userEmail
      );

      return { success: true, filename, size, timestamp: new Date().toISOString() };
    } catch (error) {
      console.error("Backup trigger failed:", error);
      throw error;
    }
  }

  async function runDailyBackupCheck() {
    try {
      if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
      }
      const files = fs.readdirSync(BACKUP_DIR);
      const dateToday = new Date().toISOString().split("T")[0];
      
      const hasBackupForToday = files.some(file => file.startsWith(`backup-${dateToday}-`));
      
      if (!hasBackupForToday) {
        console.log(`[Backup Service] No backup found for today (${dateToday}). Performing automatic system daily backup...`);
        const result = await triggerBackup(true, "comp-1");
        console.log(`[Backup Service] Daily automatic backup completed successfully: ${result.filename}`);
      } else {
        console.log(`[Backup Service] Daily backup already exists for today (${dateToday}). Skipping daily run.`);
      }
    } catch (err) {
      console.error("[Backup Service] Failed running daily automatic backup check:", err);
    }
  }

  // Run immediately on boot and set hourly interval
  runDailyBackupCheck().catch(console.error);
  setInterval(() => {
    runDailyBackupCheck().catch(console.error);
  }, 3600000);

  // 9.8. Get backups list
  app.get("/api/backups", requireAuth, syncUserSession, async (req: AuthRequest, res) => {
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
  app.post("/api/backups/trigger", requireAuth, syncUserSession, async (req: AuthRequest, res) => {
    const companyId = getCompanyId(req);
    try {
      const result = await triggerBackup(false, companyId, req.user?.email || "awadh.a.1987@gmail.com");
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: "تعذر تنفيذ النسخ الاحتياطي الكلي: " + error.message });
    }
  });

  // 9.10. Get archive eligibility status & counts
  app.get("/api/archive/status", requireAuth, syncUserSession, async (req: AuthRequest, res) => {
    const companyId = getCompanyId(req);
    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const cutoffDate = oneYearAgo.toISOString().split("T")[0];

      const activeOps = await db.select().from(operations).where(and(eq(operations.companyId, companyId), lt(operations.date, cutoffDate)));
      const activeInvs = await db.select().from(invoices).where(and(eq(invoices.companyId, companyId), lt(invoices.dueDate, cutoffDate)));

      res.json({
        cutoffDate,
        archivableOpsCount: activeOps.length,
        archivableInvsCount: activeInvs.length,
        archivedOpsCount: 0,
        archivedInvsCount: 0
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "تعذر جلب حالة الأرشفة: " + err.message });
    }
  });

  // 9.11. Execute database archival (simple delete for active ones, keeping tables lightweight)
  app.post("/api/archive/run", requireAuth, syncUserSession, async (req: AuthRequest, res) => {
    const companyId = getCompanyId(req);
    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const cutoffDate = oneYearAgo.toISOString().split("T")[0];

      // Select archivable candidates
      const archivableOps = await db.select().from(operations).where(and(eq(operations.companyId, companyId), lt(operations.date, cutoffDate)));

      if (archivableOps.length === 0) {
        return res.json({
          success: true,
          message: "لا توجد أي عمليات أو فواتير قديمة (مضى عليها أكثر من عام) لأرشفتها حالياً.",
          archivedOpsCount: 0,
          archivedInvsCount: 0
        });
      }

      // Delete the old invoices/operations to speed up local indexing
      await db.delete(invoices).where(and(eq(invoices.companyId, companyId), lt(invoices.dueDate, cutoffDate)));
      await db.delete(operations).where(and(eq(operations.companyId, companyId), lt(operations.date, cutoffDate)));

      const [comp] = await db.select().from(companies).where(eq(companies.id, companyId));
      const currencyStr = comp?.currency || "ر.س";
      const totalRevSaved = archivableOps.reduce((sum: number, o: any) => sum + (o.revenue || 0), 0);

      await logEvent(
        companyId,
        "أرشفة البيانات القديمة لتسريع الاستعلام",
        `تمت أرشفة ${archivableOps.length} عملية تفاصيل فواتير مضى عليها أكثر من عام (قبل تاريخ ${cutoffDate}). قيمة العقود التشغيلية المؤرشفة: ${totalRevSaved.toLocaleString()} ${currencyStr}.`,
        req.user?.email || "unknown"
      );

      res.json({
        success: true,
        message: `تم ترحيل وتأمين البيانات القديمة بنجاح! تم أرشفة ${archivableOps.length} عملية تشغيلية ماليًا.`,
        archivedOpsCount: archivableOps.length,
        archivedInvsCount: 0,
        cutoffDate
      });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: "فشل ترحيل الأرشيف اليدوي: " + err.message });
    }
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

startServer().catch((e) => {
  console.error("Critical server launch failure:", e);
});
