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
    'server.prompt': 'Server name (letters, numbers, -, _ and . allowed):',
    'server.invalid': 'Invalid server name. Use only letters, numbers, -, _ or .',
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
    // status bar
    'security.myip': 'Your IP',
    'security.status.title': 'Services',
    'service.up': 'Online',
    'service.down': 'Offline',
    // config edit
    'security.config.edit': '✎ Edit config',
    'security.config.editTitle': 'Edit Fail2Ban config',
    'security.config.seconds': 'seconds',
    'security.config.save': 'Save',
    'security.config.savedOk': 'Configuration saved.',
    // whitelist
    'security.whitelist.title': 'IP Whitelist',
    'security.whitelist.subtitle': 'Never banned',
    'security.whitelist.placeholder': 'e.g. 1.2.3.4 or 10.0.0.0/8',
    'security.whitelist.add': '+ Add',
    'security.whitelist.none': 'No whitelisted IPs.',
    'security.whitelist.remove': 'Remove',
    // fail2ban log
    'security.jaillog.title': 'Fail2Ban log',
    'security.jaillog.empty': 'No entries for this jail.',
    'security.jaillog.noFile': 'Fail2Ban log file not found.',
    // sessions
    'security.sessions.title': 'Active sessions',
    'security.sessions.revoke': 'Revoke',
    'security.sessions.current': '● Current',
    'security.sessions.none': 'No active sessions.',
    // tls
    'security.tls.title': 'TLS Certificate',
    'security.tls.subject': 'Domain',
    'security.tls.issuer': 'Issuer',
    'security.tls.validTo': 'Expires',
    'security.tls.type': 'Type',
    'security.tls.internal': 'Internal (self-signed)',
    'security.tls.acme': 'ACME (Let\'s Encrypt)',
    'security.tls.daysLeft': '{n} days left',
    'security.tls.expired': 'EXPIRED',
    'security.tls.error': 'Unable to read certificate.',
    // password
    'security.password.title': 'Change password',
    'security.password.current': 'Current password',
    'security.password.new': 'New password (min 8 chars)',
    'security.password.confirm': 'Confirm new password',
    'security.password.save': 'Change password',
    'security.password.mismatch': 'Passwords do not match.',
    'security.password.tooShort': 'Minimum 8 characters.',
    'security.password.success': 'Password changed successfully.',
    'security.password.wrongCurrent': 'Current password is incorrect.',
    // nav
    'nav.backups': 'Backups',
    'nav.notifications': 'Notifications',
    'nav.devices': 'Devices',
    'nav.dnsProfiles': 'DNS Profiles',
    'nav.gateway': 'Gateway',
    // devices
    'devices.add': '+ Add Device',
    'devices.col.name': 'Name',
    'devices.col.owner': 'Owner',
    'devices.col.status': 'Status',
    'devices.col.dns': 'DNS Profile',
    'devices.col.routing': 'Routing',
    'devices.col.expires': 'Expires',
    'devices.col.actions': 'Actions',
    'devices.status.online': 'Online',
    'devices.status.recently_seen': 'Recent',
    'devices.status.offline': 'Offline',
    'devices.status.inactive': 'Inactive',
    'devices.status.revoked': 'Revoked',
    'devices.status.expired': 'Expired',
    'devices.status.never_connected': 'Never',
    'devices.status.unknown': '?',
    'devices.routing.full_tunnel': 'Full Tunnel',
    'devices.routing.dns_only': 'DNS Only',
    'devices.routing.private_access': 'Private',
    'devices.routing.custom': 'Custom',
    'devices.bypass.active': 'Bypass active',
    'devices.expires.never': '—',
    // dns profiles
    'dnsProfiles.assignments': 'Device Assignments',
    'dnsProfiles.bypass': 'Bypass',
    'dnsProfiles.bypass.set': 'Set Bypass',
    'dnsProfiles.bypass.revoke': 'Revoke',
    'dnsProfiles.type.managed': 'Built-in',
    'dnsProfiles.type.custom': 'Custom',
    // gateway
    'gateway.add': '+ Add Service',
    'gateway.empty': 'No proxy services configured.',
    'gateway.exposure.vpn_only': 'VPN Only',
    'gateway.exposure.public': 'Public HTTPS',
    'gateway.caddy.ok': 'Caddy admin reachable',
    'gateway.caddy.down': 'Caddy admin not reachable — run ./easywg migrate',
    // health
    'health.cpu': 'CPU Usage',
    'health.ram': 'RAM Usage',
    'health.disk': 'Disk Usage',
    'health.uptime': 'Uptime',
    // security score
    'security.score.title': 'Security Score',
    'security.score.rescan': '↻ Rescan',
    'security.score.strong': 'Strong',
    'security.score.good': 'Good',
    'security.score.attention': 'Needs attention',
    'security.score.risky': 'Risky',
    'security.score.pass': 'pass',
    'security.score.fail': 'fail',
    'security.score.warn': 'warn',
    // backup
    'backup.create': 'Create Backup',
    'backup.createEncrypted': 'Create Encrypted Backup',
    'backup.list': 'Backup files',
    'backup.download': 'Download',
    'backup.delete': 'Delete',
    'backup.restore': 'Restore',
    'backup.restoreWarning': 'Warning:',
    'backup.restoreWarningBody': ' Restoring will overwrite the current configuration. A pre-restore backup will be created automatically.',
    'backup.dryRun': 'Dry run (validate only, no changes)',
    'backup.confirmText': 'I understand this will overwrite the current configuration',
    'backup.selectFile': 'Select a backup file…',
    'backup.noBackups': 'No backups found.',
    'backup.creating': 'Creating backup…',
    'backup.restoring': 'Restoring…',
    'backup.restoreSelect': 'Please select a backup file.',
    'backup.restoreConfirm': 'Please check the confirmation checkbox.',
    // notifications
    'notifications.title': 'Notification channels',
    'notifications.enabled': 'Enable notifications',
    'notifications.email': 'Email (SMTP)',
    'notifications.emailEnabled': 'Enable email',
    'notifications.webhook': 'Webhook',
    'notifications.webhookEnabled': 'Enable webhook',
    'notifications.smtp.host': 'SMTP Host',
    'notifications.smtp.port': 'SMTP Port',
    'notifications.smtp.from': 'From',
    'notifications.smtp.to': 'To',
    'notifications.smtp.user': 'Username',
    'notifications.smtp.password': 'Password',
    'notifications.webhook.url': 'Webhook URL',
    'notifications.alerts': 'Alert thresholds',
    'notifications.alerts.disk': 'Disk usage threshold (%)',
    'notifications.alerts.cert': 'Certificate expiry warning (days)',
    'notifications.save': 'Save',
    'notifications.test': 'Send test',
    'notifications.history': 'Notification history',
    'notifications.saved': 'Configuration saved.',
    'notifications.testSent': 'Test notification sent.',
    'notifications.noChannels': 'No channels configured or reachable.',
    // Phase 3
    'nav.monitoring': 'Monitoring',
    'nav.apps': 'Apps',
    'nav.filedrop': 'File Drop',
    'nav.migration': 'Migration',
    // Xray
    'nav.xray': 'VLESS+Reality',
    'xray.status': 'Service Status',
    'xray.connectionInfo': 'Connection Parameters',
    'xray.clientUri': 'Client Configuration',
    'xray.generate': 'Generate URI',
    'xray.restart': '↺ Restart Xray',
    'xray.running': 'Running',
    'xray.stopped': 'Stopped',
    'xray.protocol': 'Protocol',
    'xray.port': 'Port',
    'xray.sni': 'SNI Target',
    'xray.publicKey': 'Public Key',
    'xray.uriHint': 'Import with v2rayN (Windows/Linux), v2rayNG (Android), Shadowrocket or Sing-box (iOS/macOS).',
    'xray.copyDone': '✓ Copied',
    'xray.notEnabled': 'Xray VLESS+Reality is not enabled. Set XRAY_ENABLED=yes in .env and re-run bootstrap.sh.',
    'monitoring.add': '+ Add Monitor',
    'monitoring.empty': 'No monitors. Click + Add Monitor to create one.',
    'monitoring.col.name': 'Name',
    'monitoring.col.type': 'Type',
    'monitoring.col.status': 'Status',
    'monitoring.col.lastCheck': 'Last Check',
    'monitoring.col.response': 'Response',
    'monitoring.status.up': 'Up',
    'monitoring.status.down': 'Down',
    'monitoring.status.unknown': 'Unknown',
    'monitoring.status.disabled': 'Disabled',
    'apps.catalog': 'App Catalog',
    'apps.installed': 'Installed Apps',
    'apps.noneInstalled': 'No apps installed.',
    'apps.install': 'Install',
    'apps.start': '▶ Start',
    'apps.stop': '‖ Stop',
    'apps.restart': '↻ Restart',
    'apps.logs': 'Logs',
    'apps.update': '↑ Update',
    'apps.remove': 'Remove',
    'apps.status.running': 'Running',
    'apps.status.stopped': 'Stopped',
    'apps.status.not_found': 'Not found',
    'filedrop.uploadHint': 'Click or drag a file here to share it',
    'filedrop.expires': 'Expires after (days, 1–30)',
    'filedrop.maxDownloads': 'Max downloads',
    'filedrop.password': 'Password (optional)',
    'filedrop.mode': 'Access mode',
    'filedrop.mode.vpn': 'VPN only',
    'filedrop.mode.public': 'Public HTTPS',
    'filedrop.publicWarn': '⚠ Public links are accessible without VPN login.',
    'filedrop.upload': 'Upload & Generate Link',
    'filedrop.cleanup': '↻ Cleanup',
    'filedrop.noShares': 'No active shares.',
    'filedrop.col.name': 'File',
    'filedrop.col.size': 'Size',
    'filedrop.col.expires': 'Expires',
    'filedrop.col.downloads': 'Downloads',
    'filedrop.col.mode': 'Mode',
    'filedrop.linkCopied': '✓ Link copied',
    'migration.dnsTitle': 'DNS Records to Update',
    'migration.checklistTitle': 'Migration Checklist',
    'migration.export': 'Create Migration Backup',
    'migration.exportDone': '✓ Backup created:',
    'migration.readiness': 'Service Readiness',
    'common.refresh': '↻ Refresh',
    'nav.settings': 'Settings',
    'settings.interfaceMode': 'Interface Mode',
    'settings.interfaceMode.desc': 'Choose how much of the portal is visible. You can change this at any time.',
    'settings.mode.user': 'User',
    'settings.mode.user.desc': 'Simple mode for creating VPN devices and using DNS protection.',
    'settings.mode.super_user': 'Super User',
    'settings.mode.super_user.desc': 'Operational mode for managing devices, backups, monitoring, notifications and security overview.',
    'settings.mode.advanced': 'Advanced',
    'settings.mode.advanced.desc': 'Full administration mode exposing WireGuard, AdGuard, Gateway, Apps, File Drop, Migration, logs and low-level controls.',
    'settings.mode.apply': 'Apply Mode',
    'settings.mode.updated': '✓ Mode updated.',
    'settings.recommended': 'Recommended',
    'dnsBasic.title': 'DNS Protection',
    'dnsBasic.desc': 'Choose the level of DNS protection for your devices.',
    'dnsBasic.standard': 'Standard Protection',
    'dnsBasic.standard.desc': 'Block ads, trackers, malware and phishing.',
    'dnsBasic.malware': 'Malware Only',
    'dnsBasic.malware.desc': 'Block malware and phishing only.',
    'dnsBasic.none': 'No Filtering',
    'dnsBasic.none.desc': 'No DNS filtering applied.',
    'advancedConfirm.title': 'Enable Advanced Mode',
    'advancedConfirm.body': 'Advanced mode exposes low-level VPS, firewall, reverse proxy, Docker and security controls.',
    'advancedConfirm.subtext': 'Use only if you understand the impact of these settings.',
    'advancedConfirm.checkbox': 'I understand the impact of Advanced mode.',
    'advancedConfirm.confirm': 'Enable Advanced Mode',
    'dashUser.getStarted': 'Get started with your VPN',
    'dashUser.step1': 'Create a VPN device',
    'dashUser.step2': 'Scan the QR code with the WireGuard app',
    'dashUser.step3': 'Choose DNS protection level',
    'dashUser.step4': 'Confirm device is connected',
    'dashUser.myDevices': 'My Devices',
    'devices.none': 'No devices yet. Create a device first.',
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
    'server.prompt': 'Nom du serveur (lettres, chiffres, -, _ et . autorisés) :',
    'server.invalid': 'Nom invalide. Utilisez uniquement des lettres, chiffres, -, _ ou .',
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
    // barre de statut
    'security.myip': 'Votre IP',
    'security.status.title': 'Services',
    'service.up': 'En ligne',
    'service.down': 'Hors ligne',
    // édition config
    'security.config.edit': '✎ Modifier la config',
    'security.config.editTitle': 'Modifier la config Fail2Ban',
    'security.config.seconds': 'secondes',
    'security.config.save': 'Enregistrer',
    'security.config.savedOk': 'Configuration enregistrée.',
    // liste blanche
    'security.whitelist.title': 'Liste blanche IP',
    'security.whitelist.subtitle': 'Jamais banni',
    'security.whitelist.placeholder': 'ex. 1.2.3.4 ou 10.0.0.0/8',
    'security.whitelist.add': '+ Ajouter',
    'security.whitelist.none': 'Aucune IP en liste blanche.',
    'security.whitelist.remove': 'Supprimer',
    // journal fail2ban
    'security.jaillog.title': 'Journal Fail2Ban',
    'security.jaillog.empty': 'Aucune entrée pour cette prison.',
    'security.jaillog.noFile': 'Fichier de log Fail2Ban introuvable.',
    // sessions
    'security.sessions.title': 'Sessions actives',
    'security.sessions.revoke': 'Révoquer',
    'security.sessions.current': '● Courante',
    'security.sessions.none': 'Aucune session active.',
    // tls
    'security.tls.title': 'Certificat TLS',
    'security.tls.subject': 'Domaine',
    'security.tls.issuer': 'Émetteur',
    'security.tls.validTo': 'Expiration',
    'security.tls.type': 'Type',
    'security.tls.internal': 'Interne (auto-signé)',
    'security.tls.acme': 'ACME (Let\'s Encrypt)',
    'security.tls.daysLeft': '{n} jours restants',
    'security.tls.expired': 'EXPIRÉ',
    'security.tls.error': 'Impossible de lire le certificat.',
    // mot de passe
    'security.password.title': 'Changer le mot de passe',
    'security.password.current': 'Mot de passe actuel',
    'security.password.new': 'Nouveau mot de passe (min 8 car.)',
    'security.password.confirm': 'Confirmer le nouveau mot de passe',
    'security.password.save': 'Changer le mot de passe',
    'security.password.mismatch': 'Les mots de passe ne correspondent pas.',
    'security.password.tooShort': 'Minimum 8 caractères.',
    'security.password.success': 'Mot de passe changé avec succès.',
    'security.password.wrongCurrent': 'Mot de passe actuel incorrect.',
    'nav.backups': 'Sauvegardes',
    'nav.notifications': 'Notifications',
    'nav.devices': 'Appareils',
    'nav.dnsProfiles': 'Profils DNS',
    'nav.gateway': 'Passerelle',
    'devices.add': '+ Ajouter',
    'devices.col.name': 'Nom',
    'devices.col.owner': 'Propriétaire',
    'devices.col.status': 'Statut',
    'devices.col.dns': 'Profil DNS',
    'devices.col.routing': 'Routage',
    'devices.col.expires': 'Expiration',
    'devices.col.actions': 'Actions',
    'devices.status.online': 'Connecté',
    'devices.status.recently_seen': 'Récent',
    'devices.status.offline': 'Hors ligne',
    'devices.status.inactive': 'Inactif',
    'devices.status.revoked': 'Révoqué',
    'devices.status.expired': 'Expiré',
    'devices.status.never_connected': 'Jamais',
    'devices.status.unknown': '?',
    'devices.routing.full_tunnel': 'Tunnel complet',
    'devices.routing.dns_only': 'DNS seul',
    'devices.routing.private_access': 'Privé',
    'devices.routing.custom': 'Personnalisé',
    'devices.bypass.active': 'Bypass actif',
    'devices.expires.never': '—',
    'dnsProfiles.assignments': 'Assignations',
    'dnsProfiles.bypass': 'Bypass',
    'dnsProfiles.bypass.set': 'Activer bypass',
    'dnsProfiles.bypass.revoke': 'Révoquer',
    'dnsProfiles.type.managed': 'Intégré',
    'dnsProfiles.type.custom': 'Personnalisé',
    'gateway.add': '+ Ajouter service',
    'gateway.empty': 'Aucun service proxy configuré.',
    'gateway.exposure.vpn_only': 'VPN uniquement',
    'gateway.exposure.public': 'HTTPS public',
    'gateway.caddy.ok': 'API Caddy accessible',
    'gateway.caddy.down': 'API Caddy inaccessible — exécuter ./easywg migrate',
    'health.cpu': 'CPU',
    'health.ram': 'RAM',
    'health.disk': 'Disque',
    'health.uptime': 'Disponibilité',
    'security.score.title': 'Score de sécurité',
    'security.score.rescan': '↻ Rescanner',
    'security.score.strong': 'Fort',
    'security.score.good': 'Bon',
    'security.score.attention': 'À améliorer',
    'security.score.risky': 'Risqué',
    'security.score.pass': 'ok',
    'security.score.fail': 'échec',
    'security.score.warn': 'avert.',
    'backup.create': 'Créer une sauvegarde',
    'backup.createEncrypted': 'Sauvegarde chiffrée',
    'backup.list': 'Fichiers de sauvegarde',
    'backup.download': 'Télécharger',
    'backup.delete': 'Supprimer',
    'backup.restore': 'Restaurer',
    'backup.restoreWarning': 'Attention :',
    'backup.restoreWarningBody': ' La restauration écrasera la configuration actuelle. Une sauvegarde préalable sera créée automatiquement.',
    'backup.dryRun': 'Simulation (validation uniquement, aucune modification)',
    'backup.confirmText': 'Je comprends que cela écrasera la configuration actuelle',
    'backup.selectFile': 'Sélectionner un fichier de sauvegarde…',
    'backup.noBackups': 'Aucune sauvegarde trouvée.',
    'backup.creating': 'Création de la sauvegarde…',
    'backup.restoring': 'Restauration…',
    'backup.restoreSelect': 'Veuillez sélectionner un fichier de sauvegarde.',
    'backup.restoreConfirm': 'Veuillez cocher la case de confirmation.',
    'notifications.title': 'Canaux de notification',
    'notifications.enabled': 'Activer les notifications',
    'notifications.email': 'Email (SMTP)',
    'notifications.emailEnabled': 'Activer l\'email',
    'notifications.webhook': 'Webhook',
    'notifications.webhookEnabled': 'Activer le webhook',
    'notifications.smtp.host': 'Hôte SMTP',
    'notifications.smtp.port': 'Port SMTP',
    'notifications.smtp.from': 'Expéditeur',
    'notifications.smtp.to': 'Destinataire',
    'notifications.smtp.user': 'Utilisateur',
    'notifications.smtp.password': 'Mot de passe',
    'notifications.webhook.url': 'URL du webhook',
    'notifications.alerts': 'Seuils d\'alerte',
    'notifications.alerts.disk': 'Seuil d\'utilisation du disque (%)',
    'notifications.alerts.cert': 'Alerte expiration certificat (jours)',
    'notifications.save': 'Enregistrer',
    'notifications.test': 'Envoyer un test',
    'notifications.history': 'Historique des notifications',
    'notifications.saved': 'Configuration enregistrée.',
    'notifications.testSent': 'Notification de test envoyée.',
    'notifications.noChannels': 'Aucun canal configuré ou joignable.',
    // Phase 3
    'nav.monitoring': 'Surveillance',
    'nav.apps': 'Applications',
    'nav.filedrop': 'Partage fichiers',
    'nav.migration': 'Migration',
    // Xray
    'nav.xray': 'VLESS+Reality',
    'xray.status': 'État du service',
    'xray.connectionInfo': 'Paramètres de connexion',
    'xray.clientUri': 'Configuration client',
    'xray.generate': 'Générer URI',
    'xray.restart': '↺ Redémarrer Xray',
    'xray.running': 'En cours',
    'xray.stopped': 'Arrêté',
    'xray.protocol': 'Protocole',
    'xray.port': 'Port',
    'xray.sni': 'Cible SNI',
    'xray.publicKey': 'Clé publique',
    'xray.uriHint': 'Importer avec v2rayN (Windows/Linux), v2rayNG (Android), Shadowrocket ou Sing-box (iOS/macOS).',
    'xray.copyDone': '✓ Copié',
    'xray.notEnabled': 'Xray VLESS+Reality n\'est pas activé. Définir XRAY_ENABLED=yes dans .env et relancer bootstrap.sh.',
    'monitoring.add': '+ Ajouter moniteur',
    'monitoring.empty': 'Aucun moniteur. Cliquez + Ajouter moniteur.',
    'monitoring.col.name': 'Nom',
    'monitoring.col.type': 'Type',
    'monitoring.col.status': 'Statut',
    'monitoring.col.lastCheck': 'Dernier contrôle',
    'monitoring.col.response': 'Réponse',
    'monitoring.status.up': 'En ligne',
    'monitoring.status.down': 'Hors ligne',
    'monitoring.status.unknown': 'Inconnu',
    'monitoring.status.disabled': 'Désactivé',
    'apps.catalog': 'Catalogue d\'applications',
    'apps.installed': 'Applications installées',
    'apps.noneInstalled': 'Aucune application installée.',
    'apps.install': 'Installer',
    'apps.start': '▶ Démarrer',
    'apps.stop': '‖ Arrêter',
    'apps.restart': '↻ Redémarrer',
    'apps.logs': 'Journaux',
    'apps.update': '↑ Mettre à jour',
    'apps.remove': 'Supprimer',
    'apps.status.running': 'En cours',
    'apps.status.stopped': 'Arrêté',
    'apps.status.not_found': 'Introuvable',
    'filedrop.uploadHint': 'Cliquez ou déposez un fichier ici pour le partager',
    'filedrop.expires': 'Expire après (jours, 1–30)',
    'filedrop.maxDownloads': 'Téléchargements max',
    'filedrop.password': 'Mot de passe (optionnel)',
    'filedrop.mode': 'Mode d\'accès',
    'filedrop.mode.vpn': 'VPN uniquement',
    'filedrop.mode.public': 'HTTPS public',
    'filedrop.publicWarn': '⚠ Les liens publics sont accessibles sans connexion VPN.',
    'filedrop.upload': 'Uploader & Générer le lien',
    'filedrop.cleanup': '↻ Nettoyer',
    'filedrop.noShares': 'Aucun partage actif.',
    'filedrop.col.name': 'Fichier',
    'filedrop.col.size': 'Taille',
    'filedrop.col.expires': 'Expire le',
    'filedrop.col.downloads': 'Téléchargements',
    'filedrop.col.mode': 'Mode',
    'filedrop.linkCopied': '✓ Lien copié',
    'migration.dnsTitle': 'Enregistrements DNS à mettre à jour',
    'migration.checklistTitle': 'Liste de migration',
    'migration.export': 'Créer sauvegarde de migration',
    'migration.exportDone': '✓ Sauvegarde créée :',
    'migration.readiness': 'État des services',
    'common.refresh': '↻ Actualiser',
    'nav.settings': 'Paramètres',
    'settings.interfaceMode': 'Mode d\'interface',
    'settings.interfaceMode.desc': 'Choisissez la quantité du portail visible. Vous pouvez changer cela à tout moment.',
    'settings.mode.user': 'Utilisateur',
    'settings.mode.user.desc': 'Mode simple pour créer des appareils VPN et utiliser la protection DNS.',
    'settings.mode.super_user': 'Super Utilisateur',
    'settings.mode.super_user.desc': 'Mode opérationnel pour gérer les appareils, sauvegardes, surveillance, notifications et aperçu de sécurité.',
    'settings.mode.advanced': 'Avancé',
    'settings.mode.advanced.desc': 'Mode d\'administration complète exposant WireGuard, AdGuard, Gateway, Apps, File Drop, Migration, journaux et contrôles avancés.',
    'settings.mode.apply': 'Appliquer le mode',
    'settings.mode.updated': '✓ Mode mis à jour.',
    'settings.recommended': 'Recommandé',
    'dnsBasic.title': 'Protection DNS',
    'dnsBasic.desc': 'Choisissez le niveau de protection DNS pour vos appareils.',
    'dnsBasic.standard': 'Protection standard',
    'dnsBasic.standard.desc': 'Bloquer publicités, traceurs, malwares et phishing.',
    'dnsBasic.malware': 'Malwares seulement',
    'dnsBasic.malware.desc': 'Bloquer uniquement malwares et phishing.',
    'dnsBasic.none': 'Sans filtrage',
    'dnsBasic.none.desc': 'Aucun filtrage DNS appliqué.',
    'advancedConfirm.title': 'Activer le mode Avancé',
    'advancedConfirm.body': 'Le mode Avancé expose les contrôles bas niveau du VPS, pare-feu, proxy inverse, Docker et sécurité.',
    'advancedConfirm.subtext': 'Utilisez uniquement si vous comprenez l\'impact de ces paramètres.',
    'advancedConfirm.checkbox': 'Je comprends l\'impact du mode Avancé.',
    'advancedConfirm.confirm': 'Activer le mode Avancé',
    'dashUser.getStarted': 'Démarrez avec votre VPN',
    'dashUser.step1': 'Créer un appareil VPN',
    'dashUser.step2': 'Scanner le QR code avec l\'application WireGuard',
    'dashUser.step3': 'Choisir le niveau de protection DNS',
    'dashUser.step4': 'Confirmer que l\'appareil est connecté',
    'dashUser.myDevices': 'Mes appareils',
    'devices.none': 'Aucun appareil. Créez un appareil en premier.',
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
    'server.prompt': '服务器名称（允许字母、数字、-、_ 和 .）：',
    'server.invalid': '服务器名称无效。仅允许字母、数字、-、_ 和 .。',
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
    // status bar
    'security.myip': '当前 IP',
    'security.status.title': '服务状态',
    'service.up': '在线',
    'service.down': '离线',
    // config edit
    'security.config.edit': '✎ 编辑配置',
    'security.config.editTitle': '编辑 Fail2Ban 配置',
    'security.config.seconds': '秒',
    'security.config.save': '保存',
    'security.config.savedOk': '配置已保存。',
    // whitelist
    'security.whitelist.title': 'IP 白名单',
    'security.whitelist.subtitle': '永不封禁',
    'security.whitelist.placeholder': '如 1.2.3.4 或 10.0.0.0/8',
    'security.whitelist.add': '+ 添加',
    'security.whitelist.none': '暂无白名单 IP。',
    'security.whitelist.remove': '移除',
    // fail2ban log
    'security.jaillog.title': 'Fail2Ban 日志',
    'security.jaillog.empty': '该 jail 暂无日志。',
    'security.jaillog.noFile': '未找到 Fail2Ban 日志文件。',
    // sessions
    'security.sessions.title': '活跃会话',
    'security.sessions.revoke': '撤销',
    'security.sessions.current': '● 当前',
    'security.sessions.none': '暂无活跃会话。',
    // tls
    'security.tls.title': 'TLS 证书',
    'security.tls.subject': '域名',
    'security.tls.issuer': '颁发者',
    'security.tls.validTo': '到期时间',
    'security.tls.type': '类型',
    'security.tls.internal': '内部（自签名）',
    'security.tls.acme': 'ACME（Let\'s Encrypt）',
    'security.tls.daysLeft': '剩余 {n} 天',
    'security.tls.expired': '已过期',
    'security.tls.error': '无法读取证书信息。',
    // password
    'security.password.title': '修改密码',
    'security.password.current': '当前密码',
    'security.password.new': '新密码（至少 8 位）',
    'security.password.confirm': '确认新密码',
    'security.password.save': '修改密码',
    'security.password.mismatch': '两次密码不一致。',
    'security.password.tooShort': '至少需要 8 个字符。',
    'security.password.success': '密码修改成功。',
    'security.password.wrongCurrent': '当前密码不正确。',
    'nav.backups': '备份',
    'nav.notifications': '通知',
    'nav.devices': '设备',
    'nav.dnsProfiles': 'DNS 配置',
    'nav.gateway': '网关',
    'devices.add': '+ 添加设备',
    'devices.col.name': '名称',
    'devices.col.owner': '用户',
    'devices.col.status': '状态',
    'devices.col.dns': 'DNS 配置',
    'devices.col.routing': '路由',
    'devices.col.expires': '到期',
    'devices.col.actions': '操作',
    'devices.status.online': '在线',
    'devices.status.recently_seen': '最近',
    'devices.status.offline': '离线',
    'devices.status.inactive': '未激活',
    'devices.status.revoked': '已吊销',
    'devices.status.expired': '已过期',
    'devices.status.never_connected': '从未',
    'devices.status.unknown': '?',
    'devices.routing.full_tunnel': '完全隧道',
    'devices.routing.dns_only': '仅 DNS',
    'devices.routing.private_access': '私有',
    'devices.routing.custom': '自定义',
    'devices.bypass.active': '旁路激活',
    'devices.expires.never': '—',
    'dnsProfiles.assignments': '设备分配',
    'dnsProfiles.bypass': '旁路',
    'dnsProfiles.bypass.set': '设置旁路',
    'dnsProfiles.bypass.revoke': '撤销',
    'dnsProfiles.type.managed': '内置',
    'dnsProfiles.type.custom': '自定义',
    'gateway.add': '+ 添加服务',
    'gateway.empty': '未配置代理服务。',
    'gateway.exposure.vpn_only': '仅 VPN',
    'gateway.exposure.public': '公开 HTTPS',
    'gateway.caddy.ok': 'Caddy 管理 API 可用',
    'gateway.caddy.down': 'Caddy 管理 API 不可用 — 请运行 ./easywg migrate',
    'health.cpu': 'CPU 使用率',
    'health.ram': '内存使用率',
    'health.disk': '磁盘使用率',
    'health.uptime': '运行时间',
    'security.score.title': '安全评分',
    'security.score.rescan': '↻ 重新扫描',
    'security.score.strong': '强',
    'security.score.good': '良好',
    'security.score.attention': '需要改进',
    'security.score.risky': '风险',
    'security.score.pass': '通过',
    'security.score.fail': '失败',
    'security.score.warn': '警告',
    'backup.create': '创建备份',
    'backup.createEncrypted': '创建加密备份',
    'backup.list': '备份文件',
    'backup.download': '下载',
    'backup.delete': '删除',
    'backup.restore': '还原',
    'backup.restoreWarning': '警告：',
    'backup.restoreWarningBody': ' 还原将覆盖当前配置，系统会自动创建预还原备份。',
    'backup.dryRun': '演习模式（仅验证，不应用更改）',
    'backup.confirmText': '我了解这将覆盖当前配置',
    'backup.selectFile': '选择备份文件…',
    'backup.noBackups': '未找到备份文件。',
    'backup.creating': '正在创建备份…',
    'backup.restoring': '正在还原…',
    'backup.restoreSelect': '请选择备份文件。',
    'backup.restoreConfirm': '请勾选确认复选框。',
    'notifications.title': '通知渠道',
    'notifications.enabled': '启用通知',
    'notifications.email': '电子邮件（SMTP）',
    'notifications.emailEnabled': '启用邮件',
    'notifications.webhook': 'Webhook',
    'notifications.webhookEnabled': '启用 Webhook',
    'notifications.smtp.host': 'SMTP 主机',
    'notifications.smtp.port': 'SMTP 端口',
    'notifications.smtp.from': '发件人',
    'notifications.smtp.to': '收件人',
    'notifications.smtp.user': '用户名',
    'notifications.smtp.password': '密码',
    'notifications.webhook.url': 'Webhook URL',
    'notifications.alerts': '告警阈值',
    'notifications.alerts.disk': '磁盘使用率阈值 (%)',
    'notifications.alerts.cert': '证书到期预警（天）',
    'notifications.save': '保存',
    'notifications.test': '发送测试',
    'notifications.history': '通知历史',
    'notifications.saved': '配置已保存。',
    'notifications.testSent': '测试通知已发送。',
    'notifications.noChannels': '未配置或无法连接任何通知渠道。',
    // Phase 3
    'nav.monitoring': '监控',
    'nav.apps': '应用',
    'nav.filedrop': '文件分享',
    'nav.migration': '迁移',
    // Xray
    'nav.xray': 'VLESS+Reality',
    'xray.status': '服务状态',
    'xray.connectionInfo': '连接参数',
    'xray.clientUri': '客户端配置',
    'xray.generate': '生成URI',
    'xray.restart': '↺ 重启 Xray',
    'xray.running': '运行中',
    'xray.stopped': '已停止',
    'xray.protocol': '协议',
    'xray.port': '端口',
    'xray.sni': 'SNI目标',
    'xray.publicKey': '公钥',
    'xray.uriHint': '使用 v2rayN（Windows/Linux）、v2rayNG（Android）、Shadowrocket 或 Sing-box（iOS/macOS）导入。',
    'xray.copyDone': '✓ 已复制',
    'xray.notEnabled': 'Xray VLESS+Reality 未启用。在 .env 中设置 XRAY_ENABLED=yes 并重新运行 bootstrap.sh。',
    'monitoring.add': '+ 添加监控',
    'monitoring.empty': '无监控项。点击 + 添加监控 创建。',
    'monitoring.col.name': '名称',
    'monitoring.col.type': '类型',
    'monitoring.col.status': '状态',
    'monitoring.col.lastCheck': '最近检查',
    'monitoring.col.response': '响应',
    'monitoring.status.up': '正常',
    'monitoring.status.down': '异常',
    'monitoring.status.unknown': '未知',
    'monitoring.status.disabled': '已禁用',
    'apps.catalog': '应用目录',
    'apps.installed': '已安装应用',
    'apps.noneInstalled': '暂无已安装应用。',
    'apps.install': '安装',
    'apps.start': '▶ 启动',
    'apps.stop': '‖ 停止',
    'apps.restart': '↻ 重启',
    'apps.logs': '日志',
    'apps.update': '↑ 更新',
    'apps.remove': '删除',
    'apps.status.running': '运行中',
    'apps.status.stopped': '已停止',
    'apps.status.not_found': '未找到',
    'filedrop.uploadHint': '点击或拖放文件到此处进行分享',
    'filedrop.expires': '过期时间（天，1–30）',
    'filedrop.maxDownloads': '最大下载次数',
    'filedrop.password': '密码（可选）',
    'filedrop.mode': '访问模式',
    'filedrop.mode.vpn': '仅VPN',
    'filedrop.mode.public': '公开HTTPS',
    'filedrop.publicWarn': '⚠ 公开链接无需VPN即可访问。',
    'filedrop.upload': '上传并生成链接',
    'filedrop.cleanup': '↻ 清理',
    'filedrop.noShares': '暂无分享。',
    'filedrop.col.name': '文件',
    'filedrop.col.size': '大小',
    'filedrop.col.expires': '过期时间',
    'filedrop.col.downloads': '下载次数',
    'filedrop.col.mode': '模式',
    'filedrop.linkCopied': '✓ 链接已复制',
    'migration.dnsTitle': '需更新的DNS记录',
    'migration.checklistTitle': '迁移清单',
    'migration.export': '创建迁移备份',
    'migration.exportDone': '✓ 备份已创建：',
    'migration.readiness': '服务就绪状态',
    'common.refresh': '↻ 刷新',
    'nav.settings': '设置',
    'settings.interfaceMode': '界面模式',
    'settings.interfaceMode.desc': '选择门户显示的内容。您可以随时更改。',
    'settings.mode.user': '用户',
    'settings.mode.user.desc': '简单模式，用于创建VPN设备和使用DNS保护。',
    'settings.mode.super_user': '超级用户',
    'settings.mode.super_user.desc': '操作模式，用于管理设备、备份、监控、通知和安全概览。',
    'settings.mode.advanced': '高级',
    'settings.mode.advanced.desc': '完整管理模式，开放WireGuard、AdGuard、网关、应用、文件传输、迁移、日志和底层控制。',
    'settings.mode.apply': '应用模式',
    'settings.mode.updated': '✓ 模式已更新。',
    'settings.recommended': '推荐',
    'dnsBasic.title': 'DNS保护',
    'dnsBasic.desc': '为您的设备选择DNS保护级别。',
    'dnsBasic.standard': '标准保护',
    'dnsBasic.standard.desc': '屏蔽广告、追踪器、恶意软件和钓鱼网站。',
    'dnsBasic.malware': '仅恶意软件',
    'dnsBasic.malware.desc': '仅屏蔽恶意软件和钓鱼网站。',
    'dnsBasic.none': '不过滤',
    'dnsBasic.none.desc': '不应用DNS过滤。',
    'advancedConfirm.title': '启用高级模式',
    'advancedConfirm.body': '高级模式会开放VPS底层、防火墙、反向代理、Docker和安全控制。',
    'advancedConfirm.subtext': '请仅在了解这些设置影响的情况下使用。',
    'advancedConfirm.checkbox': '我了解高级模式的影响。',
    'advancedConfirm.confirm': '启用高级模式',
    'dashUser.getStarted': '开始使用您的VPN',
    'dashUser.step1': '创建VPN设备',
    'dashUser.step2': '用WireGuard应用扫描二维码',
    'dashUser.step3': '选择DNS保护级别',
    'dashUser.step4': '确认设备已连接',
    'dashUser.myDevices': '我的设备',
    'devices.none': '暂无设备，请先创建设备。',
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
  systemStatus:     null,
  whitelist:        null,
  sessions:         null,
  tlsCert:          null,
  serverName:       'vpn-server',
  lang:             'en',
  health:           null,
  backups:          [],
  notifConfig:      null,
  devices:          [],
  dnsProfiles:      [],
  proxyServices:    [],
  monitors:         [],
  apps:             [],
  filedropShares:   [],
  interfaceMode:    'super_user',
  capabilities:     null,
  xrayEnabled:      false,
};

