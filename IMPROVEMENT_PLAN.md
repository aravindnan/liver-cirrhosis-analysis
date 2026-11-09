# Cirrh0 Improvement Plan

Codebase audit of `liver-cirrhosis-analysis`, covering the React client (`cirrh0/`), the Express API (`cirrh0-backend/`), the Flask ML service (`cirrh0-prediction-model/`), the training notebook and `testing-assets/`. Audit date: 7 Nov 2026.

Findings cite file and line as of commit `4ed50db`. Labels used:

- **[Verified]**: read directly in code or data
- **[Assumption]**: inferred, not confirmed
- **[Idea]**: a proposal

**Verdict:** a working student prototype with a good core idea. It is not safe to deploy and the clinical output is not valid in its current form.

---

## Progress

Branch `improve/p1-critical-fixes` (Priority 1 code fixes). Checked means done in code and tested as noted.

- [x] Auth middleware, ownership scoping, password hash hidden, `/delete-all-data` removed (API)
- [x] JWT secret, DB and service config read from env; fail fast when missing
- [x] Helmet, CORS allowlist, rate limiting on login and register, input validation (API)
- [x] `eval()` removed; LLM output parsed as JSON and validated (ML)
- [x] Keys moved to env, Flask debug off by default, upload URL allowlist, TLS verification on, size cap (ML)
- [x] Stage comes from the model, separate from LLM text; labels no longer claim a diagnosis (ML)
- [x] Disclaimer and urgent-care note; image tool relabelled as slide-image analysis (UI)
- [x] Listed bugs fixed (MRI delete, null checks, stale validation, error handling, missing `return`)
- [x] Missing `environment.ts`, `.env.example` files and `requirements.txt` added
- [ ] **Rotate the Gemini and Roboflow keys and the JWT secret, then purge git history** (must be done by the repo owner)
- [ ] Private file storage with signed URLs, delete files with the record, consent step
- [x] HttpOnly cookie session with an Origin check against CSRF (branch `improve/session-and-model`)
- [x] Retrained without the SMOTE leak (`train_model.py`, `model_card.json`). Honest cross-validated accuracy is about 50% (38% baseline), not 72%; shown to users on the result page

---

## ⚠️ Act first: leaked secrets

This repository is **public** on GitHub. Three secrets are committed in plain text and must be treated as compromised **[Verified]**:

| Secret | Location |
|---|---|
| Google Gemini API key | `cirrh0-prediction-model/app.py:14` |
| Roboflow API key | `cirrh0-prediction-model/app.py:312` |
| JWT signing secret | `cirrh0-backend/controller/authController.js:76` |

1. Revoke and reissue both API keys in their provider consoles.
2. Move all three into environment variables and add `.env.example` files.
3. Rewrite history with `git filter-repo`. Deleting the lines in a new commit is not enough, because the old commits stay public.

---

## Contents

