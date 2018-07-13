#!/usr/bin/env node
'use strict';

Object.defineProperty(exports, "__esModule", { value: true });

const fs = require("fs");
const path = require("path");

(function findRoot(pth) {
  let possiblePkgDotJsonPath = path.resolve(String(pth) + '/package.json');
  try {
    if(fs.lstatSync(possiblePkgDotJsonPath).isFile()){
      console.log(pth);
      process.exit(0);
    }
  }
  catch (err) {
    let subPath = path.resolve(String(pth) + '/../');
    if (subPath === pth) {
      console.error(' => Cannot find path to project root.');
      process.exit(1);
    }
    else {
      return findRoot(subPath);
    }
  }
})(process.cwd());
