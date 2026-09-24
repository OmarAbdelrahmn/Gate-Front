"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getEmployee } from "@/lib/workforce/api";
import { getRiderCompleteHistory } from "@/lib/fleet/api";
import type { EmployeeDetails } from "@/lib/workforce/types";
import type { CompleteHistoryResponse } from "@/lib/fleet/types";
import { CompleteHistoryTimeline } from "@/components/history/CompleteHistoryTimeline";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowRight, UserCheck, AlertCircle } from "lucide-react";
import type { AuthApiError } from "@/lib/auth/types";

export default function EmployeeCompleteHistoryPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const resolvedParams = use(params);
  const employeeId = resolvedParams.employeeId;
  const { can, locale } = useAuth();
  const isEn = locale === "en";

  const [details, setDetails] = useState<EmployeeDetails | null>(null);
  const [historyData, setHistoryData] = useState<CompleteHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [isNotRider, setIsNotRider] = useState(false);

  const loadData = async () => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);
    setErrorStatus(null);
    setErrorDetails(null);
    setIsNotRider(false);

    try {
      // 1. Fetch employee details to locate riderProfileId
      let empDetails: EmployeeDetails | null = null;
      try {
        empDetails = await getEmployee(employeeId);
        setDetails(empDetails);
      } catch (err: any) {
        // If employee endpoint fails or 404, the ID might already be a riderProfileId
        console.warn("Could not load employee details, checking direct rider history...", err);
      }

      const targetRiderId =
        empDetails?.rider?.id ||
        empDetails?.employee.riderProfileId ||
        employeeId;

      // If employee exists but has no rider profile associated and role is not rider
      if (empDetails && !empDetails.rider?.id && !empDetails.employee.riderProfileId && empDetails.employee.operationalWorkTypeAr !== "مندوب") {
        // Still attempt fetching in case backend can resolve it by employeeId
        try {
          const history = await getRiderCompleteHistory(targetRiderId);
          setHistoryData(history);
          return;
        } catch (riderErr: any) {
          if (riderErr?.status === 404) {
            setIsNotRider(true);
            return;
          }
          throw riderErr;
        }
      }

      // 2. Fetch Complete History for Rider
      const history = await getRiderCompleteHistory(targetRiderId);
      setHistoryData(history);
    } catch (err: any) {
      console.error("Failed to load rider complete history:", err);
      const status = err?.status || (err as AuthApiError)?.status || 500;
      setErrorStatus(status);
      setError(err?.message || (isEn ? "Failed to load complete history" : "تعذر تحميل سجل الأحداث الكامل"));
      setErrorDetails(err?.details || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [employeeId, locale]);

  const displayName =
    locale === "en"
      ? details?.employee.fullNameEn || details?.employee.fullNameAr
      : details?.employee.fullNameAr || details?.employee.fullNameEn;

  if (isNotRider) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-8">
        <Link
          href={`/admin/employees/${employeeId}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-[#1167c9]"
        >
          <ArrowRight className="size-4" />
          <span>{isEn ? "Back to Employee Profile" : "العودة إلى ملف الموظف"}</span>
        </Link>

        <Card className="p-8 text-center border-slate-200 dark:border-slate-800">
          <div className="size-16 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center mb-4">
            <UserCheck className="size-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {isEn ? "Not a Rider Profile" : "الموظف ليس لديه ملف مندوب (Rider Profile)"}
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)] max-w-md mx-auto">
            {isEn
              ? `The complete event timeline is available for riders and fleet vehicles. ${displayName || "This employee"} does not have an active rider profile.`
              : `سجل الأحداث الكامل متاح للمناديب ومركبات الأسطول. الموظف (${displayName || employeeId}) ليس لديه ملف مندوب تشغيلي مرتبط.`}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href={`/admin/employees/${employeeId}`}>
              <Button>{isEn ? "Back to Employee Profile" : "العودة إلى ملف الموظف"}</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CompleteHistoryTimeline
        data={historyData}
        loading={loading}
        error={error}
        errorStatus={errorStatus}
        errorDetails={errorDetails}
        onRefresh={loadData}
        subjectType="rider"
        subjectId={employeeId}
        backHref={`/admin/employees/${employeeId}`}
        backLabel={
          displayName
            ? isEn
              ? `Back to ${displayName}`
              : `العودة إلى ملف (${displayName})`
            : isEn
            ? "Back to Employee Profile"
            : "العودة إلى ملف الموظف"
        }
        locale={locale}
      />
    </div>
  );
}
