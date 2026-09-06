"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  Building2,
  Pencil,
  Trash2,
  X,
  FileCheck,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "../../../../lib/auth/AuthProvider";
import {
  createPayrollEmployee,
  deletePayrollEmployee,
  getPayrollEmployee,
  listPayrollEmployees,
  listSponsors,
  updatePayrollEmployee,
  type CreatePayrollEmployeeRequest,
  type PayrollEmployee,
  type SponsorOption,
  type UpdatePayrollEmployeeRequest,
} from "../../../../lib/workforce/payroll-employees-api";
import { extractErrorMessageFromBody } from "../../../../lib/auth/api";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { Input } from "../../../../components/ui/Input";
import { Modal } from "../../../../components/ui/Modal";
import { SearchableSelect } from "../../../../components/ui/SearchableSelect";
import { Table } from "../../../../components/ui/Table";
import { toast } from "../../../../components/ui/Toast";

type FormState = {
  number: string;
  sponsorId: string;
  name: string;
  nationalId: string;
  country: string;
  joiningDate: string;
  personalIban: string;
  salary: string;
  status: string;
};

const defaultFormState: FormState = {
  number: "",
  sponsorId: "",
  name: "",
  nationalId: "",
  country: "السعودية",
  joiningDate: new Date().toISOString().split("T")[0],
  personalIban: "",
  salary: "0",
  status: "",
};

