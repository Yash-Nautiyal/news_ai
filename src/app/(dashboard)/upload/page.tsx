"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { UP_DISTRICTS } from "@/lib/constants";
import {
  CONTENT_LANGUAGE_OPTIONS,
  SENTIMENT_OPTIONS,
  TONE_OPTIONS,
  SEVERITY_OPTIONS,
  VERIFICATION_OPTIONS,
  SWOT_OPTIONS,
  ACTION_REQUIRED_OPTIONS,
  UPLOAD_TYPE_TILES,
  BROADCAST_SLOT_OPTIONS,
  ARTICLE_CATEGORY_OPTIONS,
  SOURCE_TIER_OPTIONS,
  YT_CHANNEL_TYPE_OPTIONS,
  VIDEO_TYPE_OPTIONS,
  IMAGE_TYPE_OPTIONS,
  IMAGE_SOURCE_OPTIONS,
  AUTHENTICITY_OPTIONS,
  WHATSAPP_CONTENT_TYPE_OPTIONS,
  FORWARDED_AS_OPTIONS,
  REACH_ESTIMATE_OPTIONS,
  CONTENT_CLASSIFICATION_OPTIONS,
  MANUAL_REPORT_TYPE_OPTIONS,
  URGENCY_OPTIONS,
  CONFIDENTIALITY_OPTIONS,
  COLUMN_POSITION_OPTIONS,
  HEADLINE_SIZE_OPTIONS,
} from "@/lib/uploadFormOptions";

type SourceType = "tv" | "print" | "online" | "youtube" | "upload";
type UploadSubType = "image" | "whatsapp" | "manual" | null;

type EntityItem = {
  id: string;
  name: string;
  name_hindi?: string | null;
  sub_category?: string | null;
};
type IncidentCategoryItem = {
  id: string;
  name: string;
  name_hindi?: string | null;
  group_name: string;
};
type MediaSourceItem = { id: string; name: string };

