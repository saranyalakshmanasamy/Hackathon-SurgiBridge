import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { TranscribeClient, StartMedicalTranscriptionJobCommand } from '@aws-sdk/client-transcribe';
import { TextractClient, StartDocumentTextDetectionCommand } from '@aws-sdk/client-textract';
import { getEnvironmentConfig } from '../../config/environment.js';
import { RegistryRecordItem, IngestionMetadata } from '../../types/index.js';
import { randomUUID } from 'crypto';

const config = getEnvironmentConfig();
const s3Client = new S3Client({ region: config.region });
const dynamoClient = new DynamoDBClient({ region: config.region });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const transcribeClient = new TranscribeClient({ region: config.region });
const textractClient = new TextractClient({ region: config.region });

interface IngestionRequest {
  patientId: string;
  encounterId: string;
  userId: string;
  contentType: 'audio' | 'image';
  data: string; // base64 encoded
  metadata: IngestionMetadata;
}

interface IngestionResponse {
  success: boolean;
  recordId: string;
  s3Key: string;
  uploadTimestamp: string;
  jobId?: string;
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    retryable: boolean;
    timestamp: string;
    requestId: string;
  };
}

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId;

  try {
    // Handle OPTIONS request for CORS
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: '',
      };
    }

    // Validate HTTP method
    if (event.httpMethod !== 'POST') {
      return createErrorResponse(
        405,
        'METHOD_NOT_ALLOWED',
        'Only POST method is allowed',
        false,
        requestId
      );
    }

    // Parse and validate request body
    if (!event.body) {
      return createErrorResponse(
        400,
        'VALIDATION_ERROR',
        'Request body is required',
        false,
        requestId
      );
    }

    let request: IngestionRequest;
    try {
      request = JSON.parse(event.body);
    } catch (error) {
      return createErrorResponse(
        400,
        'VALIDATION_ERROR',
        'Invalid JSON in request body',
        false,
        requestId
      );
    }

    // Validate request payload
    const validationError = validateRequest(request);
    if (validationError) {
      return createErrorResponse(
        400,
        'VALIDATION_ERROR',
        validationError,
        false,
        requestId
      );
    }

    // Validate authentication (check for Authorization header)
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      return createErrorResponse(
        401,
        'AUTHORIZATION_ERROR',
        'Authorization header is required',
        false,
        requestId
      );
    }

    // Generate unique record ID
    const recordId = randomUUID();
    const timestamp = new Date().toISOString();

    // Get client IP address
    const ipAddress = event.requestContext.identity.sourceIp || 'unknown';

    // Process based on content type
    let response: IngestionResponse;
    if (request.contentType === 'audio') {
      response = await handleAudioUpload(request, recordId, timestamp, ipAddress);
    } else if (request.contentType === 'image') {
      response = await handleImageUpload(request, recordId, timestamp, ipAddress);
    } else {
      return createErrorResponse(
        400,
        'VALIDATION_ERROR',
        'Invalid content type. Must be "audio" or "image"',
        false,
        requestId
      );
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Ingestion error:', error);
    return createErrorResponse(
      500,
      'INTERNAL_ERROR',
      'An unexpected error occurred during ingestion',
      true,
      requestId,
      error
    );
  }
};

function validateRequest(request: IngestionRequest): string | null {
  if (!request.patientId || typeof request.patientId !== 'string') {
    return 'patientId is required and must be a string';
  }
  if (!request.encounterId || typeof request.encounterId !== 'string') {
    return 'encounterId is required and must be a string';
  }
  if (!request.userId || typeof request.userId !== 'string') {
    return 'userId is required and must be a string';
  }
  if (!request.contentType || !['audio', 'image'].includes(request.contentType)) {
    return 'contentType is required and must be "audio" or "image"';
  }
  if (!request.data || typeof request.data !== 'string') {
    return 'data is required and must be a base64 encoded string';
  }
  if (!request.metadata || typeof request.metadata !== 'object') {
    return 'metadata is required and must be an object';
  }
  if (!request.metadata.timestamp || typeof request.metadata.timestamp !== 'string') {
    return 'metadata.timestamp is required and must be a string';
  }
  if (!request.metadata.deviceInfo || typeof request.metadata.deviceInfo !== 'object') {
    return 'metadata.deviceInfo is required and must be an object';
  }
  if (!request.metadata.context || !['theatre', 'ward', 'office'].includes(request.metadata.context)) {
    return 'metadata.context is required and must be "theatre", "ward", or "office"';
  }
  return null;
}

