# Cocos Game H5 SDK

牛牛游戏 H5 接入脚本：在宿主网页的容器内以 iframe 嵌入游戏，会话与事件通过 `postMessage` 传递。

- 完整接入文档：https://eathwinster-jk.github.io/cocos-game-h5-docs/
- 在线 Demo：https://niuniu-web-test.pages.dev/sdk/demo/

## 引入

```html
<!-- 方式一：游戏站点托管（推荐，脚本与游戏版本始终一致） -->
<script src="https://niuniu-web-test.pages.dev/sdk/cocos_game_web.js"></script>

<!-- 方式二：固定版本 CDN -->
<script src="https://cdn.jsdelivr.net/gh/eathwinster-jk/cocos-game-h5-sdk@0.3.5/cocos_game_web.js"></script>
```

## 快速开始

```html
<div id="GameContainer" style="width:100%;aspect-ratio:375/211"></div>
<script>
  const game = CocosGameWeb.open({
    container: document.getElementById('GameContainer'),
    gameUrl: 'https://niuniu-web-test.pages.dev/',
    session: {
      liveUserId: 425689,          // 宿主登录后的直播 UID
      imUserId: 428199,            // 宿主登录后的 IM UID
      liveToken: '<宿主登录 Token>',
      sceneType: 2,                // 1 直播间，2 IM 群
      sceneId: '0999000015',
    },
    onReady() {},
    onError(error) { console.error(error); },
  });
  // 离开页面时：game.close();
</script>
```

宿主页面域名需加入游戏白名单后才能嵌入，请联系我们登记域名。

## 返回与收起（0.3.0）

竖屏点击牌桌返回（或迷你条退出）时，游戏只通知宿主并带上牌局参数，是否退出、如何提示由宿主决定：

```js
const game = CocosGameWeb.open({
  // ...
  showBackButton: true,       // 牌桌返回按钮，默认显示
  showCollapseButton: true,   // 竖屏收起按钮（点击缩成迷你条），默认隐藏
  onBackClick(info) {
    if (!info.isPlaying) {          // 未在座（含游客）
      if (confirm('确定要离开游戏吗？')) game.exitGame();
      return;
    }
    if (info.isInGame) {            // 在座且本局未结束，不能离座
      if (confirm('本局进行中，可保留座位离开')) game.close();
      return;
    }
    if (confirm('是否离座？')) game.exitGame(); // 离座后关闭
    else game.close();                        // 保留座位关闭
  },
  onCollapseRequest() {             // 玩家点击收起按钮
    container.classList.add('game-mini');
    game.setMiniMode(true, '#F4F5F8');
  },
});

game.setBackButtonVisible(false);     // 随时隐藏/显示返回按钮
game.setCollapseButtonVisible(true);  // 随时隐藏/显示收起按钮
```

| 方法 | 说明 |
| --- | --- |
| `exitGame()` | 在座时先离座再关闭，完成后回调 `onClose`；本局未结束不能离座时游戏内提示且不关闭 |
| `close()` | 不离座（保留座位）直接关闭，回调 `onClose` |

`info` 字段：`tableId`、`roundId`、`stage`、`countdownSeconds`、`playMode`、`isPlaying`（是否在座）、`canLeave`（当前能否离座）、`isInGame`（在座且本局未结束）、`hasBet`、`isGuest`、`isMiniMode`、`isFullscreen`。

- 未传 `onBackClick` 时点击返回不做任何处理，游戏不会自行退出；旧回调 `onBack` 已废弃。
- 全屏时返回按钮退回内嵌，不回调 `onBackClick`。
- 未传 `onCollapseRequest` 时点击收起由 SDK 直接进入迷你模式，容器尺寸需宿主自行调整。
- 与 Android `onBackClicked` / `exitGame` / `closeGame`、iOS `gameSDKDidClickBack:` / `exitGame` / `close` 一致。

## 竖屏提示交给宿主（0.3.3）

竖屏下游戏弹出提示（如「加入失败，请稍后重试」）时，会通过 `onEvent` 回调 `game.toast`，载荷为 `{ message, level }`。宿主关闭游戏内提示后，可用自己的样式展示：