export default function UploadPage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<{
    source_type: SourceType;
    upload_sub_type: UploadSubType;
  } | null>(null);

  const [publishedAt, setPublishedAt] = useState(() => {
    const d = new Date();
    return `${d.toISOString().slice(0, 10)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [contentLanguage, setContentLanguage] = useState("hindi");
  const [analystSynopsis, setAnalystSynopsis] = useState("");
  const [districts, setDistricts] = useState<string[]>([]);
  const [personsNamed, setPersonsNamed] = useState<string[]>([]);
  const [schemesRef, setSchemesRef] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState("");
  const [keywordsMatched, setKeywordsMatched] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [sentiment, setSentiment] = useState("neutral");
  const [tone, setTone] = useState("");
  const [severityAnalyst, setSeverityAnalyst] = useState("");
  const [isLawOrder, setIsLawOrder] = useState(false);
  const [riskFlag, setRiskFlag] = useState(false);
  const [incidentCategories, setIncidentCategories] = useState<string[]>([]);
  const [actionRequired, setActionRequired] = useState<string[]>([]);
  const [swotTag, setSwotTag] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("unverified");

  const [typeMetadata, setTypeMetadata] = useState<Record<string, unknown>>({});
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ id?: string; error?: string } | null>(
    null,
  );
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const validationAlertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      selectedType?.source_type === "upload" &&
      selectedType?.upload_sub_type === "whatsapp" &&
      !sourceName
    ) {
      setSourceName("WhatsApp");
    }
    if (
      selectedType?.source_type === "upload" &&
      selectedType?.upload_sub_type === "manual" &&
      !sourceName
    ) {
      setSourceName("Field intelligence");
    }
  }, [selectedType?.source_type, selectedType?.upload_sub_type]);

  const { data: entitiesPersons = [] } = useQuery({
    queryKey: ["entities", "persons"],
    queryFn: async () => {
      const { data } = await api.get<EntityItem[]>("/api/entities", {
        params: { categories: "minister,official" },
      });
      return Array.isArray(data) ? data : [];
    },
  });
  const { data: entitiesSchemes = [] } = useQuery({
    queryKey: ["entities", "scheme"],
    queryFn: async () => {
      const { data } = await api.get<EntityItem[]>("/api/entities", {
        params: { category: "scheme" },
      });
      return Array.isArray(data) ? data : [];
    },
  });
  const { data: entitiesDepartments = [] } = useQuery({
    queryKey: ["entities", "department"],
    queryFn: async () => {
      const { data } = await api.get<EntityItem[]>("/api/entities", {
        params: { category: "department" },
      });
      return Array.isArray(data) ? data : [];
    },
  });
  const { data: incidentCategoriesList = [] } = useQuery({
    queryKey: ["incident-categories"],
    queryFn: async () => {
      const { data } = await api.get<IncidentCategoryItem[]>(
        "/api/incident-categories",
      );
      return Array.isArray(data) ? data : [];
    },
  });
  const { data: sourcesTV = [] } = useQuery({
    queryKey: ["sources", "tv"],
    queryFn: async () => {
      const { data } = await api.get<MediaSourceItem[]>("/api/sources", {
        params: { type: "tv" },
      });
      return Array.isArray(data) ? data : [];
    },
    enabled: selectedType?.source_type === "tv",
  });
  const { data: sourcesPrint = [] } = useQuery({
    queryKey: ["sources", "print"],
    queryFn: async () => {
      const { data } = await api.get<MediaSourceItem[]>("/api/sources", {
        params: { type: "print" },
      });
      return Array.isArray(data) ? data : [];
    },
    enabled: selectedType?.source_type === "print",
  });
  const { data: sourcesOnline = [] } = useQuery({
    queryKey: ["sources", "online"],
    queryFn: async () => {
      const { data } = await api.get<MediaSourceItem[]>("/api/sources", {
        params: { type: "online" },
      });
      return Array.isArray(data) ? data : [];
    },
    enabled: selectedType?.source_type === "online",
  });

  const incidentByGroup = useMemo(() => {
    const map = new Map<string, IncidentCategoryItem[]>();
    for (const c of incidentCategoriesList) {
      const g = c.group_name || "other";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(c);
    }
    return map;
  }, [incidentCategoriesList]);

  const addTopic = () => {
    const t = topicInput.trim();
    if (t && !topics.includes(t)) {
      setTopics((prev) => [...prev, t]);
      setTopicInput("");
    }
  };
  const addKeyword = () => {
    const k = keywordInput.trim();
    if (k && !keywordsMatched.includes(k)) {
      setKeywordsMatched((prev) => [...prev, k]);
      setKeywordInput("");
    }
  };

  const buildPayload = () => {
    const base: Record<string, unknown> = {
      source_type: selectedType!.source_type,
      upload_sub_type: selectedType!.upload_sub_type ?? undefined,
      source_id: sourceId || undefined,
      source_name: sourceName || "Unknown",
      published_at: new Date(publishedAt).toISOString(),
      title: title.trim() || null,
      content: content.trim() || "",
      url: url.trim() || "",
      content_language: contentLanguage,
      analyst_synopsis: analystSynopsis.trim(),
      districts_mentioned: districts,
      persons_named: personsNamed,
      schemes_referenced: schemesRef,
      departments_mentioned: departments,
      topics,
      keywords_matched: keywordsMatched,
      incident_category_ids: incidentCategories,
      sentiment,
      tone: tone || undefined,
      severity_analyst: severityAnalyst || undefined,
      is_law_order: isLawOrder,
      risk_flag: riskFlag,
      verification_status: verificationStatus,
      action_required: actionRequired,
      internal_notes: internalNotes.trim() || undefined,
      swot_tag: swotTag || undefined,
      type_metadata: typeMetadata,
    };
    return base;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;
    setValidationErrors([]);
    setResult(null);
    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const payload = buildPayload();
      const { data } = await api.post<{ id: string }>("/api/articles", payload);
      setResult({ id: data?.id });
      setValidationErrors([]);
      if (data?.id) {
        setTimeout(() => router.push(`/feed?article=${data.id}`), 2000);
      }
    } catch (err) {
      setResult({
        error: err instanceof Error ? err.message : "Failed to save article.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDistrict = (d: string) => {
    setDistricts((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  };
  const togglePerson = (name: string) => {
    setPersonsNamed((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name],
    );
  };
  const toggleScheme = (name: string) => {
    setSchemesRef((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name],
    );
  };
  const toggleDepartment = (name: string) => {
    setDepartments((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name],
    );
  };
  const toggleIncident = (name: string) => {
    setIncidentCategories((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name],
    );
  };
  const toggleAction = (a: string) => {
    setActionRequired((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a],
    );
  };

  const setMeta = (key: string, value: unknown) => {
    setTypeMetadata((prev) => ({ ...prev, [key]: value }));
  };

  function validateForm(): string[] {
    const errors: string[] = [];
    if (!title.trim()) {
      errors.push("Title / headline is required.");
    }
    if (title.length > 300) {
      errors.push("Title must be at most 300 characters.");
    }
    if (!content.trim()) {
      errors.push("Content / body text is required.");
    }
    if (!analystSynopsis.trim()) {
      errors.push("Analyst synopsis is required.");
    } else if (analystSynopsis.trim().length < 30) {
      errors.push("Analyst synopsis must be at least 30 characters.");
    }
    if (districts.length === 0) {
      errors.push("Select at least one district.");
    }
    if (
      selectedType?.source_type === "online" ||
      selectedType?.source_type === "youtube"
    ) {
      if (!url.trim()) {
        errors.push("Source URL is required for this type.");
      } else {
        try {
          new URL(url.trim());
        } catch {
          errors.push("Source URL must be a valid URL.");
        }
      }
    }
    if (selectedType?.source_type === "tv") {
      if (!sourceId && !sourceName.trim()) {
        errors.push("Select a TV channel.");
      }
      const duration = typeMetadata.clip_duration_sec;
      if (duration == null || duration === "" || Number(duration) < 1) {
        errors.push("TV clip duration (seconds) is required.");
      }
    }
    if (selectedType?.source_type === "print") {
      if (!sourceId && !sourceName.trim()) {
        errors.push("Select a newspaper.");
      }
      const page = typeMetadata.page_number;
      if (page == null || page === "" || Number(page) < 1) {
        errors.push("Page number is required for print.");
      }
    }
    if (selectedType?.source_type === "youtube") {
      const ch = typeMetadata.yt_channel_name;
      if (!ch || String(ch).trim() === "") {
        errors.push("YouTube channel name is required.");
      }
      const dur = typeMetadata.video_duration;
      if (!dur || String(dur).trim() === "") {
        errors.push("Video duration (mm:ss) is required.");
      }
    }
    return errors;
  }

  if (!selectedType) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Upload media / article
          </h1>
          <p className="text-slate-600">
            Choose the type of content you are uploading.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {UPLOAD_TYPE_TILES.map((tile) => (
            <button
              key={`${tile.source_type}-${tile.upload_sub_type ?? "main"}`}
              type="button"
              onClick={() => {
                setSelectedType({
                  source_type: tile.source_type,
                  upload_sub_type: tile.upload_sub_type,
                });
                setSourceName("");
                setSourceId(null);
                setTypeMetadata({});
              }}
              className="flex flex-col rounded-lg border-2 border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-400 hover:shadow"
            >
              <span className="font-semibold text-slate-900">{tile.label}</span>
              <span className="text-sm text-slate-500">{tile.description}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const currentSources =
    selectedType.source_type === "tv"
      ? sourcesTV
      : selectedType.source_type === "print"
        ? sourcesPrint
        : selectedType.source_type === "online"
          ? sourcesOnline
          : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setSelectedType(null)}
          className="text-slate-600 hover:text-slate-900"
        >
          ← Change type
        </button>
        <h1 className="text-2xl font-bold text-slate-900">
          Upload:{" "}
          {UPLOAD_TYPE_TILES.find(
            (t) =>
              t.source_type === selectedType.source_type &&
              t.upload_sub_type === selectedType.upload_sub_type,
          )?.label ?? selectedType.source_type}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {validationErrors.length > 0 && (
          <div
            ref={validationAlertRef}
            role="alert"
            className="rounded-lg border-2 border-amber-400 bg-amber-50 p-4 text-amber-900"
          >
            <p className="font-semibold">Please fix the following:</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
              {validationErrors.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">
            Common fields
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Published / broadcast date & time *
              </label>
              <input
                type="datetime-local"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
                required
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Language *
              </label>
              <select
                value={contentLanguage}
                onChange={(e) => setContentLanguage(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              >
                {CONTENT_LANGUAGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700">
              Title / headline * (max 300)
            </label>
            <input
              type="text"
              maxLength={300}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="Headline"
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700">
              Content / body text *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={4}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="Full text, transcript, or description"
            />
          </div>
          {(selectedType.source_type === "online" ||
            selectedType.source_type === "youtube") && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700">
                Source URL *
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="https://..."
              />
            </div>
          )}
          {selectedType.source_type !== "online" &&
            selectedType.source_type !== "youtube" && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700">
                  Source URL / evidence link
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Optional"
                />
              </div>
            )}
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700">
              Analyst synopsis * (min 30 chars)
            </label>
            <textarea
              value={analystSynopsis}
              onChange={(e) => setAnalystSynopsis(e.target.value)}
              required
              minLength={30}
              rows={3}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="Your summary / interpretation. This is the primary AI input."
            />
            <p className="mt-1 text-xs text-slate-500">
              {analystSynopsis.length} characters
            </p>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-slate-700">
              Districts mentioned *
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {UP_DISTRICTS.slice(0, 24).map((d) => (
                <label key={d} className="inline-flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={districts.includes(d)}
                    onChange={() => toggleDistrict(d)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm">{d}</span>
                </label>
              ))}
              <span className="text-xs text-slate-500">+ more in dropdown</span>
            </div>
            <select
              className="mt-2 w-full max-w-xs rounded border border-slate-300 px-2 py-1 text-sm"
              value=""
              onChange={(e) => {
                const v = e.target.value;
                if (v && !districts.includes(v))
                  setDistricts((prev) => [...prev, v]);
              }}
            >
              <option value="">Add district...</option>
              {UP_DISTRICTS.filter((d) => !districts.includes(d)).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            {districts.length > 0 && (
              <p className="mt-1 text-xs text-slate-600">
                Selected: {districts.join(", ")}
              </p>
            )}
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-slate-700">
              Persons named
            </label>
            <div className="mt-1 flex flex-wrap gap-2">
              {entitiesPersons.slice(0, 15).map((e) => (
                <label key={e.id} className="inline-flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={personsNamed.includes(e.name)}
                    onChange={() => togglePerson(e.name)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm">
                    {e.name}
                    {e.sub_category ? ` (${e.sub_category})` : ""}
                  </span>
                </label>
              ))}
            </div>
            <select
              className="mt-2 w-full max-w-xs rounded border border-slate-300 px-2 py-1 text-sm"
              value=""
              onChange={(e) => {
                const v = e.target.value;
                if (v && !personsNamed.includes(v))
                  setPersonsNamed((prev) => [...prev, v]);
              }}
            >
              <option value="">Add person...</option>
              {entitiesPersons
                .filter((e) => !personsNamed.includes(e.name))
                .map((e) => (
                  <option key={e.id} value={e.name}>
                    {e.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700">
              Schemes referenced
            </label>
            <select
              className="mt-1 w-full max-w-xs rounded border border-slate-300 px-2 py-1 text-sm"
              value=""
              onChange={(e) => {
                const v = e.target.value;
                if (v && !schemesRef.includes(v))
                  setSchemesRef((prev) => [...prev, v]);
              }}
            >
              <option value="">Add scheme...</option>
              {entitiesSchemes
                .filter((e) => !schemesRef.includes(e.name))
                .map((e) => (
                  <option key={e.id} value={e.name}>
                    {e.name}
                  </option>
                ))}
            </select>
            {schemesRef.length > 0 && (
              <p className="mt-1 text-xs">Selected: {schemesRef.join(", ")}</p>
            )}
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700">
              Departments mentioned
            </label>
            <select
              className="mt-1 w-full max-w-xs rounded border border-slate-300 px-2 py-1 text-sm"
              value=""
              onChange={(e) => {
                const v = e.target.value;
                if (v && !departments.includes(v))
                  setDepartments((prev) => [...prev, v]);
              }}
            >
              <option value="">Add department...</option>
              {entitiesDepartments
                .filter((e) => !departments.includes(e.name))
                .map((e) => (
                  <option key={e.id} value={e.name}>
                    {e.name}
                  </option>
                ))}
            </select>
            {departments.length > 0 && (
              <p className="mt-1 text-xs">Selected: {departments.join(", ")}</p>
            )}
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700">
              Topics / tags
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addTopic())
                }
                className="w-full max-w-xs rounded border border-slate-300 px-2 py-1 text-sm"
                placeholder="Add topic"
              />
              <button
                type="button"
                onClick={addTopic}
                className="rounded bg-slate-200 px-2 py-1 text-sm"
              >
                Add
              </button>
            </div>
            {topics.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {topics.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-sm"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() =>
                        setTopics((prev) => prev.filter((x) => x !== t))
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700">
              Keywords matched
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addKeyword())
                }
                className="w-full max-w-xs rounded border border-slate-300 px-2 py-1 text-sm"
                placeholder="Add keyword"
              />
              <button
                type="button"
                onClick={addKeyword}
                className="rounded bg-slate-200 px-2 py-1 text-sm"
              >
                Add
              </button>
            </div>
            {keywordsMatched.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {keywordsMatched.map((k) => (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-sm"
                  >
                    {k}
                    <button
                      type="button"
                      onClick={() =>
                        setKeywordsMatched((prev) =>
                          prev.filter((x) => x !== k),
                        )
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Sentiment
              </label>
              <select
                value={sentiment}
                onChange={(e) => setSentiment(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              >
                {SENTIMENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Tone
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">—</option>
                {TONE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Severity (analyst)
              </label>
              <select
                value={severityAnalyst}
                onChange={(e) => setSeverityAnalyst(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">—</option>
                {SEVERITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Verification
              </label>
              <select
                value={verificationStatus}
                onChange={(e) => setVerificationStatus(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              >
                {VERIFICATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-6">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={isLawOrder}
                onChange={(e) => setIsLawOrder(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span className="text-sm">Law & order issue</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={riskFlag}
                onChange={(e) => setRiskFlag(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span className="text-sm">Risk flag</span>
            </label>
          </div>

          {(isLawOrder || riskFlag) && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700">
                Incident categories
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {Array.from(incidentByGroup.entries()).map(([group, items]) => (
                  <div key={group}>
                    <span className="text-xs font-medium text-slate-500">
                      {group}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {items.map((c) => (
                        <label
                          key={c.id}
                          className="inline-flex items-center gap-1"
                        >
                          <input
                            type="checkbox"
                            checked={incidentCategories.includes(c.name)}
                            onChange={() => toggleIncident(c.name)}
                            className="rounded border-slate-300"
                          />
                          <span className="text-sm">{c.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700">
              Action required
            </label>
            <div className="mt-1 flex flex-wrap gap-2">
              {ACTION_REQUIRED_OPTIONS.map((o) => (
                <label key={o.value} className="inline-flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={actionRequired.includes(o.value)}
                    onChange={() => toggleAction(o.value)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm">{o.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700">
              SWOT tag (optional)
            </label>
            <select
              value={swotTag}
              onChange={(e) => setSwotTag(e.target.value)}
              className="mt-1 w-full max-w-xs rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {SWOT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700">
              Internal notes (optional)
            </label>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Type-specific: TV */}
        {selectedType.source_type === "tv" && (
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              TV broadcast
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Channel name *
                </label>
                <select
                  value={sourceId ?? ""}
                  onChange={(e) => {
                    const opt = sourcesTV.find((s) => s.id === e.target.value);
                    setSourceId(opt?.id ?? null);
                    setSourceName(opt?.name ?? "");
                    setMeta("channel_name", opt?.name ?? "");
                  }}
                  required
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Select channel</option>
                  {sourcesTV.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Programme name
                </label>
                <input
                  type="text"
                  value={String(typeMetadata.programme_name ?? "")}
                  onChange={(e) => setMeta("programme_name", e.target.value)}
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Clip duration (seconds) *
                </label>
                <input
                  type="number"
                  min={1}
                  value={Number(typeMetadata.clip_duration_sec ?? "") || ""}
                  onChange={(e) =>
                    setMeta(
                      "clip_duration_sec",
                      e.target.value ? parseInt(e.target.value, 10) : undefined,
                    )
                  }
                  className="mt-1 w-full max-w-xs rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Broadcast slot
                </label>
                <select
                  value={String(typeMetadata.broadcast_slot ?? "")}
                  onChange={(e) =>
                    setMeta("broadcast_slot", e.target.value || undefined)
                  }
                  className="mt-1 w-full max-w-xs rounded border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">—</option>
                  {BROADCAST_SLOT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Type-specific: Print */}
        {selectedType.source_type === "print" && (
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">Print</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Newspaper name *
                </label>
                <select
                  value={sourceId ?? ""}
                  onChange={(e) => {
                    const opt = sourcesPrint.find(
                      (s) => s.id === e.target.value,
                    );
                    setSourceId(opt?.id ?? null);
                    setSourceName(opt?.name ?? "");
                    setMeta("newspaper_name", opt?.name ?? "");
                  }}
                  required
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Select newspaper</option>
                  {sourcesPrint.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Edition city
                </label>
                <input
                  type="text"
                  value={String(typeMetadata.edition_city ?? "")}
                  onChange={(e) => setMeta("edition_city", e.target.value)}
                  className="mt-1 w-full max-w-xs rounded border border-slate-300 px-3 py-2 text-sm"
                  placeholder="e.g. Lucknow"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Page number *
                </label>
                <input
                  type="number"
                  min={1}
                  value={Number(typeMetadata.page_number ?? "") || ""}
                  onChange={(e) =>
                    setMeta(
                      "page_number",
                      e.target.value ? parseInt(e.target.value, 10) : undefined,
                    )
                  }
                  className="mt-1 w-full max-w-xs rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex gap-4">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(typeMetadata.front_page)}
                    onChange={(e) => setMeta("front_page", e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm">Front page</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(typeMetadata.photo_accompanying)}
                    onChange={(e) =>
                      setMeta("photo_accompanying", e.target.checked)
                    }
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm">Photo accompanying</span>
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Column position
                  </label>
                  <select
                    value={String(typeMetadata.column_position ?? "")}
                    onChange={(e) =>
                      setMeta("column_position", e.target.value || undefined)
                    }
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {COLUMN_POSITION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Headline size
                  </label>
                  <select
                    value={String(typeMetadata.headline_size ?? "")}
                    onChange={(e) =>
                      setMeta("headline_size", e.target.value || undefined)
                    }
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {HEADLINE_SIZE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Type-specific: Online */}
        {selectedType.source_type === "online" && (
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              Online
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Publication name
                </label>
                <select
                  value={sourceId ?? ""}
                  onChange={(e) => {
                    const opt = sourcesOnline.find(
                      (s) => s.id === e.target.value,
                    );
                    setSourceId(opt?.id ?? null);
                    setSourceName(opt?.name ?? "");
                    setMeta("publication_name", opt?.name ?? "");
                  }}
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Select or type below</option>
                  {sourcesOnline.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={sourceId ? "" : sourceName}
                  onChange={(e) => {
                    setSourceId(null);
                    setSourceName(e.target.value);
                    setMeta("publication_name", e.target.value);
                  }}
                  placeholder="Or type publication name"
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Article category
                  </label>
                  <select
                    value={String(typeMetadata.article_category ?? "")}
                    onChange={(e) =>
                      setMeta("article_category", e.target.value || undefined)
                    }
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {ARTICLE_CATEGORY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Source tier
                  </label>
                  <select
                    value={String(typeMetadata.source_tier ?? "")}
                    onChange={(e) =>
                      setMeta("source_tier", e.target.value || undefined)
                    }
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {SOURCE_TIER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Byline
                </label>
                <input
                  type="text"
                  value={String(typeMetadata.byline ?? "")}
                  onChange={(e) => setMeta("byline", e.target.value)}
                  className="mt-1 w-full max-w-xs rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Social shares
                </label>
                <input
                  type="number"
                  min={0}
                  value={Number(typeMetadata.social_shares ?? "") || ""}
                  onChange={(e) =>
                    setMeta(
                      "social_shares",
                      e.target.value ? parseInt(e.target.value, 10) : undefined,
                    )
                  }
                  className="mt-1 w-full max-w-xs rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(typeMetadata.paywall)}
                  onChange={(e) => setMeta("paywall", e.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className="text-sm">Paywall</span>
              </label>
            </div>
          </div>
        )}

        {/* Type-specific: YouTube */}
        {selectedType.source_type === "youtube" && (
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              YouTube
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Channel name *
                </label>
                <input
                  type="text"
                  value={String(typeMetadata.yt_channel_name ?? "")}
                  onChange={(e) => {
                    const v = e.target.value;
                    setMeta("yt_channel_name", v);
                    setSourceName(v || "YouTube");
                  }}
                  required
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Channel type
                </label>
                <select
                  value={String(typeMetadata.yt_channel_type ?? "")}
                  onChange={(e) =>
                    setMeta("yt_channel_type", e.target.value || undefined)
                  }
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">—</option>
                  {YT_CHANNEL_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Video duration (mm:ss) *
                </label>
                <input
                  type="text"
                  value={String(typeMetadata.video_duration ?? "")}
                  onChange={(e) => setMeta("video_duration", e.target.value)}
                  placeholder="12:45"
                  className="mt-1 w-full max-w-xs rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    View count
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={Number(typeMetadata.view_count ?? "") || ""}
                    onChange={(e) =>
                      setMeta(
                        "view_count",
                        e.target.value
                          ? parseInt(e.target.value, 10)
                          : undefined,
                      )
                    }
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Subscriber count
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={Number(typeMetadata.subscriber_count ?? "") || ""}
                    onChange={(e) =>
                      setMeta(
                        "subscriber_count",
                        e.target.value
                          ? parseInt(e.target.value, 10)
                          : undefined,
                      )
                    }
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Video type
                </label>
                <select
                  value={String(typeMetadata.video_type ?? "")}
                  onChange={(e) =>
                    setMeta("video_type", e.target.value || undefined)
                  }
                  className="mt-1 w-full max-w-xs rounded border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">—</option>
                  {VIDEO_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Type-specific: Image upload */}
        {selectedType.source_type === "upload" &&
          selectedType.upload_sub_type === "image" && (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-800">
                Image
              </h2>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Image type
                    </label>
                    <select
                      value={String(typeMetadata.image_type ?? "")}
                      onChange={(e) =>
                        setMeta("image_type", e.target.value || undefined)
                      }
                      className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="">—</option>
                      {IMAGE_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Image source platform
                    </label>
                    <select
                      value={String(typeMetadata.image_source ?? "")}
                      onChange={(e) => {
                        const v = e.target.value;
                        setMeta("image_source", v);
                        setSourceName(
                          v
                            ? v.charAt(0).toUpperCase() + v.slice(1)
                            : "Unknown",
                        );
                      }}
                      className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="">—</option>
                      {IMAGE_SOURCE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Location visible
                  </label>
                  <input
                    type="text"
                    value={String(typeMetadata.location_visible ?? "")}
                    onChange={(e) =>
                      setMeta("location_visible", e.target.value)
                    }
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Original vs edited
                    </label>
                    <select
                      value={String(typeMetadata.original_vs_edited ?? "")}
                      onChange={(e) =>
                        setMeta(
                          "original_vs_edited",
                          e.target.value || undefined,
                        )
                      }
                      className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="">—</option>
                      <option value="original">Original</option>
                      <option value="edited">Edited</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Authenticity
                    </label>
                    <select
                      value={String(typeMetadata.authenticity ?? "")}
                      onChange={(e) =>
                        setMeta("authenticity", e.target.value || undefined)
                      }
                      className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="">—</option>
                      {AUTHENTICITY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Type-specific: WhatsApp */}
        {selectedType.source_type === "upload" &&
          selectedType.upload_sub_type === "whatsapp" && (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-800">
                WhatsApp / Telegram
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Platform
                  </label>
                  <select
                    value={String(typeMetadata.platform ?? "whatsapp")}
                    onChange={(e) => {
                      const v = e.target.value;
                      setMeta("platform", v);
                      setSourceName(
                        v === "whatsapp"
                          ? "WhatsApp"
                          : v === "telegram"
                            ? "Telegram"
                            : v === "signal"
                              ? "Signal"
                              : "Other",
                      );
                    }}
                    className="mt-1 w-full max-w-xs rounded border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="telegram">Telegram</option>
                    <option value="signal">Signal</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Content type
                  </label>
                  <select
                    value={String(typeMetadata.content_type ?? "")}
                    onChange={(e) =>
                      setMeta("content_type", e.target.value || undefined)
                    }
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {WHATSAPP_CONTENT_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Forwarded as
                  </label>
                  <select
                    value={String(typeMetadata.forwarded_as ?? "")}
                    onChange={(e) =>
                      setMeta("forwarded_as", e.target.value || undefined)
                    }
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {FORWARDED_AS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Group source (anonymized)
                  </label>
                  <input
                    type="text"
                    value={String(typeMetadata.group_source ?? "")}
                    onChange={(e) => setMeta("group_source", e.target.value)}
                    placeholder="e.g. Local Journalist Group Kanpur"
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Reach estimate
                  </label>
                  <select
                    value={String(typeMetadata.reach_estimate ?? "")}
                    onChange={(e) =>
                      setMeta("reach_estimate", e.target.value || undefined)
                    }
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {REACH_ESTIMATE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Content classification
                  </label>
                  <select
                    value={String(typeMetadata.content_classification ?? "")}
                    onChange={(e) =>
                      setMeta(
                        "content_classification",
                        e.target.value || undefined,
                      )
                    }
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {CONTENT_CLASSIFICATION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

        {/* Type-specific: Manual */}
        {selectedType.source_type === "upload" &&
          selectedType.upload_sub_type === "manual" && (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-800">
                Field intelligence
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Report type
                  </label>
                  <select
                    value={String(typeMetadata.report_type ?? "")}
                    onChange={(e) =>
                      setMeta("report_type", e.target.value || undefined)
                    }
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {MANUAL_REPORT_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Source description (anonymized)
                  </label>
                  <input
                    type="text"
                    value={String(typeMetadata.source_description ?? "")}
                    onChange={(e) =>
                      setMeta("source_description", e.target.value)
                    }
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Information date
                  </label>
                  <input
                    type="date"
                    value={String(typeMetadata.information_date ?? "").slice(
                      0,
                      10,
                    )}
                    onChange={(e) =>
                      setMeta("information_date", e.target.value || undefined)
                    }
                    className="mt-1 w-full max-w-xs rounded border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Urgency
                  </label>
                  <select
                    value={String(typeMetadata.urgency ?? "")}
                    onChange={(e) =>
                      setMeta("urgency", e.target.value || undefined)
                    }
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {URGENCY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Confidentiality
                  </label>
                  <select
                    value={String(typeMetadata.confidentiality ?? "")}
                    onChange={(e) =>
                      setMeta("confidentiality", e.target.value || undefined)
                    }
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {CONFIDENTIALITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Response recommended (max 300)
                  </label>
                  <textarea
                    value={String(typeMetadata.response_recommended ?? "")}
                    onChange={(e) =>
                      setMeta(
                        "response_recommended",
                        e.target.value.slice(0, 300),
                      )
                    }
                    maxLength={300}
                    rows={2}
                    className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

        {result && (
          <div
            className={`rounded-lg border p-4 ${result.error ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`}
          >
            {result.error && <p>{result.error}</p>}
            {result.id && <p>Article saved. Redirecting to feed…</p>}
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-slate-900 px-6 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Submit article"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/feed")}
            className="rounded-lg border border-slate-300 px-6 py-2 font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
