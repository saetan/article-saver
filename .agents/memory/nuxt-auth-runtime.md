---
name: Nuxt auth runtime constraints
description: Runtime immutability and deployment-setting precedence when adapting managed authentication to Nuxt.
---

Do not mutate Nitro's shared runtime configuration. Apply runtime authentication settings to the mutable request-scoped configuration, and verify startup against the actual server rather than relying only on plain-object mocks.

**Why:** Mocked configuration tests and builds passed while the real preview rejected deletion from the frozen shared configuration.

**How to apply:** Runtime configuration tests must reject use of the global configuration for mutations. Include an HTTP startup smoke check after auth configuration changes.

GitHub merges do not clear Replit-specific production environment overrides. Check their existence and precedence separately when verifying an imported authentication fix.

**Why:** An obsolete production-only proxy override survived an upstream proxy-route change and still took precedence over the intended configuration.

**How to apply:** Use Replit environment tooling to inspect non-secret configuration metadata and remove obsolete custom overrides with permission. Never inspect, replace, or rotate managed authentication secrets.
