"use client";

import * as React from "react";
import { useActionState, useTransition } from "react";

import {
  markAllNotificationsReadAction,
  type MarkAllReadState,
} from "@/actions/notifications/markAllRead";
import { Button } from "@/components/ui/button";
import type { NotificationRow as NotificationRowType } from "@/lib/repositories/notification";
import { NotificationRow } from "./NotificationRow";

type Props = {
  notifications: NotificationRowType[];
  unreadCount: number;
};

const initial: MarkAllReadState = {};

export function NotificationsPanel({ notifications, unreadCount }: Props) {
  const [, formAction] = useActionState(
    markAllNotificationsReadAction,
    initial,
  );
  const [pending, startTransition] = useTransition();

  const handleMarkAll = () => {
    startTransition(() => {
      formAction(new FormData());
    });
  };

  return (
    <div className="w-80">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <p className="text-sm font-semibold">Notifications</p>
        {unreadCount > 0 && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            disabled={pending}
            onClick={handleMarkAll}
          >
            Tout marquer comme lu
          </Button>
        )}
      </div>
      {notifications.length === 0 ? (
        <div className="text-muted-foreground px-3 py-6 text-center text-sm">
          Pas de notifications pour le moment.
        </div>
      ) : (
        <div className="divide-border max-h-96 divide-y overflow-y-auto">
          {notifications.map((n) => (
            <NotificationRow key={n.id} notification={n} />
          ))}
        </div>
      )}
    </div>
  );
}
