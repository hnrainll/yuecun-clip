import {
  appendReadingContent,
  appendImage as copyImage,
  imageUrl as resolveImageUrl,
} from "./normalize";

// Site-specific DOM contracts live here; rendering does not inspect the live page.
export function isWechatPage(): boolean {
  return location.hostname === "mp.weixin.qq.com";
}

const STATUS_PATH = /\/status(?:es)?\/(\d+)/;
const SELECTORS = {
  articleView: '[data-testid="twitterArticleReadView"]',
  articleBody:
    '[data-testid="twitterArticleRichTextView"], [data-article-body-html], [data-article-part="body"]',
  articleTitle: 'h1, [data-article-part="title"], [data-testid="twitter-article-title"]',
  articleCover: '[data-article-part="cover"], a[href*="/article/"][href*="/media/"]',
  tweetBody: '[data-testid="tweetText"], [class~="whitespace-pre-wrap"]',
  tweetMedia: '[data-testid="tweetPhoto"] img, img[src*="pbs.twimg.com/media/"]',
  author: '[data-testid="User-Name"]',
};

export function pageDetails(root?: HTMLElement): { title: string; author: string } {
  if (isWechatPage()) {
    return {
      title: document.querySelector("#activity-name")?.textContent?.trim() || "微信文章",
      author: document.querySelector("#js_name")?.textContent?.trim() || "微信公众号",
    };
  }
  const tabTitle = document.title.replace(/^[（(]\d+[）)]\s*/, "").trim();
  const match = tabTitle.match(/^(.*?) on X:\s*["“]([\s\S]*?)["”]\s*\/\s*X\s*$/);
  const handle = location.pathname.match(/^\/([^/]+)\/status(?:es)?\//)?.[1];
  const heading = root?.dataset.contentKind === "tweet" ? null : root?.querySelector("h1");
  return {
    title: heading?.textContent?.trim() || match?.[2] || tabTitle || "X 文章",
    author: match?.[1] || handle || "X",
  };
}

function statusId(): string | null {
  return location.pathname.match(STATUS_PATH)?.[1] ?? null;
}

export function isSupportedPage(): boolean {
  if (isWechatPage()) return /^\/s(?:\/[^/]+|\/?$)/.test(location.pathname);
  return statusId() !== null || /^\/i\/articles\/[^/]+/.test(location.pathname);
}

function findSource(): HTMLElement | null {
  const main = document.querySelector("main");
  if (!main) return null;
  const readView = main.querySelector<HTMLElement>(SELECTORS.articleView);
  if (readView) return readView;
  if (statusId()) {
    const id = statusId();
    const articles = Array.from(main.querySelectorAll<HTMLElement>("article"));
    return (
      articles.find((article) =>
        Array.from(article.querySelectorAll<HTMLAnchorElement>("a[href]")).some(
          (link) => link.pathname.match(STATUS_PATH)?.[1] === id,
        ),
      ) ?? (articles.length === 1 ? articles[0]! : null)
    );
  }
  return (
    main.querySelector<HTMLElement>('[data-testid="article"]') ??
    main.querySelector<HTMLElement>('article[role="article"]') ??
    main.querySelector<HTMLElement>("article")
  );
}

function imageUrl(image: HTMLImageElement): string {
  return resolveImageUrl(image, { preferLazyImages: isWechatPage() });
}

function appendImage(parent: HTMLElement, source: HTMLImageElement): void {
  copyImage(parent, source, { preferLazyImages: isWechatPage() });
}

function copyContent(source: Node, parent: HTMLElement): void {
  appendReadingContent(source, parent, { preferLazyImages: isWechatPage() });
}

function extractWechatContent(): HTMLDivElement | null {
  const body = document.querySelector<HTMLElement>("#js_content");
  const title = document.querySelector("#activity-name")?.textContent?.trim();
  if (!title || !body || (!body.textContent?.trim() && !body.querySelector("img"))) return null;
  const root = document.createElement("div");
  root.dataset.contentKind = "wechat";
  const heading = document.createElement("h1");
  heading.textContent = title;
  root.append(heading);
  const meta = document.createElement("p");
  meta.className = "x-pdf-meta";
  meta.textContent = ["#js_author_name", "#js_name", "#publish_time"]
    .map((selector) => document.querySelector(selector)?.textContent?.trim())
    .filter((value, index, values) => value && values.indexOf(value) === index)
    .join(" · ");
  root.append(meta);
  const prose = document.createElement("div");
  prose.className = "x-pdf-body";
  copyContent(body, prose);
  root.append(prose);
  return root;
}

function createTweet(source: HTMLElement, root: HTMLElement): void {
  const tweetText = source.querySelector<HTMLElement>(SELECTORS.tweetBody);

  const name = source.querySelector<HTMLElement>(SELECTORS.author);
  const title = document.createElement("h1");
  title.textContent =
    name?.innerText.trim().replace(/\s+/g, " ") ||
    source.innerText
      .split("\n")
      .map((part) => part.trim())
      .find(Boolean) ||
    "X 帖子";
  root.append(title);

  const time = source.querySelector<HTMLTimeElement>("time");
  const dateLink = Array.from(
    source.querySelectorAll<HTMLAnchorElement>('a[href*="/status/"]'),
  ).find(
    (link) => link.pathname.match(STATUS_PATH)?.[1] === statusId() && link.innerText.includes("·"),
  );
  if (time || dateLink) {
    const meta = document.createElement("p");
    meta.className = "x-pdf-meta";
    meta.textContent = time?.getAttribute("datetime")
      ? new Date(time.getAttribute("datetime")!).toLocaleString()
      : time?.textContent || dateLink?.innerText || "";
    root.append(meta);
  }

  if (tweetText) {
    const text = document.createElement("div");
    text.className = "x-pdf-tweet-text";
    appendReadingContent(tweetText, text, { preserveWhitespace: true });
    root.append(text);
  }

  const media = Array.from(source.querySelectorAll<HTMLImageElement>(SELECTORS.tweetMedia));
  for (const sourceImage of media) {
    const figure = document.createElement("figure");
    appendImage(figure, sourceImage);
    if (figure.hasChildNodes()) root.append(figure);
  }
}

function createArticle(source: HTMLElement, root: HTMLElement): void {
  const body = source.querySelector<HTMLElement>(SELECTORS.articleBody);
  if (body) createArticleFromProse(source, body, root);
}

// With no explicit body marker, use the common container of prose blocks.
// Requiring a proper descendant prevents falling back to the whole post.
function findArticleProse(source: HTMLElement): HTMLElement | null {
  const paragraphs = Array.from(source.querySelectorAll("p")).filter(
    (element) =>
      element.textContent?.trim() && !element.closest('aside, nav, footer, [role="button"]'),
  );
  if (paragraphs.length < 2) return null;
  let container = paragraphs[0]?.parentElement;
  while (container && container !== source) {
    if (paragraphs.every((paragraph) => container!.contains(paragraph))) return container;
    container = container.parentElement;
  }
  return null;
}

function createArticleFromProse(source: HTMLElement, prose: HTMLElement, root: HTMLElement): void {
  const cover = source.querySelector<HTMLElement>(SELECTORS.articleCover);
  if (cover && !prose.contains(cover)) copyContent(cover, root);
  else if (!cover) {
    const coverImage = Array.from(source.querySelectorAll<HTMLImageElement>("img")).find(
      (image) => !prose.contains(image) && imageUrl(image).includes("/media/"),
    );
    if (coverImage) appendImage(root, coverImage);
  }

  const title = source.querySelector<HTMLElement>(SELECTORS.articleTitle);
  const heading = document.createElement("h1");
  heading.textContent = title?.textContent || pageDetails().title;
  root.append(heading);
  appendReadingContent(prose, root, { exclude: title ?? undefined });
}

export function extractContent(): HTMLDivElement | null {
  if (!isSupportedPage()) return null;
  if (isWechatPage()) {
    const root = extractWechatContent();
    return root ? finalizeContent(root) : null;
  }
  const source = findSource();
  if (!source) return null;
  const root = document.createElement("div");

  const articleBody = source.querySelector<HTMLElement>(SELECTORS.articleBody);
  const articleSignal =
    source.matches(SELECTORS.articleView) ||
    !!source.querySelector(`${SELECTORS.articleTitle}, ${SELECTORS.articleCover}`);
  const explicitTweet = source.querySelector('[data-testid="tweetText"]');
  const articleProse = articleBody || explicitTweet ? null : findArticleProse(source);
  if (articleBody) {
    if (!articleBody.textContent?.trim() && !articleBody.querySelector("img")) return null;
    createArticle(source, root);
  } else if (articleProse) {
    createArticleFromProse(source, articleProse, root);
  } else if (statusId() && !articleSignal) {
    const hasTweetText = source.querySelector(SELECTORS.tweetBody);
    const hasMedia = source.querySelector(SELECTORS.tweetMedia);
    if (!hasTweetText && !hasMedia) return null;
    createTweet(source, root);
    root.dataset.contentKind = "tweet";
  } else {
    // An unrecognized article layout must not include its surrounding X controls.
    return null;
  }
  return finalizeContent(root);
}

function finalizeContent(root: HTMLDivElement): HTMLDivElement {
  const footer = document.createElement("p");
  footer.className = "x-pdf-source";
  // Legacy WeChat /s?__biz=…&mid=… links require their query parameters.
  const sourceUrl = isWechatPage()
    ? location.href
    : new URL(location.pathname, location.origin).href;
  const link = document.createElement("a");
  link.href = sourceUrl;
  link.textContent = sourceUrl;
  footer.append("查看原文：", link);
  root.append(footer);
  const details = pageDetails(root);
  root.dataset.documentTitle = details.title;
  root.dataset.documentAuthor = details.author;
  return root;
}
