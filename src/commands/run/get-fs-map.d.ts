import { Packages } from "./run";
import { EVCb } from "../../index";
export interface MapType {
    [key: string]: string;
}
export declare const getFSMap: (opts: any, searchRoots: string[], packages: Packages, cb: EVCb<MapType, any>) => void;
