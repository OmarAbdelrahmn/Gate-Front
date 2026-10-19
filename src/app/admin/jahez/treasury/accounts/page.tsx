// src/app/admin/jahez/treasury/accounts/page.tsx
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { TreasuryNavHeader } from "@/components/jahez/treasury/TreasuryNavHeader";
import {
  getTreasuryAccounts,
  createTreasuryAccount,
  updateTreasuryAccount,
  generateTreasuryIdempotencyKey,
  type TreasuryAccount,
  type TreasuryAccountCreate,
  type TreasuryAccountUpdate,
  TreasuryLocation,
  TreasuryPurpose,
  TreasuryDirections,
} from "@/lib/jahez/treasury/api";
import {
  buildAccountTree,
  getTreasuryLocationLabel,
  getTreasuryPurposeLabel,
  getTreasuryDirectionsLabel,
  getSponsorDisplayName,
  type AccountTreeNode,
} from "@/lib/jahez/treasury/utils";
import { listSponsors, type Sponsor } from "@/lib/workforce/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Modal } from "@/components/jahez/treasury/TreasuryModal";
import { toast } from "@/components/ui/Toast";
import {
  Plus,
  RefreshCw,
  Search,
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronLeft,
  FileText,
  Edit2,
} from "lucide-react";

