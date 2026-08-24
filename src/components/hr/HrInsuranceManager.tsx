"use client";

import { useEffect, useState, useMemo, type FormEvent } from "react";
import {
  ShieldCheck,
  Building2,
  Layers,
  FileCheck,
  Plus,
  Search,
  Edit2,
  Archive,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Users,
} from "lucide-react";
import { useAuth } from "../../lib/auth/AuthProvider";
import { translate } from "../../lib/i18n";
import {
  getInsuranceCompanies,
  createInsuranceCompany,
  updateInsuranceCompany,
  archiveInsuranceCompany,
  getInsurancePlans,
  createInsurancePlan,
  updateInsurancePlan,
  archiveInsurancePlan,
  getInsurancePolicies,
  createInsurancePolicy,
  updateInsurancePolicy,
  archiveInsurancePolicy,
  type InsuranceCompany,
  type InsuranceCompanyInput,
  type InsurancePlan,
  type InsurancePlanInput,
  type InsurancePolicy,
  type InsurancePolicyInput,
} from "../../lib/workforce/compliance-api";
import { listEmployees } from "../../lib/workforce/api";
import type { Employee } from "../../lib/workforce/types";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { systemPrompt } from "../ui/SystemDialog";
import { toast } from "../ui/Toast";
import { SearchableSelect } from "../ui/SearchableSelect";

type ActiveTab = "companies" | "plans" | "policies";

