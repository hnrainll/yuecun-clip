const status = document.querySelector<HTMLElement>("#status");

async function save(mode: "paper" | "long" | "html"): Promise<void> {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!tab?.id) {
    if (status) status.textContent = "没有找到当前标签页";
    return;
  }

  try {
    const started = await browser.tabs.sendMessage(
      tab.id,
      mode === "html" ? { type: "x-pdf:save-html" } : { type: "x-pdf:save-page", mode },
    );
    if (status)
      status.textContent = started
        ? mode === "html"
          ? "HTML 已开始下载"
          : "正在打开打印对话框"
        : mode === "html"
          ? "HTML 导出失败，请查看页面按钮提示"
          : "当前页面没有可导出的正文";
  } catch {
    if (status) status.textContent = "请先打开 X 推文正页、X 文章或微信公众号文章";
  }
}

document.querySelector<HTMLButtonElement>("#save")?.addEventListener("click", () => {
  void save("paper");
});
document.querySelector<HTMLButtonElement>("#save-long")?.addEventListener("click", () => {
  void save("long");
});
document.querySelector<HTMLButtonElement>("#save-html")?.addEventListener("click", () => {
  void save("html");
});
