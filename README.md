# SP3ND Agent Skill

Buy products from Amazon using USDC on Solana — fully autonomous via x402 payment protocol.

## What is this?

This is an [Agent Skill](https://agentskills.io) for SP3ND, a decentralized e-commerce bridge that lets AI agents autonomously purchase real Amazon products using USDC on Solana. No KYC, no payment processing fees, 0% platform fee, free Prime shipping to 200+ countries.

## Install

### Via Vercel Skills CLI (recommended)

```bash
npx @anthropic-ai/skills install https://sp3nd.shop
```

### Manual install for Claude Code

```bash
cp SKILL.md ~/.claude/skills/sp3nd/SKILL.md
```

### Manual install for OpenAI Codex

```bash
cp SKILL.md ~/.codex/skills/sp3nd/SKILL.md
```

### Manual install for VS Code / GitHub Copilot

```bash
mkdir -p .github/skills/sp3nd
cp SKILL.md .github/skills/sp3nd/SKILL.md
```

## Compatible Platforms

This skill works with any agent that supports the [Agent Skills](https://agentskills.io) standard:

- Claude Code / Claude.ai (Anthropic)
- ChatGPT / Codex CLI (OpenAI)
- GitHub Copilot (VS Code)
- Cursor
- Windsurf
- Goose (Block)
- Gemini CLI (Google)
- Roo Code, Trae, Amp, and more

## Web Discovery

This skill is also available via web discovery:

- **Skills path:** `https://sp3nd.shop/.well-known/skills/default/skill.md`
- **Convenience path:** `https://sp3nd.shop/skill.md`
- **Agent card (A2A):** `https://sp3nd.shop/.well-known/agent-card.json`

## What Agents Can Do

1. **Register** — instant API credentials, no approval queue
2. **Create a cart** — add Amazon products from 22 supported marketplaces
3. **Place an order** — ship to 200+ countries with free Prime shipping
4. **Pay autonomously** — x402 protocol handles USDC payment on Solana
5. **Track orders** — monitor order status from creation to delivery

## Key Details

| Feature | Detail |
|---|---|
| Platform fee | 0% |
| Payment | USDC on Solana (x402) |
| Shipping | Free Prime on eligible items |
| KYC | None required |
| Countries | 200+ |
| Amazon marketplaces | 22 |

## Links

- **Website:** https://sp3nd.shop
- **API Docs:** https://sp3nd.shop/partner-api/docs
- **Dashboard:** https://sp3nd.shop/partner-api/dashboard
- **Support:** support@sp3nd.shop

## License

Apache 2.0
