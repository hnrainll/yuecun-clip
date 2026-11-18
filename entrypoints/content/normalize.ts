// A detached semantic DOM is the intermediate document. No site selectors or layout CSS here.
export interface ContentOptions {
  preferLazyImages?: boolean;
  preserveWhitespace?: boolean;
  exclude?: HTMLElement;
}

const SKIP_TAGS = new Set([
  "BUTTON",
  "SVG",
  "SCRIPT",
  "STYLE",
  "NAV",
  "ASIDE",
  "FORM",
  "INPUT",
  "VIDEO",
  "AUDIO",
  "IFRAME",
  "CANVAS",
  "NOSCRIPT",
  "TEMPLATE",
]);
const SKIP_TEST_IDS = new Set([
  "caret",
  "reply",
  "retweet",
  "like",
  "bookmark",
  "share",
  "tweetButton",
]);
const INLINE_TAGS = new Set([
  "A",
  "BR",
  "STRONG",
  "B",
  "EM",
  "I",
  "CODE",
  "SUP",
  "SUB",
  "S",
  "DEL",
  "U",
]);
const BLOCK_TAGS = new Set([
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "UL",
  "OL",
  "LI",
  "BLOCKQUOTE",
  "PRE",
  "FIGURE",
  "FIGCAPTION",
  "HR",
  "TABLE",
  "THEAD",
  "TBODY",
  "TFOOT",
  "TR",
  "TH",
  "TD",
]);
const FLOW_TAGS = new Set(["DIV", "P", "SECTION", "ARTICLE", "HEADER", "FOOTER"]);

