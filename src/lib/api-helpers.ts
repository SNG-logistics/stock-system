export async function getSalesReport(startDate: string, endDate: string) {
  const res = await fetch(`/api/reports/sales?startDate=${startDate}&endDate=${endDate}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch sales report: ${res.status} ${res.statusText}`);
  }
  return res.json();
}