# Implementation Plan: Clinical Registry System

## Overview

This implementation plan breaks down the Hybrid Voice-to-Structured-Data Clinical Registry System into discrete, incremental coding tasks. The system will be built using TypeScript for both frontend (React) and backend (AWS Lambda), with AWS services for storage, transcription, OCR, and entity extraction. The implementation follows a layered approach: infrastructure setup, backend services, frontend components, integration, and testing.

## Tasks

- [x] 1. Project setup and infrastructure foundation
  - Initialize monorepo structure with frontend and backend workspaces
  - Set up TypeScript configuration for both frontend and backend
  - Configure AWS CDK or Terraform for infrastructure as code
  - Set up DynamoDB table with GSIs for registry records
  - Set up S3 buckets for audio, images, and reports with encryption
  - Configure API Gateway with REST and WebSocket endpoints
  - Set up IAM roles and policies for Lambda functions
  - Configure CloudWatch logging and X-Ray tracing
  - _Requirements: 11.7, 11.8_

- [-] 2. Implement voice recording component (frontend)
  - [x] 2.1 Create VoiceRecordingComponent with MediaRecorder API integration
    - Implement startRecording, pauseRecording, resumeRecording, stopRecording methods
    - Handle browser permission requests
    - Implement recording state management (idle, recording, paused, stopped)
    - Add real-time duration tracking
    - Style with Tailwind CSS and add Lucide React icons
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [ ]* 2.2 Write property test for recording pause-resume
    - **Property 2: Pause-resume preserves recording**
    - **Validates: Requirements 1.2, 1.3**
  
  - [ ]* 2.3 Write unit tests for voice recording component
    - Test recording state transitions
    - Test browser permission handling
    - Test error states (no microphone, permission denied)
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 3. Implement document scanning component (frontend)
  - [x] 3.1 Create DocumentScanningComponent with camera/file input
    - Implement captureImage for mobile camera access
    - Implement file upload for desktop scanner/webcam
    - Support JPEG, PNG, PDF formats
    - Implement multi-page sequential capture with preview
    - Add client-side image preprocessing (Canvas API for rotation, contrast, noise reduction)
    - Style with Tailwind CSS
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.9_
  
  - [ ]* 3.2 Write property test for image format acceptance
    - **Property 6: Image format acceptance**
    - **Validates: Requirements 2.3**
  
  - [ ]* 3.3 Write property test for image preprocessing
    - **Property 7: Image preprocessing application**
    - **Validates: Requirements 2.4**
  
  - [ ]* 3.4 Write unit tests for document scanning component
    - Test camera activation on mobile
    - Test file input on desktop
    - Test multi-page capture
    - Test preprocessing functions
    - _Requirements: 2.1, 2.2, 2.9_

- [-] 4. Implement ingestion Lambda function (backend)
  - [x] 4.1 Create IngestionLambda with audio and image upload handlers
    - Implement request validation (authentication, payload structure)
    - Generate unique record IDs
    - Upload to S3 with SSE-KMS encryption
    - Create DynamoDB draft record with metadata
    - Trigger Transcribe Medical or Textract based on content type
    - Return signed URLs for status polling
    - Implement error handling with structured error responses
    - _Requirements: 1.4, 1.5, 1.6, 2.7, 2.8_
  
  - [ ]* 4.2 Write property test for metadata association
    - **Property 3: Recording metadata completeness**
    - **Property 11: Document metadata completeness**
    - **Validates: Requirements 1.4, 2.8**
  
  - [ ]* 4.3 Write property test for encryption at rest
    - **Property 4: Audio encryption at rest**
    - **Property 10: Image encryption at rest**
    - **Validates: Requirements 1.5, 2.7**
  
  - [ ]* 4.4 Write unit tests for ingestion Lambda
    - Test payload validation
    - Test S3 upload with encryption
    - Test DynamoDB record creation
    - Test error handling for invalid inputs
    - _Requirements: 1.4, 1.5, 2.7, 2.8_