export function imageUrl(image: HTMLImageElement, options: ContentOptions = {}): string {
  const value =
    (options.preferLazyImages ? image.getAttribute("data-src") : "") ||
    image.currentSrc ||
    image.getAttribute("src") ||
    image.getAttribute("data-src");
  if (!value) return "";
  try {
    const url = new URL(value, location.href);
    return ["https:", "http:", "data:", "blob:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

export function appendImage(
  parent: HTMLElement,
  source: HTMLImageElement,
  options: ContentOptions = {},
): void {
  const url = imageUrl(source, options);
  if (!url || url.includes("/profile_images/")) return;
  if (url.includes("/emoji/")) {
    parent.append(document.createTextNode(source.alt));
    return;
  }
  const image = document.createElement("img");
  image.src = url;
  image.alt = source.alt || "";
  image.loading = "eager";
  image.decoding = "sync";
  parent.append(image);
}

function hasContent(element: HTMLElement): boolean {
  return (
    !!element.textContent?.replace(/[\s\u200b\ufeff]/g, "") || !!element.querySelector("img, hr")
  );
}

// Convert presentation-only emphasis to semantics before discarding source styles.
function wrapEmphasis(target: HTMLElement, tag: "strong" | "em"): void {
  const output = document.createDocumentFragment();
  let run = document.createElement(tag);
  const flush = () => {
    if (run.hasChildNodes()) output.append(run);
    run = document.createElement(tag);
  };
  for (const child of Array.from(target.childNodes)) {
    if (
      child instanceof HTMLElement &&
      (BLOCK_TAGS.has(child.tagName) || FLOW_TAGS.has(child.tagName))
    ) {
      flush();
      wrapEmphasis(child, tag);
      output.append(child);
    } else run.append(child);
  }
  flush();
  target.replaceChildren(output);
}

function emphasis(source: HTMLElement, target: HTMLElement): void {
  if (!source.isConnected || /^(H[1-6]|STRONG|B|EM|I|PRE|CODE)$/.test(source.tagName)) return;
  const style = getComputedStyle(source);
  const parent = source.parentElement ? getComputedStyle(source.parentElement) : null;
  if (Number(style.fontWeight) >= 600 && Number(parent?.fontWeight || 400) < 600) {
    wrapEmphasis(target, "strong");
  }
  if (style.fontStyle === "italic" && parent?.fontStyle !== "italic") {
    wrapEmphasis(target, "em");
  }
}

function copyNode(
  source: Node,
  parent: HTMLElement,
  options: ContentOptions,
  headingOffset: number,
): void {
  if (source.nodeType === Node.TEXT_NODE) {
    const text = source.textContent || "";
    parent.append(
      document.createTextNode(
        options.preserveWhitespace ? text : text.replace(/[\t\r\n\f ]+/g, " "),
      ),
    );
    return;
  }
  if (!(source instanceof HTMLElement)) return;
  if (source === options.exclude) return;
  if (
    SKIP_TAGS.has(source.tagName) ||
    source.hidden ||
    source.getAttribute("aria-hidden") === "true" ||
    source.hasAttribute("data-post-avatar") ||
    source.hasAttribute("data-engagement-action") ||
    SKIP_TEST_IDS.has(source.dataset.testid || "")
  )
    return;
  if (source instanceof HTMLImageElement) {
    appendImage(parent, source, options);
    return;
  }
  const heading = source.tagName.match(/^H([1-6])$/);
  const tag = heading
    ? `h${Math.min(6, Number(heading[1]) + headingOffset)}`
    : INLINE_TAGS.has(source.tagName) ||
        BLOCK_TAGS.has(source.tagName) ||
        FLOW_TAGS.has(source.tagName)
      ? source.tagName.toLowerCase()
      : source.isConnected &&
          ["block", "flex", "grid", "flow-root"].includes(getComputedStyle(source).display)
        ? "div"
        : "span";
  const target = document.createElement(tag);
  if (
    target instanceof HTMLAnchorElement &&
    source instanceof HTMLAnchorElement &&
    /^https?:$/.test(source.protocol)
  )
    target.href = source.href;
  if (source.tagName === "OL" && source.hasAttribute("start"))
    target.setAttribute("start", String((source as HTMLOListElement).start));
  if (["TD", "TH"].includes(source.tagName)) {
    for (const attribute of ["colspan", "rowspan"]) {
      const value = Number(source.getAttribute(attribute));
      if (value > 0 && value <= 100) target.setAttribute(attribute, String(value));
    }
  }
  const childOptions =
    source.tagName === "PRE" ? { ...options, preserveWhitespace: true } : options;
  for (const child of source.childNodes) copyNode(child, target, childOptions, headingOffset);
  emphasis(source, target);
  // Drop inert inline wrappers, including all original classes, spacing and fixed sizes.
  if (tag === "span") parent.append(...target.childNodes);
  else if (hasContent(target) || tag === "br" || tag === "hr") parent.append(target);
}

function trimInlineEdge(element: HTMLElement, start: boolean): void {
  let edge = start ? element.firstChild : element.lastChild;
  while (edge) {
    if (edge.nodeType === Node.TEXT_NODE) {
      if (edge.textContent?.trim()) return;
    } else if (edge.nodeName !== "BR") {
      if (!(edge instanceof HTMLElement) || edge.tagName === "IMG") return;
      trimInlineEdge(edge, start);
      if (edge.hasChildNodes()) return;
    }
    edge.remove();
    edge = start ? element.firstChild : element.lastChild;
  }
}

function trimBreaks(element: HTMLElement): void {
  trimInlineEdge(element, true);
  trimInlineEdge(element, false);
}

// Layout wrappers never own spacing. Only semantic blocks produced here do.
function normalizeFlow(container: HTMLElement): void {
  const output = document.createDocumentFragment();
  let paragraph = document.createElement("p");
  const flush = () => {
    trimBreaks(paragraph);
    if (hasContent(paragraph)) {
      if (!paragraph.textContent?.trim() && paragraph.querySelector("img")) {
        const figure = document.createElement("figure");
        figure.append(...paragraph.childNodes);
        output.append(figure);
      } else output.append(paragraph);
    }
    paragraph = document.createElement("p");
  };
  for (const child of Array.from(container.childNodes)) {
    if (child instanceof HTMLElement && FLOW_TAGS.has(child.tagName)) {
      flush();
      normalizeFlow(child);
      output.append(...child.childNodes);
    } else if (child instanceof HTMLElement && BLOCK_TAGS.has(child.tagName)) {
      flush();
      normalizeBlock(child);
      output.append(child);
    } else if (child.nodeName === "BR" && paragraph.lastChild?.nodeName === "BR") {
      flush();
    } else paragraph.append(child);
  }
  flush();
  container.replaceChildren(output);
}

function normalizeBlock(block: HTMLElement): void {
  if (block.tagName === "PRE") return;
  if (["LI", "BLOCKQUOTE", "FIGCAPTION", "TD", "TH"].includes(block.tagName)) {
    normalizeFlow(block);
    return;
  }
  for (const child of Array.from(block.children)) {
    if (!(child instanceof HTMLElement)) continue;
    if (FLOW_TAGS.has(child.tagName)) {
      normalizeFlow(child);
      child.replaceWith(...child.childNodes);
    } else normalizeBlock(child);
  }
}

export function appendReadingContent(
  source: Node,
  parent: HTMLElement,
  options: ContentOptions = {},
): void {
  const headings = source instanceof HTMLElement ? [source, ...source.querySelectorAll("h1")] : [];
  const headingOffset = headings.some(
    (element) => element !== options.exclude && element.tagName === "H1",
  )
    ? 1
    : 0;
  const content = document.createElement("div");
  copyNode(source, content, options, headingOffset);
  normalizeFlow(content);
  parent.append(...content.childNodes);
}
