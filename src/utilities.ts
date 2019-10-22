'use strict';

export const flattenDeep = function (arr1: Array<any>): Array<any> {
  return arr1.reduce((acc, val) => Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val), []);
};
