# LCMS Installation Guide

## Requirements

- Node.js 18+
- nginx (installed and running)
- Ubuntu (or any Debian-based distro)

## 1. Clone the repository

```bash
git clone <repo-url> lcms
cd lcms
```

## 2. Install dependencies

```bash
npm install
```

## 3. Allow LCMS to deploy to the nginx web root

LCMS copies generated sites to `/var/www/html/<site-slug>/`. By default this
directory is owned by root, so you need to give your user write access via the
`www-data` group.

```bash
# Add your user to the www-data group
sudo usermod -aG www-data $USER

# Give www-data group ownership and write access to the web root
sudo chgrp -R www-data /var/www/html
sudo chmod -R g+rwx /var/www/html

# Set the setgid bit so new files/folders inherit the www-data group
sudo chmod g+s /var/www/html
```

**Log out and back in** (or run `newgrp www-data`) for the group membership to
take effect.

nginx reads files as the `www-data` user. As long as files are world-readable
(the default umask ensures this), nginx will serve them correctly regardless of
who owns them.

## 4. Start the server

**Development** (Next.js dev server — UI + API on one port):

```bash
npm run dev
# or: ./start-api-dev.sh
```

Runs on http://localhost:3000 by default.

**Production** (builds then starts Next.js):

```bash
./start-prod.sh
```

## 5. Configure CMS settings

Open the CMS in your browser, click the gear icon on the site selector page,
and set the **Base URL** to the public URL of your server (e.g.
`https://example.com`). This is used to show deployment links for each site.
