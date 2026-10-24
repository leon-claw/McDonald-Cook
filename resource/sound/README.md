# Zelda: Breath of the Wild 音频素材

本目录按来源保留了《旷野之息》的音效包和音乐曲目。它是可供项目按需挑选的素材库；游戏当前使用的少量音效仍由 `src/game/audio.ts` 明确引用。

`botw_music/` 与 `botw_sfx/` 是本地下载素材库，已加入 Git 忽略规则。游戏使用的 `selected/`、`botw_link/`、`botw_fanfares/` 和根目录 `manifest.json` 随项目提交。

## 目录

| 路径 | 内容 |
| --- | --- |
| `botw_link/` | 原有林克动作/语音样本，122 WAV |
| `botw_sfx/voices_link/` | 补充林克与狼林克语音包，280 WAV，其中林克 268 段、狼林克 12 段 |
| `botw_fanfares/` | 原有提示音，5 WAV |
| `selected/` | 当前接入游戏的拾取、烹饪、成功提示与两段角色笑声，5 WAV |
| `botw_sfx/animals/` | 动物音效 |
| `botw_sfx/characters/` | 角色音效 |
| `botw_sfx/enemies/` | 敌人音效 |
| `botw_sfx/bosses/` | Boss 音效 |
| `botw_sfx/environment/` | 环境音效 |
| `botw_sfx/equipment/` | 装备与道具音效 |
| `botw_sfx/misc_1/`、`misc_2/`、`misc_3/` | 杂项音效，包括 UI、暂停菜单、料理锅循环声及其他系统音效 |
| `botw_sfx/terrain_1/`、`terrain_2/` | 地面、移动等地形音效 |
| `botw_music/ost_211/` | 5 碟主原声曲目集，211 MP3，附逐曲 `manifest.json` |
| `botw_music/selection_24/` | 另一份 24 首精选音乐合集 |

11 个音效分类包合计 **9,382 个 WAV**，附带 **1,069 个 TXT 循环区段说明文件**。项目原有 `botw_link/` 与 `botw_fanfares/` 的 127 个 WAV 也保留。TXT 是来源包提供的循环标记，不是音频文件。

211 首主原声曲目包含料理失败、料理成功、料理大成功等曲目；杂项音效包含 `SE_Cooking_Loop.wav`、暂停菜单与脚印模式的素材。各文件保留来源包内的目录结构和原文件名，便于按类别检索。

## 来源与验证

- 音效包： [The Spriters Resource — Breath of the Wild](https://sounds.spriters-resource.com/nintendo_switch/thelegendofzeldabreathofthewild/)
- 211 首原声曲目： [KHInsider — Original Soundtrack](https://downloads.khinsider.com/game-soundtracks/album/legend-of-zelda-the-breath-of-the-wild-original-soundtrack-limited-edition)
- 24 首精选音乐： [Zelda Xtreme — Breath of the Wild](https://www.zeldaxtreme.com/soundtracks/breath-of-the-wild/)
- 原有林克与提示音素材： [HelpTheWretched Zelda Sounds](https://noproblo.dayjo.org/zeldasounds/)

音效 ZIP 均通过 CRC 校验后解压；WAV 文件已逐个验证可读取；211 首 MP3 已用 ffprobe 核对音频元数据。`manifest.json` 记录了音效包数量、ZIP 校验及音乐来源；`botw_music/ost_211/manifest.json` 记录每首音乐的来源页、下载文件、时长、大小和 SHA-256。

该清单覆盖《旷野之息》上述来源提供的 11 个音效包、补充的林克与狼林克语音包，以及 211 首主原声曲目，不包含其他独立语音包、其他版本附加碟或游戏内部所有动态音频层；不代表整个《塞尔达传说》系列。游戏按下表接入精选素材；如要播放其他文件，再在 `src/game/audio.ts` 中按需接入。

## 游戏当前使用的样本

`src/game/audio.ts` 直接引用 `selected/` 与 `botw_link/` 的 WAV；Vite 会为选中的素材生成部署路径，无需复制到 `public/`。

| 游戏事件 | 素材 | 触发时机 |
| --- | --- | --- |
| 拾取营地食材 | `selected/SYS_ItemGet_Common.wav` | 确实获得食材后 |
| 拿好食材 | `BOTW_Link_Lift1–9.wav` | 带着手持食材关闭背包时，随机变体且不连续重复 |
| 投入料理锅 | `BOTW_Link_Throw1–5.wav` | 第一份食材离手时（料理开始后 0.18 秒），每锅一次 |
| 烹饪过程 | `selected/BGM_CookingSuccess.wav` | 料理开始后 0.6 秒播放，约 4.9 秒，在 5.6 秒动画结束前播完 |
| 首次发现或再次完成成功食谱 | `selected/Event_Cook_Success.wav` | 料理结果出现时 |
| 料理成功角色语音 | `selected/PV618_00.wav`、`selected/PV618_02.wav` | 成功结果出现后 0.75 秒，两段交替播放，每锅一次 |
| 失败料理 | `BOTW_Link_LoseBalance.wav` | 结果出现时，配合下行提示音 |

菜单点击、选材与失败结果的下行提示仍使用合成音。拾取与成功提示加载失败时回退到合成音；角色语音加载失败时跳过。静音、取消料理、离开结果页和切到后台会停止正在播放及排队的声音。其余素材保留在素材库中，按需接入。

## 拾取提示音与料理角色语音

| 用途 | 文件 | 核对情况 |
| --- | --- | --- |
| 普通物品拾取提示 | `botw_sfx/misc_1/GetItemSound/SYS_ItemGet_Common.wav` | 独立提示音，约 0.985 秒 |
| 绿卢比拾取提示 | `botw_sfx/misc_1/GetItemSound/SE_S_GET_RUPEE_GREEN.wav` | 来源包按绿卢比命名 |
| 林克笑声候选 | `botw_sfx/voices_link/PlayerVoice/PV618_00.wav`、`PV618_01.wav`、`PV618_02.wav` | 已补下载；本地声音分类筛选中 `_00`、`_02` 最接近笑声，但尚未与实机料理成功场景逐段比对，不作为已确认的场景映射 |

林克语音来源：[Link & Wolf Link's Voice](https://sounds.spriters-resource.com/nintendo_switch/thelegendofzeldabreathofthewild/asset/405764/)。ZIP 已通过 CRC 校验，280 个 WAV 的头部和音频数据长度均已核验；原始编号文件名保留，详情见 `botw_sfx/voices_link/manifest.json`。其中 `_00`、`_02` 已复制到 `selected/`，用于本项目的料理成功角色语音。
