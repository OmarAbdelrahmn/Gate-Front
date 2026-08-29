"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  FileText,
  HeartPulse,
  IdCard,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";
import {
  getDriverLicenses,
  getEmployeeDocuments,
  getFullResidencyPermitNumber,
  getHealthCards,
  getResidencyPermits,
  getRiderCards,
  previewEmployeeDocument,
  type DriverLicense,
  type EmployeeDocument,
  type HealthCard,
  type ResidencyPermit,
  type RiderCard,
} from "../../lib/workforce/compliance-api";
import { useAuth } from "../../lib/auth/AuthProvider";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { DriverLicensesView } from "./DriverLicensesView";

type Tab =
  | "residency"
  | "licenses"
  | "riderCards"
  | "healthCards"
  | "ajeerContracts"
  | "documents";

type DisplayRecord = {
  id: string;
  documentId?: string | null;
  title: string;
  subtitle: string;
  expiryDate: string | null;
};

const tabs: {
  key: Tab;
  labelAr: string;
  labelEn: string;
  icon: typeof IdCard;
  riderOnly?: boolean;
}[] = [
    { key: "residency", labelAr: "الإقامة", labelEn: "Residency", icon: IdCard },
    { key: "licenses", labelAr: "رخص القيادة", labelEn: "Driver Licenses", icon: WalletCards },
    {
      key: "riderCards",
      labelAr: "بطاقات المندوب",
      labelEn: "Rider Cards",
      icon: ShieldCheck,
      riderOnly: true,
    },
    {
      key: "healthCards",
      labelAr: "البطاقات الصحية",
      labelEn: "Health Cards",
      icon: HeartPulse,
      riderOnly: true,
    },
    {
      key: "ajeerContracts",
      labelAr: "عقود اجير",
      labelEn: "Ajeer Contracts",
      icon: FileText,
      riderOnly: true,
    },
    { key: "documents", labelAr: "الوثائق", labelEn: "Documents", icon: FileText },
  ];

function expiryState(date: string | null, locale: "ar" | "en" = "ar") {
  if (!date)
    return {
      label: locale === "en" ? "Not specified" : "غير محدد",
      classes: "bg-slate-100 text-slate-700",
    };
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
  if (days < 0)
    return {
      label: locale === "en" ? "Expired" : "منتهية",
      classes: "bg-red-100 text-red-700",
    };
  if (days <= 30)
    return {
      label: locale === "en" ? "Expiring soon" : "قريبة الانتهاء",
      classes: "bg-amber-100 text-amber-800",
    };
  return {
    label: locale === "en" ? "Active" : "سارية",
    classes: "bg-emerald-100 text-emerald-800",
  };
}

function formatDate(value: string | null, locale: "ar" | "en" = "ar") {
  return value
    ? new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-arab" : "en-US", {
      dateStyle: "medium",
    }).format(new Date(value))
    : "—";
}

