import { authFetch, authDownload, authPreviewBlob } from "../auth/api";
import type {
  MaintenanceLocation,
  CreateMaintenanceLocationRequest,
  UpdateMaintenanceLocationRequest,
  InventoryItem,
  ItemType,
  VehicleType,
  CreateInventoryItemRequest,
  UpdateInventoryItemRequest,
  Supplier,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  PurchaseReceipt,
  ReceiptJsonPayload,
  StockBalance,
  CostLayer,
  OilBarrel,
  OpenOilBarrelRequest,
  AssignOilBarrelVehicleTypeRequest,
  OilBarrelUsageResponse,
  RecordOilBarrelMissingRequest,
  RecordOilBarrelMissingResponse,
  OilBarrelMissingHistoryResponse,
  OpenBarrelResponse,
  OilLossResponse,
  TransferRequest,
  TransferResponse,
  SupplierReturnRequest,
  SupplierReturnResponse,
  RiderIssueRequest,
  RiderIssueResponse,
  WorkOrder,
  CreateCompanyWorkOrderRequest,
  CreateExternalWorkOrderRequest,
  WorkOrderStateActionRequest,
  MaterialUsage,
  RecordMaterialUsageRequest,
  OilReminder,
  MaintenancePlan,
  CreateMaintenancePlanRequest,
  UpdateMaintenancePlanRequest,
  CompleteOilChangeRequest,
  CompleteOilChangeResult,
  CorrectOilChangeVehicleRequest,
  OilChangeDetailsResponse,
  OilChangeCorrectionPreviewRequest,
  OilChangeCancellationPreviewRequest,
  OilChangeWorkflowResponse,
  OilChangeRevisionsResponse,
  DirectOilChangeRequest,
  DirectOilInventoryLocation,
  DirectOilBarrel,
  PartSaleRequest,
  PartSaleResponse,
  CustomerLaborChargeRequest,
  MechanicLaborPaymentRequest,
  FinancialEntryResponse,
  CustomerPaymentRequest,
  CustomerPaymentResponse,
  ExternalProfitReport,
  SupplyRequest,
  CreateRiderSupplyRequestDto,
  ApproveAndIssueSupplyRequestDto,
  RejectSupplyRequestDto,
  CancelSupplyRequestDto,
  SupplyRequestFilterParams,
} from "./types";

// ==========================================
// Locations
// ==========================================

export async function getMaintenanceLocations(): Promise<MaintenanceLocation[]> {
  return authFetch<MaintenanceLocation[]>("/api/maintenance-locations");
}

export async function createMaintenanceLocation(
  payload: CreateMaintenanceLocationRequest,
): Promise<MaintenanceLocation> {
  return authFetch<MaintenanceLocation>("/api/maintenance-locations", {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم إضافة موقع الصيانة بنجاح",
  });
}

export async function updateMaintenanceLocation(
  id: string,
  payload: UpdateMaintenanceLocationRequest,
): Promise<MaintenanceLocation> {
  return authFetch<MaintenanceLocation>(`/api/maintenance-locations/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    notifySuccess: "تم تحديث موقع الصيانة بنجاح",
  });
}

// ==========================================
// Items & Suppliers
// ==========================================

export interface GetInventoryItemsParams {
  search?: string;
  itemType?: ItemType;
  vehicleType?: VehicleType | number | null;
}

export async function getInventoryItems(
  searchOrParams?: string | GetInventoryItemsParams,
  itemType?: ItemType,
  vehicleType?: VehicleType | number | null,
): Promise<InventoryItem[]> {
  const query = new URLSearchParams();
  if (typeof searchOrParams === "object" && searchOrParams !== null) {
    if (searchOrParams.search) query.set("search", searchOrParams.search);
    if (searchOrParams.itemType !== undefined) query.set("itemType", String(searchOrParams.itemType));
    if (searchOrParams.vehicleType !== undefined && searchOrParams.vehicleType !== null) {
      query.set("vehicleType", String(searchOrParams.vehicleType));
    }
  } else {
    if (searchOrParams) query.set("search", searchOrParams);
    if (itemType !== undefined) query.set("itemType", String(itemType));
    if (vehicleType !== undefined && vehicleType !== null) query.set("vehicleType", String(vehicleType));
  }
  const queryString = query.toString() ? `?${query.toString()}` : "";
  return authFetch<InventoryItem[]>(`/api/maintenance-inventory/items${queryString}`);
}

export async function createInventoryItem(
  payload: CreateInventoryItemRequest,
): Promise<InventoryItem> {
  return authFetch<InventoryItem>("/api/maintenance-inventory/items", {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم إضافة الصنف بنجاح",
  });
}

export async function updateInventoryItem(
  id: string,
  payload: UpdateInventoryItemRequest,
): Promise<InventoryItem> {
  return authFetch<InventoryItem>(`/api/maintenance-inventory/items/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    notifySuccess: "تم تحديث بيانات الصنف بنجاح",
  });
}

