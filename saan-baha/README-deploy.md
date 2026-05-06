# Saan Baha — Deployment Quickstart

This guide walks you through deploying the Saan Baha flood map to AWS with secure login.  
For full architectural details, see [DEPLOYMENT-PLAN.md](./DEPLOYMENT-PLAN.md).

---

## Prerequisites

- AWS account with admin or sufficient IAM permissions
- AWS CLI installed and configured (`aws configure`)
- Node.js 20+ (for bundling Lambda@Edge)

---

## Step 1 — Cognito User Pool

### 1a. Create the User Pool

```bash
aws cognito-idp create-user-pool \
  --pool-name saan-baha-users \
  --region ap-southeast-1 \
  --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=false}" \
  --auto-verified-attributes email \
  --username-attributes email
```

Save the `UserPool.Id` from the output (e.g. `ap-southeast-1_AbCdEfGhI`).

### 1b. Create App Client

```bash
aws cognito-idp create-user-pool-client \
  --user-pool-id <USER_POOL_ID> \
  --region ap-southeast-1 \
  --client-name saan-baha-web \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH
```

Save the `ClientId` from the output.

### 1c. Create a User

```bash
aws cognito-idp admin-create-user \
  --user-pool-id <USER_POOL_ID> \
  --region ap-southeast-1 \
  --username user@example.com \
  --temporary-password TempPass123! \
  --user-attributes Name=email,Value=user@example.com Name=email_verified,Value=true \
  --message-action SUPPRESS
```

---

## Step 2 — Update Config Values in Source Files

Edit **`index.html`** (login page) — find and replace the three placeholder values:

```javascript
var COGNITO_REGION = 'ap-southeast-1';         // ← your region
var USER_POOL_ID   = 'REPLACE_USER_POOL_ID';   // ← from Step 1a
var APP_CLIENT_ID  = 'REPLACE_APP_CLIENT_ID';  // ← from Step 1b
```

Edit **`lambda-edge/auth.js`** — same three values near the top:

```javascript
const COGNITO_REGION = 'ap-southeast-1';
const USER_POOL_ID   = 'REPLACE_USER_POOL_ID';
const APP_CLIENT_ID  = 'REPLACE_APP_CLIENT_ID';
```

---

## Step 3 — S3 Bucket

### 3a. Create Private Bucket

```bash
aws s3api create-bucket \
  --bucket saan-baha-app \
  --region ap-southeast-1 \
  --create-bucket-configuration LocationConstraint=ap-southeast-1

aws s3api put-public-access-block \
  --bucket saan-baha-app \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

### 3b. Upload Files

```bash
aws s3 cp index.html     s3://saan-baha-app/index.html
aws s3 cp floodmap.html  s3://saan-baha-app/floodmap.html
```

---

## Step 4 — CloudFront Distribution

### 4a. Create via AWS Console

1. Go to **CloudFront** → **Create Distribution**
2. **Origin domain:** `saan-baha-app.s3.ap-southeast-1.amazonaws.com`
3. **Origin access:** Create new OAC → name it `saan-baha-oac`
4. **Viewer protocol policy:** Redirect HTTP to HTTPS
5. **Default root object:** `index.html`
6. **Custom error responses** (add two):
   - Error code `403` → Response page `/index.html` → HTTP 200
   - Error code `404` → Response page `/index.html` → HTTP 200
7. Click **Create distribution** — note the **Distribution ID** and **Domain name**

### 4b. Update the S3 Bucket Policy

After CloudFront creates the distribution, it will prompt you to copy a bucket policy.  
Paste it into the S3 bucket's **Permissions → Bucket Policy** section.  
It should look like:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "cloudfront.amazonaws.com" },
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

---

## Step 5 — Bundle and Deploy Lambda@Edge

> Lambda@Edge **must** be created in `us-east-1`.

### 5a. Install dependencies and zip

```bash
cd lambda-edge
npm ci --omit=dev
# Windows (PowerShell) — use 7-Zip or the Compress-Archive cmdlet:
Compress-Archive -Path auth.js, node_modules -DestinationPath auth.zip -Force
```

Or on Linux/macOS:
```bash
zip -r auth.zip auth.js node_modules/
```

### 5b. Create IAM Role for Lambda@Edge

```bash
aws iam create-role \
  --role-name lambda-edge-basic \
  --assume-role-policy-document '{
    "Version":"2012-10-17",
    "Statement":[{
      "Effect":"Allow",
      "Principal":{"Service":["lambda.amazonaws.com","edgelambda.amazonaws.com"]},
      "Action":"sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy \
  --role-name lambda-edge-basic \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

### 5c. Create and Publish Lambda Function

```bash
aws lambda create-function \
  --function-name saan-baha-auth \
  --runtime nodejs20.x \
  --role arn:aws:iam::<ACCOUNT_ID>:role/lambda-edge-basic \
  --handler auth.handler \
  --zip-file fileb://auth.zip \
  --region us-east-1

aws lambda publish-version \
  --function-name saan-baha-auth \
  --region us-east-1
```

Note the `Version` number in the output (e.g. `1`).

### 5d. Attach to CloudFront Behavior

1. AWS Console → **CloudFront** → your distribution → **Behaviors** tab
2. Click **Create behavior**
   - **Path pattern:** `/floodmap.html`
   - **Origin:** your S3 origin
   - **Viewer protocol policy:** HTTPS only
   - **Function associations → Viewer request → Lambda@Edge**
   - ARN: `arn:aws:lambda:us-east-1:<ACCOUNT_ID>:function:saan-baha-auth:<VERSION>`
3. Save — CloudFront will deploy the change (takes ~5 minutes)

---

## Step 6 — Test

1. Visit `https://<CLOUDFRONT_DOMAIN>/` → you should see the login page
2. Try visiting `https://<CLOUDFRONT_DOMAIN>/floodmap.html` directly (unauthenticated) → should redirect to login
3. Log in with the credentials you created in Step 1c
4. On first login you will be prompted to set a new password
5. After login you should be redirected to the flood map

---

## Step 7 — Invalidate CloudFront Cache (after any file update)

```bash
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION_ID> \
  --paths "/*"
```

---

## Optional — Custom Domain

1. Register a domain or use an existing one in **Route 53**
2. Request a certificate in **AWS Certificate Manager** (ACM) in `us-east-1`
3. In CloudFront distribution settings → **Alternate domain names** → add your domain
4. Select your ACM certificate
5. In Route 53 → create an **A record** (alias) pointing to the CloudFront distribution

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Login always redirects back to `/` | Wrong `USER_POOL_ID` or `APP_CLIENT_ID` in `index.html` | Double-check Step 2 |
| `floodmap.html` accessible without login | Lambda@Edge not attached or not yet deployed | Check CloudFront Behaviors, wait 5 min |
| Lambda@Edge returns 502 | Missing dependencies in zip | Re-run `npm ci` before zipping |
| 403 from S3 | Bucket policy missing or wrong distribution ARN | Check Step 4b |
| Token expired after 1 hour | Expected — user must log in again | Optionally implement refresh token flow |

---

*For questions about this deployment, refer to [DEPLOYMENT-PLAN.md](./DEPLOYMENT-PLAN.md).*
