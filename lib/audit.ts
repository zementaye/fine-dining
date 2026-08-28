import { db } from "./db/index";
import { adminActivityLog } from "./db/schema";

/**
 * Records a staff action to the audit trail. Fire-and-forget by design (never
 * blocks or fails the actual mutation it's logging) — an audit-log write
 * failure shouldn't stop a host from seating a table. Errors are swallowed
 * with a console.error, same posture as email sends elsewhere in this app.
 */
export async function logAdminActivity(args: {
  actorUserId?: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string;
  detail?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(adminActivityLog).values({
      actorUserId: args.actorUserId,
      actorName: args.actorName,
      action: args.action,
      targetType: args.targetType,
      targetId: args.targetId,
      detail: args.detail ?? null,
    });
  } catch (err) {
    console.error("Failed to write admin activity log", err);
  }
}
