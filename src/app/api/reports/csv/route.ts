import { NextResponse } from "next/server";

import { requireManagerContext } from "@/lib/session";
import { getReportForRange } from "@/lib/repositories/reports";
import {
  buildCsv,
  buildCsvFilename,
  formatMinutesAsHours,
  formatSignedMinutesAsHours,
} from "@/lib/csv";
import { parseISODate } from "@/lib/week";

export async function GET(req: Request) {
  let ctx;
  try {
    ctx = await requireManagerContext();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind") === "position" ? "position" : "employee";
  const today = new Date();
  const fallbackStart = new Date(today);
  fallbackStart.setDate(fallbackStart.getDate() - 6);

  const startDate = parseISODate(
    searchParams.get("startDate") ?? undefined,
    fallbackStart,
  );
  const endDate = parseISODate(
    searchParams.get("endDate") ?? undefined,
    today,
  );

  const data = await getReportForRange(ctx, { startDate, endDate });

  let csv: string;
  let prefix: string;
  if (kind === "position") {
    prefix = "agendrix-rapport-positions";
    csv = buildCsv(
      ["Position", "Heures prévues", "Heures travaillées"],
      data.perPosition.map((p) => [
        p.positionName,
        formatMinutesAsHours(p.scheduledMinutes),
        formatMinutesAsHours(p.workedMinutes),
      ]),
    );
  } else {
    prefix = "agendrix-rapport-employes";
    csv = buildCsv(
      [
        "Employé",
        "Email",
        "Heures prévues",
        "Heures travaillées",
        "Écart",
        "Sessions ouvertes",
      ],
      data.perEmployee.map((e) => [
        e.name ?? "(sans nom)",
        e.email,
        formatMinutesAsHours(e.scheduledMinutes),
        formatMinutesAsHours(e.workedMinutes),
        formatSignedMinutesAsHours(e.varianceMinutes),
        String(e.openSessionsCount),
      ]),
    );
  }

  const filename = buildCsvFilename(
    prefix,
    data.range.startDate,
    data.range.endDate,
  );

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
