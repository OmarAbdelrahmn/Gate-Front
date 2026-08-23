"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  HeartPulse,
  IdCard,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import {
  getDriverLicenses,
  getEmployeeDocuments,
  getFullResidencyPermitNumber,
  getHealthCards,
  getResidencyPermits,
  getRiderCards,
  type DriverLicense,
  type EmployeeDocument,
  type HealthCard,
  type ResidencyPermit,
  type RiderCard,
} from "../../lib/workforce/compliance-api";
import { useAuth } from "../../lib/auth/AuthProvider";
import { Card } from "../ui/Card";

type Tab =
  "residency" | "licenses" | "riderCards" | "healthCards" | "documents";
type DisplayRecord = {
  id: string;
  title: string;
  subtitle: string;
  expiryDate: string | null;
};

const tabs: {
  key: Tab;
  label: string;
  icon: typeof IdCard;
  riderOnly?: boolean;
}[] = [
  { key: "residency", label: "الإقامة", icon: IdCard },
  { key: "licenses", label: "رخص القيادة", icon: WalletCards },
  {
    key: "riderCards",
    label: "بطاقات الرايدر",
    icon: ShieldCheck,
    riderOnly: true,
  },
  {
    key: "healthCards",
    label: "البطاقات الصحية",
    icon: HeartPulse,
    riderOnly: true,
  },
  { key: "documents", label: "الوثائق", icon: FileText },
];

function expiryState(date: string | null) {
  if (!date)
    return { label: "غير محدد", classes: "bg-slate-100 text-slate-700" };
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: "منتهية", classes: "bg-red-100 text-red-700" };
  if (days <= 30)
    return { label: "قريبة الانتهاء", classes: "bg-amber-100 text-amber-800" };
  return { label: "سارية", classes: "bg-emerald-100 text-emerald-800" };
}

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(
        new Date(value),
      )
    : "—";
}

export function EmployeeComplianceTabs({
  employeeId,
  riderProfileId,
}: {
  employeeId: string;
  riderProfileId: string | null;
}) {
  const { can } = useAuth();
  const availableTabs = useMemo(
    () => tabs.filter((tab) => !tab.riderOnly || riderProfileId),
    [riderProfileId],
  );
  const [active, setActive] = useState<Tab>("residency");
  const [residencies, setResidencies] = useState<ResidencyPermit[]>([]);
  const [licenses, setLicenses] = useState<DriverLicense[]>([]);
  const [riderCards, setRiderCards] = useState<RiderCard[]>([]);
  const [healthCards, setHealthCards] = useState<HealthCard[]>([]);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [fullPermitNumbers, setFullPermitNumbers] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    const requests: Promise<unknown>[] = [
      getResidencyPermits(employeeId).then(setResidencies),
      getDriverLicenses(employeeId).then(setLicenses),
      getEmployeeDocuments(employeeId).then(setDocuments),
    ];
    if (riderProfileId)
      requests.push(
        getRiderCards(riderProfileId).then(setRiderCards),
        getHealthCards(riderProfileId).then(setHealthCards),
      );
    void Promise.all(requests)
      .then(async () => {
        if (!can("residency.read")) return;
        const permits = await getResidencyPermits(employeeId);
        const fullNumbers = await Promise.all(
          permits.map(async (permit) => {
            const sensitive = await getFullResidencyPermitNumber(permit.id);
            return [permit.id, sensitive.permitNumber] as const;
          }),
        );
        setFullPermitNumbers(Object.fromEntries(fullNumbers));
      })
      .catch(() =>
        setError(
          "تعذر تحميل بعض بيانات الالتزام. تحقق من الصلاحيات ثم حدّث الصفحة.",
        ),
      )
      .finally(() => setLoading(false));
  }, [can, employeeId, riderProfileId]);

  const records: DisplayRecord[] = useMemo(() => {
    if (active === "residency")
      return residencies.map((item) => ({
        id: item.id,
        title: item.residencyProfessionAr,
        subtitle: `${fullPermitNumbers[item.id] ?? item.permitNumberMasked} · ${item.sponsorNameAr ?? "بدون كفيل"}`,
        expiryDate: item.expiryDate,
      }));
    if (active === "licenses")
      return licenses.map((item) => ({
        id: item.id,
        title: item.categoryAr,
        subtitle: `${item.licenseNumberMasked ?? "بدون رقم"} · ${item.licenseStatus}`,
        expiryDate: item.expiryDate,
      }));
    if (active === "riderCards")
      return riderCards.map((item) => ({
        id: item.id,
        title: item.cardType,
        subtitle: `${item.cardNumber} · ${item.validityCycle}`,
        expiryDate: item.expiryDate,
      }));
    if (active === "healthCards")
      return healthCards.map((item) => ({
        id: item.id,
        title: item.cardType ?? "بطاقة صحية",
        subtitle: `${item.cardNumberMasked} · ${item.issuingAuthority ?? "جهة الإصدار غير محددة"}`,
        expiryDate: item.expiryDate,
      }));
    return documents.map((item) => ({
      id: item.id,
      title: item.documentTypeNameAr,
      subtitle: item.currentFileName ?? item.documentNumber ?? "لا يوجد ملف",
      expiryDate: item.expiryDate,
    }));
  }, [
    active,
    documents,
    fullPermitNumbers,
    healthCards,
    licenses,
    residencies,
    riderCards,
  ]);

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[var(--border)] p-5 sm:p-6">
        <h2 className="text-lg font-black">الالتزام والوثائق</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          الإقامة والرخص والبطاقات والوثائق المرتبطة بهذا الملف.
        </p>
        <div
          role="tablist"
          aria-label="أقسام الالتزام"
          className="mt-5 flex gap-2 overflow-x-auto pb-1"
        >
          {availableTabs.map((tab) => {
            const Icon = tab.icon;
            const selected = active === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActive(tab.key)}
                className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-bold ${selected ? "bg-[#1167c9] text-white" : "border border-[var(--border)] text-[var(--muted)] hover:bg-blue-50"}`}
              >
                <Icon size={17} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="p-5 sm:p-6">
        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
          >
            {error}
          </p>
        ) : null}
        {loading ? (
          <p className="py-8 text-center text-sm text-[var(--muted)]">
            جارٍ تحميل بيانات الالتزام…
          </p>
        ) : records.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {records.map((record) => {
              const expiry = expiryState(record.expiryDate);
              return (
                <article
                  key={record.id}
                  className="rounded-xl border border-[var(--border)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black">{record.title}</h3>
                      <p
                        className="mt-1 text-xs text-[var(--muted)]"
                        dir="auto"
                      >
                        {record.subtitle}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${expiry.classes}`}
                    >
                      {expiry.label}
                    </span>
                  </div>
                  <div className="mt-4 flex justify-between border-t border-[var(--border)] pt-3 text-xs">
                    <span className="text-[var(--muted)]">تاريخ الانتهاء</span>
                    <time className="font-bold">
                      {formatDate(record.expiryDate)}
                    </time>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--border)] px-4 py-10 text-center">
            <p className="font-bold">لا توجد بيانات في هذا القسم</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              سيظهر السجل هنا بمجرد إضافته إلى ملف الموظف.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
