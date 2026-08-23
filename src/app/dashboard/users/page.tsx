"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Search, RefreshCw, UsersRound } from "lucide-react";
import { useAuth } from "../../../lib/auth/AuthProvider";
import { createUser, listUsers } from "../../../lib/users/api";
import type { ManagedUser } from "../../../lib/users/types";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Input";
import { Table } from "../../../components/ui/Table";

const emptyForm = {
    userName: "",
    initialPassword: "",
    displayNameAr: "",
    displayNameEn: "",
    email: "",
    phoneNumber: "",
    employeeId: null as string | null
};

const statusLabels: Record<string, string> = {
    Active: "نشط",
    PendingTemporaryPassword: "بانتظار تغيير كلمة المرور",
    Locked: "مقفل",
    Suspended: "موقوف",
    Archived: "مؤرشف"
};

function formatArabicDate(value: string | null) {
    return value ? new Intl.DateTimeFormat("ar-SA-u-nu-arab", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
}

export default function UsersPage() {
    const { can, isLoading } = useAuth();
    const [users, setUsers] = useState<ManagedUser[]>([]);
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
            setUsers(await listUsers(search));
        } catch {
            setError("تعذر تحميل المستخدمين. تأكد من اتصال واجهة API وصلاحياتك.");
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        if (isLoading || !canRead) return;
        const timer = window.setTimeout(() => void load(), 350);
        return () => window.clearTimeout(timer);
    }, [isLoading, canRead, load]);

    async function submit(event: FormEvent) {
        event.preventDefault();
        try {
            const created = await createUser(form);
            setUsers(current => [created, ...current]);
            setForm(emptyForm);
            setShowForm(false);
        } catch {
            setError("تعذر إنشاء المستخدم. راجع البيانات والصلاحيات.");
        }
    }

    if (!isLoading && !canRead) return <Card className="p-8">
        <h1 className="text-xl font-black">غير مصرح لك</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">تحتاج إلى صلاحية users.read لعرض إدارة المستخدمين.</p>
    </Card>;

    return <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
                <p className="text-sm font-bold text-[#1167c9]">الأمان والوصول</p>
                <h1 className="mt-1 text-3xl font-black">إدارة المستخدمين</h1>
                <p className="mt-2 text-sm text-[var(--muted)]">إنشاء الحسابات وإدارة حالة الوصول.</p>
            </div>
            {can("users.create") && <Button onClick={() => setShowForm(!showForm)}><Plus size={17} />مستخدم جديد</Button>}
        </div>

        {showForm && <Card className="p-5">
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Input label="اسم المستخدم" required value={form.userName} onChange={e => setForm({ ...form, userName: e.target.value })} />
                <Input label="كلمة المرور الأولية" type="password" minLength={12} required value={form.initialPassword} onChange={e => setForm({ ...form, initialPassword: e.target.value })} />
                <Input label="الاسم بالعربية" required value={form.displayNameAr} onChange={e => setForm({ ...form, displayNameAr: e.target.value })} />
                <Input label="الاسم بالإنجليزية" value={form.displayNameEn} onChange={e => setForm({ ...form, displayNameEn: e.target.value })} />
                <Input label="البريد الإلكتروني" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                <Input label="رقم الجوال" value={form.phoneNumber} onChange={e => setForm({ ...form, phoneNumber: e.target.value })} />
                <div className="sm:col-span-2 lg:col-span-3 flex gap-3">
                    <Button type="submit">حفظ المستخدم</Button>
                    <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>إلغاء</Button>
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
                        <h2 className="font-black">المستخدمون</h2>
                        <p className="text-xs text-[var(--muted)]">{users.length} حساب</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <label className="flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-[var(--muted)]">
                        <Search size={17} />
                        <input aria-label="بحث عن مستخدم" value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث بالاسم أو اسم المستخدم أو البريد الإلكتروني" className="w-56 bg-transparent text-sm text-[var(--foreground)] outline-none sm:w-80" />
                    </label>
                    <Button variant="secondary" onClick={() => void load()} aria-label="تحديث القائمة">
                        <RefreshCw size={17} />
                    </Button>
                </div>
            </div>

            {error && <p role="alert" className="m-5 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}

            {loading ? <div className="p-8 text-center text-sm text-[var(--muted)]">جاري تحميل المستخدمين…</div> : <Table>
                <thead className="border-b border-[var(--border)] bg-[var(--background)] text-xs text-[var(--muted)]">
                    <tr>
                        <th className="px-5 py-4">الاسم</th>
                        <th className="px-5 py-4">اسم المستخدم</th>
                        <th className="px-5 py-4">البريد الإلكتروني</th>
                        <th className="px-5 py-4">رقم الجوال</th>
                        <th className="px-5 py-4">الحالة</th>
                        <th className="px-5 py-4">آخر نشاط</th>
                        <th className="px-5 py-4">تاريخ الإنشاء</th>
                        <th className="px-5 py-4">تعديل المعلومات</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                    
                    {users.map(user => (
                        <tr key={user.id} className="hover:bg-blue-500/5">
                            <td className="px-5 py-4">
                                <b className="block">{user.displayNameAr || user.displayNameEn}</b>
                            </td>
                            <td className="px-5 py-4 font-medium" dir="ltr">{user.userName}</td>
                            <td className="px-5 py-4" dir="ltr">{user.email}</td>
                            <td className="px-5 py-4" dir="ltr">{user.phoneNumber || "—"}</td>
                            <td className="px-5 py-4">
                                <Badge tone={user.status === "Active" ? "green" : user.status === "Locked" ? "red" : "orange"}>
                                    {statusLabels[user.status] ?? user.status}
                                </Badge>
                            </td>
                            <td className="px-5 py-4 text-[var(--muted)]">
                                {formatArabicDate(user.lastActivityAtUtc)}
                            </td>
                            <td className="px-5 py-4 text-[var(--muted)]">
                                {formatArabicDate(user.createdAtUtc)}
                            </td>
                            <td className="px-5 py-4">
                                <Link href={`/dashboard/users/${user.id}`} aria-label={`تعديل معلومات المستخدم ${user.displayNameAr || user.userName}`} title="تعديل المعلومات" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold text-[#1167c9] hover:bg-blue-500/10">
                                    <Pencil size={17} />
                                    <span className="hidden sm:inline">تعديل</span>
                                </Link>
                            </td>
                        </tr>
                    ))}
                    {users.length === 0 && <tr>
                        <td colSpan={8} className="px-5 py-10 text-center text-sm text-[var(--muted)]">لا توجد نتائج مطابقة.</td>
                    </tr>}
                </tbody>
            </Table>}
        </Card>
    </div>;
}
