import axios from "axios";

const GEO_BASE = "https://api.openweathermap.org/geo/1.0";

export async function directGeocode(q: string, apiKey: string) {
  const url = `${GEO_BASE}/direct`;
  const { data } = await axios.get(url, { params: { q, appid: apiKey, limit: 5 } });
  return data as Array<{ name: string; lat: number; lon: number; country?: string; state?: string; }>;
}

export async function reverseGeocode(lat: number, lon: number, apiKey: string) {
  const url = `${GEO_BASE}/reverse`;
  const { data } = await axios.get(url, { params: { lat, lon, appid: apiKey, limit: 1 } });
  return (data as any[])[0];
}