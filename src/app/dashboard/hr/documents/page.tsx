"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  FileText,
  ShieldAlert,
  Search,
  Users,
  BriefcaseBusiness,
  CheckSquare,
  Settings,
  User,
  Sliders,
} from "lucide-react";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import { listEmployees, listRiders } from "../../../../lib/workforce/api";
import type { Employee, Rider } from "../../../../lib/workforce/types";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { SearchableSelect, type SelectOption } from "../../../../components/ui/SearchableSelect";
import { StaffDocumentChecklistPanel } from "../../../../components/documents/StaffDocumentChecklistPanel";
import { DocumentTypeAdminPanel } from "../../../../components/documents/DocumentTypeAdminPanel";
import { DocumentRequirementAdminPanel } from "../../../../components/documents/DocumentRequirementAdminPanel";

export default function HRDocumentsPage() {
  const { can, locale } = useAuth();
  const isEn = locale === "en";
  const searchParams = useSearchParams();

  const canReadDocs = can("documents.read");
  const canManageCatalog = can("documents.catalog.manage");

  // Tab state
  const initialTab = (searchParams.get("tab") as "checklist" | "types" | "requirements") || "checklist";
  const [activeTab, setActiveTab] = useState<"checklist" | "types" | "requirements">(initialTab);

  // Staff Selection state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  const initialEmployeeId = searchParams.get("employeeId") || "";
  const initialRiderId = searchParams.get("riderProfileId") || "";

  const [selectedStaffType, setSelectedStaffType] = useState<"employee" | "rider">(
    initialRiderId ? "rider" : "employee"
  );
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(initialEmployeeId);
  const [selectedRiderProfileId, setSelectedRiderProfileId] = useState<string>(initialRiderId);

  useEffect(() => {
    if (!canReadDocs) return;
    setLoadingStaff(true);
    Promise.all([
      listEmployees().catch(() => []),
      listRiders().catch(() => []),
    ])
      .then(([empRes, riderRes]) => {
        setEmployees(empRes || []);
        setRiders(riderRes || []);
        // If no employee selected yet, auto-select first one
        if (!initialEmployeeId && !initialRiderId && empRes && empRes.length > 0) {
          setSelectedEmployeeId(empRes[0].id);
        }
      })
      .finally(() => setLoadingStaff(false));
  }, [canReadDocs]);

  // Options for SearchableSelect
  const employeeOptions = useMemo<SelectOption[]>(() => {
    return employees.map((emp) => ({
      value: emp.id,
      label: emp.fullNameAr || emp.fullNameEn || emp.iqamaNo || emp.id,
      sublabel: `${emp.employeeNumber || emp.iqamaNo || ""} • ${emp.iqamaNo || (isEn ? "No Iqama" : "بدون إقامة")}`,
    }));
  }, [employees, isEn]);

  const riderOptions = useMemo<SelectOption[]>(() => {
    return riders.map((r) => ({
      value: r.id, // riderProfileId
      label: r.fullNameAr || r.fullNameEn || r.id,
      sublabel: `Rider ID: ${r.id.slice(0, 8)}... • ${r.iqamaNo || (isEn ? "Outside" : "خارجي")}`,
    }));
  }, [riders, isEn]);

  if (!canReadDocs) {
    return (
      <div className="flex items-center gap-3 p-8 text-red-700 bg-red-50 rounded-2xl border border-red-200 font-bold">
        <ShieldAlert size={24} />
        <p>
          {isEn
            ? "You do not have permission to view documents (documents.read)."
            : "ليس لديك صلاحية لعرض إدارة الوثائق (documents.read)."}
        </p>
      </div>
    );
  }

  const selectedEmployeeObj = employees.find((e) => e.id === selectedEmployeeId);
  const selectedRiderObj = riders.find((r) => r.id === selectedRiderProfileId);

  const activeStaffName =
    selectedStaffType === "employee"
      ? selectedEmployeeObj
        ? selectedEmployeeObj.fullNameAr || selectedEmployeeObj.fullNameEn
        : ""
      : selectedRiderObj
      ? selectedRiderObj.fullNameAr || selectedRiderObj.fullNameEn
      : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#1167c9]">{isEn ? "HR Management" : "الموارد البشرية"}</p>
          <h1 className="mt-1 text-3xl font-black">
            {isEn ? "Employee & Rider Documents" : "وثائق الموظفين والمناديب"}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {isEn
              ? "Comprehensive catalog definitions, audience fulfillment checklists, and live document inspections."
              : "إدارة دليل الوثائق الشاملة، تكليفات الاستيفاء حسب الفئات، والتفتيش المباشر على وثائق الكادر."}
          </p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex flex-wrap border-b border-[var(--border)] gap-2">
        <button
          onClick={() => setActiveTab("checklist")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-black border-b-2 transition-colors ${
            activeTab === "checklist"
              ? "border-[#1167c9] text-[#1167c9]"
              : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <CheckSquare size={18} />
          <span>{isEn ? "Staff Documents Checklist" : "قائمة وتفتيش وثائق الكادر"}</span>
        </button>

        {canManageCatalog && (
          <>
            <button
              onClick={() => setActiveTab("types")}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-black border-b-2 transition-colors ${
                activeTab === "types"
                  ? "border-[#1167c9] text-[#1167c9]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <FileText size={18} />
              <span>{isEn ? "Document Definitions (Catalog)" : "دليل أنواع الوثائق"}</span>
            </button>

            <button
              onClick={() => setActiveTab("requirements")}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-black border-b-2 transition-colors ${
                activeTab === "requirements"
                  ? "border-[#1167c9] text-[#1167c9]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <Sliders size={18} />
              <span>{isEn ? "Requirements Rules (Assignments)" : "تكليفات الشروط والاستيفاء"}</span>
            </button>
          </>
        )}
      </div>

      {/* Tab 1: Checklist View */}
      {activeTab === "checklist" && (
        <div className="space-y-6">
          {/* Staff Selector Bar */}
          <Card className="p-5 space-y-4 border-l-4 border-l-[#1167c9]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-blue-50 text-[#1167c9]">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black">
                    {isEn ? "Select Staff Member for Document Inspection" : "اختر الموظف أو المندوب لمعاينة واستيفاء الوثائق"}
                  </h3>
                  <p className="text-xs text-[var(--muted)]">
                    {isEn ? "Loads dynamic checklist rules based on scope." : "يتم جلب واستبدال قائمة التفتيش تلقائياً حسب المتطلبات."}
                  </p>
                </div>
              </div>

              {/* Toggle staff type */}
              <div className="flex items-center rounded-xl bg-slate-100 p-1 font-bold text-xs">
                <button
                  onClick={() => setSelectedStaffType("employee")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    selectedStaffType === "employee"
                      ? "bg-white text-[#1167c9] shadow-sm font-black"
                      : "text-slate-600"
                  }`}
                >
                  {isEn ? "Staff / Employee" : "موظف / إداري"}
                </button>
                <button
                  onClick={() => setSelectedStaffType("rider")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    selectedStaffType === "rider"
                      ? "bg-white text-[#1167c9] shadow-sm font-black"
                      : "text-slate-600"
                  }`}
                >
                  {isEn ? "Rider Profile" : "ملف مندوب"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {selectedStaffType === "employee" ? (
                <div>
                  <label className="block text-xs font-bold mb-1 text-[var(--foreground)]">
                    {isEn ? "Search & Pick Employee" : "ابحث واختر الموظف"}
                  </label>
                  <SearchableSelect
                    value={selectedEmployeeId}
                    onChange={(val) => {
                      setSelectedEmployeeId(val);
                      setSelectedRiderProfileId("");
                    }}
                    options={employeeOptions}
                    placeholder={isEn ? "Select employee..." : "اختر موظف من القائمة..."}
                    searchPlaceholder={isEn ? "Search by name or code..." : "ابحث بالاسم أو الرقم..."}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold mb-1 text-[var(--foreground)]">
                    {isEn ? "Search & Pick Rider Profile" : "ابحث واختر ملف المندوب"}
                  </label>
                  <SearchableSelect
                    value={selectedRiderProfileId}
                    onChange={(val) => {
                      setSelectedRiderProfileId(val);
                      setSelectedEmployeeId("");
                    }}
                    options={riderOptions}
                    placeholder={isEn ? "Select rider profile..." : "اختر ملف مندوب..."}
                    searchPlaceholder={isEn ? "Search rider..." : "ابحث عن مندوب..."}
                  />
                </div>
              )}

              {activeStaffName && (
                <div className="flex items-center justify-end">
                  <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs font-bold text-[#1167c9] flex items-center gap-2">
                    <Users size={16} />
                    <span>
                      {isEn ? "Selected Staff: " : "الفرد المحدد: "}
                      {activeStaffName}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Render Checklist Panel */}
          {selectedEmployeeId || selectedRiderProfileId ? (
            <StaffDocumentChecklistPanel
              employeeId={selectedEmployeeId || undefined}
              riderProfileId={selectedRiderProfileId || undefined}
              staffName={activeStaffName}
            />
          ) : (
            <Card className="p-12 text-center text-sm font-bold text-[var(--muted)]">
              {isEn ? "Please select a staff member above to inspect document checklist." : "يرجى اختيار موظف أو مندوب من القائمة أعلاه لعرض قائمة التفتيش على الوثائق."}
            </Card>
          )}
        </div>
      )}

      {/* Tab 2: Document Type Admin */}
      {activeTab === "types" && canManageCatalog && <DocumentTypeAdminPanel />}

      {/* Tab 3: Document Requirements Admin */}
      {activeTab === "requirements" && canManageCatalog && <DocumentRequirementAdminPanel />}
    </div>
  );
}
