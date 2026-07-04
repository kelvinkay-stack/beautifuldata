import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const updated = '2026-07-03';

const palette = [
  '#4C8DFF', '#2FB4FF', '#67E8F9', '#23C8A8', '#34D399', '#A3E635',
  '#FFD84D', '#FFB020', '#FF8C42', '#FF5C4D', '#F43F5E', '#FF6FA5',
  '#E879F9', '#B388FF', '#8B5CF6', '#6E7BFF', '#94A3B8', '#C4B5A0',
  '#FCA5A5', '#FDE68A', '#86EFAC', '#D4D4D8', '#E2B93B', '#B45309'
];

function entities(items) {
  return items.map(([id, label, color], i) => ({ id, label, color: color || palette[i % palette.length] }));
}

function frames(years, rows) {
  return years.map((year, i) => {
    const values = {};
    for (const [id, vals] of Object.entries(rows)) {
      const v = vals[i];
      if (v !== null && v !== undefined) values[id] = v;
    }
    return { t: year, values };
  });
}

function write(ds) {
  writeFileSync(join(root, 'data', `${ds.id}.json`), `${JSON.stringify(ds, null, 2)}\n`);
}

write({
  id: 'search-engines',
  title: 'Search Engine Market Share',
  shortTitle: 'Search Engines',
  category: 'tech',
  unit: { label: 'Global search share', format: 'percent', prefix: '', suffix: '%', decimals: 1 },
  scale: 'linear',
  topN: 8,
  timeLabel: 'year',
  blurb: 'The web search race starts as a portal war and ends as one of the most durable monopolies on the internet. Google does not just win the board; it turns the rest of the field into a fight for the scraps.',
  source: {
    name: 'StatCounter Global Stats and industry archives',
    url: 'https://gs.statcounter.com/search-engine-market-share',
    note: 'Annual global shares, with pre-2009 values reconstructed from historic industry estimates. Treat early portal-era values as approximate.'
  },
  dataQuality: 'illustrative',
  lastUpdated: updated,
  entities: entities([
    ['yahoo', 'Yahoo', '#8B5CF6'],
    ['altavista', 'AltaVista', '#67E8F9'],
    ['aol', 'AOL', '#2FB4FF'],
    ['lycos', 'Lycos', '#FFB020'],
    ['ask', 'Ask Jeeves', '#C4B5A0'],
    ['google', 'Google', '#4C8DFF'],
    ['msn', 'MSN / Bing', '#23C8A8'],
    ['baidu', 'Baidu', '#FF5C4D'],
    ['yandex', 'Yandex', '#F43F5E'],
    ['duckduckgo', 'DuckDuckGo', '#FF8C42'],
    ['naver', 'Naver', '#34D399']
  ]),
  keyframes: frames(
    [1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2012, 2014, 2016, 2018, 2020, 2022, 2024, 2025],
    {
      yahoo: [32, 34, 36, 34, 30, 25, 20, 18, 15, 12, 10, 8, 6, 5, 4, 3.2, 2.8, 2.2, 2.1, 1.6, 1.3, 1.2, 1.1],
      altavista: [21, 20, 17, 13, 9, 6, 4, 2.5, 1.5, 1, 0.6, 0.4, 0.2, 0.1, 0.1, null, null, null, null, null, null, null, null],
      aol: [16, 15, 13, 10, 8, 6, 5, 4, 3, 2.5, 2, 1.5, 1.1, 0.9, 0.7, 0.4, 0.2, 0.1, null, null, null, null, null],
      lycos: [12, 11, 10, 8, 6, 4, 2.5, 1.5, 1, 0.6, 0.3, 0.2, 0.1, null, null, null, null, null, null, null, null, null, null],
      ask: [3, 4, 5, 6, 7, 7, 6, 5, 4, 3.5, 3, 2.6, 2.2, 1.7, 1.4, 1, 0.5, 0.2, 0.1, null, null, null, null],
      google: [0, 0.5, 2, 7, 14, 25, 38, 48, 55, 62, 68, 72, 76, 88, 90, 91, 90.4, 91.2, 92.1, 92.5, 92.1, 91.5, 90.8],
      msn: [2, 2, 3, 4, 5, 6, 8, 10, 12, 11, 10, 9, 8.5, 3.3, 3.5, 3.8, 4.2, 3.9, 3.1, 2.8, 3.2, 3.9, 4.1],
      baidu: [null, null, null, null, 0, 0.4, 1, 1.6, 2.2, 3, 4, 5, 6, 0.8, 0.7, 0.6, 0.9, 1, 1.1, 1.2, 1, 0.8, 0.7],
      yandex: [null, null, null, null, null, 0.1, 0.2, 0.3, 0.5, 0.7, 1, 1.2, 1.4, 0.4, 0.5, 0.6, 0.8, 0.7, 0.6, 0.6, 0.5, 0.4, 0.4],
      duckduckgo: [null, null, null, null, null, null, null, null, null, null, null, null, 0, 0, 0.1, 0.2, 0.5, 0.7, 0.5, 0.6, 0.7, 0.7, 0.7],
      naver: [null, null, null, null, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2]
    }
  ),
  milestones: [
    { t: 1998.75, title: 'Google arrives', text: 'A tiny Stanford-born search engine launches into a field dominated by portals and directories.' },
    { t: 2001.2, title: 'Google passes Yahoo', text: 'Google becomes the default mental model for search, overtaking the portal era in usage and mindshare.' },
    { t: 2009.5, title: 'Bing replaces MSN', text: 'Microsoft relaunches search as Bing, beginning a long second-place fight rather than a true Google challenge.' },
    { t: 2023.2, title: 'AI search pressure', text: 'Chat-style search renews attention on the category, but the market-share board barely moves.' }
  ]
});