```js
const game = CocosGameWeb.open({
  // ...
  showGameToast: false,             // 竖屏不展示游戏内提示，默认 true
  onEvent(event, payload) {
    if (event === CocosGameWeb.Events.GAME_TOAST) {
      showHostToast(payload.message, payload.level); // level：error（红）/ info（金）/ success（绿）
    }
  },
});

game.setGameToastVisible(true);     // 随时切换是否展示游戏内提示
```

- 竖屏提示无论是否关闭游戏内展示都会回调 `game.toast`；全屏横屏时提示由游戏展示，不回调。
- `level` 取值可用常量 `CocosGameWeb.ToastLevels.ERROR` / `INFO` / `SUCCESS`。
- 与 Android `setGameToastVisible` / `GameEvents.GAME_TOAST`、iOS `setGameToastVisible:` / `CocosGameEventGameToast` 一致。

## 离座、关闭与登录失效（0.2.2）

```js
const game = CocosGameWeb.open({
  // ...
  onPlayingStateChange(isPlaying) { // 入座为 true；点击「退出」确认离座成功后为 false
    updateMySeatState(isPlaying);
  },
  onClose() {                       // 游戏已关闭并移出容器
    showMyGameEntry();
  },
  onSessionInvalid(message) {       // 登录失效（如 Token 过期），SDK 已关闭游戏
    goToLogin(message);
  },
});
```

- `onPlayingStateChange` 只在是否在座变化时回调，打开牌桌后会先回调一次当前状态；对应 Android `onPlayingStateChanged`、iOS `gameSDKDidChangePlayingState:`。
- `onClose` 在 `exitGame` 离座关闭、登录失效、宿主调用 `game.close()` 时都会回调。
- 打开游戏时登录态已失效（大厅返回 401），SDK 关闭游戏并回调 `onSessionInvalid`，不再停留在黑屏；网络异常等其他启动失败会在游戏区域显示原因和「重试」按钮，同时回调 `onError`。
- 事件名可使用常量：`CocosGameWeb.Events.LOGIN_REQUIRED`（`auth.login_required`）、`CocosGameWeb.Events.WALLET_BALANCE_CHANGED`（`wallet.balance_changed`）、`CocosGameWeb.Events.GAME_TOAST`（`game.toast`），登录提示的 `action` 取值为 `CocosGameWeb.LoginActions.JOIN` / `RECORDS` / `FULLSCREEN` / `BET`。
- 手机竖屏内嵌按竖屏设计稿展示，进入全屏后沿用竖屏布局整体等比放大。

## 游客观战（0.2.1）

未登录用户可以游客身份进入直播间观战，群聊必须登录（与 Android / iOS SDK 0.2.1 一致）。session 不传 `liveUserId` / `liveToken` 即为游客：

```js
const game = CocosGameWeb.open({
  container: document.getElementById('GameContainer'),
  gameUrl: 'https://niuniu-web-test.pages.dev/',
  session: {
    sceneType: 1,                // 游客仅支持直播间
    sceneId: '3947124',
    deviceId: 'h5-xxx',          // 建议传入宿主自己的稳定设备号；1~128 个字符，不含空白与控制字符
  },
  onEvent(name, payload) {
    if (name === CocosGameWeb.Events.LOGIN_REQUIRED) showLoginPrompt(payload.action);
  },
});
```

- 游客只能观战：牌桌不显示右上角余额，下注阶段不弹下注窗，也不通知宿主。
- 需要登录的操作统一通过 `onEvent('auth.login_required', { action })` 通知宿主，游戏内不弹提示：`join` 点击立即加入、`records` 点击记录与规则、`fullscreen` 点击全屏（不会进入全屏）、`bet` 观战时下注阶段点击在桌用户头像跟注（0.3.1 起）。
- 建议留在游戏页提示登录或跳转登录页；登录成功后再 `game.close()`，并用登录会话重新 `CocosGameWeb.open`。不要在事件回调里直接关闭牌桌。
- 带了任一登录字段即按登录严格校验，不会降级为游客。
- 建议宿主传入稳定的 `deviceId`。不传时 SDK 自动生成并保存在游戏域名的 localStorage，但 iframe 属于第三方存储，Safari 等浏览器会隔离或清理，游客编号可能变化。

## 手机竖屏宿主弹窗（0.1.10）

