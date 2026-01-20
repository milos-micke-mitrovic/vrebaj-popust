import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { DealsGrid } from "@/components/deals-grid";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Category, Gender, Store } from "@/types/deal";

// Revalidate every 5 minutes
export const revalidate = 300;

// Filter configurations for SEO pages
interface FilterConfig {
  type: "category" | "brand" | "gender" | "store";
  title: string;
  description: string;
  keywords: string[];
  // Initial values for DealsGrid
  initialCategories?: Category[];
  initialBrands?: string[];
  initialGenders?: Gender[];
  initialStores?: Store[];
}

// Popular categories for SEO
const CATEGORY_FILTERS: Record<string, FilterConfig> = {
  patike: {
    type: "category",
    title: "Patike na popustu",
    description: "Najbolji popusti na patike preko 50%. Nike, Adidas, Puma i druge poznate marke po sniženim cenama. Pronađi idealne patike za trčanje, trening ili svakodnevno nošenje.",
    keywords: ["patike popust", "patike akcija", "patike sniženje", "jeftine patike", "sportske patike"],
    initialCategories: ["patike"],
  },
  cipele: {
    type: "category",
    title: "Cipele na popustu",
    description: "Cipele na akciji sa popustima preko 50%. Sportske cipele, planinarske cipele i casual obuća po najboljim cenama u Srbiji.",
    keywords: ["cipele popust", "cipele akcija", "sportske cipele", "planinarske cipele"],
    initialCategories: ["cipele"],
  },
  cizme: {
    type: "category",
    title: "Čizme na popustu",
    description: "Čizme na sniženju preko 50%. Zimske čizme, planinarske čizme i čizme za kišu po povoljnim cenama.",
    keywords: ["čizme popust", "zimske čizme", "čizme sniženje", "čizme akcija"],
    initialCategories: ["cizme"],
  },
  jakne: {
    type: "category",
    title: "Jakne na popustu",
    description: "Sportske jakne sa popustima preko 50%. Zimske jakne, vetrovke, softshell jakne poznatih brendova.",
    keywords: ["jakne popust", "sportske jakne", "zimske jakne sniženje", "vetrovke akcija"],
    initialCategories: ["jakna"],
  },
  trenerke: {
    type: "category",
    title: "Trenerke na popustu",
    description: "Trenerke na akciji preko 50% popusta. Nike, Adidas, Puma trenerke i komplet trenerke po sniženim cenama.",
    keywords: ["trenerke popust", "trenerke akcija", "komplet trenerke", "sportske trenerke"],
    initialCategories: ["trenerka"],
  },
  majice: {
    type: "category",
    title: "Majice na popustu",
    description: "Sportske majice sa popustima preko 50%. Majice za trening, funkcionalne majice i casual majice.",
    keywords: ["majice popust", "sportske majice", "majice sniženje", "majice za trening"],
    initialCategories: ["majica"],
  },
  duksevi: {
    type: "category",
    title: "Duksevi na popustu",
    description: "Duksevi na sniženju preko 50%. Duksevi sa kapuljačom, zip duksevi i sportski duksevi poznatih brendova.",
    keywords: ["duksevi popust", "duksevi akcija", "duks sa kapuljačom", "sportski duksevi"],
    initialCategories: ["duks"],
  },
  sorcevi: {
    type: "category",
    title: "Šorcevi na popustu",
    description: "Sportski šorcevi sa popustima preko 50%. Šorcevi za trening, trčanje i svakodnevno nošenje poznatih brendova.",
    keywords: ["šorcevi popust", "sportski šorcevi", "šorcevi akcija", "šorcevi za trening"],
    initialCategories: ["sorc"],
  },
  helanke: {
    type: "category",
    title: "Helanke na popustu",
    description: "Sportske helanke sa popustima preko 50%. Helanke za trening, jogu i fitnes poznatih brendova po sniženim cenama.",
    keywords: ["helanke popust", "sportske helanke", "helanke za trening", "helanke akcija"],
    initialCategories: ["helanke"],
  },
};

