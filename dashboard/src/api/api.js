const API_BASE = "http://localhost:4000/api";

export async function fetchRaceList(date) {
  const resp = await fetch(`${API_BASE}/race-list?date=${date}`);
  return resp.json();
}
export async function fetchRaceDetails(date, file) {
  const resp = await fetch(`${API_BASE}/race-details?date=${date}&file=${file}`);
  return resp.json();
}

export async function fetchRaceFiles(date) {
  const resp = await fetch(`${API_BASE}/race-details-files?date=${date}`);
  return resp.json();
}

export async function fetchMergedRaceDetails(date) {
  const resp = await fetch(`${API_BASE}/race-details-merged?date=${date}`);
  return resp.json();
}

export async function fetchResults(date) {
  const resp = await fetch(`${API_BASE}/results?date=${date}`);
  return resp.json();
}
export async function fetchSchedulerStatus() {
  const resp = await fetch(`${API_BASE}/scheduler-status`);
  return resp.json();
}
