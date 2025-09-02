import cron from "node-cron";
import { prisma } from "./db";
import { DateTime } from "luxon";
import { sendWeatherToUser } from "./senders";

export function startScheduler() {
  cron.schedule("* * * * *", async () => {
    const nowUtc = DateTime.utc();
    const subs = await prisma.user.findMany({ where: { subscribed: true, tz: { not: null }, subHour: { not: null }, subMinute: { not: null } } });
    for (const u of subs) {
      const tz = u.tz!;
      const local = nowUtc.setZone(tz);
      if (local.hour === u.subHour && local.minute === u.subMinute) {
        const todayStr = local.toISODate();
        if (u.lastDailySentDate !== todayStr) {
          try {
            await sendWeatherToUser(u);
            await prisma.user.update({ where: { id: u.id }, data: { lastDailySentDate: todayStr } });
          } catch (e) {
            // ignore
          }
        }
      }
    }
  });
}