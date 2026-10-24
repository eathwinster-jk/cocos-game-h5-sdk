// 牛牛游戏 H5 接入脚本：在宿主页面容器内以 iframe 嵌入游戏，通过 postMessage 传递会话与事件。
(function initializeCocosGameWeb(global) {
  'use strict';
  const GAME_MESSAGE_SOURCE = 'cocos-game-web';
  const HOST_MESSAGE_SOURCE = 'cocos-game-host';
  const EVENT_NAME_PATTERN = /^[a-z][a-z0-9_.-]{0,63}$/;
  const FULLSCREEN_STYLE = 'position:fixed;inset:0;width:100vw;height:100vh;height:100dvh;border:0;z-index:2147483647;background:#000;';
  const EMBEDDED_STYLE = 'display:block;width:100%;height:100%;border:0;background:#000;';

  /**
   * 校验接入参数，缺失时抛出带字段名的错误。
   */
  function validateOptions(options) {
    if (!options || typeof options !== 'object') throw new Error('CocosGameWeb.open 参数必须为对象');
    if (!(options.container instanceof HTMLElement)) throw new Error('container 必须为页面元素');
    if (typeof options.gameUrl !== 'string' || !options.gameUrl) throw new Error('gameUrl 不能为空');
    if (!options.session || typeof options.session !== 'object') throw new Error('session 不能为空');
  }

  /**
   * 生成带嵌入标记的游戏地址。
   */
  function createGameUrl(gameUrl) {
    const url = new URL(gameUrl, global.location.href);
    url.searchParams.set('embed', '1');
    return url;
  }

  /**
   * 安全调用宿主回调，回调异常不影响游戏。
   */
  function invokeCallback(name, callback, ...args) {
    if (typeof callback !== 'function') return;
    try {
      callback(...args);
    } catch (error) {
      console.error(`CocosGameWeb 回调 ${name} 执行失败`, error);
    }
  }

  /**
   * 在容器内打开游戏，返回控制句柄 { sendEvent, setFullscreen, updateFullscreenState, close }。
   * options：
   *   container            承载游戏的页面元素（建议宽高比 375:211）
   *   gameUrl              游戏页地址
   *   session              { liveUserId, imUserId, liveToken, sceneType, sceneId, tableId?, clientVersion?, deviceType? }
   *   showBackButton       是否显示牌桌返回按钮，默认 true
   *   showFullscreenButton 是否显示牌桌大屏按钮，默认 true
   *   onBack()                       改写返回按钮：传入后由宿主处理（玩家在座时游戏会先确认离座），默认关闭游戏
   *   onFullscreenRequest(isFullscreen) 改写大屏按钮：传入后由宿主处理，默认撑满 iframe
   *   dialogScope          弹窗范围：'game'（默认，只在游戏区域内）或 'fullscreen'（弹窗时临时全屏，关闭后还原）
   *   dialogMask           弹窗遮罩：{ visible?: boolean, color?: '#RRGGBB', opacity?: 0~1 }，不传用游戏默认渐变；
   *                        visible 为 false 时遮罩透明但仍拦截点击，避免误触牌桌
   *   onDialogChange(isVisible)       游戏内弹窗打开/全部关闭时回调
   *   onReady() / onError(error) / onSessionInvalid(message) / onEvent(event, payload) / onFullscreenChange(isFullscreen)
   */
  function open(options) {
    validateOptions(options);
    const gameUrl = createGameUrl(options.gameUrl);
    const gameOrigin = gameUrl.origin;
    const iframe = document.createElement('iframe');
    iframe.src = gameUrl.href;
    iframe.title = '牛牛游戏';
    iframe.allow = 'autoplay; fullscreen';
    iframe.style.cssText = EMBEDDED_STYLE;
    let isClosed = false;
    let isFullscreen = false;
    let isDialogExpanded = false;
    let bodyOverflow = '';

    function postToGame(type, data) {
      if (isClosed || !iframe.contentWindow) return;
      iframe.contentWindow.postMessage({ source: HOST_MESSAGE_SOURCE, type, ...data }, gameOrigin);
    }

    function setFullscreen(value) {
      const nextValue = Boolean(value);
      if (isClosed || nextValue === isFullscreen) return;
      isFullscreen = nextValue;
      if (isFullscreen) {
        bodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = bodyOverflow;
      }
      iframe.style.cssText = isFullscreen ? FULLSCREEN_STYLE : EMBEDDED_STYLE;
      notifyFullscreenState();
    }

    function notifyFullscreenState() {
      postToGame('fullscreenChanged', { isFullscreen });
      invokeCallback('onFullscreenChange', options.onFullscreenChange, isFullscreen);
    }

    function updateFullscreenState(value) {
      const nextValue = Boolean(value);
      if (isClosed || nextValue === isFullscreen) return;
      isFullscreen = nextValue;
      notifyFullscreenState();
    }

    function requestFullscreen(value) {
      if (typeof options.onFullscreenRequest === 'function') {
        invokeCallback('onFullscreenRequest', options.onFullscreenRequest, Boolean(value));
      } else {
        setFullscreen(value);
      }
    }

    function handleDialogChange(isVisible) {
      invokeCallback('onDialogChange', options.onDialogChange, isVisible);
      if (options.dialogScope !== 'fullscreen') return;
      if (isVisible && !isFullscreen) {
        isDialogExpanded = true;
        requestFullscreen(true);
      } else if (!isVisible && isDialogExpanded) {
        isDialogExpanded = false;
        requestFullscreen(false);
      }
    }

    function close() {
      if (isClosed) return;
      setFullscreen(false);
      isClosed = true;
      global.removeEventListener('message', handleMessage);
      iframe.remove();
    }

    function handleMessage(event) {
      const data = event.data;
      if (event.source !== iframe.contentWindow || event.origin !== gameOrigin) return;
      if (!data || data.source !== GAME_MESSAGE_SOURCE) return;
      if (data.type === 'ready') {
        postToGame('session', {
          session: options.session,
          ui: {
            showBackButton: options.showBackButton !== false,
            showFullscreenButton: options.showFullscreenButton !== false,
            dialogMask: options.dialogMask || null,
          },
        });
      } else if (data.type === 'started') {
        invokeCallback('onReady', options.onReady);
      } else if (data.type === 'error') {
        invokeCallback('onError', options.onError, new Error(data.message || '游戏启动失败'));
      } else if (data.type === 'back') {
        if (typeof options.onBack === 'function') invokeCallback('onBack', options.onBack);
        else close();
      } else if (data.type === 'sessionInvalid') {
        close();
        invokeCallback('onSessionInvalid', options.onSessionInvalid, data.message || '游戏会话已失效');
      } else if (data.type === 'event') {
        invokeCallback('onEvent', options.onEvent, data.event, data.payload || {});
      } else if (data.type === 'fullscreenRequest') {
        isDialogExpanded = false;
        requestFullscreen(data.isFullscreen);
      } else if (data.type === 'dialogChange') {
        handleDialogChange(Boolean(data.isVisible));
      }
    }

    global.addEventListener('message', handleMessage);
    options.container.appendChild(iframe);
    return Object.freeze({
      /**
       * 向游戏发送通用事件，payload 为普通对象。
       */
      sendEvent(event, payload) {
        if (!EVENT_NAME_PATTERN.test(event)) throw new Error(`事件名无效：${event}`);
        postToGame('event', { event, payload: payload || {} });
      },
      /**
       * 默认全屏：撑满或还原 iframe，并同步游戏内全屏图标；宿主主动调用后，弹窗关闭时不再自动还原。
       */
      setFullscreen(value) {
        isDialogExpanded = false;
        setFullscreen(value);
      },
      /**
       * 宿主自行处理全屏布局时，仅同步游戏内全屏图标状态。
       */
      updateFullscreenState,
      close,
    });
  }

  global.CocosGameWeb = Object.freeze({ open });
}(window));
