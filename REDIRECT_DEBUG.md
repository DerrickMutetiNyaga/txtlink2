# Redirect Debug Guide

## Issue
Super admin is being redirected to `/admin/users` instead of `/super-admin`

## Debug Steps

1. **Check Browser Console** after login:
   - Look for: `Login successful: { email, role, isOwner: true/false }`
   - Look for: `Redirecting owner to /super-admin`
   - Look for: `AdminUsersPage: Redirecting owner to /super-admin`

2. **Check Network Tab**:
   - Find the `/api/auth/login` request
   - Check the response body - does it have `isOwner: true`?

3. **Check localStorage**:
   - Open DevTools → Application → Local Storage
   - Check the `user` key
   - Does it have `"isOwner": true`?

4. **Check Environment Variable**:
   - Verify `.env.local` has: `OWNER_EMAIL=admin@signalhub.com`
   - **IMPORTANT**: Restart the dev server after changing `.env.local`
   - The server needs to be restarted to pick up environment variables

5. **Manual Test**:
   - Open browser console
   - Run: `JSON.parse(localStorage.getItem('user'))`
   - Check if `isOwner` is `true`

## Fixes Applied

1. ✅ Login API now checks `OWNER_EMAIL` and returns `isOwner: true/false`
2. ✅ Login page redirects based on `isOwner` flag
3. ✅ `AdminUsersPage` has redirect guard that checks `isOwner`
4. ✅ `PortalLayout` has redirect guard that checks `isOwner`
5. ✅ `AdminLayout` has redirect guard that checks `isOwner`

## If Still Not Working

1. **Restart the dev server** (this is critical for env vars)
2. **Clear browser localStorage** and log in again
3. **Check the server console** for the owner check debug logs
4. **Verify email matches exactly** (case-insensitive, but check for typos)

