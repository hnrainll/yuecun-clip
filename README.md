# 阅存 · 文章保存器

收藏好文章，留待慢慢读。

[GitHub 源码](https://github.com/hnrainll/yuecun-clip) · [问题反馈](https://github.com/hnrainll/yuecun-clip/issues)

隐私政策见 [docs/privacy.html](docs/privacy.html)。

Chrome 插件：将 X/Twitter 推文、X 文章和微信公众号文章统一为阅读排版，保存为 PDF 或单个离线 HTML 文件。

## 技术栈

- [WXT](https://wxt.dev/) 开发 Chrome 扩展（Manifest V3）
- TypeScript 7
- pnpm 12
- oxlint（lint）/ oxfmt（格式化）

## 功能

- 支持推文正页（`x.com/用户名/status/推文ID`）、X 文章页（`x.com/i/articles/…`）和微信公众号文章（`mp.weixin.qq.com/s/…` 或 `/s?…`）
- 页面右下角显示蓝色下载图标，点击保存单个 HTML；X 页面距底部 150px，微信文章距底部 32px
- 微信文章保留标题、作者/公众号、发布时间、正文及图片，不含评论和页面菜单。支持懒加载图片，微信图片通过扩展后台下载并嵌入离线 HTML
- 统一阅读模式：正文提取、结构规范化、排版相互独立。清除原文的字号、颜色、行距和装饰容器，保留标题层级、强调、列表、引用、代码、表格和图片；空段落与重复留白统一清理
- HTML 和 PDF 共用正文排版：1.65 倍行高、0.85em 段距；HTML 负责阅读区域和主题，PDF 负责纸张和分页
- HTML 保存正文文字和图片，不包含微信内嵌视频、音频或交互组件
- 打印时只保留聚焦的那条推文/文章正文（不含回复、时间线、侧栏）
- 推文按作者、时间、正文、图片重新排版；文章清理页面控件并使用独立的打印样式
- 打印前预加载正文图片，避免 PDF 中的懒加载图片缺失
- 连续长页模式使用较窄的阅读宽度和按正文高度计算的纸张；极长文章超过单页上限时仍会分成多张长页
- 插件弹出窗口提供单个 HTML、A4 PDF 和连续长页 PDF 三种导出方式
- 「保存单个 HTML」会把正文和图片放进一个文件；文件不包含 JavaScript，离线打开即可连续阅读。若图片无法嵌入，导出会失败并在页面按钮上提示
- 若 X 改版后无法识别文章正文，导出会提示失败，避免把作者栏和页面控件误存进文件
- HTML 文件名采用「标题-用户名-随机后缀.html」，并过滤文件名不能使用的字符
- X 是 SPA：从正页导航到时间线等页面时 HTML 按钮自动消失，返回正页时重新出现

## 开发

```bash
pnpm install        # 安装依赖（自动执行 wxt prepare 生成类型）
pnpm dev            # 开发模式（Chrome → chrome://extensions → 加载已解压扩展 .output/chrome-mv3）
pnpm build          # 构建
pnpm preview        # 预览构建产物
```

使用构建版扩展时，代码更新后需重新构建，在 `chrome://extensions` 点击扩展的「重新加载」，再刷新已经打开的 X 或微信文章页面。已有的 HTML 文件不会随扩展更新，请重新导出。

## Makefile

```bash
make            # 显示所有目标
make install    # 安装依赖
make dev.chrome # 开发模式（Chrome）
make build.chrome
make check      # format-check + lint + typecheck
make verify     # check + 构建
make clean      # 删除 .output / .wxt
```

## 检查

```bash
pnpm lint           # oxlint
pnpm format         # oxfmt 格式化
pnpm format:check   # 检查格式
pnpm typecheck      # tsc --noEmit
pnpm test:reading   # 启动浏览器回归检查页面的开发服务器
```

运行 `pnpm test:reading` 后打开终端给出的本地地址下的 `/tests/reading.html`，页面自动执行结构与排版检查，显示 PASS 或失败原因。覆盖容器嵌套、留白、强调、标题、列表、代码、表格、图片及 X 提取回归。

## 目录结构

```
entrypoints/content/index.ts   # 内容脚本：正页/文章页注入按钮 + 打印样式
entrypoints/content/extract.ts # X / 微信页面结构适配、正文提取与元信息
entrypoints/content/normalize.ts # 通用正文语义化，清理容器、源样式与多余留白
entrypoints/content/typography.ts # HTML / PDF 共用阅读排版
entrypoints/background.ts      # 微信图片跨域下载
entrypoints/content/print.ts   # PDF 排版
entrypoints/content/html.ts    # 离线 HTML 样式、图片嵌入与下载
entrypoints/popup/             # 弹出窗口
public/assets/                # 插件运行所需图标
docs/                         # 隐私政策与公开说明页面
wxt.config.ts                  # WXT / manifest 配置
```

## 范围说明（当前版本）

- 只打印聚焦的那条推文本身，不含回复；同作者的线程续篇也不会并入（后续可加「整条线程」选项）
- 时间线、个人主页列表、话题页等不注入任何按钮
- PDF 导出依赖浏览器打印对话框（Chrome 的「另存为 PDF」），不引入重型 PDF 库；HTML 直接下载

## 隐私政策发布

在 GitHub 仓库 Settings → Pages 中选择 `main` 分支的 `/docs` 目录。发布后，隐私政策地址为 `https://hnrainll.github.io/yuecun-clip/privacy.html`，确认可公开访问后再填写到 Chrome 应用商店。

## 打包

```bash
pnpm zip -b chrome
```

安装 ZIP 生成于 `.output/`，用于本地安装、商店上传或 GitHub Releases，不提交到源码仓库。
