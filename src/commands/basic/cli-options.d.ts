declare const _default: ({
    names: string[];
    type: string;
    help: string;
    default?: undefined;
    hidden?: undefined;
    env?: undefined;
} | {
    names: string[];
    type: string;
    help: string;
    default: boolean;
    hidden: boolean;
    env: string;
} | {
    names: string[];
    type: string;
    help: string;
    env: string;
    default?: undefined;
    hidden?: undefined;
})[];
export default _default;
export interface R2GBasicOpts {
    bash_completion: boolean;
    version: boolean;
    debug: boolean;
    allow_unknown: boolean;
    force: boolean;
    help: boolean;
    verbosity: number;
}
