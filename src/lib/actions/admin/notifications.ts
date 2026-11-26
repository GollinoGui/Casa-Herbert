"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getPanelNotifications } from "@/lib/data/notifications";

export async function getPanelNotificationsAction() {
  await requireAdmin();
  return getPanelNotifications();
}
