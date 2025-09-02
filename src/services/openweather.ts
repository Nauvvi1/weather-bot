import axios from "axios";

const API_BASE = "https://api.openweathermap.org/data/2.5";

export type Units = "metric" | "imperial";

export async function getCurrentWeather(params: { lat: number; lon: number; units: Units; lang: string; apiKey: string; }) {
  const { lat, lon, units, lang, apiKey } = params;
  const url = `${API_BASE}/weather`;
  const { data } = await axios.get(url, { params: { lat, lon, units, lang, appid: apiKey } });
  return data;
}

export async function getForecast(params: { lat: number; lon: number; units: Units; lang: string; apiKey: string; }) {
  const { lat, lon, units, lang, apiKey } = params;
  const url = `${API_BASE}/forecast`; // 5 day / 3 hour forecast
  const { data } = await axios.get(url, { params: { lat, lon, units, lang, appid: apiKey } });
  return data;
}