export async function getSuppliers(): Promise<Supplier[]> {
  return authFetch<Supplier[]>("/api/maintenance-inventory/suppliers");
}

export async function createSupplier(
  payload: CreateSupplierRequest,
): Promise<Supplier> {
  return authFetch<Supplier>("/api/maintenance-inventory/suppliers", {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم إضافة المورد بنجاح",
  });
}

export async function updateSupplier(
  id: string,
  payload: UpdateSupplierRequest,
): Promise<Supplier> {
  return authFetch<Supplier>(`/api/maintenance-inventory/suppliers/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    notifySuccess: "تم تحديث بيانات المورد بنجاح",
  });
}

// ==========================================
// Purchase Receipts & Files
// ==========================================

export async function createPurchaseReceipt(
  receiptJson: ReceiptJsonPayload,
  billFile: File,
): Promise<PurchaseReceipt> {
  // Client-side validations for file
  if (!billFile) {
    throw new Error("ملف فاتورة الشراء إلزامي.");
  }
  const maxBytes = 10 * 1024 * 1024; // 10MB
  if (billFile.size > maxBytes) {
    throw new Error("حجم الملف المرفق يتجاوز الحد الأقصى المسموح به (10 ميجابايت).");
  }

  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/bmp",
  ];
  if (!allowedTypes.includes(billFile.type.toLowerCase())) {
    throw new Error("صيغة الملف غير مدعومة. الصيغ المقبولة: PDF أو الصور (PNG, JPEG, WebP, GIF, BMP).");
  }

  const form = new FormData();
  form.append("ReceiptJson", JSON.stringify(receiptJson));
  form.append("BillFile", billFile);

  return authFetch<PurchaseReceipt>("/api/maintenance-inventory/receipts", {
    method: "POST",
    body: form,
    notifySuccess: "تم تسجيل إيصال الشراء وحفظ الفاتورة بنجاح",
  });
}

export async function getPurchaseReceipts(params?: {
  inventoryLocationId?: string;
  supplierId?: string;
  search?: string;
}): Promise<PurchaseReceipt[]> {
  const query = new URLSearchParams();
  if (params?.inventoryLocationId) query.set("inventoryLocationId", params.inventoryLocationId);
  if (params?.supplierId) query.set("supplierId", params.supplierId);
  if (params?.search) query.set("search", params.search);
  const qStr = query.toString();
  const res = await authFetch<any>(`/api/maintenance-inventory/receipts${qStr ? `?${qStr}` : ""}`);
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.items)) return res.items;
  if (res && Array.isArray(res.data)) return res.data;
  if (res && Array.isArray(res.value)) return res.value;
  return [];
}

export async function getPurchaseReceipt(id: string): Promise<PurchaseReceipt> {
  return authFetch<PurchaseReceipt>(`/api/maintenance-inventory/receipts/${id}`);
}

export async function downloadReceiptBillFile(id: string) {
  return authDownload(`/api/maintenance-inventory/receipts/${id}/bill-file`);
}

export async function previewReceiptBillFile(id: string) {
  return authPreviewBlob(`/api/maintenance-inventory/receipts/${id}/bill-file`);
}

// ==========================================
// Balances, Cost Layers, & Oil Barrels
// ==========================================

export async function getStockBalances(params?: {
  inventoryLocationId?: string;
  inventoryItemId?: string;
}): Promise<StockBalance[]> {
  const query = new URLSearchParams();
  if (params?.inventoryLocationId) query.set("inventoryLocationId", params.inventoryLocationId);
  if (params?.inventoryItemId) query.set("inventoryItemId", params.inventoryItemId);
  const qStr = query.toString();
  return authFetch<StockBalance[]>(`/api/maintenance-inventory/balances${qStr ? `?${qStr}` : ""}`);
}

export async function getCostLayers(params?: {
  inventoryLocationId?: string;
  inventoryItemId?: string;
  availableOnly?: boolean;
}): Promise<CostLayer[]> {
  const query = new URLSearchParams();
  if (params?.inventoryLocationId) query.set("inventoryLocationId", params.inventoryLocationId);
  if (params?.inventoryItemId) query.set("inventoryItemId", params.inventoryItemId);
  if (params?.availableOnly !== undefined) query.set("availableOnly", String(params.availableOnly));
  const qStr = query.toString();
  return authFetch<CostLayer[]>(`/api/maintenance-inventory/cost-layers${qStr ? `?${qStr}` : ""}`);
}

export async function getOilBarrels(params?: {
  inventoryLocationId?: string;
  inventoryItemId?: string;
  status?: string;
  vehicleType?: number | null;
}): Promise<OilBarrel[]> {
  const query = new URLSearchParams();
  if (params?.inventoryLocationId) query.set("inventoryLocationId", params.inventoryLocationId);
  if (params?.inventoryItemId) query.set("inventoryItemId", params.inventoryItemId);
  if (params?.status) query.set("status", params.status);
  if (params?.vehicleType !== undefined && params?.vehicleType !== null) {
    query.set("vehicleType", String(params.vehicleType));
  }
  const qStr = query.toString();
  return authFetch<OilBarrel[]>(`/api/maintenance-inventory/oil-barrels${qStr ? `?${qStr}` : ""}`);
}

export async function openOilBarrel(
  barrelId: string,
  payload: OpenOilBarrelRequest,
): Promise<OpenBarrelResponse> {
  return authFetch<OpenBarrelResponse>(`/api/maintenance-inventory/oil-barrels/${barrelId}/open`, {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: false, // Let the caller decide based on `hasPreviousBarrelWarning`
  });
}

export async function assignOilBarrelVehicleType(
  barrelId: string,
  payload: AssignOilBarrelVehicleTypeRequest,
): Promise<OilBarrel> {
  return authFetch<OilBarrel>(`/api/maintenance-inventory/oil-barrels/${barrelId}/vehicle-type`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    notifySuccess: "تم تحديد نوع المركبة للبرميل بنجاح",
  });
}

export async function getOilBarrelUsage(
  barrelId: string,
  page = 1,
  pageSize = 50,
  lossPage = 1,
  lossPageSize = 50,
): Promise<OilBarrelUsageResponse> {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(Math.min(pageSize, 200)),
    lossPage: String(lossPage),
    lossPageSize: String(Math.min(lossPageSize, 200)),
  });
  return authFetch<OilBarrelUsageResponse>(
    `/api/maintenance-inventory/oil-barrels/${barrelId}/usage?${query}`,
  );
}

export async function recordOilLoss(
  barrelId: string,
  payload: { occurredAtUtc: string; quantityLiters: number; reason: string; rowVersion: string },
): Promise<OilLossResponse> {
  return authFetch<OilLossResponse>(`/api/maintenance-inventory/oil-barrels/${barrelId}/losses`, {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم تسجيل فاقد الزيت بنجاح",
  });
}

export async function recordOilBarrelMissing(
  barrelId: string,
  payload: RecordOilBarrelMissingRequest,
): Promise<RecordOilBarrelMissingResponse> {
  return authFetch<RecordOilBarrelMissingResponse>(
    `/api/maintenance-inventory/oil-barrels/${barrelId}/missing`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      notifySuccess: "تم تسجيل الزيت المفقود/التالف وتحديث المخزون بنجاح",
    },
  );
}

export async function getOilBarrelMissingHistory(
  barrelId: string,
  page = 1,
  pageSize = 50,
): Promise<OilBarrelMissingHistoryResponse> {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(Math.min(pageSize, 200)),
  });
  return authFetch<OilBarrelMissingHistoryResponse>(
    `/api/maintenance-inventory/oil-barrels/${barrelId}/missing?${query}`,
  );
}

export async function createTransfer(payload: TransferRequest): Promise<TransferResponse> {
  return authFetch<TransferResponse>("/api/maintenance-inventory/transfers", {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم تنفيذ نقل المخزون بنجاح",
  });
}

export async function createSupplierReturn(
  payload: SupplierReturnRequest,
): Promise<SupplierReturnResponse> {
  return authFetch<SupplierReturnResponse>("/api/maintenance-inventory/supplier-returns", {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم تسجيل مرتجع المورد بنجاح",
  });
}

export async function createRiderIssue(
  payload: RiderIssueRequest,
): Promise<RiderIssueResponse> {
  return authFetch<RiderIssueResponse>("/api/maintenance-inventory/rider-issues", {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم صرف المستلزمات للمندوب بنجاح",
  });
}

// ==========================================
// Warehouse Supply Requests
// ==========================================

export async function getSupplyRequests(
  params?: SupplyRequestFilterParams,
): Promise<SupplyRequest[]> {
  const query = new URLSearchParams();
  if (params?.inventoryLocationId) query.set("inventoryLocationId", params.inventoryLocationId);
  if (params?.vehicleId) query.set("vehicleId", params.vehicleId);
  if (params?.riderProfileId) query.set("riderProfileId", params.riderProfileId);
  if (params?.status && params.status !== "all") query.set("status", params.status);
  const qStr = query.toString();
  return authFetch<SupplyRequest[]>(`/api/maintenance-inventory/supply-requests${qStr ? `?${qStr}` : ""}`);
}

export async function getSupplyRequest(id: string): Promise<SupplyRequest> {
  return authFetch<SupplyRequest>(`/api/maintenance-inventory/supply-requests/${id}`);
}

export async function getMySupplyRequest(id: string): Promise<SupplyRequest> {
  return authFetch<SupplyRequest>(`/api/maintenance-inventory/my-supply-requests/${id}`);
}

export async function createRiderSupplyRequest(
  payload: CreateRiderSupplyRequestDto,
): Promise<SupplyRequest> {
  return authFetch<SupplyRequest>("/api/maintenance-inventory/rider-supply-requests", {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم تقديم طلب المستلزمات بنجاح. بانتظار موافقة المستودع.",
  });
}

export async function approveAndIssueSupplyRequest(
  id: string,
  payload: ApproveAndIssueSupplyRequestDto,
): Promise<SupplyRequest> {
  return authFetch<SupplyRequest>(`/api/maintenance-inventory/supply-requests/${id}/approve-and-issue`, {
    method: "POST",
    body: JSON.stringify({
      occurredAtUtc: payload.occurredAtUtc,
      rowVersion: payload.rowVersion,
      notes: payload.notes ?? null,
      nextOilBarrelId: payload.nextOilBarrelId ?? null,
    }),
    notifySuccess: "تم اعتماد وصرف الطلب بنجاح وتحديث أرصدة المخزون",
  });
}

export async function rejectSupplyRequest(
  id: string,
  payload: RejectSupplyRequestDto,
): Promise<SupplyRequest> {
  return authFetch<SupplyRequest>(`/api/maintenance-inventory/supply-requests/${id}/reject`, {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم رفض طلب الصرف بنجاح",
  });
}

export async function cancelSupplyRequest(
  id: string,
  payload: CancelSupplyRequestDto,
): Promise<SupplyRequest> {
  return authFetch<SupplyRequest>(`/api/maintenance-inventory/supply-requests/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم إلغاء طلب الصرف بنجاح",
  });
}