- [ ] 5. Checkpoint - Ensure ingestion pipeline works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement transcription service integration (backend)
  - [ ] 6.1 Create TranscriptionService wrapper for Amazon Transcribe Medical
    - Implement startTranscription with medical specialty configuration
    - Implement getTranscriptionStatus for polling
    - Implement getTranscriptionResult with utterance timestamps
    - Support near-real-time streaming for theatre/ward context
    - Support batch processing for office context
    - Store transcription linked to audio S3 key in DynamoDB
    - Implement error handling and retry logic
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  
  - [ ]* 6.2 Write property test for transcription initiation
    - **Property 14: Transcription initiation**
    - **Validates: Requirements 3.1**
  
  - [ ]* 6.3 Write property test for utterance timestamp preservation
    - **Property 16: Utterance timestamp preservation**
    - **Validates: Requirements 3.4**
  
  - [ ]* 6.4 Write property test for transcription traceability
    - **Property 17: Transcription traceability**
    - **Validates: Requirements 3.5**
  
  - [ ]* 6.5 Write unit tests for transcription service
    - Test job creation and status polling
    - Test near-real-time vs batch mode
    - Test error handling
    - _Requirements: 3.1, 3.2, 3.3, 3.6_

- [ ] 7. Implement OCR service integration (backend)
  - [ ] 7.1 Create OCRService wrapper for Amazon Textract
    - Implement startOCR with DetectDocumentText API
    - Implement getOCRStatus for polling
    - Implement getOCRResult with text blocks and confidence scores
    - Detect handwritten vs printed text
    - Handle multi-page documents
    - Store OCR result linked to image S3 key in DynamoDB
    - Implement error handling and retry logic
    - _Requirements: 2.5, 2.6, 2.10, 2.11_
  
  - [ ]* 7.2 Write property test for OCR execution
    - **Property 8: OCR execution**
    - **Validates: Requirements 2.5**
  
  - [ ]* 7.3 Write property test for OCR traceability
    - **Property 9: OCR traceability**
    - **Validates: Requirements 2.6**
  
  - [ ]* 7.4 Write property test for OCR confidence scoring by text type
    - **Property 13: OCR confidence scoring by text type**
    - **Validates: Requirements 2.10, 2.11**
  
  - [ ]* 7.5 Write unit tests for OCR service
    - Test job creation and status polling
    - Test handwritten vs printed detection
    - Test multi-page handling
    - Test error handling
    - _Requirements: 2.5, 2.6, 2.10, 2.11_

- [ ] 8. Implement structured extraction service (backend)
  - [ ] 8.1 Create StructuredExtractionService with Comprehend Medical and LLM integration
    - Implement extractEntities using Comprehend Medical DetectEntities API
    - Implement LLM-based structured field mapping (GPT-4 or Bedrock)
    - Implement calculateConfidence with source-specific adjustments
    - Extract clinical entities: procedures, diagnoses, complications, anatomy, devices, medications, vital signs, lab values
    - Extract narrative explanations and clinical reasoning
    - Generate structured JSON output matching registry schema
    - Store extraction metadata (source, method, timestamp)
    - Ensure deterministic confidence scoring
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_
  
  - [ ]* 8.2 Write property test for entity extraction from text sources
    - **Property 19: Entity extraction from text sources**
    - **Validates: Requirements 4.1, 4.2**
  
  - [ ]* 8.3 Write property test for confidence score validity
    - **Property 22: Confidence score validity**
    - **Validates: Requirements 4.5**
  
  - [ ]* 8.4 Write property test for confidence scoring determinism
    - **Property 24: Confidence scoring determinism**
    - **Validates: Requirements 4.7**
  
  - [ ]* 8.5 Write property test for extraction confidence ranges by source
    - **Property 26: Extraction confidence ranges by source**
    - **Validates: Requirements 4.9, 4.10**
  
  - [ ]* 8.6 Write unit tests for extraction service
    - Test entity extraction for known medical terms
    - Test JSON output format
    - Test error handling for malformed text
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 9. Checkpoint - Ensure extraction pipeline works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement pre-fill service (backend)
  - [ ] 10.1 Create PreFillService for external system integration
    - Implement getPatientData to query EHR/EMR systems
    - Implement getProcedureData to query scheduling systems
    - Implement mergeWithExtractedData with conflict detection
    - Prioritize extracted data over system data in conflicts
    - Mark all fields with source provenance (system/voice/scan/manual)
    - Flag conflicts for clinician review
    - Implement caching for patient and procedure data
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ]* 10.2 Write property test for pre-fill functionality
    - **Property 27: Patient demographics pre-fill**
    - **Property 28: Procedure data pre-fill**
    - **Validates: Requirements 5.1, 5.2**
  
  - [ ]* 10.3 Write property test for conflict resolution
    - **Property 31: Conflict resolution**
    - **Validates: Requirements 5.5**
  
  - [ ]* 10.4 Write unit tests for pre-fill service
    - Test data retrieval from external systems
    - Test merge logic
    - Test conflict detection
    - _Requirements: 5.1, 5.2, 5.5_

