/**
 * SP3ND Agent Payment — Full x402 Flow with Memo
 *
 * Register → Cart → Order → Build tx with memo → Verify → Settle → Paid
 *
 * Prerequisites:
 *   1. Copy .env.example to .env and fill in your credentials
 *   2. npm install @solana/web3.js @solana/spl-token @solana/spl-memo dotenv
 *   3. Ensure your wallet has >= 5 USDC on Solana mainnet
 */

import 'dotenv/config';
import {
  Connection, Keypair, PublicKey,
  TransactionMessage, VersionedTransaction, ComputeBudgetProgram
} from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferCheckedInstruction } from '@solana/spl-token';
import { createMemoInstruction } from '@solana/spl-memo';
import { readFileSync } from 'fs';

// ── Configuration (from environment) ────────────────────────────────────────
const required = (name) => {
  const val = process.env[name];
  if (!val) { console.error(`Missing required env var: ${name}`); process.exit(1); }
  return val;
};

const WALLET_PATH = process.env.AGENT_WALLET_PATH || './.wallet.json';
const API_KEY     = required('SP3ND_API_KEY');
const API_SECRET  = required('SP3ND_API_SECRET');
const RPC         = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

const BASE_URL    = 'https://us-central1-sp3nddotshop-prod.cloudfunctions.net';
const FACILITATOR = 'https://facilitator.payai.network';
const USDC_MINT   = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

const walletData = JSON.parse(readFileSync(WALLET_PATH, 'utf8'));
const keypair    = Keypair.fromSecretKey(Uint8Array.from(walletData.secret));
const connection = new Connection(RPC, 'confirmed');
const H = { 'Content-Type': 'application/json', 'X-API-Key': API_KEY, 'X-API-Secret': API_SECRET };

console.log('Agent wallet:', keypair.publicKey.toBase58());

// ── Step 1: Check USDC balance ──────────────────────────────────────────────
const tokenAccounts = await connection.getParsedTokenAccountsByOwner(keypair.publicKey, { mint: USDC_MINT });
const balance = tokenAccounts.value[0]?.account.data.parsed.info.tokenAmount.uiAmount || 0;
console.log('USDC balance:', balance);
if (balance < 5) { console.log('Low balance — top up wallet first'); process.exit(1); }

// ── Step 2: Create cart ─────────────────────────────────────────────────────
console.log('\nCreating cart...');
const cartRes = await fetch(`${BASE_URL}/createPartnerCart`, {
  method: 'POST', headers: H,
  body: JSON.stringify({ items: [{
    product_id: 'B00347A882',
    product_title: 'BIC Round Stic Xtra Life Ballpoint Pen, Medium Point, Black, 60-Count',
    product_url: 'https://www.amazon.com/dp/B00347A882',
    quantity: 1, price: 3.97
  }]})
});
const cart = await cartRes.json();
console.log('Cart:', cart.cart.cart_id, '| fee:', cart.cart.platform_fee, '| total:', cart.cart.total_amount);

// ── Step 3: Create order ────────────────────────────────────────────────────
console.log('\nCreating order...');
const orderRes = await fetch(`${BASE_URL}/createPartnerOrder`, {
  method: 'POST', headers: H,
  body: JSON.stringify({
    cart_id: cart.cart.cart_id,
    customer_email: 'test@sp3nd.shop',
    shipping_address: {
      name: 'Volt Test', recipient: 'Volt Test',
      address1: '123 Test St', city: 'Denver', state: 'CO',
      postalCode: '80202', zip: '80202',
      country: 'United States', phone: '+13035550000'
    }
  })
});
const orderData = await orderRes.json();
const order = orderData.order;
console.log('Order:', order.order_number, '| total: $' + order.total_amount);

// ── Step 4: Get 402 payment requirements ───────────────────────────────────
console.log('\nGetting payment requirements (expecting 402)...');
const firstRes = await fetch(`${BASE_URL}/payAgentOrder`, {
  method: 'POST', headers: H,
  body: JSON.stringify({ order_id: order.order_id, order_number: order.order_number }),
});

// Read PAYMENT-REQUIRED from HTTP header (not JSON body)
const paymentRequiredHeader = firstRes.headers.get('PAYMENT-REQUIRED') || firstRes.headers.get('payment-required');
if (!paymentRequiredHeader) {
  console.log('No PAYMENT-REQUIRED header found');
  process.exit(1);
}
const paymentRequired = JSON.parse(Buffer.from(paymentRequiredHeader, 'base64').toString('utf8'));
const req = paymentRequired.accepts[0];
const amountAtomic = BigInt(req.maxAmountRequired);
const payToAddress = new PublicKey(req.payTo);
const feePayerAddress = new PublicKey(req.extra.feePayer);
const orderNumber = req.extra.order_number;

