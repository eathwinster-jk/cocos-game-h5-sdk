# Cocos Game H5 SDK

牛牛游戏 H5 接入脚本：在宿主网页的容器内以 iframe 嵌入游戏，会话与事件通过 `postMessage` 传递。

- 完整接入文档：https://eathwinster-jk.github.io/cocos-game-h5-docs/
- 在线 Demo：https://niuniu-web-test.pages.dev/sdk/demo/

## 引入

```html
<!-- 方式一：游戏站点托管（推荐，脚本与游戏版本始终一致） -->
<script src="https://niuniu-web-test.pages.dev/sdk/cocos_game_web.js"></script>

<!-- 方式二：固定版本 CDN -->
<script src="https://cdn.jsdelivr.net/gh/eathwinster-jk/cocos-game-h5-sdk@0.2.0/cocos_game_web.js"></script>
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

## 手机竖屏宿主弹窗（0.1.10）

手机竖屏内嵌时，下注卡片、记录与规则、退出确认由 SDK 在宿主页面上展示（与 Android / iOS SDK 一致），全屏仍用游戏内弹窗，默认开启：

- `hostDialogs: false`：手机竖屏也使用游戏内弹窗。
- `onExitRequest(decide)`：改用宿主自己的退出确认框，调用 `decide(true)` 离开、`decide(false)` 取消。
- 下注卡片插入在游戏容器正下方，请为其预留约 120~200px 空间。
- 0.1.11 起弹窗按钮样式不受宿主页面全局 `button` 样式影响。

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

- 同一局只回调一次 `onBetOptions`；从全屏回到竖屏时会以剩余倒计时重新回调。
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
- 退出按钮与牌桌返回按钮行为一致；未传 `onExpandRequest` 时点击展开由 SDK 直接调用 `setMiniMode(false)`，容器尺寸需宿主自行恢复。

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
