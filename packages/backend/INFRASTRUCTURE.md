# Infrastructure Documentation

## Overview

This document describes the AWS infrastructure for the Clinical Registry System, deployed using AWS CDK.

## Architecture Components

### 1. DynamoDB Table: RegistryRecordsTable

**Purpose**: Store registry records with complete version history and audit trails.

**Configuration**:
- Partition Key: `recordId` (String)
- Sort Key: `versionNumber` (String)
- Billing Mode: Pay-per-request
- Encryption: Customer-managed KMS key
- Point-in-time Recovery: Enabled
- TTL Attribute: `ttl` (for draft cleanup)

**Global Secondary Indexes**:

1. **PatientIndex**
   - Partition Key: `patientId`
   - Sort Key: `createdAt`
   - Purpose: Query all records for a specific patient

2. **UserIndex**
   - Partition Key: `userId`
   - Sort Key: `createdAt`
   - Purpose: Query all records created by a specific clinician

3. **CurrentVersionIndex**
   - Partition Key: `isCurrent`
   - Sort Key: `updatedAt`
   - Purpose: Query only current versions of records

### 2. S3 Buckets

#### AudioBucket
- **Purpose**: Store encrypted audio recordings
- **Encryption**: KMS with customer-managed key
- **Versioning**: Enabled
- **Lifecycle**: Transition to Intelligent Tiering after 30 days
- **Public Access**: Blocked
- **SSL**: Enforced

#### ImagesBucket
- **Purpose**: Store encrypted scanned document images
- **Encryption**: KMS with customer-managed key
- **Versioning**: Enabled
- **Lifecycle**: Transition to Intelligent Tiering after 30 days
- **Public Access**: Blocked
- **SSL**: Enforced

#### ReportsBucket
- **Purpose**: Store generated clinical reports
- **Encryption**: KMS with customer-managed key
- **Versioning**: Enabled
- **Lifecycle**: Expire after 90 days
- **Public Access**: Blocked
- **SSL**: Enforced

### 3. KMS Key

**Purpose**: Customer-managed encryption key for all data at rest.

**Configuration**:
- Key Rotation: Enabled (automatic annual rotation)
- Removal Policy: Retain (prevents accidental deletion)
- Used by: DynamoDB table, all S3 buckets

### 4. API Gateway

**Purpose**: REST API for frontend-backend communication.

**Configuration**:
- Stage: `prod`
- X-Ray Tracing: Enabled
- CloudWatch Logging: INFO level
- Data Trace: Enabled
- Metrics: Enabled
- CORS: Enabled for all origins (configure for production)

### 5. IAM Role: LambdaExecutionRole

**Purpose**: Execution role for all Lambda functions.

**Managed Policies**:
- `AWSLambdaBasicExecutionRole` (CloudWatch Logs)
- `AWSXRayDaemonWriteAccess` (X-Ray tracing)

**Inline Policies**:
- DynamoDB: Read/Write access to RegistryRecordsTable
- S3: Read/Write access to all three buckets
- KMS: Encrypt/Decrypt permissions
- Transcribe Medical: Start and get transcription jobs
- Textract: Detect and analyze document text
- Comprehend Medical: Detect medical entities

### 6. CloudWatch Logs

**Log Groups**:
- API Gateway logs: `/aws/apigateway/Clinical Registry API`
- Lambda function logs: `/aws/lambda/{function-name}` (auto-created)

**Retention**: 30 days

## Deployment

### Prerequisites

1. AWS CLI configured with appropriate credentials
2. AWS CDK CLI installed: `npm install -g aws-cdk`
3. Node.js 20.x or higher

### Deploy Infrastructure

```bash
cd packages/backend
npm install
npm run build
npm run deploy
```

### CDK Commands

- `npm run synth` - Synthesize CloudFormation template
- `npm run deploy` - Deploy stack to AWS
- `cdk diff` - Compare deployed stack with current state
- `cdk destroy` - Remove all resources (use with caution)

## Stack Outputs

After deployment, the following outputs are available:

- `RegistryTableName`: DynamoDB table name
- `AudioBucketName`: S3 bucket for audio files
- `ImagesBucketName`: S3 bucket for images
- `ReportsBucketName`: S3 bucket for reports
- `ApiEndpoint`: API Gateway endpoint URL
- `KmsKeyId`: KMS key ID
- `LambdaRoleArn`: Lambda execution role ARN

## Security

### Encryption

- **At Rest**: All data encrypted using customer-managed KMS key
- **In Transit**: TLS 1.2+ enforced on all API endpoints and S3 buckets

### Access Control

- **IAM**: Least privilege access for Lambda functions
- **S3**: Block all public access
- **DynamoDB**: Conditional writes for version immutability

### Audit Trail

- **CloudWatch Logs**: All API requests and Lambda executions logged
- **X-Ray**: Distributed tracing for performance monitoring
- **DynamoDB**: Complete version history with audit entries

## Monitoring

### CloudWatch Metrics

- API Gateway: Request count, latency, errors
- Lambda: Invocations, duration, errors, throttles
- DynamoDB: Read/write capacity, throttles
- S3: Request metrics, data transfer

### CloudWatch Alarms (to be configured)

- API Gateway 5xx errors
- Lambda errors and throttles
- DynamoDB throttles
- S3 access errors

### X-Ray Tracing

- End-to-end request tracing
- Service map visualization
- Performance bottleneck identification

## Cost Optimization

- **DynamoDB**: Pay-per-request billing (no idle capacity costs)
- **S3**: Intelligent Tiering for automatic cost optimization
- **Lambda**: Pay only for execution time
- **API Gateway**: Pay per request

## Compliance

### HIPAA Compliance

- Encryption at rest and in transit
- Audit logging enabled
- Access controls enforced
- Data retention policies configured

### Data Retention

- **Audio/Images**: Retained indefinitely (Intelligent Tiering)
- **Reports**: 90-day expiration
- **Logs**: 30-day retention
- **DynamoDB**: Version history retained indefinitely

## Disaster Recovery

- **DynamoDB**: Point-in-time recovery enabled
- **S3**: Versioning enabled for all buckets
- **KMS**: Key retained even if stack is deleted
- **Backup**: Consider AWS Backup for automated backups

## Troubleshooting

### Common Issues

1. **CDK Bootstrap Required**
   ```bash
   cdk bootstrap aws://ACCOUNT-ID/REGION
   ```

2. **Insufficient Permissions**
   - Ensure AWS credentials have necessary permissions
   - Check IAM policies for CDK deployment

3. **Stack Update Failures**
   - Check CloudFormation console for detailed errors
   - Review CloudWatch Logs for Lambda errors

### Useful Commands

```bash
# View stack events
aws cloudformation describe-stack-events --stack-name ClinicalRegistryStack

# View Lambda logs
aws logs tail /aws/lambda/FUNCTION-NAME --follow

# Test API endpoint
curl -X GET https://API-ID.execute-api.REGION.amazonaws.com/prod/
```

## Future Enhancements

- [ ] Add WebSocket API for real-time updates
- [ ] Configure CloudWatch alarms
- [ ] Set up AWS Backup for automated backups
- [ ] Add WAF for API Gateway protection
- [ ] Configure VPC for Lambda functions
- [ ] Add Secrets Manager for sensitive configuration
- [ ] Set up multi-region replication
