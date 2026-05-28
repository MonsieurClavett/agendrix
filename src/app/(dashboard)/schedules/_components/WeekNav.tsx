import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  addDays,
  formatLongDate,
  mondayOfWeek,
  toISODate,
  type WeekRange,
} from "@/lib/week";

type Props = {
  range: WeekRange;
  today: Date;
};

export function WeekNav({ range, today }: Props) {
  const prev = toISODate(addDays(range.start, -7));
  const next = toISODate(addDays(range.start, 7));
  const currentMonday = mondayOfWeek(today);
  const isCurrentWeek = range.start.getTime() === currentMonday.getTime();

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-lg font-medium">
        Semaine du {formatLongDate(range.start)}
      </h2>
      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/schedules?week=${prev}`}>← Semaine précédente</Link>
        </Button>
        {!isCurrentWeek && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/schedules">Cette semaine</Link>
          </Button>
        )}
        <Button asChild variant="outline" size="sm">
          <Link href={`/schedules?week=${next}`}>Semaine suivante →</Link>
        </Button>
      </div>
    </div>
  );
}
