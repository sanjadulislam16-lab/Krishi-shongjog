import mongoose from "mongoose";

// Helper to sanitize MONGODB_URI when it is misconfigured
export function sanitizeMongoUri(uri: string | undefined): string {
  if (!uri) return "";
  
  const trimmed = uri.trim();
  if (trimmed.startsWith("mongodb+srv://")) {
    let hostPortion = trimmed.substring("mongodb+srv://".length);
    const atIndex = hostPortion.lastIndexOf("@");
    let credentials = "";
    if (atIndex !== -1) {
      credentials = hostPortion.substring(0, atIndex + 1);
      hostPortion = hostPortion.substring(atIndex + 1);
    }
    
    const slashIndex = hostPortion.indexOf("/");
    let hostAndPort = slashIndex !== -1 ? hostPortion.substring(0, slashIndex) : hostPortion;
    
    if (hostAndPort.includes(":")) {
      console.warn(`⚠️ Warning: MONGODB_URI uses 'mongodb+srv://' but includes a port inside '${hostAndPort}'. Converting to direct 'mongodb://' schema.`);
      return "mongodb://" + credentials + hostPortion;
    }
  }
  return trimmed;
}

// Setup mongoose schemas and connection
const MONGODB_URI = sanitizeMongoUri(process.env.MONGODB_URI);

// Connection retry configuration
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds
let isConnected = false;

// 1. SCHEMAS
const BidSchema = new mongoose.Schema({
  id: { type: String, required: true },
  buyerName: { type: String, required: true },
  buyerPhone: { type: String, required: true },
  bidAmount: { type: Number, required: true },
  timestamp: { type: String, required: true }
});

const ProductSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  farmerName: { type: String, required: true },
  farmerPhone: { type: String, required: true },
  cropName: { type: String, required: true },
  category: { type: String, required: true },
  quantity: { type: String, required: true },
  basePrice: { type: Number, required: true },
  unit: { type: String, required: true },
  location: { type: String, required: true },
  image: { type: String, required: true },
  bids: [BidSchema],
  status: { type: String, required: true, enum: ["available", "sold"], default: "available" },
  createdAt: { type: String, required: true },
  description: { type: String }
});

const AgroNewsSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  textBn: { type: String, required: true },
  textEn: { type: String, required: true },
  dateBn: { type: String, required: true },
  dateEn: { type: String, required: true }
});

const CropPriceSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  KarwanBazar: [{ type: Number }],
  Baneswar: [{ type: Number }],
  Mohasthangarh: [{ type: Number }],
  Jessore: [{ type: Number }]
});

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // secure hash
  role: { type: String, required: true, default: "farmer" }, // "admin", "protinidhi", "farmer"
  name: { type: String },
  phone: { type: String },
  walletBalance: { type: Number, default: 14250 }
});

const RepresentativeProfileSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Bcrypt hash
  division: { type: String, required: true },
  district: { type: String, required: true },
  upazila: { type: String, required: true },
  unionOrVillage: { type: String, required: true },
  tradeLicensePic: { type: String, default: "" },
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  createdAt: { type: String, required: true }
});

const ProductPriceSchema = new mongoose.Schema({
  productName: { type: String, required: true },
  price: { type: Number, required: true },
  unit: { type: String, required: true },
  division: { type: String, required: true },
  district: { type: String, required: true },
  upazila: { type: String, required: true },
  representativeId: { type: String, required: true }, // email of representative
  representativeName: { type: String, required: true },
  submissionDate: { type: String, required: true },
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" }
});

const ApprovalLogSchema = new mongoose.Schema({
  actionType: { type: String, required: true }, // "APPROVE_REPRESENTATIVE", "REJECT_REPRESENTATIVE", "APPROVE_PRICE", "REJECT_PRICE", "EDIT_PRICE"
  targetId: { type: String, required: true }, // email/id
  targetName: { type: String, required: true }, // name of crop or person
  performedBy: { type: String, required: true }, // admin email
  details: { type: String, required: true },
  timestamp: { type: String, required: true }
});

const WeatherSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  temp: { type: Number, required: true },
  cond: { type: String, required: true },
  humidity: { type: Number, required: true },
  moisture: { type: String, required: true },
  wind: { type: String, required: true },
  advisory: { type: String, required: true }
});

const AdvisoryChatSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userEmail: { type: String, required: true, default: "guest" },
  message: { type: String, required: true },
  response: { type: String, required: true },
  isMock: { type: Boolean, required: true },
  timestamp: { type: String, required: true }
});

const DiseaseDiagnoseSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userEmail: { type: String, required: true, default: "guest" },
  cropType: { type: String, required: true },
  imageBytes: { type: String, required: true }, // Store base64 securely
  response: { type: String, required: true },
  isMock: { type: Boolean, required: true },
  timestamp: { type: String, required: true }
});

// Export Models
export const ProductModel = (mongoose.models.Product || mongoose.model("Product", ProductSchema)) as any;
export const AgroNewsModel = (mongoose.models.AgroNews || mongoose.model("AgroNews", AgroNewsSchema)) as any;
export const CropPriceModel = (mongoose.models.CropPrice || mongoose.model("CropPrice", CropPriceSchema)) as any;
export const UserModel = (mongoose.models.User || mongoose.model("User", UserSchema)) as any;
export const WeatherModel = (mongoose.models.Weather || mongoose.model("Weather", WeatherSchema)) as any;
export const AdvisoryChatModel = (mongoose.models.AdvisoryChat || mongoose.model("AdvisoryChat", AdvisoryChatSchema)) as any;
export const DiseaseDiagnoseModel = (mongoose.models.DiseaseDiagnose || mongoose.model("DiseaseDiagnose", DiseaseDiagnoseSchema)) as any;
export const RepresentativeProfileModel = (mongoose.models.RepresentativeProfile || mongoose.model("RepresentativeProfile", RepresentativeProfileSchema)) as any;
export const ProductPriceModel = (mongoose.models.ProductPrice || mongoose.model("ProductPrice", ProductPriceSchema)) as any;
export const ApprovalLogModel = (mongoose.models.ApprovalLog || mongoose.model("ApprovalLog", ApprovalLogSchema)) as any;

// Helper: Secure Password Hashing
import crypto from "crypto";
import bcrypt from "bcryptjs";

export function hashPassword(password: string): string {
  const salt = "agro_salt_2026_seeding";
  return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

export function hashBcrypt(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function compareBcrypt(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

// 2. CONNECTION FUNCTION WITH RETRIES
export async function connectToDatabase(): Promise<boolean> {
  if (isConnected) {
    return true;
  }

  if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI environment variable is missing.");
    console.log("ℹ️ Database queries will fall back to local in-memory storage.");
    return false;
  }

  // Validate MONGODB_URI basic structure
  if (!MONGODB_URI.startsWith("mongodb://") && !MONGODB_URI.startsWith("mongodb+srv://")) {
    console.error("❌ Invalid MONGODB_URI format: Must start with 'mongodb://' or 'mongodb+srv://'");
    return false;
  }

  let attempt = 1;
  while (attempt <= MAX_RETRIES) {
    try {
      console.log(`🔌 Attempting to connect to MongoDB Atlas (Attempt ${attempt}/${MAX_RETRIES})...`);
      
      // Configure mongoose connection options
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
      });

      isConnected = true;
      console.log("✅ Successfully connected to MongoDB Atlas!");
      return true;
    } catch (error: any) {
      console.error(`❌ MongoDB Connection Attempt ${attempt} failed:`, error.message);
      attempt++;
      
      if (attempt <= MAX_RETRIES) {
        console.log(`⏱️ Retrying database connection in ${RETRY_DELAY / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  console.error("❌ Failed to connect to MongoDB Atlas after maximum retries.");
  console.log("ℹ️ Database queries will fall back to local in-memory storage for safety.");
  return false;
}

export function isDbConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}