// ==========================================
// Work Orders & Materials
// ==========================================

export async function getWorkOrders(params?: {
  maintenanceLocationId?: string;
  vehicleId?: string;
  status?: string;
  serviceSubjectType?: number;
}): Promise<WorkOrder[]> {
  const query = new URLSearchParams();
  if (params?.maintenanceLocationId) query.set("maintenanceLocationId", params.maintenanceLocationId);
  if (params?.vehicleId) query.set("vehicleId", params.vehicleId);
  if (params?.status) query.set("status", params.status);
  if (params?.serviceSubjectType) query.set("serviceSubjectType", String(params.serviceSubjectType));
  const qStr = query.toString();
  return authFetch<WorkOrder[]>(`/api/maintenance-work-orders${qStr ? `?${qStr}` : ""}`);
}

export async function getExternalWorkOrders(params?: {
  maintenanceLocationId?: string;
  status?: string;
}): Promise<WorkOrder[]> {
  const query = new URLSearchParams();
  if (params?.maintenanceLocationId) query.set("maintenanceLocationId", params.maintenanceLocationId);
  if (params?.status) query.set("status", params.status);
  const qStr = query.toString();
  return authFetch<WorkOrder[]>(`/api/maintenance-work-orders/external${qStr ? `?${qStr}` : ""}`);
}

