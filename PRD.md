<PRD>
Atlas — Product Requirements Document

1. Introduction
- Purpose: Define the scope, requirements, and acceptance criteria for Atlas, a unified assistant and analytics dashboard inspired by Cluely (contextual, real‑time desktop assistant) and Cyfe (modular, multi‑source dashboard).
- Vision: Provide one workspace to capture context, converse with multiple LLMs, automate web tasks, analyze visuals, and monitor results across boards and widgets.
- Outcomes: Faster problem‑solving, transparent automation, a persistent timeline of work, and team‑shareable dashboards.

2. Product overview
- Concept: Two primary surfaces share one core:
  - Electron overlay for capture, chat, on‑screen help, and quick actions.
  - Next.js dashboard for management, analytics, timelines, boards, and plugins.
- Differentiators:
  - Multi‑provider, hot‑swappable LLM stack (OpenAI, Anthropic, Google, Ollama).
  - Cyfe‑style boards and widgets on top of a job/timeline backbone.
  - Typed plugin bus for automations (Puppeteer) and vision (OCR/analysis).
  - Robust observability (costs, latency, success), safety, and offline fallback.
- Primary entities:
  - Job: chat|analyze|generate|automate|ingest with full metadata and artifacts.
  - Provider: OpenAI/Anthropic/Google/Ollama with common adapter API.
  - Plugin: capabilities surfaced via typed contracts (vision/automation/connectors).
  - Board/Widget: configurable dashboards composed of timeline/KPIs/data widgets.

3. Goals and objectives
- G1: Unify capture→assist→automate in one timeline with <1.5s first contentful paint and p95 pagination fetch <300ms.
- G2: Reduce context setup time by 50% via screenshot/clipboard/URL attachment to chat.
- G3: Deliver reliable automations (p95 step success ≥95%, domain‑allowlisted).
- G4: Provide cost/usage transparency (daily/weekly rollups; cost variance <±5% to provider invoices).
- G5: Support offline operation with Ollama fallback and job queueing.
- G6: Enable team sharing via role‑based access and read‑only shared boards.

4. Target audience
- Individual power users: engineers, analysts, creators needing rapid contextual help.
- Teams: product/eng/data teams sharing boards, KPIs, and timelines.
- Admins: configure providers, policies, plugins, security, and governance.

5. Features and requirements
5.1 Identity & access
- Local profiles store encrypted provider keys (OpenAI, Anthropic, Google, Ollama URL/model) in OS keychain.
- Consent prompts for screen capture, clipboard access, and automation (domain allowlist).
- Role‑based dashboard access (owner, admin, viewer) and shareable read‑only boards.

5.2 LLM & vision providers
- Providers: OpenAI (GPT‑4o, gpt‑image‑1), Anthropic (Claude 3.x incl. Claude Code), Google (Gemini 2.0), Ollama (local).
- Hot‑swap provider/model at runtime; test connectivity; list available models (esp. Ollama).
- Capabilities:
  - Chat (streaming and non‑streaming).
  - Vision (image/screenshot analysis; OCR via vision plugin).
  - Image generation (OpenAI gpt‑image‑1).

5.3 Jobs & timeline
- Job metadata: jobId, type (chat|analyze|generate|automate|ingest), status, provider, model, prompt, options, artifacts, cost, timestamps.
- Timeline UI:
  - Infinite scroll with pagination; responsive grid (1/2/4 columns).
  - Filters: date, status, type, provider, model, aspect ratio; newest/oldest sort.
  - Detail view: artifacts, parameters, cost/usage, events; rerun with same/tweaked options.
  - Download artifacts; cached previews for fast rendering.

5.4 Chat & context
- Unified chat in Electron and Dashboard.
- Context attachment: recent screenshots, selected region, clipboard text, page URL, or files/docs.
- Modes: General, Code (Claude Code), Vision‑assist (image + prompt), Automation (issues commands).
- Streaming responses with partial tokens and abort.

5.5 Capture & analysis
- Electron capture: full screen, window, region; overlay hides during capture.
- Image/audio analysis:
  - Vision summary plus suggested next actions.
  - OCR via plugin with text, confidence, and optional structured JSON.
