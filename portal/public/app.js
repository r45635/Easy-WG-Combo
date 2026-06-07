'use strict';

const I18N = {
  en: {
    'lang.label': 'Language',
    'portal.subtitle': 'Admin Portal',
    'login.passwordPlaceholder': 'Password',
    'login.submit': 'Sign in',
    'login.invalid': 'Invalid password',
    'auth.logout': 'Log out',
    'nav.dashboard': 'Dashboard',
    'nav.clients': 'VPN Clients',
    'nav.wireguard': 'WireGuard',
    'nav.adguard': 'AdGuard Home',
    'dashboard.refresh': '↻ Refresh',
    'dashboard.totalClients': 'Total clients',
    'dashboard.connected': 'Connected',
    'dashboard.dnsQueries': 'DNS queries today',
    'dashboard.blocked': 'Blocked',
    'dashboard.recentClients': 'Recent clients',
    'fail2ban.title': 'Fail2Ban',
    'fail2ban.refresh': '↻ Refresh bans',
    'fail2ban.jail': 'Jail',
    'fail2ban.current': 'Currently banned',
    'fail2ban.total': 'Total banned',
    'fail2ban.loading': 'Loading Fail2Ban status…',
    'fail2ban.disabled': 'Fail2Ban status is unavailable on this host.',
    'fail2ban.none': 'No banned IP addresses.',
    'fail2ban.unban': 'Unban',
    'fail2ban.unbanError': 'Unable to unban this IP.',
    'server.label': 'Server',
    'server.rename': '✎ Rename server',
    'server.prompt': 'Server name (letters, numbers, - and _ only):',
    'server.invalid': 'Invalid server name. Use only letters, numbers, - or _.',
    'dns.helpButton': '? DNS Filters',
    'common.loading': 'Loading…',
    'common.cancel': 'Cancel',
    'common.apply': 'Apply',
    'common.createArrow': 'Create →',
    'common.copy': '⎘ Copy',
    'common.gotIt': 'Got it',
    'common.close': 'Close',
    'common.processing': 'Processing…',
    'common.downloadConf': '↓ Download .conf',
    'client.new': '+ New client',
    'client.none': 'No client',
    'client.noneCreate': 'No clients - create one!',
    'client.nameRequired': 'Client name is required.',
    'client.createError': 'Error while creating client.',
    'client.createdTitle': 'Client created',
    'client.createdSuffix': 'created',
    'client.deleteConfirm': 'Delete client "{name}"?',
    'client.table.name': 'Name',
    'client.table.ip': 'VPN IP',
    'client.table.status': 'Status',
    'client.table.dns': 'DNS',
    'client.table.lastSeen': 'Last seen',
    'client.table.actions': 'Actions',
    'status.disabled': 'Disabled',
    'status.connected': 'Connected',
    'status.inactive': 'Inactive',
    'status.never': 'Never',
    'action.qrConfig': 'QR / Config',
    'action.disable': 'Disable',
    'action.enable': 'Enable',
    'action.changeDns': 'Change DNS filter',
    'action.delete': 'Delete',
    'copy.done': '✓ Copied',
    'time.secondsAgo': '{count}s ago',
    'time.minutesAgo': '{count}m ago',
    'time.hoursAgo': '{count}h ago',
    'time.daysAgo': '{count}d ago',
    'dns.filtered.label': 'Filtered',
    'dns.filtered.desc': 'Ads + malware blocked via AdGuard on the VPS',
    'dns.malware.label': 'Malware only',
    'dns.malware.desc': 'Cloudflare for Families - ads allowed',
    'dns.none.label': 'No filter',
    'dns.none.desc': 'Direct Cloudflare DNS - no restrictions',
    'modal.newClient.title': 'New WireGuard client',
    'modal.newClient.clientName': 'Client name',
    'modal.newClient.clientNamePlaceholder': 'iPhone-Vincent, Mac-Office...',
    'modal.newClient.dnsProtection': 'DNS protection',
    'modal.newClient.scanHint': 'Scan with the WireGuard app',
    'modal.newClient.creating': 'Creating…',
    'modal.qrConfig.title': 'Config & QR Code',
    'modal.qrConfig.copy': '⎘ Copy config',
    'modal.filter.title': 'Change DNS filter',
    'modal.filter.protectionLevel': 'Protection level',
    'modal.filter.newProtectionLevel': 'New protection level',
    'modal.filter.nonAdguardTitle': 'This client does not use AdGuard DNS.',
    'modal.filter.nonAdguardBody': 'The filter cannot be changed live. Pick a new level below - a new config will be generated and must be reimported on the device.',
    'modal.filter.reimportHint': 'Reimport on the device',
    'modal.filter.generateConfig': 'Generate new config',
    'modal.filter.updated': 'Filter updated: {label}',
    'modal.filter.generated': 'New config generated with: {label}',
    'modal.filter.clientInfo': '<strong>{name}</strong> - Current DNS: <code>{dns}</code>',
    'modal.help.title': 'DNS protection levels',
    'modal.help.filtered.main': 'Blocks <strong>ads</strong>, <strong>trackers</strong>, <strong>malware</strong> and <strong>phishing</strong>.',
    'modal.help.filtered.detail': 'Via AdGuard Home on the VPS - AdGuard DNS filter, AdAway and Malware filter lists. Faster pages and less unwanted content exposure.',
    'modal.help.filtered.reco': 'Recommended for: everyday devices.',
    'modal.help.malware.main': 'Blocks <strong>malware and phishing</strong>. Ads and trackers are allowed.',
    'modal.help.malware.detail': 'Via Cloudflare for Families (1.1.1.2) as upstream DNS. Ads remain visible.',
    'modal.help.malware.reco': 'Recommended for: devices already using an ad blocker (uBlock, etc.).',
    'modal.help.none.main': 'No blocking - direct DNS resolution via Cloudflare (1.1.1.1).',
    'modal.help.none.detail': 'Maximum compatibility. Useful for debugging or accessing resources usually filtered.',
    'modal.help.none.reco': 'Recommended for: developers, tests, specific cases.',
    'modal.help.noteLabel': 'Note:',
    'modal.help.noteBody': 'Only clients whose config uses <code>DNS = 10.8.0.1</code> can switch filters live. Others require a new configuration.',
    'nav.security': 'Security',
    'security.refresh': '↻ Refresh',
    'security.config.bantime': 'Ban duration',
    'security.config.findtime': 'Detection window',
    'security.config.maxretry': 'Max attempts',
    'security.bans.title': 'Active bans',
    'security.bans.unbanAll': 'Unban all',
    'security.bans.banBtn': 'Ban',
    'security.bans.ipPlaceholder': 'e.g. 1.2.3.4',
    'security.bans.none': 'No banned IP addresses.',
    'security.bans.confirmUnbanAll': 'Unban all {n} IP address(es)?',
    'security.logs.title': 'Access log',
    'security.logs.all': 'All',
    'security.logs.errors': 'Errors (4xx/5xx)',
    'security.logs.attempts': '401 only',
    'security.logs.autoRefresh': 'Auto-refresh',
    'security.logs.empty': 'No log entries.',
    'security.logs.noFile': 'Log file not available yet.',
    'security.logs.entries': '{count} entries shown ({total} matching)',
    'security.logs.time': 'Time',
    'security.logs.ip': 'IP',
    'security.logs.method': 'Method',
    'security.logs.uri': 'Path',
    'security.logs.status': 'Status',
    'security.logs.duration': 'Duration',
  },
  fr: {
    'lang.label': 'Langue',
    'portal.subtitle': 'Portail admin',
    'login.passwordPlaceholder': 'Mot de passe',
    'login.submit': 'Connexion',
    'login.invalid': 'Mot de passe incorrect',
    'auth.logout': 'Déconnexion',
    'nav.dashboard': 'Dashboard',
    'nav.clients': 'Clients VPN',
    'nav.wireguard': 'WireGuard',
    'nav.adguard': 'AdGuard Home',
    'dashboard.refresh': '↻ Actualiser',
    'dashboard.totalClients': 'Clients total',
    'dashboard.connected': 'Connectés',
    'dashboard.dnsQueries': 'Requêtes DNS aujourd\'hui',
    'dashboard.blocked': 'Bloquées',
    'dashboard.recentClients': 'Clients récents',
    'fail2ban.title': 'Fail2Ban',
    'fail2ban.refresh': '↻ Actualiser les bannissements',
    'fail2ban.jail': 'Prison',
    'fail2ban.current': 'Bannis actuellement',
    'fail2ban.total': 'Total bannis',
    'fail2ban.loading': 'Chargement de l\'état Fail2Ban…',
    'fail2ban.disabled': 'L\'état Fail2Ban est indisponible sur cet hôte.',
    'fail2ban.none': 'Aucune IP bannie.',
    'fail2ban.unban': 'Débannir',
    'fail2ban.unbanError': 'Impossible de débannir cette IP.',
    'server.label': 'Serveur',
    'server.rename': '✎ Renommer le serveur',
    'server.prompt': 'Nom du serveur (lettres, chiffres, - et _ uniquement) :',
    'server.invalid': 'Nom invalide. Utilisez uniquement des lettres, chiffres, - ou _.',
    'dns.helpButton': '? Filtres DNS',
    'common.loading': 'Chargement…',
    'common.cancel': 'Annuler',
    'common.apply': 'Appliquer',
    'common.createArrow': 'Créer →',
    'common.copy': '⎘ Copier',
    'common.gotIt': 'Compris',
    'common.close': 'Fermer',
    'common.processing': 'En cours…',
    'common.downloadConf': '↓ Télécharger .conf',
    'client.new': '+ Nouveau client',
    'client.none': 'Aucun client',
    'client.noneCreate': 'Aucun client - créez-en un !',
    'client.nameRequired': 'Le nom est requis.',
    'client.createError': 'Erreur lors de la création.',
    'client.createdTitle': 'Client créé',
    'client.createdSuffix': 'créé',
    'client.deleteConfirm': 'Supprimer le client "{name}" ?',
    'client.table.name': 'Nom',
    'client.table.ip': 'IP VPN',
    'client.table.status': 'Statut',
    'client.table.dns': 'DNS',
    'client.table.lastSeen': 'Dernière connexion',
    'client.table.actions': 'Actions',
    'status.disabled': 'Désactivé',
    'status.connected': 'Connecté',
    'status.inactive': 'Inactif',
    'status.never': 'Jamais',
    'action.qrConfig': 'QR / Config',
    'action.disable': 'Désactiver',
    'action.enable': 'Activer',
    'action.changeDns': 'Changer le filtre DNS',
    'action.delete': 'Supprimer',
    'copy.done': '✓ Copié',
    'time.secondsAgo': 'Il y a {count}s',
    'time.minutesAgo': 'Il y a {count}min',
    'time.hoursAgo': 'Il y a {count}h',
    'time.daysAgo': 'Il y a {count}j',
    'dns.filtered.label': 'Filtré complet',
    'dns.filtered.desc': 'Pubs + malware bloqués via AdGuard sur le VPS',
    'dns.malware.label': 'Malware seulement',
    'dns.malware.desc': 'Cloudflare for Families - pubs autorisées',
    'dns.none.label': 'Sans filtre',
    'dns.none.desc': 'DNS direct Cloudflare - aucune restriction',
    'modal.newClient.title': 'Nouveau client WireGuard',
    'modal.newClient.clientName': 'Nom du client',
    'modal.newClient.clientNamePlaceholder': 'iPhone-Vincent, Mac-Bureau…',
    'modal.newClient.dnsProtection': 'Protection DNS',
    'modal.newClient.scanHint': 'Scanner avec l\'app WireGuard',
    'modal.newClient.creating': 'Création…',
    'modal.qrConfig.title': 'Config & QR Code',
    'modal.qrConfig.copy': '⎘ Copier config',
    'modal.filter.title': 'Changer le filtre DNS',
    'modal.filter.protectionLevel': 'Niveau de protection',
    'modal.filter.newProtectionLevel': 'Nouveau niveau de protection',
    'modal.filter.nonAdguardTitle': 'Ce client n\'utilise pas AdGuard DNS.',
    'modal.filter.nonAdguardBody': 'Le filtre ne peut pas être changé à la volée. Choisissez un nouveau niveau ci-dessous - une nouvelle config sera générée à réimporter sur l\'appareil.',
    'modal.filter.reimportHint': 'Réimporter sur l\'appareil',
    'modal.filter.generateConfig': 'Générer nouvelle config',
    'modal.filter.updated': 'Filtre mis à jour : {label}',
    'modal.filter.generated': 'Nouvelle config générée avec : {label}',
    'modal.filter.clientInfo': '<strong>{name}</strong> - DNS actuel : <code>{dns}</code>',
    'modal.help.title': 'Niveaux de protection DNS',
    'modal.help.filtered.main': 'Bloque les <strong>publicités</strong>, les <strong>trackers</strong>, les <strong>malwares</strong> et le <strong>phishing</strong>.',
    'modal.help.filtered.detail': 'Via AdGuard Home sur le VPS - listes AdGuard DNS filter, AdAway et Malware filter. Les pages se chargent plus vite, moins d\'exposition aux contenus indésirables.',
    'modal.help.filtered.reco': 'Recommandé pour : tous les appareils du quotidien.',
    'modal.help.malware.main': 'Bloque les <strong>malwares et le phishing</strong>. Les publicités et trackers passent.',
    'modal.help.malware.detail': 'Via Cloudflare for Families (1.1.1.2) comme DNS upstream. Les pubs restent visibles.',
    'modal.help.malware.reco': 'Recommandé pour : appareils où un bloqueur de pub est déjà installé (uBlock, etc.).',
    'modal.help.none.main': 'Aucun blocage - résolution DNS directe via Cloudflare (1.1.1.1).',
    'modal.help.none.detail': 'Compatibilité maximale. Utile pour le débogage ou accéder à des ressources normalement filtrées.',
    'modal.help.none.reco': 'Recommandé pour : développeurs, tests, cas spécifiques.',
    'modal.help.noteLabel': 'Note :',
    'modal.help.noteBody': 'Seuls les clients dont la config utilise <code>DNS = 10.8.0.1</code> peuvent changer de filtre à la volée. Les autres nécessitent une nouvelle configuration.',
    'nav.security': 'Sécurité',
    'security.refresh': '↻ Actualiser',
    'security.config.bantime': 'Durée de bannissement',
    'security.config.findtime': 'Fenêtre de détection',
    'security.config.maxretry': 'Tentatives max',
    'security.bans.title': 'Bans actifs',
    'security.bans.unbanAll': 'Tout débannir',
    'security.bans.banBtn': 'Bannir',
    'security.bans.ipPlaceholder': 'ex. 1.2.3.4',
    'security.bans.none': 'Aucune IP bannie.',
    'security.bans.confirmUnbanAll': 'Débannir les {n} adresse(s) IP ?',
    'security.logs.title': 'Journal d’accès',
    'security.logs.all': 'Tout',
    'security.logs.errors': 'Erreurs (4xx/5xx)',
    'security.logs.attempts': '401 seulement',
    'security.logs.autoRefresh': 'Actualisation auto',
    'security.logs.empty': 'Aucune entrée.',
    'security.logs.noFile': 'Fichier de log non disponible.',
    'security.logs.entries': '{count} entrées affichées ({total} correspondantes)',
    'security.logs.time': 'Heure',
    'security.logs.ip': 'IP',
    'security.logs.method': 'Méthode',
    'security.logs.uri': 'Chemin',
    'security.logs.status': 'Statut',
    'security.logs.duration': 'Durée',
  },
  zh: {
    'lang.label': '语言',
    'portal.subtitle': '管理门户',
    'login.passwordPlaceholder': '密码',
    'login.submit': '登录',
    'login.invalid': '密码错误',
    'auth.logout': '退出登录',
    'nav.dashboard': '仪表盘',
    'nav.clients': 'VPN 客户端',
    'nav.wireguard': 'WireGuard',
    'nav.adguard': 'AdGuard Home',
    'dashboard.refresh': '↻ 刷新',
    'dashboard.totalClients': '客户端总数',
    'dashboard.connected': '已连接',
    'dashboard.dnsQueries': '今日 DNS 请求',
    'dashboard.blocked': '已拦截',
    'dashboard.recentClients': '最近客户端',
    'fail2ban.title': 'Fail2Ban',
    'fail2ban.refresh': '↻ 刷新封禁',
    'fail2ban.jail': '监狱',
    'fail2ban.current': '当前封禁',
    'fail2ban.total': '累计封禁',
    'fail2ban.loading': '正在加载 Fail2Ban 状态…',
    'fail2ban.disabled': '当前主机无法读取 Fail2Ban 状态。',
    'fail2ban.none': '暂无被封禁 IP。',
    'fail2ban.unban': '解封',
    'fail2ban.unbanError': '无法解封该 IP。',
    'server.label': '服务器',
    'server.rename': '✎ 重命名服务器',
    'server.prompt': '服务器名称（仅允许字母、数字、- 和 _）：',
    'server.invalid': '服务器名称无效。仅允许字母、数字、- 和 _。',
    'dns.helpButton': '? DNS 过滤说明',
    'common.loading': '加载中…',
    'common.cancel': '取消',
    'common.apply': '应用',
    'common.createArrow': '创建 →',
    'common.copy': '⎘ 复制',
    'common.gotIt': '明白了',
    'common.close': '关闭',
    'common.processing': '处理中…',
    'common.downloadConf': '↓ 下载 .conf',
    'client.new': '+ 新建客户端',
    'client.none': '暂无客户端',
    'client.noneCreate': '暂无客户端 - 请先创建一个！',
    'client.nameRequired': '必须填写客户端名称。',
    'client.createError': '创建客户端时出错。',
    'client.createdTitle': '客户端已创建',
    'client.createdSuffix': '已创建',
    'client.deleteConfirm': '删除客户端“{name}”？',
    'client.table.name': '名称',
    'client.table.ip': 'VPN IP',
    'client.table.status': '状态',
    'client.table.dns': 'DNS',
    'client.table.lastSeen': '最近连接',
    'client.table.actions': '操作',
    'status.disabled': '已禁用',
    'status.connected': '已连接',
    'status.inactive': '未连接',
    'status.never': '从未',
    'action.qrConfig': '二维码 / 配置',
    'action.disable': '禁用',
    'action.enable': '启用',
    'action.changeDns': '更改 DNS 过滤',
    'action.delete': '删除',
    'copy.done': '✓ 已复制',
    'time.secondsAgo': '{count} 秒前',
    'time.minutesAgo': '{count} 分钟前',
    'time.hoursAgo': '{count} 小时前',
    'time.daysAgo': '{count} 天前',
    'dns.filtered.label': '完整过滤',
    'dns.filtered.desc': '通过 VPS 上的 AdGuard 拦截广告和恶意软件',
    'dns.malware.label': '仅恶意软件',
    'dns.malware.desc': 'Cloudflare 家庭版 - 允许广告',
    'dns.none.label': '无过滤',
    'dns.none.desc': 'Cloudflare 直连 DNS - 无限制',
    'modal.newClient.title': '新建 WireGuard 客户端',
    'modal.newClient.clientName': '客户端名称',
    'modal.newClient.clientNamePlaceholder': '例如：iPhone-Vincent、Mac-Office…',
    'modal.newClient.dnsProtection': 'DNS 防护级别',
    'modal.newClient.scanHint': '使用 WireGuard 应用扫描',
    'modal.newClient.creating': '创建中…',
    'modal.qrConfig.title': '配置与二维码',
    'modal.qrConfig.copy': '⎘ 复制配置',
    'modal.filter.title': '更改 DNS 过滤',
    'modal.filter.protectionLevel': '防护级别',
    'modal.filter.newProtectionLevel': '新的防护级别',
    'modal.filter.nonAdguardTitle': '此客户端未使用 AdGuard DNS。',
    'modal.filter.nonAdguardBody': '无法在线切换过滤策略。请在下方选择新级别，系统会生成新配置并需在设备上重新导入。',
    'modal.filter.reimportHint': '请在设备上重新导入',
    'modal.filter.generateConfig': '生成新配置',
    'modal.filter.updated': '过滤已更新：{label}',
    'modal.filter.generated': '已生成新配置：{label}',
    'modal.filter.clientInfo': '<strong>{name}</strong> - 当前 DNS：<code>{dns}</code>',
    'modal.help.title': 'DNS 防护级别说明',
    'modal.help.filtered.main': '拦截<strong>广告</strong>、<strong>追踪器</strong>、<strong>恶意软件</strong>与<strong>钓鱼</strong>。',
    'modal.help.filtered.detail': '通过 VPS 上的 AdGuard Home（AdGuard DNS filter、AdAway、Malware filter 列表）。页面加载更快，风险更低。',
    'modal.help.filtered.reco': '推荐：日常所有设备。',
    'modal.help.malware.main': '仅拦截<strong>恶意软件与钓鱼</strong>，广告与追踪器仍可通过。',
    'modal.help.malware.detail': '上游 DNS 使用 Cloudflare for Families（1.1.1.2），广告仍可见。',
    'modal.help.malware.reco': '推荐：已安装广告拦截器（如 uBlock）的设备。',
    'modal.help.none.main': '不进行任何拦截 - 使用 Cloudflare（1.1.1.1）直连 DNS。',
    'modal.help.none.detail': '兼容性最高，适合调试或访问通常会被过滤的资源。',
    'modal.help.none.reco': '推荐：开发、测试或特定场景。',
    'modal.help.noteLabel': '说明：',
    'modal.help.noteBody': '只有配置中使用 <code>DNS = 10.8.0.1</code> 的客户端才能在线切换过滤。其他客户端需要重新生成配置。',
    'nav.security': '安全',
    'security.refresh': '↻ 刷新',
    'security.config.bantime': '封禁时长',
    'security.config.findtime': '检测窗口',
    'security.config.maxretry': '最大尝试次数',
    'security.bans.title': '当前封禁',
    'security.bans.unbanAll': '解封全部',
    'security.bans.banBtn': '封禁',
    'security.bans.ipPlaceholder': '如 1.2.3.4',
    'security.bans.none': '暂无被封禁 IP。',
    'security.bans.confirmUnbanAll': '解封全部 {n} 个 IP 地址？',
    'security.logs.title': '访问日志',
    'security.logs.all': '全部',
    'security.logs.errors': '错误 (4xx/5xx)',
    'security.logs.attempts': '仅 401',
    'security.logs.autoRefresh': '自动刷新',
    'security.logs.empty': '暂无记录。',
    'security.logs.noFile': '日志文件尚不可用。',
    'security.logs.entries': '显示 {count} 条（共 {total} 条匹配）',
    'security.logs.time': '时间',
    'security.logs.ip': 'IP',
    'security.logs.method': '方法',
    'security.logs.uri': '路径',
    'security.logs.status': '状态',
    'security.logs.duration': '耗时',
  },
};