export async function getWorkOrder(id: string): Promise<WorkOrder> {
  return authFetch<WorkOrder>(`/api/maintenance-work-orders/${id}`);
}

export async function createCompanyWorkOrder(
  payload: CreateCompanyWorkOrderRequest,
): Promise<WorkOrder> {
  return authFetch<WorkOrder>("/api/maintenance-work-orders", {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم إنشاء أمر صيانة مركبة الشركة بنجاح",
  });
}

export async function createExternalWorkOrder(
  payload: CreateExternalWorkOrderRequest,
): Promise<WorkOrder> {
  return authFetch<WorkOrder>("/api/maintenance-work-orders/external", {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم إنشاء أمر صيانة العميل الخارجي بنجاح",
  });
}

export async function transitionWorkOrder(
  id: string,
  action: "start" | "complete" | "close" | "cancel",
  payload: WorkOrderStateActionRequest,
): Promise<WorkOrder> {
  const labels: Record<string, string> = {
    start: "بدء العمل على أمر الصيانة",
    complete: "اكتمال أمر الصيانة بنجاح",
    close: "إقفال أمر الصيانة نهائياً",
    cancel: "إلغاء أمر الصيانة",
  };
  return authFetch<WorkOrder>(`/api/maintenance-work-orders/${id}/${action}`, {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: labels[action] || "تم تحديث حالة أمر العمل",
  });
}

export async function recordMaterialUsage(
  workOrderId: string,
  payload: RecordMaterialUsageRequest,
): Promise<MaterialUsage> {
  return authFetch<MaterialUsage>(`/api/maintenance-work-orders/${workOrderId}/materials`, {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم صرف القطعة/المادة واحتساب تكلفة المخزون بنجاح",
  });
}

