# astro-portfolio-theme

Portfolio template built with Astro. All your content lives in simple JSON files. Edit them, run a build command, and your finished static site lands in `./output/` ready on githib pages, gitlab pages, upload anywhere.

---

| Feature                | Details                                                               |
| ---------------------- | --------------------------------------------------------------------- |
| **Content management** | Everything configured via JSON files — no CMS, no code changes needed |
| **Project cards**      | Auto-fetches cover images from GitHub READMEs at build time           |
| **Contact form**       | Web3Forms — no backend, just one API key                              |
| **Hosting**            | 100% static output, deploys to any CDN or VPS for free                |
| **SEO & PWA**          | OG tags, web manifest, all favicon sizes, works offline               |
| **Accessibility**      | Keyboard nav, ARIA labels, skip link, reduced-motion support          |
| **Stack**              | Astro 4, Tailwind CSS 3, TypeScript, GitHub API + RSS                 |
| **Requirements**       | Docker + Docker Compose, or Node 18+ with npm                         |

---

![Astro Portfolio Theme Official Sweater](https://raw.githubusercontent.com/MarcusHoltz/marcusholtz.github.io/refs/heads/main/assets/img/header/header--astro--portfolio-theme-github-gitlab-pages.jpg "Generate Your Portfolio Now")


---

## Quick Start

**With Docker (recommended):**

```bash
# Build and output the site to ./output/
docker compose build && docker compose up
```

**Without Docker:**

```bash
npm install
npm run dev       # dev server at http://localhost:4321
npm run build     # builds to ./dist/
```

Set environment variables in a `.env` file in the project root:

```env
SITE_URL=https://www.example.com
GITHUB_USER=your-github-username
GITHUB_TOKEN=ghp_xxxx
```

`.env` is in `.gitignore` — safe for local dev. The Docker secrets path (`secrets/github_token_password.txt`) is used when building with `docker compose`.

---

## Data Files

All content lives in `src/data/`. Edit these JSON files to update any part of the site:

| File | Controls |
| ---- | -------- |
| `personal.json` | Name, bio, contact info, social links, hero role, photo |
| `site.json` | Site title, SEO description, Web3Forms key, nav links, services cards |
| `expertise.json` | Four focus-area cards in the Expertise section |
| `skills.json` | Tech & tool categories with logos |
| `portfolio.json` | Client work carousel (multi-slide projects) |
| `projects.json` | Personal project cards with optional GitHub image fetching |
| `certifications.json` | Credentials and training timeline |
| `menu.json` | Navigation section labels |


---

## Build Checks & Quality Gates

The pipeline runs four automated quality checks on every build. All four are enforced both locally (via npm scripts) and inside the Docker build as **dedicated stages** — if any stage fails, Docker halts and the container is never produced. The checks can't be bypassed; they're structural, not advisory.

---

### ESLint — Static Analysis

**Commands:** `npm run lint` · `npm run lint:fix`  
**Config:** `eslint.config.mjs`

Catches bugs and enforces consistent code patterns before they reach production. Uses ESLint 9's flat config format with `eslint-plugin-astro` for Astro-specific rules and TypeScript parser awareness inside `.astro` files.

| Rule | Level | Why |
| ---- | ----- | --- |
| `astro/no-set-html-directive` | warn | Flags `set:html` usage — valid but must be intentional to avoid XSS |
| `no-console` | warn | Prevents accidental `console.log` left in production code |
| `no-debugger` | error | Ensures `debugger` statements are never shipped |
| `prefer-const` | error | Enforces immutability by default |
| `no-unused-vars` | warn | Surfaces dead code; ignores `_`-prefixed args by convention |

**Docs:** [eslint.org/docs](https://eslint.org/docs/latest/) · [eslint-plugin-astro](https://ota-meshi.github.io/eslint-plugin-astro/)

---

### Astro Check — TypeScript Type Checking

**Command:** `npm run typecheck`  
**Config:** `tsconfig.json`

Catches type errors at compile time before they become runtime bugs. Runs `astro check`, which wraps the TypeScript compiler with full awareness of `.astro` component syntax, prop types, and slot types. Configured with `strict` mode and `strictNullChecks` to eliminate the entire class of `null`/`undefined` runtime errors.

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "strictNullChecks": true
  }
}
```

`astro/tsconfigs/strict` enables `strict`, `noImplicitAny`, `strictFunctionTypes`, `strictPropertyInitialization`, and more.

**Docs:** [docs.astro.build — TypeScript](https://docs.astro.build/en/guides/typescript/)

---

### Docker Multi-Stage Build — Enforced Quality Gates

**Config:** `Dockerfile`

The Dockerfile runs lint, format check, and type check as separate build stages before the final Astro build. Each stage must pass before the next runs.

| Stage | What it does |
| ----- | ------------ |
| `deps` | Installs dependencies via `npm ci` (frozen lockfile — no version drift) |
| `lint` | Runs `npm run lint` then `npm run format:check` — both must pass |
| `typecheck` | Runs `npm run typecheck` |
| `builder` | Runs `npm run build` — only reached if all above pass |
| `build-static` *(optional)* | Bakes `dist/` into the image at build time (activate with `--profile serve`) |
| `server` *(optional)* | Nginx Alpine image serving the baked static output (activate with `--profile serve`) |

**Docs:** [Docker multi-stage builds](https://docs.docker.com/build/building/multi-stage/) · [npm ci](https://docs.npmjs.com/cli/commands/npm-ci)

---

### Running Checks Manually (Without a Full Build)

Nothing needs to be installed locally. Both checks run against pre-built Docker images — this is the fastest way to get lint or type errors in front of you without triggering the entire build pipeline.

**Step 1 — Build the check images** (first time only, or after source changes):

```bash
docker build --target lint       --progress=plain -t your-app-lint .
docker build --target typecheck  --progress=plain -t your-app-typecheck .
```

> If the source hasn't changed since the last build, Docker uses cached layers and produces no output. That's expected — it means nothing needs to be rebuilt.

**Step 2 — Run the checks:**

```bash
# ESLint — catches code issues and style violations
docker run --rm your-app-lint npm run lint