const LANGS = ['en', 'fr', 'zh'];

const DNS_PRESETS = [
  { id: 'filtered', value: '10.8.0.1' },
  { id: 'malware', value: '1.1.1.2, 1.0.0.2' },
  { id: 'none', value: '1.1.1.1, 8.8.8.8' },
];

const state = {
  tab:              'dashboard',
  clients:          [],
  iframesLoaded:    { wireguard: false, adguard: false },
  iframePaths:      { wireguard: '/wireguard/', adguard: '/adguard/' },
  fail2ban:         null,
  security:         { config: null, bans: null },
  securityLogFilter: '',
  logAutoRefreshId: null,
  serverName:       'vpn-server',
  lang:             'en',
};

function detectLang() {
  const saved = localStorage.getItem('portalLang');
  if (saved && LANGS.includes(saved)) return saved;
  const browser = (navigator.language || 'en').toLowerCase();
  if (browser.startsWith('fr')) return 'fr';
  if (browser.startsWith('zh')) return 'zh';
  return 'en';
}

function t(key, vars = {}) {
  const table = I18N[state.lang] || I18N.en;
  const template = table[key] || I18N.en[key] || key;
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
    template,
  );
}

function presetLabel(id) {
  return t(`dns.${id}.label`);
}

function presetDesc(id) {
  return t(`dns.${id}.desc`);
}

