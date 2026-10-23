# GZW Hideout — Operations Desk

[Open the tracker](https://nl256.github.io/gzw-hideout-tracker/)

A second-monitor companion for Gray Zone Warfare 0.5, with guest saves and optional GitHub sign-in for private cloud progress. GitHub Pages hosts the public application; Supabase stores account saves. Player progress is never committed to the public repository.

Version 1.3 shares optional GitHub sign-in and automatic cloud saves between the website and Windows app, and automatically downloads published catalogue corrections. The 73 bundled illustrations are original identifying artwork, not official game images. Icons and fonts are included for offline use.

The portable Windows edition keeps the same local storage folder and origin as version 1.1, preserving existing PC progress. Sign in with the same GitHub account to share account progress. Guest workspaces remain separate; use Backups to copy old guest operators into an existing account save.

## Using the tracker

- Set completed station levels in **Hideout upgrades**, then choose target tiers. Changing **Built in game** immediately updates and saves progress without a confirmation popup. It does not spend stash materials; Undo can reverse the change.
- Enter quantities in **Supply list** or **All materials**. The same stash is shared across your operator's goals.
- **Personal reserve** adds quantities to keep after building selected upgrades.
- **Complete** can optionally deduct resources; **Built in game** only synchronizes progress.
- Operators have independent inventories, cash, and plans. Progress saves in this browser's local storage.
- Export backups from **Backups**. Imports add new operator copies and preserve existing ones. Local-file, localhost, and hosted origins have separate storage; export/import to transfer between them.
- Undo covers recent changes in the current session. Clearing browser/site data removes local saves; keep a backup.

## Data snapshot

Sourced 22 October 2026 from GZW Hideout and compared with the launch-day community spreadsheet: **15 stations, 36 listed upgrades, 72 physical materials plus cash**. This is the full currently listed community catalogue, not an official exhaustive game database. The Data & sources view includes links and three unresolved discrepancies. Recipe chains for craftable products are outside this version's scope.

Edit `dist/catalog.json` to publish a catalogue correction. `npm run build` validates it, regenerates `dist/catalog.js`, and creates a SHA-256 manifest. The website and desktop check on launch, focus/reconnection, and every five minutes. Updates apply when no form is being edited and are cached for offline use. Invalid/incomplete downloads keep the last working catalogue. Removed identifiers and tiers are retained for compatibility with old progress. Publish new item icons under `dist/assets/items/`; desktop copies download those images as needed with a fallback while offline. Updates contain data only, never executable code. Game patches still require a reviewed catalogue change in this repository. Ventilation follows the source's explicit level 1 → level 3 chain. Do not generate a fictional level 2.

## Local and account saves

Guest mode works without an account. On first sign-in, a new account can copy the device's progress or start fresh. Existing cloud progress downloads on a new device. Guest and signed-in workspaces stay separate; signing out restores the guest workspace.

Account edits save locally immediately and upload after 850 ms of inactivity. Open, visible devices check for changes every five seconds and when returning to the app. Incoming updates wait while a form is being edited. There is no need to click Sync for routine changes. Offline changes retry automatically. If two devices edited the same save independently, sync pauses for a choice and keeps recovery copies. Sign-out attempts to flush pending changes and warns if the draft is still unsynced. Account drafts and recovery copies remain on the device after sign-out. On shared computers, clear this site's data after exporting any needed guest progress.

The earlier private website, this website, and the Windows app use separate guest storage. Signed-in copies share one cloud save. Export a backup from the old private copy and import here to transfer operators.

## Windows app

1. [Download the latest Windows EXE](https://github.com/Nl256/gzw-hideout-tracker/releases/latest/download/GZW-Hideout-Tracker-Windows-x64.exe), or use **Download for Windows** on the website.
2. Double-click `GZW-Hideout-Tracker-Windows-x64.exe` to open the tracker.

You need a **64-bit Windows PC**. Everything the app needs is included in the EXE: no installer, Node.js, Python, extra downloads, or administrator rights are required. Downloading and using guest mode do not require an account. You do not need the source-code ZIP or checksum file to run it.

Local saves work offline. Internet access is needed for GitHub sign-in, cloud sync, and catalogue updates. Sign in with the same GitHub account as the website to share your progress, or stay in guest mode for local-only saves.

Published material and upgrade-list corrections arrive automatically. For new app features, download the latest EXE again; your existing PC progress is kept. [Release notes](https://github.com/Nl256/gzw-hideout-tracker/releases/latest) describe each version.

The app is not code-signed, so Windows may show an unknown-publisher notice.

## Configure optional cloud saves

This copy uses public connection values for **GZW Hideout Tracker** in **Nl256's Org**, project `iptkvqddczvrxuxqoeil`. The database migration has been applied. A Pages deployment and GitHub provider setup are also required for public sign-in.

For a separate installation, create a Supabase project, apply `supabase/migrations/202610220001_progress.sql`, and replace the URL and **publishable** key in `dist/cloud-config.js`. Never put a service-role key, database password, secret key, or GitHub client secret in the frontend or repository. For guest-only mode, use `window.HIDEOUT_CLOUD = {};`.

1. In GitHub **Settings → Developer settings → OAuth Apps**, register **GZW Hideout Tracker**, using the published Pages URL as its homepage. Leave Device Flow disabled.
2. Set the authorization callback to `https://iptkvqddczvrxuxqoeil.supabase.co/auth/v1/callback` (use your own project ref for a separate installation).
3. Generate a client secret and enter the client ID and secret directly in Supabase **Authentication → Sign In / Providers → GitHub**. Enable GitHub. Keep the secret only in provider settings.
4. In Supabase **Authentication → URL Configuration**, set Site URL and the allowed redirect to the exact Pages URL, with repository path and trailing slash. Avoid broad redirect wildcards.
5. Sign in from the live tracker, create a save, and check it on a second device. Sign out to verify the guest save returns.

References: [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [Supabase GitHub sign-in](https://supabase.com/docs/guides/auth/social-sign-in/auth-github).

## Save privacy and integrity

The `hideout_progress` table has row-level security. Anonymous users cannot read or write saves. Signed-in users can read only the row matching their authenticated user ID. Direct client table writes are denied.

The `save_hideout_progress` function derives ownership from `auth.uid()`, never a caller-supplied user ID. It checks the expected revision atomically and rejects stale updates. It limits payload size and structure; the client validates catalogue IDs, tiers, profiles, and quantities. This is a companion tracker, not authoritative game state.

Supabase's advisor flags the authenticated `SECURITY DEFINER` function for review. It is intentional here: a restricted function allows revision-checked writes while direct table writes stay disabled. Its search path is empty, objects are qualified, and `PUBLIC` and `anon` cannot execute it. See [Supabase's review guidance](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

Supabase stores identity and progress, and authorized project administrators can administer that data. Saves use access controls, not end-to-end encryption. Sessions are saved in the browser. The frontend does not request repository access or receive GitHub passwords.

Independent fan tool; not affiliated with MADFINGER Games.
