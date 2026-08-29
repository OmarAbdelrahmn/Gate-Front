"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Archive,
  Eye,
  CheckCircle2,
  FileCode,
  Sparkles,
  ShieldAlert,
  Layers,
} from "lucide-react";

import { HrFormTemplate, SAMPLE_CASH_ADVANCE_DEFINITION } from "@/lib/hr/templates-contract";
import { hrFormTemplatesApi } from "@/lib/hr/templates-api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";

interface HrFormTemplatesCatalogProps {
  onOpenDesigner: (templateId: string) => void;
}

export function HrFormTemplatesCatalog({ onOpenDesigner }: HrFormTemplatesCatalogProps) {
  const [templates, setTemplates] = useState<HrFormTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Create Template Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [createCode, setCreateCode] = useState<string>("");
  const [createNameAr, setCreateNameAr] = useState<string>("");
  const [createNameEn, setCreateNameEn] = useState<string>("");
  const [createCategory, setCreateCategory] = useState<string>("finance");
  const [createDescAr, setCreateDescAr] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Edit Metadata Modal
  const [editTemplate, setEditTemplate] = useState<HrFormTemplate | null>(null);

  // Archive Modal
  const [archiveTemplate, setArchiveTemplate] = useState<HrFormTemplate | null>(null);
  const [archiveReason, setArchiveReason] = useState<string>("");

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await hrFormTemplatesApi.list({
        search: searchQuery,
        category: selectedCategory,
      });
      setTemplates(data);
    } catch (err) {
      console.error("Failed to load templates catalog", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadTemplates();
  };

  // Create new template handler
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createCode.trim() || !createNameAr.trim()) {
      toast.error("تنبيه", "يرجى تعبئة الرمز الثابت والاسم العربي للنموذج.");
      return;
    }
    try {
      setIsSubmitting(true);
      const created = await hrFormTemplatesApi.create({
        code: createCode.trim().toUpperCase().replace(/\s+/g, "_"),
        nameAr: createNameAr.trim(),
        nameEn: createNameEn.trim() || createNameAr.trim(),
        category: createCategory,
        descriptionAr: createDescAr,
        definitionJson: SAMPLE_CASH_ADVANCE_DEFINITION,
        changeNote: "إنشاء قوالب النموذج الأولي",
      });

      setIsCreateModalOpen(false);
      setCreateCode("");
      setCreateNameAr("");
      setCreateNameEn("");
      setCreateDescAr("");
      loadTemplates();
      onOpenDesigner(created.id);
    } catch (err) {
      console.error("Create template error", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update metadata handler
  const handleUpdateMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTemplate) return;
    try {
      setIsSubmitting(true);
      await hrFormTemplatesApi.update(editTemplate.id, {
        nameAr: editTemplate.nameAr,
        nameEn: editTemplate.nameEn,
        category: editTemplate.category,
        descriptionAr: editTemplate.descriptionAr,
        descriptionEn: editTemplate.descriptionEn,
        isActive: editTemplate.isActive,
        rowVersion: editTemplate.rowVersion,
      });
      setEditTemplate(null);
      loadTemplates();
    } catch (err) {
      console.error("Update metadata error", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Archive template handler
  const handleArchiveTemplate = async () => {
    if (!archiveTemplate || !archiveReason.trim()) {
      toast.error("تنبيه", "يرجى كتابة سبب أرشفة النموذج.");
      return;
    }
    try {
      setIsSubmitting(true);
      await hrFormTemplatesApi.archive(archiveTemplate.id, {
        reason: archiveReason.trim(),
        rowVersion: archiveTemplate.rowVersion,
      });
      setArchiveTemplate(null);
      setArchiveReason("");
      loadTemplates();
    } catch (err) {
      console.error("Archive error", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 dir-rtl text-right min-h-screen pb-16">
      {/* Header Bar */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#1167c9]">إدارة نماذج الموارد البشرية</p>
          <h1 className="mt-1 text-3xl font-black">دليل نماذج HR والمصمم (Form Templates)</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            تحكم بالنماذج المعتمدة، مستويات الإصدارات (Versions)، وتعديل التصاميم دون التأثير على المستندات الصادرة ساباقاً.
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus size={18} />
          إنشاء نموذج جديد (New Template)
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row justify-between gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[var(--muted)] absolute right-3 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالرمز (Code) أو الاسم العربي/الإنجليزي..."
              className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--foreground)] outline-none focus:border-[#1167c9]"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter size={16} className="text-[var(--muted)]" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-bold outline-none focus:border-[#1167c9]"
            >
              <option value="all">جميع التصنيفات (All)</option>
              <option value="finance">المالية (Finance)</option>
              <option value="employment">التعيين والتوظيف (Employment)</option>
              <option value="custody">العهد والأمانات (Custody)</option>
              <option value="legal">الشؤون القانونية (Legal)</option>
            </select>
            <Button type="submit" variant="secondary">
              بحث
            </Button>
          </div>
        </form>
      </Card>

      {/* Templates Catalog Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1167c9]"></div>
        </div>
      ) : templates.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <Layers className="w-12 h-12 text-[var(--muted)] mx-auto opacity-50" />
          <h3 className="text-lg font-black">لا توجد نماذج مطابقة</h3>
          <p className="text-xs text-[var(--muted)]">لم يتم العثور على أي نماذج مطابقة لمعايير البحث الحالية.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((tpl) => (
            <Card
              key={tpl.id}
              className="p-5 flex flex-col justify-between space-y-4 hover:border-[#1167c9]/50 transition-all shadow-xs"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#1167c9] bg-blue-500/10 px-2.5 py-1 rounded-lg">
                    {tpl.code}
                  </span>
                  <Badge tone={tpl.isActive ? "green" : "orange"}>
                    {tpl.isActive ? "نشط" : "غير نشط"}
                  </Badge>
                </div>

                <div>
                  <h3 className="text-lg font-black text-[var(--foreground)]">{tpl.nameAr}</h3>
                  <p className="text-xs text-[var(--muted)] font-mono">{tpl.nameEn}</p>
                </div>

                <p className="text-xs text-[var(--muted)] line-clamp-2">
                  {tpl.descriptionAr || "لا يوجد وصف إضافي للنموذج."}
                </p>

                <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--muted)] font-bold">
                  <span>التصنيف: {tpl.category}</span>
                  <span>
                    الإصدار: v{tpl.currentDraftVersion?.versionNumber || tpl.currentPublishedVersion?.versionNumber || 1}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={() => onOpenDesigner(tpl.id)}
                  className="flex-1 py-2 text-xs"
                >
                  <FileCode size={15} /> فتح المصمم (Designer)
                </Button>
                <button
                  onClick={() => setEditTemplate(tpl)}
                  className="p-2 rounded-xl border border-[var(--border)] hover:bg-blue-500/10 text-[var(--muted)] hover:text-[#1167c9]"
                  title="تعديل البيانات"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => setArchiveTemplate(tpl)}
                  className="p-2 rounded-xl border border-[var(--border)] hover:bg-red-500/10 text-[var(--muted)] hover:text-red-500"
                  title="أرشفة النموذج"
                >
                  <Archive size={16} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg p-6 space-y-4">
            <h2 className="text-xl font-black flex items-center gap-2">
              <Sparkles size={20} className="text-[#1167c9]" />
              إنشاء نموذج جديد (Create HR Form Template)
            </h2>
            <form onSubmit={handleCreateTemplate} className="space-y-3 text-sm">
              <Input
                label="الرمز الثابت المستقر (Stable Code - e.g. CASH_ADVANCE_ACK)"
                value={createCode}
                onChange={(e) => setCreateCode(e.target.value)}
                placeholder="CASH_ADVANCE_ACK"
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="الاسم بالعربية"
                  value={createNameAr}
                  onChange={(e) => setCreateNameAr(e.target.value)}
                  placeholder="إقرار سلفة نقدية"
                  required
                />
                <Input
                  label="الاسم بالإنجليزي"
                  value={createNameEn}
                  onChange={(e) => setCreateNameEn(e.target.value)}
                  placeholder="Cash Advance Ack"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--muted)] mb-1">التصنيف (Category)</label>
                <select
                  value={createCategory}
                  onChange={(e) => setCreateCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-bold"
                >
                  <option value="finance">المالية (finance)</option>
                  <option value="employment">التعيين والتوظيف (employment)</option>
                  <option value="custody">العهد والأمانات (custody)</option>
                  <option value="legal">الشؤون القانونية (legal)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--muted)] mb-1">الوصف المختصر</label>
                <textarea
                  value={createDescAr}
                  onChange={(e) => setCreateDescAr(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm"
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <Button variant="secondary" type="button" onClick={() => setIsCreateModalOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  إنشاء وفتح المصمم
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Edit Metadata Modal */}
      {editTemplate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg p-6 space-y-4">
            <h2 className="text-xl font-black flex items-center gap-2">
              <Edit size={20} className="text-[#1167c9]" />
              تعديل بيانات النموذج ({editTemplate.code})
            </h2>
            <form onSubmit={handleUpdateMetadata} className="space-y-3 text-sm">
              <Input
                label="الاسم بالعربية"
                value={editTemplate.nameAr}
                onChange={(e) => setEditTemplate({ ...editTemplate, nameAr: e.target.value })}
              />
              <Input
                label="الاسم بالإنجليزي"
                value={editTemplate.nameEn}
                onChange={(e) => setEditTemplate({ ...editTemplate, nameEn: e.target.value })}
              />
              <div>
                <label className="block text-xs font-bold text-[var(--muted)] mb-1">الحالة التشغيلية</label>
                <select
                  value={editTemplate.isActive ? "active" : "inactive"}
                  onChange={(e) =>
                    setEditTemplate({ ...editTemplate, isActive: e.target.value === "active" })
                  }
                  className="w-full p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-bold"
                >
                  <option value="active">نشط (متاح للاستخدام)</option>
                  <option value="inactive">غير نشط (معطل)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <Button variant="secondary" type="button" onClick={() => setEditTemplate(null)}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  حفظ التعديلات
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Archive Modal */}
      {archiveTemplate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-black flex items-center gap-2 text-red-600">
              <ShieldAlert size={20} />
              أرشفة النموذج ({archiveTemplate.code})
            </h2>
            <p className="text-xs text-[var(--muted)]">
              سيتم نقل هذا النموذج للأرشيف ومنع اختياره لإنشاء مستندات جديدة.
            </p>
            <Input
              label="سبب الأرشفة (مطلوب)"
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              placeholder="مثال: استبدال النموذج بقرار جديد..."
              required
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setArchiveTemplate(null)}>
                إلغاء
              </Button>
              <Button variant="danger" onClick={handleArchiveTemplate} disabled={isSubmitting}>
                تأكيد الأرشفة
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