function formatCurrency(amount: number, locale: "ar" | "en") {
  return new Intl.NumberFormat(locale === "en" ? "en-SA" : "ar-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string, locale: "ar" | "en") {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ar-SA-u-nu-arab", {
      dateStyle: "medium",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function PayrollEmployeesPage() {
  const { can, isLoading, locale } = useAuth();
  const isEn = locale === "en";

  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [sponsors, setSponsors] = useState<SponsorOption[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PayrollEmployee | null>(null);
  const [form, setForm] = useState<FormState>(defaultFormState);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Delete modal state
  const [deletingItem, setDeletingItem] = useState<PayrollEmployee | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);

  const canRead = can("employees.read");
  const canCreate = can("employees.create");
  const canUpdate = can("employees.update");
  const canArchive = can("employees.archive");
  const canReadSponsors = can("sponsors.read");

  const loadSponsorsData = useCallback(async () => {
    if (!canReadSponsors) return;
    try {
      const data = await listSponsors();
      setSponsors(data.filter((s) => s.status === "Active"));
    } catch (err) {
      console.error("Failed to load sponsors catalog", err);
    }
  }, [canReadSponsors]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [listData] = await Promise.all([
        listPayrollEmployees(search),
        loadSponsorsData(),
      ]);
      setEmployees(listData);
    } catch (err: any) {
      const msg =
        extractErrorMessageFromBody(err?.details) ||
        err?.message ||
        (isEn
          ? "Failed to load payroll employees. Check permissions and API connectivity."
          : "تعذر تحميل بيانات موظفي الرواتب. تحقق من الصلاحيات والاتصال.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [search, loadSponsorsData, isEn]);

  useEffect(() => {
    if (isLoading || !canRead) return;
    const timer = window.setTimeout(() => void loadData(), 300);
    return () => window.clearTimeout(timer);
  }, [isLoading, canRead, loadData]);

  const sponsorOptions = useMemo(() => {
    return sponsors.map((s) => ({
      value: s.id,
      label: s.registryNameAr || s.registryNameEn || s.employerIdentityNumber,
      sublabel: `رقم المنشأة: ${s.employerIdentityNumber}`,
    }));
  }, [sponsors]);

  const openCreateModal = () => {
    setEditingItem(null);
    const nextNumber =
      employees.length > 0 ? Math.max(...employees.map((e) => e.number)) + 1 : 1;
    setForm({
      ...defaultFormState,
      number: String(nextNumber),
      sponsorId: sponsors.length > 0 ? sponsors[0].id : "",
    });
    setFieldErrors({});
    setFormError("");
    setShowModal(true);
  };

  const openEditModal = (item: PayrollEmployee) => {
    setEditingItem(item);
    setForm({
      number: String(item.number),
      sponsorId: item.sponsorId,
      name: item.name,
      nationalId: item.nationalId,
      country: item.country,
      joiningDate: item.joiningDate ? item.joiningDate.split("T")[0] : "",
      personalIban: item.personalIban,
      salary: String(item.salary),
      status: item.status || "",
    });
    setFieldErrors({});
    setFormError("");
    setShowModal(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    const numVal = parseInt(form.number.trim(), 10);
    if (isNaN(numVal) || numVal <= 0) {
      errors.number = isEn
        ? "Number must be a positive integer."
        : "يجب أن يكون رقم الموظف (م) عدداً صحيحاً موجباً.";
    }

    if (!form.sponsorId) {
      errors.sponsorId = isEn
        ? "Please select a sponsor."
        : "يرجى اختيار الكفيل.";
    }

    if (!form.name.trim()) {
      errors.name = isEn ? "Name is required." : "الاسم مطلوب.";
    } else if (form.name.trim().length > 200) {
      errors.name = isEn
        ? "Name cannot exceed 200 characters."
        : "الاسم يجب ألا يتجاوز 200 حرف.";
    }

    const cleanNationalId = form.nationalId.trim();
    if (!/^[0-9]{10}$/.test(cleanNationalId)) {
      errors.nationalId = isEn
        ? "National ID must be exactly 10 digits."
        : "رقم الهوية يجب أن يتكون من 10 أرقام تماماً.";
    }

    if (!form.country.trim()) {
      errors.country = isEn ? "Country is required." : "البلد مطلوب.";
    } else if (form.country.trim().length > 100) {
      errors.country = isEn
        ? "Country cannot exceed 100 characters."
        : "اسم البلد يجب ألا يتجاوز 100 حرف.";
    }

    if (!form.joiningDate) {
      errors.joiningDate = isEn
        ? "Joining date is required."
        : "تاريخ الانضمام مطلوب.";
    }

    const cleanIban = form.personalIban.replace(/\s+/g, "").toUpperCase();
    if (!/^SA[0-9]{22}$/.test(cleanIban)) {
      errors.personalIban = isEn
        ? "Personal IBAN must start with SA followed by 22 digits."
        : "الايبان الشخصي يجب أن يبدأ بـ SA متبوعاً بـ 22 رقماً.";
    }

    const salaryVal = parseFloat(form.salary);
    if (isNaN(salaryVal) || salaryVal < 0) {
      errors.salary = isEn
        ? "Salary must be a non-negative number."
        : "الراتب يجب أن يكون رقماً أكبر من أو يساوي الصفر.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!validateForm()) return;

    setSubmitting(true);

    const cleanIban = form.personalIban.replace(/\s+/g, "").toUpperCase();

    try {
      if (editingItem) {
        const payload: UpdatePayrollEmployeeRequest = {
          number: parseInt(form.number.trim(), 10),
          sponsorId: form.sponsorId,
          name: form.name.trim(),
          nationalId: form.nationalId.trim(),
          country: form.country.trim(),
          joiningDate: form.joiningDate,
          personalIban: cleanIban,
          salary: parseFloat(form.salary),
          status: form.status.trim(),
          rowVersion: editingItem.rowVersion,
        };

        const updated = await updatePayrollEmployee(editingItem.id, payload);
        setEmployees((prev) =>
          prev.map((emp) => (emp.id === updated.id ? updated : emp)),
        );
        toast.success(
          isEn ? "Updated" : "تم التحديث",
          isEn
            ? `Employee ${updated.name} updated successfully.`
            : `تم تحديث بيانات ${updated.name} بنجاح.`,
        );
      } else {
        const payload: CreatePayrollEmployeeRequest = {
          number: parseInt(form.number.trim(), 10),
          sponsorId: form.sponsorId,
          name: form.name.trim(),
          nationalId: form.nationalId.trim(),
          country: form.country.trim(),
          joiningDate: form.joiningDate,
          personalIban: cleanIban,
          salary: parseFloat(form.salary),
          status: form.status.trim(),
        };

        const created = await createPayrollEmployee(payload);
        setEmployees((prev) => [created, ...prev]);
        toast.success(
          isEn ? "Created" : "تم الإضافة",
          isEn
            ? `Payroll employee ${created.name} added successfully.`
            : `تم إضافة موظف الرواتب ${created.name} بنجاح.`,
        );
      }
      setShowModal(false);
    } catch (err: any) {
      console.error("Payroll employee save error:", err);
      const details = err?.details || {};
      const errorCode = details.errorCode || "";
      const field = details.field || "";
      const backendMsg = extractErrorMessageFromBody(details) || err?.message;

      // Handle backend problem detail mapping
      if (errorCode === "payroll_employee.concurrency_conflict" || err?.status === 409) {
        if (errorCode === "payroll_employee.duplicate_number") {
          setFieldErrors((p) => ({
            ...p,
            number: isEn
              ? "Employee number is already taken."
              : "رقم الموظف (م) مُستخدم بالفعل.",
          }));
        } else if (errorCode === "payroll_employee.duplicate_national_id") {
          setFieldErrors((p) => ({
            ...p,
            nationalId: isEn
              ? "National ID is already registered."
              : "رقم الهوية مُسجل لموظف آخر.",
          }));
        } else if (errorCode === "payroll_employee.duplicate_iban") {
          setFieldErrors((p) => ({
            ...p,
            personalIban: isEn
              ? "IBAN is already registered."
              : "رقم الايبان مُسجل لموظف آخر.",
          }));
        } else if (errorCode === "payroll_employee.concurrency_conflict") {
          setFormError(
            isEn
              ? "This record was updated by another user. Reloading latest data..."
              : "تم تعديل هذا السجل بواسطة مستخدم آخر. جارٍ تحديث البيانات…",
          );
          if (editingItem) {
            getPayrollEmployee(editingItem.id)
              .then((latest) => {
                setEditingItem(latest);
                setForm((prev) => ({ ...prev, rowVersion: latest.rowVersion }));
              })
              .catch(() => void loadData());
          }
          return;
        }
      }

      if (field) {
        setFieldErrors((p) => ({ ...p, [field]: backendMsg }));
      }
      setFormError(backendMsg || (isEn ? "Failed to save record." : "تعذر حفظ بيانات الموظف."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deletingItem) return;
    setDeleting(true);
    try {
      await deletePayrollEmployee(
        deletingItem.id,
        deletingItem.rowVersion,
        deleteReason,
      );
      setEmployees((prev) => prev.filter((e) => e.id !== deletingItem.id));
      toast.success(
        isEn ? "Deleted" : "تم الحذف",
        isEn
          ? `Payroll record for ${deletingItem.name} removed successfully.`
          : `تم حذف سجل الموظف ${deletingItem.name} بنجاح.`,
      );
      setDeletingItem(null);
      setDeleteReason("");
    } catch (err: any) {
      console.error("Payroll employee delete error:", err);
      const msg =
        extractErrorMessageFromBody(err?.details) ||
        err?.message ||
        (isEn ? "Failed to delete record." : "تعذر حذف سجل الموظف.");
      toast.error(isEn ? "Delete Failed" : "فشل الحذف", msg);
    } finally {
      setDeleting(false);
    }
  };

  if (!isLoading && !canRead) {
    return (
      <Card className="p-8">
        <div className="flex items-center gap-3 text-red-600">
          <ShieldAlert size={24} />
          <h1 className="text-xl font-black">
            {isEn ? "Not Authorized" : "غير مصرح بالوصول"}
          </h1>
        </div>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {isEn
            ? "You require employees.read permission to view payroll employees & social insurance."
            : "تحتاج إلى صلاحية employees.read لعرض سجلات موظفي الرواتب والتأمينات الاجتماعية."}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#1167c9]">
            {isEn ? "Human Resources" : "الموارد البشرية"}
          </p>
          <h1 className="mt-1 text-3xl font-black">
            {isEn ? "Social Insurance (Payroll Employees)" : "التأمينات الاجتماعية - موظفو الرواتب"}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {isEn
              ? "Manage registered payroll employees, linked sponsors, Saudi IBANs, and salary identity records."
              : "إدارة ومتابعة سجلات موظفي الرواتب المسجلين بالتأمينات الاجتماعية، الكفلاء، والايبانات."}
          </p>
        </div>
        {canCreate && (
          <Button onClick={openCreateModal}>
            <Plus size={17} />
            {isEn ? "Add Payroll Employee" : "إضافة موظف رواتب جديد"}
          </Button>
        )}
      </div>

      {/* Main Table Card */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 text-[#1167c9]">
              <FileCheck size={20} />
            </div>
            <div>
              <h2 className="font-black">
                {isEn ? "Payroll Employees Register" : "سجل موظفي الرواتب"}
              </h2>
              <p className="text-xs text-[var(--muted)]">
                {employees.length} {isEn ? "records" : "سجل موظف"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <label className="flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-[var(--muted)]">
              <Search size={17} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  isEn
                    ? "Search name, national ID, IBAN..."
                    : "ابحث بالاسم، رقم الهوية، الايبان..."
                }
                className="w-56 bg-transparent text-sm text-[var(--foreground)] outline-none sm:w-80"
              />
            </label>
            <Button
              variant="secondary"
              onClick={() => void loadData()}
              aria-label={isEn ? "Refresh" : "تحديث"}
            >
              <RefreshCw size={17} />
            </Button>
          </div>
        </div>

        {error && (
          <div role="alert" className="m-5 flex items-center gap-2 rounded-xl bg-red-50 p-3.5 text-sm font-bold text-red-700">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="p-10 text-center text-sm text-[var(--muted)]">
            {isEn ? "Loading payroll employees data…" : "جارٍ تحميل سجلات التأمينات الاجتماعية والرواتب…"}
          </div>
        ) : (
          <Table>
            <thead className="border-b border-[var(--border)] bg-[var(--background)] text-xs text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3.5 w-14 text-center">م</th>
                <th className="px-5 py-3.5">{isEn ? "Name" : "الاسم"}</th>
                <th className="px-5 py-3.5">{isEn ? "National ID" : "رقم الهوية"}</th>
                <th className="px-5 py-3.5">{isEn ? "Country" : "البلد"}</th>
                <th className="px-5 py-3.5">{isEn ? "Joining Date" : "تاريخ الانضمام"}</th>
                <th className="px-5 py-3.5">{isEn ? "Personal IBAN" : "الايبان الشخصي"}</th>
                <th className="px-5 py-3.5">{isEn ? "Salary" : "الراتب"}</th>
                <th className="px-5 py-3.5">{isEn ? "Sponsor" : "الكفيل"}</th>
                <th className="px-5 py-3.5">{isEn ? "Status" : "الحالة"}</th>
                <th className="px-5 py-3.5 text-center">{isEn ? "Actions" : "الإجراءات"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-xs font-medium">
              {employees.map((item) => (
                <tr key={item.id} className="hover:bg-blue-500/5 transition-colors">
                  <td className="px-4 py-4 text-center font-bold font-mono text-[#1167c9]">
                    {item.number}
                  </td>
                  <td className="px-5 py-4">
                    <b className="block text-sm font-extrabold text-slate-900 dark:text-white">
                      {item.name}
                    </b>
                  </td>
                  <td className="px-5 py-4 font-mono font-bold" dir="ltr">
                    {item.nationalId}
                  </td>
                  <td className="px-5 py-4">{item.country}</td>
                  <td className="px-5 py-4 text-[var(--muted)]">
                    {formatDate(item.joiningDate, locale)}
                  </td>
                  <td className="px-5 py-4 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300" dir="ltr">
                    {item.personalIban}
                  </td>
                  <td className="px-5 py-4 font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(item.salary, locale)}
                  </td>
                  <td className="px-5 py-4">
                    <span className="block font-bold text-slate-800 dark:text-slate-200">
                      {item.sponsor?.registryNameAr || "—"}
                    </span>
                    {item.sponsor?.employerIdentityNumber && (
                      <span className="block text-[10px] font-mono text-[var(--muted)]">
                        70#: {item.sponsor.employerIdentityNumber}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {item.status ? (
                      <span className="inline-flex rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {item.status}
                      </span>
                    ) : (
                      <span className="text-[var(--muted)] font-mono">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-1.5">
                      {canUpdate && (
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-[#1167c9] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors"
                          title={isEn ? "Edit" : "تعديل"}
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                      {canArchive && (
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingItem(item);
                            setDeleteReason("");
                          }}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/40 dark:hover:bg-red-900/60 transition-colors"
                          title={isEn ? "Delete" : "حذف"}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-sm text-[var(--muted)]">
                    {isEn
                      ? "No payroll employee records found."
                      : "لا توجد سجلات لموظفي الرواتب والتأمينات الاجتماعية."}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Create / Edit Modal */}
      {showModal && (
        <Modal
          isOpen={showModal}
          title={
            editingItem
              ? isEn
                ? `Edit Payroll Employee: ${editingItem.name}`
                : `تعديل بيانات موظف الرواتب: ${editingItem.name}`
              : isEn
                ? "Add New Payroll Employee"
                : "إضافة موظف رواتب جديد"
          }
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            {formError && (
              <div role="alert" className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Input
                  label={isEn ? "Number (م) *" : "رقم الموظف (م) *"}
                  type="number"
                  required
                  min={1}
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                />
                {fieldErrors.number && (
                  <p className="mt-1 text-[11px] font-bold text-red-600">{fieldErrors.number}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-[var(--foreground)]">
                  {isEn ? "Sponsor *" : "الكفيل *"}
                </label>
                <SearchableSelect
                  value={form.sponsorId}
                  onChange={(val) => setForm({ ...form, sponsorId: val })}
                  options={sponsorOptions}
                  placeholder={isEn ? "Select Sponsor..." : "اختر الكفيل..."}
                />
                {fieldErrors.sponsorId && (
                  <p className="mt-1 text-[11px] font-bold text-red-600">{fieldErrors.sponsorId}</p>
                )}
              </div>
            </div>

            <div>
              <Input
                label={isEn ? "Employee Full Name *" : "الاسم الكامل للموظف *"}
                required
                maxLength={200}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {fieldErrors.name && (
                <p className="mt-1 text-[11px] font-bold text-red-600">{fieldErrors.name}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Input
                  label={isEn ? "National ID (10 digits) *" : "رقم الهوية (10 أرقام) *"}
                  required
                  maxLength={10}
                  dir="ltr"
                  value={form.nationalId}
                  onChange={(e) =>
                    setForm({ ...form, nationalId: e.target.value.replace(/[^0-9]/g, "") })
                  }
                />
                {fieldErrors.nationalId && (
                  <p className="mt-1 text-[11px] font-bold text-red-600">{fieldErrors.nationalId}</p>
                )}
              </div>

              <div>
                <Input
                  label={isEn ? "Country *" : "البلد *"}
                  required
                  maxLength={100}
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                />
                {fieldErrors.country && (
                  <p className="mt-1 text-[11px] font-bold text-red-600">{fieldErrors.country}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Input
                  label={isEn ? "Joining Date *" : "تاريخ الانضمام *"}
                  type="date"
                  required
                  value={form.joiningDate}
                  onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
                />
                {fieldErrors.joiningDate && (
                  <p className="mt-1 text-[11px] font-bold text-red-600">{fieldErrors.joiningDate}</p>
                )}
              </div>

              <div>
                <Input
                  label={isEn ? "Personal IBAN (SA...) *" : "الايبان الشخصي (SA...) *"}
                  required
                  dir="ltr"
                  placeholder="SA6980000107608016495857"
                  value={form.personalIban}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      personalIban: e.target.value.replace(/\s+/g, "").toUpperCase(),
                    })
                  }
                />
                {fieldErrors.personalIban && (
                  <p className="mt-1 text-[11px] font-bold text-red-600">{fieldErrors.personalIban}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Input
                  label={isEn ? "Salary (SAR) *" : "الراتب (ر.س) *"}
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.salary}
                  onChange={(e) => setForm({ ...form, salary: e.target.value })}
                />
                {fieldErrors.salary && (
                  <p className="mt-1 text-[11px] font-bold text-red-600">{fieldErrors.salary}</p>
                )}
              </div>

              <div>
                <Input
                  label={isEn ? "Status" : "الحالة"}
                  maxLength={100}
                  placeholder={isEn ? "Optional status..." : "حالة اختيارية..."}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-4 mt-6">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                {isEn ? "Cancel" : "إلغاء"}
              </Button>
              <Button type="submit" loading={submitting}>
                {isEn ? "Save Record" : "حفظ السجل"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <Modal
          isOpen={Boolean(deletingItem)}
          title={isEn ? "Confirm Delete Payroll Employee" : "تأكيد حذف موظف الرواتب"}
          onClose={() => setDeletingItem(null)}
        >
          <div className="space-y-4 pt-2">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {isEn
                ? `Are you sure you want to remove payroll employee record for "${deletingItem.name}" (#${deletingItem.number})?`
                : `هل أنت تأكد من رغبتك في حذف سجل موظف الرواتب "${deletingItem.name}" (رقم ${deletingItem.number})؟`}
            </p>

            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--foreground)]">
                {isEn ? "Reason for deletion (Optional)" : "سبب الحذف (اختياري)"}
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={2}
                placeholder={isEn ? "Enter deletion reason..." : "أدخل سبب الحذف..."}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs outline-none focus:border-[#1167c9]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-4">
              <Button type="button" variant="secondary" onClick={() => setDeletingItem(null)}>
                {isEn ? "Cancel" : "إلغاء"}
              </Button>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700 text-white"
                loading={deleting}
                onClick={() => void handleDeleteSubmit()}
              >
                {isEn ? "Delete Record" : "حذف السجل"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
