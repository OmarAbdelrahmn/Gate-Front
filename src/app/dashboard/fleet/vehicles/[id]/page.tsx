"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getVehicleDetail, getVehicleIssues } from "@/lib/fleet/api";
import { VehicleOperationalStatus, type VehicleDetailResponse, type VehicleIssueSummaryResponse } from "@/lib/fleet/types";
import {
  formatVehicleType,
  formatVehicleFuelType,
  formatVehicleTransmissionType,
  formatVehicleOwnershipType,
  formatVehicleComplianceDueStatus,
  formatVehicleIssueCategory,
  formatVehicleIssueStatus,
  formatVehicleRegistrationType,
} from "@/lib/fleet/formatters";
import { VehicleRegistrationType } from "@/lib/fleet/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { VehicleUpsertModal } from "../components/VehicleUpsertModal";
import { AddComplianceModal, type ComplianceTabType } from "../components/AddComplianceModal";
import { PrivateToPublicTransitionModal } from "../components/PrivateToPublicTransitionModal";
import { VehicleFilesCard } from "../components/VehicleFilesCard";
import { AssignmentPromissoryFiles } from "@/components/fleet/AssignmentPromissoryFiles";
import {
  Car,
  ArrowRight,
  Edit2,
  AlertTriangle,
  Key,
  ShieldCheck,
  Wrench,
  FileText,
  User,
  Plus,
  ArrowRightLeft,
} from "lucide-react";
import Link from "next/link";

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toISOString().split("T")[0];
  } catch {
    return dateStr;
  }
}

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { can } = useAuth();
  const id = params.id as string;

  const [vehicle, setVehicle] = useState<VehicleDetailResponse | null>(null);
  const [issues, setIssues] = useState<VehicleIssueSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpsertOpen, setIsUpsertOpen] = useState(false);
  const [isComplianceOpen, setIsComplianceOpen] = useState(false);
  const [isTransitionOpen, setIsTransitionOpen] = useState(false);
  const [complianceType, setComplianceType] = useState<ComplianceTabType>("Registration");

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getVehicleDetail(id);
      setVehicle(data);
      const issuesRes = await getVehicleIssues({ vehicleId: id, pageSize: 5 });
      setIssues(issuesRes.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCompliance = (type: ComplianceTabType) => {
    setComplianceType(type);
    setIsComplianceOpen(true);
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  if (!can("fleet.vehicles.read")) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
          <h2 className="mt-2 text-xl font-bold">صلاحية غير كافية</h2>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="p-12 text-center text-[var(--muted)]">جارٍ تحميل بيانات المركبة...</div>;
  }

  if (!vehicle) {
    return (
      <div className="flex h-96 flex-col items-center justify-center text-center">
        <Car className="h-16 w-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">المركبة غير موجودة</h2>
        <Button variant="secondary" className="mt-4" onClick={() => router.push("/dashboard/fleet/vehicles")}>
          العودة للقائمة
        </Button>
      </div>
    );
  }

  const { summary } = vehicle;

  const renderStatus = (status: VehicleOperationalStatus) => {
    switch (status) {
      case VehicleOperationalStatus.Available: return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">متاح</Badge>;
      case VehicleOperationalStatus.Assigned: return <Badge className="bg-blue-50 text-blue-700 border-blue-200">معيّن</Badge>;
      case VehicleOperationalStatus.ProblemHold: return <Badge className="bg-orange-50 text-orange-700 border-orange-200">إيقاف (مشكلة)</Badge>;
      case VehicleOperationalStatus.AccidentHold: return <Badge className="bg-red-50 text-red-700 border-red-200">إيقاف (حادث)</Badge>;
      case VehicleOperationalStatus.Stolen: return <Badge className="bg-purple-50 text-purple-700 border-purple-200">مسروق</Badge>;
      case VehicleOperationalStatus.OutOfService: return <Badge className="bg-slate-100 text-slate-700 border-slate-300">خارج الخدمة</Badge>;
      case VehicleOperationalStatus.Decommissioned: return <Badge className="bg-slate-800 text-slate-300 border-slate-700">مستبعد</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const complianceItems: { label: string; type: ComplianceTabType; date?: string | null; status?: any }[] = [
    { label: "استمارة السير", type: "Registration", date: summary.registrationExpiryDate, status: summary.registrationStatus },
    { label: "بوليصة التأمين", type: "InsurancePolicy", date: summary.insuranceExpiryDate, status: summary.insuranceStatus },
    { label: "الفحص الدوري", type: "Inspection", date: summary.inspectionExpiryDate, status: summary.inspectionStatus },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-4">
          <Link href="/dashboard/fleet/vehicles" className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors dark:bg-slate-800 dark:hover:bg-slate-700">
            <ArrowRight className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900 font-mono tracking-wide">{summary.assetNumber}</h1>
              {renderStatus(summary.status)}
              {!summary.isReadyForAssignment && summary.status === VehicleOperationalStatus.Available && (
                <Badge className="bg-red-50 text-red-700 border-red-200">غير جاهزة للتسليم</Badge>
              )}
            </div>
            <p className="text-slate-500 mt-1 text-lg">
              {summary.manufacturer} {summary.model} - {vehicle.modelYear}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {can("fleet.vehicles.manage") && (
            <Button onClick={() => setIsUpsertOpen(true)} variant="secondary" className="gap-2">
              <Edit2 className="h-4 w-4" /> تعديل البيانات
            </Button>
          )}

          {(can("fleet.registration-transitions.manage") || can("fleet.vehicles.manage")) && (
            <Button
              onClick={() => setIsTransitionOpen(true)}
              variant="secondary"
              className="gap-2 border-indigo-200 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800"
            >
              <ArrowRightLeft className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>تحويل إلى نقل عام</span>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 flex flex-col gap-1">
              <span className="text-xs font-bold text-slate-500 uppercase">اللوحة</span>
              <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
                {summary.plateNumberAr || "—"}
              </span>
            </Card>
            <Card className="p-4 flex flex-col gap-1">
              <span className="text-xs font-bold text-slate-500 uppercase">النوع</span>
              <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
                {formatVehicleType(summary.vehicleType)}
              </span>
            </Card>
            <Card className="p-4 flex flex-col gap-1">
              <span className="text-xs font-bold text-slate-500 uppercase">العداد</span>
              <span className="text-lg font-bold text-slate-800 dark:text-slate-200 font-mono text-[#1167c9]">
                {summary.currentOdometer.toLocaleString()} <span className="text-sm">كم</span>
              </span>
            </Card>
            <Card className="p-4 flex flex-col gap-1">
              <span className="text-xs font-bold text-slate-500 uppercase">الكفيل المالك</span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 line-clamp-2">
                {summary.sponsorName || "الشركة"}
              </span>
            </Card>
          </div>

          <Card className="p-0 overflow-hidden">
            <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-500" />
                <h3 className="font-bold text-slate-800 dark:text-slate-200">البيانات الفنية والتسجيل</h3>
              </div>
              <Badge className="bg-blue-50 text-[#1167c9] border-blue-200">
                {formatVehicleRegistrationType(vehicle.registrationType || summary.registrationType)}
              </Badge>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
              <div>
                <div className="text-sm text-slate-500 mb-1">نوع التسجيل الرسمـي</div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {formatVehicleRegistrationType(vehicle.registrationType || summary.registrationType)}
                  </span>
                  {(vehicle.registrationType === VehicleRegistrationType.PrivateTransport || summary.registrationType === VehicleRegistrationType.PrivateTransport) && (
                    <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800">
                      قابل للتحويل لنقل عام
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">رقم الهيكل (VIN)</div>
                <div className="font-mono font-medium text-slate-900 dark:text-slate-100">{vehicle.vin || "—"}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">الرقم التسلسلي (الاستمارة)</div>
                <div className="font-mono font-medium text-slate-900 dark:text-slate-100">{vehicle.serialNumber || "—"}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">رقم الشاسيه / المحرك</div>
                <div className="font-mono font-medium text-slate-900 dark:text-slate-100">{vehicle.chassisNumber || "—"} / {vehicle.engineNumber || "—"}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">اللون</div>
                <div className="font-medium text-slate-900 dark:text-slate-100">{vehicle.colorAr || "—"} {vehicle.colorEn ? `(${vehicle.colorEn})` : ""}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">المحرك والناقل</div>
                <div className="font-medium text-slate-900 dark:text-slate-100">{formatVehicleFuelType(vehicle.fuelType)} - {formatVehicleTransmissionType(vehicle.transmissionType)}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">مدينة التشغيل</div>
                <div className="font-medium text-slate-900 dark:text-slate-100">{summary.operatingCity || "—"}</div>
              </div>
              <div className="col-span-1 md:col-span-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="text-sm text-slate-500 mb-1">تاريخ الاستحواذ / الملكية</div>
                <div className="font-medium text-slate-900 dark:text-slate-100">
                  {formatVehicleOwnershipType(vehicle.ownershipType)} {vehicle.acquisitionDate ? `- ${formatDate(vehicle.acquisitionDate)}` : ""}
                </div>
              </div>
            </div>
          </Card>

          {/* Documents and Files */}
          <VehicleFilesCard vehicleId={id} registrationType={vehicle.registrationType} />
        </div>

        {/* Right Column - Status & Links */}
        <div className="space-y-6">
          
          <Card className="p-0 overflow-hidden border-[#1167c9]/20 bg-blue-50/30 dark:bg-blue-950/10">
            <div className="px-6 py-4 border-b border-blue-100 dark:border-blue-900/30 flex items-center gap-2">
              <Key className="h-5 w-5 text-[#1167c9]" />
              <h3 className="font-bold text-[#1167c9]">العهدة الحالية</h3>
            </div>
            <div className="p-6">
              {summary.currentRiderProfileId ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-lg shrink-0">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <Link href={`/dashboard/hr/external-riders/${summary.currentRiderProfileId}`} className="font-bold text-slate-900 dark:text-slate-100 hover:text-[#1167c9] hover:underline">
                        {summary.currentRiderName || `المندوب (${summary.currentRiderProfileId})`}
                      </Link>
                    </div>
                  </div>

                  <AssignmentPromissoryFiles riderProfileId={summary.currentRiderProfileId} />
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500">
                  <Key className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p>المركبة غير مسلمة لأي مندوب حالياً.</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <h3 className="font-bold text-slate-800 dark:text-slate-200">الالتزام والتراخيص</h3>
              </div>
            </div>
            <div className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
              {complianceItems.map((item, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div>
                    <div className="font-bold text-sm text-slate-800 dark:text-slate-200">{item.label}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      تنتهي في: {formatDate(item.date)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.status && (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        {formatVehicleComplianceDueStatus(item.status)}
                      </Badge>
                    )}
                    {can("fleet.vehicles.manage") && (
                      <Button
                        variant="ghost"
                        className="text-xs text-[#1167c9] hover:bg-blue-50 dark:hover:bg-blue-950/40 gap-1 px-2 py-1 h-auto"
                        onClick={() => handleOpenCompliance(item.type)}
                      >
                        <Plus className="h-3 w-3" />
                        <span>تحديث</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center gap-2">
              <Wrench className="h-5 w-5 text-orange-500" />
              <h3 className="font-bold text-slate-800 dark:text-slate-200">الأعطال الأخيرة</h3>
            </div>
            <div className="p-0">
              {issues.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {issues.map(issue => (
                    <div key={issue.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-bold text-sm text-slate-800 dark:text-slate-200">{formatVehicleIssueCategory(issue.category)}</div>
                        <Badge className="text-[10px] px-1">{formatVehicleIssueStatus(issue.status)}</Badge>
                      </div>
                      <div className="text-xs text-slate-500 line-clamp-1">{issue.description}</div>
                      <div className="text-xs text-slate-400 mt-2">{formatDate(issue.reportedAtUtc)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-sm text-slate-500">لا توجد أعطال حديثة.</div>
              )}
            </div>
          </Card>

        </div>
      </div>

      <VehicleUpsertModal 
        isOpen={isUpsertOpen}
        onClose={() => setIsUpsertOpen(false)}
        onSuccess={() => { setIsUpsertOpen(false); loadData(); }}
        editingVehicle={vehicle}
      />

      <AddComplianceModal
        isOpen={isComplianceOpen}
        onClose={() => setIsComplianceOpen(false)}
        onSuccess={() => { setIsComplianceOpen(false); loadData(); }}
        vehicleId={id}
        initialType={complianceType}
      />

      {vehicle && (
        <PrivateToPublicTransitionModal
          isOpen={isTransitionOpen}
          onClose={() => setIsTransitionOpen(false)}
          onSuccess={() => {
            setIsTransitionOpen(false);
            loadData();
          }}
          vehicle={vehicle}
        />
      )}
    </div>
  );
}