- [ ] 11. Implement draft record manager (backend)
  - [ ] 11.1 Create DraftRecordManager for draft persistence
    - Implement createDraft with field values, confidence scores, and provenance
    - Implement updateDraft for partial updates
    - Implement getDraft for retrieval
    - Implement listDrafts with filtering (status, date, patient)
    - Store drafts in DynamoDB with TTL for cleanup
    - Link drafts to source audio/images
    - Track processing status for async operations
    - Support offline mode with local storage sync
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_
  
  - [ ]* 11.2 Write property test for draft creation from extraction
    - **Property 32: Draft creation from extraction**
    - **Validates: Requirements 6.1**
  
  - [ ]* 11.3 Write property test for draft persistence across sessions
    - **Property 35: Draft persistence across sessions**
    - **Validates: Requirements 6.4, 6.5**
  
  - [ ]* 11.4 Write property test for offline draft preservation and sync
    - **Property 37: Offline draft preservation and sync**
    - **Validates: Requirements 6.7**
  
  - [ ]* 11.5 Write unit tests for draft record manager
    - Test draft creation and updates
    - Test retrieval and filtering
    - Test TTL cleanup
    - _Requirements: 6.1, 6.2, 6.3, 6.6_

- [ ] 12. Implement review interface component (frontend)
  - [ ] 12.1 Create ReviewInterfaceComponent for single-screen review
    - Implement loadDraft to fetch and display draft record
    - Display all fields on single screen without pagination
    - Implement confidence-based color coding (green ≥0.85, yellow 0.60-0.84, red <0.60)
    - Highlight low-confidence fields and missing required fields
    - Display source indicator for each field (voice/scan/manual/system)
    - Implement acceptField for checkmark interaction
    - Implement editField for inline editing
    - Track manually edited fields
    - Implement submit button state management (disabled until all required fields confirmed)
    - Optimize for <1 second load time
    - Ensure 44px minimum touch targets
    - Style with Tailwind CSS
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12, 7.13_
  
  - [ ]* 12.2 Write property test for confidence-based color coding
    - **Property 41: Confidence-based color coding**
    - **Validates: Requirements 7.5, 7.6, 7.7**
  
  - [ ]* 12.3 Write property test for submit button state management
    - **Property 45: Submit button state management**
    - **Validates: Requirements 7.11, 7.12**
  
  - [ ]* 12.4 Write unit tests for review interface
    - Test field display and highlighting
    - Test acceptance and editing interactions
    - Test submit button state
    - Test load time performance
    - _Requirements: 7.1, 7.2, 7.3, 7.8, 7.9, 7.10, 7.13_

