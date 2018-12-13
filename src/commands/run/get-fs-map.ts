'use strict';

import path = require("path");
import fs = require('fs');
import async = require('async');
import log from "../../logger";
import {Packages} from "./run";
import * as util from "util";
import chalk from "chalk";
import {EVCb} from "../../index";

/////////////////////////////////////////////////////////////////////

const searchedPaths = {} as { [key: string]: true };

const isPathSearchableBasic = function (item: string) {

  item = path.normalize(item);

  if (!path.isAbsolute(item)) {
    throw new Error('Path to be searched is not absolute:' + item);
  }

  if (searchedPaths[item]) {
    return false;
  }

  return true;
};

/////////////////////////////////////////////////////////////////////

export interface MapType { [key: string]: string }


export const getFSMap = function (opts: any, searchRoots: Array<string>, packages: Packages, cb: EVCb<MapType>) {

  const pths: Array<string> = [];

  searchRoots.map(d => String(d || '').trim())
  .filter(Boolean)
  .sort((a, b) => (a.length - b.length))
  .forEach(v => {

    const s = !pths.some(p => {
      return p.startsWith(v + '/');
    });

    if (s) {
      pths.push(v);
    }
  });

  const map = {} as MapType;

  const searchDir = function (dir: string, cb: EVCb<any>) {

    searchedPaths[dir] = true;

    fs.readdir(dir, function (err, items) {

      if (err) {
        log.warn('Could not read directory at path:', dir);
        if(String(err.message || err).match(/permission denied/)){
          return cb(null);
        }
        return cb(err);
      }

      const mappy = function (item: string, cb: EVCb<any>) {

        item = path.resolve(dir + '/' + item);

        fs.lstat(item, function (err, stats) {

          if (err) {
            log.warn(err.message);
            return cb(null);
          }

          if (stats.isSymbolicLink()) {
            opts.verbosity > 2 && log.warn('looks like a symbolic link:', item);
            return cb(null);
          }

          if (stats.isDirectory()) {

            if(!isPathSearchableBasic(item)){
              return cb(null);
            }

            if (item.endsWith('/.npm')) {
              return cb(null);
            }

            if (item.endsWith('/.cache')) {
              return cb(null);
            }

            if (item.endsWith('/node_modules')) {
              return cb(null);
            }

            if (item.endsWith('/node_modules/')) {
              return cb(null);
            }

            if (item.endsWith('/.nvm')) {
              return cb(null);
            }

            return searchDir(item, cb);
          }


          if (!item.endsWith('/package.json')) {
            return cb(null);
          }

          if (!stats.isFile()) {
            log.warn('unexpected non-file here:', item);
            return cb(null);
          }

          fs.readFile(item, function (err, data) {

            if (err) {
              return cb(err);
            }

            let parsed = null, linkable = null;

            try {
              parsed = JSON.parse(String(data));
            }
            catch (err) {
              log.error('trouble parsing package.json file at path => ', item);
              log.error(err.message || err);
              return cb(err);
            }

            try{
               linkable = parsed.r2g.linkable;
            }
            catch(err){

            }

            if(linkable === false){
              return cb(null);
            }


            if (parsed && parsed.name) {

              let nm = parsed.name;

              if (map[nm] && packages[nm]) {

                log.warn('the following package may exist in more than one place on your fs =>', chalk.magenta(nm));
                log.warn('pre-existing place => ', chalk.blueBright(map[nm]));
                log.warn('new place => ', chalk.blueBright(item));

                return cb(
                  new Error('The following requested package name exists in more than 1 location on disk, and r2g does not know which one to use ... ' +
                    chalk.magentaBright.bold(util.inspect({name: nm, locations: [map[nm], item]})))
                )
              }
              else if (packages[parsed.name]) {
                log.info('added the following package name to the map:', parsed.name);
                map[parsed.name] = item;
              }
            }

            cb(null);

          });

        });

      };

      async.eachLimit(
        items,
        4,
        mappy,
        cb
      );

    });

  };

  pths.forEach(v => {
    if(isPathSearchableBasic(v)){
      searchDir(v, function (err) {
        err && log.error('unexpected error:', err.message || err);
        cb(err, map);
      });
    }
  });


};
