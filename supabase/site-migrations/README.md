# Private Site only

These migrations apply exclusively to project `ijzpmwwjuvsgcsbcbzav` (Sol Mai - Pruebas Site). They are outside the canonical `supabase/migrations` production chain deliberately: the Site adds private test authentication and replay/idempotency ledgers, not a second booking model.

Never apply these to the salon's production database. The runtime also pins the exact isolated URL before any privileged request. See `docs/unified-source-and-deployments.md` for the integration boundary. Existing hosted migration history is not rewritten by moving these source files. New verification must distinguish the previously deployed Site from this combined source.

The original canonical migrations remain unchanged. Their `bookings`, `booking_items`, consent, capacity, hours, quotes, audit and service closure functions are reused.
