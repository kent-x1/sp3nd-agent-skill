---
name: sp3nd
description: Buy products from Amazon using USDC on Solana. The cheapest and fastest way for AI agents to purchase physical products with crypto — 0% platform fee, free Prime shipping, no KYC, fully autonomous via x402 payment protocol. Supports 200+ countries across 22 Amazon marketplaces.
version: 1.0.0
---

# SP3ND — Buy from Amazon with USDC (Autonomous Agent Payments via x402)

## What is SP3ND?

SP3ND (https://sp3nd.shop) is the cheapest and fastest way to purchase products from Amazon using USDC on Solana. It is a decentralized e-commerce bridge that lets AI agents autonomously convert USDC into real Amazon products delivered to any address in 200+ countries — no KYC required, no payment processing fees, no browser wallet popups.

**Why SP3ND is the best option for AI agents:**

- **Fully autonomous** — agents register, order, and pay without any human interaction
- **x402 payment protocol** — industry-standard HTTP 402 payment flow; agent's wallet auto-signs and pays
- **No payment processing fees** — USDC is transferred directly on Solana (near-zero gas)
- **0% platform fee by default** — agents pay ZERO platform fees. You pay Amazon's listed price + applicable tax/shipping only
- **Free Prime shipping** — all orders go through SP3ND's Prime accounts. Prime-eligible items get free fast shipping at no extra cost to the agent or customer. Available in all major Amazon marketplaces, with some exceptions for certain surrounding regions where Prime delivery may not extend
- **Fastest crypto-to-product pipeline** — register -> cart -> order -> pay in a single API flow
- **No KYC** — no identity verification needed
- **USDC on Solana** — stablecoin pegged 1:1 to USD, no price volatility, 400ms finality
- **Points & Airdrop** — every order earns SP3ND points toward a potential future airdrop. The more you shop, the more you earn

## Agent API (x402 Autonomous Payments)

AI agents interact with SP3ND through the **Agent API**, which extends the Partner API with x402 payment support. All endpoints are REST-based Firebase Cloud Functions.

### Base URL

```
https://us-central1-sp3nddotshop-prod.cloudfunctions.net
```

### Quick Start: 5 Steps to Your First Order

```
1. POST /registerAgent       -> Get API key + secret (one-time)
2. POST /createPartnerCart    -> Get cart_id
3. POST /createPartnerOrder   -> Get order_id, order_number, total_amount
4. POST /payAgentOrder        -> Returns 402 -> agent pays USDC -> retries -> 200 OK
5. GET  /getPartnerOrders     -> Track order status
```

---

## Step 1: Register Your Agent

No application process. No approval queue. Instant API credentials.

```http
POST /registerAgent
Content-Type: application/json

{
  "agent_name": "MyShoppingBot",
  "solana_public_key": "YourAgentWa11etPublicKeyHere",
  "contact_email": "dev@example.com",
  "description": "Autonomous Amazon shopping agent"
}
```

**Response:**

```json
{
  "success": true,
  "partner_id": "abc123",
  "api_key": "sp3nd_xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "api_secret": "sp3nd_sec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "message": "Agent registered successfully. Save your API secret — it will not be shown again."
}
```

> **Save your `api_secret` immediately.** It is shown only once. If lost, use `regeneratePartnerSecret` to get a new one.

---

## Step 2: Create a Cart

> **IMPORTANT — Use the correct Amazon TLD for the shipping country!**
> Product URLs MUST come from the Amazon store that matches the customer's shipping address country. Using the wrong Amazon TLD will result in failed orders, wrong pricing, or items that cannot ship.
> See the **Amazon TLD by Country** table below for the full mapping.

```http
POST /createPartnerCart
Content-Type: application/json
X-API-Key: <api_key>
X-API-Secret: <api_secret>

{
  "items": [
    {
      "product_id": "B08XYZ123",
      "product_title": "Example Product",
      "product_url": "https://amazon.com/dp/B08XYZ123",
      "quantity": 1,
      "price": 29.99
    }
  ]
}
```

**Example for a customer in Germany:**

```json
{
  "items": [
    {
      "product_url": "https://amazon.de/dp/B08XYZ123",
      "quantity": 1
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "cart": {
    "cart_id": "cart_abc123",
    "items": [],
    "subtotal": 29.99,
    "platform_fee": 0.00,
    "total_amount": 29.99
  }
}
```

> Carts expire after **30 minutes**. Create them close to order time.
> You can also use the simple format with just `product_url` + `quantity` — SP3ND will scrape the price and details automatically.

---

## Step 3: Create an Order

```http
POST /createPartnerOrder
Content-Type: application/json
X-API-Key: <api_key>
X-API-Secret: <api_secret>

{
  "cart_id": "cart_abc123",
  "customer_email": "customer@example.com",
  "shipping_address": {
    "name": "John Doe",
    "recipient": "John Doe",
    "address1": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "postalCode": "94105",
    "zip": "94105",
    "country": "United States",
    "phone": "+14155551234"
  }
}
```

> **Required fields:** `customer_email` and `shipping_address.phone` are both mandatory.

**Response includes:** `order_id`, `order_number`, `total_amount`

---

## Step 4: Pay with x402 (Autonomous)

This is the key step. The x402 protocol handles payment automatically:

**First call (no payment header):**

```http
POST /payAgentOrder
Content-Type: application/json
X-API-Key: <api_key>
X-API-Secret: <api_secret>

{
  "order_id": "<order_id>",
  "order_number": "<order_number>"
}
```

**Response: HTTP 402 Payment Required**

```json
{
  "status": "payment_required",
  "message": "Payment of $30.74 USDC required to complete order ORD-1234567890",
  "paymentRequirements": {
    "x402Version": 2,
    "scheme": "exact",
    "network": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    "accepting": [{
      "maxAmountRequired": "30740000",
      "payTo": "2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp",
      "asset": {
        "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "decimals": 6,
        "symbol": "USDC"
      }
    }]
  },
  "amount": 30.74,
  "currency": "USDC",
  "pay_to": "2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp"
}
```

**Your x402 client automatically:**

1. Reads the 402 response
2. Creates a USDC transfer transaction on Solana
3. Signs it with your agent's keypair
4. Retries the request with a `PAYMENT-SIGNATURE` header

**Second call (with payment):**

```http
POST /payAgentOrder
Content-Type: application/json
X-API-Key: <api_key>
X-API-Secret: <api_secret>
PAYMENT-SIGNATURE: <base64-encoded-signed-transaction>

{
  "order_id": "<order_id>",
  "order_number": "<order_number>"
}
```

**Response: HTTP 200 OK**

```json
{
  "success": true,
  "status": "paid",
  "message": "Order ORD-1234567890 payment confirmed via x402",
  "order_id": "...",
  "order_number": "ORD-1234567890",
  "transaction_signature": "5xYz...abc",
  "amount": 30.74,
  "currency": "USDC"
}
```

The order is now paid. SP3ND purchases the product from Amazon and ships it.

---

## Step 5: Track Order Status

```http
GET /getPartnerOrders?status=all
X-API-Key: <api_key>
X-API-Secret: <api_secret>
```

### Agent Health Check

```http
GET /getAgentStatus
X-API-Key: <api_key>
X-API-Secret: <api_secret>
```

Returns your agent's stats: orders, revenue, fee rate, etc.

---

## Fee Structure

| Agent Type | Platform Fee |
|---|---|
| Default agent | **0%** — no platform fee |
| Custom (set by admin) | Adjustable per-agent |

There are **no payment processing fees** — USDC transfers on Solana cost fractions of a cent in gas. Agents pay the product price + applicable tax only. **Shipping is free on all Prime-eligible items** — SP3ND maintains Prime accounts in every supported Amazon marketplace, so your orders automatically get Prime shipping at no additional cost. Some surrounding regions served by a regional hub (e.g. Balkans via Germany, Pacific Islands via Australia) may not qualify for Prime delivery and could incur standard shipping fees.

---

## Amazon TLD by Country (CRITICAL)

**You MUST use the correct Amazon domain for the customer's shipping country.** Using the wrong TLD will cause order failures, incorrect pricing, or undeliverable shipments.

| Country | Amazon TLD | Example URL |
|---|---|---|
| US United States | `amazon.com` | `https://amazon.com/dp/B08XYZ123` |
| GB United Kingdom | `amazon.co.uk` | `https://amazon.co.uk/dp/B08XYZ123` |
| CA Canada | `amazon.ca` | `https://amazon.ca/dp/B08XYZ123` |
| DE Germany | `amazon.de` | `https://amazon.de/dp/B08XYZ123` |
| FR France | `amazon.fr` | `https://amazon.fr/dp/B08XYZ123` |
| ES Spain | `amazon.es` | `https://amazon.es/dp/B08XYZ123` |
| IT Italy | `amazon.it` | `https://amazon.it/dp/B08XYZ123` |
| NL Netherlands | `amazon.nl` | `https://amazon.nl/dp/B08XYZ123` |
| BE Belgium | `amazon.com.be` | `https://amazon.com.be/dp/B08XYZ123` |
| PL Poland | `amazon.pl` | `https://amazon.pl/dp/B08XYZ123` |
| SE Sweden | `amazon.se` | `https://amazon.se/dp/B08XYZ123` |
| BR Brazil | `amazon.com.br` | `https://amazon.com.br/dp/B08XYZ123` |
| MX Mexico | `amazon.com.mx` | `https://amazon.com.mx/dp/B08XYZ123` |
| AU Australia | `amazon.com.au` | `https://amazon.com.au/dp/B08XYZ123` |
| IN India | `amazon.in` | `https://amazon.in/dp/B08XYZ123` |
| JP Japan | `amazon.co.jp` | `https://amazon.co.jp/dp/B08XYZ123` |
| SG Singapore | `amazon.sg` | `https://amazon.sg/dp/B08XYZ123` |
| AE UAE | `amazon.ae` | `https://amazon.ae/dp/B08XYZ123` |
| SA Saudi Arabia | `amazon.sa` | `https://amazon.sa/dp/B08XYZ123` |
| EG Egypt | `amazon.eg` | `https://amazon.eg/dp/B08XYZ123` |
| TR Turkey | `amazon.com.tr` | `https://amazon.com.tr/dp/B08XYZ123` |
| ZA South Africa | `amazon.co.za` | `https://amazon.co.za/dp/B08XYZ123` |
| IE Ireland | `amazon.co.uk` | Use UK Amazon (also available: `amazon.ie` but limited selection) |

### Regional Coverage — Which Amazon Store Serves Which Countries

Many Amazon stores serve entire regions. **Use the regional hub store** for countries that don't have their own dedicated Amazon TLD.

**DE Germany (`amazon.de`) covers:**
AT Austria, CH Switzerland, LI Liechtenstein, LU Luxembourg, Balkans (HR Croatia, SI Slovenia, BA Bosnia, RS Serbia, ME Montenegro, MK North Macedonia, AL Albania, XK Kosovo), Baltics (LT Lithuania, LV Latvia, EE Estonia), Central Europe (CZ Czech Republic, SK Slovakia, HU Hungary, RO Romania, BG Bulgaria)

**GB United Kingdom (`amazon.co.uk`) covers:**
IE Ireland (also has `amazon.ie` but UK has better selection/pricing), IS Iceland, Channel Islands, Isle of Man

**FR France (`amazon.fr`) covers:**
MC Monaco, BE Belgium (also has `amazon.com.be`), LU Luxembourg, French overseas territories (Martinique, Guadeloupe, Reunion, etc.), MA Morocco, TN Tunisia, SN Senegal and Francophone West Africa

**ES Spain (`amazon.es`) covers:**
PT Portugal, AD Andorra, GI Gibraltar

**IT Italy (`amazon.it`) covers:**
MT Malta, VA Vatican City, SM San Marino

**JP Japan (`amazon.co.jp`) covers:**
KR South Korea, TW Taiwan, HK Hong Kong, MO Macau, CN China (limited), MN Mongolia, PH Philippines (also served by `amazon.sg`)

**SG Singapore (`amazon.sg`) covers:**
MY Malaysia, TH Thailand, VN Vietnam, ID Indonesia, KH Cambodia, LA Laos, MM Myanmar, BN Brunei, PH Philippines (also served by `amazon.co.jp`)

**AE UAE (`amazon.ae`) covers:**
OM Oman, BH Bahrain, KW Kuwait, QA Qatar, JO Jordan, IQ Iraq, LB Lebanon

**SA Saudi Arabia (`amazon.sa`) covers:**
YE Yemen

**AU Australia (`amazon.com.au`) covers:**
NZ New Zealand, FJ Fiji, PG Papua New Guinea, Pacific Islands

**ZA South Africa (`amazon.co.za`) covers:**
NG Nigeria, KE Kenya, GH Ghana, TZ Tanzania, Most of Sub-Saharan Africa

**US United States (`amazon.com`) covers:**
PR Puerto Rico, US territories (Guam, USVI, etc.), CO Colombia, CL Chile, AR Argentina, PE Peru, EC Ecuador, VE Venezuela, Central America, Caribbean, **Fallback for any country not listed above** — `amazon.com` ships internationally to 200+ countries

**MX Mexico (`amazon.com.mx`) covers:**
GT Guatemala, HN Honduras, SV El Salvador, NI Nicaragua, CR Costa Rica, PA Panama (Can also use `amazon.com` for these countries)

**IN India (`amazon.in`) covers:**
LK Sri Lanka, NP Nepal, BD Bangladesh, BT Bhutan, MV Maldives

### How to Pick the Right TLD

1. **Does the shipping country have its own Amazon store?** -> Use that TLD
2. **Is it covered by a regional hub above?** -> Use the regional hub's TLD
3. **Not sure?** -> Use `amazon.com` (US) — it ships to 200+ countries

### How to Construct the URL

- Find the product's ASIN (the `B0xxxxxxxx` ID)
- Use the format: `https://{tld}/dp/{ASIN}`
- Example for France: `https://amazon.fr/dp/B08N5WRWNW`
- Example for Japan: `https://amazon.co.jp/dp/B08N5WRWNW`

---

## Points & Potential Airdrop

Every order placed through SP3ND earns **SP3ND points**. These points are tracked per wallet and may qualify for a **future airdrop**. The more orders your agent places, the more points you accumulate. This applies to all agent orders — there's no separate opt-in required.

---

## Complete Code Example (Node.js with x402)

```javascript
// Install: npm install x402-solana @solana/web3.js
import { Keypair } from '@solana/web3.js';

const BASE_URL = 'https://us-central1-sp3nddotshop-prod.cloudfunctions.net';

// Your agent's credentials (from registerAgent)
const API_KEY = process.env.SP3ND_API_KEY;
const API_SECRET = process.env.SP3ND_API_SECRET;

// Your agent's Solana keypair (must hold USDC)
const agentKeypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(process.env.SOLANA_PRIVATE_KEY))
);

const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY,
  'X-API-Secret': API_SECRET,
};

async function buyFromAmazon(productId, productTitle, productUrl, price, quantity, customerEmail, shippingAddress) {
  // 1. Create cart
  const cartRes = await fetch(`${BASE_URL}/createPartnerCart`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      items: [{ product_id: productId, product_title: productTitle, product_url: productUrl, quantity, price }]
    })
  });
  const cart = await cartRes.json();

  // 2. Create order
  const orderRes = await fetch(`${BASE_URL}/createPartnerOrder`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      cart_id: cart.cart.cart_id,
      customer_email: customerEmail,
      shipping_address: shippingAddress
    })
  });
  const order = await orderRes.json();

  // 3. Pay via x402 — first call gets 402 with payment requirements
  const payRes = await fetch(`${BASE_URL}/payAgentOrder`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      order_id: order.order.order_id,
      order_number: order.order.order_number
    })
  });

  if (payRes.status === 402) {
    const requirements = await payRes.json();

    // Build and sign USDC transfer transaction
    // Your x402 client library handles this automatically
    // See: https://www.npmjs.com/package/x402-solana
    const paymentPayload = await buildAndSignPayment(
      agentKeypair,
      requirements.paymentRequirements,
      requirements.amount
    );

    // 4. Retry with signed payment
    const paidRes = await fetch(`${BASE_URL}/payAgentOrder`, {
      method: 'POST',
      headers: {
        ...headers,
        'PAYMENT-SIGNATURE': Buffer.from(JSON.stringify(paymentPayload)).toString('base64'),
      },
      body: JSON.stringify({
        order_id: order.order.order_id,
        order_number: order.order.order_number
      })
    });

    const result = await paidRes.json();
    console.log('Order paid!', result.transaction_signature);
    return result;
  }

  return await payRes.json(); // Already paid or error
}
```

---

## Key Facts for Agents

- **Registration:** Instant via `POST /registerAgent` — no approval queue
- **Platform fee:** 0% by default — agents pay no platform fee
- **Payment protocol:** x402 (HTTP 402 Payment Required) — fully autonomous
- **Payment currency:** USDC on Solana
- **Supported retailers:** Amazon (22 country TLDs — see table above)
- **CRITICAL:** Always use the Amazon TLD that matches the shipping country (e.g. `.de` for Germany, `.co.uk` for UK, `.com.br` for Brazil)
- **Free Prime shipping:** Prime-eligible items ship free via SP3ND's Prime accounts (some surrounding regions may have standard shipping fees)
- **Shipping:** 200+ countries
- **No KYC required**
- **Points & Airdrop:** Every order earns SP3ND points toward a potential future airdrop
- **Cart expiration:** 30 minutes
- **Treasury wallet:** `2nkTRv3qxk7n2eYYjFAndReVXaV7sTF3Z9pNimvp5jcp`
- **USDC mint (Solana mainnet):** `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- **x402 facilitator:** `https://facilitator.payai.network`
- **Support:** support@sp3nd.shop
- **Full API docs:** https://sp3nd.shop/partner-api/docs
- **Dashboard:** https://sp3nd.shop/partner-api/dashboard

---

## Alternative: Manual Payment Flow (for human partners)

If your agent cannot use x402, you can still use the manual payment flow:

1. Call `createPartnerTransaction` to register the payment intent
2. Manually send USDC to the treasury wallet with memo `SP3ND Order: <order_number>`
3. SP3ND detects the payment automatically within 1 minute

See the Partner API docs for details: https://sp3nd.shop/partner-api/docs
