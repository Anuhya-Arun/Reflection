import { DurableObject } from "cloudflare:workers";

const MONTHLY_FREE_REVIEWS = 25;
const RESERVATION_TTL_MS = 15 * 60 * 1000;

type UsageState = {
  month: string;
  completedReviews: number;
  pendingReservations: Record<string, number>;
};

type UsageSummary = {
  monthlyLimit: number;
  reviewsUsed: number;
  reviewsRemaining: number;
};

type ReserveResponse =
  | {
      allowed: true;
      reservationId: string;
    } & UsageSummary
  | {
      allowed: false;
    } & UsageSummary;

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function toUsageSummary(state: UsageState): UsageSummary {
  const pendingCount = Object.keys(state.pendingReservations).length;
  const reviewsUsed = state.completedReviews + pendingCount;

  return {
    monthlyLimit: MONTHLY_FREE_REVIEWS,
    reviewsUsed,
    reviewsRemaining: Math.max(0, MONTHLY_FREE_REVIEWS - reviewsUsed),
  };
}

export class UserUsage extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;

    if (request.method === "GET" && path === "/usage") {
      return Response.json(await this.getUsage());
    }

    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed." }, { status: 405 });
    }

    if (path === "/reserve") {
      return Response.json(await this.reserveReview());
    }

    const body = await request.json<{ reservationId?: string }>();
    const reservationId = body.reservationId;

    if (!reservationId) {
      return Response.json(
        { error: "reservationId is required." },
        { status: 400 },
      );
    }

    if (path === "/commit") {
      return Response.json(await this.commitReview(reservationId));
    }

    if (path === "/refund") {
      return Response.json(await this.refundReview(reservationId));
    }

    return Response.json({ error: "Not found." }, { status: 404 });
  }

  private async getState(): Promise<UsageState> {
    const stored = await this.ctx.storage.get<UsageState>("usage");
    const month = currentMonth();

    const state =
      stored?.month === month
        ? stored
        : {
            month,
            completedReviews: 0,
            pendingReservations: {},
          };

    const oldestAllowedReservation = Date.now() - RESERVATION_TTL_MS;

    for (const [reservationId, createdAt] of Object.entries(
      state.pendingReservations,
    )) {
      if (createdAt < oldestAllowedReservation) {
        delete state.pendingReservations[reservationId];
      }
    }

    return state;
  }

  private async saveState(state: UsageState): Promise<void> {
    await this.ctx.storage.put("usage", state);
  }

  private async getUsage(): Promise<UsageSummary> {
    const state = await this.getState();
    await this.saveState(state);

    return toUsageSummary(state);
  }

  private async reserveReview(): Promise<ReserveResponse> {
    const state = await this.getState();
    const summary = toUsageSummary(state);

    if (summary.reviewsRemaining <= 0) {
      await this.saveState(state);

      return {
        allowed: false,
        ...summary,
      };
    }

    const reservationId = crypto.randomUUID();

    state.pendingReservations[reservationId] = Date.now();

    await this.saveState(state);

    return {
      allowed: true,
      reservationId,
      ...toUsageSummary(state),
    };
  }

  private async commitReview(reservationId: string): Promise<UsageSummary> {
    const state = await this.getState();

    if (state.pendingReservations[reservationId]) {
      delete state.pendingReservations[reservationId];
      state.completedReviews += 1;
      await this.saveState(state);
    }

    return toUsageSummary(state);
  }

  private async refundReview(reservationId: string): Promise<UsageSummary> {
    const state = await this.getState();

    if (state.pendingReservations[reservationId]) {
      delete state.pendingReservations[reservationId];
      await this.saveState(state);
    }

    return toUsageSummary(state);
  }
}