write({
  id: 'ev-sales',
  title: 'EV Makers by Annual Sales',
  shortTitle: 'EV Sales',
  category: 'tech',
  unit: { label: 'Battery-electric vehicles sold', format: 'si', prefix: '', suffix: '', decimals: 2 },
  scale: 'linear',
  topN: 10,
  timeLabel: 'year',
  blurb: 'Battery-electric sales begin as a Tesla story and quickly become a China scale story. The overtake to watch is BYD turning from battery supplier into the volume heavyweight of the EV era.',
  source: {
    name: 'Company delivery reports, EV-Volumes and IEA Global EV Outlook',
    url: 'https://www.iea.org/reports/global-ev-outlook-2025',
    note: 'Annual BEV unit estimates by manufacturer group. Plug-in hybrids are excluded where separable; several early years are reconstructed.'
  },
  dataQuality: 'illustrative',
  lastUpdated: updated,
  entities: entities([
    ['tesla', 'Tesla', '#FF5C4D'],
    ['byd', 'BYD', '#2FB4FF'],
    ['saic', 'SAIC-GM-Wuling', '#FFB020'],
    ['volkswagen', 'Volkswagen Group', '#4C8DFF'],
    ['bmw', 'BMW Group', '#67E8F9'],
    ['hyundai', 'Hyundai-Kia', '#23C8A8'],
    ['geely', 'Geely / Zeekr', '#A3E635'],
    ['nio', 'NIO', '#8B5CF6'],
    ['xpeng', 'XPeng', '#FF6FA5'],
    ['renault', 'Renault-Nissan', '#F43F5E'],
    ['gac', 'GAC Aion', '#FFD84D'],
    ['li-auto', 'Li Auto', '#C4B5A0']
  ]),
  keyframes: frames(
    [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
    {
      tesla: [1.5, 2.5, 2.7, 22, 32, 50, 76, 101, 245, 367, 500, 936, 1314, 1810, 1790, 1850],
      byd: [0, 1, 2, 6, 18, 40, 60, 95, 103, 145, 131, 321, 911, 1574, 1760, 2050],
      saic: [0, 0, 0, 0, 1, 5, 12, 25, 35, 60, 170, 456, 524, 640, 720, 760],
      volkswagen: [0, 0, 0.5, 3, 10, 18, 25, 45, 75, 140, 230, 452, 572, 770, 745, 820],
      bmw: [0, 0, 0, 1, 5, 12, 24, 32, 50, 74, 103, 216, 280, 376, 427, 480],
      hyundai: [0, 0, 0, 0, 1, 3, 8, 18, 40, 70, 100, 160, 260, 375, 450, 520],
      geely: [0, 0, 0, 0, 2, 5, 12, 25, 35, 45, 68, 110, 251, 487, 780, 980],
      nio: [null, null, null, null, 0, 0, 1, 11, 14, 20, 44, 91, 122, 160, 222, 260],
      xpeng: [null, null, null, null, null, 0, 0, 1, 4, 16, 27, 98, 121, 142, 190, 240],
      renault: [0, 1, 10, 18, 25, 45, 62, 72, 92, 120, 115, 165, 183, 220, 260, 300],
      gac: [0, 0, 0, 0, 0, 1, 4, 8, 20, 42, 60, 120, 271, 480, 450, 520],
      'li-auto': [null, null, null, null, null, null, null, null, 0, 1, 33, 90, 133, 376, 500, 620]
    }
  ),
  milestones: [
    { t: 2012.5, title: 'Model S changes the stakes', text: 'Tesla proves an EV can be premium, long-range and desirable instead of just experimental.' },
    { t: 2020.7, title: 'China scale kicks in', text: 'Low-cost Chinese EVs and city cars turn electric volume from a niche into a mass-market race.' },
    { t: 2023.9, title: 'BYD catches Tesla', text: 'BYD closes the BEV gap and briefly overtakes Tesla in quarterly electric-only deliveries.' },
    { t: 2024.4, title: 'Legacy automakers cluster', text: 'VW, Hyundai-Kia and BMW settle into the second pack while the Chinese brands keep accelerating.' }
  ]
});

write({
  id: 'olympic-golds',
  title: 'Olympic Gold Medals by Country',
  shortTitle: 'Olympic Golds',
  category: 'sports',
  unit: { label: 'Cumulative Summer Olympic gold medals', format: 'plain', prefix: '', suffix: '', decimals: 0 },
  scale: 'linear',
  topN: 10,
  timeLabel: 'year',
  blurb: 'The Summer Olympics leaderboard is a century-long geopolitical race hiding inside a sports table. The United States builds an early lead, the Soviet Union arrives like a shockwave, and modern China turns the board into a three-power chase.',
  source: {
    name: 'Olympedia and IOC medal tables',
    url: 'https://www.olympedia.org/statistics/medal/country',
    note: 'Cumulative Summer Games gold medals, attributed to present/common Olympic country names; historical delegation edge cases are simplified.'
  },
  dataQuality: 'illustrative',
  lastUpdated: updated,
  entities: entities([
    ['usa', 'United States', '#4C8DFF'],
    ['gbr', 'Great Britain', '#FF5C4D'],
    ['france', 'France', '#2FB4FF'],
    ['germany', 'Germany', '#FDE68A'],
    ['italy', 'Italy', '#34D399'],
    ['sweden', 'Sweden', '#FFD84D'],
    ['ussr', 'Soviet Union', '#F43F5E'],
    ['russia', 'Russia', '#C4B5A0'],
    ['china', 'China', '#FFB020'],
    ['australia', 'Australia', '#A3E635'],
    ['japan', 'Japan', '#FF6FA5'],
    ['hungary', 'Hungary', '#23C8A8'],
    ['netherlands', 'Netherlands', '#FF8C42']
  ]),
  keyframes: frames(
    [1896, 1900, 1904, 1908, 1912, 1920, 1924, 1928, 1932, 1936, 1948, 1952, 1956, 1960, 1964, 1968, 1972, 1976, 1980, 1984, 1988, 1992, 1996, 2000, 2004, 2008, 2012, 2016, 2021, 2024],
    {
      usa: [11, 30, 108, 131, 156, 197, 242, 267, 308, 332, 370, 410, 442, 476, 512, 557, 590, 624, 624, 707, 743, 780, 824, 864, 900, 936, 982, 1028, 1067, 1107],
      gbr: [2, 17, 18, 74, 84, 99, 108, 111, 115, 119, 122, 128, 134, 136, 140, 145, 149, 152, 157, 162, 167, 172, 173, 184, 193, 212, 241, 268, 290, 304],
      france: [5, 31, 31, 36, 43, 52, 65, 71, 81, 88, 98, 104, 110, 110, 111, 118, 120, 122, 128, 133, 139, 147, 162, 175, 186, 193, 204, 214, 224, 240],
      germany: [6, 10, 14, 17, 23, 23, 23, 33, 36, 69, 69, 93, 99, 111, 121, 146, 166, 206, 253, 270, 283, 315, 335, 348, 361, 377, 388, 405, 415, 428],
      italy: [0, 2, 2, 4, 7, 20, 28, 35, 47, 55, 63, 71, 79, 92, 102, 105, 110, 112, 120, 134, 140, 146, 159, 172, 182, 190, 198, 206, 216, 228],
      sweden: [0, 1, 1, 9, 32, 51, 55, 62, 71, 77, 93, 105, 113, 114, 116, 119, 123, 127, 130, 132, 132, 134, 136, 139, 143, 143, 144, 146, 149, 150],
      ussr: [null, null, null, null, null, null, null, null, null, null, 0, 22, 59, 102, 132, 161, 211, 260, 340, 340, 395, 440, null, null, null, null, null, null, null, null],
      russia: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 45, 71, 103, 130, 153, 177, 196, 216, 226],
      china: [null, null, null, null, null, null, null, null, null, null, 0, 0, 0, 0, 0, 0, 0, 0, 0, 15, 20, 36, 52, 80, 112, 163, 201, 227, 265, 305],
      australia: [2, 5, 5, 5, 6, 6, 9, 12, 15, 15, 17, 23, 36, 44, 50, 55, 63, 63, 68, 72, 75, 82, 91, 107, 124, 138, 145, 153, 170, 188],
      japan: [0, 0, 0, 0, 0, 0, 0, 2, 9, 15, 15, 16, 20, 24, 40, 51, 64, 73, 73, 83, 87, 90, 93, 98, 114, 123, 130, 142, 169, 189],
      hungary: [2, 3, 5, 8, 11, 14, 16, 20, 26, 36, 46, 58, 67, 73, 83, 91, 97, 101, 108, 108, 119, 130, 137, 145, 153, 156, 164, 172, 178, 184],
      netherlands: [0, 1, 1, 1, 1, 5, 9, 15, 17, 23, 28, 28, 28, 28, 30, 33, 36, 41, 43, 48, 50, 52, 56, 68, 72, 79, 85, 93, 103, 118]
    }
  ),
  milestones: [
    { t: 1936, title: 'Berlin resets the board', text: 'Germany piles up golds at home, turning the medal table into a propaganda stage.' },
    { t: 1952, title: 'Soviet Union enters', text: 'The USSR appears in Helsinki and immediately becomes the United States’ first true Olympic rival.' },
    { t: 1984, title: 'Boycott games swing hard', text: 'The Los Angeles Games inflate the US lead after the Soviet-led boycott removes much of the rival field.' },
    { t: 2008, title: 'China tops a home Games', text: 'China wins the most golds in Beijing, announcing itself as a permanent Summer Olympics superpower.' }
  ]
});