# TypeScript — catches type errors across all .astro and .ts files
docker run --rm your-app-typecheck npm run typecheck
```

Each `docker run` command always executes fresh against the built image, regardless of cache. If a check fails, the output tells you exactly which file and line to fix.

> **Tip:** Run lint first — it's faster and catches the most common issues. If lint passes but typecheck fails, the problem is a type mismatch rather than a style or syntax issue.

---

## Step 1 — Configure the Build

Open `docker-compose.yml`. It looks like this:

```yaml
secrets:
  github_token_password:
    file: ./secrets/github_token_password.txt

services:
  astro-portfolio-theme:
    build: .
    container_name: astro-portfolio-theme
    volumes:
      - ./output:/app/dist:z
    environment:
      - SITE_URL=https://www.example.com
      - BASE_PATH=/
      - GITHUB_USER=your-github-username
    secrets:
      - github_token_password
```

Change these values before running anything:

| Variable      | What to set                                                                           |
| ------------- | ------------------------------------------------------------------------------------- |
| `SITE_URL`    | Your full domain, e.g. `https://yourname.com` — used for `og:url` and canonical links |
| `BASE_PATH`   | `/` unless your site lives in a subdirectory (e.g. `/portfolio/`)                     |
| `GITHUB_USER` | Your GitHub username — enables project image fetching at build time                   |

