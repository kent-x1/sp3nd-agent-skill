import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

// Execute the example that consumers actually install, with every request mocked.
function example() {
  const skill = readFileSync(new URL('../SKILL.md', import.meta.url), 'utf8');
  const code = skill.split('## Minimal lifecycle example')[1]
    .match(/```javascript\n([\s\S]*?)\n```/)[1];
  const requests = [];
  const context = vm.createContext({
    URL,
    Date,
    process: { env: { SP3ND_API_KEY: 'fixture-key', SP3ND_API_SECRET: 'fixture-secret' } },
    fetch: async (url, options) => {
      requests.push({ url, headers: options.headers, body: JSON.parse(options.body) });
      return {
        ok: true,
        json: async () => url.endsWith('/createPartnerCart')
          ? { cart: { cart_id: 'fixture-cart' } }
          : { order: { order_id: 'fixture-order' } },
      };
    },
  });
  vm.runInContext(code, context);
  return { context, requests };
}

const checkout = {
  productUrl: 'https://collectorcrypt.com/assets/solana/7YttLkHDoaP9V2i1tDXQXgEu5jJxmJJfyPntfMf4EoZz',
  userWallet: 'fixture-buyer',
  email: 'buyer@example.com',
  shippingAddress: { country: 'US' },
  checkoutKey: 'stable-checkout-key',
};

const cardOrder = () => ({
  order_id: 'fixture-order',
  order_type: 'collector_crypt_card',
  user_wallet: checkout.userWallet,
  payment_ready: true,
  pricing_status: 'ready_for_payment',
  quote_expires_at: new Date(Date.now() + 60_000).toISOString(),
});

test('card example submits URL pricing and wallet delivery, then prepares card payment', async () => {
  const { context, requests } = example();
  await context.beginCheckout(checkout);
  const [cart, order] = requests;
  assert.equal(cart.body.items[0].product_url, checkout.productUrl);
  assert.equal(cart.body.items[0].quantity, 1);
  assert.equal('price' in cart.body.items[0], false);
  assert.equal(order.body.user_wallet, checkout.userWallet);
  assert.equal(order.body.asset_recipient_wallet, checkout.userWallet);
  assert.equal('shipping_address' in order.body, false);
  assert.equal(order.headers['Idempotency-Key'], checkout.checkoutKey);
  await context.requestPayment(cardOrder());
  assert.equal(requests.at(-1).url.endsWith('/partnerPayment'), true);
  assert.equal(requests.at(-1).body.action, 'prepare');
  assert.equal(requests.at(-1).body.payer_address, checkout.userWallet);
});

test('card example refuses invalid readiness or expiry without requesting payment', async () => {
  const { context, requests } = example();
  for (const invalid of [
    { payment_ready: false },
    { payment_ready: 'false' },
    { quote_expires_at: null },
    { quote_expires_at: 'invalid' },
    { quote_expires_at: '2000-01-01T00:00:00Z' },
  ]) {
    await assert.rejects(context.requestPayment({ ...cardOrder(), ...invalid }));
  }
  assert.equal(requests.length, 0);
});

test('shipped-product example retains physical delivery and the existing x402 route', async () => {
  const { context, requests } = example();
  await context.beginCheckout({ ...checkout, productUrl: 'https://www.amazon.com/dp/B08XYZ123' });
  assert.equal(requests.at(-1).body.shipping_address.country, 'US');
  assert.equal('asset_recipient_wallet' in requests.at(-1).body, false);
  await context.requestPayment({ ...cardOrder(), order_type: 'physical_shipping' });
  assert.equal(requests.at(-1).url.endsWith('/payAgentOrder'), true);
});
