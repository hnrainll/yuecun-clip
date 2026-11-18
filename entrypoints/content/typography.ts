// Shared reading typography. Exporters own only the page shell and pagination.
export function readingCss(scope: string): string {
  return `
    ${scope} {
      --reader-text: #24303b;
      --reader-muted: #637485;
      --reader-border: #dce3e8;
      --reader-link: #1769aa;
      color: var(--reader-text);
      font: var(--reader-font-size, 17px)/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      overflow-wrap: anywhere;
      text-align: left;
    }
    ${scope}, ${scope} * { box-sizing: border-box; }
    ${scope} :where(*) { margin: 0; padding: 0; font: inherit; letter-spacing: normal; }
    ${scope} :where(p, ul, ol, blockquote, pre, figure, table, hr) { margin: 0 0 0.85em; }
    ${scope} :where(p, ul, ol, blockquote, pre, figure, table):last-child { margin-bottom: 0; }
    ${scope} h1 { font-size: 1.9em; line-height: 1.35; font-weight: 700; margin: 0 0 1em; }
    ${scope} h2 { font-size: 1.4em; line-height: 1.4; font-weight: 700; margin: 1.65em 0 0.65em; }
    ${scope} h3 { font-size: 1.2em; line-height: 1.4; font-weight: 700; margin: 1.4em 0 0.6em; }
    ${scope} :where(h4, h5, h6) { font-size: 1.05em; line-height: 1.45; font-weight: 700; margin: 1.3em 0 0.6em; }
    ${scope} :where(h1, h2, h3, h4, h5, h6) { break-after: avoid; }
    ${scope} :where(ul, ol) { padding-left: 1.6em; }
    ${scope} li { margin: 0.25em 0; }
    ${scope} li > :where(ul, ol) { margin-top: 0.3em; }
    ${scope} :where(strong, b) { font-weight: 700; }
    ${scope} :where(em, i) { font-style: italic; }
    ${scope} :where(s, del) { text-decoration: line-through; }
    ${scope} u { text-decoration: underline; }
    ${scope} sup { vertical-align: super; font-size: 0.75em; }
    ${scope} sub { vertical-align: sub; font-size: 0.75em; }
    ${scope} a { color: var(--reader-link); text-decoration: underline; text-underline-offset: 3px; }
    ${scope} img { display: block; max-width: 100%; width: auto; height: auto; margin: 0 auto; object-fit: contain; break-inside: avoid; }
    ${scope} figure { break-inside: avoid; }
    ${scope} figcaption { color: var(--reader-muted); font-size: 0.85em; margin-top: 0.5em; }
    ${scope} blockquote { padding-left: 1em; border-left: 3px solid var(--reader-border); color: var(--reader-muted); }
    ${scope} :where(pre, code) { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9em; }
    ${scope} pre { white-space: pre-wrap; tab-size: 4; padding: 0.85em; background: #8881; }
    ${scope} pre code { font-size: 1em; }
    ${scope} table { width: 100%; border-collapse: collapse; }
    ${scope} :where(th, td) { padding: 0.4em 0.6em; border: 1px solid var(--reader-border); vertical-align: top; }
    ${scope} th { font-weight: 700; }
    ${scope} hr { border: 0; border-top: 1px solid var(--reader-border); }
    ${scope} .x-pdf-meta { color: var(--reader-muted); font-size: 0.85em; margin-bottom: 1.5em; }
    ${scope} .x-pdf-tweet-text { white-space: pre-wrap; }
    ${scope} .x-pdf-source { border-top: 1px solid var(--reader-border); padding-top: 1em; margin-top: 2em; color: var(--reader-muted); font-size: 0.8em; }
  `;
}