function presetById(id) {
  return DNS_PRESETS.find(p => p.id === id);
}

function applyI18n() {
  document.documentElement.lang = state.lang;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.innerHTML = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder));
  });

  renderServerName();

  if (state.tab === 'dashboard') {
    renderDashClientList(state.clients.slice(0, 6));
    renderFail2ban(state.fail2ban);
  }
  if (state.tab === 'clients') {
    const wrap = document.getElementById('client-table-wrap');
    if (state.clients.length) wrap.innerHTML = renderClientTable(state.clients);
  }
}

function syncLangSelectors() {
  ['lang-login', 'lang-app'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = state.lang;
  });
}

function setLanguage(lang) {
  if (!LANGS.includes(lang)) return;
  state.lang = lang;
  localStorage.setItem('portalLang', lang);
  syncLangSelectors();
  applyI18n();
}

function renderServerName() {
  ['login-server-name', 'sidebar-server-name', 'dashboard-server-name'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = state.serverName || 'vpn-server';
  });
}

function isValidServerName(name) {
  return /^[A-Za-z0-9_-]+$/.test(String(name || '').trim());
}

function safeFileToken(name) {
  return String(name || '')
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'config';
}

async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(path, opts);
  if (r.status === 401 && path !== '/api/login') { showLogin(); return null; }
  return r.json().catch(() => null);
}

