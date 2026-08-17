/**
 * Generates a unique, human-readable ticket ID, e.g. WHTSIPA-TKT-20260816-48213.
 * Shared across every live-chat entry point (Threats/Tools, Contact, Report)
 * so they all follow the exact same format instead of each defining their own.
 */
export function genTicketId() {
  const d = new Date()
  const dp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `WHTSIPA-TKT-${dp}-${Math.floor(10000 + Math.random() * 90000)}`
}
