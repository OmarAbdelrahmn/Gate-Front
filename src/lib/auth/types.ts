export type UserRole = "Admin" | "Member" | "Accountant" | string;
export type AuthUser = { id:string; employeeId:string|null; userName:string; email:string; displayNameAr:string; displayNameEn:string; preferredLocale:string; requiresPasswordChange:boolean; roles:UserRole[]; profileImageUrl?: string | null };
export type AuthenticationTokenResponse = { accessToken:string; tokenType:"Bearer"|string; accessTokenExpiresAtUtc:string; refreshToken:string; refreshTokenExpiresAtUtc:string; sessionId:string; user:AuthUser };
export type LoginRequest = { login:string; password:string; deviceLabel?:string };
export type ChangePasswordRequest = { currentPassword:string; newPassword:string };
export type AuthSession = { id:string; deviceLabel:string; lastIpAddress:string; createdAtUtc:string; lastUsedAtUtc:string; idleExpiresAtUtc:string; absoluteExpiresAtUtc:string; revokedAtUtc:string|null; isCurrent:boolean };
export type AuthApiError = Error & { status:number; details?:unknown };
