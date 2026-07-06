/**
 * Max character lengths matching DB column definitions.
 * Used in both Zod schemas (.max) and HTML maxLength props.
 */
export const FL = {
  name: 255,
  nameUom: 100,       // UOM, Dimension, BreakableUnit, BillableUnit
  nameCpn: 500,       // CommonProductName
  code: 50,
  codeUom: 20,        // UOM module codes
  shortCode: 50,
  phone: 20,
  unit: 50,
  email: 255,
  username: 100,
  fullName: 255,
  displayName: 255,
  description: 2000,  // Text columns — soft limit for UX
  synonyms: 2000,
  freeText: 255,
  price: 20,
} as const
