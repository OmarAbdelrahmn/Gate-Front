import type { AuthenticationTokenResponse } from "./types";
const STORAGE_KEY="future-gateway.auth";
export function readAuth():AuthenticationTokenResponse|null { if(typeof window==="undefined")return null; try{const value=window.localStorage.getItem(STORAGE_KEY);return value?JSON.parse(value):null;}catch{return null;} }
export function writeAuth(auth:AuthenticationTokenResponse){if(typeof window!=="undefined")window.localStorage.setItem(STORAGE_KEY,JSON.stringify(auth));}
export function clearAuth(){if(typeof window!=="undefined"){window.localStorage.removeItem(STORAGE_KEY);window.dispatchEvent(new Event("future-gateway:auth-cleared"));}}
export function isAccessTokenExpired(auth:AuthenticationTokenResponse,leewayMs=30000){return Date.parse(auth.accessTokenExpiresAtUtc)-leewayMs<=Date.now();}
