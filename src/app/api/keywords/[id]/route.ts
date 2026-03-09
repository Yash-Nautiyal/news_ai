import { NextResponse } from "next/server";
import type { Keyword } from "@/types";
import {
  getSupabaseAdminClient,
  hasSupabaseAdminConfig,
} from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!hasSupabaseAdminConfig()) {
      return NextResponse.json(
        { error: "Supabase is not configured for keyword updates." },
        { status: 500 },
      );
    }

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const sourceTable = body?.source_table as Keyword["source_table"] | undefined;

    if (!sourceTable) {
      return NextResponse.json(
        { error: "source_table is required to update a keyword." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdminClient();

    if (sourceTable === "entities") {
      const { data, error } = await supabase
        .from("entities")
        .update({ is_active: body?.is_active })
        .eq("id", id)
        .select(
          "id,name,name_hindi,category,aliases,is_active,sort_order,created_at",
        )
        .single();
      if (error || !data) {
        return NextResponse.json(
          {
            error:
              error?.message ??
              "Failed to update entity keyword (entities table).",
          },
          { status: 500 },
        );
      }
      const isActive = Boolean((data as { is_active: boolean }).is_active);
      const entityCategory = (data as { category: string }).category;
      const keyword: Keyword = {
        id,
        source_id: id,
        source_table: "entities",
        term: (data as { name: string }).name,
        term_hindi: (data as { name_hindi: string | null }).name_hindi ?? null,
        category:
          entityCategory === "official"
            ? "officials"
            : entityCategory === "scheme"
              ? "schemes"
              : "governance",
        variants: ((data as { aliases?: string[] }).aliases ?? []) as string[],
        is_active: isActive,
        status: isActive ? "active" : "inactive",
        created_at: (data as { created_at?: string }).created_at ?? null,
        entity_category: entityCategory,
        incident_group_name: null,
      };
      return NextResponse.json(keyword);
    }

    if (sourceTable === "geo_districts") {
      const { data, error } = await supabase
        .from("geo_districts")
        .update({ is_active: body?.is_active })
        .eq("id", id)
        .select("id,name,name_hindi,division,is_active")
        .single();
      if (error || !data) {
        return NextResponse.json(
          {
            error:
              error?.message ??
              "Failed to update district keyword (geo_districts table).",
          },
          { status: 500 },
        );
      }
      const isActive = Boolean((data as { is_active: boolean }).is_active);
      const keyword: Keyword = {
        id,
        source_id: id,
        source_table: "geo_districts",
        term: (data as { name: string }).name,
        term_hindi: (data as { name_hindi: string | null }).name_hindi ?? null,
        category: "districts",
        variants: ((data as { division?: string | null }).division
          ? [(data as { division?: string | null }).division as string]
          : []) as string[],
        is_active: isActive,
        status: isActive ? "active" : "inactive",
        created_at: null,
        entity_category: null,
        incident_group_name: null,
      };
      return NextResponse.json(keyword);
    }

    if (sourceTable === "incident_categories") {
      const { data, error } = await supabase
        .from("incident_categories")
        .update({ is_active: body?.is_active })
        .eq("id", id)
        .select(
          "id,name,name_hindi,group_name,is_active,sort_order,created_at",
        )
        .single();
      if (error || !data) {
        return NextResponse.json(
          {
            error:
              error?.message ??
              "Failed to update incident keyword (incident_categories table).",
          },
          { status: 500 },
        );
      }
      const isActive = Boolean((data as { is_active: boolean }).is_active);
      const keyword: Keyword = {
        id,
        source_id: id,
        source_table: "incident_categories",
        term: (data as { name: string }).name,
        term_hindi: (data as { name_hindi: string | null }).name_hindi ?? null,
        category: "law_order",
        variants: [],
        is_active: isActive,
        status: isActive ? "active" : "inactive",
        created_at: (data as { created_at?: string }).created_at ?? null,
        entity_category: null,
        incident_group_name: (data as { group_name: string }).group_name,
      };
      return NextResponse.json(keyword);
    }

    return NextResponse.json(
      { error: `Unknown source_table "${sourceTable}" for keyword update.` },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update keyword.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  // Hard delete of managed enums from these tables is not exposed via this API.
  await context.params;
  return NextResponse.json(
    { error: "Deleting keywords is not supported. Use is_active toggles instead." },
    { status: 405 },
  );
}