function canDo(action) {
  const c = state.capabilities;
  if (!c) return true;
  return !!(c.actions?.all || c.actions?.[action]);
}

function hasModule(mod) {
  const c = state.capabilities;
  if (!c) return true;
  if (Array.isArray(c.modules)) return c.modules.includes(mod);
  return true;
}

async function loadCapabilities() {
  const data = await GET('/api/settings/ui-capabilities');
  if (!data) return;
  state.interfaceMode = data.interfaceMode;
  state.capabilities  = data;
  applyProfileToNav();
  applyProfileToBody();
  renderProfileBadge();
}

function applyProfileToNav() {
  document.querySelectorAll('.nav-item[data-requires-module]').forEach(el => {
    let mod = el.dataset.requiresModule;
    // User mode: dns_basic is surfaced through the dns-profiles tab
    if (state.interfaceMode === 'user' && mod === 'dns_profiles') mod = 'dns_basic';
    el.classList.toggle('hidden', !hasModule(mod));
    // Relabel nav items per profile
    const labelAttr = 'navLabel' + state.interfaceMode.replace(/_([a-z])/g, (_, c) => c.toUpperCase()).replace(/^./, c => c.toUpperCase());
    if (el.dataset[labelAttr]) {
      el.querySelector('[data-i18n]').textContent = el.dataset[labelAttr];
    }
  });
  // Redirect if current tab is now hidden
  const currentNav = document.querySelector(`.nav-item[data-tab="${state.tab}"]`);
  if (currentNav && currentNav.classList.contains('hidden')) switchTab('dashboard');
}

