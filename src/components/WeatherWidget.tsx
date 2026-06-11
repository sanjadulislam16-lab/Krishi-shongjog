import React, { useState, useEffect } from "react";
import { WeatherData } from "../types";
import { Cloud, Sun, CloudRain, Droplets, Wind, MapPin, Activity, HelpCircle, Thermometer, Search, Sparkles } from "lucide-react";

interface WeatherWidgetProps {
  language?: "bn" | "en";
}

export default function WeatherWidget({ language = "bn" }: WeatherWidgetProps) {
  const [weatherList, setWeatherList] = useState<WeatherData[]>([]);
  const [selectedId, setSelectedId] = useState<string>("rajshahi");
  const [loading, setLoading] = useState<boolean>(true);

  // Advanced search states for 64 districts, upazilas and villages
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searching, setSearching] = useState<boolean>(false);
  const [searchedWeather, setSearchedWeather] = useState<WeatherData | null>(null);
  const [searchError, setSearchError] = useState<string>("");

  useEffect(() => {
    fetch("/api/weather")
      .then((res) => res.json())
      .then((res) => {
        if (res.status === "success") {
          setWeatherList(res.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loaded weather data:", err);
        setLoading(false);
      });
  }, []);

  const activeWeather = selectedId === "searched" && searchedWeather 
    ? searchedWeather 
    : (weatherList.find((w) => w.id === selectedId) || weatherList[0]);

  const handleSearchWeather = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError("");
    fetch(`/api/weather/search?location=${encodeURIComponent(searchQuery.trim())}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.status === "success") {
          setSearchedWeather(res.data);
          setSelectedId("searched");
        } else {
          setSearchError(
            language === "bn" 
              ? "উক্ত স্থানের আবহাওয়ার তথ্য খুঁজে পাওয়া যায়নি।" 
              : "Weather forecast data not found for this location."
          );
        }
        setSearching(false);
      })
      .catch((err) => {
        console.error("Error during weather search:", err);
        setSearchError(
          language === "bn" 
            ? "সার্ভার সংযোগ সমস্যা। আবার চেষ্টা করুন।" 
            : "Server connection issue. Please try again."
        );
        setSearching(false);
      });
  };

  const t = (bnText: string, enText: string) => language === "bn" ? bnText : enText;

  const translateText = (text: string) => {
    if (!text) return "";
    if (language === "bn") return text;
    
    // Map of common Bengali weather/location/wind terms to English
    const dict: Record<string, string> = {
      // Regions
      "রাজশাহী": "Rajshahi",
      "বগুড়া": "Bogra",
      "বগুড়া": "Bogra",
      "নওগাঁ": "Naogaon",
      "নাটোর": "Natore",
      "চাঁপাইনবাবগঞ্জ": "Chapainawabganj",
      "পাবনা": "Pabna",
      "সিরাজগঞ্জ": "Sirajganj",
      "জয়পুরহাট": "Joypurhat",
      "ঢাকা": "Dhaka",
      "খুলনা": "Khulna",
      "সিলেট": "Sylhet",
      "রংপুর": "Rangpur",
      "বরিশাল": "Barisal",
      "চট্টগ্রাম": "Chittagong",
      "ময়মনসিংহ": "Mymensingh",
      "দিনাজপুর": "Dinajpur",
      "কুমিল্লা": "Comilla",
      
      // Conditions
      "রৌদ্রোজ্জ্বল আকাশ": "Sunny Sky",
      "আংশিক মেঘলা": "Partly Cloudy",
      "হালকা মাঝারি বৃষ্টি": "Light to Moderate Rain",
      "বজ্রসহ ঝড়ো বৃষ্টি": "Thunderstorms & Wind",
      "তীব্র গরম ও শুষ্ক আবহাওয়া": "Intense Heat & Dry Weather",
      "হালকা বজ্রবৃষ্টি": "Light Thunderstorms",
      "মেঘলা আকাশ": "Cloudy Sky",
      "বৃষ্টি": "Rainy",
      "গরম": "Hot",
      "কুয়াশা": "Foggy",

      // Wind descriptions
      "কিমি/ঘণ্টা": "km/h",
    };
    
    let result = text;
    Object.entries(dict).forEach(([bn, en]) => {
      const regex = new RegExp(bn, "g");
      result = result.replace(regex, en);
    });

    // Translate agricultural advisory strings if matching typical template
    if (result === text && text.length > 30) {
      if (text.includes("ইউরিয়া সার") || text.includes("ইউরিয়া")) {
        return "Avoid applying excess Urea fertilizer. Keep soil well-aerated around vegetables and maintain efficient water drainage.";
      }
      if (text.includes("সেচ প্রয়োগ") || text.includes("সেচ দিন")) {
        return "Slow down heavy irrigation. Spray dilute potassium solution to protect young seedlings from early pest attacks.";
      }
      if (text.includes("বজ্রবৃষ্টির সম্ভাবনা") || text.includes("পানি নিবদ্ধতা")) {
        return "With thunderstorms forecasted during next 3 days, harvest ripe crops immediately and prevent waterlogging.";
      }
      if (text.includes("আর্দ্রতা কমে যাওয়ার") || text.includes("পর্যাপ্ত সেচ")) {
        return "Soil moisture levels are declining. Ensure adequate late afternoon irrigation for orchard trees, particularly mango and litchi.";
      }
      if (text.includes("কীটনাশক স্প্রে") || text.includes("পরিষ্কার আবহাওয়া")) {
        return "Clear and sunny weather. Today is highly recommended for weeding, organic fertilizer application, or customized pesticide sprays.";
      }
      // AI default translator
      return text
        .replace(/\[কৃষি সংযোগ পূর্বাভাস\]/g, "[Agro-Connect Weather Forecast]")
        .replace(/এলাকায় বর্তমানে/g, "area is currently experiencing")
        .replace(/আবহাওয়া বিরাজ করছে। কৃষকদের পরামর্শ:/g, "weather. Advisory for farmers:")
        .replace(/জমিতে/g, "on fields")
        .replace(/করুন/g, "")
        .replace(/করুন।/g, ".");
    }

    return result;
  };

  const getWeatherIcon = (cond: string) => {
    if (cond.includes("বৃষ্টি") || cond.includes("বজ্র")) return <CloudRain className="w-12 h-12 text-blue-500 animate-bounce" />;
    if (cond.includes("মেঘ")) return <Cloud className="w-12 h-12 text-slate-400" />;
    return <Sun className="w-12 h-12 text-amber-500 animate-spin-slow" />;
  };

  const getWeatherBackground = (cond: string) => {
    if (cond.includes("বৃষ্টি") || cond.includes("বজ্র")) {
      return "from-sky-50 to-blue-200 border-blue-200 text-blue-950";
    }
    if (cond.includes("মেঘ")) {
      return "from-slate-50 to-emerald-100 border-emerald-100 text-emerald-950";
    }
    return "from-amber-50 to-orange-100 border-orange-200 text-stone-900";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="relative w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="ml-3 text-emerald-700 font-medium">
          {t("আবহাওয়া তথ্য লোড হচ্ছে...", "Loading weather data...")}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-md border border-emerald-100 rounded-3xl p-6 shadow-xl shadow-emerald-900/5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-100/75 rounded-full mb-2">
            <Activity className="w-3.5 h-3.5" /> {t("সর্বজনীন আবহাওয়া কেন্দ্র", "Universal Agro-Weather Hub")}
          </span>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            {t("৬৪ জেলা, উপজেলা ও গ্রামের আবহাওয়া বার্তা", "64 Districts, Upazilas & Villages Weather Station")}
          </h2>
          <p className="text-sm text-slate-500 font-normal">
            {t("জলবায়ু সংবেদনশীল চাষাবাদ পরিচালনা করুন", "Adapt climate-smart farming solutions")}
          </p>
        </div>
        
        {/* Weather Search Form */}
        <form onSubmit={handleSearchWeather} className="flex gap-1.5 w-full md:w-auto shrink-0">
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              required
              placeholder={t("উপজেলা, ইউনিয়ন বা গ্রামের নাম...", "Search Upazila, Union or Village...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50/90 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium text-slate-800 placeholder:text-slate-400"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-950 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 disabled:opacity-50 cursor-pointer"
          >
            {searching ? t("খোঁজা হচ্ছে...", "Searching...") : t("খুঁজুন", "Search")}
          </button>
        </form>
      </div>

      {/* Popular locations list */}
      <div className="flex flex-wrap items-center gap-1.5 mb-5 pb-4 border-b border-slate-100">
        <span className="text-xs font-black text-slate-400 mr-2">
          {t("📍 প্রধান এলাকাসমূহ:", "📍 Popular Regions:")}
        </span>
        {weatherList.map((w) => (
          <button
            key={w.id}
            onClick={() => {
              setSelectedId(w.id);
              setSearchQuery("");
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all duration-300 ${
              selectedId === w.id
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-500/20"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600"
            }`}
          >
            {translateText(w.name)}
          </button>
        ))}
        {searchedWeather && (
          <button
            onClick={() => setSelectedId("searched")}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all duration-300 flex items-center gap-1 ${
              selectedId === "searched"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/50"
            }`}
          >
            🔍 {translateText(searchedWeather.name)}
          </button>
        )}
      </div>

      {searchError && (
        <div className="p-3 bg-red-50 text-red-800 border border-red-100 rounded-xl text-xs font-semibold mb-4 animate-in fade-in">
          {searchError}
        </div>
      )}

      {activeWeather && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Weather Metric */}
          <div className={`p-6 rounded-3xl bg-gradient-to-br ${getWeatherBackground(activeWeather.cond)} border transition-all duration-300 shadow-sm relative overflow-hidden`}>
            
            {/* AI Generated Tag */}
            {activeWeather.id.startsWith("dyn") && (
              <span className="absolute top-3 right-3 bg-amber-500/20 text-amber-950 font-black text-[9px] px-2 py-0.5 rounded-full border border-amber-400/40 flex items-center gap-0.5 select-none animate-bounce">
                <Sparkles className="w-2.5 h-2.5" /> {t("এআই ভিত্তিক", "AI Generative")}
              </span>
            )}

            <div className="flex justify-between items-start">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-widest bg-white/40 px-2 py-1 rounded-lg w-fit">
                  <MapPin className="w-3.5 h-3.5 text-red-500" /> {translateText(activeWeather.name)}
                </p>
                <h3 className="text-5xl font-mono font-bold mt-4 tracking-tighter">
                  {activeWeather.temp}°C
                </h3>
                <p className="text-base font-bold mt-1 text-slate-900">{translateText(activeWeather.cond)}</p>
              </div>
              <div className="bg-white/90 p-3 rounded-2xl shadow-sm">
                {getWeatherIcon(activeWeather.cond)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-900/10 text-xs">
              <div>
                <span className="block text-slate-600 font-bold mb-0.5">{t("আর্দ্রতা", "Humidity")}</span>
                <p className="font-mono text-base font-bold flex items-center gap-1 text-slate-800">
                  <Droplets className="w-4 h-4 text-sky-500" /> {activeWeather.humidity}%
                </p>
              </div>
              <div>
                <span className="block text-slate-600 font-bold mb-0.5">{t("মাটির আর্দ্রতা", "Soil Moisture")}</span>
                <p className="font-mono text-base font-bold flex items-center gap-1 text-slate-800">
                  <Thermometer className="w-4 h-4 text-emerald-500" /> {translateText(activeWeather.moisture)}
                </p>
              </div>
            </div>
          </div>

          {/* Core Agro-Advisory Message */}
          <div className="lg:col-span-2 flex flex-col justify-between p-6 bg-emerald-950 text-emerald-50 rounded-3xl border border-emerald-800/50 shadow-md">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <h4 className="text-base font-bold tracking-tight text-emerald-200">
                  {t("কৃষকদের জন্য বিশেষ পরামর্শ", "Specialized Action Advisory for Farmers")}
                </h4>
              </div>
              <p className="text-base text-emerald-100/90 leading-relaxed font-semibold">
                {translateText(activeWeather.advisory)}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-emerald-800/40 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-emerald-300">
              <span className="flex items-center gap-1.5 font-semibold">
                <Wind className="w-4 h-4 text-emerald-400" /> {t("বাতাসের গতি:", "Wind Speed:")} {translateText(activeWeather.wind)}
              </span>
              <p className="italic bg-emerald-900/60 px-3 py-1.5 rounded-xl border border-emerald-800/30">
                {t(
                  "* পরামর্শগুলো এবং এআই পূর্বাভাস মডেল দ্বারা সরাসরি ফসল সুরক্ষার্থে পরিবেশিত।",
                  "* Advisories are processed dynamically using our premium AI localized models."
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
