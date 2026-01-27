# AWS Sandpit Setup Guide

Quick guide to deploy to your AWS Sandpit account.

## Step 1: Install AWS CLI

### Option A: Download and Install Manually
1. Download AWS CLI MSI installer: https://awscli.amazonaws.com/AWSCLIV2.msi
2. Run the installer
3. Follow the installation wizard
4. Close and reopen PowerShell

### Option B: Use Chocolatey (if installed)
```powershell
choco install awscli
```

### Verify Installation
```powershell
aws --version
```
Should show: `aws-cli/2.x.x`

---

## Step 2: Configure AWS Sandpit Credentials

You'll need credentials from your AWS Sandpit account. These are typically provided by your AWS administrator.

### Get Your Credentials

Your AWS Sandpit should provide one of these:

**Option A: Access Keys**
- AWS Access Key ID
- AWS Secret Access Key
- Region (e.g., us-east-1)

**Option B: SSO/SAML**
- SSO URL
- Account ID
- Role name

**Option C: Temporary Credentials**
- Access Key ID
- Secret Access Key
- Session Token
- Expiration time

### Configure with Access Keys

```powershell
aws configure
```

Enter when prompted:
- **AWS Access Key ID**: [Your access key]
- **AWS Secret Access Key**: [Your secret key]
- **Default region**: us-east-1 (or your sandpit region)
- **Default output format**: json

### Configure with SSO

```powershell
aws configure sso
```

Follow the prompts to set up SSO.

### Configure with Temporary Credentials

Create/edit `~/.aws/credentials`:
```ini
[default]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY
aws_session_token = YOUR_SESSION_TOKEN
```

Create/edit `~/.aws/config`:
```ini
[default]
region = us-east-1
output = json
```

### Verify Credentials

```powershell
aws sts get-caller-identity
```

Should show your account info:
```json
{
    "UserId": "...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/your-name"
}
```

---

## Step 3: Install AWS CDK

```powershell
npm install -g aws-cdk
```

### Verify Installation
```powershell
cdk --version
```
Should show: `2.115.0` or higher

---

## Step 4: Bootstrap CDK in Sandpit

This is a one-time setup for your AWS account:

```powershell
cdk bootstrap
```

This creates:
- S3 bucket for CDK assets
- IAM roles for deployments
- CloudFormation stack

**Note:** If you get permission errors, contact your AWS admin to grant CDK permissions.

---

## Step 5: Build Backend

```powershell
cd packages/backend
npm install
npm run build
```

Verify build succeeds with no errors.

---

## Step 6: Review What Will Be Deployed

```powershell
# Synthesize CloudFormation template
npm run synth

# Preview changes
cdk diff
```

This shows what resources will be created:
- Lambda function
- API Gateway
- DynamoDB table
- 3 S3 buckets
- KMS key
- IAM roles

---

## Step 7: Deploy to AWS Sandpit

```powershell
npm run deploy
```

Or with auto-approval:
```powershell
cdk deploy --require-approval never
```

**Deployment takes 5-10 minutes.**

You'll see progress:
```
ClinicalRegistryStack: deploying...
ClinicalRegistryStack: creating CloudFormation changeset...
 ✅  ClinicalRegistryStack

Outputs:
ClinicalRegistryStack.ApiEndpoint = https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod/
ClinicalRegistryStack.AudioBucketName = clinicalregistrystack-audiobucket...
ClinicalRegistryStack.ImagesBucketName = clinicalregistrystack-imagesbucket...
...
```

**IMPORTANT:** Save the `ApiEndpoint` value!

---

## Step 8: Configure Frontend

```powershell
cd ../frontend

# Create .env.local with your API endpoint
echo "VITE_API_ENDPOINT=https://YOUR-API-ID.execute-api.YOUR-REGION.amazonaws.com/prod" > .env.local
```

Replace with your actual API endpoint from Step 7.

---

## Step 9: Test the Deployment

### Test API Endpoint
```powershell
# Should return 401 (expected - no auth token)
curl -X POST https://YOUR-API-ENDPOINT/ingest
```

### Start Frontend
```powershell
npm run dev
```

Open http://localhost:5173 and test:
1. Record audio or capture image
2. Click upload
3. Check browser console for response

### Verify in AWS Console

1. **S3 Buckets**
   - Go to S3 console
   - Find your audio/images buckets
   - Check for uploaded files

