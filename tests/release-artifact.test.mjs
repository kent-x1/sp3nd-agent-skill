import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const references = ['references/collector-crypt.md'];
const documents = ['SKILL.md', 'README.md', ...references];

function assertRelativeLinksExist(file) {
  const markdown = readFileSync(file, 'utf8');
  for (const [, target] of markdown.matchAll(/\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    if (/^(?:[a-z][a-z\d+.-]*:|#|\/)/i.test(target)) continue;
    const relativePath = decodeURIComponent(target.split(/[?#]/)[0]);
    assert.ok(
      existsSync(resolve(dirname(file), relativePath)),
      `${file} links to missing packaged file ${target}`,
    );
  }
}

test('release metadata uses one synchronized version', () => {
  const agentCardVersion = JSON.parse(read('agent-card.json')).version;
  const clawhubVersion = JSON.parse(read('clawhub.json')).version;
  const skillVersion = read('SKILL.md').match(/^\s*version:\s*([^\s]+)$/m)?.[1];
  const publishSkillVersion = read('publish/SKILL.md').match(
    /^\s*version:\s*([^\s]+)$/m,
  )?.[1];

  assert.equal(agentCardVersion, '1.11.0');
  assert.equal(clawhubVersion, agentCardVersion);
  assert.equal(skillVersion, agentCardVersion);
  assert.equal(publishSkillVersion, agentCardVersion);
});

test('published documentation mirrors remain exact', () => {
  for (const path of documents) {
    assert.equal(read(`publish/${path}`), read(path), `${path} publish mirror`);
  }
  assert.equal(read('.well-known/skills/default/skill.md'), read('SKILL.md'));
  for (const path of references) {
    assert.equal(read(`.well-known/skills/default/${path}`), read(path));
  }
});

test('source, published, and discovery documentation resolve relative links', () => {
  for (const path of documents) {
    assertRelativeLinksExist(join(root, path));
    assertRelativeLinksExist(join(root, 'publish', path));
  }
  for (const path of ['skill.md', ...references]) {
    assertRelativeLinksExist(join(root, '.well-known/skills/default', path));
  }
});

test('ClawHub stages canonical documents and runnable payment examples', () => {
  const workflow = read('.github/workflows/publish-clawhub.yml');

  for (const expected of [
    "- '.env.example'",
    "- 'scripts/**'",
    "- 'references/**'",
    "- 'tests/**'",
    "- 'publish/**'",
    "- '.well-known/skills/default/**'",
    'node --test tests/*.test.mjs',
    'cp SKILL.md publish/SKILL.md',
    'cp README.md publish/README.md',
    'cp .env.example publish/.env.example',
    'cp scripts/x402-pay-with-memo.mjs publish/scripts/x402-pay-with-memo.mjs',
    'cp references/collector-crypt.md publish/references/collector-crypt.md',
  ]) {
    assert.match(workflow, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  const ignored = new Set(
    read('.clawhubignore')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#')),
  );
  assert.equal(ignored.has('scripts/'), false);
  assert.equal(ignored.has('.env.example'), false);
  assert.equal(ignored.has('references/'), false);

  const stagingRoot = mkdtempSync(join(tmpdir(), 'sp3nd-release-'));
  try {
    for (const [, source, target] of workflow.matchAll(/^\s*cp ([^\s]+) ([^\s]+)$/gm)) {
      const destination = join(stagingRoot, target);
      mkdirSync(dirname(destination), { recursive: true });
      cpSync(join(root, source), destination);
    }
    for (const path of documents) {
      const staged = join(stagingRoot, 'publish', path);
      assert.equal(readFileSync(staged, 'utf8'), read(path));
      assertRelativeLinksExist(staged);
    }
    for (const path of ['agent-card.json', 'clawhub.json', '.env.example', 'scripts/x402-pay-with-memo.mjs']) {
      assert.equal(readFileSync(join(stagingRoot, 'publish', path), 'utf8'), read(path));
    }
  } finally {
    rmSync(stagingRoot, { recursive: true, force: true });
  }
});

test('Collector Crypt discovery describes single-card manual wallet fulfillment', () => {
  const card = JSON.parse(read('agent-card.json'));
  const contract = card.collectorCryptContract;
  assert.equal(card.capabilities.collectorCryptSearch, true);
  assert.equal(card.capabilities.walletAssetDelivery, true);
  assert.equal(card.capabilities.manualWalletAssetFulfillment, true);
  assert.equal(card.capabilities.automatedWalletAssetFulfillment, false);
  assert.equal(contract.provider, 'collectorcrypt');
  assert.equal(contract.cartItemLimit, 1);
  assert.equal(contract.quantity, 1);
  assert.equal(contract.mixedCarts, false);
  assert.equal(contract.shippingAddressRequired, false);
  assert.equal(contract.assetRecipientField, 'asset_recipient_wallet');
  assert.equal(contract.fulfillmentMode, 'manual');
  assert.equal(contract.requiresManualFulfillment, true);
  assert.equal(contract.partnerOptInRequired, false);
  assert.ok(contract.fulfillmentStatuses.includes('pending_acquisition'));
  assert.ok(contract.fulfillmentStatuses.includes('delivered'));

  const skills = new Map(card.skills.map((skill) => [skill.id, skill]));
  assert.equal(skills.get('search-collector-crypt-cards').endpoint, '/searchCollectorCryptCards');
  const cart = skills.get('create-cart').parameters;
  assert.deepEqual(cart.items.items.provider.enum, ['collectorcrypt']);
  assert.equal(cart.items.items.nft_address.type, 'string');
  assert.equal(cart.items.items.product_url.type, 'string');
  const order = skills.get('create-order');
  assert.equal(order.parameters.shipping_address.required, false);
  assert.equal(order.parameters.user_wallet.type, 'string');
  assert.equal(order.parameters.asset_recipient_wallet.type, 'string');
  for (const field of ['asset_recipient_wallet', 'fulfillment_mode', 'fulfillment_status', 'requires_manual_fulfillment', 'asset_transfer_signature']) {
    assert.ok(order.outputLifecycleFields.includes(field), `missing ${field}`);
  }
});

test('card payments use prepare/submit while existing non-card x402 remains available', () => {
  const card = JSON.parse(read('agent-card.json'));
  const contract = card.collectorCryptContract;
  assert.equal(contract.paymentEndpoint, '/partnerPayment');
  assert.deepEqual(contract.paymentActions, ['prepare', 'submit']);
  assert.equal(contract.createPartnerTransactionSupported, false);
  assert.equal(contract.payAgentOrderSupported, false);

  const skills = new Map(card.skills.map((skill) => [skill.id, skill]));
  for (const action of ['prepare', 'submit']) {
    const skill = skills.get(`${action}-collector-crypt-payment`);
    assert.equal(skill.endpoint, '/partnerPayment');
    assert.equal(skill.method, 'POST');
    assert.equal(skill.authentication, true);
    assert.equal(skill.parameters.action.const, action);
    assert.equal(skill.parameters.action.required, true);
    assert.equal(skill.parameters.order_id.required, true);
  }
  const prepare = skills.get('prepare-collector-crypt-payment');
  assert.equal(prepare.parameters.payer_address.required, true);
  for (const field of ['unsigned_transaction_base64', 'amount_atomic', 'token_mint', 'payer_address', 'recent_blockhash', 'last_valid_block_height']) {
    assert.ok(prepare.responseFields.includes(field), `missing ${field}`);
  }
  assert.equal(skills.get('submit-collector-crypt-payment').parameters.signed_transaction_base64.required, true);

  const x402 = skills.get('pay-order');
  assert.equal(card.capabilities.x402Payment, true);
  assert.equal(x402.endpoint, '/payAgentOrder');
  assert.deepEqual(x402.x402, {
    enabled: true,
    asset: 'server_authoritative',
    network: 'server_authoritative',
    facilitator: 'https://facilitator.payai.network',
  });
});
