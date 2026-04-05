# LCMS Installation Guide

## Requirements

- Node.js 18+

## 1. Clone the repository

```bash
git clone <repo-url> lcms
cd lcms
```

## 2. Install dependencies

```bash
npm install
```

## 3. Start the server

**Development** (Next.js dev server — UI + API on one port):

```bash
npm run dev
```

Runs on http://localhost:3000 by default.

**Production** (builds then starts Next.js):

```bash
./start-prod.sh
```

## 4. Configure CMS settings

Open the CMS in your browser, click the gear icon on the site selector page,
and set the **Base URL** to the public URL of your server (e.g.
`https://example.com`). This is used to show deployment links for each site.
