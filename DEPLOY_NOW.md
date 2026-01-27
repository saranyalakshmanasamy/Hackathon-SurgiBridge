# Deploy to AWS Sandpit - Step by Step

Follow these exact steps to deploy to your AWS Sandpit account.

## ✅ Pre-flight Checklist

Before starting, make sure you have:
- [ ] AWS Sandpit credentials (Access Key + Secret Key, or SSO details)
- [ ] PowerShell or Terminal open
- [ ] Internet connection

---

## Step 1: Install AWS CLI (5 minutes)

### Download and Install
1. Download: https://awscli.amazonaws.com/AWSCLIV2.msi
2. Run the installer
3. Click through the installation wizard
4. **Close and reopen PowerShell** (important!)

### Verify Installation
```powershell
aws --version
```
✅ Should show: `aws-cli/2.x.x`

---

## Step 2: Configure AWS Credentials (2 minutes)

### If you have Access Keys:
```powershell
aws configure
```

Enter when prompted:
```
AWS Access Key ID: [paste your access key]
AWS Secret Access Key: [paste your secret key]
Default region name: us-east-1
Default output format: json
```

### If you have SSO:
```powershell
aws configure sso
```
Follow the prompts.

### Verify It Works
```powershell
aws sts get-caller-identity
```
✅ Should show your account details

---

## Step 3: Install AWS CDK (2 minutes)

```powershell
npm install -g aws-cdk
```

### Verify Installation
```powershell
cdk --version
```
✅ Should show: `2.115.0` or higher

---

## Step 4: Bootstrap CDK (2 minutes)

This is a one-time setup:

```powershell
cdk bootstrap
```

✅ Should complete without errors

---

## Step 5: Build Backend (2 minutes)

```powershell
cd packages/backend
npm install
npm run build
```

✅ Should compile without errors

---

## Step 6: Deploy to AWS (10 minutes)

```powershell
npm run deploy
```

**What happens:**
- CDK creates CloudFormation stack
- Deploys Lambda function
- Creates API Gateway
- Creates DynamoDB table
- Creates S3 buckets
- Sets up IAM roles

**Wait for completion...**

You'll see:
```
✅  ClinicalRegistryStack

Outputs:
ClinicalRegistryStack.ApiEndpoint = https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod/
```

**📝 COPY THIS API ENDPOINT!** You'll need it next.

---

## Step 7: Configure Frontend (2 minutes)

```powershell
cd ../frontend
```

Create `.env.local` file with your API endpoint:

```powershell
# Replace with YOUR actual endpoint from Step 6
echo "VITE_API_ENDPOINT=https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod" > .env.local
```

---

## Step 8: Start Frontend (1 minute)

```powershell
npm run dev
```

✅ Should start on http://localhost:5173

---

## Step 9: Test It! 🎉

1. Open http://localhost:5173 in your browser
2. Try recording audio or capturing an image
3. Click upload
4. Check browser console for success message

### Verify in AWS Console

1. **Go to AWS Console** (your sandpit account)

2. **Check S3**:
   - Services → S3
   - Look for buckets starting with `clinicalregistrystack-`
   - Check for uploaded files

3. **Check DynamoDB**:
   - Services → DynamoDB → Tables
   - Find `ClinicalRegistryStack-RegistryRecordsTable...`
   - Click "Explore table items"
   - See your draft records

4. **Check CloudWatch Logs**:
   - Services → CloudWatch → Log groups
   - Find `/aws/lambda/ClinicalRegistryStack-IngestionLambda...`
   - View recent logs

5. **Check Transcribe** (for audio):
   - Services → Amazon Transcribe
   - Check "Transcription jobs"

6. **Check Textract** (for images):
   - Services → Amazon Textract
   - Check recent jobs

---

## 🎊 Success!

If you can see:
- ✅ Files in S3
- ✅ Records in DynamoDB
- ✅ Logs in CloudWatch
- ✅ Jobs in Transcribe/Textract

**You're fully deployed and operational!**

---

## 🔧 Troubleshooting

### "Unable to locate credentials"
```powershell
aws configure
# Re-enter your credentials
```

### "CDK not bootstrapped"
```powershell
cdk bootstrap
```

### "Access Denied"
- Check with your AWS admin
- You need permissions for: CloudFormation, Lambda, API Gateway, DynamoDB, S3, KMS, IAM

### "Stack already exists"
```powershell
# Update the stack
cdk deploy
```

### CORS errors in browser
```powershell
# Verify endpoint in .env.local
cat .env.local

# Restart frontend
npm run dev
```

### Can't see files in S3
- Check bucket names in deployment output
- Verify upload succeeded in browser console
- Check CloudWatch logs for errors

---

## 📊 Monitor Your Deployment

### View Lambda Logs (Real-time)
```powershell
aws logs tail /aws/lambda/ClinicalRegistryStack-IngestionLambda --follow
```

### Check API Gateway
```powershell
aws apigateway get-rest-apis
```

### List S3 Buckets
```powershell
aws s3 ls
```

### View DynamoDB Tables
```powershell
aws dynamodb list-tables
```

---

## 🧹 Cleanup (When Done)

To remove all resources:

```powershell
cd packages/backend
cdk destroy
```

**⚠️ Warning:** This deletes everything. Make sure you've saved any important data.

---

## 💰 Cost Estimate

In AWS Sandpit (with free tier):
- **Lambda**: ~$0 (1M requests free)
- **API Gateway**: ~$0 (1M requests free)
- **DynamoDB**: ~$0 (25GB free)
- **S3**: ~$0 (5GB free)
- **KMS**: ~$1/month
- **Transcribe**: $0.024/minute
- **Textract**: $0.0015/page

**Estimated cost for testing: $5-10/month**

---

## 🚀 What's Next?

Now that you're deployed:

1. **Test thoroughly**
   - Upload various audio files
   - Upload various images
   - Check processing results

2. **Implement features**
   - Status polling
   - Error handling
   - Review interface

3. **Add authentication**
   - Cognito user pool
   - Login flow

4. **Monitor and optimize**
   - CloudWatch dashboards
   - Performance tuning

---

## 📚 More Resources

- **Detailed Integration**: [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
- **Sandpit Specific**: [AWS_SANDPIT_SETUP.md](./AWS_SANDPIT_SETUP.md)
- **Architecture Details**: [packages/backend/INFRASTRUCTURE.md](./packages/backend/INFRASTRUCTURE.md)

---

## ✅ Deployment Checklist

- [ ] AWS CLI installed and configured
- [ ] CDK installed and bootstrapped
- [ ] Backend built successfully
- [ ] Stack deployed to AWS
- [ ] API endpoint copied
- [ ] Frontend configured with endpoint
- [ ] Frontend running locally
- [ ] Successfully uploaded test file
- [ ] Verified file in S3
- [ ] Verified record in DynamoDB
- [ ] Checked CloudWatch logs

**All done? Congratulations! 🎉**

You now have a fully functional Clinical Registry System deployed to AWS!
