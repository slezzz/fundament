export interface BrandRecord {
  id: string;
  name: string;
  /** Tokens matched in domain labels (lowercase ASCII). Tokens under 5 chars only match as a whole hyphen part. */
  tokens: string[];
  /** Official registrable domains. Subdomains of these are official too. */
  domains: string[];
  /** `<token>.<ccTLD>` (amazon.de, google.co.uk) counts as official. */
  ccTlds?: boolean;
  /**
   * Regional banks run legit `<token>-<city>.de` domains (sparkasse-hannover.de).
   * A hyphen combo on a DE/AT/CH ending is only flagged when the other part is a phishing keyword.
   */
  regional?: boolean;
  /** Brand name is a common word: never match it in page titles, only in domains. */
  noContentMatch?: boolean;
  /** Extra names matched in page titles / logos (case-insensitive, whole word). */
  contentNames?: string[];
}

/**
 * High-abuse consumer brands. Keep official domains conservative.
 * This catalog is versioned with the engine, not a live feed.
 */
export const BRANDS: BrandRecord[] = [
  // Payments
  { id: "paypal", name: "PayPal", tokens: ["paypal"], domains: ["paypal.com", "paypal.me", "paypalobjects.com", "paypal-community.com", "braintreegateway.com"], ccTlds: true },
  { id: "venmo", name: "Venmo", tokens: ["venmo"], domains: ["venmo.com"] },
  { id: "stripe", name: "Stripe", tokens: ["stripe"], domains: ["stripe.com", "stripe.network"], noContentMatch: true },
  { id: "klarna", name: "Klarna", tokens: ["klarna"], domains: ["klarna.com", "klarna.net"], ccTlds: true },
  { id: "wise", name: "Wise", tokens: ["transferwise"], domains: ["wise.com", "transferwise.com"], noContentMatch: true },
  { id: "revolut", name: "Revolut", tokens: ["revolut"], domains: ["revolut.com", "revolut.me"] },
  { id: "amex", name: "American Express", tokens: ["americanexpress", "amex"], domains: ["americanexpress.com", "aexp.com"], contentNames: ["Amex"] },
  { id: "mastercard", name: "Mastercard", tokens: ["mastercard"], domains: ["mastercard.com", "mastercard.de", "mastercard.us"] },
  { id: "payoneer", name: "Payoneer", tokens: ["payoneer"], domains: ["payoneer.com"] },
  { id: "skrill", name: "Skrill", tokens: ["skrill"], domains: ["skrill.com"] },
  { id: "cashapp", name: "Cash App", tokens: ["cashapp"], domains: ["cash.app", "cash.me", "squareup.com"] },
  { id: "zelle", name: "Zelle", tokens: ["zelle", "zellepay"], domains: ["zellepay.com", "zelle.com"] },

  // Big tech / accounts
  { id: "apple", name: "Apple", tokens: ["apple", "icloud", "appleid", "itunes"], domains: ["apple.com", "icloud.com", "appleid.com", "apple.news", "itunes.com", "cdn-apple.com", "mzstatic.com", "apple-cloudkit.com"], ccTlds: true, contentNames: ["iCloud", "Apple ID", "Apple Account"] },
  {
    id: "microsoft",
    name: "Microsoft",
    tokens: ["microsoft", "office365", "outlook", "hotmail", "onedrive", "sharepoint", "msonline", "microsoftonline", "xbox", "skype"],
    domains: [
      "microsoft.com", "live.com", "office.com", "office.net", "office365.com", "outlook.com", "hotmail.com",
      "microsoftonline.com", "windows.net", "windows.com", "onedrive.com", "sharepoint.com", "msauth.net",
      "msftauth.net", "msn.com", "bing.com", "skype.com", "xbox.com", "azure.com", "azureedge.net",
      "microsoft365.com", "cloud.microsoft", "msecnd.net", "aka.ms", "visualstudio.com", "github.com",
    ],
    contentNames: ["Office 365", "Microsoft 365", "Outlook", "OneDrive", "SharePoint"],
  },
  {
    id: "google",
    name: "Google",
    tokens: ["google", "gmail", "youtube", "googledrive"],
    domains: [
      "google.com", "gmail.com", "youtube.com", "youtu.be", "gstatic.com", "googleusercontent.com", "recaptcha.net",
      "googleapis.com", "googlevideo.com", "ggpht.com", "googlesyndication.com", "googleadservices.com",
      "googletagmanager.com", "google-analytics.com", "doubleclick.net", "withgoogle.com", "goo.gl", "g.co",
      "googlemail.com", "android.com", "chromium.org", "chrome.com", "blogger.com", "blogspot.com", "gvt1.com", "gvt2.com",
    ],
    ccTlds: true,
    contentNames: ["Gmail", "Google Drive", "Google Docs", "Google Account"],
  },
  { id: "amazon", name: "Amazon", tokens: ["amazon", "primevideo", "amazonprime"], domains: ["amazon.com", "amzn.com", "amzn.to", "amazonaws.com", "media-amazon.com", "ssl-images-amazon.com", "primevideo.com", "amazon-adsystem.com", "aboutamazon.com", "a2z.com"], ccTlds: true, contentNames: ["Amazon Prime", "Prime Video"] },
  { id: "meta", name: "Meta", tokens: ["facebook", "instagram", "whatsapp", "messenger"], domains: ["facebook.com", "instagram.com", "whatsapp.com", "whatsapp.net", "meta.com", "fb.com", "fbcdn.net", "messenger.com", "fb.me", "cdninstagram.com"], noContentMatch: true, contentNames: ["Facebook", "Instagram", "WhatsApp"] },
  { id: "netflix", name: "Netflix", tokens: ["netflix"], domains: ["netflix.com", "nflxvideo.net", "nflximg.net", "nflxext.com"] },
  { id: "spotify", name: "Spotify", tokens: ["spotify"], domains: ["spotify.com", "scdn.co", "spotify.link"] },
  { id: "disney", name: "Disney+", tokens: ["disneyplus"], domains: ["disneyplus.com", "disney.com", "bamgrid.com"] },
  { id: "yahoo", name: "Yahoo", tokens: ["yahoo"], domains: ["yahoo.com", "yimg.com", "aol.com"], ccTlds: true },
  { id: "linkedin", name: "LinkedIn", tokens: ["linkedin"], domains: ["linkedin.com", "licdn.com", "lnkd.in"] },
  { id: "twitter", name: "X", tokens: ["twitter"], domains: ["twitter.com", "x.com", "t.co", "twimg.com"], noContentMatch: true, contentNames: ["Twitter"] },
  { id: "tiktok", name: "TikTok", tokens: ["tiktok"], domains: ["tiktok.com", "tiktokcdn.com", "tiktokv.com"] },
  { id: "snapchat", name: "Snapchat", tokens: ["snapchat"], domains: ["snapchat.com", "snap.com"] },
  { id: "discord", name: "Discord", tokens: ["discord"], domains: ["discord.com", "discord.gg", "discordapp.com", "discordapp.net", "discord.media"] },
  { id: "telegram", name: "Telegram", tokens: ["telegram"], domains: ["telegram.org", "t.me", "telegram.me"] },
  { id: "signal", name: "Signal", tokens: ["signalapp"], domains: ["signal.org"], noContentMatch: true },
  { id: "zoom", name: "Zoom", tokens: ["zoomus"], domains: ["zoom.us", "zoom.com", "zoomgov.com"], noContentMatch: true },
  { id: "dropbox", name: "Dropbox", tokens: ["dropbox"], domains: ["dropbox.com", "dropboxusercontent.com", "db.tt"] },
  { id: "wetransfer", name: "WeTransfer", tokens: ["wetransfer"], domains: ["wetransfer.com", "we.tl"] },
  { id: "docusign", name: "DocuSign", tokens: ["docusign"], domains: ["docusign.com", "docusign.net"] },
  { id: "adobe", name: "Adobe", tokens: ["adobe", "acrobat"], domains: ["adobe.com", "adobelogin.com", "adobe.io", "typekit.net", "adobesign.com"] },
  { id: "salesforce", name: "Salesforce", tokens: ["salesforce"], domains: ["salesforce.com", "force.com", "my.salesforce.com"] },
  { id: "atlassian", name: "Atlassian", tokens: ["atlassian"], domains: ["atlassian.com", "atlassian.net", "bitbucket.org", "trello.com"] },
  { id: "slack", name: "Slack", tokens: ["slack"], domains: ["slack.com", "slack-edge.com"], noContentMatch: true },
  { id: "github", name: "GitHub", tokens: ["github"], domains: ["github.com", "github.io", "githubusercontent.com", "githubassets.com", "ghcr.io"] },
  { id: "gitlab", name: "GitLab", tokens: ["gitlab"], domains: ["gitlab.com", "gitlab.io"] },
  { id: "cloudflare", name: "Cloudflare", tokens: ["cloudflare"], domains: ["cloudflare.com", "cloudflare.net", "cloudflareinsights.com", "cloudflare-dns.com", "one.one.one.one"] },
  { id: "shopify", name: "Shopify", tokens: ["shopify"], domains: ["shopify.com", "myshopify.com", "shopifycdn.com", "shop.app"] },
  { id: "proton", name: "Proton", tokens: ["protonmail"], domains: ["proton.me", "protonmail.com", "pm.me"] },
  { id: "gmx", name: "GMX", tokens: ["gmx"], domains: ["gmx.net", "gmx.de", "gmx.com", "gmx.at", "gmx.ch"] },
  { id: "webde", name: "WEB.DE", tokens: ["webde"], domains: ["web.de"], contentNames: ["WEB.DE"] },
  { id: "tonline", name: "t-online", tokens: ["tonline"], domains: ["t-online.de"] },

  // Password managers
  { id: "lastpass", name: "LastPass", tokens: ["lastpass"], domains: ["lastpass.com"] },
  { id: "onepassword", name: "1Password", tokens: ["onepassword", "1password"], domains: ["1password.com", "1password.ca", "1password.eu"] },
  { id: "bitwarden", name: "Bitwarden", tokens: ["bitwarden"], domains: ["bitwarden.com", "bitwarden.eu"] },

  // Shops / marketplaces
  { id: "ebay", name: "eBay", tokens: ["ebay"], domains: ["ebay.com", "ebayimg.com", "ebaystatic.com", "ebay-kleinanzeigen.de", "kleinanzeigen.de"], ccTlds: true },
  { id: "kleinanzeigen", name: "Kleinanzeigen", tokens: ["kleinanzeigen"], domains: ["kleinanzeigen.de", "ebay-kleinanzeigen.de"] },
  { id: "etsy", name: "Etsy", tokens: ["etsy"], domains: ["etsy.com", "etsystatic.com"] },
  { id: "aliexpress", name: "AliExpress", tokens: ["aliexpress"], domains: ["aliexpress.com", "aliexpress.us", "alicdn.com", "alibaba.com"] },
  { id: "temu", name: "Temu", tokens: ["temu"], domains: ["temu.com", "kwcdn.com"] },
  { id: "shein", name: "SHEIN", tokens: ["shein"], domains: ["shein.com", "ltwebstatic.com"], ccTlds: true },
  { id: "zalando", name: "Zalando", tokens: ["zalando"], domains: ["zalando.com", "ztat.net"], ccTlds: true },
  { id: "otto", name: "OTTO", tokens: ["ottode"], domains: ["otto.de"], noContentMatch: true },
  { id: "ikea", name: "IKEA", tokens: ["ikea"], domains: ["ikea.com", "ikea.net"], ccTlds: true },
  { id: "lidl", name: "Lidl", tokens: ["lidl"], domains: ["lidl.com", "lidl.de"], ccTlds: true },
  { id: "aldi", name: "ALDI", tokens: ["aldi", "aldisued", "aldinord"], domains: ["aldi.com", "aldi-sued.de", "aldi-nord.de", "aldi.de", "aldi.us", "aldi.co.uk"] },
  { id: "mediamarkt", name: "MediaMarkt", tokens: ["mediamarkt"], domains: ["mediamarkt.de", "mediamarkt.at", "mediamarkt.ch", "mediamarkt.nl", "mediamarkt.es"] },
  { id: "walmart", name: "Walmart", tokens: ["walmart"], domains: ["walmart.com", "walmartimages.com", "walmart.ca"] },
  { id: "bestbuy", name: "Best Buy", tokens: ["bestbuy"], domains: ["bestbuy.com", "bestbuy.ca"] },
  { id: "booking", name: "Booking.com", tokens: ["booking"], domains: ["booking.com", "bstatic.com"], noContentMatch: true, contentNames: ["Booking.com"] },
  { id: "airbnb", name: "Airbnb", tokens: ["airbnb"], domains: ["airbnb.com", "airbnb.de", "muscache.com"], ccTlds: true },

  // Logistics
  { id: "dhl", name: "DHL", tokens: ["dhl", "dhlpaket", "dhlexpress"], domains: ["dhl.com", "dhl.de", "dhl.at", "dhl.ch", "dhl.nl", "dhl-paket.de", "dpdhl.com", "deutschepost.de"], ccTlds: true },
  { id: "deutschepost", name: "Deutsche Post", tokens: ["deutschepost"], domains: ["deutschepost.de", "deutsche-post.de", "dhl.de", "efiliale.de"] },
  { id: "ups", name: "UPS", tokens: ["ups"], domains: ["ups.com"], noContentMatch: true },
  { id: "fedex", name: "FedEx", tokens: ["fedex"], domains: ["fedex.com"] },
  { id: "usps", name: "USPS", tokens: ["usps"], domains: ["usps.com", "usps.gov"] },
  { id: "dpd", name: "DPD", tokens: ["dpd"], domains: ["dpd.com", "dpd.de", "dpd.at", "dpd.co.uk", "dpdgroup.com"], ccTlds: true },
  { id: "hermes", name: "Hermes", tokens: ["myhermes", "hermesworld"], domains: ["myhermes.de", "hermesworld.com", "hermes-europe.eu", "myhermes.co.uk", "evri.com"], noContentMatch: true, contentNames: ["myHermes", "Hermes Paketshop"] },
  { id: "gls", name: "GLS", tokens: ["gls"], domains: ["gls-group.com", "gls-group.eu", "gls-pakete.de", "gls-germany.com"], noContentMatch: true },
  { id: "royalmail", name: "Royal Mail", tokens: ["royalmail"], domains: ["royalmail.com", "royalmailgroup.com"] },
  { id: "postnl", name: "PostNL", tokens: ["postnl"], domains: ["postnl.nl", "postnl.com"] },
  { id: "post-at", name: "Österreichische Post", tokens: ["postat"], domains: ["post.at"] },
  { id: "swisspost", name: "Swiss Post", tokens: ["swisspost"], domains: ["post.ch", "swisspost.ch"] },

  // Banks (DE / AT / CH)
  { id: "sparkasse", name: "Sparkasse", tokens: ["sparkasse", "sparkassen"], domains: ["sparkasse.de", "sparkasse.at", "s-finanzgruppe.de", "sparkassen-finanzportal.de", "sparkasse.net", "haspa.de"], regional: true },
  { id: "volksbank", name: "Volksbank", tokens: ["volksbank", "raiffeisenbank", "vrbank"], domains: ["vr.de", "volksbank.de", "bvr.de", "atruvia.de", "raiffeisen.at", "raiffeisen.ch", "volksbank.at"], regional: true, contentNames: ["Volksbanken Raiffeisenbanken", "Raiffeisenbank"] },
  { id: "postbank", name: "Postbank", tokens: ["postbank"], domains: ["postbank.de"] },
  { id: "deutschebank", name: "Deutsche Bank", tokens: ["deutschebank"], domains: ["deutsche-bank.de", "db.com", "deutschebank.de"] },
  { id: "commerzbank", name: "Commerzbank", tokens: ["commerzbank"], domains: ["commerzbank.de", "commerzbank.com"] },
  { id: "comdirect", name: "comdirect", tokens: ["comdirect"], domains: ["comdirect.de"] },
  { id: "ing", name: "ING", tokens: ["ingdiba", "ingbank"], domains: ["ing.de", "ing.com", "ing.nl", "ing.be", "ing.at", "ing-diba.de"], noContentMatch: true, contentNames: ["ING-DiBa"] },
  { id: "dkb", name: "DKB", tokens: ["dkb"], domains: ["dkb.de"] },
  { id: "n26", name: "N26", tokens: ["n26"], domains: ["n26.com"] },
  { id: "consorsbank", name: "Consorsbank", tokens: ["consorsbank", "consors"], domains: ["consorsbank.de", "consorsfinanz.de"] },
  { id: "targobank", name: "TARGOBANK", tokens: ["targobank"], domains: ["targobank.de"] },
  { id: "hypovereinsbank", name: "HypoVereinsbank", tokens: ["hypovereinsbank", "hvb"], domains: ["hypovereinsbank.de", "hvb.de", "unicredit.de"] },
  { id: "santander", name: "Santander", tokens: ["santander"], domains: ["santander.de", "santander.com", "santander.co.uk", "santanderbank.com"], ccTlds: true },
  { id: "tradegate", name: "Trade Republic", tokens: ["traderepublic"], domains: ["traderepublic.com"] },
  { id: "scalable", name: "Scalable Capital", tokens: ["scalablecapital"], domains: ["scalable.capital", "de.scalable.capital"] },
  { id: "erste", name: "Erste Bank", tokens: ["erstebank", "georgeat"], domains: ["erstebank.at", "sparkasse.at", "george.at", "erstegroup.com"] },
  { id: "ubs", name: "UBS", tokens: ["ubs"], domains: ["ubs.com"] },
  { id: "postfinance", name: "PostFinance", tokens: ["postfinance"], domains: ["postfinance.ch"] },

  // Banks (UK / US)
  { id: "bankofamerica", name: "Bank of America", tokens: ["bankofamerica", "bofa"], domains: ["bankofamerica.com", "bofa.com"] },
  { id: "chase", name: "Chase", tokens: ["chase", "jpmorgan"], domains: ["chase.com", "jpmorgan.com", "jpmorganchase.com"], noContentMatch: true },
  { id: "wellsfargo", name: "Wells Fargo", tokens: ["wellsfargo"], domains: ["wellsfargo.com", "wf.com"] },
  { id: "citi", name: "Citi", tokens: ["citibank", "citigroup"], domains: ["citi.com", "citibank.com", "citigroup.com"] },
  { id: "capitalone", name: "Capital One", tokens: ["capitalone"], domains: ["capitalone.com"] },
  { id: "barclays", name: "Barclays", tokens: ["barclays", "barclaycard"], domains: ["barclays.co.uk", "barclays.com", "barclaycard.co.uk", "barclaycard.de", "barclays.de"] },
  { id: "hsbc", name: "HSBC", tokens: ["hsbc"], domains: ["hsbc.com", "hsbc.co.uk", "hsbc.de"], ccTlds: true },
  { id: "lloyds", name: "Lloyds", tokens: ["lloydsbank", "lloyds"], domains: ["lloydsbank.com", "lloydsbank.co.uk", "lloydsbankinggroup.com"] },
  { id: "natwest", name: "NatWest", tokens: ["natwest"], domains: ["natwest.com"] },
  { id: "monzo", name: "Monzo", tokens: ["monzo"], domains: ["monzo.com", "monzo.me"] },

  // Government / tax / telco
  { id: "irs", name: "IRS", tokens: ["irs"], domains: ["irs.gov"] },
  { id: "hmrc", name: "HMRC", tokens: ["hmrc"], domains: ["gov.uk", "hmrc.gov.uk"] },
  { id: "elster", name: "ELSTER", tokens: ["elster"], domains: ["elster.de"] },
  { id: "telekom", name: "Telekom", tokens: ["telekom"], domains: ["telekom.de", "telekom.com", "t-mobile.com", "magenta.at"] },
  { id: "vodafone", name: "Vodafone", tokens: ["vodafone"], domains: ["vodafone.de", "vodafone.com", "vodafone.co.uk"], ccTlds: true },
  { id: "o2", name: "O2", tokens: ["o2online"], domains: ["o2online.de", "o2.co.uk", "telefonica.de"], noContentMatch: true },
  { id: "1und1", name: "1&1", tokens: ["1und1"], domains: ["1und1.de", "ionos.de", "ionos.com"] },

  // Gaming
  { id: "steam", name: "Steam", tokens: ["steampowered", "steamcommunity"], domains: ["steampowered.com", "steamcommunity.com", "steamstatic.com", "steam-chat.com", "steamgames.com"], noContentMatch: true, contentNames: ["Steam Community", "Steam Guard"] },
  { id: "epic", name: "Epic Games", tokens: ["epicgames"], domains: ["epicgames.com", "unrealengine.com", "fortnite.com"] },
  { id: "roblox", name: "Roblox", tokens: ["roblox"], domains: ["roblox.com", "rbxcdn.com"] },
  { id: "playstation", name: "PlayStation", tokens: ["playstation"], domains: ["playstation.com", "sonyentertainmentnetwork.com", "playstation.net"] },
  { id: "nintendo", name: "Nintendo", tokens: ["nintendo"], domains: ["nintendo.com", "nintendo.net", "nintendo.de"], ccTlds: true },
  { id: "blizzard", name: "Battle.net", tokens: ["battlenet", "blizzard"], domains: ["battle.net", "blizzard.com"] },
  { id: "riot", name: "Riot Games", tokens: ["riotgames", "leagueoflegends"], domains: ["riotgames.com", "leagueoflegends.com"] },
  { id: "twitch", name: "Twitch", tokens: ["twitch"], domains: ["twitch.tv", "twitchcdn.net", "jtvnw.net"] },

  // Crypto exchanges / wallets / dapps
  { id: "coinbase", name: "Coinbase", tokens: ["coinbase"], domains: ["coinbase.com", "cb-cdn.com", "base.org"] },
  { id: "binance", name: "Binance", tokens: ["binance"], domains: ["binance.com", "binance.us", "bnbchain.org", "bnbstatic.com"] },
  { id: "kraken", name: "Kraken", tokens: ["kraken"], domains: ["kraken.com"], noContentMatch: true },
  { id: "okx", name: "OKX", tokens: ["okx"], domains: ["okx.com"] },
  { id: "bybit", name: "Bybit", tokens: ["bybit"], domains: ["bybit.com"] },
  { id: "kucoin", name: "KuCoin", tokens: ["kucoin"], domains: ["kucoin.com"] },
  { id: "cryptocom", name: "Crypto.com", tokens: ["cryptocom"], domains: ["crypto.com"], contentNames: ["Crypto.com"] },
  { id: "bitpanda", name: "Bitpanda", tokens: ["bitpanda"], domains: ["bitpanda.com"] },
  { id: "bitget", name: "Bitget", tokens: ["bitget"], domains: ["bitget.com"] },
  { id: "gemini", name: "Gemini", tokens: ["geminiexchange"], domains: ["gemini.com"], noContentMatch: true },
  { id: "metamask", name: "MetaMask", tokens: ["metamask"], domains: ["metamask.io", "consensys.io", "consensys.net"] },
  { id: "phantom", name: "Phantom", tokens: ["phantom"], domains: ["phantom.app", "phantom.com"], noContentMatch: true, contentNames: ["Phantom Wallet"] },
  { id: "trustwallet", name: "Trust Wallet", tokens: ["trustwallet"], domains: ["trustwallet.com"] },
  { id: "ledger", name: "Ledger", tokens: ["ledger", "ledgerlive"], domains: ["ledger.com"], noContentMatch: true, contentNames: ["Ledger Live", "Ledger Wallet"] },
  { id: "trezor", name: "Trezor", tokens: ["trezor"], domains: ["trezor.io"] },
  { id: "exodus", name: "Exodus", tokens: ["exodus"], domains: ["exodus.com"], noContentMatch: true, contentNames: ["Exodus Wallet"] },
  { id: "rabby", name: "Rabby", tokens: ["rabby"], domains: ["rabby.io"] },
  { id: "walletconnect", name: "WalletConnect", tokens: ["walletconnect"], domains: ["walletconnect.com", "walletconnect.org", "reown.com"] },
  { id: "myetherwallet", name: "MyEtherWallet", tokens: ["myetherwallet", "mycrypto"], domains: ["myetherwallet.com", "mycrypto.com"] },
  { id: "uniswap", name: "Uniswap", tokens: ["uniswap"], domains: ["uniswap.org", "app.uniswap.org"] },
  { id: "opensea", name: "OpenSea", tokens: ["opensea"], domains: ["opensea.io"] },
  { id: "magiceden", name: "Magic Eden", tokens: ["magiceden"], domains: ["magiceden.io"] },
  { id: "aave", name: "Aave", tokens: ["aave"], domains: ["aave.com"] },
  { id: "oneinch", name: "1inch", tokens: ["1inch"], domains: ["1inch.io", "1inch.com"] },
  { id: "pancakeswap", name: "PancakeSwap", tokens: ["pancakeswap"], domains: ["pancakeswap.finance"] },
  { id: "lido", name: "Lido", tokens: ["lidofi", "stakelido"], domains: ["lido.fi"], noContentMatch: true },
  { id: "raydium", name: "Raydium", tokens: ["raydium"], domains: ["raydium.io"] },
  { id: "jupiter", name: "Jupiter", tokens: ["jupiterexchange", "jupag"], domains: ["jup.ag"], noContentMatch: true },
  { id: "pumpfun", name: "pump.fun", tokens: ["pumpfun"], domains: ["pump.fun"] },
  { id: "arbitrum", name: "Arbitrum", tokens: ["arbitrum"], domains: ["arbitrum.io", "arbitrum.foundation"] },
  { id: "solana", name: "Solana", tokens: ["solana"], domains: ["solana.com", "solana.org"] },

  // AI
  { id: "openai", name: "OpenAI", tokens: ["chatgpt", "openai"], domains: ["openai.com", "chatgpt.com", "oaistatic.com", "oaiusercontent.com", "chat.com", "sora.com"], contentNames: ["ChatGPT"] },
  { id: "anthropic", name: "Anthropic", tokens: ["claude", "anthropic"], domains: ["anthropic.com", "claude.ai", "claude.com", "claudeusercontent.com"], contentNames: ["Claude"] },
  { id: "googleai", name: "Gemini", tokens: ["googlegemini", "geminiai"], domains: ["gemini.google.com", "google.com", "deepmind.com", "deepmind.google"], noContentMatch: true },
  { id: "perplexity", name: "Perplexity", tokens: ["perplexity"], domains: ["perplexity.ai"] },
  { id: "xai", name: "xAI", tokens: ["xai", "grok"], domains: ["x.ai", "grok.com"] },
  { id: "deepseek", name: "DeepSeek", tokens: ["deepseek"], domains: ["deepseek.com"] },
  { id: "midjourney", name: "Midjourney", tokens: ["midjourney"], domains: ["midjourney.com"] },
  { id: "huggingface", name: "Hugging Face", tokens: ["huggingface"], domains: ["huggingface.co", "hf.co"] },
  { id: "copilot", name: "Copilot", tokens: ["copilot"], domains: ["copilot.microsoft.com", "microsoft.com", "github.com", "bing.com"], noContentMatch: true },
];

export const BRAND_CATALOG_VERSION = "2.0.0";
