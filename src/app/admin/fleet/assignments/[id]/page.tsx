"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  getVehicleAssignment,
  getVehicleDetail,
} from "@/lib/fleet/api";
import {
  RiderVehicleAssignmentStatus,
  VehicleOperationalStatus,
  type RiderVehicleAssignmentResponse,
  type VehicleDetailResponse,
  type VehicleSummaryResponse,
} from "@/lib/fleet/types";
import { formatDate } from "@/lib/fleet/formatters";
import { listRiders } from "@/lib/workforce/api";
import { listExternalRiders } from "@/lib/workforce/external-riders-api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AssignmentPromissoryFiles } from "@/components/fleet/AssignmentPromissoryFiles";
import { ReturnVehicleModal } from "../components/ReturnVehicleModal";
import { SwitchVehicleModal } from "../components/SwitchVehicleModal";
import { RenewPermissionModal } from "../components/RenewPermissionModal";
import { AttachPromissoryFilesModal } from "../components/AttachPromissoryFilesModal";
import {
  ArrowRight,
  Car,
  User,
  Key,
  ShieldCheck,
  FileText,
  MapPin,
  ArrowLeftRight,
  CalendarClock,
  FileUp,
  ExternalLink,
  AlertTriangle,
  FileSpreadsheet,
} from "lucide-react";

type ActiveModal = "return" | "switch" | "renew" | "promissory" | null;