write({
  id: 'nba-scoring',
  title: 'NBA Career Scoring Leaders',
  shortTitle: 'NBA Scoring',
  category: 'sports',
  unit: { label: 'Regular-season career points', format: 'plain', prefix: '', suffix: ' pts', decimals: 0 },
  scale: 'linear',
  topN: 10,
  timeLabel: 'year',
  blurb: 'The NBA scoring record is a relay race between eras: Mikan to Pettit, Wilt to Kareem, then a four-decade climb toward LeBron. Because this is cumulative, the drama comes from active players chasing ghosts.',
  source: {
    name: 'Basketball-Reference NBA career leaders',
    url: 'https://www.basketball-reference.com/leaders/pts_career.html',
    note: 'Season-end regular-season point totals, reconstructed annually for selected all-time leaders.'
  },
  dataQuality: 'illustrative',
  lastUpdated: updated,
  entities: entities([
    ['mikan', 'George Mikan'], ['pettit', 'Bob Pettit'], ['baylor', 'Elgin Baylor'], ['west', 'Jerry West'],
    ['wilt', 'Wilt Chamberlain'], ['oscar', 'Oscar Robertson'], ['havlicek', 'John Havlicek'], ['kareem', 'Kareem Abdul-Jabbar'],
    ['malone', 'Karl Malone'], ['jordan', 'Michael Jordan'], ['kobe', 'Kobe Bryant'], ['dirk', 'Dirk Nowitzki'],
    ['lebron', 'LeBron James', '#E2B93B'], ['durant', 'Kevin Durant'], ['carmelo', 'Carmelo Anthony']
  ]),
  keyframes: frames(
    [1950, 1954, 1958, 1962, 1966, 1970, 1974, 1978, 1982, 1986, 1990, 1994, 1998, 2002, 2006, 2010, 2014, 2016, 2018, 2020, 2022, 2023, 2024, 2025, 2026],
    {
      mikan: [1865, 10156, 10156, 10156, 10156, 10156, 10156, 10156, 10156, 10156, 10156, 10156, 10156, 10156, 10156, 10156, 10156, 10156, 10156, 10156, 10156, 10156, 10156, 10156, 10156],
      pettit: [0, 0, 7320, 16000, 20880, 20880, 20880, 20880, 20880, 20880, 20880, 20880, 20880, 20880, 20880, 20880, 20880, 20880, 20880, 20880, 20880, 20880, 20880, 20880, 20880],
      baylor: [0, 0, 0, 8733, 17300, 23149, 23149, 23149, 23149, 23149, 23149, 23149, 23149, 23149, 23149, 23149, 23149, 23149, 23149, 23149, 23149, 23149, 23149, 23149, 23149],
      west: [0, 0, 0, 0, 10000, 19000, 25192, 25192, 25192, 25192, 25192, 25192, 25192, 25192, 25192, 25192, 25192, 25192, 25192, 25192, 25192, 25192, 25192, 25192, 25192],
      wilt: [0, 0, 0, 7076, 20000, 30000, 31419, 31419, 31419, 31419, 31419, 31419, 31419, 31419, 31419, 31419, 31419, 31419, 31419, 31419, 31419, 31419, 31419, 31419, 31419],
      oscar: [0, 0, 0, 4500, 15000, 23000, 26710, 26710, 26710, 26710, 26710, 26710, 26710, 26710, 26710, 26710, 26710, 26710, 26710, 26710, 26710, 26710, 26710, 26710, 26710],
      havlicek: [0, 0, 0, 0, 5000, 12000, 20000, 26395, 26395, 26395, 26395, 26395, 26395, 26395, 26395, 26395, 26395, 26395, 26395, 26395, 26395, 26395, 26395, 26395, 26395],
      kareem: [0, 0, 0, 0, 0, 2361, 11000, 20000, 30000, 36500, 38387, 38387, 38387, 38387, 38387, 38387, 38387, 38387, 38387, 38387, 38387, 38387, 38387, 38387, 38387],
      malone: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7400, 17500, 27000, 34000, 36928, 36928, 36928, 36928, 36928, 36928, 36928, 36928, 36928, 36928, 36928],
      jordan: [0, 0, 0, 0, 0, 0, 0, 0, 0, 408, 8900, 21000, 29277, 32292, 32292, 32292, 32292, 32292, 32292, 32292, 32292, 32292, 32292, 32292, 32292],
      kobe: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1220, 10000, 18000, 25000, 31700, 33643, 33643, 33643, 33643, 33643, 33643, 33643, 33643],
      dirk: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5900, 15000, 21000, 26500, 29491, 31187, 31560, 31560, 31560, 31560, 31560, 31560],
      lebron: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8400, 20000, 27000, 29272, 31038, 34087, 37062, 38652, 40474, 42184, 43500],
      durant: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 900, 12000, 19000, 21000, 22940, 23883, 25526, 26892, 28924, 30571, 31800],
      carmelo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8000, 19000, 25000, 26600, 28000, 28289, 28289, 28289, 28289, 28289, 28289]
    }
  ),
  milestones: [
    { t: 1966, title: 'Wilt becomes the mountain', text: 'Chamberlain’s scoring pace creates a record that defines the league’s statistical imagination.' },
    { t: 1984.3, title: 'Kareem passes Wilt', text: 'Kareem Abdul-Jabbar moves past Wilt Chamberlain and begins a record reign that lasts almost 39 years.' },
    { t: 2014.9, title: 'Kobe passes Jordan', text: 'Kobe Bryant overtakes Michael Jordan for third all time, with Kareem and Malone still far ahead.' },
    { t: 2023.1, title: 'LeBron passes Kareem', text: 'LeBron James becomes the NBA’s career scoring leader in February 2023.' }
  ]
});

