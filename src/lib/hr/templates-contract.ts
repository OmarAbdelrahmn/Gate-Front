export interface PageMarginsMm {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PageSettings {
  size: "A4" | "A5" | "Letter" | "Custom";
  orientation: "portrait" | "landscape";
  widthMm: number;
  heightMm: number;
  marginsMm: PageMarginsMm;
  headerDistanceMm: number;
  footerDistanceMm: number;
}

export interface ThemeSettings {
  fontFamily: string;
  fontSizePt: number;
  lineHeight: number;
  textColor: string;
  accentColor: string;
}

export interface FormFieldValidation {
  minimum?: number;
  maximum?: number;
  regex?: string;
  [key: string]: unknown;
}

export interface FormFieldDefinition {
  key: string;
  type:
    | "text"
    | "multiline"
    | "number"
    | "money"
    | "date"
    | "checkbox"
    | "select"
    | "employee"
    | "signature"
    | "fingerprint"
    | string;
  source: "employee" | "company" | "manual" | "system" | "computed" | string;
  labelAr: string;
  labelEn?: string;
  path?: string;
  currency?: string;
  format?: string;
  required?: boolean;
  validation?: FormFieldValidation;
}

export interface BlockStyle {
  fontSizePt?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textColor?: string;
  align?: "start" | "center" | "end" | "justify";
}

export interface FormBlock {
  id: string;
  type:
    | "text"
    | "binding"
    | "field"
    | "richText"
    | "signatureGrid"
    | "fingerprint"
    | "pageNumber"
    | "image"
    | "divider"
    | string;
  fieldKey?: string;
  text?: string;
  content?: unknown;
  align?: "start" | "center" | "end" | "justify";
  xMm?: number;
  yMm?: number;
  widthMm?: number;
  heightMm?: number;
  paddingMm?: number;
  marginMm?: number;
  border?: string;
  background?: string;
  style?: BlockStyle;
  columns?: number;
  items?: string[];
  format?: string;
  visibilityRule?: string;
  pageBreakBefore?: boolean;
  keepTogether?: boolean;
}

export interface HeaderFooterSection {
  repeat?: boolean;
  heightMm: number;
  blocks: FormBlock[];
}

export interface BodySection {
  blocks: FormBlock[];
}

export interface SectionsDefinition {
  header?: HeaderFooterSection;
  body: BodySection;
  footer?: HeaderFooterSection;
}

export interface DefinitionJsonV1 {
  schemaVersion: 1;
  locale: string;
  direction: "rtl" | "ltr";
  page: PageSettings;
  theme: ThemeSettings;
  fields?: FormFieldDefinition[];
  sections: SectionsDefinition;
}

export interface HrFormTemplate {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  category: "finance" | "employment" | "custody" | "legal" | string;
  descriptionAr?: string;
  descriptionEn?: string;
  isActive: boolean;
  currentDraftVersionId?: string | null;
  currentPublishedVersionId?: string | null;
  currentDraftVersion?: HrFormTemplateVersion | null;
  currentPublishedVersion?: HrFormTemplateVersion | null;
  createdByUserId?: string;
  createdAtUtc?: string;
  updatedAtUtc?: string;
  rowVersion: string;
  isArchived?: boolean;
  archiveReason?: string;
  archivedAtUtc?: string;
  archivedByUserId?: string;
}

export interface HrFormTemplateVersion {
  id: string;
  hrFormTemplateId: string;
  versionNumber: number;
  definitionSchemaVersion: 1;
  definitionJson: DefinitionJsonV1;
  definitionSha256: string;
  changeNote?: string;
  createdByUserId: string;
  createdAtUtc: string;
}

export interface CreateHrFormTemplatePayload {
  code: string;
  nameAr: string;
  nameEn: string;
  category: string;
  descriptionAr?: string;
  descriptionEn?: string;
  isActive?: boolean;
  definitionJson: DefinitionJsonV1;
  changeNote?: string;
}

export interface UpdateHrFormTemplatePayload {
  nameAr?: string;
  nameEn?: string;
  category?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  isActive?: boolean;
  rowVersion: string;
}

export interface CreateHrFormTemplateVersionPayload {
  definitionJson: DefinitionJsonV1;
  changeNote?: string;
  rowVersion: string;
}

export interface PublishHrFormTemplateVersionPayload {
  rowVersion: string;
}

export interface ArchiveHrFormTemplatePayload {
  reason: string;
  rowVersion: string;
}

/**
 * Validates a DefinitionJsonV1 payload according to contract rules:
 * - schemaVersion must be 1
 * - direction must be rtl or ltr
 * - page.size supports A4, A5, Letter, Custom (Custom requires dimensions between 50 and 1000 mm)
 * - page.orientation must be portrait or landscape
 * - All four margins are required and must be between 0 and 100 mm
 * - sections.body is required
 * - fields optional, but max 250 unique keys, each requiring key, type, source
 * - Complete UTF-8 definition <= 512 KB
 */
export function validateHrFormTemplateDefinition(def: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!def || typeof def !== "object") {
    return { valid: false, errors: ["Definition must be a valid JSON object."] };
  }

  const jsonString = JSON.stringify(def);
  const byteLength = new TextEncoder().encode(jsonString).length;
  if (byteLength > 512 * 1024) {
    errors.push(`Complete UTF-8 definition size (${(byteLength / 1024).toFixed(1)} KB) exceeds maximum 512 KB limit.`);
  }

  const data = def as Partial<DefinitionJsonV1>;

  if (data.schemaVersion !== 1) {
    errors.push("schemaVersion must be 1.");
  }

  if (data.direction !== "rtl" && data.direction !== "ltr") {
    errors.push("direction must be 'rtl' or 'ltr'.");
  }

  if (!data.page || typeof data.page !== "object") {
    errors.push("page configuration object is required.");
  } else {
    const page = data.page;
    const allowedSizes = ["A4", "A5", "Letter", "Custom"];
    if (!allowedSizes.includes(page.size)) {
      errors.push(`page.size must be one of: ${allowedSizes.join(", ")}.`);
    }

    if (page.size === "Custom") {
      if (typeof page.widthMm !== "number" || page.widthMm < 50 || page.widthMm > 1000) {
        errors.push("Custom page widthMm must be a number between 50 and 1000 mm.");
      }
      if (typeof page.heightMm !== "number" || page.heightMm < 50 || page.heightMm > 1000) {
        errors.push("Custom page heightMm must be a number between 50 and 1000 mm.");
      }
    }

    if (page.orientation !== "portrait" && page.orientation !== "landscape") {
      errors.push("page.orientation must be 'portrait' or 'landscape'.");
    }

    if (!page.marginsMm || typeof page.marginsMm !== "object") {
      errors.push("page.marginsMm object with top, right, bottom, left is required.");
    } else {
      const { top, right, bottom, left } = page.marginsMm;
      if (typeof top !== "number" || top < 0 || top > 100) errors.push("page.marginsMm.top must be between 0 and 100 mm.");
      if (typeof right !== "number" || right < 0 || right > 100) errors.push("page.marginsMm.right must be between 0 and 100 mm.");
      if (typeof bottom !== "number" || bottom < 0 || bottom > 100) errors.push("page.marginsMm.bottom must be between 0 and 100 mm.");
      if (typeof left !== "number" || left < 0 || left > 100) errors.push("page.marginsMm.left must be between 0 and 100 mm.");
    }
  }

  if (!data.sections || typeof data.sections !== "object") {
    errors.push("sections configuration is required.");
  } else {
    if (!data.sections.body || !Array.isArray(data.sections.body.blocks)) {
      errors.push("sections.body with a blocks array is required.");
    }
  }

  if (data.fields !== undefined) {
    if (!Array.isArray(data.fields)) {
      errors.push("fields must be an array when specified.");
    } else {
      if (data.fields.length > 250) {
        errors.push(`fields list exceeds maximum limit of 250 keys (found ${data.fields.length}).`);
      }
      const seenKeys = new Set<string>();
      data.fields.forEach((field, index) => {
        if (!field.key || typeof field.key !== "string") {
          errors.push(`field at index ${index} missing required 'key'.`);
        } else {
          if (seenKeys.has(field.key)) {
            errors.push(`Duplicate field key '${field.key}' at index ${index}.`);
          }
          seenKeys.add(field.key);
        }
        if (!field.type) errors.push(`field '${field.key || index}' missing required 'type'.`);
        if (!field.source) errors.push(`field '${field.key || index}' missing required 'source'.`);
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Seed sample definition v1 according to contract specifications
 */
export const SAMPLE_CASH_ADVANCE_DEFINITION: DefinitionJsonV1 = {
  schemaVersion: 1,
  locale: "ar-SA",
  direction: "rtl",
  page: {
    size: "A4",
    orientation: "portrait",
    widthMm: 210,
    heightMm: 297,
    marginsMm: { top: 25.4, right: 31.75, bottom: 25.4, left: 31.75 },
    headerDistanceMm: 12.7,
    footerDistanceMm: 12.7,
  },
  theme: {
    fontFamily: "Noto Naskh Arabic",
    fontSizePt: 12,
    lineHeight: 1.5,
    textColor: "#111827",
    accentColor: "#0F5FC2",
  },
  fields: [
    {
      key: "employee.fullNameAr",
      type: "text",
      source: "employee",
      labelAr: "اسم الموظف",
      path: "fullNameAr",
      required: true,
    },
    {
      key: "employee.iqamaNo",
      type: "text",
      source: "employee",
      labelAr: "رقم الهوية / الإقامة",
      path: "iqamaNo",
      required: true,
    },
    {
      key: "advance.amount",
      type: "money",
      source: "manual",
      labelAr: "مبلغ السلفة",
      currency: "SAR",
      required: true,
      validation: { minimum: 0.01 },
    },
    {
      key: "document.date",
      type: "date",
      source: "system",
      labelAr: "التاريخ",
      format: "yyyy/MM/dd",
    },
  ],
  sections: {
    header: {
      repeat: true,
      heightMm: 18,
      blocks: [
        { id: "company", type: "binding", fieldKey: "company.nameAr", align: "start" },
        { id: "department", type: "text", text: "إدارة الموارد البشرية", align: "end" },
      ],
    },
    body: {
      blocks: [
        {
          id: "title",
          type: "text",
          text: "إقرار سلفة نقدية",
          style: { fontSizePt: 18, bold: true, underline: true, align: "center" },
        },
        { id: "date", type: "field", fieldKey: "document.date" },
        {
          id: "legal-copy",
          type: "richText",
          text: "أقر أنا الموظف الموضح بياناته أعلاه باستلام مبلغ السلفة الموضحة قدرها، وأتفوض بخصمها من مستحقاتي المطبقة بموجب أنظمة الشركة.",
        },
        { id: "signatures", type: "signatureGrid", columns: 3, items: ["employee", "finance", "hr"] },
        { id: "fingerprint", type: "fingerprint", text: "البصمة المعتمدة" },
      ],
    },
    footer: {
      repeat: true,
      heightMm: 10,
      blocks: [{ id: "page-number", type: "pageNumber", format: "{page} / {pages}", align: "center" }],
    },
  },
};
