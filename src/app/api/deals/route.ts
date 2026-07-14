import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { Store, Gender } from "@/types/deal";
import { normalizeBrand, getBrandVariants } from "@/lib/brand-utils";
import { jsonArrayHasAny, parseStringArray } from "@/lib/json-array";
import { blockBots } from "@/lib/bot-guard";

const ITEMS_PER_PAGE = 32;
const MAX_ITEMS_PER_PAGE = 100; // Prevent DoS via huge limit
const MAX_PAGE = 1000; // Prevent DoS via huge page numbers

// The filter sidebar aggregations (brand/store/gender counts, price range) are
// computed over the whole >=50% catalogue and do NOT depend on the request's
// filters — so they're identical on every call. Without caching, each request
// (pagination, infinite scroll, every filter toggle) ran 4 extra groupBy/aggregate
// queries over the full table for nothing. Cache them; the catalogue only changes
// after a scrape, so a 5-minute TTL is plenty fresh.
interface CachedFilters {
  brands: { name: string; count: number }[];
  stores: { name: string; count: number }[];
  genders: { name: string; count: number }[];
  priceRange: { min: number; max: number };
}
let filtersCache: CachedFilters | null = null;
let filtersCacheTime = 0;
const FILTERS_TTL = 5 * 60 * 1000;

async function getCachedFilters(): Promise<CachedFilters> {
  const now = Date.now();
  if (filtersCache && now - filtersCacheTime < FILTERS_TTL) {
    return filtersCache;
  }

  const prisma = await getPrisma();
  const baseWhere = { discountPercent: { gte: 50 } };
  const [brandsAgg, storesAgg, gendersAgg, priceAgg] = await Promise.all([
    prisma.deal.groupBy({ by: ["brand"], where: { ...baseWhere, brand: { not: null } }, _count: true }),
    prisma.deal.groupBy({ by: ["store"], where: baseWhere, _count: true }),
    prisma.deal.groupBy({ by: ["gender"], where: baseWhere, _count: true }),
    prisma.deal.aggregate({ where: baseWhere, _min: { salePrice: true }, _max: { salePrice: true } }),
  ]);

  // Normalize and deduplicate brands (merge "adidas"/"Adidas"/"ADIDAS", drop
  // gender/category words, map aliases like CALVIN -> CALVIN KLEIN).
  const brandMap = new Map<string, { name: string; count: number }>();
  for (const b of brandsAgg) {
    if (!b.brand) continue;
    const normalized = normalizeBrand(b.brand);
    if (!normalized) continue;
    const existing = brandMap.get(normalized);
    if (existing) existing.count += b._count;
    else brandMap.set(normalized, { name: normalized, count: b._count });
  }

  filtersCache = {
    brands: Array.from(brandMap.values()).sort((a, b) => b.count - a.count),
    stores: storesAgg.map((s) => ({ name: s.store, count: s._count })),
    genders: gendersAgg.map((g) => ({ name: g.gender, count: g._count })),
    priceRange: {
      min: priceAgg._min.salePrice || 0,
      max: priceAgg._max.salePrice || 100000,
    },
  };
  filtersCacheTime = now;
  return filtersCache;
}