// Popular brands for SEO
const BRAND_FILTERS: Record<string, FilterConfig> = {
  nike: {
    type: "brand",
    title: "Nike popusti",
    description: "Nike proizvodi na akciji sa popustima preko 50%. Nike patike, Nike trenerke, Nike jakne i ostala Nike oprema po sniženim cenama.",
    keywords: ["nike popust", "nike akcija", "nike patike", "nike srbija", "nike sniženje"],
    initialBrands: ["NIKE"],
  },
  adidas: {
    type: "brand",
    title: "Adidas popusti",
    description: "Adidas proizvodi na sniženju preko 50%. Adidas patike, Adidas trenerke i sportska oprema po najboljim cenama.",
    keywords: ["adidas popust", "adidas akcija", "adidas patike", "adidas srbija"],
    initialBrands: ["ADIDAS"],
  },
  puma: {
    type: "brand",
    title: "Puma popusti",
    description: "Puma proizvodi na akciji sa preko 50% popusta. Puma patike, Puma odeća i oprema po sniženim cenama u Srbiji.",
    keywords: ["puma popust", "puma akcija", "puma patike", "puma srbija"],
    initialBrands: ["PUMA"],
  },
  "new-balance": {
    type: "brand",
    title: "New Balance popusti",
    description: "New Balance patike i oprema na sniženju preko 50%. Pronađi NB 574, 990 i druge popularne modele po akcijskim cenama.",
    keywords: ["new balance popust", "new balance patike", "nb patike", "new balance srbija"],
    initialBrands: ["NEW BALANCE"],
  },
  "under-armour": {
    type: "brand",
    title: "Under Armour popusti",
    description: "Under Armour sportska oprema na akciji preko 50%. UA patike, kompresiona odeća i oprema za trening.",
    keywords: ["under armour popust", "under armour srbija", "ua patike", "under armour akcija"],
    initialBrands: ["UNDER ARMOUR"],
  },
  reebok: {
    type: "brand",
    title: "Reebok popusti",
    description: "Reebok proizvodi na sniženju preko 50%. Reebok patike, Reebok Classic i sportska odeća po povoljnim cenama.",
    keywords: ["reebok popust", "reebok patike", "reebok classic", "reebok srbija"],
    initialBrands: ["REEBOK"],
  },
  converse: {
    type: "brand",
    title: "Converse popusti",
    description: "Converse starke na akciji preko 50%. All Star, Chuck Taylor i druge Converse patike po sniženim cenama.",
    keywords: ["converse popust", "starke popust", "all star patike", "converse srbija"],
    initialBrands: ["CONVERSE"],
  },
  fila: {
    type: "brand",
    title: "Fila popusti",
    description: "Fila proizvodi na sniženju preko 50%. Fila patike, Fila odeća i retro modeli po akcijskim cenama.",
    keywords: ["fila popust", "fila patike", "fila srbija", "fila akcija"],
    initialBrands: ["FILA"],
  },
  champion: {
    type: "brand",
    title: "Champion popusti",
    description: "Champion proizvodi na akciji preko 50%. Champion duksevi, majice i sportska odeća po sniženim cenama.",
    keywords: ["champion popust", "champion duksevi", "champion srbija", "champion akcija"],
    initialBrands: ["CHAMPION"],
  },
  vans: {
    type: "brand",
    title: "Vans popusti",
    description: "Vans patike na sniženju preko 50%. Old Skool, Sk8-Hi i druge Vans patike po povoljnim cenama.",
    keywords: ["vans popust", "vans patike", "old skool popust", "vans srbija"],
    initialBrands: ["VANS"],
  },
  skechers: {
    type: "brand",
    title: "Skechers popusti",
    description: "Skechers patike na akciji preko 50%. Udobne Skechers patike za svakodnevno nošenje po sniženim cenama.",
    keywords: ["skechers popust", "skechers patike", "skechers srbija", "skechers akcija"],
    initialBrands: ["SKECHERS"],
  },
  asics: {
    type: "brand",
    title: "ASICS popusti",
    description: "ASICS patike na sniženju preko 50%. ASICS patike za trčanje i trening po akcijskim cenama u Srbiji.",
    keywords: ["asics popust", "asics patike", "asics srbija", "asics za trčanje"],
    initialBrands: ["ASICS"],
  },
  jordan: {
    type: "brand",
    title: "Jordan popusti",
    description: "Air Jordan patike na akciji preko 50%. Jordan 1, Jordan 4 i druge popularne Jordan patike po sniženim cenama.",
    keywords: ["jordan popust", "air jordan patike", "jordan srbija", "jordan 1 popust"],
    initialBrands: ["JORDAN"],
  },
  "the-north-face": {
    type: "brand",
    title: "The North Face popusti",
    description: "The North Face jakne i oprema na sniženju preko 50%. TNF jakne, duksevi i oprema za planinarenje.",
    keywords: ["the north face popust", "tnf jakne", "north face srbija", "north face akcija"],
    initialBrands: ["THE NORTH FACE"],
  },
  columbia: {
    type: "brand",
    title: "Columbia popusti",
    description: "Columbia sportska oprema na akciji preko 50%. Columbia jakne, cipele i outdoor oprema po sniženim cenama.",
    keywords: ["columbia popust", "columbia jakne", "columbia srbija", "columbia outdoor"],
    initialBrands: ["COLUMBIA"],
  },
  hoka: {
    type: "brand",
    title: "HOKA popusti",
    description: "HOKA patike na sniženju preko 50%. HOKA patike za trčanje i hodanje po akcijskim cenama.",
    keywords: ["hoka popust", "hoka patike", "hoka srbija", "hoka za trčanje"],
    initialBrands: ["HOKA"],
  },
  timberland: {
    type: "brand",
    title: "Timberland popusti",
    description: "Timberland čizme i cipele na akciji preko 50%. Timberland boots i casual obuća po sniženim cenama.",
    keywords: ["timberland popust", "timberland čizme", "timberland srbija", "timberland boots"],
    initialBrands: ["TIMBERLAND"],
  },
  lacoste: {
    type: "brand",
    title: "Lacoste popusti",
    description: "Lacoste proizvodi na sniženju preko 50%. Lacoste patike, polo majice i odeća po akcijskim cenama.",
    keywords: ["lacoste popust", "lacoste patike", "lacoste srbija", "lacoste polo"],
    initialBrands: ["LACOSTE"],
  },
  "tommy-hilfiger": {
    type: "brand",
    title: "Tommy Hilfiger popusti",
    description: "Tommy Hilfiger proizvodi na akciji preko 50%. Tommy Hilfiger patike, odeća i oprema po sniženim cenama.",
    keywords: ["tommy hilfiger popust", "tommy hilfiger srbija", "tommy hilfiger patike"],
    initialBrands: ["TOMMY HILFIGER"],
  },
  "calvin-klein": {
    type: "brand",
    title: "Calvin Klein popusti",
    description: "Calvin Klein proizvodi na sniženju preko 50%. CK patike, odeća i sportska oprema po akcijskim cenama.",
    keywords: ["calvin klein popust", "ck srbija", "calvin klein patike", "calvin klein akcija"],
    initialBrands: ["CALVIN KLEIN"],
  },
  levis: {
    type: "brand",
    title: "Levi's popusti",
    description: "Levi's proizvodi na akciji preko 50%. Levi's farmerke, majice i odeća po sniženim cenama u Srbiji.",
    keywords: ["levis popust", "levis farmerke", "levis srbija", "levi's akcija"],
    initialBrands: ["LEVI'S", "LEVIS"],
  },
  hummel: {
    type: "brand",
    title: "Hummel popusti",
    description: "Hummel sportska oprema na sniženju preko 50%. Hummel patike, trenerke i odeća po akcijskim cenama.",
    keywords: ["hummel popust", "hummel patike", "hummel srbija", "hummel trenerke"],
    initialBrands: ["HUMMEL"],
  },
  umbro: {
    type: "brand",
    title: "Umbro popusti",
    description: "Umbro sportska oprema na akciji preko 50%. Umbro patike, dresovi i fudbalska oprema po sniženim cenama.",
    keywords: ["umbro popust", "umbro patike", "umbro srbija", "umbro dresovi"],
    initialBrands: ["UMBRO"],
  },
  kappa: {
    type: "brand",
    title: "Kappa popusti",
    description: "Kappa sportska oprema na sniženju preko 50%. Kappa trenerke, patike i odeća po akcijskim cenama.",
    keywords: ["kappa popust", "kappa trenerke", "kappa srbija", "kappa patike"],
    initialBrands: ["KAPPA"],
  },
  ellesse: {
    type: "brand",
    title: "Ellesse popusti",
    description: "Ellesse proizvodi na akciji preko 50%. Ellesse retro patike, duksevi i odeća po sniženim cenama.",
    keywords: ["ellesse popust", "ellesse patike", "ellesse srbija", "ellesse duksevi"],
    initialBrands: ["ELLESSE"],
  },
  diadora: {
    type: "brand",
    title: "Diadora popusti",
    description: "Diadora patike i oprema na sniženju preko 50%. Diadora retro patike i sportska oprema po akcijskim cenama.",
    keywords: ["diadora popust", "diadora patike", "diadora srbija", "diadora retro"],
    initialBrands: ["DIADORA"],
  },
  mizuno: {
    type: "brand",
    title: "Mizuno popusti",
    description: "Mizuno patike na akciji preko 50%. Mizuno patike za trčanje i odbojku po sniženim cenama.",
    keywords: ["mizuno popust", "mizuno patike", "mizuno srbija", "mizuno za trčanje"],
    initialBrands: ["MIZUNO"],
  },
  salomon: {
    type: "brand",
    title: "Salomon popusti",
    description: "Salomon patike i oprema na sniženju preko 50%. Salomon trail patike i planinaraska oprema.",
    keywords: ["salomon popust", "salomon patike", "salomon srbija", "salomon trail"],
    initialBrands: ["SALOMON"],
  },
  crocs: {
    type: "brand",
    title: "Crocs popusti",
    description: "Crocs papuče na akciji preko 50%. Crocs Classic i druge Crocs papuče po sniženim cenama u Srbiji.",
    keywords: ["crocs popust", "crocs papuče", "crocs srbija", "crocs classic"],
    initialBrands: ["CROCS"],
  },
};

