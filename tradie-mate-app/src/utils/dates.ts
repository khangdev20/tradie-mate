// src/utils/dates.ts
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const AU_TIMEZONE = 'Australia/Sydney'

export function formatAEST(date: Date, formatStr: string = 'dd/MM/yyyy HH:mm'): string {
  const zonedDate = toZonedTime(date, AU_TIMEZONE)
  return format(zonedDate, formatStr)
}
