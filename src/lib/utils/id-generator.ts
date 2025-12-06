// src/lib/utils/id-generator.ts
export function generateIncidentId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `inc_${timestamp}_${random}`;
}

export function generateUserId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `usr_${timestamp}_${random}`;
}

export function generateResourceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `res_${timestamp}_${random}`;
}