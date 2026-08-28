export type Item={
 id:number; kind:'news'|'district'|'tab'|'link'; title:string; slug:string; body:string;
 image_url:string|null; video_url:string|null; video_title?:string|null; video_description?:string|null;
 video_preview?:string|null; published_at:string|null; url:string|null; extra_links:{title:string;url:string}[]|string|null;
 sort_order:number; status?:'published'|'scheduled'|'pending'|'rejected'; creator_id?:number|null;
 minecraft_version?:string|null; created_at:string; updated_at?:string;
};
export type Creator={id:number;nickname:string;body:string;avatar_url:string|null;url:string|null;district_id:number|null;created_at:string};
export type AdminUser={
 id:number;username:string;display_name:string;minecraft_nick?:string|null;profile_description?:string|null;
 avatar_url?:string|null;url?:string|null;district_id?:number|null;is_admin?:boolean;is_creator?:boolean;
 role?:string;session_version?:number;created_at:string;
};
export type ActionLog={id:number;username:string;action:string;details:string;created_at:string};
export type User=AdminUser & {login?:string};
