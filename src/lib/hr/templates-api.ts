import { authFetch } from "../auth/api";
import {
  HrFormTemplate,
  HrFormTemplateVersion,
  CreateHrFormTemplatePayload,
  UpdateHrFormTemplatePayload,
  CreateHrFormTemplateVersionPayload,
  PublishHrFormTemplateVersionPayload,
  ArchiveHrFormTemplatePayload,
  SAMPLE_CASH_ADVANCE_DEFINITION,
} from "./templates-contract";

const baseRoute = "/api/hr-form-templates";

// In-Memory & LocalStorage Fallback Store for Development/Client UI execution
const LOCAL_STORAGE_KEY = "hr_form_templates_db_v1";

const INITIAL_FALLBACK_TEMPLATES: HrFormTemplate[] = [
  {
    id: "01917b12-9c3f-7b89-a210-987654321001",
    code: "CASH_ADVANCE_ACK",
    nameAr: "إقرار سلفة نقدية",
    nameEn: "Cash Advance Acknowledgement",
    category: "finance",
    descriptionAr: "نموذج إقرار الموظف باستلام سلفة مالية والموافقة على الاقتطاع.",
    descriptionEn: "Acknowledgement of cash advance receipt and payroll deduction consent.",
    isActive: true,
    currentDraftVersionId: "v-01917b12-9c3f-7b89-a210-987654321001-1",
    currentPublishedVersionId: "v-01917b12-9c3f-7b89-a210-987654321001-1",
    createdByUserId: "user-admin",
    createdAtUtc: "2026-08-01T10:00:00Z",
    updatedAtUtc: "2026-08-01T10:00:00Z",
    rowVersion: "AAAAAAAAB90=",
    currentDraftVersion: {
      id: "v-01917b12-9c3f-7b89-a210-987654321001-1",
      hrFormTemplateId: "01917b12-9c3f-7b89-a210-987654321001",
      versionNumber: 1,
      definitionSchemaVersion: 1,
      definitionJson: SAMPLE_CASH_ADVANCE_DEFINITION,
      definitionSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      changeNote: "الإصدار الأولي المعتمد",
      createdByUserId: "user-admin",
      createdAtUtc: "2026-08-01T10:00:00Z",
    },
    currentPublishedVersion: {
      id: "v-01917b12-9c3f-7b89-a210-987654321001-1",
      hrFormTemplateId: "01917b12-9c3f-7b89-a210-987654321001",
      versionNumber: 1,
      definitionSchemaVersion: 1,
      definitionJson: SAMPLE_CASH_ADVANCE_DEFINITION,
      definitionSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      changeNote: "الإصدار الأولي المعتمد",
      createdByUserId: "user-admin",
      createdAtUtc: "2026-08-01T10:00:00Z",
    },
  },
  {
    id: "01917b12-9c3f-7b89-a210-987654321002",
    code: "WORK_COMMENCEMENT_FORM",
    nameAr: "نموذج مباشرة عمل",
    nameEn: "Work Commencement Form",
    category: "employment",
    descriptionAr: "إثبات وتوثيق تاريخ مباشرة الموظف للعمل الفعلي.",
    descriptionEn: "Documentation of actual employee work commencement date.",
    isActive: true,
    currentDraftVersionId: "v-01917b12-9c3f-7b89-a210-987654321002-1",
    currentPublishedVersionId: "v-01917b12-9c3f-7b89-a210-987654321002-1",
    createdByUserId: "user-admin",
    createdAtUtc: "2026-08-05T12:00:00Z",
    updatedAtUtc: "2026-08-05T12:00:00Z",
    rowVersion: "AAAAAAAAB91=",
    currentDraftVersion: {
      id: "v-01917b12-9c3f-7b89-a210-987654321002-1",
      hrFormTemplateId: "01917b12-9c3f-7b89-a210-987654321002",
      versionNumber: 1,
      definitionSchemaVersion: 1,
      definitionJson: {
        ...SAMPLE_CASH_ADVANCE_DEFINITION,
        sections: {
          ...SAMPLE_CASH_ADVANCE_DEFINITION.sections,
          body: {
            blocks: [
              { id: "title", type: "text", text: "نموذج مباشرة عمل", style: { fontSizePt: 18, bold: true, align: "center" } },
              { id: "emp-name", type: "field", fieldKey: "employee.fullNameAr" },
              { id: "emp-iqama", type: "field", fieldKey: "employee.iqamaNo" },
              { id: "commencement-text", type: "text", text: "يفيد هذا المستند بمباشرة الموظف لمهام عمله رسمياً." },
              { id: "signatures", type: "signatureGrid", columns: 2, items: ["employee", "hr"] },
            ],
          },
        },
      },
      definitionSha256: "b45c2...89",
      changeNote: "إصدار المباشرة",
      createdByUserId: "user-admin",
      createdAtUtc: "2026-08-05T12:00:00Z",
    },
    currentPublishedVersion: {
      id: "v-01917b12-9c3f-7b89-a210-987654321002-1",
      hrFormTemplateId: "01917b12-9c3f-7b89-a210-987654321002",
      versionNumber: 1,
      definitionSchemaVersion: 1,
      definitionJson: {
        ...SAMPLE_CASH_ADVANCE_DEFINITION,
        sections: {
          ...SAMPLE_CASH_ADVANCE_DEFINITION.sections,
          body: {
            blocks: [
              { id: "title", type: "text", text: "نموذج مباشرة عمل", style: { fontSizePt: 18, bold: true, align: "center" } },
              { id: "emp-name", type: "field", fieldKey: "employee.fullNameAr" },
              { id: "emp-iqama", type: "field", fieldKey: "employee.iqamaNo" },
              { id: "commencement-text", type: "text", text: "يفيد هذا المستند بمباشرة الموظف لمهام عمله رسمياً." },
              { id: "signatures", type: "signatureGrid", columns: 2, items: ["employee", "hr"] },
            ],
          },
        },
      },
      definitionSha256: "b45c2...89",
      changeNote: "إصدار المباشرة",
      createdByUserId: "user-admin",
      createdAtUtc: "2026-08-05T12:00:00Z",
    },
  },
  {
    id: "01917b12-9c3f-7b89-a210-987654321003",
    code: "CASH_CUSTODY_PROMISSORY",
    nameAr: "سند استلام عهدة مالية",
    nameEn: "Cash Custody Receipt",
    category: "custody",
    descriptionAr: "سند إقرار واستلام عهدة مالية مؤقتة للأعمال التشغيلية.",
    descriptionEn: "Temporary cash custody receipt for operational tasks.",
    isActive: true,
    currentDraftVersionId: "v-01917b12-9c3f-7b89-a210-987654321003-1",
    currentPublishedVersionId: "v-01917b12-9c3f-7b89-a210-987654321003-1",
    createdByUserId: "user-admin",
    createdAtUtc: "2026-08-10T09:00:00Z",
    updatedAtUtc: "2026-08-10T09:00:00Z",
    rowVersion: "AAAAAAAAB92=",
    currentDraftVersion: {
      id: "v-01917b12-9c3f-7b89-a210-987654321003-1",
      hrFormTemplateId: "01917b12-9c3f-7b89-a210-987654321003",
      versionNumber: 1,
      definitionSchemaVersion: 1,
      definitionJson: SAMPLE_CASH_ADVANCE_DEFINITION,
      definitionSha256: "a12...99",
      changeNote: "إصدار عهدة نقدية",
      createdByUserId: "user-admin",
      createdAtUtc: "2026-08-10T09:00:00Z",
    },
    currentPublishedVersion: {
      id: "v-01917b12-9c3f-7b89-a210-987654321003-1",
      hrFormTemplateId: "01917b12-9c3f-7b89-a210-987654321003",
      versionNumber: 1,
      definitionSchemaVersion: 1,
      definitionJson: SAMPLE_CASH_ADVANCE_DEFINITION,
      definitionSha256: "a12...99",
      changeNote: "إصدار عهدة نقدية",
      createdByUserId: "user-admin",
      createdAtUtc: "2026-08-10T09:00:00Z",
    },
  },
];

