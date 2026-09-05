// ==========================================
// Numeric Enum Definitions (Matches Backend Contract)
// ==========================================

export enum LocationType {
  Warehouse = 1,
  Workshop = 2,
  WarehouseAndWorkshop = 3,
}

export enum ServiceSubjectType {
  CompanyVehicle = 1,
  ExternalVehicle = 2,
}

export enum MaintenanceType {
  Preventive = 1,
  Corrective = 2,
  Inspection = 3,
  AccidentRepair = 4,
  OilChange = 5,
  PartSaleOnly = 6,
}

export enum WorkOrderStatus {
  Open = 1,
  InProgress = 2,
  Completed = 3,
  Closed = 4,
  Cancelled = 5,
}

export enum ItemType {
  SparePart = 1,
  RiderAccessory = 2,
  Oil = 3,
  Consumable = 4,
}

export enum UnitOfMeasure {
  Piece = 1,
  Liter = 2,
  Barrel = 3,
  Box = 4,
  Set = 5,
}

export enum MaterialUsageType {
  SparePart = 1,
  Oil = 2,
  OilFilter = 3,
  Consumable = 4,
  ExternalPartSale = 5,
}

export enum PaymentMethod {
  Cash = 1,
  Card = 2,
  BankTransfer = 3,
  Other = 4,
}

export enum OilBarrelStatus {
  Sealed = 1,
  Open = 2,
  Depleted = 3,
  Returned = 4,
}

export enum OilReminderStatus {
  OK = 1,
  Due = 2,
  Overdue = 3,
  NeverDone = 4,
  OdometerMissing = 5,
}

export enum ExternalPaymentStatus {
  Unpaid = 1,
  PartiallyPaid = 2,
  Paid = 3,
  Refunded = 4,
}

export enum MaterialUsageDirection {
  Issue = 1,
  Reversal = 2,
}

// ==========================================
// Locations
// ==========================================

export interface MaintenanceLocation {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  operatingCityId: string;
  operatingCityNameAr?: string;
  locationType: LocationType;
  allowsCompanyVehicles: boolean;
  allowsExternalVehicles: boolean;
  allowsSparePartSales: boolean;
  allowsPaidExternalRepairs: boolean;
  inventoryEnabled: boolean;
  status: number;
  address: string | null;
  notes: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rowVersion: string;
}

export interface CreateMaintenanceLocationRequest {
  code: string;
  nameAr: string;
  nameEn: string;
  operatingCityId: string;
  locationType: LocationType;
  allowsCompanyVehicles: boolean;
  allowsExternalVehicles: boolean;
  allowsSparePartSales: boolean;
  allowsPaidExternalRepairs: boolean;
  inventoryEnabled: boolean;
  address?: string | null;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rowVersion: null;
}

export interface UpdateMaintenanceLocationRequest {
  code: string;
  nameAr: string;
  nameEn: string;
  operatingCityId: string;
  locationType: LocationType;
  allowsCompanyVehicles: boolean;
  allowsExternalVehicles: boolean;
  allowsSparePartSales: boolean;
  allowsPaidExternalRepairs: boolean;
  inventoryEnabled: boolean;
  address?: string | null;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rowVersion: string;
}

// ==========================================
// Items & Suppliers
// ==========================================

export interface InventoryItem {
  id: string;
  sku: string;
  barcode: string | null;
  itemType: ItemType;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  baseUnitOfMeasure: UnitOfMeasure;
  purchaseUnitOfMeasure: UnitOfMeasure;
  defaultPackageQuantity: number;
  minimumStockLevel: number;
  reorderQuantity: number;
  isSerialized: boolean;
  isLotTracked: boolean;
  status: number;
  rowVersion: string;
}

export interface CreateInventoryItemRequest {
  sku: string;
  barcode?: string | null;
  itemType: ItemType;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  baseUnitOfMeasure: UnitOfMeasure;
  purchaseUnitOfMeasure: UnitOfMeasure;
  defaultPackageQuantity: number;
  minimumStockLevel: number;
  reorderQuantity: number;
  isSerialized: boolean;
  isLotTracked: boolean;
  rowVersion: null;
}

