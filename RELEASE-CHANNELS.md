# Harness Share：发布渠道与同步维护

核查日期：2026-11-12（北京时间）。本文件集中记录已核实的发布入口、投稿状态和维护位置。状态是本次核查的快照；每次发布、修改介绍或更换截图前，先回读对应页面，完成后更新本文件的日期、版本及回执。

## 当前公开版本

- 安装版本：[v0.2.0](https://github.com/Ww-Cooooo/harness-share-dsh/releases/tag/v0.2.0)，已发布版本；包名 `eh3-dsh-harness-share`。
- Release 附件：`.tgz`、`SHA256SUMS.txt`、`VERIFICATION-v0.2.0.txt`。
- 本地原型及 0.1.x 开发包不属于本公开仓库的已发布版本。

`main` 上的说明可以继续修订，固定标签和安装附件记录当时版本。历史 Release 不应改写成新版的功能说明；需要时只补勘误、来源链接或升级提示，并注明日期。

## 渠道清单

| 渠道 | 公开入口 | 核查时状态 | 以后要同步什么 |
| --- | --- | --- | --- |
| 源码、首页与仓库简介 | [harness-share-dsh](https://github.com/Ww-Cooooo/harness-share-dsh) | 公开 | README、安装与使用文档、截图，以及 GitHub About 的简介、主页和 Topics；About 不会随 README 自动改变。 |
| 安装包与发行说明 | [v0.2.0 Release](https://github.com/Ww-Cooooo/harness-share-dsh/releases/tag/v0.2.0)；[全部发行记录](https://github.com/Ww-Cooooo/harness-share-dsh/releases) | 已发布 | 新版本号、固定下载地址、校验摘要、变更及验证范围；保留旧版供回退。 |
| 社区目录投稿 | [PR #14326](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/14326)；[当前条目](https://github.com/Ww-Cooooo/awesome-dsh-plugin/blob/add-harness-share-v0.2.0/data/plugins/Ww-Cooooo__harness-share-dsh.yml) | 已投稿、未合并，尚未收录 | 同步条目的中英文介绍和固定版本 `tarball`；PR 正文内的版本、截图、验证摘要也要核对。 |
| 官方仓库展示区 | [Show Your Plugins! 帖 #12964](https://github.com/deepseek-ai/deepseek-harness/discussions/12964) | 已发帖，不等于官方推荐 | 编辑现有帖的介绍、版本、安装链接、截图及兼容边界；不为普通更新重复发帖。 |
| GitHub 话题发现 | [dsh-plugin](https://github.com/topics/dsh-plugin) | 仓库已设置该 Topic | 维护仓库 Topics、About 和 README；这是基于仓库元信息的发现入口，不是另一份安装包或审核回执。 |


本表只列已核实、由作者维护的入口。第三方目录可能自动抓取仓库或上游目录；若发现额外收录，应补上具体链接、上游来源及是否能直接编辑，不能默认所有网站都会同步更新。

## 尚未采用的分发方式与支持登记

- **npm 尚未发布。** 本次查询公共 npm 注册表，`eh3-dsh-harness-share` 返回 404；npm 格式的 tgz 不等于已经发布到 npm。不能把 `package.json` 里的包名当作可用的 npm 安装入口。
- 本清单没有把自建插件索引或其他市场当成已完成的独立发布。新增渠道后，必须登记真实 URL、维护位置、安装来源和回读结果。
- [作者支持意向表](https://trtgsjkv6r.feishu.cn/share/base/form/shrcnkRrxNyri4bOF9n48BIYWbb) 是独立登记入口，不是软件分发渠道。个人资料、表单草稿和提交截图不写入公开仓库；登记状态在作者本地记录中另行维护。登记不代表获批 Token、获推荐或被市场收录。

## 社区目录的具体维护位置

- 上游：`awesome-dsh-plugin/awesome-dsh-plugin`，条目：`data/plugins/Ww-Cooooo__harness-share-dsh.yml`。
- 当前投稿 fork：`Ww-Cooooo/awesome-dsh-plugin`；分支：`add-harness-share-v0.2.0`；PR：[#14326](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/14326)。
- 当前 `tarball` 指向 [eh3-dsh-harness-share-0.2.0.tgz](https://github.com/Ww-Cooooo/harness-share-dsh/releases/download/v0.2.0/eh3-dsh-harness-share-0.2.0.tgz)。它是固定版本地址；只发新 Release 不会自动把条目换成新版。
- **原 PR 未合并时**，在同一投稿分支更新本项目条目；**已合并后**，基于上游最新主分支另提更新 PR。提交前回读实际状态，避免依据本页旧快照操作。
- 只修改本项目条目；不手工改上游生成的目录页面或其他插件。截图来源由本仓库的 `screenshots.json` 和所引用的文件维护。
- PR 合并后还要确认主分支条目、生成目录和实际安装来源。检查通过、PR 合并、客户端可见分别记录，不互相代替。

核查结果：PR 仍为 OPEN；上游主分支尚无本条目。最近一次 Submission gate 的失败原因是检查当时仓库未满一天；截至本次核查已超过一天，但尚未取得新的通过或合并回执。规则说明旧结论会自动复查，无需空提交或重复投稿。

规则与更新方式见 [当前贡献指南](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md)。

## 本仓库需要一起检查的材料

[安装、更新与回退](INSTALL.md)、[二维码协议](QR-PROTOCOL.md)、[验证与演示](docs/VALIDATION.md)、[开发说明](docs/DEVELOPMENT.md)、[截图清单](screenshots.json)、`docs/demo/` 和 [第三方声明](NOTICE.md)。

当前介绍对应“选定内容的清单与安装信息”：不扩大成克隆完整环境、复制所有本地文件或保证外观完全一致。二维码协议或可分享来源改变时，同步协议、安装说明和展示帖；截图及形象素材继续遵守各自许可。

源码、当前说明和发行记录是维护依据。本机开发日志用于补充过程，不能成为唯一的发布去向记录；不要把私人聊天、账户信息或开发目录整体上传来补齐本页。

## 更新时逐项完成

| 变更类型 | 必查位置 | 完成依据 |
| --- | --- | --- |
| 只改介绍、来源或链接 | README、GitHub About、当前 Release 正文、市场条目与 PR 正文、现有展示帖 | 回读各处实际内容；历史版本仅做适用的勘误或升级提示，不写入不具备的新功能。 |
| 发布新功能或修复包 | 源码与包版本、锁文件、构建产物、安装/升级说明、新标签、新 Release、校验与验证记录，以及条目 tarball 和展示帖安装地址 | 匿名下载新附件核对摘要，使用该下载包验证受影响的安装与使用流程；不覆盖旧标签或旧附件。 |
| 更换截图或修改兼容范围 | README、演示/验证文档、screenshots.json、市场展示和官方帖；必要时更新包内兼容声明 | 图片对应实际版本，链接可访问；固定到旧标签或提交的图片不会随 main 更新，须按用途调整引用。 |
| 新增、关闭或迁移渠道 | 本页渠道表、所有仍引用旧地址的材料 | 保存真实新链接、状态和日期；能控制的旧入口给出迁移说明，不把失效入口继续标为可用。 |

发布收尾清单：

- [ ] 已确认本次对外版本与实际安装包一致，开发中的功能没有混进旧版介绍。
- [ ] 已逐项核对渠道表，给不适用项记明原因；只改 GitHub README 不代表其余入口已同步。
- [ ] 已核对固定安装链接、校验摘要、图片与关键文档；没有移动历史标签或覆盖同版本附件。
- [ ] 已回读原市场 PR 和主分支条目，记录“已投稿 / 已合并 / 可见”的实际状态；已核对原展示帖。
- [ ] 已记录本次日期、发布版本、源码提交、新的或继续使用的 PR/帖子，以及仍待完成的同步项。

可在此文件追加下面这样的简短记录，每次使用实际值，不直接复制占位内容：

> 日期；发布版本及源码提交；已同步的渠道与链接；验证结果；尚未完成项及原因。

## 本次维护记录

2026-11-12：对照公开仓库、Release、作者投稿及展示记录建立本清单，并从 README 提供入口。本次仅维护文档；未新增功能版本、重打包、覆盖附件、重复投稿或提交支持表。