async function handleAudioUpload(
  request: IngestionRequest,
  recordId: string,
  timestamp: string,
  ipAddress: string
): Promise<IngestionResponse> {
  // Generate S3 key for audio file
  const s3Key = `${request.patientId}/${request.encounterId}/${recordId}/audio.webm`;

  // Decode base64 data
  const audioBuffer = Buffer.from(request.data, 'base64');

  // Upload to S3 with SSE-KMS encryption
  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: config.audioBucketName,
        Key: s3Key,
        Body: audioBuffer,
        ContentType: 'audio/webm',
        ServerSideEncryption: 'aws:kms',
        SSEKMSKeyId: config.kmsKeyId,
        Metadata: {
          patientId: request.patientId,
          encounterId: request.encounterId,
          userId: request.userId,
          recordId: recordId,
          uploadTimestamp: timestamp,
        },
      })
    );
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error('AUDIO_UPLOAD_FAILED: Failed to upload audio to S3');
  }

  // Create DynamoDB draft record
  const draftRecord: RegistryRecordItem = {
    recordId,
    versionNumber: '0.0', // Draft version
    patientId: request.patientId,
    encounterId: request.encounterId,
    userId: request.userId,
    status: 'draft',
    fields: {},
    isCurrent: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    metadata: {
      audioS3Key: s3Key,
      context: request.metadata.context,
      ipAddress,
      deviceInfo: request.metadata.deviceInfo,
    },
    auditTrail: [
      {
        action: 'create',
        userId: request.userId,
        timestamp,
        ipAddress,
        deviceInfo: request.metadata.deviceInfo,
      },
    ],
    ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days TTL for drafts
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: config.registryTableName,
        Item: draftRecord,
      })
    );
  } catch (error) {
    console.error('DynamoDB write error:', error);
    throw new Error('DRAFT_SAVE_FAILED: Failed to create draft record in DynamoDB');
  }

  // Trigger Amazon Transcribe Medical
  let transcriptionJobId: string | undefined;
  try {
    const jobName = `transcribe-${recordId}-${Date.now()}`;
    await transcribeClient.send(
      new StartMedicalTranscriptionJobCommand({
        MedicalTranscriptionJobName: jobName,
        LanguageCode: 'en-US',
        MediaFormat: 'webm',
        Media: {
          MediaFileUri: `s3://${config.audioBucketName}/${s3Key}`,
        },
        OutputBucketName: config.audioBucketName,
        OutputKey: `${request.patientId}/${request.encounterId}/${recordId}/transcription.json`,
        Specialty: 'PRIMARYCARE',
        Type: 'DICTATION',
      })
    );
    transcriptionJobId = jobName;

    // Update DynamoDB record with transcription job ID
    await docClient.send(
      new PutCommand({
        TableName: config.registryTableName,
        Item: {
          ...draftRecord,
          metadata: {
            ...draftRecord.metadata,
            transcriptionJobId: jobName,
          },
        },
      })
    );
  } catch (error) {
    console.error('Transcribe job start error:', error);
    // Non-fatal error - record is still created
    console.warn('Failed to start transcription job, but record was created');
  }

  return {
    success: true,
    recordId,
    s3Key,
    uploadTimestamp: timestamp,
    jobId: transcriptionJobId,
  };
}

async function handleImageUpload(
  request: IngestionRequest,
  recordId: string,
  timestamp: string,
  ipAddress: string
): Promise<IngestionResponse> {
  // Generate S3 key for image file
  const s3Key = `${request.patientId}/${request.encounterId}/${recordId}/page-1.jpg`;

  // Decode base64 data
  const imageBuffer = Buffer.from(request.data, 'base64');

  // Upload to S3 with SSE-KMS encryption
  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: config.imagesBucketName,
        Key: s3Key,
        Body: imageBuffer,
        ContentType: 'image/jpeg',
        ServerSideEncryption: 'aws:kms',
        SSEKMSKeyId: config.kmsKeyId,
        Metadata: {
          patientId: request.patientId,
          encounterId: request.encounterId,
          userId: request.userId,
          recordId: recordId,
          uploadTimestamp: timestamp,
        },
      })
    );
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error('IMAGE_UPLOAD_FAILED: Failed to upload image to S3');
  }

  // Create DynamoDB draft record
  const draftRecord: RegistryRecordItem = {
    recordId,
    versionNumber: '0.0', // Draft version
    patientId: request.patientId,
    encounterId: request.encounterId,
    userId: request.userId,
    status: 'draft',
    fields: {},
    isCurrent: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    metadata: {
      imageS3Keys: [s3Key],
      context: request.metadata.context,
      ipAddress,
      deviceInfo: request.metadata.deviceInfo,
    },
    auditTrail: [
      {
        action: 'create',
        userId: request.userId,
        timestamp,
        ipAddress,
        deviceInfo: request.metadata.deviceInfo,
      },
    ],
    ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days TTL for drafts
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: config.registryTableName,
        Item: draftRecord,
      })
    );
  } catch (error) {
    console.error('DynamoDB write error:', error);
    throw new Error('DRAFT_SAVE_FAILED: Failed to create draft record in DynamoDB');
  }

  // Trigger Amazon Textract
  let ocrJobId: string | undefined;
  try {
    const response = await textractClient.send(
      new StartDocumentTextDetectionCommand({
        DocumentLocation: {
          S3Object: {
            Bucket: config.imagesBucketName,
            Name: s3Key,
          },
        },
        OutputConfig: {
          S3Bucket: config.imagesBucketName,
          S3Prefix: `${request.patientId}/${request.encounterId}/${recordId}/ocr/`,
        },
      })
    );
    ocrJobId = response.JobId;

    // Update DynamoDB record with OCR job ID
    await docClient.send(
      new PutCommand({
        TableName: config.registryTableName,
        Item: {
          ...draftRecord,
          metadata: {
            ...draftRecord.metadata,
            ocrJobIds: [ocrJobId],
          },
        },
      })
    );
  } catch (error) {
    console.error('Textract job start error:', error);
    // Non-fatal error - record is still created
    console.warn('Failed to start OCR job, but record was created');
  }

  return {
    success: true,
    recordId,
    s3Key,
    uploadTimestamp: timestamp,
    jobId: ocrJobId,
  };
}

function createErrorResponse(
  statusCode: number,
  code: string,
  message: string,
  retryable: boolean,
  requestId: string,
  details?: any
): APIGatewayProxyResult {
  const errorResponse: ErrorResponse = {
    error: {
      code,
      message,
      details,
      retryable,
      timestamp: new Date().toISOString(),
      requestId,
    },
  };

  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(errorResponse),
  };
}
