import { Bot, GrammyError, HttpError, InlineKeyboard } from "grammy";
import { run } from "@grammyjs/runner";
import { config, assertConfig } from "./config";
import { prisma } from "./db";
import { logger } from "./logger";
import { t } from "./locales";
import { directGeocode, reverseGeocode } from "./services/geocoding";
import tzLookup from "tz-lookup";
import { getCurrentWeather, getForecast } from "./services/openweather";
import { formatCurrent, weatherEmoji } from "./utils/format";
import { startScheduler } from "./scheduler";

assertConfig();
const bot = new Bot(config.telegramToken);

bot.use(async (ctx, next) => {
  const tgId = String(ctx.from?.id || "");
  if (!tgId) return next();
  let user = await prisma.user.findUnique({ where: { tgId } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        tgId,
        lang: (ctx.from?.language_code?.startsWith("ru") ? "ru" : config.defaultLanguage),
        units: config.defaultUnits,
      }
    });
  }
  (ctx as any).user = user;
  await next();
});

bot.api.setMyCommands([
  { command: "start", description: "Start / Начало" },
  { command: "setcity", description: "Set city / Задать город" },
  { command: "weather", description: "Current weather / Погода сейчас" },
  { command: "forecast", description: "Forecast / Прогноз" },
  { command: "units", description: "Metric/Imperial" },
  { command: "subscribe", description: "Daily summary / Ежедневная сводка" },
  { command: "unsubscribe", description: "Disable summary / Отключить сводку" },
  { command: "help", description: "Help / Помощь" },
]);

