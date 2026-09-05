"use client";

import React, { useState } from "react";
import { PlusCircle, Edit2, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SupplierModal } from "./SupplierModal";
import type { Supplier } from "@/lib/maintenance/types";
import { useAuth } from "@/lib/auth/AuthProvider";

interface SuppliersTabProps {
  suppliers: Supplier[];
  loading: boolean;
  onRefresh: () => void;
}

export function SuppliersTab({ suppliers, loading, onRefresh }: SuppliersTabProps) {
  const { can } = useAuth();
  const canManage = can("inventory.receipts.manage");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const handleEdit = (sup: Supplier) => {
    setSelectedSupplier(sup);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedSupplier(null);
    setModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            موردو قطع الغيار والزيوت
          </h2>
          <p className="text-xs text-slate-500">
            سجل الموردين المعتمدين لتوريد الزيوت، الفلاتر، وقطع الغيار لورش ومستودعات الشركة.
          </p>
        </div>
        {canManage && (
          <Button variant="primary" onClick={handleCreate} className="text-xs">
            <PlusCircle size={15} />
            إضافة مورد جديد
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-right text-xs">
          <thead className="border-b border-[var(--border)] bg-slate-50/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 font-bold">
            <tr>
              <th className="p-3">رقم المورد</th>
              <th className="p-3">اسم المورد</th>
              <th className="p-3">الرقم الضريبي</th>
              <th className="p-3">السجل التجاري</th>
              <th className="p-3">مسؤول الاتصال</th>
              <th className="p-3">الهاتف</th>
              <th className="p-3 text-center">أجل السداد</th>
              {canManage && <th className="p-3 text-center">الإجراءات</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {loading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  جارٍ تحميل الموردين...
                </td>
              </tr>
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  لا يوجد موردون مسجلون حتى الآن.
                </td>
              </tr>
            ) : (
              suppliers.map((sup) => (
                <tr key={sup.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                    {sup.supplierNumber}
                  </td>
                  <td className="p-3 font-bold text-slate-900 dark:text-white">
                    <div>{sup.legalNameAr}</div>
                    <div className="text-[11px] text-slate-400 font-normal">{sup.legalNameEn}</div>
                  </td>
                  <td className="p-3 font-mono text-slate-600 dark:text-slate-300">
                    {sup.vatNumber || "-"}
                  </td>
                  <td className="p-3 font-mono text-slate-600 dark:text-slate-300">
                    {sup.commercialRegistrationNumber || "-"}
                  </td>
                  <td className="p-3 text-slate-700 dark:text-slate-300">
                    {sup.contactName || "-"}
                  </td>
                  <td className="p-3 font-mono text-slate-700 dark:text-slate-300 dir-ltr text-right">
                    {sup.phone || "-"}
                  </td>
                  <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-300">
                    {sup.paymentTermsDays ? `${sup.paymentTermsDays} يوم` : "-"}
                  </td>
                  {canManage && (
                    <td className="p-3 text-center">
                      <Button
                        variant="secondary"
                        onClick={() => handleEdit(sup)}
                        className="h-8 px-2.5 text-xs"
                      >
                        <Edit2 size={13} />
                        تعديل
                      </Button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <SupplierModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={onRefresh}
        supplier={selectedSupplier}
      />
    </div>
  );
}
