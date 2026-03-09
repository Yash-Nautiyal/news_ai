import { NextResponse } from "next/server";
import type { Keyword, KeywordCategory } from "@/types";
import {
  getSupabaseAdminClient,
  hasSupabaseAdminConfig,
} from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type EntityRow = {
  id: string;
  name: string;
  name_hindi: string | null;
  category: string;
  aliases: string[] | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

type GeoDistrictRow = {
  id: string;
  name: string;
  name_hindi: string | null;
  division: string | null;
  is_active: boolean;
};

type IncidentCategoryRow = {
  id: string;
  name: string;
  name_hindi: string | null;
  group_name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

function uiCategoryFromEntityCategory(entityCategory: string): KeywordCategory | null {
  if (entityCategory === "official") return "officials";
  if (entityCategory === "scheme") return "schemes";
  if (
    entityCategory === "minister" ||
    entityCategory === "organisation" ||
    entityCategory === "department"
  ) {
    return "governance";
  }
  return null;
}

function toKeywordFromEntity(row: EntityRow): Keyword | null {
  const uiCategory = uiCategoryFromEntityCategory(row.category);
  if (!uiCategory) return null;
  const isActive = Boolean(row.is_active);
  return {
    id: row.id,
    source_id: row.id,
    source_table: "entities",
    term: row.name,
    term_hindi: row.name_hindi,
    category: uiCategory,
    variants: Array.isArray(row.aliases) ? row.aliases : [],
    is_active: isActive,
    status: isActive ? "active" : "inactive",
    created_at: row.created_at ?? null,
    entity_category: row.category,
    incident_group_name: null,
  };
}

function toKeywordFromDistrict(row: GeoDistrictRow): Keyword {
  const isActive = Boolean(row.is_active);
  return {
    id: row.id,
    source_id: row.id,
    source_table: "geo_districts",
    term: row.name,
    term_hindi: row.name_hindi,
    category: "districts",
    variants: row.division ? [row.division] : [],
    is_active: isActive,
    status: isActive ? "active" : "inactive",
    created_at: null,
    entity_category: null,
    incident_group_name: null,
  };
}

function toKeywordFromIncident(row: IncidentCategoryRow): Keyword {
  const isActive = Boolean(row.is_active);
  return {
    id: row.id,
    source_id: row.id,
    source_table: "incident_categories",
    term: row.name,
    term_hindi: row.name_hindi,
    category: "law_order",
    variants: [],
    is_active: isActive,
    status: isActive ? "active" : "inactive",
    created_at: row.created_at ?? null,
    entity_category: null,
    incident_group_name: row.group_name,
  };
}

export async function GET(request: Request) {
  try {
    if (!hasSupabaseAdminConfig()) {
      // In local/mock mode the client will use MOCK_KEYWORDS instead.
      return NextResponse.json([] as Keyword[]);
    }

    const { searchParams } = new URL(request.url);
    const uiCategory = searchParams.get("category") as KeywordCategory | "" | null;
    const status = searchParams.get("status") as "active" | "inactive" | "" | null;

    const supabase = getSupabaseAdminClient();

    const needGovernance = !uiCategory || uiCategory === "governance";
    const needOfficials = !uiCategory || uiCategory === "officials";
    const needSchemes = !uiCategory || uiCategory === "schemes";
    const needDistricts = !uiCategory || uiCategory === "districts";
    const needLawOrder = !uiCategory || uiCategory === "law_order";

    const entityCategories = new Set<string>();
    if (needGovernance) {
      entityCategories.add("minister");
      entityCategories.add("organisation");
      entityCategories.add("department");
    }
    if (needOfficials) {
      entityCategories.add("official");
    }
    if (needSchemes) {
      entityCategories.add("scheme");
    }

    const promises: Array<Promise<Keyword[]>> = [];

    if (entityCategories.size > 0) {
      const entityPromise = (async () => {
        const { data, error } = await supabase
          .from("entities")
          .select(
            "id,name,name_hindi,category,aliases,is_active,sort_order,created_at",
          )
          .in("category", Array.from(entityCategories))
          .order("category", { ascending: true })
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true });
        if (error || !data) return [];
        return (data as EntityRow[])
          .map(toKeywordFromEntity)
          .filter((k): k is Keyword => Boolean(k));
      })();
      promises.push(entityPromise);
    }

    if (needDistricts) {
      const districtsPromise = (async () => {
        const { data, error } = await supabase
          .from("geo_districts")
          .select("id,name,name_hindi,division,is_active")
          .order("name", { ascending: true });
        if (error || !data) return [];
        return (data as GeoDistrictRow[]).map(toKeywordFromDistrict);
      })();
      promises.push(districtsPromise);
    }

    if (needLawOrder) {
      const incidentsPromise = (async () => {
        const { data, error } = await supabase
          .from("incident_categories")
          .select("id,name,name_hindi,group_name,is_active,sort_order,created_at")
          .order("group_name", { ascending: true })
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true });
        if (error || !data) return [];
        return (data as IncidentCategoryRow[]).map(toKeywordFromIncident);
      })();
      promises.push(incidentsPromise);
    }

    const parts = await Promise.all(promises);
    let all = parts.flat();

    if (status === "active") {
      all = all.filter((k) => k.is_active);
    } else if (status === "inactive") {
      all = all.filter((k) => !k.is_active);
    }

    all.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.term.localeCompare(b.term, "en");
    });

    return NextResponse.json(all);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load keywords.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!hasSupabaseAdminConfig()) {
      return NextResponse.json(
        { error: "Supabase is not configured for keyword management." },
        { status: 500 },
      );
    }

    const body = await request.json();
    const term = String(body?.term ?? "").trim();
    if (!term) {
      return NextResponse.json(
        { error: "term is required." },
        { status: 400 },
      );
    }

    const uiCategory = (body?.category ?? "governance") as KeywordCategory;
    const termHindi =
      body?.term_hindi === null || body?.term_hindi === undefined
        ? null
        : String(body.term_hindi);
    const variants: string[] = Array.isArray(body?.variants)
      ? body.variants
      : [];
    const entityCategoryOverride: string | undefined =
      body?.entity_category || undefined;
    const incidentGroupName: string | undefined =
      body?.incident_group_name || undefined;

    const supabase = getSupabaseAdminClient();

    if (uiCategory === "districts") {
      return NextResponse.json(
        {
          error:
            "Districts are static geo data. Please update geo_districts directly via admin DB.",
        },
        { status: 400 },
      );
    }

    if (uiCategory === "law_order") {
      const groupName = incidentGroupName || "crime";
      const { data, error } = await supabase
        .from("incident_categories")
        .insert({
          name: term,
          name_hindi: termHindi,
          group_name: groupName,
          sort_order: body?.sort_order ?? 0,
        })
        .select(
          "id,name,name_hindi,group_name,is_active,sort_order,created_at",
        )
        .single();

      if (error || !data) {
        return NextResponse.json(
          {
            error:
              error?.message ??
              "Failed to create incident category for keyword.",
          },
          { status: 500 },
        );
      }

      const keyword = toKeywordFromIncident(data as IncidentCategoryRow);
      return NextResponse.json(keyword, { status: 201 });
    }

    // Governance / Officials / Schemes → entities table
    let entityCategory: string;
    if (entityCategoryOverride) {
      entityCategory = entityCategoryOverride;
    } else if (uiCategory === "officials") {
      entityCategory = "official";
    } else if (uiCategory === "schemes") {
      entityCategory = "scheme";
    } else {
      // Default bucket for governance if not specified
      entityCategory = "organisation";
    }

    const { data, error } = await supabase
      .from("entities")
      .insert({
        name: term,
        name_hindi: termHindi,
        category: entityCategory,
        aliases: variants,
        sort_order: body?.sort_order ?? 0,
      })
      .select(
        "id,name,name_hindi,category,aliases,is_active,sort_order,created_at",
      )
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          error:
            error?.message ??
            "Failed to create entity for keyword in entities table.",
        },
        { status: 500 },
      );
    }

    const keyword = toKeywordFromEntity(data as EntityRow);
    if (!keyword) {
      return NextResponse.json(
        { error: "Created entity does not map to a supported keyword category." },
        { status: 500 },
      );
    }

    return NextResponse.json(keyword, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create keyword.",
      },
      { status: 500 },
    );
  }
}
