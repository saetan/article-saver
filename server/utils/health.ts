export interface HealthStatus {
  ok: boolean
}

export function getHealthStatus(): HealthStatus {
  return { ok: true }
}
