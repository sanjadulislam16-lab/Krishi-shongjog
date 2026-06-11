import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import cors from "cors";
import { 
  connectToDatabase, 
  isDbConnected, 
  ProductModel, 
  AgroNewsModel, 
  CropPriceModel,
  UserModel,
  WeatherModel,
  AdvisoryChatModel,
  DiseaseDiagnoseModel,
  RepresentativeProfileModel,
  ProductPriceModel,
  ApprovalLogModel,
  hashPassword,
  hashBcrypt,
  compareBcrypt
} from "./src/db/connection";

// Load environment variables
dotenv.config();

// Determine Port from process.env.PORT or fallback to 3000
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Initialize Express app
const app = express();

// Enable CORS
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// High limit for base64 image diagnostic uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Lazy initializer for Google GenAI to avoid crashing if API key is not set
let aiClient: any = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      console.warn("GEMINI_API_KEY is not defined. AI features will fallback to high-fidelity mocks.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Environmental parameters validation on startup
function validateEnv() {
  console.log("🛡️ Validating Environment Variables...");
  if (!process.env.MONGODB_URI) {
    console.warn("⚠️ Warning: MONGODB_URI is not defined. Using in-memory fallback databases.");
  } else {
    console.log("🔍 MONGODB_URI is defined.");
  }

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
    console.warn("⚠️ Warning: GEMINI_API_KEY is missing or carries placeholder value.");
  } else {
    console.log("🔍 GEMINI_API_KEY is defined.");
  }
}
validateEnv();

// ==========================================================
// 1. DATABASE IN-MEMORY STORE (Farmers, Products, Bids)
// ==========================================================
interface Bid {
  id: string;
  buyerName: string;
  buyerPhone: string;
  bidAmount: number;
  timestamp: string;
}

interface Product {
  id: string;
  farmerName: string;
  farmerPhone: string;
  cropName: string;
  category: "ধান" | "সবজি" | "ফল" | "ডাল ও তেলবীজ" | "মসলা";
  quantity: string;
  basePrice: number; // in Taka per kg/maund
  unit: "কেজি" | "মন" | "পিস";
  location: string;
  image: string; // Base64 or standard asset
  bids: Bid[];
  status: "available" | "sold";
  createdAt: string;
  description?: string;
}

// Initial mock agricultural products
let marketplaceProducts: Product[] = [
  {
    id: "prod-1",
    farmerName: "মুহাম্মদ আব্দুর রহমান",
    farmerPhone: "+৮৮০১৭১২৩৪৫৬৭৮",
    cropName: "মিনিকিট ধান (নতুন)",
    category: "ধান",
    quantity: "১২০০",
    basePrice: 65,
    unit: "কেজি",
    location: "নওগাঁ (সদর)",
    image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=400",
    status: "available",
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(), // 2 hours ago
    description: "রাসায়নিক সার মুক্ত উত্তম মানের নতুন মিনিকিট ধান। চাতাল এবং মিলাররা সরাসরি যোগাযোগ করতে পারেন।",
    bids: [
      { id: "bid-11", buyerName: "করিম অ্যান্ড সন্স", buyerPhone: "01811223344", bidAmount: 66, timestamp: new Date(Date.now() - 1 * 3600000).toISOString() }
    ]
  },
  {
    id: "prod-2",
    farmerName: "নজরুল ইসলাম",
    farmerPhone: "+৮৮০১৮২৩৪৫৬৭৮৯",
    cropName: "গোল আলু (ডায়মন্ড জাত)",
    category: "সবজি",
    quantity: "৫০০০",
    basePrice: 28,
    unit: "কেজি",
    location: "মুন্সীগঞ্জ (গজারিয়া)",
    image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=400",
    status: "available",
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    description: "হিমাগারে রাখার উপযোগী একদম তাজা ডায়মন্ড আলু। মাঠ থেকে সরাসরি তোলা হয়েছে। কোন পচা নেই।",
    bids: []
  },
  {
    id: "prod-3",
    farmerName: "কৃষক আমজাদ হোসেন",
    farmerPhone: "+৮৮০১৫৩৪৫৬৭৮৯০",
    cropName: "রাজশাহী ল্যাংড়া আম",
    category: "ফল",
    quantity: "৫০",
    basePrice: 2400,
    unit: "মন",
    location: "রাজশাহী (বাঘা)",
    image: "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=400",
    status: "available",
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    description: "ফরমালিন মুক্ত গাছপাকা তাজা ল্যাংড়া আম। সরাসরি বাগান থেকে সরবরাহ করা হবে। ন্যূনতম অর্ডার ৫ মন।",
    bids: [
      { id: "bid-31", buyerName: "ঢাকা ফ্রুট গ্যালারি", buyerPhone: "01755667788", bidAmount: 2450, timestamp: new Date(Date.now() - 10 * 3600000).toISOString() },
      { id: "bid-32", buyerName: "মেসার্স সুফিয়ান ট্রেডার্স", buyerPhone: "01912987654", bidAmount: 2500, timestamp: new Date(Date.now() - 4 * 3600000).toISOString() }
    ]
  },
  {
    id: "prod-4",
    farmerName: "সুফিয়া বেগম",
    farmerPhone: "+৮৮০১৬৪৫৬৭৮৯Ax",
    cropName: "দেশী লাল টমেটো",
    category: "সবজি",
    quantity: "৬০০",
    basePrice: 42,
    unit: "কেজি",
    location: "যশোর (সদর)",
    image: "https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=400",
    status: "available",
    createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
    description: "জৈব সার দিয়ে চাষ করা লাল টমেটো। চমৎকার স্বাদ এবং সম্পূর্ণ বিষমুক্ত। কারওয়ান বাজারের পার্টিদের অগ্রাধিকার দেয়া হবে।",
    bids: []
  },
  {
    id: "prod-5",
    farmerName: "মিজানুর শেখ",
    farmerPhone: "+৮৮০১৭২২১১২২৩৩",
    cropName: "নাটোরের লাল মসুর ডাল",
    category: "ডাল ও তেলবীজ",
    quantity: "৮০০",
    basePrice: 110,
    unit: "কেজি",
    location: "নাটোর (লালপুর)",
    image: "https://images.unsplash.com/photo-1547058886-af77992d8d6f?auto=format&fit=crop&q=80&w=400",
    status: "available",
    createdAt: new Date(Date.now() - 36 * 3600000).toISOString(),
    description: "নিজের জমির পুষ্ট লাল মসুর ডাল। পরিষ্কার এবং শুকনো কড়া রোদে শুকানো হয়েছে। সরাসরি রান্না উপযোগী।",
    bids: []
  }
];

// AgroNews interface and initial daily updates state
interface AgroNews {
  id: number;
  textBn: string;
  textEn: string;
  dateBn: string;
  dateEn: string;
}

let agroNewsList: AgroNews[] = [
  { 
    id: 1, 
    textBn: "নতুন টিএসপি ও ইউরিয়া সার ক্রয়ে ২৫% সরকারি ভর্তুকির ঘোষণা।", 
    textEn: "Government announces 25% subsidy on new TSP & Urea fertilizer.",
    dateBn: "আজ",
    dateEn: "Today"
  },
  { 
    id: 2, 
    textBn: "চলতি সপ্তাহে রাজশাহী বিভাগে খরার সতর্কবার্তা; আমের গাছে পরিমিত সেচ দিন।", 
    textEn: "Drought warning in Rajshahi Division; water mango trees properly.",
    dateBn: "গতকাল",
    dateEn: "Yesterday"
  },
  { 
    id: 3, 
    textBn: "স্মার্ট কৃষি ঋণ মেলা উপলক্ষে ৪% সুলভ সুদে ঋণ বিতরণ শুরু।", 
    textEn: "Agriculture Loan Fair begins with quick loans at 4% soft interest rates.",
    dateBn: "৩ দিন আগে",
    dateEn: "3d ago"
  }
];

// ==========================================================
// 2. AGRICULTURAL WEATHER & ADVISORY GENERATOR (REST & CHAT MOCKS)
// ==========================================================
const districtWeather = [
  { id: "rajshahi", name: "রাজশাহী", temp: 34, cond: "রৌদ্রোজ্জ্বল", humidity: 55, moisture: "৪৫%", wind: "১২ কিমি/ঘণ্টা", advisory: "আগামী ৩ দিন বৃষ্টির সম্ভাবনা নেই। আমের বাগানে হালকা সেচ দিন এবং সার ছিটানো সম্পন্ন করুন।" },
  { id: "dinajpur", name: "দিনাজপুর", temp: 31, cond: "আংশিক মেঘলা", humidity: 62, moisture: "৪৮%", wind: "৮ কিমি/ঘণ্টা", advisory: "ধান পাকা শুরু হয়েছে। ধান কাটার জন্য আবহাওয়া খুবই অনুকূল। দ্রুত ধান কেটে শুকিয়ে নিন।" },
  { id: "sylhet", name: "সিলেট", temp: 28, cond: "বজ্রবৃষ্টির সম্ভাবনা", humidity: 88, moisture: "৭৫%", wind: "১৮ কিমি/ঘণ্টা", advisory: "ভারী বর্ষণের সম্ভাবনা রয়েছে। তরমুজ ও সবজি জমিতে পানি নিষ্কাশন ড্রেন পরিষ্কার রাখুন। সার ছিটানো বন্ধ রাখুন।" },
  { id: "jessore", name: "যশোর", temp: 33, cond: "গরম ও শুষ্ক", humidity: 50, moisture: "৪২%", wind: "১৫ কিমি/ঘণ্টা", advisory: "তীব্র তাপপ্রবাহ চলমান। পাট গাছের বৃদ্ধির জন্য জমিতে পর্যাপ্ত আদ্রতা স্তর বজায় রাখুন।" },
  { id: "rangpur", name: "রংপুর", temp: 30, cond: "আংশিক মেঘলা", humidity: 68, moisture: "৫০%", wind: "১০ কিমি/ঘণ্টা", advisory: "তামাক ও আলু মাঠ থেকে তোলার কাজ শেষ করুন। পরবর্তী ফসলের জন্য জমি চাষ তৈরি করুন।" },
  { id: "munshiganj", name: "মুন্সীগঞ্জ", temp: 29, cond: "পরিষ্কার আবহাওয়া", humidity: 60, moisture: "৪৬%", wind: "৯ কিমি/ঘণ্টা", advisory: "আর্দ্রতা সঠিক থাকায় হিমাগারে আলু প্রেরণের জন্য উত্তম দিন। ফসলে ব্লাইট দমনে নিয়মিত পর্যবেক্ষণ রাখুন।" },
  { id: "barisal", name: "বরিশাল", temp: 30, cond: "হালকা কুয়াশা ও মেঘ", humidity: 75, moisture: "৫8%", wind: "১৪ কিমি/ঘণ্টা", advisory: "পান চাষে গোড়া পচা রোগ এড়াতে জমিতে অতিরিক্ত পানি জমতে দেবেন না। ছত্রাকনাশক স্প্রে করতে পারেন।" },
  { id: "mymensingh", name: "ময়মনসিংহ", temp: 32, cond: "মেঘলা আকাশ", humidity: 65, moisture: "৫২%", wind: "১১ কিমি/ঘণ্টা", advisory: "ফসলে পটাশ বা দস্তা সারের ঘাটতি পূরণে হালকা বৃষ্টির সুযোগ গ্রহণ করুন।" }
];

