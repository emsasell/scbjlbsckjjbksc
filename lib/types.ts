export type Item = {
  id:number; kind:'news'|'district'|'tab'|'link'; title:string; slug:string; body:string;
  image_url:string|null; video_url:string|null; video_title?:string|null; video_description?:string|null; video_preview?:string|null;
  published_at:string|null; url:string|null; extra_links:{title:string;url:string}[]|string|null;
  sort_order:number; created_at:string; updated_at?:string;
};
export type Creator={id:number;nickname:string;description:string;avatar_url:string|null;url:string|null;district_id:number|null;created_at:string};
export type ActionLog={id:number;action:string;details:string;actor:string;created_at:string};
export type AdminUser={id:number;login:string;role:'admin'|'district'|'user';can_admin:boolean;creator_id:number|null;created_at:string};
