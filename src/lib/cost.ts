export function getTotalCost(actual: Record<string, unknown> | null | undefined): number {
  if (!actual) return 0;

  if (actual.total_cost !== null && actual.total_cost !== undefined) {
    return Number(actual.total_cost);
  }

  return (
    Number(actual.labor_cost || 0) +
    Number(actual.energy_cost || 0) +
    Number(actual.room_service_cost || 0) +
    Number(actual.non_room_service_cost || 0)
  );
}
  