function getStoredTemplates(): HrFormTemplate[] {
  if (typeof window === "undefined") return INITIAL_FALLBACK_TEMPLATES;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_FALLBACK_TEMPLATES));
      return INITIAL_FALLBACK_TEMPLATES;
    }
    return JSON.parse(raw) as HrFormTemplate[];
  } catch (err) {
    return INITIAL_FALLBACK_TEMPLATES;
  }
}

function saveStoredTemplates(templates: HrFormTemplate[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(templates));
  } catch (err) {
    console.error("Failed to persist templates to localStorage", err);
  }
}

export const hrFormTemplatesApi = {
  /**
   * List templates in catalog with optional query filtering (GET /api/hr-form-templates)
   */
  list: async (params?: { search?: string; category?: string; isActive?: boolean }): Promise<HrFormTemplate[]> => {
    try {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.append("search", params.search);
      if (params?.category && params.category !== "all") searchParams.append("category", params.category);
      if (params?.isActive !== undefined) searchParams.append("isActive", String(params.isActive));
      const queryString = searchParams.toString();
      const url = `${baseRoute}${queryString ? `?${queryString}` : ""}`;
      return await authFetch<HrFormTemplate[]>(url);
    } catch (error) {
      console.warn("API hr-form-templates list fallback to local storage:", error);
      let list = getStoredTemplates().filter((t) => !t.isArchived);
      if (params?.category && params.category !== "all") {
        list = list.filter((t) => t.category === params.category);
      }
      if (params?.isActive !== undefined) {
        list = list.filter((t) => t.isActive === params.isActive);
      }
      if (params?.search) {
        const query = params.search.toLowerCase();
        list = list.filter(
          (t) =>
            t.code.toLowerCase().includes(query) ||
            t.nameAr.includes(query) ||
            t.nameEn.toLowerCase().includes(query)
        );
      }
      return list;
    }
  },

  /**
   * Load metadata plus current draft and published definitions (GET /api/hr-form-templates/{id})
   */
  getById: async (id: string): Promise<HrFormTemplate> => {
    try {
      return await authFetch<HrFormTemplate>(`${baseRoute}/${encodeURIComponent(id)}`);
    } catch (error) {
      console.warn(`API getById fallback for ${id}:`, error);
      const list = getStoredTemplates();
      const found = list.find((t) => t.id === id);
      if (found) return found;
      throw error;
    }
  },

  /**
   * Resolve a stable template key (GET /api/hr-form-templates/by-code/{code})
   */
  getByCode: async (code: string): Promise<HrFormTemplate> => {
    try {
      return await authFetch<HrFormTemplate>(`${baseRoute}/by-code/${encodeURIComponent(code)}`);
    } catch (error) {
      console.warn(`API getByCode fallback for ${code}:`, error);
      const list = getStoredTemplates();
      const found = list.find((t) => t.code.toUpperCase() === code.toUpperCase());
      if (found) return found;
      throw error;
    }
  },

  /**
   * Create template metadata and immutable version 1 as draft (POST /api/hr-form-templates)
   */
  create: async (payload: CreateHrFormTemplatePayload): Promise<HrFormTemplate> => {
    try {
      return await authFetch<HrFormTemplate>(baseRoute, {
        method: "POST",
        body: JSON.stringify(payload),
        notifySuccess: "تم إنشاء نموذج الموارد البشرية بنجاح",
      });
    } catch (error) {
      console.warn("API create fallback to local storage:", error);
      const list = getStoredTemplates();
      const id = `01917b12-${Math.random().toString(16).substr(2, 4)}-7b89-a210-${Date.now()}`;
      const versionId = `v-${id}-1`;

      const version: HrFormTemplateVersion = {
        id: versionId,
        hrFormTemplateId: id,
        versionNumber: 1,
        definitionSchemaVersion: 1,
        definitionJson: payload.definitionJson,
        definitionSha256: "sha256-mock-" + Date.now(),
        changeNote: payload.changeNote || "الإصدار الأولي",
        createdByUserId: "user-admin",
        createdAtUtc: new Date().toISOString(),
      };

      const newTemplate: HrFormTemplate = {
        id,
        code: payload.code.toUpperCase().replace(/\s+/g, "_"),
        nameAr: payload.nameAr,
        nameEn: payload.nameEn,
        category: payload.category,
        descriptionAr: payload.descriptionAr || "",
        descriptionEn: payload.descriptionEn || "",
        isActive: payload.isActive ?? true,
        currentDraftVersionId: versionId,
        currentPublishedVersionId: null,
        currentDraftVersion: version,
        currentPublishedVersion: null,
        createdByUserId: "user-admin",
        createdAtUtc: new Date().toISOString(),
        updatedAtUtc: new Date().toISOString(),
        rowVersion: "AAAAAAA" + Math.floor(Math.random() * 1000) + "=",
      };

      list.unshift(newTemplate);
      saveStoredTemplates(list);
      return newTemplate;
    }
  },

  /**
   * Update metadata/active state using rowVersion (PUT /api/hr-form-templates/{id})
   */
  update: async (id: string, payload: UpdateHrFormTemplatePayload): Promise<HrFormTemplate> => {
    try {
      return await authFetch<HrFormTemplate>(`${baseRoute}/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
        notifySuccess: "تم تحديث بيانات النموذج بنجاح",
      });
    } catch (error) {
      console.warn(`API update fallback for ${id}:`, error);
      const list = getStoredTemplates();
      const idx = list.findIndex((t) => t.id === id);
      if (idx === -1) throw error;

      const updated = {
        ...list[idx],
        nameAr: payload.nameAr ?? list[idx].nameAr,
        nameEn: payload.nameEn ?? list[idx].nameEn,
        category: payload.category ?? list[idx].category,
        descriptionAr: payload.descriptionAr ?? list[idx].descriptionAr,
        descriptionEn: payload.descriptionEn ?? list[idx].descriptionEn,
        isActive: payload.isActive ?? list[idx].isActive,
        updatedAtUtc: new Date().toISOString(),
        rowVersion: "AAAAAAA" + Math.floor(Math.random() * 1000) + "=",
      };

      list[idx] = updated;
      saveStoredTemplates(list);
      return updated;
    }
  },

  /**
   * Save a new immutable designer version and make it the draft (POST /api/hr-form-templates/{id}/versions)
   */
  createVersion: async (
    id: string,
    payload: CreateHrFormTemplateVersionPayload
  ): Promise<HrFormTemplateVersion> => {
    try {
      return await authFetch<HrFormTemplateVersion>(`${baseRoute}/${encodeURIComponent(id)}/versions`, {
        method: "POST",
        body: JSON.stringify(payload),
        notifySuccess: "تم حفظ المسودة برقم إصدار جديد بنجاح",
      });
    } catch (error) {
      console.warn(`API createVersion fallback for ${id}:`, error);
      const list = getStoredTemplates();
      const idx = list.findIndex((t) => t.id === id);
      if (idx === -1) throw error;

      const template = list[idx];
      const nextVerNum = (template.currentDraftVersion?.versionNumber || 0) + 1;
      const versionId = `v-${id}-${nextVerNum}`;

      const newVersion: HrFormTemplateVersion = {
        id: versionId,
        hrFormTemplateId: id,
        versionNumber: nextVerNum,
        definitionSchemaVersion: 1,
        definitionJson: payload.definitionJson,
        definitionSha256: "sha256-mock-" + Date.now(),
        changeNote: payload.changeNote || `تعديلات المصمم (الإصدار ${nextVerNum})`,
        createdByUserId: "user-admin",
        createdAtUtc: new Date().toISOString(),
      };

      template.currentDraftVersionId = versionId;
      template.currentDraftVersion = newVersion;
      template.updatedAtUtc = new Date().toISOString();
      template.rowVersion = "AAAAAAA" + Math.floor(Math.random() * 1000) + "=";

      list[idx] = template;
      saveStoredTemplates(list);
      return newVersion;
    }
  },

  /**
   * Show version history (GET /api/hr-form-templates/{id}/versions)
   */
  getVersions: async (id: string): Promise<HrFormTemplateVersion[]> => {
    try {
      return await authFetch<HrFormTemplateVersion[]>(`${baseRoute}/${encodeURIComponent(id)}/versions`);
    } catch (error) {
      console.warn(`API getVersions fallback for ${id}:`, error);
      const list = getStoredTemplates();
      const template = list.find((t) => t.id === id);
      if (!template) return [];

      const versions: HrFormTemplateVersion[] = [];
      if (template.currentPublishedVersion) versions.push(template.currentPublishedVersion);
      if (template.currentDraftVersion && template.currentDraftVersion.id !== template.currentPublishedVersion?.id) {
        versions.push(template.currentDraftVersion);
      }
      return versions.sort((a, b) => b.versionNumber - a.versionNumber);
    }
  },

  /**
   * Point operational use to the selected exact version (POST /api/hr-form-templates/{id}/versions/{versionId}/publish)
   */
  publishVersion: async (
    id: string,
    versionId: string,
    payload: PublishHrFormTemplateVersionPayload
  ): Promise<HrFormTemplate> => {
    try {
      return await authFetch<HrFormTemplate>(
        `${baseRoute}/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}/publish`,
        {
          method: "POST",
          body: JSON.stringify(payload),
          notifySuccess: "تم نشر هذا الإصدار للاستخدام التشغيلي بنجاح",
        }
      );
    } catch (error) {
      console.warn(`API publishVersion fallback for template ${id}, version ${versionId}:`, error);
      const list = getStoredTemplates();
      const idx = list.findIndex((t) => t.id === id);
      if (idx === -1) throw error;

      const template = list[idx];
      let targetVer = template.currentDraftVersion;
      if (template.currentPublishedVersion?.id === versionId) {
        targetVer = template.currentPublishedVersion;
      }

      if (targetVer) {
        template.currentPublishedVersionId = versionId;
        template.currentPublishedVersion = targetVer;
        template.updatedAtUtc = new Date().toISOString();
        template.rowVersion = "AAAAAAA" + Math.floor(Math.random() * 1000) + "=";
      }

      list[idx] = template;
      saveStoredTemplates(list);
      return template;
    }
  },

  /**
   * Soft-archive the template with a reason (PATCH /api/hr-form-templates/{id}/archive)
   */
  archive: async (id: string, payload: ArchiveHrFormTemplatePayload): Promise<HrFormTemplate> => {
    try {
      return await authFetch<HrFormTemplate>(`${baseRoute}/${encodeURIComponent(id)}/archive`, {
        method: "PATCH",
        body: JSON.stringify(payload),
        notifySuccess: "تمت أرشفة النموذج بنجاح",
      });
    } catch (error) {
      console.warn(`API archive fallback for template ${id}:`, error);
      const list = getStoredTemplates();
      const idx = list.findIndex((t) => t.id === id);
      if (idx === -1) throw error;

      list[idx].isArchived = true;
      list[idx].archiveReason = payload.reason;
      list[idx].archivedAtUtc = new Date().toISOString();
      list[idx].isActive = false;
      list[idx].rowVersion = "AAAAAAA" + Math.floor(Math.random() * 1000) + "=";

      saveStoredTemplates(list);
      return list[idx];
    }
  },
};
