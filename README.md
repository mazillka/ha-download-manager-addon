# 📥 HA Download Manager

[![Home Assistant Add-on](https://my.home-assistant.io/badge/addon_repository.svg?repository_url=https%3A%2F%2Fgithub.com%2Fmazillka%2Fha-download-manager-addon)](https://my.home-assistant.io/redirect/addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fmazillka%2Fha-download-manager-addon)
[![Release](https://img.shields.io/github/v/release/mazillka/ha-download-manager-addon?style=flat-square)](https://github.com/mazillka/ha-download-manager-addon/releases)
[![License](https://img.shields.io/github/license/mazillka/ha-download-manager-addon?style=flat-square)](LICENSE)

A powerful, lightweight Download Manager for **Home Assistant**, built on top of Node.js and Playwright. It allows you to search, track, and download media content directly to your Home Assistant storage.

## ✨ Features

- **🌐 Integrated Web UI**: Fully accessible via Home Assistant Ingress.
- **🔍 Advanced Search**: Search for media content directly from the interface.
- **🕒 Watch Later**: Keep track of content you want to download or watch later.
- **🚀 Playwright Integration**: Uses browser automation to handle complex site interactions and direct download links.
- **💾 Local Storage**: Downloads files directly to your `/media` or `/share` folders.
- **📱 Responsive Design**: Built with Vue 3 and Vuetify 4 for a smooth experience on any device.
- **🗄️ Persistent Database**: Uses SQLite to keep track of your downloads and history.

## 🚀 Installation

1. Navigate to your Home Assistant instance.
2. Go to **Settings** > **Add-ons** > **Add-on Store**.
3. Click the three dots in the top right and select **Repositories**.
4. Add the following URL: `https://github.com/mazillka/ha-download-manager-addon`
5. Click **Add**, then close the dialog.
6. Find **HA Download Manager** in the store and click **Install**.
7. Start the add-on.

## ⚙️ Configuration

The add-on can be configured via the **Configuration** tab in the Home Assistant UI.

| Option    | Type   | Description                            |
| :-------- | :----- | :------------------------------------- |
| `baseUrl` | string | The base URL of the media source site. |

## 🛠️ Development

If you want to contribute or run the project locally:

### Prerequisites

- Node.js >= 20
- npm

### Setup

```bash
cd src
npm install
```

### Running

```bash
# Run both frontend and backend in development mode
npm run dev
```

### Building

```bash
# Build both frontend and backend for production
npm run build:prod
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
