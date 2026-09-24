"use client";

import { useEffect, useState, use } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getVehicleCompleteHistory, getVehicleDetail } from "@/lib/fleet/api";
import type { CompleteHistoryResponse, VehicleDetailResponse } from "@/lib/fleet/types";
import { CompleteHistoryTimeline } from "@/components/history/CompleteHistoryTimeline";
import type { AuthApiError } from "@/lib/auth/types";

export default function VehicleCompleteHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const vehicleId = resolvedParams.id;
  const router = useRouter();
  const { can, locale } = useAuth();
  const isEn = locale === "en";

  const [historyData, setHistoryData] = useState<CompleteHistoryResponse | null>(null);
  const [vehicle, setVehicle] = useState<VehicleDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);

  const loadData = async () => {
    if (!vehicleId) return;
    setLoading(true);
    setError(null);
    setErrorStatus(null);
    setErrorDetails(null);

    // Initial permission check
    if (!can("fleet.vehicles.read")) {
      setErrorStatus(403);
      setError(
        isEn
          ? "Permission fleet.vehicles.read is required to view this vehicle timeline."
          : "صلاحية قراءة المركبات (fleet.vehicles.read) مطلوبة لعرض الجدول الزمني."
      );
      setLoading(false);
      return;
    }

    try {
      // Fetch vehicle detail for asset number / breadcrumbs if available
      getVehicleDetail(vehicleId)
        .then(setVehicle)
        .catch(() => null);

      const history = await getVehicleCompleteHistory(vehicleId);
      setHistoryData(history);
    } catch (err: any) {
      console.error("Failed to load vehicle complete history:", err);
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
  }, [vehicleId, locale]);

  return (
    <div className="space-y-6">
      <CompleteHistoryTimeline
        data={historyData}
        loading={loading}
        error={error}
        errorStatus={errorStatus}
        errorDetails={errorDetails}
        onRefresh={loadData}
        subjectType="vehicle"
        subjectId={vehicleId}
        vehicleInfo={{
          plateNumber: vehicle?.summary.plateNumberAr || vehicle?.summary.plateNumberEn || null,
          serialNumber: vehicle?.serialNumber || null,
        }}
        backHref={`/admin/fleet/vehicles/${vehicleId}`}
        backLabel={
          vehicle
            ? isEn
              ? `Back to Vehicle (${[vehicle.summary.plateNumberAr || vehicle.summary.plateNumberEn, vehicle.serialNumber].filter(Boolean).join(" · ")})`
              : `العودة إلى المركبة (${[vehicle.summary.plateNumberAr || vehicle.summary.plateNumberEn ? `اللوحة: ${vehicle.summary.plateNumberAr || vehicle.summary.plateNumberEn}` : "", vehicle.serialNumber ? `تسلسلي: ${vehicle.serialNumber}` : ""].filter(Boolean).join(" · ")})`
            : isEn
            ? "Back to Vehicle Details"
            : "العودة إلى تفاصيل المركبة"
        }
        locale={locale}
      />
    </div>
  );
}
