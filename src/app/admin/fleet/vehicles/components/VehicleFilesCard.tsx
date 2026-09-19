"use client";

import { useEffect, useState } from "react";
import {
  getVehicleFiles,
  uploadVehicleFile,
  downloadVehicleFile,
  getVehicleFileVersions,
  renewVehicleOperationCard,
  getVehicleOperationCards,
} from "@/lib/fleet/api";
import { authPreviewBlob } from "@/lib/auth/api";
import {
  VehicleFileKind,
  VehicleRegistrationType,
  type VehicleAttachmentResponse,
  type VehicleAttachmentVersionResponse,
  type VehicleOperationCardRequest,
  type VehicleOperationCardResponse,
} from "@/lib/fleet/types";
import { formatVehicleFileKind, formatDate } from "@/lib/fleet/formatters";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { DateInput } from "@/components/ui/DateInput";
import { toast } from "@/components/ui/Toast";
import {
  FileText,
  UploadCloud,
  Download,
  History,
  FileCheck,
  Image as ImageIcon,
  AlertCircle,
  RefreshCw,
  Eye,
  Loader2,
  X,
  Edit3,
  CheckCircle2,
} from "lucide-react";


interface Props {
  vehicleId: string;
  registrationType?: VehicleRegistrationType | number | null;
  onComplianceUpdated?: () => void;
}

interface SlotItem {
  kind: VehicleFileKind;
  kindName: string;
  label: string;
  isPhoto: boolean;
  requiresPublicTransport: boolean;
}

const FILE_SLOTS: SlotItem[] = [
  { kind: VehicleFileKind.Istimara, kindName: "Istimara", label: "استمارة السير", isPhoto: false, requiresPublicTransport: false },
  { kind: VehicleFileKind.OperationCard, kindName: "OperationCard", label: "كرت التشغيل (النقل العام)", isPhoto: false, requiresPublicTransport: true },
  { kind: VehicleFileKind.FrontImage, kindName: "FrontImage", label: "صورة المقدمة (أمام)", isPhoto: true, requiresPublicTransport: false },
  { kind: VehicleFileKind.RearImage, kindName: "RearImage", label: "صورة المؤخرة (خلف)", isPhoto: true, requiresPublicTransport: false },
  { kind: VehicleFileKind.LeftImage, kindName: "LeftImage", label: "صورة الجانب الأيسر", isPhoto: true, requiresPublicTransport: false },
  { kind: VehicleFileKind.RightImage, kindName: "RightImage", label: "صورة الجانب الأيمن", isPhoto: true, requiresPublicTransport: false },
];

