import React, { useState, useEffect, useRef } from "react";
import { 
  CloudSun, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  MessageSquare, 
  Image as ImageIcon, 
  MapPin, 
  Plus, 
  ArrowLeft,
  ArrowRight, 
  BadgeAlert, 
  Search, 
  HelpCircle, 
  Sparkles, 
  DollarSign, 
  Phone, 
  User, 
  AlertTriangle, 
  TrendingUp as TrendUpIcon, 
  Check, 
  X, 
  FileText, 
  ChevronRight, 
  Loader2,
  Wallet,
  Coins,
  BellRing
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Product, WeatherData, MarketPricePoint, ChatMessage, AgroNews } from "./types";
import WeatherWidget from "./components/WeatherWidget";

// Complete Bangladesh Geography Mapping (8 Divisions and all 64 Districts)
const bdGeography: Record<string, string[]> = {
  "ঢাকা": ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "নরসিংদী", "মুন্সীগঞ্জ", "মানিকগঞ্জ", "ফরিদপুর", "গোপালগঞ্জ", "মাদারীপুর", "শরীয়তপুর", "রাজবাড়ী", "টাঙ্গাইল", "কিশোরগঞ্জ"],
  "চট্টগ্রাম": ["চট্টগ্রাম", "কক্সবাজার", "নোয়াখালী", "ফেনী", "লক্ষ্মীপুর", "কুমিল্লা", "চাঁদপুর", "ব্রাহ্মণবাড়িয়া", "রাঙ্গামাটি", "বান্দরবান", "খাগড়াছড়ি"],
  "রাজশাহী": ["রাজশাহী", "বগুড়া", "নওগাঁ", "নাটোর", "চাঁপাইনবাবগঞ্জ", "পাবনা", "সিরাজগঞ্জ", "জয়পুরহাট"],
  "খুলনা": ["খুলনা", "যশোর", "ঝিনাইদহ", "মাগুরা", "কুষ্টিয়া", "চুয়াডাঙ্গা", "মেহেরপুর", "সাতক্ষীরা", "বাগেরহাট", "নড়াইল"],
  "বরিশাল": ["বরিশাল", "পটুয়াখালী", "ভোলা", "পিরোজপুর", "বরগুনা", "ঝালকাঠি"],
  "সিলেট": ["সিলেট", "মৌলভীবাজার", "হবিগঞ্জ", "সুনামগঞ্জ"],
  "রংপুর": ["রংপুর", "দিনাজপুর", "কুড়িগ্রাম", "লালমনিরহাট", "নীলফামারী", "গাইবান্ধা", "ঠাকুরগাঁও", "পঞ্চগড়"],
  "ময়মনসিংহ": ["ময়মনসিংহ", "শেরপুর", "জামালপুর", "নেত্রকোনা"]
};

// Preset disease leaves to let users easily test the AI diagnosis
const PRESET_DISEASES = [
  {
    id: "rice-brown",
    crop: "ধান",
    title: "ধানের বাদামী দাগ রোগ",
    desc: "পাতার মধ্যভাগে ছাই রঙের চোখের মতো দাগ",
    image: "https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&q=80&w=300"
  },
  {
    id: "potato-blight",
    crop: "আলু",
    title: "আলুর লেট ব্লাইট রোগ",
    desc: "কুয়াশায় পাতার নিচের পৃষ্ঠে সাদা ছত্রাক সংক্রমণ",
    image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=300"
  },
  {
    id: "tomato-curl",
    crop: "টমেটো",
    title: "টমেটোর পাতা কোঁকড়ানো রোগ",
    desc: "পাতা ঝোপালো ও বামন আকৃতি হয়ে যাওয়া",
    image: "https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&q=80&w=300"
  }
];

// Agro-news updates
const AGRO_NEWS = [
  { id: 1, text: "নতুন টিএসপি ও ইউরিয়া সার ক্রয়ে ২৫% সরকারি ভর্তুকির ঘোষণা।", date: "আজ" },
  { id: 2, text: "চলতি সপ্তাহে রাজশাহী বিভাগে খরার সতর্কবার্তা; আমের গাছে পরিমিত সেচ দিন।", date: "গতকাল" },
  { id: 3, text: "স্মার্ট কৃষি ঋণ মেলা উপলক্ষে ৪% সুলভ সুদে ঋণ বিতরণ শুরু।", date: "৩ দিন আগে" }
];

