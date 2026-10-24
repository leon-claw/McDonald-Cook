# Zelda 音效素材

本目录包含从 [Legend of Zelda sound effects by HelpTheWretched](https://noproblo.dayjo.org/zeldasounds/) 下载的 WAV 音效，整理自 Breath of the Wild 分类：

- `botw_fanfares/`：5 个提示音，包括获得物品、心之容器、精灵球和解谜提示。
- `botw_link/`：122 个林克动作/受伤/倒地音效，包括攻击、跳跃、攀爬、搬运、投掷和受伤。

下载包：

- `BOTW_Fanfares_20180509.zip`
- `BOTW_Link_20180701.zip`

所有文件均为 WAV PCM；提示音为 44.1 kHz 立体声，动作音效为站点提供的 24/28 kHz 单声道素材。

## 游戏内对应关系

`src/game/audio.ts` 直接引用本目录的 WAV，Vite 会为选中的素材生成部署路径，无需复制到 `public/`。

| 游戏事件 | 素材 | 触发时机 |
| --- | --- | --- |
| 拾取营地食材 | `BOTW_Fanfare_SmallItem.wav` | 确实获得食材后 |
| 拿好食材 | `BOTW_Link_Lift1–9.wav` | 带着手持食材关闭背包时，随机变体且不连续重复 |
| 投入料理锅 | `BOTW_Link_Throw1–5.wav` | 第一份食材离手时（料理开始后 0.18 秒），每锅一次 |
| 首次发现成功食谱 | `BOTW_Secret.wav` | 料理结束，新食谱出现时 |
| 再次完成成功食谱 | `BOTW_Fanfare_Item.wav` | 料理结果出现时 |
| 失败料理 | `BOTW_Link_LoseBalance.wav` | 结果出现时，配合下行提示音 |

当前素材包没有背景音乐、料理曲、菜单音和脚步声。菜单点击、选材和锅内弹跳节奏继续使用合成音；心之容器、精灵球、攻击、受伤和倒地等声音保留在资源目录。

音效在首次点击后预加载和解码，按提示、人物、料理、结果分组控制音量与重叠。静音、离开结果页、重置进度和切到后台会停止相应声音及未播放的排队声音。桌面与手机都可通过右上角声音按钮开关，偏好随进度保存。素材加载失败时，提示音回退到合成音，人物语音跳过。
