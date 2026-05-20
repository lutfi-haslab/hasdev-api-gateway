import { Hono, Context } from "hono";
import { describeRoute } from "hono-openapi";

// htmlparser2 + css-select + domutils
import { parseDocument } from "htmlparser2";
import type { Document, Element } from "domhandler";
import { selectAll, selectOne } from "css-select";
import { textContent, getAttributeValue } from "domutils";

const inagovApiRoute = new Hono();

/** ===================== Types ===================== */
interface NewsItem {
  title: string;
  link: string;
  date?: string;
  image: string;
  content: string;
}

/** ===================== Cache Helper ===================== */
async function scrapeAndCache<T>(
  c: Context,
  cacheKey: string,
  fetcher: () => Promise<T[]>,
  ttlSeconds = 300
): Promise<Response> {
  const cache = (caches as any).default as Cache;
  const req = new Request(cacheKey);
  let response = await cache.match(req);

  if (!response) {
    const data = await fetcher();
    response = new Response(JSON.stringify({ data }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `s-maxage=${ttlSeconds}`,
      },
    });
    c.executionCtx.waitUntil(cache.put(req, response.clone()));
  }
  return response;
}

/** ===================== Scrapers ===================== */
async function fetchBknNews(page: number): Promise<NewsItem[]> {
  const url = `https://www.bkn.go.id/category/publikasi/berita/page/${page}`;
  const html = await fetch(url).then((r) => r.text());
  const doc: Document = parseDocument(html);

  const entries = selectAll(
    "#blog-entries .blog-entry",
    doc
  ) as unknown as Element[];

  const dataEntries = entries.slice(0, 10).map((el) => {
    const titleEl = selectOne("h2.blog-entry-title a", el) as Element | null;
    const dateEl = selectOne("span.updated", el) as Element | null;
    const imgEl = selectOne(".blog-entry-media img", el) as Element | null;
    const excerptEl = selectOne(".blog-entry-excerpt p", el) as Element | null;

    return {
      title: titleEl ? textContent(titleEl).trim() : "",
      link: titleEl ? getAttributeValue(titleEl, "href") || "" : "",
      date: dateEl ? textContent(dateEl).trim() : "",
      image: imgEl ? getAttributeValue(imgEl, "src") || "" : "",
      content: excerptEl ? textContent(excerptEl).trim() : "",
    };
  });

  return dataEntries;
}

