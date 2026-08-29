"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Save,
  Send,
  History,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  FileText,
  Type,
  PenTool,
  Hash,
  Fingerprint,
  Settings,
  Eye,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  LayoutGrid,
} from "lucide-react";

import {
  DefinitionJsonV1,
  FormBlock,
  FormFieldDefinition,
  HrFormTemplate,
  HrFormTemplateVersion,
  validateHrFormTemplateDefinition,
  SAMPLE_CASH_ADVANCE_DEFINITION,
} from "@/lib/hr/templates-contract";
import { hrFormTemplatesApi } from "@/lib/hr/templates-api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";

interface HrFormTemplateBuilderProps {
  templateId: string;
  onBack?: () => void;
}

export function HrFormTemplateBuilder({ templateId, onBack }: HrFormTemplateBuilderProps) {
  const [template, setTemplate] = useState<HrFormTemplate | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [definition, setDefinition] = useState<DefinitionJsonV1>(SAMPLE_CASH_ADVANCE_DEFINITION);
  const [activeSection, setActiveSection] = useState<"header" | "body" | "footer">("body");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"blocks" | "fields" | "page">("blocks");

  // Save Version & History Modals state
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [changeNote, setChangeNote] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [versionHistory, setVersionHistory] = useState<HrFormTemplateVersion[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Local Autosave Indicator
  const [isAutosaved, setIsAutosaved] = useState<boolean>(true);

  // Validation state
  const validationResult = useMemo(() => {
    return validateHrFormTemplateDefinition(definition);
  }, [definition]);

  // Load template from API
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const data = await hrFormTemplatesApi.getById(templateId);
        if (isMounted && data) {
          setTemplate(data);
          const initialDef =
            data.currentDraftVersion?.definitionJson ||
            data.currentPublishedVersion?.definitionJson ||
            SAMPLE_CASH_ADVANCE_DEFINITION;
          setDefinition(initialDef);
        }
      } catch (err) {
        console.error("Failed to load template", err);
        toast.error("خطأ", "تعذر تحميل بيانات النموذج");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [templateId]);

  // Autosave to LocalStorage
  useEffect(() => {
    if (!template) return;
    setIsAutosaved(false);
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(`hr_builder_draft_${template.id}`, JSON.stringify(definition));
        setIsAutosaved(true);
      } catch (e) {
        console.error("Local draft save error", e);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [definition, template]);

  // Selected Block object reference
  const selectedBlock = useMemo(() => {
    if (!selectedBlockId) return null;
    const allBlocks = [
      ...(definition.sections.header?.blocks || []),
      ...definition.sections.body.blocks,
      ...(definition.sections.footer?.blocks || []),
    ];
    return allBlocks.find((b) => b.id === selectedBlockId) || null;
  }, [definition, selectedBlockId]);

  // Handle Add Block to current active section
  const handleAddBlock = (type: FormBlock["type"]) => {
    const newId = `block_${type}_${Date.now().toString(36)}`;
    let newBlock: FormBlock = {
      id: newId,
      type,
      text: type === "text" ? "نص جديد..." : undefined,
      style: { fontSizePt: 12, bold: false, align: "start" },
    };

    if (type === "binding" || type === "field") {
      const firstField = definition.fields?.[0]?.key || "employee.fullNameAr";
      newBlock.fieldKey = firstField;
    } else if (type === "signatureGrid") {
      newBlock.columns = 3;
      newBlock.items = ["employee", "finance", "hr"];
    } else if (type === "fingerprint") {
      newBlock.text = "البصمة المعتمدة";
    } else if (type === "pageNumber") {
      newBlock.format = "{page} / {pages}";
      newBlock.align = "center";
    } else if (type === "richText") {
      newBlock.text = "مضمون النص القانوني / الإقرار...";
    }

    setDefinition((prev) => {
      const updated = JSON.parse(JSON.stringify(prev)) as DefinitionJsonV1;
      if (activeSection === "header") {
        if (!updated.sections.header) {
          updated.sections.header = { repeat: true, heightMm: 18, blocks: [] };
        }
        updated.sections.header.blocks.push(newBlock);
      } else if (activeSection === "footer") {
        if (!updated.sections.footer) {
          updated.sections.footer = { repeat: true, heightMm: 10, blocks: [] };
        }
        updated.sections.footer.blocks.push(newBlock);
      } else {
        updated.sections.body.blocks.push(newBlock);
      }
      return updated;
    });

    setSelectedBlockId(newId);
  };

  // Update selected block properties
  const handleUpdateSelectedBlock = (updates: Partial<FormBlock>) => {
    if (!selectedBlockId) return;
    setDefinition((prev) => {
      const updated = JSON.parse(JSON.stringify(prev)) as DefinitionJsonV1;
      const updateList = (blocks: FormBlock[]) => {
        return blocks.map((b) => (b.id === selectedBlockId ? { ...b, ...updates } : b));
      };

      if (updated.sections.header?.blocks) {
        updated.sections.header.blocks = updateList(updated.sections.header.blocks);
      }
      updated.sections.body.blocks = updateList(updated.sections.body.blocks);
      if (updated.sections.footer?.blocks) {
        updated.sections.footer.blocks = updateList(updated.sections.footer.blocks);
      }
      return updated;
    });
  };

  // Remove block
  const handleRemoveBlock = (id: string) => {
    setDefinition((prev) => {
      const updated = JSON.parse(JSON.stringify(prev)) as DefinitionJsonV1;
      if (updated.sections.header?.blocks) {
        updated.sections.header.blocks = updated.sections.header.blocks.filter((b) => b.id !== id);
      }
      updated.sections.body.blocks = updated.sections.body.blocks.filter((b) => b.id !== id);
      if (updated.sections.footer?.blocks) {
        updated.sections.footer.blocks = updated.sections.footer.blocks.filter((b) => b.id !== id);
      }
      return updated;
    });
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  // Move block up/down
  const handleMoveBlock = (id: string, dir: "up" | "down") => {
    setDefinition((prev) => {
      const updated = JSON.parse(JSON.stringify(prev)) as DefinitionJsonV1;
      const move = (blocks: FormBlock[]) => {
        const idx = blocks.findIndex((b) => b.id === id);
        if (idx === -1) return blocks;
        const targetIdx = dir === "up" ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= blocks.length) return blocks;
        const temp = blocks[idx];
        blocks[idx] = blocks[targetIdx];
        blocks[targetIdx] = temp;
        return blocks;
      };

      if (activeSection === "header" && updated.sections.header) {
        updated.sections.header.blocks = move(updated.sections.header.blocks);
      } else if (activeSection === "footer" && updated.sections.footer) {
        updated.sections.footer.blocks = move(updated.sections.footer.blocks);
      } else {
        updated.sections.body.blocks = move(updated.sections.body.blocks);
      }
      return updated;
    });
  };

  // Field definitions management
  const handleAddField = () => {
    const key = `custom.field_${(definition.fields?.length || 0) + 1}`;
    const newField: FormFieldDefinition = {
      key,
      type: "text",
      source: "manual",
      labelAr: "حقل جديد",
      required: false,
    };
    setDefinition((prev) => ({
      ...prev,
      fields: [...(prev.fields || []), newField],
    }));
  };

  const handleUpdateField = (index: number, updates: Partial<FormFieldDefinition>) => {
    setDefinition((prev) => {
      const fields = [...(prev.fields || [])];
      fields[index] = { ...fields[index], ...updates };
      return { ...prev, fields };
    });
  };

  const handleRemoveField = (index: number) => {
    setDefinition((prev) => {
      const fields = [...(prev.fields || [])];
      fields.splice(index, 1);
      return { ...prev, fields };
    });
  };

  // Save new Draft Version API Call
  const handleSaveVersion = async () => {
    if (!template) return;
    if (!validationResult.valid) {
      toast.error("تنبيه خطأ في النموذج", "يرجى تصحيح أخطاء مخطط النموذج قبل الحفظ.");
      return;
    }
    try {
      setIsSaving(true);
      const res = await hrFormTemplatesApi.createVersion(template.id, {
        definitionJson: definition,
        changeNote: changeNote || "تحديث تصميم النموذج عبر المصمم المرئي",
        rowVersion: template.rowVersion,
      });

      // Reload updated template
      const updatedTpl = await hrFormTemplatesApi.getById(template.id);
      setTemplate(updatedTpl);
      setIsSaveModalOpen(false);
      setChangeNote("");
      toast.success("تم بنجاح", `تم حفظ الإصدار رقم ${res.versionNumber} بنجاح كمسودة.`);
    } catch (err: any) {
      console.error("Save version error:", err);
      if (err.status === 409) {
        toast.error("تعارض في التعديل (HTTP 409)", "قام شخص آخر بتعديل النموذج. يرجى تحديث الصفحة والمحاولة مجدداً.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Publish Current Version API Call
  const handlePublishCurrent = async () => {
    if (!template || !template.currentDraftVersionId) return;
    try {
      setIsSaving(true);
      const res = await hrFormTemplatesApi.publishVersion(template.id, template.currentDraftVersionId, {
        rowVersion: template.rowVersion,
      });
      setTemplate(res);
      toast.success("تم النشر", "تم جعل هذا الإصدار هو الإصدار المعتمد تشغيلياً.");
    } catch (err: any) {
      console.error("Publish error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Load Version History Modal
  const handleOpenHistory = async () => {
    if (!template) return;
    setIsHistoryModalOpen(true);
    try {
      setLoadingHistory(true);
      const list = await hrFormTemplatesApi.getVersions(template.id);
      setVersionHistory(list);
    } catch (err) {
      console.error("Failed to load versions history", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Restore past version into builder
  const handleSelectHistoryVersion = (ver: HrFormTemplateVersion) => {
    setDefinition(ver.definitionJson);
    setIsHistoryModalOpen(false);
    toast.info("تم استرجاع الإصدار", `تم تحميل الإصدار رقم ${ver.versionNumber} في المصمم.`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-center p-8">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1167c9]"></div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="p-8 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-black">النموذج غير موجود</h2>
        <Button onClick={onBack}>العودة للكتالوج</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 dir-rtl text-right min-h-screen pb-16 bg-[var(--background)]">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-[var(--border)] hover:bg-blue-500/10 text-[var(--muted)] hover:text-[#1167c9] transition"
            title="العودة للكتالوج"
          >
            <ArrowRight size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#1167c9] bg-blue-500/10 px-2 py-0.5 rounded">
                {template.code}
              </span>
              <Badge tone={template.isActive ? "green" : "orange"}>
                {template.isActive ? "نشط" : "غير نشط"}
              </Badge>
              {isAutosaved ? (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                  <CheckCircle2 size={13} /> مسودة مسجلة محلياً
                </span>
              ) : (
                <span className="text-[11px] text-amber-500 flex items-center gap-1">جاري التعديل...</span>
              )}
            </div>
            <h1 className="text-xl font-black mt-1">{template.nameAr}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {!validationResult.valid ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 text-red-600 text-xs font-bold border border-red-500/20">
              <AlertTriangle size={15} />
              <span>مخطط غير صالح ({validationResult.errors.length} أخطاء)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 text-xs font-bold border border-emerald-500/20">
              <CheckCircle2 size={15} />
              <span>مخطط JSON v1 صالح</span>
            </div>
          )}

          <Button variant="secondary" onClick={handleOpenHistory}>
            <History size={16} />
            سجل الإصدارات ({template.currentDraftVersion?.versionNumber || 1})
          </Button>

          <Button variant="secondary" onClick={() => setIsSaveModalOpen(true)}>
            <Save size={16} />
            حفظ مسودة (Version)
          </Button>

          <Button onClick={handlePublishCurrent} disabled={isSaving}>
            <Send size={16} />
            نشر الإصدار الحالي
          </Button>
        </div>
      </div>

      {/* Synchronized 3-Surface Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Surface 1: Right Palette (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="p-4 space-y-4">
            {/* Palette Navigation Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-[var(--background)] p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setActiveTab("blocks")}
                className={`py-1.5 rounded-lg transition ${
                  activeTab === "blocks" ? "bg-[#1167c9] text-white" : "text-[var(--muted)]"
                }`}
              >
                العناصر
              </button>
              <button
                onClick={() => setActiveTab("fields")}
                className={`py-1.5 rounded-lg transition ${
                  activeTab === "fields" ? "bg-[#1167c9] text-white" : "text-[var(--muted)]"
                }`}
              >
                الحقول ({definition.fields?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("page")}
                className={`py-1.5 rounded-lg transition ${
                  activeTab === "page" ? "bg-[#1167c9] text-white" : "text-[var(--muted)]"
                }`}
              >
                الصفحة
              </button>
            </div>

            {/* TAB 1: BLOCKS PALETTE */}
            {activeTab === "blocks" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--muted)] mb-1">
                    القسم المستهدف لإضافة العناصر
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-[var(--background)] p-1 rounded-xl text-xs font-bold">
                    <button
                      onClick={() => setActiveSection("header")}
                      className={`py-1.5 rounded-lg transition ${
                        activeSection === "header"
                          ? "bg-blue-500/20 text-[#1167c9] border border-[#1167c9]/30"
                          : "text-[var(--muted)]"
                      }`}
                    >
                      الهيدر
                    </button>
                    <button
                      onClick={() => setActiveSection("body")}
                      className={`py-1.5 rounded-lg transition ${
                        activeSection === "body"
                          ? "bg-blue-500/20 text-[#1167c9] border border-[#1167c9]/30"
                          : "text-[var(--muted)]"
                      }`}
                    >
                      المحتوى
                    </button>
                    <button
                      onClick={() => setActiveSection("footer")}
                      className={`py-1.5 rounded-lg transition ${
                        activeSection === "footer"
                          ? "bg-blue-500/20 text-[#1167c9] border border-[#1167c9]/30"
                          : "text-[var(--muted)]"
                      }`}
                    >
                      الفوتر
                    </button>
                  </div>
                </div>

                <div className="text-xs font-bold text-[var(--muted)] pt-2 border-t border-[var(--border)]">
                  انقر لإضافة عنصر إلى ({activeSection}):
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleAddBlock("text")}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-[var(--border)] hover:border-[#1167c9] bg-[var(--surface)] hover:bg-blue-500/5 transition text-xs font-bold gap-1.5"
                  >
                    <Type size={18} className="text-[#1167c9]" />
                    <span>نص عادي</span>
                  </button>

                  <button
                    onClick={() => handleAddBlock("binding")}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-[var(--border)] hover:border-[#1167c9] bg-[var(--surface)] hover:bg-blue-500/5 transition text-xs font-bold gap-1.5"
                  >
                    <Layers size={18} className="text-amber-500" />
                    <span>ربط حقل (Binding)</span>
                  </button>

                  <button
                    onClick={() => handleAddBlock("richText")}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-[var(--border)] hover:border-[#1167c9] bg-[var(--surface)] hover:bg-blue-500/5 transition text-xs font-bold gap-1.5"
                  >
                    <FileText size={18} className="text-indigo-500" />
                    <span>فقرة قانونية</span>
                  </button>

                  <button
                    onClick={() => handleAddBlock("signatureGrid")}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-[var(--border)] hover:border-[#1167c9] bg-[var(--surface)] hover:bg-blue-500/5 transition text-xs font-bold gap-1.5"
                  >
                    <PenTool size={18} className="text-emerald-500" />
                    <span>شبكة التواقيع</span>
                  </button>

                  <button
                    onClick={() => handleAddBlock("fingerprint")}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-[var(--border)] hover:border-[#1167c9] bg-[var(--surface)] hover:bg-blue-500/5 transition text-xs font-bold gap-1.5"
                  >
                    <Fingerprint size={18} className="text-purple-500" />
                    <span>صندوق البصمة</span>
                  </button>

                  <button
                    onClick={() => handleAddBlock("pageNumber")}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-[var(--border)] hover:border-[#1167c9] bg-[var(--surface)] hover:bg-blue-500/5 transition text-xs font-bold gap-1.5"
                  >
                    <Hash size={18} className="text-rose-500" />
                    <span>رقم الصفحة</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: FIELDS DEFINITION */}
            {activeTab === "fields" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--muted)]">قائمة الحقول المتاحة</span>
                  <Button variant="secondary" onClick={handleAddField} className="py-1 px-2 text-xs">
                    <Plus size={14} /> إضافة حقل
                  </Button>
                </div>

                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {definition.fields?.map((field, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[#1167c9]">{field.key}</span>
                        <button
                          onClick={() => handleRemoveField(idx)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                          الاسم بالعربية
                        </label>
                        <input
                          type="text"
                          value={field.labelAr}
                          onChange={(e) => handleUpdateField(idx, { labelAr: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-bold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold mb-0.5">النوع</label>
                          <select
                            value={field.type}
                            onChange={(e) => handleUpdateField(idx, { type: e.target.value })}
                            className="w-full p-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs"
                          >
                            <option value="text">text</option>
                            <option value="money">money</option>
                            <option value="date">date</option>
                            <option value="number">number</option>
                            <option value="select">select</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold mb-0.5">المصدر</label>
                          <select
                            value={field.source}
                            onChange={(e) => handleUpdateField(idx, { source: e.target.value })}
                            className="w-full p-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs"
                          >
                            <option value="employee">employee</option>
                            <option value="manual">manual</option>
                            <option value="system">system</option>
                            <option value="company">company</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: PAGE SETUP */}
            {activeTab === "page" && (
              <div className="space-y-4 text-xs">
                <h3 className="font-bold text-[var(--muted)] border-b pb-1">إعدادات الورقة (Page Layout)</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      حجم الورقة
                    </label>
                    <select
                      value={definition.page.size}
                      onChange={(e) =>
                        setDefinition((prev) => ({
                          ...prev,
                          page: { ...prev.page, size: e.target.value as any },
                        }))
                      }
                      className="w-full p-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] font-bold"
                    >
                      <option value="A4">A4</option>
                      <option value="A5">A5</option>
                      <option value="Letter">Letter</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      الاتجاه
                    </label>
                    <select
                      value={definition.page.orientation}
                      onChange={(e) =>
                        setDefinition((prev) => ({
                          ...prev,
                          page: { ...prev.page, orientation: e.target.value as any },
                        }))
                      }
                      className="w-full p-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] font-bold"
                    >
                      <option value="portrait">عمودي (Portrait)</option>
                      <option value="landscape">أفقي (Landscape)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    الهوامش (مم):
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-0.5">أعلى</label>
                      <input
                        type="number"
                        value={definition.page.marginsMm.top}
                        onChange={(e) =>
                          setDefinition((prev) => ({
                            ...prev,
                            page: {
                              ...prev.page,
                              marginsMm: { ...prev.page.marginsMm, top: parseFloat(e.target.value) || 0 },
                            },
                          }))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-0.5">أسفل</label>
                      <input
                        type="number"
                        value={definition.page.marginsMm.bottom}
                        onChange={(e) =>
                          setDefinition((prev) => ({
                            ...prev,
                            page: {
                              ...prev.page,
                              marginsMm: { ...prev.page.marginsMm, bottom: parseFloat(e.target.value) || 0 },
                            },
                          }))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-0.5">يمين</label>
                      <input
                        type="number"
                        value={definition.page.marginsMm.right}
                        onChange={(e) =>
                          setDefinition((prev) => ({
                            ...prev,
                            page: {
                              ...prev.page,
                              marginsMm: { ...prev.page.marginsMm, right: parseFloat(e.target.value) || 0 },
                            },
                          }))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-0.5">يسار</label>
                      <input
                        type="number"
                        value={definition.page.marginsMm.left}
                        onChange={(e) =>
                          setDefinition((prev) => ({
                            ...prev,
                            page: {
                              ...prev.page,
                              marginsMm: { ...prev.page.marginsMm, left: parseFloat(e.target.value) || 0 },
                            },
                          }))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] font-bold"
                      />
                    </div>
                  </div>
                </div>

                <h3 className="font-bold text-[var(--muted)] border-b pb-1 pt-2">السمة والخطوط (Theme)</h3>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    نوع الخط (Font Family)
                  </label>
                  <input
                    type="text"
                    value={definition.theme.fontFamily}
                    onChange={(e) =>
                      setDefinition((prev) => ({
                        ...prev,
                        theme: { ...prev.theme, fontFamily: e.target.value },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-bold"
                  />
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Surface 2: Center A4 Canvas Live Preview (6 cols) */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div className="w-full max-w-[650px] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl rounded-2xl border border-slate-300 dark:border-slate-800 p-8 min-h-[750px] space-y-6 flex flex-col justify-between transition-all">
            {/* Header Section */}
            {definition.sections.header && (
              <div
                onClick={() => setActiveSection("header")}
                className={`p-3 rounded-xl border-2 border-dashed transition relative ${
                  activeSection === "header"
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30"
                    : "border-slate-200 dark:border-slate-800 hover:border-blue-300"
                }`}
              >
                <span className="text-[10px] font-bold text-blue-600 bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded absolute -top-2.5 right-3">
                  تكرار ترويسة الصفحة (Header)
                </span>
                <div className="space-y-2 pt-2">
                  {definition.sections.header.blocks.map((block) => (
                    <RenderBlockItem
                      key={block.id}
                      block={block}
                      isSelected={selectedBlockId === block.id}
                      onSelect={() => setSelectedBlockId(block.id)}
                      onRemove={() => handleRemoveBlock(block.id)}
                      onMoveUp={() => handleMoveBlock(block.id, "up")}
                      onMoveDown={() => handleMoveBlock(block.id, "down")}
                      onUpdate={(updates) => handleUpdateSelectedBlock(updates)}
                    />
                  ))}
                  {definition.sections.header.blocks.length === 0 && (
                    <p className="text-xs text-center text-slate-400 py-2">قسم الهيدر فارغ. انقر للإضافة.</p>
                  )}
                </div>
              </div>
            )}

            {/* Body Section */}
            <div
              onClick={() => setActiveSection("body")}
              className={`p-4 rounded-xl border-2 border-dashed transition flex-1 relative ${
                activeSection === "body"
                  ? "border-blue-500 bg-blue-50/20 dark:bg-blue-950/10"
                  : "border-slate-200 dark:border-slate-800 hover:border-blue-300"
              }`}
            >
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded absolute -top-2.5 right-3">
                محتوى المستند الرئيسي (Body)
              </span>
              <div className="space-y-4 pt-3">
                {definition.sections.body.blocks.map((block) => (
                  <RenderBlockItem
                    key={block.id}
                    block={block}
                    isSelected={selectedBlockId === block.id}
                    onSelect={() => setSelectedBlockId(block.id)}
                    onRemove={() => handleRemoveBlock(block.id)}
                    onMoveUp={() => handleMoveBlock(block.id, "up")}
                    onMoveDown={() => handleMoveBlock(block.id, "down")}
                    onUpdate={(updates) => handleUpdateSelectedBlock(updates)}
                  />
                ))}
                {definition.sections.body.blocks.length === 0 && (
                  <p className="text-xs text-center text-slate-400 py-8">المحتوى فارغ. أضف عناصر من القائمة.</p>
                )}
              </div>
            </div>

            {/* Footer Section */}
            {definition.sections.footer && (
              <div
                onClick={() => setActiveSection("footer")}
                className={`p-3 rounded-xl border-2 border-dashed transition relative ${
                  activeSection === "footer"
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30"
                    : "border-slate-200 dark:border-slate-800 hover:border-blue-300"
                }`}
              >
                <span className="text-[10px] font-bold text-rose-600 bg-rose-100 dark:bg-rose-900 px-2 py-0.5 rounded absolute -top-2.5 right-3">
                  تذييل الصفحة (Footer)
                </span>
                <div className="space-y-2 pt-2">
                  {definition.sections.footer.blocks.map((block) => (
                    <RenderBlockItem
                      key={block.id}
                      block={block}
                      isSelected={selectedBlockId === block.id}
                      onSelect={() => setSelectedBlockId(block.id)}
                      onRemove={() => handleRemoveBlock(block.id)}
                      onMoveUp={() => handleMoveBlock(block.id, "up")}
                      onMoveDown={() => handleMoveBlock(block.id, "down")}
                      onUpdate={(updates) => handleUpdateSelectedBlock(updates)}
                    />
                  ))}
                  {definition.sections.footer.blocks.length === 0 && (
                    <p className="text-xs text-center text-slate-400 py-2">قسم التذييل فارغ.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Surface 3: Left Property Inspector (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="p-4 space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
              <Settings size={18} className="text-[#1167c9]" />
              <h2 className="font-black text-sm">خصائص العنصر (Property Inspector)</h2>
            </div>

            {selectedBlock ? (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between bg-[var(--background)] p-2 rounded-xl">
                  <span className="font-mono text-xs font-bold text-[#1167c9]">{selectedBlock.id}</span>
                  <Badge tone="blue">{selectedBlock.type}</Badge>
                </div>

                {/* Text Content Input */}
                {(selectedBlock.type === "text" ||
                  selectedBlock.type === "richText" ||
                  selectedBlock.type === "fingerprint") && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      مضمون النص
                    </label>
                    <textarea
                      value={selectedBlock.text || ""}
                      onChange={(e) => handleUpdateSelectedBlock({ text: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-bold min-h-[80px]"
                    />
                  </div>
                )}

                {/* Field Key Binding */}
                {(selectedBlock.type === "binding" || selectedBlock.type === "field") && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ربط الحقل (Field Key)
                    </label>
                    <select
                      value={selectedBlock.fieldKey || ""}
                      onChange={(e) => handleUpdateSelectedBlock({ fieldKey: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-mono font-bold"
                    >
                      {definition.fields?.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.key} ({f.labelAr})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Signature Grid columns */}
                {selectedBlock.type === "signatureGrid" && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      عدد الأعمدة
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={4}
                      value={selectedBlock.columns || 3}
                      onChange={(e) =>
                        handleUpdateSelectedBlock({ columns: parseInt(e.target.value) || 1 })
                      }
                      className="w-full p-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-bold"
                    />
                  </div>
                )}

                {/* Styling Options */}
                <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">التنسيق والخط (Style):</span>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-0.5">
                        حجم الخط (pt)
                      </label>
                      <input
                        type="number"
                        value={selectedBlock.style?.fontSizePt || 12}
                        onChange={(e) =>
                          handleUpdateSelectedBlock({
                            style: {
                              ...selectedBlock.style,
                              fontSizePt: parseFloat(e.target.value) || 12,
                            },
                          })
                        }
                        className="w-full px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-0.5">المحاذاة</label>
                      <select
                        value={selectedBlock.align || selectedBlock.style?.align || "start"}
                        onChange={(e) =>
                          handleUpdateSelectedBlock({
                            align: e.target.value as any,
                            style: { ...selectedBlock.style, align: e.target.value as any },
                          })
                        }
                        className="w-full p-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] font-bold text-xs"
                      >
                        <option value="start">يمين (Start)</option>
                        <option value="center">وسط (Center)</option>
                        <option value="end">يسار (End)</option>
                        <option value="justify">ضبط (Justify)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-1.5 font-bold cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={selectedBlock.style?.bold || false}
                        onChange={(e) =>
                          handleUpdateSelectedBlock({
                            style: { ...selectedBlock.style, bold: e.target.checked },
                          })
                        }
                        className="rounded text-[#1167c9]"
                      />
                      <span>عريض (Bold)</span>
                    </label>

                    <label className="flex items-center gap-1.5 font-bold cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={selectedBlock.style?.underline || false}
                        onChange={(e) =>
                          handleUpdateSelectedBlock({
                            style: { ...selectedBlock.style, underline: e.target.checked },
                          })
                        }
                        className="rounded text-[#1167c9]"
                      />
                      <span>سطر أسفل (Underline)</span>
                    </label>
                  </div>
                </div>

                <div className="pt-3">
                  <Button variant="danger" onClick={() => handleRemoveBlock(selectedBlock.id)} className="w-full py-2">
                    <Trash2 size={15} /> حذف العنصر
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-[var(--muted)] space-y-2">
                <LayoutGrid className="w-8 h-8 mx-auto opacity-40" />
                <p className="text-xs">انقر على أي عنصر بالورقة لتعديل خصائصه ومضمونه.</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Save Draft Version Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-black flex items-center gap-2">
              <Save size={20} className="text-[#1167c9]" />
              حفظ إصدار جديد للنموذج (New Version)
            </h2>
            <p className="text-xs text-[var(--muted)]">
              سيتم إنشاء إصدار غير قابل للتعديل (Immutable Version) في قاعدة البيانات وجعله المسودة الحالية.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                ملاحظات المصمم / شرح التحديث (Change Note)
              </label>
              <input
                type="text"
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
                placeholder="مثال: تعديل شروط السلفة وإعادة ترتيب شبكة التواقيع..."
                className="w-full p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-bold"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setIsSaveModalOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleSaveVersion} disabled={isSaving}>
                تأكيد الحفظ
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Version History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h2 className="text-lg font-black flex items-center gap-2">
                <History size={20} className="text-[#1167c9]" />
                سجل الإصدارات والتغييرات (Version History)
              </h2>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-[var(--muted)] font-bold">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {loadingHistory ? (
                <p className="text-center py-6 text-xs text-[var(--muted)]">جاري تحميل سجل الإصدارات...</p>
              ) : (
                versionHistory.map((ver) => {
                  const isDraft = template.currentDraftVersionId === ver.id;
                  const isPublished = template.currentPublishedVersionId === ver.id;
                  return (
                    <div
                      key={ver.id}
                      className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--background)] flex items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-bold">
                          <span>إصدار v{ver.versionNumber}</span>
                          {isPublished && <Badge tone="green">المنشور حالياً</Badge>}
                          {isDraft && <Badge tone="blue">المسودة الحالية</Badge>}
                        </div>
                        <p className="text-[var(--muted)]">{ver.changeNote || "بدون ملاحظات"}</p>
                        <span className="text-[10px] text-[var(--muted)] block">
                          تاريخ الإنشاء: {new Date(ver.createdAtUtc).toLocaleString("ar-SA")}
                        </span>
                      </div>
                      <Button variant="secondary" onClick={() => handleSelectHistoryVersion(ver)} className="py-1 px-3">
                        <Eye size={14} /> معاينة / استرجاع
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// Subcomponent to render block item inside A4 paper canvas with direct inline editing
function RenderBlockItem({
  block,
  isSelected,
  onSelect,
  onRemove,
  onMoveUp,
  onMoveDown,
  onUpdate,
}: {
  block: FormBlock;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUpdate: (updates: Partial<FormBlock>) => void;
}) {
  const [isEditingInline, setIsEditingInline] = useState(false);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditingInline(true);
      }}
      className={`p-3 rounded-xl border transition-all cursor-pointer group relative ${
        isSelected
          ? "border-[#1167c9] bg-blue-500/10 shadow-xs ring-2 ring-[#1167c9]/30"
          : "border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 hover:border-[#1167c9]/50"
      }`}
    >
      {/* Controls Overlay */}
      <div className="absolute left-2 top-2 hidden group-hover:flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-lg border shadow-xs z-10">
        <button onClick={onMoveUp} title="تحريك لأعلى" className="p-1 hover:text-[#1167c9]">
          <ArrowUp size={12} />
        </button>
        <button onClick={onMoveDown} title="تحريك لأسفل" className="p-1 hover:text-[#1167c9]">
          <ArrowDown size={12} />
        </button>
        <button onClick={onRemove} title="حذف" className="p-1 text-red-500 hover:text-red-700">
          <Trash2 size={12} />
        </button>
      </div>

      {/* Render Block Content with Direct Inline Canvas Editing */}
      <div
        style={{
          textAlign: block.align || block.style?.align || "right",
          fontSize: `${block.style?.fontSizePt || 12}pt`,
          fontWeight: block.style?.bold ? "bold" : "normal",
          textDecoration: block.style?.underline ? "underline" : "none",
        }}
      >
        {block.type === "text" && (
          isSelected || isEditingInline ? (
            <input
              type="text"
              value={block.text || ""}
              onChange={(e) => onUpdate({ text: e.target.value })}
              onBlur={() => setIsEditingInline(false)}
              className="w-full bg-white dark:bg-slate-900 px-2 py-1 rounded border border-[#1167c9] text-xs font-bold outline-none"
              placeholder="اكتب النص هنا مباشرة..."
              autoFocus={isEditingInline}
            />
          ) : (
            <span>{block.text || "نص عادي (انقر مرتين للتعديل)"}</span>
          )
        )}

        {(block.type === "binding" || block.type === "field") && (
          <span className="inline-block px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 font-mono text-xs border border-amber-300">
            {"{{"} {block.fieldKey || "field.key"} {"}}"}
          </span>
        )}

        {block.type === "richText" && (
          isSelected || isEditingInline ? (
            <textarea
              value={block.text || ""}
              onChange={(e) => onUpdate({ text: e.target.value })}
              onBlur={() => setIsEditingInline(false)}
              className="w-full bg-white dark:bg-slate-900 p-2 rounded border border-[#1167c9] text-xs min-h-[60px] outline-none"
              placeholder="اكتب النص القانوني مباشرة..."
              autoFocus={isEditingInline}
            />
          ) : (
            <div className="text-justify leading-relaxed">{block.text || "مضمون نص الفقرة القانونية..."}</div>
          )
        )}

        {block.type === "signatureGrid" && (
          <div
            className={`grid grid-cols-${block.columns || 3} gap-3 pt-3 text-center border-t border-slate-300 mt-2`}
          >
            {(block.items || ["employee", "finance", "hr"]).map((item, idx) => (
              <div key={idx} className="border border-dashed border-slate-300 p-2 rounded-lg text-xs">
                <span className="block font-bold text-slate-500">
                  {item === "employee" ? "توقيع الموظف" : item === "finance" ? "المالية" : "الموارد البشرية"}
                </span>
                <div className="h-8"></div>
              </div>
            ))}
          </div>
        )}

        {block.type === "fingerprint" && (
          <div className="w-24 h-20 border-2 border-dashed border-slate-400 rounded-xl flex flex-col items-center justify-center text-[10px] text-slate-400 my-2">
            <Fingerprint size={20} />
            {isSelected ? (
              <input
                type="text"
                value={block.text || ""}
                onChange={(e) => onUpdate({ text: e.target.value })}
                className="w-20 text-center bg-white dark:bg-slate-900 border text-[10px] mt-1 rounded"
              />
            ) : (
              <span>{block.text || "البصمة"}</span>
            )}
          </div>
        )}

        {block.type === "pageNumber" && (
          <span className="text-slate-400 font-mono text-xs">{block.format || "{page} / {pages}"}</span>
        )}
      </div>
    </div>
  );
}