const GET  = path      => api('GET', path);
const POST = (p, body) => api('POST', p, body);
const DEL  = path      => api('DELETE', path);

function showLogin() {
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
}

async function checkAuth() {
  const data = await GET('/api/me');
  if (data?.authenticated) {
    showApp();
    loadConfig();
    switchTab('dashboard');
  } else {
    showLogin();
  }
}

function switchTab(name) {
  state.tab = name;

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === name);
  });
  document.querySelectorAll('.tab-content').forEach(el => {
    el.classList.toggle('hidden', el.id !== `tab-${name}`);
  });

  if (name === 'dashboard') loadDashboard();
  if (name === 'clients')   loadClients();
  if (name === 'wireguard') loadIframe('wireguard');
  if (name === 'adguard')   loadIframe('adguard');
  if (name !== 'security' && state.logAutoRefreshId) {
    clearInterval(state.logAutoRefreshId);
    state.logAutoRefreshId = null;
    const arEl = document.getElementById('log-auto-refresh');
    if (arEl) arEl.checked = false;
  }
  if (name === 'security')  loadSecurity();
}

function loadIframe(name) {
  if (state.iframesLoaded[name]) return;
  const id   = name === 'wireguard' ? 'wg-iframe' : 'ag-iframe';
  document.getElementById(id).src = state.iframePaths[name] || '/';
  state.iframesLoaded[name] = true;
}

