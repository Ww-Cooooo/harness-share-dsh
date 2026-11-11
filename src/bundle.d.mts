export const LIMITS:{compressed:number;raw:number;files:number;items:number};
export type BundleFile=[string,number,string,string];
export interface BundleItem {id:string;title:string;description:string;files:BundleFile[]}
export interface Bundle {v:2;title:string;description:string;items:BundleItem[]}
export interface CatalogItem {id:string;type:string;title:string;description:string;source:string;origin:string;shareable:boolean;files:Array<[string,number]>;bytes:number;state:string;reason?:string;flat?:boolean;omitted?:number}
export interface PlanItem {id:string;title:string;target:string;state:string;files:number;bytes:number;loaded?:boolean}
export function catalogItem(summary:{name:string;path?:string;description:string;source?:string}):Promise<CatalogItem>;
export function validateBundle(value:unknown):Bundle;
export function inspectBundle(workspace:string,bundle:Bundle):Promise<{items:PlanItem[];newCount:number;existingCount:number;conflictCount:number}>;
export function installBundle(workspace:string,bundle:Bundle,ids:string[],options?:{stateDirectory?:string}):Promise<{receiptId:string;installedAt:string;items:PlanItem[];installedCount:number;existingCount:number;conflictCount:number;failedCount:number;receiptWarning?:string}>;
