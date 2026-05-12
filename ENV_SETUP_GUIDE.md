# 🔐 Environment Variables Setup Guide

## 📋 Complete List of All Credentials & Secrets

This guide explains where to get each credential for your `.env` file.

---

## 🗄️ DATABASE CONFIGURATION

### **DB_HOST**
- **Type:** String
- **Default:** localhost
- **Description:** PostgreSQL database host/server address
- **For Local Development:** `localhost`
- **For Production:** Your database server IP/hostname (e.g., `db.example.com`)
- **Where to Get:** Database provider or your infrastructure team

```env
DB_HOST=localhost           # Local development
DB_HOST=db.production.com   # Production
```

### **DB_PORT**
- **Type:** Number
- **Default:** 5432
- **Description:** PostgreSQL port number
- **For Local Development:** `5432` (default PostgreSQL port)
- **For Production:** Configured port (usually 5432)
- **Where to Get:** Database administrator or your PostgreSQL installation

```env
DB_PORT=5432
```

### **DB_USERNAME**
- **Type:** String
- **Description:** PostgreSQL database user
- **Security:** ⚠️ Keep this confidential
- **For Local Development:** `postgres` (default)
- **For Production:** Create dedicated database user
- **Where to Get:** When you set up PostgreSQL

```env
DB_USERNAME=postgres                    # Local
DB_USERNAME=prod_whatsapp_user          # Production
```

### **DB_PASSWORD**
- **Type:** String
- **Description:** PostgreSQL database password
- **Security:** ⚠️ CRITICAL - Keep this secret, never commit to git
- **For Local Development:** Your local password
- **For Production:** Use strong password (minimum 20 characters)
- **Where to Get:** When you created the database user

```env
DB_PASSWORD=Manju@30                    # Local (example)
DB_PASSWORD=SecureP@ss123!xYzAbc        # Production (strong password)
```

### **DB_DATABASE**
- **Type:** String
- **Description:** PostgreSQL database name
- **For Local Development:** Any name (e.g., `whatsapp_db`)
- **For Production:** Descriptive name (e.g., `prod_whatsapp_meta`)
- **Where to Get:** Create this database in PostgreSQL

```env
DB_DATABASE=whatsapp_db             # Development
DB_DATABASE=prod_whatsapp_meta      # Production
```

---

## 🚀 APPLICATION CONFIGURATION

### **PORT**
- **Type:** Number
- **Default:** 3000
- **Description:** Application server port
- **For Development:** `3000`
- **For Production:** Use reverse proxy (nginx), typically `8080` or `3000`
- **Security Note:** Use ports > 1024 for non-root users

```env
PORT=3000              # Development & Production
PORT=8080              # Common production with reverse proxy
```

### **NODE_ENV**
- **Type:** String (enum)
- **Valid Values:** `development`, `staging`, `production`
- **Default:** `development`
- **Description:** Affects logging, error handling, performance
- **For Local Development:** `development`
- **For Production:** `production`

```env
NODE_ENV=development    # Local development
NODE_ENV=staging        # Staging/Testing environment
NODE_ENV=production     # Production deployment
```

---

## 📱 WHATSAPP PROVIDER CONFIGURATION

### **WHATSAPP_PROVIDER**
- **Type:** String (enum)
- **Valid Values:** `MESSAGE_BIRD`, `META_WHATSAPP`
- **Default:** `MESSAGE_BIRD`
- **Description:** Which WhatsApp provider to use
- **Where to Choose:** Based on your business need
- **Documentation:** 
  - Meta: https://developers.facebook.com/docs/whatsapp/cloud-api
  - MessageBird: https://messagebird.com/en/whatsapp

```env
WHATSAPP_PROVIDER=META_WHATSAPP     # Use Meta WhatsApp API
WHATSAPP_PROVIDER=MESSAGE_BIRD      # Use MessageBird API
```

---

## 🔗 META WHATSAPP INTEGRATION

### **META_APP_ID**
- **Type:** String (Numeric ID)
- **Example:** `123456789012345`
- **Description:** Your Meta App ID for WhatsApp API
- **Security:** Not as critical as secret, but don't expose
- **Where to Get:** 
  1. Go to: https://developers.facebook.com/
  2. Click "My Apps" → Select your app
  3. Copy the **App ID** from dashboard
  4. Or go to Settings → Basic → Copy App ID

```env
META_APP_ID=123456789012345
```

### **META_APP_SECRET**
- **Type:** String (Alphanumeric)
- **Example:** `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
- **Description:** Secret key for HMAC signature verification
- **Security:** ⚠️ CRITICAL - Never expose, never commit to git
- **Where to Get:**
  1. Go to: https://developers.facebook.com/
  2. My Apps → Select your app
  3. Settings → Basic
  4. Copy **App Secret** (you may need to re-authenticate)
  5. Keep this in a secure password manager

```env
META_APP_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**How to rotate securely:**
1. Generate new secret in Meta Developer Console
2. Update .env with new secret
3. Restart application
4. Delete old secret in console