export interface UpdateInventoryItemRequest {
  sku: string;
  barcode?: string | null;
  itemType: ItemType;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  baseUnitOfMeasure: UnitOfMeasure;
  purchaseUnitOfMeasure: UnitOfMeasure;
  defaultPackageQuantity: number;
  minimumStockLevel: number;
  reorderQuantity: number;
  isSerialized: boolean;
  isLotTracked: boolean;
  rowVersion: string;
}

export interface Supplier {
  id: string;
  supplierNumber: string;
  legalNameAr: string;
  legalNameEn: string;
  vatNumber: string | null;
  commercialRegistrationNumber: string | null;
  contactName?: string | null;
  phone: string | null;
  email?: string | null;
  address?: string | null;
  paymentTermsDays?: number | null;
  notes: string | null;
  status: number;
  rowVersion: string;
}

export interface CreateSupplierRequest {
  supplierNumber: string;
  legalNameAr: string;
  legalNameEn: string;
  vatNumber?: string | null;
  commercialRegistrationNumber?: string | null;
  contactName?: string | null;
  phone: string | null;
  email?: string | null;
  address?: string | null;
  paymentTermsDays?: number | null;
  notes?: string | null;
  rowVersion: null;
}

export interface UpdateSupplierRequest {
  supplierNumber: string;
  legalNameAr: string;
  legalNameEn: string;
  vatNumber?: string | null;
  commercialRegistrationNumber?: string | null;
  contactName?: string | null;
  phone: string | null;
  email?: string | null;
  address?: string | null;
  paymentTermsDays?: number | null;
  notes?: string | null;
  rowVersion: string;
}

// ==========================================
// Receipts & Attachments
// ==========================================

export interface ReceiptJsonPayload {
  supplierId: string;
  supplierInvoiceNumber: string;
  invoiceDate: string; // YYYY-MM-DD
  receivedAtUtc: string; // ISO-8601
  inventoryLocationId: string;
  currencyCode: string;
  lines: ReceiptLinePayload[];
}

export interface ReceiptLinePayload {
  inventoryItemId: string;
  purchaseUnit: UnitOfMeasure;
  packageCount: number;
  declaredQuantityPerPackage: number;
  grossWeightKg: number | null;
  netWeightKg: number | null;
  packageUnitPrice: number;
  discountAmount: number;
  taxAmount: number;
  lotNumber: string | null;
  expiryDate: string | null; // YYYY-MM-DD
}

export interface ReceiptAttachment {
  id: string;
  originalFileName: string;
  contentType: string;
  fileSizeBytes: number;
  sha256Checksum: string;
  uploadedAtUtc: string;
}

export interface PurchaseReceiptLine {
  id: string;
  inventoryItemId: string;
  sku: string;
  purchaseUnit: UnitOfMeasure;
  packageCount: number;
  declaredQuantityPerPackage: number;
  receivedBaseQuantity: number;
  baseUnitOfMeasure: UnitOfMeasure;
  grossWeightKg: number | null;
  netWeightKg: number | null;
  packageUnitPrice: number;
  lineSubtotal: number;
  discountAmount: number;
  taxAmount: number;
  inventoryValuationAmount: number;
  baseUnitCost: number;
  stockCostLayerId: string;
  lotNumber?: string | null;
  expiryDate?: string | null;
}

export interface PurchaseReceipt {
  id: string;
  receiptNumber: string;
  supplierId: string;
  supplierNameAr: string;
  supplierInvoiceNumber: string;
  invoiceDate: string;
  receivedAtUtc: string;
  inventoryLocationId: string;
  inventoryLocationNameAr: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  inventoryValuationAmount: number;
  totalAmount: number;
  currencyCode: string;
  status: number;
  lines: PurchaseReceiptLine[];
  attachment: ReceiptAttachment | null;
  oilBarrels?: OilBarrel[];
  rowVersion: string;
}

// ==========================================
// Stock Balances, FIFO, & Oil Barrels
// ==========================================

export interface StockBalance {
  id: string;
  inventoryItemId: string;
  sku: string;
  itemNameAr: string;
  inventoryLocationId: string;
  locationNameAr: string;
  quantityOnHand: number;
  quantityReserved: number;
  reportingAverageUnitCost: number;
  inventoryValue: number;
  lastMovementAtUtc: string | null;
  rowVersion: string;
}