function applyProfileToBody() {
  document.body.dataset.interfaceMode = state.interfaceMode;
}

function renderProfileBadge() {
  const el = document.getElementById('profile-badge');
  if (!el) return;
  const labels = { user: 'User', super_user: 'Super User', advanced: 'Advanced' };
  el.textContent = labels[state.interfaceMode] || state.interfaceMode;
  el.dataset.mode = state.interfaceMode;
}

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
  return /^[A-Za-z0-9._-]+$/.test(String(name || '').trim());
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

const GET   = path         => api('GET',    path);
const POST  = (p, body)   => api('POST',   p, body);
const DEL   = (p, body)   => api('DELETE', p, body);
const PATCH = (p, body)   => api('PATCH',  p, body);

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
  // Profile guard: redirect to dashboard if tab module is not available
  if (state.capabilities) {
    const modKey = (name === 'dns-profiles')
      ? (state.interfaceMode === 'user' ? 'dns_basic' : 'dns_profiles')
      : name;
    if (!hasModule(modKey)) name = 'dashboard';
  }

  state.tab = name;

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === name);
  });
  document.querySelectorAll('.tab-content').forEach(el => {
    el.classList.toggle('hidden', el.id !== `tab-${name}`);
  });

  if (name === 'dashboard')     loadDashboard();
  if (name === 'clients')       loadClients();
  if (name === 'wireguard')     loadIframe('wireguard');
  if (name === 'adguard')       loadIframe('adguard');
  if (name === 'backups')       loadBackups();
  if (name === 'notifications') loadNotifications();
  if (name === 'devices')      loadDevicesTab();
  if (name === 'dns-profiles') loadDnsProfilesTab();
  if (name === 'gateway')      loadGatewayTab();
  if (name === 'monitoring')   loadMonitoringTab();
  if (name === 'apps')         loadAppsTab();
  if (name === 'filedrop')     loadFiledropTab();
  if (name === 'migration')    loadMigrationTab();
  if (name === 'xray')         loadXrayTab();
  if (name === 'settings')     loadSettingsTab();
  if (name !== 'security' && state.logAutoRefreshId) {
    clearInterval(state.logAutoRefreshId);
    state.logAutoRefreshId = null;
    const arEl = document.getElementById('log-auto-refresh');
    if (arEl) arEl.checked = false;
  }
  if (name === 'security')      loadSecurity();
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
  if (cfg.interfaceMode) state.interfaceMode = cfg.interfaceMode;
  state.xrayEnabled = cfg.xrayEnabled === true;
  renderServerName();
  await loadCapabilities();
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
  const mode = state.interfaceMode;

  // Always fetch clients and DNS stats
  const [clients, stats] = await Promise.all([
    GET('/api/clients'),
    GET('/api/adguard/stats'),
  ]);

  if (clients) state.clients = clients;

  if (mode === 'user') {
    renderDashboardUser(clients || [], stats);
  } else {
    // Super User and Advanced both need fail2ban
    const fail2ban = await GET('/api/fail2ban/status');
    if (mode === 'super_user') {
      renderDashboardSuperUser(clients || [], stats, fail2ban);
    } else {
      renderDashboardAdvanced(clients || [], stats, fail2ban);
      loadHealth(); // health-grid shown in Advanced
    }
    if (mode === 'super_user') loadHealth(); // health-grid also shown for Super User
  }
}

function renderDashboardUser(clients, stats) {
  const userSection = document.getElementById('dash-user-section');
  const now = Date.now();
  const connected = clients.filter(c => c.latestHandshakeAt && now - new Date(c.latestHandshakeAt).getTime() < 3 * 60 * 1000).length;
  const dnsActive = stats && (stats.num_dns_queries || 0) > 0;

  userSection.style.display = '';
  userSection.innerHTML = `
    <div class="dash-user-cta">
      <h2 data-i18n="dashUser.getStarted">Get started with your VPN</h2>
      <ol class="dash-user-steps">
        <li data-i18n="dashUser.step1">Create a VPN device</li>
        <li data-i18n="dashUser.step2">Scan the QR code with the WireGuard app</li>
        <li data-i18n="dashUser.step3">Choose DNS protection level</li>
        <li data-i18n="dashUser.step4">Confirm device is connected</li>
      </ol>
      <div class="dash-status-simple">
        <div class="dash-status-chip ok">VPN running</div>
        <div class="dash-status-chip ${connected > 0 ? 'ok' : ''}">${connected} device${connected !== 1 ? 's' : ''} online</div>
        <div class="dash-status-chip ${dnsActive ? 'ok' : ''}">DNS ${dnsActive ? 'active' : 'inactive'}</div>
      </div>
    </div>
    ${clients.length > 0 ? `
      <div class="section-header">
        <h3 data-i18n="dashUser.myDevices">My Devices</h3>
        <button class="btn-primary btn-sm" id="dash-new-btn-user" data-i18n="client.new">+ New Device</button>
      </div>
      <div>${renderDashClientListSimple(clients.slice(0, 6))}</div>
    ` : `
      <div style="text-align:center;padding:2rem">
        <button class="btn-primary" id="dash-new-btn-user" data-i18n="client.new">+ Create your first device</button>
      </div>
    `}
  `;
  applyI18n();
  // Wire up the new-client button in user section
  document.getElementById('dash-new-btn-user')?.addEventListener('click', () => openNewClientModal());
}

