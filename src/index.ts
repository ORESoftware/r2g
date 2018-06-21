'use strict';


export type EVCallback = (err: any, val?: any) => void;

export const r2gSmokeTest = function () {
  console.log('running the smoke test which should succeed.');
   return true;
};
