# Saan Baha — AWS Deployment Plan with Secure Login

**Project:** Saan Baha Flood Map  
**Date:** May 6, 2026  
**Goal:** Serve the interactive flood map (`floodmap.html`) on AWS behind a secure login page, so only authorized users can access the map.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Local File Changes](#2-local-file-changes)
3. [AWS Services Required](#3-aws-services-required)
4. [Step-by-Step Setup](#4-step-by-step-setup)
5. [Security Model](#5-security-model)
6. [File Structure](#6-file-structure)
7. [Environment Variables / Config](#7-environment-variables--config)
8. [Cost Estimate](#8-cost-estimate)

---

## 1. Architecture Overview

```
User Browser
     │
     ▼ HTTPS
┌─────────────────────────────────────────┐
│         Amazon CloudFront               │
│   (CDN, HTTPS termination, WAF)         │
│                                         │
│  Behavior 1: /*  → S3 (public assets)   │
│  Behavior 2: /floodmap.html             │
│             → Lambda@Edge (auth check)  │
│               → S3 (if token valid)     │
└─────────────────────────────────────────┘
         │                    │
         ▼                    ▼
   ┌──────────┐       ┌────────────────┐
   │  S3      │       │  Lambda@Edge   │
   │ (private)│       │  (JWT verify)  │
   │          │       └────────────────┘
   │ index.html        ▲
   │ floodmap.html     │ validates tokens
   └──────────┘        │
                ┌──────────────────┐
                │  Amazon Cognito  │
                │  User Pool       │
                │  (auth + tokens) │
                └──────────────────┘
```

### Request Flow

1. User visits `https://<cloudfront-domain>/` → receives `index.html` (login page)
2. User enters credentials → Cognito SDK authenticates against the User Pool
3. On success, Cognito returns **ID Token** + **Access Token** (JWTs) stored in `sessionStorage`
4. Browser redirects to `/floodmap.html` with the token in a secure cookie
5. CloudFront intercepts the request → Lambda@Edge validates the JWT signature and expiry
6. If valid → CloudFront fetches `floodmap.html` from S3 and returns it
7. If invalid/missing → Lambda@Edge returns a `302` redirect to `/` (login page)

---

## 2. Local File Changes

### 2a. Rename `index.html` → `floodmap.html`
The existing Leaflet flood map becomes `floodmap.html`. A small token-guard script is prepended to it that:
- Reads the JWT from `sessionStorage`
- Verifies it is present and not expired (client-side check as UX convenience)
- Redirects to `/` if the check fails (the real enforcement is Lambda@Edge)

### 2b. Create new `index.html` (Login Page)
A clean, responsive login page that:
- Accepts **username** and **password** inputs
- Uses the **AWS Amplify Auth** (`amazon-cognito-identity-js`) SDK via CDN
- Calls `CognitoUserPool.authenticateUser()` on submit
- Stores the resulting **ID Token** in `sessionStorage` and sets it as a cookie for Lambda@Edge
- Redirects to `/floodmap.html` on success
- Shows clear error messages on failure (wrong password, user not found, etc.)

### 2c. Create `lambda-edge/auth.js`
A **Viewer Request** Lambda@Edge function that:
- Intercepts every request to `/floodmap.html`
- Reads the `auth-token` cookie from the request
- Verifies the JWT using Cognito's public JWKS (JSON Web Key Set) endpoint
- Checks token expiry and `aud` (audience) claim against the Cognito App Client ID
- Returns the original request (allow) if valid, or a `302` to `/` if not

### 2d. Create `README-deploy.md`
Step-by-step AWS Console and CLI instructions for deploying the above.

---

## 3. AWS Services Required

| Service | Purpose | Cost Model |
|---|---|---|
| **Amazon S3** | Static file hosting (private bucket) | ~$0.023/GB/month |
| **Amazon CloudFront** | CDN, HTTPS, route-level access control | ~$0.0085/10k requests |
| **AWS Lambda@Edge** | JWT validation on each request to `/floodmap.html` | $0.60/million requests |
| **Amazon Cognito User Pool** | User accounts, authentication, JWT issuance | Free up to 50k MAU |
| **AWS WAF** *(optional)* | Rate limiting, IP allow-listing | $5/month + usage |
| **AWS Certificate Manager** | Free TLS certificate for custom domain | Free |

**Estimated monthly cost for low-traffic use (<1,000 visits/month): ~$1–3 USD**

---

## 4. Step-by-Step Setup

### Step 1 — Create a Cognito User Pool

```bash
# Via AWS CLI
aws cognito-idp create-user-pool \
  --pool-name saan-baha-users \
  --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true}" \
  --auto-verified-attributes email

# Create app client (no client secret — required for browser JS)
aws cognito-idp create-user-pool-client \
  --user-pool-id <USER_POOL_ID> \
  --client-name saan-baha-web \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH
```

**Note down:**
- `USER_POOL_ID` (e.g. `ap-southeast-1_XXXXXXXXX`)
- `APP_CLIENT_ID` (e.g. `1abc2defghij3klmnop4qrstu5`)
- `REGION` (e.g. `ap-southeast-1`)

### Step 2 — Create Users

```bash
# Admin-create a user (no self-registration)
aws cognito-idp admin-create-user \
  --user-pool-id <USER_POOL_ID> \
  --username user@example.com \
  --temporary-password TempPass123! \
  --user-attributes Name=email,Value=user@example.com Name=email_verified,Value=true
```

### Step 3 — Create S3 Bucket

```bash
# Create private bucket
aws s3api create-bucket \
  --bucket saan-baha-app \
  --region ap-southeast-1 \
  --create-bucket-configuration LocationConstraint=ap-southeast-1

# Block all public access
aws s3api put-public-access-block \
  --bucket saan-baha-app \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# Upload files
aws s3 cp saan-baha/index.html s3://saan-baha-app/index.html
aws s3 cp saan-baha/floodmap.html s3://saan-baha-app/floodmap.html
```

### Step 4 — Create CloudFront Origin Access Control (OAC)

1. In the AWS Console → CloudFront → **Origin Access** → Create OAC
2. Name: `saan-baha-oac`, Signing behavior: **Sign requests**
3. Attach the OAC to the CloudFront distribution (Step 5)
4. Update the S3 bucket policy to allow only this OAC:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::saan-baha-app/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::<ACCOUNT_ID>:distribution/<DISTRIBUTION_ID>"
        }
      }
    }
  ]
}
```

### Step 5 — Create CloudFront Distribution

**Via AWS Console:**
1. CloudFront → Create Distribution
2. Origin domain: `saan-baha-app.s3.ap-southeast-1.amazonaws.com`
3. Origin access: Use the OAC created in Step 4
4. Viewer protocol policy: **Redirect HTTP to HTTPS**
5. Default root object: `index.html`
6. Custom error responses:
   - 403 → `/index.html`, HTTP 200
   - 404 → `/index.html`, HTTP 200

### Step 6 — Deploy Lambda@Edge

> **Important:** Lambda@Edge functions must be created in **us-east-1** regardless of your app's region.

```bash
# Package the function
cd saan-baha/lambda-edge
zip auth.zip auth.js node_modules/

# Create the Lambda function in us-east-1
aws lambda create-function \
  --function-name saan-baha-auth \
  --runtime nodejs20.x \
  --role arn:aws:iam::<ACCOUNT_ID>:role/lambda-edge-role \
  --handler auth.handler \
  --zip-file fileb://auth.zip \
  --region us-east-1

# Publish a version (required for Lambda@Edge)
aws lambda publish-version \
  --function-name saan-baha-auth \
  --region us-east-1
```

**Attach to CloudFront behavior:**
1. In your CloudFront distribution → Behaviors tab
2. Create a new behavior: Path pattern `/floodmap.html`
3. Under **Function associations** → Viewer request → Lambda@Edge
4. Enter the Lambda function ARN with version: `arn:aws:lambda:us-east-1:<ACCOUNT_ID>:function:saan-baha-auth:<VERSION>`

### Step 7 — Plug in Cognito Config to `index.html`

Replace the placeholder values in `index.html`:

```javascript
const COGNITO_REGION = 'ap-southeast-1';          // your region
const USER_POOL_ID   = 'ap-southeast-1_XXXXXXX';  // from Step 1
const APP_CLIENT_ID  = '1abc2defghijXXXXXXXXXX';  // from Step 1
```

Re-upload `index.html` and invalidate the CloudFront cache:

```bash
aws s3 cp saan-baha/index.html s3://saan-baha-app/index.html
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION_ID> \
  --paths "/*"
```

---

## 5. Security Model

| Threat | Mitigation |
|---|---|
| Unauthenticated direct URL access to `/floodmap.html` | Lambda@Edge rejects requests without a valid JWT |
| Token tampering | Lambda@Edge verifies JWT signature using Cognito's public JWKS |
| Expired token | Lambda@Edge checks `exp` claim; expired tokens are rejected |
| S3 direct access bypass | Bucket is fully private; only CloudFront OAC can read objects |
| Brute-force login | Cognito built-in lockout after failed attempts; optional WAF rate limiting |
| HTTP interception | CloudFront enforces HTTPS-only |
| Client-side JS bypass | Server-side enforcement via Lambda@Edge means disabling JS doesn't help |

### Token Lifecycle

```
Login → Cognito issues ID Token (1 hr) + Refresh Token (30 days)
     → ID Token stored in sessionStorage + auth-token cookie (httpOnly, Secure)
     → Lambda@Edge validates ID Token on each request to /floodmap.html
     → On expiry, login page re-authenticates silently using Refresh Token (optional)
```

---

## 6. File Structure

```
saan-baha/
├── index.html              ← Login page (public)
├── floodmap.html           ← Protected flood map (was index.html)
├── style.css               ← Shared styles (optional)
├── script.js               ← Shared scripts (optional)
├── lambda-edge/
│   ├── auth.js             ← Lambda@Edge JWT validator
│   ├── package.json        ← Dependencies (jwks-rsa, jsonwebtoken)
│   └── node_modules/       ← Bundled with zip for deployment
├── DEPLOYMENT-PLAN.md      ← This file
└── README-deploy.md        ← Quickstart deployment guide
```

---

## 7. Environment Variables / Config

The following values must be filled in before deployment. They are **not secrets** — they are safe to embed in client-side JS (Cognito is designed this way).

| Variable | Where to find | Example |
|---|---|---|
| `COGNITO_REGION` | AWS Console → Cognito → User Pool | `ap-southeast-1` |
| `USER_POOL_ID` | AWS Console → Cognito → User Pool → Pool ID | `ap-southeast-1_AbCdEfGhI` |
| `APP_CLIENT_ID` | AWS Console → Cognito → App clients | `3t6o8p2q1r4s5u7v9w0x` |
| `CLOUDFRONT_DOMAIN` | AWS Console → CloudFront → Domain name | `d1abc2defg3hij.cloudfront.net` |

**The Lambda@Edge function** reads `USER_POOL_ID`, `APP_CLIENT_ID`, and `COGNITO_REGION` from its own source code (hardcoded at deploy time) — these values are needed to fetch the JWKS endpoint for signature verification.

---

## 8. Cost Estimate

For a small research/academic tool with ~500 unique users/month:

| Service | Estimated Usage | Monthly Cost |
|---|---|---|
| S3 storage | ~30 MB (index + floodmap) | < $0.01 |
| S3 requests | ~2,000 GET requests | < $0.01 |
| CloudFront | ~5,000 requests, ~150 MB transfer | ~$0.02 |
| Lambda@Edge | ~1,000 invocations | < $0.01 |
| Cognito | < 50,000 MAU | **Free** |
| **Total** | | **~$0.05–$1/month** |

> Costs scale with usage but remain very low for academic/research audiences.

---

*Plan authored May 6, 2026. Adjust region and resource names as needed for your AWS account.*
