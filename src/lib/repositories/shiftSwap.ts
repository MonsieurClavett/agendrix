import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import type {
  ShiftStatus,
  SwapStatus,
} from "@/generated/prisma";
import type { TenantContext } from "@/lib/session";
import { createNotificationsInTx } from "@/lib/repositories/notification";

/**
 * Tenant pattern (Constitution Principle I): every read AND write
 * filters on `companyId = ctx.companyId`.
 *
 * Authorization is enforced inside each mutation — see the
 * per-function comments and contracts/server-actions.md.
 */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toISODateLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const swapSelect = {
  id: true,
  companyId: true,
  proposerUserId: true,
  proposerShiftId: true,
  targetUserId: true,
  targetShiftId: true,
  proposerMessage: true,
  status: true,
  peerDecidedAt: true,
  peerRejectionReason: true,
  managerDecidedAt: true,
  managerDecidedByUserId: true,
  managerRejectionReason: true,
  createdAt: true,
  proposerUser: { select: { id: true, name: true, email: true } },
  targetUser: { select: { id: true, name: true, email: true } },
  proposerShift: {
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      employeeId: true,
      status: true,
    },
  },
  targetShift: {
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      employeeId: true,
      status: true,
    },
  },
} as const;

export type ShiftSwapRow = {
  id: string;
  companyId: string;
  proposerUserId: string;
  proposerShiftId: string;
  targetUserId: string;
  targetShiftId: string;
  proposerMessage: string | null;
  status: SwapStatus;
  peerDecidedAt: Date | null;
  peerRejectionReason: string | null;
  managerDecidedAt: Date | null;
  managerDecidedByUserId: string | null;
  managerRejectionReason: string | null;
  createdAt: Date;
  proposerUser: { id: string; name: string | null; email: string };
  targetUser: { id: string; name: string | null; email: string };
  proposerShift: {
    id: string;
    startsAt: Date;
    endsAt: Date;
    employeeId: string | null;
    status: ShiftStatus;
  };
  targetShift: {
    id: string;
    startsAt: Date;
    endsAt: Date;
    employeeId: string | null;
    status: ShiftStatus;
  };
};

export type ListSwapsResult = {
  proposed: ShiftSwapRow[];
  incoming: ShiftSwapRow[];
  managerPending: ShiftSwapRow[];
};

const TERMINAL_STATUSES = [
  "APPROVED",
  "REJECTED_BY_PEER",
  "REJECTED_BY_MANAGER",
  "CANCELED_BY_PROPOSER",
] as const satisfies readonly SwapStatus[];

