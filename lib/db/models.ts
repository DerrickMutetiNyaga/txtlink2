/**
 * MongoDB Models for SMS Reseller Platform
 * Using Mongoose for MongoDB
 */

import mongoose, { Schema, Model } from 'mongoose'

// User Model
export interface IUser {
  _id?: string
  name: string
  email: string
  passwordHash: string
  phone?: string
  role: 'admin' | 'user'
  credits: number // Legacy wallet balance (in KSh) - kept for backward compatibility
  creditsBalance?: number // Wallet balance in SMS credits (integer; 1 credit = 1 SMS segment up to 153 chars)
  smsPriceUsdOverride?: number // (Deprecated) was used for USD pricing; no longer in active use
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    phone: { type: String },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    credits: { type: Number, default: 0 },
    creditsBalance: { type: Number, default: 0 },
    smsPriceUsdOverride: { type: Number },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

// HostPinnacle Account Model
export interface IHostPinnacleAccount {
  _id?: string
  userId: mongoose.Types.ObjectId
  hpUserLoginName: string
  hpApiKeyEncrypted?: string
  hpPasswordEncrypted?: string
  createdAt: Date
  updatedAt: Date
}

const HostPinnacleAccountSchema = new Schema<IHostPinnacleAccount>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    hpUserLoginName: { type: String, required: true },
    hpApiKeyEncrypted: { type: String },
    hpPasswordEncrypted: { type: String },
  },
  { timestamps: true }
)

// Sender ID Model
export interface ISenderId {
  _id?: string
  senderName: string
  provider: string // 'hostpinnacle'
  status: 'pending' | 'active' | 'rejected'
  hpSenderId?: string // HostPinnacle's internal sender ID if available
  createdAt: Date
  updatedAt: Date
}

const SenderIdSchema = new Schema<ISenderId>(
  {
    senderName: { type: String, required: true, unique: true },
    provider: { type: String, default: 'hostpinnacle' },
    status: { type: String, enum: ['pending', 'active', 'rejected'], default: 'pending' },
    hpSenderId: { type: String },
  },
  { timestamps: true }
)

// User-Sender ID Pivot (Many-to-Many)
export interface IUserSenderId {
  _id?: string
  userId: mongoose.Types.ObjectId
  senderId: mongoose.Types.ObjectId
  isDefault: boolean
  createdAt: Date
}

const UserSenderIdSchema = new Schema<IUserSenderId>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'SenderId', required: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

// Ensure only one default per user
UserSenderIdSchema.index({ userId: 1, isDefault: 1 }, { unique: true, partialFilterExpression: { isDefault: true } })
// Ensure senderId can only be assigned to ONE user at a time (global uniqueness)
UserSenderIdSchema.index({ senderId: 1 }, { unique: true })

// SMS Message Model
export interface ISmsMessage {
  _id?: string
  userId: mongoose.Types.ObjectId
  senderName: string
  toNumbers: string[] // Array of phone numbers
  message: string
  segments: number
  costPerSegment: number
  totalCost: number
  hpTransactionId?: string // HostPinnacle transaction ID
  externalMsgId?: string // Alias for provider's message ID (for status API)
  providerStatus?: string // Raw status returned by provider (DELIVERED/SUBMITTED/FAILED/etc)
  deliveryCause?: string // Failure/delivery cause from provider
  statusCheckAttempts?: number // How many times background status job has checked
  creditDeducted?: boolean // Guard flag to prevent double credit deduction
  channel?: string // e.g. 'sms'
  email?: string // User email snapshot (for admin notifications)
  externalMsgId?: string // Alias for provider's message ID (for status API)
  providerStatus?: string // Raw status returned by provider (DELIVERED/SUBMITTED/FAILED/etc)
  deliveryCause?: string // Failure/delivery cause from provider
  statusCheckAttempts?: number // How many times background status job has checked
  creditDeducted?: boolean // Guard flag to prevent double credit deduction
  channel?: string // e.g. 'sms'
  email?: string // User email snapshot (for admin notifications)
  status: 'queued' | 'sent' | 'delivered' | 'failed'
  errorCode?: string
  errorMessage?: string
  sentAt?: Date
  deliveredAt?: Date
  failedAt?: Date
  refunded: boolean
  // Pricing fields
  encoding?: 'gsm7' | 'ucs2'
  parts?: number
  chargedKes?: number
  providerCostKes?: number
  profitKes?: number
  refundAmountKes?: number
  createdAt: Date
  updatedAt: Date
}

