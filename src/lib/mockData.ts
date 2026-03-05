import {
  type Article,
  type AlertRecord,
  type DistrictRisk,
  type EntityCooccurrenceData,
  type Keyword,
  type Report,
  type Source,
  type TVChannel,
  type SentimentTrendPoint,
  type TopicDistributionItem,
  type SourceVolumeItem,
  type Severity,
  type User,
} from "@/types";

const now = new Date();
const iso = now.toISOString();

export const MOCK_ARTICLES: Article[] = [
  {
    id: "art-1",
    title: "गोरखपुर में विकास कार्यों की तेज़ रफ़्तार, मुख्यमंत्री ने किया निरीक्षण",
    content:
      "गोरखपुर में सड़क, बिजली और स्वास्थ्य से जुड़े कई प्रोजेक्ट्स का निरीक्षण किया गया। विपक्ष ने कुछ योजनाओं की गति पर सवाल उठाए हैं।",
    summary_english:
      "CM visits Gorakhpur to review development projects. Multiple infrastructure works are ongoing with mixed public response.",
    summary_hindi:
      "मुख्यमंत्री ने गोरखपुर में विकास कार्यों की समीक्षा की। कई परियोजनाएँ तेज़ी से चल रही हैं, कुछ पर स्थानीय लोगों ने सवाल भी उठाए।",
    url: "https://example.com/article/gorakhpur-development",
    source_name: "Dainik Jagran Gorakhpur",
    source_type: "print",
    published_at: iso,
    ingested_at: iso,
    language: "hi",
    sentiment: "positive",
    sentiment_score: 78,
    severity: "MEDIUM",
    districts_mentioned: ["Gorakhpur"],
    politicians_mentioned: ["Yogi Adityanath"],
    schemes_mentioned: ["PM Awas Yojana"],
    topics: ["development", "infrastructure"],
    is_law_order: false,
    risk_flag: false,
    swot_tag: "strength",
    misinformation_signal: false,
    alerted: false,
    youtube_video_id: null,
    youtube_timestamp: null,
    keywords_matched: ["गोरखपुर", "विकास"],
  },
  {
    id: "art-2",
    title: "कानपुर में law & order पर सवाल, विपक्ष ने जताई चिंता",
    content:
      "कानपुर में हाल ही में हुई घटनाओं को लेकर विपक्ष ने कानून व्यवस्था को लेकर सरकार पर निशाना साधा है।",
    summary_english:
      "Opposition questions law & order situation in Kanpur after recent incidents.",
    summary_hindi:
      "हालिया घटनाओं के बाद विपक्ष ने कानपुर में कानून व्यवस्था की स्थिति पर चिंता जताई है।",
    url: "https://example.com/article/kanpur-law-order",
    source_name: "ABP Ganga",
    source_type: "tv",
    published_at: iso,
    ingested_at: iso,
    language: "hi",
    sentiment: "negative",
    sentiment_score: 32,
    severity: "CRITICAL",
    districts_mentioned: ["Kanpur Nagar"],
    politicians_mentioned: ["Opposition leaders"],
    schemes_mentioned: [],
    topics: ["law-order", "politics"],
    is_law_order: true,
    risk_flag: true,
    swot_tag: "weakness",
    misinformation_signal: false,
    alerted: true,
    youtube_video_id: "dQw4w9WgXcQ",
    youtube_timestamp: 60,
    keywords_matched: ["कानपुर", "law & order"],
  },
];

export const MOCK_ALERTS: AlertRecord[] = [
  {
    id: "al-1",
    article_id: "art-2",
    severity: "CRITICAL",
    channels: ["whatsapp"],
    message_body:
      "CRITICAL: Law & order concerns reported in Kanpur Nagar. Please review and coordinate with local administration.",
    sent_at: iso,
    article: MOCK_ARTICLES[1],
  },
];

export const MOCK_KEYWORDS: Keyword[] = [
  {
    id: "kw-1",
    term: "law & order",
    term_hindi: "कानून व्यवस्था",
    category: "law_order",
    variants: ["law and order", "कानून-व्यवस्था"],
    is_active: true,
    status: "active",
    created_at: iso,
  },
  {
    id: "kw-2",
    term: "Gorakhpur development",
    term_hindi: "गोरखपुर विकास",
    category: "districts",
    variants: ["gorakhpur vikas"],
    is_active: false,
    status: "pending",
    created_at: iso,
  },
];

