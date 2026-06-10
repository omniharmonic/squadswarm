import { eq, and } from 'drizzle-orm';
import { db, squadMembers, bids, scopes } from '@squadswarm/db';

/**
 * Centralized authorization checks shared across API routes.
 *
 * Routes historically hand-rolled these checks, which led to inconsistent
 * coverage (some endpoints leaked other tenants' data). Keeping the predicates
 * here makes "who can see/do this" auditable in one place.
 */

export type SquadRole = 'admin' | 'member' | null;

/** A user's role within a squad, or null if they are not a member. */
export async function getSquadRole(userId: string, squadId: string): Promise<SquadRole> {
  const [member] = await db
    .select({ role: squadMembers.role })
    .from(squadMembers)
    .where(and(eq(squadMembers.squadId, squadId), eq(squadMembers.userId, userId)))
    .limit(1);
  if (!member) return null;
  return member.role === 'admin' ? 'admin' : 'member';
}

export async function isSquadMember(userId: string, squadId: string): Promise<boolean> {
  return (await getSquadRole(userId, squadId)) !== null;
}

export async function isSquadAdmin(userId: string, squadId: string): Promise<boolean> {
  return (await getSquadRole(userId, squadId)) === 'admin';
}

export type BidViewerRole = 'owner_squad' | 'scope_client' | null;

/**
 * Who may view a bid: members of the bidding squad ("owner_squad") or the
 * client who owns the scope being bid on ("scope_client"). Anyone else is null.
 */
export async function getBidViewerRole(
  userId: string,
  bid: typeof bids.$inferSelect,
): Promise<BidViewerRole> {
  if (await isSquadMember(userId, bid.squadId)) return 'owner_squad';

  const [scope] = await db
    .select({ clientId: scopes.clientId })
    .from(scopes)
    .where(eq(scopes.id, bid.scopeId))
    .limit(1);
  if (scope?.clientId === userId) return 'scope_client';

  return null;
}

/**
 * Redact a bid for the client's view before bidding closes. Clients should not
 * see a competing squad's internal pricing/approach until reveal; they see only
 * the metadata needed to know a bid exists.
 */
export function redactBidForClient(bid: typeof bids.$inferSelect) {
  return {
    id: bid.id,
    scopeId: bid.scopeId,
    squadId: bid.squadId,
    status: bid.status,
    submittedById: bid.submittedById,
    createdAt: bid.createdAt,
    updatedAt: bid.updatedAt,
  };
}

/**
 * Whether a user may view a scope. Public scopes are visible to any
 * authenticated user; confidential/NDA scopes are visible only to the client
 * who owns them (squad-invite flows can extend this later).
 */
export async function canViewScope(
  userId: string,
  scope: typeof scopes.$inferSelect,
): Promise<boolean> {
  if (scope.clientId === userId) return true;
  return (scope.confidentiality ?? 'public') === 'public';
}
