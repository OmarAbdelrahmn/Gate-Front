"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useParams } from "next/navigation";
import { UserManagementPanel } from "../../../../components/users/UserManagementPanel";
import { AuthorizationEditor } from "../../../../components/users/AuthorizationEditor";
import { getUser } from "../../../../lib/users/api";
import type { ManagedUser } from "../../../../lib/users/types";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
export default function UserPage() {
  const params = useParams<{ userId: string }>();
  const [user, setUser] = useState<ManagedUser | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const load = async () => {
      try {
        setUser(await getUser(params.userId));
      } catch {
        setError("تعذر تحميل المستخدم أو لا تملك صلاحية عرضه.");
      }
    };
    void load();
  }, [params.userId]);
  if (error)
    return (
      <Card className="p-8">
        <p role="alert" className="text-red-700">
          {error}
        </p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => history.back()}
        >
          رجوع
        </Button>
      </Card>
    );
  if (!user)
    return (
      <div className="py-16 text-center text-sm text-[var(--muted)]">
        جارٍ تحميل المستخدم…
      </div>
    );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#1167c9]">إدارة المستخدمين</p>
          <h1 className="mt-1 text-3xl font-black">
            {user.displayNameAr || user.displayNameEn}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            @{user.userName} · {user.email}
          </p>
        </div>
        <Link href="/dashboard/users">
          <Button variant="secondary">
            <ArrowRight size={17} />
            العودة إلى المستخدمين
          </Button>
        </Link>
      </div>
      <UserManagementPanel user={user} onChanged={setUser} />
      <AuthorizationEditor userId={user.id} />
    </div>
  );
}
