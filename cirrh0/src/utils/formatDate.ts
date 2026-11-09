const formatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

// e.g. "Tue, Nov 10, 2026, 3:45 PM" in the viewer's locale. Returns "" for missing or invalid dates.
export const formatDateTime = (value?: string | number | Date | null): string => {
  if (value === undefined || value === null || value === '') return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : formatter.format(date)
}

const dateOnly = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

// e.g. "10 Nov 2026" in the viewer's locale. Returns "" for missing or invalid dates.
export const formatDate = (value?: string | number | Date | null): string => {
  if (value === undefined || value === null || value === '') return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : dateOnly.format(date)
}
