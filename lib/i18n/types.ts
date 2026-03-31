export type SupportedLocale = 'zh-TW' | 'zh-CN' | 'en' | 'ja' | 'ko';

export interface Dictionary {
  nav: {
    home: string;
    wallet: string;
    trades: string;
    portfolio: string;
    deposit: string;
    reconciliation: string;
    branding: string;
  };
  common: {
    loading: string;
    retry: string;
    connectError: string;
    confirmService: string;
    viewAll: string;
    save: string;
    saving: string;
    reset: string;
    status: string;
    time: string;
    market: string;
    amount: string;
    balance: string;
    shares: string;
    noData: string;
  };
  brand: {
    tagline: string;
    siteTitle: string;
    siteDescription: string;
  };
  locale: {
    label: string;
  };
  mode: {
    label: string;
    transfer: string;
    seamless: string;
    transferDesc: string;
    seamlessDesc: string;
  };
  user: {
    switchLabel: string;
    demoUsers: string;
  };
  drawer: {
    open: string;
    close: string;
    title: string;
  };
  embed: {
    loadError: string;
    sdkError: string;
  };
  webhook: {
    title: string;
    tradeCompleted: string;
    balanceChanged: string;
    positionSettled: string;
    noNotifications: string;
    showingEventsFor: string;
  };
  home: {
    heroTitle: string;
    heroSubtitle: string;
    greeting: string;
    greetingDesc: string;
    macroPolicy: string;
    assetRotation: string;
    eventDriven: string;
    trackedAssets: string;
    featuredArticles: string;
    hotIndustries: string;
    highImpactEvents: string;
    trendCurves: string;
    featuredEmbed: string;
    popularMarkets: string;
    embedDescription: string;
    embedMedia: string;
    embedSocial: string;
    embedPartner: string;
    contentPlatform: string;
    contentPlatformDesc: string;
    memberCenter: string;
    memberCenterDesc: string;
    eventPage: string;
    eventPageDesc: string;
    focusBriefs: string;
    editorialPicks: string;
    industryHeat: string;
    macroSignals: string;
    macroSignalsDesc: string;
    weeklyCalendar: string;
    deepReading: string;
    deepReadingDesc: string;
  };
  article: {
    backToHome: string;
    relatedMarkets: string;
    popularMarkets: string;
    relatedMarketsDesc: string;
    popularMarketsDesc: string;
    livePricing: string;
    pricingNote: string;
    relatedPrediction: string;
  };
  portfolio: {
    title: string;
    subtitle: string;
    availableBalance: string;
    totalTrades: string;
    joinDate: string;
    accountId: string;
    totalInvested: string;
    positionValue: string;
    unrealizedPnl: string;
    holdingsApi: string;
    realtimeQuery: string;
    direction: string;
    invested: string;
    value: string;
    unrealized: string;
    noPositions: string;
    recentTradesApi: string;
    goToTrading: string;
    noTrades: string;
  };
  branding: {
    title: string;
    subtitle: string;
    logoTitle: string;
    logoDesc: string;
    chooseFile: string;
    uploading: string;
    logoSuccess: string;
    logoFailed: string;
    themeTitle: string;
    themeDesc: string;
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    borderRadius: string;
    fontFamily: string;
    saveTheme: string;
    themeSaved: string;
    themeFailed: string;
    livePreview: string;
  };
  wallet: {
    title: string;
    subtitle: string;
    availableBalance: string;
    fundOps: string;
    fundOpsDesc: string;
    seamlessMode: string;
    seamlessModeDesc: string;
    recentTrades: string;
    direction: string;
    noTrades: string;
  };
  trades: {
    title: string;
    subtitle: string;
    myRecords: string;
    type: string;
    unitPrice: string;
    total: string;
    noRecords: string;
  };
  deposit: {
    title: string;
    subtitle: string;
    availableBalance: string;
    loadError: string;
    loadErrorDesc: string;
  };
  reconciliation: {
    title: string;
    subtitle: string;
  };
}
