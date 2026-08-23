"use client";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSponsor } from "../../../../../lib/workforce/api";
import { Button } from "../../../../../components/ui/Button";
import { Input } from "../../../../../components/ui/Input";
import { Card } from "../../../../../components/ui/Card";
export default function NewSponsorPage() {
  const router = useRouter();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await createSponsor({
      employerIdentityNumber: f.get("identity"),
      registryNameAr: f.get("nameAr"),
      registryNameEn: f.get("nameEn") || null,
      sponsorType: f.get("type"),
      status: "Active",
      commercialRegistrationNumber: null,
      unifiedNationalNumber: null,
      activeFrom: null,
      activeTo: null,
      contactName: f.get("contact") || null,
      contactPhone: f.get("phone") || null,
      contactEmail: null,
      address: null,
      notes: null,
      rowVersion: null,
    });
    router.replace("/dashboard/employees/sponsors");
  }
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-black">إضافة كفيل</h1>
      <form onSubmit={submit}>
        <Card className="grid gap-4 p-6 sm:grid-cols-2">
          <Input name="nameAr" label="اسم الكفيل بالعربية" required />
          <Input name="nameEn" label="الاسم بالإنجليزية" dir="ltr" />
          <Input name="identity" label="رقم هوية الكفيل" required dir="ltr" />
          <label className="grid gap-2 text-sm font-bold">
            نوع الكفيل
            <select
              name="type"
              required
              className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3"
            >
              <option value="Company">شركة</option>
              <option value="Establishment">مؤسسة</option>
              <option value="Individual">فرد</option>
            </select>
          </label>
          <Input name="contact" label="اسم جهة الاتصال" />
          <Input name="phone" label="رقم الجوال" dir="ltr" />
          <Button type="submit">حفظ الكفيل</Button>
        </Card>
      </form>
    </div>
  );
}