// Time series crop prices generator for dynamic charts
let cropPriceDatabase = [
  {
    name: "মিনিকিট ধান (টাকা/মন)",
    KarwanBazar: [1280, 1290, 1295, 1285, 1300, 1310, 1320],
    Baneswar: [1200, 1210, 1215, 1220, 1225, 1230, 1240],
    Mohasthangarh: [1180, 1190, 1200, 1205, 1195, 1210, 1220],
    Jessore: [1220, 1225, 1230, 1228, 1235, 1240, 1250],
  },
  {
    name: "ডায়মন্ড আলু (টাকা/কেজি)",
    KarwanBazar: [32, 33, 34, 34, 35, 36, 38],
    Baneswar: [25, 26, 26, 27, 27, 28, 29],
    Mohasthangarh: [26, 26, 27, 27, 28, 28, 30],
    Jessore: [28, 29, 29, 30, 31, 32, 33],
  },
  {
    name: "দেশী পেঁয়াজ (টাকা/কেজি)",
    KarwanBazar: [68, 70, 72, 75, 78, 80, 82],
    Baneswar: [55, 58, 60, 62, 64, 66, 68],
    Mohasthangarh: [58, 60, 61, 63, 65, 68, 70],
    Jessore: [62, 64, 65, 68, 70, 72, 74],
  },
  {
    name: "লাল টমেটো (টাকা/কেজি)",
    KarwanBazar: [50, 48, 45, 42, 40, 42, 45],
    Baneswar: [40, 38, 36, 32, 30, 32, 35],
    Mohasthangarh: [38, 35, 33, 30, 28, 30, 32],
    Jessore: [42, 40, 38, 35, 34, 35, 38],
  }
];

// Fallback high-fidelity advice arrays for agricultural Q&A
const advisorFallbacks: { keywords: string[]; answer: string }[] = [
  {
    keywords: ["ধান", "rice", "ব্লাস্ট", "blast", "কারেন্ট পোকা"],
    answer: "🌾 **ধানের ব্লাস্ট ও রোগ প্রতিকার:**\n\n১. **লক্ষণ:** পাতার ওপর দুই মাথা সরু ও মাঝখান চওড়া চোখের মতো দাগ পড়ে, মাঝের অংশ ছাই রঙের হয়।\n২. **সমাধান:** জমিতে পর্যাপ্ত পানি রাখুন। ইউরিয়া সারের ব্যবহার কমিয়ে পটাশ সার ব্যবহার বাড়িয়ে দিন। ছত্রাকনাশক হিসেবে **ট্রাইসাইক্লাজল** (উদা: ট্রুপার বা দিহান) ৬ গ্রাম ১০ লিটার পানিতে মিশিয়ে ৫ শতাংশ জমিতে স্প্রে করুন।\n৩. **পোকা নিয়ন্ত্রণ:** বাদামী ঘাস ফড়িং বা কারেন্ট পোকার জন্য থায়োমিথোক্সাম + ল্যামডা-সাইহ্যালোথ্রিন (উদা: ডাইনামাইট) বা ইমিডাক্লোপ্রিড গ্রুপের কীটনাশক গাছের গোড়ায় স্প্রে করুন।"
  },
  {
    keywords: ["আলু", "potato", "ব্লাইট", "blight", "লেট ব্লাইট"],
    answer: "🥔 **আলুর লেট ব্লাইট (নাবি পচা রোগ):**\n\n১. **লক্ষণ:** প্রথমে পাতার উপর ভেজা দাগ দেখা যায় এবং কুয়াশাচ্ছন্ন আবহাওয়ায় পাতার নিচ পিঠে সাদা তুলার মতো ছত্রাক দেখা দেয়। দ্রুত কান্ড ও পুরো গাছ পচে যায়।\n২. **প্রতিরোধ ও প্রতিকার:** কুয়াশাচ্ছন্ন আবহাওয়া শুরু হওয়ার পূর্বেই আগাম ম্যানকোজেব (উদা: ডাইথেন এম-৪৫) প্রতি লিটার পানিতে ২ গ্রাম হারে স্প্রে করুন। রোগ আক্রমণ করলে **মেটাল্যাক্সিল + ম্যানকোজেব** (উদা: রিডোমিল গোল্ড) প্রতি লিটার পানিতে ২ গ্রাম হারে মিশিয়ে ৭ দিন পরপর ২-৩ বার স্প্রে করুন। সকালে রোদ ওঠার পর জমি পর্যবেক্ষণ করুন।"
  },
  {
    keywords: ["টমেটো", "tomato", "পাতা কোঁকড়ানো", "curl", "ধসা"],
    answer: "🍅 **টমেটোর পাতা কোঁকড়ানো রোগ (Leaf Curl Virus):**\n\n১. **লক্ষণ:** কচি ও বয়স্ক পাতা কুঁকড়ে যায়, আকারে ছোট ও শক্ত হয়ে যায়। গাছ ঝোপালো ও বামন আকৃতির দেখায়। এটি মূলত সাদা মাছি দ্বারা ছড়ায়।\n২. **সমাধান:** আক্রান্ত গাছ তুলে মাটিতে পুঁতে ফেলুন। ভাইরাসের বাহক পোকা বা সাদা মাছি দমনের জন্য জমিতে হলুদ ফাঁদ ব্যবহার করুন এবং **ইমিডাক্লোপ্রিড** (উদা: এডমায়ার বা টিডো) ০.৫ মিলি প্রতি লিটার পানিতে মিশিয়ে ৭ দিন পরপর স্প্রে করুন। ফুল আসার পূর্বে স্প্রে করা ভালো।"
  },
  {
    keywords: ["সার", "বীজ", "হিসাব", "fertilizer", "calculator", "কতখানি"],
    answer: "📊 **ফসলের সার প্রয়োগের সাধারণ নির্দেশিকা (শতক প্রতি জমির হিসাব):**\n\n১. **উফশী ধানের জন্য:** শতক প্রতি ইউরিয়া ৮০০ গ্রাম, টিএসপি ৪০০ গ্রাম, এমওপি ৫০০ গ্রাম, জিপসাম ৩০০ গ্রাম।\n২. **আলুর জন্য:** শতক প্রতি ইউরিয়া ১.৪ কেজি, টিএসপি ৯০০ গ্রাম, এমওপি ১.৫ কেজি, জিপসাম ৫ কেজি।\n৩. **টমেটোর জন্য:** শতক প্রতি ইউরিয়া ১.২ কেজি, টিএসপি ৮০০ গ্রাম, এমওপি ১.১ কেজি।\n*টিপস: ইউরিয়া সার সমান ৩ কিস্তিতে প্রয়োগ করতে হয়। সেচের সময় ইউরিয়া ছিটানো থেকে বিরত থাকুন।*"
  }
];

const generalAdvisorFallback = `🌱 **কৃষি তথ্য ও বাজার সংযোগ পরামর্শক এআই:**
আপনার প্রশ্নের অত্যন্ত ধন্যবাদ। কৃষি বিষয়ক যে কোনো পরামর্শ পেতে পারেন। 

১. আপনি যদি ফসলের কোনো রোগ নিয়ে সংকটে পড়েন, আমাদের **"ফসল রোগ নির্ণয়ক"** ট্যাবে গিয়ে আক্রান্ত অংশের সচিত্র ফাইল আপলোড করুন। 
২. সেচ বা সার ব্যবহারের আগে আমাদের **"আবহাওয়া বার্তা"** পর্যবেক্ষণ করুন। বৃষ্টিপাতের ৩ দিন পূর্বে বা তীব্র রোদে সার প্রয়োগ এড়িয়ে চলুন।
৩. ফসলের নায্য মূল্য নিশ্চিত করতে আপনার উৎপাদিত ফসল **"কৃষকের বাজার"** সেকশনে লিস্ট করুন। পাইকার ও আড়তদাররা সরাসরি আপনার সাথে যোগাযোগ করে সর্বোচ্চ ডাক বা বিড করতে পারবেন।

ফসল সংক্রান্ত সুনির্দিষ্ট কোনো প্রশ্ন থাকলে পুনরায় জিজ্ঞেস করুন (যেমন: ধানের মাজরা পোকা দমন, করলার পচন রোগ ইত্যাদি)।`;

// ==========================================================
// 3. API ROUTE HANDLERS
// ==========================================================

// Weather API
app.get("/api/weather", async (req, res, next) => {
  try {
    if (isDbConnected()) {
      const data = await WeatherModel.find({});
      return res.json({ status: "success", data });
    }
    res.json({ status: "success", data: districtWeather });
  } catch (err) {
    next(err);
  }
});

