// IATA 機場代碼 → 通知卡片顯示名稱
// 查不到的代碼直接顯示代碼本身（不影響搜尋，只影響顯示）
const AIRPORT_NAMES: Record<string, string> = {
  TPE: '台北(桃園)',
  TSA: '台北(松山)',
  NRT: '東京(成田)',
  HND: '東京(羽田)',
  KIX: '大阪(關西)',
  ITM: '大阪(伊丹)',
  NGO: '名古屋(中部)',
  FUK: '福岡',
  CTS: '札幌(新千歲)',
  OKA: '沖繩(那霸)',
  KOJ: '鹿兒島',
  KMJ: '熊本',
  SDJ: '仙台',
  HIJ: '廣島',
  ICN: '首爾(仁川)',
  GMP: '首爾(金浦)',
  PUS: '釜山',
  CJU: '濟州',
  HKG: '香港',
  MFM: '澳門',
  BKK: '曼谷(蘇凡納布)',
  DMK: '曼谷(廊曼)',
  CNX: '清邁',
  HKT: '普吉島',
  SIN: '新加坡',
  KUL: '吉隆坡',
  PEN: '檳城',
  DPS: '峇里島',
  CGK: '雅加達',
  MNL: '馬尼拉',
  CEB: '宿霧',
  SGN: '胡志明市',
  HAN: '河內',
  DAD: '峴港',
  PNH: '金邊',
  PVG: '上海(浦東)',
  SHA: '上海(虹橋)',
  PEK: '北京(首都)',
  CAN: '廣州'
};

export function airportName(iataCode: string): string {
  return AIRPORT_NAMES[iataCode.toUpperCase()] ?? iataCode.toUpperCase();
}
