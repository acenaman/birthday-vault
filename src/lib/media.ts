// Static imports of all asset pointer JSONs
import t1 from "@/assets/timeline/t1.jpg.asset.json";
import t2 from "@/assets/timeline/t2.jpeg.asset.json";
import t3 from "@/assets/timeline/t3.jpg.asset.json";
import t4 from "@/assets/timeline/t4.jpg.asset.json";
import t5 from "@/assets/timeline/t5.jpg.asset.json";
import t6 from "@/assets/timeline/t6.jpg.asset.json";
import t7 from "@/assets/timeline/t7.mp4.asset.json";
import t8 from "@/assets/timeline/t8.jpg.asset.json";
import t9 from "@/assets/timeline/t9.jpg.asset.json";
import t10 from "@/assets/timeline/t10.jpg.asset.json";
import t11 from "@/assets/timeline/t11.jpg.asset.json";
import t12 from "@/assets/timeline/t12.mp4.asset.json";
import t13 from "@/assets/timeline/t13.mp4.asset.json";
import t14 from "@/assets/timeline/t14.jpg.asset.json";
import t15 from "@/assets/timeline/t15.jpg.asset.json";
import t16 from "@/assets/timeline/t16.jpg.asset.json";
import t17 from "@/assets/timeline/t17.mp4.asset.json";
import t18 from "@/assets/timeline/t18.mp4.asset.json";

import g1 from "@/assets/gallery/g1.jpg.asset.json";
import g2 from "@/assets/gallery/g2.jpg.asset.json";
import g3 from "@/assets/gallery/g3.jpg.asset.json";
import g4 from "@/assets/gallery/g4.jpg.asset.json";
import g5 from "@/assets/gallery/g5.jpg.asset.json";
import g6 from "@/assets/gallery/g6.jpg.asset.json";
import g7 from "@/assets/gallery/g7.jpg.asset.json";
import g8 from "@/assets/gallery/g8.jpg.asset.json";
import g9 from "@/assets/gallery/g9.jpg.asset.json";
import g10 from "@/assets/gallery/g10.jpg.asset.json";
import g11 from "@/assets/gallery/g11.mp4.asset.json";

export type TimelineItem = {
  title: string;
  url: string;
  type: "image" | "video";
};

const isVideo = (u: string) => /\.mp4$|\.webm$|\.mov$/i.test(u);

const mk = (title: string, a: { url: string }): TimelineItem => ({
  title,
  url: a.url,
  type: isVideo(a.url) ? "video" : "image",
});

export const timeline: TimelineItem[] = [
  mk("First Meet", t1),
  mk("Start of our Journey", t2),
  mk("Start of Our Raula 😂", t3),
  mk("First Mela", t4),
  mk("Home Visit", t5),
  mk("Second Meeting at Home", t6),
  mk("My Bdayy", t7),
  mk("Second Ceremony", t8),
  mk("Meeting Outside Home", t9),
  mk("Urrr Bdayyy", t10),
  mk("Trip", t11),
  mk("Award Ceremony", t12),
  mk("Next Home Meet", t13),
  mk("First Movie", t14),
  mk("LPU Prep", t15),
  mk("LPU", t16),
  mk("Third Ceremony", t17),
  mk("Best Day", t18),
];

export const gallery: TimelineItem[] = [
  mk("g1", g1),
  mk("g2", g2),
  mk("g3", g3),
  mk("g4", g4),
  mk("g5", g5),
  mk("g6", g6),
  mk("g7", g7),
  mk("g8", g8),
  mk("g9", g9),
  mk("g10", g10),
  mk("g11", g11),
];
