// Brand descriptions for product detail pages
// These descriptions provide SEO-friendly content about popular sports brands

interface BrandInfo {
  description: string;
  shortDescription: string;
  country?: string;
  founded?: number;
  specialty?: string;
}

export const BRAND_DESCRIPTIONS: Record<string, BrandInfo> = {
  nike: {
    description:
      "Nike je američki multinacionalni brend sportske opreme, najveći svetski proizvođač sportske obuće i odeće. Osnovan 1964. godine pod nazivom Blue Ribbon Sports, kompanija je postala sinonim za inovativni dizajn i vrhunske performanse. Nike patike poput Air Max, Air Force 1 i Jordan serije revolucionisale su industriju sportske obuće.",
    shortDescription: "Američki lider u proizvodnji sportske obuće i odeće",
    country: "SAD",
    founded: 1964,
    specialty: "Sportska obuća i odeća",
  },
  adidas: {
    description:
      "Adidas je nemački sportski brend sa tradicijom dugom više od 70 godina. Osnovan 1949. godine od strane Adolfa Daslera, Adidas je poznat po ikoničnim modelima poput Superstar, Stan Smith i Ultraboost. Kompanija je sinonim za spoj sportskih performansi i uličnog stila, sa snažnim prisustvom u fudbalu, košarci i lifestajl modi.",
    shortDescription: "Nemački brend sa 70+ godina tradicije u sportu",
    country: "Nemačka",
    founded: 1949,
    specialty: "Sportska obuća, odeća i oprema",
  },
  puma: {
    description:
      "Puma je nemački sportski brend osnovan 1948. godine od strane Rudolfa Daslera, brata osnivača Adidasa. Poznat po inovativnom dizajnu i saradnji sa vrhunskim sportistima i dizajnerima, Puma kombinuje sportske performanse sa modernim streetwear stilom. Suede i RS-X su među njihovim najpopularnijim modelima.",
    shortDescription: "Nemački brend poznat po inovativnom dizajnu",
    country: "Nemačka",
    founded: 1948,
    specialty: "Sportska obuća i moda",
  },
  "new balance": {
    description:
      "New Balance je američki proizvođač sportske obuće osnovan 1906. godine u Bostonu. Poznat po vrhunskom kvalitetu izrade i udobnosti, New Balance je jedini veliki brend koji i dalje proizvodi patike u SAD. Njihovi modeli 574, 990 i 550 su postali ikone kako u sportu tako i u svakodnevnoj modi.",
    shortDescription: "Američki brend poznat po kvalitetu i udobnosti",
    country: "SAD",
    founded: 1906,
    specialty: "Trčanje i lifestyle obuća",
  },
  reebok: {
    description:
      "Reebok je britanski sportski brend sa bogatom istorijom koja seže do 1958. godine. Poznat po modelima poput Classic Leather i Club C, Reebok je bio prvi brend koji je lansirao patike dizajnirane specijalno za žene. Danas je poznat po fitness opremi i retro streetwear stilu.",
    shortDescription: "Britanski brend sa fokusom na fitness",
    country: "Velika Britanija",
    founded: 1958,
    specialty: "Fitness i lifestyle obuća",
  },
  converse: {
    description:
      "Converse je američki brend osnovan 1908. godine, poznat po ikoničnim Chuck Taylor All Star patikama. Već više od 100 godina, Converse patike su simbol mladosti, bunta i kreativnosti. Od košarkaških terena do rok bina, Chuck Taylor je jedna od najprodavanijih patika svih vremena.",
    shortDescription: "Ikona američke kulture sa 100+ godina tradicije",
    country: "SAD",
    founded: 1908,
    specialty: "Lifestyle obuća",
  },
  vans: {
    description:
      "Vans je američki brend osnovan 1966. godine u Kaliforniji, sinonim za skateboard kulturu. Old Skool, Sk8-Hi i Era su među najprepoznatljivijim modelima u svetu skejtinga i urbane mode. Vans patike su poznate po izdržljivosti, jednostavnom dizajnu i vulkanizovanoj gumenoj đon konstrukciji.",
    shortDescription: "Kalifornijski brend i ikona skateboard kulture",
    country: "SAD",
    founded: 1966,
    specialty: "Skateboard i lifestyle obuća",
  },
  asics: {
    description:
      "ASICS je japanski brend sportske opreme osnovan 1949. godine. Ime je akronim latinske izreke 'Anima Sana In Corpore Sano' (zdrav duh u zdravom telu). Poznat po naprednoj tehnologiji za trčanje, posebno GEL sistemu amortizacije, ASICS je izbor profesionalnih trkača širom sveta.",
    shortDescription: "Japanski brend specijalizovan za trčanje",
    country: "Japan",
    founded: 1949,
    specialty: "Trkačka obuća",
  },
  "under armour": {
    description:
      "Under Armour je američki brend sportske opreme osnovan 1996. godine. Započeli su sa revolucionarnim kompresionim majicama koje odvode vlagu od tela. Danas su poznati po inovativnoj sportskoj odeći i obući, posebno popularni među profesionalnim sportistima u košarci i američkom fudbalu.",
    shortDescription: "Američki brend poznat po inovativnoj sportskoj odeći",
    country: "SAD",
    founded: 1996,
    specialty: "Performans sportska odeća",
  },
  fila: {
    description:
      "FILA je italijanski sportski brend osnovan 1911. godine u Bieli. Originalno proizvođač donjeg veša, FILA je 70-ih godina prešao na sportsku odeću i obuću. Poznat po retro estetici i Disruptor modelu koji je 2018. postao viralna senzacija, FILA kombinuje italijanski stil sa sportskim performansama.",
    shortDescription: "Italijanski brend sa retro estetikom",
    country: "Italija",
    founded: 1911,
    specialty: "Sportska moda i obuća",
  },
  champion: {
    description:
      "Champion je američki brend sportske odeće osnovan 1919. godine. Poznat kao izumitelj hoodie-ja i prvi brend koji je stavio logo na odeću, Champion ima bogatu istoriju u američkom sportu. Njihova Reverse Weave tehnologija iz 1930-ih i danas se koristi u proizvodnji dukseva.",
    shortDescription: "Američki brend i izumitelj hoodie-ja",
    country: "SAD",
    founded: 1919,
    specialty: "Sportski duksevi i odeća",
  },
  "the north face": {
    description:
      "The North Face je američki brend outdoor opreme osnovan 1966. godine u San Francisku. Ime je dobio po najhladnijoj strani planine na severnoj hemisferi. Poznat po jakama, rancima i opremi za planinarenje, The North Face je izbor avanturista i ljubitelja prirode širom sveta.",
    shortDescription: "Američki lider u outdoor opremi",
    country: "SAD",
    founded: 1966,
    specialty: "Outdoor odeća i oprema",
  },
  "columbia sportswear": {
    description:
      "Columbia Sportswear je američki brend outdoor opreme osnovan 1938. godine u Portlandu. Poznat po inovativnim tehnologijama poput Omni-Heat i Omni-Tech, Columbia proizvodi odeću za sve vremenske uslove. Od planinarenja do ribolova, Columbia oprema je dizajnirana za aktivni život na otvorenom.",
    shortDescription: "Američki brend za outdoor avanturu",
    country: "SAD",
    founded: 1938,
    specialty: "Outdoor odeća",
  },
  skechers: {
    description:
      "Skechers je američki brend obuće osnovan 1992. godine u Kaliforniji. Poznat po udobnoj obući za svakodnevnu upotrebu, Skechers je razvio Memory Foam tehnologiju koja pruža izuzetnu amortizaciju. Od sportske do casual obuće, Skechers nudi širok asortiman za celu porodicu.",
    shortDescription: "Američki brend poznat po udobnosti",
    country: "SAD",
    founded: 1992,
    specialty: "Udobna obuća za svakodnevnu upotrebu",
  },
  "jordan (nike)": {
    description:
      "Jordan Brand je premium linija Nike-a osnovana 1984. godine u saradnji sa legendom NBA-a Majklom Džordanom. Air Jordan 1, lansiran 1985. godine, promenio je industriju sportske obuće zauvek. Danas Jordan Brand obuhvata obuću, odeću i opremu, i ostaje sinonim za košarkašku kulturu i streetwear.",
    shortDescription: "Premium Nike linija inspirisana Majklom Džordanom",
    country: "SAD",
    founded: 1984,
    specialty: "Košarkaška obuća i streetwear",
  },
  jordan: {
    description:
      "Jordan Brand je premium linija Nike-a osnovana 1984. godine u saradnji sa legendom NBA-a Majklom Džordanom. Air Jordan 1, lansiran 1985. godine, promenio je industriju sportske obuće zauvek. Danas Jordan Brand obuhvata obuću, odeću i opremu, i ostaje sinonim za košarkašku kulturu i streetwear.",
    shortDescription: "Premium Nike linija inspirisana Majklom Džordanom",
    country: "SAD",
    founded: 1984,
    specialty: "Košarkaška obuća i streetwear",
  },
  hoka: {
    description:
      "HOKA je francuski brend trkačke obuće osnovan 2009. godine. Poznat po maksimalističkom pristupu amortizaciji i debljim međuđonovima, HOKA patike pružaju izuzetnu udobnost za dugačke distance. Originalno dizajnirane za ultra-maratonce, danas su popularne i među rekreativnim trkačima.",
    shortDescription: "Francuski brend za maksimalnu amortizaciju",
    country: "Francuska",
    founded: 2009,
    specialty: "Trkačka obuća",
  },
  "on running": {
    description:
      "On je švajcarski brend trkačke obuće osnovan 2010. godine. Poznat po inovativnoj CloudTec tehnologiji koja pruža osećaj trčanja po oblacima, On je brzo stekao popularnost među profesionalnim i rekreativnim trkačima. Minimalistički švajcarski dizajn i vrhunske performanse su njihov zaštitni znak.",
    shortDescription: "Švajcarski brend sa CloudTec tehnologijom",
    country: "Švajcarska",
    founded: 2010,
    specialty: "Premium trkačka obuća",
  },
  hummel: {
    description:
      "Hummel je danski sportski brend osnovan 1923. godine. Poznat po karakterističnim chevron prugama, Hummel ima dugu tradiciju u fudbalu i rukometu. Kombinujući skandinavski dizajn sa sportskim nasleđem, Hummel nudi odeću i obuću koja spaja funkcionalnost i stil.",
    shortDescription: "Danski brend sa tradicijom u ekipnim sportovima",
    country: "Danska",
    founded: 1923,
    specialty: "Fudbal i rukomet",
  },
  umbro: {
    description:
      "Umbro je engleski sportski brend osnovan 1924. godine u Mančesteru. Sa 100 godina tradicije u fudbalu, Umbro je opremao neke od najslavnijih fudbalskih timova sveta. Karakteristični dupli dijamant logo je simbol fudbalske istorije i britanskog sportskog nasleđa.",
    shortDescription: "Engleski brend sa 100 godina fudbalske tradicije",
    country: "Velika Britanija",
    founded: 1924,
    specialty: "Fudbalska oprema",
  },
  kappa: {
    description:
      "Kappa je italijanski sportski brend osnovan 1967. godine u Torinu. Poznat po ikoničnom 'Omini' logu koji prikazuje dvoje ljudi naslonjena leđima, Kappa je bio pionir u kombinovanju sporta i mode. Posebno popularan u fudbalu i retro streetwear sceni.",
    shortDescription: "Italijanski brend sa prepoznatljivim Omini logom",
    country: "Italija",
    founded: 1967,
    specialty: "Fudbal i streetwear",
  },
  lotto: {
    description:
      "Lotto je italijanski sportski brend osnovan 1973. godine. Specijalizovan za fudbal i tenis, Lotto je opremao brojne svetske sportiste. Italijanski kvalitet izrade i pristupačne cene čine Lotto popularnim izborom za sportsku obuću i odeću u Srbiji i širom Evrope.",
    shortDescription: "Italijanski brend za fudbal i tenis",
    country: "Italija",
    founded: 1973,
    specialty: "Fudbalska i teniska oprema",
  },
  ellesse: {
    description:
      "Ellesse je italijanski sportski brend osnovan 1959. godine. Originalno fokusiran na skijašku opremu, Ellesse je postao simbol sportske elegancije 80-ih godina. Danas je poznat po retro estetici i popularnosti u streetwear modi, posebno po karakterističnom polulogu logo.",
    shortDescription: "Italijanski brend sa retro sportskim stilom",
    country: "Italija",
    founded: 1959,
    specialty: "Sportska moda",
  },
  diadora: {
    description:
      "Diadora je italijanski sportski brend osnovan 1948. godine. Ime potiče od grčke reči za 'podelu darova među pobednicima'. Poznat po kvalitetnoj fudbalskoj i teniskoj obući, Diadora kombinuje italijansku zanatsku tradiciju sa sportskim performansama.",
    shortDescription: "Italijanski brend sa zanatskom tradicijom",
    country: "Italija",
    founded: 1948,
    specialty: "Fudbalska i teniska obuća",
  },
  "le coq sportif": {
    description:
      "Le Coq Sportif je francuski sportski brend osnovan 1882. godine, jedan od najstarijih sportskih brendova na svetu. Petao kao logo simbolizuje francuski ponos i sportski duh. Poznat po elegantnom dizajnu i kvalitetu, Le Coq Sportif je opremao brojne sportske timove i šampione.",
    shortDescription: "Najstariji francuski sportski brend",
    country: "Francuska",
    founded: 1882,
    specialty: "Sportska odeća i obuća",
  },
  "sergio tacchini": {
    description:
      "Sergio Tacchini je italijanski sportski brend osnovan 1966. godine od strane istoimenog tenisera. Poznat po elegantnoj teniskoj odeći i retro stilu, Sergio Tacchini je bio favorit na teniskim terenima 70-ih i 80-ih. Danas je popularan u vintage i streetwear modi.",
    shortDescription: "Italijanski teniski brend sa retro stilom",
    country: "Italija",
    founded: 1966,
    specialty: "Teniska moda",
  },
  wilson: {
    description:
      "Wilson je američki brend sportske opreme osnovan 1913. godine. Lider u proizvodnji teniskih reketa, lopti za sve sportove i sportske opreme. Wilson oprema koriste profesionalni sportisti u tenisu, košarci, američkom fudbalu i golfu širom sveta.",
    shortDescription: "Američki lider u sportskoj opremi",
    country: "SAD",
    founded: 1913,
    specialty: "Teniski reketi i sportska oprema",
  },
  head: {
    description:
      "HEAD je austrijski brend sportske opreme osnovan 1950. godine. Originalno proizvođač skija, HEAD je postao lider u proizvodnji teniskih reketa i opreme. Poznat po inovacijama i vrhunskom kvalitetu, HEAD opremu koriste profesionalni teniseri i skijaši.",
    shortDescription: "Austrijski brend za tenis i skijanje",
    country: "Austrija",
    founded: 1950,
    specialty: "Teniski reketi i skijaška oprema",
  },
  "lacoste sport": {
    description:
      "Lacoste Sport je sportska linija poznatog francuskog brenda osnovanog 1933. godine od strane teniske legende Renea Lakosta. Prepoznatljiv po ikoničnom krokodil logu, Lacoste Sport kombinuje francusku eleganciju sa sportskim performansama, posebno u tenisu.",
    shortDescription: "Francuska elegancija u sportu",
    country: "Francuska",
    founded: 1933,
    specialty: "Teniska moda",
  },
  lacoste: {
    description:
      "Lacoste je poznati francuski brend osnovan 1933. godine od strane teniske legende Renea Lakosta. Prepoznatljiv po ikoničnom krokodil logu, Lacoste kombinuje francusku eleganciju sa sportskim nasleđem. Od teniskih terena do svakodnevne mode, Lacoste je sinonim za klasičan stil.",
    shortDescription: "Francuska elegancija sa sportskim korenom",
    country: "Francuska",
    founded: 1933,
    specialty: "Sportska moda i lifestyle",
  },
  mizuno: {
    description:
      "Mizuno je japanski brend sportske opreme osnovan 1906. godine. Poznat po preciznoj izradi i vrhunskoj tehnologiji, Mizuno proizvodi opremu za trčanje, bejzbol, odbojku i druge sportove. Wave tehnologija u obući pruža izuzetnu stabilnost i amortizaciju.",
    shortDescription: "Japanski brend sa 115+ godina tradicije",
    country: "Japan",
    founded: 1906,
    specialty: "Trkačka obuća i sportska oprema",
  },
  salomon: {
    description:
      "Salomon je francuski brend outdoor opreme osnovan 1947. godine u francuskim Alpima. Originalno proizvođač skijaških vezova, Salomon je danas lider u trail trčanju i planinarenju. Speedcross i X Ultra su među najpopularnijim modelima za off-road avanturu.",
    shortDescription: "Francuski brend za trail i planinarenje",
    country: "Francuska",
    founded: 1947,
    specialty: "Trail obuća i outdoor oprema",
  },
  merrell: {
    description:
      "Merrell je američki brend outdoor obuće osnovan 1981. godine. Fokusiran na planinarsku i trail obuću, Merrell kombinuje udobnost sa izdržljivošću za aktivnosti na otvorenom. Moab serija je jedna od najprodavanijih planinarskih čizama na svetu.",
    shortDescription: "Američki brend za planinarenje",
    country: "SAD",
    founded: 1981,
    specialty: "Planinarska obuća",
  },
  timberland: {
    description:
      "Timberland je američki brend obuće i odeće osnovan 1952. godine. Poznati po ikoničnoj žutoj radničkoj čizmi, Timberland kombinuje kvalitetnu izradu sa urbanim stilom. Od outdoor avantura do gradskih ulica, Timberland obuća je sinonim za izdržljivost i stil.",
    shortDescription: "Američki brend poznat po žutoj čizmi",
    country: "SAD",
    founded: 1952,
    specialty: "Čizme i outdoor obuća",
  },
  "tommy hilfiger": {
    description:
      "Tommy Hilfiger je američki modni brend osnovan 1985. godine. Poznat po klasičnom američkom stilu sa karakterističnom crveno-belo-plavom estetikom, Tommy Hilfiger nudi odeću, obuću i aksesoar za one koji cene preppy stil i kvalitetnu izradu.",
    shortDescription: "Američki brend klasičnog preppy stila",
    country: "SAD",
    founded: 1985,
    specialty: "Casual moda",
  },
  "calvin klein": {
    description:
      "Calvin Klein je američki modni brend osnovan 1968. godine. Poznat po minimalističkom dizajnu i ikoničnim reklamnim kampanjama, Calvin Klein nudi odeću, donji veš i aksesoar. CK sportska linija kombinuje njujorški stil sa udobnošću za aktivan život.",
    shortDescription: "Američki brend minimalističkog dizajna",
    country: "SAD",
    founded: 1968,
    specialty: "Moda i donji veš",
  },
  guess: {
    description:
      "GUESS je američki modni brend osnovan 1981. godine u Los Anđelesu. Poznat po seksepilu, glamuru i denim modi, GUESS je sinonim za kalifornijski lifestyle. Od džinsa do sportske odeće, GUESS kombinuje modni stil sa svakodnevnom udobnošću.",
    shortDescription: "Američki brend kalifornijskog glamura",
    country: "SAD",
    founded: 1981,
    specialty: "Denim i casual moda",
  },
  levis: {
    description:
      "Levi's je američki brend osnovan 1853. godine, izumitelj džinsa kakvog danas poznajemo. Model 501 je najpoznatija i najprodavanija farmerka u istoriji. Sa 170+ godina tradicije, Levi's je ikona američke kulture i sinonim za kvalitetnu denim odeću.",
    shortDescription: "Izumitelj džinsa sa 170+ godina tradicije",
    country: "SAD",
    founded: 1853,
    specialty: "Denim odeća",
  },
  "levi's": {
    description:
      "Levi's je američki brend osnovan 1853. godine, izumitelj džinsa kakvog danas poznajemo. Model 501 je najpoznatija i najprodavanija farmerka u istoriji. Sa 170+ godina tradicije, Levi's je ikona američke kulture i sinonim za kvalitetnu denim odeću.",
    shortDescription: "Izumitelj džinsa sa 170+ godina tradicije",
    country: "SAD",
    founded: 1853,
    specialty: "Denim odeća",
  },
  wrangler: {
    description:
      "Wrangler je američki denim brend osnovan 1947. godine. Originalno dizajniran za kauboje i rodeo jahače, Wrangler je poznat po izdržljivim džinsovima i western stilu. Autentični američki brend sa bogatom tradicijom u Western kulturi.",
    shortDescription: "Američki brend autentičnog Western stila",
    country: "SAD",
    founded: 1947,
    specialty: "Western denim",
  },
  superdry: {
    description:
      "Superdry je britanski modni brend osnovan 2003. godine. Poznat po fuziji japanske grafike i američkog vintage stila, Superdry nudi odeću sa karakterističnim logo dizajnom i premium materijalima. Posebno popularne su njihove jakne i duksevi.",
    shortDescription: "Britanski brend japansko-američke fuzije",
    country: "Velika Britanija",
    founded: 2003,
    specialty: "Lifestyle odeća",
  },
  "jack & jones": {
    description:
      "Jack & Jones je danski modni brend osnovan 1989. godine, deo Bestseller grupe. Fokusiran na mušku modu, Jack & Jones nudi casual odeću, džins i aksesoar po pristupačnim cenama. Skandinavski dizajn za modernog muškarca.",
    shortDescription: "Danski brend muške casual mode",
    country: "Danska",
    founded: 1989,
    specialty: "Muška moda",
  },
  "g-star raw": {
    description:
      "G-Star RAW je holandski denim brend osnovan 1989. godine. Poznat po inovativnom pristupu džinsu i 3D konstrukciji, G-Star je pionir u premium denim industriji. RAW pristup dizajnu i fokus na održivost čine ih jedinstvenim na tržištu.",
    shortDescription: "Holandski inovator u premium denimu",
    country: "Holandija",
    founded: 1989,
    specialty: "Premium denim",
  },
  diesel: {
    description:
      "Diesel je italijanski modni brend osnovan 1978. godine. Poznat po premium džinsu, provokativnim kampanjama i alternativnom duhu, Diesel je sinonim za buntovničku modu. Od denim-a do satova, Diesel nudi lifestyle proizvode za one koji se usuđuju da budu drugačiji.",
    shortDescription: "Italijanski brend premium džinsa i buntovničkog duha",
    country: "Italija",
    founded: 1978,
    specialty: "Premium denim i lifestyle",
  },
  replay: {
    description:
      "Replay je italijanski denim brend osnovan 1981. godine. Specijalizovan za premium džins sa vintage estetikom, Replay kombinuje italijansku zanatsku tradiciju sa modernim streetwear stilom. Poznati su po autentičnim plavim tonovima i kvalitetnoj izradi.",
    shortDescription: "Italijanski premium denim brend",
    country: "Italija",
    founded: 1981,
    specialty: "Premium denim",
  },
  "tommy jeans": {
    description:
      "Tommy Jeans je mlađa, streetwear linija Tommy Hilfiger brenda. Fokusirana na denim, casual odeću i retro 90s estetiku, Tommy Jeans je popularna među mlađom generacijom koja ceni autentični američki stil sa savremenim twist-om.",
    shortDescription: "Streetwear linija Tommy Hilfiger-a",
    country: "SAD",
    founded: 1985,
    specialty: "Streetwear i denim",
  },
  crocs: {
    description:
      "Crocs je američki brend obuće osnovan 2002. godine. Poznati po ikoničnim gumenim clogovima sa ventilacionim rupama, Crocs su postali globalni fenomen zahvaljujući udobnosti i praktičnosti. Od kontroverznog dizajna do modne ikone, Crocs su osvojili svet.",
    shortDescription: "Američki brend ikonične udobne obuće",
    country: "SAD",
    founded: 2002,
    specialty: "Casual gumena obuća",
  },
  birkenstock: {
    description:
      "Birkenstock je nemački brend obuće sa tradicijom od 1774. godine. Poznati po ortopedskim sandalama sa anatomski oblikovanim gazištem od plute, Birkenstock kombinuje zdravlje stopala sa zeitgeist modom. Arizona i Boston su njihovi najpopularniji modeli.",
    shortDescription: "Nemački brend ortopedske obuće od 1774.",
    country: "Nemačka",
    founded: 1774,
    specialty: "Ortopedske sandale",
  },
  havaianas: {
    description:
      "Havaianas je brazilski brend japanki osnovan 1962. godine. Inspirisane japanskim Zori sandalama, Havaianas su postale sinonim za brazilski životni stil i letnju modu. Poznate po udobnosti, izdržljivosti i širokoj paleti boja i dizajna.",
    shortDescription: "Brazilski brend ikoničnih japanki",
    country: "Brazil",
    founded: 1962,
    specialty: "Japanke",
  },
};

/**
 * Get brand info by brand name (case-insensitive)
 */
export function getBrandInfo(brand: string | null | undefined): BrandInfo | null {
  if (!brand) return null;
  const normalizedBrand = brand.toLowerCase().trim();
  return BRAND_DESCRIPTIONS[normalizedBrand] || null;
}

/**
 * Get brand description for SEO content
 */
export function getBrandDescription(brand: string | null | undefined): string | null {
  const info = getBrandInfo(brand);
  return info?.description || null;
}
