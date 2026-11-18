import { readingCss } from "./typography";
import { extractContent } from "./extract";
export { isSupportedPage } from "./extract";

const PRINT_ROOT_ID = "x-pdf-print-root";
const LONG_PAGE_WIDTH_MM = 160;
const LONG_PAGE_MAX_HEIGHT_MM = 4800;
export const PRINT_CSS = `
  ${readingCss(`#${PRINT_ROOT_ID}`)}
  #${PRINT_ROOT_ID} { display: none; background: #fff; --reader-font-size: 12pt; }
  #${PRINT_ROOT_ID} img { max-height: 230mm; }
  #${PRINT_ROOT_ID}.x-pdf-measuring {
    display: block !important;
    position: fixed !important;
    left: -100000px !important;
    top: 0 !important;
    width: ${LONG_PAGE_WIDTH_MM}mm !important;
    max-width: none !important;
    padding: 10mm 12mm !important;
    visibility: hidden !important;
  }
  @media print {
    @page { size: A4; margin: 17mm 18mm; }
    html, body { width: auto !important; min-width: 0 !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
    body > *:not(#${PRINT_ROOT_ID}) { display: none !important; }
    #${PRINT_ROOT_ID}, #${PRINT_ROOT_ID} * { visibility: visible !important; }
    #${PRINT_ROOT_ID} {
      display: block !important;
      width: 100% !important;
      max-width: 146mm !important;
      margin: 0 auto !important;
      padding: 0 !important;
      background: #fff !important;
      overflow: visible !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
`;

export function createLongPageStyle(root: HTMLElement): HTMLStyleElement {
  root.classList.add("x-pdf-measuring");
  const heightPx = root.getBoundingClientRect().height;
  root.classList.remove("x-pdf-measuring");
  const heightMm = Math.min(LONG_PAGE_MAX_HEIGHT_MM, Math.ceil((heightPx * 25.4) / 96) + 4);
  const style = document.createElement("style");
  style.textContent = `
    @page { size: ${LONG_PAGE_WIDTH_MM}mm ${heightMm}mm; margin: 0; }
    @media print {
      #${PRINT_ROOT_ID} {
        width: ${LONG_PAGE_WIDTH_MM}mm !important;
        max-width: none !important;
        margin: 0 !important;
        padding: 10mm 12mm !important;
      }
    }
  `;
  return style;
}

export function createPrintRoot(): HTMLDivElement | null {
  const root = extractContent();
  if (root) root.id = PRINT_ROOT_ID;
  return root;
}

export async function loadPrintImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
  await Promise.all(
    images.map(async (image) => {
      const preload = new Image();
      preload.src = image.src;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          preload.decode(),
          new Promise<never>(
            (_, reject) => (timer = setTimeout(() => reject(new Error("image timeout")), 10000)),
          ),
        ]);
      } catch {
        // Keep the URL in the document so Chrome can still load it during printing.
      } finally {
        clearTimeout(timer);
      }
    }),
  );
}
