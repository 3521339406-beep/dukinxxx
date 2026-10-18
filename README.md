# 日序 · 个人计划 V1.1

移动优先的中文个人计划 PWA。零运行依赖、无账号、无后端、无云同步，无付费依赖。源码和可直接部署的 `dist/` 均已包含。

## 本地运行

安装 Node.js 22 或更高版本，在本目录打开终端：

```sh
node --test tests/*.test.mjs
node scripts/build.mjs
node scripts/serve.mjs
```

浏览器打开 `http://127.0.0.1:4173`。不需要安装任何包，不要直接双击 HTML（模块和离线功能需要 HTTP）。如端口占用，在 PowerShell 先执行 `$env:PORT='4287'`，再启动服务，改用该端口访问。

本地服务仅监听本机。`localhost`/`127.0.0.1` 支持 Service Worker；手机不能通过自己的 localhost 访问电脑服务。

## 部署和 iPhone 安装

GitHub Pages 自动部署工作流已包含在 `.github/workflows/pages.yml`。将项目源码推送到 `main`，在仓库 Settings → Pages → Build and deployment 中选择 **GitHub Actions**，然后运行 “Verify and deploy GitHub Pages”。流程会先运行规则测试和构建，成功后发布 `dist/`。部署地址以 Actions 实际输出为准。流程参考 [GitHub Pages 官方文档](https://docs.github.com/zh/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

1. 执行构建，把 **dist 内全部文件** 上传到任意提供 HTTPS 的静态托管服务；根目录或子目录均可，保留目录结构。
2. 服务必须正确返回 JS 的 `text/javascript`、manifest 的 `application/manifest+json` 和 PNG 的 `image/png`。无需 SPA 重写规则，日期页面使用 URL hash。
3. `sw.js` 建议设置 `Cache-Control: no-cache`，不要跨域引用资源。
4. 在 iPhone Safari 打开实际 HTTPS 地址，联网等待“设置”中的“离线资源已就绪”，选择“分享 → 添加到主屏幕”。
5. 打开一次后可离线使用。上线更新时修改 `sw.js` 的 CACHE 版本，重新构建部署；为防止旧页面混用新脚本，更新会等旧窗口全部关闭后生效。

**已部署到 GitHub Pages： https://3521339406-beep.github.io/dukinxxx/** 。线上 HTTPS 页面和离线资源已验证。真实 iPhone Safari 的安装仍需实机测试。源码仓库：https://github.com/3521339406-beep/dukinxxx 。

## 使用规则

### 手机 → 电脑导入

1. 手机上点右上角「···」→「导出全部数据 · JSON」。旧版 V1.0 导出文件同样兼容。
2. 通过隔空投送、微信文件传输等方式，把 JSON 文件传到电脑。
3. 电脑打开同一网站，点「···」→「导入数据 · JSON」，选择文件。
4. 检查文件的任务数和日期数，点「确认替换并导入」。这会整份替换电脑的计划，不合并；保留文件中的 ID、同名任务、日期、完成状态与排序，包括历史日期。

导入前自动在当前浏览器保留一份原始数据，可点「下载导入前备份」保存；仅保留最近一次导入前备份。若要恢复，可再导入下载的有效 JSON 备份。取消或文件校验失败不会修改计划；备份/保存失败会中止导入。文件上限 10 MB。空文件内容不合法；合法的零任务备份会明确提示清空任务，仍需确认。导入预览期间其他窗口改变数据，会阻止提交并要求重新选择文件。建议不要在多个窗口同时编辑。

看到旧版时，请先联网打开一次网站，再关闭所有日序网页和主屏幕窗口后重新打开；不要清除浏览器数据。此功能是手动文件迁移，不是实时云同步。

- 首页仅有简洁月历，无预设任务、统计面板或空白任务卡；首次进入/刷新回到当前月并突出今天。周一为一周起始。点击日期进入详情。
- 新建与编辑弹窗仅有任务名称；自动去除首尾空格，禁止全空名称。允许同名，按唯一 ID 独立管理。
- 拖动未完成任务右侧把手排序；键盘聚焦把手后可用上下方向键、Home、End。已完成任务列在下方；取消完成放到未完成末尾。
- 今天和未来日期可新增、改名、删除、排序和完成。过去日期只读。设备的本地日期/时区定义“今天”，午夜自动刷新，提交操作时再次校验权限。
- 删除立即保存，每次删除各有 5 秒撤销机会；刷新或关闭页面会结束撤销，跨午夜变成过去的任务不能撤销。
- 设置中手动导出/导入完整 JSON。没有云同步、定时自动备份、重复任务、类别、备注、截止时间、提醒、日记正文、搜索或额外任务字段。

## 数据与异常处理

存储键 `personal-planner-v1`，结构如下；数组顺序是展示顺序，同一天按未完成/已完成稳定分组。

```json
{
  "version": 1,
  "tasks": [
    {"id": "独立 UUID", "date": "2026-10-17", "name": "阅读", "done": false}
  ]
}
```

导出文件额外包含 `exportedAt`（ISO 时间）。`id`、日期、状态是内部管理数据，不是额外用户输入字段。没有网络传输或分析追踪。应用缓存只保存静态资源，任务保存在 localStorage。

- 所有修改同步写入 localStorage 后才更新页面；存储失败显示错误，不假装成功。
- 损坏、无效或不支持版本的数据会保留原样，阻止修改，可通过导出保存原文以便人工恢复。不自动清空数据。
- 其他标签页修改后自动刷新，写入前读取最新数据。但 localStorage 不是事务数据库，极端同时写入可能互相覆盖；建议只在一个窗口编辑。
- 数据限定当前浏览器、设备和站点 origin。不同域名/端口、不同浏览器、Safari 与主屏幕应用可能使用不同存储；不要假设共享。
- 清除站点数据、卸载或浏览器回收存储可能删除记录及导入前备份；隐私模式不适合长期存储。请定期导出到文件。
- 无登录权限控制；能访问该设备浏览器的人可查看计划。本地日期也取决于设备时钟。

## 验证

`tests/model.test.mjs` 与 `tests/store.test.mjs` 使用 Node 内置测试器。`tests/browser.mjs` 是可选的真实浏览器验收脚本（不属于运行依赖），需要 Playwright 与 Edge；可在临时环境安装 Playwright，或把环境变量 `PLAYWRIGHT_PATH` 指向已有包。环境变量 `TEST_URL` 可指定本地服务地址，默认 `http://127.0.0.1:4287`；`BROWSER_CHANNEL` 默认 `msedge`。

```sh
node tests/browser.mjs
node tests/import-browser.mjs
```

测试结果详见 `VERIFICATION.md`，截图在 `qa/`。自动化使用独立临时浏览器上下文，不会向你的日常浏览器填入测试任务。

## 文件

- `src/model.js`：日期与任务规则
- `src/store.js`：本地持久化、数据校验、导出/导入和导入前备份
- `src/app.js`：界面、弹窗、触屏与键盘交互
- `styles.css`：响应式界面；`manifest.webmanifest`、`sw.js`、`icons/`：PWA
- `scripts/`：无依赖构建、预览；`tests/`：测试；`PLAN.md`：需求来源与实现决策

项目是完整静态交付，无需数据库、API 密钥或服务器应用。