function renderDashClientListSimple(clients) {
  const now = Date.now();
  return clients.map(c => {
    const ok = c.latestHandshakeAt && now - new Date(c.latestHandshakeAt).getTime() < 3 * 60 * 1000;
    return `<div style="display:flex;align-items:center;gap:.5rem;padding:.4rem 0;border-bottom:1px solid var(--border);font-size:.85rem">
      <span class="status-dot ${ok ? 'connected' : ''}"></span>
      <span>${esc(c.name)}</span>
      <span style="color:var(--text-dim);margin-left:auto">${ok ? 'Connected' : 'Offline'}</span>
    </div>`;
  }).join('');
}

function renderDashboardSuperUser(clients, stats, fail2ban) {
  // Hide user CTA section
  const userSection = document.getElementById('dash-user-section');
  if (userSection) userSection.style.display = 'none';

  const now = Date.now();
  const connected = clients.filter(c => c.latestHandshakeAt && now - new Date(c.latestHandshakeAt).getTime() < 3 * 60 * 1000).length;

  // Stats grid
  document.getElementById('stat-total').textContent = clients.length;
  document.getElementById('stat-connected').textContent = connected;
  if (stats) {
    const total = stats.num_dns_queries || 0;
    const blocked = stats.num_blocked_filtering || 0;
    const pct = total > 0 ? Math.round((blocked / total) * 100) : 0;
    document.getElementById('stat-queries').textContent = fmtNum(total);
    document.getElementById('stat-blocked').textContent = fmtNum(blocked);
    document.getElementById('stat-pct').textContent = total > 0 ? `(${pct}%)` : '';
  }

  // Security summary (Super User — count only, no ban controls)
  const summaryEl = document.getElementById('dash-security-summary');
  if (summaryEl && fail2ban) {
    const banned = fail2ban.currentlyBanned || 0;
    summaryEl.innerHTML = `<div class="fail2ban-stats" style="font-size:.82rem;padding:.4rem 0">
      <span><strong>Fail2Ban</strong>: ${esc(fail2ban.jail || '—')}</span>
      <span><strong data-i18n="fail2ban.current">Currently banned</strong>: <span ${banned > 0 ? 'style="color:var(--orange)"' : ''}>${banned}</span></span>
      <span><strong data-i18n="fail2ban.total">Total banned</strong>: ${fail2ban.totalBanned || 0}</span>
    </div>`;
  }

  renderDashClientList(clients.slice(0, 6));
}

function renderDashboardAdvanced(clients, stats, fail2ban) {
  // Hide user CTA section
  const userSection = document.getElementById('dash-user-section');
  if (userSection) userSection.style.display = 'none';

  const now = Date.now();
  const connected = clients.filter(c => c.latestHandshakeAt && now - new Date(c.latestHandshakeAt).getTime() < 3 * 60 * 1000).length;

  document.getElementById('stat-total').textContent = clients.length;
  document.getElementById('stat-connected').textContent = connected;
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

  renderDashClientList(clients.slice(0, 6));
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

// ── Health metrics ────────────────────────────────────────────────────────────

function fmtBytes(bytes) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024)        return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  if (bytes >= 1024)               return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function fmtUptime(secs) {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

async function loadHealth() {
  const data = await GET('/api/health');
  if (!data) return;
  state.health = data;

  const cpu = document.getElementById('health-cpu');
  const ram = document.getElementById('health-ram');
  const disk = document.getElementById('health-disk');
  const uptime = document.getElementById('health-uptime');

  if (cpu)    { cpu.textContent = `${data.cpu?.pct ?? '—'}%`; cpu.className = `stat-value${(data.cpu?.pct||0) > 80 ? ' orange' : ''}`; }
  if (ram)    { ram.textContent = `${data.ram?.pct ?? '—'}%`; ram.className = `stat-value${(data.ram?.pct||0) > 85 ? ' orange' : ''}`; }
  if (disk)   { disk.textContent = `${data.disk?.pct ?? '—'}%`; disk.className = `stat-value${(data.disk?.pct||0) > 85 ? ' orange' : ''}`; }
  if (uptime) uptime.textContent = data.uptime ? fmtUptime(data.uptime) : '—';
}

// ── Security score ─────────────────────────────────────────────────────────────

async function loadSecurityScore() {
  const data = await GET('/api/security');
  const loadingEl = document.getElementById('score-loading');
  const contentEl = document.getElementById('score-content');
  if (!data || !contentEl) return;

  if (loadingEl) loadingEl.classList.add('hidden');
  contentEl.classList.remove('hidden');

  const gradeKey = {
    strong:        'security.score.strong',
    good:          'security.score.good',
    needs_attention: 'security.score.attention',
    risky:         'security.score.risky',
  }[data.grade] || 'security.score.risky';

  const gradeColor = { strong: 'var(--green)', good: 'var(--yellow)', needs_attention: 'var(--orange)', risky: 'var(--red)' }[data.grade] || 'var(--red)';

  const numEl = document.getElementById('score-number');
  const gradeEl = document.getElementById('score-grade');
  if (numEl)   { numEl.textContent = `${data.pct ?? data.score}%`; numEl.style.color = gradeColor; }
  if (gradeEl) { gradeEl.textContent = t(gradeKey); gradeEl.style.color = gradeColor; }

  const checksEl = document.getElementById('score-checks');
  if (checksEl && data.checks) {
    checksEl.innerHTML = data.checks.map(c => {
      const icon = c.status === 'pass' ? '✓' : c.status === 'warn' ? '⚠' : '✗';
      const color = c.status === 'pass' ? 'var(--green)' : c.status === 'warn' ? 'var(--yellow)' : 'var(--red)';
      return `<div class="score-check-row">
        <span class="score-check-icon" style="color:${color}">${icon}</span>
        <span class="score-check-label">${esc(c.label)}</span>
        <span class="score-check-pts" style="color:var(--text-dim)">${c.status !== 'warn' ? `+${c.pts}` : '—'}</span>
        ${c.note ? `<span class="score-check-note text-dim">${esc(c.note)}</span>` : ''}
      </div>`;
    }).join('');
  }
}

// ── Backup module ─────────────────────────────────────────────────────────────

function fmtFileSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024)        return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

async function loadBackups() {
  const data = await GET('/api/backup');
  if (!data) return;
  state.backups = data.backups || [];
  renderBackupList(state.backups);
  populateRestoreSelect(state.backups);
}

function renderBackupList(backups) {
  const el = document.getElementById('backup-list');
  if (!el) return;
  if (!backups.length) {
    el.innerHTML = `<div class="text-dim" style="font-size:.85rem;padding:.4rem 0">${esc(t('backup.noBackups'))}</div>`;
    return;
  }
  el.innerHTML = `<div class="log-table-wrap"><table class="log-table"><thead><tr>
    <th>${esc(t('backup.list'))}</th>
    <th>Size</th>
    <th>Date</th>
    <th></th>
  </tr></thead><tbody>
    ${backups.map(b => `<tr>
      <td><code style="font-size:.78rem">${esc(b.filename)}</code></td>
      <td>${esc(fmtFileSize(b.size))}</td>
      <td class="log-time">${esc(new Date(b.createdAt).toLocaleString())}</td>
      <td>
        <div class="actions">
          <a class="btn-ghost btn-sm" href="/api/backup/download/${encodeURIComponent(b.filename)}" download="${esc(b.filename)}">${esc(t('backup.download'))}</a>
          <button class="btn-ghost btn-sm" style="color:var(--red)" data-action="backup-delete" data-filename="${esc(b.filename)}">${esc(t('backup.delete'))}</button>
        </div>
      </td>
    </tr>`).join('')}
  </tbody></table></div>`;
}

function populateRestoreSelect(backups) {
  const sel = document.getElementById('restore-select');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = `<option value="">${esc(t('backup.selectFile'))}</option>` +
    backups.map(b => `<option value="${esc(b.filename)}" ${cur === b.filename ? 'selected' : ''}>${esc(b.filename)}</option>`).join('');
}

async function doCreateBackup(encrypt = false) {
  const msgEl = document.getElementById('backup-create-msg');
  if (msgEl) { msgEl.textContent = t('backup.creating'); msgEl.style.color = 'var(--text-dim)'; }
  const data = await POST('/api/backup/create', { encrypt });
  if (!data || data.error) {
    if (msgEl) { msgEl.textContent = data?.error || 'Error'; msgEl.style.color = 'var(--red)'; }
    return;
  }
  if (msgEl) { msgEl.textContent = `Created: ${data.filename}`; msgEl.style.color = 'var(--green)'; }
  state.backups = data.backups || [];
  renderBackupList(state.backups);
  populateRestoreSelect(state.backups);
}

async function doRestoreBackup() {
  const sel = document.getElementById('restore-select');
  const dryRun = document.getElementById('restore-dryrun')?.checked || false;
  const confirmed = document.getElementById('restore-confirm')?.checked || false;
  const msgEl = document.getElementById('restore-msg');

  const filename = sel?.value;
  if (!filename) { if (msgEl) { msgEl.textContent = t('backup.restoreSelect'); msgEl.style.color = 'var(--orange)'; } return; }
  if (!dryRun && !confirmed) { if (msgEl) { msgEl.textContent = t('backup.restoreConfirm'); msgEl.style.color = 'var(--orange)'; } return; }

  if (msgEl) { msgEl.textContent = t('backup.restoring'); msgEl.style.color = 'var(--text-dim)'; }
  const data = await POST('/api/backup/restore', { filename, dryRun, confirmed });
  if (!data || data.error) {
    if (msgEl) { msgEl.textContent = data?.error || 'Error'; msgEl.style.color = 'var(--red)'; }
    return;
  }
  if (dryRun) {
    if (msgEl) { msgEl.textContent = `Dry-run OK. Files: ${(data.files || []).length}. Created: ${data.manifest?.created_at || ''}. Hostname: ${data.manifest?.hostname || ''}`; msgEl.style.color = 'var(--green)'; }
  } else {
    if (msgEl) { msgEl.textContent = `Restore complete. Pre-restore backup: ${data.preRestoreFile || 'none'}`; msgEl.style.color = 'var(--green)'; }
  }
}

// ── Notification module ───────────────────────────────────────────────────────

async function loadNotifications() {
  const data = await GET('/api/notifications/config');
  if (!data) return;
  state.notifConfig = data;
  populateNotifForm(data);
  loadNotifHistory();
}

function populateNotifForm(cfg) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) { if (el.type === 'checkbox') el.checked = !!val; else el.value = val || ''; } };
  set('notif-enabled',         cfg.enabled);
  set('notif-email-enabled',   cfg.channels?.email?.enabled);
  set('notif-smtp-host',       cfg.channels?.email?.smtp_host);
  set('notif-smtp-port',       cfg.channels?.email?.smtp_port || 587);
  set('notif-smtp-from',       cfg.channels?.email?.from);
  set('notif-smtp-to',         cfg.channels?.email?.to);
  set('notif-smtp-user',       cfg.channels?.email?.username);
  set('notif-smtp-password',   cfg.channels?.email?.password);
  set('notif-webhook-enabled', cfg.channels?.webhook?.enabled);
  set('notif-webhook-url',     cfg.channels?.webhook?.url);
  set('notif-disk-threshold',  cfg.alerts?.disk_usage_threshold || 85);
  set('notif-cert-days',       cfg.alerts?.certificate_expiry_days || 14);
}

async function saveNotifConfig() {
  const get = (id) => { const el = document.getElementById(id); return el ? (el.type === 'checkbox' ? el.checked : el.value) : null; };
  const cfg = {
    enabled: get('notif-enabled'),
    channels: {
      email: {
        enabled:   get('notif-email-enabled'),
        smtp_host: get('notif-smtp-host'),
        smtp_port: parseInt(get('notif-smtp-port') || '587', 10),
        from:      get('notif-smtp-from'),
        to:        get('notif-smtp-to'),
        username:  get('notif-smtp-user'),
        password:  get('notif-smtp-password') || '***',
      },
      webhook: {
        enabled: get('notif-webhook-enabled'),
        url:     get('notif-webhook-url') || '***',
      },
    },
    alerts: {
      disk_usage_threshold:      parseInt(get('notif-disk-threshold') || '85', 10),
      certificate_expiry_days:   parseInt(get('notif-cert-days') || '14', 10),
    },
  };
  const result = await POST('/api/notifications/config', cfg);
  const msgEl = document.getElementById('notif-test-result');
  if (!result || result.error) {
    if (msgEl) { msgEl.textContent = result?.error || 'Error saving.'; msgEl.style.color = 'var(--red)'; }
    return;
  }
  if (msgEl) { msgEl.textContent = t('notifications.saved'); msgEl.style.color = 'var(--green)'; }
  state.notifConfig = result;
  setTimeout(() => { if (msgEl) msgEl.textContent = ''; }, 3000);
}

async function sendTestNotification() {
  const msgEl = document.getElementById('notif-test-result');
  if (msgEl) { msgEl.textContent = t('common.processing'); msgEl.style.color = 'var(--text-dim)'; }
  const data = await POST('/api/notifications/test', {});
  if (!data) return;
  const anyOk = (data.results || []).some(r => r.ok);
  if (msgEl) {
    msgEl.textContent = anyOk ? t('notifications.testSent') : t('notifications.noChannels');
    msgEl.style.color = anyOk ? 'var(--green)' : 'var(--orange)';
    const details = (data.results || []).map(r => `${r.channel}: ${r.ok ? 'ok' : r.error || 'fail'}`).join(' | ');
    if (details) msgEl.textContent += ` (${details})`;
  }
  loadNotifHistory();
}

