<p align="center">
  <img src="icons/icon-256.png" alt="Logo" width="256" height="256">
</p>

# Image Tools

A browser extension that adds image conversion, reverse search, and sharing options to the right-click context menu.

## Features

### Local Image Conversion
Convert web images directly into different formats. Processing happens locally in the browser.
* Supported Formats: PNG, JPEG, PDF, AVIF, BMP, GIF, TIFF, ICO, WebP.
* Advanced Options: Configure compression quality for lossy formats and set filename prefixes or subfolders for downloads.

### Reverse Search
Look up images using search engines.
* Integrations: Google Lens, Lenso.ai, Bing Visual Search, Yandex, Baidu, Sogou, TinEye, Shutterstock.

### Social Sharing
Share images to social platforms or copy them for development use.
* Platforms: WhatsApp, X (Twitter), Windows Native Share, Telegram, Reddit, Signal, Facebook.
* Developer Tools: Copy an image as a Base64 Data URL to the clipboard.

### User Interface
The extension includes a popup and a settings dashboard to configure preferences.
* Drag and drop items to reorder the context menu.
* Light and Dark mode options.
* Option to group all features under a single parent menu.

## Installation (Developer Mode)

This extension uses Manifest V3 and can be loaded into Chromium-based browsers:

1. Clone or download this repository.
2. Open your browser and navigate to the extensions page (chrome://extensions/).
3. Enable Developer mode.
4. Click on Load unpacked.
5. Select the folder containing the manifest.json file.
6. Right-click any image to view the new context menu options.

## Privacy Policy
This extension does not track users or collect data. All image conversions happen locally on the device. Read PRIVACY_POLICY.md for more information.

## License
MIT License.