export async function reverseMaterialUsage(
  usageId: string,
  payload: { reversedAtUtc: string; reason: string },
): Promise<MaterialUsage> {
  return authFetch<MaterialUsage>(`/api/maintenance-work-orders/materials/${usageId}/reverse`, {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم عكس حركة الصرف وإعادة الكمية للمخزون بنجاح",
  });
}

export async function getVehicleMaterialHistory(vehicleId: string): Promise<MaterialUsage[]> {
  return authFetch<MaterialUsage[]>(`/api/maintenance/vehicles/${vehicleId}/material-history`);
}

export async function getRiderMaterialHistory(riderProfileId: string): Promise<MaterialUsage[]> {
  return authFetch<MaterialUsage[]>(`/api/maintenance/riders/${riderProfileId}/material-history`);
}

// ==========================================
// Oil Reminders & Operations
// ==========================================

export async function getOilReminders(): Promise<OilReminder[]> {
  try {
    const res = await authFetch<any>("/api/maintenance/oil-reminders");
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.reminders)) return res.reminders;
    return [];
  } catch (err: any) {
    if (err?.status === 404) {
      try {
        const alt = await authFetch<any>("/api/maintenance-oil-reminders");
        if (Array.isArray(alt)) return alt;
        if (Array.isArray(alt?.items)) return alt.items;
        if (Array.isArray(alt?.data)) return alt.data;
        return [];
      } catch {
        try {
          const alt2 = await authFetch<any>("/api/maintenance-work-orders/oil-reminders");
          if (Array.isArray(alt2)) return alt2;
          if (Array.isArray(alt2?.items)) return alt2.items;
          if (Array.isArray(alt2?.data)) return alt2.data;
          return [];
        } catch {
          throw err;
        }
      }
    }
    throw err;
  }
}

export async function getMaintenancePlans(): Promise<MaintenancePlan[]> {
  return authFetch<MaintenancePlan[]>("/api/maintenance/plans");
}

export async function createMaintenancePlan(
  payload: CreateMaintenancePlanRequest,
): Promise<MaintenancePlan> {
  return authFetch<MaintenancePlan>("/api/maintenance/plans", {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم إنشاء خطة الصيانة الدورية بنجاح",
  });
}

export async function updateMaintenancePlan(
  id: string,
  payload: UpdateMaintenancePlanRequest,
): Promise<MaintenancePlan> {
  return authFetch<MaintenancePlan>(`/api/maintenance/plans/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    notifySuccess: "تم تحديث خطة الصيانة بنجاح",
  });
}

export async function completeOilChange(
  workOrderId: string,
  payload: CompleteOilChangeRequest,
): Promise<CompleteOilChangeResult> {
  return authFetch<CompleteOilChangeResult>(`/api/maintenance-work-orders/${workOrderId}/oil-change`, {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم تسجيل عملية تغيير الزيت وتحديث استهلاك البراميل بنجاح",
  });
}

export async function completeDirectOilChange(
  vehicleId: string,
  payload: DirectOilChangeRequest,
  idempotencyKey: string,
): Promise<CompleteOilChangeResult> {
  return authFetch<CompleteOilChangeResult>(`/api/maintenance/vehicles/${vehicleId}/oil-changes`, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(payload),
    notifySuccess: "تم تغيير الزيت وصرف المواد وتحديث التذكير بنجاح",
  });
}

export async function correctOilChangeVehicle(
  oilChangeId: string,
  payload: CorrectOilChangeVehicleRequest,
): Promise<CompleteOilChangeResult> {
  return authFetch<CompleteOilChangeResult>(
    `/api/maintenance/oil-changes/${encodeURIComponent(oilChangeId)}/vehicle`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
      notifySuccess: "تم تصحيح المركبة وتحديث السجلات المرتبطة بنجاح",
    },
  );
}

export async function getOilChangeDetails(id: string): Promise<OilChangeDetailsResponse> {
  return authFetch<OilChangeDetailsResponse>(
    `/api/maintenance/oil-changes/${encodeURIComponent(id)}`,
  );
}

export async function getOilChangeRevisions(
  id: string,
  page = 1,
  pageSize = 50,
): Promise<OilChangeRevisionsResponse> {
  const safePageSize = Math.min(Math.max(1, pageSize), 100);
  const query = new URLSearchParams({
    page: String(Math.max(1, page)),
    pageSize: String(safePageSize),
  });
  return authFetch<OilChangeRevisionsResponse>(
    `/api/maintenance/oil-changes/${encodeURIComponent(id)}/revisions?${query.toString()}`,
  );
}

export async function previewOilChangeCorrection(
  id: string,
  payload: OilChangeCorrectionPreviewRequest,
): Promise<OilChangeWorkflowResponse> {
  return authFetch<OilChangeWorkflowResponse>(
    `/api/maintenance/oil-changes/${encodeURIComponent(id)}/corrections/preview`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function commitOilChangeCorrection(
  id: string,
  payload: OilChangeCorrectionPreviewRequest,
  idempotencyKey: string,
): Promise<OilChangeWorkflowResponse> {
  return authFetch<OilChangeWorkflowResponse>(
    `/api/maintenance/oil-changes/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(payload),
      notifySuccess: "تم اعتماد تعديل غيار الزيت وتحديث السجلات بنجاح",
    },
  );
}

