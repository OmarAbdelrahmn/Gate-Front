"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createSupplier, updateSupplier } from "@/lib/maintenance/api";
import type { Supplier } from "@/lib/maintenance/types";

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  supplier: Supplier | null;
}

export function SupplierModal({
  isOpen,
  onClose,
  onSaved,
  supplier,
}: SupplierModalProps) {
  const [loading, setLoading] = useState(false);

  const [supplierNumber, setSupplierNumber] = useState("");
  const [legalNameAr, setLegalNameAr] = useState("");
  const [legalNameEn, setLegalNameEn] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [commercialRegistrationNumber, setCommercialRegistrationNumber] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(30);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (supplier) {
      setSupplierNumber(supplier.supplierNumber || "");
      setLegalNameAr(supplier.legalNameAr || "");
      setLegalNameEn(supplier.legalNameEn || "");
      setVatNumber(supplier.vatNumber || "");
      setCommercialRegistrationNumber(supplier.commercialRegistrationNumber || "");
      setContactName(supplier.contactName || "");
      setPhone(supplier.phone || "");
      setEmail(supplier.email || "");
      setAddress(supplier.address || "");
      setPaymentTermsDays(supplier.paymentTermsDays || 30);
      setNotes(supplier.notes || "");
    } else {
      setSupplierNumber("");
      setLegalNameAr("");
      setLegalNameEn("");
      setVatNumber("");
      setCommercialRegistrationNumber("");
      setContactName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setPaymentTermsDays(30);
      setNotes("");
    }
  }, [supplier, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (supplier) {
        await updateSupplier(supplier.id, {
          supplierNumber,
          legalNameAr,
          legalNameEn,
          vatNumber: vatNumber || null,
          commercialRegistrationNumber: commercialRegistrationNumber || null,
          contactName: contactName || null,
          phone: phone || null,
          email: email || null,
          address: address || null,
          paymentTermsDays: paymentTermsDays || 0,
          notes: notes || null,
          rowVersion: supplier.rowVersion,
        });
      } else {
        await createSupplier({
          supplierNumber,
          legalNameAr,
          legalNameEn,
          vatNumber: vatNumber || null,
          commercialRegistrationNumber: commercialRegistrationNumber || null,
          contactName: contactName || null,
          phone: phone || null,
          email: email || null,
          address: address || null,
          paymentTermsDays: paymentTermsDays || 0,
          notes: notes || null,
          rowVersion: null,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={supplier ? "تعديل بيانات المورد" : "إضافة مورد جديد"}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              رقم المورد (Supplier No.) <span className="text-red-500">*</span>
            </label>
            <Input
              value={supplierNumber}
              onChange={(e) => setSupplierNumber(e.target.value.toUpperCase())}
              placeholder="مثال: SUP-001"
              required
              className="font-mono text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              الرقم الضريبي (VAT No.)
            </label>
            <Input
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value)}
              placeholder="15 رقم"
              className="font-mono text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              السجل التجاري (CR No.)
            </label>
            <Input
              value={commercialRegistrationNumber}
              onChange={(e) => setCommercialRegistrationNumber(e.target.value)}
              placeholder="10 أرقام"
              className="font-mono text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              الاسم التجاري بالعربية <span className="text-red-500">*</span>
            </label>
            <Input
              value={legalNameAr}
              onChange={(e) => setLegalNameAr(e.target.value)}
              placeholder="مثال: شركة التوزيع المتحدة للزيوت"
              required
              className="text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              الاسم التجاري بالإنجليزية <span className="text-red-500">*</span>
            </label>
            <Input
              value={legalNameEn}
              onChange={(e) => setLegalNameEn(e.target.value)}
              placeholder="Example: United Oils Distribution Co."
              required
              dir="ltr"
              className="text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              اسم مسؤول الاتصال
            </label>
            <Input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="اسم المندوب أو المدير"
              className="text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              رقم الهاتف
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05xxxxxxxx"
              className="font-mono text-xs"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              شروط السداد (أيام)
            </label>
            <Input
              type="number"
              min="0"
              value={paymentTermsDays}
              onChange={(e) => setPaymentTermsDays(parseInt(e.target.value) || 0)}
              className="text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              البريد الإلكتروني
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="info@supplier.com"
              dir="ltr"
              className="text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              العنوان
            </label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="المدينة، الحي..."
              className="text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            ملاحظات
          </label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="أي ملاحظات حول المورد..."
            className="text-xs"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading} className="text-xs">
            إلغاء
          </Button>
          <Button variant="primary" type="submit" loading={loading} className="text-xs">
            {supplier ? "حفظ التعديلات" : "إضافة المورد"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