// Gender filters for SEO
const GENDER_FILTERS: Record<string, FilterConfig> = {
  muski: {
    type: "gender",
    title: "Muška sportska oprema na popustu",
    description: "Muška sportska oprema sa popustima preko 50%. Muške patike, trenerke, jakne i odeća poznatih brendova po sniženim cenama.",
    keywords: ["muška sportska oprema", "muške patike popust", "muške trenerke", "muška odeća akcija"],
    initialGenders: ["muski"],
  },
  zenski: {
    type: "gender",
    title: "Ženska sportska oprema na popustu",
    description: "Ženska sportska oprema na akciji preko 50%. Ženske patike, helanke, sportski grudnjaci i odeća po najboljim cenama.",
    keywords: ["ženska sportska oprema", "ženske patike popust", "ženske helanke", "ženska odeća akcija"],
    initialGenders: ["zenski"],
  },
  deciji: {
    type: "gender",
    title: "Dečija sportska oprema na popustu",
    description: "Dečija sportska oprema sa popustima preko 50%. Dečije patike, trenerke i odeća za decu po sniženim cenama.",
    keywords: ["dečija sportska oprema", "dečije patike popust", "dečije trenerke", "odeća za decu akcija"],
    initialGenders: ["deciji"],
  },
};

// Store filters for SEO (capture "djaksport popusti", "planeta sport akcije" searches)
const STORE_FILTERS: Record<string, FilterConfig> = {
  djaksport: {
    type: "store",
    title: "DjakSport popusti",
    description: "DjakSport popusti preko 50%. Najveće akcije i sniženja u DjakSport prodavnici - patike, odeća i sportska oprema.",
    keywords: ["djaksport popust", "djak sport akcija", "djaksport sniženje", "djaksport patike", "djak sport srbija"],
    initialStores: ["djaksport"],
  },
  "planeta-sport": {
    type: "store",
    title: "Planeta Sport popusti",
    description: "Planeta Sport popusti preko 50%. Akcije i sniženja u Planeta Sport prodavnici - patike, trenerke, jakne i sportska oprema.",
    keywords: ["planeta sport popust", "planeta sport akcija", "planeta sport sniženje", "planeta sport patike"],
    initialStores: ["planeta"],
  },
  "sport-vision": {
    type: "store",
    title: "Sport Vision popusti",
    description: "Sport Vision popusti preko 50%. Outlet akcije u Sport Vision prodavnici - Nike, Adidas, Puma i druge marke.",
    keywords: ["sport vision popust", "sportvision akcija", "sport vision outlet", "sport vision patike"],
    initialStores: ["sportvision"],
  },
  "n-sport": {
    type: "store",
    title: "N Sport popusti",
    description: "N Sport popusti preko 50%. Akcije i sniženja u N Sport online prodavnici - patike, odeća i oprema.",
    keywords: ["n sport popust", "nsport akcija", "n sport patike", "n sport srbija"],
    initialStores: ["nsport"],
  },
  buzz: {
    type: "store",
    title: "Buzz Sneakers popusti",
    description: "Buzz Sneakers popusti preko 50%. Akcije na patike i streetwear odeću u Buzz prodavnici.",
    keywords: ["buzz popust", "buzz sneakers akcija", "buzz patike", "buzz srbija"],
    initialStores: ["buzz"],
  },
  "office-shoes": {
    type: "store",
    title: "Office Shoes popusti",
    description: "Office Shoes popusti preko 50%. Akcije na obuću - patike, cipele, čizme i sandale u Office Shoes prodavnici.",
    keywords: ["office shoes popust", "officeshoes akcija", "office shoes patike", "office shoes srbija"],
    initialStores: ["officeshoes"],
  },
};

