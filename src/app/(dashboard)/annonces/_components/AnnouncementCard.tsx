"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  PinIcon,
  PinOffIcon,
  PencilIcon,
  Trash2Icon,
  PinIcon as Pin,
} from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelativeDate } from "@/lib/notifications";
import { togglePinAnnouncementAction } from "@/actions/announcements/togglePin";
import { AnnouncementDialog } from "./AnnouncementDialog";
import { DeleteAnnouncementDialog } from "./DeleteAnnouncementDialog";

export type AnnouncementListItem = {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  createdAt: Date;
  authorName: string | null;
};

type Props = {
  announcement: AnnouncementListItem;
  canManage: boolean;
};

export function AnnouncementCard({ announcement, canManage }: Props) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [pinPending, startPinTransition] = React.useTransition();

  const onTogglePin = () => {
    startPinTransition(async () => {
      const fd = new FormData();
      fd.append("id", announcement.id);
      const r = await togglePinAnnouncementAction({}, fd);
      if (r.success) {
        toast.success(
          announcement.isPinned ? "Annonce désépinglée." : "Annonce épinglée.",
        );
        router.refresh();
      } else if (r.error) {
        toast.error(r.error);
      }
    });
  };

  return (
    <article className="lift-on-hover bg-card relative rounded-xl border p-5">
      {announcement.isPinned && (
        <Badge
          variant="outline"
          className="absolute -top-2 left-4 border-primary/40 text-primary bg-card gap-1"
        >
          <Pin className="size-3" />
          Épinglée
        </Badge>
      )}
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-tight">
            {announcement.title}
          </h3>
          <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
            <Avatar
              name={announcement.authorName ?? "?"}
              size="sm"
              className="size-5 text-[9px]"
            />
            <span>
              {announcement.authorName ?? "(auteur supprimé)"} ·{" "}
              {formatRelativeDate(announcement.createdAt)}
            </span>
          </div>
        </div>
        {canManage && (
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onTogglePin}
              disabled={pinPending}
              aria-label={
                announcement.isPinned ? "Désépingler" : "Épingler"
              }
            >
              {announcement.isPinned ? (
                <PinOffIcon className="size-4" />
              ) : (
                <PinIcon className="size-4" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setEditOpen(true)}
              aria-label="Modifier"
            >
              <PencilIcon className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setDeleteOpen(true)}
              aria-label="Supprimer"
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        )}
      </header>

      {announcement.body && (
        <p className="text-foreground/90 mt-3 whitespace-pre-wrap text-sm leading-relaxed">
          {announcement.body}
        </p>
      )}

      {editOpen && (
        <AnnouncementDialog
          open
          onOpenChange={(o) => {
            if (!o) setEditOpen(false);
          }}
          mode="edit"
          initial={{
            id: announcement.id,
            title: announcement.title,
            body: announcement.body,
          }}
        />
      )}

      {deleteOpen && (
        <DeleteAnnouncementDialog
          open
          onOpenChange={(o) => {
            if (!o) setDeleteOpen(false);
          }}
          announcementId={announcement.id}
          title={announcement.title}
        />
      )}
    </article>
  );
}
