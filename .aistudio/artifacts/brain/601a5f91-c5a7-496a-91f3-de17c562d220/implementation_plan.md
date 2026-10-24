# Medha Exam — ডিভাইস থেকে প্রোফাইল ছবি আপলোড (Cloudinary Signed Upload)

ইউজারদের মোবাইল বা কম্পিউটার থেকে সরাসরি প্রোফাইল ছবি নির্বাচন, ক্লায়েন্ট-সাইডে 512×512 ডাইমেনশনে অপটিমাইজেশন, Netlify Function ও Express ব্যাকএন্ডের মাধ্যমে সুরক্ষিত Cloudinary Signed Upload এবং বিদ্যমান Firestore স্কিমায় সংরক্ষণের পূর্ণাঙ্গ আর্কিটেকচার প্ল্যান।

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **নিরাপত্তা ও কনফিগারেশন সংক্রান্ত গুরুত্বপূর্ণ সিদ্ধান্তসমূহ:**
> 1. **সিক্রেট প্রটেকশন**: `CLOUDINARY_API_SECRET` কখনোই ব্রাউজার বান্ডেল বা গিটহাবে থাকবে না। এটি শুধুমাত্র Netlify Environment Variables এবং ব্যাকএন্ড ফাংশনে থাকবে।
> 2. **অথেনটিকেশন ফিল্টার**: শুধুমাত্র Firebase Authentication-এ লগইন করা ব্যবহারকারীরা তাদের নিজস্ব ইউজার আইডির টোকেন ভেরিফাই করে আপলোড সিগনেচার গ্রহণ করতে পারবে।
> 3. **ক্লায়েন্ট অপটিমাইজেশন**: ২ মেগাবাইট লিমিট যাচাই ও ব্রাউজার ক্যানভাসে স্বয়ংক্রিয়ভাবে ছবিকে সর্বোচ্চ 512×512 পিক্সেল এবং WebP/JPEG ফরম্যাটে অপটিমাইজ করে আপলোড করা হবে, যার ফলে ব্যবহারকারীর মোবাইল ডেটা ও Cloudinary ফ্রি কোটা সাশ্রয় হবে।
> 4. **বিদ্যমান স্কিমা অক্ষত রাখা**: ফায়ারস্টোর `users` কালেকশনে বর্তমান `photoURL` এবং `avatar` ফিল্ডেই ছবির `secure_url` সংরক্ষিত হবে। কোনো নতুন বা অপ্রয়োজনীয় ফিল্ড তৈরি হবে না।

---

### 1. Overview & Core Concept

- **সুবিধা**: শিক্ষার্থীরা তাদের ডিভাইসের গ্যালারি বা ফাইল থেকে ছবি সিলেক্ট করে এক ক্লিকে প্রোফাইল ছবি আপডেট করতে পারবে।
- **ডুয়েল মোড (Dual Mode)**: আগের মতোই ছবির সরাসরি URL ইনপুট অথবা ডেমো অবতার বেছে নেওয়ার সুযোগও কার্যকর থাকবে।
- **লোড বা ব্যর্থতার সুরক্ষা**: আপলোড চলাকালীন প্রোগ্রেস বার প্রদর্শিত হবে। কোনো কারণে নেটওয়ার্ক সমস্যা বা আপলোড ব্যর্থ হলে পূর্বের প্রোফাইল ছবি অপরিবর্তিত থাকবে।

---

### 2. User Experience & Visual Design

1. **ফাইল সিলেকশন ও প্রিভিউ**:
   - "ডিভাইস থেকে ছবি আপলোড করুন" বাটন ও ড্রপ জোন।
   - ছবি নির্বাচনের সাথে সাথে ব্রাউজারে ইনস্ট্যান্ট প্রিভিউ, ফাইলের নাম ও সাইজ ডিসপ্লে।
   - অগ্রহণযোগ্য ফরম্যাট (যেমন: GIF বা PDF) অথবা ২ মেগাবাইটের বেশি সাইজ হলে তাৎক্ষণিক বাংলায় স্পষ্ট এরর নোটিশ।
2. **আপলোড স্টেট ও প্রোগ্রেস**:
   - আপলোড বাটন প্রেস করলে স্পিনার ও প্রোগ্রেস বার (0% থেকে 100%) দৃশ্যমান হবে।
   - সফল হলে সবুজ ব্যাজে কনফার্মেশন ও প্রোফাইল/ড্যাশবোর্ড সর্বত্র নতুন ছবি প্রদর্শন।
   - Cloudinary বা Netlify ফ্রি লিমিট ত্রুটি দেখা দিলে ব্যবহারকারীকে নোটিফিকেশন প্রদান।
3. **ক্লিয়ার ও রিমুভ অপশন**:
   - নির্বাচিত প্রিভিউ বাতিল করার সুযোগ।
   - প্রয়োজনে ছবি ডিফল্ট অবতারে রিসেট করার অপশন।

---

### 3. Key Product Decisions & Trade-Offs

