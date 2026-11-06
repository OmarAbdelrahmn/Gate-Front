// src/app/admin/hunger/components/AccountVehicleSimDetailSection.tsx
"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  getActualVehicleCustodyStatusMeta,
  getActualVehicleOwnershipMeta,
  type HungerAccountItem,
  type PlatformAccountBusinessContextResponse,
} from "@/lib/hunger/api";
import { Car, Smartphone, ShieldAlert } from "lucide-react";

interface AccountVehicleSimDetailSectionProps {
  account: HungerAccountItem | null;
  context: PlatformAccountBusinessContextResponse | null;
  canEditVehicleIdentity: boolean;
}

export function AccountVehicleSimDetailSection({
  account,
  context,
  canEditVehicleIdentity,
}: AccountVehicleSimDetailSectionProps) {
  const custodyStatus =
    context?.actualVehicleCustodyStatus ??
    account?.actualVehicleCustodyStatus ??
    "Unknown";
  const custodyMeta = getActualVehicleCustodyStatusMeta(custodyStatus);

  const vehicleOwnership =
    context?.actualVehicleOwnership ??
    account?.actualVehicleOwnership ??
    "Unknown";
  const ownershipMeta = getActualVehicleOwnershipMeta(vehicleOwnership);

  const actualVehiclePeriods =
    context?.actualVehiclePeriods ?? account?.actualVehiclePeriods ?? [];

  const simOwnership =
    context?.simOwnership ??
    context?.sim?.ownership ??
    account?.simOwnership ??
    account?.sim?.ownership ??
    "Unknown";
  const sourceSimOwnership =
    context?.sourceSimOwnership ?? account?.sourceSimOwnership ?? null;
  const simHolder = context?.simHolder ?? account?.simHolder ?? null;
  const simResponsibleEmployee =
    context?.simResponsibleEmployee ?? account?.simResponsibleEmployee ?? null;
  const simOwnershipPeriods =
    context?.sim?.ownershipPeriods ?? account?.sim?.ownershipPeriods ?? [];
  const simReason = context?.sim?.reason ?? account?.sim?.reason ?? null;

  // Vehicle Identity fields (editable only with fleet.vehicles.fields.identity)
  const [vehAssetNumber, setVehAssetNumber] = useState("");
  const [vehVin, setVehVin] = useState("");
  const [vehType, setVehType] = useState(
    context?.registeredVehicleType ?? account?.registeredVehicleType ?? "",
  );
  const [vehModel, setVehModel] = useState("");
  const [vehManufacturer, setVehManufacturer] = useState("");

  return (
    <div className="space-y-4">
      {/* 1. Actual Vehicle Custody, Ownership & Periods Timeline */}
      <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)]/40 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--foreground)]">
            <Car className="h-4 w-4 text-amber-500" />
            <span>سياق المركبة الفعلية وعهدة الحركة (Actual Vehicle Context)</span>
          </div>
          {(context?.contextVerifiedAtUtc || account?.contextVerifiedAtUtc) && (
            <span className="text-[10px] text-[var(--muted)]" dir="ltr">
              وقت التحقق:{" "}
              {(
                context?.contextVerifiedAtUtc ||
                account?.contextVerifiedAtUtc ||
                ""
              ).slice(0, 19)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs">
            <span className="block text-[11px] text-[var(--muted)]">
              حالة عهدة المركبة الفعلية (actualVehicleCustodyStatus):
            </span>
            <div className="mt-1">
              {custodyMeta.value === "None" ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-sky-300 bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200">
                  لا توجد عهدة موثقة (None)
                </span>
              ) : custodyMeta.value === "Unknown" ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-rose-400 bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
                  <ShieldAlert className="h-3 w-3" />
                  غير معروف (Unknown)
                </span>
              ) : (
                <Badge tone={custodyMeta.badgeTone}>
                  {custodyMeta.labelAr}
                </Badge>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs">
            <span className="block text-[11px] text-[var(--muted)]">
              ملكية المركبة الفعلية (actualVehicleOwnership):
            </span>
            <div className="mt-1">
              <Badge tone={ownershipMeta.badgeTone}>
                {ownershipMeta.labelAr}
              </Badge>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs">
            <span className="block text-[11px] text-[var(--muted)]">
              المركبة الفعلية (النوع / اللوحة):
            </span>
            <p className="mt-1 font-bold text-[var(--foreground)]">
              {context?.actualVehicleType || account?.actualVehicleType || "—"}{" "}
              /{" "}
              {context?.actualVehiclePlate ||
                account?.actualVehiclePlate ||
                "—"}
            </p>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs">
            <span className="block text-[11px] text-[var(--muted)]">
              المركبة المسجلة (المستقلة):
            </span>
            <p className="mt-1 font-bold text-[var(--foreground)]">
              {context?.registeredVehiclePlate ||
                account?.registeredVehiclePlate ||
                "—"}
              {(context?.registeredVehicleSerial ||
                account?.registeredVehicleSerial) &&
                ` (${context?.registeredVehicleSerial || account?.registeredVehicleSerial})`}
            </p>
          </div>
        </div>

        {/* Timeline Table: actualVehiclePeriods */}
        <div>
          <h5 className="mb-1.5 text-[11px] font-bold text-[var(--foreground)]">
            الجدول الزمني لفترات المركبة الفعلية (actualVehiclePeriods):
          </h5>
          <div className="max-h-44 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full text-right text-[11px]">
              <thead className="sticky top-0 bg-slate-100 font-bold dark:bg-slate-800">
                <tr>
                  <th className="p-2">من (fromUtc)</th>
                  <th className="p-2">إلى (throughUtc)</th>
                  <th className="p-2">حالة العهدة</th>
                  <th className="p-2">الملكية</th>
                  <th className="p-2">النوع / اللوحة</th>
                  <th className="p-2">المستلم / الملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {actualVehiclePeriods.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-3 text-center text-[var(--muted)]"
                    >
                      لا توجد فترات عهدة مركبة مسجلة في النطاق المحدد.
                    </td>
                  </tr>
                ) : (
                  actualVehiclePeriods.map((p, idx) => {
                    const pCustody = getActualVehicleCustodyStatusMeta(
                      p.custodyStatus,
                    );
                    const pOwner = getActualVehicleOwnershipMeta(
                      p.ownership ?? p.vehicleOwnership,
                    );
                    return (
                      <tr key={idx}>
                        <td className="p-2" dir="ltr">
                          {(p.fromUtc || p.from || "—").slice(0, 16)}
                        </td>
                        <td className="p-2" dir="ltr">
                          {(p.throughUtc || p.through || "مستمر").slice(0, 16)}
                        </td>
                        <td className="p-2">
                          <Badge tone={pCustody.badgeTone}>
                            {pCustody.labelAr}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <Badge tone={pOwner.badgeTone}>
                            {pOwner.labelAr}
                          </Badge>
                        </td>
                        <td className="p-2 font-semibold">
                          {p.vehicleType || p.type || "—"}{" "}
                          {(p.vehiclePlate || p.plateNumber || p.plate) &&
                            `— ${p.vehiclePlate || p.plateNumber || p.plate}`}
                        </td>
                        <td className="p-2 text-[var(--muted)]">
                          {p.holderNameAr ||
                            p.holderNameEn ||
                            p.reason ||
                            "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 2. SIM Ownership, Holder, Responsible Employee, Source Label & Ownership Periods Timeline */}
      <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)]/40 p-3.5">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--foreground)]">
          <Smartphone className="h-4 w-4 text-amber-500" />
          <span>سياق شريحة الاتصال وتاريخ الملكية (SIM Context & Periods)</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs">
            <span className="block text-[11px] text-[var(--muted)]">
              ملكية الشريحة الموثقة (simOwnership):
            </span>
            <div className="mt-1">
              <Badge
                tone={
                  simOwnership === "Company"
                    ? "green"
                    : simOwnership === "Private" || simOwnership === "Rider"
                      ? "blue"
                      : "gray"
                }
              >
                {simOwnership}
              </Badge>
            </div>
            {simReason && (
              <p className="mt-1 text-[10px] text-[var(--muted)]">
                {simReason}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-amber-200/80 bg-amber-50/40 p-2.5 text-xs dark:border-amber-900/40 dark:bg-amber-950/20">
            <span className="block text-[11px] font-semibold text-amber-800 dark:text-amber-300">
              ملكية الشريحة (من ملف الاستيراد — sourceSimOwnership):
            </span>
            <p className="mt-1 font-bold text-amber-900 dark:text-amber-200">
              {sourceSimOwnership || "غير محدد في ملف الاستيراد"}
            </p>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs">
            <span className="block text-[11px] text-[var(--muted)]">
              حامل الشريحة الفعلي (simHolder):
            </span>
            {simHolder && (simHolder.nameAr || simHolder.nameEn) ? (
              <div className="mt-1">
                <p className="font-bold text-[var(--foreground)]">
                  {simHolder.nameAr || simHolder.nameEn}
                </p>
                {simHolder.iqamaNo && (
                  <p className="text-[10px] text-[var(--muted)]">
                    هوية: {simHolder.iqamaNo}
                  </p>
                )}
                {simHolder.phoneNumber && (
                  <p className="text-[10px] text-[var(--muted)]" dir="ltr">
                    {simHolder.phoneNumber}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-1 text-[var(--muted)]">غير محدد</p>
            )}
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs">
            <span className="block text-[11px] text-[var(--muted)]">
              الموظف المسؤول عن الشريحة (simResponsibleEmployee):
            </span>
            {simResponsibleEmployee &&
            (simResponsibleEmployee.nameAr || simResponsibleEmployee.nameEn) ? (
              <div className="mt-1">
                <p className="font-bold text-[var(--foreground)]">
                  {simResponsibleEmployee.nameAr ||
                    simResponsibleEmployee.nameEn}
                </p>
                {simResponsibleEmployee.iqamaNo && (
                  <p className="text-[10px] text-[var(--muted)]">
                    هوية: {simResponsibleEmployee.iqamaNo}
                  </p>
                )}
                {simResponsibleEmployee.phoneNumber && (
                  <p className="text-[10px] text-[var(--muted)]" dir="ltr">
                    {simResponsibleEmployee.phoneNumber}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-1 text-[var(--muted)]">غير محدد</p>
            )}
          </div>
        </div>

        {/* Timeline Table: sim.ownershipPeriods */}
        <div>
          <h5 className="mb-1.5 text-[11px] font-bold text-[var(--foreground)]">
            فترات ملكية الشريحة المؤرخة (sim.ownershipPeriods):
          </h5>
          <div className="max-h-40 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full text-right text-[11px]">
              <thead className="sticky top-0 bg-slate-100 font-bold dark:bg-slate-800">
                <tr>
                  <th className="p-2">من</th>
                  <th className="p-2">إلى</th>
                  <th className="p-2">الملكية</th>
                  <th className="p-2">المشغل (Carrier)</th>
                  <th className="p-2">مرجع الإثبات / السبب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {simOwnershipPeriods.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-3 text-center text-[var(--muted)]"
                    >
                      لا توجد فترات ملكية مؤرخة للشريحة في النطاق المحدد.
                    </td>
                  </tr>
                ) : (
                  simOwnershipPeriods.map((sp, idx) => (
                    <tr key={idx}>
                      <td className="p-2" dir="ltr">
                        {(
                          sp.from ||
                          sp.effectiveFrom ||
                          sp.fromUtc ||
                          "—"
                        ).slice(0, 10)}
                      </td>
                      <td className="p-2" dir="ltr">
                        {(
                          sp.through ||
                          sp.effectiveTo ||
                          sp.throughUtc ||
                          "مستمر"
                        ).slice(0, 10)}
                      </td>
                      <td className="p-2 font-bold">{sp.ownership || "—"}</td>
                      <td className="p-2">{sp.carrier || "—"}</td>
                      <td className="p-2 text-[var(--muted)]">
                        {sp.evidenceReference ||
                          sp.evidence ||
                          sp.reason ||
                          "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 3. Vehicle Identity Fields gated by fleet.vehicles.fields.identity */}
      <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)]/40 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-bold text-[var(--foreground)]">
            حقول هوية المركبة الحساسة (Asset / VIN / Type / Model / Manufacturer)
          </h4>
          <Badge tone={canEditVehicleIdentity ? "green" : "gray"}>
            {canEditVehicleIdentity
              ? "مسموح بالتعديل (fleet.vehicles.fields.identity)"
              : "للقراءة فقط — يتطلب fleet.vehicles.fields.identity"}
          </Badge>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          <Input
            label="رمز الأصل (Asset)"
            value={vehAssetNumber}
            onChange={(e) => setVehAssetNumber(e.target.value)}
            disabled={!canEditVehicleIdentity}
            placeholder="رمز الأصل..."
          />
          <Input
            label="رقم الهيكل (VIN)"
            value={vehVin}
            onChange={(e) => setVehVin(e.target.value)}
            disabled={!canEditVehicleIdentity}
            placeholder="VIN..."
          />
          <Input
            label="نوع المركبة (Type)"
            value={vehType}
            onChange={(e) => setVehType(e.target.value)}
            disabled={!canEditVehicleIdentity}
            placeholder="النوع..."
          />
          <Input
            label="الموديل (Model)"
            value={vehModel}
            onChange={(e) => setVehModel(e.target.value)}
            disabled={!canEditVehicleIdentity}
            placeholder="الموديل..."
          />
          <Input
            label="الشركة المصنعة (Manufacturer)"
            value={vehManufacturer}
            onChange={(e) => setVehManufacturer(e.target.value)}
            disabled={!canEditVehicleIdentity}
            placeholder="المصنع..."
          />
        </div>
      </div>
    </div>
  );
}
