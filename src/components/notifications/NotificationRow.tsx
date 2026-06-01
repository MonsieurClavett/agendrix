"use client";

import * as React from "react";
import { useActionState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellIcon, CalendarOff, PlaneTakeoff, Sparkles } from "lucide-react";

import {
  markNotificationReadAction,
  type MarkReadState,
} from "@/actions/notifications/markRead";
import { cn } from "@/lib/utils";
import {
  formatRelativeDate,
  renderNotificationHref,
  renderNotificationLabel,
} from "@/lib/notifications";
import type { NotificationRow as NotificationRowType } from "@/lib/repositories/notification";

type Props = {
  notification: NotificationRowType;
};

const initial: MarkReadState = {};

function IconForType({ type }: { type: NotificationRowType["type"] }) {
  switch (type) {
    case "SHIFT_PUBLISHED":
      return <Sparkles className="size-4" />;
    case "TIME_OFF_DECIDED":
      return <PlaneTakeoff className="size-4" />;
    case "CLAIM_DECIDED":
      return <CalendarOff className="size-4" />;
    default:
      return <BellIcon className="size-4" />;
  }
}

export function NotificationRow({ notification }: Props) {
  const router = useRouter();
  const [, formAction] = useActionState(
    markNotificationReadAction,
    initial,
  );
  const [, startTransition] = useTransition();
  const unread = notification.readAt === null;
  const label = renderNotificationLabel(notification.payload);
  const href = renderNotificationHref(notification.payload);

  const handleClick = () => {
    if (unread) {
      const fd = new FormData();
      fd.append("notificationId", notification.id);
      startTransition(() => {
        formAction(fd);
      });
    }
    if (href) router.push(href);
  };

  // Defensive: when the user re-renders without unread state, no-op.
  useEffect(() => {}, [unread]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "hover:bg-muted/50 flex w-full items-start gap-3 px-3 py-2 text-left text-sm transition-colors",
        unread && "bg-muted/30",
      )}
    >
      <div
        className={cn(
          "mt-0.5 shrink-0 rounded-full p-1.5",
          unread
            ? "bg-primary/15 text-primary"
            : "bg-muted text-muted-foreground",
        )}
      >
        <IconForType type={notification.type} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "leading-tight",
            unread ? "font-medium" : "text-muted-foreground",
          )}
        >
          {label}
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {formatRelativeDate(notification.createdAt)}
        </p>
      </div>
      {unread && (
        <span className="bg-primary mt-1.5 size-2 shrink-0 rounded-full" />
      )}
    </button>
  );
}