手机竖屏内嵌时，下注卡片、记录与规则、退出确认由 SDK 在宿主页面上展示（与 Android / iOS SDK 一致），全屏仍用游戏内弹窗，默认开启：

- `hostDialogs: false`：手机竖屏也使用游戏内弹窗。
- `onExitRequest(decide)`：改用宿主自己的退出确认框，调用 `decide(true)` 离开、`decide(false)` 取消。
- 下注卡片默认插入在游戏容器正下方，请为其预留约 120~200px 空间；也可以放进宿主自己的容器，见下一节。
- 0.1.11 起弹窗按钮样式不受宿主页面全局 `button` 样式影响。

## 竖屏下注弹窗：三种接入方式（0.3.5）

竖屏下注界面可以直接用 SDK 提供的加注卡片，也可以宿主自绘；用 SDK 卡片时还能指定放在哪个容器里。全屏时统一用游戏内弹窗。

| 方式 | 宿主要做的 | 界面 | 位置 |
| --- | --- | --- | --- |
| A. SDK 默认位置 | 什么都不用做 | SDK 加注卡片 | 游戏容器正下方 |
| B. 放入宿主容器 | 传 `betContainer` 或调用 `setBetContainer` | SDK 加注卡片 | 宿主容器内，撑满宽度、无外边距 |
| C. 宿主自绘 | 传 `onBetOptions` 等回调，调用 `submitBet` | 宿主界面 | 宿主决定 |

优先级：传了 `onBetOptions` 时 `betContainer` 不生效；否则有 `betContainer` 用方式 B，没有用方式 A。三种方式都要求 `hostDialogs` 未关闭。

```html
<div id="GameContainer" style="width:100%;aspect-ratio:375/211"></div>
<!-- 空元素即可：不要设置固定高度、min-height 或上下 padding，卡片收起后高度为 0 -->
<div id="BetSlot" style="margin:0 12px 8px"></div>

<script>
const game = CocosGameWeb.open({
  container: document.getElementById('GameContainer'),
  betContainer: document.getElementById('BetSlot'),
  gameUrl,
  session,
});

game.setBetContainer(document.getElementById('AnotherSlot')); // 运行中换位置，正在显示的卡片立即移动
game.setBetContainer(null);                                   // 回到游戏容器正下方
</script>
```

- `betContainer` 必须是页面元素，传其他值会抛出异常。
- SDK 会往该元素里追加卡片节点，Vue / React 中请用一个空元素，不要在里面渲染框架管理的子节点。
- 想让卡片悬浮，给容器加 `position: fixed` 等样式即可，卡片跟随容器。
- 卡片内容：在座玩家只显示筹码；观战点头像跟注时显示「观战下注」与金色「跟 昵称」标签，昵称过长时省略。

## 宿主自绘下注 / 记录 / 退出（0.2.0）

手机竖屏内嵌时，宿主可以用自己的界面接管下注、记录与规则、退出确认（与 Android / iOS SDK 0.2.0 一致）：传入对应回调即接管，未传时仍由 SDK 展示自带界面；全屏时始终使用游戏内弹窗。

```js
const game = CocosGameWeb.open({
  // ...
  onBetOptions(options) {          // 新一局可下注：{ roundId, countdownSeconds, deadline, areas:[{ areaCode, areaName }], chipsCent }
    showMyBetPanel(options);
  },
  onBetClosed(roundId) {           // 截止、进入全屏或关闭时收起该局面板
    hideMyBetPanel(roundId);
  },
  onBetResult(result) {            // { roundId, clientBetNo, areaCode, amountCent, isSuccess, errorMessage, balanceCent }
    showMyBetResult(result);
  },
  onShowRecords(content) {         // 玩家点击记录：content 含 title、sections 与 records
    showMyRecords(content);
  },
  onRecordsUpdated(records) {      // 记录数据刷新（切换页签、加载更多后）
    updateMyRecords(records);
  },
  onExitRequest(decide) {          // 退出确认：decide(true) 离开，decide(false) 取消
    decide(window.confirm('确定离开？'));
  },
  onEvent(event, payload) {        // 钱包余额：wallet.balance_changed { balanceCent }
    if (event === 'wallet.balance_changed') updateMyBalance(payload.balanceCent);
  },
});

// 玩家选好注区与筹码后提交，返回 false 表示本局已截止、参数无效或重复提交
game.submitBet({
  roundId: options.roundId,
  areaCode: options.areas[0].areaCode,
  amountCent: 100,
  clientBetNo: CocosGameWeb.createClientBetNo(),
});

// 记录查询 { isHistory, filterKey, periodIndex, keyword } 与加载更多，结果通过 onRecordsUpdated 返回
game.queryRecords({ isHistory: true });
game.loadMoreRecords(true);
```

