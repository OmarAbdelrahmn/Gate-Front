import { authFetch } from "../auth/api";

export type HousingStatus = "Active" | "Inactive" | "Archived";
export type HousingPersonType = "Employee" | "Rider";

export interface AddressRequest {
  buildingNumber?: string | null;
  street?: string | null;
  district?: string | null;
  city?: string | null;
  postalCode?: string | null;
  additionalNumber?: string | null;
}

export interface CurrentOccupant {
  occupancyPeriodId: string;
  roomId: string;
  housingId: string;
  employeeId: string;
  riderProfileId: string | null;
  personType: HousingPersonType;
  iqamaNo?: string | null;
  employeeNameAr?: string;
  employeeNameEn?: string;
  effectiveFrom: string;
  moveInReason?: string | null;
  sourceReference?: string | null;
}

export interface Room {
  id: string;
  housingId: string;
  name: string;
  capacity: number;
  currentOccupancy: number;
  availableCapacity: number;
  rowVersion: string;
  occupants: CurrentOccupant[];
}

export interface Housing {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  cityId: string;
  cityAr?: string;
  address?: AddressRequest | null;
  latitude?: number | null;
  longitude?: number | null;
  totalCapacity: number;
  currentResidents: number;
  availableCapacity: number;
  contactPhone?: string | null;
  openedDate?: string | null;
  closedDate?: string | null;
  status: HousingStatus | string;
  statusReason?: string | null;
  notes?: string | null;
  rowVersion: string;
  isDeleted?: boolean;
  rooms?: Room[] | null;
}

export interface CreateHousingPayload {
  code: string;
  nameAr: string;
  nameEn: string;
  cityId: string;
  address?: AddressRequest | null;
  latitude?: number | null;
  longitude?: number | null;
  contactPhone?: string | null;
  openedDate?: string | null;
  closedDate?: string | null;
  status: HousingStatus | string;
  statusReason?: string | null;
  notes?: string | null;
  rowVersion?: string | null;
}

export interface UpdateHousingPayload extends Omit<CreateHousingPayload, "rowVersion"> {
  rowVersion: string;
}

export interface ArchiveHousingPayload {
  reason: string;
  rowVersion: string;
}

export interface HousingPeriod {
  id: string;
  housingId: string;
  roomId?: string | null;
  roomName?: string | null;
  employeeId: string;
  riderProfileId?: string | null;
  personType?: HousingPersonType;
  iqamaNo?: string | null;
  employeeNameAr: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  startReason?: string | null;
  endReason?: string | null;
  capacityOverrideUsed?: boolean;
  capacityOverrideReason?: string | null;
}

// Room Payloads
export interface CreateRoomPayload {
  name: string;
  capacity: number;
  rowVersion?: string | null;
}

export interface UpdateRoomPayload {
  name: string;
  capacity: number;
  rowVersion: string;
}

export interface ArchiveRoomPayload {
  reason: string;
  rowVersion: string;
}

export interface AssignEmployeeToRoomPayload {
  employeeId: string;
  effectiveFrom: string;
  moveInReason?: string | null;
  sourceReference?: string | null;
}

export interface AssignRiderToRoomPayload {
  riderProfileId: string;
  effectiveFrom: string;
  moveInReason?: string | null;
  sourceReference?: string | null;
}

export interface MoveOccupantPayload {
  destinationRoomId: string;
  effectiveFrom: string;
  reason: string;
}

export interface RemoveOccupantPayload {
  effectiveTo: string;
  reason: string;
}

// Supervisor Payloads
export interface AssignSupervisorPayload {
  employeeId: string;
  effectiveFrom: string;
  assignmentReason?: string | null;
}

export interface CloseSupervisorPayload {
  effectiveTo: string;
  reason: string;
}

// Compatibility Payloads (legacy routes)
export interface AssignResidentPayload {
  roomId?: string;
  employeeId: string;
  effectiveFrom: string;
  moveInReason?: string | null;
  sourceReference?: string | null;
  capacityOverrideUsed?: boolean;
  capacityOverrideReason?: string | null;
}

export interface CloseResidencePayload {
  effectiveTo: string;
  reason: string;
}

