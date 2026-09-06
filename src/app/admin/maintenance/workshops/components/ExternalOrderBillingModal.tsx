"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import {
  recordPartSale,
  recordCustomerLaborCharge,
  recordMechanicLaborPayment,
  recordOtherFinancialEntry,
  recordCustomerPayment,
  getWorkOrder,
} from "@/lib/maintenance/api";
import { authFetch } from "@/lib/auth/api";
import { listEmployees } from "@/lib/workforce/api";
import type {
  WorkOrder,
  InventoryItem,
  MaintenanceLocation,
  FinancialEntryResponse,
  CustomerPaymentResponse,
} from "@/lib/maintenance/types";
import { PaymentMethod } from "@/lib/maintenance/types";
import {
  formatCurrency,
  formatDateTime,
  paymentMethodLabels,
  itemTypeLabels,
} from "@/lib/maintenance/constants";
import {
  DollarSign,
  Package,
  Wrench,
  UserCheck,
  CreditCard,
  Plus,
  Receipt,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";

interface ExternalOrderBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrderId: string | null;
  items: InventoryItem[];
  locations: MaintenanceLocation[];
  onUpdated: () => void;
}

type BillingTab = "parts" | "labor" | "mechanic" | "other" | "payment";

export function ExternalOrderBillingModal({
  isOpen,
  onClose,
  workOrderId,
  items,
  locations,
  onUpdated,
}: ExternalOrderBillingModalProps) {
  const { can } = useAuth();
  const canPartSale = can("maintenance.part_sales.manage");
  const canLabor = can("maintenance.customer_labor_charges.manage");
  const canMechanic = can("maintenance.mechanic_labor_payments.manage");

  const [activeTab, setActiveTab] = useState<BillingTab>("parts");
  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Employees for mechanic assignment
  const [employees, setEmployees] = useState<{ id: string; fullNameAr: string }[]>([]);

  // Financial records
  const [financialEntries, setFinancialEntries] = useState<FinancialEntryResponse[]>([]);
  const [payments, setPayments] = useState<CustomerPaymentResponse[]>([]);

  // 1. Part Sale form
  const [partItemId, setPartItemId] = useState("");
  const [partQuantity, setPartQuantity] = useState<number>(1);
  const [partSellingPrice, setPartSellingPrice] = useState<number>(0);
  const [partDiscount, setPartDiscount] = useState<number>(0);
  const [partTax, setPartTax] = useState<number>(0);

  // 2. Customer Labor form
  const [laborAmount, setLaborAmount] = useState<number>(0);
  const [laborTax, setLaborTax] = useState<number>(0);
  const [laborDescription, setLaborDescription] = useState("");

  // 3. Mechanic Payment form
  const [mechanicEmployeeId, setMechanicEmployeeId] = useState("");
  const [externalMechanicName, setExternalMechanicName] = useState("");
  const [mechanicAmount, setMechanicAmount] = useState<number>(0);
  const [mechanicDescription, setMechanicDescription] = useState("");

  // 4. Other Financial Entry form
  const [isOtherIncome, setIsOtherIncome] = useState(true);
  const [otherAmount, setOtherAmount] = useState<number>(0);
  const [otherTax, setOtherTax] = useState<number>(0);
  const [otherDescription, setOtherDescription] = useState("");

  // 5. Customer Payment form
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.Card);
  const [paymentReference, setPaymentReference] = useState("");

  const loadData = async () => {
    if (!workOrderId) return;
    setLoading(true);
    try {
      const ord = await getWorkOrder(workOrderId);
      setOrder(ord);

      // Fetch financial entries and payments for this external order
      const [entries, pymts] = await Promise.all([
        authFetch<FinancialEntryResponse[]>(
          `/api/maintenance-work-orders/${workOrderId}/financial-entries`,
        ).catch(() => []),
        authFetch<CustomerPaymentResponse[]>(
          `/api/maintenance-work-orders/${workOrderId}/customer-payments`,
        ).catch(() => []),
      ]);

      setFinancialEntries(Array.isArray(entries) ? entries : []);
      setPayments(Array.isArray(pymts) ? pymts : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && workOrderId) {
      loadData();
      listEmployees()
        .then((emps: any) => {
          if (Array.isArray(emps)) {
            setEmployees(
              emps.map((e) => ({
                id: e.id || e.employeeId,
                fullNameAr: e.fullNameAr || e.nameAr || "موظف",
              })),
            );
          }
        })
        .catch(() => {});
    }
  }, [isOpen, workOrderId]);

  // Handle Part Sale submit
  const handlePartSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !partItemId) return;

    setActionLoading(true);
    try {
      await recordPartSale(order.id, {
        inventoryItemId: partItemId,
        inventoryLocationId: order.maintenanceLocationId,
        quantity: Number(partQuantity),
        sellingUnitPriceBeforeTax: Number(partSellingPrice),
        discountAmount: Number(partDiscount || 0),
        taxAmount: Number(partTax || 0),
        occurredAtUtc: new Date().toISOString(),
      });
      setPartItemId("");
      setPartQuantity(1);
      setPartSellingPrice(0);
      setPartDiscount(0);
      setPartTax(0);
      await loadData();
      onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Labor Charge submit
  const handleLaborSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    setActionLoading(true);
    try {
      await recordCustomerLaborCharge(order.id, {
        amountBeforeTax: Number(laborAmount),
        taxAmount: Number(laborTax || 0),
        occurredAtUtc: new Date().toISOString(),
        description: laborDescription.trim() || "أجور يد وإصلاح",
      });
      setLaborAmount(0);
      setLaborTax(0);
      setLaborDescription("");
      await loadData();
      onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Mechanic Payment submit
  const handleMechanicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    setActionLoading(true);
    try {
      await recordMechanicLaborPayment(order.id, {
        mechanicEmployeeId: mechanicEmployeeId || null,
        externalMechanicName: externalMechanicName.trim() || null,
        amount: Number(mechanicAmount),
        paidAtUtc: new Date().toISOString(),
        description: mechanicDescription.trim() || "مستحقات فني الصيانة",
      });
      setMechanicEmployeeId("");
      setExternalMechanicName("");
      setMechanicAmount(0);
      setMechanicDescription("");
      await loadData();
      onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Other Financial Entry submit
  const handleOtherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    setActionLoading(true);
    try {
      await recordOtherFinancialEntry(order.id, isOtherIncome, {
        amountBeforeTax: Number(otherAmount),
        taxAmount: Number(otherTax || 0),
        occurredAtUtc: new Date().toISOString(),
        description: otherDescription.trim() || (isOtherIncome ? "إيراد إضافي" : "مصروف إضافي"),
      });
      setOtherAmount(0);
      setOtherTax(0);
      setOtherDescription("");
      await loadData();
      onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Customer Payment submit
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    if (!paymentAmount || paymentAmount <= 0) {
      alert("يرجى إدخال مبلغ دفع صالح.");
      return;
    }

    setActionLoading(true);
    try {
      await recordCustomerPayment(order.id, {
        amount: Number(paymentAmount),
        paymentMethod: Number(paymentMethod),
        paidAtUtc: new Date().toISOString(),
        reference: paymentReference.trim() || `RCPT-${Date.now().toString().slice(-4)}`,
      });
      setPaymentAmount(0);
      setPaymentReference("");
      await loadData();
      onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  if (!order) return null;

  // Compute live paid total
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`الفوترة والمالية لورشة الرياض - أمر رقم ${order.workOrderNumber}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-5 text-xs" dir="rtl">
        {/* Customer & Vehicle Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-slate-900 dark:text-white">
                {order.externalVehicle?.customerName || "عميل خارجي"}
              </span>
              <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                {order.externalVehicle?.plateOrReference || "-"}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              جوال: {order.externalVehicle?.customerPhone || "-"} • الموقع: {order.maintenanceLocationNameAr}
            </div>
          </div>

          <div className="flex items-center gap-4 text-left">
            <div>
              <span className="text-[11px] text-slate-500 block">إجمالي المحصل نقداً:</span>
              <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totalPaid)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Tabs */}
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("parts")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold cursor-pointer transition-colors ${
              activeTab === "parts"
                ? "bg-[#1167c9] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Package size={14} />
            <span>مبيعات قطع الغيار</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("labor")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold cursor-pointer transition-colors ${
              activeTab === "labor"
                ? "bg-[#1167c9] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Wrench size={14} />
            <span>أجور يد العميل (إيراد)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("mechanic")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold cursor-pointer transition-colors ${
              activeTab === "mechanic"
                ? "bg-[#1167c9] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <UserCheck size={14} />
            <span>مستحقات الفني (مصروف)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("other")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold cursor-pointer transition-colors ${
              activeTab === "other"
                ? "bg-[#1167c9] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <DollarSign size={14} />
            <span>إيرادات / مصاريف أخرى</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("payment")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold cursor-pointer transition-colors ${
              activeTab === "payment"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <CreditCard size={14} />
            <span>تحصيل دفعة عميل</span>
          </button>
        </div>

        {/* Tab 1: Part Sale */}
        {activeTab === "parts" && (
          <div className="space-y-4">
            {canPartSale && (
              <form onSubmit={handlePartSaleSubmit} className="p-4 rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  تسجيل بيع قطعة غيار للعميل
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="lg:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      الصنف <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      value={partItemId}
                      onChange={(val) => setPartItemId(val)}
                      options={items.map((i) => ({
                        value: i.id,
                        label: `${i.nameAr} (${i.sku})`,
                        sublabel: `${itemTypeLabels[i.itemType] || ""} • SKU: ${i.sku}`,
                        keywords: `${itemTypeLabels[i.itemType] || ""} ${i.sku} ${i.nameEn || ""}`,
                      }))}
                      placeholder="اختر الصنف..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      الكمية <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={partQuantity}
                      onChange={(e) => setPartQuantity(parseFloat(e.target.value) || 1)}
                      required
                      className="text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      سعر البيع للعميل (ر.س) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={partSellingPrice}
                      onChange={(e) => setPartSellingPrice(parseFloat(e.target.value) || 0)}
                      required
                      className="text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      الضريبة (ر.س)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={partTax}
                      onChange={(e) => setPartTax(parseFloat(e.target.value) || 0)}
                      className="text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-500">
                    ملاحظة: سعر البيع يُسجل كإيراد، وتكلفة FIFO للمخزون تُخصم وتُحسب تلقائياً من الخادم دون تدخل الكاشير.
                  </span>
                  <Button variant="primary" type="submit" loading={actionLoading} className="text-xs">
                    إضافة البيع
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tab 2: Customer Labor */}
        {activeTab === "labor" && (
          <div className="space-y-4">
            {canLabor && (
              <form onSubmit={handleLaborSubmit} className="p-4 rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  تسجيل أجور يد العميل (إيراد ورشة)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      وصف العمل المنجز <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={laborDescription}
                      onChange={(e) => setLaborDescription(e.target.value)}
                      placeholder="مثال: فك وتركيب مساعدات أمامية وتغيير زيت"
                      required
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      المبلغ قبل الضريبة (ر.س) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={laborAmount}
                      onChange={(e) => setLaborAmount(parseFloat(e.target.value) || 0)}
                      required
                      className="text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end pt-2">
                  <Button variant="primary" type="submit" loading={actionLoading} className="text-xs">
                    تسجيل أجور اليد
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tab 3: Mechanic Payment */}
        {activeTab === "mechanic" && (
          <div className="space-y-4">
            {canMechanic && (
              <form onSubmit={handleMechanicSubmit} className="p-4 rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  تسجيل مستحقات وتكلفة الميكانيكي/الفني (مصروف ورشة)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      فني الشركة الداخلي
                    </label>
                    <SearchableSelect
                      value={mechanicEmployeeId}
                      onChange={(val) => setMechanicEmployeeId(val)}
                      options={[
                        { value: "", label: "فني خارجي (أو كتابة الاسم يدوياً)" },
                        ...employees.map((e) => ({
                          value: e.id,
                          label: e.fullNameAr,
                        })),
                      ]}
                      placeholder="اختر الفني الداخلي..."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      اسم الفني الخارجي (إن وجد)
                    </label>
                    <Input
                      value={externalMechanicName}
                      onChange={(e) => setExternalMechanicName(e.target.value)}
                      placeholder="اسم الورشة أو الفني الخارجي"
                      className="text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      المبلغ المدفوع للفني (ر.س) <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={mechanicAmount}
                      onChange={(e) => setMechanicAmount(parseFloat(e.target.value) || 0)}
                      required
                      className="text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    بيان الأجر الممنوح للفني
                  </label>
                  <Input
                    value={mechanicDescription}
                    onChange={(e) => setMechanicDescription(e.target.value)}
                    placeholder="مستحقات شغل يد عن أمر الصيانة..."
                    className="text-xs"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-amber-700 dark:text-amber-400">
                    أجور الفنيين تُسجل كمصروف مستقل عن أجور العميل، لتحقيق المعادلة المحاسبية للأرباح الحقيقية.
                  </span>
                  <Button variant="primary" type="submit" loading={actionLoading} className="text-xs">
                    تسجيل مصروف الفني
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tab 4: Other Financial Entries */}
        {activeTab === "other" && (
          <div className="space-y-4">
            <form onSubmit={handleOtherSubmit} className="p-4 rounded-xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                تسجيل حركة مالية إضافية (إيراد أو مصروف)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    نوع القيد <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={isOtherIncome ? "income" : "expense"}
                    onChange={(e) => setIsOtherIncome(e.target.value === "income")}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 font-bold focus:outline-hidden"
                  >
                    <option value="income">إيراد إضافي (Income)</option>
                    <option value="expense">مصروف إضافي (Expense)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    المبلغ قبل الضريبة (ر.س) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={otherAmount}
                    onChange={(e) => setOtherAmount(parseFloat(e.target.value) || 0)}
                    required
                    className="text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    الضريبة (ر.س)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={otherTax}
                    onChange={(e) => setOtherTax(parseFloat(e.target.value) || 0)}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  البيان / الوصف <span className="text-red-500">*</span>
                </label>
                <Input
                  value={otherDescription}
                  onChange={(e) => setOtherDescription(e.target.value)}
                  placeholder="مثال: غسيل وتلميع سيارة..."
                  required
                  className="text-xs"
                />
              </div>

              <div className="flex items-center justify-end pt-2">
                <Button variant="primary" type="submit" loading={actionLoading} className="text-xs">
                  تسجيل القيد
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 5: Customer Payments */}
        {activeTab === "payment" && (
          <div className="space-y-4">
            <form onSubmit={handlePaymentSubmit} className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-3">
              <span className="font-bold text-emerald-900 dark:text-emerald-300 block">
                تحصيل دفعة نقدية / بنكية من العميل
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    المبلغ المحصل (ر.س) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="0.01"
                    step="any"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    required
                    className="text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    طريقة السداد <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(Number(e.target.value) as PaymentMethod)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 font-bold focus:outline-hidden"
                  >
                    {Object.entries(paymentMethodLabels).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    رقم الإيصال / المرجع البنكي
                  </label>
                  <Input
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="مثال: RCPT-1029 أو مرجع مدى"
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-500">
                  تنويه: مبالغ الدفع المحصلة تُمثل تدفقاً نقدياً في الخزينة وليست هي الربح الصافي.
                </span>
                <Button variant="primary" type="submit" loading={actionLoading} className="text-xs bg-emerald-600 hover:bg-emerald-700">
                  تسجيل التحصيل
                </Button>
              </div>
            </form>

            {/* Payments List */}
            {payments.length > 0 && (
              <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 font-bold border-b border-[var(--border)]">
                  سجل الدفعات المحصلة من العميل
                </div>
                <table className="w-full text-right">
                  <thead className="border-b border-[var(--border)] bg-slate-100/50 text-[11px]">
                    <tr>
                      <th className="p-2.5">تاريخ الدفع</th>
                      <th className="p-2.5">طريقة السداد</th>
                      <th className="p-2.5">رقم المرجع / الإيصال</th>
                      <th className="p-2.5 text-left font-mono">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="p-2.5 font-mono text-slate-600">{formatDateTime(p.paidAtUtc)}</td>
                        <td className="p-2.5">{paymentMethodLabels[p.paymentMethod] || p.paymentMethod}</td>
                        <td className="p-2.5 font-mono">{p.reference}</td>
                        <td className="p-2.5 text-left font-mono font-bold text-emerald-600">
                          {formatCurrency(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-[var(--border)]">
          <Button variant="secondary" onClick={onClose} className="text-xs">
            إغلاق
          </Button>
        </div>
      </div>
    </Modal>
  );
}
