# GZW Hideout — Operations Desk

Plan your Gray Zone Warfare 0.5 hideout upgrades, track your stash, and see what to bring back from your next supply run. Keep it open on a second monitor while you play.

[Open the tracker](https://nl256.github.io/gzw-hideout-tracker/) · [Download for Windows](https://github.com/Nl256/gzw-hideout-tracker/releases/latest/download/GZW-Hideout-Tracker-Windows-x64.exe)

## Get started

**In your browser:** open the tracker and start planning. An account is optional.

**On Windows:** download `GZW-Hideout-Tracker-Windows-x64.exe`, then double-click it to install and open. You need a **64-bit Windows PC**. The installer includes everything and installs only for your Windows account; no extra software or administrator rights are needed. You do not need the source-code ZIP or checksum file.

Local saves work offline in the Windows app. Internet access is needed for sign-in, cloud sync, material-list corrections, and app updates. The app is not code-signed, so Windows may show an unknown-publisher notice.

## Plan your next upgrades

1. Open **Hideout upgrades** and set **Built in game** to the levels you have already completed.
2. Choose the target tiers you want to work toward.
3. Enter the materials you own in **Supply list** or **All materials**, and add your cash in stash.
4. Use the shared supply list to see what you still need. Materials shared by several upgrades are counted together.

Changes save automatically. Updating **Built in game** takes effect immediately without an Update progress popup and leaves your stash quantities alone. Use **Complete upgrade** when you want the option to deduct the materials you used.

**Personal reserve** lets you set aside extra stock. You can also create separate operators, each with their own stash, cash, and upgrade goals. **Undo** reverses recent changes during your current session.

## Save your progress

**Without an account:** your progress saves automatically on the device you're using. Guest saves in different browsers or in the Windows app are separate.

**With a GitHub account:** choose **Sign in / Cloud → Sign in with GitHub**. Use the same account on the website and Windows app to share your progress. Cloud saves are ready to use; there is nothing to configure.

Your changes save on the device immediately and sync automatically when connected. Offline changes sync when you reconnect. If you change the same save independently on two devices, the tracker asks which version to use and keeps recovery copies.

On your first sign-in, a new account can copy your device's progress or start fresh. If you already have a cloud save, it loads automatically. Signing out returns you to your guest progress.

## Keep a backup

Open **Backups** to export your progress to a file. Importing a backup adds copies of its operators and keeps the existing ones.

Use a backup to move guest progress between devices or bring guest operators into an existing cloud account. Clearing browser data or deleting the app's saved data removes local progress, so keep a backup somewhere safe.

## Material lists and updates

The bundled GZW 0.5 list covers **15 stations, 36 listed upgrades, and 72 physical materials plus cash**, with item icons included. It was checked against community sources on **25 October 2026**. Open **Data & sources** for the database, spreadsheet and updated Fandom wiki comparison, including 17 differences in costs, level labels and benefits that still need confirmation. Crafting recipe chains are not included.

The latest review compared all 36 upgrades with the database, spreadsheet and updated Fandom wiki. No confirmed recipe-cost changes were found; unresolved differences are clearly flagged. [Read the latest data review](research/2026-10-25.md).

Published material and upgrade-list corrections download automatically without resetting your progress. The Windows app keeps the last downloaded list available offline. Corrections are reviewed before publication; a game patch may arrive before the tracker is updated.

The Windows app checks for new app versions when it opens, when you return, and periodically while running. When a new release is ready, choose **Update now** or **Later**. The download happens inside the app. Once it finishes, choose **Restart & update** to install it and reopen the tracker. Choosing Later postpones the prompt for a day; **Check for app updates** at the bottom lets you return to it sooner. There is no account requirement.

**Moving from an older portable EXE:** close the old app, install version 1.4.0 or newer once, then use the new desktop shortcut. Your existing PC progress and sign-in are kept in the same app folder. Older portable versions cannot gain an updater automatically, so avoid reopening the old EXE after switching.

If an update cannot download or verify, keep using the current app and try again later. Local progress stays on this PC, including changes waiting for cloud sync. See the [release notes](https://github.com/Nl256/gzw-hideout-tracker/releases/latest) for what changed.

## Stream overlay and floating list

Open **Stream & floating list** to preview the materials needed for your active operator’s goals and personal reserves. Counts follow stash edits, completed upgrades, profile switches, and incoming cloud saves. Account details and operator names are never included in the overlay.

**Floating list:** choose **Open floating list**, drag the title bar, and resize the window. In the Windows app, **Keep on top** lets it sit above other windows. The app remembers its size and position. Use borderless or windowed game mode if exclusive fullscreen covers it. In a browser, keep the original tracker tab open and allow its pop-up.

**OBS on the same PC:** in the Windows app, choose **Enable OBS overlay**, then **Copy OBS link**. In OBS, add a **Browser Source**, leave Local file off, and paste the link into URL. Start at **420 × 900**; increase the height for larger text or more rows. Position and scale it in your scene. The canvas around the list is transparent. No OBS plug-in or additional software is required.

Keep the tracker running or minimized. The connection works locally without signing in and reconnects when the app returns. If you enable it, it stays enabled across app restarts until you turn it off. The link only works on this PC; it is not a public progress-sharing link. A disconnected overlay hides stale quantities and shows a reconnect message.

Adjust text size, background opacity, missing-only filtering, and cash visibility in the tracker. OBS can rotate through longer lists every eight seconds; the floating window shows the whole list with scrolling. Appearance settings stay on this device.

The overlay uses progress entered in the tracker. Automatic imports from an official game API are not available yet.

## Bugs and suggestions

Open **Feedback** in the tracker to **Report a bug**, **Suggest an improvement**, or browse existing conversations. Reports go to [GitHub Issues](https://github.com/Nl256/gzw-hideout-tracker/issues), where the maintainer can reply and track fixes. Anyone can read them; a free GitHub account is needed to post or comment. Posts and attachments are public, so leave out passwords, private account details, and save backups. The tracker only fills in its version, app type, and catalogue date.

## Your privacy


Guest progress stays on your device. Cloud saves are linked to your GitHub account and are not visible to other players or posted in this public repository. Sign-in does not give the tracker access to your GitHub repositories or password.

The cloud service stores your account identity and progress, and authorized service administrators can access that data. Signing out leaves local drafts and recovery copies on the device. On a shared computer, clear the tracker's saved site or app data after exporting any progress you want to keep.

Independent fan tool; not affiliated with MADFINGER Games. Item illustrations are original identifying artwork, not official game images.