2. **DynamoDB**
   - Go to DynamoDB console
   - Find RegistryRecordsTable
   - Check for draft records

3. **CloudWatch Logs**
   - Go to CloudWatch console
   - Find `/aws/lambda/ClinicalRegistryStack-IngestionLambda`
   - Check logs for upload activity

4. **Transcribe/Textract**
   - Go to Transcribe console (for audio)
   - Go to Textract console (for images)
   - Check for running jobs

---

## Troubleshooting

### "Unable to locate credentials"
```powershell
# Check credentials are configured
aws configure list

# Test credentials
aws sts get-caller-identity
```

### "CDK not bootstrapped"
```powershell
# Bootstrap CDK
cdk bootstrap

# If you need to specify account/region
cdk bootstrap aws://ACCOUNT-ID/REGION
```

### "Access Denied" during deployment
- Contact AWS admin for permissions
- You need: CloudFormation, Lambda, API Gateway, DynamoDB, S3, KMS, IAM

### "Stack already exists"
```powershell
# Update existing stack
cdk deploy

# Or destroy and redeploy
cdk destroy
cdk deploy
```

### CORS errors in frontend
- Verify API endpoint in `.env.local`
- Check CORS configuration in stack.ts
- Restart frontend dev server

### Lambda timeout
- Check CloudWatch logs for errors
- Verify IAM permissions
- Check S3 bucket names in environment variables

---

## Sandpit Limitations

Be aware of common sandpit restrictions:

1. **Time Limits**: Resources may be auto-deleted after X hours/days
2. **Service Limits**: Some services may have reduced quotas
3. **Regions**: May be restricted to specific regions
4. **Costs**: May have spending limits
5. **Permissions**: May not have full admin access

**Check with your AWS admin for specific limitations.**

---

## Monitoring Costs

Even in sandpit, monitor your usage:

```powershell
# Check current month costs
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost
```

Or use AWS Console:
- Go to AWS Cost Explorer
- View current month costs
- Set up budget alerts

---

## Cleanup

When done testing, clean up resources:

```powershell
cd packages/backend
cdk destroy
```

This removes:
- Lambda function
- API Gateway
- DynamoDB table (data retained if RemovalPolicy.RETAIN)
- S3 buckets (may need manual deletion if not empty)
- KMS key (retained for 30 days)
- IAM roles

**Note:** Some resources may be retained for safety. Check AWS console.

---

## Quick Reference

### Useful Commands

```powershell
# Check AWS identity
aws sts get-caller-identity

# List CloudFormation stacks
aws cloudformation list-stacks

# View Lambda functions
aws lambda list-functions

# View API Gateways
aws apigateway get-rest-apis

# View S3 buckets
aws s3 ls

# View DynamoDB tables
aws dynamodb list-tables

# Tail Lambda logs
aws logs tail /aws/lambda/ClinicalRegistryStack-IngestionLambda --follow
```

### CDK Commands

```powershell
# Synthesize template
cdk synth

# Show differences
cdk diff

# Deploy stack
cdk deploy

# Destroy stack
cdk destroy

# List stacks
cdk list
```

---

## Next Steps

After successful deployment:

1. **Test End-to-End**
   - Upload audio → Check Transcribe job
   - Upload image → Check Textract job
   - Verify S3 storage
   - Check DynamoDB records

2. **Implement Frontend Features**
   - Status polling
   - Error handling
   - Progress indicators
   - Retry logic

3. **Add Authentication**
   - Cognito user pool
   - API Gateway authorizer
   - Frontend auth flow

4. **Monitor and Optimize**
   - CloudWatch dashboards
   - X-Ray tracing
   - Performance tuning
   - Cost optimization

---

## Support

For sandpit-specific issues:
- Contact your AWS administrator
- Check sandpit documentation
- Review AWS service quotas
- Monitor CloudWatch logs

For application issues:
- Check [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
- Review CloudWatch logs
- Check X-Ray traces
- Test with curl commands

---

## Success Checklist

- [ ] AWS CLI installed
- [ ] AWS credentials configured
- [ ] CDK installed
- [ ] CDK bootstrapped
- [ ] Backend built successfully
- [ ] Stack deployed to AWS
- [ ] API endpoint obtained
- [ ] Frontend configured
- [ ] Can upload audio/images
- [ ] Files appear in S3
- [ ] Records in DynamoDB
- [ ] Transcribe/Textract jobs running

**All checked? You're live! 🎉**
