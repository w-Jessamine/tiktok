# 完赛项目提报草稿

## 基础信息

- 项目名称 / 课题：TikTok Shop VideoPilot / 电商场景 AIGC 带货视频生成系统
- 团队名称与成员名单：待补充
- 分工说明：待补充。建议拆分为前端交互、后端与长任务、AI/视频生成、部署与文档。

## 一句话核心业务价值

帮助 TikTok Shop 商家把商品素材快速转化为可预览、可导出的 15 秒以内带货视频，并通过分镜编辑和创作因子分析提升内容转化效率。

## 核心功能清单

1. 商品素材上传与来源声明。
2. 多粒度素材结构化：商品级标签、视频摘要、slice 级标签。
3. 商品信息 + Prompt + 模板的剧本生成。
4. 分镜级编辑：排序、时长、字幕、素材查询和单镜头重生成。
5. 一键成片：队列任务、进度 trace、FFmpeg 导出。
6. Mock 数据看板：创作因子与 CTR/CVR/GMV 关联展示。

## 端到端使用流程

用户进入系统后先创建商品 brief，填写标题、类目、卖点、目标人群和使用场景。随后上传商品图、商品视频或参考素材，并声明素材来源。系统将素材分析为标签、摘要和 slice 结构，供后续检索召回。用户在剧本工作台生成三套短视频剧本，并可调整 Prompt、字幕、镜头描述、分镜顺序和时长。确认剧本后进入创作工作台，选择竖版或横版，一键提交视频生成任务。任务中心展示排队、模型调用、素材召回、合成导出的 trace。任务完成后用户可以在预览区播放并下载 MP4。最后可以在数据看板查看不同创作因子的 mock 转化表现。

## 交付材料

- 在线 Demo 链接：待补充
- 演示视频链接：待补充
- 源代码仓库链接：待补充
- README / 运行说明：见仓库 `README.md`

## 技术说明

- 系统架构图：见 `docs/architecture.md`
- 核心技术栈：React、Node.js、TypeScript、Fastify、Prisma、PostgreSQL、Redis、BullMQ、S3-compatible storage、FFmpeg、Volcengine Ark provider。
- 大模型 / AI 能力使用说明：`packages/ai` 抽象 Ark、Hybrid、Mock Provider。默认 hybrid 模式先尝试真实模型，再回退 Mock，保证演示稳定。
- 关键工程难点与解决方案：
  - 长耗时任务：通过 BullMQ worker、任务状态机和 trace 记录解决。
  - 模型不稳定：通过 Zod schema 校验和 Mock fallback 兜底。
  - 视频生成链路复核：通过 FFmpeg 稳定导出 MP4，真实模型输出可逐步替换 mock clip。
  - 分镜干预：将 script 与 storyboard shot 分离，支持局部修改和重生成。
- 部署与访问说明：本地 Docker Compose；云部署参考 `render.yaml`。

## 结果说明

- 项目完成度：可用 MVP Demo。
- 项目亮点：
  - 端到端链路闭环，不只停留在 Prompt 生成。
  - 任务 trace 可解释长链路失败原因。
  - 创作因子看板把视频生成和电商转化叙事连接起来。

## 推荐补充

- 产品截图 / 页面图集：待演示环境跑通后补充。
- Prompt 策略 / Agent 流程图：可从 `packages/ai` 和 `docs/architecture.md` 延伸。
- 评测样例：建议准备美妆和家居两个样例商品。
