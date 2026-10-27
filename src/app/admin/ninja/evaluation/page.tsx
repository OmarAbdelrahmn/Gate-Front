// src/app/admin/ninja/evaluation/page.tsx
"use client";

import React, { Suspense } from "react";
import { NinjaEvaluationView } from "@/components/ninja/evaluation/NinjaEvaluationView";
import { RefreshCw } from "lucide-react";

export default function NinjaEvaluationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-sm text-[var(--muted)]">
          <RefreshCw className="me-2 h-5 w-5 animate-spin text-blue-600" />
          <span>جارٍ تحميل شاشة تقييم أداء نينجا والمبالغ المقترحة...</span>
        </div>
      }
    >
      <NinjaEvaluationView />
    </Suspense>
  );
}