export default function TreasuryAccountsPage() {
  const { can, user } = useAuth();

  const isAdmin =
    Boolean(user?.roles?.some((r) => r.toLowerCase() === "admin")) ||
    can("admin") ||
    can("*");

  const canRead = can("jahez.treasury.read") || isAdmin;
  const canCreate = can("jahez.treasury.accounts.create") || isAdmin;
  const canUpdate = can("jahez.treasury.accounts.update") || isAdmin;

  const [accounts, setAccounts] = useState<TreasuryAccount[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [purposeFilter, setPurposeFilter] = useState<string>("");

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [createForm, setCreateForm] = useState<TreasuryAccountCreate>({
    code: "",
    nameAr: "",
    nameEn: "",
    parentId: null,
    sponsorId: null,
    location: TreasuryLocation.Supervisor,
    purpose: TreasuryPurpose.Settlement,
    allowedDirections: TreasuryDirections.Dual,
    isDefault: false,
  });

  // Edit Modal State
  const [editingAccount, setEditingAccount] = useState<TreasuryAccount | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editForm, setEditForm] = useState<TreasuryAccountUpdate>({
    nameAr: "",
    nameEn: "",
    isActive: true,
    rowVersion: "",
  });

  const loadData = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const [accs, sps] = await Promise.all([
        getTreasuryAccounts().catch(() => [] as TreasuryAccount[]),
        listSponsors().catch(() => [] as Sponsor[]),
      ]);
      setAccounts(accs);
      setSponsors(sps);
    } catch (err: any) {
      toast.error(err.message || "تعذر جلب شجرة حسابات الخزينة");
    } finally {
      setLoading(false);
    }
  }, [canRead]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sponsors Map
  const sponsorsMap = useMemo(() => {
    const map = new Map<string, string>();
    sponsors.forEach((s) => map.set(s.id, getSponsorDisplayName(s)));
    return map;
  }, [sponsors]);

  // Account tree
  const treeNodes = useMemo(() => {
    return buildAccountTree(accounts);
  }, [accounts]);

  // Collapsible Tree state: initially empty so root accounts start closed!
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set<string>();
    accounts.forEach((a) => {
      if (!a.isPosting) all.add(a.id);
    });
    setExpandedIds(all);
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // Computed Visible accounts tree traversal
  const visibleAccounts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const isSearching = Boolean(q || locationFilter || purposeFilter);

    function matchesFilter(node: AccountTreeNode): boolean {
      const matchesSearch =
        !q ||
        node.nameAr.toLowerCase().includes(q) ||
        node.nameEn.toLowerCase().includes(q) ||
        node.code.toLowerCase().includes(q);

      const matchesLocation = !locationFilter || String(node.location) === locationFilter;
      const matchesPurpose = !purposeFilter || String(node.purpose) === purposeFilter;

      if (matchesSearch && matchesLocation && matchesPurpose) return true;
      return node.children.some((child) => matchesFilter(child));
    }

    type DisplayAccountNode = AccountTreeNode & {
      hasChildren: boolean;
      isExpanded: boolean;
      childCount: number;
    };

    const result: DisplayAccountNode[] = [];

    function traverse(nodes: AccountTreeNode[], depth: number) {
      for (const node of nodes) {
        if (isSearching && !matchesFilter(node)) {
          continue;
        }

        const hasChildren = Boolean(node.children && node.children.length > 0);
        const isExpanded = isSearching || expandedIds.has(node.id);

        result.push({
          ...node,
          depth,
          hasChildren,
          isExpanded,
          childCount: node.children?.length || 0,
        });

        if (hasChildren && isExpanded) {
          traverse(node.children, depth + 1);
        }
      }
    }

    traverse(treeNodes, 0);
    return result;
  }, [treeNodes, expandedIds, searchQuery, locationFilter, purposeFilter]);

  // Aggregate Parents options for creation (Only non-posting accounts of same location)
  const availableParents = useMemo(() => {
    return accounts.filter((a) => !a.isPosting && a.isActive);
  }, [accounts]);

  // Handle Create Account
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.code.trim() || !createForm.nameAr.trim() || !createForm.nameEn.trim()) {
      toast.error("يرجى ملء كود الحساب والاسم بالعربية والإنجليزية");
      return;
    }

    setSubmittingCreate(true);
    try {
      const key = generateTreasuryIdempotencyKey("acc-new");
      await createTreasuryAccount(createForm, key);
      toast.success("تم إنشاء حساب الخزينة بنجاح");
      setIsCreateOpen(false);
      setCreateForm({
        code: "",
        nameAr: "",
        nameEn: "",
        parentId: null,
        sponsorId: null,
        location: TreasuryLocation.Supervisor,
        purpose: TreasuryPurpose.Settlement,
        allowedDirections: TreasuryDirections.Dual,
        isDefault: false,
      });
      loadData();
    } catch (err: any) {
      toast.error(err.message || "فشل إنشاء الحساب");
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (acc: TreasuryAccount) => {
    setEditingAccount(acc);
    setEditForm({
      nameAr: acc.nameAr,
      nameEn: acc.nameEn,
      isActive: acc.isActive,
      rowVersion: acc.rowVersion,
    });
    setIsEditOpen(true);
  };

  // Handle Edit Account
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    if (!editForm.nameAr.trim() || !editForm.nameEn.trim()) {
      toast.error("يرجى إدخال الاسم بالعربية والإنجليزية");
      return;
    }

    setSubmittingEdit(true);
    try {
      const key = generateTreasuryIdempotencyKey("acc-upd");
      await updateTreasuryAccount(editingAccount.id, editForm, key);
      toast.success("تم تحديث الحساب بنجاح");
      setIsEditOpen(false);
      setEditingAccount(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "تعذر تحديث الحساب (تأكد من عدم وجود تعارض في النسخة)");
    } finally {
      setSubmittingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      <TreasuryNavHeader
        title="حسابات الخزينة"
        description="أضف حسابات الشركات، ورتبها حسب مكان الأموال ونوعها."
        onRefresh={loadData}
        isRefreshing={loading}
        extraActions={
          canCreate && (
            <Button
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="gap-2 shadow-sm font-semibold"
            >
              <Plus className="h-4 w-4" />
              <span>إضافة حساب فرعي جديد</span>
            </Button>
          )
        }
      />



      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-2xl">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث باسم الحساب أو الكود..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9 h-9 text-xs"
            />
          </div>

          <div className="w-44">
            <SearchableSelect
              value={locationFilter}
              onChange={setLocationFilter}
              options={[
                { value: "", label: "جميع المواقع" },
                { value: "1", label: "عهدة المشرف" },
                { value: "2", label: "المركز الرئيسي" },
                { value: "3", label: "البنك" },
                { value: "4", label: "مقاصة بترو آب" },
              ]}
              placeholder="تصفية بالموقع"
            />
          </div>

          <div className="w-44">
            <SearchableSelect
              value={purposeFilter}
              onChange={setPurposeFilter}
              options={[
                { value: "", label: "جميع الأغراض" },
                { value: "1", label: "تصفيات" },
                { value: "2", label: "رسوم حساب" },
                { value: "3", label: "مشترك / عام" },
              ]}
              placeholder="تصفية بالغرض"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={expandAll}
            className="h-8 px-2.5 text-xs"
            title="توسيع كافة الفروع"
          >
            توسيع الكل
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={collapseAll}
            className="h-8 px-2.5 text-xs"
            title="طي كافة الفروع"
          >
            طي الكل
          </Button>
          <span className="text-xs text-muted-foreground font-mono mr-1">
            {accounts.length} حساب ({accounts.filter((a) => a.isPosting).length} ترحيل)
          </span>
        </div>
      </div>

      {/* Accounts Tree Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/40 text-muted-foreground font-medium border-b border-border">
              <tr>
                <th className="py-2.5 px-3 min-w-[280px]">اسم الحساب والشجرة</th>
                <th className="py-2.5 px-3">كود الحساب</th>
                <th className="py-2.5 px-3">الكفيل</th>
                <th className="py-2.5 px-3">الموقع المالي</th>
                <th className="py-2.5 px-3">الغرض</th>
                <th className="py-2.5 px-3">الاتجاه</th>
                <th className="py-2.5 px-3 text-center">النوع</th>
                <th className="py-2.5 px-3 text-center">افتراضي</th>
                <th className="py-2.5 px-3 text-center">الحالة</th>
                <th className="py-2.5 px-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                      <span>جاري تحميل شجرة الحسابات...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && visibleAccounts.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-muted-foreground">
                    لا توجد حسابات مطابقة لمعايير البحث.
                  </td>
                </tr>
              )}

              {!loading &&
                visibleAccounts.map((acc) => {
                  const indentPx = acc.depth * 24;
                  const isAggregate = !acc.isPosting;

                  return (
                    <tr
                      key={acc.id}
                      onClick={() => {
                        if (acc.hasChildren) toggleExpand(acc.id);
                      }}
                      className={`transition-colors border-b border-border/50 ${
                        isAggregate
                          ? "bg-muted/20 hover:bg-muted/40 font-semibold cursor-pointer"
                          : "hover:bg-muted/20"
                      }`}
                    >
                      <td className="py-2.5 px-3 min-w-[280px]">
                        <div
                          className="flex items-center gap-2"
                          style={{ paddingRight: `${indentPx}px` }}
                        >
                          {acc.hasChildren ? (
                            <button
                              type="button"
                              onClick={(e) => toggleExpand(acc.id, e)}
                              className="flex items-center justify-center h-5 w-5 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                              title={acc.isExpanded ? "طي الحساب" : "توسيع الحساب"}
                            >
                              {acc.isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-primary" />
                              ) : (
                                <ChevronLeft className="h-3.5 w-3.5" />
                              )}
                            </button>
                          ) : (
                            <span className="w-5 shrink-0 flex items-center justify-center">
                              <span className="w-1.5 h-1.5 rounded-full bg-border" />
                            </span>
                          )}

                          {acc.hasChildren ? (
                            acc.isExpanded ? (
                              <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
                            ) : (
                              <Folder className="h-4 w-4 text-amber-500/80 shrink-0" />
                            )
                          ) : (
                            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}

                          <div className="flex-1 min-w-0 pr-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-xs ${isAggregate ? "font-bold text-foreground" : "font-medium text-foreground"}`}
                                title={acc.nameEn || undefined}
                              >
                                {acc.nameAr}
                              </span>
                              {acc.hasChildren && (
                                <span className="text-[10px] font-normal text-muted-foreground bg-muted px-1.5 py-0.2 rounded font-mono">
                                  {acc.childCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium whitespace-nowrap">
                        <span className="bg-muted/60 px-2 py-0.5 rounded text-[11px]">
                          {acc.code}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                        {acc.sponsorId ? sponsorsMap.get(acc.sponsorId) || acc.sponsorId : "—"}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[11px]">
                          {getTreasuryLocationLabel(acc.location)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {getTreasuryPurposeLabel(acc.purpose)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">
                        {getTreasuryDirectionsLabel(acc.allowedDirections)}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {acc.isPosting ? (
                          <Badge tone="gray" className="text-[10px] font-medium">
                            حساب فرعي
                          </Badge>
                        ) : (
                          <Badge tone="blue" className="text-[10px] font-medium">
                            حساب رئيسي
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {acc.isDefault ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            ✓
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {acc.isActive ? (
                          <Badge tone="green" className="text-[10px]">
                            نشط
                          </Badge>
                        ) : (
                          <Badge tone="red" className="text-[10px]">
                            معطل
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(acc);
                            }}
                            title="تعديل اسم أو حالة الحساب"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Account Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="إضافة حساب فرعي جديد لخزائن جاهز"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-muted-foreground mb-1">
                كود الحساب المحاسبي *
              </label>
              <Input
                required
                placeholder="مثال: JH-SUP-SETTLE-01"
                value={createForm.code}
                onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                className="h-9 text-xs font-mono"
                maxLength={100}
              />
            </div>

            <div>
              <label className="block font-medium text-muted-foreground mb-1">
                الشركة (كفيل الحساب)
              </label>
              <SearchableSelect
                value={createForm.sponsorId || ""}
                onChange={(val) => setCreateForm({ ...createForm, sponsorId: val || null })}
                options={[
                  { value: "", label: "بدون كفيل (عام)" },
                  ...sponsors.map((s) => ({
                    value: s.id,
                    label: getSponsorDisplayName(s),
                  })),
                ]}
                placeholder="اختر كفيل الحساب"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-muted-foreground mb-1">
                اسم الحساب بالعربية *
              </label>
              <Input
                required
                placeholder="مثال: عهدة تصفيات البوابة"
                value={createForm.nameAr}
                onChange={(e) => setCreateForm({ ...createForm, nameAr: e.target.value })}
                className="h-9 text-xs"
                maxLength={200}
              />
            </div>

            <div>
              <label className="block font-medium text-muted-foreground mb-1">
                اسم الحساب بالإنجليزية (اختياري)
              </label>
              <Input
                placeholder="e.g. Gateway Settlement Custody"
                value={createForm.nameEn}
                onChange={(e) => setCreateForm({ ...createForm, nameEn: e.target.value })}
                className="h-9 text-xs"
                maxLength={200}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-muted-foreground mb-1">
                الموقع المالي *
              </label>
              <SearchableSelect
                value={String(createForm.location)}
                onChange={(val) => setCreateForm({ ...createForm, location: Number(val) })}
                options={[
                  { value: "1", label: "عهدة المشرف" },
                  { value: "2", label: "المركز الرئيسي" },
                  { value: "3", label: "البنك" },
                  { value: "4", label: "مقاصة بترو آب" },
                ]}
              />
            </div>

            <div>
              <label className="block font-medium text-muted-foreground mb-1">
                الغرض المالي *
              </label>
              <SearchableSelect
                value={String(createForm.purpose)}
                onChange={(val) => setCreateForm({ ...createForm, purpose: Number(val) })}
                options={[
                  { value: "1", label: "تصفيات" },
                  { value: "2", label: "رسوم الحساب" },
                  { value: "3", label: "مشترك / عام" },
                ]}
              />
            </div>

            <div>
              <label className="block font-medium text-muted-foreground mb-1">
                حركة الحساب المسموحة *
              </label>
              <SearchableSelect
                value={String(createForm.allowedDirections)}
                onChange={(val) => setCreateForm({ ...createForm, allowedDirections: Number(val) })}
                options={[
                  { value: "1", label: "وارد فقط (إيداع وقبض)" },
                  { value: "2", label: "صادر فقط (سحب وصرف)" },
                  { value: "3", label: "وارد وصادر (حركة مزدوجة)" },
                ]}
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-muted-foreground mb-1">
              الحساب الرئيسي التابع له (الحساب الأب)
            </label>
            <SearchableSelect
              value={createForm.parentId || ""}
              onChange={(val) => setCreateForm({ ...createForm, parentId: val || null })}
              options={[
                { value: "", label: "حساب رئيسي مستقل (بدون أب)" },
                ...availableParents
                  .filter((p) => p.location === createForm.location)
                  .map((p) => ({
                    value: p.id,
                    label: `${p.code} - ${p.nameAr}`,
                  })),
              ]}
              placeholder="اختر الحساب الرئيسي التابع له بنفس الموقع"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={createForm.isDefault}
              onChange={(e) => setCreateForm({ ...createForm, isDefault: e.target.checked })}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <label htmlFor="isDefault" className="text-xs font-medium cursor-pointer">
              تعيين كحساب توجيه آلي افتراضي لهذا الكفيل والموقع والغرض
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
              disabled={submittingCreate}
            >
              إلغاء
            </Button>
            <Button type="submit" size="sm" disabled={submittingCreate}>
              {submittingCreate ? "جاري الإنشاء..." : "حفظ الحساب"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Account Modal */}
      {editingAccount && (
        <Modal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title={`تعديل الحساب (${editingAccount.code})`}
        >
          <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
            <div className="rounded-xl bg-muted/40 p-3 space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>الموقع:</span>
                <span className="font-semibold text-foreground">
                  {getTreasuryLocationLabel(editingAccount.location)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>الغرض:</span>
                <span className="font-semibold text-foreground">
                  {getTreasuryPurposeLabel(editingAccount.purpose)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>الكفيل:</span>
                <span className="font-semibold text-foreground">
                  {editingAccount.sponsorId
                    ? sponsorsMap.get(editingAccount.sponsorId) || "كفيل"
                    : "—"}
                </span>
              </div>
            </div>

            <div>
              <label className="block font-medium text-muted-foreground mb-1">
                الاسم بالعربية *
              </label>
              <Input
                required
                value={editForm.nameAr}
                onChange={(e) => setEditForm({ ...editForm, nameAr: e.target.value })}
                className="h-9 text-xs"
                maxLength={200}
              />
            </div>

            <div>
              <label className="block font-medium text-muted-foreground mb-1">
                الاسم بالإنجليزية *
              </label>
              <Input
                required
                value={editForm.nameEn}
                onChange={(e) => setEditForm({ ...editForm, nameEn: e.target.value })}
                className="h-9 text-xs"
                maxLength={200}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isActive"
                checked={editForm.isActive}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                disabled={editingAccount.isDefault}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="isActive" className="text-xs font-medium cursor-pointer">
                الحساب نشط (لا يمكن تعطيل الحساب الافتراضي أو الحساب ذي الرصيد)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsEditOpen(false)}
                disabled={submittingEdit}
              >
                إلغاء
              </Button>
              <Button type="submit" size="sm" disabled={submittingEdit}>
                {submittingEdit ? "جاري التحديث..." : "حفظ التعديلات"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
