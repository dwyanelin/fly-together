import dayjs from 'dayjs';

/**
 * Calculate dates relative to today
 * @param addDays The number of days to add from today
 * @returns Date string formatted as YYYY-MM-DD
 */
export function getRelativeDate(addDays: number): string {
  return dayjs().add(addDays, 'day').format('YYYY-MM-DD');
}