async function loadConfig() {
  const cfg = await GET('/api/config');
  if (!cfg) return;
  state.iframePaths.wireguard = cfg.wgEasyPath || '/wireguard/';
  state.iframePaths.adguard = cfg.adguardPath || '/adguard/';
  state.serverName = cfg.serverName || 'vpn-server';
  renderServerName();
}

async function renameServer() {
  const nextName = window.prompt(t('server.prompt'), state.serverName || 'vpn-server');
  if (nextName === null) return;

  const trimmed = nextName.trim();
  if (!isValidServerName(trimmed)) {
    window.alert(t('server.invalid'));
    return;
  }

  const data = await POST('/api/server-name', { serverName: trimmed });
  if (!data || data.error) {
    window.alert(data?.error || t('server.invalid'));
    return;
  }

  state.serverName = data.serverName;
  renderServerName();
}

async function loadDashboard() {
  const [clients, stats, fail2ban] = await Promise.all([
    GET('/api/clients'),
    GET('/api/adguard/stats'),
    GET('/api/fail2ban/status'),
  ]);

  if (clients) {
    state.clients = clients;
    const now = Date.now();
    const connected = clients.filter(c => c.latestHandshakeAt && now - new Date(c.latestHandshakeAt).getTime() < 3 * 60 * 1000).length;
    document.getElementById('stat-total').textContent = clients.length;
    document.getElementById('stat-connected').textContent = connected;
    renderDashClientList(clients.slice(0, 6));
  }

  if (stats) {
    const total = stats.num_dns_queries || 0;
    const blocked = stats.num_blocked_filtering || 0;
    const pct = total > 0 ? Math.round((blocked / total) * 100) : 0;
    document.getElementById('stat-queries').textContent = fmtNum(total);
    document.getElementById('stat-blocked').textContent = fmtNum(blocked);
    document.getElementById('stat-pct').textContent = total > 0 ? `(${pct}%)` : '';
  }

  if (fail2ban) {
    state.fail2ban = fail2ban;
    renderFail2ban(fail2ban);
  }
}

function renderFail2ban(data) {
  const jailEl = document.getElementById('fail2ban-jail');
  const currentEl = document.getElementById('fail2ban-current');
  const totalEl = document.getElementById('fail2ban-total');
  const listEl = document.getElementById('fail2ban-list');
  const msgEl = document.getElementById('fail2ban-message');

  if (!jailEl || !currentEl || !totalEl || !listEl || !msgEl) return;

  if (data === null) {
    jailEl.textContent = '—';
    currentEl.textContent = '0';
    totalEl.textContent = '0';
    msgEl.textContent = t('fail2ban.loading');
    listEl.innerHTML = '';
    return;
  }

  if (!data || data.enabled === false) {
    jailEl.textContent = data?.jail || '—';
    currentEl.textContent = '0';
    totalEl.textContent = '0';
    msgEl.textContent = t('fail2ban.disabled');
    listEl.innerHTML = '';
    return;
  }

  jailEl.textContent = data.jail || '—';
  currentEl.textContent = String(data.currentlyBanned || 0);
  totalEl.textContent = String(data.totalBanned || 0);

  const ips = Array.isArray(data.ips) ? data.ips : [];
  if (!ips.length) {
    msgEl.textContent = t('fail2ban.none');
    listEl.innerHTML = '';
    return;
  }

  msgEl.textContent = '';
  listEl.innerHTML = ips.map(ip => `
    <div class="fail2ban-item">
      <code>${esc(ip)}</code>
      <button class="btn-ghost btn-sm" data-action="unban-ip" data-ip="${esc(ip)}">${esc(t('fail2ban.unban'))}</button>
    </div>
  `).join('');
}

async function refreshFail2ban() {
  const data = await GET('/api/fail2ban/status');
  if (!data) return;
  state.fail2ban = data;
  renderFail2ban(data);
}

async function unbanIp(ip) {
  const data = await POST('/api/fail2ban/unban', { ip });
  if (!data || data.error) {
    window.alert(data?.error || t('fail2ban.unbanError'));
    return;
  }
  state.fail2ban = data;
  renderFail2ban(data);
}

function renderDashClientList(clients) {
  const el = document.getElementById('dash-client-list');
  if (!clients.length) {
    el.innerHTML = `<div class="empty">${esc(t('client.none'))}</div>`;
    return;
  }
  el.innerHTML = renderClientTable(clients);
  bindClientActions(el);
}

async function loadClients() {
  const el = document.getElementById('client-table-wrap');
  el.innerHTML = `<div class="loading">${esc(t('common.loading'))}</div>`;
  const clients = await GET('/api/clients');
  if (!clients) return;
  state.clients = clients;
  el.innerHTML = clients.length ? renderClientTable(clients) : `<div class="empty">${esc(t('client.noneCreate'))}</div>`;
  bindClientActions(el);
}

function dnsBadgeLabel(client) {
  if (client.dnsPreset && presetById(client.dnsPreset)) return presetLabel(client.dnsPreset);
  return client.dnsLabel || client.dns || '—';
}

