import { authFetch, authDownload, authPreviewBlob } from "../auth/api";
import type {
  MaintenanceLocation,
  CreateMaintenanceLocationRequest,
  UpdateMaintenanceLocationRequest,
  InventoryItem,
  ItemType,
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
  PartSaleRequest,
  PartSaleResponse,
  CustomerLaborChargeRequest,
  MechanicLaborPaymentRequest,
  FinancialEntryResponse,
  CustomerPaymentRequest,
  CustomerPaymentResponse,
  ExternalProfitReport,
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

export async function getInventoryItems(
  search?: string,
  itemType?: ItemType,
): Promise<InventoryItem[]> {
  const query = new URLSearchParams();
  if (search) query.set("search", search);
  if (itemType !== undefined) query.set("itemType", String(itemType));
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
}): Promise<OilBarrel[]> {
  const query = new URLSearchParams();
  if (params?.inventoryLocationId) query.set("inventoryLocationId", params.inventoryLocationId);
  if (params?.inventoryItemId) query.set("inventoryItemId", params.inventoryItemId);
  if (params?.status) query.set("status", params.status);
  const qStr = query.toString();
  return authFetch<OilBarrel[]>(`/api/maintenance-inventory/oil-barrels${qStr ? `?${qStr}` : ""}`);
}

export async function openOilBarrel(
  barrelId: string,
  payload: { openedAtUtc: string; rowVersion: string },
): Promise<OpenBarrelResponse> {
  return authFetch<OpenBarrelResponse>(`/api/maintenance-inventory/oil-barrels/${barrelId}/open`, {
    method: "POST",
    body: JSON.stringify(payload),
    notifySuccess: false, // Let the caller decide based on `hasPreviousBarrelWarning`
  });
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
    notifySuccess: "تم صرف القطعة/المادة وتطبيق تكلفة FIFO بنجاح",
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
  return authFetch<OilReminder[]>("/api/maintenance/oil-reminders");
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