async function fetchMenpanrbNews(page: number): Promise<NewsItem[]> {
  const dataPerPage = 13;
  const pageNav = page > 20 ? 20 * dataPerPage : page * dataPerPage;
  const url = `https://menpan.go.id/site/berita-terkini?start=${pageNav}`;

  const html = await fetch(url).then((r) => r.text());
  const doc: Document = parseDocument(html);

  const entries = selectAll(
    ".article[itemprop='blogPost']",
    doc
  ) as unknown as Element[];

  const dataEntries = entries.slice(0, 10).map((el) => {
    const titleEl = selectOne(".article-header h2 a", el) as Element | null;
    const imgEl = selectOne(".article-introtext img", el) as Element | null;
    const introEl = selectOne(".article-introtext", el) as Element | null;

    return {
      title: titleEl ? textContent(titleEl).trim() : "",
      link: titleEl
        ? new URL(getAttributeValue(titleEl, "href") || "", url).href
        : "",
      date: undefined,
      image: imgEl ? getAttributeValue(imgEl, "src") || "" : "",
      content: introEl ? textContent(introEl).trim() : "",
    };
  });

  if (dataEntries.length === 0) {
    return [
      {
        title:
          "Cuti Bersama 18 Agustus 2025 Ditetapkan, Menteri PANRB: Momentum Mempererat Kebersamaan dan Pelayanan Tetap Terjaga",
        link: "https://menpan.go.id/site/berita-terkini/cuti-bersama-18-agustus-2025-ditetapkan-menteri-panrb-momentum-mempererat-kebersamaan-dan-pelayanan-tetap-terjaga",
        image:
          "https://www.menpan.go.id/site/images/berita_foto_backup/2025/Agustus/20250808_-_SKB_Tiga_Menteri.jpeg",
        content:
          "Menteri PANRB Rini Widyantini.\n  \n JAKARTA - Pemerintah menetapkan Senin, 18 Agustus 2025, sebagai cuti bersama nasional dalam rangka peringatan Hari Ulang Tahun ke-80 Kemerdekaan Republik Indonesia. Hal ini sejalan dengan arahan Presiden bahwa momentum kemerdekaan dapat dioptimalkan guna memperkuat semangat optimisme, membangun kebersamaan, dan mendorong kreativitas untuk menjadi bangsa yang...",
      },
      {
        title:
          "Wamen PANRB: MPP Kota Pekanbaru, Bentuk Dukungan Daerah untuk Akselerasi Program Prioritas Presiden",
        link: "https://menpan.go.id/site/berita-terkini/wamen-panrb-mpp-kota-pekanbaru-bentuk-dukungan-daerah-untuk-akselerasi-program-prioritas-presiden",
        image:
          "https://www.menpan.go.id/site/images/berita_foto_backup/2025/Agustus/20250807_-_WAMEN_-_Peninjauan_MPP_Pekanbaru_17.jpeg",
        content:
          "Wakil Menteri PANRB Purwadi Arianto, mengunjungi Mal Pelayanan  Publik (MPP) Kota Pekanbaru, Kamis (7/8/2025).\n  \n PEKANBARU – Wakil Menteri Pendayagunaan Aparatur Negara dan Reformasi Birokrasi (PANRB) Purwadi Arianto, mengunjungi Mal Pelayanan  Publik (MPP) Kota Pekanbaru, Kamis (7/8/2025). Didampingi Wali Kota Pekanbaru Agung Nugroho memantau proses pelayanan publik MPP Kota Pekanbaru yang merupakan...",
      },
      {
        title:
          "Presiden Apresiasi Kinerja Menteri, 10 Bulan Penuh Karya, Kerja, dan Prestasi",
        link: "https://menpan.go.id/site/berita-terkini/presiden-apresiasi-kinerja-menteri-10-bulan-penuh-karya-kerja-dan-prestasi",
        image:
          "https://www.menpan.go.id/site/images/berita_foto_backup/2025/Agustus/20250806_-_Sidang_Kabinet_Paripurna_1.JPG",
        content:
          'Presiden Prabowo dan Wakil Presiden Gibran pada Sidang Kabinet Paripurna di Istana Negara, Jakarta, Rabu (6/8/2025).\n  \n JAKARTA – Presiden Prabowo Subianto mengapresiasi kinerja kabinetnya dengan menyebut 10 bulan ini penuh karya, kerja, dan prestasi. Berkat dukungan peran dan tugas masing-masing menteri, target yang sudah ditentukan tercapai secara kolektif.\n "Sepuluh...',
      },
      {
        title:
          "Cetak SDM Berkompeten, Menteri PANRB Apresiasi Kolaborasi Poltrada Bersama Lintas Instasi",
        link: "https://menpan.go.id/site/berita-terkini/cetak-sdm-berkompeten-menteri-panrb-apresiasi-kolaborasi-poltrada-bersama-lintas-instasi",
        image:
          "https://www.menpan.go.id/site/images/berita_foto_backup/2025/Juli/20250804_-_Kuliah_Umum_Poltrada_9.jpeg",
        content:
          "Menteri Pendayagunaan Aparatur Negara dan Reformasi Birokrasi (PANRB) Rini Widyantini saat mengisi kuliah umum Politeknik Transportasi Darat (Poltrada) di Gianyar, Bali, Senin (4/8/2025).\n  \n GIANYAR - Keberhasilan Politeknik Transportasi Darat (Poltrada) Bali dalam mencetak SDM transportasi darat yang kompeten dan berintegritas tentunya tidak lepas dari dukungan dan kolaborasi lintas instansi, baik di...",
      },
      {
        title:
          "Kawal Program Prioritas Presiden, Wamen PANRB Tinjau Penyaluran Program MBG di SMP Negeri 16 Pekanbaru",
        link: "https://menpan.go.id/site/berita-terkini/kawal-program-prioritas-presiden-wamen-panrb-tinjau-penyaluran-program-mbg-di-smp-negeri-16-pekanbaru",
        image:
          "https://www.menpan.go.id/site/images/berita_foto_backup/2025/Agustus/20250807_-_Peninjauan_Penyaluran_Program_Makan_Bergizi_Gratis_di_Riau_9.jpeg",
        content:
          "Wakil Menteri PANRB Purwadi Arianto meninjau penyaluran MBG di SMP Negeri 16 Pekabaru, Kamis (07/08/2025).\n  \n PEKANBARU – Kementerian Pendayagunaan Aparatur Negara dan Reformasi Birokrasi (PANRB) turut berperan dalam menyukseskan program prioritas Presiden, salah satunya adalah program Makan Bergizi Gratis (MBG). Wakil Menteri PANRB Purwadi Arianto meninjau langsung proses penyaluran...",
      },
      {
        title:
          "Menteri PANRB Tekankan Pentingnya Koordinasi Lintas Pemangku Kepentingan untuk Sukseskan Program Prioritas Presiden",
        link: "https://menpan.go.id/site/berita-terkini/menteri-panrb-tekankan-pentingnya-koordinasi-lintas-pemangku-kepentingan-untuk-sukseskan-program-prioritas-presiden",
        image:
          "https://www.menpan.go.id/site/images/berita_foto_backup/2025/Agustus/20250806_-_Diskusi_Peserta_PKN_I_Angkatan_LXII_Tahun_2025_terkait_Program_Prioritas_Presiden_5.jpeg",
        content:
          "Menteri Pendayagunaan Aparatur Negara dan Reformasi Birokrasi (PANRB) Rini Widyantini dalam Diskusi Pelatihan Kepemimpinan Nasional (PKN) Tingkat I LXII Tahun 2025 di Jakarta, Rabu (6/8/2025).\n  \n JAKARTA – Keberhasilan program prioritas Presiden tidak hanya bergantung pada hasil yang terlihat publik, tetapi juga pada reformasi struktural. Untuk mendukung keberhasilan visi besar...",
      },
      {
        title:
          "Pastikan Layanan Sekolah Rakyat Berjalan, Menteri PANRB Kunjungi SRMP 17 Tabanan",
        link: "https://menpan.go.id/site/berita-terkini/pastikan-layanan-sekolah-rakyat-berjalan-menteri-panrb-kunjungi-srmp-17-tabanan",
        image:
          "https://www.menpan.go.id/site/images/berita_foto_backup/2025/Juli/20250704_-_Peninjauan_Sekolah_Rakyat_14.jpeg",
        content:
          "Menteri Pendayagunaan Aparatur Negara dan Reformasi Birokrasi (PANRB) Rini Widyantini saat mengunjungi SRMP 17 Tabanan, Senin (04/08/2025).\n  \n TABANAN - Kementerian Pendayagunaan Aparatur Negara dan Reformasi Birokrasi (PANRB) berperan memastikan tata kelola kelembagaan Sekolah Rakyat berjalan secara efektif dan efisien, termasuk menyiapkan perencanaan kebutuhan guru dan tenaga kependidikan. Hal ini penting...",
      },
      {
        title:
          "Wamen PANRB Dorong Pemprov Riau Dukung Program Prioritas Presiden",
        link: "https://menpan.go.id/site/berita-terkini/wamen-panrb-dorong-pemprov-riau-dukung-program-prioritas-presiden",
        image:
          "https://www.menpan.go.id/site/images/berita_foto_backup/2025/Agustus/20250807_-_Audiensi_Gubernur_Riau_5.jpeg",
        content:
          "Wakil Menteri PANRB Purwadi Arianto saat Audiensi dengan ASN di Pemprov Riau, Kamis (7/8/2025).\n  \n PEKANBARU – Wakil Menteri Pendayagunaan Aparatur Negara dan Reformasi Birokrasi (PANRB) Purwadi Arianto mengatakan bahwa birokrasi bukan sekadar pelaksana administrasi, namun juga sebagai penggerak perubahan. Aparatur negara yang bertugas menjalankan roda birokrasi, menjadi mesin penggerak...",
      },
      {
        title: "Menteri PANRB Tinjau Layanan Imigrasi di Bandara Ngurah Rai",
        link: "https://menpan.go.id/site/berita-terkini/menteri-panrb-tinjau-layanan-imigrasi-di-bandara-ngurah-rai",
        image:
          "https://www.menpan.go.id/site/images/berita_foto_backup/2025/Agustus/20250805_-_Meninjau_Layanan_Keimigrasian_di_Bandara_I_Gusti_Ngurah_Rai_10.jpeg",
        content:
          "Suasana peninjauan layanan di Bandara Internasional I Gusti Ngurah Rai oleh Menteri PANRB Rini Widyantini, Selasa (05/08/2025).\n  \n BADUNG – Menteri Pendayagunaan Aparatur Negara dan Reformasi Birokrasi (PANRB) Rini Widyantini bersama Menteri Imigrasi dan Pemasyarakatan Agus Andrianto melakukan peninjauan ke sejumlah layanan yang ada di Bandara Internasional I Gusti Ngurah...",
      },
      {
        title:
          "Menteri Rini Dorong Kehadiran MPP Jadi Jembatan Pelayanan Bagi Percepatan Program Prioritas Presiden",
        link: "https://menpan.go.id/site/berita-terkini/menteri-rini-dorong-kehadiran-mpp-jadi-jembatan-pelayanan-bagi-percepatan-program-prioritas-presiden",
        image:
          "https://www.menpan.go.id/site/images/berita_foto_backup/2025/Juli/20250704_-_Peninjauan_MPP_Badung_5.jpeg",
        content:
          "Menteri Pendayagunaan Aparatur Negara dan Reformasi Birokrasi saat meninjau MPP Kab. Badung, Senin (4/8/2025).\n  \n BADUNG – Menteri Pendayagunaan Aparatur Negara dan Reformasi Birokrasi (PANRB) Rini Widyantini terus berkomitmen agar pelayanan yang diberikan oleh aparatur sipil negara (ASN) kepada masyarakat berkualitas dan semakin baik. Untuk itu, dalam kunjungan kerjanya ke...",
      },
    ];
  } else {
    return dataEntries;
  }
}

/** ===================== Routes ===================== */

inagovApiRoute.get(
  "/v1/bkn-news",
  describeRoute({
    description: "Get BKN News (scraped from bkn.go.id)",
    tags: ["Inagov API"],
    responses: {
      200: {
        description: "Successful response",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                data: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      link: { type: "string" },
                      date: { type: "string" },
                      image: { type: "string" },
                      content: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  }),
  async (c) => {
    const { searchParams } = new URL(c.req.url);
    const page = Math.min(parseInt(searchParams.get("page") || "1"), 100);
    return scrapeAndCache(c, c.req.url, () => fetchBknNews(page));
  }
);

inagovApiRoute.get(
  "/v1/menpanrb-news",
  describeRoute({
    description: "Get Menpanrb News (scraped from menpan.go.id)",
    tags: ["Inagov API"],
    responses: {
      200: {
        description: "Successful response",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                data: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      link: { type: "string" },
                      date: { type: "string" },
                      image: { type: "string" },
                      content: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  }),
  async (c) => {
    const { searchParams } = new URL(c.req.url);
    const page = parseInt(searchParams.get("page") || "1");
    return scrapeAndCache(c, c.req.url, () => fetchMenpanrbNews(page));
  }
);

export default inagovApiRoute;
