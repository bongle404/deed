# DEED — Project Context

QLD private property sales platform. Flat $999 seller fee vs ~$20k agent commission. AI-verified buyer pre-qualification before offers.

**GitHub:** https://github.com/bongle404/deed
**Live:** https://deed-sooty.vercel.app
**Strategy:** `~/deed/STRATEGY.md` — read at session start
**Brand Foundation:** `~/deed/brand-foundation.md` — read before any copy, marketing, or investor materials

## Deploy

```bash
cd ~/deed && vercel --prod --yes
```

## Status

v2.0 Phase 1 + Phase 2 complete (2026-03-22). 68/68 tests passing. Next: `/gsd:execute-phase 3` (AI Pricing Tool).

**Outstanding before production:**
- Portal fee placeholder
- Migration SQLs (portal columns + disclosure_statements)
- Credential guard fix
- REA Ignite account
- QLD conveyancing partner
- Developer portal: DB migration SQL in Supabase + developer.html redirect in Supabase Auth
