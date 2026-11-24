# Cocos Game H5 SDK

牛牛游戏 H5 接入脚本：在宿主网页的容器内以 iframe 嵌入游戏，会话与事件通过 `postMessage` 传递。

- 完整接入文档：https://eathwinster-jk.github.io/cocos-game-h5-docs/
- 在线 Demo：https://niuniu-web-test.pages.dev/sdk/demo/

## 引入

```html
<!-- 方式一：游戏站点托管（推荐，脚本与游戏版本始终一致） -->
<script src="https://niuniu-web-test.pages.dev/sdk/cocos_game_web.js"></script>

<!-- 方式二：固定版本 CDN -->
<script src="https://cdn.jsdelivr.net/gh/eathwinster-jk/cocos-game-h5-sdk@0.4.2/cocos_game_web.js"></script>
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
| `exitGame()` | 在座时先离座再关闭，完成后回调 `onClose`；0.3.6 起能否离座由服务端判断，对局中会预约本局结束后离座，暂不可离座时游戏内提示且不关闭 |
| `close()` | 不离座（保留座位）直接关闭，回调 `onClose` |

`info` 字段：`tableId`、`roundId`、`stage`、`countdownSeconds`、`playMode`、`isPlaying`（是否在座）、`canLeave`（当前能否离座）、`isInGame`（在座且本局未结束）、`hasBet`、`isGuest`、`isMiniMode`、`isFullscreen`。

- 未传 `onBackClick` 时点击返回不做任何处理，游戏不会自行退出；旧回调 `onBack` 已废弃。
- 全屏时返回按钮退回内嵌，不回调 `onBackClick`。
- 未传 `onCollapseRequest` 时点击收起由 SDK 直接进入迷你模式，容器尺寸需宿主自行调整。
- 与 Android `onBackClicked` / `exitGame` / `closeGame`、iOS `gameSDKDidClickBack:` / `exitGame` / `close` 一致。

## 离座确认文案与宿主自绘按钮（0.3.6）

离座确认文案改由服务端下发，`onExitRequest` 第二个参数为文案，宿主弹窗直接展示即可：

```js
const game = CocosGameWeb.open({
  // ...
  onExitRequest(decide, message) {  // message 为服务端离座确认文案，为空时 SDK 已回落为默认文案
    decide(window.confirm(message));
  },
});
```

- 入座后「退出」按钮始终可点，能否离座由服务端判断：可离座时立即离座；对局中预约本局结束后离座，并提示服务端文案。
- 未传 `onExitRequest` 时 SDK 自带的退出确认框同样展示服务端文案。

PC 等宿主可以隐藏牌桌内按钮，改用自己的按钮调用游戏：

```js
const game = CocosGameWeb.open({
  // ...
  deviceMode: 'desktop',        // 'auto'（默认，按浏览器判断）/ 'mobile' / 'desktop'
  showSoundButton: false,       // 隐藏声音按钮，改调 setMuted
  showRulesButton: false,       // 隐藏记录与规则按钮，改调 openRules
  showJoinButton: false,        // 隐藏「立即加入」与底注，改调 joinTable
  showFullscreenButton: false,  // 隐藏大屏按钮，改调 setFullscreen
  muted: false,                 // 初始是否静音，不传保持游戏默认（有声）
  onMutedChange(isMuted) {      // 玩家在牌桌内切换静音时回调
    syncMySoundButton(isMuted);
  },
});

game.setMuted(true);            // 游戏未启动时先记录，启动后生效
game.openRules();               // 打开记录与规则
game.joinTable();               // 立即加入，入座结果经 onPlayingStateChange 回调
game.setControlsVisible({ sound: true, rules: true }); // 批量切换：sound / rules / join / fullscreen / back / collapse
```

- `openRules` / `joinTable` 在游戏未启动或已关闭时返回 false。
- `setControlsVisible` 只更新传入的布尔字段，参数不是对象时抛出异常。
- `deviceMode: 'mobile'` 时竖屏内嵌由宿主页面展示下注等弹窗，全屏旋转为横屏；`'desktop'` 时弹窗在游戏内，全屏不旋转。

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
- `onExitRequest(decide, message)`：改用宿主自己的退出确认框，展示 `message`（0.3.6 起），调用 `decide(true)` 离开、`decide(false)` 取消。
- 0.4.1 起竖屏下注展示游戏热更新下发的底部下注抽屉，浮在页面最上层，不改动宿主布局；0.4.2 起下注与记录统一由热更新自绘弹窗展示，见下一节。
- 0.1.11 起弹窗按钮样式不受宿主页面全局 `button` 样式影响。
- 0.4.0 起记录与规则、退出确认优先展示游戏热更新下发的自绘弹窗（宿主页面上的透明 iframe），游戏未下发时仍用 SDK 自带弹窗；`onExitRequest` 等宿主回调优先级不变，接口无变化。

## 竖屏下注与记录（0.4.2）

手机竖屏内嵌时，下注、记录与规则统一由游戏随热更新下发的自绘弹窗展示（底部下注抽屉、记录与规则面板），浮在页面最上层、不改动宿主布局；筹码额度取自游戏后台的牌桌配置，样式与位置随游戏热更新调整，宿主无需任何代码。全屏时统一用游戏内弹窗。

- 下注抽屉：白色、无遮罩，打开时拦截宿主页面触摸，点抽屉外透明区域可提前关闭，下注成功或倒计时结束自动关闭。
- 弹窗页面还在加载时到来的下注先暂存，加载完成后立即弹出；记录与规则、退出确认打开时到来的下注，关闭后补弹；本局截止前未弹出则不再弹。
- 旧版本游戏模块未下发弹窗页面时，才使用 SDK 自带的加注卡片（默认在游戏容器正下方，可用 `betContainer` / `setBetContainer` 放进宿主容器）。

> 0.4.2 起以下宿主自绘接口已废弃：`onBetOptions`、`onBetClosed`、`onBetResult`、`onShowRecords`、`onRecordsUpdated` 传入也不再回调；`submitBet`、`queryRecords`、`loadMoreRecords`、`refreshRecords` 宿主无需调用。已接入的代码不会报错，升级后可删除。

## 宿主自绘退出确认（0.2.0）

传入 `onExitRequest` 即由宿主展示离座确认，全屏时仍使用游戏内弹窗：

```js
const game = CocosGameWeb.open({
  // ...
  onExitRequest(decide, message) { // 退出确认：展示 message，decide(true) 离开，decide(false) 取消
    decide(window.confirm(message));
  },
  onEvent(event, payload) {        // 钱包余额：wallet.balance_changed { balanceCent }
    if (event === 'wallet.balance_changed') updateMyBalance(payload.balanceCent);
  },
});
```

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
- 迷你条期间不弹下注，声音暂停；展开后恢复声音，本局未下注会重新推送。

## 预加载（0.3.4）

进入群 / 直播间时打开游戏并立即缩成迷你条，游戏在后台加载并同步牌局，用户点入口展开即显示牌桌；也可再用宿主元素盖住容器实现隐藏预加载。容器须保持在页面中且尺寸不为 0，不要用 `display: none`、`visibility: hidden`、`opacity: 0` 或移出视口隐藏。

```js
// 进入群 / 直播间
container.classList.add('game-mini');
const game = CocosGameWeb.open({ container, gameUrl, session, onExpandRequest });
game.setMiniMode(true, '#F4F5F8');

// 用户点击游戏入口
container.classList.remove('game-mini');
game.setMiniMode(false);
```

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
