import { DateTime } from "luxon";

export function weatherEmoji(code: number): string {
  if (code >= 200 && code < 300) return "⛈️";
  if (code >= 300 && code < 400) return "🌦️";
  if (code >= 500 && code < 600) return "🌧️";
  if (code >= 600 && code < 700) return "❄️";
  if (code >= 700 && code < 800) return "🌫️";
  if (code === 800) return "☀️";
  if (code === 801) return "🌤️";
  if (code === 802) return "⛅";
  if (code === 803) return "🌥️";
  if (code === 804) return "☁️";
  return "🌡️";
}

export function formatCurrent(opts: {
  city: string;
  temp: number;
  feels: number;
  wind: number;
  humidity: number;
  pressure: number;
  desc: string;
  units: "metric" | "imperial";
  lang: "ru" | "en";
  todayMax?: number;
  todayMin?: number;
}) {
  const unitTemp = opts.units === "metric" ? "°C" : "°F";
  const unitWind = opts.units === "metric" ? "м/с" : "mph";
  const pressureText = opts.lang === "ru" ? "Давление" : "Pressure";
  const feelsText = opts.lang === "ru" ? "ощущается" : "feels like";
  const todayText = opts.lang === "ru" ? "На сегодня" : "Today";
  const windText = opts.lang === "ru" ? "💨" : "💨";
  const humText = opts.lang === "ru" ? "💧" : "💧";

  const line1 = `🌡️ ${Math.round(opts.temp)}${unitTemp} (${feelsText} ${Math.round(opts.feels)}${unitTemp})  |  ${windText} ${opts.wind} ${unitWind}  |  ${humText} ${opts.humidity}%`;
  const line2 = `${pressureText}: ${Math.round(opts.pressure)} гПа`;
  const today = `${todayText}: ${opts.desc}${(opts.todayMax != null && opts.todayMin != null) ? `, макс ${Math.round(opts.todayMax)}${unitTemp}, мин ${Math.round(opts.todayMin)}${unitTemp}` : ""}`;
  return { line1, line2, today };
}

export function toLocal(dtISO: number, tz: string) {
  return DateTime.fromMillis(dtISO * 1000).setZone(tz);
}