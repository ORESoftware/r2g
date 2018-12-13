'use strict';

import path = require("path");
import fs = require('fs');
import async = require('async');
import log from "../../logger";
import {Packages} from "./run";
import * as util from "util";
import chalk from "chalk";

/////////////////////////////////////////////////////////////////////

export const getFSMap = function (opts: any, searchRoot: string, packages: Packages, cb: Function) {

  const map = {} as { [key: string]: string };

  const searchDir = function (dir: string, cb: any) {

    fs.readdir(dir, function (err, items) {

      if (err) {
        return cb(err);
      }

      const mappy = function (item: string, cb: Function) {

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

          if (!stats.isFile()) {
            log.warn('unexpected non-file here:', item);
            return cb(null);
          }

          if (!item.endsWith('/package.json')) {
            return cb(null);
          }

          fs.readFile(item, function (err, data) {

            if (err) {
              return cb(err);
            }

            let parsed = null;

            try {
              parsed = JSON.parse(String(data));
            }
            catch (err) {
              log.error('trouble parsing package.json file at path => ', item);
              log.error(err.message || err);
              return cb(err);
            }

            if (parsed && parsed.name) {

              let nm = parsed.name;

              if (map[nm] && packages[nm]) {

                log.warn('the following package may exist in more than one place on your fs =>', chalk.magenta(nm));
                log.warn('pre-existing place => ', chalk.blueBright(map[nm]));
                log.warn('new place => ', chalk.blueBright(item));

                return cb(
                  new Error('The following requested package name exists in more than 1 location on disk, and docker.r2g does not know which one to use ... ' +
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

  searchDir(searchRoot, function (err: any) {
    err && log.error('unexpected error:', err.message || err);
    cb(err, map);
  });

};
