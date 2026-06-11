export interface WeatherData {
  id: string;
  name: string;
  temp: number;
  cond: string;
  humidity: number;
  moisture: string;
  wind: string;
  advisory: string;
}

export interface Bid {
  id: string;
  buyerName: string;
  buyerPhone: string;
  bidAmount: number;
  timestamp: string;
}

export interface Product {
  id: string;
  farmerName: string;
  farmerPhone: string;
  cropName: string;
  category: "ধান" | "সবজি" | "ফল" | "ডাল ও তেলবীজ" | "মসলা";
  quantity: string;
  basePrice: number;
  unit: "কেজি" | "মন" | "পিস";
  location: string;
  image: string;
  bids: Bid[];
  status: "available" | "sold";
  createdAt: string;
  description?: string;
}

export interface MarketPricePoint {
  name: string;
  KarwanBazar: number[];
  Baneswar: number[];
  Mohasthangarh: number[];
  Jessore: number[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
}

export interface AgroNews {
  id: number;
  textBn: string;
  textEn: string;
  dateBn: string;
  dateEn: string;
}

