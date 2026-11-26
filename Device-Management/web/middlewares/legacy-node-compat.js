'use strict';

// koa-66 still calls predicates removed in Node 23. Restore only missing
// functions before the scaffold registers routes, without editing node_modules.
const util = require('util');
if (!util.isRegExp) util.isRegExp = util.types.isRegExp;
if (!util.isArray) util.isArray = Array.isArray;
