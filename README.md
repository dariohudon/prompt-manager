## Tech Stack

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![PM2](https://img.shields.io/badge/PM2-2B037A?style=for-the-badge&logo=pm2&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)

# Prompt Manager

A Chrome extension to store, organize, and auto-fill your most-used AI prompts — organized by client folders — directly into Claude, Gemini, and ChatGPT.

## Features

- **Client folders** — Group prompts by client or project for easy navigation
- **One-click insert** — Inject any saved prompt into the active AI chat tab with a single click
- **Search** — Quickly find prompts across all folders by title or content
- **Full CRUD** — Create, edit, and delete both folders and prompts
- **Sample data on install** — Pre-loaded with example prompts so you can get started immediately

## Supported Sites

| Platform | URL |
|---|---|
| Claude | `claude.ai` |
| Gemini | `gemini.google.com` |
| ChatGPT | `chatgpt.com` |

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked** and select the `prompt-manager` folder
5. The extension icon will appear in your toolbar

## Usage

1. Click the **Prompt Manager** icon in your Chrome toolbar
2. Create a **client folder** with the `+` button
3. Open the folder and add your prompts (title + text)
4. Navigate to Claude, Gemini, or ChatGPT in another tab
5. Open the extension and click **Use Prompt** — the text is inserted into the chat input automatically

## Project Structure

```
prompt-manager/
├── manifest.json          # Extension manifest (MV3)
├── background/
│   └── background.js      # Service worker — seeds sample data on install
├── content/
│   └── content.js         # Content script — handles prompt injection per site
├── popup/
│   ├── popup.html         # Extension popup UI
│   ├── popup.css          # Popup styles
│   └── popup.js           # Popup logic (folder/prompt CRUD, search, routing)
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Permissions

| Permission | Purpose |
|---|---|
| `storage` | Persist folders and prompts locally via `chrome.storage.local` |
| `activeTab` | Read the URL of the current tab to detect supported AI sites |
| `scripting` | Inject the content script on-demand if not already loaded |

All data is stored locally in your browser — nothing is sent to any server.

## Tech Stack

- Vanilla JavaScript (no frameworks)
- Chrome Extension Manifest V3
- `chrome.storage.local` for persistence