write({
  id: 'f1-constructors',
  title: 'F1 Constructors by Points',
  shortTitle: 'F1 Constructors',
  category: 'sports',
  unit: { label: 'Cumulative constructors points', format: 'plain', prefix: '', suffix: ' pts', decimals: 0 },
  scale: 'linear',
  topN: 10,
  timeLabel: 'year',
  blurb: 'Formula 1’s constructors table is a dynasty machine: Ferrari’s long accumulation, McLaren and Williams’ eras, Red Bull’s aero dominance and Mercedes’ hybrid blitz. Rule changes make points inflation real, but the overtakes still map the sport’s power centers.',
  source: {
    name: 'Formula1.com constructor standings and StatsF1',
    url: 'https://www.formula1.com/en/results.html',
    note: 'Cumulative constructor championship points, simplified across scoring-system changes. Modern totals dominate because F1 awards far more points today.'
  },
  dataQuality: 'illustrative',
  lastUpdated: updated,
  entities: entities([
    ['ferrari', 'Ferrari', '#FF5C4D'],
    ['mclaren', 'McLaren', '#FF8C42'],
    ['williams', 'Williams', '#4C8DFF'],
    ['lotus', 'Lotus', '#FFD84D'],
    ['brabham', 'Brabham', '#2FB4FF'],
    ['renault', 'Renault / Alpine', '#FDE68A'],
    ['redbull', 'Red Bull', '#6E7BFF'],
    ['mercedes', 'Mercedes', '#67E8F9'],
    ['benetton', 'Benetton', '#34D399'],
    ['tyrrell', 'Tyrrell', '#C4B5A0'],
    ['forceindia', 'Force India / Aston Martin', '#23C8A8'],
    ['brawn', 'Brawn GP', '#D4D4D8']
  ]),
  keyframes: frames(
    [1958, 1962, 1966, 1970, 1974, 1978, 1982, 1986, 1990, 1994, 1998, 2002, 2006, 2010, 2014, 2018, 2020, 2022, 2024, 2025],
    {
      ferrari: [40, 140, 220, 320, 500, 760, 950, 1150, 1400, 1700, 2100, 2700, 3300, 3900, 5100, 6100, 6950, 7650, 8500, 8950],
      mclaren: [0, 0, 40, 150, 300, 530, 790, 1150, 1550, 1900, 2400, 3000, 3500, 4300, 4900, 5350, 5750, 6300, 7100, 7600],
      williams: [0, 0, 0, 0, 25, 250, 550, 900, 1350, 1850, 2600, 3000, 3300, 3550, 3900, 4100, 4300, 4400, 4550, 4650],
      lotus: [0, 80, 180, 340, 530, 760, 980, 1120, 1180, 1200, 1200, 1200, 1200, 1220, 1500, 1700, 1720, 1720, 1720, 1720],
      brabham: [0, 30, 120, 240, 330, 430, 610, 720, 780, 780, 780, 780, 780, 780, 780, 780, 780, 780, 780, 780],
      renault: [0, 0, 0, 0, 0, 120, 280, 420, 520, 650, 900, 1150, 1550, 2050, 2300, 2500, 2650, 2850, 3150, 3350],
      redbull: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 250, 1600, 3500, 4200, 4900, 6200, 7950, 8600],
      mercedes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 60, 500, 2000, 4700, 6200, 7500, 8700, 9350],
      benetton: [0, 0, 0, 0, 0, 0, 0, 150, 500, 950, 1200, 1350, 1350, 1350, 1350, 1350, 1350, 1350, 1350, 1350],
      tyrrell: [0, 0, 20, 120, 320, 430, 500, 540, 580, 600, 610, 610, 610, 610, 610, 610, 610, 610, 610, 610],
      forceindia: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 250, 800, 1400, 1900, 2500, 3150, 3500],
      brawn: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 172, 172, 172, 172, 172, 172, 172]
    }
  ),
  milestones: [
    { t: 1981, title: 'Williams becomes a force', text: 'Williams turns from upstart into a constructors champion, building the base for its 1990s lead.' },
    { t: 2000, title: 'Ferrari-Schumacher era', text: 'Ferrari begins the title streak that makes its cumulative lead look almost unreachable.' },
    { t: 2010, title: 'Red Bull’s first title', text: 'Red Bull wins its first constructors championship and starts a four-year Vettel-era run.' },
    { t: 2014, title: 'Mercedes hybrid launch', text: 'The turbo-hybrid regulations produce the most dominant constructors run of the modern era.' }
  ]
});

write({
  id: 'grand-slams',
  title: 'Grand Slam Singles Titles',
  shortTitle: 'Grand Slams',
  category: 'sports',
  unit: { label: 'Cumulative singles majors', format: 'plain', prefix: '', suffix: '', decimals: 0 },
  scale: 'linear',
  topN: 10,
  timeLabel: 'year',
  blurb: 'Tennis’ Grand Slam race looks slow for decades, then detonates in the Big Three era. Federer raises the ceiling, Nadal turns clay into a fortress, and Djokovic keeps the scoreboard moving after everyone thinks it should stop.',
  source: {
    name: 'International Tennis Federation major title records',
    url: 'https://www.itftennis.com/en/about-us/tennis-history/grand-slam-overview/',
    note: 'Men’s singles cumulative major titles by calendar year. Amateur/pro-era context is simplified for readability.'
  },
  dataQuality: 'illustrative',
  lastUpdated: updated,
  entities: entities([
    ['tilden', 'Bill Tilden'], ['lacoste', 'Rene Lacoste'], ['perry', 'Fred Perry'], ['budge', 'Don Budge'],
    ['laver', 'Rod Laver'], ['rosewall', 'Ken Rosewall'], ['borg', 'Bjorn Borg'], ['connors', 'Jimmy Connors'],
    ['mcenroe', 'John McEnroe'], ['lendl', 'Ivan Lendl'], ['sampras', 'Pete Sampras'], ['agassi', 'Andre Agassi'],
    ['federer', 'Roger Federer', '#D4D4D8'], ['nadal', 'Rafael Nadal', '#B45309'], ['djokovic', 'Novak Djokovic', '#86EFAC'], ['alcaraz', 'Carlos Alcaraz']
  ]),
  keyframes: frames(
    [1920, 1925, 1930, 1935, 1940, 1950, 1960, 1965, 1970, 1975, 1980, 1985, 1990, 1995, 2000, 2003, 2005, 2007, 2009, 2011, 2013, 2015, 2017, 2019, 2021, 2022, 2023, 2024, 2025, 2026],
    {
      tilden: [2, 8, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
      lacoste: [0, 3, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7],
      perry: [0, 0, 0, 6, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8],
      budge: [0, 0, 0, 0, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
      laver: [0, 0, 0, 0, 0, 0, 4, 6, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11],
      rosewall: [0, 0, 0, 0, 0, 0, 5, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8],
      borg: [0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11],
      connors: [0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8],
      mcenroe: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7],
      lendl: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8],
      sampras: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 7, 13, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14],
      agassi: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 6, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8],
      federer: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 6, 12, 15, 16, 17, 17, 19, 20, 20, 20, 20, 20, 20, 20],
      nadal: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 6, 10, 13, 14, 16, 19, 20, 22, 22, 22, 22, 22],
      djokovic: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 5, 10, 12, 12, 12, 16, 20, 21, 24, 24, 24, 24],
      alcaraz: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 4, 5, 6]
    }
  ),
  milestones: [
    { t: 1969, title: 'Laver completes the Slam', text: 'Rod Laver wins all four majors in 1969, still the last men’s calendar-year Grand Slam.' },
    { t: 2009, title: 'Federer passes Sampras', text: 'Federer wins Wimbledon 2009 for his 15th major, passing Sampras’ record of 14.' },
    { t: 2022, title: 'Nadal reaches 22', text: 'Nadal opens the year with Australian and French Open titles, briefly taking the lead alone.' },
    { t: 2023, title: 'Djokovic hits 24', text: 'Djokovic wins three majors in 2023 and pushes the men’s record to 24.' }
  ]
});