// Combined filters for long-tail SEO (brand + gender, brand + category, category + gender)
const COMBINED_FILTERS: Record<string, FilterConfig> = {
  // Nike combinations
  "nike-muski": {
    type: "brand",
    title: "Nike za muškarce",
    description: "Nike muška sportska oprema sa popustima preko 50%. Nike muške patike, trenerke i odeća po sniženim cenama.",
    keywords: ["nike muški", "nike za muškarce", "nike muške patike", "nike muška odeća"],
    initialBrands: ["NIKE"],
    initialGenders: ["muski"],
  },
  "nike-zenski": {
    type: "brand",
    title: "Nike za žene",
    description: "Nike ženska sportska oprema sa popustima preko 50%. Nike ženske patike, helanke i odeća po sniženim cenama.",
    keywords: ["nike ženski", "nike za žene", "nike ženske patike", "nike ženska odeća"],
    initialBrands: ["NIKE"],
    initialGenders: ["zenski"],
  },
  "nike-patike": {
    type: "brand",
    title: "Nike patike na popustu",
    description: "Nike patike sa popustima preko 50%. Air Max, Air Force 1, Jordan i druge Nike patike po sniženim cenama.",
    keywords: ["nike patike popust", "nike patike akcija", "nike air max popust", "nike patike srbija"],
    initialBrands: ["NIKE"],
    initialCategories: ["patike"],
  },
  // Adidas combinations
  "adidas-muski": {
    type: "brand",
    title: "Adidas za muškarce",
    description: "Adidas muška sportska oprema sa popustima preko 50%. Adidas muške patike, trenerke i odeća po sniženim cenama.",
    keywords: ["adidas muški", "adidas za muškarce", "adidas muške patike", "adidas muška odeća"],
    initialBrands: ["ADIDAS"],
    initialGenders: ["muski"],
  },
  "adidas-zenski": {
    type: "brand",
    title: "Adidas za žene",
    description: "Adidas ženska sportska oprema sa popustima preko 50%. Adidas ženske patike, helanke i odeća po sniženim cenama.",
    keywords: ["adidas ženski", "adidas za žene", "adidas ženske patike", "adidas ženska odeća"],
    initialBrands: ["ADIDAS"],
    initialGenders: ["zenski"],
  },
  "adidas-patike": {
    type: "brand",
    title: "Adidas patike na popustu",
    description: "Adidas patike sa popustima preko 50%. Superstar, Stan Smith, Ultraboost i druge Adidas patike po sniženim cenama.",
    keywords: ["adidas patike popust", "adidas patike akcija", "adidas superstar popust", "adidas patike srbija"],
    initialBrands: ["ADIDAS"],
    initialCategories: ["patike"],
  },
  // Puma combinations
  "puma-muski": {
    type: "brand",
    title: "Puma za muškarce",
    description: "Puma muška sportska oprema sa popustima preko 50%. Puma muške patike, trenerke i odeća po sniženim cenama.",
    keywords: ["puma muški", "puma za muškarce", "puma muške patike"],
    initialBrands: ["PUMA"],
    initialGenders: ["muski"],
  },
  "puma-zenski": {
    type: "brand",
    title: "Puma za žene",
    description: "Puma ženska sportska oprema sa popustima preko 50%. Puma ženske patike, helanke i odeća po sniženim cenama.",
    keywords: ["puma ženski", "puma za žene", "puma ženske patike"],
    initialBrands: ["PUMA"],
    initialGenders: ["zenski"],
  },
  "puma-patike": {
    type: "brand",
    title: "Puma patike na popustu",
    description: "Puma patike sa popustima preko 50%. Puma RS-X, Suede i druge Puma patike po sniženim cenama.",
    keywords: ["puma patike popust", "puma patike akcija", "puma patike srbija"],
    initialBrands: ["PUMA"],
    initialCategories: ["patike"],
  },
  // Category + gender combinations
  "patike-muski": {
    type: "category",
    title: "Muške patike na popustu",
    description: "Muške patike sa popustima preko 50%. Nike, Adidas, Puma i druge muške patike po sniženim cenama.",
    keywords: ["muške patike popust", "muške patike akcija", "muške sportske patike", "patike za muškarce"],
    initialCategories: ["patike"],
    initialGenders: ["muski"],
  },
  "patike-zenski": {
    type: "category",
    title: "Ženske patike na popustu",
    description: "Ženske patike sa popustima preko 50%. Nike, Adidas, Puma i druge ženske patike po sniženim cenama.",
    keywords: ["ženske patike popust", "ženske patike akcija", "ženske sportske patike", "patike za žene"],
    initialCategories: ["patike"],
    initialGenders: ["zenski"],
  },
  "patike-deciji": {
    type: "category",
    title: "Dečije patike na popustu",
    description: "Dečije patike sa popustima preko 50%. Nike, Adidas, Puma i druge dečije patike po sniženim cenama.",
    keywords: ["dečije patike popust", "dečije patike akcija", "patike za decu", "dečije sportske patike"],
    initialCategories: ["patike"],
    initialGenders: ["deciji"],
  },
  "trenerke-muski": {
    type: "category",
    title: "Muške trenerke na popustu",
    description: "Muške trenerke sa popustima preko 50%. Nike, Adidas, Puma muške trenerke po sniženim cenama.",
    keywords: ["muške trenerke popust", "muške trenerke akcija", "trenerke za muškarce"],
    initialCategories: ["trenerka"],
    initialGenders: ["muski"],
  },
  "trenerke-zenski": {
    type: "category",
    title: "Ženske trenerke na popustu",
    description: "Ženske trenerke sa popustima preko 50%. Nike, Adidas, Puma ženske trenerke po sniženim cenama.",
    keywords: ["ženske trenerke popust", "ženske trenerke akcija", "trenerke za žene"],
    initialCategories: ["trenerka"],
    initialGenders: ["zenski"],
  },
  "jakne-muski": {
    type: "category",
    title: "Muške jakne na popustu",
    description: "Muške sportske jakne sa popustima preko 50%. Zimske jakne, vetrovke i softshell jakne za muškarce.",
    keywords: ["muške jakne popust", "muške sportske jakne", "jakne za muškarce"],
    initialCategories: ["jakna"],
    initialGenders: ["muski"],
  },
  "jakne-zenski": {
    type: "category",
    title: "Ženske jakne na popustu",
    description: "Ženske sportske jakne sa popustima preko 50%. Zimske jakne, vetrovke i softshell jakne za žene.",
    keywords: ["ženske jakne popust", "ženske sportske jakne", "jakne za žene"],
    initialCategories: ["jakna"],
    initialGenders: ["zenski"],
  },
  "duksevi-muski": {
    type: "category",
    title: "Muški duksevi na popustu",
    description: "Muški duksevi sa popustima preko 50%. Duksevi sa kapuljačom i zip duksevi za muškarce.",
    keywords: ["muški duksevi popust", "duksevi za muškarce", "muški duksevi akcija"],
    initialCategories: ["duks"],
    initialGenders: ["muski"],
  },
  "duksevi-zenski": {
    type: "category",
    title: "Ženski duksevi na popustu",
    description: "Ženski duksevi sa popustima preko 50%. Duksevi sa kapuljačom i crop duksevi za žene.",
    keywords: ["ženski duksevi popust", "duksevi za žene", "ženski duksevi akcija"],
    initialCategories: ["duks"],
    initialGenders: ["zenski"],
  },
  "helanke-zenski": {
    type: "category",
    title: "Ženske helanke na popustu",
    description: "Ženske sportske helanke sa popustima preko 50%. Helanke za trening, jogu i fitnes.",
    keywords: ["ženske helanke popust", "sportske helanke", "helanke za trening"],
    initialCategories: ["helanke"],
    initialGenders: ["zenski"],
  },
  "majice-muski": {
    type: "category",
    title: "Muške majice na popustu",
    description: "Muške sportske majice sa popustima preko 50%. Majice za trening i casual majice za muškarce.",
    keywords: ["muške majice popust", "sportske majice za muškarce", "muške majice akcija"],
    initialCategories: ["majica"],
    initialGenders: ["muski"],
  },
  "majice-zenski": {
    type: "category",
    title: "Ženske majice na popustu",
    description: "Ženske sportske majice sa popustima preko 50%. Majice za trening i casual majice za žene.",
    keywords: ["ženske majice popust", "sportske majice za žene", "ženske majice akcija"],
    initialCategories: ["majica"],
    initialGenders: ["zenski"],
  },
};