// Advanced Weather Search API for any upazila/district/village
app.get("/api/weather/search", async (req, res, next) => {
  try {
    const { location } = req.query;
    if (!location || typeof location !== "string" || !location.trim()) {
      return res.status(400).json({ status: "error", message: "স্থান বা উপজেলার নাম প্রদান করা আবশ্যক।" });
    }

    const query = location.trim();
    
    // Search in MongoDB if connected
    if (isDbConnected()) {
      const match = await WeatherModel.findOne({ 
        $or: [
          { name: { $regex: query, $options: "i" } },
          { id: { $regex: query, $options: "i" } }
        ]
      });
      if (match) {
        return res.json({ status: "success", data: match });
      }
    } else {
      const match = districtWeather.find(w => 
        w.name.toLowerCase().includes(query.toLowerCase()) || 
        query.toLowerCase().includes(w.name.toLowerCase())
      );
      if (match) {
        return res.json({ status: "success", data: match });
      }
    }

    // Try Gemini API to generate real-time realistic forecast and advisory
    const ai = getGeminiClient();
    if (ai) {
      try {
        const prompt = `You are a professional Bangladeshi agricultural meteorology expert.
Generate a realistic current weather forecast and crop-specific agricultural advisory for the following location in Bangladesh: "${query}".
The current date/year is June 2026. Keep the response compact and formatted as raw JSON exactly matching this structure (do NOT include markdown code blocks or wrapping strings, return only raw JSON parseable string):
{
  "name": "${query}",
  "temp": 32,
  "cond": "A realistic weather description in Bengali e.g. রৌদ্রোজ্জ্বল আকাশ or আংশিক মেঘলা or হালকা বজ্রবৃষ্টি",
  "humidity": 65,
  "moisture": "৪৫%",
  "wind": "১০ কিমি/ঘণ্টা",
  "advisory": "A highly precise, single paragraph agricultural advisory in Bengali tailored to this specific location and current weather condition, suggesting crop-specific actions for farmers."
}`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json"
          }
        });

        const textResult = response.text || "";
        const parsed = JSON.parse(textResult.trim());
        const weatherObj = { id: `dyn-${Date.now()}`, ...parsed };

        if (isDbConnected()) {
          const doc = new WeatherModel(weatherObj);
          await doc.save();
        }

        return res.json({ status: "success", data: weatherObj });
      } catch (geminiErr) {
        console.error("Gemini weather generation failed, falling back to dynamic generator:", geminiErr);
      }
    }

    // Fallback deterministic random generator based on the location name so it always works beautifully
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      hash = query.charCodeAt(i) + ((hash << 5) - hash);
    }
    const absHash = Math.abs(hash);
    const temperatures = [29, 30, 31, 32, 33, 34, 35, 28];
    const conditions = ["রৌদ্রোজ্জ্বল আকাশ", "আংশিক মেঘলা", "হালকা মাঝারি বৃষ্টি", "বজ্রসহ ঝড়ো বৃষ্টি", "তীব্র গরম ও শুষ্ক আবহাওয়া"];
    const advisories = [
      "জমিতে অতিরিক্ত ইউরিয়া সার প্রয়োগ থেকে বিরত থাকুন। শাকসবজির গোড়ায় হালকা নিড়ানি দিয়ে মাটি আলগা রাখুন এবং নিষ্কাশন ব্যবস্থা সচল রাখুন।",
      "সেচ প্রয়োগ কিছুটা ধীর করুন। নতুন আবাদি জমির চারাগাছ পোকামাকড় আক্রমণ থেকে রক্ষায় লিকুইড পটাসিয়াম স্প্রে করতে পারেন।",
      "পরবর্তী ৩ দিনে বজ্রবৃষ্টির সম্ভাবনা থাকায় পাকা ফসল থাকলে তা দ্রুত কেটে নিরাপদ স্থানে সংরক্ষণ করুন। নিচু জমিতে পানি নিবদ্ধতা রোধ করুন।",
      "মাটির আর্দ্রতা কমে যাওয়ার আশঙ্কা রয়েছে। ফলদ গাছে বিশেষত আম ও লিচুর গোড়ায় বিকেলের দিকে পর্যাপ্ত সেচ দিন।",
      "পরিষ্কার আবহাওয়া বিদ্যমান। ফসল নিড়ানি, সার প্রয়োগ বা কীটনাশক স্প্রে করার জন্য আজকের দিনটি অত্যন্ত উপযোগী।"
    ];

    const temp = temperatures[absHash % temperatures.length];
    const cond = conditions[absHash % conditions.length];
    const humidity = 50 + (absHash % 41); // 50 to 90 %
    const moisture = `${40 + (absHash % 31)}%`; // 40% to 70%
    const wind = `${6 + (absHash % 15)} কিমি/ঘণ্টা`;
    const advisory = advisories[absHash % advisories.length];

    const fallbackWeather = {
      id: `dyn-fb-${absHash}`,
      name: query,
      temp,
      cond,
      humidity,
      moisture,
      wind,
      advisory: `[কৃষি সংযোগ পূর্বাভাস] ${query} এলাকায় বর্তমানে ${cond} আবহাওয়া বিরাজ করছে। কৃষকদের পরামর্শ: ${advisory}`
    };

    if (isDbConnected()) {
      try {
        const doc = new WeatherModel(fallbackWeather);
        await doc.save();
      } catch (err) {}
    }

    return res.json({ status: "success", data: fallbackWeather });
  } catch (error: any) {
    next(error);
  }
});

// Market prices API
app.get("/api/market-prices", async (req, res, next) => {
  try {
    if (isDbConnected()) {
      const prices = await CropPriceModel.find({});
      return res.json({ status: "success", data: prices });
    }
    res.json({ status: "success", data: cropPriceDatabase });
  } catch (err) {
    next(err);
  }
});

// Update specific crop prices (replaces or appends daily updates)
app.post("/api/market-prices/update", async (req, res, next) => {
  try {
    const { name, KarwanBazar, Baneswar, Mohasthangarh, Jessore } = req.body;
    if (!name) {
      return res.status(400).json({ status: "error", message: "শস্যের নাম প্রদান করা আবশ্যক।" });
    }

    if (isDbConnected()) {
      const updateDoc: any = {};
      if (KarwanBazar && Array.isArray(KarwanBazar)) updateDoc.KarwanBazar = KarwanBazar.map(Number);
      if (Baneswar && Array.isArray(Baneswar)) updateDoc.Baneswar = Baneswar.map(Number);
      if (Mohasthangarh && Array.isArray(Mohasthangarh)) updateDoc.Mohasthangarh = Mohasthangarh.map(Number);
      if (Jessore && Array.isArray(Jessore)) updateDoc.Jessore = Jessore.map(Number);

      const crop = await CropPriceModel.findOneAndUpdate({ name }, { $set: updateDoc }, { new: true });
      if (!crop) {
        return res.status(404).json({ status: "error", message: "শস্যের প্রোফাইল পাওয়া যায়নি।" });
      }
      return res.json({ status: "success", message: "বাজার দর সফলভাবে আপডেট করা হয়েছে।", data: crop });
    }

    const crop = cropPriceDatabase.find(c => c.name === name);
    if (!crop) {
      return res.status(404).json({ status: "error", message: "শস্যের প্রোফাইল পাওয়া যায়নি।" });
    }

    if (KarwanBazar && Array.isArray(KarwanBazar)) crop.KarwanBazar = KarwanBazar.map(Number);
    if (Baneswar && Array.isArray(Baneswar)) crop.Baneswar = Baneswar.map(Number);
    if (Mohasthangarh && Array.isArray(Mohasthangarh)) crop.Mohasthangarh = Mohasthangarh.map(Number);
    if (Jessore && Array.isArray(Jessore)) crop.Jessore = Jessore.map(Number);

    res.json({ status: "success", message: "বাজার দর সফলভাবে আপডেট করা হয়েছে।", data: crop });
  } catch (err) {
    next(err);
  }
});

// Add a new commodity crop profile with initial pricing list
app.post("/api/market-prices/add", async (req, res, next) => {
  try {
    const { name, initialPrice } = req.body;
    if (!name || isNaN(Number(initialPrice))) {
      return res.status(400).json({ status: "error", message: "সঠিক শস্যের নাম ও প্রাথমিক মূল্য প্রদান করুন।" });
    }

    const price = Number(initialPrice);
    const initialTrend = [price, price, price, price, price, price, price];

    if (isDbConnected()) {
      const duplicate = await CropPriceModel.findOne({ name });
      if (duplicate) {
        return res.status(400).json({ status: "error", message: "এই শস্যটি ইতিমধ্যে তালিকায় নিবন্ধিত রয়েছে।" });
      }
      const newCrop = new CropPriceModel({
        name,
        KarwanBazar: [...initialTrend],
        Baneswar: [...initialTrend],
        Mohasthangarh: [...initialTrend],
        Jessore: [...initialTrend]
      });
      await newCrop.save();
      return res.json({ status: "success", message: "নতুন শস্য সফলভাবে বাজার দর তালিকায় যোগ করা হয়েছে।", data: newCrop });
    }

    const duplicate = cropPriceDatabase.find(c => c.name === name);
    if (duplicate) {
      return res.status(400).json({ status: "error", message: "এই শস্যটি ইতিমধ্যে তালিকায় নিবন্ধিত রয়েছে।" });
    }

    const newCrop = {
      name,
      KarwanBazar: [...initialTrend],
      Baneswar: [...initialTrend],
      Mohasthangarh: [...initialTrend],
      Jessore: [...initialTrend]
    };

    cropPriceDatabase.push(newCrop);
    res.json({ status: "success", message: "নতুন শস্য সফলভাবে বাজার দর তালিকায় যোগ করা হয়েছে।", data: newCrop });
  } catch (err) {
    next(err);
  }
});

// ==========================================================
// 3.3. AGRO NEWS UPDATES (CRUD)
// ==========================================================

// GET all agro news
app.get("/api/agro-news", async (req, res, next) => {
  try {
    if (isDbConnected()) {
      const news = await AgroNewsModel.find({}).sort({ id: -1 });
      return res.json({ status: "success", data: news });
    }
    res.json({ status: "success", data: agroNewsList });
  } catch (err) {
    next(err);
  }
});

// ADD agro news
app.post("/api/agro-news/add", async (req, res, next) => {
  try {
    const { textBn, textEn, dateBn, dateEn } = req.body;
    if (!textBn || !textEn) {
      return res.status(400).json({ status: "error", message: "বাংলা এবং ইংরেজি নিউজের বিবরণ প্রয়োজন।" });
    }

    if (isDbConnected()) {
      const lastNews = await AgroNewsModel.findOne().sort({ id: -1 });
      const nextId = lastNews ? Number(lastNews.id) + 1 : 1;

      const newNews = new AgroNewsModel({
        id: nextId,
        textBn,
        textEn,
        dateBn: dateBn || "আজ",
        dateEn: dateEn || "Today"
      });

      await newNews.save();
      return res.json({ status: "success", message: "ডেইলি নিউজ সফলভাবে যুক্ত হয়েছে।", data: newNews });
    }

    const nextId = agroNewsList.length > 0 ? Math.max(...agroNewsList.map(n => n.id)) + 1 : 1;
    const newNews = {
      id: nextId,
      textBn,
      textEn,
      dateBn: dateBn || "আজ",
      dateEn: dateEn || "Today"
    };
    agroNewsList.unshift(newNews);
    res.json({ status: "success", message: "ডেইলি নিউজ সফলভাবে যুক্ত হয়েছে।", data: newNews });
  } catch (err) {
    next(err);
  }
});

