<p>
  <img src="docs/icon.png" width="48" />
</p>

# Unblurry

A privacy-focused desktop app that captures your window activity, collects voluntary feeling logs, and uses AI to generate behavioral analysis reports, helping you understand not just *what* you did, but *why*.

**[Download](https://www.unblurry.app)** — available for macOS, Windows and Linux.

## How It Works

1. **Set your intent.** Tell the app what you plan to work on. The AI refines vague goals into specific ones.
2. **Work normally.** The app silently tracks which windows you use (app name + window title only). No screenshots, no keylogging.
3. **Log feelings (optional).** A floating button lets you jot down how you're feeling at any moment. This gives the AI context to interpret *why* you switched tasks.
4. **Get your report.** When you end the session, the AI analyzes your activity against your stated intent and produces a behavioral report with patterns, evidence, and actionable suggestions.

## Privacy

- All data is stored **locally** in a SQLite database on your machine.
- Nothing is sent to a server. AI calls go directly from your machine to the Google Gemini API using **your own API key**.
- Only window titles and app names are captured. No screenshots, keyboard input, or screen recording.

## Tech Stack

- **Electron** + **React** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **SQLite** via better-sqlite3
- **Google Gemini API** (BYOK, Bring Your Own Key)

## Platform Notes

- **macOS:** On first launch, macOS will ask for **Accessibility** permission. This is required to read active window titles. macOS may also block the app on first launch — go to **System Settings → Privacy & Security** and click **Open Anyway**.
- **Windows:** Windows may show a SmartScreen warning. Click **More info**, then **Run anyway**.
- **Linux:** Distributed as an AppImage (x64).
