# HostPinnacle: How to Know If SMS Was Truly Delivered (Reseller / API)

As a reseller using the API, **your side** only knows that HostPinnacle **accepted** the message (e.g. you get a `transactionId`). **Actual delivery** (reached the handset or failed) is reported by HostPinnacle via a **Delivery Report (DLR)** callback to a URL you provide.

## How delivery confirmation works

1. You send SMS via HostPinnacle API → you get back a transaction ID (we store it as `hpTransactionId`).
2. When the message is **delivered** or **fails**, HostPinnacle sends an HTTP callback (DLR) to a **webhook URL** you configure.
3. This app’s DLR handler (`/api/sms/dlr`) receives that callback, updates the message status to **delivered** or **failed**, and (optionally) refunds on failure.
4. You see the **true** status in **SMS History** and **Delivery Summary** — that is HostPinnacle’s confirmation, not just “accepted”.

So: **to know if the SMS has truly been delivered on HostPinnacle’s side**, you must **register a DLR (webhook) URL** with HostPinnacle. Until that is set, you only see “sent” (accepted), not “delivered” or “failed”.

---

## When the webhook fails: use the portal Delivery report

If the DLR webhook is not receiving callbacks (e.g. URL unreachable, firewall, or temporary outage), you can still see delivery status on HostPinnacle:

1. Log in to the [HostPinnacle SMS Portal](https://smsportal.hostpinnacle.co.ke).
2. Go to **SMS** → **SMS reports** → **Delivery report**.
3. Use the report to see which messages were delivered or failed, and match by **Transaction ID** (stored in this app as `hpTransactionId` in SMS History).

This is a **manual fallback**; it does not update this app's SMS History automatically.

**Automated fallback (use until webhook is fixed):** The app can pull delivery reports from HostPinnacle’s Report API and update SMS History. In **Super-admin → Settings**, use **“Sync delivery reports now”** in the DLR section, or call `POST /api/super-admin/dlr-sync` (super-admin only). This uses Get Delivery Report (date range) or Check MIS by Transaction ID. For automatic updates once HostPinnacle fix the webhook, re-register the webhook (see Option A or B below).

---

## Option A: Set DLR URL in HostPinnacle Dashboard

1. Log in to [HostPinnacle SMS Portal](https://smsportal.hostpinnacle.co.ke).
2. Go to **Settings** or **API / Webhook** (exact menu may vary; see their [docs](https://smsportal.hostpinnacle.co.ke/docs/api/) or support).
3. Set **Delivery Report URL** / **SMS Webhook URL** to your app’s DLR endpoint, for example:
   - With secret: `https://yourdomain.com/api/sms/dlr?secret=YOUR_WEBHOOK_SECRET`
   - Or without (if you don’t use `WEBHOOK_SECRET`): `https://yourdomain.com/api/sms/dlr`
4. Save. HostPinnacle will then POST delivery status to this URL for messages sent from your account.

Use the same base URL as your deployed app (e.g. `NEXT_PUBLIC_BASE_URL`) and ensure the route is publicly reachable (HTTPS in production).

---

## Option B: Set DLR URL via API (Reseller)

This app’s HostPinnacle client supports creating the webhook via API:

- **In app:** Super-admin → Settings → “Register DLR URL with HostPinnacle” (set `NEXT_PUBLIC_BASE_URL` first). **API:** `POST /api/super-admin/dlr-webhook/register` (super-admin only).
- **Endpoint (HostPinnacle):** `POST /SMSApi/webhook/create`
- **Body (form):** `smswebhook=<your_dlr_url>&smswebhookrate=10&output=json` (plus your auth: `userid` + `password` or API key as per HostPinnacle docs)

**Your DLR URL** should be:

```text
https://<your-domain>/api/sms/dlr
```

If you use `WEBHOOK_SECRET` (see `.env`):

```text
https://<your-domain>/api/sms/dlr?secret=<WEBHOOK_SECRET>
```

Example from this codebase (server-side only, using env):

```ts
import { hostPinnacleClient } from '@/lib/services/hostpinnacle/client'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://yourdomain.com'
const secret = process.env.WEBHOOK_SECRET
const dlrUrl = secret ? `${baseUrl}/api/sms/dlr?secret=${secret}` : `${baseUrl}/api/sms/dlr`

const result = await hostPinnacleClient.createWebhook({
  smsWebhook: dlrUrl,
  smsWebhookRate: 10,
})
```

Run this once at setup (e.g. from an admin script or a one-time setup route). After that, HostPinnacle will send DLRs to this URL.

---

## What this app does when it receives a DLR

- **Route:** `POST /api/sms/dlr`
- **Actions:**
  - Finds the message by HostPinnacle transaction ID (`hpTransactionId`).
  - Sets status to **delivered** or **failed** (and timestamps).
  - On failure, can refund credits if pricing rule has `refundOnFail`.
- **Where you see it:** **SMS History** and **Delivery Summary** show the updated status — that is the HostPinnacle-side confirmation.

---

## Checklist for “delivery known on HostPinnacle side”

| Step | Action |
|------|--------|
| 1 | Deploy the app with a public base URL (e.g. `NEXT_PUBLIC_BASE_URL=https://yourdomain.com`). |
| 2 | Ensure `POST /api/sms/dlr` is reachable (no firewall blocking HostPinnacle’s server). |
| 3 | Register the DLR URL with HostPinnacle (dashboard **or** API as above). |
| 4 | Send a test SMS and check **SMS History** (or Delivery Summary); when DLR is received, status changes from “Sent” to “Delivered” or “Failed”. |

---

## References

- HostPinnacle API overview: [smsportal.hostpinnacle.co.ke/docs/api](https://smsportal.hostpinnacle.co.ke/docs/api/?action=overview&apiType=rest&codeType=sample)
- Support: support@hostpinnacle.co.ke  
- This app: `app/api/sms/dlr/route.ts` (DLR handler), `lib/services/hostpinnacle/client.ts` (`createWebhook`).

---

**Security:** Do not commit or share your HostPinnacle password. Store credentials only in environment variables (e.g. `.env.local`) and use a strong password; if you have shared it, change it in the HostPinnacle portal.
