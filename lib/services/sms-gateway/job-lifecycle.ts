import mongoose from 'mongoose'

export function parseGatewayJobId(jobId: string): mongoose.Types.ObjectId | null {
  if (!mongoose.Types.ObjectId.isValid(jobId)) {
    return null
  }
  return new mongoose.Types.ObjectId(jobId)
}

export const TERMINAL_FALLBACK_JOB_STATUSES = ['sent', 'failed', 'cancelled'] as const

export function isTerminalFallbackJobStatus(status: string): boolean {
  return (TERMINAL_FALLBACK_JOB_STATUSES as readonly string[]).includes(status)
}
