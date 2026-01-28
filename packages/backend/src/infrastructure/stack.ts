import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ClinicalRegistryStack extends cdk.Stack {
  public readonly registryTable: dynamodb.Table;
  public readonly audioBucket: s3.Bucket;
  public readonly imagesBucket: s3.Bucket;
  public readonly reportsBucket: s3.Bucket;
  public readonly api: apigateway.RestApi;
  public readonly kmsKey: kms.Key;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // KMS Key for encryption
    this.kmsKey = new kms.Key(this, 'RegistryEncryptionKey', {
      description: 'KMS key for Clinical Registry System encryption',
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // DynamoDB Table with GSIs
    this.registryTable = new dynamodb.Table(this, 'RegistryRecordsTable', {
      partitionKey: {
        name: 'recordId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'versionNumber',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: this.kmsKey,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      timeToLiveAttribute: 'ttl',
    });

    // GSI1: Query records by patient
    this.registryTable.addGlobalSecondaryIndex({
      indexName: 'PatientIndex',
      partitionKey: {
        name: 'patientId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdAt',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI2: Query records by clinician
    this.registryTable.addGlobalSecondaryIndex({
      indexName: 'UserIndex',
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdAt',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI3: Query current versions only
    this.registryTable.addGlobalSecondaryIndex({
      indexName: 'CurrentVersionIndex',
      partitionKey: {
        name: 'isCurrent',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'updatedAt',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // S3 Bucket for Audio Files
    this.audioBucket = new s3.Bucket(this, 'AudioBucket', {
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: this.kmsKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.INTELLIGENT_TIERING,
              transitionAfter: cdk.Duration.days(30),
            },
          ],
        },
      ],
    });

    // S3 Bucket for Images
    this.imagesBucket = new s3.Bucket(this, 'ImagesBucket', {
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: this.kmsKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.INTELLIGENT_TIERING,
              transitionAfter: cdk.Duration.days(30),
            },
          ],
        },
      ],
    });

    // S3 Bucket for Reports
    this.reportsBucket = new s3.Bucket(this, 'ReportsBucket', {
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: this.kmsKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(90),
        },
      ],
    });

    // Lambda Execution Role with necessary permissions
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Execution role for Clinical Registry Lambda functions',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSXRayDaemonWriteAccess'),
      ],
    });

    // Grant Lambda permissions to DynamoDB
    this.registryTable.grantReadWriteData(lambdaRole);

    // Grant Lambda permissions to S3 buckets
    this.audioBucket.grantReadWrite(lambdaRole);
    this.imagesBucket.grantReadWrite(lambdaRole);
    this.reportsBucket.grantReadWrite(lambdaRole);

    // Grant Lambda permissions to KMS
    this.kmsKey.grantEncryptDecrypt(lambdaRole);

    // Grant Lambda permissions to Transcribe Medical
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'transcribe:StartMedicalTranscriptionJob',
          'transcribe:GetMedicalTranscriptionJob',
          'transcribe:ListMedicalTranscriptionJobs',
        ],
        resources: ['*'],
      })
    );

    // Grant Lambda permissions to Textract
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'textract:DetectDocumentText',
          'textract:AnalyzeDocument',
          'textract:GetDocumentAnalysis',
          'textract:GetDocumentTextDetection',
        ],
        resources: ['*'],
      })
    );

    // Grant Lambda permissions to Comprehend Medical
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'comprehendmedical:DetectEntitiesV2',
          'comprehendmedical:InferICD10CM',
          'comprehendmedical:InferRxNorm',
        ],
        resources: ['*'],
      })
    );

    // API Gateway REST API
    this.api = new apigateway.RestApi(this, 'ClinicalRegistryApi', {
      restApiName: 'Clinical Registry API',
      description: 'API for Clinical Registry System',
      deployOptions: {
        stageName: 'prod',
        tracingEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
      },
    });

    // CloudWatch Log Group for API Gateway
    new logs.LogGroup(this, 'ApiGatewayLogGroup', {
      logGroupName: `/aws/apigateway/${this.api.restApiName}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Ingestion Lambda Function
    const ingestionLambda = new nodejs.NodejsFunction(this, 'IngestionLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(__dirname, '../lambdas/ingestion/handler.ts'),
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        REGISTRY_TABLE_NAME: this.registryTable.tableName,
        AUDIO_BUCKET_NAME: this.audioBucket.bucketName,
        IMAGES_BUCKET_NAME: this.imagesBucket.bucketName,
        REPORTS_BUCKET_NAME: this.reportsBucket.bucketName,
        KMS_KEY_ID: this.kmsKey.keyId,
        // AWS_REGION is automatically set by Lambda runtime, don't set it manually
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'es2020',
        externalModules: ['@aws-sdk/*'],
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    // API Gateway Integration
    const ingestResource = this.api.root.addResource('ingest');
    ingestResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(ingestionLambda, {
        proxy: true,
        integrationResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': "'*'",
            },
          },
        ],
      }),
      {
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Access-Control-Allow-Origin': true,
            },
          },
        ],
      }
    );

    // Output values
    new cdk.CfnOutput(this, 'RegistryTableName', {
      value: this.registryTable.tableName,
      description: 'DynamoDB table name for registry records',
      exportName: 'RegistryTableName',
    });

    new cdk.CfnOutput(this, 'AudioBucketName', {
      value: this.audioBucket.bucketName,
      description: 'S3 bucket name for audio files',
      exportName: 'AudioBucketName',
    });

    new cdk.CfnOutput(this, 'ImagesBucketName', {
      value: this.imagesBucket.bucketName,
      description: 'S3 bucket name for images',
      exportName: 'ImagesBucketName',
    });

    new cdk.CfnOutput(this, 'ReportsBucketName', {
      value: this.reportsBucket.bucketName,
      description: 'S3 bucket name for reports',
      exportName: 'ReportsBucketName',
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: this.api.url,
      description: 'API Gateway endpoint URL',
      exportName: 'ApiEndpoint',
    });

    new cdk.CfnOutput(this, 'KmsKeyId', {
      value: this.kmsKey.keyId,
      description: 'KMS key ID for encryption',
      exportName: 'KmsKeyId',
    });

    new cdk.CfnOutput(this, 'LambdaRoleArn', {
      value: lambdaRole.roleArn,
      description: 'Lambda execution role ARN',
      exportName: 'LambdaRoleArn',
    });
  }
}
