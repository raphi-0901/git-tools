import dayjs from "dayjs";

/**
 * Calculates the absolute difference in days between two dates.
 *
 * @param {Date | number} from - The start date or timestamp (in milliseconds).
 * @param {Date | number} [to] - The end date or timestamp (defaults to the current date/time).
 *
 * @returns {number} The absolute difference in days, including fractional days.
 *
 * @example
 * // Difference between two specific dates
 * const daysDiff = calculateAbsoluteDayDifference(new Date('2026-01-01'), new Date('2026-01-03'));
 * console.log(daysDiff); // 2
 *
 * // Difference from a past timestamp to now
 * const daysAgo = calculateAbsoluteDayDifference(Date.now() - 1000 * 60 * 60 * 24 * 5);
 * console.log(daysAgo); // ~5
 */
export function calculateAbsoluteDayDifference(from: Date | number, to: Date | number = new Date()) {
    return Math.abs(dayjs(from).diff(to, 'days', true));
}
