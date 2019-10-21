declare const _default: ({
    names: string[];
    type: string;
    help: string;
    default?: undefined;
    env?: undefined;
} | {
    names: string[];
    type: string;
    help: string;
    default: string;
    env?: undefined;
} | {
    names: string[];
    type: string;
    help: string;
    env: string;
    default?: undefined;
} | {
    names: string[];
    type: string;
    default: boolean;
    env: string;
    help?: undefined;
})[];
export default _default;
export interface R2GInitOpts {
    allow_unknown: boolean;
    force: boolean;
    help: boolean;
    verbosity: number;
}