function renderClientTable(clients) {
  const now = Date.now();
  const rows = clients.map(c => {
    const connected = c.latestHandshakeAt && now - new Date(c.latestHandshakeAt).getTime() < 3 * 60 * 1000;

    const statusBadge = c.enabled === false
      ? `<span class="badge badge-dim"><span class="dot"></span>${esc(t('status.disabled'))}</span>`
      : connected
        ? `<span class="badge badge-green"><span class="dot"></span>${esc(t('status.connected'))}</span>`
        : `<span class="badge badge-dim"><span class="dot"></span>${esc(t('status.inactive'))}</span>`;

    const dnsClass = c.dnsPreset || 'custom';
    const dnsBadge = `<span class="dns-badge dns-${esc(dnsClass)}">${esc(dnsBadgeLabel(c))}</span>`;
    const lastSeen = c.latestHandshakeAt ? timeAgo(new Date(c.latestHandshakeAt)) : t('status.never');

    return `<tr>
      <td><span class="client-name">${esc(c.name)}</span></td>
      <td><span class="client-ip">${esc(c.address)}</span></td>
      <td>${statusBadge}</td>
      <td>${dnsBadge}</td>
      <td style="color:var(--text-dim);font-size:.8rem">${esc(lastSeen)}</td>
      <td>
        <div class="actions">
          <button class="btn-icon" data-action="qr" data-id="${c.id}" title="${esc(t('action.qrConfig'))}">⊞</button>
          <button class="btn-icon" data-action="toggle" data-id="${c.id}" data-enabled="${c.enabled !== false}" title="${esc(c.enabled !== false ? t('action.disable') : t('action.enable'))}">${c.enabled !== false ? '⏸' : '▶'}</button>
          <button class="btn-icon" data-action="filter" data-id="${c.id}" data-name="${esc(c.name)}" data-preset="${c.dnsPreset || ''}" data-dns="${esc(c.dns || '')}" title="${esc(t('action.changeDns'))}">⚙</button>
          <button class="btn-icon danger" data-action="delete" data-id="${c.id}" data-name="${esc(c.name)}" title="${esc(t('action.delete'))}">✕</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  return `<table>
    <thead><tr>
      <th>${esc(t('client.table.name'))}</th>
      <th>${esc(t('client.table.ip'))}</th>
      <th>${esc(t('client.table.status'))}</th>
      <th>${esc(t('client.table.dns'))}</th>
      <th>${esc(t('client.table.lastSeen'))}</th>
      <th>${esc(t('client.table.actions'))}</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function bindClientActions(container) {
  container.addEventListener('click', async e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id, name, enabled } = btn.dataset;

    if (action === 'filter') openFilterModal({ id, name, preset: btn.dataset.preset, dns: btn.dataset.dns });
    if (action === 'qr') {
      const data = await GET(`/api/clients/${id}/config`);
      if (data) showQrModal(data.config, data.qrcode, name || 'client');
    }
    if (action === 'toggle') {
      const isEnabled = enabled === 'true';
      await POST(`/api/clients/${id}/${isEnabled ? 'disable' : 'enable'}`);
      if (state.tab === 'clients') loadClients(); else loadDashboard();
    }
    if (action === 'delete') {
      if (!confirm(t('client.deleteConfirm', { name }))) return;
      await DEL(`/api/clients/${id}`);
      if (state.tab === 'clients') loadClients(); else loadDashboard();
    }
  });
}

function renderDnsOptions(container, selectedId, nameAttr) {
  container.innerHTML = DNS_PRESETS.map(p => `
    <label class="dns-option${p.id === selectedId ? ' selected' : ''}">
      <input type="radio" name="${nameAttr}" value="${p.id}" ${p.id === selectedId ? 'checked' : ''}>
      <div class="dns-option-text">
        <div class="dns-option-label">${esc(presetLabel(p.id))}</div>
        <div class="dns-option-desc">${esc(presetDesc(p.id))}</div>
        <div class="dns-option-value">${esc(p.value)}</div>
      </div>
    </label>
  `).join('');

  container.querySelectorAll('.dns-option').forEach(el => {
    el.addEventListener('click', () => {
      container.querySelectorAll('.dns-option').forEach(o => o.classList.remove('selected'));
      el.classList.add('selected');
      el.querySelector('input').checked = true;
    });
  });
}

function openNewClientModal() {
  document.getElementById('modal-footer').innerHTML = `
    <button class="btn-ghost" id="modal-cancel-btn">${esc(t('common.cancel'))}</button>
    <button class="btn-primary" id="modal-submit-btn">${esc(t('common.createArrow'))}</button>
  `;
  document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
  document.getElementById('modal-submit-btn').addEventListener('click', submitNewClient);

  document.getElementById('modal-form').classList.remove('hidden');
  document.getElementById('modal-result').classList.add('hidden');
  document.getElementById('modal-footer').classList.remove('hidden');
  document.querySelector('.result-success').style.display = '';
  document.getElementById('modal-title').textContent = t('modal.newClient.title');
  document.getElementById('client-name-input').value = '';
  document.getElementById('create-error').classList.add('hidden');

  renderDnsOptions(document.getElementById('dns-options'), 'filtered', 'dns-preset');

  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('client-name-input').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

async function submitNewClient() {
  const name = document.getElementById('client-name-input').value.trim();
  const errorEl = document.getElementById('create-error');
  errorEl.classList.add('hidden');

  if (!name) {
    errorEl.textContent = t('client.nameRequired');
    errorEl.classList.remove('hidden');
    return;
  }

  const checked = document.querySelector('input[name="dns-preset"]:checked');
  const preset = checked?.value || 'filtered';
  const dns = presetById(preset)?.value || '10.8.0.1';

  const btn = document.getElementById('modal-submit-btn');
  btn.disabled = true;
  btn.textContent = t('modal.newClient.creating');

  const data = await POST('/api/clients', { name, preset, dns });

  if (!data || data.error) {
    errorEl.textContent = data?.error || t('client.createError');
    errorEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = t('common.createArrow');
    return;
  }

  document.getElementById('modal-title').textContent = t('client.createdTitle');
  document.getElementById('modal-form').classList.add('hidden');
  document.getElementById('modal-footer').classList.add('hidden');

  document.getElementById('result-name').textContent = `${data.client.name} ${t('client.createdSuffix')}`;
  document.getElementById('result-qr').src = data.qrcode;
  document.getElementById('result-config').textContent = data.config;

  const footer = document.getElementById('modal-footer');
  footer.innerHTML = `
    <button class="btn-ghost" id="dl-config-btn">${esc(t('common.downloadConf'))}</button>
    <button class="btn-primary" id="modal-done-btn">${esc(t('common.close'))}</button>
  `;
  footer.classList.remove('hidden');

  document.getElementById('modal-result').classList.remove('hidden');

  document.getElementById('modal-done-btn').addEventListener('click', () => {
    closeModal();
    if (state.tab === 'clients') loadClients(); else loadDashboard();
  });

  document.getElementById('dl-config-btn').addEventListener('click', () => {
    downloadConfigFile(data.config, data.client.name);
  });
}

function showQrModal(config, qrcode, clientName) {
  document.getElementById('modal-title').textContent = t('modal.qrConfig.title');
  document.getElementById('modal-form').classList.add('hidden');

  document.getElementById('result-name').textContent = '';
  document.getElementById('result-qr').src = qrcode;
  document.getElementById('result-config').textContent = config;

  const footer = document.getElementById('modal-footer');
  footer.innerHTML = `
    <button class="btn-ghost" id="copy-cfg-btn">${esc(t('modal.qrConfig.copy'))}</button>
    <button class="btn-ghost" id="dl-cfg-btn">${esc(t('common.downloadConf'))}</button>
    <button class="btn-primary" id="modal-done-btn2">${esc(t('common.close'))}</button>
  `;
  footer.classList.remove('hidden');

  document.querySelector('.result-success').style.display = 'none';
  document.getElementById('modal-result').classList.remove('hidden');
  document.getElementById('modal-overlay').classList.remove('hidden');

  document.getElementById('modal-done-btn2').addEventListener('click', () => {
    document.querySelector('.result-success').style.display = '';
    closeModal();
  });

  document.getElementById('copy-cfg-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(config);
    document.getElementById('copy-cfg-btn').textContent = t('copy.done');
  });

  document.getElementById('dl-cfg-btn').addEventListener('click', () => {
    downloadConfigFile(config, clientName || 'client');
  });
}

function downloadConfigFile(config, name) {
  const blob = new Blob([config], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: `wireguard-${safeFileToken(state.serverName)}-${safeFileToken(name)}.conf`,
  });
  a.click();
  URL.revokeObjectURL(url);
}