// DELETE agro news
app.post("/api/agro-news/delete/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const newsIdNum = Number(id);

    if (isDbConnected()) {
      const news = await AgroNewsModel.findOneAndDelete({ id: newsIdNum });
      if (!news) {
        return res.status(404).json({ status: "error", message: "নিউজটি পাওয়া যায়নি।" });
      }
      return res.json({ status: "success", message: "নিউজটি সফলভাবে ডিলিট করা হয়েছে।" });
    }

    const idx = agroNewsList.findIndex(n => n.id === newsIdNum);
    if (idx === -1) {
      return res.status(404).json({ status: "error", message: "নিউজটি পাওয়া যায়নি।" });
    }
    agroNewsList.splice(idx, 1);
    res.json({ status: "success", message: "নিউজটি সফলভাবে ডিলিট করা হয়েছে।" });
  } catch (err) {
    next(err);
  }
});

// ==========================================================
// 3.4. MARKETPLACE CROP LISTINGS (CRUD)
// ==========================================================

// GET all marketplace listings
app.get("/api/marketplace", async (req, res, next) => {
  try {
    if (isDbConnected()) {
      const products = await ProductModel.find({}).sort({ createdAt: -1 });
      return res.json({ status: "success", data: products });
    }
    res.json({ status: "success", data: marketplaceProducts });
  } catch (err) {
    next(err);
  }
});

// ADD a harvest listing to marketplace
app.post("/api/marketplace", async (req, res, next) => {
  try {
    const { farmerName, farmerPhone, cropName, category, quantity, basePrice, unit, location, image, description } = req.body;
    
    if (!farmerName || !farmerPhone || !cropName || !category || !quantity || !basePrice || !unit) {
      return res.status(400).json({ status: "error", message: "প্রয়োজনীয় সকল তথ্য পূরণ করেননি।" });
    }

    const priceNum = Number(basePrice);
    const productId = `prod-${Date.now()}`;

    if (isDbConnected()) {
      const newProduct = new ProductModel({
        id: productId,
        farmerName,
        farmerPhone,
        cropName,
        category,
        quantity,
        basePrice: priceNum,
        unit,
        location: location || "বাংলাদেশ",
        image: image || "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=400",
        description: description || "",
        bids: [],
        status: "available",
        createdAt: new Date().toISOString()
      });

      await newProduct.save();
      return res.json({ status: "success", message: "ফসল বিক্রয়ের তালিকা সফলভাবে পোস্ট হয়েছে!", data: newProduct });
    }

    const newProduct: Product = {
      id: productId,
      farmerName,
      farmerPhone,
      cropName,
      category: category as any,
      quantity,
      basePrice: priceNum,
      unit: unit as any,
      location: location || "বাংলাদেশ",
      image: image || "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=400",
      description: description || "",
      bids: [],
      status: "available",
      createdAt: new Date().toISOString()
    };

    marketplaceProducts.unshift(newProduct);
    res.json({ status: "success", message: "ফসল বিক্রয়ের তালিকা সফলভাবে পোস্ট হয়েছে!", data: newProduct });
  } catch (err) {
    next(err);
  }
});

// DELETE a harvest listing
app.post("/api/marketplace/:id/delete", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isDbConnected()) {
      const product = await ProductModel.findOneAndDelete({ id });
      if (!product) {
        return res.status(404).json({ status: "error", message: "পণ্যটি পাওয়া যায়নি।" });
      }
      return res.json({ status: "success", message: "তালিকাভুক্ত ফসল সফলভাবে ডিলিট করা হয়েছে।" });
    }

    const idx = marketplaceProducts.findIndex(p => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ status: "error", message: "পণ্যটি পাওয়া যায়নি।" });
    }
    marketplaceProducts.splice(idx, 1);
    res.json({ status: "success", message: "তালিকাভুক্ত ফসল সফলভাবে ডিলিট করা হয়েছে।" });
  } catch (err) {
    next(err);
  }
});

// ==========================================================
// 3.5. AUTHENTICATION SERVICES & RECORD ARCHIVES (CRUD)
// ==========================================================

// Register Protinidhi (Representative) Account
app.post("/api/auth/representative/register", async (req, res, next) => {
  try {
    const { fullName, phone, email, password, division, district, upazila, unionOrVillage } = req.body;
    
    if (!fullName || !phone || !email || !password || !division || !district || !upazila || !unionOrVillage) {
      return res.status(400).json({ status: "error", message: "প্রতিনিধি রেজিস্ট্রেশনের সকল তথ্য পূরণ করা আবশ্যক।" });
    }

    if (!isDbConnected()) {
      return res.status(503).json({ status: "error", message: "ডাটাবেস সংযোগ বিচ্ছিন্ন রয়েছে। অনুগ্রহ করে পরে চেষ্টা করুন।" });
    }

    const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ status: "error", message: "এই ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট তৈরি করা হয়েছে।" });
    }

    const bcryptPassword = hashBcrypt(password);

    // Save User record
    const newUser = new UserModel({
      name: fullName,
      email: email.toLowerCase(),
      password: bcryptPassword,
      phone: phone,
      role: "protinidhi",
      walletBalance: 14250
    });
    await newUser.save();

    // Save Representative profile
    const newProfile = new RepresentativeProfileModel({
      fullName,
      phone,
      email: email.toLowerCase(),
      password: bcryptPassword,
      division,
      district,
      upazila,
      unionOrVillage,
      status: "Pending",
      createdAt: new Date().toISOString()
    });
    await newProfile.save();

    return res.json({
      status: "success",
      message: "প্রতিনিধি অ্যাকাউন্টটি রেজিস্ট্রেশন সম্পন্ন হয়েছে এবং অনুমোদনের অপেক্ষায় আছে!",
      data: {
        fullName,
        email: email.toLowerCase(),
        status: "Pending"
      }
    });
  } catch (err) {
    next(err);
  }
});

// Register Standard User/Farmer Account
app.post("/api/auth/register", async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ status: "error", message: "ইমেইল এবং পাসওয়ার্ড প্রদান করা আবশ্যক।" });
    }

    if (!isDbConnected()) {
      return res.status(503).json({ status: "error", message: "ডাটাবেস সংযোগ বিচ্ছিন্ন রয়েছে। অনুগ্রহ করে পরে চেষ্টা করুন।" });
    }

    const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ status: "error", message: "এই ইমেইল দিয়ে ইতিমধ্যে অ্যাকাউন্ট তৈরি করা হয়েছে।" });
    }

    const bcryptPassword = hashBcrypt(password);
    const newUser = new UserModel({
      name: name || "Default User",
      email: email.toLowerCase(),
      password: bcryptPassword,
      phone: phone || "",
      role: role || "farmer",
      walletBalance: 14250
    });

    await newUser.save();
    return res.json({ 
      status: "success", 
      message: "অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!", 
      user: {
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        walletBalance: newUser.walletBalance
      }
    });
  } catch (err) {
    next(err);
  }
});