export async function listSwapsForUser(
  ctx: TenantContext,
): Promise<ListSwapsResult> {
  const [proposed, incoming, managerPending] = await Promise.all([
    db.shiftSwap.findMany({
      where: { companyId: ctx.companyId, proposerUserId: ctx.userId },
      select: swapSelect,
      orderBy: { createdAt: "desc" },
    }),
    db.shiftSwap.findMany({
      where: {
        companyId: ctx.companyId,
        targetUserId: ctx.userId,
        status: "PENDING_PEER",
      },
      select: swapSelect,
      orderBy: { createdAt: "desc" },
    }),
    ctx.role === "MANAGER"
      ? db.shiftSwap.findMany({
          where: {
            companyId: ctx.companyId,
            status: "PENDING_MANAGER",
          },
          select: swapSelect,
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);
  return { proposed, incoming, managerPending };
}

/** Drives the calendar "Échange" badge. */
export async function listPendingSwapShiftIds(
  ctx: TenantContext,
): Promise<Set<string>> {
  const rows = await db.shiftSwap.findMany({
    where: {
      companyId: ctx.companyId,
      status: { in: ["PENDING_PEER", "PENDING_MANAGER"] },
    },
    select: { proposerShiftId: true, targetShiftId: true },
  });
  const out = new Set<string>();
  for (const r of rows) {
    out.add(r.proposerShiftId);
    out.add(r.targetShiftId);
  }
  return out;
}

export type ProposeSwapInput = {
  proposerShiftId: string;
  targetUserId: string;
  targetShiftId: string;
  proposerMessage: string | null;
};

export type ProposeSwapResult = {
  swap: ShiftSwapRow;
  recipient: { email: string; name: string | null };
};

export async function proposeSwap(
  ctx: TenantContext,
  input: ProposeSwapInput,
): Promise<ProposeSwapResult> {
  if (ctx.userId === input.targetUserId) throw new Error("SAME_USER");

  return db.$transaction(async (tx) => {
    const proposerShift = await tx.shift.findFirst({
      where: { id: input.proposerShiftId, companyId: ctx.companyId },
      select: { id: true, employeeId: true, status: true, startsAt: true },
    });
    if (!proposerShift) throw new Error("SHIFT_NOT_FOUND");
    if (proposerShift.employeeId !== ctx.userId) {
      throw new Error("NOT_PROPOSER_SHIFT");
    }
    if (proposerShift.status !== "PUBLISHED") throw new Error("NOT_PUBLISHED");

    const targetShift = await tx.shift.findFirst({
      where: { id: input.targetShiftId, companyId: ctx.companyId },
      select: { id: true, employeeId: true, status: true, startsAt: true },
    });
    if (!targetShift) throw new Error("SHIFT_NOT_FOUND");
    if (targetShift.employeeId !== input.targetUserId) {
      throw new Error("NOT_TARGET_SHIFT");
    }
    if (targetShift.status !== "PUBLISHED") throw new Error("NOT_PUBLISHED");

    const target = await tx.user.findFirst({
      where: { id: input.targetUserId, companyId: ctx.companyId },
      select: { id: true, email: true, name: true },
    });
    if (!target) throw new Error("NOT_TARGET_SHIFT");

    const proposer = await tx.user.findUnique({
      where: { id: ctx.userId },
      select: { name: true },
    });

    let row: ShiftSwapRow;
    try {
      row = await tx.shiftSwap.create({
        data: {
          companyId: ctx.companyId,
          proposerUserId: ctx.userId,
          proposerShiftId: input.proposerShiftId,
          targetUserId: input.targetUserId,
          targetShiftId: input.targetShiftId,
          proposerMessage: input.proposerMessage,
          status: "PENDING_PEER",
        },
        select: swapSelect,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new Error("SHIFT_ALREADY_ENGAGED");
      }
      throw err;
    }

    await createNotificationsInTx(tx, [
      {
        companyId: ctx.companyId,
        recipientUserId: input.targetUserId,
        type: "SWAP_PROPOSED",
        payload: {
          type: "SWAP_PROPOSED",
          swapId: row.id,
          proposerName: proposer?.name ?? null,
          proposerShiftStartISO: toISODateLocal(proposerShift.startsAt),
          targetShiftStartISO: toISODateLocal(targetShift.startsAt),
        },
      },
    ]);

    return {
      swap: row,
      recipient: { email: target.email, name: target.name },
    };
  });
}

export type PeerDecideResult = {
  swap: ShiftSwapRow;
  proposerRecipient: { email: string; name: string | null };
};

export async function peerDecide(
  ctx: TenantContext,
  swapId: string,
  decision: "ACCEPT" | "REJECT",
  reason: string | null,
): Promise<PeerDecideResult> {
  return db.$transaction(async (tx) => {
    const existing = await tx.shiftSwap.findFirst({
      where: {
        id: swapId,
        companyId: ctx.companyId,
        status: "PENDING_PEER",
      },
      select: {
        id: true,
        targetUserId: true,
        proposerUserId: true,
        proposerUser: { select: { email: true, name: true } },
        targetUser: { select: { name: true } },
      },
    });
    if (!existing) throw new Error("NOT_FOUND");
    if (existing.targetUserId !== ctx.userId) throw new Error("FORBIDDEN");

    const nextStatus: SwapStatus =
      decision === "ACCEPT" ? "PENDING_MANAGER" : "REJECTED_BY_PEER";

    const row = await tx.shiftSwap.update({
      where: { id: swapId },
      data: {
        status: nextStatus,
        peerDecidedAt: new Date(),
        peerRejectionReason: decision === "REJECT" ? reason : null,
      },
      select: swapSelect,
    });

    await createNotificationsInTx(tx, [
      {
        companyId: ctx.companyId,
        recipientUserId: existing.proposerUserId,
        type:
          decision === "ACCEPT"
            ? "SWAP_ACCEPTED_BY_PEER"
            : "SWAP_REJECTED_BY_PEER",
        payload:
          decision === "ACCEPT"
            ? {
                type: "SWAP_ACCEPTED_BY_PEER",
                swapId: row.id,
                peerName: existing.targetUser.name ?? null,
              }
            : {
                type: "SWAP_REJECTED_BY_PEER",
                swapId: row.id,
                peerName: existing.targetUser.name ?? null,
                reason: reason,
              },
      },
    ]);

    return {
      swap: row,
      proposerRecipient: {
        email: existing.proposerUser.email,
        name: existing.proposerUser.name,
      },
    };
  });
}

export type ManagerDecideResult = {
  swap: ShiftSwapRow;
  proposerRecipient: { email: string; name: string | null };
  targetRecipient: { email: string; name: string | null };
};

export async function managerDecide(
  ctx: TenantContext,
  swapId: string,
  decision: "APPROVE" | "REJECT",
  reason: string | null,
): Promise<ManagerDecideResult> {
  if (ctx.role !== "MANAGER") throw new Error("FORBIDDEN");

  return db.$transaction(async (tx) => {
    const existing = await tx.shiftSwap.findFirst({
      where: {
        id: swapId,
        companyId: ctx.companyId,
        status: "PENDING_MANAGER",
      },
      select: {
        id: true,
        proposerUserId: true,
        proposerShiftId: true,
        targetUserId: true,
        targetShiftId: true,
        proposerUser: { select: { email: true, name: true } },
        targetUser: { select: { email: true, name: true } },
      },
    });
    if (!existing) throw new Error("NOT_FOUND");

    if (decision === "APPROVE") {
      const [proposerShift, targetShift] = await Promise.all([
        tx.shift.findFirst({
          where: { id: existing.proposerShiftId, companyId: ctx.companyId },
          select: {
            id: true,
            employeeId: true,
            startsAt: true,
            endsAt: true,
          },
        }),
        tx.shift.findFirst({
          where: { id: existing.targetShiftId, companyId: ctx.companyId },
          select: {
            id: true,
            employeeId: true,
            startsAt: true,
            endsAt: true,
          },
        }),
      ]);
      if (!proposerShift || !targetShift) throw new Error("SHIFT_NOT_FOUND");
      if (
        proposerShift.employeeId !== existing.proposerUserId ||
        targetShift.employeeId !== existing.targetUserId
      ) {
        throw new Error("STATE_DRIFT");
      }

      // Overlap: the proposer will take the target shift's slot.
      const proposerOverlap = await tx.shift.findFirst({
        where: {
          id: { notIn: [proposerShift.id, targetShift.id] },
          employeeId: existing.proposerUserId,
          startsAt: { lt: targetShift.endsAt },
          endsAt: { gt: targetShift.startsAt },
        },
        select: { id: true },
      });
      if (proposerOverlap) throw new Error("PROPOSER_OVERLAP");

      const targetOverlap = await tx.shift.findFirst({
        where: {
          id: { notIn: [proposerShift.id, targetShift.id] },
          employeeId: existing.targetUserId,
          startsAt: { lt: proposerShift.endsAt },
          endsAt: { gt: proposerShift.startsAt },
        },
        select: { id: true },
      });
      if (targetOverlap) throw new Error("TARGET_OVERLAP");

      await tx.shift.update({
        where: { id: proposerShift.id },
        data: { employeeId: existing.targetUserId },
      });
      await tx.shift.update({
        where: { id: targetShift.id },
        data: { employeeId: existing.proposerUserId },
      });
    }

    const nextStatus: SwapStatus =
      decision === "APPROVE" ? "APPROVED" : "REJECTED_BY_MANAGER";

    const row = await tx.shiftSwap.update({
      where: { id: swapId },
      data: {
        status: nextStatus,
        managerDecidedAt: new Date(),
        managerDecidedByUserId: ctx.userId,
        managerRejectionReason: decision === "REJECT" ? reason : null,
      },
      select: swapSelect,
    });

    await createNotificationsInTx(tx, [
      {
        companyId: ctx.companyId,
        recipientUserId: existing.proposerUserId,
        type: "SWAP_DECIDED_BY_MANAGER",
        payload: {
          type: "SWAP_DECIDED_BY_MANAGER",
          swapId: row.id,
          decision: decision === "APPROVE" ? "APPROVED" : "REJECTED",
          reason: decision === "REJECT" ? reason : null,
        },
      },
      {
        companyId: ctx.companyId,
        recipientUserId: existing.targetUserId,
        type: "SWAP_DECIDED_BY_MANAGER",
        payload: {
          type: "SWAP_DECIDED_BY_MANAGER",
          swapId: row.id,
          decision: decision === "APPROVE" ? "APPROVED" : "REJECTED",
          reason: decision === "REJECT" ? reason : null,
        },
      },
    ]);

    return {
      swap: row,
      proposerRecipient: {
        email: existing.proposerUser.email,
        name: existing.proposerUser.name,
      },
      targetRecipient: {
        email: existing.targetUser.email,
        name: existing.targetUser.name,
      },
    };
  });
}

export async function cancelSwap(
  ctx: TenantContext,
  swapId: string,
): Promise<void> {
  await db.$transaction(async (tx) => {
    const existing = await tx.shiftSwap.findFirst({
      where: { id: swapId, companyId: ctx.companyId },
      select: { id: true, proposerUserId: true, status: true },
    });
    if (!existing) throw new Error("NOT_FOUND");
    if (existing.proposerUserId !== ctx.userId) throw new Error("FORBIDDEN");
    if (
      existing.status !== "PENDING_PEER" &&
      existing.status !== "PENDING_MANAGER"
    ) {
      throw new Error("NOT_CANCELABLE");
    }
    await tx.shiftSwap.update({
      where: { id: swapId },
      data: { status: "CANCELED_BY_PROPOSER" },
    });
  });
}

/** Used by the UI to render terminal-status badges. */
export function isTerminalStatus(s: SwapStatus): boolean {
  return (TERMINAL_STATUSES as readonly SwapStatus[]).includes(s);
}