let filterClient = null;

function openFilterModal(client) {
  filterClient = client;
  const isAdGuard = client.dns === '10.8.0.1';

  document.getElementById('filter-client-info').innerHTML = t('modal.filter.clientInfo', {
    name: esc(client.name),
    dns: esc(client.dns || '—'),
  });

  document.getElementById('filter-result').classList.add('hidden');
  document.getElementById('filter-regen-result').classList.add('hidden');
  document.getElementById('filter-error').classList.add('hidden');
  document.getElementById('filter-footer').innerHTML = `
    <button class="btn-ghost" id="filter-cancel-btn">${esc(t('common.cancel'))}</button>
    <button class="btn-primary" id="filter-submit-btn">${esc(isAdGuard ? t('common.apply') : t('modal.filter.generateConfig'))}</button>
  `;
  document.getElementById('filter-cancel-btn').addEventListener('click', closeFilterModal);
  document.getElementById('filter-submit-btn').addEventListener('click', submitFilter);

  if (isAdGuard) {
    document.getElementById('filter-form').classList.remove('hidden');
    document.getElementById('filter-non-adguard').classList.add('hidden');
    renderDnsOptions(document.getElementById('filter-dns-options'), client.preset || 'filtered', 'filter-dns-options');
  } else {
    document.getElementById('filter-form').classList.add('hidden');
    document.getElementById('filter-non-adguard').classList.remove('hidden');
    renderDnsOptions(document.getElementById('filter-regen-options'), client.preset || 'filtered', 'filter-regen-options');
  }

  document.getElementById('filter-overlay').classList.remove('hidden');
}

function closeFilterModal() {
  document.getElementById('filter-overlay').classList.add('hidden');
  filterClient = null;
}

async function submitFilter() {
  const client = filterClient;
  const isAdGuard = client.dns === '10.8.0.1';
  const optionsId = isAdGuard ? 'filter-dns-options' : 'filter-regen-options';
  const checked = document.querySelector(`input[name="${optionsId}"]:checked`);
  const preset = checked?.value || 'filtered';
  const errEl = document.getElementById('filter-error');
  errEl.classList.add('hidden');

  const btn = document.getElementById('filter-submit-btn');
  btn.disabled = true;
  btn.textContent = t('common.processing');

  const data = isAdGuard
    ? await POST(`/api/clients/${client.id}/filter`, { preset })
    : await POST(`/api/clients/${client.id}/patch-dns`, { preset });

  btn.disabled = false;

  if (!data || data.error) {
    errEl.textContent = data?.message || data?.error || 'Error';
    errEl.classList.remove('hidden');
    btn.textContent = isAdGuard ? t('common.apply') : t('modal.filter.generateConfig');
    return;
  }

  const label = presetLabel(preset);
  document.getElementById('filter-result-msg').textContent = isAdGuard
    ? t('modal.filter.updated', { label })
    : t('modal.filter.generated', { label });

  document.getElementById('filter-result').classList.remove('hidden');

  if (!isAdGuard && data.config) {
    document.getElementById('filter-qr').src = data.qrcode;
    document.getElementById('filter-config').textContent = data.config;
    document.getElementById('filter-regen-result').classList.remove('hidden');
  }

  document.getElementById('filter-footer').innerHTML = `
    ${!isAdGuard && data.config ? `<button class="btn-ghost" id="filter-dl-btn">${esc(t('common.downloadConf'))}</button>` : ''}
    <button class="btn-primary" id="filter-done-btn">${esc(t('common.close'))}</button>
  `;

  document.getElementById('filter-done-btn').addEventListener('click', () => {
    closeFilterModal();
    if (state.tab === 'clients') loadClients(); else loadDashboard();
  });

  if (!isAdGuard && data.config) {
    document.getElementById('filter-dl-btn').addEventListener('click', () => {
      downloadConfigFile(data.config, client.name);
    });
  }
}

function openHelpModal() {
  document.getElementById('help-overlay').classList.remove('hidden');
}

function closeHelpModal() {
  document.getElementById('help-overlay').classList.add('hidden');
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function fmtNum(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function timeAgo(date) {
  const s = Math.round((Date.now() - date.getTime()) / 1000);
  if (s < 60) return t('time.secondsAgo', { count: s });
  if (s < 3600) return t('time.minutesAgo', { count: Math.floor(s / 60) });
  if (s < 86400) return t('time.hoursAgo', { count: Math.floor(s / 3600) });
  return t('time.daysAgo', { count: Math.floor(s / 86400) });
}

document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const pw = document.getElementById('login-password').value;
  const err = document.getElementById('login-error');
  err.classList.add('hidden');
  const data = await POST('/api/login', { password: pw });
  if (data?.success) {
    showApp();
    loadConfig();
    switchTab('dashboard');
  } else {
    err.textContent = t('login.invalid');
    err.classList.remove('hidden');
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await POST('/api/logout');
  showLogin();
});

document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    switchTab(el.dataset.tab);
  });
});

// ── Security / Fail2Ban tab ───────────────────────────────────────────────────

function fmtSeconds(s) {
  s = Math.abs(Number(s) || 0);
  if (s >= 86400) return `${Math.round(s / 86400)}d`;
  if (s >= 3600)  return `${Math.round(s / 3600)}h`;
  if (s >= 60)    return `${Math.round(s / 60)}m`;
  return `${s}s`;
}

function fmtDuration(secs) {
  if (!secs) return '—';
  if (secs < 0.001) return '<1ms';
  if (secs < 1) return `${Math.round(secs * 1000)}ms`;
  return `${secs.toFixed(2)}s`;
}

