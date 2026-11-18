import {
  createLongPageStyle,
  createPrintRoot,
  isSupportedPage,
  loadPrintImages,
  PRINT_CSS,
} from "./print";
import { createStandaloneHtml, downloadHtml } from "./html";
import { isWechatPage } from "./extract";

export default defineContentScript({
  matches: [
    "*://twitter.com/*",
    "*://*.twitter.com/*",
    "*://x.com/*",
    "*://*.x.com/*",
    "https://mp.weixin.qq.com/*",
  ],
  main() {
    const STYLE_ID = "x-pdf-print-style";
    const HTML_BUTTON_ID = "x-pdf-html-fab";
    const MESSAGE_SAVE_PAGE = "x-pdf:save-page";
    const MESSAGE_SAVE_HTML = "x-pdf:save-html";
    const buttonCss = `
      #${HTML_BUTTON_ID} {
        position: fixed;
        right: 23px;
        bottom: ${isWechatPage() ? "32px" : "150px"};
        z-index: 99999;
        display: grid;
        place-items: center;
        width: 48px;
        height: 48px;
        padding: 0;
        border: none;
        border-radius: 50%;
        background: #1d9bf0;
        color: #fff;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }
      #${HTML_BUTTON_ID}:hover { background: #1a8cd8; }
      #${HTML_BUTTON_ID}:disabled { cursor: wait; opacity: 0.75; }
      #${HTML_BUTTON_ID}[data-state="error"] { background: #d92d20; }
      #${HTML_BUTTON_ID} svg { width: 23px; height: 23px; pointer-events: none; }
      @media (max-width: 700px) {
        #${HTML_BUTTON_ID} { right: 20px; }
      }
    `;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = PRINT_CSS + buttonCss;
    document.head.append(style);

    let htmlButton: HTMLButtonElement | null = null;
    let printRoot: HTMLDivElement | null = null;
    let longStyle: HTMLStyleElement | null = null;
    let htmlSaving = false;
    let notice: HTMLDivElement | null = null;

    function showError(message: string): void {
      notice?.remove();
      notice = document.createElement("div");
      notice.setAttribute("role", "alert");
      notice.textContent = message;
      notice.style.cssText = `position:fixed;right:24px;bottom:${isWechatPage() ? 92 : 210}px;max-width:320px;padding:14px 18px;background:#fff;color:#b42318;border:1px solid #fda29b;border-radius:12px;box-shadow:0 2px 10px #0002;z-index:100000;font:14px/1.6 sans-serif`;
      document.body.append(notice);
      const current = notice;
      window.setTimeout(() => current.remove(), 12000);
    }

    function setHtmlStatus(label: string, state = "idle"): void {
      if (!htmlButton) return;
      htmlButton.title = label;
      htmlButton.setAttribute("aria-label", label);
      htmlButton.dataset.state = state;
      htmlButton.disabled = state === "loading";
    }

    function reset(): void {
      printRoot?.remove();
      printRoot = null;
      longStyle?.remove();
      longStyle = null;
    }

    async function saveHtml(): Promise<boolean> {
      if (htmlSaving || !isSupportedPage()) return false;
      htmlSaving = true;
      notice?.remove();
      setHtmlStatus("正在读取正文…", "loading");
      try {
        let root = createPrintRoot();
        for (let attempt = 0; !root && attempt < 10; attempt++) {
          await new Promise((resolve) => window.setTimeout(resolve, 500));
          root = createPrintRoot();
        }
        if (!root)
          throw new Error(
            "未识别到完整正文，请等待文章加载完成后重试；若仍失败，请保留当前页面以便检查。",
          );
        setHtmlStatus("正在嵌入图片…", "loading");
        const file = await createStandaloneHtml(root);
        downloadHtml(file.html, file.filename);
        setHtmlStatus("已开始下载 HTML");
        return true;
      } catch (error) {
        console.error("[x-pdf] HTML 导出失败", error);
        setHtmlStatus("HTML 导出失败", "error");
        showError(error instanceof Error ? error.message : "HTML 导出失败，请重试");
        return false;
      } finally {
        htmlSaving = false;
        window.setTimeout(() => {
          setHtmlStatus("保存单个 HTML");
        }, 3000);
      }
    }

    async function printPage(mode: "paper" | "long" = "paper"): Promise<boolean> {
      if (printRoot || !isSupportedPage()) return false;
      const root = createPrintRoot();
      if (!root) {
        console.warn("[x-pdf] 未找到可打印的正文");
        return false;
      }
      printRoot = root;
      document.body.append(root);
      try {
        await loadPrintImages(root);
        if (mode === "long") {
          longStyle = createLongPageStyle(root);
          document.head.append(longStyle);
        }
        window.print();
        return true;
      } catch (error) {
        console.error("[x-pdf] 打印失败", error);
        reset();
        return false;
      }
    }

    window.addEventListener("afterprint", reset);

    function sync(): void {
      if (isSupportedPage()) {
        if (htmlButton) return;
        htmlButton = document.createElement("button");
        htmlButton.id = HTML_BUTTON_ID;
        htmlButton.type = "button";
        htmlButton.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v3h16v-3"/></svg>';
        setHtmlStatus("保存单个 HTML");
        htmlButton.addEventListener("click", () => {
          void saveHtml();
        });
        document.body.append(htmlButton);
      } else if (htmlButton) {
        htmlButton.remove();
        htmlButton = null;
      }
    }

    sync();
    // X updates routes in its own JavaScript world, so observe the rendered page as well.
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
      if (lastUrl === location.href) return;
      lastUrl = location.href;
      reset();
      sync();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener("popstate", () => {
      lastUrl = location.href;
      reset();
      sync();
    });

    browser.runtime.onMessage.addListener((message) => {
      if (message?.type === MESSAGE_SAVE_PAGE)
        return printPage(message.mode === "long" ? "long" : "paper");
      if (message?.type === MESSAGE_SAVE_HTML) return saveHtml();
    });
  },
});