- **Cloudinary Signed Upload vs Direct Unsigned Upload**:
  - *গৃহীত পদ্ধতি*: Serverless Signed Upload (`/api/cloudinary-sign` ও `netlify/functions/cloudinary-sign.ts`)।
  - *কারণ*: আনসাইনড প্রিসেট ব্রাউজারে পাবলিক হয়ে যায় এবং স্প্যাম আপলোডের ঝুঁকি তৈরি করে। সাইনড আপলোডে সার্ভারলেস ফাংশন Firebase ID Token যাচাই করে শুধুমাত্র অনুমোদিত শিক্ষার্থীকেই নির্দিষ্ট পাবলিক আইডিতে নির্দিষ্ট সাইজের ছবি আপলোডের অনুমতি দেয়।
- **ব্রাউজার ক্যানভাস রিসাইজিং (Client-side 512×512 Compression)**:
  - *গৃহীত পদ্ধতি*: আপলোডের আগেই ব্রাউজারের অফ-স্ক্রিন Canvas API ব্যবহার করে ছবিকে 512×512 পিক্সেল ও অপটিমাইজড কোয়ালিটিতে কনভার্ট করা।
  - *কারণ*: ব্যবহারকারীর বড় আকারের 5-10 MB ছবিও ব্রাউজারেই হালকা (৫০-১০০ KB) হয়ে যাবে, ফলে মুহূর্তেই আপলোড হবে এবং Cloudinary স্টোরেজ কোটা দীর্ঘস্থায়ী হবে।

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   Browser (React Client)               │
│                                                        │
│  [File Input] ──► [Format & 2MB Size Validation]       │
│                            │                           │
│                            ▼                           │
│              [Canvas Resize to max 512x512]            │
│                            │                           │
│                            ▼                           │
│              [Instant Local Object URL Preview]        │
└────────────────────────────┬───────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────┐
│            Firebase Auth Identity Check                │
│       auth.currentUser.getIdToken() ──► Bearer Token   │
└────────────────────────────┬───────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────┐
│     Serverless Function: /api/cloudinary-sign          │
│     (Express dev server & netlify/functions)           │
│                                                        │
│  • Verifies Firebase Token & extracts User UID         │
│  • Generates timestamp & sanitized public_id           │
│  • Computes SHA-1 signature with CLOUDINARY_API_SECRET │
│  • Returns: { signature, timestamp, apiKey, cloudName }│
└────────────────────────────┬───────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────┐
│      Cloudinary Secure Upload Endpoint                 │
│      https://api.cloudinary.com/v1_1/{cloud}/image/upload│
│                                                        │
│  • Direct Multi-part FormData upload with progress     │
│  • Returns: { secure_url, public_id }                  │
└────────────────────────────┬───────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────┐
│            Firestore & Auth Synchronization           │
│                                                        │
│  • users/{uid} doc updated: { photoURL, avatar }       │
│  • Firebase updateProfile(auth.currentUser, photoURL)  │
│  • React user state & session synced                   │
└────────────────────────────────────────────────────────┘
```

---

### 5. Required Environment Variables

Netlify Dashboard-এ (`Site configuration` > `Environment variables`) নিচের ভ্যারিয়েবলগুলো যুক্ত করতে হবে:

| Variable Name | Description | Example / Location |
| :--- | :--- | :--- |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary ক্লাউড নাম | Cloudinary Dashboard-এ প্রাপ্ত |
| `CLOUDINARY_API_KEY` | Cloudinary এপিআই কি | Cloudinary Settings > API Keys |
| `CLOUDINARY_API_SECRET` | Cloudinary এপিআই সিক্রেট | Cloudinary Settings > API Keys (গোপন) |

---

### 6. Implementation Scope

1. **`netlify/functions/cloudinary-sign.ts`**:
   - নেটলিফাই সার্ভারলেস ফাংশন যা অথেনটিকেশন টোকেন যাচাই করে সাইনড সিগনেচার প্রদান করে।
2. **`server.ts`**:
   - লোকাল ডেভেলপমেন্ট এবং প্রিভিউ এনভায়রনমেন্টের জন্য `/api/cloudinary-sign` রুট সংযোগ।
3. **`netlify.toml`**:
   - `functions = "netlify/functions"` ডিরেক্টরি এবং `/api/cloudinary-sign` রিরাইট রুল সংযোজন।
4. **`src/utils/imageOptimizer.ts`**:
   - টাইপ ভ্যালিডেশন (JPG, JPEG, PNG, WebP), সাইজ ভ্যালিডেশন (<= 2MB), এবং ক্যানভাস 512×512 স্কেলিং ইউটিলিটি।
5. **`src/services/cloudinaryUploadService.ts`**:
   - ব্যাকএন্ড থেকে সিগনেচার নেওয়া, ক্লাউডিনারি এপিআই-এ প্রোগ্রেস সহ আপলোড ও এরর হ্যান্ডলিং সার্ভিস।
6. **`src/components/ProfileView.tsx`**:
   - ফাইল সিলেক্টর ড্রপবক্স, প্রিভিউ থাম্বনেইল, প্রোগ্রেস বার, আপলোড একশন বাটন এবং ফায়ারস্টোর আপডেট সংযোজন।
