# Zelda 音效素材

本目录包含从 [Legend of Zelda sound effects by HelpTheWretched](https://noproblo.dayjo.org/zeldasounds/) 下载的 WAV 音效，整理自 Breath of the Wild 分类：

- `botw_fanfares/`：5 个提示音，包括获得物品、心之容器、精灵球和解谜提示。
- `botw_link/`：122 个林克动作/受伤/倒地音效，包括攻击、跳跃、攀爬、搬运、投掷和受伤。

下载包：

- `BOTW_Fanfares_20180509.zip`
- `BOTW_Link_20180701.zip`

所有文件均为 WAV PCM；提示音为 44.1 kHz 立体声，动作音效为站点提供的 24/28 kHz 单声道素材。

这些素材目前用于本地 demo 资源整理。项目现有 `src/game/audio.ts` 仍使用程序合成音效；如需切换为采样播放，可从这里选择对应文件接入。
