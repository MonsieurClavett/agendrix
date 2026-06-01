"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EditEmployeeDialog } from "./EditEmployeeDialog";
import { SetActiveConfirmDialog } from "./SetActiveConfirmDialog";
import { EmployeeAvailabilityDialog } from "./EmployeeAvailabilityDialog";
import {
  PreferencesPopover,
  type PreferenceData,
} from "./PreferencesPopover";
import type { Role } from "@/generated/prisma";
import type { AvailabilityRow } from "@/lib/repositories/availability";

type TeamUser = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  isActive: boolean;
};

type Props = {
  users: TeamUser[];
  currentUserId: string;
  rangesByEmployee: Record<string, AvailabilityRow[]>;
  preferencesByEmployee: Record<string, PreferenceData>;
};

export function TeamTable({
  users,
  currentUserId,
  rangesByEmployee,
  preferencesByEmployee,
}: Props) {
  const [availabilityFor, setAvailabilityFor] = React.useState<TeamUser | null>(
    null,
  );

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rôle</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => {
            const isSelf = u.id === currentUserId;
            return (
              <TableRow key={u.id}>
                <TableCell className="font-medium">
                  {u.name ?? "(sans nom)"}
                  {isSelf && (
                    <span className="text-muted-foreground ml-1 text-xs">
                      (vous)
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {u.email}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={u.role === "MANAGER" ? "default" : "secondary"}
                  >
                    {u.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {u.isActive ? (
                    <Badge variant="outline">Actif</Badge>
                  ) : (
                    <Badge variant="destructive">Désactivé</Badge>
                  )}
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  <PreferencesPopover
                    employeeName={u.name ?? u.email}
                    preferences={preferencesByEmployee[u.id] ?? null}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setAvailabilityFor(u)}
                  >
                    Disponibilités
                  </Button>
                  <EditEmployeeDialog user={u} />
                  {!isSelf && u.isActive && (
                    <SetActiveConfirmDialog user={u} desiredActive={false} />
                  )}
                  {!u.isActive && (
                    <SetActiveConfirmDialog user={u} desiredActive={true} />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {availabilityFor && (
        <EmployeeAvailabilityDialog
          open={true}
          onOpenChange={(o) => {
            if (!o) setAvailabilityFor(null);
          }}
          employee={availabilityFor}
          ranges={rangesByEmployee[availabilityFor.id] ?? []}
          canEdit={true}
        />
      )}
    </>
  );
}
