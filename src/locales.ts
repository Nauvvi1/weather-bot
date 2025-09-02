export type L = "ru" | "en";

const dict: Record<L, Record<string, string>> = {
  ru: {
    welcome: "Привет! Я помогу узнать погоду. Отправь город командой /setcity или поделись геолокацией кнопкой ниже.",
    ask_city: "Введи город (например, Berlin) или пришли 📍 геолокацию.",
    saved_city: "Город сохранён: {city}. Часовой пояс: {tz}",
    not_found: "Не нашёл такой город. Попробуй ещё раз.",
    need_city_first: "Сначала задай город через /setcity или пришли геолокацию.",
    current_weather: "{city} • Сейчас\n{line1}\n{line2}\n{today}",
    forecast_title: "{city} • Ближайшие 12 часов",
    subs_on: "Еженевная сводка настроена на {time}.",
    subs_off: "Ежедневная сводка отключена.",
    units_now: "Единицы измерения: {units}",
    units_set: "Единицы изменены на {units}",
    lang_now: "Текущий язык: {lang}",
    lang_set: "Язык изменён на {lang}",
    send_time: "Пришли время в формате HH:MM (например, 08:00).",
    invalid_time: "Некорректное время. Формат HH:MM.",
    no_tz: "Не удалось определить часовой пояс. Укажи город/локацию заново.",
    help: "Команды:\n/start — начать\n/setcity <город> — задать город\n/weather — погода сейчас\n/forecast — прогноз\n/units — переключить metric/imperial\n/subscribe HH:MM — ежедневная сводка\n/unsubscribe — отменить сводку",
  },
  en: {
    welcome: "Hi! I can show the weather. Set your city via /setcity or share your location with the button below.",
    ask_city: "Type a city (e.g. Berlin) or send your 📍 location.",
    saved_city: "Saved city: {city}. Timezone: {tz}",
    not_found: "City not found. Try again.",
    need_city_first: "Please set a city first via /setcity or send your location.",
    current_weather: "{city} • Now\n{line1}\n{line2}\n{today}",
    forecast_title: "{city} • Next 12 hours",
    subs_on: "Daily summary is scheduled at {time}.",
    subs_off: "Daily summary disabled.",
    units_now: "Units: {units}",
    units_set: "Units updated to {units}",
    lang_now: "Language: {lang}",
    lang_set: "Language changed to {lang}",
    send_time: "Send time in HH:MM (e.g. 08:00).",
    invalid_time: "Invalid time. Use HH:MM.",
    no_tz: "Could not detect timezone. Please set city/location again.",
    help: "Commands:\n/start — start\n/setcity <city> — set city\n/weather — current\n/forecast — forecast\n/units — toggle metric/imperial\n/subscribe HH:MM — daily summary\n/unsubscribe — disable summary",
  }
};

export function t(lang: L, key: string, vars: Record<string, string|number> = {}) {
  const base = dict[lang]?.[key] || dict.en[key] || key;
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, "g"), String(v)), base);
}