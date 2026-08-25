"use client";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Search, RefreshCw, UsersRound } from "lucide-react";
import { useAuth } from "../../../lib/auth/AuthProvider";
import { createUser, listUsers } from "../../../lib/users/api";
import type { ManagedUser } from "../../../lib/users/types";
import { listEmployees } from "../../../lib/workforce/api";
import type { Employee } from "../../../lib/workforce/types";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Input";
import { SearchableSelect } from "../../../components/ui/SearchableSelect";
import { Table } from "../../../components/ui/Table";

import { translate } from "../../../lib/i18n";

const emptyForm = {
    userName: "",
    initialPassword: "",
    displayNameAr: "",
    displayNameEn: "",
    email: "",
    phoneNumber: "",
    employeeId: null as string | null
};

const statusLabels: Record<string, { ar: string; en: string }> = {
    Active: { ar: "نشط", en: "Active" },
    PendingTemporaryPassword: { ar: "بانتظار تغيير كلمة المرور", en: "Pending Temp Password" },
    Locked: { ar: "مقفل", en: "Locked" },
    Suspended: { ar: "موقوف", en: "Suspended" },
    Archived: { ar: "مؤرشف", en: "Archived" }
};

function formatDate(value: string | null, locale: "ar" | "en") {
    if (!value) return "—";
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ar-SA-u-nu-arab", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function UsersPage() {
    const { can, isLoading, locale } = useAuth();
    const t = (key: string) => translate(locale, key);
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm);

    const canRead = can("users.read");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const [usersData, employeesData] = await Promise.all([
                listUsers(search),
                listEmployees().catch(() => [] as Employee[]),
            ]);
            setUsers(usersData);
            setEmployees(employeesData);
        } catch {
            setError(locale === "en" ? "Failed to load users. Verify API connection and permissions." : "تعذر تحميل المستخدمين. تأكد من اتصال واجهة API وصلاحياتك.");
        } finally {
            setLoading(false);
        }
    }, [search, locale]);

    useEffect(() => {
        if (isLoading || !canRead) return;
        const timer = window.setTimeout(() => void load(), 350);
        return () => window.clearTimeout(timer);
    }, [isLoading, canRead, load]);

    const employeeOptions = useMemo(() => {
        return [
            { value: "", label: locale === "en" ? "None (No linked employee)" : "بدون (غير مرتبط بموظف)" },
            ...employees.map(emp => ({
                value: emp.id,
                label: locale === "en" && emp.fullNameEn ? emp.fullNameEn : emp.fullNameAr,
                sublabel: emp.employeeNumber ? `رقم: ${emp.employeeNumber}` : emp.iqamaNo ? `هوية: ${emp.iqamaNo}` : emp.primaryPhone || "",
            }))
        ];
    }, [employees, locale]);

    const handleEmployeeChange = (employeeId: string) => {
        const selected = employees.find((e) => e.id === employeeId);
        if (selected) {
            setForm((prev) => ({
                ...prev,
                employeeId: selected.id,
                displayNameAr: selected.fullNameAr || prev.displayNameAr,
                displayNameEn: selected.fullNameEn || prev.displayNameEn,
                email: selected.email || prev.email,
                phoneNumber: selected.primaryPhone || prev.phoneNumber,
            }));
        } else {
            setForm((prev) => ({
                ...prev,
                employeeId: null,
            }));
        }
    };

    async function submit(event: FormEvent) {
        event.preventDefault();
        try {
            const created = await createUser(form);
            setUsers(current => [created, ...current]);
            setForm(emptyForm);
            setShowForm(false);
        } catch {
            setError(locale === "en" ? "Failed to create user. Review input and permissions." : "تعذر إنشاء المستخدم. راجع البيانات والصلاحيات.");
        }
    }

    if (!isLoading && !canRead) return <Card className="p-8">
        <h1 className="text-xl font-black">{t("authorization.notAuthorized")}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{locale === "en" ? "You need users.read permission to view user management." : "تحتاج إلى صلاحية users.read لعرض إدارة المستخدمين."}</p>
    </Card>;

    return <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
                <p className="text-sm font-bold text-[#1167c9]">{t("nav.userManagement")}</p>
                <h1 className="mt-1 text-3xl font-black">{t("users.title")}</h1>
                <p className="mt-2 text-sm text-[var(--muted)]">{locale === "en" ? "Create accounts and manage user access status." : "إنشاء الحسابات وإدارة حالة الوصول."}</p>
            </div>
            {can("users.create") && <Button onClick={() => setShowForm(!showForm)}><Plus size={17} />{t("users.newUser")}</Button>}
        </div>

        {showForm && <Card className="p-5">
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="sm:col-span-2 lg:col-span-3">
                    <label className="mb-1 block text-xs font-bold text-[var(--foreground)]">
                        {locale === "en" ? "Linked Employee" : "الموظف المرتبط"}
                    </label>
                    <SearchableSelect
                        value={form.employeeId || ""}
                        onChange={handleEmployeeChange}
                        options={employeeOptions}
                        placeholder={locale === "en" ? "Select Employee (Optional)..." : "اختر الموظف (اختياري)..."}
                    />
                </div>
                <Input label={t("users.username")} required value={form.userName} onChange={e => setForm({ ...form, userName: e.target.value })} />
                <Input label={locale === "en" ? "Initial Password" : "كلمة المرور الأولية"} type="password" minLength={12} required value={form.initialPassword} onChange={e => setForm({ ...form, initialPassword: e.target.value })} />
                <Input label={locale === "en" ? "Arabic Name" : "الاسم بالعربية"} required value={form.displayNameAr} onChange={e => setForm({ ...form, displayNameAr: e.target.value })} />
                <Input label={locale === "en" ? "English Name" : "الاسم بالإنجليزية"} value={form.displayNameEn} onChange={e => setForm({ ...form, displayNameEn: e.target.value })} />
                <Input label={locale === "en" ? "Email" : "البريد الإلكتروني"} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                <Input label={t("users.phone")} value={form.phoneNumber} onChange={e => setForm({ ...form, phoneNumber: e.target.value })} />
                <div className="sm:col-span-2 lg:col-span-3 flex gap-3">
                    <Button type="submit">{t("common.save")}</Button>
                    <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>{t("common.cancel")}</Button>
                </div>
            </form>
        </Card>}

        <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-5">
                <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 text-[#1167c9]">
                        <UsersRound size={20} />
                    </div>
                    <div>
                        <h2 className="font-black">{t("users.title")}</h2>
                        <p className="text-xs text-[var(--muted)]">{users.length} {locale === "en" ? "accounts" : "حساب"}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <label className="flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-[var(--muted)]">
                        <Search size={17} />
                        <input aria-label={t("users.searchPlaceholder")} value={search} onChange={e => setSearch(e.target.value)} placeholder={t("users.searchPlaceholder")} className="w-56 bg-transparent text-sm text-[var(--foreground)] outline-none sm:w-80" />
                    </label>
                    <Button variant="secondary" onClick={() => void load()} aria-label={t("common.loading")}>
                        <RefreshCw size={17} />
                    </Button>
                </div>
            </div>

            {error && <p role="alert" className="m-5 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}

            {loading ? <div className="p-8 text-center text-sm text-[var(--muted)]">{t("common.loading")}</div> : <Table>
                <thead className="border-b border-[var(--border)] bg-[var(--background)] text-xs text-[var(--muted)]">
                    <tr>
                        <th className="px-5 py-4">{locale === "en" ? "Name" : "الاسم"}</th>
                        <th className="px-5 py-4">{t("users.username")}</th>
                        <th className="px-5 py-4">{locale === "en" ? "Email" : "البريد الإلكتروني"}</th>
                        <th className="px-5 py-4">{t("users.phone")}</th>
                        <th className="px-5 py-4">{t("common.status")}</th>
                        <th className="px-5 py-4">{locale === "en" ? "Last Activity" : "آخر نشاط"}</th>
                        <th className="px-5 py-4">{locale === "en" ? "Created Date" : "تاريخ الإنشاء"}</th>
                        <th className="px-5 py-4">{t("common.actions")}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                    
                    {users.map(user => {
                        const linkedEmp = user.employeeId ? employees.find(e => e.id === user.employeeId) : null;
                        return (
                            <tr key={user.id} className="hover:bg-blue-500/5">
                                <td className="px-5 py-4">
                                    <b className="block">{locale === "en" ? (user.displayNameEn || user.displayNameAr) : (user.displayNameAr || user.displayNameEn)}</b>
                                    {linkedEmp && (
                                        <span className="block text-xs font-normal text-[var(--muted)]">
                                            {locale === "en" ? `Employee: ${linkedEmp.fullNameEn || linkedEmp.fullNameAr}` : `الموظف: ${linkedEmp.fullNameAr}`}
                                        </span>
                                    )}
                                </td>
                                <td className="px-5 py-4 font-medium" dir="ltr">{user.userName}</td>
                                <td className="px-5 py-4" dir="ltr">{user.email}</td>
                                <td className="px-5 py-4" dir="ltr">{user.phoneNumber || "—"}</td>
                                <td className="px-5 py-4">
                                    <Badge tone={user.status === "Active" ? "green" : user.status === "Locked" ? "red" : "orange"}>
                                        {statusLabels[user.status]?.[locale] ?? user.status}
                                    </Badge>
                                </td>
                                <td className="px-5 py-4 text-[var(--muted)]">
                                    {formatDate(user.lastActivityAtUtc, locale)}
                                </td>
                                <td className="px-5 py-4 text-[var(--muted)]">
                                    {formatDate(user.createdAtUtc, locale)}
                                </td>
                                <td className="px-5 py-4">
                                    <Link href={`/dashboard/users/${user.id}`} aria-label={`${t("common.edit")} ${user.displayNameAr || user.userName}`} title={t("common.edit")} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold text-[#1167c9] hover:bg-blue-500/10">
                                        <Pencil size={17} />
                                        <span className="hidden sm:inline">{t("common.edit")}</span>
                                    </Link>
                                </td>
                            </tr>
                        );
                    })}
                    {users.length === 0 && <tr>
                        <td colSpan={8} className="px-5 py-10 text-center text-sm text-[var(--muted)]">{locale === "en" ? "No matching users found." : "لا توجد نتائج مطابقة."}</td>
                    </tr>}
                </tbody>
            </Table>}
        </Card>
    </div>;
}

