"use strict";

// koa-66 uses util predicates removed in Node 23. Preserve its established
// routing behavior on modern Node without patching installed dependencies.
const util = require("util");
if (!util.isRegExp) util.isRegExp = util.types.isRegExp;
if (!util.isArray) util.isArray = Array.isArray;