write({
  id: 'streaming-music',
  title: 'Music Streamers by Subscribers',
  shortTitle: 'Streamers',
  category: 'culture',
  unit: { label: 'Paid subscribers', format: 'si', prefix: '', suffix: '', decimals: 1, multiplier: 1000000 },
  scale: 'linear',
  topN: 10,
  timeLabel: 'year',
  blurb: 'Paid music streaming starts as a European experiment, then becomes the music industry’s main growth engine. Spotify builds the early lead, while Apple Music proves that distribution power can create a huge second-place business almost instantly.',
  source: {
    name: 'Company reports, IFPI and public subscriber disclosures',
    url: 'https://investors.spotify.com/financials/default.aspx',
    note: 'Paid subscriber counts; services disclose on different schedules, and some later figures are analyst estimates.'
  },
  dataQuality: 'illustrative',
  lastUpdated: updated,
  entities: entities([
    ['spotify', 'Spotify', '#34D399'],
    ['apple', 'Apple Music', '#D4D4D8'],
    ['amazon', 'Amazon Music', '#FF8C42'],
    ['youtube', 'YouTube Music', '#FF5C4D'],
    ['tencent', 'Tencent Music', '#FFD84D'],
    ['pandora', 'Pandora', '#4C8DFF'],
    ['deezer', 'Deezer', '#B388FF'],
    ['tidal', 'Tidal', '#2FB4FF'],
    ['napster', 'Napster/Rhapsody', '#C4B5A0'],
    ['gaana', 'Gaana', '#FFB020'],
    ['netease', 'NetEase Cloud Music', '#F43F5E']
  ]),
  keyframes: frames(
    [2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
    {
      spotify: [0.1, 0.5, 1, 2.5, 5, 8, 15, 28, 48, 71, 96, 124, 155, 180, 205, 236, 263, 290],
      apple: [null, null, null, null, null, null, 0, 6.5, 20, 30, 45, 60, 72, 78, 88, 93, 97, 105],
      amazon: [0, 0, 0.5, 1, 2, 4, 7, 10, 16, 22, 32, 55, 68, 82, 92, 100, 108, 116],
      youtube: [null, null, null, null, null, null, 0, 2, 5, 8, 15, 20, 30, 50, 80, 100, 115, 130],
      tencent: [null, null, null, null, 3, 6, 10, 15, 20, 28, 35, 40, 52, 66, 88, 106, 117, 130],
      pandora: [0.1, 0.2, 0.5, 1, 2, 3.3, 3.5, 3.9, 4.3, 5.5, 6.2, 6.3, 6.3, 6.3, 6.1, 6, 5.8, 5.5],
      deezer: [0.2, 0.4, 0.8, 1.5, 3, 5, 6, 6.3, 6.9, 7, 7, 7, 7, 9.6, 9.4, 10.5, 11.7, 12.5],
      tidal: [null, null, null, null, null, 0, 0.5, 1, 3, 3.5, 4, 4.5, 5, 5.2, 5.5, 5.8, 6, 6.2],
      napster: [0.7, 0.8, 0.9, 1, 1.1, 1.3, 1.5, 3, 3.5, 4, 4.5, 5, 5, 5, 4.8, 4.5, 4.2, 4],
      gaana: [null, null, null, null, null, 0, 0.5, 1.5, 3, 5, 8, 12, 20, 25, 30, 32, 34, 35],
      netease: [null, null, null, null, null, 0, 1, 3, 6, 10, 15, 20, 30, 35, 40, 44, 48, 52]
    }
  ),
  milestones: [
    { t: 2011.5, title: 'Spotify enters the US', text: 'Spotify’s American launch turns a European streaming story into a global one.' },
    { t: 2015.5, title: 'Apple Music launches', text: 'Apple converts iTunes-era distribution into tens of millions of paid streaming subscribers.' },
    { t: 2020.8, title: 'Lockdown streaming boom', text: 'Streaming subscriptions keep climbing while touring collapses, cementing the format’s industry role.' },
    { t: 2024, title: 'Spotify passes 250M paid', text: 'Spotify’s paid base clears a quarter-billion subscribers, keeping it comfortably ahead of the field.' }
  ]
});

write({
  id: 'highest-paid-actors',
  title: 'Highest-Paid Actors',
  shortTitle: 'Actor Paydays',
  category: 'culture',
  unit: { label: 'Annual earnings', format: 'si', prefix: '$', suffix: '', decimals: 1, multiplier: 1000000 },
  scale: 'linear',
  topN: 10,
  timeLabel: 'year',
  blurb: 'Hollywood’s annual earnings leaderboard tracks more than movie stardom: backend deals, streaming buyouts, franchise leverage and celebrity businesses all show up. The chart is messy by nature, which is exactly why the jumps are fun.',
  source: {
    name: 'Forbes annual highest-paid actors lists',
    url: 'https://www.forbes.com/celebrities/',
    note: 'Annual pre-tax earnings reported by Forbes. Missing years and list methodology changes are interpolated for animation continuity.'
  },
  dataQuality: 'illustrative',
  lastUpdated: updated,
  entities: entities([
    ['cruise', 'Tom Cruise'], ['smith', 'Will Smith'], ['hanks', 'Tom Hanks'], ['carrey', 'Jim Carrey'],
    ['murphy', 'Eddie Murphy'], ['sandler', 'Adam Sandler'], ['downey', 'Robert Downey Jr.'], ['jackie', 'Jackie Chan'],
    ['rock', 'Dwayne Johnson', '#C4B5A0'], ['wahlberg', 'Mark Wahlberg'], ['clooney', 'George Clooney'], ['diesel', 'Vin Diesel'],
    ['reynolds', 'Ryan Reynolds'], ['pitt', 'Brad Pitt'], ['depp', 'Johnny Depp']
  ]),
  keyframes: frames(
    [1995, 1997, 1999, 2001, 2003, 2005, 2007, 2009, 2011, 2013, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
    {
      cruise: [25, 45, 75, 70, 45, 67, 31, 30, 22, 35, 40, 53, 43, 22, 43, 60, 13, 100, 45, 60],
      smith: [15, 25, 35, 45, 35, 31, 36, 45, 36, 33, 26, 20, 42, 35, 35, 44.5, 40, 35, 35, 40],
      hanks: [22, 40, 71, 35, 34, 25, 74, 35, 35, 31, 31, 28, 30, 20, 20, 15, 15, 14, 25, 25],
      carrey: [20, 20, 30, 35, 25, 20, 16, 15, 12, 10, 8, 8, 7, 7, 7, 5, 5, 5, 5, 5],
      murphy: [16, 18, 20, 22, 20, 18, 15, 14, 12, 10, 8, 8, 7, 7, 70, 20, 15, 15, 15, 15],
      sandler: [5, 12, 20, 25, 31, 29, 30, 55, 40, 37, 41, 30, 50.5, 39.5, 57, 41, 44, 41, 73, 73],
      downey: [0, 0, 0, 0, 2, 5, 5, 10, 31, 75, 80, 33, 48, 81, 66, 66, 33, 20, 20, 20],
      jackie: [10, 15, 20, 25, 30, 30, 25, 20, 50, 50, 50, 61, 49, 45.5, 58, 40, 30, 25, 25, 25],
      rock: [0, 0, 0, 0, 5, 8, 15, 25, 36, 46, 31, 64.5, 65, 124, 89.4, 87.5, 42, 50, 50, 88],
      wahlberg: [0, 0, 5, 10, 12, 15, 20, 25, 28, 32, 32, 68, 68, 58, 30, 58, 30, 35, 30, 30],
      clooney: [0, 5, 12, 18, 20, 20, 25, 27, 30, 35, 45, 30, 30, 239, 15, 15, 15, 20, 20, 20],
      diesel: [0, 0, 5, 15, 20, 18, 15, 20, 35, 45, 47, 35, 54.5, 54, 54, 54, 20, 20, 20, 20],
      reynolds: [0, 0, 0, 0, 0, 2, 5, 10, 12, 15, 20, 20, 21.5, 27, 71.5, 71.5, 30, 71.5, 25, 85],
      pitt: [12, 20, 25, 28, 30, 25, 35, 28, 25, 35, 16, 31.5, 31.5, 25, 20, 20, 30, 100, 30, 30],
      depp: [5, 10, 12, 20, 25, 30, 72, 50, 50, 75, 30, 48, 48, 20, 20, 10, 5, 5, 5, 5]
    }
  ),
  milestones: [
    { t: 2007, title: 'Backend deals still rule', text: 'Stars with gross participation can outrun the box office itself when a franchise hits.' },
    { t: 2018, title: 'Clooney’s tequila year', text: 'George Clooney’s Casamigos sale shows how celebrity businesses can swamp acting income.' },
    { t: 2020, title: 'Streaming buyouts arrive', text: 'Netflix and other streamers replace backend upside with enormous upfront checks.' },
    { t: 2024, title: 'Creator-star hybrids', text: 'Reynolds and Johnson show the new model: acting, producing, brands and platforms at once.' }
  ]
});

write({
  id: 'youtube-channels',
  title: 'Most-Subscribed YouTube Channels',
  shortTitle: 'YouTube Subs',
  category: 'culture',
  unit: { label: 'Subscribers', format: 'si', prefix: '', suffix: '', decimals: 1, multiplier: 1000000 },
  scale: 'linear',
  topN: 10,
  timeLabel: 'year',
  blurb: 'YouTube’s subscriber race starts with individuals and ends with media companies, music labels and kid-video empires. The site’s most famous overtake, T-Series passing PewDiePie, is the moment YouTube stops feeling like one culture.',
  source: {
    name: 'YouTube public subscriber counts and Social Blade archives',
    url: 'https://socialblade.com/youtube/top/50/mostsubscribed',
    note: 'Year-end subscriber counts are reconstructed from public milestones and archive snapshots.'
  },
  dataQuality: 'illustrative',
  lastUpdated: updated,
  entities: entities([
    ['smosh', 'Smosh'], ['nigahiga', 'nigahiga'], ['raywilliam', 'Ray William Johnson'], ['pewdiepie', 'PewDiePie', '#34D399'],
    ['tseries', 'T-Series', '#DC2626'], ['cocomelon', 'Cocomelon', '#FFD84D'], ['setindia', 'SET India', '#8B5CF6'],
    ['mrbeast', 'MrBeast', '#FFB020'], ['kidsdiana', 'Kids Diana Show'], ['like-nastya', 'Like Nastya'],
    ['vladniki', 'Vlad and Niki'], ['zee', 'Zee Music Company'], ['wwe', 'WWE']
  ]),
  keyframes: frames(
    [2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
    {
      smosh: [0.1, 0.3, 0.6, 1.5, 2.5, 4.1, 7, 12, 18, 21, 22, 23, 23, 25, 25, 25, 25, 26, 26, 27],
      nigahiga: [0, 0.2, 0.5, 1.7, 3.1, 4.5, 6.8, 10, 13, 16, 18, 20, 21, 21, 21, 21, 21, 21, 22, 22],
      raywilliam: [0, 0, 0.4, 1.2, 3.5, 5.5, 8, 10.5, 11, 11, 10.5, 10.5, 10.5, 10.5, 10.5, 10.5, 10.5, 10.5, 10.5, 10.5],
      pewdiepie: [0, 0, 0, 0.2, 0.7, 3, 7, 19, 33, 40, 50, 60, 79, 102, 108, 110, 111, 111, 111, 111],
      tseries: [0, 0, 0, 0, 0.5, 1.5, 3, 7, 12, 20, 30, 55, 78, 123, 158, 202, 234, 257, 279, 300],
      cocomelon: [0, 0, 0, 0, 0.1, 0.5, 1, 3, 6, 12, 25, 40, 66, 95, 120, 138, 154, 168, 180, 192],
      setindia: [0, 0, 0, 0, 0.4, 1, 3, 6, 10, 18, 30, 45, 60, 75, 90, 125, 150, 165, 176, 188],
      mrbeast: [0, 0, 0, 0, 0, 0.01, 0.05, 0.2, 0.7, 1.3, 3.5, 7, 12, 24, 47, 88, 125, 210, 330, 410],
      kidsdiana: [0, 0, 0, 0, 0, 0, 0, 0.5, 2, 5, 12, 25, 40, 55, 72, 85, 102, 113, 123, 132],
      'like-nastya': [0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 8, 18, 33, 55, 69, 82, 100, 108, 116, 124],
      vladniki: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 5, 15, 25, 45, 58, 74, 90, 102, 112, 122],
      zee: [0, 0, 0, 0, 0, 0, 0.5, 2, 4, 8, 15, 25, 35, 50, 70, 85, 93, 100, 110, 120],
      wwe: [0, 0, 0, 0, 0.2, 1, 2, 4, 8, 14, 20, 28, 40, 55, 70, 83, 92, 100, 107, 112]
    }
  ),
  milestones: [
    { t: 2013.7, title: 'PewDiePie takes #1', text: 'A single gaming creator becomes YouTube’s largest channel, defining the platform’s creator era.' },
    { t: 2019.25, title: 'T-Series passes PewDiePie', text: 'The Indian music label wins the subscriber war and marks YouTube’s shift toward global media scale.' },
    { t: 2021.8, title: 'Kids channels dominate', text: 'Cocomelon and nursery-rhyme channels turn repeat viewing into leaderboard power.' },
    { t: 2024.4, title: 'MrBeast storms past 250M', text: 'MrBeast becomes the first individual creator to challenge corporate channels at the top.' }
  ]
});

write({
  id: 'nobel-by-country',
  title: 'Nobel Prizes by Country',
  shortTitle: 'Nobel Counts',
  category: 'science',
  unit: { label: 'Cumulative laureates', format: 'plain', prefix: '', suffix: '', decimals: 0 },
  scale: 'linear',
  topN: 10,
  timeLabel: 'year',
  blurb: 'The Nobel map is a slow-motion story of research infrastructure, migration and language. Germany and France own the early board, then the United States turns universities and laboratories into a prize engine.',
  source: {
    name: 'Nobel Prize laureate facts and country affiliations',
    url: 'https://www.nobelprize.org/prizes/facts/nobel-prize-facts/',
    note: 'Cumulative country attribution simplified by commonly cited birth/citizenship associations; multi-country laureates are not fractionally split.'
  },
  dataQuality: 'illustrative',
  lastUpdated: updated,
  entities: entities([
    ['usa', 'United States', '#4C8DFF'], ['uk', 'United Kingdom', '#FF5C4D'], ['germany', 'Germany', '#FDE68A'],
    ['france', 'France', '#2FB4FF'], ['sweden', 'Sweden', '#FFD84D'], ['switzerland', 'Switzerland', '#F43F5E'],
    ['russia', 'Russia / USSR', '#C4B5A0'], ['japan', 'Japan', '#FF6FA5'], ['canada', 'Canada', '#FF8C42'],
    ['netherlands', 'Netherlands', '#FFB020'], ['italy', 'Italy', '#34D399'], ['austria', 'Austria', '#B388FF']
  ]),
  keyframes: frames(
    [1901, 1910, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2015, 2020, 2025],
    {
      usa: [0, 3, 8, 20, 35, 55, 95, 150, 205, 260, 320, 370, 390, 410, 430],
      uk: [1, 8, 16, 27, 38, 52, 70, 84, 95, 105, 116, 126, 132, 138, 145],
      germany: [4, 14, 25, 41, 52, 62, 73, 82, 90, 98, 104, 108, 111, 114, 118],
      france: [3, 10, 17, 25, 31, 39, 47, 52, 57, 63, 68, 72, 75, 78, 81],
      sweden: [1, 5, 8, 13, 17, 21, 24, 27, 29, 31, 32, 33, 34, 34, 35],
      switzerland: [0, 3, 7, 11, 14, 18, 21, 24, 26, 28, 30, 31, 32, 33, 34],
      russia: [1, 3, 5, 7, 10, 13, 20, 26, 30, 35, 39, 42, 44, 46, 48],
      japan: [0, 0, 0, 0, 0, 1, 3, 5, 7, 9, 12, 18, 24, 28, 31],
      canada: [0, 1, 2, 4, 5, 7, 11, 14, 17, 20, 23, 26, 28, 30, 32],
      netherlands: [1, 4, 7, 10, 13, 15, 17, 19, 20, 21, 22, 24, 25, 26, 27],
      italy: [1, 4, 7, 10, 12, 14, 16, 17, 18, 19, 20, 21, 21, 21, 22],
      austria: [1, 3, 6, 9, 12, 14, 15, 17, 18, 19, 20, 21, 22, 22, 23]
    }
  ),
  milestones: [
    { t: 1933, title: 'Brain drain begins', text: 'European upheaval sends scientists and writers abroad, reshaping future prize geography.' },
    { t: 1960, title: 'US lead becomes structural', text: 'Postwar funding, universities and immigration make the United States the dominant Nobel country.' },
    { t: 2008, title: 'Japan accelerates', text: 'A run of physics and chemistry prizes pushes Japan into the modern top group.' },
    { t: 2020, title: 'Global science broadens', text: 'The top remains concentrated, but laureates increasingly work across borders and institutions.' }
  ]
});

write({
  id: 'life-expectancy',
  title: 'Global Life Expectancy Leaders',
  shortTitle: 'Life Expectancy',
  category: 'science',
  unit: { label: 'Life expectancy at birth', format: 'plain', prefix: '', suffix: ' yrs', decimals: 1 },
  scale: 'linear',
  topN: 10,
  timeLabel: 'year',
  blurb: 'Life expectancy is a ranking where every overtake is also a public-health story. The top shifts from early modern small states to Japan, Hong Kong and Europe’s longest-lived places as infant mortality collapses and chronic disease becomes the frontier.',
  source: {
    name: 'World Bank, UN WPP and Our World in Data',
    url: 'https://ourworldindata.org/life-expectancy',
    note: 'Selected long-lived countries/territories, rounded from international life-expectancy series. Microstate values are included when historically prominent.'
  },
  dataQuality: 'illustrative',
  lastUpdated: updated,
  entities: entities([
    ['norway', 'Norway'], ['sweden', 'Sweden'], ['iceland', 'Iceland'], ['switzerland', 'Switzerland'], ['japan', 'Japan'],
    ['hongkong', 'Hong Kong'], ['spain', 'Spain'], ['italy', 'Italy'], ['australia', 'Australia'], ['singapore', 'Singapore'],
    ['france', 'France'], ['canada', 'Canada'], ['usa', 'United States']
  ]),
  keyframes: frames(
    [1900, 1910, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2015, 2019, 2021, 2023],
    {
      norway: [52, 57, 59, 64, 66, 72, 73.5, 74.2, 75.8, 77.1, 78.7, 81.0, 82.1, 83.0, 83.2, 83.5],
      sweden: [55, 58, 60, 63, 66, 71, 73.1, 74.7, 75.8, 77.5, 79.6, 81.5, 82.2, 83.1, 83.0, 83.2],
      iceland: [48, 53, 57, 61, 65, 72, 74.0, 75.5, 77.0, 78.2, 80.3, 81.9, 82.9, 83.2, 83.5, 83.8],
      switzerland: [49, 54, 58, 62, 65, 69, 71.5, 73.8, 76.2, 77.5, 79.7, 82.2, 83.2, 84.0, 83.9, 84.3],
      japan: [44, 44, 43, 46, 50, 60, 68.0, 72.0, 76.0, 78.8, 81.1, 83.0, 83.8, 84.4, 84.8, 84.6],
      hongkong: [39, 42, 45, 50, 55, 61, 67, 72.5, 76.8, 78.5, 81.0, 83.0, 84.3, 85.2, 85.5, 85.3],
      spain: [35, 42, 41, 50, 52, 62, 69, 72.0, 75.4, 77.0, 79.3, 82.0, 83.0, 83.8, 83.1, 83.8],
      italy: [43, 47, 49, 54, 56, 66, 69.5, 72.0, 75.5, 77.0, 79.8, 82.0, 83.5, 83.6, 82.9, 83.5],
      australia: [51, 55, 59, 63, 65, 69, 70.9, 70.8, 74.6, 77.0, 79.2, 81.7, 82.4, 83.1, 83.2, 83.7],
      singapore: [34, 39, 43, 49, 53, 60, 65, 68.0, 72.0, 75.0, 78.0, 82.0, 83.6, 84.6, 83.5, 84.1],
      france: [46, 50, 52, 56, 58, 66, 70, 72.0, 74.3, 77.0, 79.0, 81.6, 82.7, 83.0, 82.5, 83.1],
      canada: [50, 53, 56, 60, 63, 68, 71, 72.8, 75.1, 77.4, 79.2, 81.2, 82.0, 82.6, 82.7, 83.0],
      usa: [47, 51, 54, 59, 63, 68, 69.7, 70.8, 73.7, 75.2, 76.8, 78.5, 78.8, 78.9, 76.4, 77.5]
    }
  ),
  milestones: [
    { t: 1918, title: 'Pandemic shock', text: 'The 1918 influenza pandemic interrupts a century of otherwise steady survival gains.' },
    { t: 1960, title: 'Japan catches up fast', text: 'Postwar public health and income growth pull Japan from mid-pack toward the top.' },
    { t: 1985, title: 'East Asia moves ahead', text: 'Japan and Hong Kong become the new longevity benchmark for rich countries.' },
    { t: 2020.5, title: 'COVID interrupts gains', text: 'The pandemic knocks several countries backward, most sharply where older populations and outbreaks collide.' }
  ]
});

write({
  id: 'cities',
  title: 'World’s Most Populous Cities',
  shortTitle: 'Megacities',
  category: 'science',
  unit: { label: 'Urban population', format: 'si', prefix: '', suffix: '', decimals: 1, multiplier: 1000000 },
  scale: 'linear',
  topN: 10,
  timeLabel: 'year',
  blurb: 'The largest-city race is the story of world urbanization moving east, west, then east again. Ancient capitals yield to imperial London and New York, before Tokyo, Shanghai, Delhi and Lagos reveal the scale of the modern megacity.',
  source: {
    name: 'Chandler, UN World Urbanization Prospects and citypopulation.de',
    url: 'https://population.un.org/wup/',
    note: 'Urban agglomeration estimates at broad historical intervals; pre-1900 values are especially approximate.'
  },
  dataQuality: 'illustrative',
  lastUpdated: updated,
  entities: entities([
    ['chang-an', "Chang'an / Xi'an"], ['baghdad', 'Baghdad'], ['kaifeng', 'Kaifeng'], ['constantinople', 'Constantinople'],
    ['beijing', 'Beijing'], ['london', 'London'], ['newyork', 'New York'], ['tokyo', 'Tokyo'], ['shanghai', 'Shanghai'],
    ['mexico-city', 'Mexico City'], ['sao-paulo', 'Sao Paulo'], ['delhi', 'Delhi'], ['mumbai', 'Mumbai'], ['lagos', 'Lagos'],
    ['jakarta', 'Jakarta'], ['cairo', 'Cairo']
  ]),
  keyframes: frames(
    [600, 800, 1000, 1200, 1400, 1600, 1800, 1850, 1900, 1950, 1970, 1990, 2000, 2010, 2020, 2025],
    {
      'chang-an': [0.6, 1.0, 0.4, 0.3, 0.2, 0.3, 0.4, 0.45, 0.4, 0.8, 1.5, 2.5, 3.2, 4.5, 8.7, 9.5],
      baghdad: [0, 0.7, 1.0, 0.3, 0.15, 0.1, 0.15, 0.18, 0.2, 0.6, 1.8, 3.8, 5.4, 7.2, 8.8, 9.5],
      kaifeng: [0.1, 0.2, 0.8, 1.0, 0.3, 0.2, 0.25, 0.3, 0.5, 0.7, 1, 1.4, 1.8, 3, 5, 5.5],
      constantinople: [0.5, 0.4, 0.45, 0.4, 0.25, 0.7, 0.6, 0.8, 1.1, 1.0, 2.0, 6.6, 8.8, 13.3, 15.5, 16.0],
      beijing: [0.1, 0.2, 0.5, 0.8, 1.0, 0.9, 1.1, 1.3, 1.6, 4.2, 7.7, 10.8, 13.5, 18.0, 20.5, 21.5],
      london: [0.02, 0.03, 0.04, 0.08, 0.1, 0.2, 1.1, 2.3, 6.5, 8.4, 7.5, 7.0, 7.2, 8.2, 9.0, 9.1],
      newyork: [0, 0, 0, 0, 0, 0.01, 0.06, 0.7, 3.4, 12.3, 16.2, 16.1, 17.8, 19.6, 20.1, 20.2],
      tokyo: [0, 0, 0, 0.1, 0.2, 0.5, 1.0, 1.3, 1.5, 11.3, 23.3, 32.5, 34.5, 37.0, 37.4, 37.1],
      shanghai: [0, 0, 0, 0, 0.1, 0.2, 0.4, 0.8, 1.0, 5.3, 11.0, 13.3, 16.7, 20.2, 27.1, 29.9],
      'mexico-city': [0, 0, 0, 0.15, 0.2, 0.25, 0.14, 0.2, 0.5, 3.4, 8.8, 15.6, 18.0, 20.1, 21.8, 22.5],
      'sao-paulo': [0, 0, 0, 0, 0, 0.02, 0.03, 0.06, 0.24, 2.3, 8.1, 15.1, 17.1, 19.7, 22.0, 22.8],
      delhi: [0.1, 0.15, 0.2, 0.25, 0.4, 0.5, 0.5, 0.6, 0.8, 1.4, 3.5, 9.7, 15.7, 22.2, 31.2, 34.7],
      mumbai: [0, 0, 0, 0, 0, 0.05, 0.2, 0.6, 0.9, 2.9, 5.8, 12.4, 16.4, 18.8, 20.7, 22.1],
      lagos: [0, 0, 0, 0, 0, 0.02, 0.04, 0.08, 0.14, 0.33, 1.4, 5.7, 8.7, 12.6, 15.4, 17.2],
      jakarta: [0, 0, 0, 0, 0.03, 0.08, 0.15, 0.3, 0.6, 1.5, 4.5, 8.2, 11.0, 26.1, 33.4, 35.4],
      cairo: [0.2, 0.3, 0.4, 0.45, 0.4, 0.35, 0.25, 0.4, 0.6, 2.4, 5.6, 9.9, 13.6, 16.9, 21.3, 22.6]
    }
  ),
  milestones: [
    { t: 800, title: "Chang'an reaches a million", text: 'Tang-era Chang’an becomes one of history’s first truly million-person capitals.' },
    { t: 1850, title: 'London industrializes', text: 'Industrial Britain turns London into the first modern megacity.' },
    { t: 1950, title: 'Tokyo surges after war', text: 'Postwar Japan begins the growth wave that will make Tokyo the largest urban area on Earth.' },
    { t: 2020, title: 'Delhi closes on Tokyo', text: 'India’s capital region becomes the leading challenger to Tokyo’s long megacity reign.' }
  ]
});
