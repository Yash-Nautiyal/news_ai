/**
 * Options for analyst upload form per DIPR_Analyst_Upload_Guide.md
 */

export const CONTENT_LANGUAGE_OPTIONS = [
  { value: "hindi", label: "Hindi" },
  { value: "english", label: "English" },
  { value: "urdu", label: "Urdu" },
  { value: "bhojpuri", label: "Bhojpuri" },
  { value: "awadhi", label: "Awadhi" },
  { value: "mixed", label: "Mixed" },
  { value: "other", label: "Other" },
] as const;

export const SENTIMENT_OPTIONS = [
  { value: "positive", label: "Positive" },
  { value: "negative", label: "Negative" },
  { value: "neutral", label: "Neutral" },
  { value: "mixed", label: "Mixed" },
] as const;

export const TONE_OPTIONS = [
  { value: "critical", label: "Critical" },
  { value: "neutral", label: "Neutral" },
  { value: "supportive", label: "Supportive" },
  { value: "sensational", label: "Sensational" },
  { value: "factual", label: "Factual" },
  { value: "propaganda", label: "Propaganda" },
  { value: "mixed", label: "Mixed" },
] as const;

export const SEVERITY_OPTIONS = [
  { value: "CRITICAL", label: "CRITICAL" },
  { value: "HIGH", label: "HIGH" },
  { value: "MEDIUM", label: "MEDIUM" },
  { value: "LOW", label: "LOW" },
] as const;

export const VERIFICATION_OPTIONS = [
  { value: "unverified", label: "Unverified" },
  { value: "verified", label: "Verified" },
  { value: "partially_verified", label: "Partially verified" },
] as const;

export const SWOT_OPTIONS = [
  { value: "strength", label: "Strength" },
  { value: "weakness", label: "Weakness" },
  { value: "opportunity", label: "Opportunity" },
  { value: "threat", label: "Threat" },
] as const;

export const ACTION_REQUIRED_OPTIONS = [
  { value: "alert_dm", label: "Alert DM" },
  { value: "alert_police", label: "Alert Police / SSP" },
  { value: "alert_cm_office", label: "Alert CM Office" },
  { value: "media_response", label: "Media response" },
  { value: "monitor", label: "Monitor" },
  { value: "ignore", label: "Ignore" },
] as const;

export const BROADCAST_SLOT_OPTIONS = [
  { value: "prime_time", label: "Prime time" },
  { value: "morning", label: "Morning" },
  { value: "daytime", label: "Daytime" },
  { value: "afternoon", label: "Afternoon" },
  { value: "night", label: "Night" },
  { value: "late_night", label: "Late night" },
  { value: "breaking_news", label: "Breaking news" },
] as const;

export const ARTICLE_CATEGORY_OPTIONS = [
  { value: "politics", label: "Politics" },
  { value: "crime", label: "Crime" },
  { value: "health", label: "Health" },
  { value: "education", label: "Education" },
  { value: "economy", label: "Economy" },
  { value: "development", label: "Development" },
  { value: "other", label: "Other" },
] as const;

export const SOURCE_TIER_OPTIONS = [
  { value: "national", label: "National" },
  { value: "state", label: "State" },
  { value: "district", label: "District" },
  { value: "hyperlocal", label: "Hyperlocal" },
] as const;

export const YT_CHANNEL_TYPE_OPTIONS = [
  { value: "official_goup", label: "Official UP government" },
  { value: "media", label: "Media" },
  { value: "citizen", label: "Citizen" },
  { value: "political", label: "Political" },
  { value: "other", label: "Other" },
] as const;

export const VIDEO_TYPE_OPTIONS = [
  { value: "full_video", label: "Full video" },
  { value: "short", label: "Short" },
  { value: "live", label: "Live" },
  { value: "premiere", label: "Premiere" },
] as const;

export const IMAGE_TYPE_OPTIONS = [
  { value: "photograph", label: "Photograph" },
  { value: "infographic", label: "Infographic" },
  { value: "meme", label: "Meme" },
  { value: "screenshot", label: "Screenshot" },
  { value: "poster", label: "Poster" },
  { value: "cartoon", label: "Cartoon" },
  { value: "other", label: "Other" },
] as const;

