export function logGatewayJobAction(params: {
  route: string
  jobId?: string
  deviceName?: string
  statusBefore?: string | null
  statusAfter?: string | null
  responseCode: number
  message?: string
  extra?: Record<string, unknown>
}) {
  console.log(
    '[sms-gateway]',
    JSON.stringify({
      ...params,
      at: new Date().toISOString(),
    })
  )
}
