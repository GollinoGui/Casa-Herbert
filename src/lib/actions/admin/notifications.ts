"use server";

import { requireStaff } from "@/lib/auth/require-admin";
import { getPanelNotifications } from "@/lib/data/notifications";

export async function getPanelNotificationsAction() {
  const user = await requireStaff();
  return getPanelNotifications(user.role);
}
