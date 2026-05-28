import { format, toZonedTime } from 'date-fns-tz'

const AU_TIMEZONE = 'Australia/Sydney'

/**
 * Format a date in AEST/AEDT
 */
export const formatAEST = (date: Date | string | number, formatStr: string = 'yyyy-MM-dd HH:mm:ss XXX'): string => {
  const d = new Date(date)
  const zonedDate = toZonedTime(d, AU_TIMEZONE)
  return format(zonedDate, formatStr, { timeZone: AU_TIMEZONE })
}

/**
 * Get the current time in AU timezone
 */
export const nowAEST = (): Date => {
  return toZonedTime(new Date(), AU_TIMEZONE)
}