// Login User Account (Supports pbkdf2 and bcrypt, restricts unapproved Protinidhis)
app.post("/api/auth/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ status: "error", message: "ইমেইল এবং পাসওয়ার্ড প্রদান করা আবশ্যক।" });
    }

    // Hardcoded Super Admin details from instruction (sabjadulislamsun15@gmail.com / sanjadul123456)
    if (email === "sabjadulislamsun15@gmail.com" && password === "sanjadul123456") {
      // Auto-create/upsert the Super Admin in DB for safety
      if (isDbConnected()) {
        const adminExists = await UserModel.findOne({ email: "sabjadulislamsun15@gmail.com" });
        if (!adminExists) {
          const adminUser = new UserModel({
            name: "সঞ্জাদুল ইসলাম (সুপার অ্যাডমিন)",
            email: "sabjadulislamsun15@gmail.com",
            password: hashBcrypt("sanjadul123456"),
            phone: "+৮৮০১৭১২৩৪৫৬৭৮",
            role: "admin",
            walletBalance: 999999
          });
          await adminUser.save();
        }
      }
      return res.json({
        status: "success",
        user: {
          email: "sabjadulislamsun15@gmail.com",
          name: "সঞ্জাদুল ইসলাম",
          phone: "+৮৮০১৭১২৩৪৫৬৭৮",
          role: "admin",
          walletBalance: 999999
        }
      });
    }

    if (!isDbConnected()) {
      return res.status(503).json({ status: "error", message: "ডাটাবেস সংযোগ সাময়িকভাবে উপলব্ধ নেই এবং ক্রেডেনশিয়াল মেলেনি।" });
    }

    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ status: "error", message: "ভুল ইমেল বা পাসওয়ার্ড! অনুগ্রহ করে আবার চেষ্টা করুন।" });
    }

    // Check credentials supporting both old pbkdf2 and new bcrypt
    let passwordMatch = false;
    if (user.password.startsWith("$2a$") || user.password.startsWith("$2b$")) {
      passwordMatch = compareBcrypt(password, user.password);
    } else {
      passwordMatch = (user.password === hashPassword(password));
    }

    if (!passwordMatch) {
      return res.status(401).json({ status: "error", message: "ভুল ইমেল বা পাসওয়ার্ড! অনুগ্রহ করে আবার চেষ্টা করুন।" });
    }

    // RBAC: Check block status of representative accounts
    if (user.role === "protinidhi") {
      const repProfile = await RepresentativeProfileModel.findOne({ email: email.toLowerCase() });
      if (!repProfile) {
        return res.status(401).json({ status: "error", message: "প্রতিনিধি প্রোফাইল খুঁজে পাওয়া যায়নি।" });
      }

      if (repProfile.status === "Pending") {
        return res.status(401).json({ status: "error", message: "আপনার প্রতিনিধি অ্যাকাউন্টটি এখনও সুপার অ্যাডমিন কর্তৃক অনুমোদিত হয়নি। অনুগ্রহ করে অপেক্ষা করুন।" });
      }

      if (repProfile.status === "Rejected") {
        return res.status(401).json({ status: "error", message: "আপনার প্রতিনিধি অ্যাকাউন্টের আবেদন বাতিল করা হয়েছে।" });
      }
    }

    return res.json({
      status: "success",
      message: "সফলভাবে লগইন করা হয়েছে!",
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        walletBalance: user.walletBalance
      }
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================================
// 3.6. REPRESENTATIVE (PROTINIDHI) PANEL APIs
// ==========================================================

// Submit a new area crop price
app.post("/api/representative/prices", async (req, res, next) => {
  try {
    const { productName, price, unit, division, district, upazila, representativeId, representativeName } = req.body;
    
    if (!productName || !price || !unit || !division || !district || !upazila || !representativeId || !representativeName) {
      return res.status(400).json({ status: "error", message: "বাজার দরের সকল ফিল্ড পূরণ করা আবশ্যক।" });
    }

    if (!isDbConnected()) {
      return res.status(503).json({ status: "error", message: "ডাটাবেস সংযোগ সংযোগ বিচ্ছিন্ন রয়েছে।" });
    }

    const newPriceRecord = new ProductPriceModel({
      productName,
      price: Number(price),
      unit,
      division,
      district,
      upazila,
      representativeId: representativeId.toLowerCase(),
      representativeName,
      submissionDate: new Date().toLocaleDateString("bn-BD"),
      status: "Pending" // Starts in pending status
    });

    await newPriceRecord.save();
    return res.json({
      status: "success",
      message: "প্রতিনিধি বাজার দরটি সফলভাবে আপলোড করেছেন এবং অনুমোদনের অপেক্ষায় আছে!",
      data: newPriceRecord
    });
  } catch (err) {
    next(err);
  }
});

// Get prices submitted by a specific representative
app.get("/api/representative/prices/:email", async (req, res, next) => {
  try {
    const { email } = req.params;
    if (!isDbConnected()) {
      return res.status(503).json({ status: "error", message: "ডাটাবেস সংযোগ বিচ্ছিন্ন।" });
    }
    const prices = await ProductPriceModel.find({ representativeId: email.toLowerCase() }).sort({ _id: -1 });
    return res.json({ status: "success", data: prices });
  } catch (err) {
    next(err);
  }
});

// Update draft price record before Super Admin approves or rejects
app.put("/api/representative/prices/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { productName, price, unit, division, district, upazila } = req.body;

    if (!isDbConnected()) {
      return res.status(503).json({ status: "error", message: "ডাটাবেস সংযোগ বিচ্ছিন্ন।" });
    }

    const priceRecord = await ProductPriceModel.findById(id);
    if (!priceRecord) {
      return res.status(440).json({ status: "error", message: "বাজার দরের রেকর্ডটি খুঁজে পাওয়া যায়নি।" });
    }

    if (priceRecord.status !== "Pending") {
      return res.status(400).json({ status: "error", message: "অনুমোদিত বা বাতিলকৃত দর রেকর্ড পরিবর্তন করা সম্ভব নয়।" });
    }

    if (productName) priceRecord.productName = productName;
    if (price) priceRecord.price = Number(price);
    if (unit) priceRecord.unit = unit;
    if (division) priceRecord.division = division;
    if (district) priceRecord.district = district;
    if (upazila) priceRecord.upazila = upazila;

    await priceRecord.save();
    return res.json({
      status: "success",
      message: "আপনার বাজার দর সফলভাবে আপডেট করা হয়েছে!",
      data: priceRecord
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================================
// 3.7. SUPER ADMIN ADMIN DASHBOARD APIs
// ==========================================================

// View all Protinidhi (Representative) registration requests & users
app.get("/api/admin/representatives", async (req, res, next) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ status: "error", message: "ডাটাবেস সংযোগ বিচ্ছিন্ন।" });
    }
    const reps = await RepresentativeProfileModel.find({}).sort({ createdAt: -1 });
    return res.json({ status: "success", data: reps });
  } catch (err) {
    next(err);
  }
});

// Approve or Reject Representative application
app.post("/api/admin/representatives/:id/status", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminEmail } = req.body; // status is "Approved" or "Rejected"

    if (!status || !["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ status: "error", message: "অনুমোদনের সঠিক স্ট্যাটাস প্রদান করুন।" });
    }

    if (!isDbConnected()) {
      return res.status(503).json({ status: "error", message: "ডাটাবেস সংযোগ বিচ্ছিন্ন।" });
    }

    const profile = await RepresentativeProfileModel.findById(id);
    if (!profile) {
      return res.status(404).json({ status: "error", message: "প্রতিনিধি প্রোফাইল পাওয়া যায়নি।" });
    }

    const previousStatus = profile.status;
    profile.status = status;
    await profile.save();

    // Create Audit Log
    const auditLog = new ApprovalLogModel({
      actionType: status === "Approved" ? "APPROVE_REPRESENTATIVE" : "REJECT_REPRESENTATIVE",
      targetId: profile.email,
      targetName: profile.fullName,
      performedBy: adminEmail || "sabjadulislamsun15@gmail.com",
      details: `প্রতিনিধি ${profile.fullName} (${profile.email})-এর আবেদন ${status === "Approved" ? "অনুমোদন" : "বাতিল"} করা হয়েছে। পূর্ববর্তী অবস্থা: ${previousStatus}`,
      timestamp: new Date().toISOString()
    });
    await auditLog.save();

    return res.json({
      status: "success",
      message: `প্রতিনিধির আবেদন সফলভাবে ${status === "Approved" ? "অনুমোদন" : "বাতিল"} করা হয়েছে!`,
      data: profile
    });
  } catch (err) {
    next(err);
  }
});

// View all area submitted crop prices
app.get("/api/admin/prices", async (req, res, next) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ status: "error", message: "ডাটাবেস সংযোগ বিচ্ছিন্ন।" });
    }
    const prices = await ProductPriceModel.find({}).sort({ _id: -1 });
    return res.json({ status: "success", data: prices });
  } catch (err) {
    next(err);
  }
});

// Approve or Reject submitted crop prices
app.post("/api/admin/prices/:id/status", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminEmail } = req.body; // status is "Approved" or "Rejected"

    if (!status || !["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ status: "error", message: "সঠিক স্ট্যাটাস প্রদান করুন।" });
    }

    if (!isDbConnected()) {
      return res.status(503).json({ status: "error", message: "ডাটাবেস সংযোগ বিচ্ছিন্ন।" });
    }

    const priceRecord = await ProductPriceModel.findById(id);
    if (!priceRecord) {
      return res.status(404).json({ status: "error", message: "বাজার দর রেকর্ডটি পাওয়া যায়নি।" });
    }

    const previousStatus = priceRecord.status;
    priceRecord.status = status;
    await priceRecord.save();

    // Create Audit Log
    const auditLog = new ApprovalLogModel({
      actionType: status === "Approved" ? "APPROVE_PRICE" : "REJECT_PRICE",
      targetId: priceRecord._id.toString(),
      targetName: `${priceRecord.productName} (${priceRecord.upazila})`,
      performedBy: adminEmail || "sabjadulislamsun15@gmail.com",
      details: `${priceRecord.productName} (${priceRecord.upazila})-এর মূল্য ${status === "Approved" ? "অনুমোদন" : "বাতিল"} করা হয়েছে। পূর্ববর্তী অবস্থা: ${previousStatus}`,
      timestamp: new Date().toISOString()
    });
    await auditLog.save();

    return res.json({
      status: "success",
      message: `বাজার দর সফলভাবে ${status === "Approved" ? "অনুমোদন" : "বাতিল"} করা হয়েছে!`,
      data: priceRecord
    });
  } catch (err) {
    next(err);
  }
});

// Super Admin edits incorrect price data if necessary
app.put("/api/admin/prices/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { productName, price, unit, division, district, upazila, adminEmail } = req.body;

    if (!isDbConnected()) {
      return res.status(503).json({ status: "error", message: "ডাটাবেস সংযোগ বিচ্ছিন্ন।" });
    }

    const priceRecord = await ProductPriceModel.findById(id);
    if (!priceRecord) {
      return res.status(404).json({ status: "error", message: "বাজার দর রেকর্ড পাওয়া যায়নি।" });
    }

    const oldPrice = priceRecord.price;
    const oldProduct = priceRecord.productName;

    if (productName) priceRecord.productName = productName;
    if (price !== undefined) priceRecord.price = Number(price);
    if (unit) priceRecord.unit = unit;
    if (division) priceRecord.division = division;
    if (district) priceRecord.district = district;
    if (upazila) priceRecord.upazila = upazila;

    await priceRecord.save();

    // Create Audit Log
    const auditLog = new ApprovalLogModel({
      actionType: "EDIT_PRICE",
      targetId: priceRecord._id.toString(),
      targetName: `${priceRecord.productName} (${priceRecord.upazila})`,
      performedBy: adminEmail || "sabjadulislamsun15@gmail.com",
      details: `সুপার অ্যাডমিন দর রেকর্ড সংশোধন করেছেন। পূর্ববর্তী নাম: "${oldProduct}" দর: ${oldPrice} টাকা। পরিবর্তিত নাম: "${priceRecord.productName}" দর: ${priceRecord.price} টাকা।`,
      timestamp: new Date().toISOString()
    });
    await auditLog.save();

    return res.json({
      status: "success",
      message: "সুপার অ্যাডমিন সফলভাবে তথ্য সংশোধন করেছেন এবং সংশ্লিষ্ট পরিবর্তন সংরক্ষণ করা হয়েছে!",
      data: priceRecord
    });
  } catch (err) {
    next(err);
  }
});

// View all Approval Logs (Audit Trails)
app.get("/api/admin/audit-logs", async (req, res, next) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ status: "error", message: "ডাটাবেস সংযোগ বিচ্ছিন্ন।" });
    }
    const logs = await ApprovalLogModel.find({}).sort({ timestamp: -1 });
    return res.json({ status: "success", data: logs });
  } catch (err) {
    next(err);
  }
});

// ==========================================================
// 3.8. PUBLIC DATA & AREA PRICE QUERIES
// ==========================================================

// Get only Approved Prices for the general public (Supports filters by Division, District, Upazila, and Product)
app.get("/api/public/prices", async (req, res, next) => {
  try {
    if (!isDbConnected()) {
      // Return empty array gracefully if DB not connected
      return res.json({ status: "success", data: [] });
    }

    const { division, district, upazila, product } = req.query;
    const query: any = { status: "Approved" };

    if (division) query.division = division;
    if (district) query.district = district;
    if (upazila) query.upazila = upazila;
    if (product) query.productName = { $regex: product, $options: "i" };

    const approvedPrices = await ProductPriceModel.find(query).sort({ _id: -1 });
    return res.json({ status: "success", data: approvedPrices });
  } catch (err) {
    next(err);
  }
});

