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
let _pendingSync = false;
let _cachedPrefs = null;

// Debug-helper voor gestructureerde logs
function logDebug(tag, bericht, data = null) {
  const tijd = new Date().toLocaleTimeString();
  if (data) {
    console.log(`[${tijd}] [DEBUG - ${tag}] ${bericht}`, data);
  } else {
    console.log(`[${tijd}] [DEBUG - ${tag}] ${bericht}`);
  }
}

async function syncContextActions() {
  logDebug("MENU_SYNC", "Synchronisatie van contextmenu gestart...");
  if (_menuLock) {
    logDebug("MENU_SYNC", "Menu is momenteel vergrendeld. Synchronisatie in de wachtrij geplaatst.");
    _pendingSync = true;
    return;
  }
  _menuLock = true;

  try {
    logDebug("MENU_SYNC", "Bestaande contextmenu's verwijderen...");
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
    logDebug("MENU_SYNC", "Gebruikersvoorkeuren geladen uit opslag:", prefs);

    let parentId = undefined;
    if (prefs.groupMenu) {
      parentId = "parent_root";
      logDebug("MENU_SYNC", "Hoofdmenu 'Image Tools' wordt aangemaakt (Gegroepeerd menu = actief).");
      chrome.contextMenus.create({ id: parentId, title: "Image Tools", contexts: ["image"] });
    } else {
      logDebug("MENU_SYNC", "Gegroepeerd menu is uitgeschakeld. Items worden direct in het root-menu geplaatst.");
    }

    // Zorg ervoor dat nieuw toegevoegde acties deel uitmaken van menuOrder
    ALL_ACTIONS.forEach(a => {
      if (!prefs.menuOrder.includes(a.key)) {
        prefs.menuOrder.push(a.key);
      }
    });

    let lastCat = null;
    let addedCount = 0;

    prefs.menuOrder.forEach((key, index) => {
      if (prefs[key] === false) {
        logDebug("MENU_SYNC", `Item is uitgeschakeld door gebruiker: ${key}`);
        return; 
      }

      const item = ALL_ACTIONS.find(a => a.key === key);
      if (!item) return;

      // Voeg scheidingslijn toe als de categorie verandert
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
    logDebug("MENU_SYNC", `Synchronisatie voltooid. Totaal aantal items toegevoegd: ${addedCount}`);

  } catch (err) {
    console.error("[MENU_SYNC] Fout tijdens synchronisatie van contextmenu:", err);
  } finally {
    _menuLock = false;
    if (_pendingSync) {
      logDebug("MENU_SYNC", "Uitvoeren van in de wachtrij geplaatste synchronisatie...");
      _pendingSync = false;
      syncContextActions();
    }
  }
}

chrome.runtime.onInstalled.addListener((evt) => {
  logDebug("EXT_EVENT", `Extensie geïnstalleerd of bijgewerkt. Reden: ${evt.reason}`);
  if (evt.reason === "install") {
    chrome.tabs.create({ url: "welcome.html" });
  }
  syncContextActions();
});

chrome.runtime.setUninstallURL("https://www.survio.com/survey/i/W2O8C8J5F6Z1A6Y4D");

chrome.storage.onChanged.addListener((changes, area) => {
  logDebug("EXT_EVENT", `Instellingen gewijzigd in '${area}' opslag:`, changes);
  syncContextActions();
});

syncContextActions();

// ------------------------------------------------------------
// Helper: build the scripting target
// ------------------------------------------------------------
function buildTarget(tab, info) {
  const target = { tabId: tab.id };
  if (info.frameId && info.frameId > 0) {
    target.frameIds = [info.frameId];
  }
  return target;
}

// ------------------------------------------------------------
// Content Script Function: Fetches image safely from page context
// ------------------------------------------------------------
function fetchImageAsDataUrl(srcUrl) {
  console.log(`[CONTENT_SCRIPT] Poging om afbeelding te laden via canvas: ${srcUrl}`);
  
  if (srcUrl.startsWith('data:')) {
    console.log('[CONTENT_SCRIPT] Bron-URL is al een Data URL. Direct retourneren.');
    return Promise.resolve(srcUrl);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        console.log(`[CONTENT_SCRIPT] Canvas succesvol getekend (${img.naturalWidth}x${img.naturalHeight}). Converteren naar Data URL...`);
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        console.warn(`[CONTENT_SCRIPT] Canvas conversie mislukt door CORS, overschakelen op fallback fetch...`, e);
        fallback();
      }
    };
    const fallback = () => {
      console.log(`[CONTENT_SCRIPT] Starten van fallback fetch voor: ${srcUrl}`);
      fetch(srcUrl)
        .then((r) => r.blob())
        .then((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            console.log(`[CONTENT_SCRIPT] Fallback FileReader gereed. Data URL gegenereerd.`);
            resolve(reader.result);
          };
          reader.readAsDataURL(blob);
        })
        .catch((err) => {
          console.error(`[CONTENT_SCRIPT] Fallback fetch volledig mislukt:`, err);
          resolve(null);
        });
    };
    img.onerror = (err) => {
      console.warn(`[CONTENT_SCRIPT] Image.onload gaf een foutmelding, starten fallback.`, err);
      fallback();
    };
    img.src = srcUrl;
  });
}

