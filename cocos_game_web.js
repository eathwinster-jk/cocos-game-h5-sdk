// 牛牛游戏 H5 接入脚本：在宿主页面容器内以 iframe 嵌入游戏，通过 postMessage 传递会话与事件。
(function initializeCocosGameWeb(global) {
  'use strict';
  const GAME_MESSAGE_SOURCE = 'cocos-game-web';
  const HOST_MESSAGE_SOURCE = 'cocos-game-host';
  const EVENT_NAME_PATTERN = /^[a-z][a-z0-9_.-]{0,63}$/;
  const FULLSCREEN_STYLE = 'position:fixed;inset:0;width:100vw;height:100vh;height:100dvh;border:0;z-index:2147483647;background:#000;';
  const EMBEDDED_STYLE = 'display:block;width:100%;height:100%;border:0;background:#000;';
  const MINI_DEFAULT_BACKGROUND = '#FFFFFF';
  // 宿主弹窗：手机竖屏内嵌时游戏把下注、记录与规则、退出确认交给宿主页面展示，样式与交互对齐原生 SDK。
  const DIALOG_STYLE_ID = 'cocos-game-web-dialog-style';
  const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
  const RECORD_FILTER_ALL = 'all';
  const RECORD_ID_KEYWORD_PATTERN = /^r?\d+$/i;
  const LOAD_MORE_THRESHOLD = 80;
  const SHEET_DRAG_CLOSE_RATIO = 0.25;
  const LAYER_EXIT_MS = 200;
  const MAX_CHOICE_COLUMNS = 4;
  const CENTS_PER_YUAN = 100;
  const MAX_CLIENT_BET_NO_LENGTH = 64;
  const DEFAULT_MASK_OPACITY = 0.6;
  const HOST_DIALOG_TEXTS = Object.freeze({
    rulesTitle: '记录与规则',
    roomTag: '本房间',
    recordsTab: '我的记录',
    rulesTab: '游戏规则',
    recordsEmpty: '暂无记录',
    betArea: '下注区域',
    betChip: '请加注筹码',
    exitTitle: '退出游戏?',
    exitMessage: '当前游戏正在进行中，离开后游戏将结束并结算。',
    exitLeave: '离开',
    cancel: '取消',
  });
  const TONE_COLORS = Object.freeze({ win: '#18a058', lose: '#e54848', draw: '#f08c1e' });
  const DIALOG_STYLE = `
.cgw-layer{position:fixed;inset:0;z-index:2147483646;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Helvetica Neue",Arial,sans-serif;-webkit-tap-highlight-color:transparent}
.cgw-layer *,.cgw-bet,.cgw-bet *{box-sizing:border-box}
.cgw-layer button[type],.cgw-bet button[type]{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;text-align:center;font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
.cgw-scrim{position:absolute;inset:0;background:linear-gradient(rgba(32,14,62,.59),rgba(6,30,38,.75));opacity:0;transition:opacity .28s ease-out}
.cgw-layer.is-open .cgw-scrim{opacity:1}
.cgw-layer.is-closing .cgw-scrim{opacity:0;transition-duration:.18s}
.cgw-sheet{position:absolute;left:0;right:0;bottom:0;height:75%;display:flex;flex-direction:column;background:#fff;border-radius:16px 16px 0 0;padding-bottom:env(safe-area-inset-bottom);transform:translateY(100%);transition:transform .28s ease-out}
.cgw-layer.is-open .cgw-sheet{transform:none}
.cgw-layer.is-closing .cgw-sheet{transform:translateY(100%);transition:transform .18s ease-in}
.cgw-drag{padding:8px 18px 6px;touch-action:none}
.cgw-handle{width:36px;height:4px;margin:0 auto 14px;border-radius:2px;background:#ddd}
.cgw-head{display:flex;align-items:center;gap:8px}
.cgw-title{font-size:20px;font-weight:700;color:#222}
.cgw-tag{padding:3px 9px;border-radius:12px;background:#26bfba;color:#fff;font-size:13px}
.cgw-tabs{display:flex;border-bottom:1px solid #eee}
.cgw-layer button.cgw-tab{flex:1;height:46px;position:relative;border:0;background:none;font-size:16px;color:#999}
.cgw-layer button.cgw-tab.is-selected{color:#222;font-weight:700}
.cgw-layer button.cgw-tab.is-selected::after{content:'';position:absolute;left:50%;bottom:4px;width:28px;height:3px;margin-left:-14px;border-radius:2px;background:#222}
.cgw-body{flex:1;min-height:0;position:relative}
.cgw-pane{position:absolute;inset:0;display:flex;flex-direction:column}
.cgw-pane[hidden]{display:none}
.cgw-scroll{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:0 16px 20px}
.cgw-rules{padding:4px 16px 24px}
.cgw-section{display:flex;align-items:center;gap:8px;margin-top:12px;padding:9px 10px;border-radius:8px;background:#e6f8f7;color:#26bfba;font-size:15px;font-weight:700}
.cgw-section::before{content:'';width:3px;height:14px;border-radius:2px;background:#26bfba}
.cgw-rule{padding:12px 0}
.cgw-rule+.cgw-rule{border-top:1px solid #eee}
.cgw-rule-head{display:flex;align-items:center;gap:12px}
.cgw-rule-title{font-size:16px;font-weight:700;color:#222;white-space:nowrap}
.cgw-rule-value{flex:1;text-align:right;font-size:13px;color:#444}
.cgw-rule-desc{margin-top:6px;font-size:13px;line-height:1.5;color:#666}
.cgw-segment{display:flex;margin:10px 16px 0;padding:3px;border-radius:18px;background:#f2f3f5}
.cgw-layer .cgw-segment button{flex:1;height:32px;border:0;border-radius:16px;background:none;font-size:14px;color:#999}
.cgw-layer .cgw-segment button.is-selected{background:#fff;color:#222;font-weight:700}
.cgw-banner{margin-top:12px;padding:8px 10px;border-radius:8px;background:#e6f8f7;color:#26bfba;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cgw-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.cgw-layer button.cgw-chip{padding:6px 12px;border:0;border-radius:14px;background:#f5f6f8;color:#666;font-size:13px}
.cgw-layer button.cgw-chip.is-selected{background:#e6f8f7;color:#26bfba;font-weight:700}
.cgw-stats{display:flex;gap:8px;margin-top:12px}
.cgw-stat{flex:1;min-width:0;padding:10px 6px 10px 10px;border-radius:8px;background:#f7f8fa}
.cgw-stat-value{font-size:18px;font-weight:700;color:#222}
.cgw-stat-label{margin-top:6px;font-size:12px;color:#999}
.cgw-item{display:flex;align-items:center;gap:10px;padding:12px 0}
.cgw-item+.cgw-item{border-top:1px solid #eee}
.cgw-item-texts{flex:1;min-width:0}
.cgw-item-title{font-size:14px;font-weight:700;color:#222}
.cgw-item-detail{margin-top:5px;font-size:12px;color:#999}
.cgw-item-result{font-size:14px;font-weight:700;white-space:nowrap;color:#222}
.cgw-controls{display:flex;gap:10px;height:36px;margin-top:12px}
.cgw-controls+.cgw-controls{margin-top:10px}
.cgw-select,.cgw-input{flex:1;min-width:0;height:36px;padding:0 10px;border:0;border-radius:8px;background:#f5f6f8;color:#222;font-size:13px;outline:none;-webkit-appearance:none;appearance:none}
.cgw-select{padding-right:26px;background:#f5f6f8 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0h10L5 6z' fill='%23999'/%3E%3C/svg%3E") no-repeat right 10px center}
.cgw-layer button.cgw-search{padding:0 18px;border:0;border-radius:8px;background:#26bfba;color:#fff;font-size:14px;font-weight:700}
.cgw-session{margin-top:10px;padding:12px;border:1px solid transparent;border-radius:10px;background:#f7f8fa}
.cgw-session.is-expanded{padding-bottom:4px;border-color:#26bfba;background:#f0fbfa}
.cgw-session-head{display:flex;align-items:center;gap:6px}
.cgw-session-title{flex:1;min-width:0;font-size:15px;font-weight:700;color:#222;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cgw-session-amount{font-size:15px;font-weight:700;white-space:nowrap;color:#222}
.cgw-session-arrow{font-size:14px;color:#999}
.cgw-session-detail{margin-top:6px;font-size:12px;color:#999}
.cgw-session-rounds{margin-top:10px;border-top:1px solid #eee}
.cgw-layer button.cgw-footer{display:block;width:100%;padding:16px 0;border:0;background:none;font-size:13px;color:#999}
.cgw-layer button.cgw-footer.is-retry{color:#26bfba}
.cgw-empty{padding:40px 0;text-align:center;font-size:14px;color:#999}
.cgw-bet{margin:8px 14px 0;padding:12px 16px 16px;border-radius:20px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.12);font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Helvetica Neue",Arial,sans-serif}
.cgw-bet-title{padding:6px 0;font-size:15px;color:#555}
.cgw-bet-title.is-chip{font-size:14px;color:#888}
.cgw-bet-row{display:grid;grid-template-columns:repeat(var(--cgw-columns),minmax(0,1fr));gap:12px;padding:2px 6px}
.cgw-bet button.cgw-choice{height:46px;padding:0 4px;border:0;border-radius:10px;background:#f5f6f8;color:#333;font-size:16px;white-space:nowrap;overflow:hidden}
.cgw-bet button.cgw-choice.is-selected{background:#c79953;color:#fff}
.cgw-confirm-layer{display:flex;align-items:center;justify-content:center}
.cgw-confirm{position:relative;width:300px;max-width:calc(100% - 48px);border-radius:24px;background:#fff;overflow:hidden;opacity:0;transform:scale(.85);transition:transform .28s cubic-bezier(.34,1.56,.64,1),opacity .28s}
.cgw-layer.is-open .cgw-confirm{opacity:1;transform:none}
.cgw-layer.is-closing .cgw-confirm{opacity:0;transform:scale(.9);transition-duration:.16s}
.cgw-confirm-title{padding:22px 24px 8px;text-align:center;font-size:18px;font-weight:700;color:#212121}
.cgw-confirm-message{padding:4px 24px 20px;text-align:center;font-size:15px;line-height:1.5;color:#5a5a5a}
.cgw-confirm-actions{display:flex;border-top:1px solid #e8e8e8}
.cgw-layer .cgw-confirm-actions button{flex:1;height:48px;border:0;background:none;font-size:16px;color:#666}
.cgw-layer .cgw-confirm-actions button+button{border-left:1px solid #e8e8e8}
`;

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
   * 创建元素并设置类名与纯文本内容（不解析 HTML）。
   */
  function createNode(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /**
   * 读取字符串字段，数字转为字符串，其他类型返回默认值。
   */
  function readString(json, key, fallback = '') {
    const value = json ? json[key] : undefined;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    return fallback;
  }

  /**
   * 读取数组字段。
   */
  function readArray(json, key) {
    const value = json ? json[key] : undefined;
    return Array.isArray(value) ? value : [];
  }

  /**
   * 读取对象字段。
   */
  function readObject(json, key) {
    const value = json ? json[key] : undefined;
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  /**
   * 将分格式化为金额，整元不带小数。
   */
  function formatCent(amountCent) {
    if (amountCent % CENTS_PER_YUAN === 0) return `¥${amountCent / CENTS_PER_YUAN}`;
    return `¥${(amountCent / CENTS_PER_YUAN).toFixed(2)}`;
  }

  /**
   * 生成下注幂等号。
   */
  function createClientBetNo() {
    const random = global.crypto && typeof global.crypto.randomUUID === 'function'
      ? global.crypto.randomUUID().replace(/-/g, '')
      : `${Date.now()}${Math.random().toString(16).slice(2)}`;
    return `h5-${random}`;
  }

  /**
   * 输赢色调对应的文字颜色。
   */
  function resolveToneColor(tone) {
    return TONE_COLORS[tone] || '#222';
  }

  /**
   * 首次使用宿主弹窗时注入样式。
   */
  function ensureDialogStyle() {
    if (document.getElementById(DIALOG_STYLE_ID)) return;
    const style = createNode('style');
    style.id = DIALOG_STYLE_ID;
    style.textContent = DIALOG_STYLE;
    document.head.appendChild(style);
  }

  /**
   * 按宿主 dialogMask 配置遮罩：透明但仍拦截点击、纯色或调整默认渐变的不透明度。
   */
  function applyScrimMask(scrim, mask) {
    if (!mask || typeof mask !== 'object') return;
    if (mask.visible === false) {
      scrim.style.background = 'transparent';
      return;
    }
    const opacity = Number(mask.opacity);
    const hasOpacity = mask.opacity !== undefined && Number.isFinite(opacity);
    const alpha = hasOpacity ? Math.min(1, Math.max(0, opacity)) : DEFAULT_MASK_OPACITY;
    if (typeof mask.color === 'string' && HEX_COLOR_PATTERN.test(mask.color)) {
      const value = parseInt(mask.color.slice(1), 16);
      scrim.style.background = `rgba(${value >> 16},${(value >> 8) & 255},${value & 255},${alpha})`;
    } else if (hasOpacity) {
      scrim.style.background = `linear-gradient(rgba(32,14,62,${alpha}),rgba(6,30,38,${alpha}))`;
    }
  }

  let scrollLockCount = 0;
  let savedRootOverflow = '';

  /**
   * 弹层打开期间锁定宿主页面滚动，多个弹层叠加时只在首个打开、最后一个关闭时切换。
   */
  function setPageScrollLocked(isLocked) {
    const root = document.documentElement;
    if (isLocked) {
      if (scrollLockCount === 0) savedRootOverflow = root.style.overflow;
      scrollLockCount += 1;
      root.style.overflow = 'hidden';
      return;
    }
    scrollLockCount = Math.max(0, scrollLockCount - 1);
    if (scrollLockCount === 0) root.style.overflow = savedRootOverflow;
  }

  /**
   * 创建铺满页面的弹层（遮罩 + 内容），挂载后播放进场动画。
   */
  function openLayer(className, mask, onScrimTap, content) {
    ensureDialogStyle();
    const root = createNode('div', `cgw-layer ${className}`);
    const scrim = createNode('div', 'cgw-scrim');
    applyScrimMask(scrim, mask);
    scrim.addEventListener('click', onScrimTap);
    root.append(scrim, content);
    document.body.appendChild(root);
    setPageScrollLocked(true);
    void root.offsetHeight;
    root.classList.add('is-open');
    return root;
  }

  /**
   * 关闭弹层：带动画时先播放退场再移除。
   */
  function closeLayer(root, isAnimated) {
    if (!root.isConnected || root.classList.contains('is-closing')) return;
    setPageScrollLocked(false);
    if (!isAnimated) {
      root.remove();
      return;
    }
    root.classList.add('is-closing');
    global.setTimeout(() => root.remove(), LAYER_EXIT_MS);
  }

  /**
   * 竖屏加注卡片：挂在游戏容器正下方，多注区时先选注区，点选筹码即提交并收起；倒计时结束自动收起。
   */
  function createBetCard(container, onSelection) {
    const card = createNode('div', 'cgw-bet');
    let roundId = '';
    let areas = [];
    let chipsCent = [];
    let selectedAreaIndex = 0;
    let isShowing = false;
    let timeoutId = 0;

    function createButtonRow(labels, isSelected, onTap) {
      const row = createNode('div', 'cgw-bet-row');
      row.style.setProperty('--cgw-columns', String(Math.min(labels.length, MAX_CHOICE_COLUMNS)));
      labels.forEach((label, index) => {
        const button = createNode('button', `cgw-choice${isSelected(index) ? ' is-selected' : ''}`, label);
        button.type = 'button';
        button.addEventListener('click', () => onTap(index));
        row.appendChild(button);
      });
      return row;
    }

    function render() {
      card.textContent = '';
      if (areas.length > 1) {
        card.appendChild(createNode('div', 'cgw-bet-title', HOST_DIALOG_TEXTS.betArea));
        card.appendChild(createButtonRow(areas.map((area) => readString(area, 'areaName')), (index) => index === selectedAreaIndex, (index) => {
          selectedAreaIndex = index;
          render();
        }));
      }
      card.appendChild(createNode('div', 'cgw-bet-title is-chip', HOST_DIALOG_TEXTS.betChip));
      card.appendChild(createButtonRow(chipsCent.map(formatCent), () => false, submit));
    }

    function submit(chipIndex) {
      if (!isShowing || !areas[selectedAreaIndex] || chipsCent[chipIndex] === undefined) return;
      const areaCode = readString(areas[selectedAreaIndex], 'areaCode');
      const amountCent = chipsCent[chipIndex];
      dismiss();
      onSelection(areaCode, amountCent);
    }

    function show(options) {
      const nextAreas = readArray(options, 'areas').filter((area) => readString(area, 'areaCode').length > 0);
      const nextChips = readArray(options, 'chipsCent').filter((cent) => Number.isSafeInteger(cent) && cent > 0);
      const nextRoundId = readString(options, 'roundId');
      if (nextAreas.length === 0 || nextChips.length === 0 || !nextRoundId) {
        console.error('CocosGameWeb 下注选项无效', options);
        dismiss();
        return;
      }
      if (nextRoundId === roundId && isShowing) return;
      roundId = nextRoundId;
      areas = nextAreas;
      chipsCent = nextChips;
      selectedAreaIndex = 0;
      isShowing = true;
      render();
      ensureDialogStyle();
      if (!card.isConnected) container.insertAdjacentElement('afterend', card);
      global.clearTimeout(timeoutId);
      const seconds = Number(options.countdownSeconds);
      if (Number.isFinite(seconds) && seconds > 0) timeoutId = global.setTimeout(dismiss, seconds * 1000);
    }

    function dismiss() {
      global.clearTimeout(timeoutId);
      isShowing = false;
      card.remove();
    }

    return Object.freeze({ show, dismiss });
  }

  /**
   * 「我的记录」视图：当前本桌 / 历史场次两个分段，筛选、搜索、分页由游戏查询后通过 update 回填。
   */
  function createRecordsView(initialRecords, callbacks) {
    const pane = createNode('div', 'cgw-pane');
    const segmentHost = createNode('div');
    const scroll = createNode('div', 'cgw-scroll');
    const searchInput = createNode('input', 'cgw-input');
    searchInput.type = 'search';
    searchInput.enterKeyHint = 'search';
    pane.append(segmentHost, scroll);
    let records = null;
    let isHistory = false;
    let filterKey = RECORD_FILTER_ALL;
    let periodIndex = 0;
    let sourceIndex = 0;
    let keyword = '';
    let hasInitializedExpand = false;
    let isLoadMoreRequested = false;
    const expandedKeys = new Set();

    function createSessionKey(session) {
      return readString(session, 'key') || `${readString(session, 'title')}|${readString(session, 'detail')}`;
    }

    function filterItems(items) {
      return items.filter((item) => item && (filterKey === RECORD_FILTER_ALL || readString(item, 'type') === filterKey));
    }

    function filterSessions(history) {
      const period = readArray(history, 'periods')[periodIndex];
      const days = period && Number.isFinite(Number(period.days)) ? Number(period.days) : Number.POSITIVE_INFINITY;
      const sources = readArray(history, 'sources');
      const source = sourceIndex > 0 && sourceIndex < sources.length ? String(sources[sourceIndex]) : null;
      const normalizedKeyword = keyword.trim().toLowerCase();
      const isSearchingById = RECORD_ID_KEYWORD_PATTERN.test(normalizedKeyword);
      return readArray(history, 'sessions').filter((session) => {
        if (!session || typeof session !== 'object') return false;
        const searchText = [readString(session, 'title'), readString(session, 'detail'), ...readArray(session, 'rounds').map((round) => readString(round, 'title'))]
          .join(' ').toLowerCase();
        return (isSearchingById || Number(session.daysAgo) <= days)
          && (!source || readString(session, 'source') === source)
          && (!normalizedKeyword || searchText.includes(normalizedKeyword))
          && (filterKey === RECORD_FILTER_ALL || readArray(session, 'types').includes(filterKey));
      });
    }

    function canLoadMore(list) {
      return list.hasMore === true && list.isLoadingMore !== true && readString(list, 'status', 'ready') !== 'loading';
    }

    function createSegment() {
      const segment = createNode('div', 'cgw-segment');
      [readString(records, 'currentTab'), readString(records, 'historyTab')].forEach((label, index) => {
        const button = createNode('button', isHistory === (index === 1) ? 'is-selected' : '', label);
        button.type = 'button';
        button.addEventListener('click', () => {
          isHistory = index === 1;
          applyQueryChange();
        });
        segment.appendChild(button);
      });
      return segment;
    }

    function createFilterChips() {
      const row = createNode('div', 'cgw-chips');
      readArray(records, 'filters').forEach((filter) => {
        const key = readString(filter, 'key', RECORD_FILTER_ALL);
        const chip = createNode('button', `cgw-chip${key === filterKey ? ' is-selected' : ''}`, readString(filter, 'label'));
        chip.type = 'button';
        chip.addEventListener('click', () => {
          filterKey = key;
          applyQueryChange();
        });
        row.appendChild(chip);
      });
      return row;
    }

    function appendBanner(text) {
      if (text) scroll.appendChild(createNode('div', 'cgw-banner', text));
    }

    function createStats(stats) {
      const row = createNode('div', 'cgw-stats');
      stats.forEach((stat) => {
        const card = createNode('div', 'cgw-stat');
        const value = createNode('div', 'cgw-stat-value', readString(stat, 'value'));
        value.style.color = resolveToneColor(readString(stat, 'tone'));
        card.append(value, createNode('div', 'cgw-stat-label', readString(stat, 'label')));
        row.appendChild(card);
      });
      return row;
    }

    function appendItems(parent, items) {
      items.forEach((item) => {
        const row = createNode('div', 'cgw-item');
        const texts = createNode('div', 'cgw-item-texts');
        texts.append(createNode('div', 'cgw-item-title', readString(item, 'title')), createNode('div', 'cgw-item-detail', readString(item, 'detail')));
        const result = createNode('div', 'cgw-item-result', readString(item, 'result'));
        result.style.color = resolveToneColor(readString(item, 'tone'));
        row.append(texts, result);
        parent.appendChild(row);
      });
    }

    function createSelect(labels, selectedIndex, onChange) {
      const select = createNode('select', 'cgw-select');
      labels.forEach((label, index) => {
        const option = createNode('option', '', label);
        option.value = String(index);
        select.appendChild(option);
      });
      select.value = String(selectedIndex);
      select.addEventListener('change', () => onChange(Number(select.value)));
      return select;
    }

    function createSessionCard(session) {
      const key = createSessionKey(session);
      const isExpanded = expandedKeys.has(key);
      const card = createNode('div', `cgw-session${isExpanded ? ' is-expanded' : ''}`);
      const head = createNode('div', 'cgw-session-head');
      const amount = createNode('div', 'cgw-session-amount', readString(session, 'amount'));
      amount.style.color = resolveToneColor(readString(session, 'tone'));
      head.append(createNode('div', 'cgw-session-title', readString(session, 'title')), amount, createNode('div', 'cgw-session-arrow', isExpanded ? '▴' : '▾'));
      card.append(head, createNode('div', 'cgw-session-detail', readString(session, 'detail')));
      if (isExpanded) {
        const rounds = createNode('div', 'cgw-session-rounds');
        appendItems(rounds, filterItems(readArray(session, 'rounds')));
        card.appendChild(rounds);
      }
      card.addEventListener('click', () => {
        if (expandedKeys.has(key)) expandedKeys.delete(key);
        else expandedKeys.add(key);
        render();
      });
      return card;
    }

    function appendListEnd(list, hasItems) {
      const texts = readObject(records, 'footer');
      const status = readString(list, 'status', 'ready');
      let text = '';
      let canRetry = false;
      if (status === 'loading' || list.isLoadingMore === true) {
        text = readString(texts, 'loading');
      } else if (status === 'error') {
        const message = readString(list, 'message');
        const retry = readString(texts, 'retry');
        text = message ? `${message}，${retry}` : retry;
        canRetry = true;
      } else if (list.hasMore === true) {
        text = readString(texts, 'loadMore');
      } else if (hasItems) {
        text = readString(texts, 'noMore');
      }
      if (!text) {
        scroll.appendChild(createNode('div', 'cgw-empty', readString(records, 'emptyText', HOST_DIALOG_TEXTS.recordsEmpty)));
        return;
      }
      const footer = createNode('button', `cgw-footer${canRetry ? ' is-retry' : ''}`, text);
      footer.type = 'button';
      footer.disabled = !canRetry && !canLoadMore(list);
      footer.addEventListener('click', requestLoadMore);
      scroll.appendChild(footer);
    }

    function renderCurrent() {
      const current = readObject(records, 'current');
      appendBanner(readString(current, 'banner'));
      scroll.appendChild(createFilterChips());
      scroll.appendChild(createStats(readArray(current, 'stats')));
      const items = filterItems(readArray(current, 'items'));
      appendItems(scroll, items);
      appendListEnd(readObject(current, 'list'), items.length > 0);
    }

    function renderHistory() {
      const history = readObject(records, 'history');
      appendBanner(readString(history, 'banner'));
      const dropdowns = createNode('div', 'cgw-controls');
      dropdowns.append(
        createSelect(readArray(history, 'periods').map((period) => readString(period, 'label')), periodIndex, (index) => {
          periodIndex = index;
          applyQueryChange();
        }),
        createSelect(readArray(history, 'sources').map(String), sourceIndex, (index) => {
          sourceIndex = index;
          render();
        }),
      );
      const searchRow = createNode('div', 'cgw-controls');
      const searchButton = createNode('button', 'cgw-search', readString(history, 'searchButton'));
      searchButton.type = 'button';
      searchButton.addEventListener('click', applySearch);
      searchRow.append(searchInput, searchButton);
      scroll.append(dropdowns, searchRow, createFilterChips());
      const sessions = filterSessions(history);
      sessions.forEach((session) => scroll.appendChild(createSessionCard(session)));
      appendListEnd(readObject(history, 'list'), sessions.length > 0);
    }

    function render() {
      const scrollTop = scroll.scrollTop;
      segmentHost.textContent = '';
      scroll.textContent = '';
      if (!records) {
        scroll.appendChild(createNode('div', 'cgw-empty', HOST_DIALOG_TEXTS.recordsEmpty));
        return;
      }
      segmentHost.appendChild(createSegment());
      if (isHistory) renderHistory();
      else renderCurrent();
      scroll.scrollTop = scrollTop;
    }

    function applyQueryChange() {
      render();
      scroll.scrollTop = 0;
      callbacks.onQuery({ isHistory, filterKey, periodIndex, keyword });
    }

    function applySearch() {
      searchInput.blur();
      keyword = searchInput.value;
      applyQueryChange();
    }

    function requestLoadMore() {
      if (isLoadMoreRequested) return;
      isLoadMoreRequested = true;
      callbacks.onLoadMore(isHistory);
    }

    function update(nextRecords) {
      records = nextRecords && typeof nextRecords === 'object' ? nextRecords : null;
      isLoadMoreRequested = false;
      searchInput.placeholder = readString(readObject(records, 'history'), 'searchPlaceholder');
      const firstSession = readArray(readObject(records, 'history'), 'sessions')[0];
      if (!hasInitializedExpand && firstSession && typeof firstSession === 'object') {
        hasInitializedExpand = true;
        expandedKeys.add(createSessionKey(firstSession));
      }
      render();
    }

    scroll.addEventListener('scroll', () => {
      if (!records) return;
      const list = readObject(readObject(records, isHistory ? 'history' : 'current'), 'list');
      if (!canLoadMore(list)) return;
      if (scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight <= LOAD_MORE_THRESHOLD) requestLoadMore();
    }, { passive: true });
    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') applySearch();
    });
    update(initialRecords);
    return Object.freeze({ element: pane, update });
  }

  /**
   * 按游戏下发的分组创建规则列表：分组标题 + 左标题、右侧值、下方说明的条目。
   */
  function createRulesList(sections) {
    const pane = createNode('div', 'cgw-pane');
    const scroll = createNode('div', 'cgw-scroll cgw-rules');
    sections.forEach((section) => {
      scroll.appendChild(createNode('div', 'cgw-section', readString(section, 'title')));
      readArray(section, 'items').forEach((item) => {
        const row = createNode('div', 'cgw-rule');
        const head = createNode('div', 'cgw-rule-head');
        head.append(createNode('div', 'cgw-rule-title', readString(item, 'title')), createNode('div', 'cgw-rule-value', readString(item, 'value')));
        row.append(head, createNode('div', 'cgw-rule-desc', readString(item, 'description')));
        scroll.appendChild(row);
      });
    });
    pane.appendChild(scroll);
    return pane;
  }

  /**
   * 「记录与规则」底部弹窗：75% 高度白色面板，点遮罩或下拉超过 25% 关闭，默认展示游戏规则。
   */
  function openRulesSheet(content, mask, callbacks) {
    const sections = readArray(content, 'sections');
    if (sections.length === 0) {
      console.error('CocosGameWeb 规则缺少 sections', content);
      return null;
    }
    const sheet = createNode('div', 'cgw-sheet');
    const drag = createNode('div', 'cgw-drag');
    const head = createNode('div', 'cgw-head');
    head.append(
      createNode('div', 'cgw-title', readString(content, 'title', HOST_DIALOG_TEXTS.rulesTitle)),
      createNode('div', 'cgw-tag', readString(content, 'roomTag', HOST_DIALOG_TEXTS.roomTag)),
    );
    drag.append(createNode('div', 'cgw-handle'), head);
    const tabs = createNode('div', 'cgw-tabs');
    const body = createNode('div', 'cgw-body');
    const recordsView = createRecordsView(readObject(content, 'records'), callbacks);
    const rulesPane = createRulesList(sections);
    body.append(rulesPane, recordsView.element);
    const tabButtons = [HOST_DIALOG_TEXTS.recordsTab, HOST_DIALOG_TEXTS.rulesTab].map((title, index) => {
      const button = createNode('button', 'cgw-tab', title);
      button.type = 'button';
      button.addEventListener('click', () => selectTab(index === 1));
      tabs.appendChild(button);
      return button;
    });
    sheet.append(drag, tabs, body);
    const root = openLayer('cgw-sheet-layer', mask, () => close(true), sheet);
    const scrim = root.firstChild;

    function selectTab(isRules) {
      tabButtons.forEach((button, index) => button.classList.toggle('is-selected', (index === 1) === isRules));
      rulesPane.hidden = !isRules;
      recordsView.element.hidden = isRules;
    }

    function resetDragStyle() {
      sheet.style.transition = '';
      sheet.style.transform = '';
      scrim.style.transition = '';
      scrim.style.opacity = '';
    }

    function bindDragToClose() {
      let startY = null;
      drag.addEventListener('pointerdown', (event) => {
        startY = event.clientY;
        drag.setPointerCapture(event.pointerId);
        sheet.style.transition = 'none';
        scrim.style.transition = 'none';
      });
      drag.addEventListener('pointermove', (event) => {
        if (startY === null) return;
        const distance = Math.max(0, event.clientY - startY);
        sheet.style.transform = `translateY(${distance}px)`;
        scrim.style.opacity = String(1 - distance / Math.max(1, sheet.offsetHeight));
      });
      const finish = (event) => {
        if (startY === null) return;
        const distance = Math.max(0, event.clientY - startY);
        startY = null;
        resetDragStyle();
        if (event.type === 'pointerup' && distance > sheet.offsetHeight * SHEET_DRAG_CLOSE_RATIO) close(true);
      };
      drag.addEventListener('pointerup', finish);
      drag.addEventListener('pointercancel', finish);
    }

    function close(isAnimated) {
      closeLayer(root, isAnimated);
    }

    selectTab(true);
    bindDragToClose();
    return Object.freeze({ updateRecords: recordsView.update, close, isOpen: () => root.isConnected && !root.classList.contains('is-closing') });
  }

  /**
   * 退出确认框：离开 / 取消，点遮罩视为取消；关闭时只回传一次决定。
   */
  function openExitConfirm(mask, onDecision) {
    const card = createNode('div', 'cgw-confirm');
    const actions = createNode('div', 'cgw-confirm-actions');
    let isDecided = false;
    const decide = (isConfirmed) => {
      if (isDecided) return;
      isDecided = true;
      closeLayer(root, true);
      onDecision(isConfirmed);
    };
    [[HOST_DIALOG_TEXTS.exitLeave, true], [HOST_DIALOG_TEXTS.cancel, false]].forEach(([text, isConfirmed]) => {
      const button = createNode('button', '', text);
      button.type = 'button';
      button.addEventListener('click', () => decide(isConfirmed));
      actions.appendChild(button);
    });
    card.append(
      createNode('div', 'cgw-confirm-title', HOST_DIALOG_TEXTS.exitTitle),
      createNode('div', 'cgw-confirm-message', HOST_DIALOG_TEXTS.exitMessage),
      actions,
    );
    const root = openLayer('cgw-confirm-layer', mask, () => decide(false), card);
    return Object.freeze({ cancel: () => decide(false) });
  }

  /**
   * 解析游戏下发的下注选项，注区、筹码或局号无效时返回 null；deadline 为毫秒时间戳。
   */
  function parseBetOptions(data) {
    const roundId = readString(data, 'roundId');
    const areas = readArray(data, 'areas')
      .filter((area) => readString(area, 'areaCode').length > 0)
      .map((area) => Object.freeze({ areaCode: readString(area, 'areaCode'), areaName: readString(area, 'areaName', readString(area, 'areaCode')) }));
    const chipsCent = readArray(data, 'chipsCent').filter((cent) => Number.isSafeInteger(cent) && cent > 0);
    if (!roundId || areas.length === 0 || chipsCent.length === 0) return null;
    const seconds = Number(data.countdownSeconds);
    const countdownSeconds = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
    return Object.freeze({
      roundId,
      countdownSeconds,
      deadline: Date.now() + countdownSeconds * 1000,
      areas: Object.freeze(areas),
      chipsCent: Object.freeze(chipsCent),
    });
  }

  /**
   * 下注协调：记录本局选项，校验提交并按 clientBetNo 防重复（结果返回前或成功后再次提交会被忽略）。
   */
  function createBetCoordinator() {
    let currentOptions = null;
    const pendingBetNos = new Set();
    const succeededBetNos = new Set();

    function openRound(options) {
      if (currentOptions && currentOptions.roundId === options.roundId) return false;
      succeededBetNos.clear();
      currentOptions = options;
      return true;
    }

    function closeRound() {
      const roundId = currentOptions ? currentOptions.roundId : '';
      currentOptions = null;
      return roundId;
    }

    function accept(request) {
      const { roundId, areaCode, amountCent, clientBetNo } = request || {};
      if (typeof clientBetNo !== 'string' || !clientBetNo.trim() || clientBetNo.length > MAX_CLIENT_BET_NO_LENGTH) {
        console.error(`CocosGameWeb clientBetNo 不能为空且不超过 ${MAX_CLIENT_BET_NO_LENGTH} 个字符`, request);
        return false;
      }
      const options = currentOptions;
      if (!options || options.roundId !== String(roundId) || Date.now() >= options.deadline) {
        console.warn('CocosGameWeb 本局不在下注时间内', request);
        return false;
      }
      if (!options.areas.some((area) => area.areaCode === areaCode) || !options.chipsCent.includes(amountCent)) {
        console.error('CocosGameWeb 无效注区或金额', request);
        return false;
      }
      if (pendingBetNos.has(clientBetNo) || succeededBetNos.has(clientBetNo)) {
        console.warn('CocosGameWeb 忽略重复下注提交', clientBetNo);
        return false;
      }
      pendingBetNos.add(clientBetNo);
      return true;
    }

    function handleResult(data) {
      const result = Object.freeze({
        roundId: readString(data, 'roundId'),
        areaCode: readString(data, 'areaCode'),
        amountCent: Number(data.amountCent) || 0,
        clientBetNo: readString(data, 'clientBetNo'),
        isSuccess: data.isSuccess === true,
        balanceCent: Number.isSafeInteger(data.balanceCent) ? data.balanceCent : null,
        errorMessage: readString(data, 'errorMessage'),
      });
      pendingBetNos.delete(result.clientBetNo);
      if (result.isSuccess) succeededBetNos.add(result.clientBetNo);
      return result;
    }

    function reset() {
      currentOptions = null;
      pendingBetNos.clear();
      succeededBetNos.clear();
    }

    return Object.freeze({ openRound, closeRound, accept, handleResult, reset });
  }

  /**
   * 宿主弹窗控制器：处理游戏的弹窗请求，操作结果经 sendResult 回传游戏。
   * 宿主传入 onBetOptions 即接管竖屏下注、传入 onShowRecords 即接管竖屏记录与规则、传入 onExitRequest 即接管退出确认；
   * 未传时由 SDK 在宿主页面展示自带界面。
   */
  function createHostDialogs(context) {
    let betCard = null;
    let rulesSheet = null;
    let exitConfirm = null;
    let exitToken = 0;
    const betCoordinator = createBetCoordinator();
    const isHostHandlingBet = typeof context.onBetOptions === 'function';
    const isHostHandlingRecords = typeof context.onShowRecords === 'function';

    function sendRecordsQuery(action, query) {
      context.sendResult({ type: 'recordsQuery', action, ...query, keyword: query.keyword || '' });
    }

    function sendBetSelection(areaCode, amountCent, clientBetNo) {
      context.sendResult({ type: 'betSelection', areaCode, amountCent, clientBetNo });
    }

    function showBetOptions(data) {
      const options = parseBetOptions(data);
      if (!options) {
        console.error('CocosGameWeb 下注选项无效', data);
        betCard?.dismiss();
        return;
      }
      const isNewRound = betCoordinator.openRound(options);
      if (isHostHandlingBet) {
        if (isNewRound) invokeCallback('onBetOptions', context.onBetOptions, options);
        return;
      }
      betCard = betCard || createBetCard(context.container, (areaCode, amountCent) => sendBetSelection(areaCode, amountCent, createClientBetNo()));
      betCard.show(data);
    }

    function closeBetRound() {
      betCard?.dismiss();
      const roundId = betCoordinator.closeRound();
      if (roundId) invokeCallback('onBetClosed', context.onBetClosed, roundId);
    }

    function submitBet(request) {
      if (!betCoordinator.accept(request)) return false;
      sendBetSelection(request.areaCode, request.amountCent, request.clientBetNo);
      return true;
    }

    function queryRecords(query) {
      const filterKey = query && typeof query.filterKey === 'string' && query.filterKey ? query.filterKey : RECORD_FILTER_ALL;
      const periodIndex = Math.max(0, Math.floor(Number(query && query.periodIndex) || 0));
      sendRecordsQuery('query', { isHistory: Boolean(query && query.isHistory), filterKey, periodIndex, keyword: query && query.keyword ? String(query.keyword) : '' });
      return true;
    }

    function loadMoreRecords(isHistory) {
      sendRecordsQuery('loadMore', { isHistory: Boolean(isHistory), filterKey: RECORD_FILTER_ALL, periodIndex: 0, keyword: '' });
      return true;
    }

    function showRules(content) {
      if (isHostHandlingRecords) {
        invokeCallback('onShowRecords', context.onShowRecords, content);
        return;
      }
      rulesSheet?.close(false);
      rulesSheet = openRulesSheet(content, context.dialogMask, {
        onQuery: (query) => sendRecordsQuery('query', query),
        onLoadMore: (isHistory) => sendRecordsQuery('loadMore', { isHistory, filterKey: RECORD_FILTER_ALL, periodIndex: 0, keyword: '' }),
      });
    }

    function requestExit() {
      exitConfirm?.cancel();
      exitToken += 1;
      const token = exitToken;
      const sendDecision = (isConfirmed) => {
        if (token !== exitToken) return;
        exitToken += 1;
        exitConfirm = null;
        context.sendResult({ type: 'exitDecision', isConfirmed: Boolean(isConfirmed) });
      };
      if (typeof context.onExitRequest === 'function') {
        invokeCallback('onExitRequest', context.onExitRequest, sendDecision);
        return;
      }
      exitConfirm = openExitConfirm(context.dialogMask, sendDecision);
    }

    function handle(method, payload) {
      const data = payload && typeof payload === 'object' ? payload : {};
      if (method === 'notifyBetOptions') {
        showBetOptions(data);
      } else if (method === 'dismissBetOptions') {
        closeBetRound();
      } else if (method === 'notifyBetResult') {
        invokeCallback('onBetResult', context.onBetResult, betCoordinator.handleResult(data));
      } else if (method === 'showRules') {
        showRules(data);
      } else if (method === 'updateRecords') {
        invokeCallback('onRecordsUpdated', context.onRecordsUpdated, data);
        if (rulesSheet?.isOpen()) rulesSheet.updateRecords(data);
      } else if (method === 'requestExitGame') {
        requestExit();
      } else {
        console.warn('CocosGameWeb 忽略未知弹窗请求', method);
      }
    }

    /**
     * 进入全屏或关闭游戏时收起全部宿主弹窗并通知宿主本局下注截止，未决定的退出确认按取消回传。
     */
    function dismissAll() {
      closeBetRound();
      rulesSheet?.close(false);
      rulesSheet = null;
      exitConfirm?.cancel();
    }

    /**
     * 关闭游戏时清空下注状态。
     */
    function reset() {
      dismissAll();
      betCoordinator.reset();
    }

    return Object.freeze({ handle, dismissAll, reset, submitBet, queryRecords, loadMoreRecords });
  }

  /**
   * 在容器内打开游戏，返回控制句柄 { sendEvent, setFullscreen, updateFullscreenState, setMiniMode, submitBet, queryRecords, loadMoreRecords, close }。
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
   *   hostDialogs          手机竖屏内嵌时由本页面展示下注卡片、记录与规则、退出确认，默认 true；全屏仍用游戏内弹窗
   *   onExitRequest(decide)          改写宿主退出确认：传入后由宿主自行弹窗，调用 decide(true) 离开、decide(false) 取消
   *   onBetOptions(options)          传入即由宿主自绘竖屏下注：options { roundId, countdownSeconds, deadline, areas:[{ areaCode, areaName }], chipsCent }，
   *                                  玩家选好后调用 submitBet；配套 onBetClosed(roundId)、onBetResult(result)
   *   onShowRecords(content)         传入即由宿主自绘竖屏记录与规则：content 含 title、sections 与 records；
   *                                  记录更新回调 onRecordsUpdated(records)，查询调用 queryRecords / loadMoreRecords
   *                                  （以上宿主回调仅在 hostDialogs 未关闭时生效，全屏时由游戏内弹窗展示）
   *   onExpandRequest()              玩家点击迷你条展开按钮：宿主恢复容器高度后调用 setMiniMode(false)；未传时直接退出迷你模式
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
    let isMiniMode = false;
    let miniBackgroundColor;
    let bodyOverflow = '';

    function postToGame(type, data) {
      if (isClosed || !iframe.contentWindow) return;
      iframe.contentWindow.postMessage({ source: HOST_MESSAGE_SOURCE, type, ...data }, gameOrigin);
    }

    const hostDialogs = options.hostDialogs === false ? null : createHostDialogs({
      container: options.container,
      dialogMask: options.dialogMask || null,
      onExitRequest: options.onExitRequest,
      onBetOptions: options.onBetOptions,
      onBetClosed: options.onBetClosed,
      onBetResult: options.onBetResult,
      onShowRecords: options.onShowRecords,
      onRecordsUpdated: options.onRecordsUpdated,
      sendResult: (message) => postToGame('dialogResult', { message }),
    });

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
      if (isFullscreen) hostDialogs?.dismissAll();
      postToGame('fullscreenChanged', { isFullscreen });
      invokeCallback('onFullscreenChange', options.onFullscreenChange, isFullscreen);
    }

    function updateFullscreenState(value) {
      const nextValue = Boolean(value);
      if (isClosed || nextValue === isFullscreen) return;
      isFullscreen = nextValue;
      notifyFullscreenState();
    }

    function setMiniMode(value, backgroundColor) {
      if (backgroundColor !== undefined && !HEX_COLOR_PATTERN.test(backgroundColor)) {
        throw new Error(`迷你条底色无效：${backgroundColor}`);
      }
      if (isClosed) return;
      isMiniMode = Boolean(value);
      miniBackgroundColor = backgroundColor;
      if (isMiniMode) setFullscreen(false);
      // 容器高度常为小数，画布取整后露出的边缘用宿主底色填充，避免透出黑线
      iframe.style.background = isMiniMode ? miniBackgroundColor || MINI_DEFAULT_BACKGROUND : '#000';
      postMiniMode();
    }

    function postMiniMode() {
      postToGame('miniModeChanged', { isMiniMode, backgroundColor: miniBackgroundColor });
    }

    function handleExpandRequest() {
      if (typeof options.onExpandRequest === 'function') invokeCallback('onExpandRequest', options.onExpandRequest);
      else setMiniMode(false);
    }

    function requestFullscreen(value) {
      if (isMiniMode) return;
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
      hostDialogs?.reset();
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
            hostDialogs: hostDialogs !== null,
          },
        });
        if (isMiniMode) postMiniMode();
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
      } else if (data.type === 'expandRequest') {
        handleExpandRequest();
      } else if (data.type === 'dialogChange') {
        handleDialogChange(Boolean(data.isVisible));
      } else if (data.type === 'hostDialog') {
        hostDialogs?.handle(String(data.method), data.payload);
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
      /**
       * 切换迷你条：宿主先把容器调整为 362:50 横条（或恢复原高度）再调用；
       * backgroundColor 为容器所在页面底色（'#RRGGBB'），用于迷你条圆角外区域，不传为白色。迷你模式下不可全屏。
       */
      setMiniMode,
      /**
       * 宿主自绘下注时提交：{ roundId, areaCode, amountCent, clientBetNo }；返回 true 表示已发出，结果经 onBetResult 回调；
       * 本局已截止、游戏已关闭、幂等号重复或注区金额不在本局选项内时返回 false。
       */
      submitBet(request) {
        return !isClosed && hostDialogs !== null && hostDialogs.submitBet(request);
      },
      /**
       * 宿主自绘记录时按条件查询：{ isHistory, filterKey, periodIndex, keyword }，结果经 onRecordsUpdated 回调。
       */
      queryRecords(query) {
        return !isClosed && hostDialogs !== null && hostDialogs.queryRecords(query);
      },
      /**
       * 宿主自绘记录时加载下一页，结果经 onRecordsUpdated 回调。
       */
      loadMoreRecords(isHistory) {
        return !isClosed && hostDialogs !== null && hostDialogs.loadMoreRecords(isHistory);
      },
      close,
    });
  }

  global.CocosGameWeb = Object.freeze({ open, createClientBetNo });
}(window));