1. [Project overview](#1-project-overview)
2. [Architecture assessment](#2-architecture-assessment)
3. [What is already good](#3-what-is-already-good)
4. [Problems and weaknesses](#4-problems-and-weaknesses)
5. [UI/UX improvements](#5-uiux-improvements)
6. [Performance and engineering improvements](#6-performance-and-engineering-improvements)
7. [New feature proposals](#7-new-feature-proposals)
8. [Innovative ideas](#8-innovative-ideas)
9. [Competitive and industry analysis](#9-competitive-and-industry-analysis)
10. [Improvement roadmap](#10-improvement-roadmap)
11. [Recommended architecture](#11-recommended-architecture)
12. [Final product vision](#12-final-product-vision)
13. [Sources](#sources)

---

## 1. Project overview

Cirrh0 is a web app that gives a person an AI assessment of their liver health from two inputs:

- **Report analysis.** The user uploads lab-report PDFs. A regex parser pulls nine values (bilirubin, albumin, triglycerides, prothrombin, copper, platelets, SGOT/AST, ALP, cholesterol). The user reviews them, answers four clinical questions (ascites, edema, spider angiomas, hepatomegaly), and a CatBoost model predicts a "stage" from 1 to 4. Gemini then writes an analysis, lifestyle advice, precautions, a self-treatment plan and doctor types.
- **"MRI" analysis.** The user uploads one image. A Roboflow YOLO model (`liver-yolo/1`) detects classes, and Gemini turns the class names into a diagnosis, treatments and advice.

Accounts, a profile page with analysis history, and per-analysis result pages complete the app.

### Traced request flow: report analysis [Verified]

1. The browser uploads PDFs directly to Cloudinary with the unsigned preset `image_preset` (`ReportAnalysisPage.tsx:137-161`).
2. It sends the public Cloudinary URLs to `POST /add-files-to-report/:userId`. Express creates an empty `ReportAnalysis` and forwards the URLs to Flask `/extract` (`reportController.js:6-74`).
3. Flask downloads each PDF with `verify=False`, extracts text with pdfplumber, runs regexes and merges the reports by latest date (`app.py:108-298`).
4. The user edits the values and submits to `POST /analyze-report`. Express forwards them to Flask `/predict`.
5. Flask scales the 16 features, runs CatBoost, then asks Gemini to write a "python dictionary" and returns Gemini's raw text (`app.py:99-106`).
6. Express reads `analysis`, `stage` and the lists out of Gemini's JSON and saves them (`reportController.js:133-146`). **The stage that is stored and shown is the one Gemini echoes back, not the one read directly from the model.**

---

## 2. Architecture assessment

| Layer | What is there | Observations |
|---|---|---|
| **Frontend** (`cirrh0/`) | Create React App 5, React 18, TypeScript (strict), Tailwind 3, MUI 5 (icons and Tooltip only), Redux Toolkit with one hand-written reducer, axios, AOS, moment, jwt-decode. 10 pages and 3 modals, about 3,900 lines. | CRA is no longer maintained. Every page re-fetches the user. There is no route guard, no server-state cache and no shared form components. `src/env/environment.ts` is imported by all four service files but is **not in the repo**, so a fresh clone does not compile. |
| **API** (`cirrh0-backend/`) | Express 4, Mongoose 8 on MongoDB Atlas, bcryptjs, jsonwebtoken, axios. 11 routes, 4 controllers, 4 models. | Routes are registered inside the `app.listen` callback (`server.js:17-40`). `connectToDatabase` does not await `mongoose.connect`, so the `.then` runs before the database is connected. There is no middleware layer for auth, validation, errors or logging. |
| **ML service** (`cirrh0-prediction-model/`) | Flask with three routes, CatBoost and StandardScaler from joblib, pdfplumber, Gemini 1.5 Flash, Roboflow hosted inference, OpenCV (imported, unused). | Runs with `debug=True` on `0.0.0.0`. There is no `requirements.txt`. It mixes three jobs: deterministic prediction, PDF parsing and LLM generation. |
| **Data** | `User` holds arrays of analysis IDs. Each analysis holds `userId`. | Ownership is stored twice and the copies can drift (see the MRI delete bug). Dates are saved as strings. Lab values are typed inconsistently (`cholesterol` and `tryglycerides` are String). `model/file.js` is unused. |
| **Ops** | None. | No README beyond a title, no Docker, no CI, no tests (the backend test script exits 1), no environment template. |

---

## 3. What is already good

- **Human review before analysis.** Extracted values are shown in an editable form before prediction. That is the right pattern for medical data, and it should be kept and strengthened.
- **Sensible service split.** Keeping the browser, the API and the Python ML service separate is the right shape. Python stays where the ML lives, and the API can own auth and data.
- **Some leakage awareness.** The notebook drops `N_Days` and `Status` because they leak the outcome, and it compares about 15 model families before choosing one.
- **Multi-report consolidation.** `consolidate_reports` merges several PDFs and prefers the most recent date. Real users have values spread across several reports, so this solves a real problem.
- **Basic credential hygiene.** Passwords are hashed with bcrypt at cost 10. `get_user_by_id` validates the ObjectId before querying.
- **Recognisable identity.** There is a consistent crimson brand colour, a custom logo, and result pages already grouped into analysis, lifestyle, precautions and doctors. That is a reasonable base for the redesign.

---

## 4. Problems and weaknesses

### 4.1 Security

#### 🔴 Critical: no authorization on any endpoint [Verified]
- **Where:** `server.js:22-39` and all controllers. A JWT is issued (`authController.js:75`) but nothing ever verifies it.
- **Why:** anyone who knows or guesses an ObjectId can read any user's reports and images, delete them, or create analyses under their account. `GET /get-user-by-id/:id` returns the whole user document, **including the bcrypt hash and token** (`userController.js:22`). The only "ownership check" runs in the browser after the data has already arrived (`ReportResultPage.tsx:120`).
- **Fix:** add `requireAuth` middleware that verifies the JWT and sets `req.user`. Take the user from the token, never from the URL. Scope every query (`findOne({ _id, userId: req.user.id })`). Exclude the password and token with `select: false`. Collapse the routes to `/api/me`, `/api/reports/:id` and similar.
- **Impact:** closes the largest data-exposure hole. Health data is special-category personal data under the GDPR and sensitive personal data under India's DPDP Act.

#### 🔴 Critical: public "delete everything" endpoint [Verified]
- **Where:** `DELETE /delete-all-data` calls `User.deleteMany()` with no auth (`authController.js:128-138`).
- **Fix:** remove it. Use a seed or reset script for development.

#### 🔴 Critical: `eval()` on LLM output [Verified]
- **Where:** `app.py:336-338`: `response_dict = eval(match.group(0))`
- **Why:** model output is untrusted. A crafted image, or text in an image, can steer Gemini into emitting Python that runs on your server.
- **Fix:** use Gemini structured output (`response_mime_type="application/json"` plus a schema), parse with `json.loads`, and validate with Pydantic. Do the same in `/predict`, which currently returns raw text.

#### 🔴 Critical: Flask debug mode, SSRF and disabled TLS checks [Verified]
- **Where:** `app.py:345` runs with `debug=True, host='0.0.0.0'`. `app.py:130` fetches any caller-supplied URL with `verify=False`.
- **Why:** the Werkzeug debugger allows code execution if it is reachable. The `/extract` and `/image` endpoints let any caller make your server fetch internal URLs, such as cloud metadata endpoints.
- **Fix:** run under gunicorn or uvicorn with debug off. Bind to a private network only. Accept file bytes or URLs on an allowlisted host, keep TLS verification on, and set size and time limits.

#### 🟠 High: health records in public cloud storage, shared without consent [Verified]
- **Where:** browser-side unsigned uploads to Cloudinary (`ReportAnalysisPage.tsx:142`, `MRIAnalysisPage.tsx:84`). Report contents go to Gemini and Roboflow.
- **Why:** anyone with the cloud name can upload to your account. Report PDFs, which carry name, age and lab results, sit at permanent public URLs. Deleting an analysis never deletes the file. Users are never told that third-party AI services see their data.
- **Fix:** upload through the API to a private bucket (S3 or Cloudinary authenticated delivery) and serve short-lived signed URLs. Delete files when the analysis is deleted. Add a consent step and a privacy notice. Strip identifiers before any LLM call.

#### 🟠 High: weak session handling [Verified]
- **Where:** `authServices.ts`:
  - The token is in a JS-readable cookie with no Secure, HttpOnly or SameSite flags.
  - `jwtDecode` never checks `exp`, so a token expired after 2 hours still counts as logged in.
  - `clearCookie` sets the expiry one minute in the *future* (`authServices.ts:44-51`).
  - Logout only marks a database flag.
- **Also:** the login form logs the password to the console (`LoginPage.tsx:64`). There is no rate limiting, so login is open to brute force. Login is missing a `return` after the 400 response (`authController.js:56`).
- **Fix:** have the server set an HttpOnly, Secure, SameSite=Lax cookie. Add `GET /api/me` as the source of truth for the session. Add `express-rate-limit` on auth routes, `helmet`, a CORS allowlist, and a password policy.

#### 🔵 Medium: no input validation, PHI in logs [Verified]
- **Where:** request bodies are stored as received. `console.log("ANALYSE REPORT BACKEND : ", req)` dumps the whole request (`reportController.js:78`), and extracted lab data is logged too (`reportController.js:64`).
- **Fix:** validate every body against a shared zod schema with numeric ranges per biomarker. Use structured logs (pino) with redaction.

### 4.2 Clinical and ML validity

#### 🔴 Critical: the stage labels describe the wrong thing [Verified]
- **Where:** `app.py:64-70` maps 1 to "Normal liver", 2 to "Fatty liver", 3 to "Liver Fibrosis" and 4 to "Liver Cirrhosis".
- **Why:** the training data is the Mayo Clinic primary biliary cholangitis (PBC) trial: 418 rows, and the D-penicillamine drug column confirms it. In that dataset `Stage` is the **histologic stage of PBC**, and it needs a biopsy. Every patient in it already has a chronic liver disease. Stage 1 is not "normal liver", and the dataset has nothing on fatty liver. A healthy user can never receive a "healthy" result, and a fatty-liver patient gets a PBC-trained answer.
- **Fix:** stop presenting the output as a diagnosis. Either relabel it honestly ("PBC histologic stage estimate, research model") or replace the headline with validated non-invasive scores such as FIB-4 and APRI (see section 7).

#### 🔴 Critical: "MRI analysis" is really histology analysis [Verified]
- **Where:** the sample images in `testing-assets/` (`balooning.jpg`, `steatosis.jpg`, `fibrosis.jpg`, `inflamation.jpg`) are H&E-stained microscope slides, not MRI scans. Ballooning, steatosis and lobular inflammation are biopsy findings.
- **Why:** users will upload real MRI or ultrasound images and get meaningless detections. If nothing is detected, Gemini is sent `[]` and writes a diagnosis anyway. Confidence scores are thrown away (`app.py:318`).
- **Fix:** rename it to "Biopsy slide analysis" and aim it at clinicians, or remove it. Show confidence and boxes. Refuse images that are out of distribution. Never write an LLM narrative on empty detections.

#### 🟠 High: reported accuracy is inflated [Verified]
- **Where:** `cirrho_prediction_model.ipynb` runs SMOTE on the full dataset *before* `train_test_split`, so synthetic neighbours of training rows end up in the test set. The cross-validation cells run on `X_test` only. The headline "more than 70%" (CatBoost 0.72) comes from that test set.
- **Fix:** split first, then SMOTE inside a pipeline on the training folds only. Report balanced accuracy, per-class recall and calibration on untouched data. Expect a much lower number, and publish it in the app.

#### 🟠 High: the LLM can overwrite the model's answer [Verified]
- **Where:** the prompt passes the model output to Gemini and asks it to return `"stage"` (`app.py:100`). Express stores `pythonResponse.data.stage` (`reportController.js:138`).
- **Fix:** return the model output and the LLM narrative as separate fields. The number shown must come from deterministic code.

#### 🟠 High: fragile lab extraction [Verified]
- **Where:** `app.py:181-193`.
  - The bilirubin regex takes the first match, which can be the direct fraction.
  - "Prothrombin" expects mg/dL, but PT is reported in seconds or as INR.
  - Platelet units (lakh/µL vs 10³/µL) are not normalised.
  - Only one report layout was tested.
  - The four clinical fields the UI expects are never returned, so the form receives `undefined`.
- **Fix:** use LLM or vision extraction with a strict JSON schema, unit normalisation, a page and line citation for each value, and a confidence flag. Keep the human review step.

#### 🟠 High: no medical disclaimer, and overclaiming copy [Verified]
- **Where:** no disclaimer exists anywhere in `src/`. The copy promises "precise", "accurate interpretations" and "expert". `ReportAnalysisPage.tsx:678` says "all values are authentic". The results include a "self-treatment plan".
- **Why [Assumption]:** software that outputs a diagnosis and treatment can count as Software as a Medical Device under FDA, EU MDR or CDSCO rules. That needs legal review before any public launch.
- **Fix:** position the product as educational and decision support. Add a clear intended-use statement. Drop "self-treatment plan" and "diagnosis" wording. Add red-flag escalation.

### 4.3 Broken or buggy functionality [Verified]

| Bug | Where | Effect |
|---|---|---|
| MRI delete never deletes | `mriController.js:91` uses `findById` | The record and image stay forever. It is only unlinked from the user. |
| Null dereference before the 404 check | `mriController.js:92`, `reportController.js:250` | A missing ID returns a 500 instead of a 404. |
| Stale state in validation | `ReportAnalysisPage.tsx:245-251` | Age and sex are set and then validated in the same tick, so the first click can fail with "age missing". |
| MRI spinner never stops on error | `MRIAnalysisPage.tsx:113-133`, no `.catch` | Any failure locks the page behind a full-screen loader. |
| State mutated during render | `ReportAnalysisPage.tsx:389` `fileList?.reverse()` | The file list order flips on every render. List items have no keys. |
| Orphaned reports | `reportController.js:48-60` | The report is created before extraction, so a failed extraction leaves empty records in history. |
| Missing values crash prediction | `app.py:34-52` `float(None)` | Any null value returns a 500. |
| LLM formatting breaks results | `app.py:106` returns raw text | If Gemini adds code fences, axios gets a string, every field is undefined, and the API still returns `analysisSuccess: true`. |
| Logout hidden on most pages | `Navbar.tsx:70` | Logout only appears on the home, profile and about pages. |
| Fresh clone does not build | `src/env/environment.ts` missing; no `.env.example` | No new contributor can run the app. |

### 4.4 Code quality

- **Copy-pasted session bootstrap.** The same `getUserDetailsFromToken`, `getMyProfileData` and `pageLoading` logic is repeated in 7 pages. Replace it with one `AuthProvider` and a `useCurrentUser()` hook, plus a `<RequireAuth>` route wrapper.
- **Copy-pasted form fields.** There are nine near-identical input blocks and four identical select blocks (`ReportAnalysisPage.tsx:455-670`). Drive them from one `BIOMARKERS` config with label, unit, reference range and min/max. The same config can feed zod validation on both client and server.
- **Inconsistent error handling.** Some services return the error as a value (`userServices`, `authServices`) and others throw (`report`, `mri`). Pages then check `res.code === "ERR_NETWORK"`. Pick one style: throw typed errors.
- **`any` everywhere** despite `strict: true`. Define `User`, `ReportAnalysis` and `MriAnalysis` types once, ideally generated from an OpenAPI spec or shared zod schemas.
- **Dead code and files:**
  - `MRIresultModal` (empty) and `ReportResultModal` (unused, says "Logout")
  - `model/file.js`
  - `NLP/pdf_to_json.py` (a duplicate with a Windows `D:\` path)
  - `Model Deployment.ipynb` and `catboost_info/`
  - a duplicate `*` route
  - unused imports of `uuid`, `cv2`, `three` and `@react-three/fiber`
  - `cors` listed as a frontend dependency
- **Naming:** "tryglycerides" is baked into the API contract. Also "Analyis", "Desipite" and "No Existing Reports" under the image section.

---

## 5. UI/UX improvements

- **Mobile is broken [Verified].** The layouts use fixed desktop values: `px-[100px]`, `w-[60%]`, `min-w-[400px]`, `text-[70px]`, and the result page's `flex-row gap-[100px]`. The navbar menus open on hover only, so they cannot be used on touch devices. There is no mobile menu.
  - **Fix:** design mobile first, add a hamburger sheet, use single-column forms, and use sticky primary actions.
- **Make the analysis a guided flow.** Turn the long scroll into a four-step flow: *Upload → Check extracted values → Clinical questions → Results*. Show progress and keep the draft between steps. Put each extracted value next to a snippet of the PDF it came from, and highlight low-confidence values.
- **Lab inputs need units and ranges.** All numeric fields are `type="text"` and have no units or reference ranges. Errors show raw keys such as "alk_phos". Use numeric inputs with units (mg/dL, g/dL, U/L, 10³/µL, s), show the normal range, and flag out-of-range values in amber.
- **Results that explain themselves.** Today the page shows "Cirrhosis Stage 4" with no context. Show what was measured, what it means, how certain it is, what drove it, and what to do next. Always include a disclaimer and a "talk to a hepatologist" call to action. Make "doctor types" actionable.
- **History that shows change.** The profile lists bare timestamps. Show the stage or score, a key-values sparkline, status chips and filters. Add a confirmation step before deleting. Delete buttons appear only on hover, so touch and keyboard users cannot reach them.
- **Accessibility.** Fix clickable `div`s (menus, logout), inputs with no associated `<label>`, `outline-none` with no focus replacement, a missing `alt` on result images, and modals with no focus trap or Esc handling. Remove the AOS fade on every block, which makes content wait for scroll and ignores reduced motion.
- **States.** Logged-out visitors see a full-page loader while the user fetch runs. Errors collapse into "An Error Occured". Add skeletons, inline retry, empty states that explain the first step, and toast confirmations.
- **Visual polish.** Square 2px corners, crimson used for every heading, and long marketing paragraphs make the app read as unfinished. Reserve red for alerts. A medical app needs a calm neutral palette with semantic colours and a type scale. Build a small token set and about eight shared components: Button, Field, Select, Card, Stepper, Badge, Modal and EmptyState.

---

## 6. Performance and engineering improvements

| Issue | Evidence | Recommendation | Impact |
|---|---|---|---|
| 27.8 MB hero GIF | `index.css:222` uses `homepagejif.gif` as a CSS background | Convert to a muted, looping H.264 or WebM file (about 1–2 MB) with a poster image, or to a still image. | Mobile first load drops from tens of MB to about 1 MB. LCP improves sharply. |
| 46 MB unused video in git | `homepagevideo.mp4` is tracked and never imported | Delete it. Use Git LFS or a CDN for media. Remove the 31 KB CSV, 2.6 MB `model.pkl` and 3.4 MB notebook from the app path, or document them. | Faster clones and smaller repo history. |
| 488 KB `Icons.tsx` | Inline SVG path data. `Navbar` imports `LogoIcon` from it, so it lands in every route | Move the illustrations to `.svg` files loaded lazily on the About page. Keep the logo as a small component. | About 0.5 MB less JS on every page. |
| No code splitting | All 10 pages imported eagerly in `App.tsx` | Use `React.lazy` per route with Suspense. | Smaller initial bundle. |
| Heavy dependencies used lightly | MUI and Emotion for icons and one Tooltip; moment; `three` and react-three unused | Swap to `lucide-react` or inline icons plus a small tooltip. Use `Intl.DateTimeFormat` instead of moment. Drop three. | Hundreds of KB less JS and simpler styling. |
| Redundant user fetch on every page | 7 pages call `/get-user-by-id` with full `populate` | Use TanStack Query for `/me`, plus paginated `/reports` and `/images` lists that select summary fields. | Fewer requests and instant navigation. |
| Slow synchronous LLM calls | Express waits on Flask, which waits on Gemini, with no timeouts | Set axios and requests timeouts. Return the score immediately and stream or poll the narrative. A queue such as BullMQ is optional later. | Results appear in under a second. No hung requests. |
| Sequential PDF downloads, new client per call | `app.py:241`, `app.py:310` | Accept uploads directly. Reuse clients. Run the work in a thread pool or async. | Lower latency with many files. |
| No tests, CI or containers | None in the repo | Add pytest for extraction and prediction using the PDFs in `testing-assets/` as golden files, supertest for the auth and ownership rules, Playwright for one end-to-end path, GitHub Actions, Docker Compose, and `.env.example` files. | Safe refactoring and reproducible setup. |
| Unmaintained build tool | react-scripts 5 | Migrate to Vite. The app is small, so it takes a few hours. Env variables move from `REACT_APP_` to `VITE_`. | Faster dev server and supported tooling. |

---

## 7. New feature proposals

Each one targets a problem a real user of a liver app has: "what do my numbers mean, are they getting better, and what should I do next?" All are **[Idea]**.

### Guideline scores panel (Low)
- **What:** compute FIB-4, APRI, ALBI and, when the inputs are present, MELD-Na and Child-Pugh. Show each with its published cut-offs and risk band.
- **Problem:** the current single ML stage is opaque and trained on the wrong population. AASLD guidance recommends FIB-4 as the first-line blood test for excluding advanced fibrosis. Common cut-offs are <1.3 for low risk, 1.3–2.67 indeterminate and >2.67 high, with 2.0 used over age 65.
- **Interaction:** scores appear at the top of every result, with a "how this is calculated" expander.
- **Implementation:** pure TypeScript functions in a shared package, unit-tested against published examples. Add ALT, INR, creatinine and sodium to the extraction schema.
- **Dependencies:** biomarker config (P2). Extraction of the extra fields.
- **Impact:** clinically credible output that a doctor will recognise. This is the foundation for everything below.

### Lab trends dashboard (Medium)
- **What:** a time-series chart for each biomarker and score across all uploaded reports, with reference bands, using each report's own date rather than the upload date.
- **Problem:** liver disease is monitored over years, and a single snapshot means little.
- **Interaction:** the profile becomes "My liver" with charts and "since last test" deltas. Tapping a point opens the source report.
- **Implementation:** normalise to a `LabResult { userId, analyte, value, unit, observedAt, sourceFileId, page }` collection. Chart with Recharts or visx.
- **Dependencies:** normalised data model and auth.
- **Impact:** gives users a reason to come back. This is the core retention feature.

### Robust structured extraction with citations (Medium)
- **What:** replace the regexes with an LLM or vision extractor that returns a strict JSON schema, normalised units, and the page and text span each value came from. Scanned PDFs and phone photos of reports would also work.
- **Problem:** the regexes fit one lab's layout. Real users have reports from many labs, in many units, sometimes as photos.
- **Interaction:** on the review screen, each value shows a "from page 2" chip. Low-confidence values are highlighted for confirmation.
- **Implementation:** an LLM with structured output (Gemini, Claude or another), Pydantic validation, unit conversion tables, plausibility ranges, and the existing PDFs as an evaluation set.
- **Dependencies:** private file storage, consent and PII redaction.
- **Impact:** extraction goes from working on one lab's reports to working on most. Less manual typing.

### Doctor-ready summary and share link (Medium)
- **What:** a one-page clinical summary (values, trends, scores, symptoms, medications) generated as a PDF on the server, plus an expiring share link with an access log.
- **Problem:** patients get 10 minutes with a hepatologist and arrive with a pile of PDFs.
- **Implementation:** server-side PDF generation (Playwright print or react-pdf). Signed share tokens with a TTL and revocation.
- **Impact:** turns the app from a novelty into something a patient actually takes into the appointment.

### Plain-language biomarker explainers (Low)
- **What:** each value links to a short, reviewed explanation: what it measures, why it is high or low, and which other values matter with it.
- **Implementation:** static, clinician-reviewed MDX content keyed by analyte. No LLM needed.
- **Impact:** builds trust, adds SEO surface, and reduces anxiety.

### Smart retest reminders (Medium)
- **What:** suggest the next test and when, based on the risk band. For example, an indeterminate FIB-4 suggests asking about elastography. Send email or push reminders.
- **Implementation:** a rule table reviewed by a clinician, a scheduled job, and email through Resend or SES. Opt-in only.
- **Impact:** brings users back on a cadence that matches care.

### Lifestyle and risk-factor log (Medium)
- **What:** a lightweight weekly log of alcohol units, weight, waist and diabetes status, shown on the same timeline as the labs.
- **Problem:** MASLD and alcohol-related liver disease are driven by these factors, and the current advice is generic LLM text.
- **Impact:** advice becomes personal and measurable.

### Account controls and data rights (Low)
- **What:** edit profile, change password, password reset by email, export all data as JSON or FHIR, and delete account with cascade deletion of files.
- **Impact:** table stakes for health data, and required under the GDPR and DPDP Act.

### Localisation (Medium)
- **What:** Hindi and other regional languages for the interface and explainers. **[Assumption]** The sample reports come from Indian labs (Lal PathLabs, values in lakh), so India looks like the primary market.
- **Implementation:** i18next with reviewed medical translations.

---

## 8. Innovative ideas

These five would set Cirrh0 apart from both generic "AI reads your lab report" tools and plain calculators.

1. **Care-pathway navigator (Medium).** Map the user's data onto the published non-invasive testing pathway (FIB-4, then elastography or ELF, then hepatology referral) and show exactly where they are, the next test to ask for, and a one-line script for their doctor. Calculators stop at the number. This turns the number into a next step. Build it as a deterministic state machine over the scores, with the guideline citation on every step.
2. **"What changed" explainer (Medium).** For each new report, show which values moved the score and by how much: "Your FIB-4 rose from 1.2 to 1.6, mostly because platelets fell from 240 to 190." For formula scores, this is exact arithmetic attribution. For any ML model you keep, use SHAP values. No competitor explains changes over time in plain language.
3. **Ask-my-reports assistant with guardrails (High).** A chat assistant grounded only in the user's own extracted data and a curated, clinician-reviewed knowledge base. Every answer cites the report or guideline it used. It refuses to diagnose or prescribe. Retrieval runs over structured data, not raw PDFs, so it does not hallucinate values. This is where an LLM genuinely helps, and it replaces the current unconstrained narrative.
4. **Red-flag triage (Low).** Before any analysis, ask a short symptom checklist: vomiting blood, black stools, confusion, rapidly growing abdomen, yellowing eyes. Pair it with hard thresholds on the data, such as bilirubin above a set value or INR above 1.5. Any hit shows an urgent-care banner instead of lifestyle tips. It is cheap to build, it may save a life, and it shows responsibility to reviewers and partners.
5. **"What moves my number" simulator (Medium).** An interactive what-if view on the scores: drag platelets or AST and watch FIB-4 and its risk band update live, with notes on which factors lifestyle can change and which it cannot. It is educational, engaging and honest about what is modifiable. It needs only the deterministic score functions and a small UI.

---

## 9. Competitive and industry analysis

| Product type | Examples | What they do well | Lesson for Cirrh0 | Basis |
|---|---|---|---|---|
| Clinical score calculators | MDCalc, hepatology society calculators | Transparent formulas, citations, cut-offs, trusted by clinicians | Lead with validated scores and show the formula. | Domain knowledge |
| Imaging biomarkers | Perspectum LiverMultiScan (FDA 510(k) cleared since 2017; current v6.0 measures cT1, PDFF and liver iron) | Quantitative output with stated thresholds, analyst QC, regulatory clearance | Real imaging AI is a regulated clinical product. A consumer app should not claim MRI diagnosis. | Searched (FDA K253413) |
| Elastography | FibroScan (VCTE) | The standard second-line test after FIB-4 | Recommend it as a next step, and let users log their kPa results. | Domain knowledge |
| Symptom checkers and lab explainers | Ada Health and various "AI lab report reader" apps | Guided flows, plain language, triage advice | Use a stepper UX and triage messaging. Specialising in the liver is the differentiator. | Domain knowledge |
| Patient portals | MyChart and similar | Lab trends over time, sharing with providers | Trends and sharing are expected, not extras. | Domain knowledge |

**Industry-standard features missing:**
- an intended-use statement and disclaimer
- a consent and privacy notice
- account deletion and data export
- reference ranges and units
- trends and explainability
- an audit log for health-data access
- password reset
- accessibility at WCAG 2.2 AA

**Where Cirrh0 can differentiate:** it is liver-specific, built for the patient, aware of Indian lab reports, and extracts multiple reports with human review. No mainstream tool combines extraction, guideline scores, trends and pathway navigation for one organ. **[Assumption]** This is based on general market knowledge, not a full market scan.

---

## 10. Improvement roadmap

Complexity: **Low** is under 1 day, **Medium** is 2–5 days, **High** is more than a week, for one developer.

### Priority 1: Critical fixes

| Task | Expected outcome | Complexity | Depends on | Files |
|---|---|---|---|---|
| Rotate the Gemini and Roboflow keys and the JWT secret, move them to env, purge history | Leaked credentials become useless | Low | None | `app.py`, `authController.js`, `.env.example` |
| Remove `/delete-all-data` | No one-call data wipe | Low | None | `routes/auth.js`, `authController.js`, `server.js` |
| Replace `eval` with JSON structured output and Pydantic | No code execution from model output. Stable response shape. | Low | None | `app.py` |
| Turn off Flask debug, use a production server, bind privately, allowlist URLs, enable TLS verification | Closes the debugger and SSRF holes | Low | None | `app.py` |
| Auth middleware, ownership scoping and `/api/me`; hide password and token fields | Users can reach only their own data | Medium | Secret rotation | `server.js`, new `middleware/auth.js`, all controllers and routes, `model/user.js`, all frontend services |
| HttpOnly cookie session, rate limiting, helmet, CORS allowlist, password policy | Hardened sessions | Medium | Auth middleware | `authController.js`, `authServices.ts`, `LoginPage.tsx` |
| Fix the stage labels, add a disclaimer and intended use, remove "self-treatment" and "diagnosis" wording | Honest output, lower clinical and legal risk | Low | None | `app.py`, result pages, analysis pages, `Footer.tsx` |
| Rename or relabel "MRI" as histology, or hide it; never narrate empty detections | No misleading feature | Low | None | `MRIAnalysisPage.tsx`, `MRIResultPage.tsx`, `Navbar.tsx`, `app.py` |
| Keep model output separate from LLM text; handle nulls; add timeouts; return proper failure codes | The number shown is the model's | Low | Structured output | `app.py`, `reportController.js` |
| Fix the bugs listed in 4.3: MRI delete, null checks, stale validation, MRI catch, `reverse()`, orphan reports, missing `return` | Core flows stop failing | Low | None | Controllers, `ReportAnalysisPage.tsx`, `MRIAnalysisPage.tsx` |
| Private file storage with signed URLs, cascade delete, consent step | No public health records | Medium | Auth middleware | New upload route, both analysis pages, models |
| Commit `environment.ts` (reading env), add `.env.example` files, a README with run steps, and `requirements.txt` | A fresh clone runs | Low | None | Repo root, `cirrh0/src/env/`, `cirrh0-prediction-model/` |

### Priority 2: Quality improvements

| Task | Expected outcome | Complexity | Depends on | Files |
|---|---|---|---|---|
| Retrain correctly (split, then SMOTE in a pipeline), report honest metrics and calibration, version the model | A trustworthy accuracy figure | Medium | None | Notebook, `model.pkl`, `scaler.bin` |
| `AuthProvider`, `RequireAuth` and TanStack Query; delete the 7 copies of the bootstrap code | About 300 fewer lines and one source of truth | Medium | P1 auth | `App.tsx`, all pages, `redux/*` (removable) |
| Shared biomarker config and zod schemas used by client and server | Validation, units and ranges defined once | Medium | None | New `shared/biomarkers.ts`, `ReportAnalysisPage.tsx`, `reportController.js` |
| Fix the data model: numeric types, Date fields, timestamps, indexes on `userId`, drop ID arrays from `User` | Consistent and queryable data | Medium | Auth scoping | `model/*`, controllers, plus a migration script |
| Performance: replace the GIF, delete the mp4, split `Icons.tsx`, lazy routes, drop three, moment and most of MUI | Initial payload down by tens of MB | Low | None | `index.css`, `assets/*`, `App.tsx`, `package.json` |
| Responsive layouts, mobile navigation, accessibility pass | Usable on phones and with a keyboard | Medium | Design tokens | All pages, `Navbar.tsx`, modals |
| Design tokens and about 8 shared components | Consistent, modern UI | Medium | None | `tailwind.config.js`, new `components/ui/*` |
| Tests (pytest, supertest, Playwright), GitHub Actions, Docker Compose | Safe changes and one-command setup | Medium | None | New test folders, `.github/workflows`, `docker-compose.yml` |
| Structured logging with PHI redaction, central error handler, request IDs | Failures can be debugged without leaking data | Low | None | `server.js`, controllers |
| Remove dead code and fix spelling (introduce `triglycerides` with an alias) | A clean codebase | Low | None | See 4.4 |
| Migrate CRA to Vite; move Flask to FastAPI (optional) | Supported tooling, typed API, OpenAPI | Medium | Tests | `cirrh0/` config, `cirrh0-prediction-model/` |

### Priority 3: Feature enhancements

| Task | Expected outcome | Complexity | Depends on | Files |
|---|---|---|---|---|
| Guided four-step analysis flow with saved drafts | Higher completion, fewer input errors | Medium | Shared components, biomarker config | `ReportAnalysisPage.tsx` (split into steps) |
| Structured LLM extraction with citations, units and confidence | Works on most lab layouts and on photos | Medium | Private storage, consent | `app.py` (extract module), review UI |
| Redesigned result page: summary, drivers, next steps, disclaimer | Results users understand | Medium | Scores panel | `ReportResultPage.tsx` |
| History with scores, filters, delete confirmation, re-run analysis | A useful profile page | Low | Data model | `ProfilePage.tsx` |
| Account settings, password reset, export, delete account | Data-rights compliance | Medium | Auth, email provider | New settings page, auth controller |

### Priority 4: New features

| Task | Expected outcome | Complexity | Depends on | Files |
|---|---|---|---|---|
| Guideline scores panel (FIB-4, APRI, ALBI, MELD-Na, Child-Pugh) | Clinically credible core output | Low | Extra extracted fields | New `shared/scores.ts`, result page |
| Lab trends dashboard | A reason to keep coming back | Medium | LabResult collection | New `LabResult` model, new dashboard page |
| Doctor summary PDF and expiring share link | Used in real appointments | Medium | Trends, auth | New share routes and summary renderer |
| Biomarker explainers | Trust and SEO | Low | Biomarker config | New content folder |
| Retest reminders and lifestyle log | Ongoing engagement | Medium | Trends, email | Scheduler, new models |
| Localisation | Reach in the target market | Medium | Copy cleanup | All UI strings |

### Priority 5: Innovation

| Task | Expected outcome | Complexity | Depends on |
|---|---|---|---|
| Red-flag triage | Safety and credibility | Low | Disclaimer work |
| Care-pathway navigator | A clear next action for every user | Medium | Scores panel |
| "What changed" explainer | Insight no competitor offers | Medium | Trends, scores |
| "What moves my number" simulator | An engaging, educational view | Medium | Scores panel |
| Ask-my-reports assistant with guardrails | Safe, grounded Q&A | High | Structured data, reviewed knowledge base, evaluation set |

---

## 11. Recommended architecture

Keep the three services and MongoDB. A rewrite is not needed. The changes are about boundaries: the API owns identity, files and data; the ML service is private and stateless; deterministic logic is separated from LLM text.

```text
 Browser (React + Vite, TanStack Query, RHF + zod, lazy routes)
   │  HttpOnly session cookie
   ▼
 API  (Express)   helmet · CORS allowlist · rate limit · pino (PHI-redacted)
   ├─ middleware: requireAuth → req.user;  validate(zodSchema);  errorHandler
   ├─ /api/auth/*   /api/me   /api/reports   /api/labs   /api/share/:token
   ├─ uploads → private bucket (signed URLs, cascade delete)
   ├─ shared/  biomarkers.ts · scores.ts (FIB-4, APRI, ALBI, MELD-Na)   ← deterministic, unit-tested
   └─ MongoDB: users · reports · labResults · files · auditLog
   │  internal network only (service token)
   ▼
 ML service (FastAPI + Pydantic, gunicorn/uvicorn, no public port)
   ├─ POST /extract     → {analyte, value, unit, page, span, confidence}[]
   ├─ POST /predict     → {model_version, class, probabilities}     (no LLM)
   ├─ POST /histology   → {detections[], confidence}               (clinician mode)
   └─ POST /narrate     → LLM with JSON schema, inputs de-identified, cached
```

Optional later: a job queue for extraction and narration once users upload many files, and OpenAPI-generated TypeScript types shared between the API and the client.

---

## 12. Final product vision

Cirrh0 becomes a **personal liver health record**:

- A patient photographs or uploads lab reports from any lab, and the values are extracted with citations they can check.
- They get guideline-recognised scores with plain explanations, a timeline showing whether things are improving, and a clear next step on the care pathway.
- Before an appointment, they share a one-page summary their hepatologist can read in a minute.

The AI does the parts it is good at: reading messy documents, explaining, and answering questions grounded in the user's own data. The numbers that matter come from transparent, validated formulas. Every screen carries a safety net (red-flag triage and honest disclaimers) and every record is private by default.

The result moves from a demo that guesses a stage to a tool patients would trust and clinicians would not dismiss. It is also a much stronger portfolio piece because it shows security, ML rigour and product judgement, not only a working pipeline.

---

## Sources

- [R survival package: pbc dataset documentation](https://search.r-project.org/CRAN/refmans/survival/html/pbc.html) (stage = histologic stage, needs biopsy)
- [NPCox: Mayo Clinic Primary Biliary Cholangitis Data](https://rdrr.io/cran/NPCox/man/pbc.html)
- [HepatoBiliary Surgery and Nutrition: editorial on AASLD 2023 guidance and FIB-4](https://hbsn.amegroups.org/article/view/117539/html)
- [AACE 2026: MASLD testing presentation (tiered NIT approach)](https://pro.aace.com/pdfs/presentations/thursday/MASLD-Testing-2026-Kanwal.pdf)
- [FDA 510(k) K253413: LiverMultiScan v6.0](https://fda.innolitics.com/device/K253413)
- [FDA 510(k) K202170: LiverMultiScan v4](https://fda.innolitics.com/device/K202170)
- [Perspectum: LiverMultiScan product overview](https://perspectum.com/clinical-solutions/livermultiscan-healthcare-professionals)

### Priority 2 progress (branch `improve/p2-cleanup-tests-ci`)

- [x] Hero GIF (27.8 MB) replaced by a 12 KB still frame; unused 46 MB MP4 deleted; main bundle 337 kB to 80 kB gzipped
- [x] Lazy-loaded routes; logo split from the 488 KB illustrations file; `moment`, `three` and react-three removed
- [x] Dead code removed (unused modals, logo, NLP scripts, old notebook, CatBoost logs, duplicate route)
- [x] Tests: 15 API (Node test runner), 33 ML (pytest), 9 web (Jest); GitHub Actions CI runs all three plus `tsc` and a production build
- [x] API dependencies updated within semver ranges: `npm audit` now reports 0 vulnerabilities (was 12, 3 critical)
- [ ] The media still exists in git history (`.git` is about 76 MB). Remove it in the same `git filter-repo` pass as the leaked secrets
### Lab trends (branch `improve/trends`)

- [x] `GET /get-trends` and a "My trends" page: guideline scores and six lab values across all of a user's analysed reports, oldest to newest, with the change since the previous report
- [x] Older reports that predate stored scores get scores worked out from their stored lab values with the same code, so history is consistent; the API returns only ids, dates, labs and scores (no analysis text or file links)
- [x] Score reference lines come from one exported `SCORE_THRESHOLDS`, shared with the scoring code so the chart and the explanations cannot drift apart
- [x] Dependency-free SVG chart; each chart is an image with a title and a written description, and offers its data as a table; direction is shown with symbols and words, not colour alone
- [x] Checked in a browser at 375 px and 1280 px with five reports of sample history; chart text was unreadably small on a phone (5.7 px) and was redrawn at about 9.6 px
- [ ] Lab charts have no reference lines on purpose: normal ranges differ between labs. Reading them from the report would be a good extraction improvement
- [ ] Not yet covered: points are not links back to their report, no date-range filter, not checked against a live database, chart contrast not audited

### Responsive layout and accessibility (branch `improve/responsive-a11y`)

Checked in a real browser at 375 px and 1280 px against a mock API:

- [x] Every route fits a 375 px screen with no horizontal overflow (it did not before: result pages were squeezed into a narrow column by fixed 120 px padding, and Home, About, Login and Signup overflowed)
- [x] New Navbar: phone menu with `aria-expanded`/`aria-controls`, real buttons instead of clickable divs, Escape closes menus, labelled `nav`, `aria-current`; Logout is available on every page
- [x] Two-column layouts stack on phones; `h-screen` replaced by `min-h-screen`, `100vw` widths removed; wide lab table scrolls inside its own box
- [x] Lab inputs have real `<label>`s; login and signup inputs, password toggles and selects have accessible names
- [x] Logout dialog: `role="dialog"`, Escape to close, focus moves in
- [x] Delete buttons on the profile page are visible on touch screens (they only appeared on hover before)
- [x] Fade-in animations are disabled for people who ask for reduced motion
- [ ] Not yet covered: tablet widths between phone and desktop, focus trapping in the dialog, colour contrast audit (crimson on grey labels), keyboard check of the file upload, other browsers, screen reader testing
- [ ] Remaining design work: design tokens and shared components, a calmer palette

### Priority 4 progress (branch `improve/guideline-scores`)

- [x] Guideline scores panel: FIB-4, APRI and ALBI, computed on the API from the user's own values (no ML, no LLM), each with formula, cut-offs, values used, caveats and source. Bands are written out as well as coloured, and graded on the displayed value
- [x] Optional ALT field (enables FIB-4)
- [x] An ML outage no longer fails an analysis: the scores are saved and the page says the model estimate was unavailable
- [x] Lab extraction fixed on the real sample reports (AST, ALP and bilirubin on the `test3` layout, ALT added, platelets per uL normalised) with golden tests on `testing-assets/`
- [ ] FIB-4 cut-offs follow McPherson 2017 (1.3, 2.67, and 2.0 from age 65). Sterling's original 2006 cut-offs were 1.45 and 3.25. APRI thresholds follow WHO hepatitis B guidance and vary by cause of liver disease. A clinician should review the wording before any public launch
- [ ] APRI assumes an AST upper limit of normal of 40 U/L; take it from the report when available
- [ ] Not yet viewed in a browser against live data

### Priority 2 progress (branch `improve/auth-provider`)

- [x] One `AuthProvider` and `RequireAuth` replace Redux and seven copies of login bootstrap (net about 440 lines removed); a 401 clears the session and a network error no longer looks like a logout
- [x] Data model: `userId` is the only ownership record (id arrays removed from `User`), lab values are numbers, enums and ranges enforced, indexes added, `createdAt`/`updatedAt` on every record
- [x] Abandoned report drafts expire automatically after 24 hours (MongoDB TTL index)
- [x] Structured JSON logging with request ids; credentials and personal fields redacted; errors never log request bodies; central error handler
- [x] API now has 26 tests, web has 20
- [ ] Existing user documents still carry the old id arrays. They are ignored and replaced in responses; `$unset` them whenever convenient
- [ ] Remaining Priority 2: shared biomarker config (client and server), server-state cache (TanStack Query), responsive layout and accessibility pass, design tokens, Vite migration (also resolves the `react-scripts` audit findings), unused-variable lint warnings
