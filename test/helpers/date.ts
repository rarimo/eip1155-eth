export function encodeDate(dateStr?: string): bigint {
  // If no date is given, return the zero-date encoding:
  // "0x303030303030" corresponds to the ASCII string "000000".
  if (!dateStr) {
    return BigInt("0x303030303030");
  }

  // Ensure the provided date string is 6 characters long (e.g. "YYMMDD").
  if (dateStr.length !== 6) {
    throw new Error("Date string must be exactly 6 characters long (e.g., 'YYMMDD' or '000000').");
  }

  // Convert each character to its ASCII hex representation.
  let hexValue = "0x";
  for (let i = 0; i < dateStr.length; i++) {
    const charCode = dateStr.charCodeAt(i);
    hexValue += charCode.toString(16).padStart(2, "0");
  }

  return BigInt(hexValue);
}