// Combine all filters
const ALL_FILTERS: Record<string, FilterConfig> = {
  ...CATEGORY_FILTERS,
  ...BRAND_FILTERS,
  ...GENDER_FILTERS,
  ...STORE_FILTERS,
  ...COMBINED_FILTERS,
};

// Generate static params for all filter pages
export async function generateStaticParams() {
  return Object.keys(ALL_FILTERS).map((filter) => ({ filter }));
}

interface Props {
  params: Promise<{ filter: string }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { filter } = await params;
  const config = ALL_FILTERS[filter];

  if (!config) {
    return {
      title: "Stranica nije pronađena | VrebajPopust",
    };
  }

  return {
    title: `${config.title} | VrebajPopust`,
    description: config.description,
    keywords: config.keywords,
    openGraph: {
      title: `${config.title} | VrebajPopust`,
      description: config.description,
      type: "website",
      locale: "sr_RS",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    alternates: {
      canonical: `https://vrebajpopust.rs/ponude/${filter}`,
    },
  };
}

// Build Prisma where clause from config
function buildWhereClause(config: FilterConfig) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { discountPercent: { gte: 50 } };

  if (config.initialBrands?.length) {
    where.brand = { in: config.initialBrands, mode: "insensitive" };
  }
  if (config.initialGenders?.length) {
    where.gender = { in: config.initialGenders };
  }
  if (config.initialStores?.length) {
    where.store = { in: config.initialStores };
  }
  // Category filtering is more complex since it's derived from name/url - skip for now
  // The API will handle category filtering client-side