### **META_BUSINESS_ACCOUNT_ID**
- **Type:** String (Numeric ID)
- **Example:** `987654321098765`
- **Description:** Meta Business Account ID
- **Where to Get:**
  1. Go to: https://business.facebook.com/
  2. Settings → Business Details
  3. Copy **Business Account ID**
  4. Or go to your WhatsApp app settings in Meta

```env
META_BUSINESS_ACCOUNT_ID=987654321098765
```

### **META_ACCESS_TOKEN**
- **Type:** String (JWT-like token)
- **Example:** `EAAMockABC123XYZ...` (very long string)
- **Description:** OAuth access token for API calls
- **Expiration:** May need periodic refresh
- **Security:** ⚠️ CRITICAL - Never expose
- **Where to Get:**
  1. Complete signup flow via `/meta/signup/start`
  2. Returned in `/meta/signup/callback` response
  3. Or manually generate from Meta Developer Console:
     - My Apps → WhatsApp → Get Started
     - Generate access token with scopes:
       - `whatsapp_business_messaging`
       - `whatsapp_business_management`

```env
META_ACCESS_TOKEN=EAAMockABC123XYZ...
```

**How to generate manually:**
1. Go to Meta Developer Console
2. Your App → Tools → Graph API Explorer
3. Select your app and Generate Token
4. Select permissions: `whatsapp_business_messaging`, `whatsapp_business_management`
5. Copy token (valid for ~2 months)

### **META_PHONE_NUMBER_ID**
- **Type:** String (Numeric ID)
- **Example:** `123456789012345`
- **Description:** WhatsApp phone number identifier
- **Where to Get:**
  1. Returned in `/meta/signup/callback` response
  2. Or from Meta Business Manager:
     - Phone Numbers → Your phone number
     - Copy Phone Number ID

```env
META_PHONE_NUMBER_ID=123456789012345
```

### **WEBHOOK_VERIFY_TOKEN**
- **Type:** String (Any value you define)
- **Example:** `mock_verify_token` or `your-secure-webhook-token-abc123`
- **Description:** Token for verifying Meta webhook requests
- **Security:** ⚠️ Important - Keep this secret
- **How to Use:**
  1. Set a strong random value here
  2. In Meta Developer Console → Webhooks
  3. Set "Verify Token" to the same value
  4. Used by `/meta/webhook` GET endpoint

```env
WEBHOOK_VERIFY_TOKEN=mock_verify_token                      # Development
WEBHOOK_VERIFY_TOKEN=your-secure-webhook-token-abc123xyz   # Production
```

**Generate secure token:**
```bash
# Linux/Mac
openssl rand -hex 32

# PowerShell
-join ((1..64) | ForEach-Object { '{0:X}' -f (Get-Random -Maximum 16) })
```

---

## 📦 MESSAGEBIRD INTEGRATION (If using as provider)

### **MESSAGEBIRD_API_KEY**
- **Type:** String (Alphanumeric)
- **Example:** `abc123def456ghi789jkl`
- **Description:** API key for MessageBird WhatsApp API
- **Security:** ⚠️ Keep this secret
- **Where to Get:**
  1. Go to: https://dashboard.messagebird.com/en/developers/access
  2. Create API Key
  3. Copy the key
  4. Select permissions: `messages:write`

```env
MESSAGEBIRD_API_KEY=abc123def456ghi789jkl
```

### **MESSAGEBIRD_ORIGINATOR**
- **Type:** String (Alphanumeric or phone number)
- **Example:** `MyBusiness` or `1234567890`
- **Description:** Sender ID for MessageBird messages
- **Where to Get:**
  1. MessageBird Dashboard → Senders
  2. Register your Originator/Sender ID
  3. Use approved ID here

```env
MESSAGEBIRD_ORIGINATOR=MyBusiness
```

---

## 🔐 OPTIONAL SECURITY & LOGGING

### **JWT_SECRET**
- **Type:** String (Any strong random value)
- **Example:** `your-super-secret-jwt-key-here`
- **Description:** Secret for JWT token signing (for future authentication)
- **Security:** ⚠️ CRITICAL - Never expose
- **When Used:** If you add JWT authentication later

```env
JWT_SECRET=your-super-secret-jwt-key-here-change-me-in-production
```

**Generate secure JWT secret:**
```bash
# Linux/Mac
openssl rand -base64 32

# Online generator
https://randomkeygen.com/
```

### **RATE_LIMIT_REQUESTS_PER_MINUTE**
- **Type:** Number
- **Default:** 100
- **Description:** API rate limiting
- **Where to Use:** Protect API from abuse

```env
RATE_LIMIT_REQUESTS_PER_MINUTE=100        # 100 requests/minute
```

---

## 📝 ENVIRONMENT-SPECIFIC CONFIGS

### Development Environment (.env.development)
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=Manju@30
DB_DATABASE=whatsapp_db

# Application
PORT=3000
NODE_ENV=development

# Provider
WHATSAPP_PROVIDER=META_WHATSAPP

