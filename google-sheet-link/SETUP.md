# Connect the PKT CRM to the "Client Quotes" Google Sheet

This adds a **→ Sheet** button to each quote in the CRM. Pressing it sends the quote to the
"Premium Kosher Tours: Client Quotes" sheet. Takes about 5 minutes, once.

Before you start: in the CRM, go to **Backup → Export Backup File** to keep a copy of your data.

## 1. Add the script to the sheet

1. Open the **Premium Kosher Tours: Client Quotes** Google Sheet.
2. Click **Extensions → Apps Script**. A new tab opens.
3. Delete everything in the editor and paste in all of `Code.gs` (in this folder).
4. Near the top, change `CHANGE-ME` to your own private key: any long word or phrase
   only you know, for example `pkt-panama-2027-blue`. Keep the quotes around it.
5. Click the **Save** icon (💾).

## 2. Deploy it

1. Click **Deploy → New deployment**.
2. Click the gear ⚙ next to "Select type" and choose **Web app**.
3. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy**. Google asks you to authorize: choose your account, then
   **Advanced → Go to (project name) → Allow**. This lets the script edit your sheet.
5. Copy the **Web app URL** (it ends in `/exec`).

"Anyone" only means the CRM can reach the script without signing in. Nothing is written
unless the request carries your private key.

## 3. Connect the CRM

1. Open the CRM and go to **Backup**.
2. Under **Google Sheet link**, paste the Web app URL and type the same private key.
3. Click **Save**, then **Test connection**. You should see "✓ Connected to …".

## Using it

On the **Quotes** screen, press **→ Sheet** on a quote.

- **New quote:** a new row in Clients, plus one row per day in Tours.
- **Quote already in the sheet** (same Quote / Trip Name): its details and tour rows are replaced
  with the CRM version. Status, Deposit Received, Notes and flight info are left alone.
- **Totals don't match:** Status is set to **Check** and a note explains the gap.
- **Same name, different client:** nothing is written; rename the quote in the CRM.

The quote name in the CRM becomes the Quote ID in the sheet, so use the same name to update
a quote that's already there.

The CRM adds 7% tax to every item, so tour rows sent from the CRM always use the sheet's
tax formula.

## If you change the script later

Use **Deploy → Manage deployments → ✏ Edit → Version: New version → Deploy**.
That keeps the same URL, so you don't need to change anything in the CRM.