export interface CostLayer {
  id: string;
  receivedAtUtc: string;
  originalSequence: number;
  originalQuantity: number;
  remainingQuantity: number;
  baseUnitOfMeasure: UnitOfMeasure;
  unitCost: number;
  remainingValue: number;
  lotNumber: string | null;
  expiryDate: string | null;
  sourceReceiptLineId: string | null;
  sourceCostLayerId: string | null;
  rowVersion: string;
}

export interface OilBarrel {
  id: string;
  barrelNumber: string;
  purchaseReceiptLineId: string;
  inventoryItemId: string;
  inventoryLocationId: string;
  stockCostLayerId: string;
  packageSequence: number;
  nominalCapacityLiters: number;
  consumedLiters: number;
  remainingLiters: number;
  unitCostPerLiter: number;
  remainingInventoryValue: number;
  maximumAllowedLossLiters: number;
  recordedLossLiters: number;
  remainingLossAllowanceLiters: number;
  status: OilBarrelStatus;
  openedAtUtc: string | null;
  depletedAtUtc: string | null;
  rowVersion: string;
}

export interface OpenBarrelResponse {
  barrel: {
    id: string;
    remainingLiters: number;
    status: OilBarrelStatus;
    rowVersion: string;
  };
  opened: boolean;
  hasPreviousBarrelWarning: boolean;
  previousOpenBarrelsRemainingLiters: number;
  warningCode?: string;
  warningMessageAr?: string;
}

export interface OilLossResponse {
  id: string;
  oilBarrelId: string;
  occurredAtUtc: string;
  quantityLiters: number;
  costAmount: number;
  barrelRecordedLossLiters: number;
  barrelRemainingLiters: number;
  barrelRemainingLossAllowanceLiters: number;
}

export interface TransferRequest {
  sourceLocationId: string;
  destinationLocationId: string;
  postedAtUtc: string;
  reason: string;
  lines: { inventoryItemId: string; quantity: number }[];
}

export interface TransferResponse {
  id: string;
  transferNumber: string;
  sourceLocationId: string;
  destinationLocationId: string;
  postedAtUtc: string;
  totalCost: number;
  status: number;
  rowVersion: string;
}

export interface SupplierReturnRequest {
  supplierId: string;
  inventoryLocationId: string;
  purchaseReceiptId: string | null;
  returnedAtUtc: string;
  reason: string;
  lines: {
    inventoryItemId: string;
    stockCostLayerId: string;
    quantity: number;
    reason: string;
  }[];
}

export interface SupplierReturnResponse {
  id: string;
  returnNumber: string;
  supplierId: string;
  inventoryLocationId: string;
  returnedAtUtc: string;
  totalCost: number;
  status: number;
  rowVersion: string;
}

export interface RiderIssueRequest {
  riderProfileId: string;
  inventoryLocationId: string;
  issuedAtUtc: string;
  notes?: string | null;
  lines: {
    inventoryItemId: string;
    quantity: number;
    expectedReturn: boolean;
  }[];
}

export interface RiderIssueResponse {
  id: string;
  issueNumber: string;
  riderProfileId: string;
  relatedAssignmentId: string | null;
  inventoryLocationId: string;
  issuedAtUtc: string;
  totalCost: number;
  status: number;
  rowVersion: string;
}

// ==========================================
// Work Orders & Materials
// ==========================================

export interface ExternalVehicleSnapshot {
  plateOrReference: string;
  vehicleType: number;
  customerName: string;
  customerPhone: string;
  notes?: string | null;
}

export interface WorkOrder {
  id: string;
  workOrderNumber: string;
  serviceSubjectType: ServiceSubjectType;
  vehicleId: string | null;
  vehicleAssetNumber: string | null;
  vehicleIssueId: string | null;
  maintenanceLocationId: string;
  maintenanceLocationNameAr: string;
  maintenanceType: MaintenanceType;
  status: WorkOrderStatus;
  openedAtUtc: string;
  scheduledAtUtc: string | null;
  startedAtUtc: string | null;
  completedAtUtc: string | null;
  odometerAtOpen: number | null;
  odometerAtCompletion: number | null;
  riderVehicleAssignmentId: string | null;
  attributedRiderProfileId: string | null;
  estimatedCost: number;
  actualMaterialCost: number;
  actualLaborCost: number;
  actualOtherCost: number;
  actualTotalCost: number;
  diagnosis?: string | null;
  externalVehicle: ExternalVehicleSnapshot | null;
  notes: string | null;
  rowVersion: string;
}

