// src/app/admin/hunger/components/AccountsFilterPanel.tsx
"use client";

import { useState } from "react";
import { DateInput } from "@/components/ui/DateInput";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import {
  HUNGER_DISPOSITIONS,
  HUNGER_ACTUAL_VEHICLE_CUSTODY_STATUSES,
  HUNGER_ACTUAL_VEHICLE_OWNERSHIPS,
  HUNGER_COMPENSATION_MODELS,
  HUNGER_SIM_OWNERSHIPS,
  getRiyadhCurrentMonthStartIso,
  getRiyadhTodayIso,
  type HungerAccountsFilterParams,
} from "@/lib/hunger/api";
import {
  ChevronDown,
  ChevronUp,
  Filter,
  RotateCcw,
  Calendar,
} from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface AccountsFilterPanelProps {
  filters: HungerAccountsFilterParams;
  onChange: (next: HungerAccountsFilterParams) => void;
  onReset: () => void;
  employeeOptions: SelectOption[];
  riderOptions: SelectOption[];
  cityOptions: SelectOption[];
  sponsorOptions?: SelectOption[];
  hideDateRange?: boolean;
  labelPrefix?: string;
}

export function AccountsFilterPanel({
  filters,
  onChange,
  onReset,
  employeeOptions,
  riderOptions,
  cityOptions,
  sponsorOptions = [],
  hideDateRange = false,
  labelPrefix = "فلاتر البحث المتقدمة للحسابات",
}: AccountsFilterPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const updateField = (
    key: keyof HungerAccountsFilterParams,
    value: string,
  ) => {
    onChange({
      ...filters,
      [key]: value,
      page: 1,
    });
  };

  // Count active filters excluding from/through/page/pageSize
  const activeFilterCount = Object.entries(filters).filter(([k, v]) => {
    if (
      k === "from" ||
      k === "through" ||
      k === "page" ||
      k === "pageSize" ||
      k === "disposition"
    ) {
      return false;
    }
    return typeof v === "string" && v.trim() !== "" && v.trim() !== "all";
  }).length;

  // Date range validation hint
  const fromDate = filters.from || getRiyadhCurrentMonthStartIso();
  const throughDate = filters.through || getRiyadhTodayIso();
  const diffDays = Math.round(
    (new Date(throughDate).getTime() - new Date(fromDate).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  const rangeInvalid =
    fromDate > throughDate ||
    throughDate > getRiyadhTodayIso() ||
    diffDays > 366;

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      {/* Top Row: Date Range (from / through) + Toggle Advanced Filter Panel */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        {!hideDateRange ? (
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--foreground)]">
              <Calendar className="h-4 w-4 text-amber-500" />
              <span>نطاق سياق المركبة والشريحة:</span>
            </div>
            <div className="w-40">
              <DateInput
                label="من تاريخ (from)"
                value={fromDate}
                onChange={(val) => updateField("from", val)}
              />
            </div>
            <div className="w-40">
              <DateInput
                label="إلى تاريخ (through)"
                value={throughDate}
                onChange={(val) => updateField("through", val)}
              />
            </div>
            {rangeInvalid && (
              <span className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                تنبيه: يجب ألا يتجاوز النطاق 366 يومًا وألا يكون معكوسًا أو في
                المستقبل.
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--foreground)]">
            <Filter className="h-4 w-4 text-amber-500" />
            <span>{labelPrefix}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <Button variant="secondary" size="sm" onClick={onReset}>
              <RotateCcw className="ml-1.5 h-3.5 w-3.5" />
              مسح الفلاتر ({activeFilterCount})
            </Button>
          )}
          <Button
            variant={expanded ? "primary" : "secondary"}
            size="sm"
            onClick={() => setExpanded((prev) => !prev)}
          >
            <Filter className="ml-1.5 h-3.5 w-3.5" />
            <span>{labelPrefix} (9 مجموعات)</span>
            {activeFilterCount > 0 && (
              <Badge tone="orange" className="mr-1.5">
                {activeFilterCount}
              </Badge>
            )}
            {expanded ? (
              <ChevronUp className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="mr-1.5 h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Collapsible 7-Group Filter Panel */}
      {expanded && (
        <div className="mt-3 space-y-4 border-t border-[var(--border)] pt-4">
          {/* Group 1: Account */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)]/50 p-3">
            <h4 className="mb-2.5 text-xs font-bold text-[var(--foreground)]">
              1. الحساب (Account)
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="المعرف الخارجي (externalAccountId)"
                value={filters.externalAccountId || ""}
                onChange={(e) =>
                  updateField("externalAccountId", e.target.value)
                }
                placeholder="بحث برقم الحساب الخارجي..."
              />
              <Input
                label="كود الحساب (accountCode)"
                value={filters.accountCode || ""}
                onChange={(e) => updateField("accountCode", e.target.value)}
                placeholder="بحث بكود الحساب..."
              />
            </div>
          </div>

          {/* Group 2: Owner */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)]/50 p-3">
            <h4 className="mb-2.5 text-xs font-bold text-[var(--foreground)]">
              2. المالك / صاحب الحساب (Owner)
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                  الموظف المالك (ownerEmployeeId)
                </label>
                <SearchableSelect
                  options={[
                    { value: "", label: "الكل" },
                    ...employeeOptions,
                  ]}
                  value={filters.ownerEmployeeId || ""}
                  onChange={(val) => updateField("ownerEmployeeId", val)}
                  placeholder="اختر المالك..."
                />
              </div>
              <Input
                label="اسم المالك بالعربية (ownerName)"
                value={filters.ownerName || ""}
                onChange={(e) => updateField("ownerName", e.target.value)}
                placeholder="اسم المالك..."
              />
              <Input
                label="اسم المالك بالإنجليزية (ownerNameEn)"
                value={filters.ownerNameEn || ""}
                onChange={(e) => updateField("ownerNameEn", e.target.value)}
                placeholder="Owner English Name..."
              />
              <Input
                label="هوية / إقامة المالك (ownerIqama)"
                value={filters.ownerIqama || ""}
                onChange={(e) => updateField("ownerIqama", e.target.value)}
                placeholder="رقم الهوية / الإقامة..."
              />
              <Input
                label="جوال المالك (ownerPhone)"
                value={filters.ownerPhone || ""}
                onChange={(e) => updateField("ownerPhone", e.target.value)}
                placeholder="05xxxxxxxx"
              />
              <Input
                label="جنسية المالك (ownerNationality)"
                value={filters.ownerNationality || ""}
                onChange={(e) =>
                  updateField("ownerNationality", e.target.value)
                }
                placeholder="الجنسية..."
              />
              <Input
                label="حالة الموظف المالك (ownerEmployeeStatus)"
                value={filters.ownerEmployeeStatus || ""}
                onChange={(e) =>
                  updateField("ownerEmployeeStatus", e.target.value)
                }
                placeholder="مثال: Active..."
              />
              <Input
                label="نوع علاقة المالك (ownerRelationshipType)"
                value={filters.ownerRelationshipType || ""}
                onChange={(e) =>
                  updateField("ownerRelationshipType", e.target.value)
                }
                placeholder="نوع العلاقة..."
              />
            </div>
          </div>

          {/* Group 3: Registration */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)]/50 p-3">
            <h4 className="mb-2.5 text-xs font-bold text-[var(--foreground)]">
              3. بيانات التسجيل والمدينة والتسوية (Registration)
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Input
                label="هاتف الحساب (phoneNumber)"
                value={filters.phoneNumber || ""}
                onChange={(e) => updateField("phoneNumber", e.target.value)}
                placeholder="رقم هاتف الحساب..."
              />
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                  المدينة التشغيلية (operatingCityId)
                </label>
                <SearchableSelect
                  options={[{ value: "", label: "الكل" }, ...cityOptions]}
                  value={filters.operatingCityId || ""}
                  onChange={(val) => updateField("operatingCityId", val)}
                  placeholder="اختر المدينة..."
                />
              </div>
              <Input
                label="اسم المدينة بالعربية (operatingCityNameAr)"
                value={filters.operatingCityNameAr || ""}
                onChange={(e) =>
                  updateField("operatingCityNameAr", e.target.value)
                }
                placeholder="مثال: الرياض..."
              />
              <Input
                label="معرف السجل التجاري (registryIdentifier)"
                value={filters.registryIdentifier || ""}
                onChange={(e) =>
                  updateField("registryIdentifier", e.target.value)
                }
                placeholder="اسم أو رقم السجل..."
              />
              <Input
                label="نظام التسوية (settlementModel)"
                value={filters.settlementModel || ""}
                onChange={(e) => updateField("settlementModel", e.target.value)}
                placeholder="نظام التسوية..."
              />
            </div>
          </div>

          {/* Group 4 & 5: Registered Vehicle & Actual Vehicle */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Group 4: Registered vehicle */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)]/50 p-3">
              <h4 className="mb-2.5 text-xs font-bold text-[var(--foreground)]">
                4. المركبة المسجلة (Registered vehicle)
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Input
                  label="نوع المركبة المسجلة (registeredVehicleType)"
                  value={filters.registeredVehicleType || ""}
                  onChange={(e) =>
                    updateField("registeredVehicleType", e.target.value)
                  }
                  placeholder="سيارة / دراجة..."
                />
                <Input
                  label="لوحة المركبة المسجلة (registeredVehiclePlate)"
                  value={filters.registeredVehiclePlate || ""}
                  onChange={(e) =>
                    updateField("registeredVehiclePlate", e.target.value)
                  }
                  placeholder="رقم اللوحة..."
                />
                <Input
                  label="الرقم التسلسلي (registeredVehicleSerial)"
                  value={filters.registeredVehicleSerial || ""}
                  onChange={(e) =>
                    updateField("registeredVehicleSerial", e.target.value)
                  }
                  placeholder="الرقم التسلسلي..."
                />
              </div>
            </div>

            {/* Group 5: Actual vehicle */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)]/50 p-3">
              <h4 className="mb-2.5 text-xs font-bold text-[var(--foreground)]">
                5. المركبة الفعلية وعهدة الحركة (Actual vehicle)
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="نوع المركبة الفعلية (actualVehicleType)"
                  value={filters.actualVehicleType || ""}
                  onChange={(e) =>
                    updateField("actualVehicleType", e.target.value)
                  }
                  placeholder="نوع المركبة..."
                />
                <Input
                  label="لوحة المركبة الفعلية (actualVehiclePlate)"
                  value={filters.actualVehiclePlate || ""}
                  onChange={(e) =>
                    updateField("actualVehiclePlate", e.target.value)
                  }
                  placeholder="لوحة المركبة الفعلية..."
                />
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                    ملكية المركبة الفعلية (actualVehicleOwnership)
                  </label>
                  <select
                    value={filters.actualVehicleOwnership || ""}
                    onChange={(e) =>
                      updateField("actualVehicleOwnership", e.target.value)
                    }
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium"
                  >
                    <option value="">الكل</option>
                    {HUNGER_ACTUAL_VEHICLE_OWNERSHIPS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.labelAr}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                    حالة عهدة المركبة الفعلية (actualVehicleCustodyStatus)
                  </label>
                  <select
                    value={filters.actualVehicleCustodyStatus || ""}
                    onChange={(e) =>
                      updateField("actualVehicleCustodyStatus", e.target.value)
                    }
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium"
                  >
                    <option value="">الكل</option>
                    {HUNGER_ACTUAL_VEHICLE_CUSTODY_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.labelAr} ({s.value})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Group 6: SIM */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)]/50 p-3">
            <h4 className="mb-2.5 text-xs font-bold text-[var(--foreground)]">
              6. شريحة الاتصال (SIM)
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                  ملكية الشريحة الموثقة (simOwnership)
                </label>
                <select
                  value={filters.simOwnership || ""}
                  onChange={(e) => updateField("simOwnership", e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium"
                >
                  <option value="">الكل</option>
                  {HUNGER_SIM_OWNERSHIPS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.labelAr} ({o.value})
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="ملكية الشريحة من ملف الاستيراد (sourceSimOwnership)"
                value={filters.sourceSimOwnership || ""}
                onChange={(e) =>
                  updateField("sourceSimOwnership", e.target.value)
                }
                placeholder="ملكية الشريحة بالمصدر..."
              />
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                  الموظف المسؤول عن الشريحة (simResponsibleEmployeeId)
                </label>
                <SearchableSelect
                  options={[{ value: "", label: "الكل" }, ...employeeOptions]}
                  value={filters.simResponsibleEmployeeId || ""}
                  onChange={(val) =>
                    updateField("simResponsibleEmployeeId", val)
                  }
                  placeholder="اختر المسؤول..."
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                  المندوب حامل الشريحة (simHolderRiderProfileId)
                </label>
                <SearchableSelect
                  options={[{ value: "", label: "الكل" }, ...riderOptions]}
                  value={filters.simHolderRiderProfileId || ""}
                  onChange={(val) =>
                    updateField("simHolderRiderProfileId", val)
                  }
                  placeholder="اختر الحامل..."
                />
              </div>
              <Input
                label="اسم مسؤول الشريحة (simResponsibleName)"
                value={filters.simResponsibleName || ""}
                onChange={(e) =>
                  updateField("simResponsibleName", e.target.value)
                }
                placeholder="اسم المسؤول..."
              />
              <Input
                label="هوية مسؤول الشريحة (simResponsibleIqama)"
                value={filters.simResponsibleIqama || ""}
                onChange={(e) =>
                  updateField("simResponsibleIqama", e.target.value)
                }
                placeholder="هوية المسؤول..."
              />
              <Input
                label="جوال مسؤول الشريحة (simResponsiblePhone)"
                value={filters.simResponsiblePhone || ""}
                onChange={(e) =>
                  updateField("simResponsiblePhone", e.target.value)
                }
                placeholder="جوال المسؤول..."
              />
              <Input
                label="اسم حامل الشريحة (simHolderName)"
                value={filters.simHolderName || ""}
                onChange={(e) => updateField("simHolderName", e.target.value)}
                placeholder="اسم الحامل..."
              />
              <Input
                label="هوية حامل الشريحة (simHolderIqama)"
                value={filters.simHolderIqama || ""}
                onChange={(e) => updateField("simHolderIqama", e.target.value)}
                placeholder="هوية الحامل..."
              />
              <Input
                label="جوال حامل الشريحة (simHolderPhone)"
                value={filters.simHolderPhone || ""}
                onChange={(e) => updateField("simHolderPhone", e.target.value)}
                placeholder="جوال الحامل..."
              />
            </div>
          </div>

          {/* Group 7: Account State */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)]/50 p-3">
            <h4 className="mb-2.5 text-xs font-bold text-[var(--foreground)]">
              7. حالة الحساب والتكليف (Account state)
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                  التصنيف التشغيلي (operationalDisposition)
                </label>
                <select
                  value={filters.operationalDisposition || ""}
                  onChange={(e) =>
                    updateField("operationalDisposition", e.target.value)
                  }
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium"
                >
                  <option value="">الكل</option>
                  {HUNGER_DISPOSITIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.labelAr}
                    </option>
                  ))}
                  <option value="Unknown">غير مصنف (Unknown)</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                  حالة التكليف (assignmentStatus)
                </label>
                <select
                  value={filters.assignmentStatus || ""}
                  onChange={(e) =>
                    updateField("assignmentStatus", e.target.value)
                  }
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium"
                >
                  <option value="">الكل</option>
                  <option value="Assigned">مكلف (Assigned)</option>
                  <option value="Unassigned">غير مكلف (Unassigned)</option>
                  <option value="Active">نشط (Active)</option>
                  <option value="None">بدون تكليف (None)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Group 8: Actual Rider, Source Rider & Sponsor (Section 7) */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)]/50 p-3">
            <h4 className="mb-2.5 text-xs font-bold text-[var(--foreground)]">
              8. المندوب الفعلي والمستخدم الوارد بالمصدر والكفيل (Actual Rider, Source Rider & Sponsor)
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                  المندوب الفعلي (actualRiderProfileId)
                </label>
                <SearchableSelect
                  options={[{ value: "", label: "الكل" }, ...riderOptions]}
                  value={filters.actualRiderProfileId || filters.actualRiderId || ""}
                  onChange={(val) => {
                    onChange({
                      ...filters,
                      actualRiderProfileId: val,
                      actualRiderId: val,
                      page: 1,
                    });
                  }}
                  placeholder="اختر المندوب المكلف..."
                />
              </div>
              <Input
                label="اسم المندوب الفعلي (actualRiderName)"
                value={filters.actualRiderName || ""}
                onChange={(e) => updateField("actualRiderName", e.target.value)}
                placeholder="اسم المندوب المكلف..."
              />
              <Input
                label="هوية المندوب الفعلي (actualRiderIqama)"
                value={filters.actualRiderIqama || ""}
                onChange={(e) =>
                  updateField("actualRiderIqama", e.target.value)
                }
                placeholder="رقم الهوية / الإقامة..."
              />
              <Input
                label="جوال المندوب الفعلي (actualRiderPhone)"
                value={filters.actualRiderPhone || ""}
                onChange={(e) =>
                  updateField("actualRiderPhone", e.target.value)
                }
                placeholder="05xxxxxxxx"
              />
              <Input
                label="اسم المستخدم بالمصدر (sourceRiderName)"
                value={filters.sourceRiderName || ""}
                onChange={(e) => updateField("sourceRiderName", e.target.value)}
                placeholder="الاسم الوارد بالملف..."
              />
              <Input
                label="هوية المستخدم بالمصدر (sourceRiderIqama)"
                value={filters.sourceRiderIqama || ""}
                onChange={(e) =>
                  updateField("sourceRiderIqama", e.target.value)
                }
                placeholder="الهوية الواردة بالملف..."
              />
              {sponsorOptions.length > 0 ? (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                    معرف الكفيل (sponsorId)
                  </label>
                  <SearchableSelect
                    options={[{ value: "", label: "الكل" }, ...sponsorOptions]}
                    value={filters.sponsorId || ""}
                    onChange={(val) => updateField("sponsorId", val)}
                    placeholder="اختر الكفيل..."
                  />
                </div>
              ) : (
                <Input
                  label="معرف الكفيل (sponsorId)"
                  value={filters.sponsorId || ""}
                  onChange={(e) => updateField("sponsorId", e.target.value)}
                  placeholder="UUID الكفيل..."
                />
              )}
              <Input
                label="اسم الكفيل (sponsorName)"
                value={filters.sponsorName || ""}
                onChange={(e) => updateField("sponsorName", e.target.value)}
                placeholder="اسم الكفيل..."
              />
            </div>
          </div>

          {/* Group 9: Models, Usage Status, Quality & Deferred Dates (Section 7) */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--subtle-bg)]/50 p-3">
            <h4 className="mb-2.5 text-xs font-bold text-[var(--foreground)]">
              9. نماذج التعويض والاستخدام والجودة والتأجيل (Models, Quality & Deferred)
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                  نموذج التعويض (compensationModel)
                </label>
                <select
                  value={filters.compensationModel || ""}
                  onChange={(e) =>
                    updateField("compensationModel", e.target.value)
                  }
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium"
                >
                  <option value="">الكل</option>
                  {HUNGER_COMPENSATION_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.labelAr}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="نموذج الدفع (paymentModel)"
                value={filters.paymentModel || ""}
                onChange={(e) => updateField("paymentModel", e.target.value)}
                placeholder="Commission / Target..."
              />
              <Input
                label="حالة الحساب بالمصدر (sourceStatus)"
                value={filters.sourceStatus || ""}
                onChange={(e) => updateField("sourceStatus", e.target.value)}
                placeholder="مثال: Active / Suspended..."
              />
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[var(--foreground)]">
                  حالة الاستخدام الشهري (monthlyUsageStatus)
                </label>
                <select
                  value={
                    filters.monthlyUsageStatus || filters.usageStatus || ""
                  }
                  onChange={(e) => {
                    onChange({
                      ...filters,
                      monthlyUsageStatus: e.target.value,
                      usageStatus: e.target.value,
                      page: 1,
                    });
                  }}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium"
                >
                  <option value="">الكل</option>
                  <option value="Used">مستخدم (Used)</option>
                  <option value="Unused">غير مستخدم (Unused)</option>
                  <option value="Unknown">غير معروف (Unknown)</option>
                </select>
              </div>

              <Input
                label="شريحة الجودة (latestQualitySegment)"
                value={filters.latestQualitySegment || ""}
                onChange={(e) =>
                  updateField("latestQualitySegment", e.target.value)
                }
                placeholder="مثال: A / B / Gold..."
              />
              <Input
                label="ترتيب الجودة من (qualityRankFrom)"
                type="number"
                value={filters.qualityRankFrom || ""}
                onChange={(e) => updateField("qualityRankFrom", e.target.value)}
                placeholder="من..."
              />
              <Input
                label="ترتيب الجودة إلى (qualityRankThrough)"
                type="number"
                value={filters.qualityRankThrough || ""}
                onChange={(e) =>
                  updateField("qualityRankThrough", e.target.value)
                }
                placeholder="إلى..."
              />
              <Input
                label="نقاط الجودة تساوي (qualityScoreEqual)"
                type="number"
                step="0.01"
                value={filters.qualityScoreEqual || ""}
                onChange={(e) =>
                  updateField("qualityScoreEqual", e.target.value)
                }
                placeholder="يساوي..."
              />
              <Input
                label="نقاط الجودة من (qualityScoreFrom)"
                type="number"
                step="0.01"
                value={filters.qualityScoreFrom || ""}
                onChange={(e) =>
                  updateField("qualityScoreFrom", e.target.value)
                }
                placeholder="من..."
              />
              <Input
                label="نقاط الجودة إلى (qualityScoreThrough)"
                type="number"
                step="0.01"
                value={filters.qualityScoreThrough || ""}
                onChange={(e) =>
                  updateField("qualityScoreThrough", e.target.value)
                }
                placeholder="إلى..."
              />
              <div>
                <DateInput
                  label="مؤجل من تاريخ (deferredFrom)"
                  value={filters.deferredFrom || ""}
                  onChange={(val) => updateField("deferredFrom", val)}
                />
              </div>
              <div>
                <DateInput
                  label="مؤجل إلى تاريخ (deferredThrough)"
                  value={filters.deferredThrough || ""}
                  onChange={(val) => updateField("deferredThrough", val)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
