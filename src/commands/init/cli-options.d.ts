declare const _default: ({
    names: string[];
    type: string;
    help: string;
    env?: undefined;
} | {
    names: string[];
    type: string;
    help: string;
    env: string;
})[];
export default _default;
export interface R2GInitOpts {
    search_root: Array<string>;
    version: boolean;
    docker: boolean;
    allow_unknown: boolean;
    force: boolean;
    help: boolean;
    verbosity: number;
}
