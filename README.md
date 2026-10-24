# Cocos Game H5 SDK

牛牛游戏 H5 接入脚本：在宿主网页的容器内以 iframe 嵌入游戏，会话与事件通过 `postMessage` 传递。

- 完整接入文档：https://eathwinster-jk.github.io/cocos-game-h5-docs/
- 在线 Demo：https://niuniu-web-test.pages.dev/sdk/demo/

## 引入

```html
<!-- 方式一：游戏站点托管（推荐，脚本与游戏版本始终一致） -->
<script src="https://niuniu-web-test.pages.dev/sdk/cocos_game_web.js"></script>

<!-- 方式二：固定版本 CDN -->
<script src="https://cdn.jsdelivr.net/gh/eathwinster-jk/cocos-game-h5-sdk@0.1.10/cocos_game_web.js"></script>
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
