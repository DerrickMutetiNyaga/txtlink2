# Authentication System - Complete Setup ✅

## ✅ What Has Been Created

### 1. **API Routes**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### 2. **Updated Pages**
- `/auth/login` - Real authentication with JWT
- `/auth/register` - Real user registration

### 3. **Seed Script**
- `scripts/seed-admin.js` - Creates super admin user

## 🔐 Super Admin Credentials

**✅ Admin user has been created!**

```
Email: admin@signalhub.com
Password: Admin@123
Role: admin
Credits: 100,000 KSh
```

**⚠️ IMPORTANT:** Change the password after first login!

## 🚀 How to Use

### 1. **Login as Admin**
1. Go to: `http://localhost:3000/auth/login`
2. Enter:
   - Email: `admin@signalhub.com`
   - Password: `Admin@123`
3. You'll be redirected to `/admin/users`

### 2. **Register New Users**
1. Go to: `http://localhost:3000/auth/register`
2. Fill in the form:
   - Company Name
   - Email
   - Phone
   - Password (min 6 characters)
3. User will be created with role `user` and 0 credits

### 3. **Create More Admins (via seed script)**
Edit `scripts/seed-admin.js` and change:
- `adminEmail`
- `adminPassword`
- `adminName`

Then run: `npm run seed:admin`

## 🔒 Security Features

- ✅ Passwords hashed with bcrypt (10 rounds)
- ✅ JWT tokens with 7-day expiration
- ✅ Email validation
- ✅ Password strength check (min 6 chars)
- ✅ Duplicate email prevention
- ✅ Account activation check

## 📝 Token Storage

After login/register, the JWT token is stored in:
- `localStorage.getItem('token')` - Used for API requests
- `localStorage.getItem('user')` - User info (id, email, role, credits)

## 🔄 API Usage

### Register Request:
```json
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+254712345678"
}
```

### Login Request:
```json
POST /api/auth/login
{
  "email": "john@example.com",
  "password": "password123"
}
```

### Response (both):
```json
{
  "success": true,
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "credits": 0
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## 🎯 Next Steps

1. **Test Login:**
   - Login as admin: `admin@signalhub.com` / `Admin@123`
   - Access `/admin/users` to manage users

2. **Create Regular Users:**
   - Register via `/auth/register`
   - Or create via admin panel (you'll need to add that feature)

3. **Link Users to HostPinnacle:**
   - In admin panel, assign HostPinnacle sub-user credentials
   - Assign sender IDs to users

4. **Test SMS Sending:**
   - Login as a regular user
   - Go to `/app/send-sms`
   - Select sender ID and send SMS

## ⚠️ Important Notes

- **Change admin password** after first login
- **Token expires in 7 days** - users need to re-login
- **Passwords are hashed** - cannot be recovered, only reset
- **Admin role** gives access to `/admin/*` routes

---

**Authentication system is ready! You can now login and start using the platform.**

