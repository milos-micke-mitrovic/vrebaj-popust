import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma, Store, Gender } from "@prisma/client";

const ITEMS_PER_PAGE = 32;
const MAX_ITEMS_PER_PAGE = 100; // Prevent DoS via huge limit
const MAX_PAGE = 1000; // Prevent DoS via huge page numbers

// Brand normalization (same as frontend)
const BRAND_ALIASES: Record<string, string[]> = {
  "CALVIN KLEIN": ["CALVIN", "CALVIN KLEIN BLACK LABEL", "CALVIN KLEIN JEANS", "CK"],
  "KARL LAGERFELD": ["KARL"],
  "NEW BALANCE": ["NEW_BALANCE", "NB"],
  "TOMMY HILFIGER": ["TOMMY", "TOMMY JEANS", "TOMMY_HILFIGER"],
  "UNDER ARMOUR": ["UNDER_ARMOUR", "UA"],
};

// Get all brand variants for a normalized brand name
function getBrandVariants(normalizedBrand: string): string[] {
  const upper = normalizedBrand.toUpperCase().replace(/ /g, "_");
  const variants = [normalizedBrand, upper, normalizedBrand.replace(/ /g, "_")];

  // Add aliases if this is a canonical brand
  const aliases = BRAND_ALIASES[normalizedBrand.toUpperCase()];
  if (aliases) {
    variants.push(...aliases);
    variants.push(...aliases.map(a => a.replace(/_/g, " ")));
  }

  // Check if this matches any alias, add the canonical form
  for (const [canonical, aliasList] of Object.entries(BRAND_ALIASES)) {
    if (aliasList.includes(normalizedBrand.toUpperCase())) {
      variants.push(canonical, canonical.replace(/ /g, "_"));
    }
  }

  return [...new Set(variants)];
}

export async function GET(request: NextRequest) {
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

  // Search filter (name or brand)
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { brand: { contains: search, mode: "insensitive" } },
    ];
  }

  // Store filter
  if (stores.length > 0) {
    where.store = { in: stores as Store[] };
  }

  // Brand filter - expand to include all variants
  if (brands.length > 0) {
    const allBrandVariants = brands.flatMap(getBrandVariants);
    where.brand = { in: allBrandVariants, mode: "insensitive" };
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
    ranac: ["oprema/torbe", "oprema/rancevi"],
  };

  // Combine legacy categories with category paths
  const allCategoryPaths = [...categoryPaths];
  categories.forEach((cat) => {
    const paths = CATEGORY_TO_PATH[cat];
    if (paths) {
      allCategoryPaths.push(...paths);
    }
  });

  // Category paths filter (e.g., "obuca/patike")
  if (allCategoryPaths.length > 0) {
    where.categories = { hasSome: allCategoryPaths };
  }

  // Size filter - match exact or range (e.g., "36" matches "36" and "36-37")
  if (sizes.length > 0) {
    where.AND = [
      ...(where.AND as Prisma.DealWhereInput[] || []),
      {
        OR: sizes.map(size => ({
          OR: [
            { sizes: { has: size } },
            { sizes: { hasSome: [`${size}-`, `-${size}`].map(s => s) } },
          ]
        }))
      }
    ];
    // Simplified: just check if any selected size is in the sizes array
    // For range matching, we'd need raw SQL or post-filtering
    where.sizes = { hasSome: sizes };
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
      orderBy = { scrapedAt: "desc" };
      break;
    case "discount":
    default:
      orderBy = { discountPercent: "desc" };
      break;
  }

  try {
    // Get total count for pagination
    const total = await prisma.deal.count({ where });

    // Get paginated deals
    const deals = await prisma.deal.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get aggregations for filters (unique values)
    const [brandsAgg, storesAgg, gendersAgg] = await Promise.all([
      prisma.deal.groupBy({
        by: ["brand"],
        where: { discountPercent: { gte: 50 }, brand: { not: null } },
        _count: true,
      }),
      prisma.deal.groupBy({
        by: ["store"],
        where: { discountPercent: { gte: 50 } },
        _count: true,
      }),
      prisma.deal.groupBy({
        by: ["gender"],
        where: { discountPercent: { gte: 50 } },
        _count: true,
      }),
    ]);

    // Get price range
    const priceAgg = await prisma.deal.aggregate({
      where: { discountPercent: { gte: 50 } },
      _min: { salePrice: true },
      _max: { salePrice: true },
    });

    return NextResponse.json({
      deals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        brands: brandsAgg
          .filter(b => b.brand)
          .map(b => ({ name: b.brand!, count: b._count }))
          .sort((a, b) => b.count - a.count),
        stores: storesAgg.map(s => ({ name: s.store, count: s._count })),
        genders: gendersAgg.map(g => ({ name: g.gender, count: g._count })),
        priceRange: {
          min: priceAgg._min.salePrice || 0,
          max: priceAgg._max.salePrice || 100000,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching deals:", error);
    return NextResponse.json(
      { error: "Failed to fetch deals" },
      { status: 500 }
    );
  }
}
