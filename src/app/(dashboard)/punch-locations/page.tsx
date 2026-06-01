import { requireManagerContext } from "@/lib/session";
import { listLocations } from "@/lib/repositories/punchLocation";
import { generateQrDataUrl, buildPunchUrl } from "@/lib/qrcode";
import { PageHeader } from "@/components/ui/page-header";
import { PunchLocationsList } from "./_components/PunchLocationsList";
import { NewLocationButton } from "./_components/NewLocationButton";

export default async function PunchLocationsPage() {
  const ctx = await requireManagerContext();
  const locations = await listLocations(ctx);

  // Pre-render QR data URLs server-side so the client receives
  // ready-to-paint images (zero JS for the QR rendering itself).
  const withQr = await Promise.all(
    locations.map(async (loc) => ({
      id: loc.id,
      name: loc.name,
      token: loc.token,
      isActive: loc.isActive,
      createdAt: loc.createdAt,
      url: buildPunchUrl(loc.token),
      qrDataUrl: await generateQrDataUrl(buildPunchUrl(loc.token), 240),
    })),
  );

  return (
    <div className="page-enter space-y-5">
      <PageHeader
        eyebrow="Pointage"
        title="Postes de pointage"
        description="Créez des postes de pointage avec QR code que vos employés peuvent scanner pour pointer leur entrée et leur sortie."
        action={<NewLocationButton />}
      />

      <PunchLocationsList locations={withQr} />
    </div>
  );
}
