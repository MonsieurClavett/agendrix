"use client";

import * as React from "react";
import { Newspaper } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { AnnouncementCard, type AnnouncementListItem } from "./AnnouncementCard";

type Props = {
  announcements: AnnouncementListItem[];
  canManage: boolean;
};

export function AnnouncementsList({ announcements, canManage }: Props) {
  if (announcements.length === 0) {
    return (
      <EmptyState
        icon={<Newspaper className="size-5" />}
        title="Aucune annonce pour le moment"
        description={
          canManage
            ? "Publiez la première annonce pour partager une information avec votre équipe."
            : "Aucune annonce n'a été publiée par les gestionnaires."
        }
      />
    );
  }
  return (
    <div className="space-y-3">
      {announcements.map((a) => (
        <AnnouncementCard
          key={a.id}
          announcement={a}
          canManage={canManage}
        />
      ))}
    </div>
  );
}
