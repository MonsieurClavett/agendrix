"use client";

import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Download,
  MapPin,
  PencilIcon,
  PowerIcon,
  PowerOffIcon,
  Printer,
  Trash2Icon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { updatePunchLocationAction } from "@/actions/punchLocations/update";
import { RenameLocationDialog } from "./RenameLocationDialog";
import { DeleteLocationDialog } from "./DeleteLocationDialog";

export type PunchLocationListItem = {
  id: string;
  name: string;
  token: string;
  isActive: boolean;
  createdAt: Date;
  url: string;
  qrDataUrl: string;
};

type Props = { locations: PunchLocationListItem[] };

export function PunchLocationsList({ locations }: Props) {
  const router = useRouter();
  const [renaming, setRenaming] = React.useState<PunchLocationListItem | null>(
    null,
  );
  const [deleting, setDeleting] = React.useState<PunchLocationListItem | null>(
    null,
  );
  const [pending, startTransition] = React.useTransition();

  const onToggleActive = (loc: PunchLocationListItem) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("id", loc.id);
      fd.append("isActive", loc.isActive ? "false" : "true");
      const r = await updatePunchLocationAction({}, fd);
      if (r.success) {
        toast.success(loc.isActive ? "Poste désactivé." : "Poste réactivé.");
        router.refresh();
      } else if (r.error) {
        toast.error(r.error);
      }
    });
  };

  const onPrintQr = (loc: PunchLocationListItem) => {
    const w = window.open("", "_blank", "width=600,height=720");
    if (!w) return;
    w.document.write(`
      <html><head><title>QR — ${loc.name}</title>
      <style>
        body { font-family: -apple-system, system-ui, sans-serif; margin: 0; padding: 32px; text-align: center; }
        h1 { font-size: 22px; margin: 0 0 4px; }
        p { color: #6b7280; margin: 0 0 24px; font-size: 13px; }
        img { width: 360px; height: 360px; }
        .url { margin-top: 18px; font-size: 11px; color: #9ca3af; word-break: break-all; }
      </style></head>
      <body>
        <h1>${loc.name}</h1>
        <p>Scannez ce QR code pour pointer</p>
        <img src="${loc.qrDataUrl}" alt="QR" />
        <div class="url">${loc.url}</div>
        <script>setTimeout(() => window.print(), 250);</script>
      </body></html>
    `);
    w.document.close();
  };

  if (locations.length === 0) {
    return (
      <EmptyState
        icon={<MapPin className="size-5" />}
        title="Aucun poste de pointage"
        description="Créez votre premier poste pour générer un QR code à afficher au lieu de travail."
      />
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {locations.map((loc) => (
          <article
            key={loc.id}
            className="bg-card lift-on-hover rounded-xl border p-5"
          >
            <header className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-semibold leading-tight">
                  {loc.name}
                </h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Token : <code>{loc.token}</code>
                </p>
              </div>
              {!loc.isActive && (
                <Badge variant="outline" className="border-destructive/40 text-destructive">
                  Désactivé
                </Badge>
              )}
            </header>

            <div className="my-4 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={loc.qrDataUrl}
                alt={`QR pour ${loc.name}`}
                className="bg-white rounded-md border p-1"
                style={{ width: 200, height: 200 }}
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onPrintQr(loc)}
              >
                <Printer />
                Imprimer
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href={loc.qrDataUrl} download={`qr-${loc.name}.png`}>
                  <Download />
                  Télécharger
                </a>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setRenaming(loc)}
              >
                <PencilIcon />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onToggleActive(loc)}
                disabled={pending}
                aria-label={loc.isActive ? "Désactiver" : "Réactiver"}
              >
                {loc.isActive ? <PowerOffIcon /> : <PowerIcon />}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setDeleting(loc)}
                aria-label="Supprimer"
              >
                <Trash2Icon />
              </Button>
            </div>
          </article>
        ))}
      </div>

      {renaming && (
        <RenameLocationDialog
          open
          onOpenChange={(o) => {
            if (!o) setRenaming(null);
          }}
          locationId={renaming.id}
          currentName={renaming.name}
        />
      )}

      {deleting && (
        <DeleteLocationDialog
          open
          onOpenChange={(o) => {
            if (!o) setDeleting(null);
          }}
          locationId={deleting.id}
          locationName={deleting.name}
        />
      )}
    </>
  );
}