- Background processing; jobs appended to timeline.

5.6 Image generation (OpenAI)
- Prompt options:
  - quality: low | mid | high
  - aspect ratio: 1024x1024 | 1536x1024 | 1024x1536
  - output_compression: 0–100% (default 50%)
  - output_format: webp
  - moderation: low
  - n: number of images
  - response_format: b64_json
  - model: gpt‑image‑1
- Display: correct aspect ratio inside square container; click to download.
- Storage: artifacts to app data; dashboard‑only mode persists in browser storage.

5.7 Automation & plugins
- Plugin bus (typed contracts) with:
  - Puppeteer Worker: navigate, click, type, wait, extract, screenshot; domain allowlist.
  - Vision Service: OCR and image analysis.
- Marketplace to install/enable/disable plugins; per‑plugin permissions.
- Automation jobs include step logs, parameters, and screenshots for auditability.

5.8 Boards & widgets (Cyfe‑style)
- Multi‑board dashboard (personal, team, project); TV mode (auto‑rotate boards).
- Widgets:
  - Timeline widget (filterable view of jobs).
  - KPI widgets (LLM usage, cost, latency).
  - Data widgets (CSV/API connectors), Notes, Task list (jobs‑backed).
- Layout: drag/drop, resize, save view presets.

5.9 Data ingest & connectors
- Connectors for URLs/APIs/CSV/Docs; scheduled fetches with refresh intervals and error alerts.
- Normalize into datasets; expose to widgets and chat as retrievable context (RAG‑ready).
- Data source catalog with metadata and governance tags.

5.10 Observability
- Logs: structured plugin/LLM/automation events; tailing and filters.
- Stats: per‑provider success rate, response time, tokens/cost; daily/weekly rollups.
- Health: provider and plugin connectivity checks; alerts on failures.

5.11 Moderation & safety
- Pre‑flight prompt moderation (low sensitivity default).
- Redaction/rewrites on block; user override with warning.
- Content policy tags on artifacts (safe|sensitive|pii) with masked previews.

5.12 Offline & degradation
- Offline mode: Ollama fallback; remote jobs queued until online.
- Graceful provider fallback (retry/backoff; provider failover policy).

5.13 Performance & storage
- Persistent job store (SQLite preferred; JSONL fallback) with secondary indexes for filters/pagination.
- Artifact storage on disk; dedup by hash; IndexedDB/browser cache for previews.
- Pagination‑first APIs; streaming for chat; p95 search/filter <300ms on 50k jobs.

5.14 Settings
- Manage keys & providers; default models; capture/automation policies; storage paths; theme.
- Import/export settings (redact secrets).
- “Test connection” per provider and plugin.

5.15 Security & privacy
- Encrypt secrets at rest; secure IPC channels; signed plugin manifests.
- Consent prompts for new domains/permissions; audit trail of automation actions.

5.16 Developer experience
- Provider adapter interface (chat, visionAnalyze, imageGenerate).
- Plugin SDK typed with @free‑cluely/shared; examples and test harness.
- Seed data and mock providers for local development.

6. User stories and acceptance criteria
Note: All stories are testable with explicit pass/fail criteria.

Authentication & access
- ST‑101: As a user, I can create a local profile and store provider keys in the OS keychain.
  - Acceptance:
    - Saving keys never writes to plain files/localStorage.
    - Retrieving a key requires user session unlocked.
    - Keys can be updated/removed; audit entry recorded.
- ST‑102: As an admin, I can assign roles (owner, admin, viewer) per team and board.
  - Acceptance:
    - Owner can grant/revoke roles.
    - Viewers cannot modify widgets/settings.
    - Access control enforced server‑side on API calls.
- ST‑103: As a user, I receive consent prompts when enabling screen capture, clipboard access, or automation for a new domain.
  - Acceptance:
    - Prompt shows domain/scope and expiry.
    - Deny prevents operation; entry logged.

