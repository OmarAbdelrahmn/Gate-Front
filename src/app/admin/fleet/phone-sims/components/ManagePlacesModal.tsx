"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getPlaces, createPlace, updatePlace, Place } from "@/lib/fleet/phone-sims-api";
import {
  MapPin,
  Plus,
  Edit2,
  Check,
  X,
  RefreshCw,
  Search,
  Building,
  AlertCircle,
} from "lucide-react";

interface ManagePlacesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlacesChanged?: () => void;
  onSelectPlace?: (place: Place) => void;
}

export function ManagePlacesModal({
  isOpen,
  onClose,
  onPlacesChanged,
  onSelectPlace,
}: ManagePlacesModalProps) {
  const { can } = useAuth();
  const canManage = can("phone_sims.manage");

  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // New place state
  const [newName, setNewName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit place state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPlaces();
      setNewName("");
      setAddError(null);
      setEditingId(null);
      setEditName("");
      setEditError(null);
      setSearch("");
    }
  }, [isOpen]);

  async function loadPlaces() {
    setLoading(true);
    try {
      const data = await getPlaces();
      setPlaces(data || []);
    } catch (err) {
      console.error("Failed to load places:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setAddError("اسم الموقع مطلوب");
      return;
    }
    if (trimmed.length > 200) {
      setAddError("اسم الموقع لا يمكن أن يتجاوز 200 حرف");
      return;
    }
    if (places.some((p) => p.name.trim().toLowerCase() === trimmed.toLowerCase())) {
      setAddError("اسم الموقع مستخدم بالفعل");
      return;
    }

    setIsAdding(true);
    setAddError(null);
    try {
      const created = await createPlace(trimmed);
      setNewName("");
      await loadPlaces();
      if (onPlacesChanged) onPlacesChanged();
      if (onSelectPlace) {
        onSelectPlace(created);
        onClose();
      }
    } catch (err: any) {
      console.error("Error creating place:", err);
      if (err?.details?.errorCode === "place.duplicate_name") {
        setAddError("اسم الموقع مستخدم بالفعل");
      } else if (err?.details?.errorCode === "place.invalid_name") {
        setAddError("اسم الموقع غير صالح");
      } else {
        setAddError(err?.message || "تعذر إضافة الموقع");
      }
    } finally {
      setIsAdding(false);
    }
  }

  function startEdit(place: Place) {
    setEditingId(place.id);
    setEditName(place.name);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditError(null);
  }

  async function handleUpdate(id: string) {
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError("اسم الموقع مطلوب");
      return;
    }
    if (trimmed.length > 200) {
      setEditError("اسم الموقع لا يمكن أن يتجاوز 200 حرف");
      return;
    }
    if (
      places.some(
        (p) => p.id !== id && p.name.trim().toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setEditError("اسم الموقع مستخدم بالفعل لموقع آخر");
      return;
    }

    setIsEditing(true);
    setEditError(null);
    try {
      const updated = await updatePlace(id, trimmed);
      setPlaces((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name: updated.name } : p))
      );
      setEditingId(null);
      setEditName("");
      if (onPlacesChanged) onPlacesChanged();
    } catch (err: any) {
      console.error("Error renaming place:", err);
      if (err?.details?.errorCode === "place.duplicate_name") {
        setEditError("اسم الموقع مستخدم بالفعل لموقع آخر");
      } else if (err?.details?.errorCode === "place.invalid_name") {
        setEditError("اسم الموقع غير صالح");
      } else if (err?.details?.errorCode === "place.not_found") {
        setEditError("الموقع المطلوب غير موجود");
        loadPlaces();
      } else {
        setEditError(err?.message || "تعذر تعديل اسم الموقع");
      }
    } finally {
      setIsEditing(false);
    }
  }

  const filteredPlaces = places.filter((p) =>
    p.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="إدارة مواقع ومقرات الشرائح (Places)"
      maxWidth="max-w-xl"
    >
      <div className="space-y-4 text-right dir-rtl">
        {/* Info Header */}
        <div className="p-3 rounded-xl border border-blue-200/80 bg-blue-50/60 dark:border-blue-900/60 dark:bg-blue-950/20 text-xs text-blue-950 dark:text-blue-100 flex items-start gap-2.5">
          <MapPin size={18} className="text-[#1167c9] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            المواقع تمثل المقرات أو الفروع التي تتواجد بها شرائح الاتصال. يمكن لكل شريحة أن تتبع موقعاً واحداً، ويحتوي الموقع الواحد على عدة شرائح.
          </p>
        </div>

        {/* Add New Place Form (Manage permission only) */}
        {canManage && (
          <form
            onSubmit={handleCreate}
            className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-2"
          >
            <label className="block text-xs font-bold text-[var(--foreground)]">
              إضافة موقع جديد <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  if (addError) setAddError(null);
                }}
                maxLength={200}
                placeholder="أدخل اسم الموقع، مثل: الإدارة الرئيسية، فرع الرياض..."
                className="flex-1 h-9 px-3 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
              />
              <Button
                type="submit"
                variant="primary"
                disabled={isAdding || !newName.trim()}
                className="h-9 px-4 text-xs font-bold gap-1 shrink-0"
              >
                {isAdding ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Plus size={15} />
                )}
                إضافة
              </Button>
            </div>
            {addError && (
              <p className="text-xs text-red-500 font-semibold flex items-center gap-1 mt-1">
                <AlertCircle size={13} />
                {addError}
              </p>
            )}
          </form>
        )}

        {/* Search & Counter */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث في أسماء المواقع..."
              className="w-full h-8 ps-8 pe-3 text-xs font-semibold rounded-lg border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
            />
          </div>
          <span className="text-xs text-[var(--muted)] font-medium shrink-0">
            {places.length} موقع مسجل
          </span>
        </div>

        {/* Places List */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden max-h-72 overflow-y-auto divide-y divide-[var(--border)]">
          {loading ? (
            <div className="py-8 text-center text-xs text-[var(--muted)]">
              <RefreshCw size={20} className="mx-auto animate-spin mb-1 text-[#1167c9]" />
              جاري تحميل قائمة المواقع...
            </div>
          ) : filteredPlaces.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--muted)]">
              {search.trim() ? "لا توجد مواقع تطابق البحث" : "لا توجد مواقع مسجلة حتى الآن."}
            </div>
          ) : (
            filteredPlaces.map((place) => {
              const isCurrentEditing = editingId === place.id;

              return (
                <div
                  key={place.id}
                  className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {isCurrentEditing ? (
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => {
                            setEditName(e.target.value);
                            if (editError) setEditError(null);
                          }}
                          maxLength={200}
                          autoFocus
                          className="flex-1 h-8 px-2.5 text-xs font-semibold rounded-lg border border-[#1167c9] bg-[var(--surface)] outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdate(place.id)}
                          disabled={isEditing || !editName.trim()}
                          className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                          title="حفظ التعديل"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={isEditing}
                          className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="إلغاء"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      {editError && (
                        <p className="text-[11px] text-red-500 font-semibold flex items-center gap-1">
                          <AlertCircle size={12} />
                          {editError}
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#1167c9] flex items-center justify-center shrink-0">
                          <Building size={14} />
                        </div>
                        <span className="text-xs font-bold text-[var(--foreground)] truncate">
                          {place.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {onSelectPlace && (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                              onSelectPlace(place);
                              onClose();
                            }}
                            className="h-7 px-2.5 text-xs font-semibold text-[#1167c9] border-blue-200 hover:bg-blue-50"
                          >
                            اختيار
                          </Button>
                        )}

                        {canManage && (
                          <button
                            type="button"
                            onClick={() => startEdit(place)}
                            className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[#1167c9] hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="تعديل اسم الموقع"
                          >
                            <Edit2 size={13} />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-[var(--border)]">
          <Button variant="secondary" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>
    </Modal>
  );
}