async function loadNotifHistory() {
  const data = await GET('/api/notifications/history');
  const el = document.getElementById('notif-history');
  if (!el || !data) return;
  const hist = data.history || [];
  if (!hist.length) {
    el.innerHTML = `<div class="text-dim" style="font-size:.85rem;padding:.4rem 0">No notification history yet.</div>`;
    return;
  }
  el.innerHTML = hist.slice(0, 20).map(h => {
    const results = (h.results || []).map(r => `<span style="color:${r.ok ? 'var(--green)' : 'var(--red)'}">${esc(r.channel)}</span>`).join(' ');
    return `<div class="fail2ban-item" style="flex-wrap:wrap;gap:.3rem">
      <span style="font-size:.78rem;color:var(--text-dim)">${esc(new Date(h.sentAt).toLocaleString())}</span>
      <code style="font-size:.78rem">${esc(h.event)}</code>
      ${results}
    </div>`;
  }).join('');
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
  const mode = state.interfaceMode;

  // Score, status bar, and IP are always loaded (visible to all profiles that can see this tab)
  const always = [loadSecurityScore(), loadSystemStatus(), loadMyIp()];

  if (mode === 'advanced') {
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
      document.getElementById('edit-bantime').value  = config.bantime;
      document.getElementById('edit-findtime').value = config.findtime;
      document.getElementById('edit-maxretry').value = config.maxretry;
    }

    if (bans) {
      state.security.bans = bans;
      renderSecurityBans(bans);
      document.getElementById('sec-current-bans').textContent = String(bans.currentlyBanned || 0);
    }

    await Promise.all([
      ...always,
      loadLogs(state.securityLogFilter),
      loadWhitelist(),
      loadJailLog(),
      loadSessions(),
      loadTlsCert(),
    ]);
  } else if (mode === 'super_user') {
    // Super User: score + status + TLS + password change only
    await Promise.all([...always, loadTlsCert()]);
  } else {
    // User profile cannot reach security tab; guard in switchTab redirects away
    await Promise.all(always);
  }
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
      <div style="display:flex;align-items:center;gap:.6rem;flex:1;min-width:0">
        <code>${esc(ip)}</code>
        <span class="geo-tag" data-geo-ip="${esc(ip)}"></span>
      </div>
      <button class="btn-ghost btn-sm" style="color:var(--orange)" data-action="sec-unban" data-ip="${esc(ip)}">${esc(t('fail2ban.unban'))}</button>
    </div>
  `).join('');
  loadGeoForBans();
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

// ── My IP ────────────────────────────────────────────────────────────────────

async function loadMyIp() {
  const data = await GET('/api/myip');
  const el = document.getElementById('sec-my-ip-val');
  if (el) el.textContent = data?.ip || '—';
}

// ── Service status ────────────────────────────────────────────────────────────

async function loadSystemStatus() {
  const data = await GET('/api/system/status');
  if (!data) return;
  state.systemStatus = data;
  const map = { portal: 'svc-portal', 'wg-easy': 'svc-wgeasy', adguard: 'svc-adguard', caddy: 'svc-caddy' };
  for (const [key, elId] of Object.entries(map)) {
    const el = document.getElementById(elId);
    if (!el) continue;
    const svc = data[key];
    el.classList.toggle('svc-up',   !!svc?.up);
    el.classList.toggle('svc-down', !svc?.up);
    const dot = el.querySelector('.dot');
    if (dot) dot.style.color = svc?.up ? 'var(--green)' : 'var(--red)';
    el.title = svc?.up ? t('service.up') : (svc?.error || t('service.down'));
  }
}

// ── Whitelist ─────────────────────────────────────────────────────────────────

async function loadWhitelist() {
  const data = await GET('/api/fail2ban/ignoreip');
  if (data) renderWhitelist(data.ips || []);
}

function renderWhitelist(ips) {
  state.whitelist = ips;
  const el = document.getElementById('whitelist-list');
  if (!el) return;
  if (!ips.length) {
    el.innerHTML = `<div class="text-dim" style="font-size:.85rem;padding:.4rem 0">${esc(t('security.whitelist.none'))}</div>`;
    return;
  }
  el.innerHTML = ips.map(ip => `
    <div class="fail2ban-item">
      <code>${esc(ip)}</code>
      <button class="btn-ghost btn-sm" data-action="whitelist-remove" data-ip="${esc(ip)}">${esc(t('security.whitelist.remove'))}</button>
    </div>
  `).join('');
}

async function addWhitelistIp(ip) {
  ip = (ip || '').trim();
  if (!ip) return;
  const data = await POST('/api/fail2ban/ignoreip', { ip });
  if (!data || data.error) { window.alert(data?.error || 'Error'); return; }
  renderWhitelist(data.ips || []);
  document.getElementById('whitelist-ip-input').value = '';
}

async function removeWhitelistIp(ip) {
  const data = await DEL('/api/fail2ban/ignoreip', { ip });
  if (!data || data.error) { window.alert(data?.error || 'Error'); return; }
  renderWhitelist(data.ips || []);
}

// ── Fail2Ban jail log ─────────────────────────────────────────────────────────

async function loadJailLog() {
  const data = await GET('/api/fail2ban/jaillog?n=100');
  const el = document.getElementById('jaillog-wrap');
  if (!el) return;
  if (!data) return;
  if (data.error && !data.lines?.length) {
    el.innerHTML = `<div class="text-dim" style="padding:.5rem 0;font-size:.82rem">${esc(data.error || t('security.jaillog.noFile'))}</div>`;
    return;
  }
  const lines = data.lines || [];
  if (!lines.length) {
    el.innerHTML = `<div class="text-dim" style="padding:.5rem 0;font-size:.82rem">${esc(t('security.jaillog.empty'))}</div>`;
    return;
  }
  el.innerHTML = `<pre class="jaillog-pre">${esc(lines.join('\n'))}</pre>`;
}

// ── Active sessions ───────────────────────────────────────────────────────────

async function loadSessions() {
  const data = await GET('/api/sessions');
  const el = document.getElementById('sessions-list');
  if (!el || !data) return;
  const sessions = data.sessions || [];
  if (!sessions.length) {
    el.innerHTML = `<div class="text-dim" style="font-size:.85rem;padding:.4rem 0">${esc(t('security.sessions.none'))}</div>`;
    return;
  }
  el.innerHTML = `<div class="log-table-wrap"><table class="log-table">
    <thead><tr>
      <th>IP</th><th>User-Agent</th><th data-i18n="security.sessions.title">Login</th><th></th>
    </tr></thead>
    <tbody>${sessions.map(s => `<tr>
      <td><code class="log-ip">${esc(s.ip)}</code></td>
      <td class="log-uri" style="max-width:220px" title="${esc(s.ua)}">${esc(s.ua.length > 50 ? s.ua.slice(0, 50) + '…' : s.ua)}</td>
      <td class="log-time">${esc(new Date(s.loginAt).toLocaleString())}</td>
      <td>${s.isCurrent
        ? `<span style="color:var(--green);font-size:.78rem;font-weight:600">${esc(t('security.sessions.current'))}</span>`
        : `<button class="btn-ghost btn-sm" style="color:var(--red)" data-action="revoke-session" data-id="${esc(s.id)}">${esc(t('security.sessions.revoke'))}</button>`
      }</td>
    </tr>`).join('')}
    </tbody></table></div>`;
}

// ── TLS certificate ───────────────────────────────────────────────────────────

async function loadTlsCert() {
  const data = await GET('/api/tls/cert');
  const el = document.getElementById('tls-info');
  if (!el) return;
  if (!data || data.error) {
    el.innerHTML = `<div class="text-dim" style="font-size:.85rem">${esc(data?.error || t('security.tls.error'))}</div>`;
    return;
  }
  state.tlsCert = data;

  const expiryDate = new Date(data.validTo);
  const daysLeft   = Math.ceil((expiryDate - Date.now()) / 86400000);
  const expired    = daysLeft <= 0;
  const expiryColor = expired ? 'var(--red)' : daysLeft < 30 ? 'var(--orange)' : 'var(--green)';
  const expiryLabel = expired ? t('security.tls.expired') : t('security.tls.daysLeft', { n: daysLeft });

  el.innerHTML = `<div class="tls-grid">
    <div class="tls-row"><span class="tls-key">${esc(t('security.tls.subject'))}</span><span class="tls-val"><code>${esc(data.subject)}</code></span></div>
    <div class="tls-row"><span class="tls-key">${esc(t('security.tls.issuer'))}</span><span class="tls-val">${esc(data.issuer)}</span></div>
    <div class="tls-row"><span class="tls-key">${esc(t('security.tls.type'))}</span><span class="tls-val">${esc(data.isInternal ? t('security.tls.internal') : t('security.tls.acme'))}</span></div>
    <div class="tls-row"><span class="tls-key">${esc(t('security.tls.validTo'))}</span><span class="tls-val" style="color:${expiryColor};font-weight:600">${esc(data.validTo)} <span style="font-size:.78rem">(${esc(expiryLabel)})</span></span></div>
  </div>`;
}

// ── GeoIP flag ────────────────────────────────────────────────────────────────

function countryFlag(code) {
  if (!code || code.length !== 2) return '';
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

async function loadGeoForBans() {
  const flags = document.querySelectorAll('[data-geo-ip]');
  for (const el of flags) {
    const ip = el.dataset.geoIp;
    const data = await GET(`/api/geoip/${encodeURIComponent(ip)}`);
    if (data?.status === 'success') {
      el.textContent = `${countryFlag(data.countryCode)} ${data.country}`;
    } else {
      el.textContent = '';
    }
  }
}

async function banIp(ip) {
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

// ── Security: config edit ─────────────────────────────────────────────────────

document.getElementById('sec-edit-config-btn').addEventListener('click', () => {
  document.getElementById('sec-config-edit-panel').classList.toggle('hidden');
});

document.getElementById('sec-config-cancel-btn').addEventListener('click', () => {
  document.getElementById('sec-config-edit-panel').classList.add('hidden');
});

document.getElementById('sec-config-save-btn').addEventListener('click', async () => {
  const bantime  = parseInt(document.getElementById('edit-bantime').value, 10);
  const findtime = parseInt(document.getElementById('edit-findtime').value, 10);
  const maxretry = parseInt(document.getElementById('edit-maxretry').value, 10);
  const msgEl = document.getElementById('sec-config-msg');
  msgEl.textContent = t('common.processing');
  const data = await POST('/api/fail2ban/set-config', { bantime, findtime, maxretry });
  if (!data || data.error) { msgEl.style.color = 'var(--red)'; msgEl.textContent = data?.error || 'Error'; return; }
  state.security.config = data;
  document.getElementById('sec-bantime').textContent  = fmtSeconds(data.bantime);
  document.getElementById('sec-findtime').textContent = fmtSeconds(data.findtime);
  document.getElementById('sec-maxretry').textContent = String(data.maxretry);
  msgEl.style.color = 'var(--green)';
  msgEl.textContent = t('security.config.savedOk');
  setTimeout(() => { msgEl.textContent = ''; document.getElementById('sec-config-edit-panel').classList.add('hidden'); }, 1500);
});

// ── Security: whitelist ───────────────────────────────────────────────────────

document.getElementById('whitelist-add-btn').addEventListener('click', () =>
  addWhitelistIp(document.getElementById('whitelist-ip-input').value));

document.getElementById('whitelist-ip-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') addWhitelistIp(e.target.value);
});

document.getElementById('whitelist-list').addEventListener('click', async e => {
  const btn = e.target.closest('[data-action="whitelist-remove"]');
  if (!btn) return;
  await removeWhitelistIp(btn.dataset.ip);
});

// ── Security: jail log ────────────────────────────────────────────────────────

document.getElementById('jaillog-refresh-btn').addEventListener('click', loadJailLog);

// ── Security: sessions ────────────────────────────────────────────────────────

document.getElementById('sessions-refresh-btn').addEventListener('click', loadSessions);

document.getElementById('sessions-list').addEventListener('click', async e => {
  const btn = e.target.closest('[data-action="revoke-session"]');
  if (!btn) return;
  const data = await DEL(`/api/sessions/${encodeURIComponent(btn.dataset.id)}`);
  if (!data || data.error) { window.alert(data?.error || 'Error'); return; }
  loadSessions();
});

// ── Security: change password ─────────────────────────────────────────────────

document.getElementById('password-form').addEventListener('submit', async e => {
  e.preventDefault();
  const current  = document.getElementById('pw-current').value;
  const newPw    = document.getElementById('pw-new').value;
  const confirm  = document.getElementById('pw-confirm').value;
  const msgEl    = document.getElementById('pw-msg');
  msgEl.className = '';

  if (newPw.length < 8) {
    msgEl.textContent = t('security.password.tooShort');
    msgEl.style.color = 'var(--red)';
    return;
  }
  if (newPw !== confirm) {
    msgEl.textContent = t('security.password.mismatch');
    msgEl.style.color = 'var(--red)';
    return;
  }
  const data = await POST('/api/auth/password', { currentPassword: current, newPassword: newPw });
  if (!data || data.error) {
    msgEl.textContent = data?.error === 'Current password is incorrect.'
      ? t('security.password.wrongCurrent')
      : (data?.error || 'Error');
    msgEl.style.color = 'var(--red)';
    return;
  }
  msgEl.textContent = t('security.password.success');
  msgEl.style.color = 'var(--green)';
  document.getElementById('pw-current').value = '';
  document.getElementById('pw-new').value = '';
  document.getElementById('pw-confirm').value = '';
});

// ── Security: score rescan ─────────────────────────────────────────────────────

document.getElementById('score-rescan-btn').addEventListener('click', async () => {
  const btn = document.getElementById('score-rescan-btn');
  if (btn) btn.disabled = true;
  await POST('/api/security/rescan', {});
  await loadSecurityScore();
  if (btn) btn.disabled = false;
});

// ── Backups ───────────────────────────────────────────────────────────────────

document.getElementById('backup-create-btn').addEventListener('click',  () => doCreateBackup(false));
document.getElementById('backup-encrypt-btn').addEventListener('click', () => doCreateBackup(true));
document.getElementById('backup-refresh-btn').addEventListener('click', loadBackups);
document.getElementById('restore-btn').addEventListener('click', doRestoreBackup);

document.getElementById('backup-list').addEventListener('click', async e => {
  const btn = e.target.closest('[data-action="backup-delete"]');
  if (!btn) return;
  if (!confirm(`Delete ${btn.dataset.filename}?`)) return;
  const data = await DEL(`/api/backup/${encodeURIComponent(btn.dataset.filename)}`);
  if (!data || data.error) { window.alert(data?.error || 'Error deleting backup'); return; }
  state.backups = data.backups || [];
  renderBackupList(state.backups);
  populateRestoreSelect(state.backups);
});

// ── Notifications ─────────────────────────────────────────────────────────────

document.getElementById('notif-save-btn').addEventListener('click',         saveNotifConfig);
document.getElementById('notif-test-btn').addEventListener('click',         sendTestNotification);
document.getElementById('notif-hist-refresh-btn').addEventListener('click', loadNotifHistory);

// ── Phase 2: Devices (Module C) ───────────────────────────────────────────────

const STATUS_COLORS = {
  online: '#22c55e', recently_seen: '#84cc16', offline: '#6b7280',
  inactive: '#f59e0b', revoked: '#ef4444', expired: '#ef4444',
  never_connected: '#94a3b8', unknown: '#94a3b8',
};
const ROUTING_LABELS = {
  full_tunnel: 'devices.routing.full_tunnel', dns_only: 'devices.routing.dns_only',
  private_access: 'devices.routing.private_access', custom: 'devices.routing.custom',
};

function deviceStatusBadge(status) {
  const color = STATUS_COLORS[status] || '#94a3b8';
  const label = t(`devices.status.${status}`) || status;
  return `<span class="status-badge" style="background:${color}20;color:${color};border:1px solid ${color}40">${label}</span>`;
}

function formatExpiry(dev) {
  if (!dev.expiresAt) return t('devices.expires.never');
  const d = new Date(dev.expiresAt);
  const days = Math.ceil((d - Date.now()) / 86400000);
  if (days < 0) return `<span style="color:#ef4444">${d.toLocaleDateString()}</span>`;
  return d.toLocaleDateString();
}

async function loadDevicesTab() {
  const loading = document.getElementById('devices-loading');
  const wrap    = document.getElementById('devices-table-wrap');
  const summary = document.getElementById('devices-summary');
  if (loading) loading.classList.remove('hidden');
  if (wrap)    wrap.classList.add('hidden');

  const data = await GET('/api/devices');
  if (!data) return;
  state.devices = data.devices || [];

  if (summary) {
    const online = state.devices.filter(d => d.status === 'online').length;
    summary.textContent = `${state.devices.length} devices, ${online} online`;
  }

  renderDevicesTable();
  if (loading) loading.classList.add('hidden');
  if (wrap)    wrap.classList.remove('hidden');
}

function renderDevicesTable() {
  const tbody = document.getElementById('devices-tbody');
  if (!tbody) return;
  if (!state.devices.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-dim" style="text-align:center;padding:1rem">${t('common.loading')}</td></tr>`;
    return;
  }
  tbody.innerHTML = state.devices.map(dev => {
    const bypassBadge = dev.bypassActive
      ? `<span class="bypass-badge" title="${t('devices.bypass.active')}">⚡ bypass</span>` : '';
    const profileLabel = dev.dnsProfile || 'default_filtered';
    const routingLabel = t(ROUTING_LABELS[dev.routingMode] || 'devices.routing.full_tunnel');
    return `<tr>
      <td><strong>${esc(dev.name)}</strong>${bypassBadge}</td>
      <td>${esc(dev.owner || '—')}</td>
      <td>${deviceStatusBadge(dev.status)}</td>
      <td><span class="profile-tag">${esc(profileLabel)}</span></td>
      <td><span class="routing-tag">${routingLabel}</span></td>
      <td>${formatExpiry(dev)}</td>
      <td class="actions">
        <button class="btn-sm btn-ghost" data-action="dev-config" data-id="${dev.id}" title="Download config">↓</button>
        <button class="btn-sm btn-ghost" data-action="dev-qr" data-id="${dev.id}" title="WireGuard QR">⊡</button>
        ${hasModule('xray') && !dev.revokedAt ? `<button class="btn-sm btn-ghost" data-action="dev-xray" data-id="${dev.id}" title="VLESS URI">⊛</button>` : ''}
        ${dev.revokedAt ? '' : `<button class="btn-sm btn-ghost" data-action="dev-disable" data-id="${dev.id}">${dev.wgClient?.enabled === false ? '▶' : '‖'}</button>`}
        ${dev.revokedAt ? '' : `<button class="btn-sm btn-danger" data-action="dev-revoke" data-id="${dev.id}">✕</button>`}
      </td>
    </tr>`;
  }).join('');
}

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