function fmtLogTime(ts) {
  return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function statusColor(code) {
  if (code >= 500) return 'var(--red)';
  if (code >= 400) return 'var(--orange)';
  if (code >= 300) return 'var(--yellow)';
  return 'var(--green)';
}

async function loadSecurity() {
  const [config, bans] = await Promise.all([
    GET('/api/fail2ban/config'),
    GET('/api/fail2ban/status'),
  ]);

  if (config && !config.error) {
    state.security.config = config;
    document.getElementById('security-jail-name').textContent = config.jail || '—';
    document.getElementById('sec-bantime').textContent  = fmtSeconds(config.bantime);
    document.getElementById('sec-findtime').textContent = fmtSeconds(config.findtime);
    document.getElementById('sec-maxretry').textContent = String(config.maxretry);
  }

  if (bans) {
    state.security.bans = bans;
    renderSecurityBans(bans);
    document.getElementById('sec-current-bans').textContent = String(bans.currentlyBanned || 0);
  }

  await loadLogs(state.securityLogFilter);
}

async function loadLogs(filter) {
  state.securityLogFilter = filter || '';
  const param = filter === 'errors' || filter === '401' ? `&status=${filter}` : '';
  const data = await GET(`/api/fail2ban/logs?n=200${param}`);
  if (data) renderLogTable(data);
}

function renderSecurityBans(data) {
  const listEl = document.getElementById('security-bans-list');
  const msgEl  = document.getElementById('security-bans-msg');
  if (!listEl) return;

  if (!data || data.enabled === false) {
    msgEl.textContent = t('fail2ban.disabled');
    listEl.innerHTML = '';
    return;
  }

  const ips = Array.isArray(data.ips) ? data.ips : [];
  msgEl.textContent = '';
  if (!ips.length) {
    listEl.innerHTML = `<div class="text-dim" style="font-size:.85rem;padding:.4rem 0">${esc(t('security.bans.none'))}</div>`;
    return;
  }

  listEl.innerHTML = ips.map(ip => `
    <div class="fail2ban-item">
      <code>${esc(ip)}</code>
      <button class="btn-ghost btn-sm" style="color:var(--orange)" data-action="sec-unban" data-ip="${esc(ip)}">${esc(t('fail2ban.unban'))}</button>
    </div>
  `).join('');
}

function renderLogTable(data) {
  const wrap = document.getElementById('security-log-wrap');
  if (!wrap) return;

  if (data.error && !data.lines?.length) {
    wrap.innerHTML = `<div class="text-dim" style="padding:.75rem">${esc(data.error || t('security.logs.noFile'))}</div>`;
    return;
  }

  const lines = data.lines || [];
  if (!lines.length) {
    wrap.innerHTML = `<div class="text-dim" style="padding:.75rem">${esc(t('security.logs.empty'))}</div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="log-count">${esc(t('security.logs.entries', { count: lines.length, total: data.total }))}</div>
    <div class="log-table-wrap">
      <table class="log-table">
        <thead><tr>
          <th>${esc(t('security.logs.time'))}</th>
          <th>${esc(t('security.logs.ip'))}</th>
          <th>${esc(t('security.logs.method'))}</th>
          <th>${esc(t('security.logs.uri'))}</th>
          <th>${esc(t('security.logs.status'))}</th>
          <th>${esc(t('security.logs.duration'))}</th>
        </tr></thead>
        <tbody>
          ${lines.map(l => `<tr>
            <td class="log-time">${esc(fmtLogTime(l.ts))}</td>
            <td><code class="log-ip">${esc(l.ip)}</code></td>
            <td><span class="log-method">${esc(l.method)}</span></td>
            <td class="log-uri" title="${esc(l.uri)}">${esc(l.uri.length > 50 ? l.uri.slice(0, 50) + '…' : l.uri)}</td>
            <td><span class="log-status" style="color:${statusColor(l.status)};font-weight:700">${l.status}</span></td>
            <td class="log-dur">${esc(fmtDuration(l.duration))}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function banIp(ip) {
  ip = (ip || '').trim();
  if (!ip) return;
  const data = await POST('/api/fail2ban/ban', { ip });
  if (!data || data.error) { window.alert(data?.error || 'Error banning IP.'); return; }
  state.security.bans = data;
  renderSecurityBans(data);
  document.getElementById('sec-current-bans').textContent = String(data.currentlyBanned || 0);
  document.getElementById('ban-ip-input').value = '';
}

async function unbanAllIps() {
  const n = state.security.bans?.currentlyBanned || 0;
  if (n === 0) return;
  if (!confirm(t('security.bans.confirmUnbanAll', { n }))) return;
  const data = await POST('/api/fail2ban/unban-all', {});
  if (!data || data.error) { window.alert(data?.error || 'Error unbanning all IPs.'); return; }
  state.security.bans = data;
  renderSecurityBans(data);
  document.getElementById('sec-current-bans').textContent = '0';
}

document.getElementById('new-client-btn').addEventListener('click', openNewClientModal);
document.getElementById('dash-new-btn').addEventListener('click', openNewClientModal);
document.getElementById('modal-close-btn').addEventListener('click', closeModal);
document.getElementById('filter-close-btn').addEventListener('click', closeFilterModal);
document.getElementById('help-dns-btn').addEventListener('click', openHelpModal);
document.getElementById('help-dns-btn2').addEventListener('click', openHelpModal);
document.getElementById('help-close-btn').addEventListener('click', closeHelpModal);
document.getElementById('help-ok-btn').addEventListener('click', closeHelpModal);
document.getElementById('refresh-btn').addEventListener('click', loadDashboard);
document.getElementById('fail2ban-refresh-btn').addEventListener('click', refreshFail2ban);
document.getElementById('rename-server-btn').addEventListener('click', renameServer);

document.getElementById('fail2ban-list').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action="unban-ip"]');
  if (!btn) return;
  await unbanIp(btn.dataset.ip);
});

document.getElementById('filter-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('filter-overlay')) closeFilterModal();
});

document.getElementById('help-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('help-overlay')) closeHelpModal();
});

document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

document.getElementById('copy-config-btn')?.addEventListener('click', () => {
  const config = document.getElementById('result-config').textContent;
  navigator.clipboard.writeText(config);
});

['lang-login', 'lang-app'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('change', e => setLanguage(e.target.value));
});

state.lang = detectLang();
syncLangSelectors();
applyI18n();
checkAuth();

// ── Security tab events ───────────────────────────────────────────────────────
document.getElementById('security-refresh-btn').addEventListener('click', loadSecurity);

document.getElementById('ban-ip-btn').addEventListener('click', () =>
  banIp(document.getElementById('ban-ip-input').value));

document.getElementById('ban-ip-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') banIp(e.target.value);
});

document.getElementById('unban-all-btn').addEventListener('click', unbanAllIps);

document.getElementById('security-bans-list').addEventListener('click', async e => {
  const btn = e.target.closest('[data-action="sec-unban"]');
  if (!btn) return;
  const data = await POST('/api/fail2ban/unban', { ip: btn.dataset.ip });
  if (!data || data.error) { window.alert(data?.error || t('fail2ban.unbanError')); return; }
  state.security.bans = data;
  renderSecurityBans(data);
  document.getElementById('sec-current-bans').textContent = String(data.currentlyBanned || 0);
});

document.querySelectorAll('.log-filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.log-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadLogs(btn.dataset.filter);
  });
});

document.getElementById('log-auto-refresh').addEventListener('change', e => {
  if (state.logAutoRefreshId) { clearInterval(state.logAutoRefreshId); state.logAutoRefreshId = null; }
  if (e.target.checked) {
    state.logAutoRefreshId = setInterval(() => loadLogs(state.securityLogFilter), 5000);
  }
});
