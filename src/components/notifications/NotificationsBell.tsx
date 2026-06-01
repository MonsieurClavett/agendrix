import { BellIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { requireTenantContext } from "@/lib/session";
import {
  countUnreadForUser,
  listLatestForUser,
} from "@/lib/repositories/notification";
import { NotificationsPanel } from "./NotificationsPanel";

export async function NotificationsBell() {
  const ctx = await requireTenantContext();
  const [notifications, unreadCount] = await Promise.all([
    listLatestForUser(ctx, 10),
    countUnreadForUser(ctx),
  ]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="relative"
          aria-label={
            unreadCount > 0
              ? `${unreadCount} notifications non lues`
              : "Notifications"
          }
        >
          <BellIcon className="size-4" />
          {unreadCount > 0 && (
            <span className="bg-destructive absolute top-1 right-1 flex size-4 items-center justify-center rounded-full text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className="p-0">
        <NotificationsPanel
          notifications={notifications}
          unreadCount={unreadCount}
        />
      </PopoverContent>
    </Popover>
  );
}
