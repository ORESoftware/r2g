'use strict';

console.log('there is nothing to see here.');


export const x = async function foo(){
   throw new Error('bam bam bam');
};


export const r2gSmokeTest = function () {
  console.log('running the smoke test which should succeed.');
   return true;
};