document.getElementById('devices-refresh-btn').addEventListener('click', loadDevicesTab);

document.getElementById('device-add-btn').addEventListener('click', async () => {
  const name = window.prompt('Device name:');
  if (!name) return;
  const owner = window.prompt('Owner (optional):') || '';
  const data = await POST('/api/devices', { name, owner });
  if (!data || data.error) { window.alert(data?.error || 'Error creating device'); return; }
  await loadDevicesTab();
});

document.getElementById('devices-tbody').addEventListener('click', async e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;

  if (action === 'dev-config') {
    window.open(`/api/devices/${id}/config`, '_blank');
    return;
  }
  if (action === 'dev-qr') {
    const w = window.open('', '_blank');
    w.document.write(`<html><body style="background:#000;display:flex;justify-content:center;align-items:center;min-height:100vh"><img src="/api/devices/${id}/qr" style="max-width:400px"></body></html>`);
    return;
  }
  if (action === 'dev-xray') {
    const data = await GET(`/api/devices/${id}/xray-qr`);
    if (!data?.uri) { alert(data?.error || 'Error generating VLESS URI'); return; }
    document.getElementById('xray-device-modal-title').textContent = `VLESS — ${data.deviceName}`;
    document.getElementById('xray-device-qr').src = data.qrcode;
    document.getElementById('xray-device-uri').textContent = data.uri;
    document.getElementById('xray-device-copy-btn').textContent = t('common.copy') || '⎘ Copy URI';
    document.getElementById('xray-device-overlay').classList.remove('hidden');
    return;
  }
  const dev = state.devices.find(d => d.id === id);
  if (!dev) return;

  if (action === 'dev-disable') {
    const endpoint = dev.wgClient?.enabled === false ? 'enable' : 'disable';
    await POST(`/api/devices/${id}/${endpoint}`, {});
    await loadDevicesTab();
    return;
  }
  if (action === 'dev-revoke') {
    if (!confirm(`Revoke device "${dev.name}"? This permanently blocks VPN access.`)) return;
    const res = await POST(`/api/devices/${id}/revoke`, { confirmed: true });
    if (res?.error) { window.alert(res.error); return; }
    await loadDevicesTab();
    return;
  }
});

// VLESS device modal — close + copy
(function () {
  const overlay = document.getElementById('xray-device-overlay');
  const closeBtn = document.getElementById('xray-device-modal-close');
  const copyBtn  = document.getElementById('xray-device-copy-btn');
  if (!overlay) return;

  function closeModal() { overlay.classList.add('hidden'); }
  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  copyBtn.addEventListener('click', () => {
    const uri = document.getElementById('xray-device-uri').textContent;
    navigator.clipboard.writeText(uri).then(() => {
      const orig = copyBtn.textContent;
      copyBtn.textContent = t('xray.copyDone') || '✓ Copied';
      setTimeout(() => { copyBtn.textContent = orig; }, 2000);
    });
  });
})();

// ── Phase 2: DNS Profiles (Module A) ─────────────────────────────────────────

async function loadDnsProfilesTab() {
  if (state.interfaceMode === 'user') {
    await loadDnsBasic();
  } else {
    await loadDnsProfilesFull();
  }
}

async function loadDnsBasic() {
  const basicWrap   = document.getElementById('dns-basic-wrap');
  const fullWrap    = document.getElementById('dns-profiles-wrap');
  const loading     = document.getElementById('dns-profiles-loading');
  const titleEl     = document.getElementById('dns-tab-title');

  if (titleEl) titleEl.textContent = t('dnsBasic.title');
  if (fullWrap) fullWrap.classList.add('hidden');
  if (loading)  loading.classList.remove('hidden');

  // Fetch current device DNS settings
  const devData = await GET('/api/devices');
  if (loading) loading.classList.add('hidden');
  const devices = devData?.devices || [];
  state.devices = devices;

  const DNS_BASIC_OPTIONS = [
    { id: 'default_filtered', label: t('dnsBasic.standard'), desc: t('dnsBasic.standard.desc') },
    { id: 'malware_only',     label: t('dnsBasic.malware'),  desc: t('dnsBasic.malware.desc')  },
    { id: 'unfiltered',       label: t('dnsBasic.none'),     desc: t('dnsBasic.none.desc')      },
  ];

  basicWrap.classList.remove('hidden');
  basicWrap.innerHTML = `
    <p style="font-size:.85rem;color:var(--text-dim);margin-bottom:.75rem" data-i18n="dnsBasic.desc">
      Choose the level of DNS protection for your devices.
    </p>
    ${devices.length === 0 ? `<div class="text-dim" data-i18n="devices.none">No devices yet. Create a device first.</div>` : ''}
    ${devices.map(dev => {
      const current = dev.dnsProfile || 'default_filtered';
      return `
        <div class="security-panel" style="margin-bottom:.75rem">
          <div style="font-weight:600;margin-bottom:.5rem">${esc(dev.name)}</div>
          <div class="dns-basic-cards" data-dev-id="${dev.id}">
            ${DNS_BASIC_OPTIONS.map(opt => `
              <div class="dns-basic-card ${current === opt.id ? 'active' : ''}"
                   data-action="dns-basic-select" data-dev-id="${dev.id}" data-profile="${opt.id}">
                <div class="dns-basic-card-title">${esc(opt.label)}</div>
                <div class="dns-basic-card-desc">${esc(opt.desc)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('')}
  `;
  applyI18n();
}

async function loadDnsProfilesFull() {
  const basicWrap = document.getElementById('dns-basic-wrap');
  const loading   = document.getElementById('dns-profiles-loading');
  const wrap      = document.getElementById('dns-profiles-wrap');
  const titleEl   = document.getElementById('dns-tab-title');

  if (titleEl) titleEl.textContent = t('nav.dnsProfiles');
  if (basicWrap) basicWrap.classList.add('hidden');
  if (loading) loading.classList.remove('hidden');
  if (wrap)    wrap.classList.add('hidden');

  const [profData, devData] = await Promise.all([
    GET('/api/dns-profiles'),
    GET('/api/devices'),
  ]);
  if (!profData) return;
  state.dnsProfiles = profData.profiles || [];
  state.devices = (devData?.devices) || state.devices || [];

  renderProfileCards();
  renderDnsAssignTable();

  if (loading) loading.classList.add('hidden');
  if (wrap)    wrap.classList.remove('hidden');
}

function renderProfileCards() {
  const container = document.getElementById('profile-cards');
  if (!container) return;
  const profiles = Array.isArray(state.dnsProfiles) ? state.dnsProfiles : Object.values(state.dnsProfiles || {});
  container.innerHTML = profiles.map(p => `
    <div class="profile-card profile-card-${p.id}">
      <div class="profile-card-header">
        <strong>${esc(p.name)}</strong>
        <span class="profile-type-badge">${t(`dnsProfiles.type.${p.type}`)}</span>
      </div>
      <div class="profile-card-desc">${esc(p.description || '')}</div>
      ${p.type === 'custom' ? `<button class="btn-sm btn-danger" data-action="del-profile" data-id="${p.id}">✕</button>` : ''}
    </div>
  `).join('');
}

function renderDnsAssignTable() {
  const tbody = document.getElementById('dns-assign-tbody');
  if (!tbody) return;
  const devices = state.devices || [];
  if (!devices.length) { tbody.innerHTML = ''; return; }
  tbody.innerHTML = devices.map(dev => {
    const bypassInfo = dev.bypassActive
      ? `<span class="bypass-badge">⚡ ${dev.bypassUntil === 'permanent' ? '∞' : new Date(dev.bypassUntil).toLocaleTimeString()}</span>`
      : '—';
    return `<tr>
      <td><strong>${esc(dev.name)}</strong></td>
      <td>${deviceStatusBadge(dev.status)}</td>
      <td>
        <select class="dns-profile-select" data-dev-id="${dev.id}">
          ${renderProfileOptions(dev.dnsProfile)}
        </select>
      </td>
      <td>${bypassInfo}</td>
      <td class="actions">
        <button class="btn-sm btn-ghost" data-action="set-bypass" data-id="${dev.id}">⚡ bypass</button>
        ${dev.bypassActive ? `<button class="btn-sm btn-ghost" data-action="revoke-bypass" data-id="${dev.id}">✕</button>` : ''}
      </td>
    </tr>`;
  }).join('');
}

function renderProfileOptions(selected) {
  const profiles = Array.isArray(state.dnsProfiles) ? state.dnsProfiles : Object.values(state.dnsProfiles || {});
  return profiles.map(p => `<option value="${p.id}"${p.id === selected ? ' selected' : ''}>${esc(p.name)}</option>`).join('');
}

document.getElementById('dns-profiles-refresh-btn').addEventListener('click', loadDnsProfilesTab);

document.getElementById('profile-cards').addEventListener('click', async e => {
  const btn = e.target.closest('[data-action="del-profile"]');
  if (!btn) return;
  if (!confirm('Delete this custom profile?')) return;
  const res = await DEL(`/api/dns-profiles/${btn.dataset.id}`);
  if (res?.error) { window.alert(res.error); return; }
  await loadDnsProfilesTab();
});

document.getElementById('dns-assign-tbody').addEventListener('change', async e => {
  const sel = e.target.closest('.dns-profile-select');
  if (!sel) return;
  const devId = sel.dataset.devId;
  const res = await POST(`/api/devices/${devId}/dns-profile`, { profileId: sel.value });
  if (res?.error) { window.alert(res.error); sel.value = (state.devices.find(d => d.id === devId) || {}).dnsProfile || ''; }
});

document.getElementById('dns-assign-tbody').addEventListener('click', async e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;
  if (action === 'set-bypass') {
    const dur = window.prompt('Bypass duration:\n15m | 1h | 4h | 24h | permanent', '1h');
    if (!dur) return;
    const res = await POST(`/api/devices/${id}/dns-bypass`, { duration: dur });
    if (res?.error) { window.alert(res.error); return; }
    await loadDnsProfilesTab();
  }
  if (action === 'revoke-bypass') {
    await DEL(`/api/devices/${id}/dns-bypass`);
    await loadDnsProfilesTab();
  }
});

// DNS basic (User mode) click handler
document.getElementById('dns-basic-wrap').addEventListener('click', async e => {
  const card = e.target.closest('[data-action="dns-basic-select"]');
  if (!card) return;
  const { devId, profile } = card.dataset;
  // Optimistic UI update
  document.querySelectorAll(`.dns-basic-cards[data-dev-id="${devId}"] .dns-basic-card`).forEach(c => {
    c.classList.toggle('active', c.dataset.profile === profile);
  });
  const res = await POST(`/api/devices/${devId}/dns-profile`, { profileId: profile });
  if (res?.error) {
    window.alert(res.error);
    await loadDnsBasic(); // revert on error
  }
});

// ── Phase 2: Gateway / Reverse Proxy (Module D) ───────────────────────────────

async function loadGatewayTab() {
  const loading   = document.getElementById('gateway-loading');
  const listWrap  = document.getElementById('gateway-list-wrap');
  const statusEl  = document.getElementById('gateway-caddy-status');
  if (loading)  loading.classList.remove('hidden');
  if (listWrap) listWrap.classList.add('hidden');

  const [svcData, valData] = await Promise.all([
    GET('/api/proxy/services'),
    POST('/api/proxy/validate', {}),
  ]);
  if (!svcData) return;
  state.proxyServices = svcData.services || [];

  if (statusEl && valData) {
    statusEl.textContent = valData.adminUp ? t('gateway.caddy.ok') : t('gateway.caddy.down');
    statusEl.style.color = valData.adminUp ? '#22c55e' : '#f59e0b';
  }

  renderGatewayList();
  if (loading)  loading.classList.add('hidden');
  if (listWrap) listWrap.classList.remove('hidden');
}

function renderGatewayList() {
  const container = document.getElementById('gateway-list');
  const emptyEl   = document.getElementById('gateway-empty');
  if (!container) return;
  if (!state.proxyServices.length) {
    if (emptyEl) emptyEl.classList.remove('hidden');
    container.innerHTML = '';
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');
  container.innerHTML = state.proxyServices.map(svc => {
    const exposureLabel = t(`gateway.exposure.${svc.exposure}`) || svc.exposure;
    const exposureClass = svc.exposure === 'vpn_only' ? 'vpn-only' : 'public';
    const enabledClass  = svc.enabled ? '' : 'service-disabled';
    return `<div class="service-row ${enabledClass}" data-svc-id="${svc.id}">
      <div class="service-row-info">
        <strong>${esc(svc.name)}</strong>
        <span class="exposure-badge exposure-${exposureClass}">${exposureLabel}</span>
        <code class="service-domain">${esc(svc.domain)}</code>
        <span class="text-dim">→</span>
        <code class="service-target">${esc(svc.target)}</code>
      </div>
      <div class="actions">
        <button class="btn-sm btn-ghost" data-action="svc-toggle" data-id="${svc.id}">${svc.enabled ? '‖' : '▶'}</button>
        <button class="btn-sm btn-danger" data-action="svc-delete" data-id="${svc.id}">✕</button>
      </div>
    </div>`;
  }).join('');
}

document.getElementById('gateway-refresh-btn').addEventListener('click', loadGatewayTab);

document.getElementById('gateway-add-btn').addEventListener('click', async () => {
  const name = window.prompt('Service name:');
  if (!name) return;
  const domain = window.prompt('Domain (e.g. app.example.com):');
  if (!domain) return;
  const target = window.prompt('Target URL (e.g. http://10.8.0.5:8080):');
  if (!target) return;
  const exposureRaw = window.prompt('Exposure:\n1 = VPN only (default)\n2 = Public HTTPS', '1');
  const exposure = exposureRaw === '2' ? 'public' : 'vpn_only';
  const confirmed = exposure === 'public' ? true : false;
  const res = await POST('/api/proxy/services', { name, domain, target, exposure, confirmed });
  if (!res || res.error) { window.alert(res?.error || 'Error creating service'); return; }
  await loadGatewayTab();
});

document.getElementById('gateway-list').addEventListener('click', async e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;
  if (action === 'svc-toggle') {
    const svc = state.proxyServices.find(s => s.id === id);
    const endpoint = svc?.enabled ? 'disable' : 'enable';
    const res = await POST(`/api/proxy/services/${id}/${endpoint}`, {});
    if (res?.error) { window.alert(res.error); return; }
    await loadGatewayTab();
    return;
  }
  if (action === 'svc-delete') {
    const svc = state.proxyServices.find(s => s.id === id);
    if (!confirm(`Delete service "${svc?.name}"?`)) return;
    const res = await DEL(`/api/proxy/services/${id}`);
    if (res?.error) { window.alert(res.error); return; }
    await loadGatewayTab();
    return;
  }
});

// ── Phase 3: Monitoring Tab ───────────────────────────────────────────────────

function monitorBadge(status) {
  const map = { up: 'up', down: 'down', unknown: 'unknown', disabled: 'disabled' };
  const cls = map[status] || 'unknown';
  return `<span class="monitor-badge monitor-${cls}">${t(`monitoring.status.${status}`) || status}</span>`;
}

async function loadMonitoringTab() {
  const loading = document.getElementById('monitoring-loading');
  const wrap    = document.getElementById('monitoring-wrap');
  loading.classList.remove('hidden');
  wrap.classList.add('hidden');

  const data = await GET('/api/monitors');
  if (!data) return;
  state.monitors = data.monitors || [];

  const tbody = document.getElementById('monitoring-tbody');
  const empty = document.getElementById('monitoring-empty');

  if (!state.monitors.length) {
    empty.classList.remove('hidden');
    tbody.innerHTML = '';
  } else {
    empty.classList.add('hidden');
    tbody.innerHTML = state.monitors.map(m => {
      const lastCheck = m.lastCheck ? timeAgo(new Date(m.lastCheck)) : '—';
      const ms = m.lastResponseMs != null ? `${m.lastResponseMs}ms` : '—';
      return `<tr>
        <td><strong>${esc(m.name)}</strong><br><small class="text-dim">${esc(m.target)}</small></td>
        <td><code>${esc(m.type)}</code></td>
        <td>${monitorBadge(m.lastStatus)}</td>
        <td>${lastCheck}</td>
        <td>${ms}</td>
        <td class="actions">
          <button class="btn-sm btn-ghost" data-action="mon-check" data-id="${m.id}" title="Run now">▶</button>
          <button class="btn-sm btn-ghost" data-action="mon-toggle" data-id="${m.id}" title="${m.enabled ? 'Disable' : 'Enable'}">${m.enabled ? '‖' : '▶'}</button>
          <button class="btn-sm btn-danger" data-action="mon-delete" data-id="${m.id}">✕</button>
        </td>
      </tr>`;
    }).join('');
  }

  loading.classList.add('hidden');
  wrap.classList.remove('hidden');
}

document.getElementById('monitoring-refresh-btn').addEventListener('click', loadMonitoringTab);

document.getElementById('monitoring-add-btn').addEventListener('click', async () => {
  const name   = window.prompt('Monitor name:');
  if (!name) return;
  const types  = 'http | https | tcp | dns | docker | tls | wireguard';
  const type   = window.prompt(`Type (${types}):`, 'http');
  if (!type) return;
  let defTarget = '';
  if (type === 'http' || type === 'https') defTarget = 'https://example.com';
  else if (type === 'tcp') defTarget = 'host:port';
  else if (type === 'dns') defTarget = 'example.com';
  else if (type === 'docker') defTarget = 'container-name';
  else if (type === 'tls') defTarget = 'example.com:443';
  const target = window.prompt('Target:', defTarget);
  if (!target) return;
  const res = await POST('/api/monitors', { name, type, target });
  if (res?.error) { window.alert(res.error); return; }
  await loadMonitoringTab();
});

document.querySelector('#monitoring-table tbody') || document.getElementById('monitoring-tbody');
document.getElementById('monitoring-table').addEventListener('click', async e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;
  if (action === 'mon-check') {
    btn.textContent = '…';
    const res = await POST(`/api/monitors/${id}/check`, {});
    btn.textContent = '▶';
    if (res?.error) { window.alert(res.error); return; }
    await loadMonitoringTab();
  }
  if (action === 'mon-toggle') {
    const m = state.monitors.find(x => x.id === id);
    const ep = m?.enabled ? 'disable' : 'enable';
    const res = await POST(`/api/monitors/${id}/${ep}`, {});
    if (res?.error) { window.alert(res.error); return; }
    await loadMonitoringTab();
  }
  if (action === 'mon-delete') {
    const m = state.monitors.find(x => x.id === id);
    if (!confirm(`Delete monitor "${m?.name}"?`)) return;
    await DEL(`/api/monitors/${id}`);
    await loadMonitoringTab();
  }
});

