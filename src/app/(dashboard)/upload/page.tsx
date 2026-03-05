"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UP_DISTRICTS } from "@/lib/constants";
import { api } from "@/lib/api";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [publicationDate, setPublicationDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [district, setDistrict] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    id?: string;
    extracted_text?: string;
  } | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && /\.(jpg|jpeg|png|pdf)$/i.test(f.name)) setFile(f);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && /\.(jpg|jpeg|png|pdf)$/i.test(f.name)) setFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !sourceName.trim() || !district) return;
    setUploading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("source_name", sourceName);
      form.append("publication_date", publicationDate);
      form.append("district", district);
      if (notes.trim()) form.append("notes", notes);

      const { data } = await api.post<{ id?: string; extracted_text?: string }>(
        "/api/upload/clipping",
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      setResult(data ?? null);
      if (data?.id) {
        setTimeout(() => router.push(`/feed?article=${data.id}`), 2000);
      }
    } catch (err) {
      setResult({ extracted_text: String(err) });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Upload Media Clipping
        </h1>
        <p className="text-slate-600">
          Upload scanned print clippings or physical media for district-level
          monitoring
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="flex min-h-[120px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4"
            >
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer text-sm text-blue-600 hover:underline"
              >
                {file
                  ? file.name
                  : "Drag & drop or click to browse (JPG, PNG, PDF, max 10MB)"}
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Source name *
              </label>
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                required
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="Newspaper name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Publication date *
              </label>
              <input
                type="date"
                value={publicationDate}
                onChange={(e) => setPublicationDate(e.target.value)}
                required
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                District *
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                required
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select district</option>
                {UP_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={!file || !sourceName.trim() || !district || uploading}
              className="w-full rounded-lg bg-slate-900 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {uploading ? "Processing…" : "Extract & Monitor"}
            </button>
          </form>
        </div>

        {result && (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="font-semibold text-slate-900">Extracted text</h3>
              <div className="mt-2 max-h-48 overflow-y-auto rounded border border-slate-200 p-3 text-sm text-slate-700">
                {result.extracted_text ?? "—"}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Accuracy may vary. Please verify Hindi text.
              </p>
            </div>
            {result.id && (
              <p className="text-sm text-green-600">
                Clipping processed. Redirecting to feed…
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