export async function previewOilChangeCancellation(
  id: string,
  payload: OilChangeCancellationPreviewRequest,
): Promise<OilChangeWorkflowResponse> {
  return authFetch<OilChangeWorkflowResponse>(
    `/api/maintenance/oil-changes/${encodeURIComponent(id)}/cancellation/preview`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function commitOilChangeCancellation(
  id: string,
  payload: OilChangeCancellationPreviewRequest,
  idempotencyKey: string,
): Promise<OilChangeWorkflowResponse> {
  return authFetch<OilChangeWorkflowResponse>(
    `/api/maintenance/oil-changes/${encodeURIComponent(id)}/cancel`,
    {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(payload),
      notifySuccess: "تم إلغاء عملية غيار الزيت وعكس التكاليف والمخزون بنجاح",
    },
  );
}

export async function getVehicleOilChanges(vehicleId: string): Promise<CompleteOilChangeResult[]> {
  if (!vehicleId) return [];

  // 1. Try direct vehicle oil-changes endpoint if available
  try {
    const res = await authFetch<any>(`/api/maintenance/vehicles/${encodeURIComponent(vehicleId)}/oil-changes`);
    const directList: CompleteOilChangeResult[] = Array.isArray(res)
      ? res
      : Array.isArray(res?.items)
        ? res.items
        : Array.isArray(res?.data)
          ? res.data
          : res?.id
            ? [res]
            : [];
    if (directList.length > 0) {
      return directList;
    }
  } catch {
    // Endpoint may not exist as a GET list route; fall through to history + audit discovery
  }

  // 2. Discover oil-change operation IDs from Vehicle Complete History & Audit Log in parallel
  const [historyRes, auditRes] = await Promise.all([
    authFetch<any>(`/api/vehicles/${encodeURIComponent(vehicleId)}/complete-history`).catch(() => null),
    authFetch<any>(`/api/audit-entries?entityType=OilChangeOperation&pageSize=100`).catch(() => null),
  ]);

  const candidateIds = new Set<string>();
  const fallbackMap = new Map<
    string,
    {
      occurredAtUtc: string;
      riderProfileId: string | null;
      details: Record<string, any>;
      isRevisionEvent: boolean;
    }
  >();

  const events: any[] = Array.isArray(historyRes?.events) ? historyRes.events : [];
  for (const ev of events) {
    const cat = String(ev?.category || "").toLowerCase();
    const act = String(ev?.action || "").toLowerCase();
    const d = (ev?.details && typeof ev.details === "object" ? ev.details : {}) as Record<string, any>;

    const isOilEvent =
      cat === "oil_change" ||
      cat.includes("oil_change") ||
      act.includes("oil_change") ||
      act.includes("oil_changed") ||
      Boolean(d.oilChangeOperationId || d.oilChangeId);

    if (!isOilEvent) continue;

    const isRevisionEvent =
      act.includes("revision") ||
      act === "edit" ||
      act === "edit_date" ||
      act === "cancel" ||
      Boolean(d.beforeJson || d.afterJson || d.revisionNumber);

    const explicitOpId = d.oilChangeOperationId || d.oilChangeId || d.operationId;
    if (explicitOpId && typeof explicitOpId === "string") {
      candidateIds.add(explicitOpId);
      if (!fallbackMap.has(explicitOpId)) {
        fallbackMap.set(explicitOpId, {
          occurredAtUtc: ev.occurredAtUtc || new Date().toISOString(),
          riderProfileId: ev.riderProfileId || d.riderProfileId || null,
          details: d,
          isRevisionEvent,
        });
      }
    }

    if (ev.entityId && typeof ev.entityId === "string") {
      candidateIds.add(ev.entityId);
      if (!fallbackMap.has(ev.entityId)) {
        fallbackMap.set(ev.entityId, {
          occurredAtUtc: ev.occurredAtUtc || new Date().toISOString(),
          riderProfileId: ev.riderProfileId || d.riderProfileId || null,
          details: d,
          isRevisionEvent,
        });
      }
    }
  }

  const auditItems: any[] = Array.isArray(auditRes?.items) ? auditRes.items : [];
  for (const entry of auditItems) {
    if (!entry?.entityId) continue;
    const rawStr = JSON.stringify(entry);
    if (rawStr.includes(vehicleId)) {
      const id = String(entry.entityId);
      candidateIds.add(id);
      if (!fallbackMap.has(id)) {
        fallbackMap.set(id, {
          occurredAtUtc: entry.occurredAtUtc || new Date().toISOString(),
          riderProfileId: null,
          details: entry.metadata || {},
          isRevisionEvent: false,
        });
      }
    }
  }

  if (candidateIds.size === 0) {
    return [];
  }

  // 3. Fetch authoritative OilChangeDetailsResponse for each candidate ID
  const resolvedMap = new Map<string, CompleteOilChangeResult>();
  await Promise.all(
    Array.from(candidateIds).map(async (id) => {
      try {
        const detail = await getOilChangeDetails(id);
        if (detail?.operation?.id) {
          const op = detail.operation;
          // If the operation was moved to a different vehicle via vehicle correction, skip it for this vehicle
          if (op.vehicleId && op.vehicleId !== vehicleId) {
            return;
          }
          const effectiveServiceAtUtc =
            op.effectiveServiceAtUtc ??
            detail.materials?.find((m) => m.effectiveServiceAtUtc)?.effectiveServiceAtUtc ??
            op.performedAtUtc;
          resolvedMap.set(op.id, {
            ...op,
            vehicleId: op.vehicleId || vehicleId,
            inventoryLocationId: detail.inventoryLocationId ?? op.inventoryLocationId,
            effectiveServiceAtUtc,
            cancelledAtUtc: detail.cancelledAtUtc ?? op.cancelledAtUtc,
            cancelledByUserId: detail.cancelledByUserId ?? op.cancelledByUserId,
            cancellationReason: detail.cancellationReason ?? op.cancellationReason,
          });
        }
      } catch {
        // Fallback if details endpoint returned 404/error and this was a primary oil change event
        const fb = fallbackMap.get(id);
        if (fb && !fb.isRevisionEvent && !resolvedMap.has(id)) {
          const d = fb.details || {};
          const odo = Number(
            d.odometerAtChange ?? d.odometer ?? d.currentOdometer ?? d.mileageKm ?? 0,
          );
          const liters = Number(
            d.oilQuantityLiters ?? d.configuredOilQuantityLiters ?? d.quantityLiters ?? d.liters ?? 0,
          );
          const oilCost = Number(d.oilCost ?? 0);
          const filterCost = Number(d.oilFilterCost ?? d.filterCost ?? 0);
          const laborCost = Number(d.laborCost ?? 0);
          const otherCost = Number(d.otherCost ?? 0);
          const totalCost = Number(
            d.totalCost ?? d.cost ?? d.amount ?? oilCost + filterCost + laborCost + otherCost,
          );
          resolvedMap.set(id, {
            id,
            maintenanceWorkOrderId: d.maintenanceWorkOrderId ?? d.workOrderId ?? null,
            performedAtUtc: d.performedAtUtc ?? fb.occurredAtUtc,
            effectiveServiceAtUtc: d.effectiveServiceAtUtc ?? d.performedAtUtc ?? fb.occurredAtUtc,
            odometerAtChange: Number.isFinite(odo) ? odo : 0,
            vehicleType: Number(d.vehicleType ?? 2),
            oilQuantityLiters: Number.isFinite(liters) ? liters : 0,
            oilCost: Number.isFinite(oilCost) ? oilCost : 0,
            oilFilterChanged: Boolean(d.oilFilterChanged ?? d.filterChanged),
            oilFilterCost: Number.isFinite(filterCost) ? filterCost : 0,
            laborCost: Number.isFinite(laborCost) ? laborCost : 0,
            otherCost: Number.isFinite(otherCost) ? otherCost : 0,
            totalCost: Number.isFinite(totalCost) ? totalCost : 0,
            vehicleId,
            riderProfileId: fb.riderProfileId,
            isCancelled: Boolean(d.isCancelled ?? d.cancelled),
            revisionNumber: Number(d.revisionNumber ?? 0),
          });
        }
      }
    }),
  );

  return Array.from(resolvedMap.values()).sort((a, b) => {
    const tA = new Date(a.effectiveServiceAtUtc || a.performedAtUtc).getTime();
    const tB = new Date(b.effectiveServiceAtUtc || b.performedAtUtc).getTime();
    return tB - tA;
  });
}

export async function getWorkOrderOilChanges(workOrderId: string): Promise<CompleteOilChangeResult[]> {
  if (!workOrderId) return [];
  try {
    const auditRes = await authFetch<any>(
      `/api/audit-entries?entityType=OilChangeOperation&pageSize=100`,
    ).catch(() => null);
    const candidateIds = new Set<string>();
    const auditItems: any[] = Array.isArray(auditRes?.items) ? auditRes.items : [];
    for (const entry of auditItems) {
      if (!entry?.entityId) continue;
      if (JSON.stringify(entry).includes(workOrderId)) {
        candidateIds.add(String(entry.entityId));
      }
    }

    const resolved: CompleteOilChangeResult[] = [];
    await Promise.all(
      Array.from(candidateIds).map(async (id) => {
        try {
          const detail = await getOilChangeDetails(id);
          if (detail?.operation?.id) {
            const op = detail.operation;
            if (!op.maintenanceWorkOrderId || op.maintenanceWorkOrderId === workOrderId) {
              resolved.push({
                ...op,
                inventoryLocationId: detail.inventoryLocationId ?? op.inventoryLocationId,
                effectiveServiceAtUtc:
                  op.effectiveServiceAtUtc ??
                  detail.materials?.find((m) => m.effectiveServiceAtUtc)?.effectiveServiceAtUtc ??
                  op.performedAtUtc,
                cancelledAtUtc: detail.cancelledAtUtc ?? op.cancelledAtUtc,
                cancelledByUserId: detail.cancelledByUserId ?? op.cancelledByUserId,
                cancellationReason: detail.cancellationReason ?? op.cancellationReason,
              });
            }
          }
        } catch {
          // ignore
        }
      }),
    );

    return resolved.sort((a, b) => {
      const tA = new Date(a.effectiveServiceAtUtc || a.performedAtUtc).getTime();
      const tB = new Date(b.effectiveServiceAtUtc || b.performedAtUtc).getTime();
      return tB - tA;
    });
  } catch {
    return [];
  }
}

export async function getDirectOilInventoryLocations(): Promise<DirectOilInventoryLocation[]> {
  return authFetch<DirectOilInventoryLocation[]>("/api/maintenance/oil-inventory-locations");
}

export async function getDirectOilBarrels(
  inventoryLocationId: string,
  inventoryItemId: string,
  vehicleType?: number | null,
): Promise<DirectOilBarrel[]> {
  const query = new URLSearchParams({ inventoryLocationId, inventoryItemId });
  if (vehicleType !== undefined && vehicleType !== null) {
    query.set("vehicleType", String(vehicleType));
  }
  return authFetch<DirectOilBarrel[]>(`/api/maintenance/oil-barrels?${query}`);
}

// ==========================================
// Riyadh Workshop & Profit Reporting
// ==========================================

export async function recordPartSale(
  workOrderId: string,
  payload: PartSaleRequest,
): Promise<PartSaleResponse> {
  return authFetch<PartSaleResponse>(`/api/maintenance-work-orders/${workOrderId}/part-sales`, {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: "تم تسجيل بيع قطعة الغيار للعميل بنجاح",
  });
}

export async function recordCustomerLaborCharge(
  workOrderId: string,
  payload: CustomerLaborChargeRequest,
): Promise<FinancialEntryResponse> {
  return authFetch<FinancialEntryResponse>(
    `/api/maintenance-work-orders/${workOrderId}/customer-labor-charges`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      notifySuccess: "تم تسجيل أجور يد العميل (إيراد) بنجاح",
    },
  );
}

export async function recordMechanicLaborPayment(
  workOrderId: string,
  payload: MechanicLaborPaymentRequest,
): Promise<FinancialEntryResponse> {
  return authFetch<FinancialEntryResponse>(
    `/api/maintenance-work-orders/${workOrderId}/mechanic-labor-payments`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      notifySuccess: "تم تسجيل مستحقات الفني/الميكانيكي (مصروف) بنجاح",
    },
  );
}