- [ ] 13. Checkpoint - Ensure review interface works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Implement version control service (backend)
  - [ ] 14.1 Create VersionControlService for immutable version history
    - Implement createVersion with full field snapshot and metadata
    - Use composite key (recordId + versionNumber) in DynamoDB
    - Implement getVersion for specific version retrieval
    - Implement listVersions for complete history
    - Implement compareVersions for diff generation
    - Implement getCurrentVersion using GSI
    - Enforce immutability using conditional writes
    - Capture complete audit trail (user, timestamp, IP, device, field changes)
    - Never delete or overwrite historical versions
    - Update only current version flag on version changes
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11, 8.12, 8.13_
  
  - [ ]* 14.2 Write property test for version creation on update
    - **Property 47: Version creation on update**
    - **Validates: Requirements 8.1**
  
  - [ ]* 14.3 Write property test for version immutability and preservation
    - **Property 48: Version immutability and preservation**
    - **Validates: Requirements 8.2, 8.3, 8.11**
  
  - [ ]* 14.4 Write property test for version metadata completeness
    - **Property 49: Version metadata completeness**
    - **Validates: Requirements 8.4, 8.5**
  
  - [ ]* 14.5 Write property test for audit trail completeness
    - **Property 50: Audit trail completeness**
    - **Validates: Requirements 8.6**
  
  - [ ]* 14.6 Write unit tests for version control service
    - Test version creation and numbering
    - Test immutability enforcement
    - Test audit trail recording
    - Test concurrent edit detection
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 15. Implement submission and record locking (backend)
  - [ ] 15.1 Create submission handler with version management
    - Implement submitRecord to persist as version 1.0
    - Mark record status as "submitted"
    - Lock record from casual editing
    - Implement editSubmittedRecord to create new version (1.1, 1.2, etc.)
    - Mark previous version as superseded
    - Update current version flag
    - Maintain complete audit trail linking all versions
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_
  
  - [ ]* 15.2 Write property test for initial version creation
    - **Property 56: Initial version creation**
    - **Validates: Requirements 9.1**
  
  - [ ]* 15.3 Write property test for version increment on edit
    - **Property 59: Version increment on edit**
    - **Validates: Requirements 9.4**
  
  - [ ]* 15.4 Write property test for version supersession
    - **Property 60: Version supersession**
    - **Validates: Requirements 9.5**
  
  - [ ]* 15.5 Write unit tests for submission handler
    - Test initial submission
    - Test record locking
    - Test version increment on edit
    - Test audit trail continuity
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.7_

- [ ] 16. Implement report generation service (backend)
  - [ ] 16.1 Create ReportGenerationService with multiple report types
    - Implement generateReport with support for all report types (patient procedure, surgeon performance, complication analysis, procedure volume, quality metrics, audit compliance, registry export)
    - Implement query and filtering logic (date range, surgeon, procedure type, complication type, demographics, facility)
    - Implement data aggregation for summary reports
    - Implement format conversion (PDF, Excel, CSV, JSON)
    - Implement chart and visualization generation
    - Apply de-identification for research reports
    - Enforce role-based access control
    - Support synchronous generation for small reports (<10s)
    - Support asynchronous generation for large reports with polling
    - Store generated reports in S3 with signed URLs
    - Implement scheduled report generation via EventBridge
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10, 10.11, 10.12, 10.13, 10.14, 10.15, 10.16, 10.17, 10.18, 10.19, 10.20, 10.21, 10.22_
  
  - [ ]* 16.2 Write property test for report date range filtering
    - **Property 64: Report date range filtering**
    - **Validates: Requirements 10.8**
  
  - [ ]* 16.3 Write property test for report multi-dimensional filtering
    - **Property 65: Report multi-dimensional filtering**
    - **Validates: Requirements 10.9**
  
  - [ ]* 16.4 Write property test for report output format support
    - **Property 66: Report output format support**
    - **Validates: Requirements 10.10**
  
  - [ ]* 16.5 Write property test for individual report generation performance
    - **Property 73: Individual report generation performance**
    - **Validates: Requirements 10.20**
  
  - [ ]* 16.6 Write property test for aggregate report generation performance
    - **Property 74: Aggregate report generation performance**
    - **Validates: Requirements 10.21**
  
  - [ ]* 16.7 Write unit tests for report generation service
    - Test each report type with sample data
    - Test filtering logic
    - Test format conversion
    - Test error handling for invalid filters
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [ ] 17. Checkpoint - Ensure report generation works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Implement frontend-backend integration
  - [ ] 18.1 Create API client service (frontend)
    - Implement uploadAudio with retry logic
    - Implement uploadImage with retry logic
    - Implement pollTranscriptionStatus
    - Implement pollOCRStatus
    - Implement getDraft
    - Implement updateDraft
    - Implement submitRecord
    - Implement generateReport
    - Implement error handling and offline queue
    - Use fetch API with TLS 1.2+
    - _Requirements: 11.1, 11.2, 11.3_
  
  - [ ]* 18.2 Write integration tests for voice-to-draft pipeline
    - Test complete flow: record → upload → transcribe → extract → draft
    - Verify metadata preservation
    - Verify error handling at each stage
    - _Requirements: 1.1, 3.1, 4.1, 6.1_
  
  - [ ]* 18.3 Write integration tests for scan-to-draft pipeline
    - Test complete flow: capture → upload → OCR → extract → draft
    - Verify multi-page handling
    - Verify traceability to source images
    - _Requirements: 2.1, 2.5, 4.2, 6.1_
  
  - [ ]* 18.4 Write integration tests for review-to-submission pipeline
    - Test complete flow: load draft → review → edit → confirm → submit
    - Verify version creation
    - Verify audit trail recording
    - _Requirements: 7.1, 9.1, 8.1, 8.6_

