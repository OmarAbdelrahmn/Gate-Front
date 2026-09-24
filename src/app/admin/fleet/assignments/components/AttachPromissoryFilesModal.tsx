"use client";

import { useEffect, useRef, useState } from "react";
import { attachAssignmentPromissoryFiles, getVehicleAssignment } from "@/lib/fleet/api";
import { RiderVehicleAssignmentStatus, type RiderVehicleAssignmentResponse, type VehicleSummaryResponse } from "@/lib/fleet/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vehicle: VehicleSummaryResponse | null;
}

const MAX_FILES = 3;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"]);

export function AttachPromissoryFilesModal({ isOpen, onClose, onSuccess, vehicle }: Props) {
  const [assignment, setAssignment] = useState<RiderVehicleAssignmentResponse | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(Boolean(vehicle?.currentAssignmentId));
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKey = useRef<string | null>(null);
  const assignmentId = vehicle?.currentAssignmentId;

  useEffect(() => {
    if (!isOpen || !assignmentId) return;
    let cancelled = false;
    getVehicleAssignment(assignmentId)
      .then((result) => {
        if (!cancelled) setAssignment(result);
      })
      .catch((error) => {
        if (!cancelled) toast.error("تعذر تحميل العهدة", error instanceof Error ? error.message : "حاول مرة أخرى.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [isOpen, assignmentId]);

  const existingCount = assignment?.promissoryFileVersionIds?.length ?? 0;
  const slotsLeft = Math.max(0, MAX_FILES - existingCount);
  const isCurrent = Boolean(assignment && !assignment.endedAtUtc && assignment.status === RiderVehicleAssignmentStatus.Active && assignment.id === assignmentId);

  const addFiles = (selected: FileList | null) => {
    if (!selected) return;
    const valid = Array.from(selected).filter((file) => {
      if (!ALLOWED_TYPES.has(file.type) || file.size === 0 || file.size > MAX_FILE_BYTES) {
        toast.error("ملف غير صالح", `${file.name}: استخدم PDF أو صورة مدعومة بحجم لا يتجاوز 10 ميجابايت.`);
        return false;
      }
      return true;
    });
    if (files.length + valid.length > slotsLeft) {
      toast.error("تجاوز الحد", `يمكن إضافة ${Math.max(0, slotsLeft - files.length)} ملف فقط لهذه العهدة.`);
      return;
    }
    setFiles((current) => [...current, ...valid]);
    idempotencyKey.current = null;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isCurrent || !assignment || files.length === 0 || submitting) return;
    const body = new FormData();
    body.append("rowVersion", assignment.rowVersion);
    files.forEach((file) => body.append("promissoryFiles", file));
    idempotencyKey.current ??= crypto.randomUUID();
    setSubmitting(true);
    try {
      await attachAssignmentPromissoryFiles(assignment.id, body, idempotencyKey.current);
      idempotencyKey.current = null;
      onSuccess();
    } catch {
      // authFetch shows the server's specific error in a toast.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إرفاق سندات الأمر بالعهدة الحالية" maxWidth="max-w-xl">
      <form onSubmit={submit} className="space-y-4 pt-3">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          المركبة: <strong>{vehicle?.assetNumber || "—"}</strong> · المندوب: <strong>{vehicle?.currentRiderName || "—"}</strong>
        </p>
        {loading ? (
          <p className="text-sm text-slate-500">جارٍ تحميل العهدة...</p>
        ) : !isCurrent ? (
          <p role="alert" className="text-sm text-red-600">العهدة الحالية غير متاحة. حدّث الصفحة وحاول مرة أخرى.</p>
        ) : (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              سندات الأمر المرتبطة بالعهدة: {existingCount} من {MAX_FILES}. يمكنك إضافة {slotsLeft} ملف.
            </p>
            {slotsLeft > 0 && (
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                اختر سندات الأمر (PDF أو صورة، 10 ميجابايت لكل ملف)
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.bmp"
                  onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }}
                  disabled={submitting}
                  className="mt-2 block w-full rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700"
                />
              </label>
            )}
            {files.length > 0 && (
              <ul className="space-y-2 text-sm">
                {files.map((file, index) => (
                  <li key={`${file.name}-${index}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
                    <span className="truncate">{file.name}</span>
                    <button type="button" disabled={submitting} onClick={() => { setFiles((current) => current.filter((_, i) => i !== index)); idempotencyKey.current = null; }} className="ms-3 text-red-600">إزالة</button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>إلغاء</Button>
          <Button type="submit" disabled={!isCurrent || loading || submitting || files.length === 0}>
            {submitting ? "جارٍ الرفع..." : "إرفاق الملفات"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
