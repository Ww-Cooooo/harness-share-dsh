# 第三方声明

Harness Share 是社区独立项目。原创代码采用 MIT；以下字体、图片、第三方库和商标各自适用原许可，不被项目 MIT 重新授权。

## 字体

MiSans Regular / Medium，Version 4.009，小米官方发行，保留原 WOFF2 文件，未转换、未裁切。来源为 [小米字体下载页](https://hyperos.mi.com/font/zh/download/)。MiSans 使用小米独立的字体知识产权许可协议，并非 OFL 或 MIT；完整协议在 [licenses/MiSans-license.pdf](licenses/MiSans-license.pdf)。字体用于界面与分享卡，不能作为独立字体产品出售。

## DeepSeek 鲸鱼标志

轮廓取自 [DeepSeek Harness 官方 favicon](https://www.deepseek.com/harness/favicon.svg)。原轮廓保留，界面添加填色、位置变换与水环动画。DeepSeek 名称、标志和相关商标仍归其权利人；本项目不会授予商标权，也不表示 DeepSeek 官方赞助、审核或推荐。

## 社区鲸鱼娘

`ui/public/art/whale-community/whale-girl-zipzippipe.png`：图像作者 **ZipZipPipe**，角色原设 **上善无形**。

- [原帖及作者置顶许可](https://www.bilibili.com/opus/1233069202138464289)，2026-11-11 回查。
- [原设作者的非商业二创说明](https://www.bilibili.com/opus/1253873972180680713)。
- 许可：[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)，完整文本随包保留在 `licenses/CC-BY-NC-SA-4.0.txt`。
- 原图片文件未修改；卡片中缩放、排版并以画布混合方式呈现。带此插图的卡片须保留署名、来源及相同协议，限非商业使用。项目对构成改编作品的自身版面贡献同样按 CC BY-NC-SA 4.0 提供。

本地设计阶段用户提供的另一张 Q 版图没有核实公开许可，**不随公开源码或安装包分发**。公开版包含小鲸鱼与上述有许可的鲸鱼娘两款卡片，不声明 Q 版图可自由使用。

## 代码依赖

React、Ant Design 及 Ant Design Icons 提供界面；GSAP / @gsap/react 提供动画；Pts 绘制分享卡；@rc-component/qrcode 编码二维码；jsQR 解码二维码；pngjs 和 jpeg-js 供 Host 读取图片。Harness、Cordis、Typert、zod 等按 package.json 声明使用宿主共享实例或独立依赖。

GSAP 3.15.1 和 @gsap/react 使用 [GSAP Standard No Charge License](https://gsap.com/community/standard-license/)，并非 MIT。本项目是配置分享界面，没有提供与 Webflow 竞争的可视化动画制作工具。

实际构建使用的版本、逐包声明和许可文本见 [DEPENDENCIES.md](DEPENDENCIES.md) 与 `licenses/third-party/`；压缩代码中的原始声明同时保留在 `lib/*.LICENSE.txt`。
