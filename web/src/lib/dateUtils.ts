/**
 * Date utilities for Central Time (CST/CDT) handling.
 * All poker sessions are tracked in Central Time, regardless of server timezone.
 */

const CST_TIMEZONE = "America/Chicago";

/**
 * Gets the current date in Central Time as a YYYY-MM-DD string.
 * This is used when creating new sessions to ensure the date reflects
 * Central Time, not the server's local timezone.
 */
export function getCurrentCSTDate(): string {
  const now = new Date();

  // Format the current time as if it were in CST
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: CST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Failed to format current CST date");
  }

  return `${year}-${month}-${day}`;
}

/**
 * Formats a date string (YYYY-MM-DD) for display.
 * The date string is stored as YYYY-MM-DD (timezone-agnostic),
 * so we just need to format it nicely for display.
 */
export function formatCSTDate(date: string | null | undefined): string {
  if (!date) return "";

  // Parse the date components
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;

  // Format as MM/DD/YYYY (US format)
  return `${month}/${day}/${year}`;
}

/**
 * Parses a date string (YYYY-MM-DD) and returns a Date object.
 * Since dates are stored as YYYY-MM-DD strings (timezone-agnostic),
 * we create a Date object at midnight UTC to avoid timezone shifts.
 * This is safe for date comparisons since we're only comparing dates, not times.
 */
export function parseCSTDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
    throw new Error(`Invalid date string: ${dateString}`);
  }

  // Create a Date object at midnight UTC
  // This avoids timezone shifts when comparing dates
  return new Date(Date.UTC(year, month - 1, day));
}
