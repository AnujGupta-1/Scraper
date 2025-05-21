const API_BASE = "http://localhost:4000/api";

export async function fetchRaceList() {
  const resp = await fetch(`${API_BASE}/race-list`);
  return resp.json();
}
export async function fetchRaceDetails() {
  const resp = await fetch(`${API_BASE}/race-details`);
  return resp.json();
}
export async function fetchResults() {
  const resp = await fetch(`${API_BASE}/results`);
  return resp.json();
}
export async function fetchSchedulerStatus() {
  const resp = await fetch(`${API_BASE}/scheduler-status`);
  return resp.json();
}