// Endpoint documentation DTO Type Aliases
export type HousingUpsertRequest = CreateHousingPayload;
export type ArchiveRequest = ArchiveHousingPayload;
export type AssignHousingResidentRequest = AssignResidentPayload;
export type ClosePeriodRequest = CloseResidencePayload;
export type AssignHousingSupervisorRequest = AssignSupervisorPayload;

// ==================== HOUSING API ====================

export const listHousing = async () => {
  try {
    const res = await authFetch<Housing[]>("/api/housing");
    return res;
  } catch (err: any) {
    console.error("=== API Error: GET /api/housing ===", err?.status, err?.message, err?.details);
    throw err;
  }
};

export const getHousing = (id: string) =>
  authFetch<Housing>(`/api/housing/${encodeURIComponent(id)}`);

export const createHousing = (payload: CreateHousingPayload) =>
  authFetch<Housing>("/api/housing", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateHousing = (id: string, payload: UpdateHousingPayload) =>
  authFetch<Housing>(`/api/housing/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const archiveHousing = (id: string, reason: string, rowVersion: string) =>
  authFetch<void>(`/api/housing/${encodeURIComponent(id)}/archive`, {
    method: "PATCH",
    body: JSON.stringify({ reason, rowVersion }),
  });

export const listResidents = (id: string, currentOnly = false) =>
  authFetch<HousingPeriod[]>(
    `/api/housing/${encodeURIComponent(id)}/residents?currentOnly=${currentOnly}`,
  );

export const assignResident = (id: string, payload: AssignResidentPayload) =>
  authFetch<HousingPeriod[]>(`/api/housing/${encodeURIComponent(id)}/residents`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const closeResidence = (
  periodId: string,
  effectiveTo: string,
  reason: string,
) =>
  authFetch<void>(
    `/api/housing/residence-periods/${encodeURIComponent(periodId)}/close`,
    {
      method: "POST",
      body: JSON.stringify({ effectiveTo, reason }),
    },
  );

export const listSupervisors = (id: string, currentOnly = false) =>
  authFetch<HousingPeriod[]>(
    `/api/housing/${encodeURIComponent(id)}/supervisors?currentOnly=${currentOnly}`,
  );

export const assignSupervisor = (id: string, payload: AssignSupervisorPayload) =>
  authFetch<HousingPeriod[]>(`/api/housing/${encodeURIComponent(id)}/supervisors`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const closeSupervisor = (
  periodId: string,
  effectiveTo: string,
  reason: string,
) =>
  authFetch<void>(
    `/api/housing/supervisor-periods/${encodeURIComponent(periodId)}/close`,
    {
      method: "POST",
      body: JSON.stringify({ effectiveTo, reason }),
    },
  );

// ==================== ROOMS & OCCUPANTS API ====================

export const listRooms = (housingId: string) =>
  authFetch<Room[]>(`/api/housing/${encodeURIComponent(housingId)}/rooms`);

export const createRoom = (housingId: string, payload: CreateRoomPayload) =>
  authFetch<Room>(`/api/housing/${encodeURIComponent(housingId)}/rooms`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getRoom = (roomId: string) =>
  authFetch<Room>(`/api/rooms/${encodeURIComponent(roomId)}`);

export const updateRoom = (roomId: string, payload: UpdateRoomPayload) =>
  authFetch<Room>(`/api/rooms/${encodeURIComponent(roomId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const archiveRoom = (roomId: string, reason: string, rowVersion: string) =>
  authFetch<void>(`/api/rooms/${encodeURIComponent(roomId)}`, {
    method: "DELETE",
    body: JSON.stringify({ reason, rowVersion }),
  });

export const assignEmployeeToRoom = (
  roomId: string,
  payload: AssignEmployeeToRoomPayload,
) =>
  authFetch<CurrentOccupant>(
    `/api/rooms/${encodeURIComponent(roomId)}/occupants/employees`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

export const assignRiderToRoom = (
  roomId: string,
  payload: AssignRiderToRoomPayload,
) =>
  authFetch<CurrentOccupant>(
    `/api/rooms/${encodeURIComponent(roomId)}/occupants/riders`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

export const moveOccupant = (
  occupancyPeriodId: string,
  payload: MoveOccupantPayload,
) =>
  authFetch<CurrentOccupant>(
    `/api/rooms/occupants/${encodeURIComponent(occupancyPeriodId)}/move`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

export const removeOccupant = (
  occupancyPeriodId: string,
  payload: RemoveOccupantPayload,
) =>
  authFetch<void>(
    `/api/rooms/occupants/${encodeURIComponent(occupancyPeriodId)}/remove`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

// ==================== HOUSING WAREHOUSE API ====================

export type WarehouseItemStatus = "Unused" | "Used" | "Damaged";

export interface HousingWarehouse {
  id: string;
  housingId: string;
  housingCode: string;
  housingNameAr: string;
  housingNameEn: string;
  nameAr: string;
  nameEn: string;
  isDefault: boolean;
  itemCount: number;
  totalQuantity: number;
  rowVersion: string;
}

export interface WarehouseItem {
  id: string;
  warehouseId: string;
  housingId: string;
  nameAr: string;
  totalQuantity: number;
  unusedQuantity: number;
  usedQuantity: number;
  damagedQuantity: number;
  notes: string | null;
  rowVersion: string;
}

export interface CreateWarehouseItemPayload {
  nameAr: string;
  quantity: number;
  status: WarehouseItemStatus;
  notes?: string | null;
}

export interface UpdateWarehouseItemPayload {
  nameAr: string;
  notes?: string | null;
  rowVersion: string;
}

export interface StatusTransferPayload {
  fromStatus: WarehouseItemStatus;
  toStatus: WarehouseItemStatus;
  quantity: number;
  rowVersion: string;
}

export interface CorrectQuantityPayload {
  quantity: number;
  rowVersion: string;
}

export interface DeleteWarehouseItemPayload {
  reason: string;
  rowVersion: string;
}

export const getHousingWarehouse = (housingId: string) =>
  authFetch<HousingWarehouse>(
    `/api/housing/${encodeURIComponent(housingId)}/warehouse`,
  );

export const listWarehouseItems = (
  housingId: string,
  search?: string,
  status?: WarehouseItemStatus,
) => {
  const params = new URLSearchParams();
  if (search?.trim()) params.set("search", search.trim());
  if (status) params.set("status", status);
  const qs = params.toString();
  return authFetch<WarehouseItem[]>(
    `/api/housing/${encodeURIComponent(housingId)}/warehouse/items${qs ? `?${qs}` : ""}`,
  );
};

export const getWarehouseItem = (housingId: string, itemId: string) =>
  authFetch<WarehouseItem>(
    `/api/housing/${encodeURIComponent(housingId)}/warehouse/items/${encodeURIComponent(itemId)}`,
  );

export const createWarehouseItem = (
  housingId: string,
  payload: CreateWarehouseItemPayload,
) =>
  authFetch<WarehouseItem>(
    `/api/housing/${encodeURIComponent(housingId)}/warehouse/items`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

export const updateWarehouseItem = (
  housingId: string,
  itemId: string,
  payload: UpdateWarehouseItemPayload,
) =>
  authFetch<WarehouseItem>(
    `/api/housing/${encodeURIComponent(housingId)}/warehouse/items/${encodeURIComponent(itemId)}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );

export const transferWarehouseItemStatus = (
  housingId: string,
  itemId: string,
  payload: StatusTransferPayload,
) =>
  authFetch<WarehouseItem>(
    `/api/housing/${encodeURIComponent(housingId)}/warehouse/items/${encodeURIComponent(itemId)}/status-transfers`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

export const correctWarehouseItemQuantity = (
  housingId: string,
  itemId: string,
  status: WarehouseItemStatus,
  payload: CorrectQuantityPayload,
) =>
  authFetch<WarehouseItem>(
    `/api/housing/${encodeURIComponent(housingId)}/warehouse/items/${encodeURIComponent(itemId)}/statuses/${encodeURIComponent(status)}/quantity`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );

export const deleteWarehouseItem = (
  housingId: string,
  itemId: string,
  payload: DeleteWarehouseItemPayload,
) =>
  authFetch<void>(
    `/api/housing/${encodeURIComponent(housingId)}/warehouse/items/${encodeURIComponent(itemId)}`,
    {
      method: "DELETE",
      body: JSON.stringify(payload),
    },
  );

