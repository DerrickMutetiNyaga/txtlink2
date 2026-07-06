/**
 * Seed Script: Create Super Admin (JavaScript version)
 * 
 * Run with: node scripts/seed-admin.js
 */

require('dotenv').config({ path: '.env.local' })
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

// Import models (using require since this is a script)
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  phone: { type: String },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  credits: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true })

const User = mongoose.models.User || mongoose.model('User', UserSchema)

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in .env.local')
  process.exit(1)
}

async function seedAdmin() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI)
    console.log('✓ Connected to MongoDB')

    // Admin credentials
    const adminEmail = 'admin@signalhub.com'
    const adminPassword = 'Admin@123' // Change this after first login!
    const adminName = 'Super Admin'

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail })
    if (existingAdmin) {
      console.log('⚠ Admin user already exists!')
      console.log(`   Email: ${adminEmail}`)
      console.log(`   Role: ${existingAdmin.role}`)
      console.log('\nTo reset password, delete the user from database first.')
      await mongoose.disconnect()
      process.exit(0)
    }

    // Hash password
    const passwordHash = await bcrypt.hash(adminPassword, 10)

    // Create admin user
    const admin = await User.create({
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: 'admin',
      credits: 100000, // Give admin some credits
      isActive: true,
    })

    console.log('\n✅ Super Admin created successfully!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Email:', adminEmail)
    console.log('Password:', adminPassword)
    console.log('Role: admin')
    console.log('Credits: 100,000 KSh')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n⚠️  IMPORTANT: Change the password after first login!')
    console.log('\nYou can now login at: http://localhost:3000/auth/login')

    await mongoose.disconnect()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error seeding admin:', error)
    await mongoose.disconnect()
    process.exit(1)
  }
}

seedAdmin()