# Meta (Mock values for testing)
META_APP_ID=123456789012345
META_APP_SECRET=test_secret_abc123
META_BUSINESS_ACCOUNT_ID=987654321098765
META_ACCESS_TOKEN=test_token_xyz789
META_PHONE_NUMBER_ID=123456789012345
WEBHOOK_VERIFY_TOKEN=mock_verify_token

# Security
JWT_SECRET=dev-secret-key-change-in-production
RATE_LIMIT_REQUESTS_PER_MINUTE=1000
```

### Production Environment (.env.production)
```env
# Database (Use managed service like AWS RDS)
DB_HOST=prod-db.example.com
DB_PORT=5432
DB_USERNAME=prod_whatsapp_user
DB_PASSWORD=SecureP@ss123!xYzAbc
DB_DATABASE=prod_whatsapp_meta

# Application
PORT=3000
NODE_ENV=production

# Provider
WHATSAPP_PROVIDER=META_WHATSAPP

# Meta (Real production credentials)
META_APP_ID=<YOUR_REAL_META_APP_ID>
META_APP_SECRET=<YOUR_REAL_META_APP_SECRET>
META_BUSINESS_ACCOUNT_ID=<YOUR_REAL_BUSINESS_ID>
META_ACCESS_TOKEN=<YOUR_REAL_ACCESS_TOKEN>
META_PHONE_NUMBER_ID=<YOUR_REAL_PHONE_NUMBER_ID>
WEBHOOK_VERIFY_TOKEN=<YOUR_SECURE_WEBHOOK_TOKEN>

# Security
JWT_SECRET=<YOUR_PRODUCTION_JWT_SECRET>
RATE_LIMIT_REQUESTS_PER_MINUTE=100
```

---

## ✅ Setup Checklist

### Local Development Setup
- [ ] Create `.env` file from template
- [ ] Install PostgreSQL
- [ ] Create database: `whatsapp_db`
- [ ] Create database user: `postgres`
- [ ] Fill in `DB_*` variables
- [ ] Set `WHATSAPP_PROVIDER=META_WHATSAPP`
- [ ] Fill in `META_*` variables (use test values initially)
- [ ] Set `WEBHOOK_VERIFY_TOKEN` to any value
- [ ] Generate `JWT_SECRET`
- [ ] Run: `npm install`
- [ ] Run: `npm run start:dev`
- [ ] Test with Postman collection

### Production Deployment
- [ ] Use managed database (AWS RDS, Azure Database, etc.)
- [ ] Generate strong passwords (min 20 chars, mixed case, symbols)
- [ ] Create `.env.production` with real credentials
- [ ] Never commit `.env` file to git
- [ ] Use environment variables in CI/CD pipeline (GitHub Actions, GitLab CI, etc.)
- [ ] Store secrets in vault (AWS Secrets Manager, HashiCorp Vault, etc.)
- [ ] Enable database SSL/TLS
- [ ] Rotate access tokens quarterly
- [ ] Monitor webhook signature verification
- [ ] Set up alerts for failed authentications
- [ ] Use HTTPS for all API endpoints
- [ ] Enable CORS only for trusted domains

---

## 🔒 Security Best Practices

### ✅ DO's
- ✅ Keep `.env` file in `.gitignore`
- ✅ Use strong passwords (20+ chars)
- ✅ Rotate secrets quarterly
- ✅ Use environment variables in production
- ✅ Enable HTTPS only
- ✅ Store secrets in vault/manager
- ✅ Verify webhook signatures
- ✅ Log all API calls
- ✅ Use different credentials per environment
- ✅ Monitor for suspicious activity

### ❌ DON'Ts
- ❌ Never commit `.env` to git
- ❌ Never share secrets in Slack/email
- ❌ Never hardcode credentials
- ❌ Never use same password everywhere
- ❌ Never log sensitive data
- ❌ Never expose secrets in error messages
- ❌ Never disable SSL verification
- ❌ Never share access tokens publicly
- ❌ Never use default credentials in production
- ❌ Never skip webhook verification

---

## 🧪 Testing Your Configuration

### Test Database Connection
```bash
# If using local PostgreSQL
psql -h localhost -U postgres -d whatsapp_db

# Query from app
npm run start:dev
# Check console for database connection logs
```

### Test Meta Credentials
```bash
# Call Meta signup endpoint (verify credentials work)
curl -X POST http://localhost:3000/meta/signup/start \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "test-123",
    "businessName": "Test",
    "phoneNumber": "919999999999"
  }'
```

### Test Webhook Token
```bash
# Verify webhook verification works
curl "http://localhost:3000/meta/webhook?hub.mode=subscribe&hub.verify_token=mock_verify_token&hub.challenge=test-challenge"
```

---

## 📚 Additional Resources

- **Meta Developer Docs:** https://developers.facebook.com/docs/whatsapp
- **MessageBird Docs:** https://developers.messagebird.com/
- **PostgreSQL Docs:** https://www.postgresql.org/docs/
- **NestJS Config Docs:** https://docs.nestjs.com/techniques/configuration
- **Secrets Management:** https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html

---

**Last Updated:** May 12, 2026  
**Version:** 1.0