export async function recordOtherFinancialEntry(
  workOrderId: string,
  isIncome: boolean,
  payload: { amountBeforeTax: number; taxAmount: number; occurredAtUtc: string; description: string },
): Promise<FinancialEntryResponse> {
  return authFetch<FinancialEntryResponse>(
    `/api/maintenance-work-orders/${workOrderId}/other-financial-entries?income=${isIncome}`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      notifySuccess: isIncome ? "تم تسجيل الإيراد الإضافي بنجاح" : "تم تسجيل المصروف الإضافي بنجاح",
    },
  );
}

export async function recordCustomerPayment(
  workOrderId: string,
  payload: CustomerPaymentRequest,
): Promise<CustomerPaymentResponse> {
  return authFetch<CustomerPaymentResponse>(
    `/api/maintenance-work-orders/${workOrderId}/customer-payments`,
    {
      method: "POST",
      body: JSON.stringify(payload),
      notifySuccess: "تم تسجيل استلام دفعة العميل بنجاح",
    },
  );
}

export async function getExternalProfitReport(
  maintenanceLocationId: string,
  startDate: string,
  endDate: string,
): Promise<ExternalProfitReport> {
  const query = new URLSearchParams({
    maintenanceLocationId,
    startDate,
    endDate,
  });
  return authFetch<ExternalProfitReport>(`/api/maintenance/external-profit?${query.toString()}`);
}
