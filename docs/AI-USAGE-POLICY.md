# AI Usage Policy — ISO 42001-Lite

## Scope

This policy governs all use of AI tools in the development of **Embergrove: The Hollow Veil**.

## Approved AI Tools

| Tool            | Purpose                          | Approval Required |
|-----------------|----------------------------------|-------------------|
| GLM-5 (ZCode)   | Code generation, scaffolding     | None (approved)   |
| ChatGPT         | Design brainstorming             | None (approved)   |
| GitHub Copilot  | In-editor suggestions            | None (approved)   |

## Prohibited Uses

- **No runtime AI** — The game must never call external AI services at runtime.
- **No AI-generated assets without review** — All art, music, and narrative must be human-reviewed before inclusion.
- **No AI for player analytics** — Telemetry must not be sent to AI services.
- **No automated commits** — Every commit must be reviewed by a human operator.

## Human Review Requirements

1. **Code**: All AI-generated code must be reviewed before merge.
2. **Assets**: AI-assisted art must be vetted for consistency and quality.
3. **Narrative**: AI-generated dialogue/story must be checked for coherence and tone.
4. **Data**: JSON data files must be validated against type contracts.

## Prompt Logging

All prompts used for development are logged in `docs/PROMPTS-LOG.md` for auditability.

## Governance

This policy is reviewed at each sprint boundary. Changes require explicit approval from the project lead (Henry).

## Compliance Statement

This project follows a lightweight implementation of ISO 42001 principles:
- Establishing an AI use policy (this document)
- Impact assessment (see `docs/AIIA.md`)
- Risk management with human-in-the-loop controls
- Audit trail via prompt logging

## Version

Policy version: 1.0
Last updated: 2026-06-30
