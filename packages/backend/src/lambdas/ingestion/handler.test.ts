import { describe, it, expect, vi, beforeEach } from 'vitest';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './handler.js';

// Mock AWS SDK clients
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({
    send: vi.fn(),
  })),
  PutObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(() => ({})),
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({
      send: vi.fn(),
    })),
  },
  PutCommand: vi.fn(),
}));

vi.mock('@aws-sdk/client-transcribe', () => ({
  TranscribeClient: vi.fn(() => ({
    send: vi.fn(),
  })),
  StartMedicalTranscriptionJobCommand: vi.fn(),
}));

vi.mock('@aws-sdk/client-textract', () => ({
  TextractClient: vi.fn(() => ({
    send: vi.fn().mockResolvedValue({ JobId: 'test-job-id' }),
  })),
  StartDocumentTextDetectionCommand: vi.fn(),
}));

vi.mock('../../config/environment.js', () => ({
  getEnvironmentConfig: vi.fn(() => ({
    registryTableName: 'test-table',
    audioBucketName: 'test-audio-bucket',
    imagesBucketName: 'test-images-bucket',
    reportsBucketName: 'test-reports-bucket',
    kmsKeyId: 'test-kms-key',
    region: 'us-east-1',
  })),
}));

describe('Ingestion Lambda Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockEvent = (body: any, method = 'POST'): APIGatewayProxyEvent => ({
    body: JSON.stringify(body),
    headers: {
      Authorization: 'Bearer test-token',
    },
    httpMethod: method,
    isBase64Encoded: false,
    path: '/ingest',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: 'test-account',
      apiId: 'test-api',
      protocol: 'HTTP/1.1',
      httpMethod: method,
      path: '/ingest',
      stage: 'test',
      requestId: 'test-request-id',
      requestTime: '01/Jan/2024:00:00:00 +0000',
      requestTimeEpoch: 1704067200000,
      identity: {
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent',
        cognitoIdentityPoolId: null,
        cognitoIdentityId: null,
        cognitoAuthenticationType: null,
        cognitoAuthenticationProvider: null,
        userArn: null,
        user: null,
        caller: null,
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        clientCert: null,
        principalOrgId: null,
      },
      authorizer: null,
      resourceId: 'test-resource',
      resourcePath: '/ingest',
    },
    resource: '/ingest',
    multiValueHeaders: {},
  });

  const validAudioRequest = {
    patientId: 'patient-123',
    encounterId: 'encounter-456',
    userId: 'user-789',
    contentType: 'audio',
    data: Buffer.from('test audio data').toString('base64'),
    metadata: {
      timestamp: '2024-01-01T00:00:00.000Z',
      deviceInfo: {
        deviceType: 'mobile',
        platform: 'iOS',
        browser: 'Safari',
      },
      context: 'theatre',
    },
  };

  const validImageRequest = {
    patientId: 'patient-123',
    encounterId: 'encounter-456',
    userId: 'user-789',
    contentType: 'image',
    data: Buffer.from('test image data').toString('base64'),
    metadata: {
      timestamp: '2024-01-01T00:00:00.000Z',
      deviceInfo: {
        deviceType: 'desktop',
        platform: 'Windows',
        browser: 'Chrome',
      },
      context: 'office',
    },
  };

  describe('Request Validation', () => {
    it('should handle OPTIONS request for CORS', async () => {
      const event = createMockEvent({}, 'OPTIONS');
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(result.headers).toHaveProperty('Access-Control-Allow-Origin');
    });

    it('should reject non-POST requests', async () => {
      const event = createMockEvent(validAudioRequest, 'GET');
      const result = await handler(event);

      expect(result.statusCode).toBe(405);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('METHOD_NOT_ALLOWED');
    });

    it('should reject requests without body', async () => {
      const event = createMockEvent(validAudioRequest);
      event.body = null;
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toContain('Request body is required');
    });

    it('should reject requests with invalid JSON', async () => {
      const event = createMockEvent(validAudioRequest);
      event.body = 'invalid json';
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toContain('Invalid JSON');
    });

    it('should reject requests without Authorization header', async () => {
      const event = createMockEvent(validAudioRequest);
      event.headers = {};
      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('AUTHORIZATION_ERROR');
    });

    it('should reject requests with missing patientId', async () => {
      const invalidRequest = { ...validAudioRequest };
      delete (invalidRequest as any).patientId;
      const event = createMockEvent(invalidRequest);
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain('patientId');
    });

    it('should reject requests with missing encounterId', async () => {
      const invalidRequest = { ...validAudioRequest };
      delete (invalidRequest as any).encounterId;
      const event = createMockEvent(invalidRequest);
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain('encounterId');
    });

    it('should reject requests with missing userId', async () => {
      const invalidRequest = { ...validAudioRequest };
      delete (invalidRequest as any).userId;
      const event = createMockEvent(invalidRequest);
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain('userId');
    });

    it('should reject requests with invalid contentType', async () => {
      const invalidRequest = { ...validAudioRequest, contentType: 'invalid' };
      const event = createMockEvent(invalidRequest);
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain('contentType');
    });

    it('should reject requests with missing data', async () => {
      const invalidRequest = { ...validAudioRequest };
      delete (invalidRequest as any).data;
      const event = createMockEvent(invalidRequest);
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain('data');
    });

    it('should reject requests with invalid context', async () => {
      const invalidRequest = {
        ...validAudioRequest,
        metadata: {
          ...validAudioRequest.metadata,
          context: 'invalid',
        },
      };
      const event = createMockEvent(invalidRequest);
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain('context');
    });
  });

  describe('Audio Upload', () => {
    it('should successfully process audio upload', async () => {
      const event = createMockEvent(validAudioRequest);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.recordId).toBeDefined();
      expect(body.s3Key).toContain('audio.webm');
      expect(body.uploadTimestamp).toBeDefined();
    });

    it('should include patient and encounter IDs in S3 key', async () => {
      const event = createMockEvent(validAudioRequest);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.s3Key).toContain(validAudioRequest.patientId);
      expect(body.s3Key).toContain(validAudioRequest.encounterId);
    });
  });

  describe('Image Upload', () => {
    it('should successfully process image upload', async () => {
      const event = createMockEvent(validImageRequest);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.recordId).toBeDefined();
      expect(body.s3Key).toContain('page-1.jpg');
      expect(body.uploadTimestamp).toBeDefined();
    });

    it('should include patient and encounter IDs in S3 key', async () => {
      const event = createMockEvent(validImageRequest);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.s3Key).toContain(validImageRequest.patientId);
      expect(body.s3Key).toContain(validImageRequest.encounterId);
    });
  });

  describe('Error Handling', () => {
    it('should return structured error response on failure', async () => {
      const event = createMockEvent(validAudioRequest);
      event.headers = {}; // Remove auth header to trigger error
      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBeDefined();
      expect(body.error.message).toBeDefined();
      expect(body.error.retryable).toBeDefined();
      expect(body.error.timestamp).toBeDefined();
      expect(body.error.requestId).toBeDefined();
    });

    it('should include CORS headers in error responses', async () => {
      const event = createMockEvent(validAudioRequest);
      event.headers = {}; // Remove auth header to trigger error
      const result = await handler(event);

      expect(result.headers).toHaveProperty('Access-Control-Allow-Origin');
      expect(result.headers).toHaveProperty('Content-Type');
    });
  });
});
