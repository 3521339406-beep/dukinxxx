# V1.0 验证记录

2026-10-17（Asia/Shanghai）。环境：Windows，Node.js 24.19.0，Edge headless / Playwright。

## 自动化结果

- `node --test tests/*.test.mjs`：12/12 通过。
- `node scripts/build.mjs`：成功。验证 JS 语法、manifest 图标存在，生成 dist 静态文件。
- 本地 HTTP 检查：200。
- `node tests/browser.mjs`：通过，无 JavaScript 页面错误。

浏览器验收覆盖：390×844 无横向溢出、周一日历、空首页、创建同名任务、独立 ID、改名、完成移底、取消完成追加、键盘与指针拖动排序、删除撤销、5 秒到期、实际 JSON 下载内容、刷新持久化、过去日期只读、未来日期完成、断网刷新与新增并保存、1280×900 桌面截图。

规则测试还覆盖闰年月份、跨午夜权限、非法排序目标、保存失败不更改已保存状态、损坏/未来版本数据保留并导出。

独立代码审查发现连续删除后撤销的顺序问题，已增加失败回归测试并修复。触屏测试已扩展为实际 CDP touchStart/touchMove/touchEnd 事件，并模拟 movementY=0 的移动浏览器：先复现失败，再改为 clientY 位移判定，最终整套测试通过。

截图已经人工查看：`qa/calendar-mobile.png`、`qa/detail-mobile.png`。测试数据只存在独立测试上下文，不在交付源码或预览日常存储中。

## 验证边界

- 未部署 HTTPS 公网站点。
- 未在真实 iPhone Safari / 主屏幕环境实机测试；移动浏览器布局和 Pointer Events 路径已在桌面 Edge 的移动视口测试。
- localStorage 多窗口极端同时写入不提供事务保证。
- 不支持 JSON 导入，导出文件不等于应用内一键恢复能力。
