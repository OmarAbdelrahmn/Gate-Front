"use client";

import React from "react";
import type {
  CaseStatus,
  HearingStatus,
  PersonType,
  SponsorPartyRole,
} from "@/lib/hr/legal-cases-api";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Calendar,
  User,
  Bike,
  Globe,
  Scale,
  Shield,
} from "lucide-react";

interface CaseStatusBadgeProps {
  status: CaseStatus;
  className?: string;
}

export function CaseStatusBadge({ status, className = "" }: CaseStatusBadgeProps) {
  switch (status) {
    case "Open":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60 ${className}`}
        >
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          مفتوحة
        </span>
      );
    case "InProgress":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60 ${className}`}
        >
          <Clock className="size-3" />
          قيد النظر
        </span>
      );
    case "Suspended":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60 ${className}`}
        >
          <AlertCircle className="size-3" />
          معلقة
        </span>
      );
    case "Closed":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700 ${className}`}
        >
          <CheckCircle2 className="size-3" />
          مغلقة
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 ${className}`}
        >
          {status}
        </span>
      );
  }
}

interface HearingStatusBadgeProps {
  status: HearingStatus;
  className?: string;
}

export function HearingStatusBadge({ status, className = "" }: HearingStatusBadgeProps) {
  switch (status) {
    case "Scheduled":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60 ${className}`}
        >
          <Calendar className="size-3" />
          مجدولة
        </span>
      );
    case "Completed":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60 ${className}`}
        >
          <CheckCircle2 className="size-3" />
          مكتملة
        </span>
      );
    case "Postponed":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60 ${className}`}
        >
          <Clock className="size-3" />
          مؤجلة
        </span>
      );
    case "Cancelled":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60 ${className}`}
        >
          <XCircle className="size-3" />
          ملغاة
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 ${className}`}
        >
          {status}
        </span>
      );
  }
}

interface PartyRoleBadgeProps {
  role: SponsorPartyRole;
  className?: string;
}

export function PartyRoleBadge({ role, className = "" }: PartyRoleBadgeProps) {
  if (role === "Claimant") {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60 ${className}`}
      >
        <Scale className="size-3" />
        المدعي
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60 ${className}`}
    >
      <Shield className="size-3" />
      المدعى عليه
    </span>
  );
}

interface PersonTypeBadgeProps {
  type: PersonType;
  className?: string;
}

export function PersonTypeBadge({ type, className = "" }: PersonTypeBadgeProps) {
  switch (type) {
    case "Employee":
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/60 ${className}`}
        >
          <User className="size-3" />
          موظف
        </span>
      );
    case "Rider":
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/60 ${className}`}
        >
          <Bike className="size-3" />
          سائق / رايدر
        </span>
      );
    case "External":
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700 ${className}`}
        >
          <Globe className="size-3" />
          طرف خارجي
        </span>
      );
    default:
      return null;
  }
}