- [ ] 19. Implement accessibility and responsive design
  - [ ] 19.1 Add ARIA labels and keyboard navigation
    - Add ARIA labels to all interactive elements
    - Implement keyboard navigation for all workflows
    - Add focus management for modals and dialogs
    - Test with screen readers
    - _Requirements: 13.7_
  
  - [ ] 19.2 Implement responsive design with Tailwind breakpoints
    - Configure mobile-first responsive layouts
    - Test on various screen sizes (mobile, tablet, desktop)
    - Ensure single-screen review on all devices
    - Verify 44px minimum touch targets
    - _Requirements: 13.6, 13.10_
  
  - [ ] 19.3 Implement dark mode support
    - Configure Tailwind dark mode
    - Apply dark mode styles to all components
    - Test color contrast ratios
    - _Requirements: 13.8_
  
  - [ ]* 19.4 Write property test for touch target sizing
    - **Property 87: Touch target sizing**
    - **Validates: Requirements 13.10**

- [ ] 20. Implement performance optimizations
  - [ ] 20.1 Optimize review interface load time
    - Implement code splitting for faster initial load
    - Optimize bundle size
    - Implement lazy loading for non-critical components
    - Add loading states and skeleton screens
    - Measure and verify <1 second load time
    - _Requirements: 7.13, 12.2_
  
  - [ ] 20.2 Optimize end-to-end processing
    - Implement parallel processing where possible
    - Optimize Lambda cold start times
    - Add caching for frequently accessed data
    - Measure and verify <2 minute end-to-end time
    - _Requirements: 12.1_
  
  - [ ]* 20.3 Write performance tests
    - Test end-to-end processing time
    - Test review interface load time
    - Test OCR processing time
    - Test report generation time
    - Test concurrent operations
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.9_

- [ ] 21. Implement security controls
  - [ ] 21.1 Configure encryption and access controls
    - Configure S3 bucket encryption (SSE-KMS)
    - Configure DynamoDB encryption at rest
    - Configure TLS 1.2+ for API Gateway
    - Set up IAM policies for least privilege access
    - Configure KMS key rotation
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_
  
  - [ ] 21.2 Implement audit trail immutability
    - Configure DynamoDB conditional writes for version records
    - Add database-level constraints
    - Implement tampering detection
    - _Requirements: 8.11, 8.12, 11.8_
  
  - [ ]* 21.3 Write security tests
    - Test encryption verification
    - Test access control enforcement
    - Test audit trail integrity
    - Test data privacy protections
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8_

- [ ] 22. Final integration and end-to-end testing
  - [ ] 22.1 Perform end-to-end workflow testing
    - Test complete voice recording workflow
    - Test complete document scanning workflow
    - Test complete review and submission workflow
    - Test complete report generation workflow
    - Test offline mode and sync
    - Test error recovery scenarios
    - _Requirements: All_
  
  - [ ] 22.2 Perform cross-browser and device testing
    - Test on Chrome, Firefox, Safari, Edge
    - Test on iOS Safari and Android Chrome
    - Verify audio recording on all platforms
    - Verify camera access on mobile devices
    - _Requirements: 1.1, 2.1, 13.6_
  
  - [ ] 22.3 Perform load and stress testing
    - Test with concurrent users
    - Test with large data volumes
    - Verify performance under load
    - Identify and fix bottlenecks
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 23. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties with minimum 100 iterations
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end workflows
- Performance tests validate SLA requirements
- Security tests validate encryption and access controls