export const MOCK_SOURCES: Source[] = [
  {
    id: "src-1",
    name: "ABP Ganga",
    url: "https://abpganga.abplive.com",
    source_type: "tv",
    rss_url: null,
    youtube_channel_id: "UC123TV",
    is_active: true,
    last_scraped_at: iso,
    error_count: 0,
  },
  {
    id: "src-2",
    name: "Dainik Jagran Gorakhpur",
    url: "https://www.jagran.com/local/uttar-pradesh/gorakhpur-news",
    source_type: "print",
    rss_url: "https://example.com/rss/gorakhpur",
    youtube_channel_id: null,
    is_active: true,
    last_scraped_at: iso,
    error_count: 2,
  },
];

export const MOCK_REPORTS: Report[] = [
  {
    id: "rep-1",
    report_type: "daily",
    report_date: iso,
    summary_text:
      "Law & order concerns in Kanpur dominated coverage, while Gorakhpur development projects received positive local media.",
    download_url: "https://example.com/report/daily.pdf",
    created_at: iso,
  },
];

export const MOCK_DISTRICT_RISK: DistrictRisk[] = [
  {
    district: "Kanpur Nagar",
    district_hindi: "कानपुर नगर",
    risk_score: 85,
    article_count: 12,
    critical_count: 3,
    high_count: 4,
    dominant_sentiment: "negative",
    top_topics: ["law-order", "crime"],
    latest_headline: "कानपुर में law & order पर सवाल, विपक्ष ने जताई चिंता",
  },
  {
    district: "Gorakhpur",
    district_hindi: "गोरखपुर",
    risk_score: 35,
    article_count: 9,
    critical_count: 0,
    high_count: 1,
    dominant_sentiment: "positive",
    top_topics: ["development", "infrastructure"],
    latest_headline: "गोरखपुर में विकास कार्यों की तेज़ रफ़्तार",
  },
];

export const MOCK_SENTIMENT_TREND: SentimentTrendPoint[] = [
  {
    timestamp: iso,
    positive: 12,
    negative: 5,
    neutral: 3,
  },
  {
    timestamp: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
    positive: 8,
    negative: 7,
    neutral: 4,
  },
];

export const MOCK_TOPIC_DISTRIBUTION: TopicDistributionItem[] = [
  { topic: "law-order", count: 10 },
  { topic: "development", count: 8 },
  { topic: "governance", count: 5 },
];

export const MOCK_SOURCE_VOLUME: SourceVolumeItem[] = [
  { source_name: "ABP Ganga", source_type: "tv", count: 14 },
  { source_name: "Dainik Jagran Gorakhpur", source_type: "print", count: 9 },
  { source_name: "Online Portal XYZ", source_type: "online", count: 6 },
];

export const MOCK_SEVERITY_DISTRIBUTION: Record<Severity, number> = {
  CRITICAL: 3,
  HIGH: 5,
  MEDIUM: 7,
  LOW: 10,
};

export const MOCK_ENTITY_GRAPH: EntityCooccurrenceData = {
  nodes: [
    { id: "Yogi Adityanath", label: "Yogi Adityanath", type: "politicians", count: 12 },
    { id: "Gorakhpur", label: "Gorakhpur", type: "districts", count: 9 },
    { id: "Kanpur Nagar", label: "Kanpur Nagar", type: "districts", count: 11 },
    { id: "PM Awas Yojana", label: "PM Awas Yojana", type: "schemes", count: 5 },
  ],
  links: [
    { source: "Yogi Adityanath", target: "Gorakhpur", weight: 8 },
    { source: "Yogi Adityanath", target: "PM Awas Yojana", weight: 4 },
    { source: "Kanpur Nagar", target: "Yogi Adityanath", weight: 2 },
  ],
};

export const MOCK_TV_CHANNELS: TVChannel[] = [
  {
    id: "tv-1",
    name: "ABP Ganga",
    youtube_channel_id: "UC123TV",
    is_active: true,
    is_live: true,
    last_checked: iso,
    last_transcript:
      "कानपुर में हुई घटना पर विशेषज्ञों ने कहा कि पुलिस को और सख्ती दिखानी होगी…",
    today_severity: "CRITICAL",
  },
  {
    id: "tv-2",
    name: "News18 UP Uttarakhand",
    youtube_channel_id: "UCNEWS18",
    is_active: true,
    is_live: false,
    last_checked: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
    last_transcript: "आज के कार्यक्रम में देखते हैं यूपी के विकास कार्यों की ग्राउंड रिपोर्ट…",
    today_severity: "MEDIUM",
  },
];

export const MOCK_USERS: User[] = [
  {
    id: "u-1",
    name: "Admin User",
    email: "admin@dipr.up.gov.in",
    role: "ADMIN",
    is_active: true,
  },
  {
    id: "u-2",
    name: "Media Analyst",
    email: "analyst@dipr.up.gov.in",
    role: "ANALYST",
    is_active: true,
  },
  {
    id: "u-3",
    name: "Viewer User",
    email: "viewer@dipr.up.gov.in",
    role: "VIEWER",
    is_active: true,
  },
];

