'use strict';


export type EVCb<T = any, E = any> = (err: E, T?: any) => void;

export const r2gSmokeTest = function () {
   return true;
};
