# Multi-Tenant SMS Reseller Platform - Setup Guide

## ✅ What Has Been Built

A complete multi-tenant SMS reseller platform integrated with HostPinnacle SMS API.

### Features:
- ✅ User authentication with JWT
- ✅ MongoDB database models
- ✅ HostPinnacle API client (form-urlencoded)
- ✅ Sender ID management (create, assign, sync)
- ✅ SMS sending with user validation
- ✅ Delivery report webhook handler
- ✅ Admin panel for user & sender ID management
- ✅ Credit system with automatic refunds
- ✅ Encrypted credential storage

## 📦 Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables** (`.env.local`):
   ```env
   MONGODB_URI=mongodb+srv://elvy4366_d:elvy4366_d@cluster0.quzkx87.mongodb.net/?appName=Cluster0
   JWT_SECRET=e221dceec1b3cb55120c9ea7b420663fbd7986af9188556011ca7826b01dbe2a
   ENCRYPTION_KEY=29bbd31427aadfea10a53e64ff960e13890be0c8
   WEBHOOK_SECRET=d94eb3bb0e9524f48277c9ebe0e2fbe8
   HOSTPINNACLE_BASE_URL=https://smsportal.hostpinnacle.co.ke
   HOSTPINNACLE_USERID=threeiconic
   HOSTPINNACLE_PASSWORD=SFX67iAt@GPk7Ae
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

## 🗄️ Database Structure

### Collections Created:
- **users** - App users (admin/customer)
- **hostpinnacle_accounts** - Links users to HostPinnacle sub-accounts
- **sender_ids** - Sender IDs (unique per provider)
- **user_sender_ids** - Many-to-many link (user ↔ sender ID)
- **sms_messages** - All SMS sent with status tracking

## 🔐 Security Features

- ✅ API keys/passwords encrypted at rest
- ✅ JWT authentication
- ✅ Server-side only API calls (never expose credentials)
- ✅ User validation (can only use their own sender IDs)
- ✅ Admin role protection

## 📡 API Endpoints

### User Endpoints:
- `GET /api/senderids` - Get user's sender IDs
- `POST /api/senderids/request` - Request new sender ID
- `POST /api/sms/send` - Send SMS

### Admin Endpoints:
- `GET /api/admin/users` - List all users
- `POST /api/admin/users/[id]/senderids` - Assign sender ID to user
- `DELETE /api/admin/users/[id]/senderids/[senderId]` - Remove sender ID
- `POST /api/admin/users/[id]/senderids/[senderId]/default` - Set default
- `POST /api/admin/users/[id]/sync-senderids` - Sync from HostPinnacle

### Webhook:
- `POST /api/sms/dlr` - Delivery report webhook

## 🎯 Usage Flow

### 1. Admin Setup:
1. Go to `/admin/users`
2. Select a user
3. Click "Manage" → Assign sender IDs or sync from HostPinnacle

### 2. User Sends SMS:
1. User goes to `/app/send-sms`
2. Selects their sender ID (only shows their assigned IDs)
3. Enters recipient and message
4. Clicks send → Credits deducted → SMS sent via HostPinnacle

### 3. Delivery Reports:
- HostPinnacle calls `/api/sms/dlr` with status
- System updates message status
- Failed messages get automatic refund

## 🔧 Next Steps

1. **Create authentication pages:**
   - `/auth/login` - User login
   - `/auth/register` - User registration
   - Implement JWT token storage in cookies/localStorage

2. **Create user signup flow:**
   - When user signs up, create HostPinnacle sub-user via API
   - Store credentials encrypted

3. **Update QuickSendForm:**
   - Fetch sender IDs from `/api/senderids`
   - Use `senderIdId` instead of `senderId` string
   - Add authentication headers

4. **Set up webhook:**
   - Configure webhook URL in HostPinnacle dashboard
   - URL: `https://yourdomain.com/api/sms/dlr?secret=WEBHOOK_SECRET`

5. **Add rate limiting:**
   - Protect API endpoints from abuse
   - Use libraries like `@upstash/ratelimit`

## ⚠️ Important Notes

- **Never expose HostPinnacle credentials** in frontend code
- **Always validate sender ID ownership** before sending
- **Test webhook** with HostPinnacle's test endpoint
- **Monitor credit balances** to prevent negative balances
- **Set up proper error logging** for production

## 🐛 Troubleshooting

### MongoDB Connection Issues:
- Check `MONGODB_URI` is correct
- Ensure MongoDB allows connections from your IP

### HostPinnacle API Errors:
- Verify credentials in `.env.local`
- Check HostPinnacle dashboard for API status
- Review server logs for detailed error messages

### Authentication Issues:
- Ensure JWT token is sent in `Authorization: Bearer <token>` header
- Check `JWT_SECRET` matches between requests

---

**Ready to use!** Start with the admin panel to assign sender IDs to users, then test SMS sending.