export default function App() {
  // Navigation active state for sub-sections / filtering
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [marketSearch, setMarketSearch] = useState<string>("");
  const [language, setLanguage] = useState<"bn" | "en">("bn");

  const t = (bnText: string, enText: string) => {
    return language === "bn" ? bnText : enText;
  };
  
  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [marketPrices, setMarketPrices] = useState<MarketPricePoint[]>([]);
  const [selectedCropPrice, setSelectedCropPrice] = useState<MarketPricePoint | null>(null);
  const [priceMarketFilter, setPriceMarketFilter] = useState<"KarwanBazar" | "Baneswar" | "Mohasthangarh" | "Jessore">("KarwanBazar");
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    setChatMessages([
      {
        id: "init",
        role: "model",
        text: language === "bn"
          ? "আসসালামু আলাইকুম। আমি **কৃষক বন্ধু AI**। আপনার ফসল চাষের যেকোনো রোগ বালাই নিয়ন্ত্রণ, আধুনিক সারের সঠিক হিসাব কিংবা বাজার সংযোগ সংক্রান্ত বিষয়ে সাহায্য করতে প্রস্তুত। আপনার প্রশ্নটি নিচে লিখুন!"
          : "Assalamu Alaikum. I am **Farmers' Companion AI**. I am ready to assist you on leaf disease control, fertilizer dosage calculator, or marketplace linkages. Ask me anything!",
        timestamp: new Date().toLocaleTimeString(language === "bn" ? "bn-BD" : "en-US", { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, [language]);

  const [chatInput, setChatInput] = useState<string>("");
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Disease Diagnose state
  const [selectedPresetImage, setSelectedPresetImage] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [diagnoseCropType, setDiagnoseCropType] = useState<string>("ধান");
  const [diagnoseResponse, setDiagnoseResponse] = useState<string>("");
  const [diagnoseLoading, setDiagnoseLoading] = useState<boolean>(false);
  
  // New crop list modal/form state
  const [isAddingCrop, setIsAddingCrop] = useState<boolean>(false);
  const [newCropForm, setNewCropForm] = useState({
    farmerName: "আব্দুল কুদ্দুস মিঞা",
    farmerPhone: "+৮৮০১৭১০০০০৯৯",
    cropName: "",
    category: "ধান" as "ধান" | "সবজি" | "ফল" | "ডাল ও তেলবীজ" | "মসলা",
    quantity: "",
    basePrice: "",
    unit: "কেজি" as "কেজি" | "মন" | "পিস",
    location: "বগুড়া (সদর)",
    division: "রাজশাহী",
    district: "বগুড়া",
    upazila: "",
    union: "",
    village: "",
    description: "",
    image: ""
  });

  // Advanced Area-wise Search Filters (covering Bangladesh's 64 districts, upazilas, unions, villages)
  const [isAdvancedLocationFilter, setIsAdvancedLocationFilter] = useState<boolean>(false);
  const [filterDivision, setFilterDivision] = useState<string>("all");
  const [filterDistrict, setFilterDistrict] = useState<string>("all");
  const [filterUpazila, setFilterUpazila] = useState<string>("");
  const [filterUnion, setFilterUnion] = useState<string>("");
  const [filterVillage, setFilterVillage] = useState<string>("");
  
  // Bid State
  const [selectedProductForBid, setSelectedProductForBid] = useState<Product | null>(null);
  const [bidForm, setBidForm] = useState({
    buyerName: "",
    buyerPhone: "",
    bidAmount: ""
  });
  const [bidError, setBidError] = useState<string>("");
  const [bidSuccess, setBidSuccess] = useState<string>("");

  // Simulated Digital Wallet Balance (increases on sold, decreases on buying/bidding)
  const [walletBalance, setWalletBalance] = useState<number>(14250);

  // Operator Mode & Admin Control State
  const [isOperatorOpen, setIsOperatorOpen] = useState<boolean>(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  const [adminEmail, setAdminEmail] = useState<string>("");
  const [adminPassword, setAdminPassword] = useState<string>("");
  const [adminError, setAdminError] = useState<string>("");
  const [adminSelectedCrop, setAdminSelectedCrop] = useState<MarketPricePoint | null>(null);
  
  const [adminKB, setAdminKB] = useState<number[]>([]);
  const [adminBS, setAdminBS] = useState<number[]>([]);
  const [adminMH, setAdminMH] = useState<number[]>([]);
  const [adminJS, setAdminJS] = useState<number[]>([]);
  
  const [todayKB, setTodayKB] = useState<string>("");
  const [todayBS, setTodayBS] = useState<string>("");
  const [todayMH, setTodayMH] = useState<string>("");
  const [todayJS, setTodayJS] = useState<string>("");

  const [adminNewCropName, setAdminNewCropName] = useState<string>("");
  const [adminNewCropBasePrice, setAdminNewCropBasePrice] = useState<string>("");
  const [operatorTab, setOperatorTab] = useState<"prices" | "marketplace" | "news">("prices");

  const [newsList, setNewsList] = useState<AgroNews[]>([]);
  const [newNewsTextBn, setNewNewsTextBn] = useState<string>("");
  const [newNewsTextEn, setNewNewsTextEn] = useState<string>("");
  const [newNewsDateBn, setNewNewsDateBn] = useState<string>("আজ");
  const [newNewsDateEn, setNewNewsDateEn] = useState<string>("Today");
  const [newsSubmitLoading, setNewsSubmitLoading] = useState<boolean>(false);

  // --- New RBAC / Protinidhi Dashboard States ---
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Registration and Authentication inputs
  const [isRegisteringRep, setIsRegisteringRep] = useState<boolean>(false);
  const [repRegForm, setRepRegForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    division: "ঢাকা",
    district: "ঢাকা",
    upazila: "",
    unionOrVillage: "",
    tradeLicensePic: ""
  });
  const [authError, setAuthError] = useState<string>("");
  const [authSuccess, setAuthSuccess] = useState<string>("");
  const [loginEmail, setLoginEmail] = useState<string>("");
  const [loginPassword, setLoginPassword] = useState<string>("");

  // Representative Price Submission States
  const [repNewPriceForm, setRepNewPriceForm] = useState({
    productName: "বোরো ধান",
    price: "",
    unit: "মন",
    division: "ঢাকা",
    district: "ঢাকা",
    upazila: "",
  });
  const [repPrices, setRepPrices] = useState<any[]>([]); // current rep's submitted prices
  const [repSuccessMsg, setRepSuccessMsg] = useState<string>("");
  const [repErrorMsg, setRepErrorMsg] = useState<string>("");

  // Editing direct price row (Used by both representative & admin)
  const [editingPriceObj, setEditingPriceObj] = useState<any>(null);
  const [editPriceForm, setEditPriceForm] = useState({
    productName: "",
    price: "",
    unit: "মন",
    division: "ঢাকা",
    district: "ঢাকা",
    upazila: "",
  });

  // Super Admin view databases
  const [adminReps, setAdminReps] = useState<any[]>([]);
  const [adminPriceSubmissions, setAdminPriceSubmissions] = useState<any[]>([]);
  const [adminAuditLogs, setAdminAuditLogs] = useState<any[]>([]);
  const [adminSelectedTab, setAdminSelectedTab] = useState<"reps" | "prices" | "logs">("reps");

  // Public approved prices
  const [publicApprovedPrices, setPublicApprovedPrices] = useState<any[]>([]);
  const [priceViewTab, setPriceViewTab] = useState<"wholesale" | "representative">("wholesale");

  // Public price filter inputs
  const [pubFilterDiv, setPubFilterDiv] = useState<string>("all");
  const [pubFilterDist, setPubFilterDist] = useState<string>("all");
  const [pubFilterUpazila, setPubFilterUpazila] = useState<string>("");
  const [pubFilterProduct, setPubFilterProduct] = useState<string>("");

  const loadPublicApprovedPrices = () => {
    let url = "/api/public/prices?";
    if (pubFilterDiv !== "all") url += `division=${encodeURIComponent(pubFilterDiv)}&`;
    if (pubFilterDist !== "all") url += `district=${encodeURIComponent(pubFilterDist)}&`;
    if (pubFilterUpazila) url += `upazila=${encodeURIComponent(pubFilterUpazila)}&`;
    if (pubFilterProduct) url += `product=${encodeURIComponent(pubFilterProduct)}&`;

    fetch(url)
      .then(res => res.json())
      .then(res => {
        if (res.status === "success") {
          setPublicApprovedPrices(res.data);
        }
      })
      .catch(err => console.error("Error loading public approved prices:", err));
  };

  const loadAdminData = () => {
    fetch("/api/admin/representatives")
      .then(res => res.json())
      .then(res => { if (res.status === "success") setAdminReps(res.data); })
      .catch(err => console.error(err));

    fetch("/api/admin/prices")
      .then(res => res.json())
      .then(res => { if (res.status === "success") setAdminPriceSubmissions(res.data); })
      .catch(err => console.error(err));

    fetch("/api/admin/audit-logs")
      .then(res => res.json())
      .then(res => { if (res.status === "success") setAdminAuditLogs(res.data); })
      .catch(err => console.error(err));
  };

  const loadRepData = (email: string) => {
    fetch(`/api/representative/prices/${encodeURIComponent(email)}`)
      .then(res => res.json())
      .then(res => {
        if (res.status === "success") {
          setRepPrices(res.data);
        }
      })
      .catch(err => console.error(err));
  };

  const handleRepPriceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRepSuccessMsg("");
    setRepErrorMsg("");
    if (!currentUser) return;

    try {
      const res = await fetch("/api/representative/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...repNewPriceForm,
          representativeId: currentUser.email,
          representativeName: currentUser.name
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        setRepSuccessMsg(data.message);
        loadRepData(currentUser.email);
        setRepNewPriceForm(prev => ({ ...prev, price: "" }));
      } else {
        setRepErrorMsg(data.message);
      }
    } catch (err) {
      setRepErrorMsg("তথ্য সংরক্ষণে ত্রুটি দেখা দিয়েছে।");
    }
  };

  const handleRepPriceEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPriceObj) return;

    try {
      const res = await fetch(`/api/representative/prices/${editingPriceObj._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editPriceForm)
      });
      const data = await res.json();
      if (data.status === "success") {
        setRepSuccessMsg(data.message);
        setEditingPriceObj(null);
        if (currentUser) loadRepData(currentUser.email);
      } else {
        setRepErrorMsg(data.message);
      }
    } catch (err) {
      setRepErrorMsg("তথ্য সংশোধনে কোনো ত্রুটি হয়েছে।");
    }
  };

  const handleRepApproval = async (id: string, status: "Approved" | "Rejected") => {
    try {
      const res = await fetch(`/api/admin/representatives/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminEmail: currentUser?.email })
      });
      const data = await res.json();
      if (data.status === "success") {
        loadAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePriceApproval = async (id: string, status: "Approved" | "Rejected") => {
    try {
      const res = await fetch(`/api/admin/prices/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminEmail: currentUser?.email })
      });
      const data = await res.json();
      if (data.status === "success") {
        loadAdminData();
        loadPublicApprovedPrices();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdminPriceEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPriceObj) return;

    try {
      const res = await fetch(`/api/admin/prices/${editingPriceObj._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editPriceForm,
          adminEmail: currentUser?.email
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        setEditingPriceObj(null);
        loadAdminData();
        loadPublicApprovedPrices();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdminLoggedIn(false);
    setAuthSuccess("");
    setAuthError("");
    setLoginEmail("");
    setLoginPassword("");
  };

  // Trigger loads on mount & filter switches
  useEffect(() => {
    loadMarketplace();
    loadPrices();
    loadNews();
    loadPublicApprovedPrices();
  }, [pubFilterDiv, pubFilterDist, pubFilterUpazila, pubFilterProduct]);

  // Sync admin states when selected crop changes
  useEffect(() => {
    if (adminSelectedCrop) {
      setAdminKB(adminSelectedCrop.KarwanBazar || []);
      setAdminBS(adminSelectedCrop.Baneswar || []);
      setAdminMH(adminSelectedCrop.Mohasthangarh || []);
      setAdminJS(adminSelectedCrop.Jessore || []);
      
      setTodayKB("");
      setTodayBS("");
      setTodayMH("");
      setTodayJS("");
    }
  }, [adminSelectedCrop]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const loadNews = () => {
    fetch("/api/agro-news")
      .then(res => res.json())
      .then(res => {
        if (res.status === "success") {
          setNewsList(res.data);
        }
      })
      .catch(err => console.error("Error loaded agro-news:", err));
  };

  const handleAddNews = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNewsTextBn.trim() || !newNewsTextEn.trim()) return;

    setNewsSubmitLoading(true);
    fetch("/api/agro-news/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        textBn: newNewsTextBn.trim(),
        textEn: newNewsTextEn.trim(),
        dateBn: newNewsDateBn.trim(),
        dateEn: newNewsDateEn.trim()
      })
    })
      .then(res => res.json())
      .then(res => {
        setNewsSubmitLoading(false);
        if (res.status === "success") {
          loadNews();
          setNewNewsTextBn("");
          setNewNewsTextEn("");
          setNewNewsDateBn("আজ");
          setNewNewsDateEn("Today");
          alert(language === "bn" ? "ডেইলি নিউজ সফলভাবে আপডেট ও প্রচার করা হয়েছে!" : "Daily news update successfully broadcasted!");
        } else {
          alert(res.message);
        }
      })
      .catch(err => {
        setNewsSubmitLoading(false);
        console.error("Error broadcast news:", err);
      });
  };

  const handleDeleteNews = (newsId: number) => {
    if (!window.confirm(language === "bn" ? "আপনি কি নিশ্চিতভাবে এই নিউজটি ডিলিট করতে চান?" : "Are you sure you want to delete this news?")) return;

    fetch(`/api/agro-news/delete/${newsId}`, {
      method: "POST"
    })
      .then(res => res.json())
      .then(res => {
        if (res.status === "success") {
          loadNews();
        } else {
          alert(res.message);
        }
      })
      .catch(err => console.error("Error deleting news:", err));
  };

  const loadMarketplace = () => {
    fetch("/api/marketplace")
      .then(res => res.json())
      .then(res => {
        if (res.status === "success") {
          setProducts(res.data);
        }
      })
      .catch(err => console.error("Error fetching marketplace:", err));
  };

  const loadPrices = () => {
    fetch("/api/market-prices")
      .then(res => res.json())
      .then(res => {
        if (res.status === "success") {
          setMarketPrices(res.data);
          // Set standard Miniqit rice as default chosen price analytic
          if (res.data.length > 0) {
            setSelectedCropPrice(prev => {
              if (prev) {
                const refreshed = res.data.find((c: any) => c.name === prev.name);
                return refreshed || res.data[0];
              }
              return res.data[0];
            });

            setAdminSelectedCrop(prev => {
              if (prev) {
                const refreshed = res.data.find((c: any) => c.name === prev.name);
                return refreshed || res.data[0];
              }
              return res.data[0];
            });
          }
        }
      })
      .catch(err => console.error("Error loaded market prices:", err));
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    if (isRegisteringRep) {
      if (!repRegForm.tradeLicensePic) {
        setAuthError("অনুগ্রহ করে আপনার ব্যবসায়ের ট্রেড লাইসেন্সের ছবি আপলোড করুন (ট্রেড লাইসেন্স ইমেজ আপলোড করা ব্রাউজারে বাধ্যতামূলক)।");
        return;
      }
      try {
        const res = await fetch("/api/auth/representative/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(repRegForm)
        });
        const data = await res.json();
        if (data.status === "success") {
          setAuthSuccess(data.message);
          setIsRegisteringRep(false);
        } else {
          setAuthError(data.message);
        }
      } catch (err) {
        setAuthError("রেজিস্ট্রেশন করতে ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
      }
    } else {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: loginEmail, password: loginPassword })
        });
        const data = await res.json();
        if (data.status === "success") {
          setCurrentUser(data.user);
          setAuthSuccess(data.message);
          
          if (data.user.role === "admin") {
            setIsAdminLoggedIn(true);
            loadAdminData();
          } else if (data.user.role === "protinidhi") {
            loadRepData(data.user.email);
          }
        } else {
          setAuthError(data.message);
        }
      } catch (err) {
        setAuthError("লগইন ব্যর্থ হয়েছে। ক্রেডেনশিয়াল পরীক্ষা করুন।");
      }
    }
  };

  const handleUpdatePrices = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSelectedCrop) return;

    let finalKB = [...adminKB];
    if (todayKB.trim()) { finalKB = [...finalKB.slice(1), Number(todayKB)]; }

    let finalBS = [...adminBS];
    if (todayBS.trim()) { finalBS = [...finalBS.slice(1), Number(todayBS)]; }

    let finalMH = [...adminMH];
    if (todayMH.trim()) { finalMH = [...finalMH.slice(1), Number(todayMH)]; }

    let finalJS = [...adminJS];
    if (todayJS.trim()) { finalJS = [...finalJS.slice(1), Number(todayJS)]; }

    fetch("/api/market-prices/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: adminSelectedCrop.name,
        KarwanBazar: finalKB,
        Baneswar: finalBS,
        Mohasthangarh: finalMH,
        Jessore: finalJS
      })
    })
      .then(res => res.json())
      .then(res => {
        if (res.status === "success") {
          alert(language === "bn" ? "বাজার দর সফলভাবে পরিবর্তন বা আপডেট করা হয়েছে!" : "Wholesale market indices updated successfully!");
          loadPrices();
        } else {
          alert(language === "bn" ? "ত্রুটি: " + res.message : "Error: " + (res.message || "process failed"));
        }
      })
      .catch(err => {
        console.error(err);
        alert(language === "bn" ? "নেটওয়ার্ক সংযোগ ব্যর্থ হয়েছে।" : "Network connection failed.");
      });
  };

  const handleAddCropPrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminNewCropName.trim() || !adminNewCropBasePrice.trim()) {
      alert(language === "bn" ? "দয়া করে শস্যের বৈজ্ঞানিক/বাংলা নাম এবং ভিত্তি মূল্য প্রদান করুন।" : "Please specify the commodity name and base price.");
      return;
    }

    fetch("/api/market-prices/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: adminNewCropName.trim(),
        initialPrice: Number(adminNewCropBasePrice)
      })
    })
      .then(res => res.json())
      .then(res => {
        if (res.status === "success") {
          alert(language === "bn" ? `নতুন '${adminNewCropName}' শস্যের বাজার প্রোফাইল সফলভাবে তৈরি হয়েছে!` : `New marketplace profile for '${translateText(adminNewCropName)}' registered successfully!`);
          setAdminNewCropName("");
          setAdminNewCropBasePrice("");
          loadPrices();
        } else {
          alert(language === "bn" ? "ত্রুটি: " + res.message : "Error: " + (res.message || "process failed"));
        }
      })
      .catch(err => {
        console.error(err);
        alert(language === "bn" ? "সংযোগ ব্যর্থ হয়েছে।" : "Connection failed.");
      });
  };

  const handleDeleteProduct = (productId: string) => {
    if (confirm(language === "bn" ? "আপনি কি নিশ্চিতভাবে এই ফসল লিস্টিংটি ডিলিট করতে চান?" : "Are you sure you want to delete this crop listing?")) {
      fetch(`/api/marketplace/${productId}/delete`, {
        method: "POST"
      })
        .then(res => res.json())
        .then(res => {
          if (res.status === "success") {
            alert(language === "bn" ? "ফসল তালিকা ডিলিট করা হয়েছে।" : "Crop listing deleted successfully.");
            loadMarketplace();
          } else {
            alert(language === "bn" ? "ডিলিট করা যায়নি: " + res.message : "Deletion failed: " + (res.message || "unknown failure"));
          }
        })
        .catch(err => console.error(err));
    }
  };

  // Run AI disease diagnostic
  const handleDiagnose = async (imageSrc: string) => {
    setDiagnoseLoading(true);
    setDiagnoseResponse("");
    try {
      const res = await fetch("/api/disease-diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageSrc,
          cropType: diagnoseCropType
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        setDiagnoseResponse(data.response);
      } else {
        setDiagnoseResponse(language === "bn" ? "দুঃখিত, ছবি বিশ্লেষণ করতে সমস্যা সৃষ্টি হয়েছে। পুনরায় ভালো ছবি দিয়ে চেষ্টা করুন।" : "Sorry, leaf image analysis failed. Please retry with a clearer photo.");
      }
    } catch (error) {
      console.error(error);
      setDiagnoseResponse(language === "bn" ? "সার্ভারে সংযোগ দেওয়া সম্ভব হল না। পরে আবার চেষ্টা করুন।" : "Could not connect to generator server. Please try again later.");
    } finally {
      setDiagnoseLoading(false);
    }
  };

  // Convert uploaded file to base64
  const handleImageUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setUploadedImage(base64);
        setSelectedPresetImage(null);
        handleDiagnose(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePresetSelect = (preset: typeof PRESET_DISEASES[0]) => {
    setSelectedPresetImage(preset.image);
    setUploadedImage(null);
    setDiagnoseCropType(preset.crop);
    handleDiagnose(preset.image);
  };

  // Send message to AI advisory
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      text: chatInput,
      timestamp: new Date().toLocaleTimeString("bn-BD", { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/advisory-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.text,
          history: chatMessages.slice(-8) // Send recent message chain
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        setChatMessages(prev => [...prev, {
          id: `ai-${Date.now()}`,
          role: "model",
          text: data.response,
          timestamp: new Date().toLocaleTimeString(language === "bn" ? "bn-BD" : "en-US", { hour: '2-digit', minute: '2-digit' })
        }]);
      } else {
        setChatMessages(prev => [...prev, {
          id: `ai-err-${Date.now()}`,
          role: "model",
          text: language === "bn" ? "দুঃখিত, এই মুহূর্তে আমি উত্তর দিতে পারছি না। অনুগ্রহ করে কিছুক্ষণ পর আবার জিজ্ঞেস করুন।" : "Sorry, I cannot answer right now. Please try again shortly.",
          timestamp: new Date().toLocaleTimeString(language === "bn" ? "bn-BD" : "en-US", { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, {
        id: `ai-err-${Date.now()}`,
        role: "model",
        text: language === "bn" ? "সংযোগ ত্রুটি ঘটেছে। আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।" : "Connection error occurred. Please test your network connectivity.",
        timestamp: new Date().toLocaleTimeString(language === "bn" ? "bn-BD" : "en-US", { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Submit Bid for Product
  const submitBid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForBid) return;
    setBidError("");
    setBidSuccess("");

    const bidVal = Number(bidForm.bidAmount);
    if (!bidForm.buyerName || !bidForm.buyerPhone || !bidForm.bidAmount) {
      setBidError(language === "bn" ? "দয়া করে সকল তথ্য পূরণ করুন।" : "Please complete all fields.");
      return;
    }

    const currentHighest = selectedProductForBid.bids.reduce((max, b) => b.bidAmount > max ? b.bidAmount : max, selectedProductForBid.basePrice);
    if (bidVal <= currentHighest) {
      setBidError(language === "bn" ? `আপনার বিড ${currentHighest} টাকার ঊর্ধ্বে হতে হবে।` : `Your bid must exceed ৳${currentHighest}.`);
      return;
    }

    fetch(`/api/marketplace/${selectedProductForBid.id}/bid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerName: bidForm.buyerName,
        buyerPhone: bidForm.buyerPhone,
        bidAmount: bidVal
      })
    })
      .then(res => res.json())
      .then(res => {
        if (res.status === "success") {
          setBidSuccess(language === "bn" ? "আপনার বিড আহ্বান সফল হয়েছে!" : "Your bid has been submitted successfully!");
          // Slightly reduce wallet for security deposits to look high fidelity
          setWalletBalance(prev => prev - 100); 
          loadMarketplace();
          // Update selected item structure to show updated bid list
          setSelectedProductForBid(res.data);
          //Reset bidding values
          setBidForm(p => ({ ...p, bidAmount: "" }));
        } else {
          setBidError(res.message ? (language === "bn" ? res.message : "The bid amount was not accepted.") : (language === "bn" ? "বিড সফল হয়নি।" : "Bid request failed."));
        }
      })
      .catch(err => {
        console.error(err);
        setBidError(language === "bn" ? "বিড অনুরোধ পাঠাতে ত্রুটি হয়েছে।" : "Error transmitting bid request.");
      });
  };

  // Buy instant / Set as sold
  const buyProductInstant = (product: Product) => {
    const confirmMsg = language === "bn"
      ? `আপনি কি কৃষক '${product.farmerName}' এর কাছ থেকে '${product.cropName}' সংগ্রহ করার চুক্তিটি পাকা করতে চান?`
      : `Are you sure you want to finalize the agreement to purchase '${translateText(product.cropName)}' from farmer '${translateText(product.farmerName)}'?`;
    if (confirm(confirmMsg)) {
      fetch(`/api/marketplace/${product.id}/buy`, {
        method: "POST"
      })
        .then(res => res.json())
        .then(res => {
          if (res.status === "success") {
            const alertMsg = language === "bn"
              ? `অভিনন্দন! ডিলটি চুড়ান্ত করা হয়েছে। কৃষকের সাথে সরাসরি যোগাযোগের নম্বর: ${product.farmerPhone}`
              : `Congratulations! The deal has been finalized. Direct contact number for the farmer: ${product.farmerPhone}`;
            alert(alertMsg);
            setWalletBalance(prev => Math.max(0, prev - (product.basePrice * Number(product.quantity || 1))));
            loadMarketplace();
            if (selectedProductForBid?.id === product.id) {
              setSelectedProductForBid(null);
            }
          }
        })
        .catch(err => console.error(err));
    }
  };

  // Create new crop listing
  const handlePublishCrop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCropForm.cropName || !newCropForm.basePrice || !newCropForm.quantity) {
      alert(language === "bn" ? "দয়া করে প্রয়োজনীয় সকল তথ্য পূরণ করুন।" : "Please fill out all mandatory fields.");
      return;
    }

    // Compile division, district, upazila, union, and village together
    const finalLocation = `${newCropForm.division} বিভাগ, ${newCropForm.district} জেলা${
      newCropForm.upazila ? `, ${newCropForm.upazila} উপজেলা` : ""
    }${newCropForm.union ? `, ${newCropForm.union} ইউনিয়ন` : ""}${
      newCropForm.village ? `, ${newCropForm.village} গ্রাম` : ""
    }`;

    const payload = {
      ...newCropForm,
      location: finalLocation
    };

    fetch("/api/marketplace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(res => {
        if (res.status === "success") {
          alert(language === "bn" 
            ? "সাফল্যের সাথে আপনার উৎপাদিত ফসলের বিক্রয় তালিকা পোস্ট করা হয়েছে। আড়তদার ও পাইকাররা সরাসরি বিড করতে পারবেন!" 
            : "Harvest listing published successfully! Wholesalers and aggregators can now place live bids on your crop!");
          setIsAddingCrop(false);
          // Reward farmer wallet for using platform listing service (mock promotion)
          setWalletBalance(prev => prev + 500); 
          setNewCropForm({
            farmerName: "আব্দুল কুদ্দুস মিঞা",
            farmerPhone: "+৮৮০১৭১০০০০৯৯",
            cropName: "",
            category: "ধান",
            quantity: "",
            basePrice: "",
            unit: "কেজি",
            location: "বগুড়া (সদর)",
            division: "রাজশাহী",
            district: "বগুড়া",
            upazila: "",
            union: "",
            village: "",
            description: "",
            image: ""
          });
          loadMarketplace();
        } else {
          alert(language === "bn" ? "তালিকা তৈরি করা সম্ভব হয়নি: " + res.message : "Could not create listing: " + (res.message || "Unknown error"));
        }
      })
      .catch(err => console.error(err));
  };

  // Convert crop category icons
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "ধান": return "🌾";
      case "সবজি": return "🥕";
      case "ফল": return "🥭";
      case "ডাল ও তেলবীজ": return "🫘";
      case "মসলা": return "🧅";
      default: return "🥗";
    }
  };

  // Helpers to render markdown tags simply
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    return text.split("\n").map((line, idx) => {
      // Bold checking
      let content: React.ReactNode = line;
      if (line.startsWith("🏆") || line.startsWith("🌾") || line.startsWith("🥔") || line.startsWith("🍅") || line.startsWith("🌱")) {
        return <h4 key={idx} className="text-emerald-300 font-bold text-lg mt-3 mb-1">{line}</h4>;
      }
      if (line.match(/^\d+\.\s+\*\*(.+?)\*\*(.*)/)) {
        const parts = line.match(/^\d+\.\s+\*\*(.+?)\*\*(.*)/);
        if (parts) {
          return (
            <p key={idx} className="text-slate-200 text-sm leading-relaxed mb-1.5 ml-4">
              <span className="text-yellow-400 font-bold">{parts[1]}</span>
              <span>{parts[2]}</span>
            </p>
          );
        }
      }
      
      const boldRegex = /\*\*(.*?)\*\*/g;
      if (line.match(boldRegex)) {
        const pieces = line.split(boldRegex);
        content = pieces.map((pc, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="text-yellow-400 font-semibold">{pc}</strong> : pc);
      }
      return <p key={idx} className="text-slate-100 text-sm leading-relaxed mb-1">{content}</p>;
    });
  };

  const translateText = (text: string) => {
    if (language === "bn" || !text) return text;
    const dictionary: Record<string, string> = {
      // Categories
      "ধান": "Paddy / Rice",
      "সবজি": "Vegetables",
      "ফল": "Fruits",
      "ডাল ও তেলবীজ": "Pulses & Oilseeds",
      "মসলা": "Spices",

      // Products / Commodities
      "মিনিকিট ধান (নতুন)": "Minikit Paddy (New)",
      "গোল আলু (ডায়মন্ড জাত)": "Round Potato (Diamond Variety)",
      "রাজশাহী ল্যাংড়া আম": "Rajshahi Langra Mango",
      "দেশী লাল টমেটো": "Local Red Tomato",
      "নাটোরের লাল মসুর ডাল": "Natore Red Lentils",
      "মিনিকিট ধান (টাকা/মন)": "Minikit Paddy (Tk/Maund)",
      "ডায়মন্ড আলু (টাকা/কেজি)": "Diamond Potato (Tk/kg)",
      "দেশী পেঁয়াজ (টাকা/কেজি)": "Local Onion (Tk/kg)",
      "লাল টমেটো (টাকা/কেজি)": "Red Tomato (Tk/kg)",
      "দেশী পেঁয়াজ": "Local Onion",
      "আলু (দেশি)": "Local Potato",
      "কাঁচা মরিচ": "Green Chili",
      "মোটা চাল": "Coarse Rice",
      "পেঁয়াজ (দেশি)": "Local Onion",
      "সুরমা ডাল": "Surma Pulses",
      "আদা (দেশি)": "Local Ginger",
      "টমেটো": "Tomato",
      "মিষ্টি কুমড়া": "Sweet Pumpkin",
      "রসুন": "Local Garlic",
      "সরিষা": "Mustard Seed",
      "মুগ ডাল": "Mug Dal",
      "মসুর ডাল": "Lentils",
      "গম": "Wheat",
      "ভুট্টা": "Maize",

      // Farmer Profiles
      "முhammad আব্দুর রহমান": "Muhammad Abdur Rahman",
      "মুহাম্মদ আব্দুর রহমান": "Muhammad Abdur Rahman",
      "নজরুল ইসলাম": "Nazrul Islam",
      "कृषक আমজাদ হোসেন": "Farmer Amjad Hossain",
      "কৃষক আমজাদ হোসেন": "Farmer Amjad Hossain",
      "সুফিয়া বেগম": "Sufia Begum",
      "মিজানুর শেখ": "Mijanur Shekh",
      "আব্দুল কুদ্দুস মিঞা": "Abdul Kuddus Miah",

      // Regions
      "নওগাঁ (সদর)": "Naogaon (Sadar)",
      "মুন্সীগঞ্জ (গজারিয়া)": "Munshiganj (Gazaria)",
      "রাজশাহী (বাঘা)": "Rajshahi (Bagha)",
      "যশোর (সদর)": "Jessore (Sadar)",
      "নাটোর (লালপুর)": "Natore (Lalpur)",
      "বগুড়া (সদর)": "Bogra (Sadar)",
      "বগুড়া": "Bogra",
      "রাজশাহী": "Rajshahi",
      "ঢাকা": "Dhaka",
      "চট্টগ্রাম": "Chittagong",
      "খুলনা": "Khulna",
      "বরিশাল": "Barisal",
      "সিলেট": "Sylhet",
      "রংপুর": "Rangpur",
      "ময়মনসিংহ": "Mymensingh",
      "নওগাঁ": "Naogaon",
      "মুন্সীগঞ্জ": "Munshiganj",
      "যশোর": "Jessore",
      "নাটোর": "Natore",
      "রাজশাহী বিভাগ": "Rajshahi Division",
      "ঢাকা বিভাগ": "Dhaka Division",
      "খুলনা বিভাগ": "Khulna Division",
      "বরিশাল বিভাগ": "Barisal Division",
      "সিলেট বিভাগ": "Sylhet Division",
      "রংপুর বিভাগ": "Rangpur Division",
      "ময়মনসিংহ বিভাগ": "Mymensingh Division",
      "চট্টগ্রাম বিভাগ": "Chittagong Division",

      // Descriptions
      "রাসায়নিক সার মুক্ত উত্তম মানের নতুন মিনিকিট ধান। চাতাল এবং মিলাররা সরাসরি যোগাযোগ করতে পারেন।": "Premium quality new Minikit paddy, nurtured with organic manure. Millers and processors welcome to bid.",
      "হিমাগারে রাখার উপযোগী একদম তাজা ডায়মন্ড আলু। মাঠ থেকে সরাসরি তোলা হয়েছে। কোন পচা নেই।": "Super fresh Diamond potatoes suitable for cold storage. Harvested straight from the field with zero decay.",
      "ফরমালিন মুক্ত গাছপাকা তাজা ল্যাংড়া আম। সরাসরি বাগান থেকে সরবরাহ করা হবে। ন্যূনতম অর্ডার ৫ মন।": "Chemical-free, naturally ripened Langra mangoes. Dispatched directly from orchards. Minimum order size 5 Maunds.",
      "জৈব সার দিয়ে চাষ করা লাল টমেটো। চমৎকার স্বাদ এবং সম্পূর্ণ বিষমুক্ত। কারওয়ান বাজারের পার্টিদের অগ্রাধিকার দেয়া হবে।": "Organic, scarlet red tomatoes. Extremely delicious and toxin-free. Direct trade priorities for Karwan Bazar wholesale merchants.",
      "নিজের জমির পুষ্ট লাল মসুর ডাল। পরিষ্কার এবং শুকনো কড়া রোদে শুকানো হয়েছে। সরাসরি রান্না উপযোগী।": "Highly nutritious local red lentils grown on private fields. Well-processed, dried under intense sun, and ready for home cooking."
    };

    if (dictionary[text]) return dictionary[text];

    let translated = text;
    Object.entries(dictionary).forEach(([bn, en]) => {
      if (translated.includes(bn)) {
        translated = translated.replaceAll(bn, en);
      }
    });

    return translated;
  };

  const translateCrop = (name: string) => {
    return translateText(name);
  };

  const translateUnit = (unit: string) => {
    if (language === "bn") return unit;
    const unitDict: Record<string, string> = {
      "কেজি": "kg",
      "মন": "maund (40kg)",
      "পিস": "pcs",
      "টন": "ton",
      "বস্তা": "sack"
    };
    return unitDict[unit] || unit;
  };

  const translatePreset = (key: string) => {
    if (language === "bn") return key;
    const presetsDict: Record<string, string> = {
      "ধানের ব্লাস্ট": "Paddy Blast Disease",
      "পাতা মরচে পড়া": "Leaf Rust Fungi",
      "আলুর লেট ব্লাইট": "Potato Late Blight",
      "আক্রান্ত পাতার ছত্রাক": "Leaf mold / Mildew",
      "টমেটো মোজাইক ভাইরাস": "Tomato Mosaic Virus",
      "পাতায় হলদে ছোপ": "Yellow speckles"
    };
    return presetsDict[key] || key;
  };

  // Format historical prices of chart to responsive coordinates
  const prepareChartData = () => {
    if (!selectedCropPrice) return [];
    
    const days_bn = ["সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার", "রোববার"];
    const days_en = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const days = language === "bn" ? days_bn : days_en;
    const key = t("বাজার মূল্য (৳)", "Market Price (৳)");
    return days.map((day, index) => {
      return {
        name: day,
        [key]: selectedCropPrice[priceMarketFilter]?.[index] || 0
      };
    });
  };

  // Filter listings by categories/search
  const filteredProducts = products.filter(p => {
    const matchedCat = activeCategory === "all" || p.category === activeCategory;
    const matchedSearch = p.cropName.toLowerCase().includes(marketSearch.toLowerCase()) || 
                          p.location.toLowerCase().includes(marketSearch.toLowerCase()) ||
                          p.farmerName.toLowerCase().includes(marketSearch.toLowerCase());
    
    // Geographic matching for Bangladesh's 64 districts, upazilas, unions, and villages
    let matchedGeo = true;
    if (isAdvancedLocationFilter) {
      if (filterDivision !== "all" && !p.location.includes(filterDivision)) {
        matchedGeo = false;
      }
      if (filterDistrict !== "all" && !p.location.includes(filterDistrict)) {
        matchedGeo = false;
      }
      if (filterUpazila.trim() && !p.location.toLowerCase().includes(filterUpazila.trim().toLowerCase())) {
        matchedGeo = false;
      }
      if (filterUnion.trim() && !p.location.toLowerCase().includes(filterUnion.trim().toLowerCase())) {
        matchedGeo = false;
      }
      if (filterVillage.trim() && !p.location.toLowerCase().includes(filterVillage.trim().toLowerCase())) {
        matchedGeo = false;
      }
    }
    
    return matchedCat && matchedSearch && matchedGeo;
  });

  return (
    <div id="krishi-root-div" className="min-h-screen bg-[#fafdfb] text-slate-900 pb-16 font-sans antialiased krishi-grid-dot">
      
      {/* Top Premium Navigation Header */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <header id="main-header" className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/80 backdrop-blur-md border border-emerald-100/60 p-4 rounded-3xl shadow-lg shadow-emerald-950/2">
          
          <div className="flex items-center gap-3">
            <div id="krishi-icon" className="w-12 h-12 bg-gradient-to-tr from-emerald-600 to-lime-500 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-md shadow-emerald-200">
              ক
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-emerald-950 tracking-tight">{t("কৃষি সংযোগ", "Krishi Shongjog")}</h1>
                <span className="px-2 py-0.5 text-[10px] bg-emerald-100 text-emerald-700 font-bold rounded-md">{t("স্মার্ট এআই ৩.৫", "Smart AI 3.5")}</span>
              </div>
              <p className="text-[11px] uppercase tracking-wider text-emerald-600 font-bold">Agriculture Information & Market Linkage</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100 animate-pulse">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
              <span className="text-xs font-semibold text-emerald-800">{t("৯টি অঞ্চলের বাজার দর লাইভ", "9 Regional Market Prices Live")}</span>
            </div>
            
            {/* Wallet balance display */}
            <div className="flex items-center gap-2.5 bg-slate-900 text-emerald-400 px-4 py-2 rounded-2xl shadow-sm border border-slate-800">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <div className="text-left">
                <span className="block text-[8px] text-slate-400 uppercase font-black tracking-widest">{t("ওয়ালেট ব্যালেন্স", "Wallet Balance")}</span>
                <span className="text-xs font-mono font-bold text-white">৳{walletBalance.toLocaleString("bn-BD")}</span>
              </div>
            </div>

            <div className="flex gap-1">
              <button 
                onClick={() => setLanguage(lang => lang === "bn" ? "en" : "bn")}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-100/80 cursor-pointer flex items-center gap-1 transition-all"
              >
                🌐 {language === "bn" ? "English" : "বাংলা"}
              </button>
              <button 
                onClick={() => setIsOperatorOpen(true)}
                className="px-3.5 py-2 bg-[#fdf2e9] hover:bg-[#fae5d3] text-[#a04000] border border-[#f5cba7] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                🛠️ {t("অপারেটর মোড", "Operator Mode")}
              </button>
              <button 
                onClick={() => setIsAddingCrop(true)}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-700 hover:to-green-700 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> {t("ফসল তালিকাভুক্ত করুন", "Publish Crop Listing")}
              </button>
            </div>
          </div>
        </header>

        {/* Top Emergency Notifications Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          {(newsList && newsList.length > 0 ? newsList : []).slice(0, 3).map((news, index) => (
            <div key={news.id || index} className="flex items-center justify-between gap-3 bg-emerald-55/70 border border-emerald-100 p-3 rounded-2xl text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full shrink-0"></div>
                <p className="text-slate-700 font-medium line-clamp-1">
                  {t(news.textBn, news.textEn)}
                </p>
              </div>
              <span className="text-[10px] bg-white border border-emerald-100 text-emerald-800 py-0.5 px-2 rounded-full font-bold">
                {t(news.dateBn, news.dateEn)}
              </span>
            </div>
          ))}
          {(!newsList || newsList.length === 0) && (
            <div className="col-span-3 text-center text-slate-400 py-2.5 bg-emerald-50/55 rounded-2xl border border-dashed border-emerald-100">
              {t("কোনো নতুন সংবাদ প্রচার করা হয়নি", "No active announcements broadcasted")}
            </div>
          )}
        </div>
      </div>

      {/* Main Beautiful Bento Grid */}
      <main className="max-w-7xl mx-auto px-4 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COMPACT BENTO (Marketplace & Pricing Chart) - 7 cols */}
        <div className="lg:col-span-8 grid grid-cols-1 gap-6">
          
          {/* Section 1: Weather Widget (Always updated from API) */}
          <div id="weather-section-bento">
            <WeatherWidget language={language} />
          </div>

          {/* Section 2: Market Prices & Graphical Trend Analysis (Bento Card) */}
          <section className="bg-white border border-emerald-100 rounded-3xl p-6 shadow-xl shadow-emerald-950/2 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-12 -mt-12"></div>
            
            {/* View Switcher Tabs */}
            <div className="flex gap-4 mb-4 border-b border-slate-100 pb-3 relative z-10">
              <button
                onClick={() => setPriceViewTab("wholesale")}
                className={`pb-1 px-1 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  priceViewTab === "wholesale" 
                    ? "border-emerald-600 text-emerald-800" 
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                📊 {t("পাইকারি বাজার সূচক", "Wholesale Price Indices")}
              </button>
              <button
                onClick={() => setPriceViewTab("representative")}
                className={`pb-1 px-1 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  priceViewTab === "representative" 
                    ? "border-emerald-600 text-emerald-800" 
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                📍 {t("প্রতিনিধি স্থানীয় বাজার দর (লাইভ)", "Local Representative Prices (Live)")}
              </button>
            </div>

            {priceViewTab === "wholesale" ? (
              <>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10">
                  <div>
                    <span className="text-[10px] tracking-widest text-emerald-600 uppercase font-bold bg-emerald-50 border border-emerald-100 py-1 px-2.5 rounded-full">{t("বগুড়া, রাজশাহী, কারওয়ান বাজার মনিটরিং", "Bogra, Rajshahi, Karwan Bazar Monitoring")}</span>
                    <h3 className="text-xl font-bold text-slate-800 mt-2">{t("আজকের পাইকারি বাজার মূল্য ও গ্রাফ বিশ্লেষণ", "Today's Wholesale Market Prices & Trend Analysis")}</h3>
                    <p className="text-xs text-slate-500">{t("বিভিন্ন আড়তের ৭ দিনের মূল্য পরিবর্তন ম্যাপ", "7-day historical wholesale price fluctuations")}</p>
                  </div>

                  {/* Selector for price market endpoint */}
                  <div className="flex gap-1.5 p-1 bg-slate-100/80 rounded-2xl w-fit">
                    {(["KarwanBazar", "Baneswar", "Mohasthangarh", "Jessore"] as const).map(m => {
                      const label: Record<string, string> = {
                        KarwanBazar: t("কারওয়ান বাজার", "Karwan Bazar"),
                        Baneswar: t("বানেশ্বর হাট", "Baneswar Hat"),
                        Mohasthangarh: t("মহাস্থানগড়", "Mohasthangarh"),
                        Jessore: t("যশোর আড়ত", "Jessore Wholesalers")
                      };
                      return (
                        <button
                          key={m}
                          onClick={() => setPriceMarketFilter(m)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                            priceMarketFilter === m ? "bg-white text-emerald-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {label[m]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                  
                  {/* Daily prices loop list */}
                  <div className="md:col-span-5 space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    {marketPrices.map((item, idx) => {
                      const prices = item[priceMarketFilter] || [];
                      const latestPrice = prices[prices.length - 1] || 0;
                      const prevPrice = prices[prices.length - 2] || 0;
                      const isUp = latestPrice > prevPrice;
                      const isSame = latestPrice === prevPrice;

                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedCropPrice(item)}
                          className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                            selectedCropPrice?.name === item.name 
                              ? "bg-emerald-50 border-emerald-200/95 ring-2 ring-emerald-500/20" 
                              : "bg-white hover:bg-slate-50 border-slate-100"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-sm">
                              {getCategoryIcon(item.name.includes("ধান") ? "ধান" : item.name.includes("আলু") ? "সবজি" : item.name.includes("পেঁয়াজ") ? "সবজি" : "সবজি")}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">{translateCrop(item.name)}</p>
                              <p className="text-[10px] text-slate-400">{t("সর্বশেষ আপডেট", "Latest Update")}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-xs font-bold text-slate-900">৳{latestPrice}</p>
                            {isSame ? (
                              <span className="text-[9px] text-slate-500 font-medium">{t("স্থির", "Stable")}</span>
                            ) : isUp ? (
                              <span className="text-[9px] text-green-600 font-bold flex items-center gap-0.5 justify-end">
                                <TrendingUp className="w-3" /> {t("বৃদ্ধি", "Up")}
                              </span>
                            ) : (
                              <span className="text-[9px] text-red-500 font-bold flex items-center gap-0.5 justify-end">
                                <TrendingDown className="w-3 px-0.5" /> {t("হ্রাস", "Down")}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Graphical representation (Recharts) */}
                  <div className="md:col-span-7 bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-emerald-600" /> {translateCrop(selectedCropPrice?.name || "")} - {t("এর মূল্য পরিচিত্র", "Price Trend Chart")}
                        </h4>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 py-0.5 px-2 rounded-full font-bold">{t("৭ দিনের গড় গ্রাফ", "7-Day Average")}</span>
                      </div>
                      
                      {/* Recharts area chart element */}
                      <div className="h-44 w-full text-[10px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={prepareChartData()} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                            <defs>
                              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" tickLine={false} />
                            <YAxis tickLine={false} axisLine={false} />
                            <Tooltip />
                            <Area type="monotone" dataKey={t("বাজার মূল্য (৳)", "Market Price (৳)")} stroke="#059669" strokeWidth={2.5} fillOpacity={1} fill="url(#priceGradient)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-white/80 p-2.5 rounded-xl border border-slate-100 text-[11px] leading-relaxed text-slate-600">
                      <span className="font-bold text-emerald-800">{t("পরামর্শ: ", "Action Tip: ")}</span>
                      {t(
                        "উক্ত পাইকারি মূল্যের উপর ভিত্তি করে আপনার খামারের উৎপাদিত ফসল সরাসরি বাজারে ন্যায্য মূল্যে ডাকুন।",
                        "Based on these live wholesale indices, you can auction your harvested crops directly on our marketplace with realistic competitive pricing."
                      )}
                    </div>
                  </div>

                </div>
              </>
            ) : (
              /* Conditional block for local representing prices with filters */
              <div className="relative z-10 animate-in fade-in duration-200">
                <div className="mb-4">
                  <span className="text-[10px] tracking-widest text-emerald-700 uppercase font-black bg-emerald-50 border border-emerald-100 py-1 px-2.5 rounded-full">
                    {t("অফিসিয়াল প্রতিনিধি দর মনিটরিং", "Verified Representative Area Prices")}
                  </span>
                  <h3 className="text-base font-bold text-slate-800 mt-2">{t("ইউনিয়ন ও গ্রাম ভিত্তিক স্থানীয় বর্তমান বাজার দর", "Local Union & Village Current Market Prices")}</h3>
                  <p className="text-xs text-slate-500">{t("সুপার এডমিন দ্বারা যাচাইকৃত ও অনুমোদিত সঠিক বাজার মূল্যের তালিকা", "List of accurate prices verified and approved by the Super Admin")}</p>
                </div>

                {/* Filters Board */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-wider">{t("বিভাগ", "Division")}</label>
                    <select
                      value={pubFilterDiv}
                      onChange={(e) => {
                        setPubFilterDiv(e.target.value);
                        setPubFilterDist("all");
                      }}
                      className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
                    >
                      <option value="all">{t("সব বিভাগ", "All Divisions")}</option>
                      {Object.keys(bdGeography).map(div => (
                        <option key={div} value={div}>{div}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-wider">{t("জেলা", "District")}</label>
                    <select
                      value={pubFilterDist}
                      disabled={pubFilterDiv === "all"}
                      onChange={(e) => setPubFilterDist(e.target.value)}
                      className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none disabled:bg-slate-100"
                    >
                      <option value="all">{t("সব জেলা", "All Districts")}</option>
                      {pubFilterDiv !== "all" && bdGeography[pubFilterDiv]?.map(dist => (
                        <option key={dist} value={dist}>{dist}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-wider">{t("উপজেলা", "Upazila")}</label>
                    <input
                      type="text"
                      placeholder={t("যেমন: শেরপুর", "e.g. Sherpur")}
                      value={pubFilterUpazila}
                      onChange={(e) => setPubFilterUpazila(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-wider">{t("ফসল/পণ্য", "Crop/Product")}</label>
                    <input
                      type="text"
                      placeholder={t("যেমন: ধান", "e.g. Rice")}
                      value={pubFilterProduct}
                      onChange={(e) => setPubFilterProduct(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none text-slate-900"
                    />
                  </div>
                </div>

                {/* Local Price List Output */}
                {publicApprovedPrices.length === 0 ? (
                  <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 text-center text-slate-500">
                    <p className="text-xs font-medium">🌾 {t("উক্ত ফিল্টার অনুযায়ী কোনো অনুমোদিত স্থানীয় বাজার দর রেকর্ড পাওয়া যায়নি।", "No approved local market prices found matching the filters.")}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{t("পণ্য অথবা জেলার প্রথম কয়েকটি অক্ষর বাংলায় টাইপ করুন।", "Try searching for another area or typing keywords in Bengali.")}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[350px] overflow-y-auto pr-1">
                    {publicApprovedPrices.map((priceItem) => (
                      <div key={priceItem._id} className="bg-stone-50/40 hover:bg-emerald-50/10 border border-slate-100/90 rounded-2xl p-3.5 transition-all text-slate-800">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full select-none">
                              {priceItem.unit}
                            </span>
                            <h4 className="text-sm font-black mt-1 text-slate-900">{priceItem.productName}</h4>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-extrabold text-emerald-700">৳{priceItem.price}</span>
                            <p className="text-[9px] text-slate-400 mt-0.5">/{priceItem.unit}</p>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-dashed border-slate-200/60 space-y-1 text-[10px] text-slate-500">
                          <p className="flex items-center gap-1 text-slate-600">
                            📍 <strong>{priceItem.upazila}</strong>, {priceItem.district}, {priceItem.division}
                          </p>
                          <p className="flex items-center gap-1 flex-wrap text-slate-400">
                            👤 {t("রিপোর্টার: ", "Reporter: ")} <span className="font-semibold text-slate-600">{priceItem.representativeName}</span>
                            <span className="text-emerald-500 text-[9px] font-bold">✔ {t("অনুমোদিত প্রতিনিধি", "Verified Official")}</span>
                          </p>
                          <p className="text-[9px] text-slate-400 font-mono">📅 {t("আপডেট তারিখ:", "Updated:")} {priceItem.submissionDate}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Section 3: Digital Mandi / Farmers' Marketplace */}
          <section id="marketplace-section" className="bg-white border border-emerald-100 rounded-3xl p-6 shadow-xl shadow-emerald-950/2">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <span className="text-[10px] tracking-widest text-emerald-600 uppercase font-bold bg-emerald-50 border border-emerald-100 py-1 px-2.5 rounded-full">{t("ভোক্তা ও আড়তদার সংযোগ", "Direct Wholesalers & Consumer Connect")}</span>
                <h3 className="text-xl font-bold text-slate-800 mt-1">{t("কৃষকের লাইভ হাটবাজার (Marketplace)", "Farmers' Live Digital Mandi (Marketplace)")}</h3>
                <p className="text-xs text-slate-500">{t("দালালবিহীন সরাসরি কৃষকের পকেট থেকে তাজা শস্য ক্রয়ের উন্মুক্ত গেটওয়ে", "Broker-free directory for ordering fresh goods straight from local farmers")}</p>
              </div>

              {/* Add list button */}
              <button 
                onClick={() => setIsAddingCrop(true)}
                className="self-start md:self-center bg-emerald-600 text-white font-semibold text-xs px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" /> {t("আমার ফসল লিস্টিং করুন", "Publish My Crop Listing")}
              </button>
            </div>

            {/* Marketplace category tabs + Search block */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
              
              <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none max-w-full">
                {["all", "ধান", "সবজি", "ফল", "ডাল ও তেলবীজ", "মসলা"].map(cat => {
                  const catLabel: Record<string, string> = {
                    all: t("সব ফসল", "All Crops"),
                    "ধান": t("ধান", "Paddy & Rice"),
                    "সবজি": t("সবজি", "Vegetables"),
                    "ফল": t("ফল", "Fruits"),
                    "ডাল ও তেলবীজ": t("ডাল ও তেলবীজ", "Pulses & Oilseeds"),
                    "মসলা": t("মসলা", "Spices")
                  };
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                        activeCategory === cat ? "bg-emerald-800 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {catLabel[cat] || cat}
                    </button>
                  );
                })}
              </div>

              {/* Search + Location Toggler inside Bento */}
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  onClick={() => setIsAdvancedLocationFilter(!isAdvancedLocationFilter)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all outline-none border cursor-pointer shrink-0 ${
                    isAdvancedLocationFilter
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-slate-100/80 hover:bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  📍 {t("এলাকা ফিল্টার ", "Area Filter ")} {isAdvancedLocationFilter ? t("বন্ধ", "OFF") : t("চালু", "ON")}
                </button>
                
                <div className="relative w-full md:w-64 max-w-xs">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder={t("ফসল বা চাষী খুঁজুন...", "Search crop or farmer name...")}
                    value={marketSearch}
                    onChange={(e) => setMarketSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50/90 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>
            </div>

            {/* Advanced Multi-level Geographic Selector Panel */}
            {isAdvancedLocationFilter && (
              <div className="p-4 bg-emerald-50/55 rounded-2xl border border-emerald-100 mb-5 text-xs text-slate-800 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-emerald-100/50">
                  <span className="font-extrabold text-emerald-950 flex items-center gap-1">{t("🇧🇩 ৬৪ জেলা, উপজেলা, ইউনিয়ন ও গ্রামভিত্তিক ফিল্টার", "🇧🇩 64 Districts, Upazilas, Unions & Villages Filter")}</span>
                  <button
                    onClick={() => {
                      setFilterDivision("all");
                      setFilterDistrict("all");
                      setFilterUpazila("");
                      setFilterUnion("");
                      setFilterVillage("");
                    }}
                    className="text-[10px] text-emerald-700 underline font-semibold hover:text-emerald-900 cursor-pointer"
                  >
                    {t("ফিল্টার রিমুভ করুন", "Clear Filters")}
                  </button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">{t("১. বিভাগ", "1. Division")}</label>
                    <select
                      value={filterDivision}
                      onChange={(e) => {
                        setFilterDivision(e.target.value);
                        setFilterDistrict("all");
                      }}
                      className="w-full bg-white border border-slate-200 text-xs rounded-lg p-2 font-semibold text-slate-800"
                    >
                      <option value="all">{t("সব বিভাগ", "All Divisions")}</option>
                      {Object.keys(bdGeography).map(div => (
                        <option key={div} value={div}>{div}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">{t("২. জেলা (৬৪ টি)", "2. District (64)")}</label>
                    <select
                      value={filterDistrict}
                      onChange={(e) => setFilterDistrict(e.target.value)}
                      disabled={filterDivision === "all"}
                      className="w-full bg-white border border-slate-200 text-xs rounded-lg p-2 font-semibold text-slate-800 disabled:opacity-50"
                    >
                      <option value="all">{t("সব জেলা", "All Districts")}</option>
                      {filterDivision !== "all" && bdGeography[filterDivision]?.map(dist => (
                        <option key={dist} value={dist}>{dist}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">{t("৩. উপজেলা", "3. Upazila")}</label>
                    <input
                      type="text"
                      placeholder={t("উদা: সলঙ্গা / উল্লাপাড়া", "e.g. Ullapara / Sadar")}
                      value={filterUpazila}
                      onChange={(e) => setFilterUpazila(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs rounded-lg p-1.5 font-medium placeholder:text-slate-400 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">{t("৪. ইউনিয়ন", "4. Union")}</label>
                    <input
                      type="text"
                      placeholder={t("উদা: সলিমপুর ইউনিয়ন", "e.g. Salimpur Union")}
                      value={filterUnion}
                      onChange={(e) => setFilterUnion(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs rounded-lg p-1.5 font-medium placeholder:text-slate-400 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">{t("৫. গ্রাম", "5. Village")}</label>
                    <input
                      type="text"
                      placeholder={t("উদা: কান্দাপাড়া গ্রাম", "e.g. Kandapara Village")}
                      value={filterVillage}
                      onChange={(e) => setFilterVillage(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs rounded-lg p-1.5 font-medium placeholder:text-slate-400 text-slate-800"
                    />
                  </div>
                </div>

                {/* Localized Price analysis section inside filter */}
                {filteredProducts.length > 0 && (
                  <div className="mt-3.5 bg-white/70 p-2.5 rounded-xl border border-emerald-100/50 flex flex-wrap justify-between items-center text-[11px]">
                    <span className="text-slate-600 font-medium">
                      {t("🎯 ফিল্টারকৃত এলাকায় সচল ফসল অফার: ", "🎯 Active crop offers in filtered areas: ")} <strong className="text-slate-900">{filteredProducts.length} {t("টি ফসল", "crops")}</strong>
                    </span>
                    <span className="text-slate-600 font-medium font-mono">
                      {t("গড় মূল্য হার: ", "Average Asking Rate: ")} <strong className="text-emerald-800 font-black">৳{Math.round(
                        filteredProducts.reduce((sum, p) => sum + p.basePrice, 0) / filteredProducts.length
                      )}/{translateUnit(filteredProducts[0]?.unit || 'কেজি')}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Loaded Products Grid inside Bento */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-400 text-xs">{t("আপনার নির্বাচিত ক্যাটাগরি বা সার্চ অনুযায়ী তালিকায় কোনো ফসল পাওয়া যায়নি।", "No crops listed matching your requested search or geo preference.")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProducts.map(product => {
                  const highestBid = product.bids.reduce((max, b) => b.bidAmount > max ? b.bidAmount : max, product.basePrice);
                  
                  return (
                    <div 
                      key={product.id} 
                      className={`relative overflow-hidden bg-white hover:bg-slate-50/50 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
                        product.status === 'sold' ? "bg-slate-50/70 border-slate-100 opacity-80" : "border-slate-200/80"
                      }`}
                    >
                      {/* Product Status sticker */}
                      {product.status === 'sold' && (
                        <div className="absolute top-2 right-2 bg-red-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full z-10 select-none uppercase tracking-widest">
                          {t("বিক্রিত", "SOLD OUT")}
                        </div>
                      )}

                      <div className="p-4 flex gap-3">
                        <img 
                          src={product.image} 
                          alt={translateCrop(product.cropName)} 
                          className="w-20 h-20 object-cover rounded-xl border border-slate-100 shrink-0" 
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{getCategoryIcon(product.category)}</span>
                            <span className="text-[10px] text-emerald-900 font-black tracking-wide uppercase bg-emerald-50 px-1.5 py-0.5 rounded">
                              {translateCrop(product.category)}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-slate-800 mt-1">{translateCrop(product.cropName)}</h4>
                          
                          <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3 text-red-500" /> {translateText(product.location)}
                          </p>

                          <p className="text-[10px] text-slate-600 font-semibold mt-1">
                            {t("পরিমাণ: ", "Quantity: ")} <span className="text-slate-900 font-mono font-bold bg-slate-100 px-1 py-0.5 rounded">{product.quantity} {translateUnit(product.unit)}</span>
                          </p>
                        </div>
                      </div>

                      {/* Bidding and Instant deal panel */}
                      <div className="bg-slate-50/90 p-3 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">{t("ভিত্তি ও বর্তমান ডাক", "Base Price & High Bid")}</p>
                          <p className="text-slate-800 font-bold font-mono">
                            ৳{product.basePrice} → <span className="text-emerald-700 font-black">৳{highestBid}</span> <span className="text-[10px] text-slate-500">/{translateUnit(product.unit)}</span>
                          </p>
                        </div>

                        <div className="flex gap-1.5">
                          {product.status === "available" ? (
                            <>
                              <button
                                onClick={() => setSelectedProductForBid(product)}
                                className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg text-[10px] transition-all"
                              >
                                {t("ডাক আহ্বান ", "Bid Offer ")} ({product.bids.length})
                              </button>
                              <button
                                onClick={() => buyProductInstant(product)}
                                className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold rounded-lg text-[10px] shadow-sm transition-all"
                              >
                                {t("সরাসরি ক্রয়", "Buy Instantly")}
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 py-1 px-3 bg-slate-200/60 rounded-lg">
                              {t("লেনদেন সমাপ্ত", "Deal Finished")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>

        {/* RIGHT INTERACTIVE AI BLOCK (Crop Diagnostic & Live Chat With Gemini) - 4 cols */}
        <div className="lg:col-span-4 grid grid-cols-1 gap-6">
          
          {/* Bento Card: Smart AI Plant Disease DIAGNOSTIC scanner */}
          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl shadow-emerald-950/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-lime-500/10 rounded-full -mr-16 -mt-16"></div>
            
            <div className="flex items-center gap-2 mb-3 relative z-10">
              <div className="w-8 h-8 rounded-full bg-lime-500/20 text-lime-400 flex items-center justify-center font-bold">
                📸
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">{t("উদ্ভিদ রোগা বালাই সনাক্তকরণ (AI)", "Crop Leaf Disease Pathology (AI)")}</h3>
                <p className="text-[10px] text-lime-400 font-bold uppercase tracking-widest">{t("Instant Leaf Disease Diagnosis", "Instant Leaf Disease Diagnosis")}</p>
              </div>
            </div>

            <p className="text-slate-300 text-xs mb-4 leading-relaxed">
              {t(
                "আপনার আক্রান্ত ফসলের পাতার একটি ছবি নির্বাচন করুন। গুগল জেমিনি এআই তাৎক্ষণিকভাবে রোগের লক্ষণ ও ওষুধ নির্ধারণ করবে।",
                "Select or snap an infected leaf photo. Google Gemini AI will instantly diagnose pathogens and suggest organic or chemical treatments."
              )}
            </p>

            {/* Core Disease Analyzer Controls */}
            <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60 mb-4 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 font-semibold">{t("ফসল ধরন নির্বাচন:", "Select Crop Species:")}</span>
                <div className="flex gap-1.5">
                  {["ধান", "আলু", "টমেটো"].map(c => (
                    <button
                      key={c}
                      onClick={() => setDiagnoseCropType(c)}
                      className={`px-2 py-1 rounded font-bold text-[10px] transition-colors ${
                        diagnoseCropType === c ? "bg-lime-500 text-slate-950" : "bg-slate-700 text-slate-200 hover:bg-slate-600"
                      }`}
                    >
                      {c === "ধান" ? t("ধান", "Rice") : c === "আলু" ? t("আলু", "Potato") : t("টমেটো", "Tomato")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Browse / Upload Area */}
              <label className="flex flex-col items-center justify-center py-4 border-2 border-dashed border-slate-700 hover:border-lime-500 rounded-xl cursor-pointer bg-slate-900/40 transition-colors">
                <ImageIcon className="w-6 h-6 text-slate-400 mb-1" />
                <span className="text-[10px] text-slate-300 font-bold">{t("আক্রান্ত পাতার ছবি যুক্ত করুন", "Add Infected Leaf Photo")}</span>
                <span className="text-[8px] text-slate-500 mt-0.5">Drag-and-Drop or Browse</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageUploadChange} 
                />
              </label>
            </div>

            {/* Fast Test presets for farmers (No real phone? Test instantly!) */}
            <div className="mb-4">
              <p className="text-[10px] text-slate-400 font-bold mb-1.5">{t("পরীক্ষা করতে নিচের একটি নমুনা সিলেক্ট করুন:", "Or inspect one of these sample presets:")}</p>
              <div className="grid grid-cols-3 gap-2">
                {PRESET_DISEASES.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetSelect(preset)}
                    className={`p-1 bg-slate-800 rounded-xl border transition-all text-left group overflow-hidden ${
                      selectedPresetImage === preset.image ? "border-lime-500 ring-2 ring-lime-400/20" : "border-slate-800"
                    }`}
                  >
                    <img 
                      src={preset.image} 
                      alt={preset.title} 
                      className="w-full h-12 object-cover rounded-lg mb-1 group-hover:scale-105 transition-transform" 
                    />
                    <p className="text-[8px] font-bold text-slate-200 truncate pr-0.5">{translatePreset(preset.title)}</p>
                    <p className="text-[7px] text-slate-400 truncate">{language === "bn" ? preset.desc : "Sample image preset"}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Diagnostics Response display */}
            {diagnoseLoading && (
              <div className="flex flex-col items-center justify-center py-6 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs">
                <Loader2 className="w-6 h-6 text-lime-400 animate-spin" />
                <p className="text-slate-300 mt-2 font-medium">{t("জেমিনি এআই পাতাটি পরীক্ষা করছে...", "Gemini AI is analyzing the leaf...")}</p>
                <p className="text-[10px] text-slate-500">{t("এতে ১৫ সেকেন্ড পর্যন্ত সময় লাগতে পারে", "This may take up to 15 seconds")}</p>
              </div>
            )}

            {!diagnoseLoading && diagnoseResponse && (
              <div className="p-4 bg-emerald-950/90 border border-emerald-800 rounded-2xl text-xs max-h-[300px] overflow-y-auto shrink-0 select-text">
                <div className="flex items-center justify-between mb-3 border-b border-emerald-800/60 pb-2">
                  <div className="flex items-center gap-1.5 text-lime-400">
                    <span className="w-2 h-2 bg-lime-400 rounded-full"></span>
                    <span className="font-bold uppercase tracking-wider text-[10px]">
                      {t("রোগ প্যাথলজি রিপোর্ট", "Disease Pathology Report")} ({diagnoseCropType === "ধান" ? t("ধান", "Rice") : diagnoseCropType === "আলু" ? t("আলু", "Potato") : t("টমেটো", "Tomato")})
                    </span>
                  </div>
                  <button 
                    onClick={() => setDiagnoseResponse("")}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {renderMarkdown(diagnoseResponse)}
                </div>
              </div>
            )}
          </section>

          {/* Bento Card: Live Gemini AI Consultancy Chat window */}
          <section className="bg-white border border-emerald-100 rounded-3xl p-5 shadow-xl shadow-emerald-950/2 flex flex-col justify-between h-[520px]">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 to-lime-500 text-white flex items-center justify-center text-sm font-bold shadow-sm animate-pulse">
                    🌱
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1">
                      {t("কৃষক বন্ধু AI পরামর্শক", "Farmers' AI Companion")} <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    </h3>
                    <p className="text-[10px] text-emerald-600 font-bold">{t("লাইভ এআই কৃষি বিশেষজ্ঞ", "Live Generative AI Advisor")}</p>
                  </div>
                </div>
                <span className="text-[9px] bg-slate-100 text-slate-500 font-mono py-0.5 px-2 rounded-full font-bold">
                  {t("অনলাইন", "ONLINE")}
                </span>
              </div>

              {/* Quick suggestion helper chips for farmers */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {[
                  "ধানের মাজরা পোকা দমন উপায়", 
                  "আলুর নাবি ধসা রোগ স্প্রে", 
                  "টমেটোর লাল মাকড়সা প্রতিরোধ", 
                  "কম খরচে আদর্শ জৈব সার প্রস্তুত"
                ].map((suggest, sIdx) => {
                  const suggestLabel: Record<string, string> = {
                    "ধানের মাজরা পোকা দমন উপায়": t("ধানের মাজরা পোকা দমন উপায়", "Rice stem borer solution"),
                    "আলুর নাবি ধসা রোগ স্প্রে": t("আলুর নাবি ধসা রোগ স্প্রে", "Potato blight spray index"),
                    "টমেটোর লাল মাকড়সা প্রতিরোধ": t("টমেটোর লাল মাকড়সা প্রতিরোধ", "Red spider mite remedies"),
                    "কম খরচে আদর্শ জৈব সার প্রস্তুত": t("কম খরচে আদর্শ জৈব সার প্রস্তুত", "Cheap composting recipe")
                  };
                  return (
                    <button
                      key={sIdx}
                      onClick={() => setChatInput(suggest)}
                      className="text-[9px] bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-800 border border-slate-200/50 hover:border-emerald-200 py-1 px-2 rounded-lg transition-colors whitespace-nowrap"
                    >
                      {suggestLabel[suggest] || suggest}
                    </button>
                  );
                })}
              </div>

              {/* Messages wrapper */}
              <div className="h-[280px] overflow-y-auto space-y-3 pr-1 text-xs mb-3">
                {chatMessages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex flex-col max-w-[85%] ${msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"}`}
                  >
                    <div 
                      className={`p-3 rounded-2xl select-text leading-relaxed font-medium ${
                        msg.role === "user" 
                          ? "bg-emerald-600 text-white rounded-br-none" 
                          : "bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200/40"
                      }`}
                    >
                      {msg.role === "user" ? msg.text : renderMarkdown(msg.text)}
                    </div>
                    <span className="text-[8px] text-slate-400 mt-1 px-1 font-semibold">{msg.timestamp}</span>
                  </div>
                ))}
                
                {chatLoading && (
                  <div className="mr-auto items-start max-w-[85%]">
                    <div className="p-3 rounded-2xl bg-slate-100 text-slate-500 rounded-bl-none flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                      </div>
                      <span className="text-[10px] font-bold">{t("কৃষক বন্ধু ভাবছেন...", "Companion is thinking...")}</span>
                    </div>
                  </div>
                )}
                
                {/* Scroll Anchor */}
                <div ref={chatBottomRef} />
              </div>
            </div>

            {/* Input Form at bottom */}
            <form onSubmit={handleSendMessage} className="flex gap-1.5 pt-2 border-t border-slate-100">
              <input
                type="text"
                placeholder={t("ধান, আলু বা ফসলের যেকোনো প্রশ্ন করুন বাংলা ভাষায়...", "Ask any agri-questions in English or Bangla...")}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                type="submit"
                disabled={chatLoading}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs p-2.5 rounded-xl transition-all shadow-md shadow-emerald-500/10 shrink-0"
              >
                {t("পাঠান", "Send")}
              </button>
            </form>
          </section>

        </div>

      </main>

      {/* -------------------------------------------------------------
          MODAL 1: Bidding Portal Slideover / Modal Window
          ------------------------------------------------------------- */}
      {selectedProductForBid && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full border border-emerald-100 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            <div className="bg-gradient-to-tr from-emerald-800 to-emerald-950 text-white p-5 relative">
              <button 
                onClick={() => {
                  setSelectedProductForBid(null);
                  setBidError("");
                  setBidSuccess("");
                }}
                className="absolute top-4 right-4 text-emerald-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <span className="text-[9px] bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded uppercase font-black tracking-widest">ডাক আহ্বান পোর্টাল</span>
              <h3 className="text-lg font-bold mt-1">ফসল ডাক তুলুন (Bidding Portal)</h3>
              <p className="text-xs text-emerald-200">কৃষক সরাসরি আপনার সাথে যোগাযোগ করে হস্তান্তর করবেন</p>
            </div>

            <div className="p-6">
              
              {/* Product mini details */}
              <div className="flex gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-4 text-xs">
                <img 
                  src={selectedProductForBid.image} 
                  alt={translateCrop(selectedProductForBid.cropName)} 
                  className="w-14 h-14 object-cover rounded-xl" 
                />
                <div>
                  <h4 className="font-bold text-slate-800">{translateCrop(selectedProductForBid.cropName)}</h4>
                  <p className="text-slate-500 mt-0.5">{t("চাষী: ", "Farmer: ")}{translateText(selectedProductForBid.farmerName)}</p>
                  <p className="text-emerald-700 font-bold mt-0.5">
                    {t("ভিত্তি মূল্য: ৳", "Base Price: ৳")}{selectedProductForBid.basePrice}/{translateUnit(selectedProductForBid.unit)}
                  </p>
                </div>
              </div>

              {/* List of current bids */}
              <div className="mb-4">
                <h4 className="text-xs font-bold text-slate-700 mb-2">{t("চলতি সর্বোচ্চ ডাকসমূহ:", "Current Active Bids:")}</h4>
                {selectedProductForBid.bids.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic bg-slate-50 p-2.5 rounded-xl text-center">{t("এখনো কোনো বিড বা ডাক দেওয়া হয়নি। আপনার ডাকা দরই হবে প্রথম দর!", "No bids submitted yet. Your offer will be the first!")}</p>
                ) : (
                  <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
                    {selectedProductForBid.bids.map((bid, bIdx) => (
                      <div key={bid.id} className="flex justify-between items-center text-[11px] bg-emerald-50/50 p-2 rounded-xl border border-emerald-100">
                        <span className="font-bold text-slate-700">{translateText(bid.buyerName)}</span>
                        <div className="text-right">
                          <span className="font-mono font-bold text-emerald-800 bg-white border border-emerald-100 px-2 py-0.5 rounded-lg text-xs">৳{bid.bidAmount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Input details form */}
              <form onSubmit={submitBid} className="space-y-3">
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">{t("আপনার বা প্রতিনিধি প্রতিষ্ঠানের নাম *", "Your Name / Organization *")}</label>
                  <input
                    type="text"
                    required
                    placeholder={t("উদা: মেসার্স সোলায়মান ট্রেডার্স", "e.g. M/S Solaiman Traders")}
                    value={bidForm.buyerName}
                    onChange={(e) => setBidForm(p => ({ ...p, buyerName: e.target.value }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 font-bold mb-1">{t("মোবাইল নম্বর *", "Mobile Number *")}</label>
                    <input
                      type="tel"
                      required
                      placeholder={t("০১৭১১-২২৩৩৪৪", "e.g. 01711-223344")}
                      value={bidForm.buyerPhone}
                      onChange={(e) => setBidForm(p => ({ ...p, buyerPhone: e.target.value }))}
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 font-bold mb-1">{t("আহ্বান দর (৳ প্রতি ", "Bid Offer (৳ per ")}{translateUnit(selectedProductForBid.unit)}) *</label>
                    <input
                      type="number"
                      required
                      placeholder={`>${selectedProductForBid.bids.reduce((max, b) => b.bidAmount > max ? b.bidAmount : max, selectedProductForBid.basePrice)}`}
                      value={bidForm.bidAmount}
                      onChange={(e) => setBidForm(p => ({ ...p, bidAmount: e.target.value }))}
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                {bidError && (
                  <p className="text-[11px] text-red-600 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" /> {bidError}
                  </p>
                )}

                {bidSuccess && (
                  <p className="text-[11px] text-green-700 font-bold flex items-center gap-1">
                    <Check className="w-4 h-4 text-green-600 shrink-0" /> {bidSuccess}
                  </p>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProductForBid(null);
                      setBidError("");
                      setBidSuccess("");
                    }}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                  >
                    {t("বন্ধ করুন", "Cancel / Close")}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-700 hover:to-green-700 font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-500/20"
                  >
                    {t("বিড বা ডাক সাবমিট করুন", "Submit Bid Offer")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL 2: Sell New Crop Form (Full Dialog box)
          ------------------------------------------------------------- */}
      {isAddingCrop && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-emerald-100 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
            
            <div className="bg-gradient-to-tr from-emerald-800 to-emerald-950 text-white p-5 relative">
              <button 
                type="button"
                onClick={() => setIsAddingCrop(false)}
                className="absolute top-4.5 right-4 text-emerald-250 hover:text-white bg-black/20 hover:bg-black/35 px-3 py-1.5 rounded-full flex items-center gap-1 text-xs font-bold transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t("ফিরে যান", "Back")}</span>
              </button>
              <span className="text-[9px] bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded uppercase font-black tracking-widest">কৃষক সেবা সেন্টার</span>
              <h3 className="text-lg font-bold mt-1 pr-16">নতুন ফসলের তালিকাভুক্তকরণ (Sell Crop Form)</h3>
              <p className="text-xs text-emerald-250 mt-0.5">সরাসরি পাইকারদের কাছে সর্বোচ্চ বিড আহ্বানের জন্য আপনার ফসল পোস্ট করুন</p>
            </div>

            <form onSubmit={handlePublishCrop} className="p-6 space-y-4">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">কৃষকের নাম *</label>
                  <input
                    type="text"
                    required
                    value={newCropForm.farmerName}
                    onChange={(e) => setNewCropForm(p => ({ ...p, farmerName: e.target.value }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">মোবাইল নম্বর (যোগাযোগের জন্য) *</label>
                  <input
                    type="tel"
                    required
                    value={newCropForm.farmerPhone}
                    onChange={(e) => setNewCropForm(p => ({ ...p, farmerPhone: e.target.value }))}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">ফসলের নাম ও জাত *</label>
                  <input
                    type="text"
                    required
                    placeholder="উদা: ডায়মন্ড আলু / মিনিকেট ধান"
                    value={newCropForm.cropName}
                    onChange={(e) => setNewCropForm(p => ({ ...p, cropName: e.target.value }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">ক্যাটাগরি *</label>
                  <select
                    value={newCropForm.category}
                    onChange={(e) => setNewCropForm(p => ({ ...p, category: e.target.value as any }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {["ধান", "সবজি", "ফল", "ডাল ও তেলবীজ", "মসলা"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">মোট পরিমাণ *</label>
                  <input
                    type="number"
                    required
                    placeholder="১২০০"
                    value={newCropForm.quantity}
                    onChange={(e) => setNewCropForm(p => ({ ...p, quantity: e.target.value }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">একক *</label>
                  <select
                    value={newCropForm.unit}
                    onChange={(e) => setNewCropForm(p => ({ ...p, unit: e.target.value as any }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {["কেজি", "মন", "পিস"].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1">ভিত্তি মূল্য (৳ প্রতি একক) *</label>
                  <input
                    type="number"
                    required
                    placeholder="৪০"
                    value={newCropForm.basePrice}
                    onChange={(e) => setNewCropForm(p => ({ ...p, basePrice: e.target.value }))}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Geographic selectors */}
              <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 space-y-3">
                <span className="block text-[11px] font-black text-emerald-800">📍 ফসলের উৎপাদন এলাকা নির্ধারণ করুন (৬৪ জেলা ও গ্রাম কভারেজ):</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">বিভাগ *</label>
                    <select
                      value={newCropForm.division}
                      onChange={(e) => setNewCropForm(p => ({ ...p, division: e.target.value, district: bdGeography[e.target.value][0] }))}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2 py-2 focus:outline-none"
                    >
                      {Object.keys(bdGeography).map(div => (
                        <option key={div} value={div}>{div}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">জেলা (৬৪ টি) *</label>
                    <select
                      value={newCropForm.district}
                      onChange={(e) => setNewCropForm(p => ({ ...p, district: e.target.value }))}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2 py-2 focus:outline-none"
                    >
                      {bdGeography[newCropForm.division]?.map(dist => (
                        <option key={dist} value={dist}>{dist}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">উপজেলা</label>
                    <input
                      type="text"
                      placeholder="লালপুর"
                      value={newCropForm.upazila}
                      onChange={(e) => setNewCropForm(p => ({ ...p, upazila: e.target.value }))}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">ইউনিয়ন</label>
                    <input
                      type="text"
                      placeholder="গোপালপুর"
                      value={newCropForm.union}
                      onChange={(e) => setNewCropForm(p => ({ ...p, union: e.target.value }))}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">গ্রাম</label>
                    <input
                      type="text"
                      placeholder="রামপুর"
                      value={newCropForm.village}
                      onChange={(e) => setNewCropForm(p => ({ ...p, village: e.target.value }))}
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Crop image link input */}
              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-1">ফসলের চিত্র লিঙ্ক (ঐচ্ছিক)</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={newCropForm.image}
                  onChange={(e) => setNewCropForm(p => ({ ...p, image: e.target.value }))}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-1">অতিরিক্ত বিবরণী ও ফসলের পুষ্টি গুনাগুন (ঐচ্ছিক)</label>
                <textarea
                  placeholder="উদা: রাসায়নিক সার মুক্ত উন্নতমানের আলু..."
                  rows={2}
                  value={newCropForm.description}
                  onChange={(e) => setNewCropForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                ></textarea>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingCrop(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  বাতিল করুন
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-700 hover:to-green-700 font-bold text-xs rounded-xl shadow-md"
                >
                  লাইভ হাটে তালিকাভুক্ত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Decorative Bottom Credit Line */}
      {isOperatorOpen && (
        <div id="operator-modal" className="fixed inset-0 bg-slate-900/75 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto font-sans">
          {!currentUser ? (
            /* ================= LOGGED OUT: LOGIN / REGISTRATION WORKFLOW ================= */
            <div className="bg-white rounded-3xl max-w-md w-full border border-emerald-100 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-700 via-emerald-800 to-emerald-950 text-white p-6 relative">
                <button 
                  onClick={() => setIsOperatorOpen(false)}
                  className="absolute top-5 right-5 text-emerald-200 hover:text-white bg-black/20 p-2 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-emerald-500/20 border border-emerald-400 rounded-2xl flex items-center justify-center text-xl">
                    🔐
                  </div>
                  <div>
                    <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-2.5 py-0.5 rounded-full uppercase font-black tracking-widest">
                      {isRegisteringRep ? t("রেজিস্ট্রেশন পোর্টাল", "Registration Portal") : t("নিরাপত্তা পোর্টাল", "Security Portal")}
                    </span>
                    <h3 className="text-lg font-bold mt-1 text-white">
                      {isRegisteringRep ? t("প্রতিনিধি নিবন্ধন ফোরাম", "Representative Registration") : t("কৃষি সংযোগ গেটওয়ে", "Krishi Shongjog Portal")}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <form onSubmit={handleAuthSubmit} className="p-6 space-y-4 text-slate-700">
                {authError && (
                  <div className="p-3 bg-red-50 border border-red-150 text-red-700 rounded-2xl text-xs font-semibold">
                    ⚠️ {authError}
                  </div>
                )}
                {authSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-2xl text-xs font-semibold">
                    ✔ {authSuccess}
                  </div>
                )}

                {isRegisteringRep ? (
                  /* REPRESENTATIVE REGISTRATION FIELD BOARD */
                  <div className="space-y-3.5 max-h-[50vh] overflow-y-auto pr-1 text-slate-705">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {t(
                        "স্থানীয় বাজার দর নিয়মিত মনিটরিং ও প্রেরণের জন্য নিচের সঠিক তথ্যগুলো পূরণ করে আবেদন পেশ করুন।",
                        "Please fill in authentic regional information below to apply as a live price tracking representative."
                      )}
                    </p>

                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-wider">{t("পূর্ণ নাম *", "Full Name *")}</label>
                      <input
                        type="text"
                        required
                        placeholder={t("উদা: আমজাদ হোসেন", "e.g. Amjad Hossain")}
                        value={repRegForm.fullName}
                        onChange={(e) => setRepRegForm({ ...repRegForm, fullName: e.target.value })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-wider">{t("মোবাইল নম্বর *", "Phone Number *")}</label>
                        <input
                          type="tel"
                          required
                          placeholder="017XXXXXXXX"
                          value={repRegForm.phone}
                          onChange={(e) => setRepRegForm({ ...repRegForm, phone: e.target.value })}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-wider">{t("পাসওয়ার্ড *", "Password *")}</label>
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={repRegForm.password}
                          onChange={(e) => setRepRegForm({ ...repRegForm, password: e.target.value })}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-wider">{t("ইমেইল ঠিকানা *", "Email Address *")}</label>
                      <input
                        type="email"
                        required
                        placeholder="rep@example.com"
                        value={repRegForm.email}
                        onChange={(e) => setRepRegForm({ ...repRegForm, email: e.target.value })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-wider">{t("বিভাগ *", "Division *")}</label>
                        <select
                          value={repRegForm.division}
                          onChange={(e) => setRepRegForm({ ...repRegForm, division: e.target.value, district: bdGeography[e.target.value]?.[0] || "" })}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2.5 font-bold text-slate-800"
                        >
                          {Object.keys(bdGeography).map(div => (
                            <option key={div} value={div}>{div}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-wider">{t("জেলা *", "District *")}</label>
                        <select
                          value={repRegForm.district}
                          onChange={(e) => setRepRegForm({ ...repRegForm, district: e.target.value })}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2.5 font-bold text-slate-800"
                        >
                          {bdGeography[repRegForm.division]?.map(dist => (
                            <option key={dist} value={dist}>{dist}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-wider">{t("উপজেলা *", "Upazila *")}</label>
                        <input
                          type="text"
                          required
                          placeholder={t("যেমন: শেরপুর", "e.g. Sherpur")}
                          value={repRegForm.upazila}
                          onChange={(e) => setRepRegForm({ ...repRegForm, upazila: e.target.value })}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-wider">{t("ইউনিয়ন / গ্রাম *", "Union / Village *")}</label>
                        <input
                          type="text"
                          required
                          placeholder={t("যেমন: গোপালপুর", "e.g. Gopalpur")}
                          value={repRegForm.unionOrVillage}
                          onChange={(e) => setRepRegForm({ ...repRegForm, unionOrVillage: e.target.value })}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-[#2c3e50] font-black mb-1 uppercase tracking-wider">
                        📂 {t("ট্রেড লাইসেন্স ইমেজ আপলোড (বাধ্যতামূলক) *", "Business Trade License Image (Required) *")}
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        required
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setRepRegForm(prev => ({ ...prev, tradeLicensePic: reader.result as string }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="w-full text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none transition-colors cursor-pointer"
                      />
                      {repRegForm.tradeLicensePic ? (
                        <div className="mt-2.5 border border-dashed border-emerald-300 rounded-xl overflow-hidden bg-emerald-50/20 max-h-40 flex justify-center items-center relative p-1.5">
                          <img 
                            src={repRegForm.tradeLicensePic} 
                            alt="Trade License Preview" 
                            className="max-h-36 object-contain rounded-lg"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => setRepRegForm(prev => ({ ...prev, tradeLicensePic: "" }))}
                            className="absolute top-1.5 right-1.5 bg-red-600 text-white rounded-full p-1 text-[10px] font-bold leading-none w-5 h-5 flex items-center justify-center cursor-pointer hover:bg-red-700 shadow-md"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <p className="text-[9px] text-[#e67e22] mt-1 font-bold font-sans">
                          ⚠️ {t("অনুগ্রহ করে আপনার ব্যবসায়ের বৈধ ট্রেড লাইসেন্সের ছবি আপলোড করুন।", "Please upload a valid picture of your business trade license.")}
                        </p>
                      )}
                    </div>

                  </div>
                ) : (
                  /* CONSOLIDATED SIGN-IN FIELDS */
                  <div className="space-y-4">
                    <p className="text-xs text-slate-505 leading-relaxed">
                      {t(
                        "এডমিন কন্ট্রোল সেন্টার অথবা অনুমোদিত প্রতিনিধির ড্যাশবোর্ডে সাইন-ইন করতে ব্রাউজারে লগইন তথ্য দিন।",
                        "Please authenticate with your Admin credentials or registered Representative profile below."
                      )}
                    </p>

                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase tracking-wider">
                        {t("ইমেইল ঠিকানা *", "Email Address *")}
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="sabjadulislamsun15@gmail.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 font-bold mb-1.5 uppercase tracking-wider">
                        {t("পাসওয়ার্ড *", "Password *")}
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900"
                      />
                    </div>

                    {/* Developer assistance hint */}
                    <div className="bg-amber-50 rounded-2xl border border-amber-100 p-3 text-[10px] text-amber-800 leading-relaxed">
                      💡 <strong>{t("এডমিন লগইন সাহায্য:", "Admin Credentials Reference:")}</strong><br/>
                      📧 E: <span className="font-mono font-bold select-all bg-amber-100/50 px-1 rounded">sabjadulislamsun15@gmail.com</span><br/>
                      🔑 P: <span className="font-mono font-bold select-all bg-amber-100/50 px-1 rounded">sanjadul123456</span>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (isRegisteringRep) {
                        setIsRegisteringRep(false);
                      } else {
                        setIsOperatorOpen(false);
                      }
                    }}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                  >
                    {t("বন্ধ করুন", "Cancel")}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-emerald-800 hover:bg-emerald-950 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
                  >
                    {isRegisteringRep ? t("আবেদন সাবমিট করুন", "Register Now") : t("লগইন করুন", "Sign In")}
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-100 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegisteringRep(!isRegisteringRep);
                      setAuthSuccess("");
                      setAuthError("");
                    }}
                    className="text-xs text-emerald-700 font-bold hover:underline cursor-pointer"
                  >
                    {isRegisteringRep 
                      ? t("ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন", "Already have an account? Sign in here")
                      : t("অনুমোদিত বাজার প্রতিনিধি হতে চান? আবেদন করুন", "Want to register as regional representative? Apply here")
                    }
                  </button>
                </div>
              </form>
            </div>
          ) : currentUser.role === "protinidhi" ? (
            /* ================= ROLE: PROTINIDHI (REPRESENTATIVE) PANEL ================= */
            <div className="bg-white rounded-3xl max-w-4xl w-full border border-emerald-100 overflow-hidden shadow-2xl animate-in fade-in duration-200 my-8 text-slate-800 font-sans">
              
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-700 via-emerald-800 to-emerald-950 text-white p-6 relative">
                <button 
                  onClick={() => setIsOperatorOpen(false)}
                  className="absolute top-5 right-5 text-emerald-200 hover:text-white bg-black/20 p-2 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[10px] bg-emerald-500/20 text-emerald-250 border border-emerald-500/30 px-2.5 py-0.5 rounded-full uppercase font-black tracking-wider">
                    {t("প্যানেল রিপোর্টার", "Official Regional Panel")}
                  </p>
                </div>
                <h3 className="text-xl font-bold">{t("স্থানীয় বাজার দর দাখিল সেন্টার", "Regional Representative Market Office")}</h3>
                <p className="text-xs text-emerald-100 mt-1">
                  👤 {currentUser.name} ({currentUser.email}) | 📍 <strong>{currentUser.representativeProfile?.upazila}</strong>, {currentUser.representativeProfile?.division}
                </p>
              </div>

              {/* Status Notice Block */}
              {currentUser.status !== "Approved" ? (
                <div className="p-8 text-center space-y-3 bg-amber-50/40 border-b border-amber-100">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-xl mx-auto">⏳</div>
                  <h4 className="text-sm font-black text-amber-900">
                    {currentUser.status === "Rejected" 
                      ? t("দুঃখিত, আপনার আবেদনটি গ্রহণযোগ্য বিবেচিত হয়নি", "Representative Application Rejected")
                      : t("আপনার প্রতিনিধি আবেদন ফাইলটি অনুমোদনের অপেক্ষায় আছে", "Representative Application Pending Approval")
                    }
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    {currentUser.status === "Rejected"
                      ? t("নিরাপত্তা নিয়মের অবমাননার কারণে আবেদন বাতিল করা হয়েছে। অনুসন্ধানের জন্য সাহায্য কেন্দ্রে ইমেইল করুন।", "Your status was marked rejected. Please reach support panel for correction.")
                      : t("সুপার অ্যাডমিন আপনার অ্যাকাউন্ট ফাইল ও তথ্য যাচাই করার পর অ্যাকাউন্টটি সক্রিয় করবেন। সক্রিয় হওয়া মাত্রই আপনি দর হালনাগাদ করতে পারবেন।", "To prevent local black-marketing or false pricing, new reporters must be authorized by Super Admin manually before pricing access is granted.")
                    }
                  </p>
                </div>
              ) : (
                /* Approved Representative workspace */
                <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 max-h-[68vh] overflow-y-auto">
                  
                  {/* Left panel: Add price form */}
                  <div className="md:col-span-12 bg-stone-50 border border-slate-200/80 p-4.5 rounded-2xl h-fit">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest pb-2 border-b border-dashed border-slate-200 mb-3">
                      🌾 {t("নতুন ফসল মূল্য তালিকাভুক্তি", "Submit Local Market Price")}
                    </h4>

                    {repSuccessMsg && <div className="p-2 mb-3 bg-emerald-50 text-emerald-800 text-[11px] rounded-lg border border-emerald-100 font-bold">✔ {repSuccessMsg}</div>}
                    {repErrorMsg && <div className="p-2 mb-3 bg-rose-50 text-rose-750 text-[11px] rounded-lg border border-rose-100 font-medium">⚠️ {repErrorMsg}</div>}

                    {editingPriceObj ? (
                      /* Editing form overlay */
                      <form onSubmit={handleRepPriceEditSubmit} className="space-y-3">
                        <div className="bg-amber-100/40 p-2 text-[10px] text-amber-800 rounded font-bold">
                          🛠 {t("দাখিলকৃত মুল্য সংশোধন", "Editing Submitted Price Block")}
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">{t("পণ্যের নাম *", "Product Name *")}</label>
                          <input
                            type="text"
                            required
                            value={editPriceForm.productName}
                            onChange={(e) => setEditPriceForm({ ...editPriceForm, productName: e.target.value })}
                            className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">{t("বাজার মূল্য (৳) *", "Market Price *")}</label>
                            <input
                              type="number"
                              required
                              value={editPriceForm.price}
                              onChange={(e) => setEditPriceForm({ ...editPriceForm, price: e.target.value })}
                              className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">{t("একক *", "Unit *")}</label>
                            <select
                              value={editPriceForm.unit}
                              onChange={(e) => setEditPriceForm({ ...editPriceForm, unit: e.target.value })}
                              className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2"
                            >
                              <option value="মন">মন</option>
                              <option value="কেজি">কেজি</option>
                              <option value="বস্তা">বস্তা</option>
                              <option value="পিস">পিস</option>
                            </select>
                          </div>
                        </div>

                        <div className="pt-2 flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingPriceObj(null)}
                            className="flex-1 py-2 bg-slate-200 text-slate-800 text-xs font-bold rounded-lg cursor-pointer"
                          >
                            {t("বাতিল", "Cancel")}
                          </button>
                          <button
                            type="submit"
                            className="flex-1 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg cursor-pointer"
                          >
                            {t("সংরক্ষণ", "Save")}
                          </button>
                        </div>
                      </form>
                    ) : (
                      /* Price entry form */
                      <form onSubmit={handleRepPriceSubmit} className="space-y-3.5 text-slate-705">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-wider">{t("ফসল বা শাকসবজি নাম *", "Crop or Product Name *")}</label>
                          <select
                            value={repNewPriceForm.productName}
                            onChange={(e) => setRepNewPriceForm({ ...repNewPriceForm, productName: e.target.value })}
                            className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 font-bold text-slate-800"
                          >
                            <option value="বোরো ধান">বোরো ধান</option>
                            <option value="আমন ধান">আমন ধান</option>
                            <option value="লাল আলু">লাল আলু</option>
                            <option value="পেঁয়াজ">দেশি পেঁয়াজ</option>
                            <option value="রসুন">রসুন</option>
                            <option value="শরিষার তৈল">শরিষার তৈল</option>
                            <option value="পাট">সোনালী পাট</option>
                            <option value="কাঁচা মরিচ">কাঁচা মরিচ</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-wider">{t("বর্তমান দর (৳) *", "Market Price (৳) *")}</label>
                            <input
                              type="number"
                              required
                              placeholder="যেমন: ১৬৫০"
                              value={repNewPriceForm.price}
                              onChange={(e) => setRepNewPriceForm({ ...repNewPriceForm, price: e.target.value })}
                              className="w-full text-xs bg-white border border-slate-202 rounded-lg p-2 focus:outline-none text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-wider">{t("পরিমাপ একক *", "Unit Category *")}</label>
                            <select
                              value={repNewPriceForm.unit}
                              onChange={(e) => setRepNewPriceForm({ ...repNewPriceForm, unit: e.target.value })}
                              className="w-full text-xs bg-white border border-slate-202 rounded-lg p-2 font-bold text-slate-800"
                            >
                              <option value="মন">মন (৪০ কেজি)</option>
                              <option value="কেজি">কেজি (Kilogram)</option>
                              <option value="বস্তা">বস্তা (Sack)</option>
                              <option value="পিস">পিস (Pieces)</option>
                            </select>
                          </div>
                        </div>

                        <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200 text-[10px] space-y-1 text-slate-600">
                          <p>📍 <strong>{t("তালিকাভুক্ত এলাকা:", "Target Region Listing:")}</strong></p>
                          <p>বিভাগ: {currentUser.representativeProfile?.division}, জেলা: {currentUser.representativeProfile?.district}, উপজেলা: {currentUser.representativeProfile?.upazila}</p>
                          <span className="block text-[9px] text-red-500 mt-0.5">* প্রতিনিধি কেবল তার নিজ এলাকার বাজার দাম প্রেরণের নিয়ম রয়েছে।</span>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-emerald-850 hover:bg-emerald-950 text-white text-xs font-black rounded-xl transition-all shadow-sm cursor-pointer"
                        >
                          📢 {t("দর সাবমিট করুন (এডমিন স্ক্রীনিং)", "Submit Local Price (Pending Admin View)")}
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Right panel: Submissions list */}
                  <div className="md:col-span-12 space-y-3 mt-4">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest pb-1 border-b border-slate-100 flex justify-between items-center">
                      <span>📋 {t("আপনার দাখিলকৃত বাজার দরের তালিকা", "Your Historical Submissions")}</span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-bold font-mono">মোট: {repPrices.length}</span>
                    </h4>

                    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                      {repPrices.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 border border-dashed border-slate-202 rounded-2xl text-xs font-medium bg-slate-50/50">
                          🌾 {t("আপনি এখনও কোনো স্থানীয় বাজার দর পাঠাননি।", "You haven't submitted any prices yet.")}
                        </div>
                      ) : (
                        repPrices.map((item) => (
                          <div key={item._id} className="p-3 bg-slate-105 border border-slate-150 rounded-xl flex justify-between items-start gap-4">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[9px] bg-slate-200 text-slate-705 font-bold px-1.5 py-0.5 rounded">{item.unit}</span>
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                  item.status === "Approved" ? "bg-green-100 text-green-800" :
                                  item.status === "Rejected" ? "bg-red-100 text-red-800" :
                                  "bg-yellow-101 text-yellow-850"
                                }`}>
                                  {item.status === "Approved" ? t("অনুমোদিত", "Approved") :
                                   item.status === "Rejected" ? t("খারিজকৃত", "Rejected") :
                                   t("পরীক্ষাধীন", "Pending Approval")
                                  }
                                </span>
                              </div>
                              <h5 className="text-xs font-black text-slate-800 mt-1.5">{item.productName}</h5>
                              <p className="text-[9px] text-slate-400 font-mono mt-0.5">📅 {item.submissionDate} | 📍 {item.upazila}</p>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="block text-xs font-black text-slate-800">৳{item.price}</span>
                              {item.status === "Pending" && (
                                <button
                                  onClick={() => {
                                    setEditingPriceObj(item);
                                    setEditPriceForm({
                                      productName: item.productName,
                                      price: String(item.price),
                                      unit: item.unit,
                                      division: item.division,
                                      district: item.district,
                                      upazila: item.upazila
                                    });
                                  }}
                                  className="mt-1 text-[9px] bg-amber-500 hover:bg-amber-600 text-white font-bold p-1 px-2 rounded hover:shadow-xs transition-all cursor-pointer font-sans"
                                >
                                  ✏ {t("সংশোধন করুন", "Edit Details")}
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* Footer */}
              <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between items-center text-xs">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl cursor-pointer transition-colors"
                >
                  🚪 {t("সাইন-আউট", "Logout")}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOperatorOpen(false)}
                  className="px-5 py-2 ... bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold rounded-xl cursor-pointer"
                >
                  {t("প্যানেল বন্ধ করুন", "Close Panel")}
                </button>
              </div>

            </div>
          ) : currentUser.role === "admin" ? (
            /* ================= ROLE: SUPER ADMIN DASHBOARD ================= */
            <div className="bg-white rounded-3xl max-w-4xl w-full border border-orange-100 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8 text-slate-850 font-sans">
              
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-700 via-orange-850 to-amber-900 text-white p-6 relative">
                <button 
                  onClick={() => setIsOperatorOpen(false)}
                  className="absolute top-5 right-5 text-amber-200 hover:text-white bg-black/20 p-2 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <p className="text-[10px] bg-amber-500/20 text-yellow-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full uppercase font-bold w-fit mb-1">{t("পাওয়ার প্যানেল", "Root Control Panel")}</p>
                <h3 className="text-xl font-bold">{t("সুপার এডমিন কন্ট্রোল সেন্টার & মেম্বার ড্যাশবোর্ড", "Super Admin Control Center & Moderation")}</h3>
                <p className="text-xs text-amber-100/90 leading-relaxed mt-1">
                  👤 {currentUser.name} | {t("সারা দেশের প্রতিনিধি নিবন্ধন ফাইল, শস্য দর অনুমোদন ও সাধারণ বাজার দর নিয়ন্ত্রণ সিস্টেম", "Moderation Hub for Representative registrations, local price lists, and audit logs")}
                </p>
              </div>

              {/* Sub Tabs Selection */}
              <div className="flex border-b border-slate-100 bg-slate-50/50 px-6 pt-3 select-none flex-wrap">
                <button
                  type="button"
                  onClick={() => setAdminSelectedTab("reps")}
                  className={`pb-3 text-xs font-black px-4 border-b-2 transition-all cursor-pointer ${
                    adminSelectedTab === "reps" 
                      ? "border-amber-700 text-amber-900 font-black" 
                      : "border-transparent text-slate-500 hover:text-slate-850"
                  }`}
                >
                  👤 {t("প্রতিনিধি আবেদনসমূহ", "Rep Registrations")} ({adminReps.filter(r => r.status === "Pending").length} {t("নতুন", "New")})
                </button>
                <button
                  type="button"
                  onClick={() => setAdminSelectedTab("prices")}
                  className={`pb-3 text-xs font-black px-4 border-b-2 transition-all cursor-pointer ${
                    adminSelectedTab === "prices" 
                      ? "border-amber-700 text-amber-900 font-black" 
                      : "border-transparent text-slate-500 hover:text-slate-850"
                  }`}
                >
                  🌾 {t("স্থানীয় দর মডারেশন", "Representative Local Prices")} ({adminPriceSubmissions.filter(p => p.status === "Pending").length} {t("মূল্যায়নকারী", "Pending")})
                </button>
                <button
                  type="button"
                  onClick={() => setAdminSelectedTab("logs")}
                  className={`pb-3 text-xs font-black px-4 border-b-2 transition-all cursor-pointer ${
                    adminSelectedTab === "logs" 
                      ? "border-amber-700 text-amber-900 font-black" 
                      : "border-transparent text-slate-500 hover:text-slate-850"
                  }`}
                >
                  📝 {t("অডিট সিস্টেম লগ", "Audit logs")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdminSelectedTab("reps");
                    setIsAdminLoggedIn(true); // fallbacks back to standard lists toggle state
                    setIsAddingCrop(false); 
                    setOperatorTab("prices"); // triggers wholesale
                    setCurrentUser(null); // safely logs out to switch to old framework view if needed
                  }}
                  className="pb-3 text-xs font-bold px-4 text-emerald-800 hover:text-black hover:border-b-2 hover:border-emerald-700 cursor-pointer flex items-center gap-1.5 ml-auto"
                >
                  🏬 {t("পাইকারি ইনডেক্স টুলস", "Wholesale Indices Editor")}
                </button>
              </div>

              {/* Tab Outputs */}
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {adminSelectedTab === "reps" && (
                  /* TAB: REPRESENTATIVE MANAGEMENT */
                  <div className="space-y-4 animate-in fade-in duration-200 text-slate-800">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest pb-1 border-b border-slate-150">{t("প্রতিনিধি ফাইল ও সত্যতা যাচাইকারক বোর্ড", "Representative File & Credentials Audit Board")}</h4>
                    
                    <div className="space-y-3">
                      {adminReps.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 border border-dashed border-slate-200 rounded-xl text-xs bg-slate-50/50 font-semibold text-slate-600">
                          {t("কোনো প্রতিনিধির ডাটাবেস আবেদন পাওয়া যায়নি।", "No representative registration profiles loaded in database.")}
                        </div>
                      ) : (
                        adminReps.map((rep) => (
                          <div key={rep._id} className="p-4 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-extrabold text-slate-900">{rep.fullName}</span>
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                                  rep.status === "Approved" ? "bg-green-100 text-green-800" :
                                  rep.status === "Rejected" ? "bg-red-100 text-red-800" :
                                  "bg-yellow-105 text-yellow-850"
                                }`}>
                                  {rep.status === "Approved" ? t("সক্রিয় প্রতিনিধি", "Verified Official") :
                                   rep.status === "Rejected" ? t("বাতিলকৃত", "Rejected") :
                                   t("অপেক্ষমান", "Pending Review")
                                  }
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-505 mt-1 font-sans">
                                📧 E: {rep.email} | 📞 P: {rep.phone}
                              </p>
                              <p className="text-[10px] text-slate-600 font-medium mt-0.5">
                                📍 এলাকা: {rep.unionOrVillage}, {rep.upazila}, {rep.district}, {rep.division}
                              </p>

                              {rep.tradeLicensePic ? (
                                <div className="mt-2.5">
                                  <p className="text-[10px] font-bold text-[#e67e22] mb-1">
                                    📂 {t("সংযুক্ত ট্রেড লাইসেন্স কপি:", "Attached Trade License:")}
                                  </p>
                                  <div className="relative group max-w-xs border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm p-1">
                                    <img 
                                      src={rep.tradeLicensePic} 
                                      alt="Trade License" 
                                      className="max-h-28 md:max-h-36 object-contain w-auto hover:scale-102 transition-transform duration-200 rounded-lg"
                                      referrerPolicy="no-referrer"
                                    />
                                    <a 
                                      href={rep.tradeLicensePic}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="absolute right-2 bottom-2 bg-emerald-700 text-white text-[9px] font-black px-2 py-1 rounded shadow-md hover:bg-emerald-800 transition-colors uppercase tracking-wider"
                                    >
                                      {t("বড় করে দেখুন ↗", "Zoom View ↗")}
                                    </a>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-[9px] text-red-600 font-bold mt-1 bg-red-50 w-fit px-2 py-0.5 rounded-full">
                                  ⚠️ {t("ট্রেড লাইসেন্স ছবি আপলোড করা হয়নি", "No Trade License Uploaded")}
                                </p>
                              )}
                            </div>

                            <div className="flex gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleRepApproval(rep._id, "Rejected")}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-105 border border-red-200 text-red-700 font-bold text-[10px] rounded-lg transition-all cursor-pointer"
                              >
                                ✖ {t("খারিজ", "Reject")}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRepApproval(rep._id, "Approved")}
                                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-850 text-white font-black text-[10px] rounded-lg transition-all cursor-pointer shadow-sm"
                              >
                                ✔ {t("অনুমোদন দিন", "Approve Application")}
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {adminSelectedTab === "prices" && (
                  /* TAB: REPRESENTATIVE PRICES LIST MODERATION */
                  <div className="space-y-4 animate-in fade-in duration-200 text-slate-800">
                    <h4 className="text-xs font-black text-slate-705 uppercase tracking-widest pb-1 border-b border-slate-150">{t("প্রতিনিধি প্রেরিত স্থানীয় বাজার দর স্ক্রীনিং", "Representative Prices Audit & Wrong Entry Moderation")}</h4>

                    {editingPriceObj && (
                      /* Admin price edit overlay form */
                      <form onSubmit={handleAdminPriceEditSubmit} className="bg-amber-50 p-4 border border-amber-100 rounded-2xl space-y-3.5 mb-4 font-sans text-slate-705">
                        <h5 className="text-xs font-black text-amber-900 border-b border-dashed border-amber-200 pb-1 flex justify-between items-center">
                          <span>🛠 {t("দাখিলকৃত তথ্যে ভুল সংশোধন (Admin Editor Mode)", "Direct Entry Edit Form")}</span>
                          <button type="button" onClick={() => setEditingPriceObj(null)} className="text-slate-400 font-bold">✕</button>
                        </h5>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-650 mb-1">{t("পণ্য/ফসল নাম *", "Product Name *")}</label>
                            <input
                              type="text"
                              required
                              value={editPriceForm.productName}
                              onChange={(e) => setEditPriceForm({ ...editPriceForm, productName: e.target.value })}
                              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-655 mb-1">{t("উপজেলা *", "Upazila *")}</label>
                            <input
                              type="text"
                              required
                              value={editPriceForm.upazila}
                              onChange={(e) => setEditPriceForm({ ...editPriceForm, upazila: e.target.value })}
                              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-650 mb-1">{t("বাজার মূল্য (৳) *", "Market Price *")}</label>
                            <input
                              type="number"
                              required
                              value={editPriceForm.price}
                              onChange={(e) => setEditPriceForm({ ...editPriceForm, price: e.target.value })}
                              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-650 mb-1">{t("পরিমাপ একক *", "Unit *")}</label>
                            <select
                              value={editPriceForm.unit}
                              onChange={(e) => setEditPriceForm({ ...editPriceForm, unit: e.target.value })}
                              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800"
                            >
                              <option value="মন">মন</option>
                              <option value="কেজি">কেজি</option>
                              <option value="বস্তা">বস্তা</option>
                              <option value="পিস">পিস</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                          <button
                            type="button"
                            onClick={() => setEditingPriceObj(null)}
                            className="px-4 py-2 bg-slate-202 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                          >
                            {t("বাতিল করুন", "Cancel")}
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-[#d35400] text-white text-xs font-black rounded-lg cursor-pointer shadow-sm hover:bg-[#a04000]"
                          >
                            {t("তথ্য ঠিক করুন & সেভ দিন", "Save Corrected Data")}
                          </button>
                        </div>
                      </form>
                    )}

                    <div className="space-y-3">
                      {adminPriceSubmissions.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 border border-dashed border-slate-202 rounded-xl text-xs bg-slate-50/50 text-slate-600 font-semibold font-sans">
                          {t("নতুন কোনো স্থানীয় বাজার দর প্রেরিত হয়নি।", "No regional representative pricing entries submitted yet.")}
                        </div>
                      ) : (
                        adminPriceSubmissions.map((item) => (
                          <div key={item._id} className="p-3.5 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col md:flex-row justify-between md:items-center gap-4">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-black text-slate-900">{item.productName}</span>
                                <span className="text-[10px] bg-slate-200 font-extrabold px-1.5 py-0.5 rounded text-slate-705 font-mono font-sans font-bold">৳{item.price} / {item.unit}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                  item.status === "Approved" ? "bg-green-100 text-green-800" :
                                  item.status === "Rejected" ? "bg-rose-100 text-rose-800" :
                                  "bg-amber-105 text-amber-850"
                                }`}>
                                  {item.status === "Approved" ? t("অনুমোদিত ও দৃশ্যমান", "Approved & Live") :
                                   item.status === "Rejected" ? t("বাতিলকৃত", "Rejected") :
                                   t("পরীক্ষাধীন", "Pending Screening")
                                  }
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-605 mt-1 font-semibold font-sans">
                                📍 {item.upazila}, {item.district}, {item.division}
                              </p>
                              <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                                👤 রিপোর্টার: <span className="font-semibold text-slate-600">{item.representativeName}</span> ({item.representativeId}) | 📅 {item.submissionDate}
                              </p>
                            </div>

                            <div className="flex gap-1 shrink-0 font-sans">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPriceObj(item);
                                  setEditPriceForm({
                                    productName: item.productName,
                                    price: String(item.price),
                                    unit: item.unit,
                                    division: item.division,
                                    district: item.district,
                                    upazila: item.upazila
                                  });
                                }}
                                className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
                              >
                                ✏ {t("সম্পাদনা", "Edit")}
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePriceApproval(item._id, "Rejected")}
                                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-rose-700 border border-slate-300 font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
                              >
                                ✖ {t("খারিজ করুন", "Reject")}
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePriceApproval(item._id, "Approved")}
                                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-850 text-white font-black text-[10px] rounded-lg transition-colors cursor-pointer shadow-sm"
                              >
                                ✔ {t("অনুমোদন ও পাবলিশ", "Approve & Go Live")}
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {adminSelectedTab === "logs" && (
                  /* TAB: SYSTEM AUDIT TRAIL LOGS */
                  <div className="space-y-4 animate-in fade-in duration-200 text-slate-800 font-sans">
                    <h4 className="text-xs font-black text-slate-705 uppercase tracking-widest pb-1 border-b border-slate-150">{t("সিস্টেম অডিট ট্রেইল ও ক্রিয়াকলাপ ট্র্যাকার (Audit Logs)", "System Audit Trail & Activity Tracker")}</h4>
                    
                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                      <table className="w-full text-left border-collapse text-xs font-sans">
                        <thead>
                          <tr className="bg-slate-100 text-slate-500 border-b border-slate-200 font-black">
                            <th className="p-3 font-bold uppercase tracking-wider">{t("অপারেটর", "Auditor")}</th>
                            <th className="p-3 font-bold uppercase tracking-wider">{t("ক্রিয়াকলাপ", "Event Action")}</th>
                            <th className="p-3 font-bold uppercase tracking-wider">{t("বিস্তারিত বর্ণনা", "Details Log")}</th>
                            <th className="p-3 font-bold uppercase tracking-wider">{t("সংগঠনের সময়", "Timestamp")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150 bg-white">
                          {adminAuditLogs.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="p-8 text-center text-slate-400 font-bold">
                                {t("ডাটাবেসে কোনো সিস্টেম অডিট ট্রেইল পাওয়া যায়নি।", "No audit trails logged yet.")}
                              </td>
                            </tr>
                          ) : (
                            adminAuditLogs.map((log) => (
                              <tr key={log._id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3 font-semibold text-slate-700 font-mono">{log.adminEmail}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    log.action.includes("Approve") ? "bg-green-100 text-green-800 font-black" :
                                    log.action.includes("Reject") ? "bg-rose-100 text-rose-800 font-black" :
                                    "bg-blue-101 text-blue-800"
                                  }`}>
                                    {log.action}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-605 font-medium">{log.detailsBn}</td>
                                <td className="p-3 font-mono text-[10px] text-slate-400">{log.timestamp}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between items-center text-xs font-sans">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-black rounded-xl cursor-pointer"
                >
                  🚪 {t("সাইন-আউট", "Logout")}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOperatorOpen(false)}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold rounded-xl cursor-pointer pointer-events-auto"
                >
                  {t("মডারেশন প্যানেল বন্ধ করুন", "Close Dashboard")}
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-3xl max-w-4xl w-full border border-orange-100 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
            
            {/* Header branding */}
            <div className="bg-gradient-to-r from-amber-700 via-orange-800 to-amber-900 text-white p-6 relative">
              <button 
                onClick={() => setIsOperatorOpen(false)}
                className="absolute top-5 right-5 text-amber-200 hover:text-white bg-black/20 p-2 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-amber-500/20 border border-amber-400 rounded-2xl flex items-center justify-center text-xl">
                  🛠️
                </div>
                <div>
                  <span className="text-[10px] bg-amber-500/30 text-amber-200 px-2.5 py-0.5 rounded-full uppercase font-black tracking-widest">এডমিন কন্ট্রোল সেন্টার</span>
                  <h3 className="text-xl font-bold mt-1 text-white">কৃষি সংযোগ - অপারেটর ও এডমিন ড্যাশবোর্ড</h3>
                  <p className="text-xs text-amber-100/90 leading-relaxed">আজকের বাজারের পণ্যের দাম আপডেট এবং পণ্যের নতুন আইটেম বা কৃষকের ফসল ব্যবস্থাপনা করুন</p>
                </div>
              </div>
            </div>

            {/* Sub Tabs Selection */}
            <div className="flex border-b border-slate-100 bg-slate-50/50 px-6 pt-3">
              <button
                onClick={() => setOperatorTab("prices")}
                className={`pb-3 text-xs font-bold px-4 border-b-2 transition-all cursor-pointer ${
                  operatorTab === "prices" 
                    ? "border-amber-700 text-amber-900 font-extrabold" 
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                📊 আজকের বাজার দর ও নতুন শস্য লিস্টিং
              </button>
              <button
                onClick={() => setOperatorTab("marketplace")}
                className={`pb-3 text-xs font-bold px-4 border-b-2 transition-all cursor-pointer ${
                  operatorTab === "marketplace" 
                    ? "border-amber-700 text-amber-900 font-extrabold" 
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                🏪 হাটের কৃষকদের আসল ফসল লিস্টিং মডারেশন ({products.length})
              </button>
              <button
                onClick={() => setOperatorTab("news")}
                className={`pb-3 text-xs font-bold px-4 border-b-2 transition-all cursor-pointer ${
                  operatorTab === "news" 
                    ? "border-amber-700 text-amber-900 font-extrabold" 
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                📢 ডেইলি নিউজ ব্রডকাস্টার ({newsList.length})
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="p-6 max-h-[65vh] overflow-y-auto">
              
              {operatorTab === "prices" && (
                <div className="space-y-8 animate-in fade-in duration-200 text-slate-800">
                  
                  {/* Select Crop Crop and Edit Prices Form */}
                  <form onSubmit={handleUpdatePrices} className="space-y-6">
                    <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-100/70">
                      <label className="block text-xs font-bold text-amber-900 mb-2">১. বাজার শস্য বা আইটেম নির্বাচন করুন</label>
                      <select
                        value={adminSelectedCrop?.name || ""}
                        onChange={(e) => {
                          const matched = marketPrices.find(c => c.name === e.target.value);
                          if (matched) setAdminSelectedCrop(matched);
                        }}
                        className="w-full md:w-96 text-xs bg-white border border-slate-300 rounded-xl px-3 py-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      >
                        {marketPrices.map(crop => (
                          <option key={crop.name} value={crop.name}>{crop.name}</option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-500 mt-1.5">
                        * নির্বাচিত শস্যের সাপ্তাহিক ইতিহাস (৭ দিন) ও আজকের সর্বশেষ মূল্য নিচে অঞ্চলভিত্তিক লোড হয়েছে।
                      </p>
                    </div>

                    {adminSelectedCrop && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-sm font-bold text-slate-800">
                            ২. অঞ্চলভিত্তিক বাজার দর মডিফিকেশন (<span className="text-amber-800 font-black">{adminSelectedCrop.name}</span>)
                          </h4>
                          <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-1 rounded-lg border border-emerald-100 font-bold">
                            ৭ দিনের ক্রমাগত চার্ট ডেটা
                          </span>
                        </div>

                        {/* Markets grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          
                          {/* KARWAN BAZAR */}
                          <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-xs font-black text-slate-800">🏛️ কারওয়ান বাজার আড়ত (ঢাকা)</span>
                              <span className="text-[10px] text-slate-400 font-bold font-mono">সর্বশেষ: ৳{adminKB[adminKB.length - 1]}</span>
                            </div>
                            
                            <div className="space-y-2">
                              {/* 7 day price nodes */}
                              <div className="grid grid-cols-7 gap-1">
                                {adminKB.map((val, idx) => (
                                  <div key={idx} className="text-center">
                                    <label className="block text-[8px] text-slate-400 font-bold uppercase mb-1">দিন {idx+1}</label>
                                    <input
                                      type="number"
                                      value={val}
                                      onChange={(e) => {
                                        const nextArr = [...adminKB];
                                        nextArr[idx] = Number(e.target.value);
                                        setAdminKB(nextArr);
                                      }}
                                      className="w-full p-1 text-center font-mono text-xs font-bold border border-slate-200 rounded bg-white"
                                    />
                                  </div>
                                ))}
                              </div>
                              
                              {/* Quick Today price helper */}
                              <div className="pt-2 bg-amber-50/50 p-2 rounded-xl border border-amber-100/60 mt-1">
                                <label className="block text-[10px] font-bold text-amber-800 mb-1">⚡ আজকের নতুন দাম প্রবিষ্ট করুন</label>
                                <input
                                  type="number"
                                  placeholder="উদা: ১২০০ (আইটেমটির আজকের নতুন দাম)"
                                  value={todayKB}
                                  onChange={(e) => setTodayKB(e.target.value)}
                                  className="w-full font-mono text-xs p-1.5 border border-amber-200 rounded bg-white text-slate-800"
                                />
                                <span className="block text-[8px] text-slate-400 mt-0.5">১ ক্লিকে দামটি ৭ম দিনে যোগ হবে এবং ১লা দিনের দাম ডিলিট হবে।</span>
                              </div>
                            </div>
                          </div>

                          {/* BANESWAR HAT */}
                          <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-xs font-black text-slate-800">🌾 বানেশ্বর হাট (রাজশাহী)</span>
                              <span className="text-[10px] text-slate-400 font-bold font-mono">সর্বশেষ: ৳{adminBS[adminBS.length - 1]}</span>
                            </div>
                            
                            <div className="space-y-2">
                              {/* 7 day price nodes */}
                              <div className="grid grid-cols-7 gap-1">
                                {adminBS.map((val, idx) => (
                                  <div key={idx} className="text-center">
                                    <label className="block text-[8px] text-slate-400 font-bold uppercase mb-1">দিন {idx+1}</label>
                                    <input
                                      type="number"
                                      value={val}
                                      onChange={(e) => {
                                        const nextArr = [...adminBS];
                                        nextArr[idx] = Number(e.target.value);
                                        setAdminBS(nextArr);
                                      }}
                                      className="w-full p-1 text-center font-mono text-xs font-bold border border-slate-200 rounded bg-white"
                                    />
                                  </div>
                                ))}
                              </div>
                              
                              {/* Quick Today price helper */}
                              <div className="pt-2 bg-amber-50/50 p-2 rounded-xl border border-amber-100/60 mt-1">
                                <label className="block text-[10px] font-bold text-amber-800 mb-1">⚡ আজকের নতুন দাম প্রবিষ্ট করুন</label>
                                <input
                                  type="number"
                                  placeholder="উদা: ১১৫০"
                                  value={todayBS}
                                  onChange={(e) => setTodayBS(e.target.value)}
                                  className="w-full font-mono text-xs p-1.5 border border-amber-200 rounded bg-white text-slate-800"
                                />
                                <span className="block text-[8px] text-slate-400 mt-0.5">১ ক্লিকে দামটি ৭ম দিনে যোগ হবে এবং ১লা দিনের দাম ডিলিট হবে।</span>
                              </div>
                            </div>
                          </div>

                          {/* MOHASTHANGARH */}
                          <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-xs font-black text-slate-800">🥔 মহাস্থানগড় আড়ত (বগুড়া)</span>
                              <span className="text-[10px] text-slate-400 font-bold font-mono">সর্বশেষ: ৳{adminMH[adminMH.length - 1]}</span>
                            </div>
                            
                            <div className="space-y-2">
                              {/* 7 day price nodes */}
                              <div className="grid grid-cols-7 gap-1">
                                {adminMH.map((val, idx) => (
                                  <div key={idx} className="text-center">
                                    <label className="block text-[8px] text-slate-400 font-bold uppercase mb-1">দিন {idx+1}</label>
                                    <input
                                      type="number"
                                      value={val}
                                      onChange={(e) => {
                                        const nextArr = [...adminMH];
                                        nextArr[idx] = Number(e.target.value);
                                        setAdminMH(nextArr);
                                      }}
                                      className="w-full p-1 text-center font-mono text-xs font-bold border border-slate-200 rounded bg-white"
                                    />
                                  </div>
                                ))}
                              </div>
                              
                              {/* Quick Today price helper */}
                              <div className="pt-2 bg-amber-50/50 p-2 rounded-xl border border-amber-100/60 mt-1">
                                <label className="block text-[10px] font-bold text-amber-800 mb-1">⚡ আজকের নতুন দাম প্রবিষ্ট করুন</label>
                                <input
                                  type="number"
                                  placeholder="উদা: ৩০"
                                  value={todayMH}
                                  onChange={(e) => setTodayMH(e.target.value)}
                                  className="w-full font-mono text-xs p-1.5 border border-amber-200 rounded bg-white text-slate-800"
                                />
                                <span className="block text-[8px] text-slate-400 mt-0.5">১ ক্লিকে দামটি ৭ম দিনে যোগ হবে এবং ১লা দিনের দাম ডিলিট হবে।</span>
                              </div>
                            </div>
                          </div>

                          {/* JESSORE */}
                          <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-xs font-black text-slate-800">🧅 যশোর আড়তদার সমিতি</span>
                              <span className="text-[10px] text-slate-400 font-bold font-mono">সর্বশেষ: ৳{adminJS[adminJS.length - 1]}</span>
                            </div>
                            
                            <div className="space-y-2">
                              {/* 7 day price nodes */}
                              <div className="grid grid-cols-7 gap-1">
                                {adminJS.map((val, idx) => (
                                  <div key={idx} className="text-center">
                                    <label className="block text-[8px] text-slate-400 font-bold uppercase mb-1">দিন {idx+1}</label>
                                    <input
                                      type="number"
                                      value={val}
                                      onChange={(e) => {
                                        const nextArr = [...adminJS];
                                        nextArr[idx] = Number(e.target.value);
                                        setAdminJS(nextArr);
                                      }}
                                      className="w-full p-1 text-center font-mono text-xs font-bold border border-slate-200 rounded bg-white"
                                    />
                                  </div>
                                ))}
                              </div>
                              
                              {/* Quick Today price helper */}
                              <div className="pt-2 bg-amber-50/50 p-2 rounded-xl border border-amber-100/60 mt-1">
                                <label className="block text-[10px] font-bold text-amber-800 mb-1">⚡ আজকের নতুন দাম প্রবিষ্ট করুন</label>
                                <input
                                  type="number"
                                  placeholder="উদা: ৬৫"
                                  value={todayJS}
                                  onChange={(e) => setTodayJS(e.target.value)}
                                  className="w-full font-mono text-xs p-1.5 border border-amber-200 rounded bg-white text-slate-800"
                                />
                                <span className="block text-[8px] text-slate-400 mt-0.5">১ ক্লিকে দামটি ৭ম দিনে যোগ হবে এবং ১লা দিনের দাম ডিলিট হবে।</span>
                              </div>
                            </div>
                          </div>

                        </div>

                        {/* Save Pricing button */}
                        <div className="flex justify-end pt-3">
                          <button
                            type="submit"
                            className="px-6 py-3 bg-gradient-to-r from-amber-700 to-orange-700 text-white font-extrabold text-xs rounded-xl hover:from-amber-800 hover:to-orange-850 cursor-pointer shadow-md transition-all flex items-center gap-1.5"
                          >
                            💾 বাজার মূল্যের পরিবর্তন সংরক্ষণ করুন
                          </button>
                        </div>
                      </div>
                    )}
                  </form>

                  {/* Add New Crop portfolio block */}
                  <div className="border-t border-slate-200 pt-6">
                    <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                      🆕 তালিকায় সম্পূর্ণ নতুন আরেকটি শস্য যোগ করুন (Add New Commodity / Crop Item)
                    </h4>
                    
                    <form onSubmit={handleAddCropPrice} className="bg-slate-50 border border-slate-100 p-5 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <div>
                        <label className="block text-[11px] text-slate-500 font-bold mb-1.5">নতুন শস্যের নাম ও একক *</label>
                        <input
                          type="text"
                          required
                          placeholder="উদা: দেশী পেঁয়াজ (টাকা/কেজি)"
                          value={adminNewCropName}
                          onChange={(e) => setAdminNewCropName(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 font-bold mb-1.5">প্রাথমিক ভিত্তি মূল্য (৳) *</label>
                        <input
                          type="number"
                          required
                          placeholder="উদা: ৭২"
                          value={adminNewCropBasePrice}
                          onChange={(e) => setAdminNewCropBasePrice(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        />
                      </div>
                      <div>
                        <button
                          type="submit"
                          className="w-full py-2.5 bg-amber-800 text-white font-bold text-xs rounded-xl hover:bg-amber-900 shadow-sm cursor-pointer transition-colors"
                        >
                          ➕ তালিকায় নতুন শস্য যুক্ত করুন
                        </button>
                      </div>
                    </form>
                  </div>

                </div>
              )}

              {operatorTab === "marketplace" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  
                  {/* Digital Marketplace Moderation */}
                  <div className="flex justify-between items-center bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                    <div>
                      <h4 className="text-xs font-bold text-emerald-950">হাটসেন্টার মডারেশন টুলস (Marketplace Moderation Panel)</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">সব চাষীদের ফসল এখানে তালিকাভুক্ত আছে। আপনি স্প্যাম বা ফেক তালিকা ডিলিট করতে পারেন।</p>
                    </div>
                    <button
                      onClick={() => {
                        setIsOperatorOpen(false);
                        setIsAddingCrop(true);
                      }}
                      className="px-4 py-2 bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-900 rounded-xl cursor-pointer transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> হাটে ফসল পোস্ট করুন
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <th className="p-3">শস্যের নাম ও ছবি</th>
                          <th className="p-3">চাষী ও যোগাযোগ নং</th>
                          <th className="p-3">অবস্থান</th>
                          <th className="p-3">মূল্য ও পরিমাণ</th>
                          <th className="p-3">অবস্থা (Status)</th>
                          <th className="p-3 text-center">নিষ্কাষণ (Actions)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {products.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/75 text-slate-700 font-medium">
                            <td className="p-3 flex items-center gap-2.5">
                              <img src={p.image} alt={p.cropName} className="w-10 h-10 object-cover rounded-lg border border-slate-100" />
                              <div>
                                <p className="font-bold text-slate-900">{p.cropName}</p>
                                <p className="text-[10px] text-emerald-900 bg-emerald-50 px-1 rounded-md w-fit font-black">{p.category}</p>
                              </div>
                            </td>
                            <td className="p-3">
                              <p className="font-bold text-slate-800">{p.farmerName}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{p.farmerPhone}</p>
                            </td>
                            <td className="p-3 text-[11px] text-slate-600">
                              <MapPin className="w-3.5 h-3.5 text-red-500 inline-block mr-0.5" /> {p.location}
                            </td>
                            <td className="p-3">
                              <p className="font-bold">৳{p.basePrice} প্রতি {p.unit}</p>
                              <p className="text-[10px] text-slate-500">মোট: {p.quantity} {p.unit}</p>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                                p.status === "available" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-850"
                              }`}>
                                {p.status === "available" ? "হাটে সচল" : "বিক্রিত"}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleDeleteProduct(p.id)}
                                className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-semibold rounded-lg text-[10px] transition-colors cursor-pointer"
                              >
                                🗑️ ডিলিট
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}

              {operatorTab === "news" && (
                <div className="space-y-6 animate-in fade-in duration-200 text-slate-800">
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                    <h4 className="text-xs font-bold text-emerald-950">📢 ডেইলি নিউজ ও এমার্জেন্সি ব্রডকাস্ট সিস্টেম</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">এখানে প্রতিদিনের কৃষি সংযোগ নিউজ বুলেটিন সরাসরি প্রচার বা মডারেট করুন। এটি অ্যাপের টপ হেডারে সকলের ফোনে তাৎক্ষণিকভাবে আপডেট হবে।</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Add News Form */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
                        📣 নতুন নিউজ ফ্ল্যাশ যুক্ত করুন (Write News Flash)
                      </h4>

                      <form onSubmit={handleAddNews} className="space-y-3.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                            বিস্তারিত নিউজ (বাংলা) *
                          </label>
                          <textarea
                            rows={2}
                            required
                            value={newNewsTextBn}
                            onChange={(e) => setNewNewsTextBn(e.target.value)}
                            placeholder="উদা: নতুন টিএসপি ও ইউরিয়া সার ক্রয়ে ২৫% সরকারি ভর্তুকির ঘোষণা।"
                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-950"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                            News Description (English) *
                          </label>
                          <textarea
                            rows={2}
                            required
                            value={newNewsTextEn}
                            onChange={(e) => setNewNewsTextEn(e.target.value)}
                            placeholder="e.g. Government announces 25% subsidy on new TSP & Urea fertilizer."
                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-950"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                              সময়সূচী ট্যাগ (বাংলা)
                            </label>
                            <input
                              type="text"
                              value={newNewsDateBn}
                              onChange={(e) => setNewNewsDateBn(e.target.value)}
                              placeholder="উদা: আজ, গতকাল, ৫ ঘণ্টা আগে"
                              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-950"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                              Time Metric (English)
                            </label>
                            <input
                              type="text"
                              value={newNewsDateEn}
                              onChange={(e) => setNewNewsDateEn(e.target.value)}
                              placeholder="e.g. Today, Yesterday, 5h ago"
                              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-950"
                            />
                          </div>
                        </div>

                        <div className="pt-2">
                          <button
                            type="submit"
                            disabled={newsSubmitLoading}
                            className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-950 text-white font-black text-xs rounded-xl cursor-pointer transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            {newsSubmitLoading ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                {t("প্রচার আপলোড করা হচ্ছে..", "Uploading Bulletin..")}
                              </>
                            ) : (
                              <>
                                🚀 {t("সরাসরি খবর প্রচার করুন", "Broadcast Live Bulletin")}
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Active News List */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
                        📋 বর্তমান প্রচার তালিকা (Current Broadcasts)
                      </h4>

                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                        {newsList && newsList.length > 0 ? (
                          newsList.map((n) => (
                            <div key={n.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 flex justify-between items-start gap-4 hover:bg-slate-100/50 transition-colors">
                              <div className="space-y-1">
                                <p className="text-xs font-bold text-slate-900 leading-relaxed">
                                  🇧🇩 {n.textBn}
                                </p>
                                <p className="text-[10px] text-slate-500 leading-relaxed">
                                  🇬🇧 {n.textEn}
                                </p>
                                <div className="flex items-center gap-2 pt-1 text-[9px] font-bold text-emerald-800">
                                  <span className="bg-emerald-100 px-1.5 py-0.5 rounded">
                                    ⏱️ {n.dateBn} | {n.dateEn}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteNews(n.id)}
                                className="p-1 px-2 border border-rose-100 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold rounded-lg transition-all cursor-pointer shrink-0"
                              >
                                🗑️ {t("মুছুন", "Delete")}
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-slate-400 font-bold border border-dashed border-slate-200 rounded-xl">
                            {t("কোনো সংবাদ সক্রিয় নেই।", "No active news items listed.")}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer block */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between items-center gap-2 text-xs">
              <button
                onClick={() => {
                  setIsAdminLoggedIn(false);
                  setAdminPassword("");
                  setAdminError("");
                }}
                className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl cursor-pointer transition-colors"
              >
                🚪 {t("লগআউট", "Logout")}
              </button>
              <button
                onClick={() => setIsOperatorOpen(false)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold rounded-xl cursor-pointer"
              >
                {t("ড্যাশবোর্ড বন্ধ করুন", "Close Dashboard")}
              </button>
            </div>

          </div>
          )}
        </div>
      )}

      {/* Decorative Bottom Credit Line */}
      <footer className="text-center text-[10px] text-slate-400 mt-12 mb-6">
        <p>© ২০২৬ কৃষি সংযোগ প্ল্যাটফর্ম (Krishi Shongjog). গণপ্রজাতন্ত্রী বাংলাদেশ সরকারের কৃষি মন্ত্রণালয় প্রটোকল অনুমোদিত।</p>
        <p className="mt-1">গুগল এআই স্টুডিও ইন্টেলিজেন্ট ইঞ্জিন দ্বারা চালিত।</p>
      </footer>

    </div>
  );
}
