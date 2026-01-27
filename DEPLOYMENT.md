# Deployment Guide

## Prerequisites

### Required Software
- Node.js 20.x or higher
- npm 10.x or higher
- AWS CLI v2
- AWS CDK CLI v2.115.0 or higher

### AWS Account Setup
1. AWS account with appropriate permissions
2. AWS CLI configured with credentials
3. CDK bootstrapped in target region

## Initial Setup

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
npm install --workspace=packages/frontend

# Install backend dependencies
npm install --workspace=packages/backend
```

### 2. Bootstrap AWS CDK (First Time Only)

```bash
# Bootstrap CDK in your AWS account and region
cdk bootstrap aws://ACCOUNT-ID/REGION

# Example:
cdk bootstrap aws://123456789012/us-east-1
```

## Backend Deployment

### 1. Build Backend

```bash
cd packages/backend
npm run build
```

### 2. Synthesize CloudFormation Template

```bash
npm run synth
```

This generates the CloudFormation template in `cdk.out/` directory.

### 3. Review Changes (Optional)

```bash
cdk diff
```

This shows what changes will be made to your AWS infrastructure.

### 4. Deploy Infrastructure

```bash
npm run deploy
```

Or with auto-approval:

```bash
cdk deploy --require-approval never
```

### 5. Note Stack Outputs

After deployment, note the following outputs:
- `ApiEndpoint`: Your API Gateway URL
- `RegistryTableName`: DynamoDB table name
- `AudioBucketName`: S3 bucket for audio
- `ImagesBucketName`: S3 bucket for images
- `ReportsBucketName`: S3 bucket for reports
- `KmsKeyId`: Encryption key ID

## Frontend Deployment

### 1. Configure API Endpoint

Create `packages/frontend/.env.production`:

```env
VITE_API_ENDPOINT=https://YOUR-API-ID.execute-api.REGION.amazonaws.com/prod
```

Replace with your actual API Gateway endpoint from stack outputs.

### 2. Build Frontend

```bash
cd packages/frontend
npm run build
```

This creates optimized production build in `dist/` directory.

### 3. Deploy to S3 + CloudFront (Recommended)

#### Option A: Manual S3 Upload

```bash
# Create S3 bucket for frontend
aws s3 mb s3://clinical-registry-frontend-UNIQUE-ID

# Enable static website hosting
aws s3 website s3://clinical-registry-frontend-UNIQUE-ID \
  --index-document index.html \
  --error-document index.html

# Upload build files
aws s3 sync dist/ s3://clinical-registry-frontend-UNIQUE-ID --delete

# Make bucket public (if not using CloudFront)
aws s3api put-bucket-policy --bucket clinical-registry-frontend-UNIQUE-ID \
  --policy file://bucket-policy.json
```

#### Option B: Using AWS Amplify

```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Initialize Amplify
amplify init

# Add hosting
amplify add hosting

# Publish
amplify publish
```

#### Option C: Using Vercel/Netlify

Connect your Git repository to Vercel or Netlify and configure:
- Build command: `npm run build --workspace=packages/frontend`
- Output directory: `packages/frontend/dist`
- Environment variables: `VITE_API_ENDPOINT`

## Environment-Specific Deployments

### Development Environment

```bash
# Deploy with dev stack name
cdk deploy ClinicalRegistryStack-Dev --context env=dev
```

### Staging Environment

```bash
# Deploy with staging stack name
cdk deploy ClinicalRegistryStack-Staging --context env=staging
```

### Production Environment

```bash
# Deploy with production stack name
cdk deploy ClinicalRegistryStack-Prod --context env=prod
```

## Post-Deployment Configuration

### 1. Configure CORS (Production)

Update API Gateway CORS settings to allow only your frontend domain:

```typescript
// In packages/backend/src/infrastructure/stack.ts
defaultCorsPreflightOptions: {
  allowOrigins: ['https://your-frontend-domain.com'],
  allowMethods: apigateway.Cors.ALL_METHODS,
}
```

### 2. Set Up CloudWatch Alarms

```bash
# Create alarms for critical metrics
aws cloudwatch put-metric-alarm \
  --alarm-name api-gateway-5xx-errors \
  --alarm-description "Alert on API Gateway 5xx errors" \
  --metric-name 5XXError \
  --namespace AWS/ApiGateway \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold
```

### 3. Configure IAM Users/Roles

Create IAM users or roles for clinicians with appropriate permissions:

```bash
# Create clinician role
aws iam create-role --role-name ClinicianRole \
  --assume-role-policy-document file://trust-policy.json

# Attach policies
aws iam attach-role-policy --role-name ClinicianRole \
  --policy-arn arn:aws:iam::aws:policy/YOUR-CUSTOM-POLICY
```

## Verification

### 1. Test API Endpoint

```bash
curl https://YOUR-API-ID.execute-api.REGION.amazonaws.com/prod/health
```

### 2. Test Frontend

Open your frontend URL in a browser and verify:
- Page loads correctly
- API connection works
- Authentication flow works

### 3. Test End-to-End Flow

1. Record audio
2. Upload to backend
3. Verify S3 upload
4. Check DynamoDB record creation
5. Verify CloudWatch logs

## Monitoring

### CloudWatch Dashboards

Create a dashboard to monitor key metrics:

```bash
aws cloudwatch put-dashboard \
  --dashboard-name ClinicalRegistryDashboard \
  --dashboard-body file://dashboard.json
```

### X-Ray Tracing

View service map and traces:
1. Open AWS X-Ray console
2. Navigate to Service Map
3. View traces for API requests

## Rollback

### Rollback Backend

```bash
# List stack events to find previous version
aws cloudformation describe-stack-events \
  --stack-name ClinicalRegistryStack

# Rollback to previous version
cdk deploy --rollback
```

### Rollback Frontend

```bash
# If using S3, restore previous version
aws s3 sync s3://clinical-registry-frontend-BACKUP/ \
  s3://clinical-registry-frontend-UNIQUE-ID/ --delete
```

## Cleanup

### Remove All Resources

```bash
# Destroy CDK stack
cd packages/backend
cdk destroy

# Remove frontend S3 bucket
aws s3 rb s3://clinical-registry-frontend-UNIQUE-ID --force
```

**Warning**: This will delete all data. Ensure you have backups before proceeding.

## Troubleshooting

### CDK Deployment Fails

1. Check AWS credentials: `aws sts get-caller-identity`
2. Verify CDK bootstrap: `cdk bootstrap --show-template`
3. Check CloudFormation events in AWS console
4. Review CloudWatch Logs for Lambda errors

### Frontend Can't Connect to API

1. Verify API endpoint in `.env.production`
2. Check CORS configuration
3. Verify API Gateway deployment
4. Check browser console for errors

### Lambda Function Errors

1. Check CloudWatch Logs: `/aws/lambda/FUNCTION-NAME`
2. Verify IAM permissions
3. Check environment variables
4. Review X-Ray traces

## Security Checklist

- [ ] CORS configured for production domain only
- [ ] API Gateway has authentication enabled
- [ ] S3 buckets have public access blocked
- [ ] KMS key rotation enabled
- [ ] CloudWatch Logs retention configured
- [ ] IAM roles follow least privilege principle
- [ ] SSL/TLS enforced on all endpoints
- [ ] CloudWatch alarms configured
- [ ] Backup strategy implemented
- [ ] Disaster recovery plan documented

## Support

For issues or questions:
1. Check CloudWatch Logs
2. Review X-Ray traces
3. Check AWS Health Dashboard
4. Contact AWS Support (if applicable)