// Sync/Update Wallet Balance (persists to Mongo)
app.post("/api/auth/wallet/update", async (req, res, next) => {
  try {
    const { email, balance } = req.body;
    if (!email) {
      return res.status(400).json({ status: "error", message: "ইমেইল প্রদান করা আবশ্যক।" });
    }

    if (isDbConnected()) {
      const user = await UserModel.findOneAndUpdate(
        { email: email.toLowerCase() },
        { $set: { walletBalance: Number(balance) } },
        { new: true }
      );
      if (user) {
        return res.json({ status: "success", walletBalance: user.walletBalance });
      }
    }
    return res.json({ status: "success", walletBalance: Number(balance) });
  } catch (err) {
    next(err);
  }
});

// Fetch Advisory Chat History from Mongo
app.get("/api/advisory-chat/history", async (req, res, next) => {
  try {
    const email = (req.query.email as string) || "guest";
    if (isDbConnected()) {
      const history = await AdvisoryChatModel.find({ userEmail: email.toLowerCase() }).sort({ timestamp: 1 });
      return res.json({ status: "success", data: history });
    }
    res.json({ status: "success", data: [] });
  } catch (err) {
    next(err);
  }
});

// Clear Advisory Chat History (CRUD helper)
app.post("/api/advisory-chat/clear", async (req, res, next) => {
  try {
    const email = (req.body.email as string) || "guest";
    if (isDbConnected()) {
      await AdvisoryChatModel.deleteMany({ userEmail: email.toLowerCase() });
    }
    return res.json({ status: "success", message: "চ্যাট হিস্ট্রি সফলভাবে ডিলিট করা হয়েছে।" });
  } catch (err) {
    next(err);
  }
});

