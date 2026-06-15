/**
 * Image Tools - Core Logic
 * Author: Mika Krul
 * License: MIT
 */

const IMAGE_TYPES = [
  { key: "png", label: "Save as PNG", mime: "image/png", suffix: ".png", cat: 'format' },
  { key: "jpeg", label: "Save as JPEG", mime: "image/jpeg", suffix: ".jpg", cat: 'format' },
  { key: "pdf", label: "Save as PDF", mime: "application/pdf", suffix: ".pdf", cat: 'format' },
  { key: "avif", label: "Save as AVIF", mime: "image/avif", suffix: ".avif", cat: 'format' },
  { key: "bmp", label: "Save as BMP", mime: "image/bmp", suffix: ".bmp", cat: 'format' },
  { key: "gif", label: "Save as GIF", mime: "image/gif", suffix: ".gif", cat: 'format' },
  { key: "tiff", label: "Save as TIFF", mime: "image/tiff", suffix: ".tiff", cat: 'format' },
  { key: "ico", label: "Save as ICO", mime: "image/x-icon", suffix: ".ico", cat: 'format' },
  { key: "webp", label: "Save as WebP", mime: "image/webp", suffix: ".webp", cat: 'format' },
];

const SOCIAL_CHANNELS = [
  { key: "shareWhatsApp", label: "Share via WhatsApp", generator: (url) => `whatsapp://send?text=${encodeURIComponent(url)}`, cat: 'social' },
  { key: "shareTwitter", label: "Share on X (Twitter)", generator: (url) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`, cat: 'social' },
  { key: "shareNative", label: "Windows Share", cat: 'social' },
  { key: "shareTelegram", label: "Share on Telegram", generator: (url) => `https://t.me/share/url?url=${encodeURIComponent(url)}`, cat: 'social' },
  { key: "shareReddit", label: "Share on Reddit", generator: (url) => `https://reddit.com/submit?url=${encodeURIComponent(url)}`, cat: 'social' },
  { key: "shareSignal", label: "Share on Signal", generator: (url) => `sgnl://share?text=${encodeURIComponent(url)}`, cat: 'social' },
  { key: "shareFacebook", label: "Share on Facebook", generator: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, cat: 'social' },
  { key: "shareBase64", label: "Copy as Base64", cat: 'social' },
];

const SEARCH_TOOLS = [
  { key: "searchGoogle", label: "Google Lens", generator: (url) => `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(url)}`, cat: 'search' },
  { key: "searchLenso", label: "Lenso.ai", generator: (url) => `https://lenso.ai/search?url=${encodeURIComponent(url)}`, cat: 'search' },
  { key: "searchBing", label: "Bing Visual Search", generator: (url) => `https://www.bing.com/images/search?view=detailv2&iss=sbi&imgurl=${encodeURIComponent(url)}`, cat: 'search' },
  { key: "searchYandex", label: "Yandex Images", generator: (url) => `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(url)}`, cat: 'search' },
  { key: "searchBaidu", label: "Baidu Image", generator: (url) => `https://image.baidu.com/n/pc_searcher?queryImageUrl=${encodeURIComponent(url)}`, cat: 'search' },
  { key: "searchSogou", label: "Sogou Search", generator: (url) => `https://pic.sogou.com/ris?query=${encodeURIComponent(url)}`, cat: 'search' },
  { key: "searchTinEye", label: "TinEye Reverse Search", generator: (url) => `https://tineye.com/search?url=${encodeURIComponent(url)}`, cat: 'search' },
  { key: "searchShutterstock", label: "Shutterstock Search", generator: (url) => `https://www.shutterstock.com/search/image?image_url=${encodeURIComponent(url)}`, cat: 'search' },
];

const ALL_ACTIONS = [...IMAGE_TYPES, ...SEARCH_TOOLS, ...SOCIAL_CHANNELS];

let _menuLock = false;
let _cachedPrefs = null;

async function syncContextActions() {
  if (_menuLock) return;
  _menuLock = true;

  try {
    await new Promise((done) => chrome.contextMenus.removeAll(done));

    _cachedPrefs = await chrome.storage.sync.get({
      png: true, jpeg: true, webp: true, avif: true, bmp: true, gif: true, tiff: false, ico: false, pdf: true,
      shareWhatsApp: true, shareTwitter: false, shareFacebook: false, shareTelegram: false, shareReddit: false, shareSignal: false, shareNative: true, shareBase64: true,
      searchGoogle: true, searchLenso: true, searchBing: false, searchYandex: false,
      searchBaidu: false, searchSogou: false, searchTinEye: false, searchShutterstock: false,
      groupMenu: false, quality: 92, prefix: '', subfolder: '',
      menuOrder: ALL_ACTIONS.map(a => a.key)
    });
    const prefs = _cachedPrefs;

    let parentId = undefined;
    if (prefs.groupMenu) {
      parentId = "parent_root";
      chrome.contextMenus.create({ id: parentId, title: "Image Tools", contexts: ["image"] });
    }

    // Ensure newly added actions are part of menuOrder
    ALL_ACTIONS.forEach(a => {
      if (!prefs.menuOrder.includes(a.key)) {
        prefs.menuOrder.push(a.key);
      }
    });

    let lastCat = null;
    let addedCount = 0;

    prefs.menuOrder.forEach((key, index) => {
      if (prefs[key] === false) return; // Explicitly disabled
      
      const item = ALL_ACTIONS.find(a => a.key === key);
      if (!item) return;

      // Add separator if category changes
      if (lastCat && lastCat !== item.cat && addedCount > 0) {
        chrome.contextMenus.create({
          id: `sep_${index}`,
          parentId,
          type: "separator",
          contexts: ["image"]
        });
      }

      chrome.contextMenus.create({
        id: item.key,
        parentId,
        title: item.label,
        contexts: ["image"]
      });

      lastCat = item.cat;
      addedCount++;
    });

  } finally {
    _menuLock = false;
  }
}

chrome.runtime.onInstalled.addListener((evt) => {
  if (evt.reason === "install") {
    chrome.tabs.create({ url: "welcome.html" });
  }
  syncContextActions();
});

chrome.runtime.setUninstallURL("https://www.survio.com/survey/i/W2O8C8J5F6Z1A6Y4D");

chrome.storage.onChanged.addListener(syncContextActions);
syncContextActions();

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const action = ALL_ACTIONS.find(a => a.key === info.menuItemId);
  if (!action) return;

  if (action.cat === 'social' || action.cat === 'search') {
    if (action.key === 'shareBase64') {
      // Fallthrough to image conversion to get dataUrl
    } else if (action.key === 'shareNative') {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: async (url) => {
            if (navigator.share) {
              try {
                const response = await fetch(url);
                const blob = await response.blob();
                const file = new File([blob], 'image.jpg', { type: blob.type || 'image/jpeg' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                  await navigator.share({ title: 'Image from Image Tools', files: [file] });
                  return;
                }
              } catch (e) {
                console.warn('Could not fetch image as file (CORS/network), falling back to link sharing.', e);
              }
              navigator.share({ title: 'Image from Image Tools', url: url }).catch(e => console.log('Share failed:', e));
            } else {
              alert('Windows Share (Web Share API) is not supported in this context.');
            }
          },
          args: [info.srcUrl]
        });
      } catch (err) {
        console.error("Could not inject share script", err);
      }
      return;
    } else {
      chrome.tabs.create({ url: action.generator(info.srcUrl) });
      return;
    }
  }

  // Handle Image Conversion
  try {
    const prefs = _cachedPrefs || await chrome.storage.sync.get({ quality: 92, prefix: '', subfolder: '' });
    
    const rawData = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [info.srcUrl],
      func: (u) => new Promise(r => {
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.onload = () => {
          const c = document.createElement("canvas");
          c.width = i.naturalWidth; c.height = i.naturalHeight;
          const x = c.getContext("2d");
          x.drawImage(i, 0, 0);
          r(c.toDataURL("image/png"));
        };
        i.onerror = () => fetch(u).then(res => res.blob()).then(b => {
          const f = new FileReader();
          f.onloadend = () => r(f.result);
          f.readAsDataURL(b);
        }).catch(() => r(null));
        i.src = u;
      })
    });

    const dataUrl = rawData?.[0]?.result;
    if (!dataUrl) return;

    if (action.key === "shareBase64") {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: async (b64) => {
            try {
              // Try clipboard API first
              if (navigator.clipboard) {
                await navigator.clipboard.writeText(b64);
              } else {
                // Fallback for older contexts
                const ta = document.createElement("textarea");
                ta.value = b64;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand("copy");
                document.body.removeChild(ta);
              }
              // Optional visual feedback via small banner in page
              const div = document.createElement('div');
              div.innerText = 'Base64 copied!';
              div.style = 'position:fixed;top:20px;right:20px;background:#25D366;color:#fff;padding:10px 15px;border-radius:4px;z-index:999999;font-family:sans-serif;font-size:14px;box-shadow:0 2px 10px rgba(0,0,0,0.2)';
              document.body.appendChild(div);
              setTimeout(() => div.remove(), 2000);
            } catch (err) {
              console.error("Failed to copy Base64", err);
            }
          },
          args: [dataUrl]
        });
      } catch (err) {}
      return;
    }

    const blob = await (await fetch(dataUrl)).blob();
    const bit = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bit.width, bit.height);
    const ctx = canvas.getContext("2d");

    if (["jpeg", "bmp", "gif", "pdf"].includes(action.key)) {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(bit, 0, 0);
    bit.close();

    let exported;
    if (action.key === "pdf") {
      const jpegBlob = await canvas.convertToBlob({ type: "image/jpeg", quality: prefs.quality / 100 });
      const buffer = await jpegBlob.arrayBuffer();
      const jpegData = new Uint8Array(buffer);
      
      let pdfText = "%PDF-1.4\n";
      const objOffsets = [];
      function addObj(content) {
        objOffsets.push(pdfText.length);
        pdfText += `${objOffsets.length} 0 obj\n${content}\nendobj\n`;
      }
      
      addObj("<< /Type /Catalog /Pages 2 0 R >>");
      addObj("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
      addObj(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${canvas.width} ${canvas.height}] /Resources << /XObject << /I1 4 0 R >> >> /Contents 5 0 R >>`);
      
      const textEncoder = new TextEncoder();
      const parts = [];
      
      objOffsets.push(pdfText.length);
      pdfText += `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegData.length} >>\nstream\n`;
      
      parts.push(textEncoder.encode(pdfText));
      parts.push(jpegData);
      parts.push(textEncoder.encode("\nendstream\nendobj\n"));
      
      let currentLen = parts[0].length + parts[1].length + parts[2].length;
      const contentStream = `q\n${canvas.width} 0 0 ${canvas.height} 0 0 cm\n/I1 Do\nQ`;
      const contentObj = `5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`;
      
      objOffsets.push(currentLen);
      const contentObjEncoded = textEncoder.encode(contentObj);
      parts.push(contentObjEncoded);
      currentLen += contentObjEncoded.length;
      
      let xref = `xref\n0 6\n0000000000 65535 f \n`;
      for(let i=0; i<5; i++){
        xref += objOffsets[i].toString().padStart(10, '0') + " 00000 n \n";
      }
      xref += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${currentLen}\n%%EOF`;
      parts.push(textEncoder.encode(xref));
      
      exported = new Blob(parts, { type: "application/pdf" });
    } else {
      let mime = action.mime;
      if (["image/gif", "image/bmp", "image/tiff", "image/x-icon"].includes(mime)) mime = "image/png";

      exported = await canvas.convertToBlob({
        type: mime,
        quality: ["jpeg", "webp", "avif"].includes(action.key) ? (prefs.quality / 100) : undefined
      });
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      let name = "image";
      try {
        const p = new URL(info.srcUrl).pathname;
        const s = p.split("/").pop();
        if (s) name = s.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_\-]/g, "_") || "image";
      } catch {}
      
      let finalName = (prefs.prefix || "") + name + action.suffix;
      if (prefs.subfolder) {
        finalName = prefs.subfolder.replace(/\/$/, "") + "/" + finalName;
      }
      
      chrome.downloads.download({ url: reader.result, filename: finalName, saveAs: true });
    };
    reader.readAsDataURL(exported);
  } catch (e) {
    console.error("Image Tools process failed:", e);
  }
});
