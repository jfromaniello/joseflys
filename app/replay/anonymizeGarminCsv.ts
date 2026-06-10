/**
 * `#airframe_info` attributes that identify a specific aircraft or device:
 * the registration / tail number and the unit's serial number. Everything else
 * in the header (product, software versions, hours) is generic and kept so the
 * log remains recognizably a G3X export.
 */
const SENSITIVE_AIRFRAME_FIELDS = ["aircraft_ident", "system_id"];

/**
 * Blanks the identifying `#airframe_info` attributes of a Garmin G3X CSV log
 * so the file can be shared without exposing the aircraft registration. Track
 * data rows are untouched, and content without those attributes is returned
 * unchanged, so the function is safe to call on any track and is idempotent.
 */
export function anonymizeGarminCsv(content: string): string {
  let result = content;
  for (const field of SENSITIVE_AIRFRAME_FIELDS) {
    // The attribute only ever appears once, on the leading metadata line.
    result = result.replace(new RegExp(`(${field}=")[^"]*(")`), "$1$2");
  }
  return result;
}
