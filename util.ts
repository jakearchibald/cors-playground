/**
 * Get own property `prop` from `obj`.
 */
export const getOwn = <T, P extends keyof T>(
  obj: T,
  prop: P,
): T[P] | undefined =>
  Object.prototype.hasOwnProperty.call(obj, prop) ? obj[prop] : undefined;