const SmsMessageSchema = new Schema<ISmsMessage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true },
    toNumbers: { type: [String], required: true },
    message: { type: String, required: true },
    segments: { type: Number, required: true },
    costPerSegment: { type: Number, required: true },
    totalCost: { type: Number, required: true },
    hpTransactionId: { type: String },
  externalMsgId: { type: String },
  providerStatus: { type: String },
  deliveryCause: { type: String },
  statusCheckAttempts: { type: Number, default: 0 },
  creditDeducted: { type: Boolean, default: false },
  channel: { type: String },
  email: { type: String },
    status: { type: String, enum: ['queued', 'sent', 'delivered', 'failed'], default: 'queued' },
    errorCode: { type: String },
    errorMessage: { type: String },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    failedAt: { type: Date },
    refunded: { type: Boolean, default: false },
    // Pricing fields
    encoding: { type: String, enum: ['gsm7', 'ucs2'] },
    parts: { type: Number },
    chargedKes: { type: Number },
    providerCostKes: { type: Number },
    profitKes: { type: Number },
    refundAmountKes: { type: Number },
  },
  { timestamps: true }
)

// Pricing Rule Model
export interface IPricingRule {
  _id?: string
  scope: 'global' | 'user'
  userId?: mongoose.Types.ObjectId
  currency: string
  mode: 'per_part' | 'per_sms' | 'tiered'
  // Character rules
  gsm7Part1: number // 160
  gsm7PartN: number // 153
  ucs2Part1: number // 70
  ucs2PartN: number // 67
  // Pricing
  pricePerPart?: number
  pricePerSms?: number
  tiers?: Array<{ from: number; to: number; pricePerPart: number }>
  // Settings
  chargeFailed: boolean
  refundOnFail: boolean
  updatedBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const PricingRuleSchema = new Schema<IPricingRule>(
  {
    scope: { type: String, enum: ['global', 'user'], required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    currency: { type: String, default: 'KES' },
    mode: { type: String, enum: ['per_part', 'per_sms', 'tiered'], required: true },
    gsm7Part1: { type: Number, default: 160 },
    gsm7PartN: { type: Number, default: 153 },
    ucs2Part1: { type: Number, default: 70 },
    ucs2PartN: { type: Number, default: 67 },
    pricePerPart: { type: Number },
    pricePerSms: { type: Number },
    tiers: [{
      from: { type: Number },
      to: { type: Number },
      pricePerPart: { type: Number },
    }],
    chargeFailed: { type: Boolean, default: false },
    refundOnFail: { type: Boolean, default: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

// Audit Log Model
export interface IAuditLog {
  _id?: string
  action: string
  resource: string
  resourceId?: string
  userId: mongoose.Types.ObjectId
  userEmail: string
  changes?: Record<string, any>
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true },
    resource: { type: String, required: true },
    resourceId: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userEmail: { type: String, required: true },
    changes: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

// User Webhook Configuration Model
export interface IUserWebhook {
  _id?: string
  userId: mongoose.Types.ObjectId
  name?: string // Optional name for identification
  product: 'SMS' | 'WhatsApp' // Product type
  serverSendMethod: 'POST' | 'GET' | 'JSON' | 'XML' // HTTP method/format
  reportType: 'DLR' | 'MO' // Report type (MO disabled for SMS)
  wabaNumber?: string // WhatsApp Business Account number (WhatsApp only)
  url: string // Webhook URL endpoint
  // Parameter name mappings (what parameter names to use when sending)
  transactionIdParam?: string
  messageIdParam?: string
  errorCodeParam?: string
  mobileNumberParam?: string
  receivedTimeParam?: string
  deliveredTimeParam?: string
  readTimeParam?: string // WhatsApp only
  statusParam?: string // WhatsApp only
  // Custom parameters and headers
  customParameters?: Array<{ name: string; value: string }>
  customHeaders?: Array<{ name: string; value: string }>
  // Legacy fields (for backward compatibility)
  events?: string[] // Array of event types like ['sms.delivered', 'sms.failed']
  secret: string // Webhook secret for signature verification
  status: 'active' | 'inactive'
  lastTriggeredAt?: Date
  lastTestResponse?: string // Store test webhook response
  createdAt: Date
  updatedAt: Date
}

const UserWebhookSchema = new Schema<IUserWebhook>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String },
    product: { type: String, enum: ['SMS', 'WhatsApp'], required: true },
    serverSendMethod: { type: String, enum: ['POST', 'GET', 'JSON', 'XML'], required: true },
    reportType: { type: String, enum: ['DLR', 'MO'], required: true },
    wabaNumber: { type: String },
    url: { type: String, required: true },
    // Parameter mappings
    transactionIdParam: { type: String },
    messageIdParam: { type: String },
    errorCodeParam: { type: String },
    mobileNumberParam: { type: String },
    receivedTimeParam: { type: String },
    deliveredTimeParam: { type: String },
    readTimeParam: { type: String },
    statusParam: { type: String },
    // Custom parameters and headers
    customParameters: [{
      name: { type: String, required: true },
      value: { type: String, required: true },
    }],
    customHeaders: [{
      name: { type: String, required: true },
      value: { type: String, required: true },
    }],
    // Legacy fields
    events: { type: [String] },
    secret: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    lastTriggeredAt: { type: Date },
    lastTestResponse: { type: String },
  },
  { timestamps: true }
)

// Index for faster lookups
UserWebhookSchema.index({ userId: 1, status: 1 })

// Webhook Log Model
export interface IWebhookLog {
  _id?: string
  transactionId?: string
  provider: string
  eventType: string
  payload: Record<string, any>
  processed: boolean
  processedAt?: Date
  error?: string
  createdAt: Date
}

const WebhookLogSchema = new Schema<IWebhookLog>(
  {
    transactionId: { type: String, index: true },
    provider: { type: String, default: 'hostpinnacle' },
    eventType: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    processed: { type: Boolean, default: false },
    processedAt: { type: Date },
    error: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

// System Settings Model (Singleton - only one document)
export interface ISystemSettings {
  _id?: string
  // Platform Configuration
  platformName: string
  defaultCurrency: string
  timezone: string
  dateFormat: string
  environment: 'production' | 'sandbox'
  
  // SMS Provider Settings
  providerName: string
  providerApiKey: string // Encrypted
  defaultProviderCostPerPart: number
  retryPolicy: number // 0-3
  deliveryReportWebhookEnabled: boolean
  
  // Pricing & Cost Controls
  globalDefaultPricePerPart: number
  globalProviderCostPerPart: number
  defaultChargeOnFailure: boolean
  defaultRefundOnFailure: boolean
  
  // Security & Compliance
  requireSenderIdApproval: boolean
  logAllAdminActions: boolean
  lockPricingEditsToSuperAdmin: boolean
  enableIpLogging: boolean
  
  // System Defaults
  defaultSmsEncoding: 'auto' | 'gsm7' | 'ucs2'
  defaultSenderIdBehavior: string
  defaultAccountCreditLimit: number
  
  // Danger Zone Flags
  smsSendingEnabled: boolean
  
  // M-Pesa Configuration
  mpesaConsumerKey?: string
  mpesaConsumerSecret?: string
  mpesaPasskey?: string
  mpesaShortcode?: string // Paybill/Till Number
  mpesaConfirmationUrl?: string
  mpesaValidationUrl?: string
  mpesaCallbackUrl?: string // For STK Push
  mpesaEnvironment?: 'sandbox' | 'production'
  mpesaEnabled?: boolean
  
  // HostPinnacle Configuration
  hostpinnacleBaseUrl?: string
  hostpinnacleUserId?: string
  hostpinnaclePassword?: string // Encrypted
  hostpinnacleApiKey?: string // Encrypted
  hostpinnacleStatusEndpoint?: string
  hostpinnacleTimeout?: number // Default timeout in milliseconds
  hostpinnacleSmsSendTimeout?: number // SMS send timeout in milliseconds
  hostpinnacleStatusTimeout?: number // Status check timeout in milliseconds
  
  updatedBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const SystemSettingsSchema = new Schema<ISystemSettings>(
  {
    platformName: { type: String, default: 'TXTLINK' },
    defaultCurrency: { type: String, default: 'KES' },
    timezone: { type: String, default: 'Africa/Nairobi' },
    dateFormat: { type: String, default: 'YYYY-MM-DD' },
    environment: { type: String, enum: ['production', 'sandbox'], default: 'production' },
    
    providerName: { type: String, default: 'HostPinnacle' },
    providerApiKey: { type: String, default: '' },
    defaultProviderCostPerPart: { type: Number, default: 1.5 },
    retryPolicy: { type: Number, default: 1, min: 0, max: 3 },
    deliveryReportWebhookEnabled: { type: Boolean, default: true },
    
    globalDefaultPricePerPart: { type: Number, default: 2.0 },
    globalProviderCostPerPart: { type: Number, default: 1.5 },
    defaultChargeOnFailure: { type: Boolean, default: false },
    defaultRefundOnFailure: { type: Boolean, default: true },
    
    requireSenderIdApproval: { type: Boolean, default: true },
    logAllAdminActions: { type: Boolean, default: true },
    lockPricingEditsToSuperAdmin: { type: Boolean, default: true },
    enableIpLogging: { type: Boolean, default: true },
    
    defaultSmsEncoding: { type: String, enum: ['auto', 'gsm7', 'ucs2'], default: 'auto' },
    defaultSenderIdBehavior: { type: String, default: 'require_approval' },
    defaultAccountCreditLimit: { type: Number, default: 0 },

    exchangeRateKesPerUsd: { type: Number, default: 130 },
    
    smsSendingEnabled: { type: Boolean, default: true },
    
    // M-Pesa Configuration
    mpesaConsumerKey: { type: String },
    mpesaConsumerSecret: { type: String },
    mpesaPasskey: { type: String },
    mpesaShortcode: { type: String },
    mpesaConfirmationUrl: { type: String },
    mpesaValidationUrl: { type: String },
    mpesaCallbackUrl: { type: String },
    mpesaEnvironment: { type: String, enum: ['sandbox', 'production'], default: 'sandbox' },
    mpesaEnabled: { type: Boolean, default: false },
    
    // HostPinnacle Configuration
    hostpinnacleBaseUrl: { type: String, default: 'https://smsportal.hostpinnacle.co.ke' },
    hostpinnacleUserId: { type: String },
    hostpinnaclePassword: { type: String }, // Will be encrypted
    hostpinnacleApiKey: { type: String }, // Will be encrypted
    hostpinnacleStatusEndpoint: { type: String, default: '/SMSApi/report/status' },
    hostpinnacleTimeout: { type: Number, default: 60000 }, // 60 seconds
    hostpinnacleSmsSendTimeout: { type: Number, default: 90000 }, // 90 seconds
    hostpinnacleStatusTimeout: { type: Number, default: 30000 }, // 30 seconds
    
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

// Ensure only one system settings document exists
// We'll handle this in the API by using findOneAndUpdate with upsert

// API Key Model
export interface IApiKey {
  _id?: string
  userId: mongoose.Types.ObjectId
  name: string
  keyHash: string // Hashed API key (we only store hash, never the plain key)
  keyPrefix: string // First 8 chars for display (e.g., "sk_live_")
  type: 'live' | 'test'
  status: 'active' | 'revoked'
  lastUsedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    keyHash: { type: String, required: true, unique: true },
    keyPrefix: { type: String, required: true },
    type: { type: String, enum: ['live', 'test'], required: true },
    status: { type: String, enum: ['active', 'revoked'], default: 'active' },
    lastUsedAt: { type: Date },
  },
  { timestamps: true }
)

// Index for faster lookups
ApiKeySchema.index({ userId: 1, status: 1 })
// Note: keyHash already has an index from unique: true, so we don't need to add it again

// Transaction Model (for billing/transactions)
export interface ITransaction {
  _id?: string
  userId: mongoose.Types.ObjectId
  type: 'top-up' | 'charge' | 'refund'
  amount: number // Positive for top-ups/refunds, negative for charges
  description: string
  reference: string // Unique transaction reference
  status: 'pending' | 'completed' | 'failed'
  metadata?: Record<string, any> // Additional data (e.g., payment method, SMS message ID for charges)
  createdAt: Date
  updatedAt: Date
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['top-up', 'charge', 'refund'], required: true },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    reference: { type: String, required: true, unique: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
)

// Index for faster lookups
TransactionSchema.index({ userId: 1, createdAt: -1 })
TransactionSchema.index({ userId: 1, type: 1 })
// Note: reference already has an index from unique: true, so we don't need to add it again

// Payment Method Model
export interface IPaymentMethod {
  _id?: string
  userId: mongoose.Types.ObjectId
  type: 'mpesa' | 'card' | 'bank'
  name: string
  details: string // Phone number for M-Pesa, masked card number for card, account number for bank
  expiry?: string // For cards: MM/YYYY
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

const PaymentMethodSchema = new Schema<IPaymentMethod>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['mpesa', 'card', 'bank'], required: true },
    name: { type: String, required: true },
    details: { type: String, required: true },
    expiry: { type: String },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
)

// Ensure only one default payment method per user
PaymentMethodSchema.index({ userId: 1, isDefault: 1 }, { unique: true, partialFilterExpression: { isDefault: true } })

// M-Pesa Transaction Model
export interface IMpesaTransaction {
  _id?: string
  transactionType: 'STK' | 'C2B'
  transactionId?: string // M-Pesa transaction ID
  checkoutRequestId?: string // For STK Push
  merchantRequestId?: string // For STK Push
  amount: number
  phoneNumber: string
  accountReference: string
  status: 'pending' | 'success' | 'failed' | 'cancelled' | 'timeout'
  responseCode?: string
  resultDesc?: string
  mpesaReceiptNumber?: string
  rawResponse?: Record<string, any> // JSON response from M-Pesa
  userId?: mongoose.Types.ObjectId // Link to user if available
  invoiceId?: string // Link to invoice/transaction if available
  createdAt: Date
  updatedAt: Date
}

const MpesaTransactionSchema = new Schema<IMpesaTransaction>(
  {
    transactionType: { type: String, enum: ['STK', 'C2B'], required: true },
    transactionId: { type: String },
    checkoutRequestId: { type: String },
    merchantRequestId: { type: String },
    amount: { type: Number, required: true },
    phoneNumber: { type: String, required: true },
    accountReference: { type: String, required: true },
    status: { type: String, enum: ['pending', 'success', 'failed', 'cancelled', 'timeout'], default: 'pending' },
    responseCode: { type: String },
    resultDesc: { type: String },
    mpesaReceiptNumber: { type: String },
    rawResponse: { type: Schema.Types.Mixed },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    invoiceId: { type: String },
  },
  { timestamps: true }
)

// Indexes for faster lookups
MpesaTransactionSchema.index({ phoneNumber: 1, createdAt: -1 })
MpesaTransactionSchema.index({ accountReference: 1 })
MpesaTransactionSchema.index({ checkoutRequestId: 1 })
MpesaTransactionSchema.index({ merchantRequestId: 1 })
MpesaTransactionSchema.index({ transactionId: 1 })
MpesaTransactionSchema.index({ status: 1, createdAt: -1 })
MpesaTransactionSchema.index({ userId: 1, createdAt: -1 })
MpesaTransactionSchema.index({ transactionType: 1, createdAt: -1 })

// Payment Gateway Model
export interface IPaymentGateway {
  _id?: string
  name: string
  type: 'mpesa' | 'card' | 'bank' | 'other'
  isActive: boolean
  configuration?: Record<string, any> // Gateway-specific configuration
  createdAt: Date
  updatedAt: Date
}

const PaymentGatewaySchema = new Schema<IPaymentGateway>(
  {
    name: { type: String, required: true, unique: true },
    type: { type: String, enum: ['mpesa', 'card', 'bank', 'other'], required: true },
    isActive: { type: Boolean, default: true },
    configuration: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
)

// Marketing Pricing Model (for public pricing page)
export interface IMarketingPricing {
  _id?: string
  // Pricing Tiers
  tiers: Array<{
    name: string
    price: string
    priceDecimal?: string
    unit: string
    description: string
    icon: string // Icon name (e.g., 'Rocket', 'ShieldCheck', 'Building2')
    accentColor: 'teal' | 'indigo' | 'slate'
    features: Array<{
      text: string
      category: string
      highlight: boolean
    }>
    cta: string
    ctaSecondary: string
    highlighted: boolean
    highlightReason?: string
  }>
  // Volume Discounts
  volumeDiscounts: Array<{
    volume: string
    discount: string
    price: string
  }>
  // Page Settings
  pageTitle: string
  pageSubtitle: string
  updatedBy: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const MarketingPricingSchema = new Schema<IMarketingPricing>(
  {
    tiers: [{
      name: { type: String, required: true },
      price: { type: String, required: true },
      priceDecimal: { type: String },
      unit: { type: String, required: true },
      description: { type: String, required: true },
      icon: { type: String, required: true },
      accentColor: { type: String, enum: ['teal', 'indigo', 'slate'], default: 'teal' },
      features: [{
        text: { type: String, required: true },
        category: { type: String, required: true },
        highlight: { type: Boolean, default: false },
      }],
      cta: { type: String, required: true },
      ctaSecondary: { type: String, required: true },
      highlighted: { type: Boolean, default: false },
      highlightReason: { type: String },
    }],
    volumeDiscounts: [{
      volume: { type: String, required: true },
      discount: { type: String, required: true },
      price: { type: String, required: true },
    }],
    pageTitle: { type: String, default: 'Simple, Transparent Pricing' },
    pageSubtitle: { type: String, default: 'Scale your messaging without hidden fees. Only pay for what you send.' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

// Ensure only one marketing pricing document exists (singleton)
MarketingPricingSchema.index({}, { unique: true })

// Export models
export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
export const HostPinnacleAccount: Model<IHostPinnacleAccount> =
  mongoose.models.HostPinnacleAccount || mongoose.model<IHostPinnacleAccount>('HostPinnacleAccount', HostPinnacleAccountSchema)
export const SenderId: Model<ISenderId> = mongoose.models.SenderId || mongoose.model<ISenderId>('SenderId', SenderIdSchema)
export const UserSenderId: Model<IUserSenderId> =
  mongoose.models.UserSenderId || mongoose.model<IUserSenderId>('UserSenderId', UserSenderIdSchema)
export const SmsMessage: Model<ISmsMessage> =
  mongoose.models.SmsMessage || mongoose.model<ISmsMessage>('SmsMessage', SmsMessageSchema)
export const PricingRule: Model<IPricingRule> =
  mongoose.models.PricingRule || mongoose.model<IPricingRule>('PricingRule', PricingRuleSchema)
export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema)
export const UserWebhook: Model<IUserWebhook> =
  mongoose.models.UserWebhook || mongoose.model<IUserWebhook>('UserWebhook', UserWebhookSchema)
export const WebhookLog: Model<IWebhookLog> =
  mongoose.models.WebhookLog || mongoose.model<IWebhookLog>('WebhookLog', WebhookLogSchema)
export const SystemSettings: Model<ISystemSettings> =
  mongoose.models.SystemSettings || mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema)
export const ApiKey: Model<IApiKey> =
  mongoose.models.ApiKey || mongoose.model<IApiKey>('ApiKey', ApiKeySchema)
export const Transaction: Model<ITransaction> =
  mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema)
export const PaymentMethod: Model<IPaymentMethod> =
  mongoose.models.PaymentMethod || mongoose.model<IPaymentMethod>('PaymentMethod', PaymentMethodSchema)
export const MpesaTransaction: Model<IMpesaTransaction> =
  mongoose.models.MpesaTransaction || mongoose.model<IMpesaTransaction>('MpesaTransaction', MpesaTransactionSchema)
export const PaymentGateway: Model<IPaymentGateway> =
  mongoose.models.PaymentGateway || mongoose.model<IPaymentGateway>('PaymentGateway', PaymentGatewaySchema)
export const MarketingPricing: Model<IMarketingPricing> =
  mongoose.models.MarketingPricing || mongoose.model<IMarketingPricing>('MarketingPricing', MarketingPricingSchema)