// Fetch Disease Diagnostic Pathology History
app.get("/api/disease-diagnose/history", async (req, res, next) => {
  try {
    const email = (req.query.email as string) || "guest";
    if (isDbConnected()) {
      const history = await DiseaseDiagnoseModel.find({ userEmail: email.toLowerCase() }).sort({ timestamp: -1 });
      return res.json({ status: "success", data: history });
    }
    res.json({ status: "success", data: [] });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------
// 4. CHAT ADVISORY API WITH REAL GEMINI / FALLBACK
// ----------------------------------------------------------
app.post("/api/advisory-chat", async (req, res, next) => {
  try {
    const { message, history, email } = req.body;
    const userEmail = (email || "guest").toLowerCase();

    if (!message) {
      return res.status(400).json({ status: "error", message: "কোনো বার্তা প্রদান করা হয়নি।" });
    }

    const ai = getGeminiClient();

    // If Gemini client isn't available, check high fidelity mocks
    if (!ai) {
      const textQuery = message.toLowerCase();
      const mockItem = advisorFallbacks.find(item => 
        item.keywords.some(keyword => textQuery.includes(keyword))
      );
      const mockReply = mockItem ? mockItem.answer : generalAdvisorFallback;
      
      if (isDbConnected()) {
        const chatMsg = new AdvisoryChatModel({
          id: `chat-${Date.now()}`,
          userEmail,
          message,
          response: mockReply,
          isMock: true,
          timestamp: new Date().toISOString()
        });
        await chatMsg.save();
      }

      await new Promise(resolve => setTimeout(resolve, 800));
      return res.json({ status: "success", response: mockReply, isMock: true });
    }

    try {
      const chatHistory = history ? history.map((item: any) => ({
        role: item.role === "user" ? "user" : "model",
        parts: [{ text: item.text }]
      })) : [];

      const instructions = "You are a highly experienced, friendly Bangladeshi agricultural advisor named 'কৃষক বন্ধু' (AI Agricultural Adviser). " +
        "Provide localized suggestions in the user's preferred language (either Bengali or English), including exact fertilizer/insecticide names and bio-friendly pest control methods. " +
        "You are fully capable of explaining and providing estimated/realistic crop rates and current weather suggestions for ANY of the 64 districts of Bangladesh, as well as their Upazilas, Unions, and Villages. " +
        "If a user asks about crop rates or weather in any specific Upazila, Union, or Village, provide realistic market estimations based on traditional seasonal price levels in Bangladesh and suggest dynamic farming tips. " +
        "Prioritize organic farming, soil-friendly solutions, and keep formatting beautiful with bold headers, bullet points, and numbered lists. Always match the language (English or Bengali) of the user's query.";

      const chat = ai.chats.create({
        model: "gemini-3.5-flash",
        config: {
          systemInstruction: instructions,
          temperature: 0.7
        },
        history: chatHistory
      });

      const response = await chat.sendMessage({ message: message });
      const responseText = response.text || "";

      if (isDbConnected()) {
        const chatMsg = new AdvisoryChatModel({
          id: `chat-${Date.now()}`,
          userEmail,
          message,
          response: responseText,
          isMock: false,
          timestamp: new Date().toISOString()
        });
        await chatMsg.save();
      }

      return res.json({ status: "success", response: responseText, isMock: false });
    } catch (error: any) {
      console.error("Gemini Chat Error:", error);
      const textQuery = message.toLowerCase();
      const mockItem = advisorFallbacks.find(item => 
        item.keywords.some(keyword => textQuery.includes(keyword))
      );
      const mockReply = mockItem ? mockItem.answer : generalAdvisorFallback;

      if (isDbConnected()) {
        const chatMsg = new AdvisoryChatModel({
          id: `chat-${Date.now()}`,
          userEmail,
          message,
          response: mockReply,
          isMock: true,
          timestamp: new Date().toISOString()
        });
        await chatMsg.save();
      }

      return res.json({ 
        status: "success", 
        response: mockReply,
        isMock: true,
        errorMsg: error.message
      });
    }
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------
// 5. PLANT CROP DISEASE ANALYZER WITH GEMINI / FALLBACK
// ----------------------------------------------------------
app.post("/api/disease-diagnose", async (req, res, next) => {
  try {
    const { image, cropType, email } = req.body;
    const userEmail = (email || "guest").toLowerCase();

    if (!image) {
      return res.status(400).json({ status: "error", message: "আক্রান্ত পাতার কোনো ছবি পাওয়া যায়নি।" });
    }

    let base64Data = image;
    let mimeType = "image/jpeg";
    
    if (image.startsWith("data:")) {
      const parts = image.split(",");
      const match = image.match(/data:([^;]+);/);
      if (match) mimeType = match[1];
      base64Data = parts[1];
    }

    const ai = getGeminiClient();

    if (!ai) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      let mockReply = "";
      if (cropType === "ধান") {
        mockReply = `🏆 **ধানের রোগ সমাধান (কৃষি সংযোগ এআই)**

১. **সনাক্তকৃত রোগ:** ধানের বাদামী দাগ রোগ (Brown Spot Disease)
২. **লক্ষণসমূহ:** পাতায় চোখে কাঁটার ন্যায় ছোট গোল ছাই রঙের লালচে বাদামী দাগ তৈরি হয়। কান্ড ও খোসা বাদামী বর্ণ ধারণ করে শুকিয়ে ঝরে পড়ে।
৩. **কারণ:** হেলমিনথোস্পোরিয়াম ওরিজি নামক ছত্রাকের উপদ্রব এবং মাটিতে নাইট্রোজেন ও পটাশ সারের অসঙ্গতি।
৪. **জৈব ও প্রাকৃতিক প্রতিকার:** জমিতে পর্যাপ্ত গোবর সার প্রয়োগ করুন। আক্রান্ত শিষ বা খড় পুড়িয়ে নষ্ট করে দিন।
৫. **রাসায়নিক সমাধান:** আক্রমণের শুরুতে কার্বেন্ডাজিম (উদা: নোইন) অথবা কার্বক্সিন + থিরাম (উদা: প্রভ্যাক্স ২০০ ডব্লিউপি) প্রতি লিটার পানিতে ২ গ্রাম হারে মিশিয়ে স্প্রে করুন।
৬. **প্রতিরোধমূলক টিপস:** সুস্থ বীজ বপন করুন। নাইট্রোজেন ও পটাশ সার ভারসাম্যপূর্ণ মাত্রায় দুই থেকে তিন বারে প্রয়োগ করুন।`;
      } else if (cropType === "আলু") {
        mockReply = `🏆 **আলুর রোগ সমাধান (কৃষি সংযোগ এআই)**

১. **সনাক্তকৃত রোগ:** আলুর আগাম ধসা রোগ (Early Blight of Potato)
২. **লক্ষণসমূহ:** নীচের পাতায় প্রথমে চক্রাকার গাঢ় বাদামী রঙের দাগ দেখা যায় যা পরে পুরো পাতায় ছড়িয়ে পাতা ঝলসিয়ে ফেলে।
৩. **কারণ:** অলটারনারিয়া সোলানি নামক তীব্র সংক্রমণকারী ছত্রাক এবং অসম সেচ কার্যক্রম।
৪. **জৈব ও প্রাকৃতিক প্রতিকার:** শস্য পর্যায় অনুসরণ করুন। জমিতে কাঠের ছাই ছিটানো এবং জৈব ট্রাইকোডার্মা কম্পোস্ট ব্যবহার প্রতিকারমূলক।
৫. **রাসায়নিক সমাধান:** ডায়াজিনন বা ম্যানকোজেব (উদা: ইন্ডোফিল এম-৪৫) প্রতি লিটার পানিতে ২.৫ গ্রাম হারে মিশিয়ে গাছ ভিজিয়ে স্প্রে করুন।
৬. **প্রতিরোধমূলক টিপস:** সময়মতো সেচ দিন। সুস্থ রোগমুক্ত প্রত্যয়িত বীজ ব্যবহার নিশ্চিত করুন।`;
      } else {
        mockReply = `🏆 **সবজি রোগ নির্ণয় ও সমাধান (কৃষি সংযোগ এআই)**

১. **সনাক্তকৃত রোগ:** পাতা কোঁকড়ানো ভাইরাস (Tomato Leaf Curl Virus - TLCV)
২. **লক্ষণসমূহ:** পাতার অগ্রভাগ কোঁকড়ে ছোট হয়ে যায়, শিরাগুলো হলুদ দেখায় এবং ফুল বা ফল উৎপাদন তীব্রভাবে বাধাগ্রস্ত হয়।
৩. **কারণ:** সাদা মাছি (Whitefly) দ্বারা বাহিত একপ্রকার ডেমিভাইরাস।
৪. **জৈব ও প্রাকৃতিক প্রতিকার:** সাবান গুঁড়া পানি স্প্রে করুন। নিমের তেল (৫ মিলি প্রতি লিটার পানির সাথে ১০ ফোটা লিকুইড সাবানসহ) ৩ দিন পর পর স্প্রে করুন বাহক পোকা দমনে।
৫. **রাসায়নিক সমাধান:** পোকা দমনে ইমিডাক্লোপ্রিড গ্রুপের ছত্রাকনাশক (টিডো ১ মিলি/লিটার) অথবা এসিটামিপ্রিড স্প্রে করুন।
৬. **প্রতিরোধমূলক টিপস:** মাকড়সা এবং সাদা মাছির আক্রমণ নিয়ন্ত্রণে হলুদ আঠালো ফাঁদ পুরো জমিতে স্থাপন করুন।`;
      }

      if (isDbConnected()) {
        const diagDoc = new DiseaseDiagnoseModel({
          id: `diag-${Date.now()}`,
          userEmail,
          cropType: cropType || "ধান",
          imageBytes: image,
          response: mockReply,
          isMock: true,
          timestamp: new Date().toISOString()
        });
        await diagDoc.save();
      }

      return res.json({
        status: "success",
        isMock: true,
        response: mockReply
      });
    }

    try {
      const textPart = {
        text: `You are an expert Plant Pathologist (উদ্ভিদ রোগ বিশেষজ্ঞ এআই বন্ধু). Diagnose this ${cropType || "crop"} plant disease based on the image. Present the output in Bengali with the following headers:
🏆 **কৃষি সংযোগ ফসল রোগ সমাধান**

১. **সনাক্তকৃত রোগ (Detected Disease Name):** Describe name in Bangla and scientific name in brackets.
২. **লক্ষণসমূহ (Symptoms):** Provide bullet points of key visual visual cues.
৩. **কারণ ও পরিবেশ (Causes & triggers):** What weather or factors triggered this.
৪. **প্রাকৃতিক ও জৈব প্রতিকার (Organic/Natural Remedies):** Friendly non-chemical solutions.
৫. **রাসায়নিক সমাধান (Chemical Remedies):** Practical chemical options if severity is high (e.g. precise composition or brand names available in Bangladesh).
৬. **প্রতিরোধমূলক পদক্ষেপ (Prevention Tips):** How to avoid this next season.

Maintain a polite, assuring, and highly localized Bangla tone for Bangladeshi farmers.`
      };

      const imagePart = {
        inlineData: {
          mimeType,
          data: base64Data
        }
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [imagePart, textPart] }
      });

      const responseText = response.text || "";

      if (isDbConnected()) {
        const diagDoc = new DiseaseDiagnoseModel({
          id: `diag-${Date.now()}`,
          userEmail,
          cropType: cropType || "ধান",
          imageBytes: image,
          response: responseText,
          isMock: false,
          timestamp: new Date().toISOString()
        });
        await diagDoc.save();
      }

      return res.json({ status: "success", response: responseText, isMock: false });
    } catch (error: any) {
      console.error("Gemini Diagnose Error:", error);
      res.status(500).json({ status: "error", message: "ছবি বিশ্লেষণে ত্রুটি ঘটেছে: " + error.message });
    }
  } catch (err) {
    next(err);
  }
});

app.post("/api/marketplace/:id/bid", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { buyerName, buyerPhone, bidAmount } = req.body;

    if(!buyerName || !buyerPhone || !bidAmount) {
      return res.status(400).json({ status: "error", message: "দয়া করে নাম, ফোন এবং বিডের মূল্য দিন।" });
    }

    const bidValue = Number(bidAmount);

    if (isDbConnected()) {
      const product = await ProductModel.findOne({ id });
      if (!product) {
        return res.status(404).json({ status: "error", message: "পণ্যটি পাওয়া যায়নি।" });
      }

      const highestBid = product.bids.reduce((max: number, b: any) => b.bidAmount > max ? b.bidAmount : max, product.basePrice);
      if (bidValue <= highestBid) {
        return res.status(400).json({ status: "error", message: `বিডের মূল্য সর্বোচ্চ বিডের (${highestBid} টা.) চেয়ে বেশি হতে হবে।` });
      }

      const newBid = {
        id: `bid-${Date.now()}`,
        buyerName,
        buyerPhone,
        bidAmount: bidValue,
        timestamp: new Date().toISOString()
      };

      product.bids.push(newBid);
      await product.save();
      return res.json({ status: "success", message: "আপনার বিড আহ্বান সফলভাবে জমা হয়েছে!", data: product });
    }

    const product = marketplaceProducts.find(p => p.id === id);
    if (!product) {
      return res.status(404).json({ status: "error", message: "পণ্যটি পাওয়া যায়নি।" });
    }

    const highestBid = product.bids.reduce((max, b) => b.bidAmount > max ? b.bidAmount : max, product.basePrice);
    if (bidValue <= highestBid) {
      return res.status(400).json({ status: "error", message: `বিডের মূল্য সর্বোচ্চ বিডের (${highestBid} টা.) চেয়ে বেশি হতে হবে।` });
    }

    const newBid: Bid = {
      id: `bid-${Date.now()}`,
      buyerName,
      buyerPhone,
      bidAmount: bidValue,
      timestamp: new Date().toISOString()
    };

    product.bids.push(newBid);
    res.json({ status: "success", message: "আপনার বিড আহ্বান সফলভাবে জমা হয়েছে!", data: product });
  } catch (err) {
    next(err);
  }
});

// Complete Purchase (Sold)
app.post("/api/marketplace/:id/buy", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isDbConnected()) {
      const product = await ProductModel.findOneAndUpdate({ id }, { $set: { status: "sold" } }, { new: true });
      if (!product) {
        return res.status(404).json({ status: "error", message: "পণ্যটি পাওয়া যায়নি।" });
      }
      return res.json({ status: "success", message: "ফসলটি বিক্রি সফলভাবে নিশ্চিত হয়েছে!", data: product });
    }

    const product = marketplaceProducts.find(p => p.id === id);
    if (!product) {
      return res.status(404).json({ status: "error", message: "পণ্যটি পাওয়া যায়নি।" });
    }

    product.status = "sold";
    res.json({ status: "success", message: "ফসলটি বিক্রি সফলভাবে নিশ্চিত হয়েছে!", data: product });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------
// 4. CHAT ADVISORY API WITH REAL GEMINI / FALLBACK
// ----------------------------------------------------------
app.post("/api/advisory-chat", async (req, res) => {
  const { message, history } = req.body;

  if (!message) {
    return res.status(400).json({ status: "error", message: "কোনো বার্তা প্রদান করা হয়নি।" });
  }

  const ai = getGeminiClient();

  // If Gemini client isn't available, check high fidelity mocks
  if (!ai) {
    const textQuery = message.toLowerCase();
    const mockItem = advisorFallbacks.find(item => 
      item.keywords.some(keyword => textQuery.includes(keyword))
    );
    const mockReply = mockItem ? mockItem.answer : generalAdvisorFallback;
    
    // Simulate slight loading latency for better UX
    await new Promise(resolve => setTimeout(resolve, 800));
    return res.json({ status: "success", response: mockReply, isMock: true });
  }

  try {
    const chatHistory = history ? history.map((item: any) => ({
      role: item.role === "user" ? "user" : "model",
      parts: [{ text: item.text }]
    })) : [];

    // Prompt context to drive agricultural consultant persona with localized weather & price capabilities
    const instructions = "You are a highly experienced, friendly Bangladeshi agricultural advisor named 'কৃষক বন্ধু' (AI Agricultural Adviser). " +
      "Provide localized suggestions in the user's preferred language (either Bengali or English), including exact fertilizer/insecticide names and bio-friendly pest control methods. " +
      "You are fully capable of explaining and providing estimated/realistic crop rates and current weather suggestions for ANY of the 64 districts of Bangladesh, as well as their Upazilas, Unions, and Villages. " +
      "If a user asks about crop rates or weather in any specific Upazila, Union, or Village, provide realistic market estimations based on traditional seasonal price levels in Bangladesh and suggest dynamic farming tips. " +
      "Prioritize organic farming, soil-friendly solutions, and keep formatting beautiful with bold headers, bullet points, and numbered lists. Always match the language (English or Bengali) of the user's query.";

    // Start direct chat session or generateContent with instructions
    const chat = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction: instructions,
        temperature: 0.7
      },
      history: chatHistory
    });

    const response = await chat.sendMessage({ message: message });
    return res.json({ status: "success", response: response.text, isMock: false });
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    // Fallback to mock on API fail
    const textQuery = message.toLowerCase();
    const mockItem = advisorFallbacks.find(item => 
      item.keywords.some(keyword => textQuery.includes(keyword))
    );
    return res.json({ 
      status: "success", 
      response: mockItem ? mockItem.answer : generalAdvisorFallback,
      isMock: true,
      errorMsg: error.message
    });
  }
});

