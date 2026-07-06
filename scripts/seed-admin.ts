/**
 * Seed Script: Create Super Admin
 * 
 * Run with: npx tsx scripts/seed-admin.ts
 * Or: node --loader tsx scripts/seed-admin.ts
 */

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { User } from '../lib/db/models'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://elvy4366_d:elvy4366_d@cluster0.quzkx87.mongodb.net/?appName=Cluster0'

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

    process.exit(0)
  } catch (error: any) {
    console.error('❌ Error seeding admin:', error)
    process.exit(1)
  }
}

seedAdmin()

