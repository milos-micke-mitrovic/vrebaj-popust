import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma, Store, Gender } from "@prisma/client";
import { normalizeBrand, getBrandVariants } from "@/lib/brand-utils";

const ITEMS_PER_PAGE = 32;
const MAX_ITEMS_PER_PAGE = 100; // Prevent DoS via huge limit
const MAX_PAGE = 1000; // Prevent DoS via huge page numbers

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

  // Category paths filter (e.g., "obuca/patike")
  if (expandedCategoryPaths.length > 0) {
    where.categories = { hasSome: expandedCategoryPaths };
  } else if (filterOstalo) {
    // "ostalo" means products with empty categories array
    where.categories = { isEmpty: true };
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
      orderBy = { createdAt: "desc" };
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

    // Normalize and deduplicate brands (merge "adidas", "Adidas", "ADIDAS" into one)
    const brandMap = new Map<string, { name: string; count: number }>();
    for (const b of brandsAgg) {
      if (!b.brand) continue;
      // Use normalizeBrand to:
      // - Filter out gender words (MUSKA, ZENSKE, ZENSKI, etc.)
      // - Filter out category words (RANAC, SANDALE, etc.)
      // - Merge aliases (CALVIN -> CALVIN KLEIN, THE -> THE NORTH FACE, etc.)
      // - Convert underscores to spaces (MOON_BOOT -> MOON BOOT)
      const normalized = normalizeBrand(b.brand);
      if (!normalized) continue; // Skip invalid brands (genders/categories)

      const existing = brandMap.get(normalized);
      if (existing) {
        existing.count += b._count;
      } else {
        brandMap.set(normalized, { name: normalized, count: b._count });
      }
    }
    const normalizedBrandsResult = Array.from(brandMap.values()).sort((a, b) => b.count - a.count);

    return NextResponse.json({
      deals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        brands: normalizedBrandsResult,
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
