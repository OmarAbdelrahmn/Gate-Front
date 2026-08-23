export type Employee = {
  id: string;
  iqamaNo: string | null;
  fullNameAr: string;
  fullNameEn: string | null;
  nationality: string | null;
  primaryPhone: string | null;
  isEmployee: boolean;
  engagementType: "SponsoredInternal" | "OutsideRider";
  status: string;
  workingForMeAs: string | null;
  residencyProfession: string | null;
  sponsorId: string | null;
  sponsorNameAr: string | null;
  riderProfileId: string | null;
  rowVersion: string;
  employeeNumber?: string;
  relationshipType?: string | null;
  nationalityCountryCode?: string | null;
  operatingCityAr?: string | null;
  operationalWorkTypeAr?: string | null;
  jobTitleAr?: string | null;
  hireDate?: string | null;
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
  operationalNotes: string | null;
  rowVersion?: string | null;
  status?: string;
  riderStartDate?: string | null;
  riderEndDate?: string | null;
  preferredCityId?: string | null;
};
export type EmployeeUpsertRequest = Omit<
  EmployeeDetails["employee"],
  "id" | "rowVersion" | "sponsorNameAr" | "riderProfileId"
> & {
  rider: RiderInput | null;
  rowVersion: string | null;
} & LegacyEmployeeFields;
export type LegacyEmployeeFields = {
  employeeNumber?: string;
  nationalityCountryCode?: string | null;
  relationshipType?: string;
  sponsoredDetails?: unknown;
  outsideRiderDetails?: unknown;
};
// Transitional alias while employee forms are migrated to the new workforce contract.
export type CreateEmployeeRequest = any;
export type UpdateEmployeeRequest = any;
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
