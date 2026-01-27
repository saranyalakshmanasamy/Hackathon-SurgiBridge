---

# Hybrid Voice-to-Structured-Data Clinical Registry System

## 1. Purpose

Build a hybrid voice-to-structured-data system that allows clinicians to **speak freely after surgery**, automatically **extract structured registry fields**, and **review and confirm the results in under 30 seconds**.

The system is optimized for post-operative documentation with minimal cognitive load and minimal manual data entry.

---

## 2. Primary Users

* Surgeons
* Clinicians
* Theatre Nurses
* Ward Nurses

---

## 3. Usage Contexts

* Operating Theatre (immediate post-op)
* Inpatient Unit (ward documentation)
* Office / Desktop (post-discharge completion)

---

## 4. User Goals

1. Capture free-form clinical narration via voice
2. Automatically populate structured registry data
3. Review, confirm, and submit with minimal interaction
4. Resume incomplete drafts at a later time without data loss

---

## 5. Functional Requirements

### FR-1: Voice Capture

**Description**
Allow clinicians to record free-form voice notes describing procedures, outcomes, complications, and reasoning.

**Requirements**

* Support recording via:

  * Mobile browsers (iOS / Android)
  * Desktop browsers
* Support pause / resume recording
* Audio recordings must be encrypted at rest
* Audio must be associated with:

  * Patient identifier
  * Encounter / procedure identifier
  * User identifier
  * Timestamp

---

### FR-2: Medical Transcription

**Description**
Convert recorded audio into medical-grade text transcription.

**Requirements**

* Use medical-grade speech-to-text
* Support two modes:

  * Near-real-time transcription (theatre / ward)
  * Batch transcription (post-op / office)
* Preserve timestamps per utterance
* Store transcription output linked to original audio

---

### FR-3: Structured Data Extraction

**Description**
Extract structured registry fields and clinical narratives from transcription.

**Requirements**

* Extract structured clinical entities including:

  * Procedures
  * Diagnoses
  * Complications
  * Anatomy
  * Devices
* Extract narrative explanations and clinical reasoning
* Generate structured JSON output
* Assign a **confidence score (0.0–1.0)** to each extracted field
* For each extracted field, store traceability metadata including the originating transcription text, extraction method, and time of extraction.

---

### FR-4: De-duplication and Pre-fill

**Description**
Reduce clinician workload by pre-filling known data from existing systems.

**Requirements**

* Automatically pre-fill the following fields where available:

  * Patient demographics
  * Procedure codes
  * Surgeon
  * Date and time
* Prevent re-entry of existing data unless explicitly edited
* Clearly distinguish:

  * System-derived fields
  * Voice-extracted fields
  * Manually edited fields

---

### FR-5: Draft Registry Record

**Description**
Persist extracted data as a draft registry entry prior to clinician confirmation.

**Requirements**

* Store draft in database with:

  * Field values
  * Confidence scores
  * Provenance metadata
* Draft must persist even if:

  * Session is abandoned
  * Browser is closed
* Support deferred completion

---

### FR-6: Clinician Review & Confirmation

**Description**
Provide a rapid, single-screen review experience.

**Display Requirements**

* Single screen only
* No pagination
* Display all extracted fields
* Highlight only:

  * Low-confidence fields
  * Required but missing fields

**Interaction Requirements**

* Tap ✔️ to accept a field
* Tap a field to edit
* No long-form text editing by default
* No mandatory typing if confidence is high
* Submit disabled until all required fields are confirmed

---

### FR-7: Final Submission

**Description**
Persist the confirmed registry record as final.

**Requirements**

* On submission:

  * Persist final record to registry database
  * Lock record from further editing (unless role permits)
* Maintain a full audit trail:

  * Original extracted values
  * Edits made
  * User identity
  * Timestamps

---

## 6. Confidence Scoring Rules

Each extracted field must include a confidence score between **0.0 and 1.0**.

**UI Behavior**

* ≥ 0.85 → Auto-accepted (green)
* 0.60–0.84 → Review suggested (yellow)
* < 0.60 → Required review (red)

Confidence scoring must be deterministic and reproducible for the same input.

---

## 7. Non-Functional Requirements

### Performance

* End-to-end processing time: **< 2 minutes**
* Review UI load time: **< 1 second**

### Usability

* Maximum one screen for review
* Designed for completion in **< 30 seconds**
* Voice-first, typing optional

### Security & Compliance

* All data encrypted in transit and at rest
* IAM-based access control
* Designed to support HIPAA / healthcare compliance requirements

### Reliability

* Drafts must persist across sessions
* System must support deferred completion
* No data loss on client or network failure

---

## 8. System Architecture (AWS + TypeScript)

```
Mobile / Web App (Theatre / Ward / Office)
        |
        |  Encrypted Audio
        v
API Gateway
        |
        v
Lambda (Audio ingestion + metadata)
        |
        v
S3 (Encrypted audio storage)
        |
        v
Amazon Transcribe Medical
        |
        v
Lambda (Post-processing & normalization)
        |
        v
Amazon Comprehend Medical + LLM
        |
        v
Structured JSON (Draft Registry Entry)
        |
        v
DynamoDB
        |
        v
Frontend Review Screen (<30s completion)
```

---

## 9. Data Contracts (High-Level)

### Draft Registry Entry (JSON)

* patientId
* encounterId
* extractedFields[]

  * fieldName
  * value
  * confidence
  * sourceText
  * provenance
* status: draft | submitted
* auditTrail[]

---

## 10. Testing & Verification Requirements

* Unit tests for:

  * Audio ingestion
  * Transcription processing
  * Entity extraction
  * Confidence scoring
* Integration tests for:

  * Full pipeline from audio → draft record
* Performance tests validating SLA thresholds

### Manual & UI Testing

* Use Chrome DevTools (via MCP server) to:

  * Verify audio capture
  * Verify transcription output
  * Verify UI load time
  * Verify review interactions
* Validate:

  * Draft persistence
  * Deferred completion
  * Confidence-based UI behavior

