"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SearchableSelect, SelectOption } from "@/components/ui/SearchableSelect";
import { listEmployees, listRiders } from "@/lib/workforce/api";
import { PhoneSim } from "@/lib/fleet/phone-sims-api";
import {
  SimHandoverReceiptView,
  SimHandoverReceiptData,
} from "@/components/hr/forms/SimHandoverReceiptView";
import { LETTERHEAD_TEMPLATES, LetterheadId } from "@/components/hr/forms/LetterheadHeader";
import { Printer, FileText, CheckCircle2, User, Building, Smartphone, Search } from "lucide-react";

interface SimHandoverFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  sim: PhoneSim | null;
}

interface PersonOptionItem {
  id: string;
  fullNameAr: string;
  iqamaNo: string;
  employeeCode: string;
  jobTitle: string;
}

export function SimHandoverFormModal({
  isOpen,
  onClose,
  sim,
}: SimHandoverFormModalProps) {
  // Lookup states for riders & employees
  const [people, setPeople] = useState<PersonOptionItem[]>([]);
  const [peopleOptions, setPeopleOptions] = useState<SelectOption[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string>("");

  // Form input states
  const [companyName, setCompanyName] = useState("شركة اكسبرس جابت");
  const [date, setDate] = useState("");
  const [formNumber, setFormNumber] = useState("");
  const [riderName, setRiderName] = useState("");
  const [iqamaNo, setIqamaNo] = useState("");
  const [jobTitle, setJobTitle] = useState("سائق مندوب توصيل");
  const [employeeCode, setEmployeeCode] = useState("");
  const [carrierName, setCarrierName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [iccid, setIccid] = useState("");
  const [receiptDate, setReceiptDate] = useState("");
  const [responsibleEmployeeName, setResponsibleEmployeeName] = useState("");
  const [letterheadId, setLetterheadId] = useState<LetterheadId>("express");

  // Load employees and riders on modal open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadPeopleData() {
      setLoadingPeople(true);
      try {
        const [empRes, riderRes] = await Promise.allSettled([
          listEmployees(),
          listRiders(),
        ]);

        const combinedList: PersonOptionItem[] = [];
        const seenIqamas = new Set<string>();

        if (empRes.status === "fulfilled" && Array.isArray(empRes.value)) {
          empRes.value.forEach((emp) => {
            if (emp.fullNameAr) {
              const iq = emp.iqamaNo || "";
              if (iq) seenIqamas.add(iq);
              combinedList.push({
                id: emp.id,
                fullNameAr: emp.fullNameAr || emp.fullNameEn || "",
                iqamaNo: emp.iqamaNo || "",
                employeeCode: emp.employeeNumber || (emp.iqamaNo ? emp.iqamaNo.slice(-5) : emp.id.slice(-5)),
                jobTitle: emp.jobTitleAr || emp.operationalWorkTypeAr || "سائق مندوب توصيل",
              });
            }
          });
        }

        if (riderRes.status === "fulfilled" && Array.isArray(riderRes.value)) {
          riderRes.value.forEach((r) => {
            const iq = r.iqamaNo || "";
            if (!iq || !seenIqamas.has(iq)) {
              if (iq) seenIqamas.add(iq);
              combinedList.push({
                id: r.id,
                fullNameAr: r.fullNameAr || r.fullNameEn || "",
                iqamaNo: r.iqamaNo || "",
                employeeCode: r.iqamaNo ? r.iqamaNo.slice(-5) : r.id.slice(-5),
                jobTitle: "سائق مندوب توصيل",
              });
            }
          });
        }

        if (!isMounted) return;

        setPeople(combinedList);

        const selectOptions: SelectOption[] = combinedList.map((p) => ({
          value: p.id,
          label: p.fullNameAr,
          sublabel: `هوية/إقامة: ${p.iqamaNo || "—"} | كود: ${p.employeeCode || "—"}`,
        }));

        setPeopleOptions(selectOptions);

        // If SIM has an assigned rider, auto-match and select them
        if (sim?.currentRider) {
          const currentRiderName = (sim.currentRider.fullNameAr || sim.currentRider.fullNameEn || "").trim();
          const matched = combinedList.find(
            (p) =>
              (sim.currentRider?.riderProfileId && p.id === sim.currentRider.riderProfileId) ||
              (currentRiderName && p.fullNameAr.toLowerCase().includes(currentRiderName.toLowerCase()))
          );

          if (matched) {
            setSelectedPersonId(matched.id);
            setRiderName(matched.fullNameAr);
            setIqamaNo(matched.iqamaNo);
            setEmployeeCode(matched.employeeCode);
            setJobTitle(matched.jobTitle);
          } else {
            setRiderName(currentRiderName);
          }
        }
      } catch (err) {
        console.error("Failed to load employees/riders in SimHandoverFormModal", err);
      } finally {
        if (isMounted) setLoadingPeople(false);
      }
    }

    loadPeopleData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, sim]);

  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const formattedToday = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(
        2,
        "0"
      )}/${String(today.getDate()).padStart(2, "0")}`;

      setDate(formattedToday);
      setReceiptDate(sim?.currentRider?.effectiveFrom || formattedToday);

      if (sim) {
        setPhoneNumber(sim.phoneNumber || "");
        setCarrierName(sim.carrierName || "STC");
        setIccid(sim.iccid || "");
        setResponsibleEmployeeName(sim.responsibleEmployeeNameAr || "مسؤول العهدة");
        setFormNumber(`SIM-${sim.phoneNumber.slice(-4)}/2026`);

        if (sim.currentRider && !riderName) {
          setRiderName(sim.currentRider.fullNameAr || sim.currentRider.fullNameEn || "");
        }
      } else {
        setPhoneNumber("05xxxxxxxx");
        setCarrierName("STC");
        setIccid("");
        setFormNumber("SIM-2026/001");
      }
    } else {
      // Reset state on close
      setSelectedPersonId("");
      setRiderName("");
      setIqamaNo("");
      setEmployeeCode("");
      setJobTitle("سائق مندوب توصيل");
    }
  }, [isOpen, sim]);

  if (!isOpen) return null;

  const handleSelectPerson = (personId: string) => {
    setSelectedPersonId(personId);
    const person = people.find((p) => p.id === personId);
    if (person) {
      setRiderName(person.fullNameAr);
      setIqamaNo(person.iqamaNo);
      setEmployeeCode(person.employeeCode);
      setJobTitle(person.jobTitle);
    }
  };

  const receiptData: SimHandoverReceiptData = {
    companyName,
    date,
    formNumber,
    riderName,
    iqamaNo,
    jobTitle,
    employeeCode,
    carrierName,
    phoneNumber,
    iccid,
    receiptDate,
    responsibleEmployeeName,
    letterheadId,
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="طباعة نموذج استلام شريحة جوال"
      maxWidth="max-w-6xl"
    >
      <div className="space-y-6 dir-rtl text-right">
        {/* Header toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-[var(--border)] bg-slate-50/70 dark:bg-slate-800/40 print:hidden">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-[#1167c9] dark:text-blue-400 flex items-center justify-center shrink-0">
              <FileText size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[var(--foreground)]">
                نموذج تسليم شريحة الاتصال الرسمية
              </h3>
              <p className="text-xs text-[var(--muted)]">
                اختر المندوب/الموظف لتحميل بياناته تلقائياً أو عدلها يدوياً، ثم اطبع النموذج أو اصدره PDF.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              إغلاق
            </Button>
            <Button onClick={handlePrint}>
              <Printer size={16} />
              طباعة النموذج (Print / PDF)
            </Button>
          </div>
        </div>

        {/* Main Grid: Left Controls, Right Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls Column */}
          <div className="lg:col-span-4 space-y-4 print:hidden text-xs font-semibold">
            {/* Employee/Rider Selector & Details */}
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-3">
              <h4 className="font-bold text-sm text-[var(--foreground)] border-b border-[var(--border)] pb-2 flex items-center gap-1.5">
                <User size={16} className="text-[#1167c9]" />
                بيانات الموظف المستلم
              </h4>

              {/* Searchable Select from Riders & Employees */}
              <div>
                <label className="block text-[var(--foreground)] font-bold mb-1 flex items-center gap-1">
                  <Search size={13} className="text-[#1167c9]" />
                  اختيار من الموظفين والمناديب:
                </label>
                <SearchableSelect
                  value={selectedPersonId}
                  onChange={handleSelectPerson}
                  options={peopleOptions}
                  placeholder={
                    loadingPeople
                      ? "جاري تحميل قائمة الموظفين والمناديب..."
                      : "ابحث بالاسم أو الهوية اختر الموظف..."
                  }
                  disabled={loadingPeople}
                />
              </div>

              <div>
                <label className="block text-[var(--muted)] mb-1">اسم الموظف / المندوب:</label>
                <input
                  type="text"
                  value={riderName}
                  onChange={(e) => setRiderName(e.target.value)}
                  placeholder="أدخل اسم الموظف..."
                  className="w-full h-9 px-3 text-xs font-semibold rounded-lg border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[var(--muted)] mb-1">رقم الإقامة/الهوية:</label>
                  <input
                    type="text"
                    value={iqamaNo}
                    onChange={(e) => setIqamaNo(e.target.value)}
                    placeholder="رقم الهوية..."
                    className="w-full h-9 px-2 text-xs font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[var(--muted)] mb-1">رقم الموظف:</label>
                  <input
                    type="text"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    placeholder="الكود الوظيفي..."
                    className="w-full h-9 px-2 text-xs font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--muted)] mb-1">المسمى الوظيفي:</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-semibold rounded-lg border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
                />
              </div>
            </div>

            {/* Template & Company Settings */}
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-3">
              <h4 className="font-bold text-sm text-[var(--foreground)] border-b border-[var(--border)] pb-2 flex items-center gap-1.5">
                <Building size={16} className="text-[#1167c9]" />
                بيانات الترويسة والشركة
              </h4>

              <div>
                <label className="block text-[var(--muted)] mb-1">خلفية ورقة المروس:</label>
                <select
                  value={letterheadId}
                  onChange={(e) => {
                    const lId = e.target.value as LetterheadId;
                    setLetterheadId(lId);
                    const found = LETTERHEAD_TEMPLATES.find((t) => t.id === lId);
                    if (found) setCompanyName(found.companyName);
                  }}
                  className="w-full h-9 px-3 text-xs font-bold rounded-lg border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
                >
                  {LETTERHEAD_TEMPLATES.map((lh) => (
                    <option key={lh.id} value={lh.id}>
                      {lh.titleAr} ({lh.companyName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[var(--muted)] mb-1">اسم الشركة:</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-semibold rounded-lg border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[var(--muted)] mb-1">التاريخ:</label>
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-9 px-2 text-xs font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[var(--muted)] mb-1">رقم النموذج:</label>
                  <input
                    type="text"
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    className="w-full h-9 px-2 text-xs font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* SIM Details & Responsible */}
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-3">
              <h4 className="font-bold text-sm text-[var(--foreground)] border-b border-[var(--border)] pb-2 flex items-center gap-1.5">
                <Smartphone size={16} className="text-[#1167c9]" />
                تفاصيل الشريحة والتسليم
              </h4>

              <div>
                <label className="block text-[var(--muted)] mb-1">اسم المشغل:</label>
                <select
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-bold rounded-lg border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
                >
                  <option value="STC">STC (إس تي سي)</option>
                  <option value="موبايلي">موبايلي (Mobily)</option>
                  <option value="زين">زين (Zain)</option>
                  <option value="أخرى">أخرى (Other)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[var(--muted)] mb-1">رقم الجوال:</label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full h-9 px-2 text-xs font-mono dir-ltr text-right rounded-lg border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[var(--muted)] mb-1">تاريخ الاستلام:</label>
                  <input
                    type="text"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    className="w-full h-9 px-2 text-xs font-mono rounded-lg border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[var(--muted)] mb-1">الرقم التسلسلي (ICCID):</label>
                <input
                  type="text"
                  value={iccid}
                  onChange={(e) => setIccid(e.target.value)}
                  placeholder="89966..."
                  className="w-full h-9 px-3 text-xs font-mono dir-ltr text-right rounded-lg border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
                />
              </div>

              <div>
                <label className="block text-[var(--muted)] mb-1">مسؤول التسليم:</label>
                <input
                  type="text"
                  value={responsibleEmployeeName}
                  onChange={(e) => setResponsibleEmployeeName(e.target.value)}
                  className="w-full h-9 px-3 text-xs font-semibold rounded-lg border border-[var(--border)] bg-[var(--surface)] focus:border-[#1167c9] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Preview Column */}
          <div className="lg:col-span-8 print:col-span-12 space-y-2">
            <div className="flex items-center justify-between px-3 py-2 rounded-t-xl border border-[var(--border)] bg-[var(--surface)] print:hidden text-xs">
              <span className="font-extrabold flex items-center gap-1.5 text-[var(--foreground)]">
                <CheckCircle2 size={15} className="text-[#1167c9]" />
                معاينة الوثيقة المباشرة (A4 Printable View)
              </span>
            </div>

            <div className="p-3 md:p-5 rounded-b-xl border border-[var(--border)] bg-slate-100 dark:bg-slate-900/60 shadow-inner print:p-0 print:border-none print:bg-white">
              <SimHandoverReceiptView data={receiptData} />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