export interface CreateCompanyWorkOrderRequest {
  serviceSubjectType: 1;
  vehicleId: string;
  vehicleIssueId?: string | null;
  maintenanceLocationId: string;
  maintenanceType: MaintenanceType;
  openedAtUtc: string;
  scheduledAtUtc?: string | null;
  odometerAtOpen?: number | null;
  estimatedCost?: number;
  diagnosis?: string | null;
  notes?: string | null;
  externalVehicle: null;
}

export interface CreateExternalWorkOrderRequest {
  serviceSubjectType: 2;
  vehicleId: null;
  vehicleIssueId: null;
  maintenanceLocationId: string;
  maintenanceType: MaintenanceType;
  openedAtUtc: string;
  scheduledAtUtc?: string | null;
  odometerAtOpen?: number | null;
  estimatedCost?: number;
  diagnosis?: string | null;
  notes?: string | null;
  externalVehicle: ExternalVehicleSnapshot;
}

export interface WorkOrderStateActionRequest {
  occurredAtUtc: string;
  workPerformed?: string;
  qualityCheckNotes?: string;
  notes?: string | null;
  rowVersion: string;
}

export interface MaterialCostAllocation {
  stockCostLayerId: string;
  quantity: number;
  unitCost: number;
  cost: number;
}

export interface MaterialUsage {
  id: string;
  maintenanceWorkOrderId: string;
  inventoryItemId: string;
  sku: string;
  itemNameAr: string;
  inventoryLocationId: string;
  usageType: MaterialUsageType;
  direction: MaterialUsageDirection;
  quantity: number;
  unitOfMeasure: UnitOfMeasure;
  totalCost: number;
  vehicleId: string | null;
  riderVehicleAssignmentId: string | null;
  riderProfileId: string | null;
  attributionStatus: number | null;
  usedAtUtc: string;
  reversalOfUsageId: string | null;
  costAllocations: MaterialCostAllocation[];
}

export interface RecordMaterialUsageRequest {
  inventoryItemId: string;
  inventoryLocationId: string;
  quantity: number;
  usageType: MaterialUsageType;
  usedAtUtc: string;
  notes?: string | null;
}

// ==========================================
// Oil Reminders & Operations
// ==========================================

export interface OilReminder {
  vehicleId: string;
  assetNumber: string;
  vehicleType: number; // 1 = Motorcycle, 2 = Car
  currentOdometer: number;
  lastCompletedAtUtc: string | null;
  lastOilChangeOdometer: number | null;
  reminderFromOdometer: number;
  maximumDueOdometer: number;
  distanceSinceLastChange: number;
  status: OilReminderStatus;
}

export interface MaintenancePlan {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  vehicleModelId: string | null;
  vehicleType: number;
  triggerType: number;
  intervalDays: number | null;
  intervalKilometers: number | null;
  reminderAfterKilometers: number | null;
  maximumAfterKilometers: number | null;
  alertDaysBefore: number | null;
  alertKilometersBefore: number | null;
  inventoryItemId: string | null;
  defaultOilQuantityLiters: number | null;
  checklistJson: string | null;
  rowVersion: string;
}

export interface CreateMaintenancePlanRequest {
  code: string;
  nameAr: string;
  nameEn: string;
  vehicleModelId?: string | null;
  vehicleType: number;
  triggerType: number;
  intervalDays?: number | null;
  intervalKilometers?: number | null;
  reminderAfterKilometers?: number | null;
  maximumAfterKilometers?: number | null;
  alertDaysBefore?: number | null;
  alertKilometersBefore?: number | null;
  inventoryItemId?: string | null;
  defaultOilQuantityLiters?: number | null;
  checklistJson?: string | null;
  rowVersion: null;
}

