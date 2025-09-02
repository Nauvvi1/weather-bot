import { Bot } from "grammy";
import { prisma } from "./db";
import { config } from "./config";
import { getCurrentWeather, getForecast } from "./services/openweather";
import { weatherEmoji, formatCurrent } from "./utils/format";

export async function sendWeatherToUser(user: any) {
  if (!user.lat || !user.lon) return;
  const bot = new Bot(config.telegramToken);
  const lang = user.lang || "ru";
  const units = user.units || "metric";

  const current = await getCurrentWeather({
    lat: user.lat, lon: user.lon, units, lang, apiKey: config.openWeatherKey,
  });

  const todayTemps = await deriveTodayMinMax(user, units, lang);

  const w = current.weather?.[0];
  const em = weatherEmoji(w?.id || 800);
  const fmt = formatCurrent({
    city: user.cityName || "—",
    temp: current.main.temp,
    feels: current.main.feels_like,
    wind: current.wind.speed,
    humidity: current.main.humidity,
    pressure: current.main.pressure,
    desc: `${em} ${w?.description || ""}`.trim(),
    units, lang,
    todayMax: todayTemps.max, todayMin: todayTemps.min,
  });

  const text = `${user.cityName || "—"} • Сейчас\n${fmt.line1}\n${fmt.line2}\n${fmt.today}`;
  await bot.api.sendMessage(user.tgId, text);
}

async function deriveTodayMinMax(user: any, units: "metric"|"imperial", lang: string) {
  try {
    const fc = await getForecast({ lat: user.lat, lon: user.lon, units, lang, apiKey: config.openWeatherKey });
    if (!fc?.list?.length || !user.tz) return { min: undefined, max: undefined };
    const tz = user.tz;
    const today = new Date().toLocaleDateString("en-CA", { timeZone: tz });
    let min: number|undefined, max: number|undefined;
    for (const item of fc.list) {
      const dt = new Date(item.dt * 1000).toLocaleDateString("en-CA", { timeZone: tz });
      if (dt === today) {
        const t = item.main?.temp;
        if (typeof t === "number") {
          min = (min==null) ? t : Math.min(min, t);
          max = (max==null) ? t : Math.max(max, t);
        }
      }
    }
    return { min, max };
  } catch {
    return { min: undefined, max: undefined };
  }
}