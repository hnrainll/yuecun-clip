import { appendReadingContent, type ContentOptions } from "../entrypoints/content/normalize";
import { readingCss } from "../entrypoints/content/typography";
import { extractContent } from "../entrypoints/content/extract";

const passed: string[] = [];
function check(condition: unknown, name: string): void {
  if (!condition) throw new Error(name);
  passed.push(name);
}

function normalize(html: string, options: ContentOptions = {}): HTMLDivElement {
  const source = document.createElement("div");
  source.innerHTML = html;
  document.body.append(source);
  const result = document.createElement("div");
  appendReadingContent(source, result, options);
  source.remove();
  return result;
}

try {
  const plain = normalize("<p>第一段<strong>强调</strong>。</p><p>第二段。</p>");
  const nested = normalize(`<section style="line-height:3;margin:100px;font-size:36px">
    <section><p><span>第一段<strong>强调</strong>。</span></p></section>
    <p><br></p><section><section><span>第二段。</span></section></section><p>&nbsp;</p>
  </section>`);
  check(plain.innerHTML === nested.innerHTML, "不同嵌套、源样式和空段落生成相同正文");
  check(!nested.querySelector("section, div, [style], [class]"), "正文不保留布局容器或源样式");

  const breaks = normalize("<p><br>A<br>B<br><br>C<br></p>");
  check(
    breaks.innerHTML === "<p>A<br>B</p><p>C</p>",
    "保留单次换行，连续换行转成段落，清除首尾空行",
  );
  const inline = normalize(
    '<p>Hello <span>world</span> <a href="https://example.com">link</a>.</p>',
  );
  check(inline.textContent === "Hello world link.", "行内节点的词间空格不丢失");
  const markedBreak = normalize("<p><em>A<br></em>B</p>");
  check(markedBreak.querySelector("em br"), "强调范围末尾的正文换行不会被误删");
  const marked = normalize(
    '<section style="font-weight:700"><p>甲</p><p><span style="font-style:italic">乙</span></p></section>',
  );
  check(
    marked.querySelectorAll("p > strong").length === 2 && !!marked.querySelector("em"),
    "块级及行内样式中的强调转换为语义",
  );
  check(!marked.querySelector("p p, strong p, em p"), "强调转换不生成嵌套段落");

  const semantics =
    normalize(`<h1>章节</h1><h2>小节</h2><blockquote><section>引用</section></blockquote>
    <ol start="3"><li>项目<ul><li>子项目</li></ul></li></ol>
    <table><tbody><tr><th colspan="2">表头</th></tr><tr><td>甲</td><td>乙</td></tr></tbody></table>
    <pre><code>  a\n\t b\n</code></pre>`);
  check(
    semantics.querySelector("h2")?.textContent === "章节" &&
      semantics.querySelector("h3")?.textContent === "小节",
    "正文标题保持层级，给文档标题预留 h1",
  );
  check(
    !!semantics.querySelector("blockquote p") &&
      !!semantics.querySelector("ol[start='3'] li ul li"),
    "保留引用及嵌套有序列表",
  );
  check(semantics.querySelector("th")?.getAttribute("colspan") === "2", "保留表格和合并单元格");
  check(
    semantics.querySelector("pre")?.textContent === "  a\n\t b\n",
    "代码保留空格、制表符及换行",
  );
  const tweet = normalize("<div>第一行\n第二行</div>", { preserveWhitespace: true });
  check(tweet.textContent === "第一行\n第二行", "推文保留原始文本换行");

  const data = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  const image = normalize(
    `<section><img src="${data}#placeholder" data-src="${data}" onerror="this.dataset.failed='1'"></section>`,
    { preferLazyImages: true },
  );
  check(
    image.querySelector("figure > img")?.getAttribute("src") === data,
    "懒加载图片使用真实资源并生成图片块",
  );
  const safe = normalize(
    '<p onclick="alert(1)">正文<script>alert(1)</script><a href="javascript:alert(1)">链接</a></p><iframe src="https://example.com"></iframe>',
  );
  check(
    !safe.querySelector("script, iframe, [onclick], a[href]"),
    "源脚本、事件与危险链接不进入阅读文档",
  );

  const style = document.createElement("style");
  style.textContent = readingCss(".html-reader") + readingCss("#pdf-reader");
  document.head.append(style);
  plain.className = "html-reader";
  nested.id = "pdf-reader";
  document.body.append(plain, nested);
  const first = plain.querySelector("p")!;
  const second = nested.querySelector("p")!;
  check(
    getComputedStyle(first).lineHeight === getComputedStyle(second).lineHeight &&
      getComputedStyle(first).marginBottom === getComputedStyle(second).marginBottom,
    "HTML 与 PDF 共用正文行高及段距",
  );
  const ratio =
    parseFloat(getComputedStyle(first).lineHeight) / parseFloat(getComputedStyle(first).fontSize);
  check(Math.abs(ratio - 1.65) < 0.01, "正文行高统一为 1.65，不继承源页面行高");
  plain.style.width = "320px";
  plain.append(image);
  check(image.querySelector("img")!.getBoundingClientRect().width <= 320, "图片适应窄阅读区");
  plain.remove();
  nested.remove();

  // X adapter contract: only the focused post, with the same semantic normalizer.
  const previousUrl = location.href;
  history.replaceState(null, "", "/tester/status/123");
  const main = document.createElement("main");
  main.innerHTML =
    '<article><a href="/tester/status/123">日期</a><div data-testid="User-Name">作者</div><div data-testid="tweetText">正文<strong>强调</strong>\n第二行</div></article><article><a href="/tester/status/456">日期</a><div data-testid="tweetText">回复不能导出</div></article>';
  document.body.append(main);
  const post = extractContent();
  check(
    !!post?.querySelector(".x-pdf-tweet-text strong") &&
      !post.textContent?.includes("回复不能导出"),
    "X 推文提取保留强调且排除回复",
  );
  main.innerHTML =
    '<div data-testid="twitterArticleReadView"><div data-testid="twitterArticleRichTextView"><h1>文章标题</h1><section><p>文章正文</p></section><h2>小节</h2></div></div>';
  const article = extractContent();
  check(
    article?.querySelectorAll("h1").length === 1 &&
      article.querySelector("h1")?.textContent === "文章标题" &&
      article.querySelector("h2")?.textContent === "小节",
    "X 文章正文内的标题只提取一次，保留小节层级",
  );
  main.remove();
  history.replaceState(null, "", previousUrl);

  document.querySelector("#results")!.textContent = `PASS (${passed.length})\n${passed.join("\n")}`;
  document.documentElement.dataset.testState = "passed";
} catch (error) {
  document.querySelector("#results")!.textContent =
    `FAIL after ${passed.length} checks\n${String(error)}`;
  document.documentElement.dataset.testState = "failed";
  throw error;
}
