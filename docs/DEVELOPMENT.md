# 开发与集成

## 构建

使用 Node.js >=24.9.0 和 npm，在仓库根目录执行 `npm ci`、`npm test`、`npm run build`、`npm pack`。锁文件限定本次开发依赖。`ui/` 是当前真实界面源码，没有依赖仓库外的原型、私人 Skill 或开发会话。

Host 入口为 `src/index.ts`，客户端 More 菜单入口为 `src/client.tsx`，侧栏容器为 `src/panel.tsx`，页面为 `ui/src/real-main.jsx`。官方 Typert generator 生成远程服务契约，esbuild 输出 `lib/`。字体与必要形象嵌入页面产物；接收图片不上传到图片识别服务。

发布包使用 `package.json` 的文件白名单，包含预构建 `lib/`、bundle patch、许可证与使用文档。开发缓存、测试环境、日志和凭据不在包中。普通用户使用 Release `.tgz`，无需授权安装时执行源码构建。

## 与 Harness 的实际连接

- `dsh.bundle.patch` 指向 `cordis.patch.yml`，由官方插件管理器加入当前 profile。
- 客户端通过官方侧栏和布局服务注册“更多 → 分享与安装”；分离的页面使用受校验的消息通道连接 Host 远程服务。
- Host 读取官方技能目录服务与工作区注册表，调用当前模型获得可选建议。
- 插件安装调用 `pluginManager.installBundle`，主题应用调用 `configEditor.edit`；不会自己替换 Harness 安装器或写入一份模拟结果。
- `harness_share` 是注册到 Host 的 Agent 工具。`inspect` 展开二维码和安装计划；`install` 安装用户指定的条目。图片须位于当前项目内，支持 PNG/JPEG；客户端图片导入还支持浏览器可解码的 WebP。
- 技能写入后检查 Harness 是否能读取项目中的那份技能；文件安装成功、目录发现和活跃 Agent 读取不混为一个状态。

## 测试和兼容

`npm test` 使用本仓库的 Node 测试，覆盖二维码结构与容量、PNG/JPEG 纯像素读取、固定来源与哈希校验、安装选择、重复与冲突、危险路径、链接和安装锁。自动化文件测试不等于宿主加载验证，实际流程另外记录在 [VALIDATION.md](VALIDATION.md)。

本次只声明 DSH `0.2.2-rc.1`；升级 SDK 时应重新生成 Typert 契约，并在独立 DSH 数据目录中测试官方安装入口、侧栏、截图导入、技能、插件和主题，不先放宽兼容版本。

## 维护发布

1. 更新版本、锁文件、源码与必要文档；运行测试和构建。
2. 检查 `npm pack --dry-run` 的清单，核对第三方许可及隐私，生成安装包和 SHA-256。
3. 用固定 tag 发布 Release，匿名下载核对同一摘要，再通过官方入口安装该下载文件。
4. 使用真实截图更新 `screenshots.json` 和验证记录；截图中不包含机器路径、个人会话或账号信息。
5. 市场条目只更新本项目 YAML 的包链接和描述；官方展示帖沿用同一项目帖，避免重复投稿。

上游依据：[官方打包与安装文档](https://deepseek-harness.github.io/deepseek-harness/develop/basic/publish)、[插件市场贡献指南](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md)。