The GitHub token is handled as a Docker secret so it never appears in `docker inspect`, logs, or your shell history. See [GitHub Integration](#github-integration) below for setup.

---

## Step 2 — Fill In Your Data

All content lives in `src/data/`. Open each file and replace the placeholder values.

---

### `src/data/personal.json` — Your identity

This drives your name, bio, contact info, and every social link across the entire site.

```json
{
  "name": "Your Name Here",
  "title": "Creative Professional",
  "photo": "/images/personal/portrait.png",
  "email": "hello@yourdomain.com",
  "phone": "(000) 000-0000",
  "phoneTel": "+10000000000",
  "location": "City, State",
  "linkedin": "your-linkedin-handle",
  "github": "your-github-handle",
  "instagram": "",
  "twitter": "",
  "blog": "https://yourblog.com",
  "education": "Your Degree, Your University",
  "yearsExperience": "5+",
  "volunteer": "Role, Organization · Year–Year",
  "heroSocialLinks": ["github", "linkedin"],
  "bio": "Short tagline that appears under your name on the hero.",
  "aboutLong": "Full biography shown in the About section."
}
```

- Social fields left empty (`""`) are automatically hidden — no broken links
- `heroSocialLinks` controls which icons appear on the hero. Options: `github`, `linkedin`, `gitlab`, `twitter`, `instagram`, `youtube`, `twitch`, `telegram`, `signal`, `blog`, `reddit`, `hackernews`, `lobsters`, `discogs`, `codepen`, `jsfiddle`, `facebook`
- `photo` is a path relative to `public/` — drop your image at `public/images/personal/portrait.png`

---

### `src/data/site.json` — Global site settings

Controls your site title, SEO, the header links strip, and the Services section cards.

```json
{
  "title": "Your Name | Creative Portfolio",
  "description": "Portfolio of a designer and developer...",
  "tagline": "Designing experiences · Building products · Telling stories",
  "web3formsKey": "YOUR_WEB3FORMS_KEY_HERE",
  "retroTvCount": 21,
  "seoKeywords": ["Creative Portfolio", "Web Designer", "UI/UX Design", "..."],
  "navExternal": [
    {
      "label": "Blog",
      "desc": "Writing on design and process",
      "personalKey": "blog",
      "urlTemplate": "{value}"
    },
    {
      "label": "GitHub",
      "desc": "Open-source work",
      "personalKey": "github",
      "urlTemplate": "https://github.com/{value}"
    },
    {
      "label": "LinkedIn",
      "desc": "Professional profile",
      "personalKey": "linkedin",
      "urlTemplate": "https://linkedin.com/in/{value}"
    },
    {
      "label": "Email",
      "desc": "Project inquiries",
      "personalKey": "email",
      "urlTemplate": "mailto:{value}"
    },
    {
      "label": "Phone",
      "desc": "Available by appointment",
      "personalKey": "phone",
      "urlTemplate": "tel:{value}"
    }
  ]
}
```

- `web3formsKey` — get this free at [web3forms.com](https://web3forms.com). Without it the contact form won't submit.
- `navExternal` entries use values from `personal.json` via `personalKey`. If the matching field is empty, the link is hidden automatically.
- `retroTvCount` — number of retro CRT frames drifting in the hero background. `21` is the default sweet spot.

#### Services Cards

The `serviceSites` array in `site.json` controls the two showcase cards in the Services section — useful for a studio site, a side project, or two separate business entities:

```json
"serviceSites": [
  {
    "badge": "Client Work",
    "badgeColor": "#6366f1",
    "name": "YourStudio.co",
    "url": "https://yourstudio.co",
    "description": "Full-service creative from concept through delivery.",
    "features": ["Brand Identity", "Web Design & Development", "Campaign Creative"],
    "ctaText": "View Studio Work"
  },
  {
    "badge": "Side Project",
    "badgeColor": "#10b981",
    "name": "YourProject.io",
    "url": "https://yourproject.io",
    "description": "A personal project built to scratch an itch.",
    "features": ["Self-Hosted", "Iterating in Public", "Built for Me"],
    "ctaText": "Check It Out"
  }
]
```

---

### `src/data/expertise.json` — What you do

Four cards displayed in the Expertise section. Replace the titles and descriptions with your actual focus areas.

```json
[
  {
    "key": "design",
    "title": "Design & Art Direction",
    "description": "Visual identity, layout, typography, and the decisions that make people stop and look twice."
  },
  {
    "key": "webdev",
    "title": "Web Design & Development",
    "description": "From wireframe to deployment — sites that look considered, perform well, and give visitors what they came for."
  }
]
```

---

### `src/data/skills.json` — Tech & tools

An array of skill categories, each with a list of tools. Icons are stored locally in `public/icons/devicons/` — find any icon name at [devicons.dev](https://devicons.dev).

```json
[
  {
    "title": "Design & Illustration",
    "skills": [
      { "name": "Figma", "logo": "/icons/devicons/figma-original.svg" },
      { "name": "Photoshop", "logo": "/icons/devicons/photoshop-line.svg" }
    ]
  },
  {
    "title": "Web & Frontend",
    "skills": [
      { "name": "TypeScript", "logo": "/icons/devicons/typescript-original.svg" },
      { "name": "React", "logo": "/icons/devicons/react-original.svg" }
    ]
  }
]
```

Add or remove categories freely — the grid adapts automatically.

> **Adding a new icon:** use the path format `/icons/devicons/{name}.svg` where `{name}` matches the devicons filename (e.g. `vue-original.svg`). The build script (`scripts/download-assets.mjs`) runs automatically before every `npm run build` and `npm run dev`, checks for any icon paths in the JSON that don't have a corresponding file in `public/`, and downloads only the missing ones from the jsdelivr CDN. Files already present are never re-fetched. If a download fails, the build logs a warning and continues.

---

### `src/data/portfolio.json` — Client work

These are the big showcase pieces displayed in the Portfolio carousel. Each project supports multiple slides.

```json
[
  {
    "title": "Brand Identity & Visual System",
    "category": "Branding",
    "description": "A complete brand overhaul — logo, typography, color system, and a style guide built to scale.",
    "images": [
      "/images/portfolio/project-1a.jpg",
      "/images/portfolio/project-1b.jpg",
      "/images/portfolio/project-1c.jpg"
    ],
    "slides": ["Brand Overview", "Style Guide Spread", "Product Shot"]
  }
]
```

- Images go in `public/images/portfolio/` — referenced by path from the root
- `slides` are the caption labels shown on each image in the carousel
- Add as many projects as you like; the carousel handles them all

---

### `src/data/projects.json` — Personal projects & experiments

Displayed as cards in the Projects section. Set `githubRepo` to auto-fetch a cover image from that repo's README at build time.

```json
[
  {
    "title": "Photography Workflow App",
    "company": "Side Project",
    "category": "web",
    "description": "A lightweight local app for managing shoot intake, selects, and client delivery.",
    "tags": ["React", "SQLite", "Node.js"],
    "icon": "eye",
    "link": "https://yourproject.com",
    "githubRepo": "photo-workflow",
    "featuredImage": "/images/projects/web-app.jpg",
    "backgroundImage": "/images/projects/web-app.jpg",
    "colorIcon": "/icons/materialdesign/camera-outline.svg"
  }
]
```

- `githubRepo` — the repo name (not the full URL). If set, the build reads that repo's README and extracts the first non-badge image, overriding `featuredImage`
- Leave `githubRepo` as `""` to use `featuredImage` instead
- `icon` — a Heroicons name used as a fallback icon (e.g. `"eye"`, `"cpu-chip"`, `"document-text"`, `"command-line"`)
- `colorIcon` — a locally cached icon file. Three CDN sources are supported; the build script auto-downloads any missing file before the Astro build runs:
  - `/icons/devicons/{name}.svg` — [devicons.dev](https://devicons.dev) (technology logos)
  - `/icons/materialdesign/{name}.svg` — [Templarian/MaterialDesign](https://materialdesignicons.com) on jsdelivr
  - `/icons/dashboard-icons/{name}.png` — [homarr-labs/dashboard-icons](https://github.com/homarr-labs/dashboard-icons) on jsdelivr

---

### `src/data/certifications.json` — Credentials & training

Timeline of your certifications, courses, and in-progress work.

```json
[
  {
    "name": "Google UX Design Certificate",
    "issuer": "Google / Coursera",
    "date": "March 2023",
    "status": "Earned",
    "type": "certification",
    "description": "Seven-course program covering UX research, wireframing, and prototyping.",
    "credentialUrl": "https://coursera.org/verify/..."
  },
  {
    "name": "3D Art for Real-Time Engines",
    "issuer": "Unity Learn / Epic Games",
    "date": "Target: End of Year",
    "status": "In Progress",
    "type": "in-progress",
    "description": "Bridging offline rendering with real-time constraints in Unreal Engine.",
    "credentialUrl": ""
  }
]
```

- `type` controls the badge style: `"certification"` | `"professional-development"` | `"in-progress"`
- `status` is the display label: `"Earned"` | `"Completed"` | `"In Progress"`
- Leave `credentialUrl` as `""` if you don't have a verification link yet

---

### `src/data/menu.json` — Navigation labels

Controls the section labels in the nav bar. You probably won't need to touch this unless you rename sections.

```json
{
  "sections": [
    {
      "label": "About",
      "shortLabel": "About",
      "href": "#about",
      "desc": "Background and approach"
    },
    {
      "label": "Expertise",
      "shortLabel": "Expertise",
      "href": "#expertise",
      "desc": "What I focus on"
    },
    {
      "label": "Portfolio",
      "shortLabel": "Portfolio",
      "href": "#portfolio",
      "desc": "Client work"
    },
    {
      "label": "Projects",
      "shortLabel": "Projects",
      "href": "#projects",
      "desc": "Personal projects"
    },
    {
      "label": "Certifications",
      "shortLabel": "Certs",
      "href": "#certifications",
      "desc": "Training and credentials"
    },
    { "label": "Services", "shortLabel": "Services", "href": "#services", "desc": "Sites I run" },
    { "label": "Contact", "shortLabel": "Contact", "href": "#contact", "desc": "Start a project" }
  ]
}
```

---

## Step 3 — Add Your Images

Drop your images into `public/` before building:

```
public/
└── images/
    ├── personal/
    │   └── portrait.png          ← your portrait (referenced in personal.json → "photo")
    ├── portfolio/
    │   ├── project-1a.jpg        ← referenced in portfolio.json → "images"
    │   ├── project-1b.jpg
    │   └── ...
    └── projects/
        ├── my-project.jpg        ← referenced in projects.json → "featuredImage"
        └── ...
```

If `githubRepo` is set for a project, the build fetches the image automatically and `featuredImage` is ignored for that project.

---

## Step 4 — Build & Deploy

CI/CD workflows for GitHub Pages, GitLab Pages, and Gitea/Forgejo/Codeberg are already included. If you're on one of those platforms, **this is the recommended path** — no Docker required, no manual file copying.

> **Push triggers are currently commented out.** All three workflow files ship with their automatic push-on-`main` triggers disabled so nothing fires unexpectedly while you're getting the repo set up. Each workflow can be run manually from the platform UI right now. When you're ready to enable automatic deploys on every push to `main`, uncomment the trigger block in the relevant file (instructions in each section below).

Pick your method:

- [GitHub Pages (CI/CD — recommended)](#github-pages)
- [GitLab Pages (CI/CD — recommended)](#gitlab-pages)
- [Gitea / Forgejo / Codeberg (CI build — manual deploy)](#gitea--forgejo--codeberg)
- [Self-hosted / VPS (Docker)](#self-hosted--vps)
- [Cloudflare Pages (Zero-to-Hero)](#cloudflare-pages)
- [Netlify (Zero-to-Hero)](#netlify)
- [Vercel (Zero-to-Hero)](#vercel)

---

### GitHub Pages

**1. Enable Pages in your repo**

Go to your repo → **Settings → Pages → Build and deployment** and set Source to **GitHub Actions**.

**2. Set repository variables**

Only one variable is required. Go to **Settings → Secrets and variables → Actions → Variables** and add:

| Variable      | Required | Value                                                                        |
| ------------- | -------- | ---------------------------------------------------------------------------- |
| `GITHUB_USER` | Yes      | Your GitHub username (for project image fetching)                            |
| `SITE_URL`    | No       | Override the auto-detected URL — e.g. `https://yourcustomdomain.com`         |
| `BASE_PATH`   | No       | Override the auto-detected base path — e.g. `/` after adding a custom domain |

> **`BASE_PATH` and `SITE_URL` are now auto-detected.** The build reads the built-in `GITHUB_REPOSITORY` variable (always set by the GitHub Actions runner, no configuration needed) and derives both values automatically:
>
> - Project repo (e.g. `your-github-username/my-repo-name-here`) → base `'/my-repo-name-here/'`, site `'https://your-github-username.github.io/my-repo-name-here'`
> - User/org repo (e.g. `your-github-username/your-github-username.github.io`) → base `'/'`, site `'https://your-github-username.github.io'`
>
> Only set `SITE_URL` / `BASE_PATH` as repo variables if you need to **override** the auto-detected value, such as when using a custom domain.

> **Why does GitHub serve the site at `/<repo-name>` instead of `/`?**
>
> GitHub Pages infrastructure serves project repositories at `https://<username>.github.io/<repo-name>/` regardless of any settings you configure. To get a root `/` URL you have two options:
>
> **Option A — Rename the repository** to `<username>.github.io`. GitHub serves that repo name at the root. No other changes needed — auto-detection handles the base path.
>
> **Option B — Add a custom domain** (Settings → Pages → Custom domain). GitHub serves the site at the root of that domain. Set `SITE_URL` to `https://yourdomain.com` and `BASE_PATH` to `/` as repo variables, then push to redeploy.

The workflow uses the built-in `GITHUB_TOKEN` automatically — no extra secret needed for GitHub API access.

**3. Trigger the workflow manually**

The push trigger in `.github/workflows/deploy.yml` is currently commented out. To run a build and deploy now:

1. Go to your repo → **Actions** → **Deploy to GitHub Pages**
2. Click **Run workflow** (top-right of the run list) → **Run workflow**

The workflow builds and deploys your site via the official GitHub Pages Action.

**To enable automatic deploys on push to `main`:** open `.github/workflows/deploy.yml` and uncomment the `push: branches: [main]` block. Every future push to `main` will then rebuild and redeploy automatically.

**4. Custom domain & DNS**

In **Settings → Pages → Custom domain**, enter your domain. GitHub provisions HTTPS via Let's Encrypt automatically.

At your DNS provider:

```
# Apex domain — add all four A records
A    @    185.199.108.153
A    @    185.199.109.153
A    @    185.199.110.153
A    @    185.199.111.153

# www subdomain
CNAME    www    yourusername.github.io.
```

Then update `SITE_URL` to `https://yourname.com` and `BASE_PATH` to `/` in your repo variables and push to redeploy.

---

### GitLab Pages

**1. Set CI/CD variables**

Go to your project → **Settings → CI/CD → Variables** and add:

| Variable       | Required | Value                                                                                                                                                |
| -------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GITHUB_USER`  | Yes      | Your GitHub username (for project image fetching)                                                                                                    |
| `GITHUB_TOKEN` | Yes      | A GitHub personal access token — generate one at GitHub → Settings → Developer settings → Personal access tokens (no scopes needed for public repos) |
| `SITE_URL`     | No       | Override the auto-detected URL — e.g. `https://yourcustomdomain.com`                                                                                 |
| `BASE_PATH`    | No       | Override the auto-detected base path — e.g. `/` after adding a custom domain                                                                         |

> **`BASE_PATH` and `SITE_URL` are auto-detected.** The pipeline reads the built-in `CI_PAGES_URL` variable (always set by the GitLab runner) and derives both values automatically — project pages get `/<repo-name>/`, user/group pages get `/`. Only set them as CI/CD variables to override, e.g. when using a custom domain.

**2. Trigger the pipeline manually**

The `only: - main` trigger in `.gitlab-ci.yml` is currently commented out and the `pages` job is set to `when: manual`. To run a build and deploy now:

1. Go to your project → **CI/CD → Pipelines → Run pipeline** → **Run pipeline**
2. Once the pipeline starts, click the **▶ play button** next to the `pages` job to execute it

GitLab Pages requires the build output in a directory called `public/` — the pipeline handles this automatically.

**To enable automatic deploys on push to `main`:** open `.gitlab-ci.yml`, uncomment the `only: - main` block, and remove the `when: manual` line. Every future push to `main` will then rebuild and redeploy automatically.

**3. Custom domain & DNS**

Go to your project → **Deploy → Pages → New Domain** and enter your domain. GitLab can auto-provision a Let's Encrypt cert, or paste your own.

At your DNS provider:

```
# Apex domain — use ALIAS or ANAME if your provider supports it
ALIAS    @      yournamespace.gitlab.io.

# www subdomain
CNAME    www    yournamespace.gitlab.io.
```

Then update `SITE_URL` in your CI/CD variables to your custom domain and push to redeploy.

> **Note:** Not all DNS providers support ALIAS/ANAME for apex domains. If yours doesn't, use `www` only and redirect the apex at your registrar — or switch to Cloudflare, which supports it.

---

### Gitea / Forgejo / Codeberg

Gitea Actions and Forgejo Actions use the same YAML syntax as GitHub Actions. The workflow at `.gitea/workflows/build.yml` is already included — it builds the site and uploads the output as a downloadable artifact. The push trigger is currently commented out; use the manual trigger while you're getting set up (see step 2 below).

> **No built-in Pages.** Generic Gitea and Forgejo instances do not include a static-site hosting service. After the build artifact is ready, download it and deploy it manually (see [Self-Hosted / VPS](#self-hosted--vps) below). Codeberg is the exception — see below.

**Requirements:** your Gitea/Forgejo instance must have an `act_runner` registered. If your admin hasn't set one up, Actions won't run — fall back to the Docker build path.

**1. Set repository variables and secrets**

Go to your repo → **Settings → Actions → Variables / Secrets** and add:

| Name          | Where      | Value                                                                                                                                                       |
| ------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SITE_URL`    | Variable   | Your full domain, e.g. `https://yourname.com`                                                                                                               |
| `BASE_PATH`   | Variable   | `/` unless your site lives in a subdirectory                                                                                                                |
| `GITHUB_USER` | Variable   | Your GitHub username (for project image fetching)                                                                                                           |
| `GH_TOKEN`    | **Secret** | A GitHub personal access token — use `GH_TOKEN`, **not** `GITHUB_TOKEN` (that name is reserved for the Gitea/Forgejo instance token and cannot be set here) |

**2. Trigger the workflow manually**

The push trigger in `.gitea/workflows/build.yml` is currently commented out. To run a build now:

1. Go to your repo → **Actions** → **Build**
2. Click **Run workflow** → **Run workflow**

The workflow builds the site and uploads `dist/` as a downloadable artifact. Download it from the Actions run page and deploy it to your server.

**To enable automatic builds on push to `main`:** open `.gitea/workflows/build.yml` and uncomment the `push: branches: [main]` block. Every future push to `main` will then trigger a build automatically.

**Codeberg Pages (codeberg.org only)**

Codeberg has a Pages service that serves static files from the `pages` branch of a repository named `pages` under your account.

1. Create a repo named `pages` in your Codeberg account (if you don't have one).
2. After a successful build, push the `dist/` contents to the `pages` branch of that repo. Example using a local terminal after downloading the artifact:

```bash
# Unzip the downloaded artifact, then:
cd site   # the artifact folder
git init
git remote add origin https://codeberg.org/yourusername/pages.git
git checkout -b pages
git add .
git commit -m "Deploy"
git push --force origin pages
```

Your site will be live at `https://yourusername.codeberg.page` within a few minutes.

> **Custom domain on Codeberg Pages:** create a `.domains` file in the root of your `pages` branch containing your domain on the first line. Point a CNAME record at `codeberg.page.` at your DNS provider.

---

### Self-Hosted / VPS

Use Docker to build locally and copy the output to your server. No CI/CD account required.

**Default workflow — build only (90% of the time)**

```bash
docker compose build && docker compose up
# Finished site lands in ./output/ — rsync it wherever you want
rsync -avz ./output/ user@yourserver.com:/var/www/html/
```

Re-run both commands every time you update content.

**Optional — bake into a lean nginx image (~25 MB) and serve directly**

```bash
docker compose --profile serve build && docker compose --profile serve up -d
# Serves on port 80 — no separate file copy needed
```

Use this when you want Docker itself to serve the site on the production machine instead of copying files to a web root.

---

### Cloudflare Pages

No workflow file needed — Cloudflare Pages builds straight from your Git repo. Every push to `main` triggers a build and deploy automatically.

**1. Create a Cloudflare account**

Go to [cloudflare.com](https://cloudflare.com) → **Sign Up** → confirm your email. The free plan covers everything here.

**2. Connect your repo**

From the Cloudflare dashboard:

1. **Workers & Pages** → **Pages** → **Create a project**
2. **Connect to Git** → authorize Cloudflare to access your GitHub or GitLab account
3. Select your repository → **Begin setup**

**3. Configure build settings**

Cloudflare auto-detects Astro. Confirm these values (or enter them if not pre-filled):

| Setting                | Value           |
| ---------------------- | --------------- |
| Framework preset       | Astro           |
| Build command          | `npm run build` |
| Build output directory | `dist`          |
| Root directory         | _(leave blank)_ |

**4. Set environment variables**

Still on the setup screen, open **Environment variables** and add these four — set them for the **Production** environment:

| Variable       | Value                                                                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SITE_URL`     | Your final domain, e.g. `https://yourname.com` — use your `.pages.dev` URL for now if you don't have a domain yet                                    |
| `BASE_PATH`    | `/` (Cloudflare Pages always serves from root)                                                                                                       |
| `GITHUB_USER`  | Your GitHub username (for project image fetching)                                                                                                    |
| `GITHUB_TOKEN` | A GitHub personal access token — generate one at GitHub → Settings → Developer settings → Personal access tokens (no scopes needed for public repos) |

**5. Save and deploy**

Click **Save and Deploy**. Cloudflare builds your site and publishes it at a unique `*.pages.dev` URL — you'll see it on the deployment screen when the build finishes (usually under two minutes).

Visit that URL to confirm everything looks right before adding your custom domain.

**6. Custom domain & DNS**

In your project → **Custom domains** → **Set up a custom domain** → enter your domain (e.g. `yourname.com` or `www.yourname.com`).

_If your domain's nameservers are already on Cloudflare:_ the CNAME record is created automatically. Skip to the update step below.

_If your domain is registered elsewhere:_ add this record at your DNS provider:

```
# www subdomain
CNAME    www    your-project.pages.dev.

# Apex domain — use ALIAS or ANAME if your provider supports it
ALIAS    @      your-project.pages.dev.
```

> **Tip:** Cloudflare offers free DNS hosting with ALIAS support for apex domains. Transfer your nameservers to Cloudflare and both `@` and `www` records work as plain CNAME entries (Cloudflare flattens them automatically).

HTTPS is provisioned automatically via Cloudflare's edge — no Let's Encrypt setup needed.

**7. Update `SITE_URL` and redeploy**

Once your domain resolves correctly, go to your project → **Settings → Environment variables** and update `SITE_URL` to your final domain (e.g. `https://yourname.com`). Then trigger a new deploy from the **Deployments** tab so the canonical URLs and OG tags reflect your real domain.

---

### Netlify

Like Cloudflare Pages, Netlify builds directly from your Git repo — no workflow file needed. Push to `main` and Netlify handles the rest.

**1. Create a Netlify account**

Go to [netlify.com](https://netlify.com) → **Sign up**. You can sign in with GitHub, GitLab, Bitbucket, or email. The free Starter plan covers everything here.

**2. Import your project**

From the Netlify dashboard:

1. **Add new site** → **Import an existing project**
2. Choose your Git provider and authorize Netlify
3. Select your repository

**3. Configure build settings**

Netlify auto-detects Astro. Confirm these values:

| Setting           | Value           |
| ----------------- | --------------- |
| Branch to deploy  | `main`          |
| Build command     | `npm run build` |
| Publish directory | `dist`          |

**4. Set environment variables**

Still on the setup screen, open **Environment variables** and add:

| Key            | Value                                                                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SITE_URL`     | Your final domain, e.g. `https://yourname.com` — use your `.netlify.app` URL for now if you don't have a domain yet                                  |
| `BASE_PATH`    | `/`                                                                                                                                                  |
| `GITHUB_USER`  | Your GitHub username (for project image fetching)                                                                                                    |
| `GITHUB_TOKEN` | A GitHub personal access token — generate one at GitHub → Settings → Developer settings → Personal access tokens (no scopes needed for public repos) |

You can also add or edit variables later at **Site configuration → Environment variables**.

**5. Deploy your site**

Click **Deploy [site-name]**. Netlify builds and publishes your site at a randomly named `*.netlify.app` URL — visible on the deploy screen when it finishes (usually under two minutes).

Visit that URL to confirm everything looks right before adding your custom domain.

**6. Custom domain & DNS**

Go to **Domain management** → **Add custom domain** → enter your domain (e.g. `www.yourname.com`).

Add this record at your DNS provider:

```
# www subdomain
CNAME    www    your-site-name.netlify.app.

# Apex domain — use ALIAS or ANAME if your provider supports it
ALIAS    @      your-site-name.netlify.app.
```

> **No ALIAS support at your registrar?** Netlify offers **Netlify DNS** — you delegate your domain's nameservers to Netlify (found under Domain management → Netlify DNS) and both `@` and `www` resolve through their CDN. Alternatively, redirect the apex to `www` at your registrar and handle everything through the `www` CNAME.

Netlify provisions HTTPS automatically via Let's Encrypt once the DNS record propagates. This typically takes a few minutes to an hour.

**7. Update `SITE_URL` and redeploy**

Once your domain resolves, go to **Site configuration → Environment variables**, update `SITE_URL` to your final domain (e.g. `https://yourname.com`), and trigger a redeploy from the **Deploys** tab so canonical URLs and OG tags reflect your real domain.

---

### Vercel

No workflow file needed — Vercel builds straight from your Git repo. Every push to `main` triggers a build and deploy, and every pull request gets a live preview URL automatically.

> **Free tier note:** Vercel's Hobby plan is free for personal, non-commercial use. For a personal portfolio this is perfectly fine — just be aware of the restriction if this site is also a commercial studio or business page.

**1. Create a Vercel account**

Go to [vercel.com](https://vercel.com) → **Sign Up** → choose **Continue with GitHub** (or GitLab / Bitbucket). Authorizing via Git provider means Vercel can import your repos directly — no separate connection step.

**2. Import your project**

From the Vercel dashboard:

1. **Add New** → **Project**
2. Find your repository in the list → **Import**

**3. Configure build settings**

Vercel auto-detects Astro. Confirm these values in the configuration screen:

| Setting          | Value           |
| ---------------- | --------------- |
| Framework preset | Astro           |
| Build command    | `npm run build` |
| Output directory | `dist`          |
| Install command  | `npm install`   |
| Root directory   | _(leave blank)_ |

**4. Set environment variables**

Still on the setup screen, open **Environment Variables** and add:

| Key            | Value                                                                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SITE_URL`     | Your final domain, e.g. `https://yourname.com` — use your `.vercel.app` URL for now if you don't have a domain yet                                   |
| `BASE_PATH`    | `/` (Vercel always serves from root)                                                                                                                 |
| `GITHUB_USER`  | Your GitHub username (for project image fetching)                                                                                                    |
| `GITHUB_TOKEN` | A GitHub personal access token — generate one at GitHub → Settings → Developer settings → Personal access tokens (no scopes needed for public repos) |

**5. Deploy**

Click **Deploy**. Vercel builds your site and publishes it at a unique `*.vercel.app` URL — shown on the deployment screen when the build finishes (usually under two minutes).

Visit that URL to confirm everything looks right before adding your custom domain.

**6. Custom domain & DNS**

In your project → **Settings → Domains** → enter your domain (e.g. `yourname.com` or `www.yourname.com`) → **Add**.

Vercel will show you the exact records to add. In general:

```
# www subdomain
CNAME    www    cname.vercel-dns.com.

# Apex domain — Vercel provides a stable anycast A record
A        @      76.76.21.21
```

> **Simplest apex setup:** Add both the `A` record above and the `CNAME` for `www`. Vercel automatically redirects one to the other based on which you set as primary in the dashboard.

HTTPS is provisioned automatically via Let's Encrypt once the DNS record propagates — typically a few minutes.

**7. Update `SITE_URL` and redeploy**

Once your domain resolves, go to **Settings → Environment Variables**, update `SITE_URL` to your final domain (e.g. `https://yourname.com`), and trigger a redeploy from the **Deployments** tab so canonical URLs and OG tags reflect your real domain.

---

## GitHub Integration

`src/lib/fetchGitHub.ts` fetches your repos at build time and extracts the first real image from each project's README. Results are cached in `src/data/github-image-cache.json` — it only re-fetches a repo if it has been updated since the last build.

**1.** Create the secrets directory and drop your token in:

```bash
mkdir secrets
echo "ghp_xxxx" > secrets/github_token_password.txt
```

`secrets/` is in `.gitignore` — it will never be committed. `entrypoint.sh` reads it at container startup and exports it as `GITHUB_TOKEN` automatically.

**2.** Set `GITHUB_USER` in `docker-compose.yml` (already in the `environment` block):

```yaml
- GITHUB_USER=your-github-username
```

**3.** In `projects.json`, set `githubRepo` to the repo name for any project you want images pulled from:

```json
{ "githubRepo": "my-cool-project" }
```

- Without a token: 60 unauthenticated GitHub API requests/hour
- With a token: 5,000/hour — generate one at GitHub → Settings → Developer settings → Personal access tokens (no scopes needed for public repos)
- Not using GitHub integration? Leave `githubRepo` as `""` on every project and skip this section

---

## Lib Files

| File | Purpose |
| ---- | ------- |
| `src/lib/fetchGitHub.ts` | Fetches GitHub repos at build time; extracts first README image per project; caches in `github-image-cache.json` |
| `src/lib/fetchBlog.ts` | Parses the blog RSS feed at build time; provides post data to components |
| `src/lib/socialLinks.ts` | Builds the social link array from `personal.json`; filters empty handles; maps Iconify icons |
| `src/lib/icons.ts` | Heroicons SVG path map used for project card fallback icons |

---

## Lib Files

These three utilities run at build time and wire up the dynamic parts of the site.

### `src/lib/fetchGitHub.ts`

Fetches your GitHub repos and extracts cover images from each project's README.

- Caches results to `src/data/github-image-cache.json` — only re-fetches on change
- Reads `README.md` from each repo and finds the first non-badge image
- Converts relative image paths to absolute `raw.githubusercontent.com` URLs
- Gracefully skips private repos or if no token is provided

### `src/lib/socialLinks.ts`

Builds the social link array rendered throughout the site from `personal.json`.

- Supports 17 platforms with Iconify (simple-icons) icon mapping
- Filters out any handles left empty — no broken links
- Default sort order: GitHub → LinkedIn → GitLab → Twitter/X → and more

---

## OWASP ASVS Compliance

This is a statically generated site with no server-side processing, no user accounts, no database, and no dynamic request handling. The [OWASP Application Security Verification Standard (ASVS)](https://owasp.org/www-project-application-security-verification-standard/) is the industry reference for web application security requirements.

**Level 1 — Partial** (opportunistic security baseline)

Controls that require a backend, authentication system, or session management are not applicable. The applicable controls are addressed as follows:

| Control | Category | Status | Notes |
| ------- | -------- | ------ | ----- |
| V2.1 | Authentication | N/A | No user accounts or login |
| V3.1 | Session Management | N/A | No sessions — stateless static output |
| V4.1 | Access Control | N/A | All content is public by design |
| V5.1 | Input Validation | ✅ | No user-supplied parameters reach any query or command |
| V5.3 | Output Encoding | ✅ | Astro's template engine auto-escapes HTML by default; `set:html` usage is flagged by ESLint (`astro/no-set-html-directive`) |
| V7.1 | Error Handling | ✅ | No server-side error pages or stack traces exposed to users |
| V9.1 | Communication Security | ⚠ | HTTPS enforcement is at the web server / CDN layer — not Astro's responsibility for static output. All documented deployment targets (GitHub Pages, GitLab Pages, Cloudflare, Netlify, Vercel) enforce TLS by default. Self-hosted deployments must configure this at the web server. |
| V14.4 | HTTP Security Headers | ⚠ | Security headers must be set at the CDN / web server level, not in static output. See recommended headers below. |

**Reference:** [OWASP ASVS on GitHub](https://github.com/OWASP/ASVS) · [OWASP ASVS Project Page](https://owasp.org/www-project-application-security-verification-standard/)
