import { pgTable, text, timestamp, doublePrecision, integer } from "drizzle-orm/pg-core";

// Users table for Firebase Authenticated users mapping
export const users = pgTable("users", {
  uid: text("uid").primaryKey(), // Firebase Auth UID
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Companies
export const companies = pgTable("companies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color"),
  currency: text("currency").default("ر.س"),
  widgetOrder: text("widget_order"),
  subscriptionPlan: text("subscription_plan"), // "Trial" | "Starter" | "Business" | "Enterprise"
  subscriptionStatus: text("subscription_status"), // "Active" | "Expired" | "Pending" | "Suspended"
  subscriptionExpiry: text("subscription_expiry"),
  subscriptionPricePaid: doublePrecision("subscription_price_paid"),
  subscriptionBillingCycle: text("subscription_billing_cycle"), // "monthly" | "yearly"
});

// Clients
export const clients = pgTable("clients", {
  id: text("id").primaryKey(),
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  company: text("company"),
  phone: text("phone"),
});

// Operations
export const operations = pgTable("operations", {
  id: text("id").primaryKey(),
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  clientId: text("client_id")
    .references(() => clients.id, { onDelete: "cascade" })
    .notNull(),
  service: text("service").notNull(),
  cost: doublePrecision("cost").notNull(),
  revenue: doublePrecision("revenue").notNull(),
  profit: doublePrecision("profit").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  status: text("status").default("Pending"), // "Pending" | "In Progress" | "Completed"
});

// Invoices
export const invoices = pgTable("invoices", {
  id: text("id").primaryKey(),
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  opId: text("op_id")
    .references(() => operations.id, { onDelete: "cascade" })
    .notNull(),
  clientId: text("client_id")
    .references(() => clients.id, { onDelete: "cascade" })
    .notNull(),
  amount: doublePrecision("amount").notNull(),
  status: text("status").notNull(), // "Paid" | "Unpaid"
  dueDate: text("due_date").notNull(), // YYYY-MM-DD
  paymentDate: text("payment_date"), // YYYY-MM-DD
});

// Expenses
export const expenses = pgTable("expenses", {
  id: text("id").primaryKey(),
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  category: text("category").notNull(),
  amount: doublePrecision("amount").notNull(),
  frequency: text("frequency").notNull(), // "weekly" | "monthly" | "yearly" | "once"
  date: text("date").notNull(), // YYYY-MM-DD
  description: text("description"),
});

// Audit Logs
export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  companyId: text("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  timestamp: text("timestamp").notNull(), // ISO String
  action: text("action").notNull(),
  details: text("details").notNull(),
  user: text("user").notNull(),
});