export const IMAGE_SOURCE_OPTIONS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "facebook", label: "Facebook" },
  { value: "twitter", label: "Twitter" },
  { value: "instagram", label: "Instagram" },
  { value: "telegram", label: "Telegram" },
  { value: "news_photo", label: "News photo" },
  { value: "unknown", label: "Unknown" },
  { value: "other", label: "Other" },
] as const;

export const AUTHENTICITY_OPTIONS = [
  { value: "verified_real", label: "Verified real" },
  { value: "suspected_fake", label: "Suspected fake" },
  { value: "confirmed_fake", label: "Confirmed fake" },
  { value: "unknown", label: "Unknown" },
] as const;

export const WHATSAPP_CONTENT_TYPE_OPTIONS = [
  { value: "text_message", label: "Text message" },
  { value: "image", label: "Image" },
  { value: "video_thumbnail", label: "Video thumbnail" },
  { value: "audio_transcript", label: "Audio transcript" },
  { value: "forward_chain", label: "Forward chain" },
] as const;

export const FORWARDED_AS_OPTIONS = [
  { value: "first_hand", label: "First hand" },
  { value: "forward", label: "Forward" },
  { value: "viral_forward", label: "Viral forward" },
] as const;

export const REACH_ESTIMATE_OPTIONS = [
  { value: "local", label: "Local" },
  { value: "district", label: "District" },
  { value: "divisional", label: "Divisional" },
  { value: "state_wide", label: "State-wide" },
  { value: "unknown", label: "Unknown" },
] as const;

export const CONTENT_CLASSIFICATION_OPTIONS = [
  { value: "rumour", label: "Rumour" },
  { value: "genuine_alert", label: "Genuine alert" },
  { value: "political_message", label: "Political message" },
  { value: "criminal_threat", label: "Criminal threat" },
  { value: "public_complaint", label: "Public complaint" },
  { value: "government_communication", label: "Government communication" },
  { value: "misinformation", label: "Misinformation" },
  { value: "other", label: "Other" },
] as const;

export const MANUAL_REPORT_TYPE_OPTIONS = [
  { value: "field_intelligence", label: "Field intelligence" },
  { value: "inter_department_note", label: "Inter-department note" },
  { value: "verbal_report", label: "Verbal report" },
  { value: "complaint", label: "Complaint" },
  { value: "other", label: "Other" },
] as const;

export const URGENCY_OPTIONS = [
  { value: "immediate", label: "Immediate" },
  { value: "within_24hrs", label: "Within 24 hrs" },
  { value: "routine", label: "Routine" },
  { value: "fyi", label: "FYI" },
] as const;

export const CONFIDENTIALITY_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "restricted", label: "Restricted" },
  { value: "confidential", label: "Confidential" },
] as const;

export const COLUMN_POSITION_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
  { value: "box", label: "Box" },
  { value: "lead", label: "Lead" },
] as const;

export const HEADLINE_SIZE_OPTIONS = [
  { value: "banner", label: "Banner" },
  { value: "multi_column", label: "Multi-column" },
  { value: "single_column", label: "Single column" },
  { value: "brief", label: "Brief" },
] as const;

export const UPLOAD_TYPE_TILES = [
  { source_type: "tv" as const, upload_sub_type: null, label: "TV broadcast", description: "TV clip" },
  { source_type: "print" as const, upload_sub_type: null, label: "Print", description: "Newspaper / magazine" },
  { source_type: "online" as const, upload_sub_type: null, label: "Online", description: "Web article" },
  { source_type: "youtube" as const, upload_sub_type: null, label: "YouTube", description: "Video" },
  { source_type: "upload" as const, upload_sub_type: "image" as const, label: "Image", description: "Photo / meme / screenshot" },
  { source_type: "upload" as const, upload_sub_type: "whatsapp" as const, label: "WhatsApp / Telegram", description: "Forward" },
  { source_type: "upload" as const, upload_sub_type: "manual" as const, label: "Field intelligence", description: "Internal note" },
] as const;
