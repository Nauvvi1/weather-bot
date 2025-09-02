import dotenv from "dotenv";
import { z } from "./zmini";

dotenv.config();

export const config = {
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || "",
  openWeatherKey: process.env.OPENWEATHER_API_KEY || "",
  databaseUrl: process.env.DATABASE_URL || "file:./dev.db",
  defaultLanguage: (process.env.DEFAULT_LANGUAGE || "ru") as "ru" | "en",
  defaultUnits: (process.env.DEFAULT_UNITS || "metric") as "metric" | "imperial",
};

export function assertConfig() {
  const schema = z.object({
    telegramToken: z.string().min(10),
    openWeatherKey: z.string().min(5),
  });
  const res = schema.safeParse({ telegramToken: config.telegramToken, openWeatherKey: config.openWeatherKey });
  if (!res.success) {
    const miss = res.error.issues.map(i => i.path.join(".")).join(", ");
    console.warn(`[WARN] Missing/invalid env: ${miss}. Did you create .env from .env.example?`);
  }
}