bot.command("start", async (ctx) => {
  const user = (ctx as any).user;
  const lang = user.lang;
  const kb = {
    reply_markup: {
      keyboard: [[{ text: "📍 Отправить геолокацию", request_location: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    }
  };
  await ctx.reply(t(lang, "welcome"), kb);
});

bot.command("help", async (ctx) => {
  const user = (ctx as any).user;
  await ctx.reply(t(user.lang, "help"));
});

bot.on("message:location", async (ctx) => {
  const user = (ctx as any).user;
  const lang = user.lang;
  const loc = (ctx.message as any).location;
  const lat = loc.latitude, lon = loc.longitude;
  try {
    const r = await reverseGeocode(lat, lon, config.openWeatherKey);
    const city = r?.name || `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
    let tz: string | null = null;
    try { tz = tzLookup(lat, lon) as string; } catch { tz = null; }
    await prisma.user.update({ where: { id: user.id }, data: { cityName: city, lat, lon, tz } });
    await ctx.reply(t(lang, "saved_city", { city, tz: tz || "—" }));
  } catch (e) {
    await ctx.reply(t(lang, "not_found"));
  }
});

const waitingForCity = new Map<string, boolean>();
bot.command("setcity", async (ctx) => {
  const user = (ctx as any).user;
  const lang = user.lang;
  const q = ctx.match?.trim();

  if (q) {
    return handleSetCity(ctx, q);
  }

  waitingForCity.set(user.tgId, true);
  await ctx.reply(t(lang, "ask_city"));
});

async function handleSetCity(ctx: any, q: string) {
  const user = ctx.user;
  const lang = user.lang;

  try {
    const results = await directGeocode(q, config.openWeatherKey);
    if (!results?.length) {
      await ctx.reply(t(lang, "not_found"));
      return;
    }
    const best = results[0];
    let tz: string | null = null;
    try { tz = tzLookup(best.lat, best.lon) as string; } catch { tz = null; }
    const name = [best.name, best.state, best.country].filter(Boolean).join(", ");
    await prisma.user.update({
      where: { id: user.id },
      data: { cityName: name, lat: best.lat, lon: best.lon, tz },
    });
    await ctx.reply(t(lang, "saved_city", { city: name, tz: tz || "—" }));
  } catch (e) {
    await ctx.reply(t(lang, "not_found"));
  }
}

bot.command("weather", async (ctx) => {
  const user = (ctx as any).user;
  const lang = user.lang as "ru" | "en";
  const units = user.units as "metric" | "imperial";
  if (!user.lat || !user.lon) {
    await ctx.reply(t(lang, "need_city_first"));
    return;
  }
  try {
    const current = await getCurrentWeather({
      lat: user.lat, lon: user.lon, units, lang, apiKey: config.openWeatherKey
    });

    const fc = await getForecast({ lat: user.lat, lon: user.lon, units, lang, apiKey: config.openWeatherKey });
    const tz = user.tz || "UTC";
    const today = new Date().toLocaleDateString("en-CA", { timeZone: tz });
    let min: number | undefined, max: number | undefined;
    if (fc?.list?.length) {
      for (const i of fc.list) {
        const dt = new Date(i.dt * 1000).toLocaleDateString("en-CA", { timeZone: tz });
        if (dt === today) {
          const t = i.main?.temp;
          if (typeof t === "number") {
            min = (min == null) ? t : Math.min(min, t);
            max = (max == null) ? t : Math.max(max, t);
          }
        }
      }
    }

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
      units, lang, todayMax: max, todayMin: min,
    });
    const text = `${user.cityName || "—"} • Сейчас\n${fmt.line1}\n${fmt.line2}\n${fmt.today}`;
    await ctx.reply(text, { reply_markup: new InlineKeyboard().text("🔮 Forecast", "fc12") });
  } catch (e) {
    await ctx.reply("API error. Try later.");
  }
});

bot.callbackQuery("fc12", async (ctx) => {
  const user = (ctx as any).user;
  const lang = user.lang as "ru" | "en";
  const units = user.units as "metric" | "imperial";
  if (!user.lat || !user.lon) return ctx.answerCallbackQuery();
  const fc = await getForecast({ lat: user.lat, lon: user.lon, units, lang, apiKey: config.openWeatherKey });
  const list = (fc?.list || []).slice(0, 4);
  const unitTemp = units === "metric" ? "°C" : "°F";
  let lines: string[] = [];
  for (const i of list) {
    const em = weatherEmoji(i.weather?.[0]?.id || 800);
    const time = new Date(i.dt * 1000).toLocaleTimeString(user.lang === "ru" ? "ru-RU" : "en-US", { hour: "2-digit", minute: "2-digit", timeZone: user.tz || "UTC" });
    lines.push(`${time}  ${em}  ${Math.round(i.main?.temp)}${unitTemp}, ${i.weather?.[0]?.description || ""}`);
  }
  const title = user.lang === "ru" ? `${user.cityName} • Ближайшие 12 часов` : `${user.cityName} • Next 12 hours`;
  await ctx.editMessageText(`${title}\n` + lines.join("\n"));
  await ctx.answerCallbackQuery();
});

bot.command("units", async (ctx) => {
  const user = (ctx as any).user;
  const next = user.units === "metric" ? "imperial" : "metric";
  await prisma.user.update({ where: { id: user.id }, data: { units: next } });
  const msg = user.lang === "ru" ? `Единицы изменены на ${next}` : `Units updated to ${next}`;
  await ctx.reply(msg);
});

const waitingForTime = new Map<string, boolean>();
bot.command("subscribe", async (ctx) => {
  const user = (ctx as any).user;
  const lang = user.lang as "ru" | "en";
  if (!user.lat || !user.lon) return ctx.reply(t(lang, "need_city_first"));
  if (!user.tz) return ctx.reply(t(lang, "no_tz"));
  const raw = ctx.match?.trim();
  if (raw) {
    return handleSubscribeTime(ctx, raw);
  }
  waitingForTime.set(user.tgId, true);
  await ctx.reply(t(lang, "send_time"));
});

bot.on("message:text", async (ctx, next) => {
  const user = (ctx as any).user;

  if (waitingForCity.get(user.tgId)) {
    const q = ctx.message.text.trim();
    await handleSetCity(ctx, q);
    waitingForCity.delete(user.tgId);
    return;
  }

  if (waitingForTime.get(user.tgId)) {
    const text = ctx.message.text.trim();
    await handleSubscribeTime(ctx, text);
    waitingForTime.delete(user.tgId);
    return;
  }
  return next();
});

async function handleSubscribeTime(ctx: any, raw: string) {
  const user = ctx.user;
  const lang = user.lang as "ru" | "en";

  const m = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!m) {
    await ctx.reply(t(lang, "invalid_time"));
    return;
  }

  const hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { subscribed: true, subHour: hour, subMinute: minute, lastDailySentDate: null },
  });

  await ctx.reply(t(lang, "subs_on", { time: `${m[1].padStart(2, "0")}:${m[2]}` }));
}

bot.command("unsubscribe", async (ctx) => {
  const user = (ctx as any).user;
  await prisma.user.update({ where: { id: user.id }, data: { subscribed: false } });
  const msg = user.lang === "ru" ? "Ежедневная сводка отключена." : "Daily summary disabled.";
  await ctx.reply(msg);
});

bot.catch((err) => {
  const ctx = err.ctx;
  logger.error({ update: ctx.update }, "Update caused error");
  if (err.error instanceof GrammyError) {
    logger.error({ error: err.error.description }, "Grammy error");
  } else if (err.error instanceof HttpError) {
    logger.error({ error: err.error }, "HTTP error");
  } else {
    logger.error({ error: err.error }, "Unknown error");
  }
});

async function main() {
  startScheduler();
  run(bot);
  logger.info("WeatherMe bot is running");
}
main().catch(e => {
  logger.error(e);
  process.exit(1);
});