export default function AssignmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { can, locale } = useAuth();
  const id = params.id as string;
  const isEn = locale === "en";

  const [assignment, setAssignment] = useState<RiderVehicleAssignmentResponse | null>(null);
  const [vehicle, setVehicle] = useState<VehicleDetailResponse | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const assignData = await getVehicleAssignment(id);
      setAssignment(assignData);

      // Fetch vehicle details in parallel
      if (assignData?.vehicleId) {
        getVehicleDetail(assignData.vehicleId)
          .then(setVehicle)
          .catch((e) => console.warn("Failed to load vehicle details:", e));
      }

      // Resolve employee ID
      let resolvedEmpId = assignData?.employeeId || null;
      if (!resolvedEmpId && assignData?.riderProfileId) {
        try {
          const [ridersRes, extRidersRes] = await Promise.allSettled([
            listRiders(),
            listExternalRiders(),
          ]);
          const riders =
            ridersRes.status === "fulfilled" && Array.isArray(ridersRes.value)
              ? ridersRes.value
              : [];
          const extRiders =
            extRidersRes.status === "fulfilled" && Array.isArray(extRidersRes.value)
              ? extRidersRes.value
              : [];

          const matchedRider = riders.find(
            (r) => r.id === assignData.riderProfileId || r.employeeId === assignData.riderProfileId
          );
          const matchedExt = extRiders.find(
            (r) => r.riderProfileId === assignData.riderProfileId || r.employeeId === assignData.riderProfileId
          );
          resolvedEmpId = matchedRider?.employeeId || matchedExt?.employeeId || null;
        } catch (e) {
          console.warn("Failed to resolve employee ID:", e);
        }
      }
      setEmployeeId(resolvedEmpId);
    } catch (e: any) {
      console.error(e);
      setError(
        e?.message ||
          (isEn
            ? "Failed to load assignment details or record not found."
            : "تعذر تحميل تفاصيل العهدة أو السجل غير موجود.")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const isCompleted =
    assignment?.status === RiderVehicleAssignmentStatus.Completed ||
    assignment?.status === 2 ||
    Boolean(assignment?.endedAtUtc);
  const isActive = !isCompleted && assignment?.status !== RiderVehicleAssignmentStatus.Cancelled;

  const vehicleForModal: VehicleSummaryResponse | null = useMemo(() => {
    if (!assignment) return null;
    const v = vehicle?.summary;
    if (v) {
      return {
        ...v,
        currentAssignmentId: assignment.id,
        currentRiderProfileId: assignment.riderProfileId,
        currentRiderName: assignment.riderName,
        isRealRider: assignment.isRealRider,
        realRider: assignment.realRider,
        permitEndDate: assignment.permissionEndsOn || v.permitEndDate,
        rowVersion: assignment.rowVersion || v.rowVersion,
      };
    }
    return {
      id: assignment.vehicleId,
      assetNumber: assignment.assetNumber,
      serialNumber: assignment.assetNumber,
      currentAssignmentId: assignment.id,
      currentRiderProfileId: assignment.riderProfileId,
      currentRiderName: assignment.riderName,
      isRealRider: assignment.isRealRider,
      realRider: assignment.realRider,
      permitEndDate: assignment.permissionEndsOn,
      currentOdometer: assignment.startOdometer,
      operatingCity: assignment.vehicleOperatingCityNameAr,
      operatingCityId: assignment.vehicleOperatingCityId,
      status: VehicleOperationalStatus.Assigned,
      vehicleType: 1 as any,
      registrationType: 1 as any,
      isReadyForAssignment: false,
      rowVersion: assignment.rowVersion,
    };
  }, [assignment, vehicle]);

  if (!can("fleet.assignments.read") && !can("fleet.vehicles.read")) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
          <h2 className="mt-2 text-xl font-bold">صلاحية غير كافية</h2>
          <p className="text-slate-500 text-sm mt-1">
            لا تملك صلاحية عرض سجلات عهد المركبات.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-[var(--muted)]">
        جارٍ تحميل تفاصيل العهدة...
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="p-6 max-w-xl mx-auto space-y-4 mt-8">
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center space-y-3 dark:bg-red-950/20 dark:border-red-900/50"
        >
          <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-red-800 dark:text-red-200">
            {isEn ? "Assignment Not Found" : "سجل العهدة غير موجود"}
          </h2>
          <p className="text-sm text-red-600 dark:text-red-300">
            {error || (isEn ? "Unable to load assignment." : "تعذر العثور على العهدة المطلوبة.")}
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Button variant="secondary" onClick={() => router.back()} className="text-xs">
              <ArrowRight className="h-4 w-4" />
              <span>{isEn ? "Go Back" : "العودة للخلف"}</span>
            </Button>
            <Link href="/admin/fleet/assignments">
              <Button variant="secondary" className="text-xs">
                <span>{isEn ? "Fleet Assignments" : "جدول عهد المركبات"}</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.back()}
            className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors dark:bg-slate-800 dark:hover:bg-slate-700 cursor-pointer"
            title="رجوع"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                <Key className="h-7 w-7 text-[#1167c9]" />
                <span>تفاصيل العهدة التشغيلية</span>
              </h1>
              {isActive ? (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold">
                  عهدة نشطة
                </Badge>
              ) : (
                <Badge className="bg-slate-100 text-slate-600 border-slate-300 text-xs font-bold">
                  عهدة منتهية
                </Badge>
              )}
              {assignment.permissionReference && (
                <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-bold">
                  تفويض: {assignment.permissionReference}
                </span>
              )}
            </div>
            <p className="text-slate-500 mt-1 text-sm">
              إدارة واستعراض تفاصيل تسليم المركبة للمندوب وتفويض التشغيل وسندات الأمر
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {isActive && can("fleet.assignments.manage") && (
            <>
              <Button
                variant="secondary"
                onClick={() => setActiveModal("return")}
                className="gap-1.5 text-xs text-red-700 border-red-200 bg-red-50 hover:bg-red-100"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                <span>استلام (إرجاع)</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => setActiveModal("switch")}
                className="gap-1.5 text-xs text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100"
              >
                <Car className="h-3.5 w-3.5" />
                <span>تبديل المركبة</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => setActiveModal("renew")}
                className="gap-1.5 text-xs text-orange-700 border-orange-200 bg-orange-50 hover:bg-orange-100"
              >
                <CalendarClock className="h-3.5 w-3.5" />
                <span>تجديد التفويض</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => setActiveModal("promissory")}
                className="gap-1.5 text-xs text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100"
              >
                <FileUp className="h-3.5 w-3.5" />
                <span>إرفاق سندات</span>
              </Button>
            </>
          )}

          <Link href={`/admin/fleet/vehicles/${assignment.vehicleId}`}>
            <Button variant="secondary" className="gap-1.5 text-xs">
              <Car className="h-3.5 w-3.5 text-slate-500" />
              <span>ملف المركبة</span>
            </Button>
          </Link>
          <Link href="/admin/fleet/assignments">
            <Button variant="secondary" className="gap-1.5 text-xs">
              <FileSpreadsheet className="h-3.5 w-3.5 text-slate-500" />
              <span>جدول العهد</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Columns */}
        <div className="space-y-6 lg:col-span-2">
          {/* Operation & Authorization Card */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h2 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  بيانات تفويض التشغيل وفترة العهدة
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-xs text-slate-500 font-medium block">رقم تفويض التشغيل</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {assignment.permissionReference || "—"}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-xs text-slate-500 font-medium block">تاريخ بدء التفويض</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {formatDate(assignment.permissionStartsOn || assignment.startedAtUtc)}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-xs text-slate-500 font-medium block">تاريخ نهاية التفويض</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {formatDate(assignment.permissionEndsOn || assignment.permitEndDate)}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-xs text-slate-500 font-medium block">تاريخ ووقت بدء العهدة</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {formatDate(assignment.startedAtUtc)}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-xs text-slate-500 font-medium block">عداد البداية (كم)</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {assignment.startOdometer?.toLocaleString()} كم
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-xs text-slate-500 font-medium block">مدينة التشغيل</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {assignment.vehicleOperatingCityNameAr || vehicle?.summary?.operatingCity || "—"}
                </span>
              </div>

              {isCompleted && (
                <>
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 space-y-1">
                    <span className="text-xs text-rose-600 font-medium block">تاريخ نهاية العهدة (الإرجاع)</span>
                    <span className="font-mono font-bold text-rose-900 dark:text-rose-200 text-sm">
                      {formatDate(assignment.endedAtUtc)}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 space-y-1">
                    <span className="text-xs text-rose-600 font-medium block">عداد النهاية (كم)</span>
                    <span className="font-mono font-bold text-rose-900 dark:text-rose-200 text-sm">
                      {assignment.endOdometer != null ? `${assignment.endOdometer.toLocaleString()} كم` : "—"}
                    </span>
                  </div>

                  {assignment.endOdometer != null && assignment.startOdometer != null && (
                    <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 space-y-1">
                      <span className="text-xs text-purple-600 font-medium block">إجمالي المسافة المقطوعة</span>
                      <span className="font-mono font-bold text-purple-900 dark:text-purple-200 text-sm">
                        {(assignment.endOdometer - assignment.startOdometer).toLocaleString()} كم
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {assignment.startLocationSnapshot && (
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900">
                <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                <span>موقع تسليم العهدة: {assignment.startLocationSnapshot}</span>
              </div>
            )}

            {assignment.startReason && (
              <div className="text-xs text-slate-700 dark:text-slate-300 p-3 rounded-lg bg-slate-50 dark:bg-slate-900">
                <span className="font-bold block mb-1">سبب / ملاحظات التسليم:</span>
                <p>{assignment.startReason}</p>
              </div>
            )}

            {assignment.endReason && (
              <div className="text-xs text-rose-700 dark:text-rose-300 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30">
                <span className="font-bold block mb-1">سبب / ملاحظات الإرجاع:</span>
                <p>{assignment.endReason}</p>
              </div>
            )}
          </Card>

          {/* Vehicle Information Card */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5 text-[#1167c9]" />
                <h2 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  بيانات المركبة المسلّمة
                </h2>
              </div>
              <Link
                href={`/admin/fleet/vehicles/${assignment.vehicleId}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#1167c9] hover:underline"
              >
                <span>عرض ملف المركبة الكامل</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-xs text-slate-500 font-medium block">رقم اللوحة</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  {vehicle?.summary?.plateNumberAr || assignment.assetNumber}
                </span>
                {vehicle?.summary?.plateNumberEn && (
                  <div className="text-xs font-mono text-slate-400">{vehicle.summary.plateNumberEn}</div>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-xs text-slate-500 font-medium block">الرقم التسلسلي</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {vehicle?.serialNumber || assignment.assetNumber}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-xs text-slate-500 font-medium block">الصانع والموديل</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {[vehicle?.summary?.manufacturer, vehicle?.summary?.model, vehicle?.modelYear]
                    .filter(Boolean)
                    .join(" ") || "—"}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-xs text-slate-500 font-medium block">قراءة العداد الحالية</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {(vehicle?.summary?.currentOdometer ?? assignment.startOdometer ?? 0).toLocaleString()} كم
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-xs text-slate-500 font-medium block">رقم الهيكل (VIN)</span>
                <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                  {vehicle?.vin || vehicle?.chassisNumber || "—"}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-xs text-slate-500 font-medium block">الكفيل / المالك</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  {vehicle?.summary?.sponsorName || vehicle?.ownerName || "—"}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right 1 Column */}
        <div className="space-y-6">
          {/* Rider Information Card */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-[#1167c9]" />
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  المندوب صاحب العهدة
                </h3>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-xl shrink-0">
                  <User className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  {can("employees.read") && (employeeId || assignment.riderProfileId) ? (
                    <Link
                      href={`/admin/employees/${employeeId || assignment.riderProfileId}`}
                      className="font-bold text-slate-900 dark:text-slate-100 hover:text-[#1167c9] hover:underline inline-flex items-center gap-1.5 text-base truncate max-w-full"
                    >
                      <span className="truncate">{assignment.riderName || "مندوب"}</span>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    </Link>
                  ) : (
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-base truncate block">
                      {assignment.riderName || "مندوب"}
                    </span>
                  )}
                  {assignment.riderIqamaNo && (
                    <div className="text-xs font-mono text-slate-500 mt-0.5">
                      رقم الإقامة / الهوية: {assignment.riderIqamaNo}
                    </div>
                  )}
                </div>
              </div>

              {employeeId && can("employees.read") && (
                <div className="pt-2">
                  <Link href={`/admin/employees/${employeeId}`}>
                    <Button variant="secondary" className="w-full text-xs gap-1.5 h-9">
                      <User className="h-3.5 w-3.5 text-blue-600" />
                      <span>فتح الملف الشخصي في الموارد البشرية</span>
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Actual Rider / Real Rider details if applicable */}
            {((assignment.isRealRider === false && assignment.realRider) ||
              (assignment.actualRider && assignment.actualRider.isSelectedRiderTheActualRider === false)) && (
              <div className="rounded-xl bg-purple-50 dark:bg-purple-950/30 p-3.5 border border-purple-200 dark:border-purple-900/50 text-xs space-y-1.5">
                <span className="font-bold block text-purple-900 dark:text-purple-300">
                  السائق الفعلي المسجل:{" "}
                  {assignment.realRider?.name || assignment.actualRider?.actualRiderName}
                </span>
                {(assignment.realRider?.relationshipToAssignedRider ||
                  assignment.actualRider?.relationshipToSelectedRider) && (
                  <div className="text-purple-700 dark:text-purple-400">
                    صلة القرابة / العلاقة:{" "}
                    {assignment.realRider?.relationshipToAssignedRider ||
                      assignment.actualRider?.relationshipToSelectedRider}
                  </div>
                )}
                {(assignment.realRider?.iqamaNo || assignment.actualRider?.actualRiderIqamaNo) && (
                  <div className="font-mono text-purple-700 dark:text-purple-400">
                    رقم هوية السائق الفعلي:{" "}
                    {assignment.realRider?.iqamaNo || assignment.actualRider?.actualRiderIqamaNo}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Promissory Files Card */}
          <Card className="p-6 space-y-4 border-[#1167c9]/20 bg-blue-50/20 dark:bg-blue-950/10">
            <div className="flex items-center justify-between border-b border-blue-100 dark:border-blue-900/40 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#1167c9]" />
                <h3 className="font-bold text-base text-[#1167c9]">
                  سندات الأمر المرتبطة بالعهدة
                </h3>
              </div>
            </div>

            <AssignmentPromissoryFiles
              riderProfileId={assignment.riderProfileId}
              promissoryFileVersionIds={assignment.promissoryFileVersionIds}
              locale={locale}
            />
          </Card>
        </div>
      </div>

      {/* Modals */}
      {activeModal === "return" && vehicleForModal && (
        <ReturnVehicleModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          onSuccess={() => {
            setActiveModal(null);
            loadData();
          }}
          preselectedVehicle={vehicleForModal}
        />
      )}

      {activeModal === "switch" && vehicleForModal && (
        <SwitchVehicleModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          onSuccess={() => {
            setActiveModal(null);
            loadData();
          }}
          preselectedVehicle={vehicleForModal}
        />
      )}

      {activeModal === "renew" && vehicleForModal && (
        <RenewPermissionModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          onSuccess={() => {
            setActiveModal(null);
            loadData();
          }}
          preselectedVehicle={vehicleForModal}
        />
      )}

      {activeModal === "promissory" && vehicleForModal && (
        <AttachPromissoryFilesModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          onSuccess={() => {
            setActiveModal(null);
            loadData();
          }}
          vehicle={vehicleForModal}
        />
      )}
    </div>
  );
}