Providers & settings
- ST‑201: As a user, I can add OpenAI, Anthropic, Google, and Ollama configurations and test connectivity.
  - Acceptance:
    - “Test connection” returns success/failure with diagnostic.
    - Ollama model list loads from host; errors handled gracefully.
- ST‑202: As a user, I can hot‑swap provider/model in chat and image generation.
  - Acceptance:
    - Active session reflects change within 1 second.
    - Timeline records provider/model used on each job.

Chat & context
- ST‑301: As a user, I can attach context (screenshot, region, clipboard text, page URL, files) to a chat.
  - Acceptance:
    - Attachments appear as chips with remove controls.
    - Provider receives content; response references attachments.
- ST‑302: As a developer, I can receive streaming responses with the ability to abort.
  - Acceptance:
    - Stream begins within 1s; abort stops token stream; partial transcript saved to job.

Capture & analysis
- ST‑401: As a user, I can capture full screen, window, or region; overlay hides during capture.
  - Acceptance:
    - Capture returns a file path and base64 preview.
    - Hidden overlay never appears in captured image.
- ST‑402: As a user, I can analyze images/audio and receive a summary, OCR text (with confidence), and suggested next steps.
  - Acceptance:
    - OCR returns text + confidence; optional JSON if templateable.
    - Analysis completes within p95 5s on single image.

Image generation
- ST‑501: As a user, I can generate images with options (quality, aspect ratio, compression, output format webp, n, moderation low, response_format b64_json, model gpt‑image‑1).
  - Acceptance:
    - Generated images display with correct intrinsic aspect ratio inside a square container.
    - Download saves as .webp; metadata stored in job.
- ST‑502: As a user, I can rerun a previous prompt with identical/tweaked options.
  - Acceptance:
    - Rerun creates a new job linked to the original; timeline updates.

Timeline & jobs
- ST‑601: As a user, I can filter/sort the timeline by date, status, type, provider, model, aspect ratio; infinite scroll loads more.
  - Acceptance:
    - P95 filter latency <300ms on 50k jobs.
    - Scroll never duplicates or skips entries; preserves sort.
- ST‑602: As a user, I can open a job detail view showing artifacts, parameters, usage/cost, and events, and download artifacts.
  - Acceptance:
    - Previews cached; detail opens within 400ms; downloads complete.

Automation & plugins
- ST‑701: As a user, I can install/enable/disable plugins from a marketplace view and grant per‑plugin permissions.
  - Acceptance:
    - Signed manifest validation passes; mismatches block install.
    - Disabling a plugin removes it from menus and API routing.
- ST‑702: As a user, I can run web automations (navigate, click, type, wait, extract, screenshot) within an allowlisted domain.
  - Acceptance:
    - Non‑allowlisted domain attempts are blocked with error.
    - Each step logs parameters, result, and a screenshot (if set).
- ST‑703: As a user, I can audit automation runs with a step timeline.
  - Acceptance:
    - Log export to JSON; sensitive data masked.

Boards & widgets
- ST‑751: As a user, I can create multiple boards (personal/team/project) and switch TV mode (auto‑rotate boards).
  - Acceptance:
    - Board switching <300ms; TV rotation interval configurable.
- ST‑752: As a user, I can add timeline, KPI (usage/cost/latency), data, notes, and task widgets; drag/drop and resize.
  - Acceptance:
    - Layout persists; view presets save/restore.
    - KPI widgets reflect last 24h/7d ranges accurately (±5%).

Data ingest & connectors
- ST‑781: As a user, I can connect URLs/APIs/CSV/Docs, schedule fetches, and view errors.
  - Acceptance:
    - Refresh intervals configurable; failures alert with message and retry.
- ST‑782: As a developer, I can use normalized datasets in widgets and as chat context (RAG‑ready).
  - Acceptance:
    - Dataset schema introspection available; tokenized chunking stats visible.

Database modeling (explicit)
- ST‑801: As a developer, I can store jobs, artifacts, providers, plugins, boards, widgets, datasets, and permissions in a normalized SQLite schema with necessary indexes.
  - Acceptance:
    - Foreign keys enforced; cascade deletes configurable.
    - Index coverage supports timeline filters with p95 <300ms on 50k jobs.

