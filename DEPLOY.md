# Deploying Cirrh0 on Render

This sets up a **demo or private beta** on Render's free tier from the Blueprint in [`render.yaml`](render.yaml). Read "What the free tier means" before you share the link. It is not ready for real patient reports (see "Before real users").

## What you get

```
Browser ──https──▶  cirrh0  (Node)         serves the web app at / and the API at /api
                       │  ├── PostgreSQL     cirrh0-db  (Render Postgres 16)
                       │  └── cirrh0-ml      (Python)  stage model, lab extraction, image detection
```

- **One address for the site and the API.** The login cookie is first-party, so it works on every browser, including Safari. No CORS.
- `cirrh0-ml` is a public address, not a private one: free web services cannot receive private-network traffic. It is protected by a shared secret (`ML_SERVICE_TOKEN`) that Render generates and passes to both services, so requests without it get a 401.
- Database migrations run every time `cirrh0` starts (`prisma migrate deploy`). That is safe to repeat and safe if two instances start at once.

## Before you deploy (about 20 minutes)

1. **Revoke the old API keys and make new ones.** The Gemini and Roboflow keys were committed to this public repository and must be treated as stolen. Create new ones in their dashboards and use only those below. (The old JWT secret no longer matters: Render generates a new `SECRET_KEY`.)
2. **Cloudinary.** Uploads go from the browser to Cloudinary. You need your *cloud name*, and an **unsigned upload preset named exactly `image_preset`** (Settings, Upload, Upload presets). The preset name is fixed in the web app. Uploaded files are reachable by their link, which is why this deployment is demo-only.
3. **Render account**, connected to your GitHub account with access to this repository.
4. Make sure `main` is the version you want to ship. Render deploys whatever is on the branch you pick.

## Deploy

1. In Render: **New, Blueprint**. Choose this repository and the `main` branch. Render reads `render.yaml` and lists the three things it will create. Every plan in the file is Render's free tier, so check the plans shown before you confirm.
2. It asks for four values:

   | Variable | What to enter |
   |---|---|
   | `GEMINI_API_KEY` | your **new** Gemini key (leave empty to run without the written explanations; scores and the stage still work) |
   | `ROBOFLOW_API_KEY` | your **new** Roboflow key (only needed for the slide-image tool) |
   | `ML_SERVICE_URL` | `https://cirrh0-ml.onrender.com` |
   | `REACT_APP_CLOUDINARY_CLOUDNAME` | your Cloudinary cloud name |

3. Click **Apply**. The first deploy takes several minutes: the model service installs CatBoost and scikit-learn, and the other service builds the web app.
4. Open the **cirrh0-ml** service and check its address. If it is **not** `https://cirrh0-ml.onrender.com` (Render adds a suffix when a name is taken), open **cirrh0, Environment**, fix `ML_SERVICE_URL`, and save. That restarts the service; no rebuild is needed.
5. Your site is the address shown on the **cirrh0** service.

## Check that it works

1. Open `https://<your-site>/healthz`. You should see `{"status":"ok"}`.
2. Open the site and go to Sign Up. The yellow **Demo version** notice should be visible.
3. Sign up, log in, then Report Analysis. Enter these made-up values, which should give an estimated stage and all three scores:

   Ascites N, Edema N, Spiders N, Hepatomegaly Y, Bilirubin 1.2, Albumin 3.8, Copper 80, Cholesterol 180, Alk_Phos 300, SGOT 40, ALT 36, Tryglycerides 120, Platelets 200, Prothrombin 11.

   Expected scores: APRI 0.5 and ALBI -2.36 (grade 2) for anyone. FIB-4 also uses the age on the account: it is 1.83 (indeterminate) for an account aged 55 and 1.73 for one aged 52.
4. Open My Trends, then reload the page on that address. It should still load.
5. In Render, open the **Logs** of `cirrh0`. You should see JSON lines and no errors.

## What the free tier means

