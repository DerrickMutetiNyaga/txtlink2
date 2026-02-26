# SMS Not Reaching Recipient – Troubleshooting

If the app shows **"SMS sent successfully"** but the recipient does **not** receive the message, the gateway (HostPinnacle) has accepted the request, but delivery to the handset can still fail. Use this guide to find out why.

---

## 1. **Sender ID not fully active on the carrier**

**Most common cause.**

- **HostPinnacle** may show the sender ID as approved, but the **mobile network** (e.g. Safaricom) must also have it active.
- If the sender ID is still **pending** or **rejected** at the carrier, messages can be accepted by the API but **never delivered** to the phone.

**What to do:**

- In HostPinnacle (or your provider) check the **exact status** of sender ID **SunLiqShop** (and any other IDs you use).
- Confirm with HostPinnacle support that the sender ID is **active on the destination network** (e.g. Safaricom) for the recipient’s number.
- If you use multiple IDs, test with one that you know is already delivering (e.g. a long‑standing one).

---

## 2. **HostPinnacle account is test/demo**

- Some accounts are **test/demo** and return **success** for API calls but **do not deliver** to real numbers.

**What to do:**

- Contact HostPinnacle and confirm your account is a **live/production** account and that real delivery is enabled.
- Ask if there is a **test mode** or **simulation** that must be **turned off** for real delivery.

---

## 3. **Delivery reports (DLR) show failure**

- The platform receives delivery status from HostPinnacle via the **DLR webhook** (`/api/sms/dlr`).  
- A message can be **“sent”** (accepted) but later reported as **“failed”** by the carrier.

**What to do:**

- In the app, open **SMS History** and check the **status** of the message (e.g. **delivered** vs **failed**).
- If you have **WebhookLog** or similar logging, check for DLR callbacks with `status: failed` or an error reason.
- Ensure the **DLR webhook URL** is registered in HostPinnacle and that it is reachable (no firewall blocking, correct HTTPS URL).
- **When the webhook fails:** You can still see delivery status on HostPinnacle. Log in to the [SMS Portal](https://smsportal.hostpinnacle.co.ke), go to **SMS &gt; SMS reports &gt; Delivery report** on the SMS portal, and match messages by **Transaction ID** (same as in SMS History). This is a manual fallback; it does not update the app automatically.

---

## 4. **Recipient number or operator**

- Number format: we send as **254796030992** (no `+`). This is correct for Kenya; other countries need the right country code.
- Operator or region can **block** or **delay** certain sender IDs or content.

**What to do:**

- Try a **different recipient number** (e.g. another network or another country if applicable).
- Try sending to a number you know receives other SMS without issues.

---

## 5. **Message content or length**

- Very short messages (e.g. 4 characters) or certain content can be **filtered** or **blocked** by the carrier.

**What to do:**

- Try a **slightly longer**, plain‑text message (e.g. “Hello, this is a test from SunLiqShop.”).
- Avoid special characters or content that might trigger filters (e.g. promotional wording if the ID is not approved for promo).

---

## 6. **Quick checklist**

| Check | Action |
|-------|--------|
| Sender ID status | Confirm with HostPinnacle that **SunLiqShop** is **active on the carrier** (e.g. Safaricom), not only in the portal. |
| Account type | Confirm account is **live/production**, not test/demo. |
| DLR webhook | Ensure **DLR URL** is set in HostPinnacle and that **SMS History** (or logs) shows delivery status. |
| SMS History | In the app, check if the message status is **delivered** or **failed**. |
| Different number | Test with another recipient to rule out number/operator issues. |
| Message content | Test with a simple, longer text to rule out content/length filtering. |

---

## 7. **What to send to HostPinnacle support**

If the issue continues, send them:

- **Transaction ID** from the logs (e.g. `9029028864329271481`).
- **Sender ID**: e.g. SunLiqShop.
- **Recipient number**: e.g. 254796030992.
- **Time (and timezone)** of the send.
- Note that: “API returns success but the recipient does not receive the SMS.”

They can check on their side whether the message was **rejected by the carrier** and for what reason (sender ID, content, number, etc.).

---

**Summary:**  
“Success” from the API means **accepted by HostPinnacle**. Actual **delivery** depends on sender ID being active on the network, account being live, and the carrier accepting the message. Checking **sender ID status** and **DLR (SMS History)** is the most effective next step.
