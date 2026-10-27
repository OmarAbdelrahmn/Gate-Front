import type {
  Guid, BusinessDate, NinjaEvaluationQuery, NinjaEvaluationReport, NinjaEvaluationDayDetail,
  NinjaEvaluationPolicyResponse, NinjaEvaluationContextRequest, NinjaEvaluationContextResponse,
  NinjaResponsibilityRequest, NinjaResponsibilityResponse, NinjaSnapshotRequest, NinjaSnapshotResponse,
  NinjaPerformanceImportOptions, NinjaPerformancePreviewResponse, NinjaPerformanceConfirmation,
} from "./contracts";

// Inject the application's authenticated transport. It must reject non-success HTTP responses.
export interface NinjaTransport {
  json<T>(path: string, init?: RequestInit): Promise<T>;
  blob(path: string, init?: RequestInit): Promise<Blob>;
}
const root = "/api/ninja";
function queryString(query: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== null) params.set(key, String(value));
  return params.toString();
}
const body = (method: string, value: object): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });

export function createNinjaEvaluationClient(http: NinjaTransport) {
  return {
    evaluate: (query: NinjaEvaluationQuery) => http.json<NinjaEvaluationReport>(`${root}/evaluation?${queryString(query)}`),
    day: (id: Guid, date: BusinessDate) => http.json<NinjaEvaluationDayDetail>(`${root}/evaluation/accounts/${encodeURIComponent(id)}/days/${encodeURIComponent(date)}`),
    policy: () => http.json<NinjaEvaluationPolicyResponse>(`${root}/evaluation/policy`),
    context: (id: Guid) => http.json<NinjaEvaluationContextResponse>(`${root}/evaluation/accounts/${encodeURIComponent(id)}/context`),
    setContext: (id: Guid, request: NinjaEvaluationContextRequest) => http.json<NinjaEvaluationContextResponse>(`${root}/evaluation/accounts/${encodeURIComponent(id)}/context`, body("PUT", request)),
    responsibility: (id: Guid, year: number, month: number) => http.json<NinjaResponsibilityResponse>(`${root}/evaluation/accounts/${encodeURIComponent(id)}/responsibility?${queryString({ year, month })}`),
    setResponsibility: (id: Guid, request: NinjaResponsibilityRequest) => http.json<NinjaResponsibilityResponse>(`${root}/evaluation/accounts/${encodeURIComponent(id)}/responsibility`, body("PUT", request)),
    export: (query: NinjaEvaluationQuery) => http.blob(`${root}/evaluation/export?${queryString(query)}`),
    snapshot: (request: NinjaSnapshotRequest) => http.json<NinjaSnapshotResponse>(`${root}/evaluation/snapshots`, body("POST", request)),
    getSnapshot: (id: Guid) => http.json<NinjaSnapshotResponse>(`${root}/evaluation/snapshots/${encodeURIComponent(id)}`),
    template: (mode: "Daily" | "MultiDay" = "Daily") => http.blob(`${root}/performance/imports/template?mode=${mode}`),
    preview: (file: File, options: NinjaPerformanceImportOptions) => {
      const form = new FormData(); form.append("file", file);
      for (const [key, value] of Object.entries(options)) if (value !== undefined) form.append(key, String(value));
      return http.json<NinjaPerformancePreviewResponse>(`${root}/performance/imports/preview`, { method: "POST", body: form });
    },
    confirm: (previewId: Guid, sameFile: File) => {
      const form = new FormData(); form.append("file", sameFile);
      return http.json<NinjaPerformanceConfirmation>(`${root}/performance/imports/${encodeURIComponent(previewId)}/confirm`, { method: "POST", body: form });
    },
  };
}