Moderation & safety
- ST‑821: As a user, I receive pre‑flight moderation with low sensitivity; blocked prompts are auto‑redacted or rewritten, with override option.
  - Acceptance:
    - Block reason shown; override requires explicit confirmation.
- ST‑822: As a developer, artifacts are tagged (safe|sensitive|pii) and masked in previews accordingly.
  - Acceptance:
    - Masking can be toggled per role; changes logged.

Offline & degradation
- ST‑851: As a user, I can operate offline using Ollama; remote jobs queue until online.
  - Acceptance:
    - Queue shows pending/sent status; auto‑retry with backoff.
- ST‑852: As an admin, I can configure provider failover order.
  - Acceptance:
    - Failover attempts recorded in job events.

Observability
- ST‑871: As a user, I can view logs and stats (success rate, response time, tokens/cost) per provider/plugin.
  - Acceptance:
    - Daily/weekly rollups accurate to ±5% vs raw data.
- ST‑872: As an admin, I receive alerts on provider/plugin health failures.
  - Acceptance:
    - Alerting channels configurable; deduplication windows applied.

Settings
- ST‑891: As a user, I can import/export settings with secrets redacted.
  - Acceptance:
    - Import validates schema; partial imports warn and skip unknown keys.

7. Technical requirements / stack
- Platforms:
  - Desktop: Electron (main, preload, renderer overlay).
  - Web: Next.js 15 dashboard (App Router), TailwindCSS, shadcn/ui, Lucide.
- Core libraries:
  - LLMs: OpenAI SDK, Anthropic SDK, Google Generative AI, Ollama HTTP API.
  - Automation: Puppeteer (plugin worker).
  - Vision/OCR: tesseract.js, sharp (plugin).
  - Storage: SQLite (better‑sqlite3/Prisma/Drizzle); IndexedDB for previews; disk for artifacts.
  - Secrets: keytar (OS keychain).
  - IPC: secure channels with schema validation.
- Architecture:
  - Provider adapters expose chat, visionAnalyze, imageGenerate with identical signatures.
  - Plugin bus (typed via @free‑cluely/shared) routes messages to workers.
  - Job service persists jobs/artifacts and exposes pagination‑first APIs.
  - Moderation service pre‑flights prompts; redaction policy configurable.
  - Health/metrics service tracks availability, latency, tokens/cost.
- Performance targets:
  - Dashboard FCP ≤1.5s on mid‑tier hardware.
  - Timeline filter/search p95 ≤300ms at 50k jobs; pagination fetch p95 ≤300ms.
  - Chat token stream start ≤1s; image analysis p95 ≤5s/image.
- Security:
  - Keys encrypted at rest; no secrets in logs.
  - Signed plugin manifests; permission gating; domain allowlist.
  - Content tagging and masked previews for sensitive artifacts.
- Testing:
  - Unit: adapters, plugins, moderation.
  - Integration: job pipeline, timeline filters, automation runs.
  - E2E: capture→analyze→rerun; provider failover; offline queue.

8. Design and user interface
- Electron overlay:
  - Capture bar: full/window/region, last capture thumbnails, settings.
  - Chat dock: provider/model picker, mode switch (General/Code/Vision/Automation), context chips, stream view, abort.
  - Quick actions: “Analyze screen”, “Generate image”, “Automate current page”.
- Dashboard:
  - Global navigation: Timeline, Boards, Plugins, Logs, Stats, Settings.
  - Timeline: responsive grid, filters at top, detail drawer with artifacts/usage/cost, rerun button.
  - Boards: draggable/resizable widgets; presets; TV mode toggle.
  - Plugins: marketplace cards, install/enable/disable, permissions.
  - Logs & stats: filterable logs, KPI cards (success, latency, spend), charts (daily/weekly).
  - Settings: providers with test buttons and model lists, policies (capture/automation), storage paths, theme, import/export.
- Accessibility & theming:
  - Keyboard shortcuts for capture, chat, and navigation.
  - Themeable (light/dark/system); high‑contrast mode.
  - Min AA contrast; focus states; reduced motion option.

</PRD>

