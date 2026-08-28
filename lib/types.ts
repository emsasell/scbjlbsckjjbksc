export type Item = {
  id: number;
  kind: 'news' | 'district' | 'tab' | 'link';
  title: string;
  slug: string;
  body: string;
  image_url: string | null;
  video_url: string | null;
  published_at: string | null;
  url: string | null;
  sort_order: number;
  created_at: string;
};