// ----------------------------------------------------------
// 5. PLANT CROP DISEASE ANALYZER WITH GEMINI / FALLBACK
// ----------------------------------------------------------
app.post("/api/disease-diagnose", async (req, res) => {
  const { image, cropType } = req.body;

  if (!image) {
    return res.status(400).json({ status: "error", message: "আক্রান্ত পাতার কোনো ছবি পাওয়া যায়নি।" });
  }

  // Remove data URL prefix if present to obtain raw base64
  let base64Data = image;
  let mimeType = "image/jpeg";
  
  if (image.startsWith("data:")) {
    const parts = image.split(",");
    const match = image.match(/data:([^;]+);/);
    if (match) mimeType = match[1];
    base64Data = parts[1];
  }

  const ai = getGeminiClient();

  if (!ai) {
    // Generate a high fidelity mock diagnose based on chosen cropType
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (cropType === "ধান") {
      return res.json({
        status: "success",
        isMock: true,
        response: `🏆 **ধানের রোগ সমাধান (কৃষি সংযোগ এআই)**

১. **সনাক্তকৃত রোগ:** ধানের বাদামী দাগ রোগ (Brown Spot Disease)
২. **লক্ষণসমূহ:** পাতায় চোখে কাঁটার ন্যায় ছোট গোল ছাই রঙের লালচে বাদামী দাগ তৈরি হয়। কান্ড ও খোসা বাদামী বর্ণ ধারণ করে শুকিয়ে ঝরে পড়ে।
৩. **কারণ:** হেলমিনথোস্পোরিয়াম ওরিজি নামক ছত্রাকের উপদ্রব এবং মাটিতে নাইট্রোজেন ও পটাশ সারের অসঙ্গতি।
৪. **জৈব ও প্রাকৃতিক প্রতিকার:** জমিতে পর্যাপ্ত গোবর সার প্রয়োগ করুন। আক্রান্ত শিষ বা খড় পুড়িয়ে নষ্ট করে দিন।
৫. **রাসায়নিক সমাধান:** আক্রমণের শুরুতে কার্বেন্ডাজিম (উদা: নোইন) অথবা কার্বক্সিন + থিরাম (উদা: প্রভ্যাক্স ২০০ ডব্লিউপি) প্রতি লিটার পানিতে ২ গ্রাম হারে মিশিয়ে স্প্রে করুন।
৬. **প্রতিরোধমূলক টিপস:** সুস্থ বীজ বপন করুন। নাইট্রোজেন ও পটাশ সার ভারসাম্যপূর্ণ মাত্রায় দুই থেকে তিন বারে প্রয়োগ করুন।`
      });
    } else if (cropType === "আলু") {
      return res.json({
        status: "success",
        isMock: true,
        response: `🏆 **আলুর রোগ সমাধান (কৃষি সংযোগ এআই)**

১. **সনাক্তকৃত রোগ:** আলুর আগাম ধসা রোগ (Early Blight of Potato)
২. **লক্ষণসমূহ:** নীচের পাতায় প্রথমে চক্রাকার গাঢ় বাদামী রঙের দাগ দেখা যায় যা পরে পুরো পাতায় ছড়িয়ে পাতা ঝলসিয়ে ফেলে।
৩. **কারণ:** অলটারনারিয়া সোলানি নামক তীব্র সংক্রমণকারী ছত্রাক এবং অসম সেচ কার্যক্রম।
৪. **জৈব ও প্রাকৃতিক প্রতিকার:** শস্য পর্যায় অনুসরণ করুন। জমিতে কাঠের ছাই ছিটানো এবং জৈব ট্রাইকোডার্মা কম্পোস্ট ব্যবহার প্রতিকারমূলক।
৫. **রাসায়নিক সমাধান:** ডায়াজিনন বা ম্যানকোজেব (উদা: ইন্ডোফিল এম-৪৫) প্রতি লিটার পানিতে ২.৫ গ্রাম হারে মিশিয়ে গাছ ভিজিয়ে স্প্রে করুন।
৬. **প্রতিরোধমূলক টিপস:** সময়মতো সেচ দিন। সুস্থ রোগমুক্ত প্রত্যয়িত বীজ ব্যবহার নিশ্চিত করুন।`
      });
    } else {
      // Default tomato/generic crop disease response
      return res.json({
        status: "success",
        isMock: true,
        response: `🏆 **সবজি রোগ নির্ণয় ও সমাধান (কৃষি সংযোগ এআই)**

১. **সনাক্তকৃত রোগ:** পাতা কোঁকড়ানো ভাইরাস (Tomato Leaf Curl Virus - TLCV)
২. **লক্ষণসমূহ:** পাতার অগ্রভাগ কোঁকড়ে ছোট হয়ে যায়, শিরাগুলো হলুদ দেখায় এবং ফুল বা ফল উৎপাদন তীব্রভাবে বাধাগ্রস্ত হয়।
৩. **কারণ:** সাদা মাছি (Whitefly) দ্বারা বাহিত একপ্রকার ডেমিভাইরাস।
৪. **জৈব ও প্রাকৃতিক প্রতিকার:** সাবান গুঁড়া পানি স্প্রে করুন। নিমের তেল (৫ মিলি প্রতি লিটার পানির সাথে ১০ ফোটা লিকুইড সাবানসহ) ৩ দিন পর পর স্প্রে করুন বাহক পোকা দমনে।
৫. **রাসায়নিক সমাধান:** পোকা দমনে ইমিডাক্লোপ্রিড গ্রুপের ছত্রাকনাশক (টিডো ১ মিলি/লিটার) অথবা এসিটামিপ্রিড স্প্রে করুন।
৬. **প্রতিরোধমূলক টিপস:** মাকড়সা এবং সাদা মাছির আক্রমণ নিয়ন্ত্রণে হলুদ আঠালো ফাঁদ পুরো জমিতে স্থাপন করুন।`
      });
    }
  }

  try {
    const textPart = {
      text: `You are an expert Plant Pathologist (উদ্ভিদ রোগ বিশেষজ্ঞ এআই বন্ধু). Diagnose this ${cropType || "crop"} plant disease based on the image. Present the output in Bengali with the following headers:
🏆 **কৃষি সংযোগ ফসল রোগ সমাধান**

১. **সনাক্তকৃত রোগ (Detected Disease Name):** Describe name in Bangla and scientific name in brackets.
২. **লক্ষণসমূহ (Symptoms):** Provide bullet points of key visual visual cues.
৩. **কারণ ও পরিবেশ (Causes & triggers):** What weather or factors triggered this.
৪. **প্রাকৃতিক ও জৈব প্রতিকার (Organic/Natural Remedies):** Friendly non-chemical solutions.
৫. **রাসায়নিক সমাধান (Chemical Remedies):** Practical chemical options if severity is high (e.g. precise composition or brand names available in Bangladesh).
৬. **প্রতিরোধমূলক পদক্ষেপ (Prevention Tips):** How to avoid this next season.

Maintain a polite, assuring, and highly localized Bangla tone for Bangladeshi farmers.`
    };

    const imagePart = {
      inlineData: {
        mimeType,
        data: base64Data
      }
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] }
    });

    return res.json({ status: "success", response: response.text, isMock: false });
  } catch (error: any) {
    console.error("Gemini Diagnose Error:", error);
    res.status(500).json({ status: "error", message: "ছবি বিশ্লেষণে ত্রুটি ঘটেছে: " + error.message });
  }
});

// ==========================================================
// 6. HEALTH CHECK, GEMINI VERIFY & CENTRALIZED ERROR HANDLING
// ==========================================================

// Production Health Check Endpoint
app.get("/api/health", async (req, res) => {
  const dbStatus = isDbConnected() ? "connected" : "disconnected";
  const geminiStatus = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY" ? "available" : "unavailable";
  
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
    uptime: process.uptime(),
    database: dbStatus,
    gemini: geminiStatus,
    system: {
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    }
  });
});

// Gemini Connectivity Test Endpoint
app.get("/api/gemini/verify", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const hasKey = !!apiKey && apiKey !== "MY_GEMINI_API_KEY";
  
  if (!hasKey) {
    return res.status(400).json({
      status: "error",
      message: "Required Gemini API key is missing or carries placeholder value.",
      keyConfigured: false
    });
  }

  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(500).json({ status: "error", message: "Client initialization failed." });
    }

    const start = Date.now();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "API ping validation. Return 'verified' and a five-word cheering quote for Bangladeshi farmers."
    });
    
    return res.json({
      status: "success",
      message: "Gemini API verified successfully!",
      latencyMs: Date.now() - start,
      response: response.text?.trim()
    });
  } catch (error: any) {
    return res.status(500).json({
      status: "error",
      message: "Gemini API validation request failed.",
      error: error.message
    });
  }
});

// Centralized Error Handling Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("❌ Centralized Error Catch:", err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    status: "error",
    message: err.message || "An unexpected internal server error occurred.",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
});

// ==========================================================
// VITE DEV SERVER & PRODUCTION ASSETS HANDLING
// ==========================================================

// Seed initial values to Atlas if empty
async function seedDatabaseIfEmpty() {
  try {
    if (!isDbConnected()) return;

    // Seed AgroNews
    const newsCount = await AgroNewsModel.countDocuments();
    if (newsCount === 0) {
      console.log("🌱 Seeding initial Agro News to MongoDB Atlas...");
      await AgroNewsModel.insertMany(agroNewsList as any[]);
    }

    // Seed Products
    const productCount = await ProductModel.countDocuments();
    if (productCount === 0) {
      console.log("🌱 Seeding initial Marketplace Products to MongoDB Atlas...");
      await ProductModel.insertMany(marketplaceProducts as any[]);
    }

    // Seed Crop Prices
    const cropPriceCount = await CropPriceModel.countDocuments();
    if (cropPriceCount === 0) {
      console.log("🌱 Seeding initial Crop Prices to MongoDB Atlas...");
      await CropPriceModel.insertMany(cropPriceDatabase as any[]);
    }
    
    console.log("✅ MongoDB Database Checked and Seeded successfully!");
  } catch (err: any) {
    console.error("❌ Seeding database failed:", err.message);
  }
}

// Startup check to verify Gemini API key
async function verifyGeminiConnectionOnStartup() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.warn("⚠️ [Gemini AI Startup Check] GEMINI_API_KEY is not defined or is fallback. AI capabilities will be offline.");
    return false;
  }

  try {
    const ai = getGeminiClient();
    if (!ai) return false;

    console.log("📡 [Gemini AI Startup Check] Verifying connection to Google Gemini API...");
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "API validation ping. Reply with 'ok'."
    });
    
    if (response && response.text) {
      console.log("✅ [Gemini AI Startup Check] Gemini API connectivity verified! Response:", response.text.trim());
      return true;
    }
  } catch (error: any) {
    console.error("❌ [Gemini AI Startup Check] Gemini API Key validation failed on boot:", error.message);
  }
  return false;
}

async function startServer() {
  // Connect to MongoDB Atlas in the background to avoid blocking the server startup
  console.log("🔌 Initializing background connection sequences...");
  connectToDatabase()
    .then(async (dbResult) => {
      if (dbResult) {
        await seedDatabaseIfEmpty();
      }
    })
    .catch((err) => {
      console.error("❌ Background database connection/seeding failed:", err);
    });

  // Validate Gemini API Key on startup in the background
  verifyGeminiConnectionOnStartup().catch((err) => {
    console.error("❌ Background Gemini validation failed:", err);
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running in ${process.env.NODE_ENV || "development"} mode on http://localhost:${PORT}`);
  });
}

startServer();
