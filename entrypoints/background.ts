export default defineBackground(() => {
  browser.runtime.onMessage.addListener(async (message, sender) => {
    if (message?.type !== "x-pdf:wechat-image") return;
    if (!sender.tab?.url || new URL(sender.tab.url).hostname !== "mp.weixin.qq.com") return;
    try {
      const url = new URL(message.url);
      if (url.protocol !== "https:" || !["mmbiz.qpic.cn", "mmbiz.qlogo.cn"].includes(url.hostname))
        throw new Error("不支持的微信图片地址");
      const response = await fetch(url.href, {
        signal: AbortSignal.timeout(20000),
        credentials: "omit",
        redirect: "error",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) throw new Error("响应不是图片");
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = "";
      for (let offset = 0; offset < bytes.length; offset += 8192)
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
      return { dataUrl: `data:${blob.type};base64,${btoa(binary)}` };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "图片下载失败" };
    }
  });
});