// ── Phase 3: Apps Tab ─────────────────────────────────────────────────────────

function appStatusBadge(status) {
  const cls = status === 'running' ? 'up' : (status === 'not_found' ? 'unknown' : 'down');
  return `<span class="monitor-badge monitor-${cls}">${t(`apps.status.${status}`) || status}</span>`;
}

async function loadAppsTab() {
  const loading = document.getElementById('apps-loading');
  const wrap    = document.getElementById('apps-wrap');
  loading.classList.remove('hidden');
  wrap.classList.add('hidden');

  const [catData, appsData] = await Promise.all([GET('/api/apps/catalog'), GET('/api/apps')]);
  if (!catData || !appsData) return;

  const installed = appsData.apps || [];
  state.apps = installed;
  const installedIds = new Set(installed.map(a => a.id));

  // Render catalog
  const catalogEl = document.getElementById('apps-catalog');
  catalogEl.innerHTML = (catData.catalog || []).map(app => {
    const isInstalled = installedIds.has(app.id);
    return `<div class="app-card">
      <div class="app-card-header">
        <strong>${esc(app.name)}</strong>
        <span class="profile-type-badge">${esc(app.category)}</span>
      </div>
      <p class="text-dim" style="font-size:.82rem;margin:.3rem 0 .6rem">${esc(app.description)}</p>
      <div style="font-size:.78rem;color:var(--text-muted)">Port ${app.internalPort} · min ${app.minRamMb}MB RAM</div>
      ${isInstalled
        ? '<span class="status-badge status-online" style="margin-top:.5rem;display:inline-block">Installed</span>'
        : `<button class="btn-primary btn-sm" style="margin-top:.6rem" data-action="app-install" data-id="${app.id}">${t('apps.install')}</button>`
      }
    </div>`;
  }).join('');

  // Render installed
  const installedListEl = document.getElementById('apps-installed-list');
  const installedEmptyEl = document.getElementById('apps-installed-empty');
  if (!installed.length) {
    installedEmptyEl.classList.remove('hidden');
    installedListEl.innerHTML = '';
  } else {
    installedEmptyEl.classList.add('hidden');
    installedListEl.innerHTML = installed.map(app => `<div class="service-row" data-app-id="${app.id}">
      <div class="service-row-info">
        <strong>${esc(app.id)}</strong>
        ${appStatusBadge(app.running ? 'running' : (app.containerStatus === 'not_found' ? 'not_found' : 'stopped'))}
        ${app.domain ? `<code class="service-domain">${esc(app.domain)}</code>` : ''}
      </div>
      <div class="actions">
        <button class="btn-sm btn-ghost" data-action="app-start"   data-id="${app.id}">${t('apps.start')}</button>
        <button class="btn-sm btn-ghost" data-action="app-stop"    data-id="${app.id}">${t('apps.stop')}</button>
        <button class="btn-sm btn-ghost" data-action="app-restart" data-id="${app.id}">${t('apps.restart')}</button>
        <button class="btn-sm btn-ghost" data-action="app-logs"    data-id="${app.id}">${t('apps.logs')}</button>
        <button class="btn-sm btn-danger" data-action="app-remove" data-id="${app.id}">${t('apps.remove')}</button>
      </div>
    </div>`).join('');
  }

  loading.classList.add('hidden');
  wrap.classList.remove('hidden');
}

document.getElementById('apps-refresh-btn').addEventListener('click', loadAppsTab);

document.getElementById('apps-wrap').addEventListener('click', async e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;

  if (action === 'app-install') {
    const domain = window.prompt('Domain for this app (blank to skip, e.g. app.example.com):');
    const res = await POST(`/api/apps/${id}/install`, { exposure: 'vpn_only', domain: domain || '', confirmed: false });
    if (res?.error) { window.alert(res.error); return; }
    await loadAppsTab();
    return;
  }
  if (action === 'app-start')   { await POST(`/api/apps/${id}/start`,   {}); await loadAppsTab(); return; }
  if (action === 'app-stop')    { await POST(`/api/apps/${id}/stop`,    {}); await loadAppsTab(); return; }
  if (action === 'app-restart') { await POST(`/api/apps/${id}/restart`, {}); await loadAppsTab(); return; }
  if (action === 'app-logs') {
    const data = await GET(`/api/apps/${id}/logs`);
    if (data?.logs) window.alert(data.logs.slice(-3000));
    return;
  }
  if (action === 'app-remove') {
    if (!confirm(`Remove app "${id}"? Container will be stopped.`)) return;
    const del = confirm('Also delete app data volumes? (cannot be undone)');
    const res = await POST(`/api/apps/${id}/remove`, { confirmed: true, deleteData: del });
    if (res?.error) { window.alert(res.error); return; }
    await loadAppsTab();
  }
});

// ── Phase 3: File Drop Tab ────────────────────────────────────────────────────

