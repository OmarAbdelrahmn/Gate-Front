"use client";

import React, { useState } from "react";
import { HrFormTemplatesCatalog } from "@/components/hr/templates/HrFormTemplatesCatalog";
import { HrFormTemplateBuilder } from "@/components/hr/templates/HrFormTemplateBuilder";

export default function HrTemplateDesignerPage() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  if (selectedTemplateId) {
    return (
      <HrFormTemplateBuilder
        templateId={selectedTemplateId}
        onBack={() => setSelectedTemplateId(null)}
      />
    );
  }

  return (
    <HrFormTemplatesCatalog
      onOpenDesigner={(templateId) => setSelectedTemplateId(templateId)}
    />
  );
}
