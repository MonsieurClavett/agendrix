"use client";

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
import type { Role } from "@/generated/prisma";

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
};

export function TeamTable({ users, currentUserId }: Props) {
  return (
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
                <Badge variant={u.role === "MANAGER" ? "default" : "secondary"}>
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
  );
}