console.log('Got 402 | amount:', Number(amountAtomic)/1e6, 'USDC | order:', orderNumber);
console.log('  feePayer (facilitator):', feePayerAddress.toBase58());

// ── Step 5: Build transaction WITH memo ─────────────────────────────────────
console.log('\nBuilding transaction with memo...');
const sourceATA = await getAssociatedTokenAddress(USDC_MINT, keypair.publicKey);
const destATA   = await getAssociatedTokenAddress(USDC_MINT, payToAddress);
const { blockhash } = await connection.getLatestBlockhash();
const memo = `SP3ND Order: ${orderNumber}`;

const instructions = [
  ComputeBudgetProgram.setComputeUnitLimit({ units: 30000 }),
  ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1 }),
  createTransferCheckedInstruction(
    sourceATA, USDC_MINT, destATA,
    keypair.publicKey, amountAtomic, 6
  ),
  createMemoInstruction(memo),
];

const message = new TransactionMessage({ payerKey: feePayerAddress, recentBlockhash: blockhash, instructions });
const tx = new VersionedTransaction(message.compileToV0Message());
tx.sign([keypair]);

const base64Tx = Buffer.from(tx.serialize()).toString('base64');
console.log('Transaction built + signed | memo:', memo);

// ── Step 6: Build x402 payment payload (v1 format — PayAI requires this) ───
const v1Req = {
  scheme: 'exact',
  network: 'solana',
  maxAmountRequired: req.maxAmountRequired,
  amount: req.maxAmountRequired,
  resource: req.resource,
  description: req.description,
  mimeType: req.mimeType,
  payTo: req.payTo,
  maxTimeoutSeconds: req.maxTimeoutSeconds,
  asset: req.asset,
  extra: req.extra,
};
const v1Payload = { x402Version: 1, scheme: 'exact', network: 'solana', payload: { transaction: base64Tx } };
const paymentHeader = Buffer.from(JSON.stringify(v1Payload)).toString('base64');

// ── Step 7: Verify with facilitator ────────────────────────────────────────
console.log('\nVerifying with facilitator...');
const verifyRes = await fetch(`${FACILITATOR}/verify`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ paymentPayload: v1Payload, paymentRequirements: v1Req }),
});
const verifyResult = await verifyRes.json();
console.log('Verify status:', verifyRes.status, '|', JSON.stringify(verifyResult));

if (!verifyResult.isValid) {
  console.log('Verification failed:', verifyResult.invalidReason);
  process.exit(1);
}
console.log('Verified! Payer:', verifyResult.payer);

// ── Step 8: Settle with facilitator (broadcasts to Solana) ─────────────────
console.log('\nSettling (broadcasting to Solana)...');
const settleRes = await fetch(`${FACILITATOR}/settle`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ paymentPayload: v1Payload, paymentRequirements: v1Req }),
});
const settleResult = await settleRes.json();
console.log('Settle status:', settleRes.status, '|', JSON.stringify(settleResult));

if (!settleResult.success) {
  console.log('Settlement failed:', settleResult.errorReason);
  process.exit(1);
}
console.log('Settled! Transaction:', settleResult.transaction);

// ── Step 9: Notify SP3ND backend with PAYMENT-SIGNATURE ────────────────────
console.log('\nNotifying SP3ND backend...');
const paidRes = await fetch(`${BASE_URL}/payAgentOrder`, {
  method: 'POST',
  headers: { ...H, 'PAYMENT-SIGNATURE': paymentHeader },
  body: JSON.stringify({ order_id: order.order_id, order_number: order.order_number }),
});
console.log('Backend status:', paidRes.status);
const paidResult = await paidRes.json();
console.log(JSON.stringify(paidResult, null, 2));

if (paidRes.status === 200) {
  console.log('\nFULL FLOW COMPLETE!');
  console.log('Order:', order.order_number, '-> Paid');
  console.log('Tx:', settleResult.transaction);
} else {
  console.log('\nPayment settled on-chain but backend returned:', paidRes.status);
  console.log('Memo attached:', memo);
  console.log('Tx on-chain:', settleResult.transaction);
}
