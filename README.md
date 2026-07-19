# 🧠 Marketing Brain

AI marketing team web app — request တစ်ခုရိုက်ထည့်လိုက်ရင် AI CEO က အလုပ်ခွဲပြီး CMO (strategy), Research, Content agents (Text / Picture / Carousel / Reels / Long-form / Newsletter) တွေက campaign တစ်ခုလုံး ထုတ်ပေးပါတယ်။

## အလုပ်လုပ်ပုံ

```
User request
   ↓
CEO  (ဘယ် content format တွေလိုမလဲ ဆုံးဖြတ်)
   ↓
CMO + Research  (တစ်ပြိုင်နက် strategy / research brief ရေး)
   ↓
Content agents  (format တစ်ခုချင်း content ထုတ်)
   ↓
CEO final summary + Action Items  (ညာဘက် panel မှာပြ)
```

- Business info ("brain") ကို Settings မှာထည့်ပြီး browser localStorage မှာ သိမ်းတယ်။
- AI ခေါ်တာအားလုံးက `app/api/agent/route.js` (server) ကနေ Anthropic API ကို ခေါ်တာဖြစ်လို့ API key က browser ထဲ မရောက်ပါဘူး။
- Agent prompt တွေအားလုံး `lib/agents.js` မှာရှိတယ် — စိတ်ကြိုက်ပြင်လို့ရတယ်။

## Local မှာ စမ်းရန်

1. [Node.js](https://nodejs.org) (LTS) ထည့်ထားပါ။
2. `npm install`
3. `.env.example` ကို `.env.local` အဖြစ် copy ကူးပြီး API key ထည့်ပါ (https://console.anthropic.com → API Keys)
4. `npm run dev` → http://localhost:3000

## Vercel မှာ Deploy လုပ်ရန်

1. https://vercel.com → **Add New Project** → ဒီ repo ကို Import။
2. **Environment Variables** မှာ `ANTHROPIC_API_KEY` ထည့်ပါ။
3. **Deploy** နှိပ်ပါ။

## မှတ်ချက်

- **Picture agent က ပုံအစစ် မထုတ်ပါ** — caption + AI image generator မှာသုံးဖို့ image prompt ပဲထုတ်ပေးတယ်။
- Model ကို `ANTHROPIC_MODEL` env variable နဲ့ ပြောင်းလို့ရတယ် (default: `claude-sonnet-5`)။
- Run တစ်ခါမှာ API call ၈-၉ ခုလောက် ခေါ်ပါတယ် — token ကုန်ကျစရိတ်ရှိပါတယ်။