export function VehicleFilesCard({ vehicleId, registrationType, onComplianceUpdated }: Props) {
  const { can } = useAuth();
  const [files, setFiles] = useState<VehicleAttachmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingKind, setUploadingKind] = useState<string | null>(null);

  // Operation Card State & Modal
  const [currentOpCard, setCurrentOpCard] = useState<VehicleOperationCardResponse | null>(null);
  const [isOpCardModalOpen, setIsOpCardModalOpen] = useState(false);
  const [opCardFile, setOpCardFile] = useState<File | null>(null);
  const [submittingOpCard, setSubmittingOpCard] = useState(false);
  const [opCardForm, setOpCardForm] = useState<VehicleOperationCardRequest>({
    cardNumber: "",
    issuingAuthority: "الهيئة العامة للنقل",
    issueDate: new Date().toISOString().split("T")[0],
    expiryDate: "",
    notes: "",
  });

  // Version History Modal
  const [selectedAttachment, setSelectedAttachment] = useState<VehicleAttachmentResponse | null>(null);
  const [versions, setVersions] = useState<VehicleAttachmentVersionResponse[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Auto-loaded inline previews map
  const [previews, setPreviews] = useState<
    Record<string, { url: string; contentType: string; loading: boolean; error?: string }>
  >({});

  // Preview Modal State
  const [previewState, setPreviewState] = useState<{
    isOpen: boolean;
    title: string;
    loading: boolean;
    url: string | null;
    contentType: string | null;
    error: string | null;
    attachmentId: string | null;
  }>({
    isOpen: false,
    title: "",
    loading: false,
    url: null,
    contentType: null,
    error: null,
    attachmentId: null,
  });

  const isPublicTransport =
    registrationType === VehicleRegistrationType.PublicTransport ||
    registrationType === VehicleRegistrationType.PublicBus ||
    Number(registrationType) === VehicleRegistrationType.PublicTransport ||
    Number(registrationType) === VehicleRegistrationType.PublicBus;

  const loadFiles = async () => {
    if (!can("fleet.files.read")) return;
    setLoading(true);
    try {
      const data = await getVehicleFiles(vehicleId);
      setFiles(data || []);
    } catch (e) {
      console.error("Failed to load vehicle files:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadOpCard = async () => {
    if (!vehicleId) return;
    try {
      const res = await getVehicleOperationCards(vehicleId);
      if (res && res.length > 0) {
        const current = res.find((c) => c.isCurrent) || res[0];
        setCurrentOpCard(current);
        setOpCardForm({
          cardNumber: current.cardNumber || "",
          issuingAuthority: current.issuingAuthority || "الهيئة العامة للنقل",
          issueDate: current.issueDate ? current.issueDate.split("T")[0] : new Date().toISOString().split("T")[0],
          expiryDate: current.expiryDate ? current.expiryDate.split("T")[0] : "",
          notes: current.notes || "",
        });
      }
    } catch (e) {
      console.error("Failed to load operation cards:", e);
    }
  };

  const handleOpCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opCardForm.cardNumber.trim()) {
      toast.error("خطأ في البيانات", "يرجى إدخال رقم كرت التشغيل");
      return;
    }
    if (!opCardForm.issueDate || !opCardForm.expiryDate) {
      toast.error("خطأ في البيانات", "يرجى اختيار تاريخ البداية وتاريخ الانتهاء");
      return;
    }
    if (opCardFile && opCardFile.size > 10 * 1024 * 1024) {
      toast.error("الملف كبير جداً", "الحجم الأقصى المسموح به للملف هو 10 ميجابايت.");
      return;
    }

    setSubmittingOpCard(true);
    try {
      await renewVehicleOperationCard(vehicleId, {
        cardNumber: opCardForm.cardNumber.trim(),
        issuingAuthority: opCardForm.issuingAuthority?.trim() || null,
        issueDate: opCardForm.issueDate,
        expiryDate: opCardForm.expiryDate,
        notes: opCardForm.notes?.trim() || null,
      });

      if (opCardFile) {
        const formData = new FormData();
        formData.append("file", opCardFile);
        await uploadVehicleFile(vehicleId, "OperationCard", formData);
      }

      toast.success("تم بنجاح", "تم حفظ بيانات كرت التشغيل وتحديث الملف بنجاح.");
      setIsOpCardModalOpen(false);
      setOpCardFile(null);
      setPreviews({});
      await loadFiles();
      await loadOpCard();
      onComplianceUpdated?.();
    } catch (err: any) {
      console.error("Failed to update operation card:", err);
      toast.error("فشل التحديث", err?.message || "حدث خطأ أثناء حفظ بيانات كرت التشغيل.");
    } finally {
      setSubmittingOpCard(false);
    }
  };

  useEffect(() => {
    if (vehicleId) {
      loadFiles();
      if (isPublicTransport) {
        loadOpCard();
      }
    }
  }, [vehicleId, isPublicTransport]);

  useEffect(() => {
    if (!files || !files.length) return;
    files.forEach((att) => {
      if (att && !previews[att.id]) {
        setPreviews((prev) => ({
          ...prev,
          [att.id]: { url: "", contentType: "", loading: true },
        }));
        const path = `/api/vehicles/${vehicleId}/files/${att.id}/download`;
        authPreviewBlob(path)
          .then((res) => {
            setPreviews((prev) => ({
              ...prev,
              [att.id]: { url: res.url, contentType: res.contentType, loading: false },
            }));
          })
          .catch((e: any) => {
            setPreviews((prev) => ({
              ...prev,
              [att.id]: {
                url: "",
                contentType: "",
                loading: false,
                error: e?.message || "Error",
              },
            }));
          });
      }
    });
  }, [files, vehicleId]);

  const handleFileUpload = async (slot: SlotItem, file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("الملف كبير جداً", "الحجم الأقصى المسموح به للملف هو 10 ميجابايت.");
      return;
    }

    if (slot.isPhoto && !file.type.startsWith("image/")) {
      toast.error("نوع الملف غير صحيح", "يجب أن تكون الصور بصيغة صورة (image/*).");
      return;
    }

    setUploadingKind(slot.kindName);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await uploadVehicleFile(vehicleId, slot.kindName, formData);
      setPreviews({});
      await loadFiles();
    } catch (e: any) {
      console.error(e);
      toast.error("فشل الرفع", e?.message || "حدث خطأ أثناء رفع الملف.");
    } finally {
      setUploadingKind(null);
    }
  };

  const handleDownload = async (attachmentId: string, versionId?: string) => {
    try {
      await downloadVehicleFile(vehicleId, attachmentId, versionId);
    } catch (e: any) {
      console.error(e);
      toast.error("فشل التنزيل", e?.message || "تعذر تنزيل الملف.");
    }
  };

  const handleOpenPreview = async (att: VehicleAttachmentResponse, versionId?: string) => {
    const title = `معاينة: ${att.originalFileName || att.displayName || formatVehicleFileKind(att.kind)}`;
    setPreviewState({
      isOpen: true,
      title,
      loading: true,
      url: null,
      contentType: null,
      error: null,
      attachmentId: att.id,
    });

    try {
      const path = `/api/vehicles/${vehicleId}/files/${att.id}/download${versionId ? `?versionId=${versionId}` : ""}`;
      const res = await authPreviewBlob(path);
      setPreviewState({
        isOpen: true,
        title,
        loading: false,
        url: res.url,
        contentType: res.contentType,
        error: null,
        attachmentId: att.id,
      });
    } catch (e: any) {
      console.error("Preview error:", e);
      setPreviewState((prev) => ({
        ...prev,
        loading: false,
        error: e?.message || "تعذر تحميل معاينة المستند.",
      }));
    }
  };

  const handleClosePreview = () => {
    if (previewState.url) {
      URL.revokeObjectURL(previewState.url);
    }
    setPreviewState({
      isOpen: false,
      title: "",
      loading: false,
      url: null,
      contentType: null,
      error: null,
      attachmentId: null,
    });
  };

  const handleOpenVersions = async (att: VehicleAttachmentResponse) => {
    setSelectedAttachment(att);
    setLoadingVersions(true);
    try {
      const res = await getVehicleFileVersions(vehicleId, att.id);
      setVersions(res || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingVersions(false);
    }
  };

  const getAttachmentForKind = (kind: VehicleFileKind) => {
    return files.find((f) => Number(f.kind) === Number(kind));
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className="p-0 overflow-hidden">
      <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#1167c9]" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200">ملفات ووثائق المركبة</h3>
        </div>
        <Button variant="ghost" onClick={loadFiles} disabled={loading} className="px-2 py-1 h-auto text-xs gap-1">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> تحديث
        </Button>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FILE_SLOTS.map((slot) => {
          const att = getAttachmentForKind(slot.kind);
          const isDisabledSlot = slot.requiresPublicTransport && !isPublicTransport;
          const isUploading = uploadingKind === slot.kindName;

          return (
            <div
              key={slot.kindName}
              className={`relative flex flex-col justify-between rounded-xl border p-4 transition-all ${
                isDisabledSlot
                  ? "border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30 opacity-60"
                  : att
                  ? "border-emerald-200 bg-emerald-50/20 dark:border-emerald-900/30 dark:bg-emerald-950/10"
                  : "border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-[#1167c9]"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {slot.isPhoto ? (
                      <ImageIcon className="h-4 w-4 text-purple-600" />
                    ) : (
                      <FileCheck className="h-4 w-4 text-[#1167c9]" />
                    )}
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{slot.label}</span>
                  </div>
                  {att ? (
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] px-1.5 py-0.5">
                      مرفوع (v{att.currentVersionNumber || 1})
                    </Badge>
                  ) : isDisabledSlot ? (
                    <Badge className="bg-slate-200 text-slate-600 text-[10px] px-1.5 py-0.5">غير مطلوب</Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5">غير مضاف</Badge>
                  )}
                </div>

                {att ? (
                  <div className="space-y-1 text-xs text-slate-500 mt-2">
                    <div className="font-mono text-slate-700 dark:text-slate-300 truncate" title={att.originalFileName || att.displayName || ""}>
                      {att.originalFileName || att.displayName || "مستند مرفوع"}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span>{formatFileSize(att.fileSizeBytes)}</span>
                      {att.currentUploadAtUtc && <span>{new Date(att.currentUploadAtUtc).toLocaleDateString("ar-SA")}</span>}
                    </div>
                  </div>
                ) : isDisabledSlot ? (
                  <p className="text-xs text-slate-400 mt-2">متاح فقط لمركبات النقل العام.</p>
                ) : (
                  <p className="text-xs text-slate-400 mt-2">لم يتم رفع هذا الملف بعد.</p>
                )}

                {/* Inline Embedded File Preview Container */}
                {att ? (
                  <div className="mt-3 relative rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950/5 dark:bg-slate-900/40 h-52 flex items-center justify-center overflow-hidden">
                    {previews[att.id]?.loading ? (
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin text-[#1167c9]" />
                        <span>جارٍ تحميل المعاينة...</span>
                      </div>
                    ) : previews[att.id]?.url ? (
                      previews[att.id].contentType?.startsWith("image/") ? (
                        <img
                          src={previews[att.id].url}
                          alt={slot.label}
                          className="max-h-full w-auto object-contain p-1 rounded-lg"
                        />
                      ) : previews[att.id].contentType?.includes("pdf") ? (
                        <iframe
                          src={previews[att.id].url}
                          title={slot.label}
                          className="w-full h-full border-0 rounded-lg bg-white"
                        />
                      ) : (
                        <div className="text-center p-4 text-xs text-slate-500 font-bold">
                          <FileText className="h-8 w-8 mx-auto text-slate-400 mb-1" />
                          المعاينة غير مدعومة لهذا الملف
                        </div>
                      )
                    ) : (
                      <div className="text-center p-4 text-xs text-slate-400 font-semibold">
                        <FileText className="h-8 w-8 mx-auto text-slate-300 mb-1" />
                        تعذر تحميل المعاينة
                      </div>
                    )}
                  </div>
                ) : !isDisabledSlot ? (
                  <div className="mt-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 h-28 flex flex-col items-center justify-center text-slate-400 text-xs gap-1">
                    <UploadCloud className="h-6 w-6 text-slate-300 mb-0.5" />
                    <span>لم يتم رفع الملف بعد</span>
                  </div>
                ) : null}

                {/* Operation Card Details Card in Slot */}
                {slot.kind === VehicleFileKind.OperationCard && isPublicTransport && currentOpCard && (
                  <div className="mt-3 p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400">رقم الكرت:</span>
                      <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">{currentOpCard.cardNumber}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400">تاريخ البداية (الإصدار):</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300 font-mono" dir="ltr">{formatDate(currentOpCard.issueDate)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400">تاريخ النهاية (الانتهاء):</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{formatDate(currentOpCard.expiryDate)}</span>
                    </div>
                    {currentOpCard.issuingAuthority && (
                      <div className="flex justify-between items-center text-[11px] text-slate-400">
                        <span>جهة الإصدار:</span>
                        <span>{currentOpCard.issuingAuthority}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2">
                {can("fleet.files.upload") && !isDisabledSlot && (
                  slot.kind === VehicleFileKind.OperationCard ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <label className={`cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                        isUploading || submittingOpCard
                          ? "opacity-50 pointer-events-none"
                          : "bg-[#1167c9] text-white hover:bg-[#0e56a8] border-transparent shadow-sm"
                      }`}>
                        <UploadCloud className="h-3.5 w-3.5" />
                        <span>{submittingOpCard ? "جارٍ الحفظ..." : att ? "استبدال الملف والبيانات" : "رفع الملف والبيانات"}</span>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          disabled={isUploading || submittingOpCard}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              setOpCardFile(f);
                              setIsOpCardModalOpen(true);
                              e.target.value = "";
                            }
                          }}
                        />
                      </label>
                      <Button
                        variant="secondary"
                        className="text-xs px-2.5 py-1.5 h-auto min-h-0 gap-1 text-slate-600 dark:text-slate-300 hover:text-indigo-600 border-slate-200 dark:border-slate-700"
                        onClick={() => setIsOpCardModalOpen(true)}
                        title="تعديل أرقام وتواريخ كرت التشغيل"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>تعديل البيانات</span>
                      </Button>
                    </div>
                  ) : (
                    <label className={`cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                      isUploading
                        ? "opacity-50 pointer-events-none"
                        : "bg-[#1167c9] text-white hover:bg-[#0e56a8] border-transparent shadow-sm"
                    }`}>
                      <UploadCloud className="h-3.5 w-3.5" />
                      <span>{isUploading ? "جارٍ الرفع..." : att ? "استبدال" : "رفع ملف"}</span>
                      <input
                        type="file"
                        className="hidden"
                        accept={slot.isPhoto ? "image/*" : ".pdf,.jpg,.jpeg,.png"}
                        disabled={isUploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileUpload(slot, f);
                        }}
                      />
                    </label>
                  )
                )}

                {att && (
                  <div className="flex items-center gap-1">
                    {can("fleet.files.download") && (
                      <Button
                        variant="ghost"
                        className="px-2 py-1 h-auto min-h-0 text-xs text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        onClick={() => handleOpenPreview(att)}
                        title="معاينة مباشرة (Live View)"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {can("fleet.files.download") && (
                      <Button
                        variant="ghost"
                        className="px-2 py-1 h-auto min-h-0 text-xs text-slate-600 hover:text-[#1167c9]"
                        onClick={() => handleDownload(att.id)}
                        title="تحميل الملف"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {can("fleet.files.read") && (
                      <Button
                        variant="ghost"
                        className="px-2 py-1 h-auto min-h-0 text-xs text-slate-600 hover:text-purple-600"
                        onClick={() => handleOpenVersions(att)}
                        title="سجل النسخ السابقة"
                      >
                        <History className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Preview Modal */}
      {previewState.isOpen && (
        <Modal
          isOpen={previewState.isOpen}
          onClose={handleClosePreview}
          title={previewState.title}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-4 pt-2">
            {previewState.loading ? (
              <div className="flex h-80 items-center justify-center text-slate-500 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-[#1167c9]" />
                <span className="text-sm font-semibold">جارٍ تحميل المعاينة المباشرة...</span>
              </div>
            ) : previewState.error ? (
              <div className="p-8 text-center text-red-600">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-semibold">{previewState.error}</p>
              </div>
            ) : previewState.url ? (
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900/5 dark:bg-slate-900/40 flex items-center justify-center min-h-[400px]">
                {previewState.contentType?.startsWith("image/") ? (
                  <img
                    src={previewState.url}
                    alt={previewState.title}
                    className="max-h-[70vh] object-contain rounded-lg shadow-sm"
                  />
                ) : previewState.contentType?.includes("pdf") ? (
                  <iframe
                    src={previewState.url}
                    className="w-full h-[70vh] rounded-lg border-0"
                    title={previewState.title}
                  />
                ) : (
                  <div className="text-center p-8">
                    <FileText className="h-12 w-12 mx-auto text-slate-400 mb-3" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                      تتوفر المعاينة للصور ومستندات PDF.
                    </p>
                    <a
                      href={previewState.url}
                      download
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#1167c9] text-white rounded-lg text-xs font-bold"
                    >
                      <Download className="h-4 w-4" /> تنزيل الملف
                    </a>
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              {previewState.url && (
                <a
                  href={previewState.url}
                  download
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
                >
                  <Download className="h-4 w-4" /> تنزيل الملف
                </a>
              )}
              <Button variant="secondary" onClick={handleClosePreview}>
                إغلاق
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Version History Modal */}
      {selectedAttachment && (
        <Modal
          isOpen={!!selectedAttachment}
          onClose={() => setSelectedAttachment(null)}
          title={`سجل نسخ: ${formatVehicleFileKind(selectedAttachment.kind)}`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 pt-2">
            {loadingVersions ? (
              <div className="p-8 text-center text-sm text-slate-500">جارٍ جلب النسخ السابقة...</div>
            ) : versions.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">لا توجد نسخ سابقة لهذا المستند.</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {versions.map((ver) => (
                  <div key={ver.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-50 text-blue-700 text-xs font-mono">
                          الإصدار v{ver.versionNumber}
                        </Badge>
                        <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                          {ver.originalFileName}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                        <span>الحجم: {formatFileSize(ver.sizeBytes)}</span>
                        <span>التاريخ: {new Date(ver.uploadedAtUtc).toLocaleString("ar-SA")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {can("fleet.files.download") && (
                        <Button
                          variant="ghost"
                          className="gap-1 text-xs px-2 py-1 min-h-0 h-auto text-emerald-600 hover:bg-emerald-50"
                          onClick={() => handleOpenPreview(selectedAttachment, ver.id)}
                          title="معاينة الإصدار"
                        >
                          <Eye className="h-3.5 w-3.5" /> معاينة
                        </Button>
                      )}
                      {can("fleet.files.download") && (
                        <Button
                          variant="secondary"
                          className="gap-1 text-xs px-2.5 py-1 min-h-0 h-auto"
                          onClick={() => handleDownload(selectedAttachment.id, ver.id)}
                        >
                          <Download className="h-3 w-3" /> تنزيل
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setSelectedAttachment(null)}>
                إغلاق
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Operation Card Modal */}
      {isOpCardModalOpen && (
        <Modal
          isOpen={isOpCardModalOpen}
          onClose={() => {
            if (!submittingOpCard) {
              setIsOpCardModalOpen(false);
              setOpCardFile(null);
            }
          }}
          title="بيانات وملف كرت التشغيل (النقل العام)"
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleOpCardSubmit} className="space-y-4 pt-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                ملف كرت التشغيل (المستند)
              </label>
              {opCardFile ? (
                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20 p-3">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div className="truncate text-right">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {opCardFile.name}
                      </div>
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                        {(opCardFile.size / (1024 * 1024)).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer text-xs text-[#1167c9] hover:underline font-bold">
                      تغيير
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) setOpCardFile(f);
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setOpCardFile(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                      title="إزالة الملف"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <label className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 p-4 text-center cursor-pointer hover:border-[#1167c9] hover:bg-blue-50/30 transition-all">
                  <UploadCloud className="h-6 w-6 text-[#1167c9] mb-1" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    اضغط لاختيار ملف كرت التشغيل (PDF أو صورة)
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5">
                    (حد أقصى 10 ميجابايت - اختياري إذا كنت تقوم بتحديث البيانات فقط)
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setOpCardFile(f);
                    }}
                  />
                </label>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  رقم كرت التشغيل <span className="text-red-500">*</span>
                </label>
                <Input
                  value={opCardForm.cardNumber}
                  onChange={(e) => setOpCardForm({ ...opCardForm, cardNumber: e.target.value })}
                  placeholder="مثال: OPC-998877"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  تاريخ البداية (الإصدار) <span className="text-red-500">*</span>
                </label>
                <DateInput
                  value={opCardForm.issueDate}
                  onChange={(val) => setOpCardForm({ ...opCardForm, issueDate: val })}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  تاريخ النهاية (الانتهاء) <span className="text-red-500">*</span>
                </label>
                <DateInput
                  value={opCardForm.expiryDate}
                  onChange={(val) => setOpCardForm({ ...opCardForm, expiryDate: val })}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  جهة الإصدار
                </label>
                <Input
                  value={opCardForm.issuingAuthority || ""}
                  onChange={(e) => setOpCardForm({ ...opCardForm, issuingAuthority: e.target.value })}
                  placeholder="مثال: الهيئة العامة للنقل"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  ملاحظات
                </label>
                <Input
                  value={opCardForm.notes || ""}
                  onChange={(e) => setOpCardForm({ ...opCardForm, notes: e.target.value })}
                  placeholder="ملاحظات اختيارية..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsOpCardModalOpen(false);
                  setOpCardFile(null);
                }}
                disabled={submittingOpCard}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={submittingOpCard}
                className="bg-[#1167c9] hover:bg-[#0e56a8] text-white gap-2"
              >
                {submittingOpCard ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                <span>{submittingOpCard ? "جارٍ الحفظ والرفع..." : "حفظ وتأكيد كرت التشغيل"}</span>
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
}