export function EmployeeComplianceTabs({
  employeeId,
  riderProfileId,
}: {
  employeeId: string;
  riderProfileId: string | null;
}) {
  const { can, locale } = useAuth();
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

  const [inlinePreview, setInlinePreview] = useState<{
    documentId: string;
    title: string;
    url: string;
    contentType: string;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError("");
    const requests: Promise<unknown>[] = [
      getResidencyPermits(employeeId).then(setResidencies).catch(() => []),
      getDriverLicenses(employeeId).then(setLicenses).catch(() => []),
      getEmployeeDocuments(employeeId).then(setDocuments).catch(() => []),
    ];
    if (riderProfileId)
      requests.push(
        getRiderCards(riderProfileId).then(setRiderCards).catch(() => []),
        getHealthCards(riderProfileId).then(setHealthCards).catch(() => []),
      );
    void Promise.all(requests)
      .then(async () => {
        if (!can("residency.read")) return;
        try {
          const permits = await getResidencyPermits(employeeId);
          const fullNumbers = await Promise.all(
            permits.map(async (permit) => {
              try {
                const sensitive = await getFullResidencyPermitNumber(permit.id);
                return [permit.id, sensitive.permitNumber] as const;
              } catch {
                return [permit.id, permit.permitNumberMasked] as const;
              }
            }),
          );
          setFullPermitNumbers(Object.fromEntries(fullNumbers));
        } catch {
          // ignore sensitive permission failure
        }
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [can, employeeId, riderProfileId, locale]);

  async function handlePreview(documentId: string, title: string) {
    try {
      setPreviewLoading(true);
      setError("");
      const res = await previewEmployeeDocument(employeeId, documentId);
      setInlinePreview({
        documentId,
        title,
        url: res.url,
        contentType: res.contentType,
      });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : locale === "en"
            ? "Unable to preview document"
            : "تعذر عرض الوثيقة",
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  const findDocId = (itemDocId: string | null | undefined, typeCode: string) => {
    if (itemDocId) return itemDocId;
    const match = documents.find(
      (d) => d.documentTypeCode?.toLowerCase() === typeCode.toLowerCase(),
    );
    return match?.id ?? null;
  };

  const records: DisplayRecord[] = useMemo(() => {
    if (active === "residency") {
      if (residencies.length > 0) {
        return residencies.map((item) => {
          const rec = item as Record<string, unknown>;
          const profEn = rec.residencyProfessionEn as string | undefined;
          const spEn = rec.sponsorNameEn as string | undefined;
          const docId = findDocId(
            rec.employeeDocumentId as string | undefined,
            "ResidencyPermit",
          );
          return {
            id: item.id,
            documentId: docId,
            title:
              (locale === "en"
                ? profEn || item.residencyProfessionAr
                : item.residencyProfessionAr) ||
              (locale === "en" ? "Residency Permit" : "إقامة"),
            subtitle: `${fullPermitNumbers[item.id] ?? item.permitNumberMasked} · ${(locale === "en" ? spEn || item.sponsorNameAr : item.sponsorNameAr) ?? (locale === "en" ? "No sponsor" : "بدون كفيل")}`,
            expiryDate: item.expiryDate,
          };
        });
      }
      const matched = documents.filter((d) => {
        const code = (d.documentTypeCode || "").toLowerCase();
        const name = (d.documentTypeNameAr || "").toLowerCase();
        return (
          code.includes("residency") ||
          code.includes("iqama") ||
          name.includes("إقامة") ||
          name.includes("اقامة")
        );
      });
      if (matched.length > 0) {
        return matched.map((item) => {
          const rec = item as Record<string, unknown>;
          const docNameEn = rec.documentTypeNameEn as string | undefined;
          return {
            id: item.id,
            documentId: item.id,
            title:
              (locale === "en"
                ? docNameEn || item.documentTypeNameAr
                : item.documentTypeNameAr) ||
              (locale === "en" ? "Residency Document" : "وثيقة إقامة"),
            subtitle:
              item.currentFileName ??
              item.documentNumber ??
              (locale === "en" ? "Uploaded Document" : "وثيقة مرفوعة"),
            expiryDate: item.expiryDate,
          };
        });
      }
      return [];
    }

    if (active === "licenses") {
      if (licenses.length > 0) {
        return licenses.map((item) => {
          const rec = item as Record<string, unknown>;
          const catEn = rec.categoryEn as string | undefined;
          const docId = findDocId(
            rec.employeeDocumentId as string | undefined,
            "DriverLicense",
          );
          return {
            id: item.id,
            documentId: docId,
            title:
              (locale === "en" ? catEn || item.categoryAr : item.categoryAr) ||
              (locale === "en" ? "Driver License" : "رخصة قيادة"),
            subtitle: `${item.licenseNumberMasked ?? (locale === "en" ? "No number" : "بدون رقم")} · ${item.licenseStatus}`,
            expiryDate: item.expiryDate,
          };
        });
      }
      const matched = documents.filter((d) => {
        const code = (d.documentTypeCode || "").toLowerCase();
        const name = (d.documentTypeNameAr || "").toLowerCase();
        return (
          code.includes("license") ||
          code.includes("driver") ||
          name.includes("رخصة") ||
          name.includes("قيادة")
        );
      });
      if (matched.length > 0) {
        return matched.map((item) => {
          const rec = item as Record<string, unknown>;
          const docNameEn = rec.documentTypeNameEn as string | undefined;
          return {
            id: item.id,
            documentId: item.id,
            title:
              (locale === "en"
                ? docNameEn || item.documentTypeNameAr
                : item.documentTypeNameAr) ||
              (locale === "en" ? "License Document" : "وثيقة رخصة"),
            subtitle:
              item.currentFileName ??
              item.documentNumber ??
              (locale === "en" ? "Uploaded Document" : "وثيقة مرفوعة"),
            expiryDate: item.expiryDate,
          };
        });
      }
      return [];
    }

    if (active === "riderCards") {
      if (riderCards.length > 0) {
        return riderCards.map((item) => ({
          id: item.id,
          documentId: findDocId(item.employeeDocumentId, "RiderCard"),
          title: item.cardType,
          subtitle: `${item.cardNumber} · ${item.validityCycle}`,
          expiryDate: item.expiryDate,
        }));
      }
      const matched = documents.filter((d) => {
        const code = (d.documentTypeCode || "").toLowerCase();
        const name = (d.documentTypeNameAr || "").toLowerCase();
        return code.includes("rider") || name.includes("رايدر");
      });
      if (matched.length > 0) {
        return matched.map((item) => ({
          id: item.id,
          documentId: item.id,
          title:
            item.documentTypeNameAr ||
            (locale === "en" ? "Rider Card Document" : "وثيقة بطاقة رايدر"),
          subtitle:
            item.currentFileName ??
            item.documentNumber ??
            (locale === "en" ? "Uploaded Document" : "وثيقة مرفوعة"),
          expiryDate: item.expiryDate,
        }));
      }
      return [];
    }

    if (active === "healthCards") {
      if (healthCards.length > 0) {
        return healthCards.map((item) => ({
          id: item.id,
          documentId: findDocId(item.employeeDocumentId, "HealthCard"),
          title: item.cardType ?? (locale === "en" ? "Health Card" : "بطاقة صحية"),
          subtitle: `${item.cardNumberMasked} · ${item.issuingAuthority ?? (locale === "en" ? "Issuer unspecified" : "جهة الإصدار غير محددة")}`,
          expiryDate: item.expiryDate,
        }));
      }
      const matched = documents.filter((d) => {
        const code = (d.documentTypeCode || "").toLowerCase();
        const name = (d.documentTypeNameAr || "").toLowerCase();
        return (
          code.includes("health") ||
          code.includes("medical") ||
          name.includes("صحية") ||
          name.includes("طبي")
        );
      });
      if (matched.length > 0) {
        return matched.map((item) => ({
          id: item.id,
          documentId: item.id,
          title:
            item.documentTypeNameAr ||
            (locale === "en" ? "Health Card Document" : "وثيقة بطاقة صحية"),
          subtitle:
            item.currentFileName ??
            item.documentNumber ??
            (locale === "en" ? "Uploaded Document" : "وثيقة مرفوعة"),
          expiryDate: item.expiryDate,
        }));
      }
      return [];
    }

    if (active === "ajeerContracts") {
      const matched = documents.filter(
        (d) =>
          d.documentTypeCode === "AJEER_CONTRACT" ||
          d.documentTypeCode?.toLowerCase() === "ajeer_contract" ||
          (d.documentTypeNameAr || "").includes("اجير") ||
          (d.documentTypeNameAr || "").includes("أجير"),
      );
      if (matched.length > 0) {
        return matched.map((item) => {
          const rec = item as Record<string, unknown>;
          const docNameEn = rec.documentTypeNameEn as string | undefined;
          return {
            id: item.id,
            documentId: item.id,
            title:
              (locale === "en"
                ? docNameEn || item.documentTypeNameAr
                : item.documentTypeNameAr) ||
              (locale === "en" ? "Ajeer Contract" : "عقد اجير"),
            subtitle:
              item.currentFileName ??
              item.documentNumber ??
              (locale === "en" ? "Uploaded Document" : "وثيقة مرفوعة"),
            expiryDate: item.expiryDate,
          };
        });
      }
      return [];
    }

    return documents.map((item) => {
      const rec = item as Record<string, unknown>;
      const docNameEn = rec.documentTypeNameEn as string | undefined;
      return {
        id: item.id,
        documentId: item.id,
        title:
          (locale === "en" ? docNameEn || item.documentTypeNameAr : item.documentTypeNameAr) ||
          (locale === "en" ? "Document" : "وثيقة"),
        subtitle:
          item.currentFileName ??
          item.documentNumber ??
          (locale === "en" ? "No file" : "لا يوجد ملف"),
        expiryDate: item.expiryDate,
      };
    });
  }, [
    active,
    documents,
    fullPermitNumbers,
    healthCards,
    licenses,
    residencies,
    riderCards,
    locale,
  ]);

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[var(--border)] p-5 sm:p-6">
        <h2 className="text-lg font-black">
          {locale === "en" ? "Compliance & Documents" : "الالتزام والوثائق"}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {locale === "en"
            ? "Residency permits, licenses, cards, and documents attached to this file."
            : "الإقامة والرخص والبطاقات والوثائق المرتبطة بهذا الملف."}
        </p>
        <div
          role="tablist"
          aria-label={locale === "en" ? "Compliance sections" : "أقسام الالتزام"}
          className="mt-5 flex gap-2 overflow-x-auto pb-1"
        >
          {availableTabs.map((tab) => {
            const Icon = tab.icon;
            const selected = active === tab.key;
            const label = locale === "en" ? tab.labelEn : tab.labelAr;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => {
                  setActive(tab.key);
                  setInlinePreview(null);
                }}
                className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-bold ${selected ? "bg-[#1167c9] text-white" : "border border-[var(--border)] text-[var(--muted)] hover:bg-blue-50"}`}
              >
                <Icon size={17} />
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="p-5 sm:p-6">
        {active === "licenses" ? (
          <DriverLicensesView
            employeeId={employeeId}
            onPreviewDocument={(docId, title) => void handlePreview(docId, title)}
          />
        ) : error ? (
          <p
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
          >
            {error}
          </p>
        ) : loading ? (
          <p className="py-8 text-center text-sm text-[var(--muted)]">
            {locale === "en"
              ? "Loading compliance data…"
              : "جارٍ تحميل بيانات الالتزام…"}
          </p>
        ) : records.length ? (
          <div className="space-y-6">
            <div className="grid gap-3 lg:grid-cols-2">
              {records.map((record) => {
                const expiry = expiryState(record.expiryDate, locale);
                const isSelectedForPreview =
                  inlinePreview?.documentId === record.documentId;

                return (
                  <article
                    key={record.id}
                    className={`rounded-xl border p-4 transition-all ${isSelectedForPreview
                        ? "border-[#1167c9] bg-blue-50/40 ring-2 ring-[#1167c9]/20"
                        : "border-[var(--border)]"
                      }`}
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
                    <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--muted)]">
                          {locale === "en" ? "Expiry Date" : "تاريخ الانتهاء"}:
                        </span>
                        <time className="font-bold">
                          {formatDate(record.expiryDate, locale)}
                        </time>
                      </div>
                      {record.documentId && (
                        <button
                          onClick={() =>
                            void handlePreview(record.documentId!, record.title)
                          }
                          disabled={previewLoading}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1167c9] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                        >
                          <Eye size={14} />
                          {locale === "en"
                            ? "Direct Document View"
                            : "عرض الوثيقة المباشر"}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Direct Embedded Inline View Panel */}
            {inlinePreview && (
              <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-slate-900 text-white shadow-xl transition-all">
                <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800/90 px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <FileText size={18} className="text-blue-400" />
                    <div>
                      <h3 className="text-sm font-black">{inlinePreview.title}</h3>
                      <p className="text-xs text-slate-400">
                        {locale === "en" ? "Direct Document View" : "معاينة الوثيقة المباشرة"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setInlinePreview(null)}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-slate-700 hover:bg-slate-700 hover:text-white"
                    aria-label={locale === "en" ? "Close preview" : "إغلاق المعاينة"}
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="h-[500px] w-full bg-slate-950">
                  {inlinePreview.contentType.includes("image") ? (
                    <img
                      src={inlinePreview.url}
                      alt={inlinePreview.title}
                      className="mx-auto h-full max-h-full object-contain p-4"
                    />
                  ) : (
                    <iframe
                      src={inlinePreview.url}
                      title={inlinePreview.title}
                      className="h-full w-full border-0"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--border)] px-4 py-10 text-center">
            <p className="font-bold">
              {locale === "en"
                ? "No data available in this section"
                : "لا توجد بيانات في هذا القسم"}
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {locale === "en"
                ? "Records will appear here once added to the employee file."
                : "سيظهر السجل هنا بمجرد إضافته إلى ملف الموظف."}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