These are Render's published free-tier rules at the time of writing. Check [Render's free page](https://render.com/docs/free) for current ones.

- **Sleeping.** A free service sleeps after 15 minutes without traffic and takes about a minute to wake. The first visit after a quiet period is slow. If the model service is asleep when someone analyses a report, the request can time out (60 seconds). The analysis is still saved with the guideline scores, and the page says the model estimate was unavailable. Running it again a minute later works.
- **Hours.** 750 free instance hours per month are shared across your workspace. Two services running all month would use more than that, so they would be suspended near month end if they never slept.
- **The free database expires 30 days after it is created**, and is deleted 14 days after that unless you upgrade it. It has **no backups**, 1 GB of storage, and you can have only one per workspace. For a demo that is acceptable. For anything people rely on, upgrade it first (below).
- The model service uses about 220 MB of memory when idle (measured), which should fit a 512 MB instance with some room, but it has not been tested on Render itself.

## Upgrading for real use

Edit `render.yaml` (or change the plan in the dashboard), then push:

| Change | Why |
|---|---|
| Database `plan: free` becomes `plan: 0.1c-256mb` (the smallest paid database) | removes the 30-day expiry and is the first thing to do before real use |
| `cirrh0` and `cirrh0-ml` `plan: free` become `plan: 0.5c-512mb` | always on with no cold starts, and not subject to the free hours limit |
| Then, for `cirrh0`, replace the `ML_SERVICE_URL` entry with `fromService: {type: web, name: cirrh0-ml, property: hostport}` | paid services can use the private network, so the model service no longer needs a public address |
| A custom domain on `cirrh0` | nicer address; nothing else needs to change |

Back up the database before any release that changes `cirrh0-backend/prisma/schema.prisma`; migrations run automatically when the service starts.

## Before real users

Do not invite people to upload real reports until these are done:

1. **Private file storage.** Today a report goes to Cloudinary at a public link that anyone with the address can open, and it is not deleted when the analysis is deleted. This is the main reason for the demo notice.
2. **A clinician reads the score wording** and the cut-offs, and you have taken advice on whether the product needs regulatory approval where you operate.
3. A privacy notice and a consent step, and a way for people to delete their account and files.
4. Database backups and a connection limit chosen for your plan.

## Running it

- **Deploys.** The Blueprint deploys automatically on every push to the chosen branch. In Render, a service's **Events** tab lists deploys, and **Rollback** returns to an earlier one. A rollback does not undo database migrations.
- **Logs** are JSON with a request id (also returned as the `X-Request-Id` header). Passwords, emails, tokens and lab values are never written to them.
- **Rotating secrets.** Changing `SECRET_KEY` signs everyone out. Changing `ML_SERVICE_TOKEN` must be done on `cirrh0-ml` (the API picks it up on its next start).
- **Rate limit.** 20 login or sign-up attempts per address per 15 minutes. It works per visitor because `TRUST_PROXY=1` makes the API read the real address behind Render's proxy.

## If something goes wrong

| What you see | Likely cause and fix |
|---|---|
| Build of `cirrh0-ml` fails on a Python or package error | Render's Python version. The Blueprint pins `PYTHON_VERSION` to `3.14.10`, the version the model was trained and tested on. If Render rejects it, use the default but keep the package versions in `requirements.txt` |
| `cirrh0` stops with `WEB_DIR is set but ... index.html does not exist` | the web build step failed; read the build log above the error |
| `cirrh0` stops with `Missing required environment variable` | a variable was left empty in the dashboard; the message names it |
| Site loads but sign-up or login says there is a server error | database not ready yet, or `DATABASE_URL` missing; check `/healthz` |
| Login works but you are signed out on the next page | the site is being opened from an address other than the one Render shows; `CLIENT_ORIGINS` defaults to that address |
| Analysis always says the model estimate is unavailable | the model service is asleep (wait a minute and retry), or `ML_SERVICE_URL` is wrong, or the two `ML_SERVICE_TOKEN` values differ |
| Images or fonts are blocked | the content security policy allows only this site, Google Fonts and Cloudinary; the browser console names what was blocked |

## How this was checked

The production setup was run locally end to end in a browser, with the same build variables and start command as the Blueprint: a fresh database migrated on start, the API serving the built app on one origin under `/api`, the model service under gunicorn with the shared token, then sign-up, login (secure cookie), an analysis, the trends page and a hard reload on a deep link. The browser blocked an injected inline script, a script from another site and a tracker image, and the API log held no errors and no personal data.

**Not checked here:** the Blueprint itself on Render (this needs your account), Render's free-tier memory for the model service, and cold-start timing. Expect to adjust once on the first real deploy.

Sources for the platform facts above: [Blueprint reference](https://render.com/docs/blueprint-spec), [free tier](https://render.com/docs/free), [private network](https://render.com/docs/private-network), [Python version](https://render.com/docs/python-version), [Node version](https://render.com/docs/node-version).
