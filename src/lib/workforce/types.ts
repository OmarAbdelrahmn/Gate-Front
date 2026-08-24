export type Employee = {
  id: string;
  iqamaNo: string | null;
  fullNameAr: string;
  fullNameEn: string | null;
  nationality: string | null;
  birthDate?: string | null;
  gender?: string | null;
  primaryPhone: string | null;
  secondaryPhone?: string | null;
  email?: string | null;
  isEmployee: boolean;
  engagementType: "SponsoredInternal" | "OutsideRider" | string;
  status: string;
  hireDate?: string | null;
  workingForMeAs?: string | null;
  residencyProfession?: string | null;
  sponsorId?: string | null;
  sponsorNameAr?: string | null;
  sponsor?: {
    id: string;
    nameAr?: string | null;
    nameEn?: string | null;
  } | null;
  operationalWorkType?: {
    id: string;
    code?: string | null;
    nameAr?: string | null;
    nameEn?: string | null;
  } | null;
  operatingCity?: {
    id: string;
    nameAr?: string | null;
    nameEn?: string | null;
  } | null;
  rider?: {
    id: string;
    employeeId?: string | null;
    tShirtSize?: string | null;
    operationalNotes?: string | null;
    rowVersion?: string | null;
  } | null;
  riderProfileId?: string | null;
  rowVersion: string;
  employeeNumber?: string;
  relationshipType?: string | null;
  nationalityCountryCode?: string | null;
  operatingCityAr?: string | null;
  operationalWorkTypeAr?: string | null;
  jobTitleAr?: string | null;
};
export type Period = {
  id: string;
  value: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  reason: string | null;
  changedByUserId: string;
};
export type OperationalAssignment = {
  id: string;
  jobTitleId: string;
  jobTitleAr: string;
  operationalWorkTypeId: string;
  operationalWorkTypeAr: string;
  operatingCityId: string;
  operatingCityAr: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  reason: string | null;
};
export type Rider = {
  id: string;
  employeeId: string;
  iqamaNo: string | null;
  fullNameAr: string;
  fullNameEn: string | null;
  engagementType: string;
  status: string;
  tShirtSize: string | null;
  operationalNotes: string | null;
  rowVersion: string;
  preferredCityAr?: string | null;
  riderStartDate?: string | null;
  riderEndDate?: string | null;
};
export type WorkHistory = {
  id: string;
  changeType: string;
  oldValue: string | null;
  newValue: string | null;
  effectiveDate: string;
  reason: string | null;
  changedByUserId: string;
  createdAtUtc: string;
};
export type EmployeeDetails = {
  employee: Employee & {
    birthDate: string | null;
    gender: string | null;
    secondaryPhone: string | null;
    email: string | null;
    profilePhotoDocumentId: string | null;
    maritalStatus: string | null;
    emergencyContactName: string | null;
    emergencyContactRelationship: string | null;
    emergencyContactPhone: string | null;
    statusReason: string | null;
    hireDate: string | null;
    operationalWorkTypeId: string | null;
    operatingCityId: string | null;
    contractStartDate: string | null;
    contractEndDate: string | null;
    probationEndDate: string | null;
    terminationDate: string | null;
    alternateContactName: string | null;
    alternateContactPhone: string | null;
    notes: string | null;
  };
  rider: Rider | null;
  workHistory: WorkHistory[];
  statusHistory?: Period[];
  relationshipHistory?: Period[];
  operationalAssignmentHistory?: OperationalAssignment[];
  sponsoredDetails?: unknown;
  outsideRiderDetails?: unknown;
};
export type RiderInput = {
  tShirtSize?: string | null;
  operationalNotes?: string | null;
  rowVersion?: string | null;
  status?: string;
  riderStartDate?: string | null;
  riderEndDate?: string | null;
  preferredCityId?: string | null;
};

export type EmployeeUpsertPayload = {
  iqamaNo: string | null;
  residencyProfession: string | null;
  workingForMeAs: string | null;
  fullNameAr: string;
  fullNameEn: string | null;
  nationality: string | null;
  birthDate: string | null;
  gender: string | null;
  primaryPhone: string | null;
  secondaryPhone: string | null;
  email: string | null;
  profilePhotoDocumentId: string | null;
  maritalStatus: string | null;
  emergencyContactName: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactPhone: string | null;
  isEmployee: boolean;
  engagementType: "SponsoredInternal" | "OutsideRider" | string;
  status: string;
  statusReason: string | null;
  hireDate: string | null;
  operationalWorkTypeId: string | null;
  operatingCityId: string | null;
  sponsorId: string | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  probationEndDate: string | null;
  terminationDate: string | null;
  alternateContactName: string | null;
  alternateContactPhone: string | null;
  notes: string | null;
  rider: RiderInput | null;
  rowVersion: string | null;
};

export type CreateEmployeeRequest = EmployeeUpsertPayload;
export type UpdateEmployeeRequest = EmployeeUpsertPayload & { rowVersion: string };

export type UpdateRiderProfileRequest = {
  tShirtSize?: string | null;
  operationalNotes?: string | null;
  rowVersion: string;
};

export type ChangeEmployeeStatusRequest = {
  status: string;
  effectiveDate: string;
  reason: string;
};

export type RoleTransitionRequest = {
  isEmployee: boolean;
  effectiveDate: string;
  reason: string;
  rider: RiderInput | null;
};

