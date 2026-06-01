"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  initialStartDate: string;
  initialEndDate: string;
};

export function ReportFilters({ initialStartDate, initialEndDate }: Props) {
  const router = useRouter();
  const [start, setStart] = React.useState(initialStartDate);
  const [end, setEnd] = React.useState(initialEndDate);

  const apply = () => {
    const params = new URLSearchParams();
    params.set("startDate", start);
    params.set("endDate", end);
    router.push(`/rapports?${params.toString()}`);
  };

  const presetLast7 = () => {
    const today = new Date();
    const past = new Date(today);
    past.setDate(past.getDate() - 6);
    const iso = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    setStart(iso(past));
    setEnd(iso(today));
  };

  const presetLast30 = () => {
    const today = new Date();
    const past = new Date(today);
    past.setDate(past.getDate() - 29);
    const iso = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    setStart(iso(past));
    setEnd(iso(today));
  };

  return (
    <div className="bg-card flex flex-wrap items-end gap-3 rounded-md border p-3">
      <div className="space-y-1.5">
        <Label htmlFor="startDate" className="text-xs">
          Du
        </Label>
        <Input
          id="startDate"
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="h-9 w-44"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="endDate" className="text-xs">
          Au
        </Label>
        <Input
          id="endDate"
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="h-9 w-44"
        />
      </div>
      <Button onClick={apply} size="sm">
        Appliquer
      </Button>
      <div className="ml-auto flex gap-1">
        <Button variant="ghost" size="sm" onClick={presetLast7}>
          7 derniers jours
        </Button>
        <Button variant="ghost" size="sm" onClick={presetLast30}>
          30 derniers jours
        </Button>
      </div>
    </div>
  );
}
