import { readingCss } from "./typography";

const HTML_CSS = `
  :root { color-scheme: light dark; }
  html { scroll-behavior: auto; }
  body { margin: 0; background: #f5f7f9; }
  .article {
    width: min(100% - 32px, 740px);
    margin: 36px auto;
    padding: 44px 48px 52px;
    background: #fff;
    border: 1px solid #e6ebef;
    border-radius: 16px;
  }
  ${readingCss(".article")}
  @media (max-width: 700px) {
    body { background: #fff; }
    .article { width: 100%; margin: 0; padding: 26px 20px 42px; border: 0; border-radius: 0; }
  }
  @media (prefers-color-scheme: dark) {
    body { background: #0f1419; }
    .article {
      background: #15202b;
      border-color: #253746;
      --reader-text: #e7edf2;
      --reader-muted: #9aabba;
      --reader-border: #334653;
      --reader-link: #77bdf0;
    }
  }
`;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char] ?? char;
  });
}

function cleanFilePart(value: string, maxLength: number): string {
  const safe = value
    .replace(/^\(\d+\)\s*/, "")
    .replace(/[\\/:*?"<>|“”‘’：？／＼｜＊＜＞]/g, " ")
    .split("")
    .filter((char) => char.charCodeAt(0) > 31)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return Array.from(safe)
    .slice(0, maxLength)
    .join("")
    .trim()
    .replace(/[. ]+$/, "");
}

function fileName(title: string, author: string): string {
  const safeTitle = cleanFilePart(title, 72) || "X 文章";
  const safeAuthor = cleanFilePart(author, 24) || "X";
  const random = Array.from(crypto.getRandomValues(new Uint8Array(6)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `${safeTitle}-${safeAuthor}-${random}.html`;
}

function prepareHtmlContent(root: HTMLElement): void {
  if (root.dataset.contentKind === "tweet") {
    root.querySelector("h1")?.remove();
    root.querySelector(".x-pdf-meta")?.remove();
    delete root.dataset.contentKind;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("图片编码失败"));
    reader.readAsDataURL(blob);
  });
}

async function embedImage(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;
  if (
    location.hostname === "mp.weixin.qq.com" &&
    ["mmbiz.qpic.cn", "mmbiz.qlogo.cn"].includes(new URL(url).hostname)
  ) {
    // The extension worker can fetch WeChat CDN images without page CORS restrictions.
    const result = await browser.runtime.sendMessage({ type: "x-pdf:wechat-image", url });
    if (!result?.dataUrl) throw new Error(result?.error || "微信图片下载失败");
    return result.dataUrl;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) throw new Error("响应不是图片");
    return await blobToDataUrl(blob);
  } finally {
    clearTimeout(timer);
  }
}

export async function createStandaloneHtml(
  root: HTMLElement,
): Promise<{ html: string; filename: string }> {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
  const urls = [...new Set(images.map((image) => image.src))];
  const embedded = new Map(
    await Promise.all(
      urls.map(async (url) => {
        try {
          return [url, await embedImage(url)] as const;
        } catch (error) {
          throw new Error(`图片无法嵌入：${url}`, { cause: error });
        }
      }),
    ),
  );
  for (const image of images) {
    image.src = embedded.get(image.src)!;
    image.removeAttribute("loading");
    image.removeAttribute("decoding");
  }
  const title = root.dataset.documentTitle || "X 文章";
  const author = root.dataset.documentAuthor || "X";
  delete root.dataset.documentTitle;
  delete root.dataset.documentAuthor;
  prepareHtmlContent(root);
  root.removeAttribute("id");
  root.className = "article";
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>${escapeHtml(title)}</title>
<style>${HTML_CSS}</style>
</head>
<body>${root.outerHTML}</body>
</html>`;
  return { html, filename: fileName(title, author) };
}

export function downloadHtml(html: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
