# SP3ND Agent Skill

The SP3ND Agent Skill lets an agent create server-priced physical-goods orders, wait for manual quotes when required, select quoted shipping, pay payment-ready orders with USDC on Solana through x402, and track fulfillment.

## Install

```bash
npx skills add kent-x1/sp3nd-agent-skill
```

The skill follows the [Agent Skills](https://agentskills.io) format and can also be installed by copying `SKILL.md` into an agent's skills directory.

## Order lifecycle

```text
product URL + quantity
  -> server-priced cart
  -> idempotent order
      -> Ready for Payment
      -> or Awaiting Review until SP3ND supplies a quote
          -> Ready for Payment
  -> shipping selection when required
  -> server-issued x402 requirements
  -> payment
  -> fulfillment tracking
```

Mixed or unverified carts remain one order. An agent must not pay while `payment_ready` is false, while a quote is expired, or while a required shipping option is unselected. Canonical current orders use `pricing_status: "ready_for_payment"`; deprecated `quoted` may appear on legacy orders, but never makes an order payable by itself.
An `Awaiting Review` order must reach **Ready for Payment** before it becomes `Paid`; it must never skip that gate.

SP3ND is authoritative for listing data and all monetary fields. Agents submit product URLs and quantities; caller-supplied prices, totals, currency, payment recipients, and memos must never control a purchase.

For end-user purchases, send `user_wallet` so order history and points are attributed to the correct wallet.

## Reference payment example

Install the example dependencies:

```bash
npm install @solana/web3.js @solana/spl-token @solana/spl-memo dotenv
```

Copy `.env.example` to `.env`, provide the required values, and run:

```bash
node scripts/x402-pay-with-memo.mjs
```

The example:

- creates an order with a stable `Idempotency-Key`;
- stops or polls when SP3ND is reviewing the order;
- requires an opaque server-returned shipping option when applicable;
- refreshes and validates quote revision, expiry, and payment readiness;
- constructs payment only from the HTTP 402 amount, asset, recipient, memo, and resource;
- submits the signed payload only to SP3ND, which owns verification and settlement;
- reads the order before any retry when settlement or confirmation is uncertain.

## Documentation and discovery

- API documentation: <https://sp3nd.shop/partner-api/docs>
- Partner dashboard: <https://sp3nd.shop/partner-api/dashboard>
- Agent card: <https://sp3nd.shop/.well-known/agent-card.json>
- Published skill: <https://sp3nd.shop/skill.md>
- Support: <support@sp3nd.shop>

## License

Apache 2.0