- 同一局通常只回调一次 `onBetOptions`；从全屏回到竖屏时会以剩余倒计时重新回调。
- 0.3.2 起观战时点在桌用户头像「跟注」，同一局内会再次回调 `onBetOptions`，`areas` 只含被跟注的座位，请按新的 `areas` 刷新面板。
- `clientBetNo` 最长 64 位，用于幂等：失败可用同一单号重试，成功后重复提交会被拒绝。
- 金额单位均为分。

## 迷你条（0.1.12）

宿主可把牌桌缩小为 362:50 的横条，迷你条显示局数、阶段、头像、手牌与结算输赢、余额、展开和退出按钮；入座时显示自己，旁观时显示庄家。

```js
const game = CocosGameWeb.open({
  // ...
  onExpandRequest() {                       // 玩家点击迷你条展开按钮
    container.classList.remove('game-mini');
    game.setMiniMode(false);
  },
});

// 缩小：先把容器改成 362:50，再通知游戏，并传入容器所在页面底色
container.classList.add('game-mini');      // .game-mini { aspect-ratio: 362 / 50; }
game.setMiniMode(true, '#F4F5F8');
```

- 先调整容器尺寸再调用 `setMiniMode`；圆角由游戏绘制，圆角外填充 `backgroundColor`（`#RRGGBB`，缺省白色）。
- 迷你模式下不可进入全屏，处于全屏时进入迷你条会先退出全屏。
- 迷你条退出按钮与牌桌返回按钮一致，回调 `onBackClick`（`info.isMiniMode` 为 true）；未传 `onExpandRequest` 时点击展开由 SDK 直接调用 `setMiniMode(false)`，容器尺寸需宿主自行恢复。
- 迷你条期间不弹下注（不回调 `onBetOptions`），声音暂停；展开后恢复声音，本局未下注会重新推送。

## 预加载与刷新记录（0.3.4）

进入群 / 直播间时打开游戏并立即缩成迷你条，游戏在后台加载并同步牌局，用户点入口展开即显示牌桌；也可再用宿主元素盖住容器实现隐藏预加载。容器须保持在页面中且尺寸不为 0，不要用 `display: none`、`visibility: hidden`、`opacity: 0` 或移出视口隐藏。

```js
// 进入群 / 直播间
container.classList.add('game-mini');
const game = CocosGameWeb.open({ container, gameUrl, session, onRecordsUpdated, onExpandRequest });
game.setMiniMode(true, '#F4F5F8');

// 用户点击游戏入口
container.classList.remove('game-mini');
game.setMiniMode(false);

// 宿主下拉刷新记录：按当前筛选重新拉取第一页，结果经 onRecordsUpdated 返回
game.refreshRecords(false);   // true 为历史场次
```

- `refreshRecords` 游戏打开即可调用（含迷你条），记录页未打开过也可以；游戏已关闭时返回 false。
- 结果只在手机竖屏宿主弹窗模式下回调；游客调用时回调 `onEvent('auth.login_required', { action: 'records' })`。
- 切换群 / 直播间时先 `close()` 再 `open`；离开时关闭，不要在群列表对每个群预加载。

## 目录

| 路径 | 说明 |
| --- | --- |
| `cocos_game_web.js` | 接入脚本，无第三方依赖 |
| `demo/index.html` | 接入示例页 |

## 本地运行 Demo

```bash
python3 -m http.server 8090
# 浏览器打开 http://localhost:8090/demo/index.html
```

测试环境白名单已登记 `http://localhost:8090`、`http://localhost:9560`，本地联调页面用这两个端口启动即可。

- 白名单按「协议 + 域名 + 端口」完全匹配，`127.0.0.1`、局域网 IP、其他端口需单独登记。
- 直接双击打开 HTML（`file://`）无法嵌入。