function fmtSize(bytes) {
  if (bytes < 1024)         return `${bytes} B`;
  if (bytes < 1024 * 1024)  return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/1024/1024).toFixed(1)} MB`;
}

async function loadFiledropTab() {
  const loading = document.getElementById('filedrop-loading');
  const wrap    = document.getElementById('filedrop-wrap');
  loading.classList.remove('hidden');
  wrap.classList.add('hidden');

  const [sharesData, statusData] = await Promise.all([GET('/api/filedrop'), GET('/api/filedrop/status')]);
  if (!sharesData) return;
  state.filedropShares = sharesData.shares || [];

  // Storage bar
  const storBar = document.getElementById('filedrop-storage-bar');
  if (statusData) {
    const pct = statusData.pct || 0;
    storBar.innerHTML = `<div>Storage: ${statusData.usageMb} MB / ${statusData.limitMb} MB (${pct}%)</div>
      <div class="storage-bar"><div class="storage-bar-fill" style="width:${Math.min(pct,100)}%"></div></div>`;
  }

  // Shares table
  const tbody = document.getElementById('filedrop-tbody');
  const table = document.getElementById('filedrop-table');
  const empty = document.getElementById('filedrop-shares-empty');
  if (!state.filedropShares.length) {
    empty.classList.remove('hidden');
    table.classList.add('hidden');
  } else {
    empty.classList.add('hidden');
    table.classList.remove('hidden');
    const origin = window.location.origin;
    tbody.innerHTML = state.filedropShares.map(s => {
      const link = `${origin}/files/${s.token}`;
      const exp  = s.expiresAt ? new Date(s.expiresAt).toLocaleDateString() : '—';
      const mode = s.mode === 'public' ? `<span class="exposure-badge exposure-public">public</span>` : `<span class="exposure-badge exposure-vpn-only">vpn</span>`;
      return `<tr>
        <td>${esc(s.originalName)}${s.passwordProtected ? ' 🔒' : ''}</td>
        <td>${fmtSize(s.sizeBytes || 0)}</td>
        <td>${exp}</td>
        <td>${s.downloads}/${s.maxDownloads}</td>
        <td>${mode}</td>
        <td class="actions">
          <button class="btn-sm btn-ghost" data-action="fd-copy" data-link="${esc(link)}">⎘</button>
          <button class="btn-sm btn-danger" data-action="fd-delete" data-id="${s.id}">✕</button>
        </td>
      </tr>`;
    }).join('');
  }

  loading.classList.add('hidden');
  wrap.classList.remove('hidden');
}

// File input + drag-drop wiring
const fdDropZone  = document.getElementById('filedrop-drop-zone');
const fdFileInput = document.getElementById('filedrop-file-input');
const fdOptions   = document.getElementById('filedrop-options');

fdDropZone.addEventListener('click', e => {
  if (!e.target.closest('button') && !e.target.closest('input') && !e.target.closest('select')) {
    fdFileInput.click();
  }
});
fdDropZone.addEventListener('dragover', e => { e.preventDefault(); fdDropZone.classList.add('drag-over'); });
fdDropZone.addEventListener('dragleave', () => fdDropZone.classList.remove('drag-over'));
fdDropZone.addEventListener('drop', e => {
  e.preventDefault();
  fdDropZone.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) { fdFileInput.files = e.dataTransfer.files; fdOptions.style.display = 'flex'; }
});
fdFileInput.addEventListener('change', () => { if (fdFileInput.files[0]) fdOptions.style.display = 'flex'; });

document.getElementById('fd-mode').addEventListener('change', e => {
  const warn = document.getElementById('fd-public-warn');
  warn.classList.toggle('hidden', e.target.value !== 'public');
});

document.getElementById('fd-upload-btn').addEventListener('click', async () => {
  const file = fdFileInput.files[0];
  if (!file) return;
  const mode = document.getElementById('fd-mode').value;
  if (mode === 'public' && !confirm('Share this file publicly (accessible without VPN login)?')) return;

  const fd = new FormData();
  fd.append('file', file);
  fd.append('expires',      document.getElementById('fd-expires').value);
  fd.append('maxDownloads', document.getElementById('fd-maxdl').value);
  fd.append('password',     document.getElementById('fd-password').value);
  fd.append('mode',         mode);
  fd.append('confirmed',    mode === 'public' ? 'true' : 'false');

  const btn = document.getElementById('fd-upload-btn');
  btn.disabled = true;
  btn.textContent = t('common.processing');

  try {
    const resp = await fetch('/api/filedrop/upload', { method: 'POST', body: fd });
    const data = await resp.json();
    btn.disabled = false;
    btn.textContent = t('filedrop.upload');
    if (data.error) { window.alert(data.error); return; }
    const link = `${window.location.origin}${data.url}`;
    navigator.clipboard.writeText(link).catch(() => {});
    window.alert(`✓ Uploaded! Link copied:\n${link}\nExpires: ${data.expiresAt ? new Date(data.expiresAt).toLocaleDateString() : '—'}`);
    fdFileInput.value = '';
    fdOptions.style.display = 'none';
    await loadFiledropTab();
  } catch (e) {
    btn.disabled = false;
    btn.textContent = t('filedrop.upload');
    window.alert(`Upload error: ${e.message}`);
  }
});

document.getElementById('filedrop-refresh-btn').addEventListener('click', loadFiledropTab);

document.getElementById('filedrop-cleanup-btn').addEventListener('click', async () => {
  await POST('/api/filedrop/cleanup', {});
  await loadFiledropTab();
});

document.getElementById('filedrop-tbody').addEventListener('click', async e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id, link } = btn.dataset;
  if (action === 'fd-copy') {
    navigator.clipboard.writeText(link).then(() => {
      btn.textContent = '✓';
      setTimeout(() => { btn.textContent = '⎘'; }, 1500);
    });
  }
  if (action === 'fd-delete') {
    if (!confirm('Delete this file share?')) return;
    await DEL(`/api/filedrop/${id}`);
    await loadFiledropTab();
  }
});

// ── Phase 3: Migration Tab ────────────────────────────────────────────────────

async function loadMigrationTab() {
  const loading = document.getElementById('migration-loading');
  const wrap    = document.getElementById('migration-wrap');
  loading.classList.remove('hidden');
  wrap.classList.add('hidden');

  const [readiness, dnsplan, impact, checklist] = await Promise.all([
    GET('/api/migration/readiness'),
    GET('/api/migration/dns-plan'),
    GET('/api/migration/client-impact'),
    GET('/api/migration/checklist'),
  ]);

  // Readiness panel
  const readinessEl = document.getElementById('migration-readiness');
  if (readiness) {
    const svc = readiness.services || {};
    const checks = [
      ['wg-easy', svc['wg-easy']?.up], ['adguard', svc.adguard?.up],
      ['caddy', svc.caddy?.up],        ['portal', svc.portal?.up],
    ];
    readinessEl.innerHTML = `<h3 style="margin-top:0">${t('migration.readiness')}</h3>
      <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:.8rem">
        ${checks.map(([name, up]) => `<span class="monitor-badge monitor-${up ? 'up' : 'down'}">${name}: ${up ? '✓' : '✗'}</span>`).join('')}
      </div>
      <div class="text-dim" style="font-size:.85rem">VPS: <strong>${esc(readiness.vpsHost || 'unknown')}</strong> ·
        Devices: ${readiness.counts?.devices || 0} ·
        Services: ${readiness.counts?.proxySvc || 0} ·
        Apps: ${readiness.counts?.apps || 0}
      </div>`;
  }

  // DNS plan
  const dnsWrap = document.getElementById('migration-dns-wrap');
  if (dnsplan?.domains?.length) {
    dnsWrap.innerHTML = `<table class="data-table"><thead><tr><th>Domain</th><th>Current IP</th><th>Service</th></tr></thead>
      <tbody>${dnsplan.domains.map(d => `<tr><td><code>${esc(d.domain)}</code></td><td><code>${esc(d.currentIp)}</code></td><td>${esc(d.service)}</td></tr>`).join('')}</tbody>
    </table>`;
  } else {
    dnsWrap.innerHTML = `<p class="text-dim" style="font-size:.85rem">No public domains configured.</p>`;
  }

  // Client impact
  const impactEl = document.getElementById('migration-client-impact');
  if (impact) {
    const warn = impact.clientsNeedUpdate;
    impactEl.innerHTML = `<div class="${warn ? 'status-badge status-revoked' : 'status-badge status-online'}" style="display:inline-block;margin-bottom:.5rem">
      WireGuard endpoint: ${impact.endpointType === 'ip' ? '⚠ IP address' : '✓ Hostname'}
    </div>
    <p class="text-dim" style="font-size:.85rem">${esc(impact.message)}</p>`;
  }

  // Checklist
  const listEl = document.getElementById('migration-checklist-list');
  if (checklist?.steps) {
    listEl.innerHTML = checklist.steps.map(s => `<li class="checklist-step">
      <strong>${esc(s.title)}</strong>
      ${s.cmd ? `<br><code style="font-size:.82rem">${esc(s.cmd)}</code>` : ''}
      ${s.detail ? `<br><span class="text-dim" style="font-size:.83rem">${esc(s.detail)}</span>` : ''}
      ${s.value ? `<br><span class="text-dim" style="font-size:.8rem">→ ${esc(String(s.value))}</span>` : ''}
    </li>`).join('');
  }

  loading.classList.add('hidden');
  wrap.classList.remove('hidden');
}

document.getElementById('migration-refresh-btn').addEventListener('click', loadMigrationTab);

document.getElementById('migration-copy-checklist').addEventListener('click', () => {
  const items = document.querySelectorAll('#migration-checklist-list .checklist-step');
  const text  = [...items].map((li, i) => `${i+1}. ${li.textContent.trim().replace(/\s+/g, ' ')}`).join('\n');
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('migration-copy-checklist');
    btn.textContent = '✓';
    setTimeout(() => { btn.textContent = t('common.copy'); }, 1500);
  });
});

document.getElementById('migration-export-btn').addEventListener('click', async () => {
  const btn    = document.getElementById('migration-export-btn');
  const result = document.getElementById('migration-export-result');
  btn.disabled = true;
  result.textContent = t('common.processing');
  const data = await POST('/api/migration/export', {});
  btn.disabled = false;
  if (data?.error) { result.textContent = `Error: ${data.error}`; return; }
  result.textContent = `${t('migration.exportDone')} ${data.filename}`;
});

// ── Settings Tab ──────────────────────────────────────────────────────────────

function loadSettingsTab() {
  document.querySelectorAll('input[name="interface-mode"]').forEach(r => {
    r.checked = r.value === state.interfaceMode;
  });
  updateModeCardHighlight();
  document.getElementById('settings-mode-msg').textContent = '';
  loadEndpointSection();
}

async function loadEndpointSection() {
  const input   = document.getElementById('settings-endpoint-input');
  const statusEl = document.getElementById('settings-endpoint-status');
  const saveBtn = document.getElementById('settings-endpoint-save-btn');
  if (!input) return;

  statusEl.textContent = '';
  saveBtn.disabled = true;

  const data = await GET('/api/settings/server-endpoint').catch(() => null);
  if (data?.host) {
    input.value = data.host;
    saveBtn.disabled = false;
  }
}

function updateModeCardHighlight() {
  document.querySelectorAll('.mode-card').forEach(card => {
    card.classList.toggle('mode-card-active', card.dataset.mode === state.interfaceMode);
  });
}

function openAdvancedConfirm(onConfirmed) {
  const overlay  = document.getElementById('advanced-confirm-overlay');
  const checkbox = document.getElementById('advanced-confirm-checkbox');
  const okBtn    = document.getElementById('advanced-confirm-ok');
  checkbox.checked = false;
  okBtn.disabled = true;
  overlay.classList.remove('hidden');

  checkbox.onchange = () => { okBtn.disabled = !checkbox.checked; };

  okBtn.onclick = async () => {
    overlay.classList.add('hidden');
    await onConfirmed();
  };

  const closeModal = () => {
    overlay.classList.add('hidden');
    // Reset radio back to current mode
    document.querySelectorAll('input[name="interface-mode"]').forEach(r => {
      r.checked = r.value === state.interfaceMode;
    });
    updateModeCardHighlight();
  };

  document.getElementById('advanced-confirm-cancel').onclick = closeModal;
  document.getElementById('advanced-confirm-close').onclick  = closeModal;
}

async function applyInterfaceMode(mode) {
  const msgEl = document.getElementById('settings-mode-msg');
  msgEl.textContent = '';
  const data = await POST('/api/settings/interface-mode', { interfaceMode: mode });
  if (!data?.success) {
    msgEl.textContent = data?.error || t('common.error');
    msgEl.style.color = 'var(--red)';
    return;
  }
  msgEl.style.color = 'var(--green)';
  msgEl.textContent = t('settings.mode.updated');
  await loadCapabilities();
  updateModeCardHighlight();
}

// Mode card click selects the radio
document.querySelectorAll('.mode-card').forEach(card => {
  card.addEventListener('click', () => {
    const radio = card.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
    updateModeCardHighlight();
  });
});

document.getElementById('settings-mode-save-btn').addEventListener('click', async () => {
  const selected = document.querySelector('input[name="interface-mode"]:checked')?.value;
  if (!selected || selected === state.interfaceMode) return;

  if (selected === 'advanced') {
    openAdvancedConfirm(() => applyInterfaceMode('advanced'));
  } else {
    await applyInterfaceMode(selected);
  }
});

// ── Server Endpoint settings ─────────────────────────────────────────────────

document.getElementById('settings-endpoint-validate-btn').addEventListener('click', async () => {
  const input    = document.getElementById('settings-endpoint-input');
  const statusEl = document.getElementById('settings-endpoint-status');
  const warnEl   = document.getElementById('settings-endpoint-warning');
  const saveBtn  = document.getElementById('settings-endpoint-save-btn');
  const host     = input.value.trim();

  if (!host) { statusEl.textContent = 'Enter an IP or hostname first.'; statusEl.style.color = 'var(--red)'; return; }

  statusEl.textContent = 'Checking…';
  statusEl.style.color = 'var(--text-dim)';
  saveBtn.disabled = true;

  const data = await GET(`/api/settings/validate-host?host=${encodeURIComponent(host)}`).catch(() => null);
  if (!data) {
    statusEl.textContent = 'Check failed — server error.';
    statusEl.style.color = 'var(--red)';
    return;
  }
  if (data.ok) {
    statusEl.textContent = data.type === 'ip'
      ? `✓ Valid IP address`
      : `✓ Resolves to ${data.resolvedIp}`;
    statusEl.style.color = 'var(--green)';
    warnEl.classList.remove('hidden');
    saveBtn.disabled = false;
  } else {
    statusEl.textContent = `✗ ${data.error}`;
    statusEl.style.color = 'var(--red)';
    warnEl.classList.add('hidden');
    saveBtn.disabled = true;
  }
});

document.getElementById('settings-endpoint-save-btn').addEventListener('click', async () => {
  const input       = document.getElementById('settings-endpoint-input');
  const reconnectEl = document.getElementById('settings-endpoint-reconnect');
  const saveBtn     = document.getElementById('settings-endpoint-save-btn');
  const validateBtn = document.getElementById('settings-endpoint-validate-btn');
  const host        = input.value.trim();
  if (!host) return;

  const confirmed = confirm(
    `Save "${host}" as the server endpoint?\n\n` +
    `The portal will restart (~5 s). WireGuard clients generated after restart will use the new endpoint.\n\n` +
    `Run ./compose.sh up -d on the VPS afterwards to also update wg-easy and Caddy.`
  );
  if (!confirmed) return;

  saveBtn.disabled  = true;
  validateBtn.disabled = true;
  reconnectEl.classList.remove('hidden');

  await POST('/api/settings/server-endpoint', { host }).catch(() => null);

  // Poll until the portal responds again after restart
  const poll = async () => {
    try {
      const r = await fetch('/api/health', { cache: 'no-store' });
      if (r.ok) { location.reload(); return; }
    } catch { /* still restarting */ }
    setTimeout(poll, 1500);
  };
  setTimeout(poll, 2000);
});

// ── Xray VLESS+Reality ────────────────────────────────────────────────────────

async function loadXrayTab() {
  const loading = document.getElementById('xray-loading');
  const wrap    = document.getElementById('xray-wrap');
  loading.classList.remove('hidden');
  loading.textContent = t('common.loading');
  wrap.classList.add('hidden');

  const data = await GET('/api/xray/status');
  if (!data) return;

  if (!data.enabled) {
    loading.textContent = t('xray.notEnabled');
    return;
  }

  const statusEl = document.getElementById('xray-status-body');
  const badge = data.running
    ? `<span class="status-badge status-online">${t('xray.running')}</span>`
    : `<span class="status-badge status-offline">${t('xray.stopped')}</span>`;
  const since = data.startedAt ? ` — ${new Date(data.startedAt).toLocaleString()}` : '';
  statusEl.innerHTML = `<p>${badge}${esc(since)}</p>`;

  const connEl = document.getElementById('xray-conn-info');
  connEl.innerHTML = `
    <table class="data-table" style="font-size:.85rem">
      <tr><td><strong>${t('xray.protocol')}</strong></td><td>VLESS + XTLS-Vision + Reality</td></tr>
      <tr><td><strong>${t('xray.port')}</strong></td><td>${data.port}</td></tr>
      <tr><td><strong>${t('xray.sni')}</strong></td><td><code>${esc(data.sniTarget)}</code></td></tr>
      <tr><td><strong>${t('xray.publicKey')}</strong></td>
          <td><code style="font-size:.75rem;word-break:break-all">${esc(data.publicKey)}</code></td></tr>
    </table>`;

  const labelInput = document.getElementById('xray-label-input');
  if (!labelInput.value) labelInput.value = state.serverName || 'vpn';

  loading.classList.add('hidden');
  wrap.classList.remove('hidden');
}

document.getElementById('xray-refresh-btn').addEventListener('click', loadXrayTab);

document.getElementById('xray-restart-btn').addEventListener('click', async () => {
  if (!confirm(t('xray.restart') + '?')) return;
  const r = await POST('/api/xray/restart', {});
  if (r?.ok) await loadXrayTab();
  else alert(r?.error || 'Restart failed.');
});

document.getElementById('xray-gen-btn').addEventListener('click', async () => {
  const label = document.getElementById('xray-label-input').value.trim() || (state.serverName || 'vpn');
  const data  = await GET(`/api/xray/client-config?label=${encodeURIComponent(label)}`);
  if (!data?.uri) { alert(data?.error || 'Error generating URI'); return; }
  document.getElementById('xray-qr').src = data.qrcode;
  document.getElementById('xray-uri-text').textContent = data.uri;
  document.getElementById('xray-uri-result').classList.remove('hidden');
});

document.getElementById('xray-copy-btn').addEventListener('click', () => {
  const uri = document.getElementById('xray-uri-text').textContent;
  navigator.clipboard.writeText(uri).then(() => {
    const btn = document.getElementById('xray-copy-btn');
    const orig = btn.textContent;
    btn.textContent = t('xray.copyDone');
    setTimeout(() => { btn.textContent = orig; }, 2000);
  });
});

// Mobile sidebar toggle
(function () {
  const toggle  = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!toggle || !sidebar || !overlay) return;

  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
  }

  toggle.addEventListener('click', () => {
    const open = sidebar.classList.toggle('open');
    overlay.classList.toggle('visible', open);
  });
  overlay.addEventListener('click', closeSidebar);

  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => { if (window.innerWidth <= 768) closeSidebar(); });
  });
})();