export interface UpdateMaintenancePlanRequest {
  code: string;
  nameAr: string;
  nameEn: string;
  vehicleModelId?: string | null;
  vehicleType: number;
  triggerType: number;
  intervalDays?: number | null;
  intervalKilometers?: number | null;
  reminderAfterKilometers?: number | null;
  maximumAfterKilometers?: number | null;
  alertDaysBefore?: number | null;
  alertKilometersBefore?: number | null;
  inventoryItemId?: string | null;
  defaultOilQuantityLiters?: number | null;
  checklistJson?: string | null;
  rowVersion: string;
}

export interface CompleteOilChangeRequest {
  performedAtUtc: string;
  odometerAtChange: number;
  inventoryLocationId: string;
  oilInventoryItemId: string;
  nextOilBarrelId?: string | null;
  oilFilterChanged: boolean;
  oilFilterInventoryItemId?: string | null;
  configuredOilQuantityLiters?: number | null;
  laborCost: number;
  otherCost: number;
  notes?: string | null;
  workOrderRowVersion: string;
}

export interface CompleteOilChangeResult {
  id: string;
  maintenanceWorkOrderId: string;
  performedAtUtc: string;
  odometerAtChange: number;
  vehicleType: number;
  oilQuantityLiters: number;
  oilCost: number;
  oilFilterChanged: boolean;
  oilFilterCost: number;
  laborCost: number;
  otherCost: number;
  totalCost: number;
  vehicleId: string;
  riderProfileId: string | null;
}

// ==========================================
// Workshop Financials & Profit Report
// ==========================================

export interface PartSaleRequest {
  inventoryItemId: string;
  inventoryLocationId: string;
  quantity: number;
  sellingUnitPriceBeforeTax: number;
  discountAmount: number;
  taxAmount: number;
  occurredAtUtc: string;
  notes?: string | null;
}

export interface PartSaleResponse {
  id: string;
  maintenanceWorkOrderId: string;
  inventoryItemId: string;
  quantity: number;
  partsRevenueBeforeTax: number;
  taxAmount: number;
  customerLineTotal: number;
  maintenanceMaterialUsageId: string;
}

export interface CustomerLaborChargeRequest {
  amountBeforeTax: number;
  taxAmount: number;
  occurredAtUtc: string;
  description: string;
}

export interface MechanicLaborPaymentRequest {
  mechanicEmployeeId?: string | null;
  externalMechanicName?: string | null;
  amount: number;
  paidAtUtc: string;
  description: string;
}

export interface FinancialEntryResponse {
  id: string;
  maintenanceWorkOrderId: string;
  entryType: number;
  sourceType: number;
  amountBeforeTax: number;
  taxAmount: number;
  totalAmount: number;
  occurredAtUtc: string;
  description: string;
  mechanicEmployeeId: string | null;
  externalMechanicName: string | null;
}

export interface CustomerPaymentRequest {
  amount: number;
  paymentMethod: PaymentMethod;
  paidAtUtc: string;
  reference: string;
}

export interface CustomerPaymentResponse {
  id: string;
  maintenanceWorkOrderId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paidAtUtc: string;
  reference: string;
}

export interface ExternalProfitWorkOrder {
  maintenanceWorkOrderId: string;
  workOrderNumber: string;
  externalVehicleReference: string;
  partsRevenueBeforeTax: number;
  customerLaborRevenueBeforeTax: number;
  otherIncomeBeforeTax: number;
  fifoInventoryCost: number;
  mechanicLaborCost: number;
  otherExpense: number;
  taxCollected: number;
  customerInvoiceTotal: number;
  amountPaid: number;
  outstandingAmount: number;
  paymentStatus: ExternalPaymentStatus;
  partsGrossProfit: number;
  laborProfit: number;
  netProfitBeforeTax: number;
}

export interface ExternalProfitReport {
  maintenanceLocationId: string;
  from: string;
  to: string;
  totalIncomeBeforeTax: number;
  totalExpense: number;
  taxCollected: number;
  customerInvoiceTotal: number;
  amountPaid: number;
  netProfitBeforeTax: number;
  workOrders: ExternalProfitWorkOrder[];
}