// ------------------------------------------------------------
// Main Click Handler
// ------------------------------------------------------------
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  logDebug("CLICK_HANDLER", `Gebruiker klikte op menu-item: ${info.menuItemId}`, { srcUrl: info.srcUrl, tabId: tab.id });
  
  const action = ALL_ACTIONS.find(a => a.key === info.menuItemId);
  if (!action) {
    logDebug("CLICK_HANDLER", `Geen actie gevonden voor menu-item ID: ${info.menuItemId}`);
    return;
  }

  // Afhandelen van Sociale & Zoekacties
  if (action.cat === 'social' || action.cat === 'search') {
    if (action.key === 'shareBase64') {
      logDebug("CLICK_HANDLER", "Actie is 'shareBase64'. Doorgaan naar conversie-flow.");
      // Gaat door naar de afbeeldingsconversie hieronder om dataUrl te verkrijgen
    } else if (action.key === 'shareNative') {
      logDebug("CLICK_HANDLER", "Starten van Windows Share (Web Share API)...");
      try {
        await chrome.scripting.executeScript({
          target: buildTarget(tab, info),
          func: async (url) => {
            console.log(`[SHARE_NATIVE] Starten van delen voor: ${url}`);
            if (navigator.share) {
              try {
                const response = await fetch(url);
                const blob = await response.blob();
                const file = new File([blob], 'image.jpg', { type: blob.type || 'image/jpeg' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                  await navigator.share({ title: 'Image from Image Tools', files: [file] });
                  console.log("[SHARE_NATIVE] Succesvol gedeeld als bestand.");
                  return;
                }
              } catch (e) {
                console.warn('[SHARE_NATIVE] Kon afbeelding niet ophalen als bestand (CORS/netwerk), terugvallen op link delen.', e);
              }
              navigator.share({ title: 'Image from Image Tools', url: url })
                .then(() => console.log('[SHARE_NATIVE] Link succesvol gedeeld.'))
                .catch(e => console.log('[SHARE_NATIVE] Delen mislukt:', e));
            } else {
              alert('Windows Share (Web Share API) wordt niet ondersteund in deze context.');
            }
          },
          args: [info.srcUrl]
        });
      } catch (err) {
        console.error("[SHARE_NATIVE] Fout tijdens injectie van share-script:", err);
      }
      return;
    } else {
      const targetUrl = action.generator(info.srcUrl);
      logDebug("CLICK_HANDLER", `Openen van externe URL voor sociale share of zoekmachine: ${targetUrl}`);
      chrome.tabs.create({ url: targetUrl });
      return;
    }
  }

  // -------------------------------------------------------
  // Afhandelen van Afbeeldingsconversie & Download
  // -------------------------------------------------------
  try {
    const prefs = _cachedPrefs || await chrome.storage.sync.get({ quality: 92, prefix: '', subfolder: '' });
    logDebug("CONVERSION", "Voorkeuren geladen voor conversie:", prefs);

    let dataUrl = null;

    // Stap 1: Haal de afbeelding op als Data URL vanaf de pagina
    logDebug("CONVERSION", "Stap 1: Script injecteren om afbeelding op te halen...");
    try {
      const results = await chrome.scripting.executeScript({
        target: buildTarget(tab, info),
        args: [info.srcUrl],
        func: fetchImageAsDataUrl,
      });
      dataUrl = results?.[0]?.result;
    } catch (injectErr) {
      logDebug("CONVERSION", "Scriptinjectie is mislukt of geblokkeerd door browser-restricties.", injectErr);
    }

    // Fallback: Als pagina-injectie faalt of null geeft, download de afbeelding direct vanuit de background service worker
    if (!dataUrl) {
      logDebug("CONVERSION", "Pagina-injectie leverde geen resultaat op. Poging tot directe fetch vanuit de background service worker...");
      if (info.srcUrl && info.srcUrl.startsWith('data:')) {
        dataUrl = info.srcUrl;
        logDebug("CONVERSION", "Bron-URL was al een Data URL. Overgenomen zonder netwerkverzoek.");
      } else {
        try {
          const response = await fetch(info.srcUrl);
          if (response.ok) {
            const blob = await response.blob();
            dataUrl = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            logDebug("CONVERSION", `Directe fetch geslaagd! Data URL gegenereerd (lengte: ${dataUrl.length}).`);
          } else {
            logDebug("CONVERSION", `Directe fetch mislukt met HTTP statuscode: ${response.status}`);
          }
        } catch (bgFetchErr) {
          logDebug("CONVERSION", "Directe fetch in background service worker is mislukt door CORS- of netwerkfout.", bgFetchErr);
        }
      }
    }

    if (!dataUrl) {
      console.error("[CONVERSION] Fout: Kon de afbeelding met geen enkele methode ophalen.");
      return;
    }
    logDebug("CONVERSION", `Afbeelding succesvol ontvangen. Lengte data URL: ${dataUrl.length} tekens.`);

    // Stap 2: Afhandelen van "Kopieer als Base64"
    if (action.key === "shareBase64") {
      logDebug("CONVERSION", "Stap 2: Uitvoeren van Base64 kopieer-actie...");
      try {
        await chrome.scripting.executeScript({
          target: buildTarget(tab, info),
          func: async (b64) => {
            try {
              if (navigator.clipboard) {
                await navigator.clipboard.writeText(b64);
              } else {
                const ta = document.createElement("textarea");
                ta.value = b64;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand("copy");
                document.body.removeChild(ta);
              }
              const div = document.createElement('div');
              div.innerText = 'Base64 gekopieerd!';
              div.style = 'position:fixed;top:20px;right:20px;background:#25D366;color:#fff;padding:10px 15px;border-radius:4px;z-index:999999;font-family:sans-serif;font-size:14px;box-shadow:0 2px 10px rgba(0,0,0,0.2)';
              document.body.appendChild(div);
              setTimeout(() => div.remove(), 2000);
              console.log("[BASE64_COPY] Base64 succesvol naar klembord gekopieerd.");
            } catch (err) {
              console.error("[BASE64_COPY] Fout bij het kopiëren naar klembord:", err);
            }
          },
          args: [dataUrl]
        });
      } catch (err) {
        console.error("[CONVERSION] shareBase64 injectie mislukt:", err);
      }
      return;
    }

    // Stap 3: Data URL converteren naar Blob (Betrouwbare fetch-methode)
    logDebug("CONVERSION", "Stap 3: Data URL converteren naar Blob...");
    const fetchResponse = await fetch(dataUrl);
    const sourceBlob = await fetchResponse.blob();
    logDebug("CONVERSION", `Blob succesvol gegenereerd. Grootte: ${sourceBlob.size} bytes, Type: ${sourceBlob.type}`);

    // Stap 4: Tekenen op OffscreenCanvas voor opmaak
    logDebug("CONVERSION", "Stap 4: Afbeelding inladen in ImageBitmap en OffscreenCanvas voorbereiden...");
    const bit = await createImageBitmap(sourceBlob);
    const canvas = new OffscreenCanvas(bit.width, bit.height);
    const ctx = canvas.getContext("2d");

    // Witte achtergrond toevoegen voor formaten die geen transparantie ondersteunen
    if (["jpeg", "bmp", "gif", "pdf"].includes(action.key)) {
      logDebug("CONVERSION", `Formaat ${action.key} vereist een ondoorzichtige achtergrond. Witte achtergrond wordt getekend.`);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(bit, 0, 0);
    bit.close();

    let exportedBlob;

    // Stap 5: Formaatconversie
    logDebug("CONVERSION", `Stap 5: Converteren naar doelformaat: ${action.key}`);
    if (action.key === "pdf") {
      logDebug("CONVERSION", "PDF-generatie gestart...");
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
      const pdfParts = [];

      objOffsets.push(pdfText.length);
      pdfText += `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegData.length} >>\nstream\n`;

      pdfParts.push(textEncoder.encode(pdfText));
      pdfParts.push(jpegData);
      pdfParts.push(textEncoder.encode("\nendstream\nendobj\n"));

      let currentLen = pdfParts[0].length + pdfParts[1].length + pdfParts[2].length;
      const contentStream = `q\n${canvas.width} 0 0 ${canvas.height} 0 0 cm\n/I1 Do\nQ`;
      const contentObj = `5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`;

      objOffsets.push(currentLen);
      const contentObjEncoded = textEncoder.encode(contentObj);
      pdfParts.push(contentObjEncoded);
      currentLen += contentObjEncoded.length;

      let xref = `xref\n0 6\n0000000000 65535 f \n`;
      for (let i = 0; i < 5; i++) {
        xref += objOffsets[i].toString().padStart(10, '0') + " 00000 n \n";
      }
      xref += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${currentLen}\n%%EOF`;
      pdfParts.push(textEncoder.encode(xref));

      exportedBlob = new Blob(pdfParts, { type: "application/pdf" });
      logDebug("CONVERSION", `PDF Blob gegenereerd. Grootte: ${exportedBlob.size} bytes`);
    } else {
      let mime = action.mime;
      if (["image/gif", "image/bmp", "image/tiff", "image/x-icon"].includes(mime)) {
        logDebug("CONVERSION", `Doelmime '${mime}' wordt niet ondersteund door OffscreenCanvas. Terugvallen op image/png.`);
        mime = "image/png";
      }

      const qualitySetting = ["jpeg", "webp", "avif"].includes(action.key) ? (prefs.quality / 100) : undefined;
      logDebug("CONVERSION", `Bestand exporteren via canvas.convertToBlob met mime '${mime}' en kwaliteit: ${qualitySetting}`);

      exportedBlob = await canvas.convertToBlob({
        type: mime,
        quality: qualitySetting
      });
      logDebug("CONVERSION", `Conversie succesvol afgerond. Geëxporteerde blob grootte: ${exportedBlob.size} bytes, type: ${exportedBlob.type}`);
    }

    // Stap 6: Filenaam opbouwen
    logDebug("CONVERSION", "Stap 6: Filenaam genereren...");
    let name = "image";
    try {
      const p = new URL(info.srcUrl).pathname;
      const s = p.split("/").pop();
      if (s) {
        name = s.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_\-]/g, "_") || "image";
      }
    } catch { 
      logDebug("CONVERSION", "Kon geen geldige filenaam herleiden uit bron-URL, teruggevallen op 'image'.");
    }

    let actualSuffix = action.suffix;
    if (exportedBlob.type === "image/png" && action.suffix !== ".png" && action.cat === "format") {
      logDebug("CONVERSION", "Bestandstype is door fallback gewijzigd naar PNG. Extensie wordt gecorrigeerd naar .png");
      actualSuffix = ".png";
    }

    let finalName = (prefs.prefix || "") + name + actualSuffix;
    if (prefs.subfolder) {
      finalName = prefs.subfolder.replace(/\/$/, "") + "/" + finalName;
    }
    logDebug("CONVERSION", `Gegenereerde filenaam: ${finalName}`);

    // Stap 7: MV3 Veilige Downloadmethode via FileReader & chrome.downloads
    logDebug("CONVERSION", "Stap 7: Bestand omzetten naar Data URL en download starten via chrome.downloads...");
    const reader = new FileReader();
    reader.readAsDataURL(exportedBlob);
    
    reader.onloadend = async () => {
      const finalDownloadUrl = reader.result;
      logDebug("CONVERSION", `Download-URL (Base64) gereed. Lengte: ${finalDownloadUrl.length} tekens.`);
      try {
        await chrome.downloads.download({
          url: finalDownloadUrl,
          filename: finalName,
          saveAs: true
        });
        logDebug("CONVERSION", `Download met succes geïnitieerd voor: ${finalName}`);
      } catch (err) {
        console.error("[CONVERSION] Fout bij starten van download via chrome.downloads:", err);
      }
    };

  } catch (e) {
    console.error("[CONVERSION] Kritieke fout tijdens het Image Tools conversieproces:", e);
  }
});