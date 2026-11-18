import { defineConfig } from "wxt";

export default defineConfig({
  zip: {
    name: "yuecun-clip",
  },
  manifest: {
    name: "阅存 · 文章保存器",
    short_name: "阅存",
    homepage_url: "https://github.com/hnrainll/yuecun-clip",
    description:
      "收藏好文章，留待慢慢读。支持 X/Twitter 与微信公众号文章，统一阅读排版，保存为离线 HTML 或 PDF。",
    permissions: ["activeTab"],
    host_permissions: ["https://mmbiz.qpic.cn/*", "https://mmbiz.qlogo.cn/*"],
    icons: {
      "16": "assets/article-saver-16.png",
      "32": "assets/article-saver-32.png",
      "48": "assets/article-saver-48.png",
      "128": "assets/article-saver-store-128.png",
    },
  },
});
