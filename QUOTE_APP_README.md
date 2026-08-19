# Two-Sided Quote App

Two static, no-backend web apps for Premium Kosher Tours:

- **`/owner`** — your dashboard. Install it on your phone (Add to Home Screen — it's a PWA, works offline). Manage your tour catalog, build client quotes, move each quote through **Initiated → Thinking → Completed**, manage the restaurant list, and set your payment instructions.
- **`/client`** — what a client sees. It has no data of its own; everything it shows (tours, dates, prices, payment info, restaurant list) is encoded directly into the link you send them, after the `#`. Opening the link decodes and displays it — no login, no server, no database.

## How to use it

1. Deploy the whole repo as a static site (e.g. GitHub Pages). You'll get a URL like `https://<you>.github.io/PKT-new-def-/`.
2. Open `/owner/index.html`, go to **Settings**, and set **Client App Base URL** to `https://<you>.github.io/PKT-new-def-/client/index.html`.
3. In **Settings**, also add your Iuniverso payment instructions and wire transfer details — these get embedded into every quote link you generate from then on.
4. Add your tours in the **Tours** tab (name + description, no price — price is set per quote).
5. Add restaurants in the **Restaurants** tab with their website/reservation URLs.
6. In **Quotes**, create a quote: pick the client's tours, set the date and price for each, save. Click **Copy Client Link** and send it to the client (WhatsApp, email, etc.).
7. Track the quote's stage (Initiated / Thinking / Completed) from the **Quotes** pipeline — this is only visible to you, never to the client.

## What the client sees

Opening the link shows their itinerary with prices and a running total, an **Add to Calendar** button per tour (and one for the whole trip) that downloads a `.ics` file their phone's calendar app can import, your payment instructions (Iuniverso + wire transfer), and the restaurant list with direct links to each restaurant's own site so they can reserve without going through you.

## Limitations of this no-backend design

- A client link is a **snapshot**. If you edit the quote or your payment/restaurant info afterward, previously sent links won't update — regenerate and resend the link if something changes.
- All owner data (tours, quotes, restaurants, settings) lives in your browser's local storage. It doesn't sync across devices/browsers. If you want quotes to be centrally stored and live-updating across devices, that requires adding a real backend (e.g. Firebase or Supabase) — a natural next step if you outgrow this.
