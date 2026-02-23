export interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  author: string;
  publishedAt: string;
  imageUrl: string;
  /** 關聯的 predict-markets market ID（用於嵌入 Trade Panel） */
  relatedMarketId?: string;
}

export const ARTICLES: Article[] = [
  {
    id: 'btc-2026-q1',
    title: 'BTC 能否在 2026 Q1 突破 10 萬美元？',
    summary: '分析師對比特幣本季走勢看法分歧，鏈上數據顯示大戶持倉持續增加。',
    content: `比特幣在近期的強勁表現讓市場重燃信心。根據鏈上數據顯示，持有超過 1,000 BTC 的巨鯨地址數量在過去 30 天增加了 12%，顯示機構資金仍在持續流入。

分析師 Arthur Chen 表示：「從技術面來看，BTC 目前守住關鍵支撐位，若能有效突破前高，10 萬美元目標並非遙不可及。」

然而也有聲音提醒投資人注意風險。宏觀環境的不確定性，尤其是美聯準會的利率政策走向，仍是影響加密市場的重要變數。`,
    category: '加密貨幣',
    author: 'Arthur Chen',
    publishedAt: '2026-02-20',
    imageUrl: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=800',
    relatedMarketId: undefined, // 開發時替換為實際 market ID
  },
  {
    id: 'taiwan-election-2026',
    title: '2026 台灣地方選舉：各黨派民調最新分析',
    summary: '距離選舉投票日剩不到 9 個月，主要政黨候選人聲勢報告出爐。',
    content: `隨著 2026 年地方選舉腳步漸近，各縣市選情逐漸明朗。最新民調數據顯示，北部縣市競爭最為激烈，雙方差距在誤差範圍內，結果難以預測。

選舉分析師林靜宜指出：「年輕選民的投票意願是本次選舉的最大變數，社群媒體的動員效應不容忽視。」

預測市場的賠率變化往往能反映出比傳統民調更即時的民意動向，投資人可以參考相關預測作為輔助判斷依據。`,
    category: '政治',
    author: '林靜宜',
    publishedAt: '2026-02-18',
    imageUrl: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=800',
    relatedMarketId: undefined,
  },
  {
    id: 'ai-chip-war-2026',
    title: 'AI 晶片大戰：輝達、AMD、Intel 誰能稱霸 2026？',
    summary: '三大晶片巨頭在 AI 加速器市場的爭奪戰白熱化，分析師預測市場份額將大幅重分配。',
    content: `AI 運算需求的爆炸性成長使得高效能晶片成為兵家必爭之地。輝達雖然仍穩坐龍頭，但 AMD 的 MI300 系列和 Intel 的 Gaudi 3 正在蠶食其市場份額。

雲端巨頭如 AWS、Google Cloud、Azure 也紛紛推出自研晶片，進一步改變市場格局。業界人士預估，2026 年底前三大廠商的市佔率將出現顯著變化。

對投資人而言，這場晶片戰爭的最終勝負，不僅影響半導體產業，更將左右整個 AI 生態系的發展方向。`,
    category: '科技',
    author: 'Kevin Wu',
    publishedAt: '2026-02-15',
    imageUrl: 'https://images.unsplash.com/photo-1591696205602-2f950c417cb9?w=800',
    relatedMarketId: undefined,
  },
  {
    id: 'world-cup-2026-preview',
    title: '2026 世界盃：美加墨聯合主辦，誰是奪冠熱門？',
    summary: '距離開幕式僅剩數月，博彩市場與預測平台的賠率顯示這幾支球隊最被看好。',
    content: `2026 年 FIFA 世界盃將首次由美國、加拿大、墨西哥三國聯合主辦，擴編至 48 支球隊參賽。規模的擴大為傳統勁旅帶來更多挑戰，也為黑馬球隊創造了機會。

根據目前各大預測市場的數據，巴西、法國、英格蘭、阿根廷被視為最有力的奪冠候選。其中巴西在主場優勢（南美洲氣候相似）的加持下，被多數分析師列為首選。

然而足球的魅力就在其不可預測性。2022 年的阿根廷奪冠之路提醒我們，在最後一刻前任何預測都只是概率。`,
    category: '體育',
    author: 'Mike Tsai',
    publishedAt: '2026-02-10',
    imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
    relatedMarketId: undefined,
  },
  {
    id: 'taiwan-gdp-2026',
    title: '台灣 GDP 成長率 2026：主計處預測 vs 市場共識',
    summary: '主計處上修 2026 年經濟成長預測至 3.2%，外資機構則普遍持較保守態度。',
    content: `行政院主計總處最新公布的 2026 年 GDP 成長預測為 3.2%，較上期估值上修 0.3 個百分點，主要受惠於 AI 相關出口的強勁表現。

然而，部分外資機構仍維持相對保守的看法。摩根士丹利亞太區首席經濟學家表示，地緣政治風險以及全球需求放緩是主要下行風險。

從預測市場的觀點來看，市場參與者對台灣經濟前景的分歧，正好體現在相關預測題目的價格區間上——是一個觀察集體智慧的絕佳案例。`,
    category: '總體經濟',
    author: '陳雅婷',
    publishedAt: '2026-02-08',
    imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800',
    relatedMarketId: undefined,
  },
];

export function getArticleById(id: string): Article | undefined {
  return ARTICLES.find((a) => a.id === id);
}