  return where;
}

export default async function FilterPage({ params }: Props) {
  const { filter } = await params;
  const config = ALL_FILTERS[filter];

  if (!config) {
    notFound();
  }

  // Get just count and top deals for SEO schema
  const where = buildWhereClause(config);
  const [totalCount, topDeals] = await Promise.all([
    prisma.deal.count({ where }),
    prisma.deal.findMany({
      where,
      orderBy: { discountPercent: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        brand: true,
        salePrice: true,
        imageUrl: true,
      },
    }),
  ]);

  // Schema for SEO
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: config.title,
    description: config.description,
    url: `https://www.vrebajpopust.rs/ponude/${filter}`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: totalCount,
      itemListElement: topDeals.map((deal, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Product",
          name: deal.name,
          url: `https://www.vrebajpopust.rs/ponuda/${deal.id}`,
          image: deal.imageUrl,
          brand: deal.brand ? { "@type": "Brand", name: deal.brand } : undefined,
          offers: {
            "@type": "Offer",
            price: deal.salePrice,
            priceCurrency: "RSD",
            availability: "https://schema.org/InStock",
          },
        },
      })),
    },
  };

  // Breadcrumb structured data
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Ponude",
        item: "https://www.vrebajpopust.rs/ponude",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: config.title,
        item: `https://www.vrebajpopust.rs/ponude/${filter}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
        <Header />

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
          <Suspense
            fallback={
              <div className="py-12 text-center text-gray-500 dark:text-gray-400">Učitavanje...</div>
            }
          >
            <DealsGrid
              initialCategories={config.initialCategories}
              initialBrands={config.initialBrands}
              initialGenders={config.initialGenders}
            />
          </Suspense>
        </main>

        <Footer />
      </div>
    </>
  );
}
