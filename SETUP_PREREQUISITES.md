# Setup Prerequisites for Deployment

You need to install AWS CLI and AWS CDK before deploying. Here's how to get set up on Windows.

## Step 1: Install AWS CLI

### Option A: Using MSI Installer (Recommended for Windows)

1. Download the AWS CLI MSI installer:
   - 64-bit: https://awscli.amazonaws.com/AWSCLIV2.msi
   - Or visit: https://aws.amazon.com/cli/

2. Run the downloaded MSI installer

3. Follow the installation wizard

4. Verify installation:
   ```powershell
   aws --version
   ```
   Should show: `aws-cli/2.x.x ...`

### Option B: Using winget (Windows Package Manager)

```powershell
winget install Amazon.AWSCLI
```

## Step 2: Configure AWS Credentials

You need AWS credentials to deploy. If you don't have an AWS account yet, you'll need to create one first.

### If you have AWS credentials:

```powershell
aws configure
```

You'll be prompted for:
- **AWS Access Key ID**: Your access key
- **AWS Secret Access Key**: Your secret key
- **Default region**: e.g., `us-east-1`
- **Default output format**: `json`

### If you don't have AWS credentials:

1. **Create AWS Account**: https://aws.amazon.com/
2. **Create IAM User**:
   - Go to AWS Console → IAM → Users → Add User
   - Enable "Programmatic access"
   - Attach policies: `AdministratorAccess` (for development)
   - Save the Access Key ID and Secret Access Key
3. Run `aws configure` with your credentials

## Step 3: Install AWS CDK

```powershell
npm install -g aws-cdk
```

Verify installation:
```powershell
cdk --version
```
Should show: `2.115.0` or higher

## Step 4: Bootstrap CDK (First Time Only)

This sets up resources CDK needs in your AWS account:

```powershell
cdk bootstrap
```

This will use your default AWS credentials and region.

## Step 5: Verify Everything is Ready

Run these commands to verify:

```powershell
# Check Node.js
node --version
# Should be: v20.x.x or higher

# Check npm
npm --version
# Should be: 10.x.x or higher

# Check AWS CLI
aws --version
# Should be: aws-cli/2.x.x

# Check CDK
cdk --version
# Should be: 2.115.0 or higher

# Check AWS credentials
aws sts get-caller-identity
# Should show your AWS account info
```

## Alternative: Use LocalStack for Local Development

If you want to test locally without AWS:

1. Install Docker Desktop for Windows
2. Install LocalStack:
   ```powershell
   pip install localstack
   ```
3. Start LocalStack:
   ```powershell
   localstack start
   ```
4. Configure AWS CLI for LocalStack:
   ```powershell
   aws configure --profile localstack
   # Use dummy credentials
   # Endpoint: http://localhost:4566
   ```

## Next Steps

Once everything is installed:

1. **Build the backend**:
   ```powershell
   cd packages/backend
   npm run build
   ```

2. **Deploy to AWS**:
   ```powershell
   npm run deploy
   ```

3. **Get your API endpoint** from the deployment output

## Troubleshooting

### "aws: command not found" after installation
- Close and reopen PowerShell/Terminal
- Check if AWS CLI is in PATH: `$env:PATH`
- Restart your computer if needed

### "cdk: command not found" after installation
- Close and reopen PowerShell/Terminal
- Check npm global bin path: `npm config get prefix`
- Add to PATH if needed

### "Unable to locate credentials"
- Run `aws configure` to set up credentials
- Check credentials file: `~/.aws/credentials`
- Verify with: `aws sts get-caller-identity`

### CDK Bootstrap fails
- Verify AWS credentials are correct
- Check you have sufficient IAM permissions
- Try specifying region: `cdk bootstrap aws://ACCOUNT-ID/REGION`

## Cost Considerations

**Before deploying, understand the costs:**

- **Free Tier Eligible** (first 12 months):
  - Lambda: 1M requests/month free
  - API Gateway: 1M requests/month free
  - DynamoDB: 25GB storage free
  - S3: 5GB storage free

- **Ongoing Costs** (after free tier):
  - KMS Key: ~$1/month
  - Lambda: $0.20 per 1M requests
  - API Gateway: $3.50 per 1M requests
  - DynamoDB: Pay per request (~$1.25 per 1M writes)
  - S3: ~$0.023 per GB/month

**Estimated development cost: $5-10/month**

## Security Best Practices

1. **Never commit AWS credentials** to git
2. **Use IAM roles** instead of access keys when possible
3. **Enable MFA** on your AWS account
4. **Use least privilege** IAM policies
5. **Rotate credentials** regularly
6. **Monitor costs** with AWS Budgets

## Ready to Deploy?

Once you have:
- ✅ AWS CLI installed and configured
- ✅ CDK installed
- ✅ CDK bootstrapped
- ✅ AWS credentials working

You're ready to deploy! Follow the [QUICK_START.md](./QUICK_START.md) guide.
