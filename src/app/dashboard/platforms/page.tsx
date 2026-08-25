"use client";

import { useEffect, useState, useTransition } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { translate } from "@/lib/i18n";
import {
  getPlatforms,
  createPlatform,
  updatePlatform,
  type PlatformResponse,
  type PlatformUpsertRequest,
} from "@/lib/platforms/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { toast } from "@/components/ui/Toast";
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Archive,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default function PlatformsPage() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);

  const [platforms, setPlatforms] = useState<PlatformResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<PlatformResponse | null>(null);

  // Form State
  const [formData, setFormData] = useState<PlatformUpsertRequest>({
    code: "",
    nameAr: "",
    nameEn: "",
    status: "Active",
    supportedPaymentModels: ["PayPerOrder", "Salary"],
    notes: "",
    archiveReason: "",
    rowVersion: null,
  });

  // Archive Modal State
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archivingPlatform, setArchivingPlatform] = useState<PlatformResponse | null>(null);
  const [archiveReasonInput, setArchiveReasonInput] = useState("");

  const fetchPlatformsData = async () => {
    setLoading(true);
    try {
      const data = await getPlatforms(includeArchived);
      setPlatforms(data);
    } catch (err: any) {
      console.error("Failed to load platforms", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (can("platform_accounts.read")) {
      fetchPlatformsData();
    }
  }, [includeArchived]);

  if (!can("platform_accounts.read")) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-bold text-slate-800">
          {t("common.error")}
        </h2>
        <p className="text-slate-500">
          عفواً، لا تملك صلاحية قراءة المنصات (platform_accounts.read).
        </p>
      </div>
    );
  }

  const filteredPlatforms = platforms.filter((p) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    return (
      p.code?.toLowerCase().includes(term) ||
      p.nameAr?.toLowerCase().includes(term) ||
      p.nameEn?.toLowerCase().includes(term) ||
      p.notes?.toLowerCase().includes(term)
    );
  });

  const handleOpenAddModal = () => {
    setEditingPlatform(null);
    setFormData({
      code: "",
      nameAr: "",
      nameEn: "",
      status: "Active",
      supportedPaymentModels: ["PayPerOrder", "Salary"],
      notes: "",
      archiveReason: null,
      rowVersion: null,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (platform: PlatformResponse) => {
    setEditingPlatform(platform);
    setFormData({
      code: platform.code || "",
      nameAr: platform.nameAr || "",
      nameEn: platform.nameEn || "",
      status: platform.status || "Active",
      supportedPaymentModels: platform.supportedPaymentModels?.length
        ? platform.supportedPaymentModels
        : ["PayPerOrder"],
      notes: platform.notes || "",
      archiveReason: null,
      rowVersion: platform.rowVersion,
    });
    setIsModalOpen(true);
  };

  const handleOpenArchiveModal = (platform: PlatformResponse) => {
    setArchivingPlatform(platform);
    setArchiveReasonInput("");
    setIsArchiveModalOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.nameAr || !formData.nameEn) {
      toast.error("خطأ في المدخلات", "يرجى تعبئة جميع الحقول الإلزامية (الرمز والاسم بالعربية والإنجليزية).");
      return;
    }

    if (!formData.supportedPaymentModels || formData.supportedPaymentModels.length === 0) {
      toast.error("خطأ في المدخلات", "يرجى تحديد نموذج دفع واحد على الأقل للمنصة.");
      return;
    }

    startTransition(async () => {
      try {
        if (editingPlatform) {
          await updatePlatform(editingPlatform.id, {
            ...formData,
            rowVersion: editingPlatform.rowVersion,
          });
        } else {
          await createPlatform(formData);
        }
        setIsModalOpen(false);
        fetchPlatformsData();
      } catch (err: any) {
        // Error toast handled automatically by authFetch
      }
    });
  };

  const handleConfirmArchive = () => {
    if (!archivingPlatform) return;
    if (!archiveReasonInput.trim()) {
      toast.error("خطأ", "يرجى كتابة سبب الأرشفة.");
      return;
    }

    startTransition(async () => {
      try {
        await updatePlatform(archivingPlatform.id, {
          code: archivingPlatform.code,
          nameAr: archivingPlatform.nameAr,
          nameEn: archivingPlatform.nameEn,
          status: "Archived",
          supportedPaymentModels: archivingPlatform.supportedPaymentModels || ["PayPerOrder"],
          notes: archivingPlatform.notes,
          archiveReason: archiveReasonInput.trim(),
          rowVersion: archivingPlatform.rowVersion,
        });
        setIsArchiveModalOpen(false);
        fetchPlatformsData();
      } catch (err: any) {
        // Error handled automatically
      }
    });
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            نشط
          </Badge>
        );
      case "Disabled":
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
            <XCircle className="h-3 w-3" />
            معطل
          </Badge>
        );
      case "Archived":
        return (
          <Badge className="bg-slate-100 text-slate-600 border-slate-300 gap-1">
            <Archive className="h-3 w-3" />
            مؤرشف
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Layers className="h-7 w-7 text-[#1167c9]" />
            {t("platforms.platformsList")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            إدارة منصات التوصيل وتكوينات الربط الخاصة بالحسابات والمناديب
          </p>
        </div>

        {can("platform_accounts.manage") && (
          <Button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-[#1167c9] hover:bg-[#0e56a8]"
          >
            <Plus className="h-4 w-4" />
            {t("platforms.newPlatform")}
          </Button>
        )}
      </div>

      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("platforms.searchPlaceholder")}
            className="pr-10"
          />
        </div>

        <div className="flex items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--foreground)]">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--border)] text-[#1167c9] focus:ring-[#1167c9]"
            />
            {t("platforms.includeArchived")}
          </label>

          <Button
            variant="secondary"
            onClick={fetchPlatformsData}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        {loading ? (
          <div className="space-y-4 p-6">
            <div className="h-8 animate-pulse rounded-lg bg-[var(--subtle-bg)]" />
            <div className="h-12 animate-pulse rounded-lg bg-[var(--subtle-bg)]" />
            <div className="h-12 animate-pulse rounded-lg bg-[var(--subtle-bg)]" />
          </div>
        ) : filteredPlatforms.length === 0 ? (
          <div className="py-12 text-center text-[var(--muted)]">
            <Layers className="mx-auto mb-3 h-10 w-10 opacity-40" />
            <p className="font-semibold">لا توجد منصات مطابقة للبحث</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-[var(--subtle-bg)] text-xs font-bold uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-6 py-4">{t("platforms.platformCode")}</th>
                  <th className="px-6 py-4">{t("platforms.nameAr")}</th>
                  <th className="px-6 py-4">{t("platforms.nameEn")}</th>
                  <th className="px-6 py-4">{t("platforms.supportedPaymentModels")}</th>
                  <th className="px-6 py-4">{t("platforms.status")}</th>
                  <th className="px-6 py-4">{t("platforms.notes")}</th>
                  {can("platform_accounts.manage") && (
                    <th className="px-6 py-4 text-center">{t("common.actions")}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredPlatforms.map((platform) => (
                  <tr
                    key={platform.id}
                    className="transition-colors hover:bg-blue-500/5"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-[var(--foreground)]">
                      {platform.code}
                    </td>
                    <td className="px-6 py-4 font-medium text-[var(--foreground)]">
                      {platform.nameAr}
                    </td>
                    <td className="px-6 py-4 text-[var(--muted)]">
                      {platform.nameEn}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(platform.supportedPaymentModels || []).map((m) => (
                          <Badge
                            key={m}
                            className={
                              m === "Salary"
                                ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/50 font-semibold"
                                : "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50 font-semibold"
                            }
                          >
                            {m === "PayPerOrder" ? t("platforms.payPerOrder") : m === "Salary" ? t("platforms.salary") : m}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {renderStatusBadge(platform.status)}
                    </td>
                    <td className="px-6 py-4 text-xs text-[var(--muted)] max-w-xs truncate">
                      {platform.notes || "—"}
                    </td>
                    {can("platform_accounts.manage") && (
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEditModal(platform)}
                            title={t("common.edit")}
                            className="rounded-lg p-2 text-[var(--muted)] hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-[#1167c9] dark:hover:text-blue-400"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          {platform.status !== "Archived" && (
                            <button
                              onClick={() => handleOpenArchiveModal(platform)}
                              title={t("platforms.archivePlatform")}
                              className="rounded-lg p-2 text-[var(--muted)] hover:bg-red-50 dark:hover:bg-red-950/60 hover:text-red-600 dark:hover:text-red-400"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upsert Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlatform ? t("platforms.editPlatform") : t("platforms.newPlatform")}
      >
        <form onSubmit={handleSubmitForm} className="space-y-4 pt-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              {t("platforms.platformCode")} <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="مثال: KEETA"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                {t("platforms.nameAr")} <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.nameAr}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                placeholder="كيتا"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                {t("platforms.nameEn")} <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.nameEn}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                placeholder="Keeta"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              {t("platforms.supportedPaymentModels")} <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-6 rounded-xl border border-slate-200 p-3 bg-slate-50/50">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.supportedPaymentModels.includes("PayPerOrder")}
                  onChange={(e) => {
                    const updated = e.target.checked
                      ? [...formData.supportedPaymentModels, "PayPerOrder"]
                      : formData.supportedPaymentModels.filter((m) => m !== "PayPerOrder");
                    setFormData({ ...formData, supportedPaymentModels: updated });
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-[#1167c9] focus:ring-[#1167c9]"
                />
                {t("platforms.payPerOrder")}
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.supportedPaymentModels.includes("Salary")}
                  onChange={(e) => {
                    const updated = e.target.checked
                      ? [...formData.supportedPaymentModels, "Salary"]
                      : formData.supportedPaymentModels.filter((m) => m !== "Salary");
                    setFormData({ ...formData, supportedPaymentModels: updated });
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-[#1167c9] focus:ring-[#1167c9]"
                />
                {t("platforms.salary")}
              </label>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              {t("platforms.status")} <span className="text-red-500">*</span>
            </label>
            <SearchableSelect
              options={[
                { value: "Active", label: "Active (نشط)" },
                { value: "Disabled", label: "Disabled (معطل)" },
              ]}
              value={formData.status}
              onChange={(val) => setFormData({ ...formData, status: val })}
              placeholder="اختر الحالة..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              {t("platforms.notes")}
            </label>
            <textarea
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-[#1167c9] focus:outline-none"
              placeholder="أي ملاحظات تفصيلية..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-[#1167c9] hover:bg-[#0e56a8]"
            >
              {isPending ? t("common.loading") : t("common.save")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Archive Modal */}
      <Modal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        title={t("platforms.archivePlatform")}
      >
        <div className="space-y-4 pt-2">
          <div className="rounded-xl bg-amber-50 p-4 text-amber-800 text-sm">
            <p className="font-bold mb-1 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              تنبيه هام
            </p>
            لا يمكن أرشفة المنصة في حال كانت تحتوي على حسابات غير مؤرشفة.
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              {t("platforms.archiveReason")} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={archiveReasonInput}
              onChange={(e) => setArchiveReasonInput(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-red-500 focus:outline-none"
              placeholder="اكتب سبب الأرشفة..."
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsArchiveModalOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleConfirmArchive}
              disabled={isPending}
              variant="danger"
            >
              {isPending ? t("common.loading") : t("platforms.archivePlatform")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