export async function GET(request: NextRequest) {
  const blocked = blockBots(request);
  if (blocked) return blocked;

  const searchParams = request.nextUrl.searchParams;

  // Parse and validate query parameters
  let page = parseInt(searchParams.get("page") || "1", 10);
  let limit = parseInt(searchParams.get("limit") || String(ITEMS_PER_PAGE), 10);

  // Input validation to prevent DoS
  if (isNaN(page) || page < 1) page = 1;
  if (page > MAX_PAGE) page = MAX_PAGE;
  if (isNaN(limit) || limit < 1) limit = ITEMS_PER_PAGE;
  if (limit > MAX_ITEMS_PER_PAGE) limit = MAX_ITEMS_PER_PAGE;
  // Sanitize search - limit length to prevent abuse
  const search = (searchParams.get("search") || "").slice(0, 100);
  const stores = searchParams.get("stores")?.split(",").filter(Boolean).slice(0, 10) || [];
  const brands = searchParams.get("brands")?.split(",").filter(Boolean).slice(0, 50) || [];
  const genders = searchParams.get("genders")?.split(",").filter(Boolean).slice(0, 5) || [];
  const categories = searchParams.get("categories")?.split(",").filter(Boolean).slice(0, 20) || [];
  const categoryPaths = searchParams.get("categoryPaths")?.split(",").filter(Boolean).slice(0, 50) || [];
  const sizes = searchParams.get("sizes")?.split(",").filter(Boolean).slice(0, 30) || [];
  let minDiscount = parseInt(searchParams.get("minDiscount") || "50", 10);
  if (isNaN(minDiscount) || minDiscount < 0) minDiscount = 50;
  if (minDiscount > 100) minDiscount = 100;
  const minPrice = searchParams.get("minPrice") ? parseInt(searchParams.get("minPrice")!, 10) : null;
  const maxPrice = searchParams.get("maxPrice") ? parseInt(searchParams.get("maxPrice")!, 10) : null;
  const sortBy = searchParams.get("sortBy") || "discount";

  // Build WHERE conditions
  const where: Prisma.DealWhereInput = {
    discountPercent: { gte: minDiscount },
  };

  // Search filter (name or brand). SQLite's LIKE (what `contains` compiles to) is
  // already case-insensitive for ASCII, so no `mode` is needed (and D1 doesn't
  // support Prisma's `mode: "insensitive"`).
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { brand: { contains: search } },
    ];
  }

  // Store filter
  if (stores.length > 0) {
    where.store = { in: stores as Store[] };
  }

  // Brand filter - expand to include all variants. getBrandVariants already emits
  // upper/lower/title/underscore forms, so an exact `in` covers the stored casings
  // without needing `mode: "insensitive"` (unsupported on D1).
  if (brands.length > 0) {
    const allBrandVariants = brands.flatMap(getBrandVariants);
    where.brand = { in: allBrandVariants };
  }

  // Gender filter
  if (genders.length > 0) {
    where.gender = { in: genders as Gender[] };
  }

  // Legacy category filter - map to category paths
  // This is for backwards compatibility with SEO filter pages
  const CATEGORY_TO_PATH: Record<string, string[]> = {
    patike: ["obuca/patike"],
    cipele: ["obuca/cipele"],
    cizme: ["obuca/cizme"],
    jakna: ["odeca/jakne"],
    majica: ["odeca/majice"],
    duks: ["odeca/duksevi"],
    trenerka: ["odeca/trenerke"],
    sorc: ["odeca/sorcevi"],
    helanke: ["odeca/helanke"],
    ranac: ["oprema/torbe"],
  };

  // Category path aliases - treat these as equivalent
  const CATEGORY_PATH_ALIASES: Record<string, string[]> = {
    "odeca/duksevi": ["odeca/dukserice"],
    "odeca/dukserice": ["odeca/duksevi"],
  };

  // Combine legacy categories with category paths
  const allCategoryPaths = [...categoryPaths];
  let filterOstalo = false;
  categories.forEach((cat) => {
    if (cat === "ostalo") {
      filterOstalo = true;
    } else {
      const paths = CATEGORY_TO_PATH[cat];
      if (paths) {
        allCategoryPaths.push(...paths);
      }
    }
  });

  // Expand category paths with aliases (e.g., duksevi also matches dukserice)
  const expandedCategoryPaths = [...allCategoryPaths];
  allCategoryPaths.forEach((path) => {
    const aliases = CATEGORY_PATH_ALIASES[path];
    if (aliases) {
      expandedCategoryPaths.push(...aliases);
    }
  });

  // Category paths filter (e.g., "obuca/patike"). `categories` is JSON-array TEXT
  // on SQLite/D1, so array membership is expressed via jsonArrayHasAny (see
  // src/lib/json-array.ts). "ostalo" = detail-scraped but uncategorized (an empty
  // JSON array, "[]"), excluding products not yet detail-scraped.
  const ostaloCondition: Prisma.DealWhereInput = {
    categories: "[]",
    detailsScrapedAt: { not: null },
  };
  const categoryHasAny = jsonArrayHasAny("categories", expandedCategoryPaths) as Prisma.DealWhereInput;
  if (expandedCategoryPaths.length > 0 && filterOstalo) {
    // Both: show products matching selected categories OR uncategorized
    where.AND = [
      ...((where.AND as Prisma.DealWhereInput[]) || []),
      { OR: [categoryHasAny, ostaloCondition] },
    ];
  } else if (expandedCategoryPaths.length > 0) {
    where.AND = [...((where.AND as Prisma.DealWhereInput[]) || []), categoryHasAny];
  } else if (filterOstalo) {
    where.AND = [...((where.AND as Prisma.DealWhereInput[]) || []), ostaloCondition];
  }

  // Size filter - matches deals whose sizes array contains any selected size. The
  // scraper already expands ranges/fractions at write time (normalizeSizes), so an
  // exact membership test is sufficient.
  if (sizes.length > 0) {
    where.AND = [
      ...((where.AND as Prisma.DealWhereInput[]) || []),
      jsonArrayHasAny("sizes", sizes) as Prisma.DealWhereInput,
    ];
  }

  // Price filters
  if (minPrice !== null) {
    where.salePrice = { ...where.salePrice as object, gte: minPrice };
  }
  if (maxPrice !== null) {
    where.salePrice = { ...where.salePrice as object, lte: maxPrice };
  }

  // Build ORDER BY
  let orderBy: Prisma.DealOrderByWithRelationInput;
  switch (sortBy) {
    case "price-low":
      orderBy = { salePrice: "asc" };
      break;
    case "price-high":
      orderBy = { salePrice: "desc" };
      break;
    case "newest":
      orderBy = { createdAt: "desc" };
      break;
    case "discount":
    default:
      orderBy = { discountPercent: "desc" };
      break;
  }

  try {
    const prisma = await getPrisma();
    // Get total count for pagination
    const total = await prisma.deal.count({ where });

    // Get paginated deals
    const rawDeals = await prisma.deal.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });
    // sizes/categories are JSON-array TEXT in the DB — deserialize back to string[]
    // so the client keeps receiving arrays (unchanged API shape).
    const deals = rawDeals.map((d) => ({
      ...d,
      sizes: parseStringArray(d.sizes),
      categories: parseStringArray(d.categories),
    }));

    // Filter sidebar data — cached, since it's the same for every request.
    const filters = await getCachedFilters();

    return NextResponse.json({
      deals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters,
    });
  } catch (error) {
    console.error("Error fetching deals:", error);
    return NextResponse.json(
      { error: "Failed to fetch deals" },
      { status: 500 }
    );
  }
}
