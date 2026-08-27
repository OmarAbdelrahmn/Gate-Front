"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Building2,
  Edit,
  Eye,
  Plus,
  Search,
  MapPin,
  Phone,
  X,
} from "lucide-react";
import {
  archiveSponsor,
  listSponsors,
  type Sponsor,
} from "../../lib/workforce/api";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { systemPrompt } from "../ui/SystemDialog";
import { useAuth } from "../../lib/auth/AuthProvider";
import { translate } from "../../lib/i18n";
import { SponsorModal } from "../employees/SponsorModal";
import { SearchableSelect } from "../ui/SearchableSelect";

export function SponsorsView({ embedded = false }: { embedded?: boolean }) {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);

  const [items, setItems] = useState<Sponsor[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);

  // Detail drawer state
  const [viewingSponsor, setViewingSponsor] = useState<Sponsor | null>(null);

  const loadSponsors = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listSponsors();
      setItems(data);
    } catch {
      setError(
        locale === "en"
          ? "Failed to load sponsors or permission denied."
          : "تعذر تحميل الكفلاء أو لا تملك صلاحية عرضهم.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSponsors();
  }, [locale]);

  const results = useMemo(() => {
    return items.filter((x) => {
      const matchesSearch = `${x.registryNameAr} ${x.registryNameEn ?? ""} ${x.employerIdentityNumber} ${x.commercialRegistrationNumber ?? ""} ${x.unifiedNationalNumber ?? ""} ${x.contactPhone ?? ""} ${x.contactName ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || x.status === statusFilter;

      const matchesType =
        typeFilter === "all" || x.sponsorType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [items, search, statusFilter, typeFilter]);

  const handleCreate = () => {
    setEditingSponsor(null);
    setIsModalOpen(true);
  };

  const handleEdit = (sponsor: Sponsor) => {
    setEditingSponsor(sponsor);
    setIsModalOpen(true);
  };

  const handleArchive = async (sponsor: Sponsor) => {
    const reason = await systemPrompt(
      locale === "en" ? "Archival Reason" : "سبب الأرشفة",
    );
    if (!reason) return;

    try {
      await archiveSponsor(sponsor.id, {
        reason,
        rowVersion: sponsor.rowVersion,
      });
      void loadSponsors();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : locale === "en"
            ? "Archiving sponsor failed"
            : "تعذرت أرشفة الكفيل",
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      {!embedded ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-[#1167c9]">{t("nav.employees")}</p>
            <h1 className="mt-1 text-3xl font-black">{t("sponsors.title")}</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {locale === "en"
                ? "Information regarding corporate sponsors associated with employees & delegates."
                : "بيانات الجهات الكافلة المرتبطة بالإداريين والمناديب."}
            </p>
          </div>

          {can("sponsors.manage") && (
            <Button onClick={handleCreate} className="inline-flex items-center gap-2">
              <Plus size={18} />
              {locale === "en" ? "Add New Sponsor" : "إضافة كفيل جديد"}
            </Button>
          )}
        </div>
      ) : (
        can("sponsors.manage") && (
          <div className="flex justify-end">
            <Button onClick={handleCreate} className="inline-flex items-center gap-2">
              <Plus size={18} />
              {locale === "en" ? "Add New Sponsor" : "إضافة كفيل جديد"}
            </Button>
          </div>
        )
      )}

      {/* Main Content Card */}
      <Card className="overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 md:flex-row md:items-center md:justify-between">
          <label className="relative block w-full max-w-md">
            <Search
              className={`pointer-events-none absolute top-3 text-[var(--muted)] ${locale === "en" ? "left-3" : "right-3"}`}
              size={18}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                locale === "en"
                  ? "Search name, EIN (700), CR, phone..."
                  : "ابحث بالاسم، رقم المنشأة (700)، السجل، أو الجوال..."
              }
              className={`h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm ${locale === "en" ? "pl-10 pr-3" : "pr-10 pl-3"}`}
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <div className="w-44">
              <SearchableSelect
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { value: "all", label: locale === "en" ? "All Types" : "جميع الأنواع" },
                  { value: "Establishment", label: locale === "en" ? "Establishment" : "مؤسسة" },
                  { value: "Company", label: locale === "en" ? "Company" : "شركة" },
                  { value: "Individual", label: locale === "en" ? "Individual" : "فرد" },
                  { value: "Government", label: locale === "en" ? "Government" : "جهة حكومية" },
                ]}
                placeholder={locale === "en" ? "All Types" : "جميع الأنواع"}
              />
            </div>

            <div className="w-44">
              <SearchableSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "all", label: locale === "en" ? "All Statuses" : "جميع الحالات" },
                  { value: "Active", label: locale === "en" ? "Active" : "نشط" },
                  { value: "Inactive", label: locale === "en" ? "Inactive" : "غير نشط" },
                ]}
                placeholder={locale === "en" ? "All Statuses" : "جميع الحالات"}
              />
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {error ? (
          <p role="alert" className="p-6 text-red-700 font-bold">
            {error}
          </p>
        ) : loading ? (
          <p className="p-12 text-center text-sm text-[var(--muted)]">
            {t("common.loading")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] table-fixed">
              <thead className="bg-slate-500/10 text-xs text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-4 text-start">{t("sponsors.sponsorName")}</th>
                  <th className="px-5 py-4 text-start">{locale === "en" ? "EIN (700) / CR" : "رقم المنشأة / السجل"}</th>
                  <th className="px-5 py-4 text-start">{t("common.type")}</th>
                  <th className="px-5 py-4 text-start">{locale === "en" ? "Contact Person" : "جهة الاتصال"}</th>
                  <th className="px-5 py-4 text-start">{t("common.status")}</th>
                  <th className="px-5 py-4 text-start">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {results.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-4 text-start">
                      <span className="flex items-center gap-2 font-bold">
                        <Building2 size={17} className="text-[#1167c9] shrink-0" />
                        {locale === "en"
                          ? item.registryNameEn || item.registryNameAr
                          : item.registryNameAr}
                      </span>
                      {locale === "en" ? (
                        <span className="mt-0.5 block text-xs text-[var(--muted)]">
                          {item.registryNameAr}
                        </span>
                      ) : (
                        item.registryNameEn && (
                          <span className="mt-0.5 block text-xs text-[var(--muted)]">
                            {item.registryNameEn}
                          </span>
                        )
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm font-mono text-start">
                      <div>{item.employerIdentityNumber}</div>
                      {item.commercialRegistrationNumber && (
                        <div className="text-xs text-[var(--muted)]">
                          CR: {item.commercialRegistrationNumber}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-start">
                      <span className="inline-block rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-[#1167c9]">
                        {item.sponsorType === "Establishment"
                          ? locale === "en"
                            ? "Establishment"
                            : "مؤسسة"
                          : item.sponsorType === "Company"
                            ? locale === "en"
                              ? "Company"
                              : "شركة"
                            : item.sponsorType === "Individual"
                              ? locale === "en"
                                ? "Individual"
                                : "فرد"
                              : item.sponsorType}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-start">
                      {item.contactName ? (
                        <div>
                          <div className="font-bold">{item.contactName}</div>
                          {item.contactPhone && (
                            <div className="text-xs text-[var(--muted)] text-start">
                              <span dir="ltr">{item.contactPhone}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[var(--muted)]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-start">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          item.status === "Active"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {item.status === "Active"
                          ? t("common.active")
                          : locale === "en"
                            ? "Inactive"
                            : "غير نشط"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-start whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setViewingSponsor(item)}
                          className="flex size-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] hover:bg-slate-100 hover:text-[#1167c9]"
                          title={locale === "en" ? "View Details" : "عرض التفاصيل"}
                        >
                          <Eye size={15} />
                        </button>
                        {can("sponsors.manage") && (
                          <>
                            <button
                              onClick={() => handleEdit(item)}
                              className="flex size-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] hover:bg-slate-100 hover:text-[#1167c9]"
                              title={t("common.edit")}
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              onClick={() => void handleArchive(item)}
                              className="flex size-8 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600 hover:bg-red-100"
                              title={t("users.archived")}
                            >
                              <Archive size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!results.length && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-12 text-center text-sm text-[var(--muted)]"
                    >
                      {locale === "en"
                        ? "No matching sponsors found."
                        : "لا يوجد كفلاء مطابقون."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal for Create/Edit */}
      <SponsorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadSponsors}
        sponsor={editingSponsor}
      />

      {/* View Sponsor Detail Drawer */}
      {viewingSponsor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl my-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-[#1167c9]">
                  <Building2 size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black">
                    {locale === "en"
                      ? viewingSponsor.registryNameEn || viewingSponsor.registryNameAr
                      : viewingSponsor.registryNameAr}
                  </h2>
                  <p className="text-xs text-[var(--muted)]">
                    EIN (700): {viewingSponsor.employerIdentityNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingSponsor(null)}
                className="flex size-9 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--muted)] hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-6 text-sm text-start">
              {/* Core Details */}
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4">
                <div>
                  <p className="text-xs text-[var(--muted)]">{locale === "en" ? "Sponsor Type" : "نوع الكفيل"}</p>
                  <p className="font-bold">{viewingSponsor.sponsorType}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">{t("common.status")}</p>
                  <p className="font-bold">{viewingSponsor.status}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">{locale === "en" ? "CR Number" : "رقم السجل التجاري"}</p>
                  <p className="font-bold font-mono">{viewingSponsor.commercialRegistrationNumber ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">{locale === "en" ? "Unified National No." : "الرقم الوطني الموحد"}</p>
                  <p className="font-bold font-mono">{viewingSponsor.unifiedNationalNumber ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">{locale === "en" ? "Active From" : "تاريخ بداية التفعيل"}</p>
                  <p className="font-bold">{viewingSponsor.activeFrom ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">{locale === "en" ? "Active To" : "تاريخ نهاية التفعيل"}</p>
                  <p className="font-bold">{viewingSponsor.activeTo ?? "—"}</p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 font-black text-[#1167c9]">
                  <Phone size={16} />
                  {locale === "en" ? "Contact Information" : "معلومات التواصل"}
                </h4>
                <div className="grid grid-cols-2 gap-4 rounded-xl border p-4">
                  <div>
                    <p className="text-xs text-[var(--muted)]">{locale === "en" ? "Contact Name" : "اسم المسؤول"}</p>
                    <p className="font-bold">{viewingSponsor.contactName ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--muted)]">{locale === "en" ? "Phone" : "الجوال"}</p>
                    <p className="font-bold text-start"><span dir="ltr">{viewingSponsor.contactPhone ?? "—"}</span></p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-[var(--muted)]">{locale === "en" ? "Email" : "البريد الإلكتروني"}</p>
                    <p className="font-bold text-start"><span dir="ltr">{viewingSponsor.contactEmail ?? "—"}</span></p>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 font-black text-[#1167c9]">
                  <MapPin size={16} />
                  {locale === "en" ? "National Address" : "العنوان الوطني"}
                </h4>
                {viewingSponsor.address ? (
                  <div className="grid grid-cols-2 gap-3 rounded-xl border p-4">
                    <div>
                      <p className="text-xs text-[var(--muted)]">{locale === "en" ? "Building No." : "رقم المبنى"}</p>
                      <p className="font-bold">{viewingSponsor.address.buildingNumber ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted)]">{locale === "en" ? "Street" : "الشارع"}</p>
                      <p className="font-bold">{viewingSponsor.address.street ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted)]">{locale === "en" ? "District" : "الحي"}</p>
                      <p className="font-bold">{viewingSponsor.address.district ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted)]">{locale === "en" ? "City" : "المدينة"}</p>
                      <p className="font-bold">{viewingSponsor.address.city ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted)]">{locale === "en" ? "Postal Code" : "الرمز البريدي"}</p>
                      <p className="font-bold">{viewingSponsor.address.postalCode ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted)]">{locale === "en" ? "Additional No." : "الرقم الإضافي"}</p>
                      <p className="font-bold">{viewingSponsor.address.additionalNumber ?? "—"}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[var(--muted)]">{locale === "en" ? "No address specified." : "لم يتم تحديد عنوان."}</p>
                )}
              </div>

              {/* Notes */}
              {viewingSponsor.notes && (
                <div className="space-y-2 border-t pt-4">
                  <h4 className="font-black">{locale === "en" ? "Notes" : "ملاحظات"}</h4>
                  <p className="rounded-xl bg-slate-50 p-3 text-xs text-[var(--muted)]">
                    {viewingSponsor.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="secondary" onClick={() => setViewingSponsor(null)}>
                {locale === "en" ? "Close" : "إغلاق"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