export function HrInsuranceManager() {
  const { can, locale } = useAuth();
  const t = (key: string) => translate(locale, key);

  const [activeTab, setActiveTab] = useState<ActiveTab>("companies");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [plans, setPlans] = useState<InsurancePlan[]>([]);
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Selection & filter states
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal states
  const [companyModal, setCompanyModal] = useState<{ open: boolean; data?: InsuranceCompany | null }>({ open: false });
  const [planModal, setPlanModal] = useState<{ open: boolean; data?: InsurancePlan | null }>({ open: false });
  const [policyModal, setPolicyModal] = useState<{ open: boolean; data?: InsurancePolicy | null }>({ open: false });

  // Secondary selection states inside policy modal
  const [policyModalEmployeeId, setPolicyModalEmployeeId] = useState<string>("");
  const [policyModalCompanyId, setPolicyModalCompanyId] = useState<string>("");
  const [policyModalPlanId, setPolicyModalPlanId] = useState<string>("");
  const [policyModalPlans, setPolicyModalPlans] = useState<InsurancePlan[]>([]);
  const [saving, setSaving] = useState(false);

  const canRead = can("insurance.read");
  const canManage = can("insurance.manage");

  // Load Companies & Employees on mount
  useEffect(() => {
    if (!canRead) return;
    void loadCompanies();
    void loadEmployees();
  }, [canRead]);

  // Load Plans when selectedCompanyId changes in plans tab
  useEffect(() => {
    if (!canRead) return;
    if (activeTab === "plans") {
      if (selectedCompanyId) {
        void loadPlans(selectedCompanyId);
      } else if (companies.length > 0) {
        setSelectedCompanyId(companies[0].id);
      } else {
        setPlans([]);
      }
    }
  }, [activeTab, selectedCompanyId, companies, canRead]);

  // Load Policies when policies tab active or employee filter changes
  useEffect(() => {
    if (!canRead) return;
    if (activeTab === "policies") {
      void loadPolicies(selectedEmployeeId || undefined);
    }
  }, [activeTab, selectedEmployeeId, canRead]);

  // Load Plans for Policy Modal when company selected in form
  useEffect(() => {
    if (policyModalCompanyId) {
      void getInsurancePlans(policyModalCompanyId).then(setPolicyModalPlans).catch(() => setPolicyModalPlans([]));
    } else {
      setPolicyModalPlans([]);
    }
  }, [policyModalCompanyId]);

  async function loadCompanies() {
    try {
      setLoading(true);
      setError(null);
      const res = await getInsuranceCompanies();
      setCompanies(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load insurance companies";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function loadEmployees() {
    try {
      const res = await listEmployees();
      setEmployees(res);
    } catch {
      // Ignore non-critical employee list error
    }
  }

  async function loadPlans(companyId: string) {
    if (!companyId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await getInsurancePlans(companyId);
      setPlans(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load insurance plans";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function loadPolicies(employeeId?: string) {
    try {
      setLoading(true);
      setError(null);
      const res = await getInsurancePolicies(employeeId);
      setPolicies(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load insurance policies";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  // --- Handlers for Company ---
  async function handleSaveCompany(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canManage) return;
    const form = new FormData(e.currentTarget);
    const editing = companyModal.data;

    const payload: InsuranceCompanyInput = {
      code: String(form.get("code") || "").trim(),
      nameAr: String(form.get("nameAr") || "").trim(),
      nameEn: String(form.get("nameEn") || "").trim() || null,
      providerRegistrationNumber: String(form.get("providerRegistrationNumber") || "").trim() || null,
      contactName: String(form.get("contactName") || "").trim() || null,
      contactPhone: String(form.get("contactPhone") || "").trim() || null,
      contactEmail: String(form.get("contactEmail") || "").trim() || null,
      status: String(form.get("status") || "Active"),
      notes: String(form.get("notes") || "").trim() || null,
      rowVersion: editing ? editing.rowVersion : null,
    };

    setSaving(true);
    try {
      if (editing) {
        await updateInsuranceCompany(editing.id, payload);
        toast.success(
          locale === "en" ? "Company Updated" : "تم التحديث",
          locale === "en" ? "Insurance company updated successfully." : "تم تحديث بيانات شركة التأمين بنجاح."
        );
      } else {
        await createInsuranceCompany(payload);
        toast.success(
          locale === "en" ? "Company Created" : "تم الإنشاء",
          locale === "en" ? "Insurance company created successfully." : "تم إنشاء شركة التأمين بنجاح."
        );
      }
      setCompanyModal({ open: false });
      await loadCompanies();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error saving insurance company";
      toast.error(locale === "en" ? "Save Failed" : "فشل الحفظ", msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleArchiveCompany(company: InsuranceCompany) {
    if (!canManage) return;
    const reason = await systemPrompt(
      locale === "en" ? "Enter reason for archiving company:" : "أدخل سبب أرشفة الشركة:",
      "",
      locale === "en" ? "Archive Insurance Company" : "أرشفة شركة التأمين"
    );
    if (!reason) return;

    try {
      await archiveInsuranceCompany(company.id, reason, company.rowVersion);
      toast.success(
        locale === "en" ? "Company Archived" : "تمت الأرشفة",
        locale === "en" ? "Insurance company archived successfully." : "تمت أرشفة شركة التأمين بنجاح."
      );
      await loadCompanies();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Archive failed";
      toast.error(locale === "en" ? "Archive Failed" : "فشلت الأرشفة", msg);
    }
  }

  // --- Handlers for Plan ---
  async function handleSavePlan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canManage) return;
    const form = new FormData(e.currentTarget);
    const editing = planModal.data;
    const companyId = String(form.get("insuranceCompanyId") || selectedCompanyId);

    if (!companyId) {
      toast.error(locale === "en" ? "Error" : "خطأ", locale === "en" ? "Please select an insurance company." : "يرجى تحديد شركة تأمين.");
      return;
    }

    const payload: InsurancePlanInput = {
      code: String(form.get("code") || "").trim(),
      nameAr: String(form.get("nameAr") || "").trim(),
      nameEn: String(form.get("nameEn") || "").trim() || null,
      rank: Number(form.get("rank") || 1),
      networkName: String(form.get("networkName") || "").trim() || null,
      coverageClass: String(form.get("coverageClass") || "").trim() || null,
      annualCoverageLimit: form.get("annualCoverageLimit") ? Number(form.get("annualCoverageLimit")) : null,
      deductiblePercentage: form.get("deductiblePercentage") ? Number(form.get("deductiblePercentage")) : null,
      effectiveFrom: String(form.get("effectiveFrom") || ""),
      effectiveTo: String(form.get("effectiveTo") || "").trim() || null,
      status: String(form.get("status") || "Active"),
      rowVersion: editing ? editing.rowVersion : null,
    };

    setSaving(true);
    try {
      if (editing) {
        await updateInsurancePlan(companyId, editing.id, payload);
        toast.success(
          locale === "en" ? "Plan Updated" : "تم التحديث",
          locale === "en" ? "Insurance plan updated successfully." : "تم تحديث خطة التأمين بنجاح."
        );
      } else {
        await createInsurancePlan(companyId, payload);
        toast.success(
          locale === "en" ? "Plan Created" : "تم الإنشاء",
          locale === "en" ? "Insurance plan created successfully." : "تم إنشاء خطة التأمين بنجاح."
        );
      }
      setPlanModal({ open: false });
      await loadPlans(companyId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error saving insurance plan";
      toast.error(locale === "en" ? "Save Failed" : "فشل الحفظ", msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleArchivePlan(plan: InsurancePlan) {
    if (!canManage) return;
    const reason = await systemPrompt(
      locale === "en" ? "Enter reason for archiving plan:" : "أدخل سبب أرشفة الخطة:",
      "",
      locale === "en" ? "Archive Insurance Plan" : "أرشفة خطة التأمين"
    );
    if (!reason) return;

    try {
      await archiveInsurancePlan(plan.id, reason, plan.rowVersion);
      toast.success(
        locale === "en" ? "Plan Archived" : "تمت الأرشفة",
        locale === "en" ? "Insurance plan archived successfully." : "تمت أرشفة خطة التأمين بنجاح."
      );
      if (selectedCompanyId) await loadPlans(selectedCompanyId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Archive failed";
      toast.error(locale === "en" ? "Archive Failed" : "فشلت الأرشفة", msg);
    }
  }

  // --- Handlers for Policy ---
  async function handleSavePolicy(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canManage) return;
    const form = new FormData(e.currentTarget);
    const editing = policyModal.data;
    const empId = String(form.get("employeeId") || "").trim();

    if (!empId) {
      toast.error(locale === "en" ? "Error" : "خطأ", locale === "en" ? "Employee is required." : "الموظف حقل إجباري.");
      return;
    }

    const payload: InsurancePolicyInput = {
      insuranceCompanyId: String(form.get("insuranceCompanyId") || ""),
      insurancePlanLevelId: String(form.get("insurancePlanLevelId") || ""),
      policyNumber: String(form.get("policyNumber") || "").trim(),
      memberNumber: String(form.get("memberNumber") || "").trim(),
      startDate: String(form.get("startDate") || ""),
      endDate: String(form.get("endDate") || ""),
      status: String(form.get("status") || "Active"),
      isCurrent: form.get("isCurrent") === "on" || form.get("isCurrent") === "true",
      previousPolicyId: String(form.get("previousPolicyId") || "").trim() || null,
      employeeDocumentId: String(form.get("employeeDocumentId") || "").trim() || null,
      notes: String(form.get("notes") || "").trim() || null,
      rowVersion: editing ? editing.rowVersion : null,
    };

    setSaving(true);
    try {
      if (editing) {
        await updateInsurancePolicy(empId, editing.id, payload);
        toast.success(
          locale === "en" ? "Policy Updated" : "تم التحديث",
          locale === "en" ? "Insurance policy updated successfully." : "تم تحديث وثيقة التأمين بنجاح."
        );
      } else {
        await createInsurancePolicy(empId, payload);
        toast.success(
          locale === "en" ? "Policy Created" : "تم الإنشاء",
          locale === "en" ? "Insurance policy created successfully." : "تم إنشاء وثيقة التأمين بنجاح."
        );
      }
      setPolicyModal({ open: false });
      await loadPolicies(selectedEmployeeId || undefined);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error saving insurance policy";
      toast.error(locale === "en" ? "Save Failed" : "فشل الحفظ", msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleArchivePolicy(policy: InsurancePolicy) {
    if (!canManage) return;
    const reason = await systemPrompt(
      locale === "en" ? "Enter reason for archiving policy:" : "أدخل سبب أرشفة الوثيقة:",
      "",
      locale === "en" ? "Archive Insurance Policy" : "أرشفة وثيقة التأمين"
    );
    if (!reason) return;

    try {
      await archiveInsurancePolicy(policy.id, reason, policy.rowVersion);
      toast.success(
        locale === "en" ? "Policy Archived" : "تمت الأرشفة",
        locale === "en" ? "Insurance policy archived successfully." : "تمت أرشفة وثيقة التأمين بنجاح."
      );
      await loadPolicies(selectedEmployeeId || undefined);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Archive failed";
      toast.error(locale === "en" ? "Archive Failed" : "فشلت الأرشفة", msg);
    }
  }

  // --- Filtering ---
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const matchesSearch =
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.nameEn && c.nameEn.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.providerRegistrationNumber && c.providerRegistrationNumber.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === "ALL" || c.status.toUpperCase() === statusFilter.toUpperCase();
      return matchesSearch && matchesStatus;
    });
  }, [companies, searchQuery, statusFilter]);

  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      const matchesSearch =
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.nameEn && p.nameEn.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.networkName && p.networkName.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === "ALL" || p.status.toUpperCase() === statusFilter.toUpperCase();
      return matchesSearch && matchesStatus;
    });
  }, [plans, searchQuery, statusFilter]);

  const filteredPolicies = useMemo(() => {
    return policies.filter((pol) => {
      const matchesSearch =
        pol.insuranceCompanyAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pol.insurancePlanAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pol.policyNumberMasked && pol.policyNumberMasked.includes(searchQuery)) ||
        (pol.memberNumberMasked && pol.memberNumberMasked.includes(searchQuery));
      const matchesStatus = statusFilter === "ALL" || pol.status.toUpperCase() === statusFilter.toUpperCase();
      return matchesSearch && matchesStatus;
    });
  }, [policies, searchQuery, statusFilter]);

  if (!canRead) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 font-medium">
        <p className="flex items-center gap-2 text-lg font-bold">
          <AlertCircle size={22} />
          {locale === "en" ? "Access Denied" : "غير مصرح لك بالوصول"}
        </p>
        <p className="mt-2 text-sm">
          {locale === "en"
            ? "You do not have permission to view insurance configuration."
            : "لا تملك الصلاحية المطلوبة (insurance.read) لعرض إعدادات وموضوعات التأمين الطبي."}
        </p>
      </div>
    );
  }

  const inputCls = "h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[#1167c9] focus:ring-4 focus:ring-blue-100 transition-all";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-[#1167c9]">{t("nav.hrManagement")}</p>
          <h1 className="mt-1 flex items-center gap-2.5 text-3xl font-black">
            <ShieldCheck className="text-[#1167c9]" size={32} />
            {locale === "en" ? "Medical Insurance Management" : "إدارة التأمين الطبي"}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {locale === "en"
              ? "Manage insurance companies, plans, and employee policies seamlessly."
              : "إدارة شركات التأمين، خطط الفئات، ووثائق تأمين الموظفين من مكان واحد."}
          </p>
        </div>

        {canManage && (
          <div>
            {activeTab === "companies" && (
              <Button
                type="button"
                onClick={() => setCompanyModal({ open: true, data: null })}
                className="gap-2 font-bold shadow-md hover:shadow-lg transition-shadow"
              >
                <Plus size={18} />
                {locale === "en" ? "New Insurance Company" : "إضافة شركة تأمين"}
              </Button>
            )}

            {activeTab === "plans" && (
              <Button
                type="button"
                onClick={() => setPlanModal({ open: true, data: null })}
                disabled={!selectedCompanyId}
                className="gap-2 font-bold shadow-md hover:shadow-lg transition-shadow"
              >
                <Plus size={18} />
                {locale === "en" ? "New Plan" : "إضافة خطة تأمين"}
              </Button>
            )}

            {activeTab === "policies" && (
              <Button
                type="button"
                onClick={() => {
                  setPolicyModalEmployeeId(selectedEmployeeId || "");
                  setPolicyModalCompanyId(companies[0]?.id || "");
                  setPolicyModalPlanId("");
                  setPolicyModal({ open: true, data: null });
                }}
                className="gap-2 font-bold shadow-md hover:shadow-lg transition-shadow"
              >
                <Plus size={18} />
                {locale === "en" ? "New Employee Policy" : "إضافة وثيقة للموظف"}
              </Button>
            )}
          </div>
        )}
      </header>

      {/* Main Tab Navigation */}
      <div
        role="tablist"
        className="flex gap-2 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-sm"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "companies"}
          onClick={() => {
            setActiveTab("companies");
            setSearchQuery("");
            setStatusFilter("ALL");
          }}
          className={`inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl px-5 text-sm font-bold transition-all ${
            activeTab === "companies"
              ? "bg-[#1167c9] text-white shadow-md"
              : "text-[var(--muted)] hover:bg-blue-50 hover:text-[#1167c9]"
          }`}
        >
          <Building2 size={18} />
          {locale === "en" ? "Insurance Companies" : "شركات التأمين"}
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              activeTab === "companies" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            {companies.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "plans"}
          onClick={() => {
            setActiveTab("plans");
            setSearchQuery("");
            setStatusFilter("ALL");
          }}
          className={`inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl px-5 text-sm font-bold transition-all ${
            activeTab === "plans"
              ? "bg-[#1167c9] text-white shadow-md"
              : "text-[var(--muted)] hover:bg-blue-50 hover:text-[#1167c9]"
          }`}
        >
          <Layers size={18} />
          {locale === "en" ? "Company Plans" : "خطط الفئات"}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "policies"}
          onClick={() => {
            setActiveTab("policies");
            setSearchQuery("");
            setStatusFilter("ALL");
          }}
          className={`inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl px-5 text-sm font-bold transition-all ${
            activeTab === "policies"
              ? "bg-[#1167c9] text-white shadow-md"
              : "text-[var(--muted)] hover:bg-blue-50 hover:text-[#1167c9]"
          }`}
        >
          <FileCheck size={18} />
          {locale === "en" ? "Employee Policies" : "وثائق التأمين"}
        </button>
      </div>

      {/* General Error Banner */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </p>
          <button
            onClick={() => {
              if (activeTab === "companies") void loadCompanies();
              else if (activeTab === "plans" && selectedCompanyId) void loadPlans(selectedCompanyId);
              else if (activeTab === "policies") void loadPolicies(selectedEmployeeId || undefined);
            }}
            className="inline-flex items-center gap-1 font-bold underline hover:text-red-900"
          >
            <RefreshCw size={14} />
            {locale === "en" ? "Retry" : "إعادة المحاولة"}
          </button>
        </div>
      )}

      {/* TAB 1: Companies */}
      {activeTab === "companies" && (
        <div className="space-y-4">
          {/* Controls & Filter Bar */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="relative flex-1 min-w-[240px]">
                <Search size={18} className="absolute right-3.5 top-3.5 text-[var(--muted)]" />
                <input
                  type="text"
                  placeholder={
                    locale === "en" ? "Search by code, company name, or registration #..." : "ابحث بالرمز، اسم الشركة، أو رقم التسجيل..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pr-10 pl-4 text-sm outline-none focus:border-[#1167c9]"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-[var(--muted)]">
                  {locale === "en" ? "Status:" : "الحالة:"}
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium outline-none"
                >
                  <option value="ALL">{locale === "en" ? "All Statuses" : "جميع الحالات"}</option>
                  <option value="Active">{locale === "en" ? "Active" : "نشط"}</option>
                  <option value="Suspended">{locale === "en" ? "Suspended" : "موقوف"}</option>
                  <option value="Inactive">{locale === "en" ? "Inactive" : "غير نشط"}</option>
                </select>

                <Button
                  variant="secondary"
                  onClick={() => void loadCompanies()}
                  loading={loading}
                  className="h-11 px-3"
                  title={locale === "en" ? "Refresh list" : "تحديث القائمة"}
                >
                  <RefreshCw size={16} />
                </Button>
              </div>
            </div>
          </Card>

          {/* Companies Table */}
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-sm">
                <thead className="bg-slate-50 border-b border-[var(--border)] text-xs font-bold text-[var(--muted)] uppercase">
                  <tr>
                    <th className="p-4 text-start">{locale === "en" ? "Code" : "الرمز"}</th>
                    <th className="p-4 text-start">{locale === "en" ? "Company Name" : "اسم الشركة"}</th>
                    <th className="p-4 text-start">{locale === "en" ? "Reg. #" : "رقم التسجيل"}</th>
                    <th className="p-4 text-start">{locale === "en" ? "Contact Person" : "المسؤول"}</th>
                    <th className="p-4 text-start">{locale === "en" ? "Contact Phone / Email" : "التواصل"}</th>
                    <th className="p-4 text-start">{locale === "en" ? "Status" : "الحالة"}</th>
                    <th className="p-4 text-center">{locale === "en" ? "Actions" : "الإجراءات"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {loading && companies.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[var(--muted)] font-medium">
                        {locale === "en" ? "Loading companies..." : "جارٍ تحميل شركات التأمين..."}
                      </td>
                    </tr>
                  ) : filteredCompanies.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[var(--muted)] font-medium">
                        {locale === "en" ? "No insurance companies found." : "لا توجد شركات تأمين مضافة."}
                      </td>
                    </tr>
                  ) : (
                    filteredCompanies.map((comp) => (
                      <tr key={comp.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-4 font-mono font-bold text-[#1167c9]">{comp.code}</td>
                        <td className="p-4">
                          <p className="font-bold">{comp.nameAr}</p>
                          {comp.nameEn && <p className="text-xs text-[var(--muted)]">{comp.nameEn}</p>}
                        </td>
                        <td className="p-4 font-mono text-xs">{comp.providerRegistrationNumber || "—"}</td>
                        <td className="p-4 font-medium">{comp.contactName || "—"}</td>
                        <td className="p-4 text-xs">
                          <p className="font-mono">{comp.contactPhone || "—"}</p>
                          <p className="text-[var(--muted)]">{comp.contactEmail || "—"}</p>
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black ${
                              comp.status === "Active"
                                ? "bg-emerald-100 text-emerald-800"
                                : comp.status === "Suspended"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            <CheckCircle2 size={12} />
                            {comp.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setSelectedCompanyId(comp.id);
                                setActiveTab("plans");
                              }}
                              className="h-8 rounded-lg bg-blue-50 px-2.5 text-xs font-bold text-[#1167c9] hover:bg-blue-100 transition-colors"
                              title={locale === "en" ? "View Plans" : "عرض الفئات والخطط"}
                            >
                              <Layers size={14} className="inline ml-1" />
                              {locale === "en" ? "Plans" : "الخطط"}
                            </button>

                            {canManage && (
                              <>
                                <button
                                  onClick={() => setCompanyModal({ open: true, data: comp })}
                                  className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                                  title={locale === "en" ? "Edit Company" : "تعديل الشركة"}
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => void handleArchiveCompany(comp)}
                                  className="grid h-8 w-8 place-items-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                  title={locale === "en" ? "Archive Company" : "أرشفة الشركة"}
                                >
                                  <Archive size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: Plans */}
      {activeTab === "plans" && (
        <div className="space-y-4">
          {/* Company Selector & Filter Bar */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                <label className="text-sm font-bold whitespace-nowrap">
                  {locale === "en" ? "Select Insurance Company:" : "اختر شركة التأمين:"}
                </label>
                <SearchableSelect
                  value={selectedCompanyId}
                  onChange={setSelectedCompanyId}
                  options={companies.map((c) => ({
                    value: c.id,
                    label: c.nameAr,
                    sublabel: c.code,
                    keywords: `${c.nameEn || ""} ${c.code}`,
                  }))}
                  placeholder={locale === "en" ? "Select Company..." : "اختر شركة التأمين..."}
                  searchPlaceholder={locale === "en" ? "Search company..." : "ابحث بالاسم أو الرمز..."}
                  className="max-w-xs flex-1"
                />
              </div>

              <div className="relative min-w-[200px]">
                <Search size={18} className="absolute right-3.5 top-3.5 text-[var(--muted)]" />
                <input
                  type="text"
                  placeholder={locale === "en" ? "Search plan name/code..." : "ابحث باسم الفئة أو الرمز..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pr-10 pl-4 text-sm outline-none focus:border-[#1167c9]"
                />
              </div>

              <Button
                variant="secondary"
                onClick={() => selectedCompanyId && void loadPlans(selectedCompanyId)}
                loading={loading}
                className="h-11 px-3"
                title={locale === "en" ? "Refresh plans" : "تحديث الخطط"}
              >
                <RefreshCw size={16} />
              </Button>
            </div>
          </Card>

          {/* Plans Table */}
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-sm">
                <thead className="bg-slate-50 border-b border-[var(--border)] text-xs font-bold text-[var(--muted)] uppercase">
                  <tr>
                    <th className="p-4 text-start">{locale === "en" ? "Rank" : "المرتبة"}</th>
                    <th className="p-4 text-start">{locale === "en" ? "Plan Code" : "رمز الفئة"}</th>
                    <th className="p-4 text-start">{locale === "en" ? "Plan Name" : "اسم الفئة"}</th>
                    <th className="p-4 text-start">{locale === "en" ? "Network" : "الشبكة"}</th>
                    <th className="p-4 text-start">{locale === "en" ? "Class" : "الدرجة"}</th>
                    <th className="p-4 text-start">{locale === "en" ? "Annual Limit" : "الحد السنوي"}</th>
                    <th className="p-4 text-start">{locale === "en" ? "Deductible %" : "التحمل %"}</th>
                    <th className="p-4 text-start">{locale === "en" ? "Validity Period" : "الصلاحية"}</th>
                    <th className="p-4 text-start">{locale === "en" ? "Status" : "الحالة"}</th>
                    <th className="p-4 text-center">{locale === "en" ? "Actions" : "الإجراءات"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {!selectedCompanyId ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-[var(--muted)] font-medium">
                        {locale === "en"
                          ? "Please select an insurance company to view plans."
                          : "يرجى اختيار شركة تأمين لعرض الخطط التابعة لها."}
                      </td>
                    </tr>
                  ) : loading && plans.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-[var(--muted)] font-medium">
                        {locale === "en" ? "Loading company plans..." : "جارٍ تحميل خطط التأمين..."}
                      </td>
                    </tr>
                  ) : filteredPlans.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-[var(--muted)] font-medium">
                        {locale === "en" ? "No plans found for this company." : "لا توجد خطط مضافة لهذه الشركة."}
                      </td>
                    </tr>
                  ) : (
                    filteredPlans.map((plan) => (
                      <tr key={plan.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-4 font-black text-slate-700">#{plan.rank}</td>
                        <td className="p-4 font-mono font-bold text-[#1167c9]">{plan.code}</td>
                        <td className="p-4">
                          <p className="font-bold">{plan.nameAr}</p>
                          {plan.nameEn && <p className="text-xs text-[var(--muted)]">{plan.nameEn}</p>}
                        </td>
                        <td className="p-4 font-medium">{plan.networkName || "—"}</td>
                        <td className="p-4 font-bold text-slate-800">{plan.coverageClass || "—"}</td>
                        <td className="p-4 font-mono font-bold">
                          {plan.annualCoverageLimit != null
                            ? plan.annualCoverageLimit.toLocaleString() + " SAR"
                            : "—"}
                        </td>
                        <td className="p-4 font-mono text-xs">{plan.deductiblePercentage != null ? `${plan.deductiblePercentage}%` : "—"}</td>
                        <td className="p-4 text-xs font-mono">
                          {plan.effectiveFrom} {plan.effectiveTo ? ` ➔ ${plan.effectiveTo}` : ""}
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black ${
                              plan.status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {plan.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {canManage && (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setPlanModal({ open: true, data: plan })}
                                className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                                title={locale === "en" ? "Edit Plan" : "تعديل الخطة"}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => void handleArchivePlan(plan)}
                                className="grid h-8 w-8 place-items-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                title={locale === "en" ? "Archive Plan" : "أرشفة الخطة"}
                              >
                                <Archive size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: Policies */}
      {activeTab === "policies" && (
        <div className="space-y-4">
          {/* Employee Filter & Search Bar */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                <label className="text-sm font-bold whitespace-nowrap">
                  <Users size={16} className="inline ml-1 text-[#1167c9]" />
                  {locale === "en" ? "Filter Employee:" : "تصفية حسب الموظف:"}
                </label>
                <SearchableSelect
                  value={selectedEmployeeId}
                  onChange={setSelectedEmployeeId}
                  options={[
                    { value: "", label: locale === "en" ? "All Employees" : "جميع الموظفين والمناديب" },
                    ...employees.map((emp) => ({
                      value: emp.id,
                      label: emp.fullNameAr,
                      sublabel: `إقامة/هوية: ${emp.iqamaNo}`,
                      keywords: `${emp.fullNameEn || ""} ${emp.primaryPhone || ""} ${emp.iqamaNo}`,
                    })),
                  ]}
                  placeholder={locale === "en" ? "All Employees" : "جميع الموظفين"}
                  searchPlaceholder={locale === "en" ? "Search employee by name or ID..." : "ابحث باسم الموظف أو الهوية..."}
                  className="max-w-xs flex-1"
                />
              </div>

              <div className="relative min-w-[200px]">
                <Search size={18} className="absolute right-3.5 top-3.5 text-[var(--muted)]" />
                <input
                  type="text"
                  placeholder={locale === "en" ? "Search policy #, company, plan..." : "ابحث برقم الوثيقة، الشركة، الفئة..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pr-10 pl-4 text-sm outline-none focus:border-[#1167c9]"
                />
              </div>

              <Button
                variant="secondary"
                onClick={() => void loadPolicies(selectedEmployeeId || undefined)}
                loading={loading}
                className="h-11 px-3"
                title={locale === "en" ? "Refresh policies" : "تحديث الوثائق"}
              >
                <RefreshCw size={16} />
              </Button>
            </div>
          </Card>

          {/* Policies Table */}
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-sm">
                <thead className="bg-slate-50 border-b border-[var(--border)] text-xs font-bold text-[var(--muted)] uppercase">
                  <tr>
                    <th className="p-4 text-start">{locale === "en" ? "Insurance Company" : "شركة التأمين"}</th>
                    <th className="p-4 text-start">{locale === "en" ? "Plan Level" : "فئة الخطة"}</th>
                    <th className="p-4 text-start">{locale === "en" ? "Masked Policy #" : "رقم الوثيقة"}</th>
                    <th className="p-4 text-start">{locale === "en" ? "Masked Member #" : "رقم العضوية"}</th>
                    <th className="p-4 text-start">{locale === "en" ? "Coverage Period" : "فترة التغطية"}</th>
                    <th className="p-4 text-start">{locale === "en" ? "Current" : "سارية"}</th>
                    <th className="p-4 text-start">{locale === "en" ? "Status" : "الحالة"}</th>
                    <th className="p-4 text-center">{locale === "en" ? "Actions" : "الإجراءات"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {loading && policies.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-[var(--muted)] font-medium">
                        {locale === "en" ? "Loading employee policies..." : "جارٍ تحميل وثائق التأمين..."}
                      </td>
                    </tr>
                  ) : filteredPolicies.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-[var(--muted)] font-medium">
                        {locale === "en" ? "No insurance policies found." : "لا توجد وثائق تأمين مضافة."}
                      </td>
                    </tr>
                  ) : (
                    filteredPolicies.map((pol) => (
                      <tr key={pol.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{pol.insuranceCompanyAr}</td>
                        <td className="p-4 font-bold text-[#1167c9]">{pol.insurancePlanAr}</td>
                        <td className="p-4 font-mono text-xs">{pol.policyNumberMasked || "—"}</td>
                        <td className="p-4 font-mono text-xs">{pol.memberNumberMasked || "—"}</td>
                        <td className="p-4 text-xs font-mono">
                          {pol.startDate} ➔ {pol.endDate}
                        </td>
                        <td className="p-4">
                          {pol.isCurrent ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <CheckCircle2 size={12} />
                              {locale === "en" ? "Current" : "الحالية"}
                            </span>
                          ) : (
                            <span className="text-xs text-[var(--muted)]">{locale === "en" ? "Previous" : "سابقة"}</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black ${
                              pol.status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {pol.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {canManage && (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setPolicyModalCompanyId(pol.insuranceCompanyId);
                                  setPolicyModal({ open: true, data: pol });
                                }}
                                className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                                title={locale === "en" ? "Edit Policy" : "تعديل الوثيقة"}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => void handleArchivePolicy(pol)}
                                className="grid h-8 w-8 place-items-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                title={locale === "en" ? "Archive Policy" : "أرشفة الوثيقة"}
                              >
                                <Archive size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* --- COMPANY MODAL --- */}
      {companyModal.open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
          <Card className="w-full max-w-xl p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="text-xl font-black flex items-center gap-2">
                <Building2 className="text-[#1167c9]" size={22} />
                {companyModal.data
                  ? locale === "en"
                    ? "Edit Insurance Company"
                    : "تعديل بيانات شركة التأمين"
                  : locale === "en"
                  ? "New Insurance Company"
                  : "إضافة شركة تأمين جديدة"}
              </h3>
              <button
                onClick={() => setCompanyModal({ open: false })}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCompany} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-bold">
                  {locale === "en" ? "Company Code *" : "رمز الشركة *"}
                  <input
                    name="code"
                    required
                    defaultValue={companyModal.data?.code || ""}
                    placeholder="e.g. BUPA"
                    className={inputCls}
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-bold">
                  {locale === "en" ? "Status *" : "الحالة *"}
                  <select name="status" defaultValue={companyModal.data?.status || "Active"} className={inputCls}>
                    <option value="Active">{locale === "en" ? "Active" : "نشط"}</option>
                    <option value="Suspended">{locale === "en" ? "Suspended" : "موقوف"}</option>
                    <option value="Inactive">{locale === "en" ? "Inactive" : "غير نشط"}</option>
                  </select>
                </label>

                <label className="grid gap-1.5 text-sm font-bold">
                  {locale === "en" ? "Arabic Name *" : "الاسم بالعربية *"}
                  <input
                    name="nameAr"
                    required
                    defaultValue={companyModal.data?.nameAr || ""}
                    placeholder="مثال: بوبا العربية"
                    className={inputCls}
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-bold">
                  {locale === "en" ? "English Name" : "الاسم بالإنجليزية"}
                  <input
                    name="nameEn"
                    defaultValue={companyModal.data?.nameEn || ""}
                    placeholder="e.g. Bupa Arabia"
                    className={inputCls}
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-bold">
                  {locale === "en" ? "Registration Number" : "رقم تسجيل المزود"}
                  <input
                    name="providerRegistrationNumber"
                    defaultValue={companyModal.data?.providerRegistrationNumber || ""}
                    placeholder="e.g. REG-123"
                    className={inputCls}
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-bold">
                  {locale === "en" ? "Contact Person Name" : "اسم المسؤول"}
                  <input
                    name="contactName"
                    defaultValue={companyModal.data?.contactName || ""}
                    placeholder="مثال: أحمد علي"
                    className={inputCls}
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-bold">
                  {locale === "en" ? "Contact Phone" : "رقم هاتف التواصل"}
                  <input
                    name="contactPhone"
                    defaultValue={companyModal.data?.contactPhone || ""}
                    placeholder="+966500000000"
                    className={inputCls}
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-bold">
                  {locale === "en" ? "Contact Email" : "البريد الإلكتروني"}
                  <input
                    name="contactEmail"
                    type="email"
                    defaultValue={companyModal.data?.contactEmail || ""}
                    placeholder="contact@example.com"
                    className={inputCls}
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-bold col-span-full">
                  {locale === "en" ? "Notes" : "ملاحظات"}
                  <input
                    name="notes"
                    defaultValue={companyModal.data?.notes || ""}
                    placeholder={locale === "en" ? "Optional notes..." : "ملاحظات إضافية..."}
                    className={inputCls}
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="secondary" onClick={() => setCompanyModal({ open: false })}>
                  {locale === "en" ? "Cancel" : "إلغاء"}
                </Button>
                <Button type="submit" loading={saving}>
                  {companyModal.data
                    ? locale === "en"
                      ? "Save Changes"
                      : "حفظ التعديلات"
                    : locale === "en"
                    ? "Create Company"
                    : "إضافة الشركة"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* --- PLAN MODAL --- */}
      {planModal.open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
          <Card className="w-full max-w-xl p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="text-xl font-black flex items-center gap-2">
                <Layers className="text-[#1167c9]" size={22} />
                {planModal.data
                  ? locale === "en"
                    ? "Edit Insurance Plan"
                    : "تعديل خطة التأمين"
                  : locale === "en"
                  ? "New Insurance Plan"
                  : "إضافة خطة تأمين جديدة"}
              </h3>
              <button
                onClick={() => setPlanModal({ open: false })}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-bold col-span-full">
                  {locale === "en" ? "Insurance Company *" : "شركة التأمين *"}
                  <select
                    name="insuranceCompanyId"
                    required
                    defaultValue={planModal.data?.insuranceCompanyId || selectedCompanyId}
                    className={inputCls}
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameAr} ({c.code})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1.5 text-sm font-bold">
                  {locale === "en" ? "Plan Code *" : "رمز الخطة *"}
                  <input
                    name="code"
                    required
                    defaultValue={planModal.data?.code || ""}
                    placeholder="e.g. GOLD"
                    className={inputCls}
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-bold">
                  {locale === "en" ? "Rank (Priority) *" : "المرتبة (الأولوية) *"}
                  <input
                    name="rank"
                    type="number"
                    required
                    min={1}
                    defaultValue={planModal.data?.rank || 1}
                    className={inputCls}
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-bold">
                  {locale === "en" ? "Arabic Name *" : "اسم الخطة بالعربية *"}
                  <input
                    name="nameAr"
                    required
                    defaultValue={planModal.data?.nameAr || ""}
                    placeholder="مثال: الفئة الذهبية"
                    className={inputCls}
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-bold">
                  {locale === "en" ? "English Name" : "الاسم بالإنجليزية"}
                  <input
                    name="nameEn"
                    defaultValue={planModal.data?.nameEn || ""}
                    placeholder="e.g. Gold"
                    className={inputCls}
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-bold">
                  {locale === "en" ? "Network Name" : "اسم شبكة التغطية"}
                  <input
                    name="networkName"
                    defaultValue={planModal.data?.networkName || ""}
                    placeholder="e.g. Premium Network"
                    className={inputCls}
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-bold">
                  {locale === "en" ? "Coverage Class" : "فئة التغطية"}
                  <input
                    name="coverageClass"
                    defaultValue={planModal.data?.coverageClass || ""}
                    placeholder="e.g. A"
                    className={inputCls}
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-bold">
                  {locale === "en" ? "Annual Coverage Limit" : "الحد الأقصى السنوي (ريال)"}
                  <input
                    name="annualCoverageLimit"
                    type="number"
                    defaultValue={planModal.data?.annualCoverageLimit ?? ""}
                    placeholder="100000"
                    className={inputCls}
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-bold">
                  {locale === "en" ? "Deductible %" : "نسبة التحمل %"}
                  <input
                    name="deductiblePercentage"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={planModal.data?.deductiblePercentage ?? ""}
                    placeholder="10"
                    className={inputCls}
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-bold">
                  {locale === "en" ? "Effective From *" : "ساري من (تاريخ) *"}
                  <input
                    name="effectiveFrom"
                    type="date"
                    required
                    defaultValue={planModal.data?.effectiveFrom || ""}
                    className={inputCls}
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-bold">
                  {locale === "en" ? "Effective To" : "ساري حتى (تاريخ)"}
                  <input
                    name="effectiveTo"
                    type="date"
                    defaultValue={planModal.data?.effectiveTo || ""}
                    className={inputCls}
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-bold col-span-full">
                  {locale === "en" ? "Status *" : "الحالة *"}
                  <select name="status" defaultValue={planModal.data?.status || "Active"} className={inputCls}>
                    <option value="Active">{locale === "en" ? "Active" : "نشط"}</option>
                    <option value="Inactive">{locale === "en" ? "Inactive" : "غير نشط"}</option>
                  </select>
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="secondary" onClick={() => setPlanModal({ open: false })}>
                  {locale === "en" ? "Cancel" : "إلغاء"}
                </Button>
                <Button type="submit" loading={saving}>
                  {planModal.data
                    ? locale === "en"
                      ? "Save Changes"
                      : "حفظ التعديلات"
                    : locale === "en"
                    ? "Create Plan"
                    : "إضافة الخطة"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* --- POLICY MODAL --- */}
      {policyModal.open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4">
          <Card className="w-full max-w-xl p-6 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="text-xl font-black flex items-center gap-2">
                <FileCheck className="text-[#1167c9]" size={22} />
                {policyModal.data
                  ? locale === "en"
                    ? "Edit Insurance Policy"
                    : "تعديل وثيقة التأمين"
                  : locale === "en"
                  ? "New Employee Insurance Policy"
                  : "إضافة وثيقة تأمين لموظف"}
              </h3>
              <button
                onClick={() => setPolicyModal({ open: false })}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePolicy} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-bold col-span-full">
                  {locale === "en" ? "Employee *" : "الموظف / المندوب *"}
                  <SearchableSelect
                    name="employeeId"
                    value={policyModalEmployeeId}
                    onChange={setPolicyModalEmployeeId}
                    required
                    options={employees.map((emp) => ({
                      value: emp.id,
                      label: emp.fullNameAr,
                      sublabel: `إقامة/هوية: ${emp.iqamaNo}`,
                      keywords: `${emp.fullNameEn || ""} ${emp.primaryPhone || ""} ${emp.iqamaNo}`,
                    }))}
                    placeholder={locale === "en" ? "Select Employee..." : "اختر الموظف..."}
                    searchPlaceholder={locale === "en" ? "Search by name, ID, or phone..." : "ابحث بالاسم، الإقامة، أو رقم الهاتف..."}
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-bold">
                  {locale === "en" ? "Insurance Company *" : "شركة التأمين *"}
                  <SearchableSelect
                    name="insuranceCompanyId"
                    value={policyModalCompanyId}
                    onChange={setPolicyModalCompanyId}
                    required
                    options={companies.map((c) => ({
                      value: c.id,
                      label: c.nameAr,
                      sublabel: c.code,
                      keywords: `${c.nameEn || ""} ${c.code}`,
                    }))}
                    placeholder={locale === "en" ? "Select Company..." : "اختر الشركة..."}
                    searchPlaceholder={locale === "en" ? "Search company..." : "ابحث بالاسم أو الرمز..."}
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-bold">
                  {locale === "en" ? "Plan Level *" : "فئة الخطة *"}
                  <SearchableSelect
                    name="insurancePlanLevelId"
                    value={policyModalPlanId}
                    onChange={setPolicyModalPlanId}
                    required
                    options={policyModalPlans.map((p) => ({
                      value: p.id,
                      label: p.nameAr,
                      sublabel: p.code,
                      keywords: `${p.nameEn || ""} ${p.code} ${p.networkName || ""}`,
                    }))}
                    placeholder={locale === "en" ? "Select Plan..." : "اختر الفئة..."}
                    searchPlaceholder={locale === "en" ? "Search plan..." : "ابحث الخطة..."}
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-bold">
                  {locale === "en" ? "Policy Number *" : "رقم الوثيقة الكامل *"}
                  <input
                    name="policyNumber"
                    required
                    defaultValue=""
                    placeholder="POL-123456"
                    className={inputCls}
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-bold">
                  {locale === "en" ? "Member Number *" : "رقم العضوية الكامل *"}
                  <input
                    name="memberNumber"
                    required
                    defaultValue=""
                    placeholder="MEM-987654"
                    className={inputCls}
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-bold">
                  {locale === "en" ? "Start Date *" : "تاريخ البداية *"}
                  <input
                    name="startDate"
                    type="date"
                    required
                    defaultValue={policyModal.data?.startDate || ""}
                    className={inputCls}
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-bold">
                  {locale === "en" ? "End Date *" : "تاريخ النهاية *"}
                  <input
                    name="endDate"
                    type="date"
                    required
                    defaultValue={policyModal.data?.endDate || ""}
                    className={inputCls}
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-bold">
                  {locale === "en" ? "Status *" : "الحالة *"}
                  <select name="status" defaultValue={policyModal.data?.status || "Active"} className={inputCls}>
                    <option value="Active">{locale === "en" ? "Active" : "نشط"}</option>
                    <option value="Inactive">{locale === "en" ? "Inactive" : "غير نشط"}</option>
                  </select>
                </label>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    id="isCurrent"
                    name="isCurrent"
                    type="checkbox"
                    defaultChecked={policyModal.data?.isCurrent ?? true}
                    className="h-5 w-5 rounded border-[var(--border)] text-[#1167c9] focus:ring-[#1167c9]"
                  />
                  <label htmlFor="isCurrent" className="text-sm font-bold cursor-pointer">
                    {locale === "en" ? "Set as Current Active Policy" : "تعيين كو ثيقة حالية نشطة"}
                  </label>
                </div>

                <label className="grid gap-1.5 text-sm font-bold col-span-full">
                  {locale === "en" ? "Notes" : "ملاحظات"}
                  <input
                    name="notes"
                    defaultValue={policyModal.data?.notes || ""}
                    placeholder={locale === "en" ? "Optional notes..." : "ملاحظات إضافية..."}
                    className={inputCls}
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="secondary" onClick={() => setPolicyModal({ open: false })}>
                  {locale === "en" ? "Cancel" : "إلغاء"}
                </Button>
                <Button type="submit" loading={saving}>
                  {policyModal.data
                    ? locale === "en"
                      ? "Save Changes"
                      : "حفظ التعديلات"
                    : locale === "en"
                    ? "Create Policy"
                    : "إضافة الوثيقة"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
