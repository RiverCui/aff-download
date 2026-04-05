# aff-download

Download novels from [asianfanfics.com](https://www.asianfanfics.com) as EPUB or TXT files.

Uses Playwright (real Chrome browser) to bypass Cloudflare protection and handle login automatically.

## Prerequisites

- Node.js 18+
- Google Chrome installed on your system
- An AsianFanfics account

## Installation

```bash
git clone https://github.com/your-username/aff-download.git
cd aff-download
npm install
npx playwright install chromium
```

## Configuration

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env
```

```env
AFF_USERNAME=your_username
AFF_PASSWORD=your_password
```

## Usage

```bash
# Download a story as EPUB (default)
npm start -- https://www.asianfanfics.com/story/view/123456

# Download as TXT
npm start -- -f txt https://www.asianfanfics.com/story/view/123456

# Download multiple stories
npm start -- https://www.asianfanfics.com/story/view/111 https://www.asianfanfics.com/story/view/222

# Clear browser data (if login issues occur)
npm start -- --clean https://www.asianfanfics.com/story/view/123456
```

Downloaded files are saved to `downloads/<story-name>/`.

## How It Works

1. Launches Chrome via Playwright to pass Cloudflare's bot detection
2. Logs into AsianFanfics with your credentials
3. Fetches the story page and extracts chapter list
4. Downloads each chapter with a delay to avoid rate limiting
5. Generates EPUB or TXT file

Browser cookies are persisted in `.browser-data/` so subsequent runs skip Cloudflare and login.

## Troubleshooting

**Login fails or gets redirected to logout:**
```bash
npm start -- --clean <url>
```

**Cloudflare challenge won't pass:**
A Chrome window will open — manually click the verification checkbox if prompted. This only needs to happen once; cookies are saved for future runs.

**Empty chapters in output:**
Some chapters may fail to load on the first attempt. The tool retries automatically. If chapters are still empty, try running again.

## Disclaimer

This tool is for personal use only. Please respect the authors' rights and AsianFanfics' terms of service.

## License

MIT
