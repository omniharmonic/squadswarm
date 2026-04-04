// TODO: Replace with real Stripe integration
// For MVP demo, payment is simulated

export function getStripeClient() {
  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  // return stripe;
  return null; // Stub — no real Stripe in MVP
}

export async function createCheckoutSession(contractId: string, amount: number) {
  // TODO: Create real Stripe Checkout session
  return {
    id: `cs_demo_${Date.now()}_${contractId}`,
    url: null, // Would be Stripe checkout URL
  };
}

export async function releasePayment(contractId: string, amount: number) {
  // TODO: Transfer via Stripe Connect
  return {
    id: `tr_demo_${Date.now()}_${contractId}`,
    amount,
    status: 'completed',
  };
}
