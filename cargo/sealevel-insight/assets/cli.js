#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res, err2) => function __init() {
  if (err2) throw err2[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err2 = [e], e;
  }
};
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/importMetaShim.ts
var import_node_url, importMetaUrl;
var init_importMetaShim = __esm({
  "src/importMetaShim.ts"() {
    "use strict";
    import_node_url = require("node:url");
    importMetaUrl = (0, import_node_url.pathToFileURL)(__filename).href;
  }
});

// node_modules/@iarna/toml/lib/parser.js
var require_parser = __commonJS({
  "node_modules/@iarna/toml/lib/parser.js"(exports2, module2) {
    "use strict";
    init_importMetaShim();
    var ParserEND = 1114112;
    var ParserError = class _ParserError extends Error {
      /* istanbul ignore next */
      constructor(msg, filename, linenumber) {
        super("[ParserError] " + msg, filename, linenumber);
        this.name = "ParserError";
        this.code = "ParserError";
        if (Error.captureStackTrace) Error.captureStackTrace(this, _ParserError);
      }
    };
    var State = class {
      constructor(parser) {
        this.parser = parser;
        this.buf = "";
        this.returned = null;
        this.result = null;
        this.resultTable = null;
        this.resultArr = null;
      }
    };
    var Parser2 = class {
      constructor() {
        this.pos = 0;
        this.col = 0;
        this.line = 0;
        this.obj = {};
        this.ctx = this.obj;
        this.stack = [];
        this._buf = "";
        this.char = null;
        this.ii = 0;
        this.state = new State(this.parseStart);
      }
      parse(str) {
        if (str.length === 0 || str.length == null) return;
        this._buf = String(str);
        this.ii = -1;
        this.char = -1;
        let getNext;
        while (getNext === false || this.nextChar()) {
          getNext = this.runOne();
        }
        this._buf = null;
      }
      nextChar() {
        if (this.char === 10) {
          ++this.line;
          this.col = -1;
        }
        ++this.ii;
        this.char = this._buf.codePointAt(this.ii);
        ++this.pos;
        ++this.col;
        return this.haveBuffer();
      }
      haveBuffer() {
        return this.ii < this._buf.length;
      }
      runOne() {
        return this.state.parser.call(this, this.state.returned);
      }
      finish() {
        this.char = ParserEND;
        let last;
        do {
          last = this.state.parser;
          this.runOne();
        } while (this.state.parser !== last);
        this.ctx = null;
        this.state = null;
        this._buf = null;
        return this.obj;
      }
      next(fn) {
        if (typeof fn !== "function") throw new ParserError("Tried to set state to non-existent state: " + JSON.stringify(fn));
        this.state.parser = fn;
      }
      goto(fn) {
        this.next(fn);
        return this.runOne();
      }
      call(fn, returnWith) {
        if (returnWith) this.next(returnWith);
        this.stack.push(this.state);
        this.state = new State(fn);
      }
      callNow(fn, returnWith) {
        this.call(fn, returnWith);
        return this.runOne();
      }
      return(value) {
        if (this.stack.length === 0) throw this.error(new ParserError("Stack underflow"));
        if (value === void 0) value = this.state.buf;
        this.state = this.stack.pop();
        this.state.returned = value;
      }
      returnNow(value) {
        this.return(value);
        return this.runOne();
      }
      consume() {
        if (this.char === ParserEND) throw this.error(new ParserError("Unexpected end-of-buffer"));
        this.state.buf += this._buf[this.ii];
      }
      error(err2) {
        err2.line = this.line;
        err2.col = this.col;
        err2.pos = this.pos;
        return err2;
      }
      /* istanbul ignore next */
      parseStart() {
        throw new ParserError("Must declare a parseStart method");
      }
    };
    Parser2.END = ParserEND;
    Parser2.Error = ParserError;
    module2.exports = Parser2;
  }
});

// node_modules/@iarna/toml/lib/create-datetime.js
var require_create_datetime = __commonJS({
  "node_modules/@iarna/toml/lib/create-datetime.js"(exports2, module2) {
    "use strict";
    init_importMetaShim();
    module2.exports = (value) => {
      const date = new Date(value);
      if (isNaN(date)) {
        throw new TypeError("Invalid Datetime");
      } else {
        return date;
      }
    };
  }
});

// node_modules/@iarna/toml/lib/format-num.js
var require_format_num = __commonJS({
  "node_modules/@iarna/toml/lib/format-num.js"(exports2, module2) {
    "use strict";
    init_importMetaShim();
    module2.exports = (d, num) => {
      num = String(num);
      while (num.length < d) num = "0" + num;
      return num;
    };
  }
});

// node_modules/@iarna/toml/lib/create-datetime-float.js
var require_create_datetime_float = __commonJS({
  "node_modules/@iarna/toml/lib/create-datetime-float.js"(exports2, module2) {
    "use strict";
    init_importMetaShim();
    var f = require_format_num();
    var FloatingDateTime = class extends Date {
      constructor(value) {
        super(value + "Z");
        this.isFloating = true;
      }
      toISOString() {
        const date = `${this.getUTCFullYear()}-${f(2, this.getUTCMonth() + 1)}-${f(2, this.getUTCDate())}`;
        const time = `${f(2, this.getUTCHours())}:${f(2, this.getUTCMinutes())}:${f(2, this.getUTCSeconds())}.${f(3, this.getUTCMilliseconds())}`;
        return `${date}T${time}`;
      }
    };
    module2.exports = (value) => {
      const date = new FloatingDateTime(value);
      if (isNaN(date)) {
        throw new TypeError("Invalid Datetime");
      } else {
        return date;
      }
    };
  }
});

// node_modules/@iarna/toml/lib/create-date.js
var require_create_date = __commonJS({
  "node_modules/@iarna/toml/lib/create-date.js"(exports2, module2) {
    "use strict";
    init_importMetaShim();
    var f = require_format_num();
    var DateTime = global.Date;
    var Date2 = class extends DateTime {
      constructor(value) {
        super(value);
        this.isDate = true;
      }
      toISOString() {
        return `${this.getUTCFullYear()}-${f(2, this.getUTCMonth() + 1)}-${f(2, this.getUTCDate())}`;
      }
    };
    module2.exports = (value) => {
      const date = new Date2(value);
      if (isNaN(date)) {
        throw new TypeError("Invalid Datetime");
      } else {
        return date;
      }
    };
  }
});

// node_modules/@iarna/toml/lib/create-time.js
var require_create_time = __commonJS({
  "node_modules/@iarna/toml/lib/create-time.js"(exports2, module2) {
    "use strict";
    init_importMetaShim();
    var f = require_format_num();
    var Time = class extends Date {
      constructor(value) {
        super(`0000-01-01T${value}Z`);
        this.isTime = true;
      }
      toISOString() {
        return `${f(2, this.getUTCHours())}:${f(2, this.getUTCMinutes())}:${f(2, this.getUTCSeconds())}.${f(3, this.getUTCMilliseconds())}`;
      }
    };
    module2.exports = (value) => {
      const date = new Time(value);
      if (isNaN(date)) {
        throw new TypeError("Invalid Datetime");
      } else {
        return date;
      }
    };
  }
});

// node_modules/@iarna/toml/lib/toml-parser.js
var require_toml_parser = __commonJS({
  "node_modules/@iarna/toml/lib/toml-parser.js"(exports, module) {
    "use strict";
    init_importMetaShim();
    module.exports = makeParserClass(require_parser());
    module.exports.makeParserClass = makeParserClass;
    var TomlError = class _TomlError extends Error {
      constructor(msg) {
        super(msg);
        this.name = "TomlError";
        if (Error.captureStackTrace) Error.captureStackTrace(this, _TomlError);
        this.fromTOML = true;
        this.wrapped = null;
      }
    };
    TomlError.wrap = (err2) => {
      const terr = new TomlError(err2.message);
      terr.code = err2.code;
      terr.wrapped = err2;
      return terr;
    };
    module.exports.TomlError = TomlError;
    var createDateTime = require_create_datetime();
    var createDateTimeFloat = require_create_datetime_float();
    var createDate = require_create_date();
    var createTime = require_create_time();
    var CTRL_I = 9;
    var CTRL_J = 10;
    var CTRL_M = 13;
    var CTRL_CHAR_BOUNDARY = 31;
    var CHAR_SP = 32;
    var CHAR_QUOT = 34;
    var CHAR_NUM = 35;
    var CHAR_APOS = 39;
    var CHAR_PLUS = 43;
    var CHAR_COMMA = 44;
    var CHAR_HYPHEN = 45;
    var CHAR_PERIOD = 46;
    var CHAR_0 = 48;
    var CHAR_1 = 49;
    var CHAR_7 = 55;
    var CHAR_9 = 57;
    var CHAR_COLON = 58;
    var CHAR_EQUALS = 61;
    var CHAR_A = 65;
    var CHAR_E = 69;
    var CHAR_F = 70;
    var CHAR_T = 84;
    var CHAR_U = 85;
    var CHAR_Z = 90;
    var CHAR_LOWBAR = 95;
    var CHAR_a = 97;
    var CHAR_b = 98;
    var CHAR_e = 101;
    var CHAR_f = 102;
    var CHAR_i = 105;
    var CHAR_l = 108;
    var CHAR_n = 110;
    var CHAR_o = 111;
    var CHAR_r = 114;
    var CHAR_s = 115;
    var CHAR_t = 116;
    var CHAR_u = 117;
    var CHAR_x = 120;
    var CHAR_z = 122;
    var CHAR_LCUB = 123;
    var CHAR_RCUB = 125;
    var CHAR_LSQB = 91;
    var CHAR_BSOL = 92;
    var CHAR_RSQB = 93;
    var CHAR_DEL = 127;
    var SURROGATE_FIRST = 55296;
    var SURROGATE_LAST = 57343;
    var escapes = {
      [CHAR_b]: "\b",
      [CHAR_t]: "	",
      [CHAR_n]: "\n",
      [CHAR_f]: "\f",
      [CHAR_r]: "\r",
      [CHAR_QUOT]: '"',
      [CHAR_BSOL]: "\\"
    };
    function isDigit(cp) {
      return cp >= CHAR_0 && cp <= CHAR_9;
    }
    function isHexit(cp) {
      return cp >= CHAR_A && cp <= CHAR_F || cp >= CHAR_a && cp <= CHAR_f || cp >= CHAR_0 && cp <= CHAR_9;
    }
    function isBit(cp) {
      return cp === CHAR_1 || cp === CHAR_0;
    }
    function isOctit(cp) {
      return cp >= CHAR_0 && cp <= CHAR_7;
    }
    function isAlphaNumQuoteHyphen(cp) {
      return cp >= CHAR_A && cp <= CHAR_Z || cp >= CHAR_a && cp <= CHAR_z || cp >= CHAR_0 && cp <= CHAR_9 || cp === CHAR_APOS || cp === CHAR_QUOT || cp === CHAR_LOWBAR || cp === CHAR_HYPHEN;
    }
    function isAlphaNumHyphen(cp) {
      return cp >= CHAR_A && cp <= CHAR_Z || cp >= CHAR_a && cp <= CHAR_z || cp >= CHAR_0 && cp <= CHAR_9 || cp === CHAR_LOWBAR || cp === CHAR_HYPHEN;
    }
    var _type = /* @__PURE__ */ Symbol("type");
    var _declared = /* @__PURE__ */ Symbol("declared");
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    var defineProperty = Object.defineProperty;
    var descriptor = { configurable: true, enumerable: true, writable: true, value: void 0 };
    function hasKey(obj, key) {
      if (hasOwnProperty.call(obj, key)) return true;
      if (key === "__proto__") defineProperty(obj, "__proto__", descriptor);
      return false;
    }
    var INLINE_TABLE = /* @__PURE__ */ Symbol("inline-table");
    function InlineTable() {
      return Object.defineProperties({}, {
        [_type]: { value: INLINE_TABLE }
      });
    }
    function isInlineTable(obj) {
      if (obj === null || typeof obj !== "object") return false;
      return obj[_type] === INLINE_TABLE;
    }
    var TABLE = /* @__PURE__ */ Symbol("table");
    function Table() {
      return Object.defineProperties({}, {
        [_type]: { value: TABLE },
        [_declared]: { value: false, writable: true }
      });
    }
    function isTable(obj) {
      if (obj === null || typeof obj !== "object") return false;
      return obj[_type] === TABLE;
    }
    var _contentType = /* @__PURE__ */ Symbol("content-type");
    var INLINE_LIST = /* @__PURE__ */ Symbol("inline-list");
    function InlineList(type) {
      return Object.defineProperties([], {
        [_type]: { value: INLINE_LIST },
        [_contentType]: { value: type }
      });
    }
    function isInlineList(obj) {
      if (obj === null || typeof obj !== "object") return false;
      return obj[_type] === INLINE_LIST;
    }
    var LIST = /* @__PURE__ */ Symbol("list");
    function List() {
      return Object.defineProperties([], {
        [_type]: { value: LIST }
      });
    }
    function isList(obj) {
      if (obj === null || typeof obj !== "object") return false;
      return obj[_type] === LIST;
    }
    var _custom;
    try {
      const utilInspect = eval("require('util').inspect");
      _custom = utilInspect.custom;
    } catch (_) {
    }
    var _inspect = _custom || "inspect";
    var BoxedBigInt = class {
      constructor(value) {
        try {
          this.value = global.BigInt.asIntN(64, value);
        } catch (_) {
          this.value = null;
        }
        Object.defineProperty(this, _type, { value: INTEGER });
      }
      isNaN() {
        return this.value === null;
      }
      /* istanbul ignore next */
      toString() {
        return String(this.value);
      }
      /* istanbul ignore next */
      [_inspect]() {
        return `[BigInt: ${this.toString()}]}`;
      }
      valueOf() {
        return this.value;
      }
    };
    var INTEGER = /* @__PURE__ */ Symbol("integer");
    function Integer(value) {
      let num = Number(value);
      if (Object.is(num, -0)) num = 0;
      if (global.BigInt && !Number.isSafeInteger(num)) {
        return new BoxedBigInt(value);
      } else {
        return Object.defineProperties(new Number(num), {
          isNaN: { value: function() {
            return isNaN(this);
          } },
          [_type]: { value: INTEGER },
          [_inspect]: { value: () => `[Integer: ${value}]` }
        });
      }
    }
    function isInteger(obj) {
      if (obj === null || typeof obj !== "object") return false;
      return obj[_type] === INTEGER;
    }
    var FLOAT = /* @__PURE__ */ Symbol("float");
    function Float(value) {
      return Object.defineProperties(new Number(value), {
        [_type]: { value: FLOAT },
        [_inspect]: { value: () => `[Float: ${value}]` }
      });
    }
    function isFloat(obj) {
      if (obj === null || typeof obj !== "object") return false;
      return obj[_type] === FLOAT;
    }
    function tomlType(value) {
      const type = typeof value;
      if (type === "object") {
        if (value === null) return "null";
        if (value instanceof Date) return "datetime";
        if (_type in value) {
          switch (value[_type]) {
            case INLINE_TABLE:
              return "inline-table";
            case INLINE_LIST:
              return "inline-list";
            /* istanbul ignore next */
            case TABLE:
              return "table";
            /* istanbul ignore next */
            case LIST:
              return "list";
            case FLOAT:
              return "float";
            case INTEGER:
              return "integer";
          }
        }
      }
      return type;
    }
    function makeParserClass(Parser2) {
      class TOMLParser extends Parser2 {
        constructor() {
          super();
          this.ctx = this.obj = Table();
        }
        /* MATCH HELPER */
        atEndOfWord() {
          return this.char === CHAR_NUM || this.char === CTRL_I || this.char === CHAR_SP || this.atEndOfLine();
        }
        atEndOfLine() {
          return this.char === Parser2.END || this.char === CTRL_J || this.char === CTRL_M;
        }
        parseStart() {
          if (this.char === Parser2.END) {
            return null;
          } else if (this.char === CHAR_LSQB) {
            return this.call(this.parseTableOrList);
          } else if (this.char === CHAR_NUM) {
            return this.call(this.parseComment);
          } else if (this.char === CTRL_J || this.char === CHAR_SP || this.char === CTRL_I || this.char === CTRL_M) {
            return null;
          } else if (isAlphaNumQuoteHyphen(this.char)) {
            return this.callNow(this.parseAssignStatement);
          } else {
            throw this.error(new TomlError(`Unknown character "${this.char}"`));
          }
        }
        // HELPER, this strips any whitespace and comments to the end of the line
        // then RETURNS. Last state in a production.
        parseWhitespaceToEOL() {
          if (this.char === CHAR_SP || this.char === CTRL_I || this.char === CTRL_M) {
            return null;
          } else if (this.char === CHAR_NUM) {
            return this.goto(this.parseComment);
          } else if (this.char === Parser2.END || this.char === CTRL_J) {
            return this.return();
          } else {
            throw this.error(new TomlError("Unexpected character, expected only whitespace or comments till end of line"));
          }
        }
        /* ASSIGNMENT: key = value */
        parseAssignStatement() {
          return this.callNow(this.parseAssign, this.recordAssignStatement);
        }
        recordAssignStatement(kv) {
          let target = this.ctx;
          let finalKey = kv.key.pop();
          for (let kw of kv.key) {
            if (hasKey(target, kw) && !isTable(target[kw])) {
              throw this.error(new TomlError("Can't redefine existing key"));
            }
            target = target[kw] = target[kw] || Table();
          }
          if (hasKey(target, finalKey)) {
            throw this.error(new TomlError("Can't redefine existing key"));
          }
          target[_declared] = true;
          if (isInteger(kv.value) || isFloat(kv.value)) {
            target[finalKey] = kv.value.valueOf();
          } else {
            target[finalKey] = kv.value;
          }
          return this.goto(this.parseWhitespaceToEOL);
        }
        /* ASSSIGNMENT expression, key = value possibly inside an inline table */
        parseAssign() {
          return this.callNow(this.parseKeyword, this.recordAssignKeyword);
        }
        recordAssignKeyword(key) {
          if (this.state.resultTable) {
            this.state.resultTable.push(key);
          } else {
            this.state.resultTable = [key];
          }
          return this.goto(this.parseAssignKeywordPreDot);
        }
        parseAssignKeywordPreDot() {
          if (this.char === CHAR_PERIOD) {
            return this.next(this.parseAssignKeywordPostDot);
          } else if (this.char !== CHAR_SP && this.char !== CTRL_I) {
            return this.goto(this.parseAssignEqual);
          }
        }
        parseAssignKeywordPostDot() {
          if (this.char !== CHAR_SP && this.char !== CTRL_I) {
            return this.callNow(this.parseKeyword, this.recordAssignKeyword);
          }
        }
        parseAssignEqual() {
          if (this.char === CHAR_EQUALS) {
            return this.next(this.parseAssignPreValue);
          } else {
            throw this.error(new TomlError('Invalid character, expected "="'));
          }
        }
        parseAssignPreValue() {
          if (this.char === CHAR_SP || this.char === CTRL_I) {
            return null;
          } else {
            return this.callNow(this.parseValue, this.recordAssignValue);
          }
        }
        recordAssignValue(value) {
          return this.returnNow({ key: this.state.resultTable, value });
        }
        /* COMMENTS: #...eol */
        parseComment() {
          do {
            if (this.char === Parser2.END || this.char === CTRL_J) {
              return this.return();
            } else if (this.char === CHAR_DEL || this.char <= CTRL_CHAR_BOUNDARY && this.char !== CTRL_I) {
              throw this.errorControlCharIn("comments");
            }
          } while (this.nextChar());
        }
        /* TABLES AND LISTS, [foo] and [[foo]] */
        parseTableOrList() {
          if (this.char === CHAR_LSQB) {
            this.next(this.parseList);
          } else {
            return this.goto(this.parseTable);
          }
        }
        /* TABLE [foo.bar.baz] */
        parseTable() {
          this.ctx = this.obj;
          return this.goto(this.parseTableNext);
        }
        parseTableNext() {
          if (this.char === CHAR_SP || this.char === CTRL_I) {
            return null;
          } else {
            return this.callNow(this.parseKeyword, this.parseTableMore);
          }
        }
        parseTableMore(keyword) {
          if (this.char === CHAR_SP || this.char === CTRL_I) {
            return null;
          } else if (this.char === CHAR_RSQB) {
            if (hasKey(this.ctx, keyword) && (!isTable(this.ctx[keyword]) || this.ctx[keyword][_declared])) {
              throw this.error(new TomlError("Can't redefine existing key"));
            } else {
              this.ctx = this.ctx[keyword] = this.ctx[keyword] || Table();
              this.ctx[_declared] = true;
            }
            return this.next(this.parseWhitespaceToEOL);
          } else if (this.char === CHAR_PERIOD) {
            if (!hasKey(this.ctx, keyword)) {
              this.ctx = this.ctx[keyword] = Table();
            } else if (isTable(this.ctx[keyword])) {
              this.ctx = this.ctx[keyword];
            } else if (isList(this.ctx[keyword])) {
              this.ctx = this.ctx[keyword][this.ctx[keyword].length - 1];
            } else {
              throw this.error(new TomlError("Can't redefine existing key"));
            }
            return this.next(this.parseTableNext);
          } else {
            throw this.error(new TomlError("Unexpected character, expected whitespace, . or ]"));
          }
        }
        /* LIST [[a.b.c]] */
        parseList() {
          this.ctx = this.obj;
          return this.goto(this.parseListNext);
        }
        parseListNext() {
          if (this.char === CHAR_SP || this.char === CTRL_I) {
            return null;
          } else {
            return this.callNow(this.parseKeyword, this.parseListMore);
          }
        }
        parseListMore(keyword) {
          if (this.char === CHAR_SP || this.char === CTRL_I) {
            return null;
          } else if (this.char === CHAR_RSQB) {
            if (!hasKey(this.ctx, keyword)) {
              this.ctx[keyword] = List();
            }
            if (isInlineList(this.ctx[keyword])) {
              throw this.error(new TomlError("Can't extend an inline array"));
            } else if (isList(this.ctx[keyword])) {
              const next = Table();
              this.ctx[keyword].push(next);
              this.ctx = next;
            } else {
              throw this.error(new TomlError("Can't redefine an existing key"));
            }
            return this.next(this.parseListEnd);
          } else if (this.char === CHAR_PERIOD) {
            if (!hasKey(this.ctx, keyword)) {
              this.ctx = this.ctx[keyword] = Table();
            } else if (isInlineList(this.ctx[keyword])) {
              throw this.error(new TomlError("Can't extend an inline array"));
            } else if (isInlineTable(this.ctx[keyword])) {
              throw this.error(new TomlError("Can't extend an inline table"));
            } else if (isList(this.ctx[keyword])) {
              this.ctx = this.ctx[keyword][this.ctx[keyword].length - 1];
            } else if (isTable(this.ctx[keyword])) {
              this.ctx = this.ctx[keyword];
            } else {
              throw this.error(new TomlError("Can't redefine an existing key"));
            }
            return this.next(this.parseListNext);
          } else {
            throw this.error(new TomlError("Unexpected character, expected whitespace, . or ]"));
          }
        }
        parseListEnd(keyword) {
          if (this.char === CHAR_RSQB) {
            return this.next(this.parseWhitespaceToEOL);
          } else {
            throw this.error(new TomlError("Unexpected character, expected whitespace, . or ]"));
          }
        }
        /* VALUE string, number, boolean, inline list, inline object */
        parseValue() {
          if (this.char === Parser2.END) {
            throw this.error(new TomlError("Key without value"));
          } else if (this.char === CHAR_QUOT) {
            return this.next(this.parseDoubleString);
          }
          if (this.char === CHAR_APOS) {
            return this.next(this.parseSingleString);
          } else if (this.char === CHAR_HYPHEN || this.char === CHAR_PLUS) {
            return this.goto(this.parseNumberSign);
          } else if (this.char === CHAR_i) {
            return this.next(this.parseInf);
          } else if (this.char === CHAR_n) {
            return this.next(this.parseNan);
          } else if (isDigit(this.char)) {
            return this.goto(this.parseNumberOrDateTime);
          } else if (this.char === CHAR_t || this.char === CHAR_f) {
            return this.goto(this.parseBoolean);
          } else if (this.char === CHAR_LSQB) {
            return this.call(this.parseInlineList, this.recordValue);
          } else if (this.char === CHAR_LCUB) {
            return this.call(this.parseInlineTable, this.recordValue);
          } else {
            throw this.error(new TomlError("Unexpected character, expecting string, number, datetime, boolean, inline array or inline table"));
          }
        }
        recordValue(value) {
          return this.returnNow(value);
        }
        parseInf() {
          if (this.char === CHAR_n) {
            return this.next(this.parseInf2);
          } else {
            throw this.error(new TomlError('Unexpected character, expected "inf", "+inf" or "-inf"'));
          }
        }
        parseInf2() {
          if (this.char === CHAR_f) {
            if (this.state.buf === "-") {
              return this.return(-Infinity);
            } else {
              return this.return(Infinity);
            }
          } else {
            throw this.error(new TomlError('Unexpected character, expected "inf", "+inf" or "-inf"'));
          }
        }
        parseNan() {
          if (this.char === CHAR_a) {
            return this.next(this.parseNan2);
          } else {
            throw this.error(new TomlError('Unexpected character, expected "nan"'));
          }
        }
        parseNan2() {
          if (this.char === CHAR_n) {
            return this.return(NaN);
          } else {
            throw this.error(new TomlError('Unexpected character, expected "nan"'));
          }
        }
        /* KEYS, barewords or basic, literal, or dotted */
        parseKeyword() {
          if (this.char === CHAR_QUOT) {
            return this.next(this.parseBasicString);
          } else if (this.char === CHAR_APOS) {
            return this.next(this.parseLiteralString);
          } else {
            return this.goto(this.parseBareKey);
          }
        }
        /* KEYS: barewords */
        parseBareKey() {
          do {
            if (this.char === Parser2.END) {
              throw this.error(new TomlError("Key ended without value"));
            } else if (isAlphaNumHyphen(this.char)) {
              this.consume();
            } else if (this.state.buf.length === 0) {
              throw this.error(new TomlError("Empty bare keys are not allowed"));
            } else {
              return this.returnNow();
            }
          } while (this.nextChar());
        }
        /* STRINGS, single quoted (literal) */
        parseSingleString() {
          if (this.char === CHAR_APOS) {
            return this.next(this.parseLiteralMultiStringMaybe);
          } else {
            return this.goto(this.parseLiteralString);
          }
        }
        parseLiteralString() {
          do {
            if (this.char === CHAR_APOS) {
              return this.return();
            } else if (this.atEndOfLine()) {
              throw this.error(new TomlError("Unterminated string"));
            } else if (this.char === CHAR_DEL || this.char <= CTRL_CHAR_BOUNDARY && this.char !== CTRL_I) {
              throw this.errorControlCharIn("strings");
            } else {
              this.consume();
            }
          } while (this.nextChar());
        }
        parseLiteralMultiStringMaybe() {
          if (this.char === CHAR_APOS) {
            return this.next(this.parseLiteralMultiString);
          } else {
            return this.returnNow();
          }
        }
        parseLiteralMultiString() {
          if (this.char === CTRL_M) {
            return null;
          } else if (this.char === CTRL_J) {
            return this.next(this.parseLiteralMultiStringContent);
          } else {
            return this.goto(this.parseLiteralMultiStringContent);
          }
        }
        parseLiteralMultiStringContent() {
          do {
            if (this.char === CHAR_APOS) {
              return this.next(this.parseLiteralMultiEnd);
            } else if (this.char === Parser2.END) {
              throw this.error(new TomlError("Unterminated multi-line string"));
            } else if (this.char === CHAR_DEL || this.char <= CTRL_CHAR_BOUNDARY && this.char !== CTRL_I && this.char !== CTRL_J && this.char !== CTRL_M) {
              throw this.errorControlCharIn("strings");
            } else {
              this.consume();
            }
          } while (this.nextChar());
        }
        parseLiteralMultiEnd() {
          if (this.char === CHAR_APOS) {
            return this.next(this.parseLiteralMultiEnd2);
          } else {
            this.state.buf += "'";
            return this.goto(this.parseLiteralMultiStringContent);
          }
        }
        parseLiteralMultiEnd2() {
          if (this.char === CHAR_APOS) {
            return this.next(this.parseLiteralMultiEnd3);
          } else {
            this.state.buf += "''";
            return this.goto(this.parseLiteralMultiStringContent);
          }
        }
        parseLiteralMultiEnd3() {
          if (this.char === CHAR_APOS) {
            this.state.buf += "'";
            return this.next(this.parseLiteralMultiEnd4);
          } else {
            return this.returnNow();
          }
        }
        parseLiteralMultiEnd4() {
          if (this.char === CHAR_APOS) {
            this.state.buf += "'";
            return this.return();
          } else {
            return this.returnNow();
          }
        }
        /* STRINGS double quoted */
        parseDoubleString() {
          if (this.char === CHAR_QUOT) {
            return this.next(this.parseMultiStringMaybe);
          } else {
            return this.goto(this.parseBasicString);
          }
        }
        parseBasicString() {
          do {
            if (this.char === CHAR_BSOL) {
              return this.call(this.parseEscape, this.recordEscapeReplacement);
            } else if (this.char === CHAR_QUOT) {
              return this.return();
            } else if (this.atEndOfLine()) {
              throw this.error(new TomlError("Unterminated string"));
            } else if (this.char === CHAR_DEL || this.char <= CTRL_CHAR_BOUNDARY && this.char !== CTRL_I) {
              throw this.errorControlCharIn("strings");
            } else {
              this.consume();
            }
          } while (this.nextChar());
        }
        recordEscapeReplacement(replacement) {
          this.state.buf += replacement;
          return this.goto(this.parseBasicString);
        }
        parseMultiStringMaybe() {
          if (this.char === CHAR_QUOT) {
            return this.next(this.parseMultiString);
          } else {
            return this.returnNow();
          }
        }
        parseMultiString() {
          if (this.char === CTRL_M) {
            return null;
          } else if (this.char === CTRL_J) {
            return this.next(this.parseMultiStringContent);
          } else {
            return this.goto(this.parseMultiStringContent);
          }
        }
        parseMultiStringContent() {
          do {
            if (this.char === CHAR_BSOL) {
              return this.call(this.parseMultiEscape, this.recordMultiEscapeReplacement);
            } else if (this.char === CHAR_QUOT) {
              return this.next(this.parseMultiEnd);
            } else if (this.char === Parser2.END) {
              throw this.error(new TomlError("Unterminated multi-line string"));
            } else if (this.char === CHAR_DEL || this.char <= CTRL_CHAR_BOUNDARY && this.char !== CTRL_I && this.char !== CTRL_J && this.char !== CTRL_M) {
              throw this.errorControlCharIn("strings");
            } else {
              this.consume();
            }
          } while (this.nextChar());
        }
        errorControlCharIn(type) {
          let displayCode = "\\u00";
          if (this.char < 16) {
            displayCode += "0";
          }
          displayCode += this.char.toString(16);
          return this.error(new TomlError(`Control characters (codes < 0x1f and 0x7f) are not allowed in ${type}, use ${displayCode} instead`));
        }
        recordMultiEscapeReplacement(replacement) {
          this.state.buf += replacement;
          return this.goto(this.parseMultiStringContent);
        }
        parseMultiEnd() {
          if (this.char === CHAR_QUOT) {
            return this.next(this.parseMultiEnd2);
          } else {
            this.state.buf += '"';
            return this.goto(this.parseMultiStringContent);
          }
        }
        parseMultiEnd2() {
          if (this.char === CHAR_QUOT) {
            return this.next(this.parseMultiEnd3);
          } else {
            this.state.buf += '""';
            return this.goto(this.parseMultiStringContent);
          }
        }
        parseMultiEnd3() {
          if (this.char === CHAR_QUOT) {
            this.state.buf += '"';
            return this.next(this.parseMultiEnd4);
          } else {
            return this.returnNow();
          }
        }
        parseMultiEnd4() {
          if (this.char === CHAR_QUOT) {
            this.state.buf += '"';
            return this.return();
          } else {
            return this.returnNow();
          }
        }
        parseMultiEscape() {
          if (this.char === CTRL_M || this.char === CTRL_J) {
            return this.next(this.parseMultiTrim);
          } else if (this.char === CHAR_SP || this.char === CTRL_I) {
            return this.next(this.parsePreMultiTrim);
          } else {
            return this.goto(this.parseEscape);
          }
        }
        parsePreMultiTrim() {
          if (this.char === CHAR_SP || this.char === CTRL_I) {
            return null;
          } else if (this.char === CTRL_M || this.char === CTRL_J) {
            return this.next(this.parseMultiTrim);
          } else {
            throw this.error(new TomlError("Can't escape whitespace"));
          }
        }
        parseMultiTrim() {
          if (this.char === CTRL_J || this.char === CHAR_SP || this.char === CTRL_I || this.char === CTRL_M) {
            return null;
          } else {
            return this.returnNow();
          }
        }
        parseEscape() {
          if (this.char in escapes) {
            return this.return(escapes[this.char]);
          } else if (this.char === CHAR_u) {
            return this.call(this.parseSmallUnicode, this.parseUnicodeReturn);
          } else if (this.char === CHAR_U) {
            return this.call(this.parseLargeUnicode, this.parseUnicodeReturn);
          } else {
            throw this.error(new TomlError("Unknown escape character: " + this.char));
          }
        }
        parseUnicodeReturn(char) {
          try {
            const codePoint = parseInt(char, 16);
            if (codePoint >= SURROGATE_FIRST && codePoint <= SURROGATE_LAST) {
              throw this.error(new TomlError("Invalid unicode, character in range 0xD800 - 0xDFFF is reserved"));
            }
            return this.returnNow(String.fromCodePoint(codePoint));
          } catch (err2) {
            throw this.error(TomlError.wrap(err2));
          }
        }
        parseSmallUnicode() {
          if (!isHexit(this.char)) {
            throw this.error(new TomlError("Invalid character in unicode sequence, expected hex"));
          } else {
            this.consume();
            if (this.state.buf.length >= 4) return this.return();
          }
        }
        parseLargeUnicode() {
          if (!isHexit(this.char)) {
            throw this.error(new TomlError("Invalid character in unicode sequence, expected hex"));
          } else {
            this.consume();
            if (this.state.buf.length >= 8) return this.return();
          }
        }
        /* NUMBERS */
        parseNumberSign() {
          this.consume();
          return this.next(this.parseMaybeSignedInfOrNan);
        }
        parseMaybeSignedInfOrNan() {
          if (this.char === CHAR_i) {
            return this.next(this.parseInf);
          } else if (this.char === CHAR_n) {
            return this.next(this.parseNan);
          } else {
            return this.callNow(this.parseNoUnder, this.parseNumberIntegerStart);
          }
        }
        parseNumberIntegerStart() {
          if (this.char === CHAR_0) {
            this.consume();
            return this.next(this.parseNumberIntegerExponentOrDecimal);
          } else {
            return this.goto(this.parseNumberInteger);
          }
        }
        parseNumberIntegerExponentOrDecimal() {
          if (this.char === CHAR_PERIOD) {
            this.consume();
            return this.call(this.parseNoUnder, this.parseNumberFloat);
          } else if (this.char === CHAR_E || this.char === CHAR_e) {
            this.consume();
            return this.next(this.parseNumberExponentSign);
          } else {
            return this.returnNow(Integer(this.state.buf));
          }
        }
        parseNumberInteger() {
          if (isDigit(this.char)) {
            this.consume();
          } else if (this.char === CHAR_LOWBAR) {
            return this.call(this.parseNoUnder);
          } else if (this.char === CHAR_E || this.char === CHAR_e) {
            this.consume();
            return this.next(this.parseNumberExponentSign);
          } else if (this.char === CHAR_PERIOD) {
            this.consume();
            return this.call(this.parseNoUnder, this.parseNumberFloat);
          } else {
            const result = Integer(this.state.buf);
            if (result.isNaN()) {
              throw this.error(new TomlError("Invalid number"));
            } else {
              return this.returnNow(result);
            }
          }
        }
        parseNoUnder() {
          if (this.char === CHAR_LOWBAR || this.char === CHAR_PERIOD || this.char === CHAR_E || this.char === CHAR_e) {
            throw this.error(new TomlError("Unexpected character, expected digit"));
          } else if (this.atEndOfWord()) {
            throw this.error(new TomlError("Incomplete number"));
          }
          return this.returnNow();
        }
        parseNoUnderHexOctBinLiteral() {
          if (this.char === CHAR_LOWBAR || this.char === CHAR_PERIOD) {
            throw this.error(new TomlError("Unexpected character, expected digit"));
          } else if (this.atEndOfWord()) {
            throw this.error(new TomlError("Incomplete number"));
          }
          return this.returnNow();
        }
        parseNumberFloat() {
          if (this.char === CHAR_LOWBAR) {
            return this.call(this.parseNoUnder, this.parseNumberFloat);
          } else if (isDigit(this.char)) {
            this.consume();
          } else if (this.char === CHAR_E || this.char === CHAR_e) {
            this.consume();
            return this.next(this.parseNumberExponentSign);
          } else {
            return this.returnNow(Float(this.state.buf));
          }
        }
        parseNumberExponentSign() {
          if (isDigit(this.char)) {
            return this.goto(this.parseNumberExponent);
          } else if (this.char === CHAR_HYPHEN || this.char === CHAR_PLUS) {
            this.consume();
            this.call(this.parseNoUnder, this.parseNumberExponent);
          } else {
            throw this.error(new TomlError("Unexpected character, expected -, + or digit"));
          }
        }
        parseNumberExponent() {
          if (isDigit(this.char)) {
            this.consume();
          } else if (this.char === CHAR_LOWBAR) {
            return this.call(this.parseNoUnder);
          } else {
            return this.returnNow(Float(this.state.buf));
          }
        }
        /* NUMBERS or DATETIMES  */
        parseNumberOrDateTime() {
          if (this.char === CHAR_0) {
            this.consume();
            return this.next(this.parseNumberBaseOrDateTime);
          } else {
            return this.goto(this.parseNumberOrDateTimeOnly);
          }
        }
        parseNumberOrDateTimeOnly() {
          if (this.char === CHAR_LOWBAR) {
            return this.call(this.parseNoUnder, this.parseNumberInteger);
          } else if (isDigit(this.char)) {
            this.consume();
            if (this.state.buf.length > 4) this.next(this.parseNumberInteger);
          } else if (this.char === CHAR_E || this.char === CHAR_e) {
            this.consume();
            return this.next(this.parseNumberExponentSign);
          } else if (this.char === CHAR_PERIOD) {
            this.consume();
            return this.call(this.parseNoUnder, this.parseNumberFloat);
          } else if (this.char === CHAR_HYPHEN) {
            return this.goto(this.parseDateTime);
          } else if (this.char === CHAR_COLON) {
            return this.goto(this.parseOnlyTimeHour);
          } else {
            return this.returnNow(Integer(this.state.buf));
          }
        }
        parseDateTimeOnly() {
          if (this.state.buf.length < 4) {
            if (isDigit(this.char)) {
              return this.consume();
            } else if (this.char === CHAR_COLON) {
              return this.goto(this.parseOnlyTimeHour);
            } else {
              throw this.error(new TomlError("Expected digit while parsing year part of a date"));
            }
          } else {
            if (this.char === CHAR_HYPHEN) {
              return this.goto(this.parseDateTime);
            } else {
              throw this.error(new TomlError("Expected hyphen (-) while parsing year part of date"));
            }
          }
        }
        parseNumberBaseOrDateTime() {
          if (this.char === CHAR_b) {
            this.consume();
            return this.call(this.parseNoUnderHexOctBinLiteral, this.parseIntegerBin);
          } else if (this.char === CHAR_o) {
            this.consume();
            return this.call(this.parseNoUnderHexOctBinLiteral, this.parseIntegerOct);
          } else if (this.char === CHAR_x) {
            this.consume();
            return this.call(this.parseNoUnderHexOctBinLiteral, this.parseIntegerHex);
          } else if (this.char === CHAR_PERIOD) {
            return this.goto(this.parseNumberInteger);
          } else if (isDigit(this.char)) {
            return this.goto(this.parseDateTimeOnly);
          } else {
            return this.returnNow(Integer(this.state.buf));
          }
        }
        parseIntegerHex() {
          if (isHexit(this.char)) {
            this.consume();
          } else if (this.char === CHAR_LOWBAR) {
            return this.call(this.parseNoUnderHexOctBinLiteral);
          } else {
            const result = Integer(this.state.buf);
            if (result.isNaN()) {
              throw this.error(new TomlError("Invalid number"));
            } else {
              return this.returnNow(result);
            }
          }
        }
        parseIntegerOct() {
          if (isOctit(this.char)) {
            this.consume();
          } else if (this.char === CHAR_LOWBAR) {
            return this.call(this.parseNoUnderHexOctBinLiteral);
          } else {
            const result = Integer(this.state.buf);
            if (result.isNaN()) {
              throw this.error(new TomlError("Invalid number"));
            } else {
              return this.returnNow(result);
            }
          }
        }
        parseIntegerBin() {
          if (isBit(this.char)) {
            this.consume();
          } else if (this.char === CHAR_LOWBAR) {
            return this.call(this.parseNoUnderHexOctBinLiteral);
          } else {
            const result = Integer(this.state.buf);
            if (result.isNaN()) {
              throw this.error(new TomlError("Invalid number"));
            } else {
              return this.returnNow(result);
            }
          }
        }
        /* DATETIME */
        parseDateTime() {
          if (this.state.buf.length < 4) {
            throw this.error(new TomlError("Years less than 1000 must be zero padded to four characters"));
          }
          this.state.result = this.state.buf;
          this.state.buf = "";
          return this.next(this.parseDateMonth);
        }
        parseDateMonth() {
          if (this.char === CHAR_HYPHEN) {
            if (this.state.buf.length < 2) {
              throw this.error(new TomlError("Months less than 10 must be zero padded to two characters"));
            }
            this.state.result += "-" + this.state.buf;
            this.state.buf = "";
            return this.next(this.parseDateDay);
          } else if (isDigit(this.char)) {
            this.consume();
          } else {
            throw this.error(new TomlError("Incomplete datetime"));
          }
        }
        parseDateDay() {
          if (this.char === CHAR_T || this.char === CHAR_SP) {
            if (this.state.buf.length < 2) {
              throw this.error(new TomlError("Days less than 10 must be zero padded to two characters"));
            }
            this.state.result += "-" + this.state.buf;
            this.state.buf = "";
            return this.next(this.parseStartTimeHour);
          } else if (this.atEndOfWord()) {
            return this.returnNow(createDate(this.state.result + "-" + this.state.buf));
          } else if (isDigit(this.char)) {
            this.consume();
          } else {
            throw this.error(new TomlError("Incomplete datetime"));
          }
        }
        parseStartTimeHour() {
          if (this.atEndOfWord()) {
            return this.returnNow(createDate(this.state.result));
          } else {
            return this.goto(this.parseTimeHour);
          }
        }
        parseTimeHour() {
          if (this.char === CHAR_COLON) {
            if (this.state.buf.length < 2) {
              throw this.error(new TomlError("Hours less than 10 must be zero padded to two characters"));
            }
            this.state.result += "T" + this.state.buf;
            this.state.buf = "";
            return this.next(this.parseTimeMin);
          } else if (isDigit(this.char)) {
            this.consume();
          } else {
            throw this.error(new TomlError("Incomplete datetime"));
          }
        }
        parseTimeMin() {
          if (this.state.buf.length < 2 && isDigit(this.char)) {
            this.consume();
          } else if (this.state.buf.length === 2 && this.char === CHAR_COLON) {
            this.state.result += ":" + this.state.buf;
            this.state.buf = "";
            return this.next(this.parseTimeSec);
          } else {
            throw this.error(new TomlError("Incomplete datetime"));
          }
        }
        parseTimeSec() {
          if (isDigit(this.char)) {
            this.consume();
            if (this.state.buf.length === 2) {
              this.state.result += ":" + this.state.buf;
              this.state.buf = "";
              return this.next(this.parseTimeZoneOrFraction);
            }
          } else {
            throw this.error(new TomlError("Incomplete datetime"));
          }
        }
        parseOnlyTimeHour() {
          if (this.char === CHAR_COLON) {
            if (this.state.buf.length < 2) {
              throw this.error(new TomlError("Hours less than 10 must be zero padded to two characters"));
            }
            this.state.result = this.state.buf;
            this.state.buf = "";
            return this.next(this.parseOnlyTimeMin);
          } else {
            throw this.error(new TomlError("Incomplete time"));
          }
        }
        parseOnlyTimeMin() {
          if (this.state.buf.length < 2 && isDigit(this.char)) {
            this.consume();
          } else if (this.state.buf.length === 2 && this.char === CHAR_COLON) {
            this.state.result += ":" + this.state.buf;
            this.state.buf = "";
            return this.next(this.parseOnlyTimeSec);
          } else {
            throw this.error(new TomlError("Incomplete time"));
          }
        }
        parseOnlyTimeSec() {
          if (isDigit(this.char)) {
            this.consume();
            if (this.state.buf.length === 2) {
              return this.next(this.parseOnlyTimeFractionMaybe);
            }
          } else {
            throw this.error(new TomlError("Incomplete time"));
          }
        }
        parseOnlyTimeFractionMaybe() {
          this.state.result += ":" + this.state.buf;
          if (this.char === CHAR_PERIOD) {
            this.state.buf = "";
            this.next(this.parseOnlyTimeFraction);
          } else {
            return this.return(createTime(this.state.result));
          }
        }
        parseOnlyTimeFraction() {
          if (isDigit(this.char)) {
            this.consume();
          } else if (this.atEndOfWord()) {
            if (this.state.buf.length === 0) throw this.error(new TomlError("Expected digit in milliseconds"));
            return this.returnNow(createTime(this.state.result + "." + this.state.buf));
          } else {
            throw this.error(new TomlError("Unexpected character in datetime, expected period (.), minus (-), plus (+) or Z"));
          }
        }
        parseTimeZoneOrFraction() {
          if (this.char === CHAR_PERIOD) {
            this.consume();
            this.next(this.parseDateTimeFraction);
          } else if (this.char === CHAR_HYPHEN || this.char === CHAR_PLUS) {
            this.consume();
            this.next(this.parseTimeZoneHour);
          } else if (this.char === CHAR_Z) {
            this.consume();
            return this.return(createDateTime(this.state.result + this.state.buf));
          } else if (this.atEndOfWord()) {
            return this.returnNow(createDateTimeFloat(this.state.result + this.state.buf));
          } else {
            throw this.error(new TomlError("Unexpected character in datetime, expected period (.), minus (-), plus (+) or Z"));
          }
        }
        parseDateTimeFraction() {
          if (isDigit(this.char)) {
            this.consume();
          } else if (this.state.buf.length === 1) {
            throw this.error(new TomlError("Expected digit in milliseconds"));
          } else if (this.char === CHAR_HYPHEN || this.char === CHAR_PLUS) {
            this.consume();
            this.next(this.parseTimeZoneHour);
          } else if (this.char === CHAR_Z) {
            this.consume();
            return this.return(createDateTime(this.state.result + this.state.buf));
          } else if (this.atEndOfWord()) {
            return this.returnNow(createDateTimeFloat(this.state.result + this.state.buf));
          } else {
            throw this.error(new TomlError("Unexpected character in datetime, expected period (.), minus (-), plus (+) or Z"));
          }
        }
        parseTimeZoneHour() {
          if (isDigit(this.char)) {
            this.consume();
            if (/\d\d$/.test(this.state.buf)) return this.next(this.parseTimeZoneSep);
          } else {
            throw this.error(new TomlError("Unexpected character in datetime, expected digit"));
          }
        }
        parseTimeZoneSep() {
          if (this.char === CHAR_COLON) {
            this.consume();
            this.next(this.parseTimeZoneMin);
          } else {
            throw this.error(new TomlError("Unexpected character in datetime, expected colon"));
          }
        }
        parseTimeZoneMin() {
          if (isDigit(this.char)) {
            this.consume();
            if (/\d\d$/.test(this.state.buf)) return this.return(createDateTime(this.state.result + this.state.buf));
          } else {
            throw this.error(new TomlError("Unexpected character in datetime, expected digit"));
          }
        }
        /* BOOLEAN */
        parseBoolean() {
          if (this.char === CHAR_t) {
            this.consume();
            return this.next(this.parseTrue_r);
          } else if (this.char === CHAR_f) {
            this.consume();
            return this.next(this.parseFalse_a);
          }
        }
        parseTrue_r() {
          if (this.char === CHAR_r) {
            this.consume();
            return this.next(this.parseTrue_u);
          } else {
            throw this.error(new TomlError("Invalid boolean, expected true or false"));
          }
        }
        parseTrue_u() {
          if (this.char === CHAR_u) {
            this.consume();
            return this.next(this.parseTrue_e);
          } else {
            throw this.error(new TomlError("Invalid boolean, expected true or false"));
          }
        }
        parseTrue_e() {
          if (this.char === CHAR_e) {
            return this.return(true);
          } else {
            throw this.error(new TomlError("Invalid boolean, expected true or false"));
          }
        }
        parseFalse_a() {
          if (this.char === CHAR_a) {
            this.consume();
            return this.next(this.parseFalse_l);
          } else {
            throw this.error(new TomlError("Invalid boolean, expected true or false"));
          }
        }
        parseFalse_l() {
          if (this.char === CHAR_l) {
            this.consume();
            return this.next(this.parseFalse_s);
          } else {
            throw this.error(new TomlError("Invalid boolean, expected true or false"));
          }
        }
        parseFalse_s() {
          if (this.char === CHAR_s) {
            this.consume();
            return this.next(this.parseFalse_e);
          } else {
            throw this.error(new TomlError("Invalid boolean, expected true or false"));
          }
        }
        parseFalse_e() {
          if (this.char === CHAR_e) {
            return this.return(false);
          } else {
            throw this.error(new TomlError("Invalid boolean, expected true or false"));
          }
        }
        /* INLINE LISTS */
        parseInlineList() {
          if (this.char === CHAR_SP || this.char === CTRL_I || this.char === CTRL_M || this.char === CTRL_J) {
            return null;
          } else if (this.char === Parser2.END) {
            throw this.error(new TomlError("Unterminated inline array"));
          } else if (this.char === CHAR_NUM) {
            return this.call(this.parseComment);
          } else if (this.char === CHAR_RSQB) {
            return this.return(this.state.resultArr || InlineList());
          } else {
            return this.callNow(this.parseValue, this.recordInlineListValue);
          }
        }
        recordInlineListValue(value) {
          if (!this.state.resultArr) {
            this.state.resultArr = InlineList(tomlType(value));
          }
          if (isFloat(value) || isInteger(value)) {
            this.state.resultArr.push(value.valueOf());
          } else {
            this.state.resultArr.push(value);
          }
          return this.goto(this.parseInlineListNext);
        }
        parseInlineListNext() {
          if (this.char === CHAR_SP || this.char === CTRL_I || this.char === CTRL_M || this.char === CTRL_J) {
            return null;
          } else if (this.char === CHAR_NUM) {
            return this.call(this.parseComment);
          } else if (this.char === CHAR_COMMA) {
            return this.next(this.parseInlineList);
          } else if (this.char === CHAR_RSQB) {
            return this.goto(this.parseInlineList);
          } else {
            throw this.error(new TomlError("Invalid character, expected whitespace, comma (,) or close bracket (])"));
          }
        }
        /* INLINE TABLE */
        parseInlineTable() {
          if (this.char === CHAR_SP || this.char === CTRL_I) {
            return null;
          } else if (this.char === Parser2.END || this.char === CHAR_NUM || this.char === CTRL_J || this.char === CTRL_M) {
            throw this.error(new TomlError("Unterminated inline array"));
          } else if (this.char === CHAR_RCUB) {
            return this.return(this.state.resultTable || InlineTable());
          } else {
            if (!this.state.resultTable) this.state.resultTable = InlineTable();
            return this.callNow(this.parseAssign, this.recordInlineTableValue);
          }
        }
        recordInlineTableValue(kv) {
          let target = this.state.resultTable;
          let finalKey = kv.key.pop();
          for (let kw of kv.key) {
            if (hasKey(target, kw) && (!isTable(target[kw]) || target[kw][_declared])) {
              throw this.error(new TomlError("Can't redefine existing key"));
            }
            target = target[kw] = target[kw] || Table();
          }
          if (hasKey(target, finalKey)) {
            throw this.error(new TomlError("Can't redefine existing key"));
          }
          if (isInteger(kv.value) || isFloat(kv.value)) {
            target[finalKey] = kv.value.valueOf();
          } else {
            target[finalKey] = kv.value;
          }
          return this.goto(this.parseInlineTableNext);
        }
        parseInlineTableNext() {
          if (this.char === CHAR_SP || this.char === CTRL_I) {
            return null;
          } else if (this.char === Parser2.END || this.char === CHAR_NUM || this.char === CTRL_J || this.char === CTRL_M) {
            throw this.error(new TomlError("Unterminated inline array"));
          } else if (this.char === CHAR_COMMA) {
            return this.next(this.parseInlineTablePostComma);
          } else if (this.char === CHAR_RCUB) {
            return this.goto(this.parseInlineTable);
          } else {
            throw this.error(new TomlError("Invalid character, expected whitespace, comma (,) or close bracket (])"));
          }
        }
        parseInlineTablePostComma() {
          if (this.char === CHAR_SP || this.char === CTRL_I) {
            return null;
          } else if (this.char === Parser2.END || this.char === CHAR_NUM || this.char === CTRL_J || this.char === CTRL_M) {
            throw this.error(new TomlError("Unterminated inline array"));
          } else if (this.char === CHAR_COMMA) {
            throw this.error(new TomlError("Empty elements in inline tables are not permitted"));
          } else if (this.char === CHAR_RCUB) {
            throw this.error(new TomlError("Trailing commas in inline tables are not permitted"));
          } else {
            return this.goto(this.parseInlineTable);
          }
        }
      }
      return TOMLParser;
    }
  }
});

// node_modules/@iarna/toml/parse-pretty-error.js
var require_parse_pretty_error = __commonJS({
  "node_modules/@iarna/toml/parse-pretty-error.js"(exports2, module2) {
    "use strict";
    init_importMetaShim();
    module2.exports = prettyError;
    function prettyError(err2, buf) {
      if (err2.pos == null || err2.line == null) return err2;
      let msg = err2.message;
      msg += ` at row ${err2.line + 1}, col ${err2.col + 1}, pos ${err2.pos}:
`;
      if (buf && buf.split) {
        const lines = buf.split(/\n/);
        const lineNumWidth = String(Math.min(lines.length, err2.line + 3)).length;
        let linePadding = " ";
        while (linePadding.length < lineNumWidth) linePadding += " ";
        for (let ii = Math.max(0, err2.line - 1); ii < Math.min(lines.length, err2.line + 2); ++ii) {
          let lineNum = String(ii + 1);
          if (lineNum.length < lineNumWidth) lineNum = " " + lineNum;
          if (err2.line === ii) {
            msg += lineNum + "> " + lines[ii] + "\n";
            msg += linePadding + "  ";
            for (let hh = 0; hh < err2.col; ++hh) {
              msg += " ";
            }
            msg += "^\n";
          } else {
            msg += lineNum + ": " + lines[ii] + "\n";
          }
        }
      }
      err2.message = msg + "\n";
      return err2;
    }
  }
});

// node_modules/@iarna/toml/parse-string.js
var require_parse_string = __commonJS({
  "node_modules/@iarna/toml/parse-string.js"(exports2, module2) {
    "use strict";
    init_importMetaShim();
    module2.exports = parseString;
    var TOMLParser = require_toml_parser();
    var prettyError = require_parse_pretty_error();
    function parseString(str) {
      if (global.Buffer && global.Buffer.isBuffer(str)) {
        str = str.toString("utf8");
      }
      const parser = new TOMLParser();
      try {
        parser.parse(str);
        return parser.finish();
      } catch (err2) {
        throw prettyError(err2, str);
      }
    }
  }
});

// node_modules/@iarna/toml/parse-async.js
var require_parse_async = __commonJS({
  "node_modules/@iarna/toml/parse-async.js"(exports2, module2) {
    "use strict";
    init_importMetaShim();
    module2.exports = parseAsync;
    var TOMLParser = require_toml_parser();
    var prettyError = require_parse_pretty_error();
    function parseAsync(str, opts) {
      if (!opts) opts = {};
      const index = 0;
      const blocksize = opts.blocksize || 40960;
      const parser = new TOMLParser();
      return new Promise((resolve7, reject) => {
        setImmediate(parseAsyncNext, index, blocksize, resolve7, reject);
      });
      function parseAsyncNext(index2, blocksize2, resolve7, reject) {
        if (index2 >= str.length) {
          try {
            return resolve7(parser.finish());
          } catch (err2) {
            return reject(prettyError(err2, str));
          }
        }
        try {
          parser.parse(str.slice(index2, index2 + blocksize2));
          setImmediate(parseAsyncNext, index2 + blocksize2, blocksize2, resolve7, reject);
        } catch (err2) {
          reject(prettyError(err2, str));
        }
      }
    }
  }
});

// node_modules/@iarna/toml/parse-stream.js
var require_parse_stream = __commonJS({
  "node_modules/@iarna/toml/parse-stream.js"(exports2, module2) {
    "use strict";
    init_importMetaShim();
    module2.exports = parseStream;
    var stream = require("stream");
    var TOMLParser = require_toml_parser();
    function parseStream(stm) {
      if (stm) {
        return parseReadable(stm);
      } else {
        return parseTransform(stm);
      }
    }
    function parseReadable(stm) {
      const parser = new TOMLParser();
      stm.setEncoding("utf8");
      return new Promise((resolve7, reject) => {
        let readable;
        let ended = false;
        let errored = false;
        function finish() {
          ended = true;
          if (readable) return;
          try {
            resolve7(parser.finish());
          } catch (err2) {
            reject(err2);
          }
        }
        function error(err2) {
          errored = true;
          reject(err2);
        }
        stm.once("end", finish);
        stm.once("error", error);
        readNext();
        function readNext() {
          readable = true;
          let data;
          while ((data = stm.read()) !== null) {
            try {
              parser.parse(data);
            } catch (err2) {
              return error(err2);
            }
          }
          readable = false;
          if (ended) return finish();
          if (errored) return;
          stm.once("readable", readNext);
        }
      });
    }
    function parseTransform() {
      const parser = new TOMLParser();
      return new stream.Transform({
        objectMode: true,
        transform(chunk, encoding, cb) {
          try {
            parser.parse(chunk.toString(encoding));
          } catch (err2) {
            this.emit("error", err2);
          }
          cb();
        },
        flush(cb) {
          try {
            this.push(parser.finish());
          } catch (err2) {
            this.emit("error", err2);
          }
          cb();
        }
      });
    }
  }
});

// node_modules/@iarna/toml/parse.js
var require_parse = __commonJS({
  "node_modules/@iarna/toml/parse.js"(exports2, module2) {
    "use strict";
    init_importMetaShim();
    module2.exports = require_parse_string();
    module2.exports.async = require_parse_async();
    module2.exports.stream = require_parse_stream();
    module2.exports.prettyError = require_parse_pretty_error();
  }
});

// node_modules/@iarna/toml/stringify.js
var require_stringify = __commonJS({
  "node_modules/@iarna/toml/stringify.js"(exports2, module2) {
    "use strict";
    init_importMetaShim();
    module2.exports = stringify;
    module2.exports.value = stringifyInline;
    function stringify(obj) {
      if (obj === null) throw typeError("null");
      if (obj === void 0) throw typeError("undefined");
      if (typeof obj !== "object") throw typeError(typeof obj);
      if (typeof obj.toJSON === "function") obj = obj.toJSON();
      if (obj == null) return null;
      const type = tomlType2(obj);
      if (type !== "table") throw typeError(type);
      return stringifyObject("", "", obj);
    }
    function typeError(type) {
      return new Error("Can only stringify objects, not " + type);
    }
    function getInlineKeys(obj) {
      return Object.keys(obj).filter((key) => isInline(obj[key]));
    }
    function getComplexKeys(obj) {
      return Object.keys(obj).filter((key) => !isInline(obj[key]));
    }
    function toJSON(obj) {
      let nobj = Array.isArray(obj) ? [] : Object.prototype.hasOwnProperty.call(obj, "__proto__") ? { ["__proto__"]: void 0 } : {};
      for (let prop of Object.keys(obj)) {
        if (obj[prop] && typeof obj[prop].toJSON === "function" && !("toISOString" in obj[prop])) {
          nobj[prop] = obj[prop].toJSON();
        } else {
          nobj[prop] = obj[prop];
        }
      }
      return nobj;
    }
    function stringifyObject(prefix, indent, obj) {
      obj = toJSON(obj);
      let inlineKeys;
      let complexKeys;
      inlineKeys = getInlineKeys(obj);
      complexKeys = getComplexKeys(obj);
      const result = [];
      const inlineIndent = indent || "";
      inlineKeys.forEach((key) => {
        var type = tomlType2(obj[key]);
        if (type !== "undefined" && type !== "null") {
          result.push(inlineIndent + stringifyKey(key) + " = " + stringifyAnyInline(obj[key], true));
        }
      });
      if (result.length > 0) result.push("");
      const complexIndent = prefix && inlineKeys.length > 0 ? indent + "  " : "";
      complexKeys.forEach((key) => {
        result.push(stringifyComplex(prefix, complexIndent, key, obj[key]));
      });
      return result.join("\n");
    }
    function isInline(value) {
      switch (tomlType2(value)) {
        case "undefined":
        case "null":
        case "integer":
        case "nan":
        case "float":
        case "boolean":
        case "string":
        case "datetime":
          return true;
        case "array":
          return value.length === 0 || tomlType2(value[0]) !== "table";
        case "table":
          return Object.keys(value).length === 0;
        /* istanbul ignore next */
        default:
          return false;
      }
    }
    function tomlType2(value) {
      if (value === void 0) {
        return "undefined";
      } else if (value === null) {
        return "null";
      } else if (typeof value === "bigint" || Number.isInteger(value) && !Object.is(value, -0)) {
        return "integer";
      } else if (typeof value === "number") {
        return "float";
      } else if (typeof value === "boolean") {
        return "boolean";
      } else if (typeof value === "string") {
        return "string";
      } else if ("toISOString" in value) {
        return isNaN(value) ? "undefined" : "datetime";
      } else if (Array.isArray(value)) {
        return "array";
      } else {
        return "table";
      }
    }
    function stringifyKey(key) {
      const keyStr = String(key);
      if (/^[-A-Za-z0-9_]+$/.test(keyStr)) {
        return keyStr;
      } else {
        return stringifyBasicString(keyStr);
      }
    }
    function stringifyBasicString(str) {
      return '"' + escapeString(str).replace(/"/g, '\\"') + '"';
    }
    function stringifyLiteralString(str) {
      return "'" + str + "'";
    }
    function numpad(num, str) {
      while (str.length < num) str = "0" + str;
      return str;
    }
    function escapeString(str) {
      return str.replace(/\\/g, "\\\\").replace(/[\b]/g, "\\b").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\f/g, "\\f").replace(/\r/g, "\\r").replace(/([\u0000-\u001f\u007f])/, (c) => "\\u" + numpad(4, c.codePointAt(0).toString(16)));
    }
    function stringifyMultilineString(str) {
      let escaped = str.split(/\n/).map((str2) => {
        return escapeString(str2).replace(/"(?="")/g, '\\"');
      }).join("\n");
      if (escaped.slice(-1) === '"') escaped += "\\\n";
      return '"""\n' + escaped + '"""';
    }
    function stringifyAnyInline(value, multilineOk) {
      let type = tomlType2(value);
      if (type === "string") {
        if (multilineOk && /\n/.test(value)) {
          type = "string-multiline";
        } else if (!/[\b\t\n\f\r']/.test(value) && /"/.test(value)) {
          type = "string-literal";
        }
      }
      return stringifyInline(value, type);
    }
    function stringifyInline(value, type) {
      if (!type) type = tomlType2(value);
      switch (type) {
        case "string-multiline":
          return stringifyMultilineString(value);
        case "string":
          return stringifyBasicString(value);
        case "string-literal":
          return stringifyLiteralString(value);
        case "integer":
          return stringifyInteger(value);
        case "float":
          return stringifyFloat(value);
        case "boolean":
          return stringifyBoolean(value);
        case "datetime":
          return stringifyDatetime(value);
        case "array":
          return stringifyInlineArray(value.filter((_) => tomlType2(_) !== "null" && tomlType2(_) !== "undefined" && tomlType2(_) !== "nan"));
        case "table":
          return stringifyInlineTable(value);
        /* istanbul ignore next */
        default:
          throw typeError(type);
      }
    }
    function stringifyInteger(value) {
      return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, "_");
    }
    function stringifyFloat(value) {
      if (value === Infinity) {
        return "inf";
      } else if (value === -Infinity) {
        return "-inf";
      } else if (Object.is(value, NaN)) {
        return "nan";
      } else if (Object.is(value, -0)) {
        return "-0.0";
      }
      const [int, dec] = String(value).split(".");
      return stringifyInteger(int) + "." + dec;
    }
    function stringifyBoolean(value) {
      return String(value);
    }
    function stringifyDatetime(value) {
      return value.toISOString();
    }
    function stringifyInlineArray(values) {
      values = toJSON(values);
      let result = "[";
      const stringified = values.map((_) => stringifyInline(_));
      if (stringified.join(", ").length > 60 || /\n/.test(stringified)) {
        result += "\n  " + stringified.join(",\n  ") + "\n";
      } else {
        result += " " + stringified.join(", ") + (stringified.length > 0 ? " " : "");
      }
      return result + "]";
    }
    function stringifyInlineTable(value) {
      value = toJSON(value);
      const result = [];
      Object.keys(value).forEach((key) => {
        result.push(stringifyKey(key) + " = " + stringifyAnyInline(value[key], false));
      });
      return "{ " + result.join(", ") + (result.length > 0 ? " " : "") + "}";
    }
    function stringifyComplex(prefix, indent, key, value) {
      const valueType = tomlType2(value);
      if (valueType === "array") {
        return stringifyArrayOfTables(prefix, indent, key, value);
      } else if (valueType === "table") {
        return stringifyComplexTable(prefix, indent, key, value);
      } else {
        throw typeError(valueType);
      }
    }
    function stringifyArrayOfTables(prefix, indent, key, values) {
      values = toJSON(values);
      const firstValueType = tomlType2(values[0]);
      if (firstValueType !== "table") throw typeError(firstValueType);
      const fullKey = prefix + stringifyKey(key);
      let result = "";
      values.forEach((table) => {
        if (result.length > 0) result += "\n";
        result += indent + "[[" + fullKey + "]]\n";
        result += stringifyObject(fullKey + ".", indent, table);
      });
      return result;
    }
    function stringifyComplexTable(prefix, indent, key, value) {
      const fullKey = prefix + stringifyKey(key);
      let result = "";
      if (getInlineKeys(value).length > 0) {
        result += indent + "[" + fullKey + "]\n";
      }
      return result + stringifyObject(fullKey + ".", indent, value);
    }
  }
});

// node_modules/@iarna/toml/toml.js
var require_toml = __commonJS({
  "node_modules/@iarna/toml/toml.js"(exports2) {
    "use strict";
    init_importMetaShim();
    exports2.parse = require_parse();
    exports2.stringify = require_stringify();
  }
});

// src/cli.ts
init_importMetaShim();
var path14 = __toESM(require("node:path"));
var import_promises6 = require("node:fs/promises");
var import_node_url6 = require("node:url");

// src/analysis/analyzer.ts
init_importMetaShim();

// src/parser/rustParser.ts
init_importMetaShim();
var path = __toESM(require("node:path"));

// node_modules/web-tree-sitter/tree-sitter.js
init_importMetaShim();
var __defProp2 = Object.defineProperty;
var __name = (target, value) => __defProp2(target, "name", { value, configurable: true });
var SIZE_OF_SHORT = 2;
var SIZE_OF_INT = 4;
var SIZE_OF_CURSOR = 4 * SIZE_OF_INT;
var SIZE_OF_NODE = 5 * SIZE_OF_INT;
var SIZE_OF_POINT = 2 * SIZE_OF_INT;
var SIZE_OF_RANGE = 2 * SIZE_OF_INT + 2 * SIZE_OF_POINT;
var ZERO_POINT = { row: 0, column: 0 };
var INTERNAL = /* @__PURE__ */ Symbol("INTERNAL");
function assertInternal(x) {
  if (x !== INTERNAL) throw new Error("Illegal constructor");
}
__name(assertInternal, "assertInternal");
function isPoint(point) {
  return !!point && typeof point.row === "number" && typeof point.column === "number";
}
__name(isPoint, "isPoint");
function setModule(module2) {
  C = module2;
}
__name(setModule, "setModule");
var C;
var LookaheadIterator = class {
  static {
    __name(this, "LookaheadIterator");
  }
  /** @internal */
  [0] = 0;
  // Internal handle for WASM
  /** @internal */
  language;
  /** @internal */
  constructor(internal, address, language) {
    assertInternal(internal);
    this[0] = address;
    this.language = language;
  }
  /** Get the current symbol of the lookahead iterator. */
  get currentTypeId() {
    return C._ts_lookahead_iterator_current_symbol(this[0]);
  }
  /** Get the current symbol name of the lookahead iterator. */
  get currentType() {
    return this.language.types[this.currentTypeId] || "ERROR";
  }
  /** Delete the lookahead iterator, freeing its resources. */
  delete() {
    C._ts_lookahead_iterator_delete(this[0]);
    this[0] = 0;
  }
  /**
   * Reset the lookahead iterator.
   *
   * This returns `true` if the language was set successfully and `false`
   * otherwise.
   */
  reset(language, stateId) {
    if (C._ts_lookahead_iterator_reset(this[0], language[0], stateId)) {
      this.language = language;
      return true;
    }
    return false;
  }
  /**
   * Reset the lookahead iterator to another state.
   *
   * This returns `true` if the iterator was reset to the given state and
   * `false` otherwise.
   */
  resetState(stateId) {
    return Boolean(C._ts_lookahead_iterator_reset_state(this[0], stateId));
  }
  /**
   * Returns an iterator that iterates over the symbols of the lookahead iterator.
   *
   * The iterator will yield the current symbol name as a string for each step
   * until there are no more symbols to iterate over.
   */
  [Symbol.iterator]() {
    return {
      next: /* @__PURE__ */ __name(() => {
        if (C._ts_lookahead_iterator_next(this[0])) {
          return { done: false, value: this.currentType };
        }
        return { done: true, value: "" };
      }, "next")
    };
  }
};
function getText(tree, startIndex, endIndex, startPosition) {
  const length = endIndex - startIndex;
  let result = tree.textCallback(startIndex, startPosition);
  if (result) {
    startIndex += result.length;
    while (startIndex < endIndex) {
      const string4 = tree.textCallback(startIndex, startPosition);
      if (string4 && string4.length > 0) {
        startIndex += string4.length;
        result += string4;
      } else {
        break;
      }
    }
    if (startIndex > endIndex) {
      result = result.slice(0, length);
    }
  }
  return result ?? "";
}
__name(getText, "getText");
var Tree = class _Tree {
  static {
    __name(this, "Tree");
  }
  /** @internal */
  [0] = 0;
  // Internal handle for WASM
  /** @internal */
  textCallback;
  /** The language that was used to parse the syntax tree. */
  language;
  /** @internal */
  constructor(internal, address, language, textCallback) {
    assertInternal(internal);
    this[0] = address;
    this.language = language;
    this.textCallback = textCallback;
  }
  /** Create a shallow copy of the syntax tree. This is very fast. */
  copy() {
    const address = C._ts_tree_copy(this[0]);
    return new _Tree(INTERNAL, address, this.language, this.textCallback);
  }
  /** Delete the syntax tree, freeing its resources. */
  delete() {
    C._ts_tree_delete(this[0]);
    this[0] = 0;
  }
  /** Get the root node of the syntax tree. */
  get rootNode() {
    C._ts_tree_root_node_wasm(this[0]);
    return unmarshalNode(this);
  }
  /**
   * Get the root node of the syntax tree, but with its position shifted
   * forward by the given offset.
   */
  rootNodeWithOffset(offsetBytes, offsetExtent) {
    const address = TRANSFER_BUFFER + SIZE_OF_NODE;
    C.setValue(address, offsetBytes, "i32");
    marshalPoint(address + SIZE_OF_INT, offsetExtent);
    C._ts_tree_root_node_with_offset_wasm(this[0]);
    return unmarshalNode(this);
  }
  /**
   * Edit the syntax tree to keep it in sync with source code that has been
   * edited.
   *
   * You must describe the edit both in terms of byte offsets and in terms of
   * row/column coordinates.
   */
  edit(edit) {
    marshalEdit(edit);
    C._ts_tree_edit_wasm(this[0]);
  }
  /** Create a new {@link TreeCursor} starting from the root of the tree. */
  walk() {
    return this.rootNode.walk();
  }
  /**
   * Compare this old edited syntax tree to a new syntax tree representing
   * the same document, returning a sequence of ranges whose syntactic
   * structure has changed.
   *
   * For this to work correctly, this syntax tree must have been edited such
   * that its ranges match up to the new tree. Generally, you'll want to
   * call this method right after calling one of the [`Parser::parse`]
   * functions. Call it on the old tree that was passed to parse, and
   * pass the new tree that was returned from `parse`.
   */
  getChangedRanges(other) {
    if (!(other instanceof _Tree)) {
      throw new TypeError("Argument must be a Tree");
    }
    C._ts_tree_get_changed_ranges_wasm(this[0], other[0]);
    const count = C.getValue(TRANSFER_BUFFER, "i32");
    const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
    const result = new Array(count);
    if (count > 0) {
      let address = buffer;
      for (let i2 = 0; i2 < count; i2++) {
        result[i2] = unmarshalRange(address);
        address += SIZE_OF_RANGE;
      }
      C._free(buffer);
    }
    return result;
  }
  /** Get the included ranges that were used to parse the syntax tree. */
  getIncludedRanges() {
    C._ts_tree_included_ranges_wasm(this[0]);
    const count = C.getValue(TRANSFER_BUFFER, "i32");
    const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
    const result = new Array(count);
    if (count > 0) {
      let address = buffer;
      for (let i2 = 0; i2 < count; i2++) {
        result[i2] = unmarshalRange(address);
        address += SIZE_OF_RANGE;
      }
      C._free(buffer);
    }
    return result;
  }
};
var TreeCursor = class _TreeCursor {
  static {
    __name(this, "TreeCursor");
  }
  /** @internal */
  // @ts-expect-error: never read
  [0] = 0;
  // Internal handle for Wasm
  /** @internal */
  // @ts-expect-error: never read
  [1] = 0;
  // Internal handle for Wasm
  /** @internal */
  // @ts-expect-error: never read
  [2] = 0;
  // Internal handle for Wasm
  /** @internal */
  // @ts-expect-error: never read
  [3] = 0;
  // Internal handle for Wasm
  /** @internal */
  tree;
  /** @internal */
  constructor(internal, tree) {
    assertInternal(internal);
    this.tree = tree;
    unmarshalTreeCursor(this);
  }
  /** Creates a deep copy of the tree cursor. This allocates new memory. */
  copy() {
    const copy = new _TreeCursor(INTERNAL, this.tree);
    C._ts_tree_cursor_copy_wasm(this.tree[0]);
    unmarshalTreeCursor(copy);
    return copy;
  }
  /** Delete the tree cursor, freeing its resources. */
  delete() {
    marshalTreeCursor(this);
    C._ts_tree_cursor_delete_wasm(this.tree[0]);
    this[0] = this[1] = this[2] = 0;
  }
  /** Get the tree cursor's current {@link Node}. */
  get currentNode() {
    marshalTreeCursor(this);
    C._ts_tree_cursor_current_node_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /**
   * Get the numerical field id of this tree cursor's current node.
   *
   * See also {@link TreeCursor#currentFieldName}.
   */
  get currentFieldId() {
    marshalTreeCursor(this);
    return C._ts_tree_cursor_current_field_id_wasm(this.tree[0]);
  }
  /** Get the field name of this tree cursor's current node. */
  get currentFieldName() {
    return this.tree.language.fields[this.currentFieldId];
  }
  /**
   * Get the depth of the cursor's current node relative to the original
   * node that the cursor was constructed with.
   */
  get currentDepth() {
    marshalTreeCursor(this);
    return C._ts_tree_cursor_current_depth_wasm(this.tree[0]);
  }
  /**
   * Get the index of the cursor's current node out of all of the
   * descendants of the original node that the cursor was constructed with.
   */
  get currentDescendantIndex() {
    marshalTreeCursor(this);
    return C._ts_tree_cursor_current_descendant_index_wasm(this.tree[0]);
  }
  /** Get the type of the cursor's current node. */
  get nodeType() {
    return this.tree.language.types[this.nodeTypeId] || "ERROR";
  }
  /** Get the type id of the cursor's current node. */
  get nodeTypeId() {
    marshalTreeCursor(this);
    return C._ts_tree_cursor_current_node_type_id_wasm(this.tree[0]);
  }
  /** Get the state id of the cursor's current node. */
  get nodeStateId() {
    marshalTreeCursor(this);
    return C._ts_tree_cursor_current_node_state_id_wasm(this.tree[0]);
  }
  /** Get the id of the cursor's current node. */
  get nodeId() {
    marshalTreeCursor(this);
    return C._ts_tree_cursor_current_node_id_wasm(this.tree[0]);
  }
  /**
   * Check if the cursor's current node is *named*.
   *
   * Named nodes correspond to named rules in the grammar, whereas
   * *anonymous* nodes correspond to string literals in the grammar.
   */
  get nodeIsNamed() {
    marshalTreeCursor(this);
    return C._ts_tree_cursor_current_node_is_named_wasm(this.tree[0]) === 1;
  }
  /**
   * Check if the cursor's current node is *missing*.
   *
   * Missing nodes are inserted by the parser in order to recover from
   * certain kinds of syntax errors.
   */
  get nodeIsMissing() {
    marshalTreeCursor(this);
    return C._ts_tree_cursor_current_node_is_missing_wasm(this.tree[0]) === 1;
  }
  /** Get the string content of the cursor's current node. */
  get nodeText() {
    marshalTreeCursor(this);
    const startIndex = C._ts_tree_cursor_start_index_wasm(this.tree[0]);
    const endIndex = C._ts_tree_cursor_end_index_wasm(this.tree[0]);
    C._ts_tree_cursor_start_position_wasm(this.tree[0]);
    const startPosition = unmarshalPoint(TRANSFER_BUFFER);
    return getText(this.tree, startIndex, endIndex, startPosition);
  }
  /** Get the start position of the cursor's current node. */
  get startPosition() {
    marshalTreeCursor(this);
    C._ts_tree_cursor_start_position_wasm(this.tree[0]);
    return unmarshalPoint(TRANSFER_BUFFER);
  }
  /** Get the end position of the cursor's current node. */
  get endPosition() {
    marshalTreeCursor(this);
    C._ts_tree_cursor_end_position_wasm(this.tree[0]);
    return unmarshalPoint(TRANSFER_BUFFER);
  }
  /** Get the start index of the cursor's current node. */
  get startIndex() {
    marshalTreeCursor(this);
    return C._ts_tree_cursor_start_index_wasm(this.tree[0]);
  }
  /** Get the end index of the cursor's current node. */
  get endIndex() {
    marshalTreeCursor(this);
    return C._ts_tree_cursor_end_index_wasm(this.tree[0]);
  }
  /**
   * Move this cursor to the first child of its current node.
   *
   * This returns `true` if the cursor successfully moved, and returns
   * `false` if there were no children.
   */
  gotoFirstChild() {
    marshalTreeCursor(this);
    const result = C._ts_tree_cursor_goto_first_child_wasm(this.tree[0]);
    unmarshalTreeCursor(this);
    return result === 1;
  }
  /**
   * Move this cursor to the last child of its current node.
   *
   * This returns `true` if the cursor successfully moved, and returns
   * `false` if there were no children.
   *
   * Note that this function may be slower than
   * {@link TreeCursor#gotoFirstChild} because it needs to
   * iterate through all the children to compute the child's position.
   */
  gotoLastChild() {
    marshalTreeCursor(this);
    const result = C._ts_tree_cursor_goto_last_child_wasm(this.tree[0]);
    unmarshalTreeCursor(this);
    return result === 1;
  }
  /**
   * Move this cursor to the parent of its current node.
   *
   * This returns `true` if the cursor successfully moved, and returns
   * `false` if there was no parent node (the cursor was already on the
   * root node).
   *
   * Note that the node the cursor was constructed with is considered the root
   * of the cursor, and the cursor cannot walk outside this node.
   */
  gotoParent() {
    marshalTreeCursor(this);
    const result = C._ts_tree_cursor_goto_parent_wasm(this.tree[0]);
    unmarshalTreeCursor(this);
    return result === 1;
  }
  /**
   * Move this cursor to the next sibling of its current node.
   *
   * This returns `true` if the cursor successfully moved, and returns
   * `false` if there was no next sibling node.
   *
   * Note that the node the cursor was constructed with is considered the root
   * of the cursor, and the cursor cannot walk outside this node.
   */
  gotoNextSibling() {
    marshalTreeCursor(this);
    const result = C._ts_tree_cursor_goto_next_sibling_wasm(this.tree[0]);
    unmarshalTreeCursor(this);
    return result === 1;
  }
  /**
   * Move this cursor to the previous sibling of its current node.
   *
   * This returns `true` if the cursor successfully moved, and returns
   * `false` if there was no previous sibling node.
   *
   * Note that this function may be slower than
   * {@link TreeCursor#gotoNextSibling} due to how node
   * positions are stored. In the worst case, this will need to iterate
   * through all the children up to the previous sibling node to recalculate
   * its position. Also note that the node the cursor was constructed with is
   * considered the root of the cursor, and the cursor cannot walk outside this node.
   */
  gotoPreviousSibling() {
    marshalTreeCursor(this);
    const result = C._ts_tree_cursor_goto_previous_sibling_wasm(this.tree[0]);
    unmarshalTreeCursor(this);
    return result === 1;
  }
  /**
   * Move the cursor to the node that is the nth descendant of
   * the original node that the cursor was constructed with, where
   * zero represents the original node itself.
   */
  gotoDescendant(goalDescendantIndex) {
    marshalTreeCursor(this);
    C._ts_tree_cursor_goto_descendant_wasm(this.tree[0], goalDescendantIndex);
    unmarshalTreeCursor(this);
  }
  /**
   * Move this cursor to the first child of its current node that contains or
   * starts after the given byte offset.
   *
   * This returns `true` if the cursor successfully moved to a child node, and returns
   * `false` if no such child was found.
   */
  gotoFirstChildForIndex(goalIndex) {
    marshalTreeCursor(this);
    C.setValue(TRANSFER_BUFFER + SIZE_OF_CURSOR, goalIndex, "i32");
    const result = C._ts_tree_cursor_goto_first_child_for_index_wasm(this.tree[0]);
    unmarshalTreeCursor(this);
    return result === 1;
  }
  /**
   * Move this cursor to the first child of its current node that contains or
   * starts after the given byte offset.
   *
   * This returns the index of the child node if one was found, and returns
   * `null` if no such child was found.
   */
  gotoFirstChildForPosition(goalPosition) {
    marshalTreeCursor(this);
    marshalPoint(TRANSFER_BUFFER + SIZE_OF_CURSOR, goalPosition);
    const result = C._ts_tree_cursor_goto_first_child_for_position_wasm(this.tree[0]);
    unmarshalTreeCursor(this);
    return result === 1;
  }
  /**
   * Re-initialize this tree cursor to start at the original node that the
   * cursor was constructed with.
   */
  reset(node) {
    marshalNode(node);
    marshalTreeCursor(this, TRANSFER_BUFFER + SIZE_OF_NODE);
    C._ts_tree_cursor_reset_wasm(this.tree[0]);
    unmarshalTreeCursor(this);
  }
  /**
   * Re-initialize a tree cursor to the same position as another cursor.
   *
   * Unlike {@link TreeCursor#reset}, this will not lose parent
   * information and allows reusing already created cursors.
   */
  resetTo(cursor) {
    marshalTreeCursor(this, TRANSFER_BUFFER);
    marshalTreeCursor(cursor, TRANSFER_BUFFER + SIZE_OF_CURSOR);
    C._ts_tree_cursor_reset_to_wasm(this.tree[0], cursor.tree[0]);
    unmarshalTreeCursor(this);
  }
};
var Node = class {
  static {
    __name(this, "Node");
  }
  /** @internal */
  // @ts-expect-error: never read
  [0] = 0;
  // Internal handle for Wasm
  /** @internal */
  _children;
  /** @internal */
  _namedChildren;
  /** @internal */
  constructor(internal, {
    id,
    tree,
    startIndex,
    startPosition,
    other
  }) {
    assertInternal(internal);
    this[0] = other;
    this.id = id;
    this.tree = tree;
    this.startIndex = startIndex;
    this.startPosition = startPosition;
  }
  /**
   * The numeric id for this node that is unique.
   *
   * Within a given syntax tree, no two nodes have the same id. However:
   *
   * * If a new tree is created based on an older tree, and a node from the old tree is reused in
   *   the process, then that node will have the same id in both trees.
   *
   * * A node not marked as having changes does not guarantee it was reused.
   *
   * * If a node is marked as having changed in the old tree, it will not be reused.
   */
  id;
  /** The byte index where this node starts. */
  startIndex;
  /** The position where this node starts. */
  startPosition;
  /** The tree that this node belongs to. */
  tree;
  /** Get this node's type as a numerical id. */
  get typeId() {
    marshalNode(this);
    return C._ts_node_symbol_wasm(this.tree[0]);
  }
  /**
   * Get the node's type as a numerical id as it appears in the grammar,
   * ignoring aliases.
   */
  get grammarId() {
    marshalNode(this);
    return C._ts_node_grammar_symbol_wasm(this.tree[0]);
  }
  /** Get this node's type as a string. */
  get type() {
    return this.tree.language.types[this.typeId] || "ERROR";
  }
  /**
   * Get this node's symbol name as it appears in the grammar, ignoring
   * aliases as a string.
   */
  get grammarType() {
    return this.tree.language.types[this.grammarId] || "ERROR";
  }
  /**
   * Check if this node is *named*.
   *
   * Named nodes correspond to named rules in the grammar, whereas
   * *anonymous* nodes correspond to string literals in the grammar.
   */
  get isNamed() {
    marshalNode(this);
    return C._ts_node_is_named_wasm(this.tree[0]) === 1;
  }
  /**
   * Check if this node is *extra*.
   *
   * Extra nodes represent things like comments, which are not required
   * by the grammar, but can appear anywhere.
   */
  get isExtra() {
    marshalNode(this);
    return C._ts_node_is_extra_wasm(this.tree[0]) === 1;
  }
  /**
   * Check if this node represents a syntax error.
   *
   * Syntax errors represent parts of the code that could not be incorporated
   * into a valid syntax tree.
   */
  get isError() {
    marshalNode(this);
    return C._ts_node_is_error_wasm(this.tree[0]) === 1;
  }
  /**
   * Check if this node is *missing*.
   *
   * Missing nodes are inserted by the parser in order to recover from
   * certain kinds of syntax errors.
   */
  get isMissing() {
    marshalNode(this);
    return C._ts_node_is_missing_wasm(this.tree[0]) === 1;
  }
  /** Check if this node has been edited. */
  get hasChanges() {
    marshalNode(this);
    return C._ts_node_has_changes_wasm(this.tree[0]) === 1;
  }
  /**
   * Check if this node represents a syntax error or contains any syntax
   * errors anywhere within it.
   */
  get hasError() {
    marshalNode(this);
    return C._ts_node_has_error_wasm(this.tree[0]) === 1;
  }
  /** Get the byte index where this node ends. */
  get endIndex() {
    marshalNode(this);
    return C._ts_node_end_index_wasm(this.tree[0]);
  }
  /** Get the position where this node ends. */
  get endPosition() {
    marshalNode(this);
    C._ts_node_end_point_wasm(this.tree[0]);
    return unmarshalPoint(TRANSFER_BUFFER);
  }
  /** Get the string content of this node. */
  get text() {
    return getText(this.tree, this.startIndex, this.endIndex, this.startPosition);
  }
  /** Get this node's parse state. */
  get parseState() {
    marshalNode(this);
    return C._ts_node_parse_state_wasm(this.tree[0]);
  }
  /** Get the parse state after this node. */
  get nextParseState() {
    marshalNode(this);
    return C._ts_node_next_parse_state_wasm(this.tree[0]);
  }
  /** Check if this node is equal to another node. */
  equals(other) {
    return this.tree === other.tree && this.id === other.id;
  }
  /**
   * Get the node's child at the given index, where zero represents the first child.
   *
   * This method is fairly fast, but its cost is technically log(n), so if
   * you might be iterating over a long list of children, you should use
   * {@link Node#children} instead.
   */
  child(index) {
    marshalNode(this);
    C._ts_node_child_wasm(this.tree[0], index);
    return unmarshalNode(this.tree);
  }
  /**
   * Get this node's *named* child at the given index.
   *
   * See also {@link Node#isNamed}.
   * This method is fairly fast, but its cost is technically log(n), so if
   * you might be iterating over a long list of children, you should use
   * {@link Node#namedChildren} instead.
   */
  namedChild(index) {
    marshalNode(this);
    C._ts_node_named_child_wasm(this.tree[0], index);
    return unmarshalNode(this.tree);
  }
  /**
   * Get this node's child with the given numerical field id.
   *
   * See also {@link Node#childForFieldName}. You can
   * convert a field name to an id using {@link Language#fieldIdForName}.
   */
  childForFieldId(fieldId) {
    marshalNode(this);
    C._ts_node_child_by_field_id_wasm(this.tree[0], fieldId);
    return unmarshalNode(this.tree);
  }
  /**
   * Get the first child with the given field name.
   *
   * If multiple children may have the same field name, access them using
   * {@link Node#childrenForFieldName}.
   */
  childForFieldName(fieldName) {
    const fieldId = this.tree.language.fields.indexOf(fieldName);
    if (fieldId !== -1) return this.childForFieldId(fieldId);
    return null;
  }
  /** Get the field name of this node's child at the given index. */
  fieldNameForChild(index) {
    marshalNode(this);
    const address = C._ts_node_field_name_for_child_wasm(this.tree[0], index);
    if (!address) return null;
    return C.AsciiToString(address);
  }
  /** Get the field name of this node's named child at the given index. */
  fieldNameForNamedChild(index) {
    marshalNode(this);
    const address = C._ts_node_field_name_for_named_child_wasm(this.tree[0], index);
    if (!address) return null;
    return C.AsciiToString(address);
  }
  /**
   * Get an array of this node's children with a given field name.
   *
   * See also {@link Node#children}.
   */
  childrenForFieldName(fieldName) {
    const fieldId = this.tree.language.fields.indexOf(fieldName);
    if (fieldId !== -1 && fieldId !== 0) return this.childrenForFieldId(fieldId);
    return [];
  }
  /**
    * Get an array of this node's children with a given field id.
    *
    * See also {@link Node#childrenForFieldName}.
    */
  childrenForFieldId(fieldId) {
    marshalNode(this);
    C._ts_node_children_by_field_id_wasm(this.tree[0], fieldId);
    const count = C.getValue(TRANSFER_BUFFER, "i32");
    const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
    const result = new Array(count);
    if (count > 0) {
      let address = buffer;
      for (let i2 = 0; i2 < count; i2++) {
        result[i2] = unmarshalNode(this.tree, address);
        address += SIZE_OF_NODE;
      }
      C._free(buffer);
    }
    return result;
  }
  /** Get the node's first child that contains or starts after the given byte offset. */
  firstChildForIndex(index) {
    marshalNode(this);
    const address = TRANSFER_BUFFER + SIZE_OF_NODE;
    C.setValue(address, index, "i32");
    C._ts_node_first_child_for_byte_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /** Get the node's first named child that contains or starts after the given byte offset. */
  firstNamedChildForIndex(index) {
    marshalNode(this);
    const address = TRANSFER_BUFFER + SIZE_OF_NODE;
    C.setValue(address, index, "i32");
    C._ts_node_first_named_child_for_byte_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /** Get this node's number of children. */
  get childCount() {
    marshalNode(this);
    return C._ts_node_child_count_wasm(this.tree[0]);
  }
  /**
   * Get this node's number of *named* children.
   *
   * See also {@link Node#isNamed}.
   */
  get namedChildCount() {
    marshalNode(this);
    return C._ts_node_named_child_count_wasm(this.tree[0]);
  }
  /** Get this node's first child. */
  get firstChild() {
    return this.child(0);
  }
  /**
   * Get this node's first named child.
   *
   * See also {@link Node#isNamed}.
   */
  get firstNamedChild() {
    return this.namedChild(0);
  }
  /** Get this node's last child. */
  get lastChild() {
    return this.child(this.childCount - 1);
  }
  /**
   * Get this node's last named child.
   *
   * See also {@link Node#isNamed}.
   */
  get lastNamedChild() {
    return this.namedChild(this.namedChildCount - 1);
  }
  /**
   * Iterate over this node's children.
   *
   * If you're walking the tree recursively, you may want to use the
   * {@link TreeCursor} APIs directly instead.
   */
  get children() {
    if (!this._children) {
      marshalNode(this);
      C._ts_node_children_wasm(this.tree[0]);
      const count = C.getValue(TRANSFER_BUFFER, "i32");
      const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
      this._children = new Array(count);
      if (count > 0) {
        let address = buffer;
        for (let i2 = 0; i2 < count; i2++) {
          this._children[i2] = unmarshalNode(this.tree, address);
          address += SIZE_OF_NODE;
        }
        C._free(buffer);
      }
    }
    return this._children;
  }
  /**
   * Iterate over this node's named children.
   *
   * See also {@link Node#children}.
   */
  get namedChildren() {
    if (!this._namedChildren) {
      marshalNode(this);
      C._ts_node_named_children_wasm(this.tree[0]);
      const count = C.getValue(TRANSFER_BUFFER, "i32");
      const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
      this._namedChildren = new Array(count);
      if (count > 0) {
        let address = buffer;
        for (let i2 = 0; i2 < count; i2++) {
          this._namedChildren[i2] = unmarshalNode(this.tree, address);
          address += SIZE_OF_NODE;
        }
        C._free(buffer);
      }
    }
    return this._namedChildren;
  }
  /**
   * Get the descendants of this node that are the given type, or in the given types array.
   *
   * The types array should contain node type strings, which can be retrieved from {@link Language#types}.
   *
   * Additionally, a `startPosition` and `endPosition` can be passed in to restrict the search to a byte range.
   */
  descendantsOfType(types, startPosition = ZERO_POINT, endPosition = ZERO_POINT) {
    if (!Array.isArray(types)) types = [types];
    const symbols = [];
    const typesBySymbol = this.tree.language.types;
    for (const node_type of types) {
      if (node_type == "ERROR") {
        symbols.push(65535);
      }
    }
    for (let i2 = 0, n = typesBySymbol.length; i2 < n; i2++) {
      if (types.includes(typesBySymbol[i2])) {
        symbols.push(i2);
      }
    }
    const symbolsAddress = C._malloc(SIZE_OF_INT * symbols.length);
    for (let i2 = 0, n = symbols.length; i2 < n; i2++) {
      C.setValue(symbolsAddress + i2 * SIZE_OF_INT, symbols[i2], "i32");
    }
    marshalNode(this);
    C._ts_node_descendants_of_type_wasm(
      this.tree[0],
      symbolsAddress,
      symbols.length,
      startPosition.row,
      startPosition.column,
      endPosition.row,
      endPosition.column
    );
    const descendantCount = C.getValue(TRANSFER_BUFFER, "i32");
    const descendantAddress = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
    const result = new Array(descendantCount);
    if (descendantCount > 0) {
      let address = descendantAddress;
      for (let i2 = 0; i2 < descendantCount; i2++) {
        result[i2] = unmarshalNode(this.tree, address);
        address += SIZE_OF_NODE;
      }
    }
    C._free(descendantAddress);
    C._free(symbolsAddress);
    return result;
  }
  /** Get this node's next sibling. */
  get nextSibling() {
    marshalNode(this);
    C._ts_node_next_sibling_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /** Get this node's previous sibling. */
  get previousSibling() {
    marshalNode(this);
    C._ts_node_prev_sibling_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /**
   * Get this node's next *named* sibling.
   *
   * See also {@link Node#isNamed}.
   */
  get nextNamedSibling() {
    marshalNode(this);
    C._ts_node_next_named_sibling_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /**
   * Get this node's previous *named* sibling.
   *
   * See also {@link Node#isNamed}.
   */
  get previousNamedSibling() {
    marshalNode(this);
    C._ts_node_prev_named_sibling_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /** Get the node's number of descendants, including one for the node itself. */
  get descendantCount() {
    marshalNode(this);
    return C._ts_node_descendant_count_wasm(this.tree[0]);
  }
  /**
   * Get this node's immediate parent.
   * Prefer {@link Node#childWithDescendant} for iterating over this node's ancestors.
   */
  get parent() {
    marshalNode(this);
    C._ts_node_parent_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /**
   * Get the node that contains `descendant`.
   *
   * Note that this can return `descendant` itself.
   */
  childWithDescendant(descendant) {
    marshalNode(this);
    marshalNode(descendant, 1);
    C._ts_node_child_with_descendant_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /** Get the smallest node within this node that spans the given byte range. */
  descendantForIndex(start2, end = start2) {
    if (typeof start2 !== "number" || typeof end !== "number") {
      throw new Error("Arguments must be numbers");
    }
    marshalNode(this);
    const address = TRANSFER_BUFFER + SIZE_OF_NODE;
    C.setValue(address, start2, "i32");
    C.setValue(address + SIZE_OF_INT, end, "i32");
    C._ts_node_descendant_for_index_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /** Get the smallest named node within this node that spans the given byte range. */
  namedDescendantForIndex(start2, end = start2) {
    if (typeof start2 !== "number" || typeof end !== "number") {
      throw new Error("Arguments must be numbers");
    }
    marshalNode(this);
    const address = TRANSFER_BUFFER + SIZE_OF_NODE;
    C.setValue(address, start2, "i32");
    C.setValue(address + SIZE_OF_INT, end, "i32");
    C._ts_node_named_descendant_for_index_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /** Get the smallest node within this node that spans the given point range. */
  descendantForPosition(start2, end = start2) {
    if (!isPoint(start2) || !isPoint(end)) {
      throw new Error("Arguments must be {row, column} objects");
    }
    marshalNode(this);
    const address = TRANSFER_BUFFER + SIZE_OF_NODE;
    marshalPoint(address, start2);
    marshalPoint(address + SIZE_OF_POINT, end);
    C._ts_node_descendant_for_position_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /** Get the smallest named node within this node that spans the given point range. */
  namedDescendantForPosition(start2, end = start2) {
    if (!isPoint(start2) || !isPoint(end)) {
      throw new Error("Arguments must be {row, column} objects");
    }
    marshalNode(this);
    const address = TRANSFER_BUFFER + SIZE_OF_NODE;
    marshalPoint(address, start2);
    marshalPoint(address + SIZE_OF_POINT, end);
    C._ts_node_named_descendant_for_position_wasm(this.tree[0]);
    return unmarshalNode(this.tree);
  }
  /**
   * Create a new {@link TreeCursor} starting from this node.
   *
   * Note that the given node is considered the root of the cursor,
   * and the cursor cannot walk outside this node.
   */
  walk() {
    marshalNode(this);
    C._ts_tree_cursor_new_wasm(this.tree[0]);
    return new TreeCursor(INTERNAL, this.tree);
  }
  /**
   * Edit this node to keep it in-sync with source code that has been edited.
   *
   * This function is only rarely needed. When you edit a syntax tree with
   * the {@link Tree#edit} method, all of the nodes that you retrieve from
   * the tree afterward will already reflect the edit. You only need to
   * use {@link Node#edit} when you have a specific {@link Node} instance that
   * you want to keep and continue to use after an edit.
   */
  edit(edit) {
    if (this.startIndex >= edit.oldEndIndex) {
      this.startIndex = edit.newEndIndex + (this.startIndex - edit.oldEndIndex);
      let subbedPointRow;
      let subbedPointColumn;
      if (this.startPosition.row > edit.oldEndPosition.row) {
        subbedPointRow = this.startPosition.row - edit.oldEndPosition.row;
        subbedPointColumn = this.startPosition.column;
      } else {
        subbedPointRow = 0;
        subbedPointColumn = this.startPosition.column;
        if (this.startPosition.column >= edit.oldEndPosition.column) {
          subbedPointColumn = this.startPosition.column - edit.oldEndPosition.column;
        }
      }
      if (subbedPointRow > 0) {
        this.startPosition.row += subbedPointRow;
        this.startPosition.column = subbedPointColumn;
      } else {
        this.startPosition.column += subbedPointColumn;
      }
    } else if (this.startIndex > edit.startIndex) {
      this.startIndex = edit.newEndIndex;
      this.startPosition.row = edit.newEndPosition.row;
      this.startPosition.column = edit.newEndPosition.column;
    }
  }
  /** Get the S-expression representation of this node. */
  toString() {
    marshalNode(this);
    const address = C._ts_node_to_string_wasm(this.tree[0]);
    const result = C.AsciiToString(address);
    C._free(address);
    return result;
  }
};
function unmarshalCaptures(query, tree, address, patternIndex, result) {
  for (let i2 = 0, n = result.length; i2 < n; i2++) {
    const captureIndex = C.getValue(address, "i32");
    address += SIZE_OF_INT;
    const node = unmarshalNode(tree, address);
    address += SIZE_OF_NODE;
    result[i2] = { patternIndex, name: query.captureNames[captureIndex], node };
  }
  return address;
}
__name(unmarshalCaptures, "unmarshalCaptures");
function marshalNode(node, index = 0) {
  let address = TRANSFER_BUFFER + index * SIZE_OF_NODE;
  C.setValue(address, node.id, "i32");
  address += SIZE_OF_INT;
  C.setValue(address, node.startIndex, "i32");
  address += SIZE_OF_INT;
  C.setValue(address, node.startPosition.row, "i32");
  address += SIZE_OF_INT;
  C.setValue(address, node.startPosition.column, "i32");
  address += SIZE_OF_INT;
  C.setValue(address, node[0], "i32");
}
__name(marshalNode, "marshalNode");
function unmarshalNode(tree, address = TRANSFER_BUFFER) {
  const id = C.getValue(address, "i32");
  address += SIZE_OF_INT;
  if (id === 0) return null;
  const index = C.getValue(address, "i32");
  address += SIZE_OF_INT;
  const row = C.getValue(address, "i32");
  address += SIZE_OF_INT;
  const column = C.getValue(address, "i32");
  address += SIZE_OF_INT;
  const other = C.getValue(address, "i32");
  const result = new Node(INTERNAL, {
    id,
    tree,
    startIndex: index,
    startPosition: { row, column },
    other
  });
  return result;
}
__name(unmarshalNode, "unmarshalNode");
function marshalTreeCursor(cursor, address = TRANSFER_BUFFER) {
  C.setValue(address + 0 * SIZE_OF_INT, cursor[0], "i32");
  C.setValue(address + 1 * SIZE_OF_INT, cursor[1], "i32");
  C.setValue(address + 2 * SIZE_OF_INT, cursor[2], "i32");
  C.setValue(address + 3 * SIZE_OF_INT, cursor[3], "i32");
}
__name(marshalTreeCursor, "marshalTreeCursor");
function unmarshalTreeCursor(cursor) {
  cursor[0] = C.getValue(TRANSFER_BUFFER + 0 * SIZE_OF_INT, "i32");
  cursor[1] = C.getValue(TRANSFER_BUFFER + 1 * SIZE_OF_INT, "i32");
  cursor[2] = C.getValue(TRANSFER_BUFFER + 2 * SIZE_OF_INT, "i32");
  cursor[3] = C.getValue(TRANSFER_BUFFER + 3 * SIZE_OF_INT, "i32");
}
__name(unmarshalTreeCursor, "unmarshalTreeCursor");
function marshalPoint(address, point) {
  C.setValue(address, point.row, "i32");
  C.setValue(address + SIZE_OF_INT, point.column, "i32");
}
__name(marshalPoint, "marshalPoint");
function unmarshalPoint(address) {
  const result = {
    row: C.getValue(address, "i32") >>> 0,
    column: C.getValue(address + SIZE_OF_INT, "i32") >>> 0
  };
  return result;
}
__name(unmarshalPoint, "unmarshalPoint");
function marshalRange(address, range) {
  marshalPoint(address, range.startPosition);
  address += SIZE_OF_POINT;
  marshalPoint(address, range.endPosition);
  address += SIZE_OF_POINT;
  C.setValue(address, range.startIndex, "i32");
  address += SIZE_OF_INT;
  C.setValue(address, range.endIndex, "i32");
  address += SIZE_OF_INT;
}
__name(marshalRange, "marshalRange");
function unmarshalRange(address) {
  const result = {};
  result.startPosition = unmarshalPoint(address);
  address += SIZE_OF_POINT;
  result.endPosition = unmarshalPoint(address);
  address += SIZE_OF_POINT;
  result.startIndex = C.getValue(address, "i32") >>> 0;
  address += SIZE_OF_INT;
  result.endIndex = C.getValue(address, "i32") >>> 0;
  return result;
}
__name(unmarshalRange, "unmarshalRange");
function marshalEdit(edit, address = TRANSFER_BUFFER) {
  marshalPoint(address, edit.startPosition);
  address += SIZE_OF_POINT;
  marshalPoint(address, edit.oldEndPosition);
  address += SIZE_OF_POINT;
  marshalPoint(address, edit.newEndPosition);
  address += SIZE_OF_POINT;
  C.setValue(address, edit.startIndex, "i32");
  address += SIZE_OF_INT;
  C.setValue(address, edit.oldEndIndex, "i32");
  address += SIZE_OF_INT;
  C.setValue(address, edit.newEndIndex, "i32");
  address += SIZE_OF_INT;
}
__name(marshalEdit, "marshalEdit");
function unmarshalLanguageMetadata(address) {
  const major_version = C.getValue(address, "i32");
  const minor_version = C.getValue(address += SIZE_OF_INT, "i32");
  const patch_version = C.getValue(address += SIZE_OF_INT, "i32");
  return { major_version, minor_version, patch_version };
}
__name(unmarshalLanguageMetadata, "unmarshalLanguageMetadata");
var PREDICATE_STEP_TYPE_CAPTURE = 1;
var PREDICATE_STEP_TYPE_STRING = 2;
var QUERY_WORD_REGEX = /[\w-]+/g;
var CaptureQuantifier = {
  Zero: 0,
  ZeroOrOne: 1,
  ZeroOrMore: 2,
  One: 3,
  OneOrMore: 4
};
var isCaptureStep = /* @__PURE__ */ __name((step) => step.type === "capture", "isCaptureStep");
var isStringStep = /* @__PURE__ */ __name((step) => step.type === "string", "isStringStep");
var QueryErrorKind = {
  Syntax: 1,
  NodeName: 2,
  FieldName: 3,
  CaptureName: 4,
  PatternStructure: 5
};
var QueryError = class _QueryError extends Error {
  constructor(kind, info2, index, length) {
    super(_QueryError.formatMessage(kind, info2));
    this.kind = kind;
    this.info = info2;
    this.index = index;
    this.length = length;
    this.name = "QueryError";
  }
  static {
    __name(this, "QueryError");
  }
  /** Formats an error message based on the error kind and info */
  static formatMessage(kind, info2) {
    switch (kind) {
      case QueryErrorKind.NodeName:
        return `Bad node name '${info2.word}'`;
      case QueryErrorKind.FieldName:
        return `Bad field name '${info2.word}'`;
      case QueryErrorKind.CaptureName:
        return `Bad capture name @${info2.word}`;
      case QueryErrorKind.PatternStructure:
        return `Bad pattern structure at offset ${info2.suffix}`;
      case QueryErrorKind.Syntax:
        return `Bad syntax at offset ${info2.suffix}`;
    }
  }
};
function parseAnyPredicate(steps, index, operator, textPredicates) {
  if (steps.length !== 3) {
    throw new Error(
      `Wrong number of arguments to \`#${operator}\` predicate. Expected 2, got ${steps.length - 1}`
    );
  }
  if (!isCaptureStep(steps[1])) {
    throw new Error(
      `First argument of \`#${operator}\` predicate must be a capture. Got "${steps[1].value}"`
    );
  }
  const isPositive = operator === "eq?" || operator === "any-eq?";
  const matchAll = !operator.startsWith("any-");
  if (isCaptureStep(steps[2])) {
    const captureName1 = steps[1].name;
    const captureName2 = steps[2].name;
    textPredicates[index].push((captures) => {
      const nodes1 = [];
      const nodes2 = [];
      for (const c of captures) {
        if (c.name === captureName1) nodes1.push(c.node);
        if (c.name === captureName2) nodes2.push(c.node);
      }
      const compare = /* @__PURE__ */ __name((n1, n2, positive) => {
        return positive ? n1.text === n2.text : n1.text !== n2.text;
      }, "compare");
      return matchAll ? nodes1.every((n1) => nodes2.some((n2) => compare(n1, n2, isPositive))) : nodes1.some((n1) => nodes2.some((n2) => compare(n1, n2, isPositive)));
    });
  } else {
    const captureName = steps[1].name;
    const stringValue2 = steps[2].value;
    const matches2 = /* @__PURE__ */ __name((n) => n.text === stringValue2, "matches");
    const doesNotMatch = /* @__PURE__ */ __name((n) => n.text !== stringValue2, "doesNotMatch");
    textPredicates[index].push((captures) => {
      const nodes = [];
      for (const c of captures) {
        if (c.name === captureName) nodes.push(c.node);
      }
      const test = isPositive ? matches2 : doesNotMatch;
      return matchAll ? nodes.every(test) : nodes.some(test);
    });
  }
}
__name(parseAnyPredicate, "parseAnyPredicate");
function parseMatchPredicate(steps, index, operator, textPredicates) {
  if (steps.length !== 3) {
    throw new Error(
      `Wrong number of arguments to \`#${operator}\` predicate. Expected 2, got ${steps.length - 1}.`
    );
  }
  if (steps[1].type !== "capture") {
    throw new Error(
      `First argument of \`#${operator}\` predicate must be a capture. Got "${steps[1].value}".`
    );
  }
  if (steps[2].type !== "string") {
    throw new Error(
      `Second argument of \`#${operator}\` predicate must be a string. Got @${steps[2].name}.`
    );
  }
  const isPositive = operator === "match?" || operator === "any-match?";
  const matchAll = !operator.startsWith("any-");
  const captureName = steps[1].name;
  const regex = new RegExp(steps[2].value);
  textPredicates[index].push((captures) => {
    const nodes = [];
    for (const c of captures) {
      if (c.name === captureName) nodes.push(c.node.text);
    }
    const test = /* @__PURE__ */ __name((text, positive) => {
      return positive ? regex.test(text) : !regex.test(text);
    }, "test");
    if (nodes.length === 0) return !isPositive;
    return matchAll ? nodes.every((text) => test(text, isPositive)) : nodes.some((text) => test(text, isPositive));
  });
}
__name(parseMatchPredicate, "parseMatchPredicate");
function parseAnyOfPredicate(steps, index, operator, textPredicates) {
  if (steps.length < 2) {
    throw new Error(
      `Wrong number of arguments to \`#${operator}\` predicate. Expected at least 1. Got ${steps.length - 1}.`
    );
  }
  if (steps[1].type !== "capture") {
    throw new Error(
      `First argument of \`#${operator}\` predicate must be a capture. Got "${steps[1].value}".`
    );
  }
  const isPositive = operator === "any-of?";
  const captureName = steps[1].name;
  const stringSteps = steps.slice(2);
  if (!stringSteps.every(isStringStep)) {
    throw new Error(
      `Arguments to \`#${operator}\` predicate must be strings.".`
    );
  }
  const values = stringSteps.map((s) => s.value);
  textPredicates[index].push((captures) => {
    const nodes = [];
    for (const c of captures) {
      if (c.name === captureName) nodes.push(c.node.text);
    }
    if (nodes.length === 0) return !isPositive;
    return nodes.every((text) => values.includes(text)) === isPositive;
  });
}
__name(parseAnyOfPredicate, "parseAnyOfPredicate");
function parseIsPredicate(steps, index, operator, assertedProperties, refutedProperties) {
  if (steps.length < 2 || steps.length > 3) {
    throw new Error(
      `Wrong number of arguments to \`#${operator}\` predicate. Expected 1 or 2. Got ${steps.length - 1}.`
    );
  }
  if (!steps.every(isStringStep)) {
    throw new Error(
      `Arguments to \`#${operator}\` predicate must be strings.".`
    );
  }
  const properties = operator === "is?" ? assertedProperties : refutedProperties;
  if (!properties[index]) properties[index] = {};
  properties[index][steps[1].value] = steps[2]?.value ?? null;
}
__name(parseIsPredicate, "parseIsPredicate");
function parseSetDirective(steps, index, setProperties) {
  if (steps.length < 2 || steps.length > 3) {
    throw new Error(`Wrong number of arguments to \`#set!\` predicate. Expected 1 or 2. Got ${steps.length - 1}.`);
  }
  if (!steps.every(isStringStep)) {
    throw new Error(`Arguments to \`#set!\` predicate must be strings.".`);
  }
  if (!setProperties[index]) setProperties[index] = {};
  setProperties[index][steps[1].value] = steps[2]?.value ?? null;
}
__name(parseSetDirective, "parseSetDirective");
function parsePattern(index, stepType, stepValueId, captureNames, stringValues, steps, textPredicates, predicates, setProperties, assertedProperties, refutedProperties) {
  if (stepType === PREDICATE_STEP_TYPE_CAPTURE) {
    const name2 = captureNames[stepValueId];
    steps.push({ type: "capture", name: name2 });
  } else if (stepType === PREDICATE_STEP_TYPE_STRING) {
    steps.push({ type: "string", value: stringValues[stepValueId] });
  } else if (steps.length > 0) {
    if (steps[0].type !== "string") {
      throw new Error("Predicates must begin with a literal value");
    }
    const operator = steps[0].value;
    switch (operator) {
      case "any-not-eq?":
      case "not-eq?":
      case "any-eq?":
      case "eq?":
        parseAnyPredicate(steps, index, operator, textPredicates);
        break;
      case "any-not-match?":
      case "not-match?":
      case "any-match?":
      case "match?":
        parseMatchPredicate(steps, index, operator, textPredicates);
        break;
      case "not-any-of?":
      case "any-of?":
        parseAnyOfPredicate(steps, index, operator, textPredicates);
        break;
      case "is?":
      case "is-not?":
        parseIsPredicate(steps, index, operator, assertedProperties, refutedProperties);
        break;
      case "set!":
        parseSetDirective(steps, index, setProperties);
        break;
      default:
        predicates[index].push({ operator, operands: steps.slice(1) });
    }
    steps.length = 0;
  }
}
__name(parsePattern, "parsePattern");
var Query = class {
  static {
    __name(this, "Query");
  }
  /** @internal */
  [0] = 0;
  // Internal handle for WASM
  /** @internal */
  exceededMatchLimit;
  /** @internal */
  textPredicates;
  /** The names of the captures used in the query. */
  captureNames;
  /** The quantifiers of the captures used in the query. */
  captureQuantifiers;
  /**
   * The other user-defined predicates associated with the given index.
   *
   * This includes predicates with operators other than:
   * - `match?`
   * - `eq?` and `not-eq?`
   * - `any-of?` and `not-any-of?`
   * - `is?` and `is-not?`
   * - `set!`
   */
  predicates;
  /** The properties for predicates with the operator `set!`. */
  setProperties;
  /** The properties for predicates with the operator `is?`. */
  assertedProperties;
  /** The properties for predicates with the operator `is-not?`. */
  refutedProperties;
  /** The maximum number of in-progress matches for this cursor. */
  matchLimit;
  /**
   * Create a new query from a string containing one or more S-expression
   * patterns.
   *
   * The query is associated with a particular language, and can only be run
   * on syntax nodes parsed with that language. References to Queries can be
   * shared between multiple threads.
   *
   * @link {@see https://tree-sitter.github.io/tree-sitter/using-parsers/queries}
   */
  constructor(language, source) {
    const sourceLength = C.lengthBytesUTF8(source);
    const sourceAddress = C._malloc(sourceLength + 1);
    C.stringToUTF8(source, sourceAddress, sourceLength + 1);
    const address = C._ts_query_new(
      language[0],
      sourceAddress,
      sourceLength,
      TRANSFER_BUFFER,
      TRANSFER_BUFFER + SIZE_OF_INT
    );
    if (!address) {
      const errorId = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
      const errorByte = C.getValue(TRANSFER_BUFFER, "i32");
      const errorIndex = C.UTF8ToString(sourceAddress, errorByte).length;
      const suffix = source.slice(errorIndex, errorIndex + 100).split("\n")[0];
      const word = suffix.match(QUERY_WORD_REGEX)?.[0] ?? "";
      C._free(sourceAddress);
      switch (errorId) {
        case QueryErrorKind.Syntax:
          throw new QueryError(QueryErrorKind.Syntax, { suffix: `${errorIndex}: '${suffix}'...` }, errorIndex, 0);
        case QueryErrorKind.NodeName:
          throw new QueryError(errorId, { word }, errorIndex, word.length);
        case QueryErrorKind.FieldName:
          throw new QueryError(errorId, { word }, errorIndex, word.length);
        case QueryErrorKind.CaptureName:
          throw new QueryError(errorId, { word }, errorIndex, word.length);
        case QueryErrorKind.PatternStructure:
          throw new QueryError(errorId, { suffix: `${errorIndex}: '${suffix}'...` }, errorIndex, 0);
      }
    }
    const stringCount = C._ts_query_string_count(address);
    const captureCount = C._ts_query_capture_count(address);
    const patternCount = C._ts_query_pattern_count(address);
    const captureNames = new Array(captureCount);
    const captureQuantifiers = new Array(patternCount);
    const stringValues = new Array(stringCount);
    for (let i2 = 0; i2 < captureCount; i2++) {
      const nameAddress = C._ts_query_capture_name_for_id(
        address,
        i2,
        TRANSFER_BUFFER
      );
      const nameLength = C.getValue(TRANSFER_BUFFER, "i32");
      captureNames[i2] = C.UTF8ToString(nameAddress, nameLength);
    }
    for (let i2 = 0; i2 < patternCount; i2++) {
      const captureQuantifiersArray = new Array(captureCount);
      for (let j = 0; j < captureCount; j++) {
        const quantifier = C._ts_query_capture_quantifier_for_id(address, i2, j);
        captureQuantifiersArray[j] = quantifier;
      }
      captureQuantifiers[i2] = captureQuantifiersArray;
    }
    for (let i2 = 0; i2 < stringCount; i2++) {
      const valueAddress = C._ts_query_string_value_for_id(
        address,
        i2,
        TRANSFER_BUFFER
      );
      const nameLength = C.getValue(TRANSFER_BUFFER, "i32");
      stringValues[i2] = C.UTF8ToString(valueAddress, nameLength);
    }
    const setProperties = new Array(patternCount);
    const assertedProperties = new Array(patternCount);
    const refutedProperties = new Array(patternCount);
    const predicates = new Array(patternCount);
    const textPredicates = new Array(patternCount);
    for (let i2 = 0; i2 < patternCount; i2++) {
      const predicatesAddress = C._ts_query_predicates_for_pattern(address, i2, TRANSFER_BUFFER);
      const stepCount = C.getValue(TRANSFER_BUFFER, "i32");
      predicates[i2] = [];
      textPredicates[i2] = [];
      const steps = new Array();
      let stepAddress = predicatesAddress;
      for (let j = 0; j < stepCount; j++) {
        const stepType = C.getValue(stepAddress, "i32");
        stepAddress += SIZE_OF_INT;
        const stepValueId = C.getValue(stepAddress, "i32");
        stepAddress += SIZE_OF_INT;
        parsePattern(
          i2,
          stepType,
          stepValueId,
          captureNames,
          stringValues,
          steps,
          textPredicates,
          predicates,
          setProperties,
          assertedProperties,
          refutedProperties
        );
      }
      Object.freeze(textPredicates[i2]);
      Object.freeze(predicates[i2]);
      Object.freeze(setProperties[i2]);
      Object.freeze(assertedProperties[i2]);
      Object.freeze(refutedProperties[i2]);
    }
    C._free(sourceAddress);
    this[0] = address;
    this.captureNames = captureNames;
    this.captureQuantifiers = captureQuantifiers;
    this.textPredicates = textPredicates;
    this.predicates = predicates;
    this.setProperties = setProperties;
    this.assertedProperties = assertedProperties;
    this.refutedProperties = refutedProperties;
    this.exceededMatchLimit = false;
  }
  /** Delete the query, freeing its resources. */
  delete() {
    C._ts_query_delete(this[0]);
    this[0] = 0;
  }
  /**
   * Iterate over all of the matches in the order that they were found.
   *
   * Each match contains the index of the pattern that matched, and a list of
   * captures. Because multiple patterns can match the same set of nodes,
   * one match may contain captures that appear *before* some of the
   * captures from a previous match.
   *
   * @param {Node} node - The node to execute the query on.
   *
   * @param {QueryOptions} options - Options for query execution.
   */
  matches(node, options2 = {}) {
    const startPosition = options2.startPosition ?? ZERO_POINT;
    const endPosition = options2.endPosition ?? ZERO_POINT;
    const startIndex = options2.startIndex ?? 0;
    const endIndex = options2.endIndex ?? 0;
    const matchLimit = options2.matchLimit ?? 4294967295;
    const maxStartDepth = options2.maxStartDepth ?? 4294967295;
    const timeoutMicros = options2.timeoutMicros ?? 0;
    const progressCallback = options2.progressCallback;
    if (typeof matchLimit !== "number") {
      throw new Error("Arguments must be numbers");
    }
    this.matchLimit = matchLimit;
    if (endIndex !== 0 && startIndex > endIndex) {
      throw new Error("`startIndex` cannot be greater than `endIndex`");
    }
    if (endPosition !== ZERO_POINT && (startPosition.row > endPosition.row || startPosition.row === endPosition.row && startPosition.column > endPosition.column)) {
      throw new Error("`startPosition` cannot be greater than `endPosition`");
    }
    if (progressCallback) {
      C.currentQueryProgressCallback = progressCallback;
    }
    marshalNode(node);
    C._ts_query_matches_wasm(
      this[0],
      node.tree[0],
      startPosition.row,
      startPosition.column,
      endPosition.row,
      endPosition.column,
      startIndex,
      endIndex,
      matchLimit,
      maxStartDepth,
      timeoutMicros
    );
    const rawCount = C.getValue(TRANSFER_BUFFER, "i32");
    const startAddress = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
    const didExceedMatchLimit = C.getValue(TRANSFER_BUFFER + 2 * SIZE_OF_INT, "i32");
    const result = new Array(rawCount);
    this.exceededMatchLimit = Boolean(didExceedMatchLimit);
    let filteredCount = 0;
    let address = startAddress;
    for (let i2 = 0; i2 < rawCount; i2++) {
      const patternIndex = C.getValue(address, "i32");
      address += SIZE_OF_INT;
      const captureCount = C.getValue(address, "i32");
      address += SIZE_OF_INT;
      const captures = new Array(captureCount);
      address = unmarshalCaptures(this, node.tree, address, patternIndex, captures);
      if (this.textPredicates[patternIndex].every((p) => p(captures))) {
        result[filteredCount] = { pattern: patternIndex, patternIndex, captures };
        const setProperties = this.setProperties[patternIndex];
        result[filteredCount].setProperties = setProperties;
        const assertedProperties = this.assertedProperties[patternIndex];
        result[filteredCount].assertedProperties = assertedProperties;
        const refutedProperties = this.refutedProperties[patternIndex];
        result[filteredCount].refutedProperties = refutedProperties;
        filteredCount++;
      }
    }
    result.length = filteredCount;
    C._free(startAddress);
    C.currentQueryProgressCallback = null;
    return result;
  }
  /**
   * Iterate over all of the individual captures in the order that they
   * appear.
   *
   * This is useful if you don't care about which pattern matched, and just
   * want a single, ordered sequence of captures.
   *
   * @param {Node} node - The node to execute the query on.
   *
   * @param {QueryOptions} options - Options for query execution.
   */
  captures(node, options2 = {}) {
    const startPosition = options2.startPosition ?? ZERO_POINT;
    const endPosition = options2.endPosition ?? ZERO_POINT;
    const startIndex = options2.startIndex ?? 0;
    const endIndex = options2.endIndex ?? 0;
    const matchLimit = options2.matchLimit ?? 4294967295;
    const maxStartDepth = options2.maxStartDepth ?? 4294967295;
    const timeoutMicros = options2.timeoutMicros ?? 0;
    const progressCallback = options2.progressCallback;
    if (typeof matchLimit !== "number") {
      throw new Error("Arguments must be numbers");
    }
    this.matchLimit = matchLimit;
    if (endIndex !== 0 && startIndex > endIndex) {
      throw new Error("`startIndex` cannot be greater than `endIndex`");
    }
    if (endPosition !== ZERO_POINT && (startPosition.row > endPosition.row || startPosition.row === endPosition.row && startPosition.column > endPosition.column)) {
      throw new Error("`startPosition` cannot be greater than `endPosition`");
    }
    if (progressCallback) {
      C.currentQueryProgressCallback = progressCallback;
    }
    marshalNode(node);
    C._ts_query_captures_wasm(
      this[0],
      node.tree[0],
      startPosition.row,
      startPosition.column,
      endPosition.row,
      endPosition.column,
      startIndex,
      endIndex,
      matchLimit,
      maxStartDepth,
      timeoutMicros
    );
    const count = C.getValue(TRANSFER_BUFFER, "i32");
    const startAddress = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
    const didExceedMatchLimit = C.getValue(TRANSFER_BUFFER + 2 * SIZE_OF_INT, "i32");
    const result = new Array();
    this.exceededMatchLimit = Boolean(didExceedMatchLimit);
    const captures = new Array();
    let address = startAddress;
    for (let i2 = 0; i2 < count; i2++) {
      const patternIndex = C.getValue(address, "i32");
      address += SIZE_OF_INT;
      const captureCount = C.getValue(address, "i32");
      address += SIZE_OF_INT;
      const captureIndex = C.getValue(address, "i32");
      address += SIZE_OF_INT;
      captures.length = captureCount;
      address = unmarshalCaptures(this, node.tree, address, patternIndex, captures);
      if (this.textPredicates[patternIndex].every((p) => p(captures))) {
        const capture = captures[captureIndex];
        const setProperties = this.setProperties[patternIndex];
        capture.setProperties = setProperties;
        const assertedProperties = this.assertedProperties[patternIndex];
        capture.assertedProperties = assertedProperties;
        const refutedProperties = this.refutedProperties[patternIndex];
        capture.refutedProperties = refutedProperties;
        result.push(capture);
      }
    }
    C._free(startAddress);
    C.currentQueryProgressCallback = null;
    return result;
  }
  /** Get the predicates for a given pattern. */
  predicatesForPattern(patternIndex) {
    return this.predicates[patternIndex];
  }
  /**
   * Disable a certain capture within a query.
   *
   * This prevents the capture from being returned in matches, and also
   * avoids any resource usage associated with recording the capture.
   */
  disableCapture(captureName) {
    const captureNameLength = C.lengthBytesUTF8(captureName);
    const captureNameAddress = C._malloc(captureNameLength + 1);
    C.stringToUTF8(captureName, captureNameAddress, captureNameLength + 1);
    C._ts_query_disable_capture(this[0], captureNameAddress, captureNameLength);
    C._free(captureNameAddress);
  }
  /**
   * Disable a certain pattern within a query.
   *
   * This prevents the pattern from matching, and also avoids any resource
   * usage associated with the pattern. This throws an error if the pattern
   * index is out of bounds.
   */
  disablePattern(patternIndex) {
    if (patternIndex >= this.predicates.length) {
      throw new Error(
        `Pattern index is ${patternIndex} but the pattern count is ${this.predicates.length}`
      );
    }
    C._ts_query_disable_pattern(this[0], patternIndex);
  }
  /**
   * Check if, on its last execution, this cursor exceeded its maximum number
   * of in-progress matches.
   */
  didExceedMatchLimit() {
    return this.exceededMatchLimit;
  }
  /** Get the byte offset where the given pattern starts in the query's source. */
  startIndexForPattern(patternIndex) {
    if (patternIndex >= this.predicates.length) {
      throw new Error(
        `Pattern index is ${patternIndex} but the pattern count is ${this.predicates.length}`
      );
    }
    return C._ts_query_start_byte_for_pattern(this[0], patternIndex);
  }
  /** Get the byte offset where the given pattern ends in the query's source. */
  endIndexForPattern(patternIndex) {
    if (patternIndex >= this.predicates.length) {
      throw new Error(
        `Pattern index is ${patternIndex} but the pattern count is ${this.predicates.length}`
      );
    }
    return C._ts_query_end_byte_for_pattern(this[0], patternIndex);
  }
  /** Get the number of patterns in the query. */
  patternCount() {
    return C._ts_query_pattern_count(this[0]);
  }
  /** Get the index for a given capture name. */
  captureIndexForName(captureName) {
    return this.captureNames.indexOf(captureName);
  }
  /** Check if a given pattern within a query has a single root node. */
  isPatternRooted(patternIndex) {
    return C._ts_query_is_pattern_rooted(this[0], patternIndex) === 1;
  }
  /** Check if a given pattern within a query has a single root node. */
  isPatternNonLocal(patternIndex) {
    return C._ts_query_is_pattern_non_local(this[0], patternIndex) === 1;
  }
  /**
   * Check if a given step in a query is 'definite'.
   *
   * A query step is 'definite' if its parent pattern will be guaranteed to
   * match successfully once it reaches the step.
   */
  isPatternGuaranteedAtStep(byteIndex) {
    return C._ts_query_is_pattern_guaranteed_at_step(this[0], byteIndex) === 1;
  }
};
var LANGUAGE_FUNCTION_REGEX = /^tree_sitter_\w+$/;
var Language = class _Language {
  static {
    __name(this, "Language");
  }
  /** @internal */
  [0] = 0;
  // Internal handle for WASM
  /**
   * A list of all node types in the language. The index of each type in this
   * array is its node type id.
   */
  types;
  /**
   * A list of all field names in the language. The index of each field name in
   * this array is its field id.
   */
  fields;
  /** @internal */
  constructor(internal, address) {
    assertInternal(internal);
    this[0] = address;
    this.types = new Array(C._ts_language_symbol_count(this[0]));
    for (let i2 = 0, n = this.types.length; i2 < n; i2++) {
      if (C._ts_language_symbol_type(this[0], i2) < 2) {
        this.types[i2] = C.UTF8ToString(C._ts_language_symbol_name(this[0], i2));
      }
    }
    this.fields = new Array(C._ts_language_field_count(this[0]) + 1);
    for (let i2 = 0, n = this.fields.length; i2 < n; i2++) {
      const fieldName = C._ts_language_field_name_for_id(this[0], i2);
      if (fieldName !== 0) {
        this.fields[i2] = C.UTF8ToString(fieldName);
      } else {
        this.fields[i2] = null;
      }
    }
  }
  /**
   * Gets the name of the language.
   */
  get name() {
    const ptr = C._ts_language_name(this[0]);
    if (ptr === 0) return null;
    return C.UTF8ToString(ptr);
  }
  /**
   * @deprecated since version 0.25.0, use {@link Language#abiVersion} instead
   * Gets the version of the language.
   */
  get version() {
    return C._ts_language_version(this[0]);
  }
  /**
   * Gets the ABI version of the language.
   */
  get abiVersion() {
    return C._ts_language_abi_version(this[0]);
  }
  /**
  * Get the metadata for this language. This information is generated by the
  * CLI, and relies on the language author providing the correct metadata in
  * the language's `tree-sitter.json` file.
  */
  get metadata() {
    C._ts_language_metadata(this[0]);
    const length = C.getValue(TRANSFER_BUFFER, "i32");
    const address = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
    if (length === 0) return null;
    return unmarshalLanguageMetadata(address);
  }
  /**
   * Gets the number of fields in the language.
   */
  get fieldCount() {
    return this.fields.length - 1;
  }
  /**
   * Gets the number of states in the language.
   */
  get stateCount() {
    return C._ts_language_state_count(this[0]);
  }
  /**
   * Get the field id for a field name.
   */
  fieldIdForName(fieldName) {
    const result = this.fields.indexOf(fieldName);
    return result !== -1 ? result : null;
  }
  /**
   * Get the field name for a field id.
   */
  fieldNameForId(fieldId) {
    return this.fields[fieldId] ?? null;
  }
  /**
   * Get the node type id for a node type name.
   */
  idForNodeType(type, named) {
    const typeLength = C.lengthBytesUTF8(type);
    const typeAddress = C._malloc(typeLength + 1);
    C.stringToUTF8(type, typeAddress, typeLength + 1);
    const result = C._ts_language_symbol_for_name(this[0], typeAddress, typeLength, named ? 1 : 0);
    C._free(typeAddress);
    return result || null;
  }
  /**
   * Gets the number of node types in the language.
   */
  get nodeTypeCount() {
    return C._ts_language_symbol_count(this[0]);
  }
  /**
   * Get the node type name for a node type id.
   */
  nodeTypeForId(typeId) {
    const name2 = C._ts_language_symbol_name(this[0], typeId);
    return name2 ? C.UTF8ToString(name2) : null;
  }
  /**
   * Check if a node type is named.
   *
   * @see {@link https://tree-sitter.github.io/tree-sitter/using-parsers/2-basic-parsing.html#named-vs-anonymous-nodes}
   */
  nodeTypeIsNamed(typeId) {
    return C._ts_language_type_is_named_wasm(this[0], typeId) ? true : false;
  }
  /**
   * Check if a node type is visible.
   */
  nodeTypeIsVisible(typeId) {
    return C._ts_language_type_is_visible_wasm(this[0], typeId) ? true : false;
  }
  /**
   * Get the supertypes ids of this language.
   *
   * @see {@link https://tree-sitter.github.io/tree-sitter/using-parsers/6-static-node-types.html?highlight=supertype#supertype-nodes}
   */
  get supertypes() {
    C._ts_language_supertypes_wasm(this[0]);
    const count = C.getValue(TRANSFER_BUFFER, "i32");
    const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
    const result = new Array(count);
    if (count > 0) {
      let address = buffer;
      for (let i2 = 0; i2 < count; i2++) {
        result[i2] = C.getValue(address, "i16");
        address += SIZE_OF_SHORT;
      }
    }
    return result;
  }
  /**
   * Get the subtype ids for a given supertype node id.
   */
  subtypes(supertype) {
    C._ts_language_subtypes_wasm(this[0], supertype);
    const count = C.getValue(TRANSFER_BUFFER, "i32");
    const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
    const result = new Array(count);
    if (count > 0) {
      let address = buffer;
      for (let i2 = 0; i2 < count; i2++) {
        result[i2] = C.getValue(address, "i16");
        address += SIZE_OF_SHORT;
      }
    }
    return result;
  }
  /**
   * Get the next state id for a given state id and node type id.
   */
  nextState(stateId, typeId) {
    return C._ts_language_next_state(this[0], stateId, typeId);
  }
  /**
   * Create a new lookahead iterator for this language and parse state.
   *
   * This returns `null` if state is invalid for this language.
   *
   * Iterating {@link LookaheadIterator} will yield valid symbols in the given
   * parse state. Newly created lookahead iterators will return the `ERROR`
   * symbol from {@link LookaheadIterator#currentType}.
   *
   * Lookahead iterators can be useful for generating suggestions and improving
   * syntax error diagnostics. To get symbols valid in an `ERROR` node, use the
   * lookahead iterator on its first leaf node state. For `MISSING` nodes, a
   * lookahead iterator created on the previous non-extra leaf node may be
   * appropriate.
   */
  lookaheadIterator(stateId) {
    const address = C._ts_lookahead_iterator_new(this[0], stateId);
    if (address) return new LookaheadIterator(INTERNAL, address, this);
    return null;
  }
  /**
   * @deprecated since version 0.25.0, call `new` on a {@link Query} instead
   *
   * Create a new query from a string containing one or more S-expression
   * patterns.
   *
   * The query is associated with a particular language, and can only be run
   * on syntax nodes parsed with that language. References to Queries can be
   * shared between multiple threads.
   *
   * @link {@see https://tree-sitter.github.io/tree-sitter/using-parsers/queries}
   */
  query(source) {
    console.warn("Language.query is deprecated. Use new Query(language, source) instead.");
    return new Query(this, source);
  }
  /**
   * Load a language from a WebAssembly module.
   * The module can be provided as a path to a file or as a buffer.
   */
  static async load(input) {
    let bytes;
    if (input instanceof Uint8Array) {
      bytes = Promise.resolve(input);
    } else {
      if (globalThis.process?.versions.node) {
        const fs2 = await import("fs/promises");
        bytes = fs2.readFile(input);
      } else {
        bytes = fetch(input).then((response) => response.arrayBuffer().then((buffer) => {
          if (response.ok) {
            return new Uint8Array(buffer);
          } else {
            const body2 = new TextDecoder("utf-8").decode(buffer);
            throw new Error(`Language.load failed with status ${response.status}.

${body2}`);
          }
        }));
      }
    }
    const mod = await C.loadWebAssemblyModule(await bytes, { loadAsync: true });
    const symbolNames = Object.keys(mod);
    const functionName = symbolNames.find((key) => LANGUAGE_FUNCTION_REGEX.test(key) && !key.includes("external_scanner_"));
    if (!functionName) {
      console.log(`Couldn't find language function in WASM file. Symbols:
${JSON.stringify(symbolNames, null, 2)}`);
      throw new Error("Language.load failed: no language function found in WASM file");
    }
    const languageAddress = mod[functionName]();
    return new _Language(INTERNAL, languageAddress);
  }
};
var Module2 = /* @__PURE__ */ (() => {
  var _scriptName = importMetaUrl;
  return async function(moduleArg = {}) {
    var moduleRtn;
    var Module = moduleArg;
    var readyPromiseResolve, readyPromiseReject;
    var readyPromise = new Promise((resolve7, reject) => {
      readyPromiseResolve = resolve7;
      readyPromiseReject = reject;
    });
    var ENVIRONMENT_IS_WEB = typeof window == "object";
    var ENVIRONMENT_IS_WORKER = typeof WorkerGlobalScope != "undefined";
    var ENVIRONMENT_IS_NODE = typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string" && process.type != "renderer";
    var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
    if (ENVIRONMENT_IS_NODE) {
      const { createRequire } = await import("module");
      var require = createRequire(importMetaUrl);
    }
    Module.currentQueryProgressCallback = null;
    Module.currentProgressCallback = null;
    Module.currentLogCallback = null;
    Module.currentParseCallback = null;
    var moduleOverrides = Object.assign({}, Module);
    var arguments_ = [];
    var thisProgram = "./this.program";
    var quit_ = /* @__PURE__ */ __name((status, toThrow) => {
      throw toThrow;
    }, "quit_");
    var scriptDirectory = "";
    function locateFile(path15) {
      if (Module["locateFile"]) {
        return Module["locateFile"](path15, scriptDirectory);
      }
      return scriptDirectory + path15;
    }
    __name(locateFile, "locateFile");
    var readAsync, readBinary;
    if (ENVIRONMENT_IS_NODE) {
      var fs = require("fs");
      var nodePath = require("path");
      if (!importMetaUrl.startsWith("data:")) {
        scriptDirectory = nodePath.dirname(require("url").fileURLToPath(importMetaUrl)) + "/";
      }
      readBinary = /* @__PURE__ */ __name((filename) => {
        filename = isFileURI(filename) ? new URL(filename) : filename;
        var ret = fs.readFileSync(filename);
        return ret;
      }, "readBinary");
      readAsync = /* @__PURE__ */ __name(async (filename, binary2 = true) => {
        filename = isFileURI(filename) ? new URL(filename) : filename;
        var ret = fs.readFileSync(filename, binary2 ? void 0 : "utf8");
        return ret;
      }, "readAsync");
      if (!Module["thisProgram"] && process.argv.length > 1) {
        thisProgram = process.argv[1].replace(/\\/g, "/");
      }
      arguments_ = process.argv.slice(2);
      quit_ = /* @__PURE__ */ __name((status, toThrow) => {
        process.exitCode = status;
        throw toThrow;
      }, "quit_");
    } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
      if (ENVIRONMENT_IS_WORKER) {
        scriptDirectory = self.location.href;
      } else if (typeof document != "undefined" && document.currentScript) {
        scriptDirectory = document.currentScript.src;
      }
      if (_scriptName) {
        scriptDirectory = _scriptName;
      }
      if (scriptDirectory.startsWith("blob:")) {
        scriptDirectory = "";
      } else {
        scriptDirectory = scriptDirectory.slice(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1);
      }
      {
        if (ENVIRONMENT_IS_WORKER) {
          readBinary = /* @__PURE__ */ __name((url) => {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, false);
            xhr.responseType = "arraybuffer";
            xhr.send(null);
            return new Uint8Array(
              /** @type{!ArrayBuffer} */
              xhr.response
            );
          }, "readBinary");
        }
        readAsync = /* @__PURE__ */ __name(async (url) => {
          if (isFileURI(url)) {
            return new Promise((resolve7, reject) => {
              var xhr = new XMLHttpRequest();
              xhr.open("GET", url, true);
              xhr.responseType = "arraybuffer";
              xhr.onload = () => {
                if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
                  resolve7(xhr.response);
                  return;
                }
                reject(xhr.status);
              };
              xhr.onerror = reject;
              xhr.send(null);
            });
          }
          var response = await fetch(url, {
            credentials: "same-origin"
          });
          if (response.ok) {
            return response.arrayBuffer();
          }
          throw new Error(response.status + " : " + response.url);
        }, "readAsync");
      }
    } else {
    }
    var out = Module["print"] || console.log.bind(console);
    var err = Module["printErr"] || console.error.bind(console);
    Object.assign(Module, moduleOverrides);
    moduleOverrides = null;
    if (Module["arguments"]) arguments_ = Module["arguments"];
    if (Module["thisProgram"]) thisProgram = Module["thisProgram"];
    var dynamicLibraries = Module["dynamicLibraries"] || [];
    var wasmBinary = Module["wasmBinary"];
    var wasmMemory;
    var ABORT = false;
    var EXITSTATUS;
    function assert(condition, text) {
      if (!condition) {
        abort(text);
      }
    }
    __name(assert, "assert");
    var HEAP, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAP64, HEAPU64, HEAPF64;
    var HEAP_DATA_VIEW;
    var runtimeInitialized = false;
    var isFileURI = /* @__PURE__ */ __name((filename) => filename.startsWith("file://"), "isFileURI");
    function updateMemoryViews() {
      var b = wasmMemory.buffer;
      Module["HEAP_DATA_VIEW"] = HEAP_DATA_VIEW = new DataView(b);
      Module["HEAP8"] = HEAP8 = new Int8Array(b);
      Module["HEAP16"] = HEAP16 = new Int16Array(b);
      Module["HEAPU8"] = HEAPU8 = new Uint8Array(b);
      Module["HEAPU16"] = HEAPU16 = new Uint16Array(b);
      Module["HEAP32"] = HEAP32 = new Int32Array(b);
      Module["HEAPU32"] = HEAPU32 = new Uint32Array(b);
      Module["HEAPF32"] = HEAPF32 = new Float32Array(b);
      Module["HEAPF64"] = HEAPF64 = new Float64Array(b);
      Module["HEAP64"] = HEAP64 = new BigInt64Array(b);
      Module["HEAPU64"] = HEAPU64 = new BigUint64Array(b);
    }
    __name(updateMemoryViews, "updateMemoryViews");
    if (Module["wasmMemory"]) {
      wasmMemory = Module["wasmMemory"];
    } else {
      var INITIAL_MEMORY = Module["INITIAL_MEMORY"] || 33554432;
      wasmMemory = new WebAssembly.Memory({
        "initial": INITIAL_MEMORY / 65536,
        // In theory we should not need to emit the maximum if we want "unlimited"
        // or 4GB of memory, but VMs error on that atm, see
        // https://github.com/emscripten-core/emscripten/issues/14130
        // And in the pthreads case we definitely need to emit a maximum. So
        // always emit one.
        "maximum": 32768
      });
    }
    updateMemoryViews();
    var __RELOC_FUNCS__ = [];
    function preRun() {
      if (Module["preRun"]) {
        if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]];
        while (Module["preRun"].length) {
          addOnPreRun(Module["preRun"].shift());
        }
      }
      callRuntimeCallbacks(onPreRuns);
    }
    __name(preRun, "preRun");
    function initRuntime() {
      runtimeInitialized = true;
      callRuntimeCallbacks(__RELOC_FUNCS__);
      wasmExports["__wasm_call_ctors"]();
      callRuntimeCallbacks(onPostCtors);
    }
    __name(initRuntime, "initRuntime");
    function preMain() {
    }
    __name(preMain, "preMain");
    function postRun() {
      if (Module["postRun"]) {
        if (typeof Module["postRun"] == "function") Module["postRun"] = [Module["postRun"]];
        while (Module["postRun"].length) {
          addOnPostRun(Module["postRun"].shift());
        }
      }
      callRuntimeCallbacks(onPostRuns);
    }
    __name(postRun, "postRun");
    var runDependencies = 0;
    var dependenciesFulfilled = null;
    function getUniqueRunDependency(id) {
      return id;
    }
    __name(getUniqueRunDependency, "getUniqueRunDependency");
    function addRunDependency(id) {
      runDependencies++;
      Module["monitorRunDependencies"]?.(runDependencies);
    }
    __name(addRunDependency, "addRunDependency");
    function removeRunDependency(id) {
      runDependencies--;
      Module["monitorRunDependencies"]?.(runDependencies);
      if (runDependencies == 0) {
        if (dependenciesFulfilled) {
          var callback = dependenciesFulfilled;
          dependenciesFulfilled = null;
          callback();
        }
      }
    }
    __name(removeRunDependency, "removeRunDependency");
    function abort(what) {
      Module["onAbort"]?.(what);
      what = "Aborted(" + what + ")";
      err(what);
      ABORT = true;
      what += ". Build with -sASSERTIONS for more info.";
      var e = new WebAssembly.RuntimeError(what);
      readyPromiseReject(e);
      throw e;
    }
    __name(abort, "abort");
    var wasmBinaryFile;
    function findWasmBinary() {
      if (Module["locateFile"]) {
        return locateFile("tree-sitter.wasm");
      }
      return new URL("tree-sitter.wasm", importMetaUrl).href;
    }
    __name(findWasmBinary, "findWasmBinary");
    function getBinarySync(file) {
      if (file == wasmBinaryFile && wasmBinary) {
        return new Uint8Array(wasmBinary);
      }
      if (readBinary) {
        return readBinary(file);
      }
      throw "both async and sync fetching of the wasm failed";
    }
    __name(getBinarySync, "getBinarySync");
    async function getWasmBinary(binaryFile) {
      if (!wasmBinary) {
        try {
          var response = await readAsync(binaryFile);
          return new Uint8Array(response);
        } catch {
        }
      }
      return getBinarySync(binaryFile);
    }
    __name(getWasmBinary, "getWasmBinary");
    async function instantiateArrayBuffer(binaryFile, imports) {
      try {
        var binary2 = await getWasmBinary(binaryFile);
        var instance2 = await WebAssembly.instantiate(binary2, imports);
        return instance2;
      } catch (reason) {
        err(`failed to asynchronously prepare wasm: ${reason}`);
        abort(reason);
      }
    }
    __name(instantiateArrayBuffer, "instantiateArrayBuffer");
    async function instantiateAsync(binary2, binaryFile, imports) {
      if (!binary2 && typeof WebAssembly.instantiateStreaming == "function" && !isFileURI(binaryFile) && !ENVIRONMENT_IS_NODE) {
        try {
          var response = fetch(binaryFile, {
            credentials: "same-origin"
          });
          var instantiationResult = await WebAssembly.instantiateStreaming(response, imports);
          return instantiationResult;
        } catch (reason) {
          err(`wasm streaming compile failed: ${reason}`);
          err("falling back to ArrayBuffer instantiation");
        }
      }
      return instantiateArrayBuffer(binaryFile, imports);
    }
    __name(instantiateAsync, "instantiateAsync");
    function getWasmImports() {
      return {
        "env": wasmImports,
        "wasi_snapshot_preview1": wasmImports,
        "GOT.mem": new Proxy(wasmImports, GOTHandler),
        "GOT.func": new Proxy(wasmImports, GOTHandler)
      };
    }
    __name(getWasmImports, "getWasmImports");
    async function createWasm() {
      function receiveInstance(instance2, module2) {
        wasmExports = instance2.exports;
        wasmExports = relocateExports(wasmExports, 1024);
        var metadata2 = getDylinkMetadata(module2);
        if (metadata2.neededDynlibs) {
          dynamicLibraries = metadata2.neededDynlibs.concat(dynamicLibraries);
        }
        mergeLibSymbols(wasmExports, "main");
        LDSO.init();
        loadDylibs();
        __RELOC_FUNCS__.push(wasmExports["__wasm_apply_data_relocs"]);
        removeRunDependency("wasm-instantiate");
        return wasmExports;
      }
      __name(receiveInstance, "receiveInstance");
      addRunDependency("wasm-instantiate");
      function receiveInstantiationResult(result2) {
        return receiveInstance(result2["instance"], result2["module"]);
      }
      __name(receiveInstantiationResult, "receiveInstantiationResult");
      var info2 = getWasmImports();
      if (Module["instantiateWasm"]) {
        return new Promise((resolve7, reject) => {
          Module["instantiateWasm"](info2, (mod, inst) => {
            receiveInstance(mod, inst);
            resolve7(mod.exports);
          });
        });
      }
      wasmBinaryFile ??= findWasmBinary();
      try {
        var result = await instantiateAsync(wasmBinary, wasmBinaryFile, info2);
        var exports2 = receiveInstantiationResult(result);
        return exports2;
      } catch (e) {
        readyPromiseReject(e);
        return Promise.reject(e);
      }
    }
    __name(createWasm, "createWasm");
    var ASM_CONSTS = {};
    class ExitStatus {
      static {
        __name(this, "ExitStatus");
      }
      name = "ExitStatus";
      constructor(status) {
        this.message = `Program terminated with exit(${status})`;
        this.status = status;
      }
    }
    var GOT = {};
    var currentModuleWeakSymbols = /* @__PURE__ */ new Set([]);
    var GOTHandler = {
      get(obj, symName) {
        var rtn = GOT[symName];
        if (!rtn) {
          rtn = GOT[symName] = new WebAssembly.Global({
            "value": "i32",
            "mutable": true
          });
        }
        if (!currentModuleWeakSymbols.has(symName)) {
          rtn.required = true;
        }
        return rtn;
      }
    };
    var LE_HEAP_LOAD_F32 = /* @__PURE__ */ __name((byteOffset) => HEAP_DATA_VIEW.getFloat32(byteOffset, true), "LE_HEAP_LOAD_F32");
    var LE_HEAP_LOAD_F64 = /* @__PURE__ */ __name((byteOffset) => HEAP_DATA_VIEW.getFloat64(byteOffset, true), "LE_HEAP_LOAD_F64");
    var LE_HEAP_LOAD_I16 = /* @__PURE__ */ __name((byteOffset) => HEAP_DATA_VIEW.getInt16(byteOffset, true), "LE_HEAP_LOAD_I16");
    var LE_HEAP_LOAD_I32 = /* @__PURE__ */ __name((byteOffset) => HEAP_DATA_VIEW.getInt32(byteOffset, true), "LE_HEAP_LOAD_I32");
    var LE_HEAP_LOAD_U16 = /* @__PURE__ */ __name((byteOffset) => HEAP_DATA_VIEW.getUint16(byteOffset, true), "LE_HEAP_LOAD_U16");
    var LE_HEAP_LOAD_U32 = /* @__PURE__ */ __name((byteOffset) => HEAP_DATA_VIEW.getUint32(byteOffset, true), "LE_HEAP_LOAD_U32");
    var LE_HEAP_STORE_F32 = /* @__PURE__ */ __name((byteOffset, value) => HEAP_DATA_VIEW.setFloat32(byteOffset, value, true), "LE_HEAP_STORE_F32");
    var LE_HEAP_STORE_F64 = /* @__PURE__ */ __name((byteOffset, value) => HEAP_DATA_VIEW.setFloat64(byteOffset, value, true), "LE_HEAP_STORE_F64");
    var LE_HEAP_STORE_I16 = /* @__PURE__ */ __name((byteOffset, value) => HEAP_DATA_VIEW.setInt16(byteOffset, value, true), "LE_HEAP_STORE_I16");
    var LE_HEAP_STORE_I32 = /* @__PURE__ */ __name((byteOffset, value) => HEAP_DATA_VIEW.setInt32(byteOffset, value, true), "LE_HEAP_STORE_I32");
    var LE_HEAP_STORE_U16 = /* @__PURE__ */ __name((byteOffset, value) => HEAP_DATA_VIEW.setUint16(byteOffset, value, true), "LE_HEAP_STORE_U16");
    var LE_HEAP_STORE_U32 = /* @__PURE__ */ __name((byteOffset, value) => HEAP_DATA_VIEW.setUint32(byteOffset, value, true), "LE_HEAP_STORE_U32");
    var callRuntimeCallbacks = /* @__PURE__ */ __name((callbacks) => {
      while (callbacks.length > 0) {
        callbacks.shift()(Module);
      }
    }, "callRuntimeCallbacks");
    var onPostRuns = [];
    var addOnPostRun = /* @__PURE__ */ __name((cb) => onPostRuns.unshift(cb), "addOnPostRun");
    var onPreRuns = [];
    var addOnPreRun = /* @__PURE__ */ __name((cb) => onPreRuns.unshift(cb), "addOnPreRun");
    var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder() : void 0;
    var UTF8ArrayToString = /* @__PURE__ */ __name((heapOrArray, idx = 0, maxBytesToRead = NaN) => {
      var endIdx = idx + maxBytesToRead;
      var endPtr = idx;
      while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
      if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
      }
      var str = "";
      while (idx < endPtr) {
        var u0 = heapOrArray[idx++];
        if (!(u0 & 128)) {
          str += String.fromCharCode(u0);
          continue;
        }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 224) == 192) {
          str += String.fromCharCode((u0 & 31) << 6 | u1);
          continue;
        }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 240) == 224) {
          u0 = (u0 & 15) << 12 | u1 << 6 | u2;
        } else {
          u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
        }
        if (u0 < 65536) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 65536;
          str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
        }
      }
      return str;
    }, "UTF8ArrayToString");
    var getDylinkMetadata = /* @__PURE__ */ __name((binary2) => {
      var offset = 0;
      var end = 0;
      function getU8() {
        return binary2[offset++];
      }
      __name(getU8, "getU8");
      function getLEB() {
        var ret = 0;
        var mul = 1;
        while (1) {
          var byte = binary2[offset++];
          ret += (byte & 127) * mul;
          mul *= 128;
          if (!(byte & 128)) break;
        }
        return ret;
      }
      __name(getLEB, "getLEB");
      function getString() {
        var len = getLEB();
        offset += len;
        return UTF8ArrayToString(binary2, offset - len, len);
      }
      __name(getString, "getString");
      function failIf(condition, message) {
        if (condition) throw new Error(message);
      }
      __name(failIf, "failIf");
      var name2 = "dylink.0";
      if (binary2 instanceof WebAssembly.Module) {
        var dylinkSection = WebAssembly.Module.customSections(binary2, name2);
        if (dylinkSection.length === 0) {
          name2 = "dylink";
          dylinkSection = WebAssembly.Module.customSections(binary2, name2);
        }
        failIf(dylinkSection.length === 0, "need dylink section");
        binary2 = new Uint8Array(dylinkSection[0]);
        end = binary2.length;
      } else {
        var int32View = new Uint32Array(new Uint8Array(binary2.subarray(0, 24)).buffer);
        var magicNumberFound = int32View[0] == 1836278016 || int32View[0] == 6386541;
        failIf(!magicNumberFound, "need to see wasm magic number");
        failIf(binary2[8] !== 0, "need the dylink section to be first");
        offset = 9;
        var section_size = getLEB();
        end = offset + section_size;
        name2 = getString();
      }
      var customSection = {
        neededDynlibs: [],
        tlsExports: /* @__PURE__ */ new Set(),
        weakImports: /* @__PURE__ */ new Set()
      };
      if (name2 == "dylink") {
        customSection.memorySize = getLEB();
        customSection.memoryAlign = getLEB();
        customSection.tableSize = getLEB();
        customSection.tableAlign = getLEB();
        var neededDynlibsCount = getLEB();
        for (var i2 = 0; i2 < neededDynlibsCount; ++i2) {
          var libname = getString();
          customSection.neededDynlibs.push(libname);
        }
      } else {
        failIf(name2 !== "dylink.0");
        var WASM_DYLINK_MEM_INFO = 1;
        var WASM_DYLINK_NEEDED = 2;
        var WASM_DYLINK_EXPORT_INFO = 3;
        var WASM_DYLINK_IMPORT_INFO = 4;
        var WASM_SYMBOL_TLS = 256;
        var WASM_SYMBOL_BINDING_MASK = 3;
        var WASM_SYMBOL_BINDING_WEAK = 1;
        while (offset < end) {
          var subsectionType = getU8();
          var subsectionSize = getLEB();
          if (subsectionType === WASM_DYLINK_MEM_INFO) {
            customSection.memorySize = getLEB();
            customSection.memoryAlign = getLEB();
            customSection.tableSize = getLEB();
            customSection.tableAlign = getLEB();
          } else if (subsectionType === WASM_DYLINK_NEEDED) {
            var neededDynlibsCount = getLEB();
            for (var i2 = 0; i2 < neededDynlibsCount; ++i2) {
              libname = getString();
              customSection.neededDynlibs.push(libname);
            }
          } else if (subsectionType === WASM_DYLINK_EXPORT_INFO) {
            var count = getLEB();
            while (count--) {
              var symname = getString();
              var flags2 = getLEB();
              if (flags2 & WASM_SYMBOL_TLS) {
                customSection.tlsExports.add(symname);
              }
            }
          } else if (subsectionType === WASM_DYLINK_IMPORT_INFO) {
            var count = getLEB();
            while (count--) {
              var modname = getString();
              var symname = getString();
              var flags2 = getLEB();
              if ((flags2 & WASM_SYMBOL_BINDING_MASK) == WASM_SYMBOL_BINDING_WEAK) {
                customSection.weakImports.add(symname);
              }
            }
          } else {
            offset += subsectionSize;
          }
        }
      }
      return customSection;
    }, "getDylinkMetadata");
    function getValue(ptr, type = "i8") {
      if (type.endsWith("*")) type = "*";
      switch (type) {
        case "i1":
          return HEAP8[ptr];
        case "i8":
          return HEAP8[ptr];
        case "i16":
          return LE_HEAP_LOAD_I16((ptr >> 1) * 2);
        case "i32":
          return LE_HEAP_LOAD_I32((ptr >> 2) * 4);
        case "i64":
          return HEAP64[ptr >> 3];
        case "float":
          return LE_HEAP_LOAD_F32((ptr >> 2) * 4);
        case "double":
          return LE_HEAP_LOAD_F64((ptr >> 3) * 8);
        case "*":
          return LE_HEAP_LOAD_U32((ptr >> 2) * 4);
        default:
          abort(`invalid type for getValue: ${type}`);
      }
    }
    __name(getValue, "getValue");
    var newDSO = /* @__PURE__ */ __name((name2, handle2, syms) => {
      var dso = {
        refcount: Infinity,
        name: name2,
        exports: syms,
        global: true
      };
      LDSO.loadedLibsByName[name2] = dso;
      if (handle2 != void 0) {
        LDSO.loadedLibsByHandle[handle2] = dso;
      }
      return dso;
    }, "newDSO");
    var LDSO = {
      loadedLibsByName: {},
      loadedLibsByHandle: {},
      init() {
        newDSO("__main__", 0, wasmImports);
      }
    };
    var ___heap_base = 78224;
    var alignMemory = /* @__PURE__ */ __name((size, alignment) => Math.ceil(size / alignment) * alignment, "alignMemory");
    var getMemory = /* @__PURE__ */ __name((size) => {
      if (runtimeInitialized) {
        return _calloc(size, 1);
      }
      var ret = ___heap_base;
      var end = ret + alignMemory(size, 16);
      ___heap_base = end;
      GOT["__heap_base"].value = end;
      return ret;
    }, "getMemory");
    var isInternalSym = /* @__PURE__ */ __name((symName) => ["__cpp_exception", "__c_longjmp", "__wasm_apply_data_relocs", "__dso_handle", "__tls_size", "__tls_align", "__set_stack_limits", "_emscripten_tls_init", "__wasm_init_tls", "__wasm_call_ctors", "__start_em_asm", "__stop_em_asm", "__start_em_js", "__stop_em_js"].includes(symName) || symName.startsWith("__em_js__"), "isInternalSym");
    var uleb128Encode = /* @__PURE__ */ __name((n, target) => {
      if (n < 128) {
        target.push(n);
      } else {
        target.push(n % 128 | 128, n >> 7);
      }
    }, "uleb128Encode");
    var sigToWasmTypes = /* @__PURE__ */ __name((sig) => {
      var typeNames = {
        "i": "i32",
        "j": "i64",
        "f": "f32",
        "d": "f64",
        "e": "externref",
        "p": "i32"
      };
      var type = {
        parameters: [],
        results: sig[0] == "v" ? [] : [typeNames[sig[0]]]
      };
      for (var i2 = 1; i2 < sig.length; ++i2) {
        type.parameters.push(typeNames[sig[i2]]);
      }
      return type;
    }, "sigToWasmTypes");
    var generateFuncType = /* @__PURE__ */ __name((sig, target) => {
      var sigRet = sig.slice(0, 1);
      var sigParam = sig.slice(1);
      var typeCodes = {
        "i": 127,
        // i32
        "p": 127,
        // i32
        "j": 126,
        // i64
        "f": 125,
        // f32
        "d": 124,
        // f64
        "e": 111
      };
      target.push(96);
      uleb128Encode(sigParam.length, target);
      for (var i2 = 0; i2 < sigParam.length; ++i2) {
        target.push(typeCodes[sigParam[i2]]);
      }
      if (sigRet == "v") {
        target.push(0);
      } else {
        target.push(1, typeCodes[sigRet]);
      }
    }, "generateFuncType");
    var convertJsFunctionToWasm = /* @__PURE__ */ __name((func2, sig) => {
      if (typeof WebAssembly.Function == "function") {
        return new WebAssembly.Function(sigToWasmTypes(sig), func2);
      }
      var typeSectionBody = [1];
      generateFuncType(sig, typeSectionBody);
      var bytes = [
        0,
        97,
        115,
        109,
        // magic ("\0asm")
        1,
        0,
        0,
        0,
        // version: 1
        1
      ];
      uleb128Encode(typeSectionBody.length, bytes);
      bytes.push(...typeSectionBody);
      bytes.push(
        2,
        7,
        // import section
        // (import "e" "f" (func 0 (type 0)))
        1,
        1,
        101,
        1,
        102,
        0,
        0,
        7,
        5,
        // export section
        // (export "f" (func 0 (type 0)))
        1,
        1,
        102,
        0,
        0
      );
      var module2 = new WebAssembly.Module(new Uint8Array(bytes));
      var instance2 = new WebAssembly.Instance(module2, {
        "e": {
          "f": func2
        }
      });
      var wrappedFunc = instance2.exports["f"];
      return wrappedFunc;
    }, "convertJsFunctionToWasm");
    var wasmTableMirror = [];
    var wasmTable = new WebAssembly.Table({
      "initial": 31,
      "element": "anyfunc"
    });
    var getWasmTableEntry = /* @__PURE__ */ __name((funcPtr) => {
      var func2 = wasmTableMirror[funcPtr];
      if (!func2) {
        if (funcPtr >= wasmTableMirror.length) wasmTableMirror.length = funcPtr + 1;
        wasmTableMirror[funcPtr] = func2 = wasmTable.get(funcPtr);
      }
      return func2;
    }, "getWasmTableEntry");
    var updateTableMap = /* @__PURE__ */ __name((offset, count) => {
      if (functionsInTableMap) {
        for (var i2 = offset; i2 < offset + count; i2++) {
          var item = getWasmTableEntry(i2);
          if (item) {
            functionsInTableMap.set(item, i2);
          }
        }
      }
    }, "updateTableMap");
    var functionsInTableMap;
    var getFunctionAddress = /* @__PURE__ */ __name((func2) => {
      if (!functionsInTableMap) {
        functionsInTableMap = /* @__PURE__ */ new WeakMap();
        updateTableMap(0, wasmTable.length);
      }
      return functionsInTableMap.get(func2) || 0;
    }, "getFunctionAddress");
    var freeTableIndexes = [];
    var getEmptyTableSlot = /* @__PURE__ */ __name(() => {
      if (freeTableIndexes.length) {
        return freeTableIndexes.pop();
      }
      try {
        wasmTable.grow(1);
      } catch (err2) {
        if (!(err2 instanceof RangeError)) {
          throw err2;
        }
        throw "Unable to grow wasm table. Set ALLOW_TABLE_GROWTH.";
      }
      return wasmTable.length - 1;
    }, "getEmptyTableSlot");
    var setWasmTableEntry = /* @__PURE__ */ __name((idx, func2) => {
      wasmTable.set(idx, func2);
      wasmTableMirror[idx] = wasmTable.get(idx);
    }, "setWasmTableEntry");
    var addFunction = /* @__PURE__ */ __name((func2, sig) => {
      var rtn = getFunctionAddress(func2);
      if (rtn) {
        return rtn;
      }
      var ret = getEmptyTableSlot();
      try {
        setWasmTableEntry(ret, func2);
      } catch (err2) {
        if (!(err2 instanceof TypeError)) {
          throw err2;
        }
        var wrapped = convertJsFunctionToWasm(func2, sig);
        setWasmTableEntry(ret, wrapped);
      }
      functionsInTableMap.set(func2, ret);
      return ret;
    }, "addFunction");
    var updateGOT = /* @__PURE__ */ __name((exports2, replace) => {
      for (var symName in exports2) {
        if (isInternalSym(symName)) {
          continue;
        }
        var value = exports2[symName];
        GOT[symName] ||= new WebAssembly.Global({
          "value": "i32",
          "mutable": true
        });
        if (replace || GOT[symName].value == 0) {
          if (typeof value == "function") {
            GOT[symName].value = addFunction(value);
          } else if (typeof value == "number") {
            GOT[symName].value = value;
          } else {
            err(`unhandled export type for '${symName}': ${typeof value}`);
          }
        }
      }
    }, "updateGOT");
    var relocateExports = /* @__PURE__ */ __name((exports2, memoryBase2, replace) => {
      var relocated = {};
      for (var e in exports2) {
        var value = exports2[e];
        if (typeof value == "object") {
          value = value.value;
        }
        if (typeof value == "number") {
          value += memoryBase2;
        }
        relocated[e] = value;
      }
      updateGOT(relocated, replace);
      return relocated;
    }, "relocateExports");
    var isSymbolDefined = /* @__PURE__ */ __name((symName) => {
      var existing = wasmImports[symName];
      if (!existing || existing.stub) {
        return false;
      }
      return true;
    }, "isSymbolDefined");
    var dynCall = /* @__PURE__ */ __name((sig, ptr, args2 = []) => {
      var rtn = getWasmTableEntry(ptr)(...args2);
      return rtn;
    }, "dynCall");
    var stackSave = /* @__PURE__ */ __name(() => _emscripten_stack_get_current(), "stackSave");
    var stackRestore = /* @__PURE__ */ __name((val) => __emscripten_stack_restore(val), "stackRestore");
    var createInvokeFunction = /* @__PURE__ */ __name((sig) => (ptr, ...args2) => {
      var sp = stackSave();
      try {
        return dynCall(sig, ptr, args2);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
        if (sig[0] == "j") return 0n;
      }
    }, "createInvokeFunction");
    var resolveGlobalSymbol = /* @__PURE__ */ __name((symName, direct = false) => {
      var sym;
      if (isSymbolDefined(symName)) {
        sym = wasmImports[symName];
      } else if (symName.startsWith("invoke_")) {
        sym = wasmImports[symName] = createInvokeFunction(symName.split("_")[1]);
      }
      return {
        sym,
        name: symName
      };
    }, "resolveGlobalSymbol");
    var onPostCtors = [];
    var addOnPostCtor = /* @__PURE__ */ __name((cb) => onPostCtors.unshift(cb), "addOnPostCtor");
    var UTF8ToString = /* @__PURE__ */ __name((ptr, maxBytesToRead) => ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "", "UTF8ToString");
    var loadWebAssemblyModule = /* @__PURE__ */ __name((binary, flags, libName, localScope, handle) => {
      var metadata = getDylinkMetadata(binary);
      currentModuleWeakSymbols = metadata.weakImports;
      function loadModule() {
        var memAlign = Math.pow(2, metadata.memoryAlign);
        var memoryBase = metadata.memorySize ? alignMemory(getMemory(metadata.memorySize + memAlign), memAlign) : 0;
        var tableBase = metadata.tableSize ? wasmTable.length : 0;
        if (handle) {
          HEAP8[handle + 8] = 1;
          LE_HEAP_STORE_U32((handle + 12 >> 2) * 4, memoryBase);
          LE_HEAP_STORE_I32((handle + 16 >> 2) * 4, metadata.memorySize);
          LE_HEAP_STORE_U32((handle + 20 >> 2) * 4, tableBase);
          LE_HEAP_STORE_I32((handle + 24 >> 2) * 4, metadata.tableSize);
        }
        if (metadata.tableSize) {
          wasmTable.grow(metadata.tableSize);
        }
        var moduleExports;
        function resolveSymbol(sym) {
          var resolved = resolveGlobalSymbol(sym).sym;
          if (!resolved && localScope) {
            resolved = localScope[sym];
          }
          if (!resolved) {
            resolved = moduleExports[sym];
          }
          return resolved;
        }
        __name(resolveSymbol, "resolveSymbol");
        var proxyHandler = {
          get(stubs, prop) {
            switch (prop) {
              case "__memory_base":
                return memoryBase;
              case "__table_base":
                return tableBase;
            }
            if (prop in wasmImports && !wasmImports[prop].stub) {
              var res = wasmImports[prop];
              return res;
            }
            if (!(prop in stubs)) {
              var resolved;
              stubs[prop] = (...args2) => {
                resolved ||= resolveSymbol(prop);
                return resolved(...args2);
              };
            }
            return stubs[prop];
          }
        };
        var proxy = new Proxy({}, proxyHandler);
        var info = {
          "GOT.mem": new Proxy({}, GOTHandler),
          "GOT.func": new Proxy({}, GOTHandler),
          "env": proxy,
          "wasi_snapshot_preview1": proxy
        };
        function postInstantiation(module, instance) {
          updateTableMap(tableBase, metadata.tableSize);
          moduleExports = relocateExports(instance.exports, memoryBase);
          if (!flags.allowUndefined) {
            reportUndefinedSymbols();
          }
          function addEmAsm(addr, body) {
            var args = [];
            var arity = 0;
            for (; arity < 16; arity++) {
              if (body.indexOf("$" + arity) != -1) {
                args.push("$" + arity);
              } else {
                break;
              }
            }
            args = args.join(",");
            var func = `(${args}) => { ${body} };`;
            ASM_CONSTS[start] = eval(func);
          }
          __name(addEmAsm, "addEmAsm");
          if ("__start_em_asm" in moduleExports) {
            var start = moduleExports["__start_em_asm"];
            var stop = moduleExports["__stop_em_asm"];
            while (start < stop) {
              var jsString = UTF8ToString(start);
              addEmAsm(start, jsString);
              start = HEAPU8.indexOf(0, start) + 1;
            }
          }
          function addEmJs(name, cSig, body) {
            var jsArgs = [];
            cSig = cSig.slice(1, -1);
            if (cSig != "void") {
              cSig = cSig.split(",");
              for (var i in cSig) {
                var jsArg = cSig[i].split(" ").pop();
                jsArgs.push(jsArg.replace("*", ""));
              }
            }
            var func = `(${jsArgs}) => ${body};`;
            moduleExports[name] = eval(func);
          }
          __name(addEmJs, "addEmJs");
          for (var name in moduleExports) {
            if (name.startsWith("__em_js__")) {
              var start = moduleExports[name];
              var jsString = UTF8ToString(start);
              var parts = jsString.split("<::>");
              addEmJs(name.replace("__em_js__", ""), parts[0], parts[1]);
              delete moduleExports[name];
            }
          }
          var applyRelocs = moduleExports["__wasm_apply_data_relocs"];
          if (applyRelocs) {
            if (runtimeInitialized) {
              applyRelocs();
            } else {
              __RELOC_FUNCS__.push(applyRelocs);
            }
          }
          var init = moduleExports["__wasm_call_ctors"];
          if (init) {
            if (runtimeInitialized) {
              init();
            } else {
              addOnPostCtor(init);
            }
          }
          return moduleExports;
        }
        __name(postInstantiation, "postInstantiation");
        if (flags.loadAsync) {
          if (binary instanceof WebAssembly.Module) {
            var instance = new WebAssembly.Instance(binary, info);
            return Promise.resolve(postInstantiation(binary, instance));
          }
          return WebAssembly.instantiate(binary, info).then((result) => postInstantiation(result.module, result.instance));
        }
        var module = binary instanceof WebAssembly.Module ? binary : new WebAssembly.Module(binary);
        var instance = new WebAssembly.Instance(module, info);
        return postInstantiation(module, instance);
      }
      __name(loadModule, "loadModule");
      if (flags.loadAsync) {
        return metadata.neededDynlibs.reduce((chain, dynNeeded) => chain.then(() => loadDynamicLibrary(dynNeeded, flags, localScope)), Promise.resolve()).then(loadModule);
      }
      metadata.neededDynlibs.forEach((needed) => loadDynamicLibrary(needed, flags, localScope));
      return loadModule();
    }, "loadWebAssemblyModule");
    var mergeLibSymbols = /* @__PURE__ */ __name((exports2, libName2) => {
      for (var [sym, exp] of Object.entries(exports2)) {
        const setImport = /* @__PURE__ */ __name((target) => {
          if (!isSymbolDefined(target)) {
            wasmImports[target] = exp;
          }
        }, "setImport");
        setImport(sym);
        const main_alias = "__main_argc_argv";
        if (sym == "main") {
          setImport(main_alias);
        }
        if (sym == main_alias) {
          setImport("main");
        }
      }
    }, "mergeLibSymbols");
    var asyncLoad = /* @__PURE__ */ __name(async (url) => {
      var arrayBuffer = await readAsync(url);
      return new Uint8Array(arrayBuffer);
    }, "asyncLoad");
    function loadDynamicLibrary(libName2, flags2 = {
      global: true,
      nodelete: true
    }, localScope2, handle2) {
      var dso = LDSO.loadedLibsByName[libName2];
      if (dso) {
        if (!flags2.global) {
          if (localScope2) {
            Object.assign(localScope2, dso.exports);
          }
        } else if (!dso.global) {
          dso.global = true;
          mergeLibSymbols(dso.exports, libName2);
        }
        if (flags2.nodelete && dso.refcount !== Infinity) {
          dso.refcount = Infinity;
        }
        dso.refcount++;
        if (handle2) {
          LDSO.loadedLibsByHandle[handle2] = dso;
        }
        return flags2.loadAsync ? Promise.resolve(true) : true;
      }
      dso = newDSO(libName2, handle2, "loading");
      dso.refcount = flags2.nodelete ? Infinity : 1;
      dso.global = flags2.global;
      function loadLibData() {
        if (handle2) {
          var data = LE_HEAP_LOAD_U32((handle2 + 28 >> 2) * 4);
          var dataSize = LE_HEAP_LOAD_U32((handle2 + 32 >> 2) * 4);
          if (data && dataSize) {
            var libData = HEAP8.slice(data, data + dataSize);
            return flags2.loadAsync ? Promise.resolve(libData) : libData;
          }
        }
        var libFile = locateFile(libName2);
        if (flags2.loadAsync) {
          return asyncLoad(libFile);
        }
        if (!readBinary) {
          throw new Error(`${libFile}: file not found, and synchronous loading of external files is not available`);
        }
        return readBinary(libFile);
      }
      __name(loadLibData, "loadLibData");
      function getExports() {
        if (flags2.loadAsync) {
          return loadLibData().then((libData) => loadWebAssemblyModule(libData, flags2, libName2, localScope2, handle2));
        }
        return loadWebAssemblyModule(loadLibData(), flags2, libName2, localScope2, handle2);
      }
      __name(getExports, "getExports");
      function moduleLoaded(exports2) {
        if (dso.global) {
          mergeLibSymbols(exports2, libName2);
        } else if (localScope2) {
          Object.assign(localScope2, exports2);
        }
        dso.exports = exports2;
      }
      __name(moduleLoaded, "moduleLoaded");
      if (flags2.loadAsync) {
        return getExports().then((exports2) => {
          moduleLoaded(exports2);
          return true;
        });
      }
      moduleLoaded(getExports());
      return true;
    }
    __name(loadDynamicLibrary, "loadDynamicLibrary");
    var reportUndefinedSymbols = /* @__PURE__ */ __name(() => {
      for (var [symName, entry] of Object.entries(GOT)) {
        if (entry.value == 0) {
          var value = resolveGlobalSymbol(symName, true).sym;
          if (!value && !entry.required) {
            continue;
          }
          if (typeof value == "function") {
            entry.value = addFunction(value, value.sig);
          } else if (typeof value == "number") {
            entry.value = value;
          } else {
            throw new Error(`bad export type for '${symName}': ${typeof value}`);
          }
        }
      }
    }, "reportUndefinedSymbols");
    var loadDylibs = /* @__PURE__ */ __name(() => {
      if (!dynamicLibraries.length) {
        reportUndefinedSymbols();
        return;
      }
      addRunDependency("loadDylibs");
      dynamicLibraries.reduce((chain, lib) => chain.then(() => loadDynamicLibrary(lib, {
        loadAsync: true,
        global: true,
        nodelete: true,
        allowUndefined: true
      })), Promise.resolve()).then(() => {
        reportUndefinedSymbols();
        removeRunDependency("loadDylibs");
      });
    }, "loadDylibs");
    var noExitRuntime = Module["noExitRuntime"] || true;
    function setValue(ptr, value, type = "i8") {
      if (type.endsWith("*")) type = "*";
      switch (type) {
        case "i1":
          HEAP8[ptr] = value;
          break;
        case "i8":
          HEAP8[ptr] = value;
          break;
        case "i16":
          LE_HEAP_STORE_I16((ptr >> 1) * 2, value);
          break;
        case "i32":
          LE_HEAP_STORE_I32((ptr >> 2) * 4, value);
          break;
        case "i64":
          HEAP64[ptr >> 3] = BigInt(value);
          break;
        case "float":
          LE_HEAP_STORE_F32((ptr >> 2) * 4, value);
          break;
        case "double":
          LE_HEAP_STORE_F64((ptr >> 3) * 8, value);
          break;
        case "*":
          LE_HEAP_STORE_U32((ptr >> 2) * 4, value);
          break;
        default:
          abort(`invalid type for setValue: ${type}`);
      }
    }
    __name(setValue, "setValue");
    var ___memory_base = new WebAssembly.Global({
      "value": "i32",
      "mutable": false
    }, 1024);
    var ___stack_pointer = new WebAssembly.Global({
      "value": "i32",
      "mutable": true
    }, 78224);
    var ___table_base = new WebAssembly.Global({
      "value": "i32",
      "mutable": false
    }, 1);
    var __abort_js = /* @__PURE__ */ __name(() => abort(""), "__abort_js");
    __abort_js.sig = "v";
    var _emscripten_get_now = /* @__PURE__ */ __name(() => performance.now(), "_emscripten_get_now");
    _emscripten_get_now.sig = "d";
    var _emscripten_date_now = /* @__PURE__ */ __name(() => Date.now(), "_emscripten_date_now");
    _emscripten_date_now.sig = "d";
    var nowIsMonotonic = 1;
    var checkWasiClock = /* @__PURE__ */ __name((clock_id) => clock_id >= 0 && clock_id <= 3, "checkWasiClock");
    var INT53_MAX = 9007199254740992;
    var INT53_MIN = -9007199254740992;
    var bigintToI53Checked = /* @__PURE__ */ __name((num) => num < INT53_MIN || num > INT53_MAX ? NaN : Number(num), "bigintToI53Checked");
    function _clock_time_get(clk_id, ignored_precision, ptime) {
      ignored_precision = bigintToI53Checked(ignored_precision);
      if (!checkWasiClock(clk_id)) {
        return 28;
      }
      var now;
      if (clk_id === 0) {
        now = _emscripten_date_now();
      } else if (nowIsMonotonic) {
        now = _emscripten_get_now();
      } else {
        return 52;
      }
      var nsec = Math.round(now * 1e3 * 1e3);
      HEAP64[ptime >> 3] = BigInt(nsec);
      return 0;
    }
    __name(_clock_time_get, "_clock_time_get");
    _clock_time_get.sig = "iijp";
    var getHeapMax = /* @__PURE__ */ __name(() => (
      // Stay one Wasm page short of 4GB: while e.g. Chrome is able to allocate
      // full 4GB Wasm memories, the size will wrap back to 0 bytes in Wasm side
      // for any code that deals with heap sizes, which would require special
      // casing all heap size related code to treat 0 specially.
      2147483648
    ), "getHeapMax");
    var growMemory = /* @__PURE__ */ __name((size) => {
      var b = wasmMemory.buffer;
      var pages = (size - b.byteLength + 65535) / 65536 | 0;
      try {
        wasmMemory.grow(pages);
        updateMemoryViews();
        return 1;
      } catch (e) {
      }
    }, "growMemory");
    var _emscripten_resize_heap = /* @__PURE__ */ __name((requestedSize) => {
      var oldSize = HEAPU8.length;
      requestedSize >>>= 0;
      var maxHeapSize = getHeapMax();
      if (requestedSize > maxHeapSize) {
        return false;
      }
      for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
        var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
        overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
        var newSize = Math.min(maxHeapSize, alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536));
        var replacement = growMemory(newSize);
        if (replacement) {
          return true;
        }
      }
      return false;
    }, "_emscripten_resize_heap");
    _emscripten_resize_heap.sig = "ip";
    var _fd_close = /* @__PURE__ */ __name((fd) => 52, "_fd_close");
    _fd_close.sig = "ii";
    function _fd_seek(fd, offset, whence, newOffset) {
      offset = bigintToI53Checked(offset);
      return 70;
    }
    __name(_fd_seek, "_fd_seek");
    _fd_seek.sig = "iijip";
    var printCharBuffers = [null, [], []];
    var printChar = /* @__PURE__ */ __name((stream, curr) => {
      var buffer = printCharBuffers[stream];
      if (curr === 0 || curr === 10) {
        (stream === 1 ? out : err)(UTF8ArrayToString(buffer));
        buffer.length = 0;
      } else {
        buffer.push(curr);
      }
    }, "printChar");
    var flush_NO_FILESYSTEM = /* @__PURE__ */ __name(() => {
      if (printCharBuffers[1].length) printChar(1, 10);
      if (printCharBuffers[2].length) printChar(2, 10);
    }, "flush_NO_FILESYSTEM");
    var SYSCALLS = {
      varargs: void 0,
      getStr(ptr) {
        var ret = UTF8ToString(ptr);
        return ret;
      }
    };
    var _fd_write = /* @__PURE__ */ __name((fd, iov, iovcnt, pnum) => {
      var num = 0;
      for (var i2 = 0; i2 < iovcnt; i2++) {
        var ptr = LE_HEAP_LOAD_U32((iov >> 2) * 4);
        var len = LE_HEAP_LOAD_U32((iov + 4 >> 2) * 4);
        iov += 8;
        for (var j = 0; j < len; j++) {
          printChar(fd, HEAPU8[ptr + j]);
        }
        num += len;
      }
      LE_HEAP_STORE_U32((pnum >> 2) * 4, num);
      return 0;
    }, "_fd_write");
    _fd_write.sig = "iippp";
    function _tree_sitter_log_callback(isLexMessage, messageAddress) {
      if (Module.currentLogCallback) {
        const message = UTF8ToString(messageAddress);
        Module.currentLogCallback(message, isLexMessage !== 0);
      }
    }
    __name(_tree_sitter_log_callback, "_tree_sitter_log_callback");
    function _tree_sitter_parse_callback(inputBufferAddress, index, row, column, lengthAddress) {
      const INPUT_BUFFER_SIZE = 10 * 1024;
      const string4 = Module.currentParseCallback(index, {
        row,
        column
      });
      if (typeof string4 === "string") {
        setValue(lengthAddress, string4.length, "i32");
        stringToUTF16(string4, inputBufferAddress, INPUT_BUFFER_SIZE);
      } else {
        setValue(lengthAddress, 0, "i32");
      }
    }
    __name(_tree_sitter_parse_callback, "_tree_sitter_parse_callback");
    function _tree_sitter_progress_callback(currentOffset, hasError) {
      if (Module.currentProgressCallback) {
        return Module.currentProgressCallback({
          currentOffset,
          hasError
        });
      }
      return false;
    }
    __name(_tree_sitter_progress_callback, "_tree_sitter_progress_callback");
    function _tree_sitter_query_progress_callback(currentOffset) {
      if (Module.currentQueryProgressCallback) {
        return Module.currentQueryProgressCallback({
          currentOffset
        });
      }
      return false;
    }
    __name(_tree_sitter_query_progress_callback, "_tree_sitter_query_progress_callback");
    var runtimeKeepaliveCounter = 0;
    var keepRuntimeAlive = /* @__PURE__ */ __name(() => noExitRuntime || runtimeKeepaliveCounter > 0, "keepRuntimeAlive");
    var _proc_exit = /* @__PURE__ */ __name((code) => {
      EXITSTATUS = code;
      if (!keepRuntimeAlive()) {
        Module["onExit"]?.(code);
        ABORT = true;
      }
      quit_(code, new ExitStatus(code));
    }, "_proc_exit");
    _proc_exit.sig = "vi";
    var exitJS = /* @__PURE__ */ __name((status, implicit) => {
      EXITSTATUS = status;
      _proc_exit(status);
    }, "exitJS");
    var handleException = /* @__PURE__ */ __name((e) => {
      if (e instanceof ExitStatus || e == "unwind") {
        return EXITSTATUS;
      }
      quit_(1, e);
    }, "handleException");
    var lengthBytesUTF8 = /* @__PURE__ */ __name((str) => {
      var len = 0;
      for (var i2 = 0; i2 < str.length; ++i2) {
        var c = str.charCodeAt(i2);
        if (c <= 127) {
          len++;
        } else if (c <= 2047) {
          len += 2;
        } else if (c >= 55296 && c <= 57343) {
          len += 4;
          ++i2;
        } else {
          len += 3;
        }
      }
      return len;
    }, "lengthBytesUTF8");
    var stringToUTF8Array = /* @__PURE__ */ __name((str, heap, outIdx, maxBytesToWrite) => {
      if (!(maxBytesToWrite > 0)) return 0;
      var startIdx = outIdx;
      var endIdx = outIdx + maxBytesToWrite - 1;
      for (var i2 = 0; i2 < str.length; ++i2) {
        var u = str.charCodeAt(i2);
        if (u >= 55296 && u <= 57343) {
          var u1 = str.charCodeAt(++i2);
          u = 65536 + ((u & 1023) << 10) | u1 & 1023;
        }
        if (u <= 127) {
          if (outIdx >= endIdx) break;
          heap[outIdx++] = u;
        } else if (u <= 2047) {
          if (outIdx + 1 >= endIdx) break;
          heap[outIdx++] = 192 | u >> 6;
          heap[outIdx++] = 128 | u & 63;
        } else if (u <= 65535) {
          if (outIdx + 2 >= endIdx) break;
          heap[outIdx++] = 224 | u >> 12;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
        } else {
          if (outIdx + 3 >= endIdx) break;
          heap[outIdx++] = 240 | u >> 18;
          heap[outIdx++] = 128 | u >> 12 & 63;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
        }
      }
      heap[outIdx] = 0;
      return outIdx - startIdx;
    }, "stringToUTF8Array");
    var stringToUTF8 = /* @__PURE__ */ __name((str, outPtr, maxBytesToWrite) => stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite), "stringToUTF8");
    var stackAlloc = /* @__PURE__ */ __name((sz) => __emscripten_stack_alloc(sz), "stackAlloc");
    var stringToUTF8OnStack = /* @__PURE__ */ __name((str) => {
      var size = lengthBytesUTF8(str) + 1;
      var ret = stackAlloc(size);
      stringToUTF8(str, ret, size);
      return ret;
    }, "stringToUTF8OnStack");
    var AsciiToString = /* @__PURE__ */ __name((ptr) => {
      var str = "";
      while (1) {
        var ch = HEAPU8[ptr++];
        if (!ch) return str;
        str += String.fromCharCode(ch);
      }
    }, "AsciiToString");
    var stringToUTF16 = /* @__PURE__ */ __name((str, outPtr, maxBytesToWrite) => {
      maxBytesToWrite ??= 2147483647;
      if (maxBytesToWrite < 2) return 0;
      maxBytesToWrite -= 2;
      var startPtr = outPtr;
      var numCharsToWrite = maxBytesToWrite < str.length * 2 ? maxBytesToWrite / 2 : str.length;
      for (var i2 = 0; i2 < numCharsToWrite; ++i2) {
        var codeUnit = str.charCodeAt(i2);
        LE_HEAP_STORE_I16((outPtr >> 1) * 2, codeUnit);
        outPtr += 2;
      }
      LE_HEAP_STORE_I16((outPtr >> 1) * 2, 0);
      return outPtr - startPtr;
    }, "stringToUTF16");
    var wasmImports = {
      /** @export */
      __heap_base: ___heap_base,
      /** @export */
      __indirect_function_table: wasmTable,
      /** @export */
      __memory_base: ___memory_base,
      /** @export */
      __stack_pointer: ___stack_pointer,
      /** @export */
      __table_base: ___table_base,
      /** @export */
      _abort_js: __abort_js,
      /** @export */
      clock_time_get: _clock_time_get,
      /** @export */
      emscripten_resize_heap: _emscripten_resize_heap,
      /** @export */
      fd_close: _fd_close,
      /** @export */
      fd_seek: _fd_seek,
      /** @export */
      fd_write: _fd_write,
      /** @export */
      memory: wasmMemory,
      /** @export */
      tree_sitter_log_callback: _tree_sitter_log_callback,
      /** @export */
      tree_sitter_parse_callback: _tree_sitter_parse_callback,
      /** @export */
      tree_sitter_progress_callback: _tree_sitter_progress_callback,
      /** @export */
      tree_sitter_query_progress_callback: _tree_sitter_query_progress_callback
    };
    var wasmExports = await createWasm();
    var ___wasm_call_ctors = wasmExports["__wasm_call_ctors"];
    var _malloc = Module["_malloc"] = wasmExports["malloc"];
    var _calloc = Module["_calloc"] = wasmExports["calloc"];
    var _realloc = Module["_realloc"] = wasmExports["realloc"];
    var _free = Module["_free"] = wasmExports["free"];
    var _memcmp = Module["_memcmp"] = wasmExports["memcmp"];
    var _ts_language_symbol_count = Module["_ts_language_symbol_count"] = wasmExports["ts_language_symbol_count"];
    var _ts_language_state_count = Module["_ts_language_state_count"] = wasmExports["ts_language_state_count"];
    var _ts_language_version = Module["_ts_language_version"] = wasmExports["ts_language_version"];
    var _ts_language_abi_version = Module["_ts_language_abi_version"] = wasmExports["ts_language_abi_version"];
    var _ts_language_metadata = Module["_ts_language_metadata"] = wasmExports["ts_language_metadata"];
    var _ts_language_name = Module["_ts_language_name"] = wasmExports["ts_language_name"];
    var _ts_language_field_count = Module["_ts_language_field_count"] = wasmExports["ts_language_field_count"];
    var _ts_language_next_state = Module["_ts_language_next_state"] = wasmExports["ts_language_next_state"];
    var _ts_language_symbol_name = Module["_ts_language_symbol_name"] = wasmExports["ts_language_symbol_name"];
    var _ts_language_symbol_for_name = Module["_ts_language_symbol_for_name"] = wasmExports["ts_language_symbol_for_name"];
    var _strncmp = Module["_strncmp"] = wasmExports["strncmp"];
    var _ts_language_symbol_type = Module["_ts_language_symbol_type"] = wasmExports["ts_language_symbol_type"];
    var _ts_language_field_name_for_id = Module["_ts_language_field_name_for_id"] = wasmExports["ts_language_field_name_for_id"];
    var _ts_lookahead_iterator_new = Module["_ts_lookahead_iterator_new"] = wasmExports["ts_lookahead_iterator_new"];
    var _ts_lookahead_iterator_delete = Module["_ts_lookahead_iterator_delete"] = wasmExports["ts_lookahead_iterator_delete"];
    var _ts_lookahead_iterator_reset_state = Module["_ts_lookahead_iterator_reset_state"] = wasmExports["ts_lookahead_iterator_reset_state"];
    var _ts_lookahead_iterator_reset = Module["_ts_lookahead_iterator_reset"] = wasmExports["ts_lookahead_iterator_reset"];
    var _ts_lookahead_iterator_next = Module["_ts_lookahead_iterator_next"] = wasmExports["ts_lookahead_iterator_next"];
    var _ts_lookahead_iterator_current_symbol = Module["_ts_lookahead_iterator_current_symbol"] = wasmExports["ts_lookahead_iterator_current_symbol"];
    var _ts_parser_delete = Module["_ts_parser_delete"] = wasmExports["ts_parser_delete"];
    var _ts_parser_reset = Module["_ts_parser_reset"] = wasmExports["ts_parser_reset"];
    var _ts_parser_set_language = Module["_ts_parser_set_language"] = wasmExports["ts_parser_set_language"];
    var _ts_parser_timeout_micros = Module["_ts_parser_timeout_micros"] = wasmExports["ts_parser_timeout_micros"];
    var _ts_parser_set_timeout_micros = Module["_ts_parser_set_timeout_micros"] = wasmExports["ts_parser_set_timeout_micros"];
    var _ts_parser_set_included_ranges = Module["_ts_parser_set_included_ranges"] = wasmExports["ts_parser_set_included_ranges"];
    var _ts_query_new = Module["_ts_query_new"] = wasmExports["ts_query_new"];
    var _ts_query_delete = Module["_ts_query_delete"] = wasmExports["ts_query_delete"];
    var _iswspace = Module["_iswspace"] = wasmExports["iswspace"];
    var _iswalnum = Module["_iswalnum"] = wasmExports["iswalnum"];
    var _ts_query_pattern_count = Module["_ts_query_pattern_count"] = wasmExports["ts_query_pattern_count"];
    var _ts_query_capture_count = Module["_ts_query_capture_count"] = wasmExports["ts_query_capture_count"];
    var _ts_query_string_count = Module["_ts_query_string_count"] = wasmExports["ts_query_string_count"];
    var _ts_query_capture_name_for_id = Module["_ts_query_capture_name_for_id"] = wasmExports["ts_query_capture_name_for_id"];
    var _ts_query_capture_quantifier_for_id = Module["_ts_query_capture_quantifier_for_id"] = wasmExports["ts_query_capture_quantifier_for_id"];
    var _ts_query_string_value_for_id = Module["_ts_query_string_value_for_id"] = wasmExports["ts_query_string_value_for_id"];
    var _ts_query_predicates_for_pattern = Module["_ts_query_predicates_for_pattern"] = wasmExports["ts_query_predicates_for_pattern"];
    var _ts_query_start_byte_for_pattern = Module["_ts_query_start_byte_for_pattern"] = wasmExports["ts_query_start_byte_for_pattern"];
    var _ts_query_end_byte_for_pattern = Module["_ts_query_end_byte_for_pattern"] = wasmExports["ts_query_end_byte_for_pattern"];
    var _ts_query_is_pattern_rooted = Module["_ts_query_is_pattern_rooted"] = wasmExports["ts_query_is_pattern_rooted"];
    var _ts_query_is_pattern_non_local = Module["_ts_query_is_pattern_non_local"] = wasmExports["ts_query_is_pattern_non_local"];
    var _ts_query_is_pattern_guaranteed_at_step = Module["_ts_query_is_pattern_guaranteed_at_step"] = wasmExports["ts_query_is_pattern_guaranteed_at_step"];
    var _ts_query_disable_capture = Module["_ts_query_disable_capture"] = wasmExports["ts_query_disable_capture"];
    var _ts_query_disable_pattern = Module["_ts_query_disable_pattern"] = wasmExports["ts_query_disable_pattern"];
    var _ts_tree_copy = Module["_ts_tree_copy"] = wasmExports["ts_tree_copy"];
    var _ts_tree_delete = Module["_ts_tree_delete"] = wasmExports["ts_tree_delete"];
    var _ts_init = Module["_ts_init"] = wasmExports["ts_init"];
    var _ts_parser_new_wasm = Module["_ts_parser_new_wasm"] = wasmExports["ts_parser_new_wasm"];
    var _ts_parser_enable_logger_wasm = Module["_ts_parser_enable_logger_wasm"] = wasmExports["ts_parser_enable_logger_wasm"];
    var _ts_parser_parse_wasm = Module["_ts_parser_parse_wasm"] = wasmExports["ts_parser_parse_wasm"];
    var _ts_parser_included_ranges_wasm = Module["_ts_parser_included_ranges_wasm"] = wasmExports["ts_parser_included_ranges_wasm"];
    var _ts_language_type_is_named_wasm = Module["_ts_language_type_is_named_wasm"] = wasmExports["ts_language_type_is_named_wasm"];
    var _ts_language_type_is_visible_wasm = Module["_ts_language_type_is_visible_wasm"] = wasmExports["ts_language_type_is_visible_wasm"];
    var _ts_language_supertypes_wasm = Module["_ts_language_supertypes_wasm"] = wasmExports["ts_language_supertypes_wasm"];
    var _ts_language_subtypes_wasm = Module["_ts_language_subtypes_wasm"] = wasmExports["ts_language_subtypes_wasm"];
    var _ts_tree_root_node_wasm = Module["_ts_tree_root_node_wasm"] = wasmExports["ts_tree_root_node_wasm"];
    var _ts_tree_root_node_with_offset_wasm = Module["_ts_tree_root_node_with_offset_wasm"] = wasmExports["ts_tree_root_node_with_offset_wasm"];
    var _ts_tree_edit_wasm = Module["_ts_tree_edit_wasm"] = wasmExports["ts_tree_edit_wasm"];
    var _ts_tree_included_ranges_wasm = Module["_ts_tree_included_ranges_wasm"] = wasmExports["ts_tree_included_ranges_wasm"];
    var _ts_tree_get_changed_ranges_wasm = Module["_ts_tree_get_changed_ranges_wasm"] = wasmExports["ts_tree_get_changed_ranges_wasm"];
    var _ts_tree_cursor_new_wasm = Module["_ts_tree_cursor_new_wasm"] = wasmExports["ts_tree_cursor_new_wasm"];
    var _ts_tree_cursor_copy_wasm = Module["_ts_tree_cursor_copy_wasm"] = wasmExports["ts_tree_cursor_copy_wasm"];
    var _ts_tree_cursor_delete_wasm = Module["_ts_tree_cursor_delete_wasm"] = wasmExports["ts_tree_cursor_delete_wasm"];
    var _ts_tree_cursor_reset_wasm = Module["_ts_tree_cursor_reset_wasm"] = wasmExports["ts_tree_cursor_reset_wasm"];
    var _ts_tree_cursor_reset_to_wasm = Module["_ts_tree_cursor_reset_to_wasm"] = wasmExports["ts_tree_cursor_reset_to_wasm"];
    var _ts_tree_cursor_goto_first_child_wasm = Module["_ts_tree_cursor_goto_first_child_wasm"] = wasmExports["ts_tree_cursor_goto_first_child_wasm"];
    var _ts_tree_cursor_goto_last_child_wasm = Module["_ts_tree_cursor_goto_last_child_wasm"] = wasmExports["ts_tree_cursor_goto_last_child_wasm"];
    var _ts_tree_cursor_goto_first_child_for_index_wasm = Module["_ts_tree_cursor_goto_first_child_for_index_wasm"] = wasmExports["ts_tree_cursor_goto_first_child_for_index_wasm"];
    var _ts_tree_cursor_goto_first_child_for_position_wasm = Module["_ts_tree_cursor_goto_first_child_for_position_wasm"] = wasmExports["ts_tree_cursor_goto_first_child_for_position_wasm"];
    var _ts_tree_cursor_goto_next_sibling_wasm = Module["_ts_tree_cursor_goto_next_sibling_wasm"] = wasmExports["ts_tree_cursor_goto_next_sibling_wasm"];
    var _ts_tree_cursor_goto_previous_sibling_wasm = Module["_ts_tree_cursor_goto_previous_sibling_wasm"] = wasmExports["ts_tree_cursor_goto_previous_sibling_wasm"];
    var _ts_tree_cursor_goto_descendant_wasm = Module["_ts_tree_cursor_goto_descendant_wasm"] = wasmExports["ts_tree_cursor_goto_descendant_wasm"];
    var _ts_tree_cursor_goto_parent_wasm = Module["_ts_tree_cursor_goto_parent_wasm"] = wasmExports["ts_tree_cursor_goto_parent_wasm"];
    var _ts_tree_cursor_current_node_type_id_wasm = Module["_ts_tree_cursor_current_node_type_id_wasm"] = wasmExports["ts_tree_cursor_current_node_type_id_wasm"];
    var _ts_tree_cursor_current_node_state_id_wasm = Module["_ts_tree_cursor_current_node_state_id_wasm"] = wasmExports["ts_tree_cursor_current_node_state_id_wasm"];
    var _ts_tree_cursor_current_node_is_named_wasm = Module["_ts_tree_cursor_current_node_is_named_wasm"] = wasmExports["ts_tree_cursor_current_node_is_named_wasm"];
    var _ts_tree_cursor_current_node_is_missing_wasm = Module["_ts_tree_cursor_current_node_is_missing_wasm"] = wasmExports["ts_tree_cursor_current_node_is_missing_wasm"];
    var _ts_tree_cursor_current_node_id_wasm = Module["_ts_tree_cursor_current_node_id_wasm"] = wasmExports["ts_tree_cursor_current_node_id_wasm"];
    var _ts_tree_cursor_start_position_wasm = Module["_ts_tree_cursor_start_position_wasm"] = wasmExports["ts_tree_cursor_start_position_wasm"];
    var _ts_tree_cursor_end_position_wasm = Module["_ts_tree_cursor_end_position_wasm"] = wasmExports["ts_tree_cursor_end_position_wasm"];
    var _ts_tree_cursor_start_index_wasm = Module["_ts_tree_cursor_start_index_wasm"] = wasmExports["ts_tree_cursor_start_index_wasm"];
    var _ts_tree_cursor_end_index_wasm = Module["_ts_tree_cursor_end_index_wasm"] = wasmExports["ts_tree_cursor_end_index_wasm"];
    var _ts_tree_cursor_current_field_id_wasm = Module["_ts_tree_cursor_current_field_id_wasm"] = wasmExports["ts_tree_cursor_current_field_id_wasm"];
    var _ts_tree_cursor_current_depth_wasm = Module["_ts_tree_cursor_current_depth_wasm"] = wasmExports["ts_tree_cursor_current_depth_wasm"];
    var _ts_tree_cursor_current_descendant_index_wasm = Module["_ts_tree_cursor_current_descendant_index_wasm"] = wasmExports["ts_tree_cursor_current_descendant_index_wasm"];
    var _ts_tree_cursor_current_node_wasm = Module["_ts_tree_cursor_current_node_wasm"] = wasmExports["ts_tree_cursor_current_node_wasm"];
    var _ts_node_symbol_wasm = Module["_ts_node_symbol_wasm"] = wasmExports["ts_node_symbol_wasm"];
    var _ts_node_field_name_for_child_wasm = Module["_ts_node_field_name_for_child_wasm"] = wasmExports["ts_node_field_name_for_child_wasm"];
    var _ts_node_field_name_for_named_child_wasm = Module["_ts_node_field_name_for_named_child_wasm"] = wasmExports["ts_node_field_name_for_named_child_wasm"];
    var _ts_node_children_by_field_id_wasm = Module["_ts_node_children_by_field_id_wasm"] = wasmExports["ts_node_children_by_field_id_wasm"];
    var _ts_node_first_child_for_byte_wasm = Module["_ts_node_first_child_for_byte_wasm"] = wasmExports["ts_node_first_child_for_byte_wasm"];
    var _ts_node_first_named_child_for_byte_wasm = Module["_ts_node_first_named_child_for_byte_wasm"] = wasmExports["ts_node_first_named_child_for_byte_wasm"];
    var _ts_node_grammar_symbol_wasm = Module["_ts_node_grammar_symbol_wasm"] = wasmExports["ts_node_grammar_symbol_wasm"];
    var _ts_node_child_count_wasm = Module["_ts_node_child_count_wasm"] = wasmExports["ts_node_child_count_wasm"];
    var _ts_node_named_child_count_wasm = Module["_ts_node_named_child_count_wasm"] = wasmExports["ts_node_named_child_count_wasm"];
    var _ts_node_child_wasm = Module["_ts_node_child_wasm"] = wasmExports["ts_node_child_wasm"];
    var _ts_node_named_child_wasm = Module["_ts_node_named_child_wasm"] = wasmExports["ts_node_named_child_wasm"];
    var _ts_node_child_by_field_id_wasm = Module["_ts_node_child_by_field_id_wasm"] = wasmExports["ts_node_child_by_field_id_wasm"];
    var _ts_node_next_sibling_wasm = Module["_ts_node_next_sibling_wasm"] = wasmExports["ts_node_next_sibling_wasm"];
    var _ts_node_prev_sibling_wasm = Module["_ts_node_prev_sibling_wasm"] = wasmExports["ts_node_prev_sibling_wasm"];
    var _ts_node_next_named_sibling_wasm = Module["_ts_node_next_named_sibling_wasm"] = wasmExports["ts_node_next_named_sibling_wasm"];
    var _ts_node_prev_named_sibling_wasm = Module["_ts_node_prev_named_sibling_wasm"] = wasmExports["ts_node_prev_named_sibling_wasm"];
    var _ts_node_descendant_count_wasm = Module["_ts_node_descendant_count_wasm"] = wasmExports["ts_node_descendant_count_wasm"];
    var _ts_node_parent_wasm = Module["_ts_node_parent_wasm"] = wasmExports["ts_node_parent_wasm"];
    var _ts_node_child_with_descendant_wasm = Module["_ts_node_child_with_descendant_wasm"] = wasmExports["ts_node_child_with_descendant_wasm"];
    var _ts_node_descendant_for_index_wasm = Module["_ts_node_descendant_for_index_wasm"] = wasmExports["ts_node_descendant_for_index_wasm"];
    var _ts_node_named_descendant_for_index_wasm = Module["_ts_node_named_descendant_for_index_wasm"] = wasmExports["ts_node_named_descendant_for_index_wasm"];
    var _ts_node_descendant_for_position_wasm = Module["_ts_node_descendant_for_position_wasm"] = wasmExports["ts_node_descendant_for_position_wasm"];
    var _ts_node_named_descendant_for_position_wasm = Module["_ts_node_named_descendant_for_position_wasm"] = wasmExports["ts_node_named_descendant_for_position_wasm"];
    var _ts_node_start_point_wasm = Module["_ts_node_start_point_wasm"] = wasmExports["ts_node_start_point_wasm"];
    var _ts_node_end_point_wasm = Module["_ts_node_end_point_wasm"] = wasmExports["ts_node_end_point_wasm"];
    var _ts_node_start_index_wasm = Module["_ts_node_start_index_wasm"] = wasmExports["ts_node_start_index_wasm"];
    var _ts_node_end_index_wasm = Module["_ts_node_end_index_wasm"] = wasmExports["ts_node_end_index_wasm"];
    var _ts_node_to_string_wasm = Module["_ts_node_to_string_wasm"] = wasmExports["ts_node_to_string_wasm"];
    var _ts_node_children_wasm = Module["_ts_node_children_wasm"] = wasmExports["ts_node_children_wasm"];
    var _ts_node_named_children_wasm = Module["_ts_node_named_children_wasm"] = wasmExports["ts_node_named_children_wasm"];
    var _ts_node_descendants_of_type_wasm = Module["_ts_node_descendants_of_type_wasm"] = wasmExports["ts_node_descendants_of_type_wasm"];
    var _ts_node_is_named_wasm = Module["_ts_node_is_named_wasm"] = wasmExports["ts_node_is_named_wasm"];
    var _ts_node_has_changes_wasm = Module["_ts_node_has_changes_wasm"] = wasmExports["ts_node_has_changes_wasm"];
    var _ts_node_has_error_wasm = Module["_ts_node_has_error_wasm"] = wasmExports["ts_node_has_error_wasm"];
    var _ts_node_is_error_wasm = Module["_ts_node_is_error_wasm"] = wasmExports["ts_node_is_error_wasm"];
    var _ts_node_is_missing_wasm = Module["_ts_node_is_missing_wasm"] = wasmExports["ts_node_is_missing_wasm"];
    var _ts_node_is_extra_wasm = Module["_ts_node_is_extra_wasm"] = wasmExports["ts_node_is_extra_wasm"];
    var _ts_node_parse_state_wasm = Module["_ts_node_parse_state_wasm"] = wasmExports["ts_node_parse_state_wasm"];
    var _ts_node_next_parse_state_wasm = Module["_ts_node_next_parse_state_wasm"] = wasmExports["ts_node_next_parse_state_wasm"];
    var _ts_query_matches_wasm = Module["_ts_query_matches_wasm"] = wasmExports["ts_query_matches_wasm"];
    var _ts_query_captures_wasm = Module["_ts_query_captures_wasm"] = wasmExports["ts_query_captures_wasm"];
    var _memset = Module["_memset"] = wasmExports["memset"];
    var _memcpy = Module["_memcpy"] = wasmExports["memcpy"];
    var _memmove = Module["_memmove"] = wasmExports["memmove"];
    var _iswalpha = Module["_iswalpha"] = wasmExports["iswalpha"];
    var _iswblank = Module["_iswblank"] = wasmExports["iswblank"];
    var _iswdigit = Module["_iswdigit"] = wasmExports["iswdigit"];
    var _iswlower = Module["_iswlower"] = wasmExports["iswlower"];
    var _iswupper = Module["_iswupper"] = wasmExports["iswupper"];
    var _iswxdigit = Module["_iswxdigit"] = wasmExports["iswxdigit"];
    var _memchr = Module["_memchr"] = wasmExports["memchr"];
    var _strlen = Module["_strlen"] = wasmExports["strlen"];
    var _strcmp = Module["_strcmp"] = wasmExports["strcmp"];
    var _strncat = Module["_strncat"] = wasmExports["strncat"];
    var _strncpy = Module["_strncpy"] = wasmExports["strncpy"];
    var _towlower = Module["_towlower"] = wasmExports["towlower"];
    var _towupper = Module["_towupper"] = wasmExports["towupper"];
    var _setThrew = wasmExports["setThrew"];
    var __emscripten_stack_restore = wasmExports["_emscripten_stack_restore"];
    var __emscripten_stack_alloc = wasmExports["_emscripten_stack_alloc"];
    var _emscripten_stack_get_current = wasmExports["emscripten_stack_get_current"];
    var ___wasm_apply_data_relocs = wasmExports["__wasm_apply_data_relocs"];
    Module["setValue"] = setValue;
    Module["getValue"] = getValue;
    Module["UTF8ToString"] = UTF8ToString;
    Module["stringToUTF8"] = stringToUTF8;
    Module["lengthBytesUTF8"] = lengthBytesUTF8;
    Module["AsciiToString"] = AsciiToString;
    Module["stringToUTF16"] = stringToUTF16;
    Module["loadWebAssemblyModule"] = loadWebAssemblyModule;
    function callMain(args2 = []) {
      var entryFunction = resolveGlobalSymbol("main").sym;
      if (!entryFunction) return;
      args2.unshift(thisProgram);
      var argc = args2.length;
      var argv = stackAlloc((argc + 1) * 4);
      var argv_ptr = argv;
      args2.forEach((arg) => {
        LE_HEAP_STORE_U32((argv_ptr >> 2) * 4, stringToUTF8OnStack(arg));
        argv_ptr += 4;
      });
      LE_HEAP_STORE_U32((argv_ptr >> 2) * 4, 0);
      try {
        var ret = entryFunction(argc, argv);
        exitJS(
          ret,
          /* implicit = */
          true
        );
        return ret;
      } catch (e) {
        return handleException(e);
      }
    }
    __name(callMain, "callMain");
    function run(args2 = arguments_) {
      if (runDependencies > 0) {
        dependenciesFulfilled = run;
        return;
      }
      preRun();
      if (runDependencies > 0) {
        dependenciesFulfilled = run;
        return;
      }
      function doRun() {
        Module["calledRun"] = true;
        if (ABORT) return;
        initRuntime();
        preMain();
        readyPromiseResolve(Module);
        Module["onRuntimeInitialized"]?.();
        var noInitialRun = Module["noInitialRun"];
        if (!noInitialRun) callMain(args2);
        postRun();
      }
      __name(doRun, "doRun");
      if (Module["setStatus"]) {
        Module["setStatus"]("Running...");
        setTimeout(() => {
          setTimeout(() => Module["setStatus"](""), 1);
          doRun();
        }, 1);
      } else {
        doRun();
      }
    }
    __name(run, "run");
    if (Module["preInit"]) {
      if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]];
      while (Module["preInit"].length > 0) {
        Module["preInit"].pop()();
      }
    }
    run();
    moduleRtn = readyPromise;
    return moduleRtn;
  };
})();
var tree_sitter_default = Module2;
var Module3 = null;
async function initializeBinding(moduleOptions) {
  if (!Module3) {
    Module3 = await tree_sitter_default(moduleOptions);
  }
  return Module3;
}
__name(initializeBinding, "initializeBinding");
function checkModule() {
  return !!Module3;
}
__name(checkModule, "checkModule");
var TRANSFER_BUFFER;
var LANGUAGE_VERSION;
var MIN_COMPATIBLE_VERSION;
var Parser = class {
  static {
    __name(this, "Parser");
  }
  /** @internal */
  [0] = 0;
  // Internal handle for WASM
  /** @internal */
  [1] = 0;
  // Internal handle for WASM
  /** @internal */
  logCallback = null;
  /** The parser's current language. */
  language = null;
  /**
   * This must always be called before creating a Parser.
   *
   * You can optionally pass in options to configure the WASM module, the most common
   * one being `locateFile` to help the module find the `.wasm` file.
   */
  static async init(moduleOptions) {
    setModule(await initializeBinding(moduleOptions));
    TRANSFER_BUFFER = C._ts_init();
    LANGUAGE_VERSION = C.getValue(TRANSFER_BUFFER, "i32");
    MIN_COMPATIBLE_VERSION = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
  }
  /**
   * Create a new parser.
   */
  constructor() {
    this.initialize();
  }
  /** @internal */
  initialize() {
    if (!checkModule()) {
      throw new Error("cannot construct a Parser before calling `init()`");
    }
    C._ts_parser_new_wasm();
    this[0] = C.getValue(TRANSFER_BUFFER, "i32");
    this[1] = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
  }
  /** Delete the parser, freeing its resources. */
  delete() {
    C._ts_parser_delete(this[0]);
    C._free(this[1]);
    this[0] = 0;
    this[1] = 0;
  }
  /**
   * Set the language that the parser should use for parsing.
   *
   * If the language was not successfully assigned, an error will be thrown.
   * This happens if the language was generated with an incompatible
   * version of the Tree-sitter CLI. Check the language's version using
   * {@link Language#version} and compare it to this library's
   * {@link LANGUAGE_VERSION} and {@link MIN_COMPATIBLE_VERSION} constants.
   */
  setLanguage(language) {
    let address;
    if (!language) {
      address = 0;
      this.language = null;
    } else if (language.constructor === Language) {
      address = language[0];
      const version = C._ts_language_version(address);
      if (version < MIN_COMPATIBLE_VERSION || LANGUAGE_VERSION < version) {
        throw new Error(
          `Incompatible language version ${version}. Compatibility range ${MIN_COMPATIBLE_VERSION} through ${LANGUAGE_VERSION}.`
        );
      }
      this.language = language;
    } else {
      throw new Error("Argument must be a Language");
    }
    C._ts_parser_set_language(this[0], address);
    return this;
  }
  /**
   * Parse a slice of UTF8 text.
   *
   * @param {string | ParseCallback} callback - The UTF8-encoded text to parse or a callback function.
   *
   * @param {Tree | null} [oldTree] - A previous syntax tree parsed from the same document. If the text of the
   *   document has changed since `oldTree` was created, then you must edit `oldTree` to match
   *   the new text using {@link Tree#edit}.
   *
   * @param {ParseOptions} [options] - Options for parsing the text.
   *  This can be used to set the included ranges, or a progress callback.
   *
   * @returns {Tree | null} A {@link Tree} if parsing succeeded, or `null` if:
   *  - The parser has not yet had a language assigned with {@link Parser#setLanguage}.
   *  - The progress callback returned true.
   */
  parse(callback, oldTree, options2) {
    if (typeof callback === "string") {
      C.currentParseCallback = (index) => callback.slice(index);
    } else if (typeof callback === "function") {
      C.currentParseCallback = callback;
    } else {
      throw new Error("Argument must be a string or a function");
    }
    if (options2?.progressCallback) {
      C.currentProgressCallback = options2.progressCallback;
    } else {
      C.currentProgressCallback = null;
    }
    if (this.logCallback) {
      C.currentLogCallback = this.logCallback;
      C._ts_parser_enable_logger_wasm(this[0], 1);
    } else {
      C.currentLogCallback = null;
      C._ts_parser_enable_logger_wasm(this[0], 0);
    }
    let rangeCount = 0;
    let rangeAddress = 0;
    if (options2?.includedRanges) {
      rangeCount = options2.includedRanges.length;
      rangeAddress = C._calloc(rangeCount, SIZE_OF_RANGE);
      let address = rangeAddress;
      for (let i2 = 0; i2 < rangeCount; i2++) {
        marshalRange(address, options2.includedRanges[i2]);
        address += SIZE_OF_RANGE;
      }
    }
    const treeAddress = C._ts_parser_parse_wasm(
      this[0],
      this[1],
      oldTree ? oldTree[0] : 0,
      rangeAddress,
      rangeCount
    );
    if (!treeAddress) {
      C.currentParseCallback = null;
      C.currentLogCallback = null;
      C.currentProgressCallback = null;
      return null;
    }
    if (!this.language) {
      throw new Error("Parser must have a language to parse");
    }
    const result = new Tree(INTERNAL, treeAddress, this.language, C.currentParseCallback);
    C.currentParseCallback = null;
    C.currentLogCallback = null;
    C.currentProgressCallback = null;
    return result;
  }
  /**
   * Instruct the parser to start the next parse from the beginning.
   *
   * If the parser previously failed because of a timeout, cancellation,
   * or callback, then by default, it will resume where it left off on the
   * next call to {@link Parser#parse} or other parsing functions.
   * If you don't want to resume, and instead intend to use this parser to
   * parse some other document, you must call `reset` first.
   */
  reset() {
    C._ts_parser_reset(this[0]);
  }
  /** Get the ranges of text that the parser will include when parsing. */
  getIncludedRanges() {
    C._ts_parser_included_ranges_wasm(this[0]);
    const count = C.getValue(TRANSFER_BUFFER, "i32");
    const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
    const result = new Array(count);
    if (count > 0) {
      let address = buffer;
      for (let i2 = 0; i2 < count; i2++) {
        result[i2] = unmarshalRange(address);
        address += SIZE_OF_RANGE;
      }
      C._free(buffer);
    }
    return result;
  }
  /**
   * @deprecated since version 0.25.0, prefer passing a progress callback to {@link Parser#parse}
   *
   * Get the duration in microseconds that parsing is allowed to take.
   *
   * This is set via {@link Parser#setTimeoutMicros}.
   */
  getTimeoutMicros() {
    return C._ts_parser_timeout_micros(this[0]);
  }
  /**
   * @deprecated since version 0.25.0, prefer passing a progress callback to {@link Parser#parse}
   *
   * Set the maximum duration in microseconds that parsing should be allowed
   * to take before halting.
   *
   * If parsing takes longer than this, it will halt early, returning `null`.
   * See {@link Parser#parse} for more information.
   */
  setTimeoutMicros(timeout) {
    C._ts_parser_set_timeout_micros(this[0], 0, timeout);
  }
  /** Set the logging callback that a parser should use during parsing. */
  setLogger(callback) {
    if (!callback) {
      this.logCallback = null;
    } else if (typeof callback !== "function") {
      throw new Error("Logger callback must be a function");
    } else {
      this.logCallback = callback;
    }
    return this;
  }
  /** Get the parser's current logger. */
  getLogger() {
    return this.logCallback;
  }
};

// src/parser/rustParser.ts
var initialized;
async function loadRustLanguage(wasmPath, runtimeWasmPath) {
  initialized ??= (async () => {
    await Parser.init({ locateFile: (scriptName, directory) => runtimeWasmPath ?? path.join(directory, scriptName) });
    return Language.load(wasmPath);
  })();
  return initialized;
}
async function parseRust(uri, source, wasmPath, runtimeWasmPath) {
  try {
    const language = await loadRustLanguage(wasmPath, runtimeWasmPath);
    const parser = new Parser();
    parser.setLanguage(language);
    const tree = parser.parse(source);
    if (!tree) return { uri, source, error: "Tree-sitter returned no syntax tree." };
    return { uri, source, tree, error: tree.rootNode.hasError ? "Rust syntax tree contains parse errors." : void 0 };
  } catch (error) {
    return { uri, source, error: error instanceof Error ? error.message : String(error) };
  }
}

// src/parser/rustAst.ts
init_importMetaShim();
function descendants(node, type) {
  return node.descendantsOfType(type).filter((child) => child !== null);
}
function nodeText(node) {
  return node?.text ?? "";
}
function field(node, name2) {
  return node.childForFieldName(name2) ?? void 0;
}

// src/analysis/complexity.ts
init_importMetaShim();
function sourceComplexity(functionNode) {
  const decisions = functionNode.descendantsOfType("if_expression").length + functionNode.descendantsOfType("for_expression").length + functionNode.descendantsOfType("while_expression").length + functionNode.descendantsOfType("loop_expression").length + functionNode.descendantsOfType("match_arm").length;
  const booleanOperators = functionNode.descendantsOfType("binary_expression").filter((node) => node !== null && (node.text.includes("&&") || node.text.includes("||"))).length;
  return 1 + decisions + booleanOperators;
}

// src/discovery/frameworkDetector.ts
init_importMetaShim();
function detectFramework(source, uri) {
  const evidence = [];
  const add = (framework, confidence, matches2) => {
    const found = matches2.filter((match) => source.includes(match));
    if (found.length) {
      const first = found[0];
      const index = source.indexOf(first);
      const before = source.slice(0, index).split(/\r?\n/);
      const location3 = { uri, startLine: before.length, startColumn: before.at(-1).length, endLine: before.length, endColumn: before.at(-1).length + first.length };
      evidence.push({ framework, confidence, evidence: found.map((description) => ({ description, location: location3 })), location: location3 });
    }
  };
  if (/anchor[-_]lang|anchor_lang::|anchor_spl::/.test(source)) add("anchor", 0.98, ["anchor-lang", "anchor_lang", "#[program]", "#[derive(Accounts)]"]);
  add("pinocchio", 0.95, ["pinocchio", "AccountView", "InstructionContext", "program_entrypoint!", "lazy_program_entrypoint!", "process_entrypoint"]);
  add("native-solana", 0.9, ["solana_program", "solana-program", "entrypoint!", "process_instruction"]);
  add("steel", 0.8, ["steel", "account!", "instruction!"]);
  add("quasar", 0.78, ["quasar-lang", "quasar-spl", "quasar::"]);
  if (!evidence.length && /(invoke|AccountInfo|process_instruction|entrypoint)/.test(source)) {
    const index = source.search(/entrypoint|AccountInfo|process_instruction/);
    const before = source.slice(0, index).split(/\r?\n/);
    const location3 = { uri, startLine: before.length, startColumn: before.at(-1).length, endLine: before.length, endColumn: before.at(-1).length + 1 };
    evidence.push({ framework: "native-or-custom", confidence: 0.55, evidence: [{ description: "generic Solana entrypoint/account signal", location: location3 }], location: location3 });
  }
  return evidence;
}

// src/adapters/anchorAdapter.ts
init_importMetaShim();

// src/utils/text.ts
init_importMetaShim();
function countLines(source) {
  const lines = source.split(/\r?\n/);
  let blankLines = 0, commentLines = 0, codeLines = 0, docCommentLines = 0;
  let blockDepth = 0, blockDoc = false;
  let string4;
  let rawHashes = 0, escaped = false;
  let todoCount = 0, fixmeCount = 0, hackCount = 0;
  for (const line of lines) {
    let hasCode = false, hasComment = false, hasDoc = blockDepth > 0 && blockDoc;
    let commentText = "";
    for (let index = 0; index < line.length; index++) {
      const current = line[index], next = line[index + 1];
      if (string4 === "raw") {
        if (current === '"' && line.slice(index + 1, index + 1 + rawHashes) === "#".repeat(rawHashes)) {
          index += rawHashes;
          string4 = void 0;
        }
        continue;
      }
      if (string4) {
        if (escaped) escaped = false;
        else if (current === "\\") escaped = true;
        else if (string4 === "normal" && current === '"' || string4 === "char" && current === "'") string4 = void 0;
        continue;
      }
      if (blockDepth > 0) {
        hasComment = true;
        commentText += current;
        if (current === "/" && next === "*") {
          blockDepth++;
          index++;
          commentText += next;
          continue;
        }
        if (current === "*" && next === "/") {
          blockDepth--;
          index++;
          commentText += next;
          if (blockDepth === 0) blockDoc = false;
          continue;
        }
        continue;
      }
      if (current === "/" && next === "/") {
        hasComment = true;
        const text = line.slice(index + 2);
        hasDoc ||= text.startsWith("/") || text.startsWith("!");
        commentText += text;
        break;
      }
      if (current === "/" && next === "*") {
        hasComment = true;
        blockDepth = 1;
        blockDoc = line[index + 2] === "*" || line[index + 2] === "!";
        hasDoc ||= blockDoc;
        index++;
        continue;
      }
      const raw = /^(?:br|rb|r)(#+)?"/.exec(line.slice(index));
      if (raw) {
        hasCode = true;
        string4 = "raw";
        rawHashes = raw[1]?.length ?? 0;
        index += raw[0].length - 1;
        continue;
      }
      if (current === "b" && next === '"' || current === '"') {
        hasCode = true;
        string4 = "normal";
        if (current === "b") index++;
        continue;
      }
      if (current === "'" && isCharLiteral(line, index)) {
        hasCode = true;
        string4 = "char";
        continue;
      }
      if (!/\s/.test(current)) hasCode = true;
    }
    todoCount += occurrences(commentText, /\bTODO\b/gi);
    fixmeCount += occurrences(commentText, /\bFIXME\b/gi);
    hackCount += occurrences(commentText, /\bHACK\b/gi);
    if (hasDoc) docCommentLines++;
    if (!hasCode && !hasComment && !line.trim()) blankLines++;
    else if (hasCode) codeLines++;
    else commentLines++;
  }
  return { lines: lines.length, blankLines, commentLines, codeLines, docCommentLines, todoCount, fixmeCount, hackCount };
}
function splitRustExpressions(value) {
  const result = [];
  let start2 = 0;
  const stack = [];
  let quote = "";
  let escaped = false;
  const pairs = { "(": ")", "[": "]", "{": "}" };
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" && /^(?:\\.|[^'\\])'/.test(value.slice(index + 1))) {
      quote = char;
      continue;
    }
    if (pairs[char]) stack.push(pairs[char]);
    else if (stack.at(-1) === char) stack.pop();
    else if (char === "," && !stack.length) {
      result.push(value.slice(start2, index).trim());
      start2 = index + 1;
    }
  }
  result.push(value.slice(start2).trim());
  return result.filter(Boolean);
}
function occurrences(value, pattern) {
  return [...value.matchAll(pattern)].length;
}
function isCharLiteral(line, index) {
  const rest = line.slice(index + 1);
  if (/^[A-Za-z_][A-Za-z0-9_]*\b/.test(rest) && !rest.startsWith("'")) return false;
  return /^(?:\\.|[^'\\])'/.test(rest);
}

// src/idl/discriminator.ts
init_importMetaShim();
var import_node_crypto = require("node:crypto");
function anchorDiscriminator(namespace, name2) {
  return `[${[...(0, import_node_crypto.createHash)("sha256").update(`${namespace}:${name2.replace(/^r#/, "")}`).digest().subarray(0, 8)].join(",")}]`;
}
function resolveRustDiscriminator(expression) {
  if (!expression) return void 0;
  const value = expression.trim().replace(/^&\s*/, "");
  const integer = rustInteger(value);
  if (integer !== void 0 && integer >= 0 && integer <= 255) return { value: `[${integer}]`, resolved: true };
  const array2 = /^\[([\s\S]*)\]$/.exec(value);
  if (array2) {
    const values = array2[1].split(",").map((item) => item.trim()).filter(Boolean).map(rustInteger);
    if (values.every((item) => item !== void 0 && item >= 0 && item <= 255)) return { value: `[${values.join(",")}]`, resolved: true };
  }
  const bytes = /^b"((?:\\.|[^"\\])*)"$/.exec(value)?.[1];
  if (bytes !== void 0) {
    const decoded = decodeRustByteString(bytes);
    if (decoded) return { value: `[${decoded.join(",")}]`, resolved: true };
  }
  return { value, resolved: false };
}
function isResolvedDiscriminator(value) {
  return !!value && (/^\[(?:\d+,?)*\]$/.test(value.replace(/\s+/g, "")) || rustInteger(value) !== void 0);
}
function rustInteger(value) {
  const normalized = value.trim().replace(/_(?=[0-9a-f])/gi, "").replace(/(?:u|i)(?:8|16|32|64|128|size)$/i, "");
  if (!/^(?:0x[0-9a-f]+|0o[0-7]+|0b[01]+|\d+)$/i.test(normalized)) return void 0;
  const result = Number(BigInt(normalized));
  return Number.isSafeInteger(result) ? result : void 0;
}
function decodeRustByteString(value) {
  const output2 = [];
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (char !== "\\") {
      if (char.charCodeAt(0) > 127) return void 0;
      output2.push(char.charCodeAt(0));
      continue;
    }
    const escape = value[++index];
    if (escape === void 0) return void 0;
    const simple = { n: 10, r: 13, t: 9, "0": 0, "\\": 92, '"': 34 };
    if (simple[escape] !== void 0) {
      output2.push(simple[escape]);
      continue;
    }
    if (escape === "x") {
      const hex = value.slice(index + 1, index + 3);
      if (!/^[0-9a-f]{2}$/i.test(hex)) return void 0;
      output2.push(Number.parseInt(hex, 16));
      index += 2;
      continue;
    }
    return void 0;
  }
  return output2;
}

// src/adapters/anchorAdapter.ts
function enrichAnchor(root, uri) {
  const instructions = [];
  const accounts = [];
  for (const module2 of descendants(root, "mod_item")) {
    if (!attributesFor(module2).includes("#[program]") && !module2.text.includes("#[program]")) continue;
    for (const fn of descendants(module2, "function_item")) {
      const name2 = nodeText(field(fn, "name"));
      const location3 = loc(uri, fn);
      const instructionAttributes = attributesFor(fn);
      const customDiscriminator = attributeArgument(instructionAttributes, "instruction", "discriminator");
      const discriminator = customDiscriminator ? resolveRustDiscriminator(customDiscriminator)?.value ?? customDiscriminator : anchorDiscriminator("global", name2);
      const generic = /Context\s*<([^>]*)/.exec(fn.text)?.[1];
      const context = generic?.split(",").map((part) => part.trim().replace(/<.*$/, "")).reverse().find((part) => /^[A-Z][A-Za-z0-9_]*$/.test(part));
      const argumentsNode = field(fn, "parameters");
      const args2 = argumentsNode ? descendants(argumentsNode, "parameter").filter((parameter) => !/Context\s*</.test(parameter.text)).map((parameter) => ({ name: parameter.childForFieldName("pattern")?.text ?? parameter.namedChildren[0]?.text ?? "arg", type: parameter.childForFieldName("type")?.text })) : [];
      instructions.push({ id: `instruction:${uri}:${name2}:${location3.startLine}`, name: name2, handler: name2, discriminator, location: location3, confidence: 0.98, evidence: [{ description: "#[program] module function", location: location3 }, { description: customDiscriminator ? `Anchor custom instruction discriminator ${customDiscriminator}` : `Anchor default sha256(global:${name2}) discriminator`, location: location3 }], functionName: name2, contextType: context, arguments: args2, returns: instructionReturnType(fn) });
    }
  }
  for (const struct of descendants(root, "struct_item")) {
    if (!/derive\s*\([^)]*\bAccounts\b/.test(attributesFor(struct)) && !struct.text.includes("derive(Accounts)")) continue;
    const contextType = nodeText(field(struct, "name"));
    for (const fieldNode of descendants(struct, "field_declaration")) {
      const type = nodeText(field(fieldNode, "type"));
      const name2 = nodeText(field(fieldNode, "name"));
      const attributes = attributesFor(fieldNode);
      const constraints = parseConstraints(attributes, uri, fieldNode);
      const relations = accountRelations(constraints);
      const normalizedType = type.replace(/^\s*(?:Option\s*<\s*)?/, "").replace(/^\s*&\s*'?[A-Za-z0-9_]*\s*(?:mut\s+)?/, "").trim();
      const wrapperType = /^([A-Za-z_][A-Za-z0-9_:]*)/.exec(normalizedType)?.[1]?.split("::").at(-1);
      const stateType = /^(?:Account|BorshAccount|AccountLoader|InterfaceAccount|Program|Interface|Sysvar)\s*</.test(normalizedType) ? genericArguments(normalizedType).at(-1)?.replace(/>+$/, "").trim() : void 0;
      const lifecycle = [];
      if (has(constraints, "init") || has(constraints, "init_if_needed")) lifecycle.push("init", "create", "write");
      else if (has(constraints, "mut")) lifecycle.push("write");
      else lifecycle.push("read");
      if (has(constraints, "realloc")) lifecycle.push("realloc");
      if (has(constraints, "close")) lifecycle.push("close");
      const location3 = loc(uri, fieldNode);
      accounts.push({
        id: `account:${uri}:${fieldNode.startPosition.row + 1}:${name2}`,
        name: name2,
        type,
        wrapperType,
        stateType,
        contextType,
        signer: has(constraints, "signer") || wrapperType === "Signer",
        writable: has(constraints, "mut") || has(constraints, "init") || has(constraints, "init_if_needed") || has(constraints, "realloc") || has(constraints, "close"),
        executable: has(constraints, "executable") || wrapperType === "Program" || wrapperType === "Interface",
        raw: wrapperType === "AccountInfo",
        unchecked: wrapperType === "UncheckedAccount",
        optional: /^\s*Option\s*</.test(type),
        ownerExpectation: valueOf(constraints, "owner") ?? (wrapperType === "SystemAccount" ? "system-program" : void 0),
        addressExpectation: valueOf(constraints, "address") ?? (wrapperType === "Program" || wrapperType === "Interface" ? stateType : wrapperType === "Sysvar" ? `sysvar:${stateType ?? "unknown"}` : void 0),
        ownerValidated: !!valueOf(constraints, "owner") || wrapperType === "SystemAccount" || !!stateType && ["Account", "BorshAccount", "AccountLoader", "InterfaceAccount"].includes(wrapperType ?? ""),
        addressValidated: !!valueOf(constraints, "address") || wrapperType === "Program" || wrapperType === "Interface" || wrapperType === "Sysvar",
        constraints,
        relations,
        lifecycle: [...new Set(lifecycle)],
        serialization: stateType ? ["anchor"] : [],
        location: location3,
        confidence: 0.97,
        evidence: [{ description: "#[derive(Accounts)] field", location: loc(uri, struct) }]
      });
    }
  }
  return { instructions, accounts };
}
function accountRelations(constraints) {
  const mapping = {
    has_one: "has-one",
    payer: "payer",
    close: "close-destination",
    "realloc::payer": "realloc-payer",
    "seeds::program": "seed-program",
    "token::mint": "token-mint",
    "token::authority": "token-authority",
    "token::token_program": "token-program",
    "mint::authority": "mint-authority",
    "mint::freeze_authority": "mint-freeze-authority",
    "mint::token_program": "token-program",
    "associated_token::mint": "associated-token-mint",
    "associated_token::authority": "associated-token-authority",
    "associated_token::token_program": "associated-token-program"
  };
  const relations = [];
  for (const constraint of constraints) {
    if (!constraint.expression) continue;
    let kind = mapping[constraint.kind];
    if (!kind && constraint.kind.startsWith("extensions::")) kind = /(?:authority|delegate)$/.test(constraint.kind) ? "extension-authority" : /program_id$/.test(constraint.kind) ? "extension-program" : /(?:address|group_address|member_address|metadata_address)$/.test(constraint.kind) ? "extension-address" : void 0;
    if (kind) relations.push({ kind, target: constraint.expression, constraint: constraint.kind, location: constraint.location });
  }
  return [...new Map(relations.map((item) => [`${item.kind}:${item.target}:${item.constraint}`, item])).values()];
}
function parseConstraints(attributes, uri, node) {
  const result = [];
  for (const body2 of accountAttributeBodies(attributes)) {
    for (const raw of splitRustExpressions(body2)) {
      const key = raw.split("=")[0].trim().replace(/\s*@.*$/, "");
      const normalized = normalizeConstraint(key);
      if (!normalized) continue;
      result.push({ kind: normalized, expression: raw.includes("=") ? raw.slice(raw.indexOf("=") + 1).trim().replace(/\s*@.*$/, "") : void 0, location: loc(uri, node) });
    }
  }
  return [...new Map(result.map((item) => [`${item.kind}:${item.expression ?? ""}`, item])).values()];
}
function accountAttributeBodies(value) {
  const bodies = [];
  let search = 0;
  while (true) {
    const start2 = value.indexOf("#[account", search);
    if (start2 < 0) break;
    const open = value.indexOf("(", start2);
    if (open < 0) break;
    let depth = 1, quote = "", escaped = false, index = open + 1;
    for (; index < value.length && depth > 0; index++) {
      const char = value[index];
      if (quote) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === quote) quote = "";
        continue;
      }
      if (char === '"') quote = char;
      else if (char === "(") depth++;
      else if (char === ")") depth--;
    }
    if (depth === 0) bodies.push(value.slice(open + 1, index - 1));
    search = Math.max(index, start2 + 2);
  }
  return bodies;
}
function normalizeConstraint(key) {
  const exact = /* @__PURE__ */ new Set(["mut", "signer", "seeds", "bump", "has_one", "owner", "address", "constraint", "init_if_needed", "init", "zero", "close", "realloc", "payer", "space", "executable", "dup", "discriminator"]);
  if (exact.has(key)) return key;
  const functionConstraint = /^(has_one|constraints?|token|mint|associated_token|extensions|init)\s*\(/.exec(key)?.[1];
  if (functionConstraint) return functionConstraint === "constraints" ? "constraint" : functionConstraint;
  if (/^(?:realloc|seeds|token|mint|associated_token|extensions)(?:::[A-Za-z0-9_]+)+$/.test(key)) return key;
  return void 0;
}
function genericArguments(type) {
  const match = /<([\s\S]*)>/.exec(type);
  return match ? splitRustExpressions(match[1]) : [];
}
function valueOf(items, kind) {
  return items.find((item) => item.kind === kind)?.expression;
}
function has(items, kind) {
  return items.some((item) => item.kind === kind);
}
function instructionReturnType(fn) {
  const raw = (nodeText(field(fn, "return_type")) || fn.children.find((child) => child?.type === "return_type")?.text || "").replace(/^\s*->\s*/, "").trim();
  const result = /(?:^|::)Result\s*<([\s\S]*)>\s*$/.exec(raw);
  const success = result ? splitRustExpressions(result[1])[0]?.trim() : void 0;
  return success;
}
function attributesFor(node) {
  const values = [];
  let sibling = node.previousNamedSibling;
  while (sibling?.type === "attribute_item") {
    values.unshift(sibling.text);
    sibling = sibling.previousNamedSibling;
  }
  return values.join("\n");
}
function attributeArgument(attributes, attribute, argument) {
  const marker = `#[${attribute}`;
  let search = 0;
  while ((search = attributes.indexOf(marker, search)) >= 0) {
    const open = attributes.indexOf("(", search + marker.length);
    if (open < 0) return void 0;
    let depth = 1, quote = "", escaped = false, index = open + 1;
    for (; index < attributes.length && depth > 0; index++) {
      const char = attributes[index];
      if (quote) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === quote) quote = "";
        continue;
      }
      if (char === '"' || char === "'") quote = char;
      else if (char === "(") depth++;
      else if (char === ")") depth--;
    }
    if (depth === 0) for (const item of splitRustExpressions(attributes.slice(open + 1, index - 1))) {
      const match = new RegExp(`^${argument}\\s*=\\s*([\\s\\S]+)$`).exec(item.trim());
      if (match) return match[1].trim();
    }
    search = Math.max(index, search + marker.length);
  }
  return void 0;
}
function loc(uri, node) {
  return { uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column };
}

// src/adapters/nativeAdapter.ts
init_importMetaShim();
function enrichNative(source) {
  const evidence = ["process_instruction", "entrypoint!", "AccountInfo"].filter((value) => source.includes(value));
  return evidence.length ? [{ framework: "native-solana", confidence: 0.85, evidence: evidence.map((description) => ({ description })) }] : [];
}

// src/adapters/pinocchioAdapter.ts
init_importMetaShim();
function enrichPinocchio(source) {
  const evidence = ["pinocchio::", "AccountView", "InstructionContext", "entrypoint!", "program_entrypoint!", "lazy_program_entrypoint!", "process_entrypoint", "no_allocator!"].filter((value) => source.includes(value));
  return evidence.length ? [{ framework: "pinocchio", confidence: 0.9, evidence: evidence.map((description) => ({ description })) }] : [];
}

// src/adapters/steelAdapter.ts
init_importMetaShim();
function enrichSteel(source) {
  const evidence = ["steel", "account!", "instruction!", "entrypoint!", "process_instruction"].filter((pattern) => source.includes(pattern));
  return evidence.length && /steel|account!|instruction!/.test(source) ? [{ framework: "steel", confidence: 0.8, evidence: evidence.map((description) => ({ description })) }] : [];
}
function enrichSteelSemantics(root, uri) {
  const instructions = [];
  const accounts = [];
  for (const macro of descendants(root, "macro_invocation")) {
    if (/^instruction!/.test(macro.text)) {
      const parts2 = macroArguments(macro.text);
      const name2 = parts2[1] ?? parts2[0];
      const discriminator = parts2[0] && name2 ? enumDiscriminator(root, parts2[0], name2) : void 0;
      const arguments_2 = name2 ? structArguments(root, name2) : [];
      if (name2) instructions.push({ id: `instruction:${uri}:steel:${name2}:${macro.startPosition.row + 1}`, name: name2, contextType: parts2[0], discriminator, arguments: arguments_2, location: loc2(uri, macro), confidence: 0.92, evidence: [{ description: `Steel instruction! metadata${parts2[0] ? ` for ${parts2[0]}` : ""}`, location: loc2(uri, macro) }] });
    }
    if (/^account!/.test(macro.text)) {
      const parts2 = macroArguments(macro.text);
      const name2 = parts2[1] ?? parts2[0];
      const discriminator = parts2[0] && name2 ? enumDiscriminator(root, parts2[0], name2) : void 0;
      if (name2) accounts.push({ id: `account:${uri}:steel:${name2}:${macro.startPosition.row + 1}`, name: name2, type: name2, wrapperType: "SteelAccount", stateType: name2, serialization: ["zero-copy"], constraints: discriminator ? [{ kind: "discriminator", expression: discriminator, location: loc2(uri, macro) }] : [], location: loc2(uri, macro), confidence: 0.92, evidence: [{ description: `Steel account! metadata${parts2[0] ? ` for ${parts2[0]}` : ""}`, location: loc2(uri, macro) }] });
    }
  }
  return { instructions, accounts };
}
function macroArguments(text) {
  const open = text.indexOf("(");
  const close = text.lastIndexOf(")");
  return open >= 0 && close > open ? splitRustExpressions(text.slice(open + 1, close)).map((item) => item.trim()).filter(Boolean) : [];
}
function enumDiscriminator(root, enumName, variantName) {
  const enumeration = descendants(root, "enum_item").find((item) => item.childForFieldName("name")?.text === enumName);
  const variant = enumeration && descendants(enumeration, "enum_variant").find((item) => item.childForFieldName("name")?.text === variantName);
  return variant ? /=\s*([^,}]+)/.exec(variant.text)?.[1]?.trim() : void 0;
}
function structArguments(root, name2) {
  const struct = descendants(root, "struct_item").find((item) => item.childForFieldName("name")?.text === name2);
  return struct ? descendants(struct, "field_declaration").map((item) => ({ name: item.childForFieldName("name")?.text ?? "field", type: item.childForFieldName("type")?.text })) : [];
}
function loc2(uri, node) {
  return { uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column };
}

// src/adapters/quasarAdapter.ts
init_importMetaShim();
function enrichQuasar(source) {
  const evidence = ["quasar-lang", "quasar_lang", "quasar-spl", "Quasar.toml", "quasar::", "derive(Accounts)"].filter((pattern) => source.includes(pattern));
  return evidence.length && /quasar[-_]lang|quasar-spl|quasar::/.test(source) ? [{ framework: "quasar", confidence: 0.78, evidence: evidence.map((description) => ({ description })) }] : [];
}
function enrichQuasarSemantics(root, uri) {
  const accounts = [];
  const instructions = [];
  if (!/quasar[-_:]|quasar_lang/i.test(root.text)) return { instructions, accounts };
  for (const module2 of descendants(root, "mod_item")) {
    if (!attributesFor2(module2).includes("#[program]")) continue;
    for (const fn of descendants(module2, "function_item")) {
      const name2 = nodeText(field(fn, "name"));
      const contextType = /\bCtx(?:WithRemaining)?\s*<\s*([A-Za-z_][A-Za-z0-9_]*)/.exec(fn.text)?.[1];
      const attributes = attributesFor2(fn);
      const discriminatorExpression = attributeArgument2(attributes, "instruction", "discriminator");
      const discriminator = resolveRustDiscriminator(discriminatorExpression)?.value;
      const parameters = field(fn, "parameters");
      const arguments_2 = parameters ? descendants(parameters, "parameter").filter((parameter) => !/\bCtx(?:WithRemaining)?\s*</.test(parameter.text)).map((parameter) => ({ name: parameter.childForFieldName("pattern")?.text ?? parameter.namedChildren[0]?.text ?? "arg", type: parameter.childForFieldName("type")?.text })) : [];
      const withRemaining = /\bCtxWithRemaining\s*</.test(fn.text);
      const parsedRemaining = /remaining_accounts\s*\(\s*\)\s*\.\s*parse\s*::\s*<\s*([^,>]+)\s*,\s*(\d+)\s*>/.exec(fn.text);
      const remainingAccounts = withRemaining ? { kind: "append", name: "remainingAccounts", min: 0, max: null, item: { clientType: "accountMeta", signer: "input", writable: "input" }, policy: { position: "afterDeclaredAccounts", order: "preserveInput" }, onChainType: parsedRemaining?.[1]?.trim(), onChainMax: parsedRemaining ? Number(parsedRemaining[2]) : void 0, evidence: [{ description: parsedRemaining ? `CtxWithRemaining parsed as Remaining<${parsedRemaining[1].trim()}, ${parsedRemaining[2]}>` : "CtxWithRemaining accepts an input-preserving trailing account list", location: loc3(uri, fn) }] } : void 0;
      if (name2) instructions.push({ id: `instruction:${uri}:quasar:${name2}:${fn.startPosition.row + 1}`, name: name2, handler: name2, functionName: name2, contextType, discriminator, arguments: arguments_2, returns: instructionReturnType2(fn), remainingAccounts, location: loc3(uri, fn), confidence: discriminator ? 0.97 : 0.9, evidence: [{ description: "Quasar #[program] handler", location: loc3(uri, fn) }, ...discriminatorExpression ? [{ description: `Quasar instruction discriminator ${discriminatorExpression}`, location: loc3(uri, fn) }] : [], ...remainingAccounts?.evidence ?? []] });
    }
  }
  const seedDefinitions = /* @__PURE__ */ new Map();
  for (const struct of descendants(root, "struct_item")) {
    const body2 = /#\[seeds\s*\(([\s\S]*?)\)\]/.exec(attributesFor2(struct))?.[1];
    if (!body2) continue;
    const parts2 = splitRustExpressions(body2);
    const constants = [];
    const parameters = [];
    for (const part of parts2) {
      const parameter = /^([A-Za-z_][A-Za-z0-9_]*)\s*:/.exec(part)?.[1];
      if (parameter) parameters.push(parameter);
      else constants.push(part.trim());
    }
    seedDefinitions.set(nodeText(field(struct, "name")), { constants, parameters });
  }
  for (const struct of descendants(root, "struct_item")) {
    const attrs = attributesFor2(struct);
    if (!/derive\s*\(\s*Accounts|AccountView|zero_copy/i.test(`${attrs}
${struct.text}`)) continue;
    for (const fieldNode of descendants(struct, "field_declaration")) {
      const name2 = nodeText(field(fieldNode, "name"));
      const type = nodeText(field(fieldNode, "type"));
      const fieldAttributes = attributesFor2(fieldNode);
      const constraints = parseConstraints2(fieldAttributes, uri, fieldNode);
      const relations = accountRelations2(constraints);
      const optional = /^\s*Option\s*</.test(type);
      const optionalInner = optional ? type.replace(/^\s*Option\s*<\s*/, "").replace(/>\s*$/, "") : type;
      const mutableReference = /^\s*&\s*'?[A-Za-z0-9_]*\s+mut\b/.test(optionalInner);
      const normalizedType = optionalInner.replace(/^\s*&\s*'?[A-Za-z0-9_]*\s*(?:mut\s+)?/, "").trim();
      const wrapperType = /^([A-Za-z_][A-Za-z0-9_:]*)/.exec(normalizedType)?.[1]?.split("::").at(-1);
      const stateType = /^(?:Account|AccountLoader|InterfaceAccount|Program|Interface|Sysvar)\s*</.test(normalizedType) ? /<\s*([^>,]+)/.exec(normalizedType)?.[1]?.trim() : void 0;
      const address = constraints.find((item) => item.kind === "address")?.expression;
      const seedDefinition = stateType ? seedDefinitions.get(stateType) : void 0;
      if (address && seedDefinition) {
        const argumentsText = new RegExp(`\\b${escapeRegex(stateType)}::seeds\\s*\\((.*)\\)`).exec(address)?.[1];
        const argumentsList = argumentsText ? splitRustExpressions(argumentsText) : [];
        const seeds = [...seedDefinition.constants, ...seedDefinition.parameters.map((_, index) => argumentsList[index]).filter((item) => !!item)];
        if (seeds.length) constraints.push({ kind: "seeds", expression: `[${seeds.join(", ")}]`, location: loc3(uri, fieldNode) });
      }
      const initializing = constraints.some((item) => item.kind === "init" || item.kind === "init(idempotent)" || item.kind === "init_if_needed");
      const closing = constraints.some((item) => item.kind === "close");
      const writable = mutableReference || constraints.some((item) => item.kind === "mut" || item.kind === "realloc") || initializing || closing;
      const lifecycle = initializing ? ["init", "create", "write"] : writable ? ["write"] : ["read"];
      if (constraints.some((item) => item.kind === "realloc")) lifecycle.push("realloc");
      if (closing) lifecycle.push("close");
      const programWrapper = wrapperType === "Program" || wrapperType === "Interface";
      const contextType = nodeText(field(struct, "name"));
      accounts.push({ id: `account:${uri}:quasar:${contextType}:${fieldNode.startPosition.row + 1}:${fieldNode.startPosition.column}:${name2}`, name: name2, type, wrapperType, stateType, contextType, signer: wrapperType === "Signer" || constraints.some((item) => item.kind === "signer"), writable, executable: programWrapper, unchecked: wrapperType === "UncheckedAccount", raw: wrapperType === "AccountView", optional, addressExpectation: constraints.find((item) => item.kind === "address")?.expression ?? (programWrapper || wrapperType === "Sysvar" ? stateType : void 0), ownerExpectation: wrapperType === "SystemAccount" ? "SystemProgram" : void 0, ownerValidated: ["Account", "InterfaceAccount", "SystemAccount"].includes(wrapperType ?? ""), addressValidated: programWrapper || wrapperType === "Sysvar" || constraints.some((item) => item.kind === "address"), constraints, relations, lifecycle: [...new Set(lifecycle)], location: loc3(uri, fieldNode), confidence: 0.93, evidence: [{ description: "Quasar derive(Accounts) field and account constraints", location: loc3(uri, fieldNode) }] });
    }
  }
  return { instructions, accounts };
}
function parseConstraints2(attributes, uri, node) {
  const body2 = /#\[account\s*\(([\s\S]*?)\)\]/.exec(attributes)?.[1];
  if (!body2) return [];
  return splitRustExpressions(body2).map((raw) => {
    const value = raw.trim();
    const equals = topLevelEquals(value);
    if (equals >= 0) return { kind: value.slice(0, equals).trim(), expression: value.slice(equals + 1).trim(), location: loc3(uri, node) };
    if (/^init\s*\(\s*idempotent\s*\)$/.test(value)) return { kind: "init(idempotent)", location: loc3(uri, node) };
    const call = /^([A-Za-z_][A-Za-z0-9_:]*)\s*\(([\s\S]*)\)$/.exec(value);
    return { kind: call?.[1] === "constraints" ? "constraint" : call?.[1] ?? value, expression: call?.[2]?.trim() || void 0, location: loc3(uri, node) };
  });
}
function accountRelations2(constraints) {
  const mapping = {
    has_one: "has-one",
    payer: "payer",
    close: "close-destination",
    "realloc::payer": "realloc-payer",
    "seeds::program": "seed-program",
    "token::mint": "token-mint",
    "token::authority": "token-authority",
    "token::token_program": "token-program",
    "mint::authority": "mint-authority",
    "mint::freeze_authority": "mint-freeze-authority",
    "mint::token_program": "token-program",
    "associated_token::mint": "associated-token-mint",
    "associated_token::authority": "associated-token-authority",
    "associated_token::token_program": "associated-token-program"
  };
  return [...new Map(constraints.flatMap((constraint) => {
    const kind = mapping[constraint.kind];
    if (!kind || !constraint.expression) return [];
    const target = constraint.kind === "close" ? /\bdest\s*=\s*([A-Za-z_][A-Za-z0-9_]*)/.exec(constraint.expression)?.[1] ?? constraint.expression : constraint.expression;
    return [{ kind, target, constraint: constraint.kind, location: constraint.location }];
  }).map((item) => [`${item.kind}:${item.target}:${item.constraint}`, item])).values()];
}
function topLevelEquals(value) {
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if ("([{".includes(char)) depth++;
    else if (")]}".includes(char)) depth--;
    else if (char === "=" && depth === 0) return index;
  }
  return -1;
}
function instructionReturnType2(fn) {
  const raw = (nodeText(field(fn, "return_type")) || fn.children.find((child) => child?.type === "return_type")?.text || "").replace(/^\s*->\s*/, "").trim();
  const result = /(?:^|::)Result\s*<([\s\S]*)>\s*$/.exec(raw);
  const success = result ? splitRustExpressions(result[1])[0]?.trim() : void 0;
  return success;
}
function loc3(uri, node) {
  return { uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column };
}
function attributesFor2(node) {
  const items = [];
  let sibling = node.previousNamedSibling;
  while (sibling?.type === "attribute_item") {
    items.unshift(sibling.text);
    sibling = sibling.previousNamedSibling;
  }
  return items.join("\n");
}
function attributeArgument2(attributes, attribute, argument) {
  const marker = `#[${attribute}`;
  let search = 0;
  while ((search = attributes.indexOf(marker, search)) >= 0) {
    const open = attributes.indexOf("(", search + marker.length);
    if (open < 0) return void 0;
    let depth = 1, quote = "", escaped = false, index = open + 1;
    for (; index < attributes.length && depth > 0; index++) {
      const char = attributes[index];
      if (quote) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === quote) quote = "";
        continue;
      }
      if (char === '"' || char === "'") quote = char;
      else if (char === "(") depth++;
      else if (char === ")") depth--;
    }
    if (depth === 0) for (const item of splitRustExpressions(attributes.slice(open + 1, index - 1))) {
      const match = new RegExp(`^${argument}\\s*=\\s*([\\s\\S]+)$`).exec(item.trim());
      if (match) return match[1].trim();
    }
    search = Math.max(index, search + marker.length);
  }
  return void 0;
}
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// src/analysis/callGraph.ts
init_importMetaShim();
var concreteKinds = /* @__PURE__ */ new Set(["function", "method", "associated-function", "closure"]);
var associatedKinds = /* @__PURE__ */ new Set(["method", "associated-function"]);
function buildCallGraph(files, functions, index) {
  const allSymbols = index?.symbols ?? fallbackSymbols(functions);
  const symbols = allSymbols.filter((symbol2) => concreteKinds.has(symbol2.kind));
  const calls = [];
  for (const file of files) {
    for (const call of descendants(file.root, "call_expression")) {
      const rawExpression = call.childForFieldName("function")?.text ?? "";
      if (!rawExpression) continue;
      const expression = stripTurbofish(rawExpression);
      const callerSymbol = enclosingFunction(symbols, file.uri, call.startPosition.row + 1, call.startPosition.column);
      const caller = callerSymbol?.qualifiedName ?? enclosingFallback(functions, file.uri, call.startPosition.row + 1)?.qualifiedName ?? "<unknown>";
      const resolution = resolveCall(expression, call, callerSymbol, file.uri, symbols, index);
      const location3 = locationFor(file.uri, call);
      const macroOrigins2 = callerSymbol?.macroOrigins;
      const evidence = [
        { description: `${resolution.status} Rust call ${rawExpression}: ${resolution.reason}`, location: location3 },
        ...(resolution.transforms ?? []).map((description) => ({ description: `Dispatch transform: ${description}`, location: location3 })),
        ...macroOrigins2?.length ? [{ description: `Enclosing item has macro origin: ${macroOrigins2.join(", ")}`, location: location3 }] : []
      ];
      calls.push({
        id: `call:${file.uri}:${location3.startLine}:${location3.startColumn}`,
        caller,
        callee: resolution.target ?? rawExpression,
        resolved: resolution.status === "resolved",
        sourceExpression: rawExpression,
        candidateTargets: resolution.candidates,
        target: resolution.target,
        status: resolution.status,
        confidence: resolution.confidence,
        resolutionReason: resolution.reason,
        receiverType: resolution.receiverType,
        dispatchKind: resolution.dispatchKind,
        indirect: resolution.indirect,
        resolutionTransforms: resolution.transforms,
        macroOrigins: macroOrigins2,
        location: location3,
        evidence
      });
    }
    calls.push(...localMacroCalls(file, symbols));
  }
  const uniqueCalls = [...new Map(calls.map((call) => [call.id, call])).values()].sort((a, b) => a.id.localeCompare(b.id));
  const edges = uniqueCalls.filter((call) => call.status === "resolved" && call.target).map((call) => ({ source: call.caller, target: call.target, confidence: call.confidence ?? 0.75 }));
  const uniqueEdges = [...new Map(edges.map((edge) => [`${edge.source}:${edge.target}`, edge])).values()].sort((a, b) => `${a.source}:${a.target}`.localeCompare(`${b.source}:${b.target}`));
  const graph = { symbols: symbols.map((symbol2) => symbol2.qualifiedName).sort(), calls: uniqueCalls, edges: uniqueEdges, cycles: [] };
  graph.cycles = callCycles(graph);
  return graph;
}
function resolveCall(expression, call, caller, fileUri, symbols, index) {
  const method = /^([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)$/.exec(expression);
  if (method) return resolveMethodCall(method[1], method[2], call, caller, symbols, index);
  const qualified = resolveQualifiedDispatch(expression, call, caller, symbols, index);
  if (qualified) return qualified;
  if (/\.|\)|\]|\}/.test(expression) && !/^(?:crate|self|super|Self)(?:::|$)/.test(expression)) return unresolved("dynamic", "call target depends on a non-trivial runtime receiver expression", "unknown", 0.35);
  const binding = resolveCallableBinding(expression, call, caller, fileUri, symbols, index);
  if (binding) return binding;
  return resolveLexicalPath(expression, caller, fileUri, symbols, index);
}
function resolveQualifiedDispatch(expression, call, caller, symbols, index) {
  const ufcs = /^<\s*(.+?)\s+as\s+(.+?)\s*>\s*::\s*([A-Za-z_][A-Za-z0-9_]*)$/.exec(expression);
  if (ufcs) {
    const module3 = caller?.module ?? "crate";
    const transformed2 = receiverTypes(ufcs[1], module3, index);
    const trait2 = cleanPathType(ufcs[2]);
    const matches3 = symbols.filter((symbol2) => associatedKinds.has(symbol2.kind) && symbol2.shortName === ufcs[3] && transformed2.types.includes(cleanPathType(symbol2.implType ?? "")) && cleanPathType(symbol2.traitName ?? "") === trait2);
    return select(matches3, `fully qualified path fixes trait ${ufcs[2]} and receiver ${ufcs[1]}`, "ufcs", transformed2.transforms, ufcs[1], 0.99);
  }
  const path15 = /^(.*?)::([A-Za-z_][A-Za-z0-9_]*)$/.exec(expression);
  if (!path15) return void 0;
  const prefix = path15[1];
  const member = path15[2];
  const module2 = caller?.module ?? "crate";
  if (prefix === "Self" && caller?.implType) {
    const transformed2 = receiverTypes(caller.implType, module2, index);
    const typeMatches = symbols.filter((symbol2) => associatedKinds.has(symbol2.kind) && symbol2.shortName === member && transformed2.types.includes(cleanPathType(symbol2.implType ?? "")));
    const traitMatches = caller.traitName ? typeMatches.filter((symbol2) => cleanPathType(symbol2.traitName ?? "") === cleanPathType(caller.traitName)) : [];
    const matches3 = traitMatches.length ? traitMatches : typeMatches.filter((symbol2) => !symbol2.traitName);
    return select(matches3, `Self is the enclosing impl type ${caller.implType}${caller.traitName ? ` under trait ${caller.traitName}` : ""}`, matches3.some((item) => item.kind === "associated-function") ? "associated-function" : matches3.some((item) => item.traitName) ? "trait-method" : "inherent-method", transformed2.transforms, caller.implType, 0.98);
  }
  const trait = findTrait(prefix, module2, index);
  if (trait) {
    const contract = index?.symbols.find((symbol2) => symbol2.kind === "trait-method" && symbol2.shortName === member && cleanPathType(symbol2.traitName ?? "") === cleanPathType(trait.shortName));
    const receiver = contract?.hasSelfReceiver ? firstArgumentReceiver(call) : void 0;
    const receiverType = receiver ? inferBindingType(receiver, call) : void 0;
    const transformed2 = receiverType ? receiverTypes(receiverType, module2, index) : { types: [], transforms: [] };
    const implementations = symbols.filter((symbol2) => associatedKinds.has(symbol2.kind) && symbol2.shortName === member && cleanPathType(symbol2.traitName ?? "") === cleanPathType(trait.shortName) && (!receiverType || transformed2.types.includes(cleanPathType(symbol2.implType ?? ""))));
    if (receiverType) return select(implementations, `trait-qualified call ${prefix}::${member} has explicit receiver evidence ${receiverType}`, "trait-method", transformed2.transforms, receiverType, 0.94);
    const contracts = index?.symbols.filter((symbol2) => symbol2.kind === "trait-method" && symbol2.shortName === member && cleanPathType(symbol2.traitName ?? "") === cleanPathType(trait.shortName)).map((symbol2) => symbol2.qualifiedName) ?? [];
    const candidates = [.../* @__PURE__ */ new Set([...contracts, ...implementations.map(labelFor)])].sort();
    return { status: "dynamic", candidates, confidence: 0.62, reason: `trait-qualified call ${prefix}::${member} identifies the trait contract, but its concrete receiver type requires type inference`, dispatchKind: "trait-method", indirect: true };
  }
  const localType = findType(prefix, module2, index);
  if (!localType) return void 0;
  const transformed = receiverTypes(prefix, module2, index);
  const matches2 = symbols.filter((symbol2) => associatedKinds.has(symbol2.kind) && symbol2.shortName === member && transformed.types.includes(cleanPathType(symbol2.implType ?? "")));
  const inherent = matches2.filter((symbol2) => !symbol2.traitName);
  const selected = inherent.length ? inherent : matches2;
  const kind = selected.some((item) => item.kind === "associated-function") ? "associated-function" : selected.some((item) => item.traitName) ? "trait-method" : "inherent-method";
  return select(selected, `${prefix} resolves to indexed type ${localType.qualifiedName}`, kind, transformed.transforms, prefix, inherent.length ? 0.97 : 0.88);
}
function resolveMethodCall(receiver, method, call, caller, symbols, index) {
  const receiverType = receiver === "self" ? caller?.implType : inferBindingType(receiver, call);
  if (!receiverType) return unresolved("dynamic", `receiver type for ${receiver} could not be inferred from an explicit parameter, binding, or constructor`, "unknown", 0.35);
  const module2 = caller?.module ?? "crate";
  const dynamicReceiver = receiverType.trim().replace(/^&\s*(?:'\w+\s*)?(?:mut\s+)?/, "");
  if (/^(?:dyn|impl)\s+/.test(dynamicReceiver)) {
    const traits = inlineTraitBounds(dynamicReceiver);
    const contracts = traitContracts(traits, method, index);
    return { status: "dynamic", candidates: contracts, confidence: 0.7, reason: `${dynamicReceiver.startsWith("dyn") ? "trait object" : "impl Trait parameter"} exposes ${traits.join(" + ")}, but the concrete call body is runtime/monomorphization dependent`, receiverType, dispatchKind: dynamicReceiver.startsWith("dyn") ? "trait-object" : "generic-bound", indirect: true };
  }
  const genericTraits = caller?.genericBounds?.filter((item) => cleanPathType(item.typeParameter) === cleanPathType(receiverType)).map((item) => item.trait) ?? [];
  if (genericTraits.length) {
    const contracts = traitContracts(genericTraits, method, index);
    if (contracts.length === 1) return { status: "dynamic", candidates: contracts, confidence: 0.76, reason: `generic receiver ${receiverType} is constrained by ${genericTraits.join(" + ")}, but the concrete implementation depends on monomorphization`, receiverType, dispatchKind: "generic-bound", indirect: true };
    if (contracts.length > 1) return { status: "ambiguous", candidates: contracts, confidence: 0.42, reason: `multiple generic trait bounds on ${receiverType} provide ${method}`, receiverType, dispatchKind: "generic-bound", indirect: true };
    return unresolved("dynamic", `generic receiver ${receiverType} has trait bounds ${genericTraits.join(" + ")}, but no matching indexed trait contract provides ${method}`, "generic-bound", 0.4, receiverType);
  }
  const transformed = receiverTypes(receiverType, module2, index);
  for (const candidate of transformed.types) {
    const matches2 = symbols.filter((symbol2) => symbol2.kind === "method" && symbol2.shortName === method && cleanPathType(symbol2.implType ?? "") === candidate);
    const inherent = matches2.filter((symbol2) => !symbol2.traitName);
    if (inherent.length) return select(inherent, `receiver type ${receiverType} selects an indexed inherent method at candidate ${candidate}`, "inherent-method", transformed.transforms, receiverType, 0.95);
    if (matches2.length) return select(matches2, `receiver type ${receiverType} selects indexed trait implementation candidate ${candidate}`, "trait-method", transformed.transforms, receiverType, 0.87);
  }
  return { status: "unresolved", candidates: [], confidence: 0.25, reason: `receiver type ${receiverType} is known, but no indexed implementation provides ${method}`, receiverType, dispatchKind: "unknown", transforms: transformed.transforms };
}
function resolveCallableBinding(expression, call, caller, fileUri, symbols, index) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(expression)) return void 0;
  const owner = enclosingNode(call, "function_item");
  if (!owner) return void 0;
  const declarations = descendants(owner, "let_declaration").filter((node) => node.startIndex < call.startIndex && bindingName(field(node, "pattern")?.text ?? "") === expression).sort((a, b) => b.startIndex - a.startIndex);
  const declaration = declarations[0];
  if (declaration) {
    const value = field(declaration, "value");
    const explicitType = field(declaration, "type")?.text;
    const assignments = descendants(owner, "assignment_expression").filter((node) => node.startIndex > declaration.startIndex && node.startIndex < call.startIndex && bindingName(field(node, "left")?.text ?? node.namedChildren[0]?.text ?? "") === expression);
    if (assignments.length) {
      const candidates = [value, ...assignments.map((node) => field(node, "right") ?? node.namedChildren.at(-1))].flatMap((node) => node ? callableValueTarget(node, caller, fileUri, symbols, index) : []).map((item) => item.target).filter((item) => !!item);
      return { status: "dynamic", candidates: [...new Set(candidates)].sort(), confidence: 0.55, reason: `callable binding ${expression} is reassigned before this call, so runtime identity is not fixed`, receiverType: explicitType, dispatchKind: "function-pointer", indirect: true };
    }
    if (value?.type === "closure_expression") {
      const closure = symbols.find((symbol2) => symbol2.kind === "closure" && symbol2.location.uri === fileUri && symbol2.location.startLine === value.startPosition.row + 1 && symbol2.location.startColumn === value.startPosition.column);
      if (closure) return { status: "resolved", candidates: [closure.qualifiedName], target: closure.qualifiedName, confidence: 0.98, reason: `local binding ${expression} has one closure-expression initializer`, receiverType: explicitType, dispatchKind: "closure", indirect: true };
    }
    if (value) {
      const targets = callableValueTarget(value, caller, fileUri, symbols, index);
      if (targets.length === 1) return { ...targets[0], reason: `local callable binding ${expression} has one function-item initializer ${value.text}`, receiverType: explicitType, dispatchKind: explicitType?.includes("fn(") ? "function-pointer" : "function-item", indirect: true };
      if (targets.length > 1) return { status: "ambiguous", candidates: targets.flatMap((item) => item.candidates), confidence: 0.4, reason: `callable binding ${expression} initializer has multiple possible function items`, receiverType: explicitType, dispatchKind: "function-item", indirect: true };
    }
    if (explicitType && callableTypeResolved(explicitType, caller?.module ?? "crate", index)) return unresolved("dynamic", `callable binding ${expression} has type ${explicitType}, but its runtime identity is not statically evidenced`, "function-pointer", 0.52, explicitType, true);
  }
  for (const parameter of descendants(owner, "parameter")) {
    if (bindingName(field(parameter, "pattern")?.text ?? parameter.namedChildren[0]?.text ?? "") !== expression) continue;
    const type = field(parameter, "type")?.text ?? "";
    if (callableTypeResolved(type, caller?.module ?? "crate", index)) return unresolved("dynamic", `parameter ${expression} has callable type ${type}; its runtime identity is supplied by the caller`, type.includes("dyn") ? "trait-object" : type.includes("Fn") ? "generic-bound" : "function-pointer", 0.58, type, true);
  }
  return void 0;
}
function callableValueTarget(value, caller, fileUri, symbols, index) {
  if (!["identifier", "scoped_identifier", "generic_function"].includes(value.type)) return [];
  const resolved = resolveLexicalPath(stripTurbofish(value.text), caller, fileUri, symbols, index);
  return resolved.status === "resolved" ? [resolved] : [];
}
function resolveLexicalPath(expression, caller, fileUri, symbols, index) {
  const module2 = caller?.module ?? index?.modulesByFile.get(fileUri) ?? "crate";
  const imports = index?.imports.filter((item) => item.fileUri === fileUri && item.module === module2) ?? [];
  const allSymbols = index?.symbols ?? symbols;
  const candidates = /* @__PURE__ */ new Set();
  let classifiedExternal = false;
  const addExact = (name2) => symbols.filter((symbol2) => symbol2.qualifiedName === name2).forEach((symbol2) => candidates.add(symbol2.qualifiedName));
  const addSuffix = (suffix) => symbols.filter((symbol2) => symbol2.qualifiedName.endsWith(`::${suffix}`) || symbol2.qualifiedName === suffix).forEach((symbol2) => candidates.add(symbol2.qualifiedName));
  if (expression.includes("::")) {
    const first = expression.split("::")[0];
    const imported = imports.find((item) => !item.glob && item.alias === first);
    if (imported) addExact(`${imported.target}${expression.slice(first.length)}`);
    addExact(normalizePathExpression(expression, module2, caller));
    const localModule = localModuleTarget(first, module2, allSymbols);
    if (localModule) addThroughReexports(localModule, expression.split("::").slice(1).join("::"), allSymbols, index, candidates);
    if (!candidates.size && !/^(crate|self|super|Self)$/.test(first) && !allSymbols.some((symbol2) => symbol2.module === `crate::${first}` || symbol2.qualifiedName.startsWith(`crate::${first}::`))) return unresolved("external", `path prefix ${first} is not an indexed local module or type`, "direct", 0.8);
  } else {
    addExact(`${module2}::${expression}`);
    for (const imported of imports.filter((item) => !item.glob && item.alias === expression)) {
      const local = localImportTarget(imported.target, imported.module, allSymbols);
      if (local) addExact(local);
      else classifiedExternal = true;
    }
    for (const imported of imports.filter((item) => item.glob)) {
      const local = localImportTarget(imported.target, imported.module, allSymbols);
      if (local) addThroughReexports(local, expression, allSymbols, index, candidates);
      else classifiedExternal = true;
    }
    if (!candidates.size) {
      const packageMatches = symbols.filter((symbol2) => symbol2.kind === "function" && symbol2.shortName === expression);
      if (packageMatches.length === 1) candidates.add(packageMatches[0].qualifiedName);
      else packageMatches.forEach((symbol2) => candidates.add(symbol2.qualifiedName));
    }
  }
  const list = [...candidates].sort();
  if (list.length === 1) return { status: "resolved", candidates: list, target: list[0], confidence: expression.includes("::") || list[0].startsWith(`${module2}::`) ? 0.95 : 0.8, reason: "one indexed function matches the lexical path and imports", dispatchKind: "direct" };
  if (list.length > 1) return { status: "ambiguous", candidates: list, confidence: 0.3, reason: "multiple indexed functions match the lexical path", dispatchKind: "direct" };
  addSuffix(expression);
  const suffixes = [...candidates].sort();
  if (suffixes.length === 1) return { status: "resolved", candidates: suffixes, target: suffixes[0], confidence: 0.7, reason: "one indexed function matches the package-wide suffix", dispatchKind: "direct" };
  if (suffixes.length > 1) return { status: "ambiguous", candidates: suffixes, confidence: 0.25, reason: "multiple indexed functions match the package-wide suffix", dispatchKind: "direct" };
  if (classifiedExternal || /^(?:Ok|Err|Some|None|Box|Vec|String|Result|Option|drop|log|msg|require|assert|assert_eq|assert_ne)$/.test(expression)) return unresolved("external", "import or well-known constructor/macro wrapper classifies this as external", "direct", 0.82);
  return unresolved("unresolved", "no indexed function or classified external import matches this call", "unknown", 0.2);
}
function select(matches2, reason, dispatchKind, transforms = [], receiverType, confidence = 0.94) {
  const labels = matches2.map(labelFor).sort();
  if (matches2.length === 1) return { status: "resolved", candidates: labels, target: matches2[0].qualifiedName, confidence, reason: `${reason}; one concrete body matches`, receiverType, dispatchKind, transforms };
  if (matches2.length > 1) return { status: "ambiguous", candidates: labels, confidence: 0.3, reason: `${reason}; ${dispatchKind === "trait-method" ? "multiple indexed inherent/trait candidates" : "multiple concrete bodies"} match`, receiverType, dispatchKind, transforms };
  return { status: "unresolved", candidates: [], confidence: 0.25, reason: `${reason}, but no indexed concrete body matches`, receiverType, dispatchKind, transforms };
}
function receiverTypes(value, module2, index) {
  const types = [];
  const transforms = [];
  const visited = /* @__PURE__ */ new Set();
  let current = value.trim();
  for (let step = 0; step < 8 && current && !visited.has(current); step++) {
    visited.add(current);
    const borrowed = /^&\s*(?:'\w+\s*)?(?:mut\s+)?(.+)$/.exec(current);
    if (borrowed) {
      transforms.push(`autoderef reference ${current} -> ${borrowed[1]}`);
      current = borrowed[1].trim();
      continue;
    }
    const alias = findType(current, module2, index);
    if (alias?.kind === "type-alias" && alias.aliasTarget) {
      transforms.push(`type alias ${current} -> ${alias.aliasTarget}`);
      current = alias.aliasTarget;
      continue;
    }
    const generic = /^([A-Za-z_][A-Za-z0-9_:]*)\s*<([\s\S]+)>$/.exec(current);
    const normalized = cleanPathType(generic?.[1] ?? current);
    if (!types.includes(normalized)) types.push(normalized);
    if (generic && /^(?:Box|Rc|Arc|Pin)$/.test(cleanPathType(generic[1]))) {
      const inner = firstTypeArgument(generic[2]);
      transforms.push(`supported deref wrapper ${generic[1]}<...> -> ${inner}`);
      current = inner;
      continue;
    }
    break;
  }
  return { types, transforms };
}
function inferBindingType(receiver, call) {
  const owner = enclosingNode(call, "function_item");
  if (!owner) return void 0;
  for (const parameter of descendants(owner, "parameter")) {
    const pattern = field(parameter, "pattern")?.text ?? parameter.namedChildren[0]?.text;
    if (bindingName(pattern ?? "") === receiver) return field(parameter, "type")?.text;
  }
  const declarations = descendants(owner, "let_declaration").filter((node) => node.startIndex < call.startIndex).sort((a, b) => b.startIndex - a.startIndex);
  for (const declaration of declarations) {
    if (bindingName(field(declaration, "pattern")?.text ?? "") !== receiver) continue;
    const explicit = field(declaration, "type")?.text;
    if (explicit) return explicit;
    const value = field(declaration, "value")?.text ?? "";
    return /^(?:&\s*(?:mut\s+)?)?([A-Z][A-Za-z0-9_:]*(?:<[^>]+>)?)\s*(?:::|\{|\()/.exec(value)?.[1];
  }
  return void 0;
}
function inlineTraitBounds(type) {
  return type.replace(/^\s*(?:dyn|impl)\s+/, "").split("+").map((item) => item.trim()).filter((item) => item && !item.startsWith("'"));
}
function traitContracts(traits, method, index) {
  const names = new Set(traits.map(cleanPathType));
  return (index?.symbols ?? []).filter((symbol2) => symbol2.kind === "trait-method" && symbol2.shortName === method && names.has(cleanPathType(symbol2.traitName ?? ""))).map((symbol2) => symbol2.qualifiedName).sort();
}
function findTrait(value, module2, index) {
  const clean = value.replace(/^crate::/, "");
  const matches2 = index?.symbols.filter((symbol2) => symbol2.kind === "trait" && (symbol2.qualifiedName === value || symbol2.qualifiedName === `${module2}::${value}` || symbol2.qualifiedName === `crate::${clean}` || symbol2.shortName === cleanPathType(value))) ?? [];
  return matches2.length === 1 ? matches2[0] : void 0;
}
function findType(value, module2, index) {
  const base = value.trim().replace(/^&\s*(?:mut\s+)?/, "").replace(/<.*$/, "");
  const clean = cleanPathType(base);
  const matches2 = index?.symbols.filter((symbol2) => ["struct", "enum", "type-alias"].includes(symbol2.kind) && (symbol2.qualifiedName === base || symbol2.qualifiedName === `${module2}::${base}` || symbol2.qualifiedName === `crate::${base.replace(/^crate::/, "")}` || symbol2.shortName === clean)) ?? [];
  return matches2.length === 1 ? matches2[0] : void 0;
}
function firstArgumentReceiver(call) {
  const first = field(call, "arguments")?.namedChildren.find((item) => !!item)?.text ?? "";
  return /^&\s*(?:mut\s+)?([A-Za-z_][A-Za-z0-9_]*)$/.exec(first)?.[1] ?? (/^[A-Za-z_][A-Za-z0-9_]*$/.test(first) ? first : void 0);
}
function callableType(value) {
  return /(?:^|[^A-Za-z])(?:unsafe\s+)?(?:extern\s+"[^"]+"\s+)?fn\s*\(|\b(?:dyn\s+|impl\s+)?Fn(?:Mut|Once)?\s*[<(]/.test(value);
}
function callableTypeResolved(value, module2, index) {
  if (callableType(value)) return true;
  const alias = findType(value, module2, index);
  return alias?.kind === "type-alias" && !!alias.aliasTarget && callableType(alias.aliasTarget);
}
function bindingName(value) {
  return value.replace(/^(?:mut|ref)\s+/, "").trim();
}
function labelFor(symbol2) {
  return symbol2.traitName ? `${symbol2.qualifiedName} as ${symbol2.traitName}` : symbol2.qualifiedName;
}
function cleanPathType(value) {
  return value.trim().replace(/^&\s*(?:'\w+\s*)?(?:mut\s+)?/, "").replace(/<.*$/, "").split("::").at(-1) ?? "";
}
function firstTypeArgument(value) {
  let depth = 0;
  for (let index = 0; index < value.length; index++) {
    if ("<([{".includes(value[index])) depth++;
    else if (">)]}".includes(value[index])) depth--;
    else if (value[index] === "," && depth === 0) return value.slice(0, index).trim();
  }
  return value.trim();
}
function stripTurbofish(value) {
  return value.replace(/::<[^<>]*(?:<[^<>]*>[^<>]*)*>/g, "");
}
function unresolved(status, reason, dispatchKind, confidence, receiverType, indirect) {
  return { status, candidates: [], confidence, reason, receiverType, dispatchKind, indirect };
}
function localMacroCalls(file, symbols) {
  const local = new Set(descendants(file.root, "macro_definition").map((node) => field(node, "name")?.text).filter((item) => !!item));
  if (!local.size) return [];
  return descendants(file.root, "macro_invocation").flatMap((node) => {
    const name2 = field(node, "macro")?.text ?? "";
    if (!local.has(name2)) return [];
    const caller = enclosingFunction(symbols, file.uri, node.startPosition.row + 1, node.startPosition.column);
    if (!caller) return [];
    const location3 = locationFor(file.uri, node);
    const reason = `local macro ${name2}! may introduce calls, but Sealevel Insight does not expand macro token trees`;
    return [{ id: `call:macro:${file.uri}:${location3.startLine}:${location3.startColumn}`, caller: caller.qualifiedName, callee: `${name2}!`, resolved: false, sourceExpression: `${name2}!`, candidateTargets: [], status: "dynamic", confidence: 0.55, resolutionReason: reason, dispatchKind: "macro-origin", indirect: true, macroOrigins: [name2], location: location3, evidence: [{ description: reason, location: location3 }] }];
  });
}
function callCycles(graph) {
  const adjacency = /* @__PURE__ */ new Map();
  const nodes = /* @__PURE__ */ new Set();
  for (const edge of graph.edges) {
    nodes.add(edge.source);
    nodes.add(edge.target);
    adjacency.set(edge.source, [...adjacency.get(edge.source) ?? [], edge.target]);
  }
  let next = 0;
  const indexes = /* @__PURE__ */ new Map();
  const low = /* @__PURE__ */ new Map();
  const stack = [];
  const onStack = /* @__PURE__ */ new Set();
  const components = [];
  const visit = (node) => {
    indexes.set(node, next);
    low.set(node, next++);
    stack.push(node);
    onStack.add(node);
    for (const target of adjacency.get(node) ?? []) {
      if (!indexes.has(target)) {
        visit(target);
        low.set(node, Math.min(low.get(node), low.get(target)));
      } else if (onStack.has(target)) low.set(node, Math.min(low.get(node), indexes.get(target)));
    }
    if (low.get(node) === indexes.get(node)) {
      const component = [];
      let value;
      do {
        value = stack.pop();
        onStack.delete(value);
        component.push(value);
      } while (value !== node);
      components.push(component.sort());
    }
  };
  for (const node of [...nodes].sort()) if (!indexes.has(node)) visit(node);
  return components.filter((component) => component.length > 1 || graph.edges.some((edge) => edge.source === component[0] && edge.target === component[0])).map((component) => {
    const members = new Set(component);
    const calls = graph.calls.filter((call) => call.status === "resolved" && !!call.target && members.has(call.caller) && members.has(call.target));
    const kind = component.length === 1 ? "self-recursion" : "mutual-recursion";
    return { id: `cycle:${kind}:${component.join("|")}`, kind, functions: component, callIds: calls.map((call) => call.id).sort(), evidence: calls.map((call) => ({ description: `${kind} edge ${call.caller} -> ${call.target}`, location: call.location })) };
  }).sort((a, b) => a.id.localeCompare(b.id));
}
function localModuleTarget(target, ownerModule, symbols) {
  if (target.startsWith("crate::")) return target;
  const ownerRelative = `${ownerModule}::${target}`;
  if (symbols.some((symbol2) => symbol2.kind === "module" && (symbol2.qualifiedName === ownerRelative || symbol2.qualifiedName.startsWith(`${ownerRelative}::`)))) return ownerRelative;
  const root = `crate::${target}`;
  return symbols.some((symbol2) => symbol2.kind === "module" && (symbol2.qualifiedName === root || symbol2.qualifiedName.startsWith(`${root}::`))) ? root : void 0;
}
function localImportTarget(target, ownerModule, symbols) {
  if (target.startsWith("crate::")) return target;
  return localModuleTarget(target, ownerModule, symbols) ?? (symbols.some((symbol2) => symbol2.qualifiedName === target) ? target : void 0);
}
function addThroughReexports(module2, tail, symbols, index, output2, visited = /* @__PURE__ */ new Set()) {
  const key = `${module2}:${tail}`;
  if (visited.has(key)) return;
  visited.add(key);
  for (const symbol2 of symbols.filter((item) => concreteKinds.has(item.kind) && item.qualifiedName === `${module2}::${tail}`)) output2.add(symbol2.qualifiedName);
  for (const imported of index?.imports.filter((item) => item.module === module2 && item.public) ?? []) {
    const local = localImportTarget(imported.target, module2, symbols);
    if (!local) continue;
    if (imported.glob) addThroughReexports(local, tail, symbols, index, output2, visited);
    else if (imported.alias === tail) for (const symbol2 of symbols.filter((item) => concreteKinds.has(item.kind) && item.qualifiedName === local)) output2.add(symbol2.qualifiedName);
  }
}
function normalizePathExpression(expression, module2, caller) {
  if (expression.startsWith("crate::")) return expression;
  if (expression.startsWith("self::")) return `${module2}::${expression.slice(6)}`;
  if (expression.startsWith("Self::") && caller?.implType) return `${caller.qualifiedName.split("::").slice(0, -1).join("::")}::${expression.slice(6)}`;
  if (expression.startsWith("super::")) {
    let parts2 = module2.split("::");
    let remaining = expression;
    while (remaining.startsWith("super::")) {
      parts2 = parts2.slice(0, -1);
      remaining = remaining.slice(7);
    }
    return `${parts2.join("::")}::${remaining}`;
  }
  return expression;
}
function enclosingFunction(symbols, uri, line, column) {
  return symbols.filter((symbol2) => symbol2.location.uri === uri && concreteKinds.has(symbol2.kind) && contains(symbol2.location, line, column)).sort((a, b) => span(a.location) - span(b.location))[0];
}
function enclosingNode(node, type) {
  let current = node;
  while (current && current.type !== type) current = current.parent;
  return current ?? void 0;
}
function enclosingFallback(functions, uri, line) {
  return functions.filter((fn) => fn.location.uri === uri && fn.location.startLine <= line && fn.location.endLine >= line).sort((a, b) => a.lines - b.lines)[0];
}
function contains(location3, line, column) {
  if (line < location3.startLine || line > location3.endLine) return false;
  if (line === location3.startLine && column < location3.startColumn) return false;
  if (line === location3.endLine && column > location3.endColumn) return false;
  return true;
}
function span(location3) {
  return (location3.endLine - location3.startLine) * 1e4 + location3.endColumn - location3.startColumn;
}
function locationFor(uri, node) {
  return { uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column };
}
function fallbackSymbols(functions) {
  return functions.map((fn) => ({ id: `symbol:fallback:${fn.qualifiedName ?? fn.name}:${fn.location.uri}:${fn.location.startLine}`, qualifiedName: fn.qualifiedName ?? fn.name, shortName: fn.name, kind: "function", package: fn.program ?? "", module: (fn.qualifiedName ?? fn.name).split("::").slice(0, -1).join("::"), visibility: fn.visibility ?? (fn.isPublic ? "pub" : "private"), location: fn.location, evidence: [{ description: "function metric symbol", location: fn.location }] }));
}

// src/analysis/symbolIndex.ts
init_importMetaShim();
var path2 = __toESM(require("node:path"));
var import_node_url2 = require("node:url");
function buildRustSymbolIndex(files) {
  const symbols = [];
  const imports = [];
  const modulesByFile = /* @__PURE__ */ new Map();
  for (const file of files) modulesByFile.set(file.uri, moduleForFile(file.uri, file.packageRoot));
  for (const file of files) applyDeclaredModulePaths(file, files, modulesByFile);
  for (const file of files) {
    const moduleName = modulesByFile.get(file.uri) ?? "crate";
    indexChildren(file.root, file, moduleName, void 0, symbols, imports, []);
  }
  for (const file of files) indexClosures(file, symbols);
  return {
    symbols: [...new Map(symbols.map((symbol2) => [symbol2.id, symbol2])).values()].sort((a, b) => a.id.localeCompare(b.id)),
    imports: imports.sort((a, b) => `${a.fileUri}:${a.alias}:${a.target}`.localeCompare(`${b.fileUri}:${b.alias}:${b.target}`)),
    modulesByFile
  };
}
function applyDeclaredModulePaths(file, files, modules) {
  const parentModule = modules.get(file.uri) ?? "crate";
  const filePath = uriPath(file.uri);
  if (!filePath) return;
  for (const node of file.root.namedChildren.filter((item) => !!item && item.type === "mod_item")) {
    if (field(node, "body")) continue;
    const name2 = nodeText(field(node, "name"));
    if (!name2) continue;
    const attributes = [];
    let sibling = node.previousNamedSibling;
    while (sibling?.type === "attribute_item") {
      attributes.unshift(sibling.text);
      sibling = sibling.previousNamedSibling;
    }
    const declared = /#\[path\s*=\s*"([^"]+)"\]/.exec(attributes.join("\n"))?.[1];
    const candidates = declared ? [path2.resolve(path2.dirname(filePath), declared)] : [path2.resolve(path2.dirname(filePath), `${name2}.rs`), path2.resolve(path2.dirname(filePath), name2, "mod.rs")];
    const target = files.find((item) => {
      const resolved = uriPath(item.uri);
      return !!resolved && candidates.includes(path2.resolve(resolved));
    });
    if (target) modules.set(target.uri, `${parentModule}::${name2}`);
  }
}
function indexChildren(node, file, moduleName, impl, symbols, imports, inheritedOrigins) {
  for (const child of node.namedChildren.filter((item) => !!item)) {
    if (child.type === "mod_item") {
      const name2 = nodeText(field(child, "name"));
      if (!name2) continue;
      const qualifiedName = `${moduleName}::${name2}`;
      const origins = [.../* @__PURE__ */ new Set([...inheritedOrigins, ...macroOrigins(child)])];
      symbols.push(symbol(file, child, name2, qualifiedName, "module", void 0, inheritedOrigins));
      const body2 = field(child, "body");
      if (body2) indexChildren(body2, file, qualifiedName, void 0, symbols, imports, origins);
      continue;
    }
    if (child.type === "impl_item") {
      const type = nodeText(field(child, "type")) || implTypeFromText(child.text);
      const trait = nodeText(field(child, "trait")) || void 0;
      const origins = [.../* @__PURE__ */ new Set([...inheritedOrigins, ...macroOrigins(child)])];
      indexChildren(child, file, moduleName, type ? { type, trait, macroOrigins: origins } : void 0, symbols, imports, origins);
      continue;
    }
    if (child.type === "trait_item") {
      const name2 = nodeText(field(child, "name"));
      if (name2) {
        const origins = [.../* @__PURE__ */ new Set([...inheritedOrigins, ...macroOrigins(child)])];
        symbols.push(symbol(file, child, name2, `${moduleName}::${name2}`, "trait", void 0, inheritedOrigins));
        const members = field(child, "body")?.namedChildren.filter((item) => !!item && (item.type === "function_signature_item" || item.type === "function_item")) ?? [];
        for (const member of members) {
          const memberName = nodeText(field(member, "name"));
          if (!memberName) continue;
          symbols.push(symbol(file, member, memberName, `${moduleName}::${name2}::${memberName}`, "trait-method", { type: "Self", trait: name2, macroOrigins: origins }, origins));
        }
      }
      continue;
    }
    if (child.type === "use_declaration") {
      imports.push(...parseUse(child, file.uri, moduleName));
      continue;
    }
    const descriptor2 = symbolDescriptor(child, impl?.type);
    if (descriptor2) {
      const name2 = nodeText(field(child, "name"));
      if (name2) {
        const associated = descriptor2.kind === "method" || descriptor2.kind === "associated-function";
        const qualifiedName = `${moduleName}::${impl && associated ? `${cleanType(impl.type)}::` : ""}${name2}`;
        symbols.push(symbol(file, child, name2, qualifiedName, descriptor2.kind, impl, inheritedOrigins));
      }
    }
    if (!["function_item", "closure_expression"].includes(child.type)) indexChildren(child, file, moduleName, impl, symbols, imports, inheritedOrigins);
  }
}
function symbolDescriptor(node, implType) {
  const type = node.type;
  if (type === "function_item") return { kind: implType ? hasSelfReceiver(node) ? "method" : "associated-function" : "function" };
  if (type === "struct_item") return { kind: "struct" };
  if (type === "enum_item") return { kind: "enum" };
  if (type === "const_item") return { kind: "constant" };
  if (type === "static_item") return { kind: "static" };
  if (type === "type_item") return { kind: "type-alias" };
  return void 0;
}
function symbol(file, node, shortName, qualifiedName, kind, impl, inheritedOrigins = []) {
  const location3 = { uri: file.uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column };
  const visibility = node.namedChildren.find((child) => child?.type === "visibility_modifier")?.text ?? "private";
  const associated = kind === "method" || kind === "associated-function" || kind === "trait-method";
  const origins = [.../* @__PURE__ */ new Set([...inheritedOrigins, ...impl?.macroOrigins ?? [], ...macroOrigins(node)])].sort();
  const result = { id: `symbol:${file.packageName}:${qualifiedName}:${location3.uri}:${location3.startLine}:${location3.startColumn}`, qualifiedName, shortName, kind, package: file.packageName, module: qualifiedName.split("::").slice(0, associated ? -2 : -1).join("::") || "crate", visibility, location: location3, implType: impl?.type, traitName: impl?.trait, hasSelfReceiver: kind === "method" || kind === "trait-method" ? hasSelfReceiver(node) : kind === "associated-function" ? false : void 0, genericBounds: parseGenericBounds(node), macroOrigins: origins.length ? origins : void 0, evidence: [{ description: `Rust AST ${kind}${impl?.trait ? ` in impl ${impl.trait} for ${impl.type}` : impl?.type ? ` in impl ${impl.type}` : ""}`, location: location3 }] };
  if (kind === "type-alias") result.aliasTarget = nodeText(field(node, "type")) || /\=\s*([^;]+);?\s*$/.exec(node.text)?.[1]?.trim();
  if (origins.length) result.evidence.push({ description: `Item carries macro-origin attribute(s): ${origins.join(", ")}`, location: location3 });
  return result;
}
function indexClosures(file, symbols) {
  for (const closure of descendantsOf(file.root, "closure_expression")) {
    const line = closure.startPosition.row + 1;
    const column = closure.startPosition.column;
    const owner = symbols.filter((item) => item.location.uri === file.uri && callableKind(item.kind) && contains2(item.location, line, column)).sort((a, b) => span2(a) - span2(b))[0];
    if (!owner) continue;
    const location3 = { uri: file.uri, startLine: line, startColumn: column, endLine: closure.endPosition.row + 1, endColumn: closure.endPosition.column };
    const qualifiedName = `${owner.qualifiedName}::{{closure@${line}:${column}}}`;
    symbols.push({ id: `symbol:${file.packageName}:${qualifiedName}:${file.uri}:${line}:${column}`, qualifiedName, shortName: `{closure@${line}:${column}}`, kind: "closure", package: file.packageName, module: owner.module, visibility: "private", location: location3, macroOrigins: owner.macroOrigins, evidence: [{ description: `Rust closure expression owned by ${owner.qualifiedName}`, location: location3 }] });
  }
}
function hasSelfReceiver(node) {
  return !!field(node, "parameters")?.namedChildren.some((child) => child?.type === "self_parameter");
}
function parseGenericBounds(node) {
  const values = [];
  const params = field(node, "type_parameters");
  for (const parameter of params?.namedChildren.filter((item) => !!item && item.type === "type_parameter") ?? []) {
    const name2 = nodeText(field(parameter, "name"));
    const bounds = nodeText(field(parameter, "bounds"));
    for (const trait of traitBounds(bounds)) if (name2) values.push({ typeParameter: name2, trait });
  }
  const where = node.namedChildren.find((child) => child?.type === "where_clause");
  for (const predicate of where?.namedChildren.filter((item) => !!item && item.type === "where_predicate") ?? []) {
    const name2 = nodeText(field(predicate, "left"));
    const bounds = nodeText(field(predicate, "bounds"));
    for (const trait of traitBounds(bounds)) if (name2) values.push({ typeParameter: name2, trait });
  }
  return values.length ? [...new Map(values.map((item) => [`${item.typeParameter}:${item.trait}`, item])).values()].sort((a, b) => `${a.typeParameter}:${a.trait}`.localeCompare(`${b.typeParameter}:${b.trait}`)) : void 0;
}
function traitBounds(value) {
  return splitTopLevelPlus(value).map((item) => item.trim().replace(/^:\s*/, "").replace(/^\?/, "").replace(/^for\s*<[^>]+>\s*/, "")).filter((item) => !!item && !item.startsWith("'") && item !== "Sized");
}
function splitTopLevelPlus(value) {
  const result = [];
  let depth = 0;
  let start2 = 0;
  for (let index = 0; index < value.length; index++) {
    if ("<([{".includes(value[index])) depth++;
    else if (">)]}".includes(value[index])) depth--;
    else if (value[index] === "+" && depth === 0) {
      result.push(value.slice(start2, index));
      start2 = index + 1;
    }
  }
  result.push(value.slice(start2));
  return result;
}
function macroOrigins(node) {
  const result = [];
  let previous = node.previousNamedSibling;
  while (previous?.type === "attribute_item") {
    const name2 = /^#\[\s*([A-Za-z_][A-Za-z0-9_:]*)/.exec(previous.text)?.[1];
    if (name2 && !/^(?:cfg|cfg_attr|allow|warn|deny|forbid|doc|inline|cold|must_use|deprecated|repr)$/.test(name2)) result.unshift(name2);
    previous = previous.previousNamedSibling;
  }
  return result;
}
function descendantsOf(node, type) {
  return node.descendantsOfType(type).filter((item) => !!item);
}
function callableKind(kind) {
  return kind === "function" || kind === "method" || kind === "associated-function" || kind === "closure";
}
function contains2(location3, line, column) {
  return line > location3.startLine && line < location3.endLine || line === location3.startLine && column >= location3.startColumn && (line < location3.endLine || column <= location3.endColumn) || line === location3.endLine && column <= location3.endColumn && line > location3.startLine;
}
function span2(symbol2) {
  return (symbol2.location.endLine - symbol2.location.startLine) * 1e4 + symbol2.location.endColumn - symbol2.location.startColumn;
}
function parseUse(node, fileUri, module2) {
  const publicUse = /^pub(?:\([^)]*\))?\s+use\b/.test(node.text.trim());
  const expression = node.text.replace(/^\s*(?:pub(?:\([^)]*\))?\s+)?use\s+/, "").replace(/;\s*$/, "").trim();
  const expanded = expandUse(expression);
  const location3 = { uri: fileUri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column };
  return expanded.map((item) => ({ fileUri, module: module2, alias: item.alias, target: normalizeImportTarget(item.target, module2), glob: item.glob, public: publicUse, evidence: [{ description: `${publicUse ? "public re-export" : "use import"} ${expression}`, location: location3 }] }));
}
function expandUse(expression) {
  const open = expression.indexOf("{");
  if (open >= 0 && expression.endsWith("}")) {
    const prefix = expression.slice(0, open).replace(/::$/, "");
    const body2 = expression.slice(open + 1, -1);
    return splitTopLevel(body2).flatMap((part) => expandUse(prefix ? `${prefix}::${part.trim()}` : part.trim()));
  }
  if (expression.endsWith("::*")) return [{ alias: "*", target: expression.slice(0, -3), glob: true }];
  const alias = /^(.*)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)$/.exec(expression);
  const target = (alias?.[1] ?? expression).replace(/::self$/, "");
  return [{ alias: alias?.[2] ?? target.split("::").at(-1) ?? target, target, glob: false }];
}
function normalizeImportTarget(target, module2) {
  if (target.startsWith("crate::")) return target;
  if (target.startsWith("self::")) return `${module2}::${target.slice(6)}`;
  if (target === "self") return module2;
  if (target.startsWith("super::")) {
    let current = module2.split("::");
    let rest = target;
    while (rest.startsWith("super::")) {
      current = current.slice(0, -1);
      rest = rest.slice(7);
    }
    return `${current.join("::")}::${rest}`;
  }
  return target;
}
function moduleForFile(uri, packageRoot) {
  let file = uri;
  try {
    if (uri.startsWith("file:")) file = (0, import_node_url2.fileURLToPath)(uri);
  } catch {
  }
  if (!packageRoot) return "crate";
  const relative8 = path2.relative(packageRoot, file).split(path2.sep).join("/");
  const sourceRelative = relative8.startsWith("src/") ? relative8.slice(4) : relative8;
  if (/^(lib|main)\.rs$/.test(sourceRelative)) return "crate";
  const withoutExtension = sourceRelative.replace(/\.rs$/, "").replace(/\/mod$/, "");
  return `crate::${withoutExtension.split("/").filter(Boolean).join("::")}`;
}
function uriPath(uri) {
  try {
    return uri.startsWith("file:") ? (0, import_node_url2.fileURLToPath)(uri) : path2.isAbsolute(uri) ? uri : void 0;
  } catch {
    return void 0;
  }
}
function splitTopLevel(value) {
  const items = [];
  let depth = 0;
  let start2 = 0;
  for (let index = 0; index < value.length; index++) {
    if (value[index] === "{") depth++;
    else if (value[index] === "}") depth--;
    else if (value[index] === "," && depth === 0) {
      items.push(value.slice(start2, index));
      start2 = index + 1;
    }
  }
  items.push(value.slice(start2));
  return items.filter((item) => item.trim());
}
function implTypeFromText(value) {
  return /^\s*impl(?:<[^>]*>)?\s+(?:[^\s]+\s+for\s+)?([^\s{]+)/.exec(value)?.[1] ?? "";
}
function cleanType(value) {
  return value.replace(/^.*::/, "").replace(/<.*$/, "").replace(/^&(?:mut\s+)?/, "");
}

// src/analysis/semanticModel.ts
init_importMetaShim();
var SYSVARS = /* @__PURE__ */ new Set(["Clock", "Rent", "EpochSchedule", "Instructions", "SlotHashes", "StakeHistory", "LastRestartSlot", "RecentBlockhashes", "Rewards"]);
function enrichUnifiedSemantics(root, uri, program) {
  program.stateTypes ??= [];
  program.sysvars ??= [];
  program.runtimeOperations ??= [];
  program.events ??= [];
  program.errors ??= [];
  extractStates(root, uri, program);
  extractSysvars(root, uri, program.sysvars);
  extractRuntime(root, uri, program.runtimeOperations);
  extractEventsAndErrors(root, uri, program);
}
function extractStates(root, uri, program) {
  const stateTypes = program.stateTypes ??= [];
  const anchorSource = (/anchor[-_]lang|anchor_lang::|anchor_spl::/.test(root.text) || program.frameworkEvidence.some((item) => item.framework === "anchor")) && !/quasar[-_]lang|quasar-spl|quasar::/.test(root.text);
  for (const struct of descendants(root, "struct_item")) {
    const attributes = attributesFor3(struct);
    const serialization = serializationFor(`${attributes} ${struct.text}`);
    const fields = descendants(struct, "field_declaration").map((item2) => {
      const fieldAttributes = attributesFor3(item2);
      const idlType = /#\[idl_type\s*\(\s*(?:"([^"]+)"|([^\)]+))\s*\)\]/.exec(fieldAttributes);
      return { name: nodeText(field(item2, "name")), type: nodeText(field(item2, "type")), visibility: item2.namedChildren.find((child) => child?.type === "visibility_modifier")?.text ?? "private", idlName: /#\[idl_name\s*\(\s*"([^"]+)"\s*\)\]/.exec(fieldAttributes)?.[1], idlType: (idlType?.[1] ?? idlType?.[2])?.trim(), idlSkip: /#\[skip\s*\]/.test(fieldAttributes) || void 0, padding: /#\[padding\s*\]/.test(fieldAttributes) || void 0 };
    });
    const stateModule = /(?:^|\/)state(?:\.rs|\/)/.test(uri) && fields.length > 0;
    const isState = stateModule || /#\[(?:account|zero_copy)\b/.test(attributes) || fields.length > 0 && /\b(?:BorshSerialize|AnchorSerialize|Pod|Zeroable|Pack|ShankAccount|ShankType)\b/.test(attributes);
    if (!isState) continue;
    const name2 = nodeText(field(struct, "name"));
    const customDiscriminator = attributeArgument3(attributes, "account", "discriminator");
    const discriminator = customDiscriminator ? resolveRustDiscriminator(customDiscriminator)?.value ?? customDiscriminator : anchorSource && /#\[account(?:\s*\]|\s*\()/.test(attributes) ? anchorDiscriminator("account", name2) : void 0;
    const dynamicSize = fields.some((item2) => /\b(?:Vec|String|Box|HashMap|BTreeMap)\s*</.test(item2.type) || /\[.*\]/.test(item2.type) && !/\[[^;]+;\s*\d+\]/.test(item2.type));
    const location3 = loc4(uri, struct);
    const item = {
      id: `state:${program.name}:${name2}:${uri}:${location3.startLine}`,
      name: name2,
      package: program.name,
      framework: frameworkFor(attributes),
      fields,
      visibility: struct.namedChildren.find((child) => child?.type === "visibility_modifier")?.text ?? "private",
      serialization,
      zeroCopy: /zero_copy|Pod|Zeroable/.test(`${attributes} ${struct.text}`),
      discriminator,
      declaredSpace: /\b(?:space|LEN)\s*=\s*([^,\])]+)/.exec(`${attributes} ${struct.text}`)?.[1]?.trim(),
      dynamicSize,
      pdaIds: [],
      initializationSites: [],
      reallocSites: [],
      closeSites: [],
      evidence: [{ description: `state/account type with ${serialization.join(", ") || "framework"} serialization evidence`, location: location3 }, ...discriminator ? [{ description: customDiscriminator ? `custom account discriminator ${customDiscriminator}` : `Anchor default sha256(account:${name2}) discriminator`, location: location3 }] : []],
      location: location3
    };
    if (!dynamicSize) item.staticSize = staticSize(fields.map((entry) => entry.type));
    stateTypes.push(item);
  }
  program.stateTypes = [...new Map(stateTypes.map((item) => [item.id, item])).values()];
}
function extractSysvars(root, uri, output2) {
  for (const identifier of descendants(root, "type_identifier")) {
    if (!SYSVARS.has(identifier.text)) continue;
    const location3 = loc4(uri, identifier);
    output2.push({ id: `sysvar:${identifier.text}:${uri}:${location3.startLine}:${location3.startColumn}`, name: identifier.text, functionName: enclosingFunctionName(identifier), instructionIds: [], location: location3, evidence: [{ description: `Rust sysvar type ${identifier.text}`, location: location3 }] });
  }
  for (const call of descendants(root, "call_expression")) {
    const api = call.childForFieldName("function")?.text ?? "";
    const name2 = [...SYSVARS].find((sysvar) => api === `${sysvar}::get` || api.endsWith(`::${sysvar}::get`));
    if (!name2) continue;
    const location3 = loc4(uri, call);
    output2.push({ id: `sysvar:${name2}:${uri}:${location3.startLine}:${location3.startColumn}`, name: name2, functionName: enclosingFunctionName(call), instructionIds: [], location: location3, evidence: [{ description: `sysvar get call ${api}`, location: location3 }] });
  }
}
function extractRuntime(root, uri, output2) {
  for (const call of descendants(root, "call_expression")) {
    const api = call.childForFieldName("function")?.text ?? "";
    const kind = runtimeKind(api);
    if (!kind) continue;
    const location3 = loc4(uri, call);
    output2.push({ id: `runtime:${kind}:${uri}:${location3.startLine}:${location3.startColumn}`, kind, api, functionName: enclosingFunctionName(call), instructionIds: [], location: location3, evidence: [{ description: `explicit runtime operation ${api}`, location: location3 }] });
  }
  for (const macro of descendants(root, "macro_invocation")) {
    const api = macro.text.split(/[!(]/)[0].trim();
    if (!/^(?:msg|log|sol_log|sol_log_compute_units)$/.test(api)) continue;
    const location3 = loc4(uri, macro);
    output2.push({ id: `runtime:logging:${uri}:${location3.startLine}:${location3.startColumn}`, kind: "logging", api, functionName: enclosingFunctionName(macro), instructionIds: [], location: location3, evidence: [{ description: `runtime logging macro ${api}`, location: location3 }] });
  }
}
function extractEventsAndErrors(root, uri, program) {
  const framework = /quasar[-_]lang|quasar-spl|quasar::/.test(root.text) ? "quasar" : "anchor";
  for (const struct of descendants(root, "struct_item")) {
    const attributes = attributesFor3(struct);
    if (!/#\[event(?:\s*\]|\s*\()/.test(attributes)) continue;
    const name2 = nodeText(field(struct, "name"));
    const location3 = loc4(uri, struct);
    const customDiscriminator = attributeArgument3(attributes, "event", "discriminator");
    const discriminator = customDiscriminator ? resolveRustDiscriminator(customDiscriminator)?.value ?? customDiscriminator : framework === "anchor" ? anchorDiscriminator("event", name2) : void 0;
    program.events.push({ id: `event:${program.name}:${name2}`, name: name2, framework, discriminator, location: location3, emissionSites: [], evidence: [{ description: attributes.trim(), location: location3 }, ...discriminator ? [{ description: customDiscriminator ? `${framework} custom event discriminator ${customDiscriminator}` : `Anchor default sha256(event:${name2}) discriminator`, location: location3 }] : [{ description: `${framework} event discriminator is not explicit in this source file`, location: location3 }]] });
  }
  for (const enumeration of descendants(root, "enum_item")) {
    const attributes = attributesFor3(enumeration);
    if (!/#\[error_code\b/.test(attributes)) continue;
    const offsetExpression = attributeArgument3(attributes, "error_code", "offset");
    const offset = offsetExpression === void 0 ? 6e3 : /^\d+$/.test(offsetExpression) ? Number(offsetExpression) : void 0;
    let nextCode = 0;
    for (const variant of descendants(enumeration, "enum_variant")) {
      const name2 = nodeText(field(variant, "name"));
      const location3 = loc4(uri, variant);
      const variantAttributes = attributesFor3(variant);
      const explicit = /=\s*(\d+)\b/.exec(variant.text)?.[1];
      const localCode = explicit ? Number(explicit) : nextCode;
      nextCode = localCode + 1;
      program.errors.push({ id: `error:${program.name}:${name2}`, name: name2, code: offset !== void 0 ? offset + localCode : void 0, message: /#\[msg\s*\(\s*"([^"]*)"/.exec(variantAttributes)?.[1], framework, location: location3, useSites: [], evidence: [{ description: `#[error_code] enum variant with ${offset !== void 0 ? `offset ${offset}` : `unresolved offset ${offsetExpression}`}`, location: location3 }] });
    }
  }
  for (const macro of descendants(root, "macro_invocation")) {
    const text = macro.text;
    const location3 = loc4(uri, macro);
    if (/^(?:emit|emit_cpi)!/.test(text)) {
      const name2 = /!\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)/.exec(text)?.[1];
      const event = program.events.find((item) => item.name === name2);
      if (event) event.emissionSites.push(location3);
    }
    for (const [prefix, collection] of [["event!", program.events], ["error!", program.errors]]) {
      if (!text.startsWith(prefix)) continue;
      const name2 = /!\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)/.exec(text)?.[1];
      if (!name2) continue;
      if (prefix === "event!") collection.push({ id: `event:${program.name}:${name2}`, name: name2, framework: "steel", location: location3, emissionSites: [], evidence: [{ description: "Steel event! macro", location: location3 }] });
      else {
        const enumeration = descendants(root, "enum_item").find((item) => nodeText(field(item, "name")) === name2);
        if (!enumeration) collection.push({ id: `error:${program.name}:${name2}`, name: name2, framework: "steel", location: location3, useSites: [], evidence: [{ description: "Steel error! macro with unresolved enum definition", location: location3 }] });
        else {
          let nextCode = 0;
          for (const variant of descendants(enumeration, "enum_variant")) {
            const variantName = nodeText(field(variant, "name"));
            const variantLocation = loc4(uri, variant);
            const explicit = /=\s*(\d+)\b/.exec(variant.text)?.[1];
            const code = explicit ? Number(explicit) : nextCode;
            nextCode = code + 1;
            collection.push({ id: `error:${program.name}:${variantName}`, name: variantName, code, message: /#\[error\s*\(\s*"([^"]*)"/.exec(attributesFor3(variant))?.[1], framework: "steel", location: variantLocation, useSites: [], evidence: [{ description: `Steel error! enum ${name2} variant`, location: variantLocation }] });
          }
        }
      }
    }
  }
  program.events = [...new Map(program.events.map((item) => [item.id, item])).values()];
  program.errors = [...new Map(program.errors.map((item) => [item.id, item])).values()];
}
function attributesFor3(node) {
  const attributes = [];
  let sibling = node.previousNamedSibling;
  while (sibling?.type === "attribute_item") {
    attributes.unshift(sibling.text);
    sibling = sibling.previousNamedSibling;
  }
  return attributes.join("\n");
}
function attributeArgument3(attributes, attribute, argument) {
  const marker = `#[${attribute}`;
  let search = 0;
  while ((search = attributes.indexOf(marker, search)) >= 0) {
    const open = attributes.indexOf("(", search + marker.length);
    if (open < 0) return void 0;
    let depth = 1, quote = "", escaped = false, index = open + 1;
    for (; index < attributes.length && depth > 0; index++) {
      const char = attributes[index];
      if (quote) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === quote) quote = "";
        continue;
      }
      if (char === '"' || char === "'") quote = char;
      else if (char === "(") depth++;
      else if (char === ")") depth--;
    }
    if (depth === 0) for (const item of splitRustExpressions(attributes.slice(open + 1, index - 1))) {
      const match = new RegExp(`^${argument}\\s*=\\s*([\\s\\S]+)$`).exec(item.trim());
      if (match) return match[1].trim();
    }
    search = Math.max(index, search + marker.length);
  }
  return void 0;
}
function serializationFor(value) {
  return [...new Set([/Borsh|AnchorSerialize|AnchorDeserialize/.test(value) ? "borsh" : "", /\bPack\b/.test(value) ? "pack" : "", /Pod|Zeroable|bytemuck|zero_copy/.test(value) ? "zero-copy" : "", /serde/.test(value) ? "serde" : ""].filter(Boolean))];
}
function frameworkFor(value) {
  if (/ShankAccount|ShankType/.test(value)) return "shank";
  if (/#\[(?:account|zero_copy)/.test(value)) return "anchor-or-quasar";
  if (/account!/.test(value)) return "steel";
  return void 0;
}
function staticSize(types) {
  let total = 0;
  for (const type of types) {
    const size = primitiveSize(type);
    if (size === void 0) return void 0;
    total += size;
  }
  return total;
}
function primitiveSize(type) {
  const value = type.trim();
  const primitive = { bool: 1, u8: 1, i8: 1, u16: 2, i16: 2, u32: 4, i32: 4, f32: 4, u64: 8, i64: 8, f64: 8, u128: 16, i128: 16, Pubkey: 32, Address: 32 };
  if (primitive[value] !== void 0) return primitive[value];
  const array2 = /^\[([^;]+);\s*(\d+)\]$/.exec(value);
  if (array2) {
    const element = primitiveSize(array2[1]);
    return element === void 0 ? void 0 : element * Number(array2[2]);
  }
  return void 0;
}
function runtimeKind(api) {
  const normalized = api.replace(/::<[^>]*>$/, "");
  if (/invoke_signed|invoke_with_signers|new_with_signer/.test(normalized)) return "signed-cpi";
  if (/(^|::)invoke$/.test(normalized) || /(?:^|::)cpi::[A-Za-z_][A-Za-z0-9_]*$/.test(normalized)) return "cpi";
  if (/\.(?:realloc|resize)$|^(?:realloc|resize)$/.test(normalized)) return "realloc";
  if (/\.set_inner$/.test(normalized)) return "state-write";
  if (/try_borrow_mut|borrow_mut|set_lamports/.test(normalized)) return "state-write";
  if (/set_return_data|get_return_data/.test(normalized)) return "return-data";
  if (/remaining_compute_units|sol_remaining_compute_units/.test(normalized)) return "compute-units";
  if (/keccak|sha256|hashv?/.test(normalized)) return "hashing";
  if (/curve|is_on_curve|alt_bn128|secp256/.test(normalized)) return "curve-check";
  if (/memcpy|memcmp|memset|memmove/.test(normalized)) return "memory";
  return void 0;
}
function enclosingFunctionName(node) {
  let parent = node.parent;
  while (parent) {
    if (parent.type === "function_item") return nodeText(field(parent, "name"));
    parent = parent.parent;
  }
  return void 0;
}
function loc4(uri, node) {
  return { uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column };
}

// src/analysis/reviewComplexity.ts
init_importMetaShim();
var REVIEW_WEIGHTS = {
  reachableComplexity: 1,
  reachableFunctions: 2,
  accounts: 2,
  writableAccounts: 3,
  signerAccounts: 2,
  rawUncheckedAccounts: 5,
  cpis: 4,
  signedCpis: 4,
  dynamicCpis: 6,
  pdas: 2,
  remainingAccounts: 8,
  unsafe: 8,
  manualSerialization: 3,
  realloc: 4,
  unresolvedCalls: 5,
  ambiguousCalls: 7
};
function applyReviewComplexity(program) {
  const hotspots = [];
  for (const instruction of program.instructions) {
    const review = instructionComplexity(program, instruction);
    if (instruction.reachableSurface) instruction.reachableSurface.reviewComplexity = review;
    hotspots.push({ id: `hotspot:instruction:${instruction.id ?? instruction.name}`, label: instruction.name, score: review.score, reasons: review.components.filter((item) => item.contribution > 0).map((item) => `+${item.contribution} ${item.label}`), location: instruction.location });
  }
  for (const fn of program.functions) {
    const calls = program.callGraph?.calls.filter((call) => call.caller === fn.qualifiedName) ?? [];
    const unknownCalls = calls.filter((call) => call.status === "unresolved" || call.status === "dynamic");
    const ambiguousCalls = calls.filter((call) => call.status === "ambiguous");
    const reasons = [];
    if (fn.complexity >= 10) reasons.push(`+${fn.complexity} cyclomatic complexity`);
    if (fn.isUnsafe) reasons.push(`+${REVIEW_WEIGHTS.unsafe} unsafe function`);
    if (unknownCalls.length) reasons.push(`+${unknownCalls.length * REVIEW_WEIGHTS.unresolvedCalls} unknown/dynamic call surface`);
    if (ambiguousCalls.length) reasons.push(`+${ambiguousCalls.length * REVIEW_WEIGHTS.ambiguousCalls} ambiguous call surface`);
    const cpis = program.securitySurface.cpiSites.filter((site) => site.functionName === fn.name).length;
    if (cpis) reasons.push(`+${cpis * REVIEW_WEIGHTS.cpis} ${cpis} CPI site${cpis === 1 ? "" : "s"}`);
    if (reasons.length) hotspots.push({ id: `hotspot:function:${fn.qualifiedName ?? fn.name}:${fn.location.uri}:${fn.location.startLine}`, label: fn.name, score: fn.complexity + (fn.isUnsafe ? REVIEW_WEIGHTS.unsafe : 0) + cpis * REVIEW_WEIGHTS.cpis + unknownCalls.length * REVIEW_WEIGHTS.unresolvedCalls + ambiguousCalls.length * REVIEW_WEIGHTS.ambiguousCalls, reasons, location: fn.location });
  }
  program.reviewComplexity = aggregateComplexity(program.instructions.map((instruction) => instruction.reachableSurface?.reviewComplexity).filter((item) => !!item));
  return hotspots.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
function instructionComplexity(program, instruction) {
  const surface = instruction.reachableSurface;
  const cross = surface?.crossPackageSurfaces ?? [];
  const accountIds = new Set(surface?.accounts ?? []);
  const accounts = program.accounts.filter((account2) => account2.id && accountIds.has(account2.id));
  const values = [
    ["reachableComplexity", "reachable cyclomatic complexity", surface?.reachableCyclomaticComplexity ?? 0],
    ["reachableFunctions", "reachable functions", surface?.functions.length ?? 0],
    ["accounts", "accounts", accounts.length],
    ["writableAccounts", "writable accounts", accounts.filter((account2) => account2.writable).length],
    ["signerAccounts", "signer accounts", accounts.filter((account2) => account2.signer).length],
    ["rawUncheckedAccounts", "raw/unchecked accounts", accounts.filter((account2) => account2.raw || account2.unchecked).length],
    ["cpis", "CPIs", (surface?.cpis.length ?? 0) + cross.reduce((sum2, item) => sum2 + item.cpiIds.length, 0)],
    ["signedCpis", "signed CPIs", (surface?.signedCpis?.length ?? 0) + cross.reduce((sum2, item) => sum2 + item.signedCpiIds.length, 0)],
    ["dynamicCpis", "dynamic CPIs", (surface?.dynamicCpis?.length ?? 0) + cross.reduce((sum2, item) => sum2 + item.dynamicCpiIds.length, 0)],
    ["pdas", "PDAs", (surface?.pdas.length ?? 0) + cross.reduce((sum2, item) => sum2 + item.pdaIds.length, 0)],
    ["remainingAccounts", "remaining_accounts use", instruction.remainingAccounts ? 1 : 0],
    ["unsafe", "unsafe surface", (surface?.unsafeFunctions?.length ?? 0) + (surface?.unsafeBlocks ?? 0)],
    ["manualSerialization", "manual serialization", surface?.serializationSites?.length ?? 0],
    ["realloc", "reallocation", surface?.reallocSites?.length ?? 0],
    ["unresolvedCalls", "unresolved calls", surface?.unresolvedCalls?.length ?? 0],
    ["ambiguousCalls", "ambiguous calls", surface?.ambiguousCalls?.length ?? 0]
  ];
  const components = values.map(([key, label, value]) => ({ label, value, weight: REVIEW_WEIGHTS[key], contribution: value * REVIEW_WEIGHTS[key] })).filter((item) => item.value > 0);
  const score = components.reduce((sum2, item) => sum2 + item.contribution, 0);
  return { score, level: level(score), components };
}
function aggregateComplexity(items) {
  const score = items.reduce((sum2, item) => sum2 + item.score, 0);
  return { score, level: level(score), components: [{ label: "instruction review complexity total", value: score, weight: 1, contribution: score }] };
}
function level(score) {
  return score < 20 ? "Low Review Surface" : score < 50 ? "Moderate Review Surface" : score < 90 ? "Elevated Review Surface" : "Heavy Review Surface";
}

// src/analysis/capabilities.ts
init_importMetaShim();
function buildCapabilities(program, hasIdl = false) {
  const items = [];
  const add = (id, label, evidence) => {
    if (evidence.length) items.push({ id: `capability:${program.name}:${id}`, label, evidence });
  };
  const cpis = program.securitySurface.cpiSites;
  const pdas = program.securitySurface.pdaSites;
  add("pda", "Uses PDAs", pdas.flatMap((item) => item.evidence));
  add("signer-pda", "Uses signer PDAs", cpis.filter((item) => item.pdaSigned).flatMap((item) => item.evidence));
  add("cpi", "Uses CPIs", cpis.flatMap((item) => item.evidence));
  add("signed-cpi", "Uses signed CPIs", cpis.filter((item) => item.pdaSigned).flatMap((item) => item.evidence));
  add("dynamic-cpi", "Uses dynamic CPIs", cpis.filter((item) => item.targetKind === "dynamic" || !item.target).flatMap((item) => item.evidence));
  for (const [kind, label] of [["system-program", "Uses System Program"], ["spl-token", "Uses SPL Token"], ["token-2022", "Uses Token-2022"], ["associated-token", "Uses Associated Token Program"], ["memo", "Uses Memo Program"]]) add(kind, label, cpis.filter((item) => item.targetKind === kind).flatMap((item) => item.evidence));
  const flows = program.assetFlows ?? [];
  add("transfers-tokens", "Transfers tokens", flows.filter((item) => item.operationCategory === "token-transfer").flatMap((item) => item.evidence));
  add("mints-tokens", "Mints tokens", flows.filter((item) => item.operationCategory === "token-mint").flatMap((item) => item.evidence));
  add("burns-tokens", "Burns tokens", flows.filter((item) => item.operationCategory === "token-burn").flatMap((item) => item.evidence));
  add("changes-token-authorities", "Changes token authorities", flows.filter((item) => item.operationCategory === "authority-change" && (item.operation?.includes("set-authority") || item.operation?.includes("approve") || item.operation?.includes("revoke"))).flatMap((item) => item.evidence));
  add("freezes-thaws-token-accounts", "Freezes or thaws token accounts", flows.filter((item) => item.operationCategory === "freeze" || item.operationCategory === "thaw").flatMap((item) => item.evidence));
  add("creates-token-accounts", "Creates token accounts", [...flows.filter((item) => item.operationCategory === "token-account-create"), ...cpis.filter((item) => item.operationCategory === "token-account-create")].flatMap((item) => item.evidence));
  add("pda-token-authority", "Uses PDA token authority", flows.filter((item) => item.authorityType === "pda").flatMap((item) => item.evidence));
  add("sysvars", "Uses sysvars", (program.sysvars ?? []).flatMap((item) => item.evidence));
  add("instructions-sysvar", "Uses Instructions sysvar", (program.sysvars ?? []).filter((item) => item.name === "Instructions").flatMap((item) => item.evidence));
  add("remaining-accounts", "Uses remaining_accounts", program.securitySurface.remainingAccounts ? [{ description: `${program.securitySurface.remainingAccounts} remaining_accounts references` }] : []);
  add("raw-accounts", "Uses raw accounts", program.accounts.filter((item) => item.raw).flatMap((item) => item.evidence));
  add("unchecked-accounts", "Uses unchecked accounts", program.accounts.filter((item) => item.unchecked).flatMap((item) => item.evidence));
  add("unsafe", "Uses unsafe Rust", program.functions.filter((item) => item.isUnsafe).map((item) => ({ description: `unsafe function ${item.name}`, location: item.location })));
  add("runtime", "Uses direct runtime operations", (program.runtimeOperations ?? []).flatMap((item) => item.evidence));
  add("borsh", "Uses Borsh", (program.stateTypes ?? []).filter((item) => item.serialization.includes("borsh")).flatMap((item) => item.evidence));
  add("zero-copy", "Uses zero-copy state", (program.stateTypes ?? []).filter((item) => item.zeroCopy).flatMap((item) => item.evidence));
  const stateAccesses = program.stateAccessSites ?? [];
  add("field-state-dataflow", "Has field-level state dataflow", stateAccesses.filter((item) => item.fieldPath).flatMap((item) => item.evidence));
  add("lamport-mutation", "Mutates account lamports", stateAccesses.filter((item) => item.operation === "lamport-write").flatMap((item) => item.evidence));
  add("account-resize", "Resizes account data", stateAccesses.filter((item) => item.operation === "realloc").flatMap((item) => item.evidence));
  add("account-close", "Closes accounts", stateAccesses.filter((item) => item.operation === "close").flatMap((item) => item.evidence));
  add("owner-change", "Changes account ownership", stateAccesses.filter((item) => item.operation === "owner-change").flatMap((item) => item.evidence));
  add("events", "Emits events", (program.events ?? []).filter((item) => item.emissionSites.length).flatMap((item) => item.evidence));
  add("idl", "Has IDL", hasIdl ? [{ description: "IDL discovered and matched to source program" }] : []);
  add("identity-conflict", "Has program identity conflicts", program.identity?.conflicts ?? []);
  add("unresolved-calls", "Has unresolved calls", (program.callGraph?.calls ?? []).filter((item) => item.status === "unresolved" || item.status === "dynamic" || item.status === "ambiguous").flatMap((item) => item.evidence));
  return items.sort((a, b) => a.id.localeCompare(b.id));
}

// src/analysis/invariants.ts
init_importMetaShim();
function validateReport(report) {
  const diagnostics = [];
  const add = (message, key, location3) => diagnostics.push({ id: `diagnostic:invariant:${key}`, severity: "error", category: "invariant", message, location: location3 });
  const programsByName = new Map(report.programs.map((program) => [program.name, program]));
  const callIds = new Set(report.programs.flatMap((program) => program.callGraph?.calls.map((call) => call.id) ?? []));
  for (const program of report.programs) {
    unique(program.callGraph?.calls.map((item) => item.id) ?? [], `${program.name}:call`, add);
    unique(program.callGraph?.cycles?.map((item) => item.id) ?? [], `${program.name}:cycle`, add);
    const graphSymbols = new Set(program.callGraph?.symbols ?? []);
    const graphCallIds = new Set(program.callGraph?.calls.map((item) => item.id) ?? []);
    for (const call of program.callGraph?.calls ?? []) {
      if (call.status === "resolved" && (!call.target || !call.resolved)) add(`Resolved call ${call.id} is missing its target/resolved flag`, `call-resolution:${program.name}:${call.id}`, call.location);
      if (call.status !== "resolved" && call.resolved) add(`Non-resolved call ${call.id} has resolved=true`, `call-status:${program.name}:${call.id}`, call.location);
      if (call.resolutionTransforms?.some((item) => !item.trim())) add(`Call ${call.id} has an empty dispatch transform`, `call-transform:${program.name}:${call.id}`, call.location);
    }
    for (const cycle of program.callGraph?.cycles ?? []) {
      if (cycle.kind === "self-recursion" && cycle.functions.length !== 1 || cycle.kind === "mutual-recursion" && cycle.functions.length < 2) add(`Call cycle ${cycle.id} has inconsistent kind/cardinality`, `cycle-kind:${program.name}:${cycle.id}`);
      for (const fn of cycle.functions) if (!graphSymbols.has(fn)) add(`Call cycle ${cycle.id} references missing symbol ${fn}`, `cycle-symbol:${program.name}:${cycle.id}:${fn}`);
      for (const id of cycle.callIds) if (!graphCallIds.has(id)) add(`Call cycle ${cycle.id} references missing call ${id}`, `cycle-call:${program.name}:${cycle.id}:${id}`);
    }
    unique(program.instructions.map((item) => item.id).filter((id) => !!id), `${program.name}:instruction`, add);
    unique(program.accounts.map((item) => item.id).filter((id) => !!id), `${program.name}:account`, add);
    unique(program.securitySurface.cpiSites.map((item) => item.id).filter((id) => !!id), `${program.name}:cpi`, add);
    unique(program.securitySurface.pdaSites.map((item) => item.id).filter((id) => !!id), `${program.name}:pda`, add);
    unique((program.instructionDossiers ?? []).map((item) => item.id), `${program.name}:dossier`, add);
    unique((program.stateFlows ?? []).map((item) => item.id), `${program.name}:state-flow`, add);
    unique((program.stateAccessSites ?? []).map((item) => item.id), `${program.name}:state-access`, add);
    const accountIds = new Set(program.accounts.map((item) => item.id));
    const instructionIds = new Set(program.instructions.flatMap((item) => [item.id, item.name]).filter((id) => !!id));
    const cpiIds = new Set(program.securitySurface.cpiSites.map((item) => item.id).filter((id) => !!id));
    const pdaIds = new Set(program.securitySurface.pdaSites.map((item) => item.id).filter((id) => !!id));
    const stateTypeIds = new Set((program.stateTypes ?? []).map((item) => item.id));
    for (const relationship of program.relationships ?? []) {
      if (!accountIds.has(relationship.accountId)) add(`Dangling account relationship ${relationship.accountId} in ${program.name}`, `relationship-account:${program.name}:${relationship.accountId}`);
      if (!instructionIds.has(relationship.instructionId)) add(`Dangling instruction relationship ${relationship.instructionId} in ${program.name}`, `relationship-instruction:${program.name}:${relationship.instructionId}`);
    }
    for (const dossier of program.instructionDossiers ?? []) {
      if (!instructionIds.has(dossier.instructionId)) add(`Instruction dossier ${dossier.id} references missing instruction ${dossier.instructionId}`, `dossier-instruction:${program.name}:${dossier.id}`);
      for (const account2 of dossier.accounts) {
        if (!accountIds.has(account2.accountId)) add(`Instruction dossier ${dossier.id} references missing account ${account2.accountId}`, `dossier-account:${program.name}:${dossier.id}:${account2.accountId}`);
        if (account2.stateTypeId && !stateTypeIds.has(account2.stateTypeId)) add(`Instruction dossier ${dossier.id} references missing state type ${account2.stateTypeId}`, `dossier-state:${program.name}:${dossier.id}:${account2.stateTypeId}`);
      }
      for (const cpi of dossier.cpis) if (!cpiIds.has(cpi.cpiId)) add(`Instruction dossier ${dossier.id} references missing CPI ${cpi.cpiId}`, `dossier-cpi:${program.name}:${dossier.id}:${cpi.cpiId}`);
      for (const pda of dossier.pdas) if (!pdaIds.has(pda.pdaId)) add(`Instruction dossier ${dossier.id} references missing PDA ${pda.pdaId}`, `dossier-pda:${program.name}:${dossier.id}:${pda.pdaId}`);
      unique(dossier.stateAccesses.map((item) => item.id), `${program.name}:dossier-state-access:${dossier.id}`, add);
      for (const access of dossier.stateAccesses) {
        if (access.instructionId !== dossier.instructionId) add(`State access ${access.id} is attached to the wrong instruction`, `dossier-state-access-instruction:${program.name}:${access.id}`, access.location);
        if (access.resolved && (!access.accountId || !accountIds.has(access.accountId))) add(`Resolved state access ${access.id} references a missing account`, `dossier-state-access-account:${program.name}:${access.id}`, access.location);
        if (!access.functionPath.length) add(`State access ${access.id} has an empty function path`, `dossier-state-access-path:${program.name}:${access.id}`, access.location);
        for (const id of access.callPath) if (!callIds.has(id)) add(`State access ${access.id} references missing call ${id}`, `dossier-state-access-call:${program.name}:${access.id}:${id}`, access.location);
      }
      for (const detail of dossier.reachability.unresolvedCallDetails) {
        if (!callIds.has(detail.callId)) add(`Instruction dossier ${dossier.id} references missing call ${detail.callId}`, `dossier-call:${program.name}:${dossier.id}:${detail.callId}`);
        if (![...dossier.reachability.unresolvedCalls, ...dossier.reachability.ambiguousCalls].includes(detail.callId)) add(`Instruction dossier ${dossier.id} has an unclassified unresolved-call detail ${detail.callId}`, `dossier-call-classification:${program.name}:${dossier.id}:${detail.callId}`);
      }
      const crossNames = dossier.crossPackageSurfaces.map((item) => item.program);
      unique(crossNames, `${program.name}:dossier-cross-package:${dossier.id}`, add);
      for (const cross of dossier.crossPackageSurfaces) {
        const target = programsByName.get(cross.program);
        if (!target) {
          add(`Instruction dossier ${dossier.id} references missing cross-package program ${cross.program}`, `dossier-cross-program:${program.name}:${dossier.id}:${cross.program}`);
          continue;
        }
        validateReferences(cross.cpiIds, new Set(target.securitySurface.cpiSites.map((item) => item.id).filter((id) => !!id)), "CPI", cross.program, dossier.id, add);
        validateReferences(cross.pdaIds, new Set(target.securitySurface.pdaSites.map((item) => item.id).filter((id) => !!id)), "PDA", cross.program, dossier.id, add);
        validateReferences(cross.stateTypeIds, new Set((target.stateTypes ?? []).map((item) => item.id)), "state type", cross.program, dossier.id, add);
        validateReferences(cross.runtimeOperationIds, new Set((target.runtimeOperations ?? []).map((item) => item.id)), "runtime operation", cross.program, dossier.id, add);
      }
      unique(dossier.reachabilityWitnesses.map((item) => item.id), `${program.name}:dossier-witness:${dossier.id}`, add);
      for (const witness of dossier.reachabilityWitnesses) {
        const target = programsByName.get(witness.targetProgram);
        if (!target) {
          add(`Reachability witness ${witness.id} references missing program ${witness.targetProgram}`, `witness-program:${witness.id}`);
          continue;
        }
        if (!witness.functionPath.length) add(`Reachability witness ${witness.id} has an empty function path`, `witness-path:${witness.id}`);
        for (const id of witness.callPath) if (!callIds.has(id)) add(`Reachability witness ${witness.id} references missing call ${id}`, `witness-call:${witness.id}:${id}`);
        const targetIds = witness.targetKind === "function" ? new Set(target.functions.map((fn) => `${target.name}::${(fn.qualifiedName ?? fn.name).replace(/^crate::/, "")}`)) : witness.targetKind === "call" ? callIds : witness.targetKind === "cpi" ? new Set(target.securitySurface.cpiSites.map((item) => item.id).filter((id) => !!id)) : witness.targetKind === "pda" ? new Set(target.securitySurface.pdaSites.map((item) => item.id).filter((id) => !!id)) : witness.targetKind === "state-type" ? new Set((target.stateTypes ?? []).map((item) => item.id)) : witness.targetKind === "runtime-operation" ? new Set((target.runtimeOperations ?? []).map((item) => item.id)) : new Set((target.externalPrograms ?? []).map((item) => item.id));
        if (!targetIds.has(witness.targetId)) add(`Reachability witness ${witness.id} references missing ${witness.targetKind} ${witness.targetId}`, `witness-target:${witness.id}`);
      }
    }
    for (const flow of program.stateFlows ?? []) {
      if (!instructionIds.has(flow.instructionId)) add(`State flow ${flow.id} references missing instruction ${flow.instructionId}`, `state-flow-instruction:${program.name}:${flow.id}`);
      if (!accountIds.has(flow.accountId)) add(`State flow ${flow.id} references missing account ${flow.accountId}`, `state-flow-account:${program.name}:${flow.id}`);
      if (flow.stateTypeId && !stateTypeIds.has(flow.stateTypeId)) add(`State flow ${flow.id} references missing state type ${flow.stateTypeId}`, `state-flow-state:${program.name}:${flow.id}`);
      const dossier = program.instructionDossiers?.find((item) => item.instructionId === flow.instructionId);
      const dossierAccessIds = new Set(dossier?.stateAccesses.map((item) => item.id) ?? []);
      for (const id of flow.accessSiteIds) if (!dossierAccessIds.has(id)) add(`State flow ${flow.id} references missing state access ${id}`, `state-flow-access:${program.name}:${flow.id}:${id}`);
    }
    const programCpiIds = cpiIds;
    const seenFlowKeys = /* @__PURE__ */ new Set();
    const dossierFlowIds = [];
    for (const flow of program.assetFlows ?? []) {
      const key = `${flow.instructionId}:${flow.cpiId ?? ""}:${flow.location.uri}:${flow.location.startLine}:${flow.location.startColumn}`;
      if (seenFlowKeys.has(key)) add(`Duplicate asset flow emitted for ${flow.cpiId ?? flow.location.startLine}`, `asset-flow-duplicate:${flow.id}`);
      seenFlowKeys.add(key);
      if (!instructionIds.has(flow.instructionId)) add(`Asset flow ${flow.id} references missing instruction ${flow.instructionId}`, `asset-flow-instruction:${flow.id}`);
      if (flow.cpiId && !programCpiIds.has(flow.cpiId)) add(`Asset flow ${flow.id} references missing CPI ${flow.cpiId}`, `asset-flow-cpi:${flow.id}`);
      for (const pdaId of flow.signerPdaIds) if (!pdaIds.has(pdaId)) add(`Asset flow ${flow.id} references missing signer PDA ${pdaId}`, `asset-flow-pda:${flow.id}:${pdaId}`);
      for (const role of [flow.source, flow.destination, flow.mint, flow.authority, flow.delegate, flow.newAuthority]) {
        if (role?.resolved && (!role.accountId || !accountIds.has(role.accountId))) add(`Resolved asset flow role in ${flow.id} claims a missing account ${role.accountId}`, `asset-flow-role:${flow.id}:${role.expression}`);
        if (role && !role.resolved && role.accountId) add(`Unresolved asset flow role in ${flow.id} claims account ID ${role.accountId}`, `asset-flow-unresolved-claim:${flow.id}`);
        if (role && role.resolved && role.expression === "") add(`Asset flow role in ${flow.id} has an empty source expression`, `asset-flow-empty-expression:${flow.id}`);
      }
      if (flow.complete && flow.unresolvedReasons.length) add(`Complete asset flow ${flow.id} carries unresolved reasons`, `asset-flow-complete-consistency:${flow.id}`);
      const dossier = program.instructionDossiers?.find((item) => item.instructionId === flow.instructionId);
      if (dossier && !dossier.assetFlows.some((item) => item.id === flow.id)) add(`Instruction dossier for ${flow.instructionId} is missing asset flow ${flow.id}`, `asset-flow-dossier-link:${flow.id}`);
      dossierFlowIds.push(...dossier?.assetFlows.map((item) => item.id) ?? []);
    }
    unique(dossierFlowIds, `${program.name}:dossier-asset-flow`, add);
    const nodeIds = new Set(program.architecture?.nodes.map((node) => node.id) ?? []);
    for (const edge of program.architecture?.edges ?? []) {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) add(`Architecture edge references a missing node: ${edge.source} -> ${edge.target}`, `edge:${program.name}:${edge.source}:${edge.target}`);
    }
    for (const location3 of locations(program)) if (!validLocation(location3)) add(`Invalid source location ${location3.uri}:${location3.startLine}:${location3.startColumn}`, `location:${program.name}:${location3.uri}:${location3.startLine}:${location3.startColumn}`, location3);
    if (program.reviewComplexity && (!Number.isFinite(program.reviewComplexity.score) || program.reviewComplexity.score < 0)) add(`Invalid review complexity for ${program.name}`, `review:${program.name}`);
    const cfg = program.conditionalCompilation;
    if (cfg && (!Number.isInteger(cfg.inactiveItems) || cfg.inactiveItems < 0 || !Number.isInteger(cfg.unknownItems) || cfg.unknownItems < 0)) add(`Invalid conditional compilation counts for ${program.name}`, `cfg:${program.name}`);
  }
  if (report.auditManifest) {
    const dossierIds = new Set(report.programs.flatMap((program) => program.instructionDossiers?.map((item) => item.id) ?? []));
    const flowIds = new Set(report.programs.flatMap((program) => program.stateFlows?.map((item) => item.id) ?? []));
    const assetFlowCount = report.programs.reduce((sum2, program) => sum2 + (program.assetFlows?.length ?? 0), 0);
    for (const program of report.auditManifest.programs) {
      for (const id of program.instructionDossierIds) if (!dossierIds.has(id)) add(`Audit manifest references missing instruction dossier ${id}`, `manifest-dossier:${id}`);
      for (const id of program.stateFlowIds) if (!flowIds.has(id)) add(`Audit manifest references missing state flow ${id}`, `manifest-state-flow:${id}`);
    }
    for (const item of report.auditManifest.reviewQueue) if (!dossierIds.has(item.dossierId)) add(`Audit review queue references missing instruction dossier ${item.dossierId}`, `manifest-review:${item.dossierId}`);
    const scope = report.auditManifest.scope;
    if (scope.dossiers !== dossierIds.size || scope.stateFlows !== flowIds.size || scope.instructions !== report.summary.instructions) add("Audit manifest scope counts do not match detailed records", "manifest-scope");
    if (scope.assetFlows !== void 0 && scope.assetFlows !== assetFlowCount) add(`Audit manifest asset flow count ${scope.assetFlows} does not match detailed records (${assetFlowCount})`, "manifest-asset-flows");
  }
  const expected = {
    rustFiles: report.files.filter((file) => (file.language ?? "rust") === "rust").length,
    sourceFiles: report.files.length,
    functions: report.programs.reduce((sum2, program) => sum2 + program.functions.length, 0),
    instructions: report.programs.reduce((sum2, program) => sum2 + program.instructions.length, 0),
    accounts: report.programs.reduce((sum2, program) => sum2 + program.accounts.length, 0),
    cpis: report.programs.reduce((sum2, program) => sum2 + program.securitySurface.cpiSites.length, 0),
    pdas: report.programs.reduce((sum2, program) => sum2 + program.securitySurface.pdaSites.length, 0)
  };
  for (const [key, value] of Object.entries(expected)) if (report.summary[key] !== value) add(`Summary ${key}=${report.summary[key]} but detailed records total ${value}`, `summary:${key}`);
  for (const [name2, ratio] of Object.entries(report.coverage ?? {})) if (ratio && typeof ratio === "object" && "resolved" in ratio && "total" in ratio && (ratio.resolved > ratio.total || ratio.resolved < 0)) add(`Invalid semantic coverage ratio ${name2}`, `coverage:${name2}`);
  return diagnostics;
}
function unique(ids, prefix, add) {
  const seen = /* @__PURE__ */ new Set();
  for (const id of ids) {
    if (seen.has(id)) add(`Duplicate semantic ID ${id}`, `${prefix}:${id}`);
    seen.add(id);
  }
}
function validateReferences(ids, valid, kind, target, dossierId, add) {
  for (const id of ids) if (!valid.has(id)) add(`Instruction dossier ${dossierId} references missing cross-package ${kind} ${id} in ${target}`, `dossier-cross-${kind}:${dossierId}:${id}`);
}
function validLocation(location3) {
  return !!location3.uri && Number.isInteger(location3.startLine) && location3.startLine >= 1 && Number.isInteger(location3.endLine) && location3.endLine >= location3.startLine && Number.isInteger(location3.startColumn) && location3.startColumn >= 0 && Number.isInteger(location3.endColumn) && location3.endColumn >= 0 && (location3.endLine > location3.startLine || location3.endColumn >= location3.startColumn);
}
function locations(program) {
  return [...program.functions.map((item) => item.location), ...program.instructions.map((item) => item.location), ...program.accounts.map((item) => item.location), ...program.securitySurface.cpiSites.map((item) => item.location), ...program.securitySurface.pdaSites.map((item) => item.location), ...(program.stateTypes ?? []).map((item) => item.location), ...(program.stateAccessSites ?? []).map((item) => item.location), ...(program.sysvars ?? []).map((item) => item.location), ...(program.runtimeOperations ?? []).map((item) => item.location), ...(program.events ?? []).map((item) => item.location), ...(program.errors ?? []).map((item) => item.location), ...(program.instructionDossiers ?? []).map((item) => item.location), ...(program.stateFlows ?? []).map((item) => item.location)];
}

// src/analysis/accountSemantics.ts
init_importMetaShim();
function enrichNativeAccountSemantics(root, uri, program) {
  extractNativeDispatch(root, uri, program);
  for (const fn of descendants(root, "function_item")) {
    const functionName = nodeText(field(fn, "name"));
    if (!/AccountInfo|AccountView|accounts|next_account_info/.test(fn.text)) continue;
    const accounts = extractBindings(fn, uri, functionName);
    program.accounts.push(...accounts);
    const instruction = program.instructions.find((item) => item.functionName === functionName || item.handler === functionName || item.name === functionName);
    if (instruction) {
      program.relationships ??= [];
      for (const account2 of accounts) program.relationships.push({ instructionId: instruction.id ?? instruction.name, accountId: account2.id, relationship: account2.signer ? "signer" : account2.writable ? "writes" : account2.unchecked || account2.raw ? "unchecked" : "reads" });
    }
  }
}
function extractNativeDispatch(root, uri, program) {
  for (const fn of descendants(root, "function_item")) {
    const functionName = nodeText(field(fn, "name"));
    if (!/process|entrypoint|dispatch|instruction/.test(functionName)) continue;
    for (const match of descendants(fn, "match_expression")) {
      if (!/instruction|data|discriminator|unpack|deserialize|try_from/.test(match.text)) continue;
      for (const arm of descendants(match, "match_arm")) {
        const pattern = nodeText(field(arm, "pattern")) || arm.namedChildren[0]?.text || "";
        if (!pattern || pattern === "_" || pattern.includes("|")) continue;
        const name2 = instructionName(pattern);
        const callExpression = descendants(arm, "call_expression").map((item) => item.childForFieldName("function")?.text ?? "").find((item) => /^(?:(?:crate|self|super|[A-Za-z_][A-Za-z0-9_]*)::)*[a-z_][A-Za-z0-9_]*$/.test(item) && !/^(?:Some|Ok|Err)$/.test(item));
        const call = callExpression?.split("::").at(-1);
        const location3 = loc5(uri, arm);
        program.instructions.push({ id: `instruction:${uri}:dispatch:${name2}:${location3.startLine}`, name: name2, handler: call, functionName: call, discriminator: /^\d+$/.test(pattern.trim()) ? pattern.trim() : void 0, location: location3, confidence: call ? 0.88 : 0.72, evidence: [{ description: `native instruction dispatch match arm ${pattern}`, location: location3 }] });
      }
    }
    for (const conditional of descendants(fn, "if_expression")) {
      if (!/try_from_slice|deserialize|unpack/.test(conditional.text) || !(/^if\s+let\s+Ok\b/.test(conditional.text) || /\.is_ok\s*\(\s*\)/.test(conditional.text))) continue;
      const handler = descendants(conditional, "call_expression").map((item) => item.childForFieldName("function")?.text ?? "").map((item) => item.split("::").at(-1) ?? "").find((item) => /^[a-z_][A-Za-z0-9_]*$/.test(item) && !/^(?:try_from_slice|deserialize|unpack)$/.test(item));
      if (!handler) continue;
      const location3 = loc5(uri, conditional);
      program.instructions.push({ id: `instruction:${uri}:dispatch:${handler}:${location3.startLine}`, name: handler, handler, functionName: handler, location: location3, confidence: 0.86, evidence: [{ description: "native instruction dispatch through conditional deserialization", location: location3 }] });
    }
  }
  program.instructions = [...new Map(program.instructions.map((item) => [item.id ?? `${item.name}:${item.location.uri}:${item.location.startLine}`, item])).values()];
}
function extractBindings(fn, uri, functionName) {
  const accounts = [];
  let nextOrdinal = 0;
  const accountSlices = new Set(descendants(fn, "parameter").filter((parameter) => /\[\s*(?:AccountInfo|AccountView)(?:\s*<[^>]*>)?\s*\]/.test(parameter.text)).map((parameter) => parameter.childForFieldName("pattern")?.text ?? parameter.namedChildren[0]?.text ?? "").filter(Boolean));
  for (const declaration of descendants(fn, "let_declaration")) {
    const text = declaration.text;
    const next = /^\s*let\s+(?:mut\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*next_account_info\b/.exec(text);
    if (next) accounts.push(account(next[1], nextOrdinal++, declaration, uri, functionName, fn.text, "next_account_info acquisition"));
    const indexed = /^\s*let\s+(?:mut\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*&?(?:mut\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\[\s*(\d+)\s*\]/.exec(text);
    if (indexed && accountSlices.has(indexed[2])) accounts.push(account(indexed[1], Number(indexed[3]), declaration, uri, functionName, fn.text, "account slice index acquisition"));
    const get = /^\s*let\s+(?:mut\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([A-Za-z_][A-Za-z0-9_]*).*?\.get(?:_mut)?\s*\(\s*(\d+)\s*\)/.exec(text);
    if (get && accountSlices.has(get[2])) accounts.push(account(get[1], Number(get[3]), declaration, uri, functionName, fn.text, "account slice get acquisition"));
    const end = /^\s*let\s+(?:mut\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([A-Za-z_][A-Za-z0-9_]*).*?\.(first|last)(?:_mut)?\s*\(/.exec(text);
    if (end && accountSlices.has(end[2])) accounts.push(account(end[1], end[3] === "first" ? 0 : void 0, declaration, uri, functionName, fn.text, `account slice ${end[3]} acquisition`));
    const destructure = /^\s*let\s*\[([^\]]+)\]\s*=\s*([A-Za-z_][A-Za-z0-9_]*)/.exec(text);
    if (destructure && accountSlices.has(destructure[2])) {
      let ordinal = 0;
      for (const binding of splitRustExpressions(destructure[1])) {
        const name2 = binding.replace(/^(?:ref\s+)?(?:mut\s+)?/, "").trim();
        if (name2 === ".." || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name2)) continue;
        accounts.push(account(name2, ordinal++, declaration, uri, functionName, fn.text, `account slice destructuring from ${destructure[2]}`));
      }
    }
  }
  return [...new Map(accounts.map((item) => [item.id, item])).values()];
}
function account(name2, index, node, uri, functionName, functionText, description) {
  const escaped = escapeRegex2(name2);
  const steelChain = [...functionText.matchAll(new RegExp(`\\b${escaped}\\b[\\s\\S]*?(?:;|$)`, "g"))].map((match) => match[0]).join("\n");
  const steelOwner = /\.\s*has_owner\s*\(\s*([^,)]+)/.exec(steelChain);
  const steelAddress = /\.\s*has_address\s*\(\s*([^,)]+)/.exec(steelChain);
  const steelType = /\.\s*is_type\s*::\s*<\s*([^>]+)>\s*\(\s*([^,)]+)/.exec(steelChain);
  const steelSysvar = /\.\s*is_sysvar\s*\(\s*([^,)]+)/.exec(steelChain);
  const steelSeeds = /\.\s*has_seeds\s*\(\s*(&?\s*\[[\s\S]*?\])\s*,\s*([^\)]+)/.exec(steelChain);
  const steelEmpty = /\.\s*is_empty\s*\(/.test(steelChain);
  const signerCheck = new RegExp(`\\b${escaped}\\s*\\.\\s*is_signer(?:\\s*\\(\\s*\\))?`).test(functionText);
  const nativeCreateFrom = new RegExp(`(?:create_account|transfer)\\s*\\(\\s*&?\\*?${escaped}\\.key\\b`).test(functionText);
  const nativeCreateTo = new RegExp(`create_account\\s*\\(\\s*[^,]+,\\s*&?\\*?${escaped}\\.key\\b`).test(functionText);
  const cpiFromSigner = new RegExp(`\\bfrom\\s*:\\s*${escaped}\\b`).test(functionText) || nativeCreateFrom;
  const accountMetaSigner = new RegExp(`AccountMeta::new\\s*\\(\\s*\\*?${escaped}(?:\\.key|\\.address\\(\\))?\\s*,\\s*true\\s*\\)`).test(functionText);
  const signer = signerCheck || cpiFromSigner || accountMetaSigner;
  const writableCheck = new RegExp(`\\b${escaped}\\s*\\.\\s*is_writable(?:\\s*\\(\\s*\\))?`).test(functionText);
  const executable = new RegExp(`\\b${escaped}\\s*\\.\\s*(?:executable|is_executable\\s*\\(\\s*\\))`).test(functionText);
  const steelAccount = new RegExp(`\\b${escaped}\\s*\\.\\s*as_account(_mut)?\\s*::\\s*<\\s*([^>]+)>\\s*\\(\\s*([^,)]+)`).exec(functionText);
  const steelProgram = new RegExp(`\\b${escaped}\\s*\\.\\s*is_program\\s*\\(\\s*([^,)]+)`).exec(functionText);
  const steelToken = new RegExp(`\\b${escaped}\\s*\\.\\s*as_(mint|token_account)\\s*\\(`).exec(functionText);
  const ownerExpectation = new RegExp(`\\b${escaped}\\s*\\.\\s*owner(?:\\s*\\(\\s*\\))?\\s*(?:==|!=)\\s*([^;{}]+)`).exec(functionText)?.[1]?.trim() ?? new RegExp(`\\b${escaped}\\s*\\.\\s*owned_by\\s*\\(\\s*([^)]*(?:\\([^)]*\\)[^)]*)?)\\)`).exec(functionText)?.[1]?.trim() ?? steelAccount?.[3]?.trim() ?? (steelToken ? "spl-token-or-token-2022" : void 0);
  const addressExpectation = new RegExp(`\\b${escaped}\\s*\\.\\s*(?:key|address)(?:\\s*\\(\\s*\\))?\\s*(?:==|!=)\\s*([^;{}]+)`).exec(functionText)?.[1]?.trim() ?? steelProgram?.[1]?.trim();
  const member = `\\b${escaped}\\s*\\.\\s*`;
  const dataRead = new RegExp(`${member}(?:try_borrow(?:_data)?|borrow_unchecked|data_ptr|account_ptr|borrow_state|data\\s*\\.\\s*borrow|as_account(?:\\s*::|\\s*<)|as_mint|as_token_account)`).test(functionText);
  const dataWrite = new RegExp(`${member}(?:try_borrow_mut(?:_data)?|borrow_unchecked_mut|data_mut_ptr|account_mut_ptr|borrow_mut_state|data\\s*\\.\\s*borrow_mut|as_account_mut)`).test(functionText) || steelAccount?.[1] === "_mut";
  const lamportRead = new RegExp(`${member}(?:lamports\\s*\\(|try_borrow_lamports)`).test(functionText);
  const lamportWrite = new RegExp(`${member}(?:try_borrow_mut_lamports|set_lamports)`).test(functionText);
  const realloc = new RegExp(`${member}(?:realloc|resize|UnsafeResize)`).test(functionText);
  const close = new RegExp(`${member}(?:close(?:_unchecked)?|set_lamports\\s*\\(\\s*0)`).test(functionText);
  const cpiWritable = nativeCreateFrom || nativeCreateTo || new RegExp(`\\b(?:from|to)\\s*:\\s*${escaped}\\b`).test(functionText) || new RegExp(`(?:AccountMeta::new|InstructionAccount::writable)\\s*\\(\\s*\\*?${escaped}(?:\\.key|\\.address\\(\\))?`).test(functionText);
  const ownerChange = new RegExp(`${member}(?:assign|set_owner)\\s*\\(`).test(functionText);
  const writable = writableCheck || dataWrite || lamportWrite || realloc || close || ownerChange || cpiWritable;
  const location3 = loc5(uri, node);
  const steelCreateTarget = new RegExp(`\\b(?:create_program_account|create_program_account_with_bump|allocate_account|allocate_account_with_bump)\\s*(?:::\\s*<[^>]+>)?\\s*\\(\\s*&?${escaped}\\b`).test(functionText);
  const steelCreatePayer = new RegExp(`\\b(?:create_program_account|create_program_account_with_bump|allocate_account|allocate_account_with_bump)\\s*(?:::\\s*<[^>]+>)?\\s*\\(\\s*[^,]+,\\s*[^,]+,\\s*&?${escaped}\\b`).test(functionText);
  const steelLamportWrite = new RegExp(`\\b${escaped}\\s*\\.\\s*(?:send|collect)\\s*\\(`).test(functionText) || new RegExp(`\\.(?:send|collect|close)\\s*\\([^,]*,?\\s*&?${escaped}\\b`).test(functionText);
  const effectiveWritable = writable || /\.\s*is_writable\s*\(/.test(steelChain) || steelCreateTarget || steelCreatePayer || steelLamportWrite;
  const effectiveSigner = signer || /\.\s*is_signer\s*\(/.test(steelChain) || steelCreatePayer;
  const effectiveExecutable = executable || !!steelProgram || /\.\s*(?:is_executable|is_program)\s*\(/.test(steelChain);
  const effectiveOwnerExpectation = ownerExpectation ?? steelOwner?.[1]?.trim() ?? steelType?.[2]?.trim() ?? (steelSysvar ? "solana_program::sysvar::ID" : void 0);
  const effectiveAddressExpectation = addressExpectation ?? steelAddress?.[1]?.trim() ?? steelSysvar?.[1]?.trim();
  const constraints = [
    ...steelEmpty ? [{ kind: "uninitialized", location: location3 }] : [],
    ...steelOwner ? [{ kind: "owner", expression: steelOwner[1].trim(), location: location3 }] : [],
    ...steelAddress ? [{ kind: "address", expression: steelAddress[1].trim(), location: location3 }] : [],
    ...steelType ? [{ kind: "type", expression: steelType[1].trim(), location: location3 }] : [],
    ...steelProgram ? [{ kind: "program", expression: steelProgram[1].trim(), location: location3 }] : [],
    ...steelSysvar ? [{ kind: "sysvar", expression: steelSysvar[1].trim(), location: location3 }] : [],
    ...steelSeeds ? [{ kind: "seeds", expression: steelSeeds[1].trim(), location: location3 }] : []
  ];
  return {
    id: `account:${uri}:${functionName}:${name2}:${location3.startLine}`,
    name: name2,
    type: /AccountView/.test(functionText) ? "AccountView" : "AccountInfo",
    wrapperType: /AccountView/.test(functionText) ? "AccountView" : "AccountInfo",
    stateType: steelAccount?.[2]?.trim() ?? steelType?.[1]?.trim() ?? (steelToken?.[1] === "mint" ? "Mint" : steelToken ? "TokenAccount" : void 0),
    ordinal: index,
    index,
    signer: effectiveSigner,
    writable: effectiveWritable,
    executable: effectiveExecutable,
    raw: true,
    ownerExpectation: effectiveOwnerExpectation,
    addressExpectation: effectiveAddressExpectation,
    ownerValidated: !!effectiveOwnerExpectation,
    addressValidated: !!effectiveAddressExpectation,
    dataAccess: [...dataRead ? ["read"] : [], ...dataWrite ? ["write"] : []],
    lamportAccess: [...lamportRead ? ["read"] : [], ...lamportWrite || steelLamportWrite ? ["write"] : []],
    lifecycle: [...steelCreateTarget ? ["init", "create"] : [], ...dataWrite || effectiveWritable ? ["write"] : ["read"], ...realloc ? ["realloc"] : [], ...close ? ["close"] : [], ...lamportWrite || steelLamportWrite ? ["lamport-transfer"] : []],
    constraints,
    serialization: [/borsh|try_from_slice|deserialize/i.test(functionText) ? "borsh" : "", /Pack::unpack|unpack_from_slice/.test(functionText) ? "pack" : "", /bytemuck|Pod|try_from_bytes/.test(functionText) ? "zero-copy" : ""].filter(Boolean),
    location: location3,
    confidence: 0.88,
    evidence: [{ description, location: location3 }, ...signerCheck ? [{ description: `actual signer validation for ${name2}`, location: location3 }] : [], ...!signerCheck && signer ? [{ description: `CPI signer requirement for ${name2}`, location: location3 }] : [], ...writableCheck ? [{ description: `actual writable validation for ${name2}`, location: location3 }] : [], ...!writableCheck && writable ? [{ description: `evidence-backed writable access for ${name2}`, location: location3 }] : [], ...steelAccount ? [{ description: `Steel typed account validation as ${steelAccount[2].trim()}`, location: location3 }] : [], ...steelToken ? [{ description: `Steel ${steelToken[1]} validation`, location: location3 }] : [], ...ownerExpectation ? [{ description: `owner validation against ${ownerExpectation}`, location: location3 }] : [], ...addressExpectation ? [{ description: `address validation against ${addressExpectation}`, location: location3 }] : []]
  };
}
function instructionName(pattern) {
  const numeric = /(?:^|[({,]\s*)(\d+)\s*(?:[,)}]|$)/.exec(pattern)?.[1];
  if (numeric !== void 0) return `discriminator_${numeric}`;
  const constant = /\bIX_([A-Z][A-Z0-9_]*)\b/.exec(pattern)?.[1];
  if (constant) return constant.toLowerCase();
  const trimmed = pattern.trim().replace(/\([^)]*\)|\{[^}]*\}/g, "");
  return trimmed.split("::").at(-1)?.replace(/[^A-Za-z0-9_]/g, "") || "unknown";
}
function escapeRegex2(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function loc5(uri, node) {
  return { uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column };
}

// src/adapters/metadataAdapter.ts
init_importMetaShim();
function enrichMetadataFrameworks(root, uri) {
  const evidence = [];
  const instructions = [];
  const accounts = [];
  if (/\b(?:codama|Codama)\b/.test(root.text)) evidence.push({ framework: "codama-metadata", confidence: 0.75, evidence: [{ description: "Codama source metadata/macro evidence" }] });
  if (/\bShank(?:Instruction|Account|Type|Builder)\b/.test(root.text)) evidence.push({ framework: "shank-metadata", confidence: 0.9, evidence: [{ description: "Shank derive metadata" }] });
  for (const enumeration of descendants(root, "enum_item")) {
    if (!/ShankInstruction/.test(attributesFor4(enumeration))) continue;
    let nextDiscriminator = 0;
    for (const variant of descendants(enumeration, "enum_variant")) {
      const name2 = nodeText(field(variant, "name"));
      const location3 = loc6(uri, variant);
      const contextType = `shank:${name2}`;
      const explicit = /=\s*([^,}]+)/.exec(variant.text)?.[1]?.trim();
      const explicitNumber = explicit && /^\d+$/.test(explicit) ? Number(explicit) : void 0;
      const discriminator = explicit ?? (nextDiscriminator !== void 0 ? String(nextDiscriminator) : void 0);
      nextDiscriminator = explicit ? explicitNumber !== void 0 ? explicitNumber + 1 : void 0 : nextDiscriminator !== void 0 ? nextDiscriminator + 1 : void 0;
      instructions.push({ id: `instruction:${uri}:shank:${name2}:${location3.startLine}`, name: name2, discriminator, arguments: variantArguments(variant), contextType, location: location3, confidence: 0.92, evidence: [{ description: `#[derive(ShankInstruction)] enum variant${explicit ? " explicit" : " implicit"} discriminator${discriminator !== void 0 ? ` ${discriminator}` : ""}`, location: location3 }] });
      let ordinal = 0;
      for (const attribute of attributesFor4(variant).matchAll(/#\[account\s*\(([^\]]*)\)\]/g)) {
        const body2 = attribute[1];
        const index = Number(/^\s*(\d+)/.exec(body2)?.[1] ?? ordinal);
        const accountName = /name\s*=\s*"([^"]+)"/.exec(body2)?.[1] ?? `account_${index}`;
        const accountLocation = loc6(uri, variant);
        accounts.push({ id: `account:${uri}:shank:${name2}:${index}`, name: accountName, type: "AccountInfo", wrapperType: "AccountInfo", contextType, ordinal: index, index, signer: /\b(?:signer|sign|sig)\b/.test(body2), writable: /\b(?:writable|write|writ|mut)\b/.test(body2), optional: /\boptional\b/.test(body2), raw: true, location: accountLocation, confidence: 0.9, evidence: [{ description: `Shank account metadata ${body2.trim()}`, location: accountLocation }] });
        ordinal++;
      }
    }
  }
  return { evidence, instructions, accounts };
}
function variantArguments(variant) {
  const named = descendants(variant, "field_declaration").map((item) => ({ name: nodeText(field(item, "name")), type: nodeText(field(item, "type")) }));
  if (named.length) return named;
  const tuple = descendants(variant, "ordered_field_declaration_list")[0];
  return (tuple?.namedChildren ?? []).filter((item) => item !== null).map((item, index) => {
    const type = item.text.trim();
    const baseName = /(?:^|::)([A-Za-z_][A-Za-z0-9_]*)\s*(?:<.*>)?$/.exec(type)?.[1];
    return { name: baseName ? baseName[0].toLowerCase() + baseName.slice(1) : `arg${index}`, type };
  });
}
function attributesFor4(node) {
  const values = [];
  let sibling = node.previousNamedSibling;
  while (sibling?.type === "attribute_item") {
    values.unshift(sibling.text);
    sibling = sibling.previousNamedSibling;
  }
  return values.join("\n");
}
function loc6(uri, node) {
  return { uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column };
}

// src/utils/concurrency.ts
init_importMetaShim();
async function mapConcurrent(items, requestedLimit, operation) {
  if (!items.length) return [];
  const limit = Math.max(1, Math.min(items.length, Math.floor(requestedLimit) || 1));
  const results = new Array(items.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await operation(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

// src/analysis/auditProducts.ts
init_importMetaShim();
function refreshAuditProducts(report) {
  for (const program of report.programs) {
    program.instructionDossiers = buildInstructionDossiers(program);
    program.stateFlows = buildStateFlows(program);
    program.assetFlows = (program.assetFlows ?? []).sort((a, b) => a.id.localeCompare(b.id));
  }
  report.auditManifest = buildAuditManifest(report);
}
function buildInstructionDossiers(program) {
  return [...program.instructions].sort(byInstruction).map((instruction) => {
    const instructionId = instruction.id ?? instruction.name;
    const surface = instruction.reachableSurface;
    const accountIds = surface?.accounts ?? [];
    const directAccounts = new Set(surface?.directAccounts ?? []);
    const directCpis = new Set(surface?.directCpis ?? []);
    const directPdas = new Set(surface?.directPdas ?? []);
    const accounts = program.accounts.filter((account2) => account2.id && accountIds.includes(account2.id)).map((account2) => {
      const relationship = (program.relationships ?? []).find((item) => item.instructionId === instructionId && item.accountId === account2.id)?.relationship ?? "unknown";
      const stateTypeId = account2.stateType ? program.stateTypes?.find((item) => item.name === account2.stateType)?.id : void 0;
      const dossier = {
        accountId: account2.id,
        name: account2.name ?? account2.type,
        type: account2.type,
        stateTypeId,
        stateType: account2.stateType,
        relationship,
        direct: directAccounts.has(account2.id),
        signer: !!account2.signer,
        writable: !!account2.writable,
        executable: !!account2.executable,
        unchecked: !!account2.unchecked || !!account2.raw,
        optional: !!account2.optional,
        ownerValidation: { validated: !!account2.ownerValidated, expected: account2.ownerExpectation },
        addressValidation: { validated: !!account2.addressValidated, expected: account2.addressExpectation },
        pdaId: account2.pdaId,
        lifecycle: sorted(account2.lifecycle ?? []),
        dataAccess: sorted(account2.dataAccess ?? []),
        lamportAccess: sorted(account2.lamportAccess ?? []),
        serialization: sorted(account2.serialization ?? []),
        stateAccesses: [...surface?.stateAccesses ?? []].filter((item) => item.accountId === account2.id).sort((a, b) => a.id.localeCompare(b.id)),
        constraints: sorted((account2.constraints ?? []).map((item) => item.kind)),
        relations: [...account2.relations ?? []].sort((a, b) => `${a.kind}:${a.target}`.localeCompare(`${b.kind}:${b.target}`)),
        location: account2.location,
        evidence: dedupeEvidence(account2.evidence)
      };
      return dossier;
    }).sort((a, b) => a.accountId.localeCompare(b.accountId));
    const cpis = program.securitySurface.cpiSites.filter((site) => site.id && surface?.cpis.includes(site.id)).map((site) => {
      const dossier = {
        cpiId: site.id,
        direct: directCpis.has(site.id),
        target: site.target,
        targetKind: site.targetKind,
        operation: site.operation,
        operationCategory: site.operationCategory,
        functionName: site.functionName,
        invocationApi: site.invocationApi,
        programAccountExpression: site.programAccountExpression,
        accountArguments: sorted(site.accountArguments ?? []),
        pdaSigned: site.pdaSigned,
        signerPdaIds: sorted(site.signerPdaIds ?? []),
        location: site.location,
        evidence: dedupeEvidence(site.evidence)
      };
      return dossier;
    }).sort((a, b) => a.cpiId.localeCompare(b.cpiId));
    const pdas = program.securitySurface.pdaSites.filter((site) => site.id && surface?.pdas.includes(site.id)).map((site) => {
      const dossier = {
        pdaId: site.id,
        direct: directPdas.has(site.id),
        seeds: [...site.seeds ?? []],
        bump: site.bump,
        programIdExpression: site.programIdExpression,
        usedAsSigner: !!site.usedAsSigner,
        relatedAccountId: site.relatedAccountId,
        relatedCpiIds: sorted(site.relatedCpiIds ?? []),
        location: site.location,
        evidence: dedupeEvidence(site.evidence)
      };
      return dossier;
    }).sort((a, b) => a.pdaId.localeCompare(b.pdaId));
    return {
      id: `dossier:${program.name}:${instructionId}`,
      program: program.name,
      instructionId,
      name: instruction.name,
      handler: instruction.handler ?? instruction.functionName,
      contextType: instruction.contextType,
      discriminator: instruction.discriminator,
      arguments: [...instruction.arguments ?? []],
      returns: instruction.returns,
      remainingAccounts: instruction.remainingAccounts,
      location: instruction.location,
      reachability: {
        complete: surface?.complete ?? false,
        incompleteReasons: sorted(surface?.incompleteReasons ?? []),
        functions: sorted(surface?.functions ?? []),
        unresolvedCalls: sorted(surface?.unresolvedCalls ?? []),
        ambiguousCalls: sorted(surface?.ambiguousCalls ?? []),
        unresolvedCallDetails: [...surface?.unresolvedCallDetails ?? []].sort((a, b) => a.callId.localeCompare(b.callId))
      },
      accounts,
      cpis,
      pdas,
      assetFlows: (program.assetFlows ?? []).filter((flow) => flow.instructionId === instructionId).sort((a, b) => a.id.localeCompare(b.id)),
      stateAccesses: [...surface?.stateAccesses ?? []].sort((a, b) => a.id.localeCompare(b.id)),
      stateTypeIds: sorted(accounts.flatMap((item) => item.stateTypeId ? [item.stateTypeId] : [])),
      externalProgramIds: sorted(surface?.externalPrograms ?? []),
      sysvarIds: sorted(surface?.sysvars ?? []),
      runtimeOperationIds: sorted(surface?.syscalls ?? []),
      eventIds: sorted(surface?.events ?? []),
      errorIds: sorted(surface?.errors ?? []),
      crossPackageSurfaces: [...surface?.crossPackageSurfaces ?? []].sort((a, b) => a.program.localeCompare(b.program)),
      reachabilityWitnesses: [...surface?.witnesses ?? []].sort((a, b) => a.id.localeCompare(b.id)),
      semanticSites: {
        initialization: sorted(surface?.initializationSites ?? []),
        realloc: sorted(surface?.reallocSites ?? []),
        close: sorted(surface?.closeSites ?? []),
        serialization: sorted(surface?.serializationSites ?? []),
        deserialization: sorted(surface?.deserializationSites ?? []),
        lamportMutation: sorted(surface?.lamportMutationSites ?? []),
        dataMutation: sorted(surface?.dataMutationSites ?? [])
      },
      reviewComplexity: surface?.reviewComplexity,
      evidence: dedupeEvidence(instruction.evidence)
    };
  });
}
function buildStateFlows(program) {
  return (program.instructionDossiers ?? []).flatMap((dossier) => dossier.accounts.map((account2) => {
    const operations = new Set(account2.lifecycle ?? []);
    if (!operations.size) {
      if (account2.relationship === "writes") operations.add("write");
      else if (account2.relationship === "reads" || account2.relationship === "signer") operations.add("read");
      else operations.add("unknown");
    }
    return {
      id: `state-flow:${program.name}:${dossier.instructionId}:${account2.accountId}`,
      instructionId: dossier.instructionId,
      accountId: account2.accountId,
      stateTypeId: account2.stateTypeId,
      stateType: account2.stateType,
      direct: account2.direct,
      relationship: account2.relationship,
      operations: sorted([...operations]),
      dataAccess: sorted(account2.dataAccess ?? []),
      lamportAccess: sorted(account2.lamportAccess ?? []),
      serialization: sorted(account2.serialization),
      fieldReads: sorted(account2.stateAccesses.filter((item) => item.operation === "data-read" && item.fieldPath).map((item) => item.fieldPath)),
      fieldWrites: sorted(account2.stateAccesses.filter((item) => item.operation === "data-write" && item.fieldPath).map((item) => item.fieldPath)),
      accessSiteIds: sorted(account2.stateAccesses.map((item) => item.id)),
      accessComplete: account2.stateAccesses.every((item) => item.resolved),
      location: account2.location,
      evidence: dedupeEvidence([...account2.evidence, ...account2.stateAccesses.flatMap((item) => item.evidence), { description: `Account is ${account2.relationship} by instruction ${dossier.name}`, location: account2.location }])
    };
  })).sort((a, b) => a.id.localeCompare(b.id));
}
function buildAuditManifest(report) {
  const programs = [...report.programs].sort((a, b) => a.name.localeCompare(b.name));
  const reviewQueue = programs.flatMap((program) => (program.instructionDossiers ?? []).map((dossier) => ({
    dossierId: dossier.id,
    program: program.name,
    instruction: dossier.name,
    score: dossier.reviewComplexity?.score ?? 0,
    complete: dossier.reachability.complete,
    reasons: sorted([
      ...dossier.reachability.incompleteReasons,
      ...dossier.reviewComplexity?.components.filter((item) => item.contribution > 0).map((item) => `${item.label}: ${item.value}`) ?? []
    ]),
    location: dossier.location
  }))).sort((a, b) => b.score - a.score || a.dossierId.localeCompare(b.dossierId));
  const externalPrograms = programs.flatMap((program) => (program.externalPrograms ?? []).map((item) => ({
    id: `${program.name}:${item.id}`,
    program: program.name,
    name: item.name,
    kind: item.kind,
    programId: item.programId,
    cpiCount: item.cpiCount,
    signedCpiCount: item.signedCpiCount,
    calledByInstructions: sorted(item.calledByInstructions)
  }))).sort((a, b) => a.id.localeCompare(b.id));
  const allDossiers = programs.flatMap((program) => program.instructionDossiers ?? []);
  const allFlows = programs.flatMap((program) => program.stateFlows ?? []);
  const assetFlows = programs.flatMap((program) => program.assetFlows ?? []);
  const byCategory = {};
  for (const flow of assetFlows) if (flow.operationCategory) byCategory[flow.operationCategory] = (byCategory[flow.operationCategory] ?? 0) + 1;
  const instructionsWithFlows = new Set(assetFlows.map((flow) => `${flow.program}:${flow.instructionId}`)).size;
  const scopeAssetFlows = {
    total: assetFlows.length,
    instructionsWithFlows,
    byCategory,
    splTokenPrograms: programs.filter((program) => (program.assetFlows ?? []).some((flow) => flow.tokenProgram === "spl-token")).length,
    token2022Programs: programs.filter((program) => (program.assetFlows ?? []).some((flow) => flow.tokenProgram === "token-2022")).length
  };
  return {
    formatVersion: 1,
    analysisMode: "local-offline-deterministic",
    scope: {
      programs: programs.length,
      packages: report.workspaceGraph?.packages.length ?? new Set(programs.map((item) => item.packageId).filter(Boolean)).size,
      sourceFiles: report.files.length,
      instructions: report.summary.instructions,
      dossiers: allDossiers.length,
      stateFlows: allFlows.length,
      assetFlows: scopeAssetFlows.total,
      instructionsWithAssetFlows: scopeAssetFlows.instructionsWithFlows,
      splTokenPrograms: scopeAssetFlows.splTokenPrograms,
      token2022Programs: scopeAssetFlows.token2022Programs,
      assetFlowCategories: Object.fromEntries(Object.entries(scopeAssetFlows.byCategory).sort(([a], [b]) => a.localeCompare(b)))
    },
    programs: programs.map((program) => ({
      program: program.name,
      packageId: program.packageId,
      packageKind: program.packageKind,
      programId: program.identity?.programId,
      frameworks: sorted(program.frameworkEvidence.map((item) => item.framework)),
      sourceFiles: sorted((program.sourceFiles ?? program.rustFiles).map((item) => item.uri)),
      instructionDossierIds: sorted((program.instructionDossiers ?? []).map((item) => item.id)),
      stateFlowIds: sorted((program.stateFlows ?? []).map((item) => item.id)),
      externalProgramIds: sorted((program.externalPrograms ?? []).map((item) => `${program.name}:${item.id}`)),
      dependencyCount: program.packageDependencies?.length ?? 0,
      reviewScore: program.reviewComplexity?.score ?? 0,
      coverageComplete: (program.instructionDossiers ?? []).every((item) => item.reachability.complete)
    })),
    reviewQueue,
    externalPrograms,
    unresolved: {
      incompleteInstructionDossierIds: sorted(allDossiers.filter((item) => !item.reachability.complete).map((item) => item.id)),
      unknownOrDynamicCallIds: sorted(programs.flatMap((program) => program.callGraph?.calls.filter((item) => item.status === "unresolved" || item.status === "dynamic").map((item) => item.id) ?? [])),
      ambiguousCallIds: sorted(programs.flatMap((program) => program.callGraph?.calls.filter((item) => item.status === "ambiguous").map((item) => item.id) ?? [])),
      dynamicCpiIds: sorted(programs.flatMap((program) => program.securitySurface.cpiSites.filter((item) => item.id && (item.targetKind === "dynamic" || !item.target)).map((item) => item.id))),
      idlMismatchItems: sorted(report.idl?.reconciliations.filter((item) => item.status !== "MATCHED").map((item) => item.item) ?? [])
    },
    evidence: [
      { description: "Audit manifest derived locally from parsed Rust, Cargo metadata, framework semantics, reachability, and optional local IDLs." },
      { description: "Records describe observable analysis evidence and review scope; they do not assert vulnerability findings." }
    ]
  };
}
function dedupeEvidence(items) {
  return [...new Map(items.map((item) => [`${item.description}:${item.location?.uri ?? ""}:${item.location?.startLine ?? ""}:${item.location?.startColumn ?? ""}`, item])).values()].sort((a, b) => `${a.location?.uri ?? ""}:${a.location?.startLine ?? 0}:${a.description}`.localeCompare(`${b.location?.uri ?? ""}:${b.location?.startLine ?? 0}:${b.description}`));
}
function sorted(items) {
  return [...new Set(items)].sort();
}
function byInstruction(a, b) {
  return `${a.location.uri}:${a.location.startLine}:${a.name}`.localeCompare(`${b.location.uri}:${b.location.startLine}:${b.name}`);
}

// src/analysis/cfg.ts
init_importMetaShim();
function analyzeConditionalCompilation(root, uri, source, enabledFeatures, profile) {
  const context = { features: enabledFeatures ? new Set(enabledFeatures) : void 0, profile, options: new Set(profile?.cfgOptions.map(normalizeOption) ?? []) };
  const inactive = [];
  const unknownRanges = [];
  let inactiveItems = 0;
  walk(root, (node) => {
    if (node.type === "attribute_item") return;
    const attributes = precedingAttributes(node);
    if (!attributes.length) return;
    const evaluations = attributes.flatMap((attribute) => evaluateAttribute(attribute.text, context));
    if (!evaluations.length) return;
    const status = evaluations.some((item) => item.status === "inactive") ? "inactive" : evaluations.some((item) => item.status === "unknown") ? "unknown" : "active";
    const predicates = [...new Set(evaluations.filter((item) => item.status !== "active").map((item) => item.predicate))].sort();
    if (status === "inactive") {
      inactiveItems++;
      inactive.push({ start: attributes[0].startIndex, end: node.endIndex });
    } else if (status === "unknown") {
      const location3 = { uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column };
      unknownRanges.push({ status: "unknown", predicates, startLine: location3.startLine, startColumn: location3.startColumn, endLine: location3.endLine, endColumn: location3.endColumn, evidence: predicates.map((predicate) => ({ description: `Conditional compilation could not be evaluated: ${predicate}`, location: location3 })) });
    }
  });
  return {
    source: maskByteRanges(source, inactive),
    inactiveItems,
    unknownItems: unknownRanges.length,
    unknownPredicates: [...new Set(unknownRanges.flatMap((item) => item.predicates))].sort(),
    unknownRanges
  };
}
function evaluateAttribute(attribute, context) {
  const text = attribute.trim();
  if (text.startsWith("#[cfg(") && text.endsWith(")]")) {
    const predicate = text.slice(6, -2).trim();
    return [{ status: evaluatePredicate(predicate, context), predicate }];
  }
  if (text.startsWith("#[cfg_attr(") && text.endsWith(")]")) {
    const body2 = text.slice(11, -2);
    const parts2 = splitTopLevel2(body2);
    if (parts2.length < 2) return [];
    const condition = parts2.shift().trim();
    const conditionStatus = evaluatePredicate(condition, context);
    const nested = parts2.flatMap((item) => evaluateNestedCfg(item.trim(), context));
    if (!nested.length || conditionStatus === "inactive") return [];
    if (conditionStatus === "unknown") return [{ status: "unknown", predicate: `cfg_attr(${condition}, ${parts2.join(", ")})` }];
    return nested;
  }
  return [];
}
function evaluateNestedCfg(value, context) {
  if (!value.startsWith("cfg(") || !value.endsWith(")")) return [];
  const predicate = value.slice(4, -1).trim();
  return [{ status: evaluatePredicate(predicate, context), predicate }];
}
function evaluatePredicate(value, context) {
  const predicate = value.trim();
  if (predicate === "true") return "active";
  if (predicate === "false") return "inactive";
  if (predicate === "test") return context.profile ? context.profile.mode === "test" ? "active" : "inactive" : "inactive";
  if (predicate === "debug_assertions" && context.profile?.debugAssertions !== void 0) return context.profile.debugAssertions ? "active" : "inactive";
  const feature = /^feature\s*=\s*(?:"([^"]+)"|r#"([^"]+)"#)$/.exec(predicate);
  if (feature) {
    if (context.features) return context.features.has(feature[1] ?? feature[2]) ? "active" : "inactive";
    if (context.options.has(normalizeOption(predicate))) return "active";
    return context.profile?.cfgKnowledge === "complete" ? "inactive" : "unknown";
  }
  const composite = /^(all|any|not)\s*\(([\s\S]*)\)$/.exec(predicate);
  if (composite) {
    const values = splitTopLevel2(composite[2]).map((item) => evaluatePredicate(item, context));
    if (composite[1] === "not") return values.length === 1 ? invert(values[0]) : "unknown";
    if (composite[1] === "all") return values.some((item) => item === "inactive") ? "inactive" : values.every((item) => item === "active") ? "active" : "unknown";
    return values.some((item) => item === "active") ? "active" : values.every((item) => item === "inactive") ? "inactive" : "unknown";
  }
  const normalized = normalizeOption(predicate);
  if (context.options.has(normalized)) return "active";
  if (context.profile?.cfgKnowledge === "complete" && isConfigurationOption(predicate)) return "inactive";
  return "unknown";
}
function precedingAttributes(node) {
  const attributes = [];
  let sibling = node.previousNamedSibling;
  while (sibling?.type === "attribute_item") {
    attributes.unshift(sibling);
    sibling = sibling.previousNamedSibling;
  }
  return attributes;
}
function walk(node, visit) {
  for (const child of node.namedChildren.filter((item) => !!item)) {
    visit(child);
    if (child.type !== "attribute_item") walk(child, visit);
  }
}
function invert(status) {
  return status === "active" ? "inactive" : status === "inactive" ? "active" : "unknown";
}
function normalizeOption(value) {
  return value.trim().replace(/\s*=\s*/, "=");
}
function isConfigurationOption(value) {
  return /^[A-Za-z_][A-Za-z0-9_]*(?:\s*=\s*(?:"[^"]*"|r#"[^"]*"#))?$/.test(value.trim());
}
function splitTopLevel2(value) {
  const output2 = [];
  let depth = 0;
  let quoted = false;
  let start2 = 0;
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (char === '"' && value[index - 1] !== "\\") quoted = !quoted;
    else if (!quoted && char === "(") depth++;
    else if (!quoted && char === ")") depth--;
    else if (!quoted && char === "," && depth === 0) {
      output2.push(value.slice(start2, index));
      start2 = index + 1;
    }
  }
  output2.push(value.slice(start2));
  return output2.map((item) => item.trim()).filter(Boolean);
}
function maskByteRanges(source, ranges) {
  if (!ranges.length) return source;
  const bytes = Buffer.from(source);
  for (const range of ranges) for (let index = Math.max(0, range.start); index < Math.min(bytes.length, range.end); index++) if (bytes[index] !== 10 && bytes[index] !== 13) bytes[index] = 32;
  return bytes.toString();
}

// src/analysis/reachabilityWitness.ts
init_importMetaShim();
function attachReachabilityWitnesses(programs) {
  const names = [...programs].sort((a, b) => b.name.length - a.name.length);
  const canonical = (program, value) => {
    if (value.startsWith("crate::")) return `${program.name}::${value.slice(7)}`;
    if (names.some((item) => value.startsWith(`${item.name}::`))) return value;
    return `${program.name}::${value}`;
  };
  const adjacency = /* @__PURE__ */ new Map();
  for (const program of programs) for (const call of program.callGraph?.calls ?? []) {
    if (call.status !== "resolved" || !call.target) continue;
    const edge = { source: canonical(program, call.caller), target: canonical(program, call.target), call };
    adjacency.set(edge.source, [...adjacency.get(edge.source) ?? [], edge]);
  }
  for (const edges of adjacency.values()) edges.sort((a, b) => `${a.target}:${a.call.id}`.localeCompare(`${b.target}:${b.call.id}`));
  for (const sourceProgram of programs) for (const instruction of sourceProgram.instructions) {
    const surface = instruction.reachableSurface;
    if (!surface) continue;
    const root = canonical(sourceProgram, surface.directHandler ?? instruction.handler ?? instruction.functionName ?? instruction.name);
    const paths = shortestPaths(root, adjacency);
    const witnesses = /* @__PURE__ */ new Map();
    const add = (kind, targetId, targetProgram, path15, location3, description) => {
      if (!path15) return;
      const id = `witness:${sourceProgram.name}:${instruction.id ?? instruction.name}:${kind}:${targetProgram.name}:${targetId}`;
      const evidence = [
        { description: description ?? `${kind} ${targetId} is reachable from instruction ${instruction.name}`, location: location3 },
        ...path15.calls.map((call, index) => ({ description: path15.functions[index + 1] ? `Resolved call step ${path15.functions[index]} -> ${path15.functions[index + 1]} via ${call.sourceExpression ?? call.callee}` : `Terminal ${call.status ?? "unresolved"} call from ${path15.functions.at(-1)} via ${call.sourceExpression ?? call.callee}`, location: call.location }))
      ];
      witnesses.set(`${kind}:${targetProgram.name}:${targetId}`, { id, targetKind: kind, targetId, targetProgram: targetProgram.name, functionPath: path15.functions, callPath: path15.calls.map((call) => call.id), location: location3, evidence });
    };
    const pathFor = (program, value) => paths.get(canonical(program, value));
    const ownerPath = (program, functionName, location3) => {
      const candidates = program.functions.filter((fn2) => (!functionName || fn2.name === functionName) && contains3(fn2.location, location3)).sort((a, b) => a.lines - b.lines || (a.qualifiedName ?? a.name).localeCompare(b.qualifiedName ?? b.name));
      const fallback = functionName ? program.functions.filter((fn2) => fn2.name === functionName) : [];
      const fn = candidates[0] ?? (fallback.length === 1 ? fallback[0] : void 0);
      return fn ? pathFor(program, fn.qualifiedName ?? fn.name) : program === sourceProgram ? paths.get(root) : void 0;
    };
    for (const fn of surface.functions) {
      const program = programForFunction(fn, sourceProgram, names);
      const path15 = pathFor(program, fn);
      const metric = metricForFunction(program, fn);
      if (metric) add("function", canonical(program, fn), program, path15, metric.location);
    }
    for (const detail of surface.unresolvedCallDetails ?? []) {
      const owner = programs.find((program) => program.callGraph?.calls.some((call2) => call2.id === detail.callId)) ?? sourceProgram;
      const call = owner.callGraph?.calls.find((item) => item.id === detail.callId);
      const path15 = call ? pathFor(owner, call.caller) : void 0;
      add("call", detail.callId, owner, path15 ? { functions: path15.functions, calls: [...path15.calls, ...call ? [call] : []] } : void 0, detail.location, `${detail.status} call ${detail.expression}: ${detail.reason}`);
    }
    addSites(sourceProgram, surface.cpis, "cpi", sourceProgram.securitySurface.cpiSites, (item) => ownerPath(sourceProgram, item.functionName, item.location), add);
    addSites(sourceProgram, surface.pdas, "pda", sourceProgram.securitySurface.pdaSites, (item) => ownerPath(sourceProgram, item.enclosingFunction, item.location), add);
    addSites(sourceProgram, surface.syscalls ?? [], "runtime-operation", sourceProgram.runtimeOperations ?? [], (item) => ownerPath(sourceProgram, item.functionName, item.location), add);
    for (const stateName of surface.stateTypes ?? []) {
      const state = sourceProgram.stateTypes?.find((item) => item.name === stateName);
      if (state) add("state-type", state.id, sourceProgram, paths.get(root), state.location, `State type ${state.name} is connected through an instruction account relationship`);
    }
    for (const cross of surface.crossPackageSurfaces ?? []) {
      const program = programs.find((item) => item.name === cross.program);
      if (!program) continue;
      addSites(program, cross.cpiIds, "cpi", program.securitySurface.cpiSites, (item) => ownerPath(program, item.functionName, item.location), add);
      addSites(program, cross.pdaIds, "pda", program.securitySurface.pdaSites, (item) => ownerPath(program, item.enclosingFunction, item.location), add);
      addSites(program, cross.runtimeOperationIds, "runtime-operation", program.runtimeOperations ?? [], (item) => ownerPath(program, item.functionName, item.location), add);
      for (const id of cross.stateTypeIds) {
        const state = program.stateTypes?.find((item) => item.id === id);
        if (!state) continue;
        const owners = program.functions.filter((fn) => fn.stateAccess?.includes(state.name)).map((fn) => pathFor(program, fn.qualifiedName ?? fn.name)).filter((item) => !!item).sort((a, b) => a.calls.length - b.calls.length || a.functions.join(":").localeCompare(b.functions.join(":")));
        add("state-type", id, program, owners[0], state.location);
      }
    }
    for (const externalId of surface.externalPrograms) {
      const cpi = sourceProgram.securitySurface.cpiSites.find((item) => `external:${item.target ?? item.invocationApi ?? "unknown"}` === externalId);
      if (cpi) add("external-program", externalId, sourceProgram, ownerPath(sourceProgram, cpi.functionName, cpi.location), cpi.location);
    }
    for (const cross of surface.crossPackageSurfaces ?? []) {
      const program = programs.find((item) => item.name === cross.program);
      if (!program) continue;
      for (const externalId of cross.externalProgramIds) {
        const cpi = program.securitySurface.cpiSites.find((item) => `external:${item.target ?? item.invocationApi ?? "unknown"}` === externalId && cross.cpiIds.includes(item.id ?? ""));
        if (cpi) add("external-program", externalId, program, ownerPath(program, cpi.functionName, cpi.location), cpi.location);
      }
    }
    surface.witnesses = [...witnesses.values()].sort((a, b) => `${a.targetKind}:${a.targetProgram}:${a.targetId}`.localeCompare(`${b.targetKind}:${b.targetProgram}:${b.targetId}`));
    extendArchitecture(sourceProgram, surface.witnesses, names);
  }
}
function shortestPaths(root, adjacency) {
  const paths = /* @__PURE__ */ new Map([[root, { functions: [root], calls: [] }]]);
  const queue = [root];
  while (queue.length) {
    const current = queue.shift();
    const path15 = paths.get(current);
    for (const edge of adjacency.get(current) ?? []) if (!paths.has(edge.target)) {
      paths.set(edge.target, { functions: [...path15.functions, edge.target], calls: [...path15.calls, edge.call] });
      queue.push(edge.target);
    }
  }
  return paths;
}
function addSites(program, ids, kind, sites, path15, add) {
  for (const item of sites.filter((site) => site.id && ids.includes(site.id))) add(kind, item.id, program, path15(item), item.location);
}
function programForFunction(value, fallback, programs) {
  return programs.find((program) => value.startsWith(`${program.name}::`)) ?? fallback;
}
function metricForFunction(program, value) {
  const local = value.startsWith(`${program.name}::`) ? `crate::${value.slice(program.name.length + 2)}` : value;
  return program.functions.find((fn) => (fn.qualifiedName ?? fn.name) === local);
}
function contains3(owner, child) {
  return owner.uri === child.uri && owner.startLine <= child.startLine && owner.endLine >= child.endLine;
}
function extendArchitecture(source, witnesses, programs) {
  if (!source.architecture) return;
  const architectureId = (value) => value.startsWith(`${source.name}::`) ? `crate::${value.slice(source.name.length + 2)}` : value;
  for (const witness of witnesses) {
    for (const fn of witness.functionPath) {
      const id = architectureId(fn);
      if (source.architecture.nodes.some((node) => node.id === id)) continue;
      const program = programForFunction(fn, source, programs);
      const metric = metricForFunction(program, fn);
      source.architecture.nodes.push({ id, type: "function", label: fn, location: metric?.location });
    }
    for (let index = 0; index + 1 < witness.functionPath.length; index++) source.architecture.edges.push({ source: architectureId(witness.functionPath[index]), target: architectureId(witness.functionPath[index + 1]), type: "calls", label: witness.targetProgram === source.name ? void 0 : "cross-package" });
  }
  source.architecture.nodes = [...new Map(source.architecture.nodes.map((node) => [node.id, node])).values()];
  source.architecture.edges = [...new Map(source.architecture.edges.map((edge) => [`${edge.source}:${edge.target}:${edge.type}:${edge.label ?? ""}`, edge])).values()];
}

// src/analysis/stateDataflow.ts
init_importMetaShim();
var INFRASTRUCTURE_FIELDS = /* @__PURE__ */ new Set(["accounts", "key", "owner", "is_signer", "is_writable", "executable", "rent_epoch", "address", "data", "lamports"]);
var ACCESS_METHODS = {
  load: "deserialize",
  load_mut: "deserialize",
  load_init: "deserialize",
  try_borrow_data: "data-read",
  borrow_data: "data-read",
  data: "data-read",
  try_borrow: "data-read",
  borrow_unchecked: "data-read",
  data_ptr: "data-read",
  account_ptr: "data-read",
  try_borrow_mut_data: "data-write",
  borrow_mut_data: "data-write",
  data_mut: "data-write",
  try_borrow_mut: "data-write",
  borrow_unchecked_mut: "data-write",
  data_mut_ptr: "data-write",
  account_mut_ptr: "data-write",
  try_borrow_lamports: "lamport-read",
  lamports: "lamport-read",
  get_lamports: "lamport-read",
  try_borrow_mut_lamports: "lamport-write",
  set_lamports: "lamport-write",
  add_lamports: "lamport-write",
  sub_lamports: "lamport-write",
  send: "lamport-write",
  collect: "lamport-write",
  realloc: "realloc",
  resize: "realloc",
  resize_unchecked: "realloc",
  close: "close",
  close_unchecked: "close",
  assign: "owner-change",
  set_owner: "owner-change",
  serialize: "serialize",
  try_serialize: "serialize",
  pack_into_slice: "serialize",
  deserialize: "deserialize",
  try_deserialize: "deserialize",
  try_deserialize_unchecked: "deserialize",
  try_from_slice: "deserialize",
  unpack: "deserialize",
  unpack_unchecked: "deserialize",
  set_inner: "data-write",
  copy_from_slice: "data-write",
  copy_within: "data-write",
  fill: "data-write",
  write_all: "data-write",
  as_account: "deserialize",
  as_account_mut: "data-write",
  borrow_state: "deserialize",
  borrow_mut_state: "data-write"
};
function enrichStateDataflow(files, program) {
  const accountNames = new Set(program.accounts.map((item) => item.name).filter((item) => !!item));
  const stateNames = new Set((program.stateTypes ?? []).map((item) => item.name));
  const accountStateNames = new Set(program.accounts.map((item) => item.stateType).filter((item) => !!item));
  const facts = /* @__PURE__ */ new Map();
  for (const file of files) for (const fn of descendants(file.root, "function_item")) {
    const metric = program.functions.find((item) => item.location.uri === file.uri && item.location.startLine === fn.startPosition.row + 1 && item.name === nodeText(field(fn, "name")));
    if (!metric?.qualifiedName) continue;
    const fact = analyzeFunction(fn, file.uri, metric.qualifiedName, accountNames, stateNames, accountStateNames, program.accounts);
    facts.set(fact.qualifiedName, fact);
  }
  program.stateAccessSites = [...facts.values()].flatMap((item) => item.sites).sort((a, b) => a.id.localeCompare(b.id));
  for (const instruction of program.instructions) {
    const surface = instruction.reachableSurface;
    if (!surface) continue;
    const handler = program.functions.find((item) => item.qualifiedName === surface.directHandler) ?? program.functions.find((item) => item.name === (instruction.handler ?? instruction.functionName));
    if (!handler?.qualifiedName || !facts.has(handler.qualifiedName)) {
      surface.stateAccesses = [];
      continue;
    }
    const accesses = [];
    const queue = [{ fact: facts.get(handler.qualifiedName), bindings: /* @__PURE__ */ new Map(), functionPath: [handler.qualifiedName], callPath: [] }];
    const visited = /* @__PURE__ */ new Set();
    while (queue.length) {
      const current = queue.shift();
      const visitKey = `${current.fact.qualifiedName}:${[...current.bindings].map(([key, value]) => `${key}=${value.accountName ?? value.root}:${value.stateType ?? ""}`).sort().join(",")}`;
      if (visited.has(visitKey)) continue;
      visited.add(visitKey);
      for (const site of current.fact.sites) {
        const bound = bindSymbol(site, current.bindings);
        const account2 = resolveProgramAccount(program, instruction.contextType, surface.accounts, bound.accountName, bound.stateType);
        const resolved = !!account2;
        const sourceSiteId = site.id;
        const access = {
          ...site,
          id: `instruction-access:${instruction.id ?? instruction.name}:${sourceSiteId}:${account2?.id ?? bound.accountName ?? site.accountParameter ?? "unresolved"}`,
          sourceSiteId,
          instructionId: instruction.id ?? instruction.name,
          accountId: account2?.id,
          accountName: account2?.name ?? bound.accountName,
          stateType: bound.stateType ?? account2?.stateType ?? site.stateType,
          accountExpression: bound.accountExpression,
          aliasPath: bound.aliasPath,
          direct: current.functionPath.length === 1,
          resolved,
          functionPath: current.functionPath,
          callPath: current.callPath,
          evidence: [...site.evidence, { description: resolved ? `resolved through ${bound.aliasPath.join(" -> ") || bound.accountExpression} to instruction account ${account2.name ?? account2.type}` : `account binding remains unresolved after ${bound.aliasPath.join(" -> ") || bound.accountExpression}`, location: site.location }]
        };
        accesses.push(access);
        if (account2) applyAccessToAccount(account2, access);
      }
      for (const call of program.callGraph?.calls.filter((item) => item.caller === current.fact.qualifiedName && item.status === "resolved" && item.target && facts.has(item.target)) ?? []) {
        const callee = facts.get(call.target);
        const callFact = current.fact.calls.get(locationKey(call.location.uri, call.location.startLine, call.location.startColumn));
        if (!callFact) continue;
        const nextBindings = /* @__PURE__ */ new Map();
        callee.parameters.forEach((parameter, index) => {
          const symbolic = resolveExpression(callFact.args[index] ?? "", current.fact.aliases, accountNames, stateNames, program.accounts);
          if (!symbolic) return;
          const inherited = current.bindings.get(symbolic.root);
          nextBindings.set(parameter.name, inherited ? { ...inherited, aliasPath: [...inherited.aliasPath, `${current.fact.name} argument ${index + 1}`, `${callee.name}.${parameter.name}`] } : { ...symbolic, aliasPath: [...symbolic.aliasPath, `${current.fact.name} argument ${index + 1}`, `${callee.name}.${parameter.name}`] });
        });
        queue.push({ fact: callee, bindings: nextBindings, functionPath: [...current.functionPath, callee.qualifiedName], callPath: [...current.callPath, call.id] });
      }
    }
    surface.stateAccesses = [...new Map(accesses.map((item) => [item.id, item])).values()].sort((a, b) => a.id.localeCompare(b.id));
  }
}
function analyzeFunction(fn, uri, qualifiedName, accountNames, stateNames, accountStateNames, accounts) {
  const name2 = nodeText(field(fn, "name"));
  const parameters = descendants(fn, "parameter").map((parameter) => {
    const parameterName = (nodeText(field(parameter, "pattern")) || parameter.namedChildren[0]?.text || "").replace(/^(?:ref\s+)?(?:mut\s+)?/, "").trim();
    return { name: parameterName, type: nodeText(field(parameter, "type")) || parameter.text.split(":").slice(1).join(":").trim() };
  }).filter((item) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(item.name));
  const aliases = /* @__PURE__ */ new Map();
  for (const parameter of parameters) {
    const stateType = stateTypeFrom(parameter.type, stateNames);
    if (/Account|Ctx|Context|Signer|Program|Sysvar/.test(parameter.type) || stateType && accountStateNames.has(stateType)) aliases.set(parameter.name, { root: parameter.name, stateType, aliasPath: [parameter.name] });
  }
  for (const declaration of descendants(fn, "let_declaration").sort((a, b) => a.startIndex - b.startIndex)) {
    const pattern = (nodeText(field(declaration, "pattern")) || /^\s*let\s+(?:mut\s+)?([^:=;]+)/.exec(declaration.text)?.[1] || "").replace(/^(?:ref\s+)?(?:mut\s+)?/, "").trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(pattern)) continue;
    const value = nodeText(field(declaration, "value")) || declaration.text.split("=").slice(1).join("=").replace(/;\s*$/, "").trim();
    const freshValue = /^\s*(?:[A-Za-z_][A-Za-z0-9_]*::)*[A-Za-z_][A-Za-z0-9_]*\s*\{/.test(value);
    const symbolic = freshValue || !provenanceBearingExpression(value, aliases, accountNames) ? void 0 : resolveExpression(value, aliases, accountNames, stateNames, accounts);
    if (symbolic) aliases.set(pattern, accountNames.has(pattern) ? { ...symbolic, root: pattern, accountName: pattern, aliasPath: [...symbolic.aliasPath, pattern] } : { ...symbolic, aliasPath: [...symbolic.aliasPath, pattern] });
  }
  const sites = [];
  const addSite = (node, operation, symbolic, expression, api, fieldPath, confidence = 0.9) => {
    const location3 = loc7(uri, node);
    const site = {
      id: `state-access:${operation}:${uri}:${location3.startLine}:${location3.startColumn}`,
      operation,
      functionName: name2,
      qualifiedFunction: qualifiedName,
      accountExpression: symbolic.root,
      accountParameter: symbolic.root,
      stateType: symbolic.stateType,
      fieldPath: fieldPath ?? symbolic.fieldPath,
      api,
      expression,
      aliasPath: symbolic.aliasPath,
      location: location3,
      confidence,
      evidence: [{ description: `${operation} through ${api ?? "field access"} on ${symbolic.aliasPath.join(" -> ") || symbolic.root}${fieldPath ? ` field ${fieldPath}` : ""}`, location: location3 }]
    };
    sites.push(site);
  };
  const calls = /* @__PURE__ */ new Map();
  for (const call of descendants(fn, "call_expression")) {
    const api = nodeText(field(call, "function"));
    calls.set(locationKey(uri, call.startPosition.row + 1, call.startPosition.column), { args: callArguments(call) });
    const method = api.split(/\.|::/).at(-1)?.replace(/::<.*$/, "") ?? "";
    const operation = ACCESS_METHODS[method] ?? (/\blamports\s*\.\s*(?:try_)?borrow_mut$/.test(api) ? "lamport-write" : void 0) ?? (/\blamports\s*\.\s*(?:try_)?borrow$/.test(api) ? "lamport-read" : void 0) ?? (/\bdata\s*\.\s*(?:try_)?borrow_mut$/.test(api) ? "data-write" : void 0) ?? (/\bdata\s*\.\s*(?:try_)?borrow$/.test(api) ? "data-read" : void 0);
    if (!operation) continue;
    const receiver = api.includes(".") ? api.slice(0, api.lastIndexOf(".")) : callArguments(call).find(Boolean) ?? "";
    const argumentsList = callArguments(call);
    const serializationTarget = operation === "serialize" ? [...argumentsList].reverse().map((argument) => resolveExpression(argument, aliases, accountNames, stateNames, accounts)).find((item) => !!item) : void 0;
    const symbolic = serializationTarget ?? resolveExpression(receiver || call.text, aliases, accountNames, stateNames, accounts) ?? resolveExpression(argumentsList.join(" "), aliases, accountNames, stateNames, accounts);
    if (symbolic) addSite(call, operation, symbolic, call.text, api, void 0, operation === "close" || operation === "realloc" ? 0.97 : 0.92);
  }
  for (const expression of descendants(fn, "field_expression")) {
    const symbolic = resolveExpression(expression.text, aliases, accountNames, stateNames, accounts);
    if (!symbolic?.fieldPath || INFRASTRUCTURE_FIELDS.has(symbolic.fieldPath.split(".")[0])) continue;
    if (!symbolic.stateType && !symbolic.accountName) continue;
    const operation = fieldWriteKind(expression) ? "data-write" : "data-read";
    addSite(expression, operation, symbolic, expression.text, void 0, symbolic.fieldPath, symbolic.stateType ? 0.96 : 0.86);
  }
  return { name: name2, qualifiedName, parameters, aliases, sites: [...new Map(sites.map((item) => [item.id, item])).values()], calls };
}
function provenanceBearingExpression(value, aliases, accountNames) {
  const text = value.trim().replace(/^&\s*(?:mut\s+)?/, "").replace(/^\*+/, "").replace(/^\(+/, "").trim();
  if (/^[A-Za-z_][A-Za-z0-9_]*\s*\.\s*accounts\s*\./.test(text) || /^next_account_info\b/.test(text)) return true;
  const leading = /^([A-Za-z_][A-Za-z0-9_]*)\b/.exec(text)?.[1];
  if (leading && (aliases.has(leading) || accountNames.has(leading))) return true;
  if (!/(?:try_borrow|borrow_(?:mut_)?data|borrow_(?:mut_)?state|load(?:_mut|_init)?|deserialize|try_from_slice|from_bytes(?:_mut)?|try_from_bytes(?:_mut)?|unpack(?:_unchecked)?|as_account(?:_mut)?|Account(?:::[A-Za-z_][A-Za-z0-9_]*)?\s*::\s*try_from)\b/.test(text)) return false;
  return [...text.matchAll(/\b[A-Za-z_][A-Za-z0-9_]*\b/g)].some((match) => aliases.has(match[0]) || accountNames.has(match[0]));
}
function resolveExpression(value, aliases, accountNames, stateNames, accounts) {
  let text = value.trim().replace(/;$/, "").replace(/^&\s*(?:mut\s+)?/, "").replace(/^\*+/, "").replace(/\?+$/, "").trim();
  while (text.startsWith("(") && text.endsWith(")")) text = text.slice(1, -1).trim();
  const context = /\b[A-Za-z_][A-Za-z0-9_]*\s*\.\s*accounts\s*\.\s*([A-Za-z_][A-Za-z0-9_]*)([\s\S]*)/.exec(text);
  if (context) {
    const accountName = context[1];
    const account2 = accounts.find((item) => item.name === accountName);
    const tail = cleanFieldTail(context[2]);
    return { root: `ctx.accounts.${accountName}`, accountName, stateType: account2?.stateType, fieldPath: tail, aliasPath: [`ctx.accounts.${accountName}`] };
  }
  const identifiers = [...text.matchAll(/\b[A-Za-z_][A-Za-z0-9_]*\b/g)].map((item) => item[0]);
  for (const identifier of identifiers) {
    const alias = aliases.get(identifier);
    if (!alias) continue;
    const suffix = text.slice(text.indexOf(identifier) + identifier.length);
    const fieldPath = suffix.trim().startsWith(".") ? cleanFieldTail(suffix) : alias.fieldPath;
    const explicitState = stateTypeFrom(text, stateNames);
    return { ...alias, stateType: explicitState ?? alias.stateType, fieldPath, aliasPath: [...alias.aliasPath, ...identifier === alias.root ? [] : [identifier]] };
  }
  const direct = identifiers.find((item) => accountNames.has(item));
  if (direct) {
    const account2 = accounts.find((item) => item.name === direct);
    const suffix = text.slice(text.indexOf(direct) + direct.length);
    return { root: direct, accountName: direct, stateType: account2?.stateType, fieldPath: cleanFieldTail(suffix), aliasPath: [direct] };
  }
  return void 0;
}
function bindSymbol(site, bindings) {
  const binding = site.accountParameter ? bindings.get(site.accountParameter) : void 0;
  if (binding) return { accountExpression: binding.root, accountName: binding.accountName, stateType: binding.stateType ?? site.stateType, aliasPath: [...binding.aliasPath, ...site.aliasPath] };
  const context = /ctx\.accounts\.([A-Za-z_][A-Za-z0-9_]*)/.exec(site.accountExpression);
  return { accountExpression: site.accountExpression, accountName: context?.[1] ?? (/^[A-Za-z_][A-Za-z0-9_]*$/.test(site.accountExpression) ? site.accountExpression : void 0), stateType: site.stateType, aliasPath: site.aliasPath };
}
function resolveProgramAccount(program, contextType, reachableAccountIds, accountName, stateType) {
  const reachable = program.accounts.filter((item) => item.id && reachableAccountIds.includes(item.id));
  if (accountName) {
    const contextual = reachable.find((item) => item.name === accountName && (!contextType || item.contextType === contextType));
    if (contextual) return contextual;
    const named = reachable.filter((item) => item.name === accountName);
    if (named.length === 1) return named[0];
  }
  if (stateType) {
    const typed = reachable.filter((item) => item.stateType === stateType);
    if (typed.length === 1) return typed[0];
  }
  return void 0;
}
function applyAccessToAccount(account2, access) {
  const dataRead = access.operation === "data-read" || access.operation === "deserialize";
  const dataWrite = access.operation === "data-write" || access.operation === "serialize" || access.operation === "realloc" || access.operation === "close";
  const lamportRead = access.operation === "lamport-read";
  const lamportWrite = access.operation === "lamport-write" || access.operation === "close";
  account2.dataAccess = unique2([...account2.dataAccess ?? [], ...dataRead ? ["read"] : [], ...dataWrite ? ["write"] : []]);
  account2.lamportAccess = unique2([...account2.lamportAccess ?? [], ...lamportRead ? ["read"] : [], ...lamportWrite ? ["write"] : []]);
  account2.lifecycle = unique2([...account2.lifecycle ?? [], ...dataRead ? ["read"] : [], ...dataWrite ? ["write"] : [], ...access.operation === "realloc" ? ["realloc"] : [], ...access.operation === "close" ? ["close"] : [], ...lamportWrite ? ["lamport-transfer"] : []]);
  account2.writable ||= dataWrite || lamportWrite || access.operation === "owner-change";
  account2.evidence = [...new Map([...account2.evidence, { description: `${access.operation} at ${access.functionName}${access.fieldPath ? ` field ${access.fieldPath}` : ""}`, location: access.location }].map((item) => [`${item.description}:${item.location?.uri}:${item.location?.startLine}:${item.location?.startColumn}`, item])).values()];
}
function fieldWriteKind(node) {
  let current = node;
  for (let depth = 0; current?.parent && depth < 4; depth++, current = current.parent) {
    const parent = current.parent;
    if (/assignment/.test(parent.type)) {
      const left = parent.childForFieldName("left");
      if (!left || node.startIndex >= left.startIndex && node.endIndex <= left.endIndex) return true;
    }
    if (parent.type === "reference_expression" && /^&\s*mut\b/.test(parent.text)) return true;
    if (parent.type.endsWith("statement") || parent.type === "block") break;
  }
  return false;
}
function cleanFieldTail(value) {
  const fields = [...value.matchAll(/^\s*\.\s*([A-Za-z_][A-Za-z0-9_]*)|\.\s*([A-Za-z_][A-Za-z0-9_]*)/g)].map((item) => item[1] ?? item[2]).filter((item) => item && !ACCESS_METHODS[item] && !["as_ref", "as_mut", "deref", "deref_mut", "clone", "unwrap", "expect", "to_account_info", "iter", "iter_mut", "next", "len", "borrow", "borrow_mut", "try_borrow", "try_borrow_mut"].includes(item));
  const meaningful = fields.filter((item) => !INFRASTRUCTURE_FIELDS.has(item));
  return meaningful.length ? meaningful.join(".") : void 0;
}
function stateTypeFrom(value, stateNames) {
  return [...stateNames].find((name2) => new RegExp(`\\b${escapeRegex3(name2)}\\b`).test(value));
}
function callArguments(node) {
  const args2 = node.childForFieldName("arguments") ?? node.namedChildren.find((child) => child?.type === "arguments");
  if (!args2) return [];
  const text = args2.text.trim();
  return text.startsWith("(") && text.endsWith(")") ? splitRustExpressions(text.slice(1, -1)).map((item) => item.trim()) : [];
}
function locationKey(uri, line, column) {
  return `${uri}:${line}:${column}`;
}
function escapeRegex3(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function unique2(items) {
  return [...new Set(items)];
}
function loc7(uri, node) {
  return { uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column };
}

// src/analysis/tokenFlow.ts
init_importMetaShim();
var TOKEN_CATEGORIES = [
  "token-transfer",
  "token-mint",
  "token-burn",
  "authority-change",
  "freeze",
  "thaw",
  "token-account-create",
  "token-account-recovery",
  "account-close"
];
var MODELED_INITIALIZE_OPERATIONS = /* @__PURE__ */ new Set(["initialize_account", "initialize_account2", "initialize_account3", "initialize_mint", "initialize_mint2"]);
var ANCHOR_STRUCT_FIELDS = {
  Transfer: { from: "source", to: "destination", authority: "authority" },
  TransferChecked: { from: "source", mint: "mint", to: "destination", authority: "authority" },
  MintTo: { mint: "mint", to: "destination", authority: "authority" },
  MintToChecked: { mint: "mint", to: "destination", authority: "authority" },
  Burn: { mint: "mint", from: "source", authority: "authority" },
  BurnChecked: { mint: "mint", from: "source", authority: "authority" },
  CloseAccount: { account: "source", destination: "destination", authority: "authority" },
  // SetAuthority has no `new_authority` account field: the new authority and authority_type
  // are instruction arguments, not accounts. See WRAPPER_ROLE_INDEX for newAuthority extraction.
  SetAuthority: { current_authority: "authority", account_or_mint: "source" },
  // Approve/ApproveChecked name the delegating token account `to`, not `from`.
  Approve: { to: "source", delegate: "delegate", authority: "authority" },
  ApproveChecked: { to: "source", mint: "mint", delegate: "delegate", authority: "authority" },
  Revoke: { source: "source", authority: "authority" },
  FreezeAccount: { account: "source", mint: "mint", authority: "authority" },
  ThawAccount: { account: "source", mint: "mint", authority: "authority" },
  InitializeAccount: { account: "source", mint: "mint", authority: "authority" },
  InitializeAccount3: { account: "source", mint: "mint", authority: "authority" },
  // InitializeMint/InitializeMint2 only expose `mint` (+ `rent` for InitializeMint, never a role).
  // The mint authority is an instruction argument, not an account; see WRAPPER_ROLE_INDEX.
  InitializeMint: { mint: "mint" },
  InitializeMint2: { mint: "mint" },
  // anchor_spl::associated_token::{Create, CreateIdempotent (a type alias of Create)}.
  Create: { associated_token: "destination", authority: "authority", mint: "mint" },
  CreateIdempotent: { associated_token: "destination", authority: "authority", mint: "mint" }
};
var NATIVE_CONSTRUCTORS = {
  transfer: ["program", "source", "destination", "authority"],
  transfer_checked: ["program", "source", "mint", "destination", "authority"],
  mint_to: ["program", "mint", "destination", "authority"],
  mint_to_checked: ["program", "mint", "destination", "authority"],
  burn: ["program", "source", "mint", "authority"],
  burn_checked: ["program", "source", "mint", "authority"],
  approve: ["program", "source", "delegate", "authority"],
  approve_checked: ["program", "source", "mint", "delegate", "authority"],
  revoke: ["program", "source", "authority"],
  close_account: ["program", "source", "destination", "authority"],
  freeze_account: ["program", "source", "mint", "authority"],
  thaw_account: ["program", "source", "mint", "authority"],
  // (token_program, owned_pubkey, new_authority: Option<Pubkey>, authority_type: enum, owner_pubkey, signers[])
  set_authority: ["program", "source", "newAuthority", "", "authority"],
  initialize_account: ["program", "source", "mint", "authority"],
  initialize_account2: ["program", "source", "mint", "authority"],
  initialize_account3: ["program", "source", "mint", "authority"],
  // (token_program, mint_pubkey, mint_authority_pubkey, freeze_authority: Option<Pubkey>, decimals)
  initialize_mint: ["program", "mint", "authority"],
  initialize_mint2: ["program", "mint", "authority"]
};
var NATIVE_AMOUNT_OFFSET = {
  transfer: { amount: -1 },
  transfer_checked: { amount: -2, decimals: -1 },
  mint_to: { amount: -1 },
  mint_to_checked: { amount: -2, decimals: -1 },
  burn: { amount: -1 },
  burn_checked: { amount: -2, decimals: -1 },
  approve: { amount: -1 },
  approve_checked: { amount: -2, decimals: -1 },
  initialize_mint: { decimals: -1 },
  initialize_mint2: { decimals: -1 }
};
var BUILDER_SIGNATURES = {
  transfer: ["source", "destination", "authority"],
  mint_to: ["mint", "destination", "authority"],
  burn: ["source", "authority"],
  close_account: ["source", "destination", "authority"],
  approve: ["source", "delegate", "authority"],
  revoke: ["source", "authority"],
  freeze_account: ["source", "mint", "authority"],
  thaw_account: ["source", "mint", "authority"],
  // Anchor account-init constraint synthetic sites (`#[account(init, associated_token::...)]`)
  // record accountArguments as [account, payer]; the account itself is unambiguously the ATA.
  create: ["destination"],
  create_idempotent: ["destination"]
};
var BUILDER_AMOUNT_INDEX = {
  transfer: 3,
  mint_to: 3,
  burn: 2,
  approve: 3
};
var SOLANG_SIGNATURES = {
  transfer: ["source", "destination", "authority"],
  mint_to: ["mint", "destination", "authority"],
  burn: ["source", "mint", "authority"],
  approve: ["source", "delegate", "authority"],
  revoke: ["source", "authority"],
  // Official Solang's remove_mint_authority(mintAccount, mintAuthority) emits SetAuthority
  // with a null new authority. The operation is canonicalized to set_authority by the frontend.
  set_authority: ["source", "authority"]
};
var SOLANG_AMOUNT_INDEX = {
  transfer: { amount: 3 },
  mint_to: { amount: 3 },
  burn: { amount: 3 },
  approve: { amount: 3 }
};
var WRAPPER_VALUE_INDEX = {
  transfer: { amount: 0 },
  transfer_checked: { amount: 0, decimals: 1 },
  mint_to: { amount: 0 },
  mint_to_checked: { amount: 0, decimals: 1 },
  burn: { amount: 0 },
  burn_checked: { amount: 0, decimals: 1 },
  approve: { amount: 0 },
  approve_checked: { amount: 0, decimals: 1 },
  // token::initialize_mint(ctx, decimals, authority, freeze_authority) -> decimals is the first non-ctx arg.
  initialize_mint: { decimals: 0 },
  initialize_mint2: { decimals: 0 }
};
var WRAPPER_ROLE_INDEX = {
  set_authority: [{ role: "newAuthority", index: 1 }],
  initialize_mint: [{ role: "authority", index: 1 }],
  initialize_mint2: [{ role: "authority", index: 1 }]
};
function buildAssetFlows(programs) {
  const byName = new Map(programs.map((program) => [program.name, program]));
  for (const program of programs) {
    const flows = [];
    for (const instruction of program.instructions) {
      const surface = instruction.reachableSurface;
      if (!surface) continue;
      const instructionId = instruction.id ?? instruction.name;
      const contextAccounts = contextAccountsFor(program, instruction.contextType);
      const seenCpis = /* @__PURE__ */ new Set();
      const collect = (owner, cpiIds) => {
        for (const cpiId of cpiIds) {
          const key = `${owner.name}:${cpiId}`;
          if (seenCpis.has(key)) continue;
          seenCpis.add(key);
          const cpi = owner.securitySurface.cpiSites.find((site) => site.id === cpiId);
          if (!cpi || !isTokenCpi(cpi)) continue;
          const witness = (surface.witnesses ?? []).find((item) => item.targetKind === "cpi" && item.targetProgram === owner.name && item.targetId === cpiId);
          const sameProgram = owner === program;
          flows.push(buildFlow(program, owner, instructionId, cpi, sameProgram ? contextAccounts : [], witness, sameProgram));
        }
      };
      collect(program, surface.cpis);
      for (const cross of surface.crossPackageSurfaces ?? []) {
        const owner = byName.get(cross.program);
        if (owner) collect(owner, cross.cpiIds);
      }
    }
    program.assetFlows = flows.sort((a, b) => a.id.localeCompare(b.id));
    program.instructionDossiers ??= [];
  }
}
function isTokenCpi(cpi) {
  if (!cpi.operationCategory || !cpi.targetKind) return false;
  if (cpi.targetKind !== "spl-token" && cpi.targetKind !== "token-2022" && cpi.targetKind !== "associated-token") return false;
  if (cpi.operationCategory === "initialization") return MODELED_INITIALIZE_OPERATIONS.has(operationOf(cpi));
  return TOKEN_CATEGORIES.includes(cpi.operationCategory);
}
function contextAccountsFor(program, contextType) {
  return contextType ? program.accounts.filter((account2) => account2.contextType === contextType) : [];
}
function buildFlow(program, owner, instructionId, cpi, contextAccounts, witness, sameProgram) {
  const evidence = [...cpi.evidence];
  const unresolvedReasons = [];
  const apiShort = cpi.invocationApi?.split(/::|\./).at(-1)?.replace(/::<.*$/, "") ?? "";
  const operationKey = operationOf(cpi);
  const roles = resolveRoles(cpi, apiShort, operationKey, contextAccounts, unresolvedReasons, evidence);
  const authorityType = resolveAuthorityType(owner, cpi, roles, unresolvedReasons, evidence);
  const functionPath = witness?.functionPath ?? [];
  const callPath = witness?.callPath ?? [];
  if (!witness) unresolvedReasons.push("deterministic call-path evidence for this CPI is unavailable");
  if (!sameProgram) evidence.push({ description: `Cross-package CPI reached through ${owner.name}; account roles are scoped to ${owner.name} and are not bound to ${program.name} instruction accounts`, location: cpi.location });
  const complete = !unresolvedReasons.length;
  const id = `asset-flow:${program.name}:${instructionId}:${sameProgram ? "" : `${owner.name}:`}${cpi.id ?? `${cpi.location.uri}:${cpi.location.startLine}:${cpi.location.startColumn}`}`;
  return {
    id,
    instructionId,
    program: program.name,
    cpiId: sameProgram ? cpi.id : void 0,
    // functionPath.length === 1 means the CPI sits directly in the handler with no intervening
    // calls; an EMPTY path means witness evidence is unavailable and must never default to "direct".
    direct: sameProgram && functionPath.length === 1,
    operation: cpi.operation,
    operationCategory: cpi.operationCategory,
    tokenProgram: tokenProgramOf(cpi.targetKind),
    ...roles.bindings,
    amount: roles.amount,
    decimals: roles.decimals,
    authorityType,
    pdaSigned: cpi.pdaSigned,
    signerPdaIds: sameProgram ? [...cpi.signerPdaIds ?? []] : [],
    functionPath,
    callPath,
    location: cpi.location,
    confidence: cpi.confidence,
    evidence,
    complete,
    unresolvedReasons
  };
}
function tokenProgramOf(targetKind2) {
  if (targetKind2 === "token-2022") return "token-2022";
  if (targetKind2 === "associated-token") return "associated-token";
  if (targetKind2 === "spl-token") return "spl-token";
  return void 0;
}
function resolveRoles(cpi, apiShort, operationKey, contextAccounts, unresolvedReasons, evidence) {
  const empty = { bindings: {} };
  if (cpi.invocationApi?.startsWith("Solang SplToken.")) {
    const signature = SOLANG_SIGNATURES[operationKey];
    const args3 = cpi.accountArguments ?? [];
    if (!signature) {
      unresolvedReasons.push(`Solang SplToken.${operationKey || "unknown"} has no modeled role layout`);
      return empty;
    }
    const bindings = {};
    signature.forEach((role, index) => {
      const value = args3[index];
      if (value !== void 0) bindings[role] = bind(value, contextAccounts, role, unresolvedReasons, evidence, cpi.location);
    });
    const values = SOLANG_AMOUNT_INDEX[operationKey] ?? {};
    evidence.push({ description: `roles resolved from the documented Solang SplToken.${operationKey} argument order`, location: cpi.location });
    return { bindings, amount: values.amount === void 0 ? void 0 : args3[values.amount], decimals: values.decimals === void 0 ? void 0 : args3[values.decimals] };
  }
  const structMatch = findAnchorStruct(cpi);
  if (structMatch) {
    const fieldMap = ANCHOR_STRUCT_FIELDS[structMatch.struct];
    if (!fieldMap) {
      unresolvedReasons.push(`account struct ${structMatch.struct} is not a recognized SPL token account struct`);
      return empty;
    }
    const bindings = bindNamedFields(structMatch.fields, fieldMap, contextAccounts, unresolvedReasons, evidence, cpi.location);
    for (const roleIndex of WRAPPER_ROLE_INDEX[operationKey] ?? []) {
      const value = nthArgument(cpi, structMatch.argumentBase + roleIndex.index);
      if (value !== void 0 && value.trim()) bindings[roleIndex.role] = bind(value, contextAccounts, roleIndex.role, unresolvedReasons, evidence, cpi.location);
    }
    const valueIndexes = WRAPPER_VALUE_INDEX[operationKey] ?? {};
    evidence.push({ description: `roles resolved from ${apiShort || "CPI"} account struct ${structMatch.struct}`, location: cpi.location });
    return {
      bindings,
      amount: valueIndexes.amount !== void 0 ? nthArgument(cpi, structMatch.argumentBase + valueIndexes.amount) : void 0,
      decimals: valueIndexes.decimals !== void 0 ? nthArgument(cpi, structMatch.argumentBase + valueIndexes.decimals) : void 0
    };
  }
  const native = findNativeConstructor(cpi, operationKey);
  if (native) {
    const roleNames = NATIVE_CONSTRUCTORS[operationKey];
    if (!roleNames) {
      unresolvedReasons.push(`native constructor ${native.api} has no modeled role layout`);
      return empty;
    }
    const bindings = {};
    roleNames.forEach((role, index) => {
      if (!role || role === "program") return;
      const value = native.arguments[index];
      if (value === void 0) return;
      bindings[role] = bind(value, contextAccounts, role, unresolvedReasons, evidence, cpi.location);
    });
    const offsets = NATIVE_AMOUNT_OFFSET[operationKey] ?? {};
    evidence.push({ description: `roles resolved from the documented ${native.api} constructor argument order`, location: cpi.location });
    return {
      bindings,
      amount: offsets.amount !== void 0 ? native.arguments[native.arguments.length + offsets.amount] : void 0,
      decimals: offsets.decimals !== void 0 ? native.arguments[native.arguments.length + offsets.decimals] : void 0
    };
  }
  const builderRoles = BUILDER_SIGNATURES[operationKey];
  const args2 = cpi.accountArguments ?? [];
  if (builderRoles && apiShort && args2.length >= builderRoles.length && !/^ctx$|^ctx\.|^context$/i.test(args2[0] ?? "")) {
    const bindings = {};
    builderRoles.forEach((role, index) => {
      const value = args2[index];
      if (value !== void 0) bindings[role] = bind(value, contextAccounts, role, unresolvedReasons, evidence, cpi.location);
    });
    evidence.push({ description: `roles resolved from the documented ${apiShort} builder argument order`, location: cpi.location });
    const amountIndex = BUILDER_AMOUNT_INDEX[operationKey];
    return { bindings, amount: amountIndex !== void 0 ? args2[amountIndex] : void 0 };
  }
  if (operationKey) unresolvedReasons.push(`${operationKey.replace(/_/g, "-")} was recognized, but its argument roles could not be established from source evidence`);
  else unresolvedReasons.push("token CPI recognized without an identified operation; roles remain unresolved");
  return empty;
}
function bind(expression, contextAccounts, role, unresolvedReasons, evidence, location3) {
  const trimmed = expression.trim();
  const unwrapped = unwrapSome(trimmed);
  const base = /^&?(?:mut\s+)?([A-Za-z_][A-Za-z0-9_]*)(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/.exec(unwrapped)?.[1];
  const contextName = /^&?ctx\.accounts\.([A-Za-z_][A-Za-z0-9_]*)/.exec(unwrapped)?.[1];
  const solangName = /^&?tx\.accounts\.([A-Za-z_][A-Za-z0-9_]*)(?:\.key)?/.exec(unwrapped)?.[1];
  const name2 = contextName ?? solangName ?? base;
  const account2 = name2 ? contextAccounts.find((item) => item.name === name2) : void 0;
  if (!account2?.id) {
    unresolvedReasons.push(`${role} expression \`${expression}\` could not be bound to a known instruction account`);
    evidence.push({ description: `role ${role} kept unresolved for expression ${expression}`, location: location3 });
    return { expression, resolved: false };
  }
  return { accountId: account2.id, accountName: account2.name, expression, resolved: true };
}
function bindNamedFields(fields, fieldMap, contextAccounts, unresolvedReasons, evidence, location3) {
  const bindings = {};
  for (const [fieldName, expression] of fields) {
    const role = fieldMap[fieldName];
    if (!role) continue;
    bindings[role] = bind(expression, contextAccounts, role, unresolvedReasons, evidence, location3);
  }
  return bindings;
}
function findAnchorStruct(cpi) {
  const candidates = [cpi.instructionExpression ?? "", ...cpi.accountArguments ?? []];
  for (const candidate of candidates) {
    const match = /\b([A-Z][A-Za-z0-9_]*)\s*\{\s*([^{}]*?)\s*\}/.exec(candidate);
    if (!match) continue;
    const struct = match[1];
    if (!ANCHOR_STRUCT_FIELDS[struct]) continue;
    const assignments = splitRustExpressions(match[2]).map((item) => item.trim()).filter(Boolean);
    const fields = [];
    for (const assignment of assignments) {
      const pair = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([\s\S]+)$/.exec(assignment);
      if (pair) fields.push([pair[1], pair[2].trim()]);
    }
    if (!fields.length) continue;
    const base = candidates.indexOf(candidate) > 0 ? (cpi.accountArguments ?? []).indexOf(candidate) : 0;
    return { struct, fields, argumentBase: Math.max(0, base) };
  }
  return void 0;
}
function findNativeConstructor(cpi, operationKey) {
  const text = cpi.instructionExpression ?? "";
  const escaped = escapeRegex4(operationKey);
  const match = new RegExp(`\\b(?:spl_token(?:_2022(?:_fix)?)?|token)::instruction::${escaped}\\s*\\(([\\s\\S]*)\\)`).exec(text);
  if (!match) return void 0;
  return { api: operationKey, arguments: splitRustExpressions(match[1]).map((item) => item.trim()) };
}
function nthArgument(cpi, index) {
  return index >= 0 ? cpi.accountArguments?.[index] : cpi.accountArguments === void 0 ? void 0 : cpi.accountArguments[cpi.accountArguments.length + index];
}
function operationOf(cpi) {
  const operation = cpi.operation ?? "";
  const tail = operation.split(".").at(-1) ?? "";
  return tail.replace(/-/g, "_");
}
function resolveAuthorityType(owner, cpi, roles, unresolvedReasons, evidence) {
  const authority = roles.bindings.authority;
  if (!authority?.expression) return "unresolved";
  if (!authority.resolved || !authority.accountId) {
    unresolvedReasons.push(`authority kind for \`${authority.expression}\` could not be established: the authority account binding is unresolved`);
    return "unresolved";
  }
  const account2 = owner.accounts.find((item) => item.id === authority.accountId);
  if (!account2) {
    unresolvedReasons.push(`authority kind for \`${authority.expression}\` could not be established: bound account ${authority.accountId} was not found`);
    return "unresolved";
  }
  if (account2.signer) {
    evidence.push({ description: `authority account ${account2.name} carries a signer flag`, location: cpi.location });
    return "signer-account";
  }
  if ((cpi.signerPdaIds ?? []).length) {
    const pdas = (cpi.signerPdaIds ?? []).map((id) => owner.securitySurface.pdaSites.find((pda) => pda.id === id)).filter((pda) => !!pda);
    if (pdas.length) {
      evidence.push({ description: `invoke_signed evidence with proven signer PDA(s) ${pdas.map((pda) => pda.id).join(", ")}`, location: cpi.location });
      return "pda";
    }
  }
  if ((cpi.signerPdaIds ?? []).length === 0 && cpi.pdaSigned && account2.pdaId && owner.securitySurface.pdaSites.some((pda) => pda.id === account2.pdaId)) {
    evidence.push({ description: `signed CPI authority ${account2.name} carries PDA derivation evidence (${account2.pdaId})`, location: cpi.location });
    return "pda";
  }
  evidence.push({ description: `authority account ${account2.name} has no signer flag and no PDA signing evidence`, location: cpi.location });
  return "ordinary-account";
}
function escapeRegex4(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function unwrapSome(value) {
  const match = /^Some\s*\(([\s\S]*)\)$/.exec(value);
  if (!match) return value;
  const inner = match[1];
  let depth = 0;
  for (let index = 0; index < inner.length; index++) {
    if (inner[index] === "(") depth++;
    else if (inner[index] === ")") {
      if (depth === 0) return value;
      depth--;
    }
  }
  return depth === 0 ? inner.trim() : value;
}

// src/core/version.ts
init_importMetaShim();
var TOOL_VERSION = "0.8.1";
var SCHEMA_VERSION = "0.8.1";

// src/analysis/sourceLanguage.ts
init_importMetaShim();
var path3 = __toESM(require("node:path"));
var DEFAULT_SOURCE_GLOBS = ["**/*.rs", "**/*.sol", "**/*.s", "**/*.S", "**/*.asm", "**/*.sbpf"];
function sourceLanguage(uri) {
  const extension = path3.extname(uri.split(/[?#]/, 1)[0]);
  if (extension === ".rs") return "rust";
  if (extension === ".sol") return "solang-solidity";
  if ([".s", ".S", ".asm", ".sbpf"].includes(extension)) return "sbf-assembly";
  return void 0;
}

// src/analysis/solangFrontend.ts
init_importMetaShim();

// src/parser/solidityParser.ts
init_importMetaShim();
var path4 = __toESM(require("node:path"));
var initialized2;
async function loadSolidityLanguage(wasmPath, runtimeWasmPath) {
  initialized2 ??= (async () => {
    await Parser.init({ locateFile: (scriptName, directory) => runtimeWasmPath ?? path4.join(directory, scriptName) });
    return Language.load(wasmPath);
  })();
  return initialized2;
}
async function parseSolidity(uri, source, wasmPath, runtimeWasmPath) {
  try {
    const language = await loadSolidityLanguage(wasmPath, runtimeWasmPath);
    const parser = new Parser();
    parser.setLanguage(language);
    const tree = parser.parse(source);
    if (!tree) return { uri, source, error: "Tree-sitter returned no Solidity syntax tree." };
    return { uri, source, tree };
  } catch (error) {
    return { uri, source, error: error instanceof Error ? error.message : String(error) };
  }
}

// src/analysis/frontendCommon.ts
init_importMetaShim();
function createSourceProgram(name2, language, manifestUri, packageKind = "solana-program", packageEvidence = []) {
  return {
    name: name2,
    manifestUri,
    packageKind,
    packageEvidence,
    sourceLanguage: language,
    sourceFiles: [],
    rustFiles: [],
    functions: [],
    instructions: [],
    accounts: [],
    frameworkEvidence: [],
    securitySurface: { signerSignals: 0, writableSignals: 0, ownerValidationSignals: 0, addressValidationSignals: 0, remainingAccounts: 0, rawOrUncheckedAccounts: 0, manualAccountIteration: 0, unsafeBlocks: 0, manualSignerChecks: 0, manualOwnerChecks: 0, manualWritableChecks: 0, manualAddressChecks: 0, manualSerialization: 0, reallocOperations: 0, unsafeFunctions: 0, cpiSites: [], pdaSites: [] },
    relationships: [],
    architecture: { nodes: [], edges: [] }
  };
}
function textFileMetric(uri, source, language, values = {}) {
  return { uri, language, ...countLines(source), functions: 0, structs: 0, enums: 0, traits: 0, implBlocks: 0, unsafeBlocks: 0, macroInvocations: 0, ...values };
}
function offsetLocation(uri, source, start2, end) {
  const before = source.slice(0, start2).split(/\r?\n/);
  const through = source.slice(0, end).split(/\r?\n/);
  return { uri, startLine: before.length, startColumn: before.at(-1).length, endLine: through.length, endColumn: through.at(-1).length };
}
function stableId(prefix, uri, line, name2) {
  return `${prefix}:${uri}:${line}:${name2}`;
}
function simpleCallGraph(symbols, calls) {
  const orderedCalls = [...calls].sort((a, b) => a.id.localeCompare(b.id));
  const edges = orderedCalls.filter((call) => call.resolved && call.target).map((call) => ({ source: call.caller, target: call.target, confidence: call.confidence ?? 0.5 })).sort((a, b) => `${a.source}:${a.target}`.localeCompare(`${b.source}:${b.target}`));
  const adjacency = /* @__PURE__ */ new Map();
  for (const edge of edges) adjacency.set(edge.source, [...adjacency.get(edge.source) ?? [], edge.target]);
  let nextIndex = 0;
  const indexes = /* @__PURE__ */ new Map();
  const low = /* @__PURE__ */ new Map();
  const stack = [];
  const onStack = /* @__PURE__ */ new Set();
  const components = [];
  const visit = (symbol2) => {
    indexes.set(symbol2, nextIndex);
    low.set(symbol2, nextIndex++);
    stack.push(symbol2);
    onStack.add(symbol2);
    for (const target of adjacency.get(symbol2) ?? []) {
      if (!indexes.has(target)) {
        visit(target);
        low.set(symbol2, Math.min(low.get(symbol2), low.get(target)));
      } else if (onStack.has(target)) low.set(symbol2, Math.min(low.get(symbol2), indexes.get(target)));
    }
    if (low.get(symbol2) !== indexes.get(symbol2)) return;
    const component = [];
    let item = "";
    do {
      item = stack.pop();
      onStack.delete(item);
      component.push(item);
    } while (item !== symbol2);
    components.push(component.sort());
  };
  for (const symbol2 of [...new Set(symbols)].sort()) if (!indexes.has(symbol2)) visit(symbol2);
  const cycles = components.filter((component) => component.length > 1 || edges.some((edge) => edge.source === component[0] && edge.target === component[0])).map((component) => {
    const members = new Set(component);
    const cycleCalls = orderedCalls.filter((call) => members.has(call.caller) && !!call.target && members.has(call.target));
    return { id: `cycle:${component.join("|")}`, kind: component.length === 1 ? "self-recursion" : "mutual-recursion", functions: component, callIds: cycleCalls.map((call) => call.id), evidence: cycleCalls.map((call) => ({ description: `${component.length === 1 ? "self" : "mutual"} recursion call`, location: call.location })) };
  });
  return { symbols: [...new Set(symbols)].sort(), calls: orderedCalls, edges, cycles };
}

// src/analysis/solangFrontend.ts
var solanaEvidence = /(?:import\s+["']solana["']|@program_id\s*\(|@(payer|seed|bump|space|account|mutableAccount|signer|mutableSigner)\b|\btx\.accounts\b|\bAccountMeta\b|\bSplToken\b)/;
var SOLANG_SPL_TOKEN_CPIS = {
  mint_to: { operation: "mint_to", category: "token-mint" },
  transfer: { operation: "transfer", category: "token-transfer" },
  burn: { operation: "burn", category: "token-burn" },
  approve: { operation: "approve", category: "authority-change" },
  revoke: { operation: "revoke", category: "authority-change" },
  remove_mint_authority: { operation: "set_authority", category: "authority-change" }
};
var SOLANG_SPL_TOKEN_READ_HELPERS = /* @__PURE__ */ new Set(["total_supply", "get_balance", "get_account_info", "get_token_account_data", "get_mint_account_data"]);
async function analyzeSolang(input, wasmPath, runtimeWasmPath) {
  if (!wasmPath) return { programs: [], file: textFileMetric(input.uri, input.source, "solang-solidity", { parseError: "Solidity parser was not configured." }), diagnostics: [`${input.uri}: Solidity parser was not configured.`] };
  const parsed = await parseSolidity(input.uri, input.source, wasmPath, runtimeWasmPath);
  const contracts = nonNull(parsed.tree?.rootNode.descendantsOfType("contract_declaration") ?? []);
  const file = textFileMetric(input.uri, input.source, "solang-solidity", {
    functions: nonNull(parsed.tree?.rootNode.descendantsOfType(["function_definition", "constructor_definition"]) ?? []).length,
    structs: parsed.tree?.rootNode.descendantsOfType("struct_declaration").length ?? 0,
    enums: parsed.tree?.rootNode.descendantsOfType("enum_declaration").length ?? 0,
    functionCalls: parsed.tree?.rootNode.descendantsOfType("call_expression").length ?? 0,
    parseError: parsed.error
  });
  if (!solanaEvidence.test(stripSolidityComments(input.source))) return { programs: [], file, diagnostics: [`${input.uri}: Solidity source has no Solang/Solana evidence; metrics recorded without creating a Solana program.`] };
  if (!parsed.tree) return { programs: [], file, diagnostics: [`${input.uri}: ${parsed.error ?? "Solidity parsing failed."}`] };
  if (!contracts.length) return { programs: [], file, diagnostics: [`${input.uri}: Solang/Solana evidence was detected, but no structurally parsed contract declaration was found.`] };
  const programs = contracts.map((contract, index) => contractProgram(input, contract, file, contracts.length > 1 ? index : void 0));
  return { programs, file, diagnostics: parsed.error ? [`${input.uri}: ${parsed.error}`] : [] };
}
function contractProgram(input, contract, metric, duplicateIndex) {
  const nameNode = contract.childForFieldName("name");
  const contractName = nameNode?.text ?? `contract-${(duplicateIndex ?? 0) + 1}`;
  const program = createSourceProgram(duplicateIndex === void 0 ? contractName : `${input.packageName ?? "solang"}:${contractName}`, "solang-solidity", input.manifestUri, "solana-program", input.packageEvidence);
  program.sourceFiles.push(metric);
  const contractLoc = nodeLocation(input.uri, contract);
  program.frameworkEvidence.push({ framework: "solang", confidence: 0.98, location: contractLoc, evidence: [{ description: "Solang-specific Solana annotations or APIs detected", location: contractLoc }] });
  const contractAnnotations = annotationsBefore(input.source, contract.startIndex);
  const programId = annotationValues(contractAnnotations, "program_id")[0]?.replace(/^['"]|['"]$/g, "");
  if (programId) program.identity = { programId, sources: [{ description: "Solang @program_id annotation", location: contractLoc }], conflicts: [] };
  const functions = nonNull(contract.descendantsOfType(["function_definition", "constructor_definition"])).filter((node) => nearestContract(node)?.startIndex === contract.startIndex);
  const calls = [];
  for (const node of functions) {
    const constructor = node.type === "constructor_definition";
    const name2 = constructor ? "new" : node.childForFieldName("name")?.text ?? "anonymous";
    const location3 = nodeLocation(input.uri, node);
    const text = node.text;
    const children = nonNull(node.namedChildren);
    const visibility = children.find((child) => child.type === "visibility")?.text ?? /\b(external|public|internal|private)\b/.exec(text)?.[1] ?? (constructor ? "public" : "internal");
    const parameterNodes = children.filter((child) => child.type === "parameter");
    const astParameters = parameterNodes.map((parameter, index) => ({ name: parameter.childForFieldName("name")?.text ?? `argument${index + 1}`, type: parameter.childForFieldName("type")?.text ?? parameter.namedChildren[0]?.text }));
    const parsedParameters = parseSolangParameters(text);
    const parameterItems = parsedParameters.parameters.length || parsedParameters.signatureFound ? parsedParameters.parameters : astParameters;
    const parameters = parameterItems.length;
    const returnType = node.childForFieldName("return_type")?.text ?? /\breturns\s*\(([^)]*)\)/.exec(text)?.[1]?.trim();
    const qualifiedName = `${contractName}::${name2}`;
    const complexity = 1 + node.descendantsOfType(["if_statement", "for_statement", "while_statement", "do_while_statement", "try_statement", "conditional_expression"]).length;
    const lines = location3.endLine - location3.startLine + 1;
    program.functions.push({ name: name2, qualifiedName, location: location3, lines, codeLines: lines, complexity, parameters, returnType, isPublic: constructor || visibility === "public" || visibility === "external", visibility, isUnsafe: false, program: program.name });
    const annotations = annotationsBefore(input.source, node.startIndex);
    const contextType = `${contractName}::${name2}`;
    const accounts = parseAccounts(input, annotations, contextType, program.accounts.length);
    const pdaSeeds = constructor ? [.../* @__PURE__ */ new Set([...annotationValues(annotations, "seed"), ...parsedParameters.seedParameters])] : annotationValues(annotations, "seed");
    const pdaBump = annotationValues(annotations, "bump")[0] ?? (constructor ? parsedParameters.bumpParameter : void 0);
    if (constructor && annotationValues(annotations, "payer").length) addConstructorAccountsAndCpi(program, input, annotations, contextType, name2, location3, accounts, pdaSeeds);
    program.accounts.push(...accounts);
    program.securitySurface.signerSignals += accounts.filter((account2) => account2.signer).length;
    program.securitySurface.writableSignals += accounts.filter((account2) => account2.writable).length;
    if (constructor || visibility === "public" || visibility === "external") {
      const selector = annotationValues(annotations, "selector")[0];
      program.instructions.push({ id: stableId("instruction", input.uri, location3.startLine, name2), name: name2, functionName: name2, handler: qualifiedName, contextType, discriminator: selector, arguments: parameterItems, returns: returnType, location: location3, confidence: 0.96, evidence: [{ description: constructor ? "Solang constructor is externally reachable" : `Solang ${visibility} function is externally reachable`, location: location3 }] });
    }
    addPdaEvidence(program, input, pdaSeeds, pdaBump, name2, location3, accounts);
    const bodyCalls = nonNull(node.descendantsOfType("call_expression"));
    for (const call of bodyCalls) analyzeCall(program, input, qualifiedName, name2, call, calls);
  }
  const names = new Set(program.functions.map((fn) => fn.qualifiedName));
  for (const call of calls) if (call.status === "unresolved" && names.has(`${contractName}::${call.callee}`)) {
    call.status = "resolved";
    call.resolved = true;
    call.target = `${contractName}::${call.callee}`;
    call.candidateTargets = [call.target];
    call.confidence = 0.95;
    call.resolutionReason = "direct call to a function in the same Solang contract";
  }
  program.callGraph = simpleCallGraph(program.functions.map((fn) => fn.qualifiedName), calls);
  const stateVariables = nonNull(contract.descendantsOfType("state_variable_declaration")).filter((node) => nearestContract(node)?.startIndex === contract.startIndex);
  if (stateVariables.length) {
    const fields = stateVariables.map((node) => ({ name: node.childForFieldName("name")?.text ?? /([A-Za-z_]\w*)\s*(?:=|;)/.exec(node.text)?.[1] ?? "field", type: node.childForFieldName("type")?.text ?? node.namedChildren[0]?.text ?? "unknown", visibility: /\b(public|private|internal)\b/.exec(node.text)?.[1] }));
    const constructorNode = functions.find((node) => node.type === "constructor_definition");
    const constructorAnnotations = constructorNode ? annotationsBefore(input.source, constructorNode.startIndex) : "";
    const stateId = stableId("state", input.uri, contractLoc.startLine, contractName);
    program.stateTypes = [{ id: stateId, name: contractName, package: program.name, framework: "solang", fields, visibility: "contract", serialization: ["Solang storage layout"], zeroCopy: false, declaredSpace: annotationValues(constructorAnnotations, "space")[0], dynamicSize: fields.some((item) => /\b(mapping|string|bytes)\b|\[\s*\]/.test(item.type)), pdaIds: program.securitySurface.pdaSites.map((item) => item.id).filter(Boolean), initializationSites: program.instructions.filter((item) => item.name === "new").map((item) => item.id).filter(Boolean), reallocSites: [], closeSites: [], evidence: [{ description: "Solang contract storage variables", location: contractLoc }], location: contractLoc }];
    for (const fn of program.functions) {
      const owner = functions.find((node) => node.startPosition.row + 1 === fn.location.startLine);
      if (owner && fields.some((item) => new RegExp(`\\b${escapeRegex5(item.name)}\\b`).test(owner.text))) fn.stateAccess = [contractName];
    }
  }
  program.events = nonNull(contract.descendantsOfType("event_definition")).map((node) => {
    const name2 = node.childForFieldName("name")?.text ?? /event\s+(\w+)/.exec(node.text)?.[1] ?? "event";
    const location3 = nodeLocation(input.uri, node);
    return { id: stableId("event", input.uri, location3.startLine, name2), name: name2, framework: "solang", location: location3, emissionSites: nonNull(contract.descendantsOfType("emit_statement")).filter((emit) => emit.text.includes(name2)).map((emit) => nodeLocation(input.uri, emit)), evidence: [{ description: "Solidity event declaration", location: location3 }] };
  });
  return program;
}
function analyzeCall(program, input, caller, functionName, node, calls) {
  const location3 = nodeLocation(input.uri, node);
  const expression = node.childForFieldName("function")?.text ?? node.namedChildren[0]?.text ?? node.text;
  const plain = /^([A-Za-z_]\w*)/.exec(expression)?.[1] ?? expression;
  if (/^(require|assert|revert|keccak256|sha256|ripemd160|ecrecover)$/.test(plain)) return;
  const member = /([A-Za-z_]\w*)\.([A-Za-z_]\w*)/.exec(expression);
  const spl = member?.[1] === "SplToken";
  const splCpi = spl && member ? SOLANG_SPL_TOKEN_CPIS[member[2]] : void 0;
  if (member && (splCpi || !spl && /\{\s*(?:accounts|program_id|seeds)\s*:/.test(expression))) {
    const operation = splCpi?.operation ?? member[2];
    const args2 = callArguments2(node.text);
    const category = splCpi?.category ?? cpiCategory(operation);
    const signed = /\bseeds\s*:/.test(expression);
    const cpi = { id: stableId("cpi", input.uri, location3.startLine, operation), location: location3, functionName, target: splCpi ? "spl-token" : member[1], targetKind: splCpi ? "spl-token" : "custom", operation, operationCategory: category, invocationApi: splCpi ? `Solang SplToken.${member[2]}` : "Solang external call", instructionExpression: node.text, accountArguments: args2, pdaSigned: signed, evidence: [{ description: splCpi ? `Documented Solang SplToken.${member[2]} CPI` : `Solang cross-contract ${member[1]}.${operation} CPI`, location: location3 }], confidence: 0.93 };
    program.securitySurface.cpiSites.push(cpi);
    if (signed) program.securitySurface.pdaSites.push({ id: stableId("pda", input.uri, location3.startLine, operation), seeds: annotationStructValues(expression, "seeds"), location: location3, enclosingFunction: functionName, derivationApi: "Solang CPI seeds call option", usedAsSigner: true, relatedCpiIds: [cpi.id], evidence: [{ description: "Solang CPI provides PDA signer seeds", location: location3 }], confidence: 0.9 });
    return;
  }
  if (spl && member && SOLANG_SPL_TOKEN_READ_HELPERS.has(member[2])) {
    calls.push({ id: stableId("call", input.uri, location3.startLine, expression), caller, callee: `SplToken.${member[2]}`, resolved: false, sourceExpression: expression, status: "external", confidence: 0.98, resolutionReason: "documented Solang SplToken helper reads source-visible account data and does not perform a CPI", location: location3, evidence: [{ description: `Documented read-only Solang SplToken.${member[2]} helper`, location: location3 }] });
    program.runtimeOperations ??= [];
    program.runtimeOperations.push({ id: stableId("runtime", input.uri, location3.startLine, `SplToken.${member[2]}`), kind: member[2] === "get_account_info" ? "account-iteration" : "data-read", api: `SplToken.${member[2]}`, functionName, instructionIds: [], location: location3, evidence: [{ description: "Solang SPL helper reads transaction account metadata/data without invoking the Token Program", location: location3 }] });
    return;
  }
  if (spl && member) {
    calls.push({ id: stableId("call", input.uri, location3.startLine, expression), caller, callee: `SplToken.${member[2]}`, resolved: false, sourceExpression: expression, status: "unresolved", confidence: 0.5, resolutionReason: `SplToken.${member[2]} is not part of the modeled official Solang SPL-token ABI`, location: location3, evidence: [{ description: "Unmodeled Solang SplToken helper; CPI behavior is not guessed", location: location3 }] });
    return;
  }
  const status = /\.|\[|\(/.test(expression) && !/^\w+$/.test(expression) ? "dynamic" : "unresolved";
  calls.push({ id: stableId("call", input.uri, location3.startLine, expression), caller, callee: plain, resolved: false, sourceExpression: expression, status, confidence: status === "dynamic" ? 0.35 : 0.7, resolutionReason: status === "dynamic" ? "receiver or callable is dynamic" : `no same-contract target named ${plain} was found yet`, location: location3, evidence: [{ description: "Solang call expression", location: location3 }] });
}
function parseAccounts(input, annotations, contextType, startOrdinal) {
  const result = /* @__PURE__ */ new Map();
  const kinds = ["account", "mutableAccount", "signer", "mutableSigner", "payer"];
  for (const kind of kinds) for (const value of annotationValues(annotations, kind)) {
    const name2 = value.split(",")[0].trim().replace(/^['"]|['"]$/g, "");
    if (!/^[A-Za-z_]\w*$/.test(name2)) continue;
    const location3 = offsetLocation(input.uri, input.source, Math.max(0, input.source.indexOf(`@${kind}`, Math.max(0, input.source.length - annotations.length - 1))), Math.max(0, input.source.indexOf(`@${kind}`, Math.max(0, input.source.length - annotations.length - 1))) + kind.length + 1);
    const current = result.get(name2) ?? { id: `account:${contextType}:${name2}`, name: name2, type: "AccountMeta", ordinal: startOrdinal + result.size, contextType, location: location3, evidence: [], confidence: 0.95 };
    if (kind === "mutableAccount" || kind === "mutableSigner" || kind === "payer") current.writable = true;
    if (kind === "signer" || kind === "mutableSigner" || kind === "payer") current.signer = true;
    current.evidence.push({ description: `Solang @${kind} account annotation`, location: location3 });
    result.set(name2, current);
  }
  return [...result.values()];
}
function addPdaEvidence(program, input, seeds, bump, fn, location3, accounts) {
  if (!seeds.length) return;
  const related = accounts.find((account2) => account2.name === "dataAccount") ?? accounts[0];
  const relatedCpis = program.securitySurface.cpiSites.filter((cpi) => cpi.functionName === fn && cpi.pdaSigned).map((cpi) => cpi.id).filter(Boolean);
  const id = stableId("pda", input.uri, location3.startLine, fn);
  program.securitySurface.pdaSites.push({ id, seeds, bump, location: location3, enclosingFunction: fn, relatedAccountId: related?.id, derivationApi: "Solang @seed/@bump annotations", usedAsSigner: relatedCpis.length > 0, relatedCpiIds: relatedCpis, evidence: [{ description: "Solang PDA constructor annotations", location: location3 }], confidence: 0.94 });
  if (related) related.pdaId = id;
  for (const cpi of program.securitySurface.cpiSites.filter((item) => relatedCpis.includes(item.id))) cpi.signerPdaIds = [.../* @__PURE__ */ new Set([...cpi.signerPdaIds ?? [], id])];
}
function addConstructorAccountsAndCpi(program, input, annotations, contextType, fn, location3, accounts, seeds) {
  if (!accounts.some((account2) => account2.name === "dataAccount")) accounts.push({ id: `account:${contextType}:dataAccount`, name: "dataAccount", type: "SolangDataAccount", writable: true, ordinal: accounts.length, contextType, lifecycle: ["init", "create", "write"], location: location3, confidence: 0.94, evidence: [{ description: "Solang constructor implicit data account allocated using @payer", location: location3 }] });
  if (!accounts.some((account2) => account2.name === "systemProgram")) accounts.push({ id: `account:${contextType}:systemProgram`, name: "systemProgram", type: "SystemProgram", executable: true, addressExpectation: "11111111111111111111111111111111", ordinal: accounts.length, contextType, location: location3, confidence: 0.94, evidence: [{ description: "Solang constructor account allocation uses the System Program", location: location3 }] });
  const cpiId = stableId("cpi", input.uri, location3.startLine, "constructor-allocation");
  program.securitySurface.cpiSites.push({ id: cpiId, location: location3, functionName: fn, target: "system-program", targetKind: "system-program", operation: "create-account", operationCategory: "account-creation", invocationApi: "Solang constructor allocation", instructionExpression: `@payer(${annotationValues(annotations, "payer")[0]})${annotationValues(annotations, "space")[0] ? ` @space(${annotationValues(annotations, "space")[0]})` : ""}`, accountArguments: ["dataAccount", annotationValues(annotations, "payer")[0], "systemProgram"], pdaSigned: seeds.length > 0, evidence: [{ description: "Solang compiler-generated constructor account allocation evidenced by @payer", location: location3 }], confidence: 0.92 });
}
function nodeLocation(uri, node) {
  return { uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column };
}
function nearestContract(node) {
  let parent = node.parent;
  while (parent && parent.type !== "contract_declaration") parent = parent.parent;
  return parent ?? void 0;
}
function annotationsBefore(source, offset) {
  const prefix = source.slice(0, offset);
  const lines = prefix.split(/\r?\n/);
  const selected = [];
  for (let i2 = lines.length - 1; i2 >= 0; i2--) {
    const line = lines[i2].trim();
    if (!line || line.startsWith("//")) {
      if (!selected.length) continue;
      break;
    }
    if (line.startsWith("@") || selected.length && !/[;{}]/.test(line)) selected.unshift(line);
    else break;
  }
  return selected.join("\n");
}
function parseSolangParameters(text) {
  const keyword = /\b(?:constructor|function\s+[A-Za-z_]\w*)\s*\(/.exec(text);
  if (!keyword) return { parameters: [], seedParameters: [], signatureFound: false };
  const open = text.indexOf("(", keyword.index);
  const close = matchingDelimiter(text, open, "(", ")");
  if (close < 0) return { parameters: [], seedParameters: [], signatureFound: false };
  const parameters = [];
  const seedParameters = [];
  let bumpParameter;
  for (const [index, raw] of splitTopLevel3(text.slice(open + 1, close)).entries()) {
    const hasSeed = /@seed\b/.test(raw);
    const hasBump = /@bump\b/.test(raw);
    const clean = raw.replace(/@[A-Za-z_]\w*(?:\s*\([^)]*\))?/g, " ").replace(/\s+/g, " ").trim();
    if (!clean) continue;
    const nameMatch = /([A-Za-z_]\w*)\s*$/.exec(clean);
    const name2 = nameMatch?.[1] ?? `argument${index + 1}`;
    const prefix = nameMatch ? clean.slice(0, nameMatch.index).trim() : clean;
    const type = prefix.replace(/\b(?:memory|calldata|storage)\b/g, "").replace(/\s+/g, " ").trim() || void 0;
    parameters.push({ name: name2, type });
    if (hasSeed) seedParameters.push(name2);
    if (hasBump) bumpParameter = name2;
  }
  return { parameters, seedParameters, bumpParameter, signatureFound: true };
}
function annotationValues(text, name2) {
  const values = [];
  const regex = new RegExp(`@${name2}\\s*\\(([^)]*)\\)`, "g");
  for (const match of text.matchAll(regex)) values.push(match[1].trim());
  return values;
}
function annotationStructValues(text, name2) {
  const match = new RegExp(`${name2}\\s*:\\s*\\[([^\\]]*)\\]`).exec(text);
  return match ? match[1].split(",").map((item) => item.trim()).filter(Boolean) : [];
}
function callArguments2(text) {
  const start2 = text.lastIndexOf("(");
  const end = text.lastIndexOf(")");
  if (start2 < 0 || end <= start2) return [];
  return splitTopLevel3(text.slice(start2 + 1, end));
}
function splitTopLevel3(text) {
  const values = [];
  let depth = 0;
  let start2 = 0;
  for (let i2 = 0; i2 < text.length; i2++) {
    if ("([{".includes(text[i2])) depth++;
    else if (")]}".includes(text[i2])) depth--;
    else if (text[i2] === "," && depth === 0) {
      values.push(text.slice(start2, i2).trim());
      start2 = i2 + 1;
    }
  }
  const last = text.slice(start2).trim();
  if (last) values.push(last);
  return values;
}
function matchingDelimiter(text, start2, open, close) {
  let depth = 0;
  let quote = "";
  for (let index = start2; index < text.length; index++) {
    const char = text[index];
    if (quote) {
      if (char === "\\") index++;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === open) depth++;
    else if (char === close && --depth === 0) return index;
  }
  return -1;
}
function cpiCategory(operation) {
  if (/^transfer/.test(operation)) return "token-transfer";
  if (/^mint_to/.test(operation)) return "token-mint";
  if (/^burn/.test(operation)) return "token-burn";
  if (operation === "close_account") return "account-close";
  if (/^(set_authority|approve|revoke)/.test(operation)) return "authority-change";
  if (operation === "freeze_account") return "freeze";
  if (operation === "thaw_account") return "thaw";
  if (/^initialize/.test(operation)) return "initialization";
  return "other";
}
function nonNull(nodes) {
  return nodes.filter((node) => node !== null);
}
function escapeRegex5(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function stripSolidityComments(source) {
  let result = "";
  let quote = "";
  let block = false;
  for (let i2 = 0; i2 < source.length; i2++) {
    const char = source[i2], next = source[i2 + 1];
    if (block) {
      if (char === "*" && next === "/") {
        block = false;
        result += "  ";
        i2++;
      } else result += char === "\n" ? "\n" : " ";
      continue;
    }
    if (quote) {
      result += char;
      if (char === "\\") {
        result += next ?? "";
        i2++;
      } else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      result += char;
      continue;
    }
    if (char === "/" && next === "*") {
      block = true;
      result += "  ";
      i2++;
      continue;
    }
    if (char === "/" && next === "/") {
      while (i2 < source.length && source[i2] !== "\n") {
        result += " ";
        i2++;
      }
      result += "\n";
      continue;
    }
    result += char;
  }
  return result;
}

// src/analysis/sbfAssemblyFrontend.ts
init_importMetaShim();
var SBF_OPCODES = /* @__PURE__ */ new Set([
  "lddw",
  "ldxb",
  "ldxh",
  "ldxw",
  "ldxdw",
  "stb",
  "sth",
  "stw",
  "stdw",
  "stxb",
  "stxh",
  "stxw",
  "stxdw",
  "add32",
  "add64",
  "sub32",
  "sub64",
  "mul32",
  "mul64",
  "div32",
  "div64",
  "mod32",
  "mod64",
  "or32",
  "or64",
  "and32",
  "and64",
  "xor32",
  "xor64",
  "lsh32",
  "lsh64",
  "rsh32",
  "rsh64",
  "arsh32",
  "arsh64",
  "neg32",
  "neg64",
  "mov32",
  "mov64",
  "le",
  "be",
  "uhmul64",
  "udiv32",
  "udiv64",
  "urem32",
  "urem64",
  "lmul32",
  "lmul64",
  "shmul64",
  "sdiv32",
  "sdiv64",
  "srem32",
  "srem64",
  "hor64",
  "ja",
  "jeq",
  "jgt",
  "jge",
  "jset",
  "jne",
  "jsgt",
  "jsge",
  "jlt",
  "jle",
  "jslt",
  "jsle",
  "jeq32",
  "jgt32",
  "jge32",
  "jset32",
  "jne32",
  "jsgt32",
  "jsge32",
  "jlt32",
  "jle32",
  "jslt32",
  "jsle32",
  "call",
  "callx",
  "syscall",
  "exit"
]);
function analyzeSbfAssembly(input) {
  const lines = parseLines(input.source);
  const hasRegisters = lines.some((line) => /\br(?:10|[0-9])\b/i.test(`${line.opcode ?? ""} ${line.operands}`));
  const hasIsa = lines.some((line) => !!line.opcode);
  const hasNamedSolanaSyscall = lines.some((line) => /\bsol_[a-z0-9_]+\b/i.test(line.operands));
  const hasEntrypoint2 = lines.some((line) => line.label === "entrypoint" || /\.g(?:lobl|lobal)\s+entrypoint\b/.test(line.code) || /\.text\.entrypoint\b/.test(line.code));
  const hasExplicitSbpfExtension = /\.sbpf(?:[?#]|$)/i.test(input.uri);
  const signals = [hasRegisters, hasIsa, hasNamedSolanaSyscall, hasEntrypoint2, hasExplicitSbpfExtension].filter(Boolean).length;
  const assemblyCounts = countAssemblyLines(input.source);
  const file = textFileMetric(input.uri, input.source, "sbf-assembly", { ...assemblyCounts, functions: 0, functionCalls: lines.filter((line) => /^(call|callx|syscall)$/i.test(line.opcode ?? "")).length, loops: countBackwardJumps(lines) });
  if (!hasIsa || !(hasNamedSolanaSyscall || hasEntrypoint2 || hasExplicitSbpfExtension)) return { programs: [], file, diagnostics: [`${input.uri}: assembly lacks positive sBPF/Solana identity evidence (entrypoint, named Solana syscall, or .sbpf source); metrics recorded without creating a Solana program.`] };
  const globals = new Set(lines.flatMap((line) => {
    const match = /^\.g(?:lobl|lobal)\s+([\w.$]+)/.exec(line.code);
    return match ? [match[1]] : [];
  }));
  const typed = new Set(lines.flatMap((line) => {
    const match = /^\.type\s+([\w.$]+)\s*,\s*[@%]function/.exec(line.code);
    return match ? [match[1]] : [];
  }));
  const directTargets = new Set(lines.filter((line) => line.opcode === "call" && /^[A-Za-z_.$][\w.$]*$/.test(line.operands.trim())).map((line) => line.operands.trim()));
  const labels = lines.filter((line) => line.label).map((line) => line.label);
  const functionNames = labels.filter((label) => label === "entrypoint" || globals.has(label) || typed.has(label) || directTargets.has(label));
  if (!functionNames.length && labels.length) functionNames.push(labels[0]);
  file.functions = functionNames.length;
  const programName = input.packageName ?? assemblyName(input.uri);
  const program = createSourceProgram(programName, "sbf-assembly", input.manifestUri, "solana-program", input.packageEvidence);
  program.sourceFiles.push(file);
  program.frameworkEvidence.push({ framework: "sbf-assembly", confidence: 0.95, evidence: [{ description: `${signals} independent sBPF/Solana assembly signals detected`, location: lineLocation(input, lines.find((line) => line.opcode) ?? lines[0]) }] });
  const functionStarts = functionNames.map((name2) => ({ name: name2, index: lines.findIndex((line) => line.label === name2) })).filter((item) => item.index >= 0).sort((a, b) => a.index - b.index);
  const calls = [];
  const runtime = [];
  for (let index = 0; index < functionStarts.length; index++) {
    const current = functionStarts[index];
    const body2 = lines.slice(current.index, functionStarts[index + 1]?.index ?? lines.length);
    const first = body2[0];
    const last = body2.at(-1) ?? first;
    const location3 = { ...lineLocation(input, first), endLine: last.number, endColumn: last.code.length };
    const qualified = `${programName}::${current.name}`;
    const conditional = body2.filter((line) => isConditionalJump(line.opcode)).length;
    program.functions.push({ name: current.name, qualifiedName: qualified, location: location3, lines: last.number - first.number + 1, codeLines: body2.filter((line) => line.code.trim()).length, complexity: 1 + conditional, parameters: 0, isPublic: globals.has(current.name) || current.name === "entrypoint", visibility: globals.has(current.name) ? "global" : "local", isUnsafe: false, program: programName });
    if (current.name === "entrypoint" || globals.has(current.name) && /entrypoint/i.test(current.name)) program.instructions.push({ id: stableId("instruction", input.uri, first.number, current.name), name: current.name, functionName: current.name, handler: qualified, location: location3, confidence: 0.95, evidence: [{ description: "Explicit sBPF assembly entrypoint symbol", location: location3 }] });
    for (const line of body2) {
      const lineLoc = lineLocation(input, line);
      const opcode = line.opcode?.toLowerCase();
      if (!opcode) continue;
      if (opcode === "call" || opcode === "callx") {
        const target = line.operands.trim();
        const syscallTarget = opcode === "call" && /^sol_[a-z0-9_]+$/i.test(target);
        const direct = opcode === "call" && /^[A-Za-z_.$][\w.$]*$/.test(target);
        const resolved = direct && functionNames.includes(target);
        calls.push({ id: stableId("call", input.uri, line.number, target), caller: qualified, callee: target, resolved, sourceExpression: `${opcode} ${target}`, target: resolved ? `${programName}::${target}` : void 0, candidateTargets: resolved ? [`${programName}::${target}`] : [], status: resolved ? "resolved" : syscallTarget ? "external" : opcode === "callx" ? "dynamic" : "unresolved", dispatchKind: opcode === "callx" ? "function-pointer" : "direct", indirect: opcode === "callx", confidence: resolved || syscallTarget ? 0.98 : 0.35, resolutionReason: resolved ? "direct call to a declared assembly function label" : syscallTarget ? "named Solana syscall is an external runtime call" : opcode === "callx" ? "register-indirect sBPF call" : "call target is not a declared function label", location: lineLoc, evidence: [{ description: syscallTarget ? `named Solana syscall ${target}` : `${opcode} assembly instruction`, location: lineLoc }] });
      }
      const syscall = opcode === "syscall" ? line.operands.trim() : opcode === "call" && /^sol_/.test(line.operands.trim()) ? line.operands.trim() : void 0;
      if (syscall) addSyscall(program, runtime, input, current.name, syscall, lineLoc);
      if (/^ldx/i.test(opcode)) runtime.push(runtimeOp(input, current.name, line, "data-read", opcode));
      if (/^stx?/i.test(opcode)) runtime.push(runtimeOp(input, current.name, line, "data-write", opcode));
    }
  }
  program.runtimeOperations = runtime.sort((a, b) => a.id.localeCompare(b.id));
  program.callGraph = simpleCallGraph(program.functions.map((fn) => fn.qualifiedName), calls);
  return { programs: [program], file, diagnostics: [] };
}
function addSyscall(program, runtime, input, fn, syscall, location3) {
  runtime.push({ id: stableId("runtime", input.uri, location3.startLine, syscall), kind: syscallKind(syscall), api: syscall, functionName: fn, instructionIds: [], location: location3, evidence: [{ description: `Solana sBPF syscall ${syscall}`, location: location3 }] });
  if (/sol_(?:invoke|invoke_signed)/.test(syscall)) {
    const signed = /invoke_signed/.test(syscall);
    const cpiId = stableId("cpi", input.uri, location3.startLine, syscall);
    const signerPdaId = signed ? stableId("pda", input.uri, location3.startLine, `${syscall}:signer-seeds`) : void 0;
    program.securitySurface.cpiSites.push({ id: cpiId, location: location3, functionName: fn, targetKind: "dynamic", invocationApi: syscall, signerPdaIds: signerPdaId ? [signerPdaId] : [], pdaSigned: signed, evidence: [{ description: `${syscall} performs a CPI; target is constructed at runtime`, location: location3 }], confidence: 0.95 });
    if (signerPdaId) program.securitySurface.pdaSites.push({ id: signerPdaId, seeds: [], location: location3, enclosingFunction: fn, derivationApi: `${syscall} signer seed buffers`, usedAsSigner: true, relatedCpiIds: [cpiId], evidence: [{ description: `${syscall} supplies runtime PDA signer seeds; buffer contents are unresolved`, location: location3 }], confidence: 0.9 });
  }
  if (/sol_(?:create_program_address|try_find_program_address)/.test(syscall)) program.securitySurface.pdaSites.push({ id: stableId("pda", input.uri, location3.startLine, syscall), location: location3, enclosingFunction: fn, derivationApi: syscall, evidence: [{ description: `${syscall} derives a PDA; seed buffers are register/runtime values`, location: location3 }], confidence: 0.92 });
}
function runtimeOp(input, fn, line, kind, api) {
  const location3 = lineLocation(input, line);
  return { id: stableId("runtime", input.uri, line.number, `${kind}:${api}`), kind, api, functionName: fn, instructionIds: [], location: location3, evidence: [{ description: `sBPF ${kind} instruction; account/state binding is unavailable at source assembly level`, location: location3 }] };
}
function parseLines(source) {
  let offset = 0;
  return source.split(/\r?\n/).map((raw, index) => {
    const start2 = offset;
    offset += raw.length + 1;
    const code = stripComment(raw).trim();
    const labelMatch = /^([A-Za-z_.$][\w.$]*):/.exec(code);
    const rest = labelMatch ? code.slice(labelMatch[0].length).trim() : code;
    const instruction = /^([A-Za-z][A-Za-z0-9]*)\s*(.*)$/.exec(rest);
    const opcode = instruction?.[1].toLowerCase();
    return { number: index + 1, start: start2, code, label: labelMatch?.[1], opcode: opcode && SBF_OPCODES.has(opcode) ? opcode : void 0, operands: opcode && SBF_OPCODES.has(opcode) ? instruction[2].trim() : "" };
  });
}
function isConditionalJump(opcode) {
  return !!opcode && /^j(?:eq|ne|gt|ge|set|lt|le|sgt|sge|slt|sle)(?:32)?$/.test(opcode);
}
function countBackwardJumps(lines) {
  const labels = new Map(lines.filter((line) => line.label).map((line) => [line.label, line.number]));
  return lines.filter((line) => {
    if (!line.opcode || !(line.opcode === "ja" || isConditionalJump(line.opcode))) return false;
    const target = line.operands.split(",").at(-1)?.trim();
    const targetLine = target ? labels.get(target) : void 0;
    return targetLine !== void 0 && targetLine <= line.number;
  }).length;
}
function stripComment(line) {
  let quoted = false;
  for (let i2 = 0; i2 < line.length; i2++) {
    if (line[i2] === '"' && line[i2 - 1] !== "\\") quoted = !quoted;
    if (!quoted && (line[i2] === ";" || line[i2] === "#" || line.slice(i2, i2 + 2) === "//")) return line.slice(0, i2);
  }
  return line;
}
function countAssemblyLines(source) {
  const lines = source.split(/\r?\n/);
  let blankLines = 0, commentLines = 0, codeLines = 0;
  for (const line of lines) {
    if (!line.trim()) blankLines++;
    else if (stripComment(line).trim()) codeLines++;
    else commentLines++;
  }
  return { lines: lines.length, blankLines, commentLines, codeLines };
}
function lineLocation(input, line) {
  return offsetLocation(input.uri, input.source, line.start, line.start + line.code.length);
}
function assemblyName(uri) {
  return uri.split("/").at(-1)?.replace(/\.(?:s|S|asm|sbpf)$/, "") || "sbf-program";
}
function syscallKind(name2) {
  if (/invoke/.test(name2)) return "cpi";
  if (/program_address/.test(name2)) return "pda-derivation";
  if (/log/.test(name2)) return "logging";
  if (/sysvar/.test(name2)) return "sysvar-read";
  if (/(memcpy|memmove|memcmp|memset)/.test(name2)) return "memory";
  if (/(hash|sha|keccak|blake)/.test(name2)) return "hashing";
  return "syscall";
}

// src/analysis/analyzer.ts
var AnalysisCancelledError = class extends Error {
  constructor() {
    super("Analysis cancelled.");
    this.name = "AnalysisCancelledError";
  }
};
async function analyzeSources(inputs, wasmPath, runtimeWasmPath, isCancelled = () => false, options2 = {}) {
  const compilationProfile2 = options2.compilationProfile ? { ...options2.compilationProfile, cfgOptions: [...new Set(options2.compilationProfile.cfgOptions.map((item) => item.trim()).filter(Boolean))].sort(), evidence: dedupeSemanticEvidence(options2.compilationProfile.evidence) } : void 0;
  const rustInputs = inputs.filter((input) => (input.language ?? sourceLanguage(input.uri) ?? "rust") === "rust");
  const originalParsed = await mapConcurrent(rustInputs, 8, (input) => {
    if (isCancelled()) throw new AnalysisCancelledError();
    return parseRust(input.uri, input.source, wasmPath, runtimeWasmPath);
  });
  const frontendResults = await mapConcurrent(inputs.filter((input) => (input.language ?? sourceLanguage(input.uri) ?? "rust") !== "rust"), 8, async (input) => {
    if (isCancelled()) throw new AnalysisCancelledError();
    const language = input.language ?? sourceLanguage(input.uri);
    return language === "solang-solidity" ? analyzeSolang(input, options2.solidityWasmPath, runtimeWasmPath) : analyzeSbfAssembly(input);
  });
  if (isCancelled()) throw new AnalysisCancelledError();
  const workspaceGraph = inputs.find((input) => input.workspaceGraph)?.workspaceGraph;
  const cfgAnalyses = originalParsed.map((file, index) => {
    const input = rustInputs[index];
    const pkg = workspaceGraph?.packages.find((item) => item.id === input.packageId || item.name === input.packageName);
    return file.tree ? analyzeConditionalCompilation(file.tree.rootNode, file.uri, file.source, pkg?.enabledFeatures, compilationProfile2) : { source: file.source, inactiveItems: 0, unknownItems: 0, unknownPredicates: [], unknownRanges: [] };
  });
  const parsed = await mapConcurrent(originalParsed, 8, async (file, index) => cfgAnalyses[index].source === file.source ? file : parseRust(file.uri, cfgAnalyses[index].source, wasmPath, runtimeWasmPath));
  const analysisDiagnostics = [
    ...originalParsed.filter((file) => file.error).map((file, index) => ({ id: `diagnostic:parse:${index}`, severity: "error", category: "parse", message: file.error, location: { uri: file.uri, startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 } })),
    ...frontendResults.flatMap((result, index) => result.file.parseError ? [{ id: `diagnostic:parse:frontend:${index}`, severity: "error", category: "parse", message: result.file.parseError, location: { uri: result.file.uri, startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 } }] : []),
    ...workspaceGraph?.diagnostics ?? []
  ];
  const diagnostics = [...analysisDiagnostics.map((item) => `${item.location?.uri ? `${item.location.uri}: ` : ""}${item.message}`), ...frontendResults.flatMap((result) => result.diagnostics)];
  const programs = /* @__PURE__ */ new Map();
  const parsedByPackage = /* @__PURE__ */ new Map();
  const files = [];
  parsed.forEach((file, index) => {
    const input = rustInputs[index];
    const metric = fileMetric(originalParsed[index]);
    files.push(metric);
    const name2 = input.packageName ?? packageFromUri(input.uri);
    const cargoPackage = workspaceGraph?.packages.find((pkg) => pkg.id === input.packageId || pkg.name === name2);
    const program = programs.get(name2) ?? emptyProgram(name2, input.manifestUri, input.packageKind, input.packageEvidence);
    if (cargoPackage) {
      program.rootUri = cargoPackage.rootUri;
      program.packageId = cargoPackage.id;
      program.cargoMetadataId = cargoPackage.metadataId;
      program.packageConfidence = cargoPackage.confidence;
      program.packageDependencies = cargoPackage.dependencies;
    }
    program.rustFiles.push(metric);
    program.sourceFiles = program.rustFiles;
    program.sourceLanguage = "rust";
    if (file.tree) extract(file, program);
    applyConditionalCompilation(program, file.uri, cfgAnalyses[index], cargoPackage?.enabledFeatures);
    if (file.tree) parsedByPackage.set(name2, [...parsedByPackage.get(name2) ?? [], { uri: file.uri, root: file.tree.rootNode, packageName: name2, packageRoot: input.packageRoot ?? cargoPackage?.rootUri }]);
    programs.set(name2, program);
  });
  files.push(...frontendResults.map((result) => result.file));
  for (const frontend of frontendResults) for (const program of frontend.programs) addUniqueProgram(programs, program);
  const list = [...programs.values()];
  for (const program of list) mergeInstructionEvidence(program);
  const symbolIndexes = /* @__PURE__ */ new Map();
  for (const program of list) {
    if (isCancelled()) throw new AnalysisCancelledError();
    if (program.sourceLanguage && program.sourceLanguage !== "rust") continue;
    const indexedFiles = parsedByPackage.get(program.name) ?? [];
    const symbolIndex = buildRustSymbolIndex(indexedFiles);
    symbolIndexes.set(program.name, symbolIndex);
    program.symbols = symbolIndex.symbols;
    for (const fn of program.functions) {
      const symbol2 = symbolIndex.symbols.find((item) => (item.kind === "function" || item.kind === "method" || item.kind === "associated-function") && item.location.uri === fn.location.uri && item.location.startLine === fn.location.startLine && item.location.startColumn === fn.location.startColumn && item.shortName === fn.name);
      if (symbol2) {
        fn.qualifiedName = symbol2.qualifiedName;
        symbol2.cfgStatus = fn.cfgStatus;
        symbol2.cfgPredicates = fn.cfgPredicates;
      }
    }
  }
  for (const program of list) if (!program.sourceLanguage || program.sourceLanguage === "rust") program.callGraph = buildCallGraph(parsedByPackage.get(program.name) ?? [], program.functions, symbolIndexes.get(program.name));
  resolveCrossPackageCalls(list, symbolIndexes);
  for (const program of list) {
    if (isCancelled()) throw new AnalysisCancelledError();
    const callGraph = program.callGraph;
    for (const fn of program.functions) {
      const calls = callGraph.calls.filter((call) => call.caller === fn.qualifiedName);
      fn.directCalls = calls.map((call) => call.id);
      fn.resolvedCalls = calls.filter((call) => call.status === "resolved").length;
      fn.unresolvedCalls = calls.filter((call) => call.status === "unresolved" || call.status === "ambiguous" || call.status === "dynamic").length;
    }
    linkFrameworkPdas(program);
    resolveInstructionAccounts(program);
    buildExternalPrograms(program);
    propagateReachableSurface(program);
    enrichStateDataflow((parsedByPackage.get(program.name) ?? []).map((item) => ({ uri: item.uri, root: item.root })), program);
    resolveInstructionAccounts(program);
    buildArchitecture(program);
    linkReachableSemantics(program);
  }
  propagateCrossPackageSurfaces(list);
  attachReachabilityWitnesses(list);
  buildAssetFlows(list);
  for (const program of list) {
    program.reviewHotspots = applyReviewComplexity(program);
    program.capabilities = buildCapabilities(program);
  }
  const allSurface = list.map((program) => program.securitySurface);
  const reviewProfile = list.flatMap((program) => program.reviewHotspots ?? []).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const allFlows = list.flatMap((program) => program.assetFlows ?? []);
  const flowCategory = (category) => allFlows.filter((flow) => flow.operationCategory === category).length;
  const report = {
    schemaVersion: SCHEMA_VERSION,
    tool: { name: "Sealevel Insight", version: TOOL_VERSION },
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    compilationProfile: compilationProfile2,
    programs: list,
    files,
    diagnostics,
    analysisDiagnostics,
    reviewProfile,
    workspaceGraph,
    coverage: coverageFor(list, files),
    summary: {
      rustFiles: files.filter((file) => (file.language ?? "rust") === "rust").length,
      sourceFiles: files.length,
      solidityFiles: files.filter((file) => file.language === "solang-solidity").length,
      assemblyFiles: files.filter((file) => file.language === "sbf-assembly").length,
      loc: sum(files, "lines"),
      codeLoc: sum(files, "codeLines"),
      blankLines: sum(files, "blankLines"),
      commentLines: sum(files, "commentLines"),
      functions: list.reduce((n, p) => n + p.functions.length, 0),
      instructions: list.reduce((n, p) => n + p.instructions.length, 0),
      accounts: list.reduce((n, p) => n + p.accounts.length, 0),
      signerSignals: sumSurface(allSurface, "signerSignals"),
      writableSignals: sumSurface(allSurface, "writableSignals"),
      rawOrUncheckedAccounts: sumSurface(allSurface, "rawOrUncheckedAccounts"),
      pdas: sumSurface(allSurface, "pdaSites", true),
      cpis: sumSurface(allSurface, "cpiSites", true),
      pdaSignedCpis: allSurface.reduce((n, s) => n + s.cpiSites.filter((cpi) => cpi.pdaSigned).length, 0),
      unsafeBlocks: sumSurface(allSurface, "unsafeBlocks"),
      tokenFlows: allFlows.length,
      tokenTransfers: flowCategory("token-transfer"),
      tokenMints: flowCategory("token-mint"),
      tokenBurns: flowCategory("token-burn")
    }
  };
  refreshAuditProducts(report);
  const invariantDiagnostics = validateReport(report);
  report.analysisDiagnostics.push(...invariantDiagnostics);
  report.diagnostics.push(...invariantDiagnostics.map((item) => item.message));
  return report;
}
function applyConditionalCompilation(program, uri, analysis, enabledFeatures) {
  const summary = program.conditionalCompilation ?? { featureKnowledge: enabledFeatures ? "cargo-metadata" : "unknown", enabledFeatures: [], inactiveItems: 0, unknownItems: 0, unknownPredicates: [], evidence: [] };
  if (enabledFeatures) summary.featureKnowledge = "cargo-metadata";
  summary.enabledFeatures = [.../* @__PURE__ */ new Set([...summary.enabledFeatures, ...enabledFeatures ?? []])].sort();
  summary.inactiveItems += analysis.inactiveItems;
  summary.unknownItems += analysis.unknownItems;
  summary.unknownPredicates = [.../* @__PURE__ */ new Set([...summary.unknownPredicates, ...analysis.unknownPredicates])].sort();
  summary.evidence = [...summary.evidence, ...analysis.inactiveItems ? [{ description: `${analysis.inactiveItems} cfg-disabled item(s) excluded from semantic reachability in ${uri}` }] : [], ...analysis.unknownRanges.flatMap((item) => item.evidence)];
  program.conditionalCompilation = summary;
  const annotate = (item) => {
    const ranges = analysis.unknownRanges.filter((range) => item.location.uri === uri && (item.location.startLine > range.startLine || item.location.startLine === range.startLine && item.location.startColumn >= range.startColumn) && (item.location.endLine < range.endLine || item.location.endLine === range.endLine && item.location.endColumn <= range.endColumn));
    if (!ranges.length) return;
    item.cfgStatus = "unknown";
    item.cfgPredicates = [...new Set(ranges.flatMap((range) => range.predicates))].sort();
  };
  program.functions.filter((item) => item.location.uri === uri).forEach(annotate);
  program.instructions.filter((item) => item.location.uri === uri).forEach(annotate);
}
function resolveCrossPackageCalls(programs, indexes) {
  const byPackageId = new Map(programs.filter((program) => program.packageId).map((program) => [program.packageId, program]));
  const byMetadataId = new Map(programs.filter((program) => program.cargoMetadataId).map((program) => [program.cargoMetadataId, program]));
  for (const program of programs) {
    const graph = program.callGraph;
    const index = indexes.get(program.name);
    if (!graph || !index) continue;
    for (const call of graph.calls.filter((item) => item.status === "external" || item.status === "unresolved")) {
      let expression = call.sourceExpression ?? "";
      const module2 = index.modulesByFile.get(call.location.uri) ?? "crate";
      const first = expression.split("::")[0];
      const imported = index.imports.find((item) => item.fileUri === call.location.uri && item.module === module2 && !item.glob && item.alias === first);
      if (imported) expression = `${imported.target}${expression.slice(first.length)}`;
      const prefix = expression.split("::")[0];
      const dependency = (program.packageDependencies ?? []).find((item) => item.kind === "normal" && normalizeCrateName(item.name) === normalizeCrateName(prefix) && (item.internalPackageId || item.resolvedPackageIds?.some((id) => byMetadataId.has(id))));
      const targetProgram = dependency?.internalPackageId ? byPackageId.get(dependency.internalPackageId) : dependency?.resolvedPackageIds?.map((id) => byMetadataId.get(id)).find((item) => !!item);
      if (!targetProgram) continue;
      const relative8 = expression.includes("::") ? expression.split("::").slice(1).join("::") : "";
      const candidates = (targetProgram.symbols ?? []).filter((symbol3) => (symbol3.kind === "function" || symbol3.kind === "method" || symbol3.kind === "associated-function") && symbol3.visibility === "pub" && (relative8 ? symbol3.qualifiedName === `crate::${relative8}` : symbol3.shortName === expression));
      const qualified = (symbol3) => `${targetProgram.name}::${symbol3.qualifiedName.replace(/^crate::/, "")}`;
      if (candidates.length !== 1) {
        call.resolved = false;
        if (candidates.length > 1) {
          call.status = "ambiguous";
          call.candidateTargets = candidates.map(qualified).sort();
          call.confidence = 0.35;
          call.resolutionReason = `multiple public functions in internal Cargo dependency ${targetProgram.name} match ${expression}`;
        } else {
          call.status = "unresolved";
          call.candidateTargets = [];
          call.confidence = 0.25;
          call.resolutionReason = `internal Cargo dependency ${targetProgram.name} is known, but no externally public indexed function matches ${expression}`;
        }
        continue;
      }
      const symbol2 = candidates[0];
      const target = qualified(symbol2);
      call.status = "resolved";
      call.resolved = true;
      call.target = target;
      call.callee = target;
      call.candidateTargets = [target];
      call.confidence = 0.88;
      call.resolutionReason = `one public function matched through internal Cargo dependency ${dependency.name}`;
      call.evidence.push({ description: `public function resolved through internal Cargo dependency ${dependency.name}`, location: call.location });
      graph.symbols.push(target);
      graph.edges.push({ source: call.caller, target, confidence: 0.88 });
      program.symbols ??= [];
      program.symbols.push({ ...symbol2, id: `symbol:cross-package:${program.name}:${symbol2.id}`, qualifiedName: target, evidence: [...symbol2.evidence, { description: `indexed internal dependency ${targetProgram.name}` }] });
    }
    graph.symbols = [...new Set(graph.symbols)].sort();
    graph.edges = [...new Map(graph.edges.map((edge) => [`${edge.source}:${edge.target}`, edge])).values()];
  }
}
function mergeInstructionEvidence(program) {
  const replacements = /* @__PURE__ */ new Map();
  const merged = [];
  for (const group of [...new Set(program.instructions.map((item) => item.name))].map((name2) => program.instructions.filter((item) => item.name === name2))) {
    const metadata2 = group.find((item) => item.evidence.some((evidence) => /ShankInstruction|Steel instruction!/.test(evidence.description)));
    const dispatch = group.find((item) => item.evidence.some((evidence) => /dispatch match arm/.test(evidence.description)));
    if (!metadata2 || !dispatch) {
      merged.push(...group);
      continue;
    }
    const canonical = { ...dispatch, contextType: metadata2.contextType, discriminator: metadata2.discriminator ?? dispatch.discriminator, arguments: metadata2.arguments?.length ? metadata2.arguments : dispatch.arguments, confidence: Math.max(metadata2.confidence, dispatch.confidence), evidence: [...metadata2.evidence, ...dispatch.evidence] };
    for (const item of group) replacements.set(item.id ?? item.name, canonical.id ?? canonical.name);
    merged.push(canonical);
  }
  program.instructions = merged;
  program.relationships = (program.relationships ?? []).map((item) => ({ ...item, instructionId: replacements.get(item.instructionId) ?? item.instructionId }));
}
function normalizeCrateName(value) {
  return value.replace(/-/g, "_");
}
function extract(file, program) {
  const root = file.tree.rootNode;
  const source = file.source;
  const uri = file.uri;
  enrichUnifiedSemantics(root, uri, program);
  for (const match of source.matchAll(/declare_id!\s*\(\s*"([^"]+)"\s*\)/g)) {
    const location3 = offsetLocation2(uri, source, match.index, match.index + match[0].length);
    const evidence = { description: `declare_id! program address ${match[1]}`, location: location3 };
    program.identity ??= { programId: match[1], sources: [], conflicts: [] };
    if (program.identity.programId && program.identity.programId !== match[1]) program.identity.conflicts.push(evidence);
    else {
      program.identity.programId = match[1];
      program.identity.sources.push(evidence);
    }
  }
  for (const match of source.matchAll(/(?:pub\s+)?(?:const|static)\s+(?:PROGRAM_)?ID\s*:[^=]+?=\s*(?:pubkey|address)!\s*\(\s*"([^"]+)"\s*\)/g)) {
    const location3 = offsetLocation2(uri, source, match.index, match.index + match[0].length);
    const evidence = { description: `constant program address ${match[1]}`, location: location3 };
    program.identity ??= { programId: match[1], sources: [], conflicts: [] };
    if (program.identity.programId && program.identity.programId !== match[1]) program.identity.conflicts.push(evidence);
    else program.identity.sources.push(evidence);
  }
  program.frameworkEvidence = dedupeEvidence2([...program.frameworkEvidence, ...detectFramework(source, uri), ...enrichPinocchio(source), ...enrichNative(source), ...enrichSteel(source), ...enrichQuasar(source)]);
  const anchorSyntax = enrichAnchor(root, uri);
  const quasarSource = /quasar[-_]lang|quasar-spl|quasar::/.test(source);
  const anchor = !quasarSource && (/anchor[-_]lang|anchor_lang::|anchor_spl::|\bContext\s*</.test(source) || /derive\s*\(\s*Accounts/.test(source)) ? anchorSyntax : { instructions: quasarSource ? [] : anchorSyntax.instructions, accounts: [] };
  program.instructions.push(...anchor.instructions);
  program.accounts.push(...anchor.accounts);
  const steel = enrichSteelSemantics(root, uri);
  const quasar = enrichQuasarSemantics(root, uri);
  const metadata2 = enrichMetadataFrameworks(root, uri);
  program.frameworkEvidence = dedupeEvidence2([...program.frameworkEvidence, ...metadata2.evidence]);
  program.instructions.push(...steel.instructions, ...quasar.instructions);
  program.instructions.push(...metadata2.instructions);
  program.accounts.push(...steel.accounts, ...quasar.accounts, ...metadata2.accounts);
  for (const [framework, accounts] of [["anchor", anchor.accounts], ["quasar", quasar.accounts], ["steel", steel.accounts]]) for (const account2 of accounts) {
    const state = program.stateTypes?.find((item) => item.name === account2.stateType);
    if (!state) continue;
    state.framework = framework;
    state.discriminator ??= account2.constraints?.find((item) => item.kind === "discriminator")?.expression;
  }
  if (quasarSource) for (const struct of descendants(root, "struct_item")) {
    const seedsBody = /#\[seeds\s*\(([\s\S]*?)\)\]/.exec(attributesBefore(struct))?.[1];
    if (!seedsBody) continue;
    const stateType = nodeText(field(struct, "name"));
    const seeds = splitRustExpressions(seedsBody).map((item) => item.replace(/\s*:\s*[A-Za-z_][A-Za-z0-9_:<>]*/g, "").trim()).filter(Boolean);
    program.securitySurface.pdaSites.push({ id: `pda:quasar-template:${program.name}:${stateType}`, location: loc8(uri, struct), derivationApi: `${stateType}::seeds`, seeds, evidence: [{ description: `Quasar #[seeds] template for ${stateType}`, location: loc8(uri, struct) }], confidence: 0.92 });
  }
  for (const [framework, semanticAccounts, semanticInstructions] of [["Anchor", anchor.accounts, anchor.instructions], ["Quasar", quasar.accounts, quasar.instructions]]) for (const account2 of semanticAccounts) {
    const seeds = account2.constraints?.filter((constraint) => constraint.kind === "seeds").flatMap((constraint) => {
      const expression = constraint.expression ?? "";
      return expression.startsWith("[") && expression.endsWith("]") ? splitRustExpressions(expression.slice(1, -1)) : [expression];
    });
    if (seeds?.length) {
      const id = `pda:${account2.id}`;
      account2.pdaId = id;
      program.securitySurface.pdaSites.push({ id, location: account2.location, seeds, bump: account2.constraints?.find((constraint) => constraint.kind === "bump")?.expression, relatedAccountId: account2.id, enclosingInstruction: semanticInstructions.find((instruction) => instruction.contextType === account2.contextType)?.name, evidence: [{ description: `${framework} account PDA constraint`, location: account2.location }], confidence: 0.95 });
    } else if (account2.pdaId && !program.securitySurface.pdaSites.some((site) => site.id === account2.pdaId)) {
      program.securitySurface.pdaSites.push({ id: account2.pdaId, location: account2.location, seeds: void 0, bump: account2.constraints?.find((constraint) => constraint.kind === "bump")?.expression, relatedAccountId: account2.id, enclosingInstruction: semanticInstructions.find((instruction) => instruction.contextType === account2.contextType)?.name, evidence: [{ description: `${framework} PDA derivation on ${account2.name} without explicit seeds`, location: account2.location }], confidence: 0.8 });
    }
    const initConstraint = account2.constraints?.find((constraint) => constraint.kind === "init" || constraint.kind === "init_if_needed" || constraint.kind === "init(idempotent)");
    if (initConstraint) {
      const enclosingInstruction = semanticInstructions.find((instruction) => instruction.contextType === account2.contextType)?.name;
      const associatedToken = account2.constraints?.some((item) => item.kind.startsWith("associated_token::"));
      const target = associatedToken ? "associated-token" : "system-program";
      const targetKind2 = associatedToken ? "associated-token" : "system-program";
      const idempotent = initConstraint.kind === "init_if_needed" || initConstraint.kind === "init(idempotent)";
      const operation = associatedToken ? idempotent ? "associated-token.create-idempotent" : "associated-token.create" : "system.create-account";
      const operationCategory = associatedToken ? "token-account-create" : "account-creation";
      program.securitySurface.cpiSites.push({ id: `cpi:${framework.toLowerCase()}:init:${account2.id}`, location: account2.location, enclosingInstruction, invocationApi: `${framework} ${initConstraint.kind} account constraint`, instructionExpression: initConstraint.expression, accountArguments: [account2.name ?? account2.type, account2.constraints?.find((item) => item.kind === "payer")?.expression ?? "payer"], target, targetKind: targetKind2, operation, operationCategory, pdaSigned: !!seeds?.length, signerPdaIds: seeds?.length ? [`pda:${account2.id}`] : [], evidence: [{ description: `${framework} ${initConstraint.kind} constraint generates an ${associatedToken ? "Associated Token Program" : "System Program"} CPI`, location: account2.location }], confidence: 0.94 });
    }
    if (account2.signer) program.securitySurface.signerSignals++;
    if (account2.writable) program.securitySurface.writableSignals++;
    if (account2.unchecked) program.securitySurface.rawOrUncheckedAccounts++;
  }
  const semanticContexts = new Map([...anchor.instructions, ...quasar.instructions].map((instruction) => [instruction.contextType, instruction]));
  for (const fn of descendants(root, "function_item")) {
    if (hasAncestor(fn, "trait_item")) continue;
    const name2 = nodeText(field(fn, "name"));
    const children = fn.children.filter((child) => child !== null);
    const visibility = children.find((child) => child.type === "visibility_modifier")?.text ?? "private";
    const functionLines = countLines(fn.text);
    const returnType = fn.childForFieldName("return_type")?.text ?? fn.children.find((child) => child?.type === "return_type")?.text?.replace(/^->\s*/, "");
    const modifiers = children.find((child) => child.type === "function_modifiers")?.text ?? "";
    const metric = { name: name2, qualifiedName: `${program.name}::${name2}`, location: loc8(uri, fn), lines: fn.endPosition.row - fn.startPosition.row + 1, codeLines: functionLines.codeLines, complexity: sourceComplexity(fn), parameters: descendants(fn, "parameter").length, isPublic: visibility.startsWith("pub"), visibility, isUnsafe: modifiers.includes("unsafe"), isAsync: modifiers.includes("async"), returnType, unsafeBlocks: descendants(fn, "unsafe_block").length };
    program.functions.push(metric);
    extractNativeParameters(fn, metric, program);
    extractSites(fn, metric, program, source, uri);
    if (metric.isUnsafe) program.securitySurface.unsafeFunctions++;
    const context = contextTypeFromFunction(fn.text);
    const instruction = semanticContexts.get(context);
    if (instruction && instruction.contextType) {
      instruction.contextType = context;
      for (const account2 of anchor.accounts.filter((account3) => account3.contextType === context)) {
        program.relationships ??= [];
        program.relationships.push({ instructionId: instruction.id ?? instruction.name, accountId: account2.id ?? account2.name ?? account2.type, relationship: account2.signer ? "signer" : account2.writable ? "writes" : account2.unchecked ? "unchecked" : "reads" });
      }
    }
  }
  enrichNativeAccountSemantics(root, uri, program);
  for (const macro of descendants(root, "macro_invocation")) {
    const entrypoint = /(?:^|::)(?:entrypoint|program_entrypoint|lazy_program_entrypoint)!\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)/.exec(macro.text)?.[1];
    if (!entrypoint) continue;
    const dispatched = program.instructions.some((item) => item.handler && item.handler !== entrypoint && item.location.uri === uri);
    if (dispatched || program.instructions.some((item) => item.handler === entrypoint)) continue;
    const fn = program.functions.find((item) => item.name === entrypoint && item.location.uri === uri);
    if (!fn) continue;
    program.instructions.push({ id: `instruction:${uri}:entrypoint:${entrypoint}:${fn.location.startLine}`, name: entrypoint, handler: entrypoint, functionName: entrypoint, location: fn.location, confidence: 0.92, evidence: [{ description: `explicit entrypoint! macro targets ${entrypoint}`, location: loc8(uri, macro) }] });
  }
  if (!program.instructions.some((item) => item.location.uri === uri)) for (const fn of program.functions.filter((item) => item.location.uri === uri && item.name === "process_instruction")) {
    program.instructions.push({ id: `instruction:${uri}:entrypoint:${fn.name}:${fn.location.startLine}`, name: fn.name, handler: fn.name, functionName: fn.name, location: fn.location, confidence: 0.78, evidence: [{ description: "conventional Solana process_instruction entrypoint", location: fn.location }] });
  }
  program.securitySurface.unsafeBlocks += descendants(root, "unsafe_block").length;
  program.securitySurface.manualSerialization += (source.match(/try_from_slice|serialize|deserialize|borsh/g) ?? []).length;
  program.securitySurface.cpiSites = [...new Map(program.securitySurface.cpiSites.map((site) => [site.id, site])).values()];
  program.securitySurface.pdaSites = [...new Map(program.securitySurface.pdaSites.map((site) => [site.id, site])).values()];
}
function hasAncestor(node, type) {
  let parent = node.parent;
  while (parent) {
    if (parent.type === type) return true;
    parent = parent.parent;
  }
  return false;
}
function extractSites(fn, metric, program, source, uri) {
  const surface = program.securitySurface;
  const text = fn.text;
  const calls = descendants(fn, "call_expression");
  const bindings = new Map(descendants(fn, "let_declaration").map((node) => [(node.childForFieldName("pattern")?.text ?? "").replace(/^mut\s+/, "").trim(), node.childForFieldName("value")?.text ?? node.text.split("=").slice(1).join("=").replace(/;\s*$/, "").trim()]).filter(([name2]) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(name2)));
  const addPda = (node, api, evidence, confidence, seedIndex = 0, programIndex = 1, bumpIndex) => {
    const args2 = callArguments3(node);
    const seedArgument = args2[seedIndex]?.replace(/^&/, "").trim();
    const parsedSeeds = seedArgument?.startsWith("[") && seedArgument.endsWith("]") ? splitRustExpressions(seedArgument.slice(1, -1)) : seedArgument ? [seedArgument] : void 0;
    surface.pdaSites.push({ id: `${uri}:pda:${node.startPosition.row + 1}:${node.startPosition.column}`, location: loc8(uri, node), enclosingFunction: metric.name, derivationApi: api, seeds: parsedSeeds, bump: bumpIndex === void 0 ? parsedSeeds?.find((seed) => /bump/i.test(seed)) : args2[bumpIndex], programIdExpression: args2[programIndex], evidence: [{ description: evidence, location: loc8(uri, node) }], confidence });
  };
  const addCpi = (node, api, signed, target) => {
    const args2 = callArguments3(node);
    const receiver = /^([A-Za-z_][A-Za-z0-9_]*)\./.exec(api)?.[1];
    const builderExpression = cpiBuilderExpression(api);
    const builder = builderExpression ? resolveBinding(builderExpression, bindings) : void 0;
    const builderArguments = builder ? finalCallArguments(builder) : [];
    const instructionExpression = builder ?? resolveBinding(args2[0] ?? (receiver ? resolveBinding(receiver, bindings) : ""), bindings);
    const inferred = inferCpiTarget(api, instructionExpression, fn.text, source);
    const resolvedTarget = target ?? inferred.target ?? targetForKind(inferred.kind);
    const resolvedKind = target ? targetKind(target) : inferred.kind;
    const operation = inferCpiOperation(`${api}
${instructionExpression}`, resolvedKind);
    const cpiId = `${uri}:cpi:${node.startPosition.row + 1}:${node.startPosition.column}`;
    const pushedAccounts = receiver ? calls.filter((item) => (item.childForFieldName("function")?.text ?? "") === `${receiver}.push_account`).flatMap(callArguments3) : [];
    surface.cpiSites.push({ id: cpiId, location: loc8(uri, node), functionName: metric.name, invocationApi: api, instructionExpression, accountArguments: pushedAccounts.length ? pushedAccounts : builderArguments.length ? builderArguments : args2.slice(1), programAccountExpression: inferred.programAccountExpression, signerPdaIds: [], target: resolvedTarget, targetKind: resolvedKind, operation: operation?.operation, operationCategory: operation?.category, evidence: [{ description: `AST CPI call to ${api}${operation ? ` (${operation.operation})` : ""}`, location: loc8(uri, node) }, ...builder ? [{ description: `method-style CPI builder ${builder}`, location: loc8(uri, node) }] : []], pdaSigned: signed, confidence: resolvedTarget ? 0.95 : inferred.programAccountExpression ? 0.85 : 0.8 });
    if (signed) {
      const seeds = signerSeeds(api, args2, bindings);
      const seedHelpers = signerSeedHelpers(api, args2, bindings);
      const helperPdas = seedHelpers.flatMap((helper) => surface.pdaSites.filter((site) => {
        const related = program.accounts.find((account2) => account2.id === site.relatedAccountId);
        return related?.name === helper || site.derivationApi === `${helper}::seeds`;
      }));
      if (helperPdas.length) {
        const cpi = surface.cpiSites.at(-1);
        cpi.signerPdaIds = [...new Set(helperPdas.flatMap((pda) => pda.id ? [pda.id] : []))];
        for (const pda of helperPdas) {
          pda.usedAsSigner = true;
          pda.relatedCpiIds = [.../* @__PURE__ */ new Set([...pda.relatedCpiIds ?? [], cpiId])];
          pda.evidence.push({ description: `Quasar generated ${seedHelpers.find((helper) => program.accounts.find((account2) => account2.id === pda.relatedAccountId)?.name === helper) ?? "PDA"}_seeds helper passed to ${api}`, location: loc8(uri, node) });
        }
      }
      if (seeds.length) {
        const existing = surface.pdaSites.find((item) => item.enclosingFunction === metric.name);
        const pdaId = existing?.id ?? `${uri}:pda:signer:${node.startPosition.row + 1}:${node.startPosition.column}`;
        const bump = seeds.find((seed) => /bump/i.test(seed));
        if (existing) {
          existing.usedAsSigner = true;
          existing.relatedCpiIds = [.../* @__PURE__ */ new Set([...existing.relatedCpiIds ?? [], cpiId])];
          existing.seeds ??= seeds;
          existing.bump ??= bump;
          existing.evidence.push({ description: `structured signer seeds passed to ${api}`, location: loc8(uri, node) });
        } else surface.pdaSites.push({ id: pdaId, location: loc8(uri, node), enclosingFunction: metric.name, derivationApi: `${api} signer seeds`, seeds, bump, programIdExpression: "current program id", usedAsSigner: true, relatedCpiIds: [cpiId], evidence: [{ description: `structured signer seeds passed to ${api}`, location: loc8(uri, node) }], confidence: 0.94 });
        const cpi = surface.cpiSites.at(-1);
        cpi.signerPdaIds = [pdaId];
      }
    }
  };
  const steelSource = program.frameworkEvidence.some((item) => item.framework === "steel");
  for (const call of calls) {
    const api = call.childForFieldName("function")?.text ?? "";
    const baseApi = api.replace(/::<[^>]*>$/, "");
    const importedCpi = importedCpiApi(baseApi, source);
    if (/find_program_address|create_program_address(?:_const)?/.test(baseApi)) addPda(call, api, "PDA derivation call", 0.95);
    else if (steelSource && /\.has_seeds$/.test(baseApi)) addPda(call, api, "Steel has_seeds PDA validation", 0.95);
    else if (steelSource && /(?:^|::)(?:create_program_account|allocate_account)$/.test(baseApi)) addPda(call, api, "Steel program-account helper PDA seeds", 0.94, /create_program_account$/.test(baseApi) ? 4 : 5, /create_program_account$/.test(baseApi) ? 3 : 4);
    else if (steelSource && /(?:^|::)(?:create_program_account_with_bump|allocate_account_with_bump)$/.test(baseApi)) addPda(call, api, "Steel program-account helper PDA seeds and explicit bump", 0.95, /create_program_account_with_bump$/.test(baseApi) ? 4 : 5, /create_program_account_with_bump$/.test(baseApi) ? 3 : 4, /create_program_account_with_bump$/.test(baseApi) ? 5 : 6);
    if (/invoke_signed|invoke_with_signers|new_with_signer/.test(baseApi)) addCpi(call, api, true);
    else if (/^(?:.*::)?invoke$|cpi::invoke$|\.invoke$/.test(baseApi)) addCpi(call, api, false);
    else if (/(?:^|::)cpi::[A-Za-z_][A-Za-z0-9_]*$/.test(baseApi)) addCpi(call, api, /new_with_signer/.test(call.text));
    else if (importedCpi) addCpi(call, importedCpi, /new_with_signer/.test(call.text));
    else if (isKnownCpiWrapper(api)) addCpi(call, api, /new_with_signer/.test(call.text), targetForKind(inferTargetKind(api)));
    else if (steelSource && isSteelCpiHelper(baseApi)) addCpi(call, api, /(?:create_program_account|allocate_account|invoke_signed)/.test(baseApi), "system-program");
  }
  const occurrence = (pattern) => (text.match(pattern) ?? []).length;
  surface.signerSignals += occurrence(/is_signer/g);
  surface.writableSignals += occurrence(/is_writable/g);
  surface.ownerValidationSignals += occurrence(/\.owner\(|owner\s*==/g);
  surface.addressValidationSignals += occurrence(/address\s*=|key\(\)\s*==/g);
  surface.remainingAccounts += occurrence(/remaining_accounts|CtxWithRemaining/g);
  surface.rawOrUncheckedAccounts += occurrence(/UncheckedAccount|AccountInfo|AccountView/g);
  surface.manualAccountIteration += occurrence(/accounts\.iter|next_account_info|remaining_accounts\.iter/g);
  surface.manualSignerChecks += occurrence(/is_signer/g);
  surface.manualOwnerChecks += occurrence(/\.owner\(|owner\s*==/g);
  surface.manualWritableChecks += occurrence(/is_writable/g);
  surface.manualAddressChecks += occurrence(/key\(\)\s*==|address\s*==/g);
  surface.reallocOperations += occurrence(/realloc|resize/g);
  const functionCpis = surface.cpiSites.filter((site) => site.functionName === metric.name && site.pdaSigned);
  const functionPdas = surface.pdaSites.filter((site) => site.enclosingFunction === metric.name);
  if (functionCpis.length && functionPdas.length) for (const pda of functionPdas) {
    pda.usedAsSigner = true;
    pda.relatedCpiIds = functionCpis.map((site) => site.id).filter(Boolean);
    for (const cpi of functionCpis) cpi.signerPdaIds = [.../* @__PURE__ */ new Set([...cpi.signerPdaIds ?? [], pda.id])];
  }
  void source;
}
function resolveBinding(expression, bindings) {
  let value = expression.replace(/^&\s*/, "").trim();
  const seen = /* @__PURE__ */ new Set();
  while (/^[A-Za-z_][A-Za-z0-9_]*$/.test(value) && bindings.has(value) && !seen.has(value)) {
    seen.add(value);
    value = bindings.get(value).replace(/^&\s*/, "").trim();
  }
  return value || expression;
}
function signerSeeds(api, args2, bindings) {
  let expression = /invoke_signed/.test(api) && !/\.invoke_signed$/.test(api) ? args2[2] ?? "" : args2[0] ?? "";
  expression = resolveBinding(expression, bindings).replace(/^&\s*/, "").trim();
  if (expression.startsWith("[") && expression.endsWith("]")) {
    const outer = splitRustExpressions(expression.slice(1, -1));
    if (outer.length === 1) expression = resolveBinding(outer[0], bindings).replace(/^&\s*/, "").trim();
  }
  const signer = /Signer::from\s*\(\s*&?\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/.exec(expression)?.[1];
  if (signer) expression = resolveBinding(signer, bindings);
  if (!expression.startsWith("[") || !expression.endsWith("]")) return [];
  return splitRustExpressions(expression.slice(1, -1)).map((seed) => /^Seed::from\s*\(([\s\S]*)\)$/.exec(seed.trim())?.[1]?.trim() ?? seed.replace(/^&/, "").trim()).filter(Boolean);
}
function signerSeedHelpers(api, args2, bindings) {
  let expression = /invoke_signed|invoke_with_signers/.test(api) && /\.invoke_(?:signed|with_signers)$/.test(api) ? args2[0] ?? "" : args2[2] ?? "";
  expression = resolveBinding(expression, bindings).replace(/^&\s*/, "").trim();
  const candidates = expression.startsWith("[") && expression.endsWith("]") ? splitRustExpressions(expression.slice(1, -1)) : [expression];
  const helpers = [];
  for (const candidate of candidates) {
    const resolved = resolveBinding(candidate.replace(/^&\s*/, "").trim(), bindings);
    const helper = /(?:^|\.)\s*([A-Za-z_][A-Za-z0-9_]*)_seeds\s*\(\s*\)/.exec(resolved)?.[1];
    if (helper) helpers.push(helper);
  }
  return [...new Set(helpers)];
}
function cpiBuilderExpression(api) {
  const match = /^([\s\S]+)\.invoke(?:_signed|_with_signers)?$/.exec(api.trim());
  return match?.[1]?.trim();
}
function finalCallArguments(expression) {
  const close = expression.lastIndexOf(")");
  if (close < 0) return [];
  let depth = 1, quote = "", escaped = false;
  for (let index = close - 1; index >= 0; index--) {
    const char = expression[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === ")") depth++;
    else if (char === "(" && --depth === 0) return splitRustExpressions(expression.slice(index + 1, close)).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}
function inferCpiTarget(api, instructionExpression, functionText, sourceText) {
  const combined = `${api}
${instructionExpression}`;
  const importedSystemOperation = /\b(CreateAccount(?:WithSeed|AllowPrefund)?|Allocate(?:WithSeed)?|Assign(?:WithSeed)?|Transfer(?:WithSeed|Many)?)\b/.exec(combined)?.[1];
  if (/solana_system_interface::instruction|system_instruction|pinocchio[_-]system|SystemInstruction::/.test(combined) || importedSystemOperation && new RegExp(`\\buse\\s+pinocchio[_-]system(?:::[A-Za-z_][A-Za-z0-9_]*)*::(?:\\{[^}]*\\b${importedSystemOperation}\\b[^}]*\\}|${importedSystemOperation})`).test(sourceText)) return { kind: "system-program", target: "system-program" };
  const known = inferTargetKind(combined);
  if (known !== "unknown" && known !== "dynamic") return { kind: known, target: targetForKind(known) };
  const methodProgram = /^((?:self|ctx\.accounts)\.[A-Za-z_][A-Za-z0-9_]*)\s*\.[A-Za-z_][A-Za-z0-9_]*\s*\(/.exec(instructionExpression)?.[1];
  const programExpression = /CpiContext::new(?:_with_signer)?\s*\(\s*([^,]+)/.exec(instructionExpression)?.[1]?.trim() ?? /CpiDynamic(?:::[^:]*)?::new\s*\(([\s\S]*)\)$/.exec(instructionExpression)?.[1]?.trim() ?? /Instruction::new(?:_with_borsh)?\s*\(\s*([^,]+)/.exec(instructionExpression)?.[1]?.trim() ?? /program_id\s*:\s*([^,}\n]+)/.exec(instructionExpression)?.[1]?.trim() ?? methodProgram ?? /(?:let\s+)?[A-Za-z_][A-Za-z0-9_]*\s*=\s*([A-Za-z_][A-Za-z0-9_.]*)\.cpi\s*\(/.exec(functionText)?.[1];
  return programExpression ? { kind: "custom", target: programExpression, programAccountExpression: programExpression } : { kind: "dynamic" };
}
function targetKind(target) {
  if (/system/i.test(target)) return "system-program";
  if (/token[_-]?2022|token2022/i.test(target)) return "token-2022";
  if (/associated/i.test(target)) return "associated-token";
  if (/memo/i.test(target)) return "memo";
  if (/stake/i.test(target)) return "stake";
  if (/vote/i.test(target)) return "vote";
  if (/lookup.*table|address_lookup/i.test(target)) return "address-lookup-table";
  if (/compute.*budget/i.test(target)) return "compute-budget";
  if (/ed25519/i.test(target)) return "ed25519";
  if (/secp256k1/i.test(target)) return "secp256k1";
  if (/secp256r1/i.test(target)) return "secp256r1";
  if (/token/i.test(target)) return "spl-token";
  return "custom";
}
function inferTargetKind(api) {
  if (/pinocchio[_-]system|system_instruction|system_program|SystemProgram/i.test(api)) return "system-program";
  if (/token[_-]?2022|token2022/i.test(api)) return "token-2022";
  if (/associated[_-]token|AssociatedToken/i.test(api)) return "associated-token";
  if (/memo/i.test(api)) return "memo";
  if (/stake/i.test(api)) return "stake";
  if (/vote/i.test(api)) return "vote";
  if (/lookup.*table|address_lookup/i.test(api)) return "address-lookup-table";
  if (/compute.*budget/i.test(api)) return "compute-budget";
  if (/ed25519/i.test(api)) return "ed25519";
  if (/secp256k1/i.test(api)) return "secp256k1";
  if (/secp256r1/i.test(api)) return "secp256r1";
  if (/anchor_spl.*token|pinocchio[_-]token|spl_token|token::|token_program|TokenProgram/i.test(api)) return "spl-token";
  return /invoke|CpiContext|\.invoke/.test(api) ? "dynamic" : "unknown";
}
function targetForKind(kind) {
  return kind === "dynamic" || kind === "unknown" ? void 0 : kind;
}
function isKnownCpiWrapper(api) {
  return /(?:anchor_spl|pinocchio[_-](?:system|token|associated|memo)|quasar_spl|quasar::cpi|steel::cpi)/i.test(api) && /(?:transfer|mint|burn|close|create|initialize|invoke|assign|allocate|approve|revoke|freeze|thaw|authority|recover)/i.test(api);
}
function isSteelCpiHelper(api) {
  return /(?:^|::)(?:create_account|create_program_account(?:_with_bump)?|allocate_account(?:_with_bump)?)$/.test(api) || /\.collect$/.test(api);
}
function importedCpiApi(api, source) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(api)) return void 0;
  const escaped = escapeRegex6(api);
  const direct = new RegExp(`\\buse\\s+([A-Za-z_][A-Za-z0-9_:]*)::cpi::([A-Za-z_][A-Za-z0-9_]*)(?:\\s+as\\s+${escaped})?\\s*;`, "g");
  for (const match of source.matchAll(direct)) if (match[2] === api || new RegExp(`\\bas\\s+${escaped}\\s*;`).test(match[0])) return `${match[1]}::cpi::${match[2]}`;
  const grouped = /\buse\s+([A-Za-z_][A-Za-z0-9_:]*)::cpi::\{([^}]*)\}\s*;/g;
  for (const match of source.matchAll(grouped)) for (const item of splitRustExpressions(match[2])) {
    const alias = /^([A-Za-z_][A-Za-z0-9_]*)(?:\s+as\s+([A-Za-z_][A-Za-z0-9_]*))?$/.exec(item.trim());
    if (alias && (alias[2] ?? alias[1]) === api) return `${match[1]}::cpi::${alias[1]}`;
  }
  return void 0;
}
function inferCpiOperation(value, kind) {
  const normalized = value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
  const match = (name2) => new RegExp(`(?:^|[^a-z0-9])${name2}(?:[^a-z0-9]|$)`).test(normalized);
  if (kind === "system-program") {
    if (match("collect")) return { operation: "system.transfer", category: "lamport-transfer" };
    if (match("create_program_account_with_bump") || match("create_program_account")) return { operation: "system.create-account", category: "account-creation" };
    if (match("allocate_account_with_bump") || match("allocate_account")) return { operation: "system.allocate", category: "allocation" };
    if (match("create_account_allow_prefund")) return { operation: "system.create-account-allow-prefund", category: "account-creation" };
    if (match("create_account_with_seed")) return { operation: "system.create-account-with-seed", category: "account-creation" };
    if (match("create_account")) return { operation: "system.create-account", category: "account-creation" };
    if (match("allocate_with_seed")) return { operation: "system.allocate-with-seed", category: "allocation" };
    if (match("allocate")) return { operation: "system.allocate", category: "allocation" };
    if (match("assign_with_seed")) return { operation: "system.assign-with-seed", category: "ownership-change" };
    if (match("assign")) return { operation: "system.assign", category: "ownership-change" };
    if (match("transfer_many")) return { operation: "system.transfer-many", category: "lamport-transfer" };
    if (match("transfer_with_seed")) return { operation: "system.transfer-with-seed", category: "lamport-transfer" };
    if (match("transfer")) return { operation: "system.transfer", category: "lamport-transfer" };
    if (/nonce/.test(normalized)) return { operation: `system.${operationToken(normalized, "nonce")}`, category: "nonce" };
  }
  if (kind === "spl-token" || kind === "token-2022") {
    const prefix = kind === "token-2022" ? "token-2022" : "token";
    if (match("transfer_checked")) return { operation: `${prefix}.transfer-checked`, category: "token-transfer" };
    if (match("transfer")) return { operation: `${prefix}.transfer`, category: "token-transfer" };
    if (match("mint_to_checked")) return { operation: `${prefix}.mint-to-checked`, category: "token-mint" };
    if (match("mint_to")) return { operation: `${prefix}.mint-to`, category: "token-mint" };
    if (match("burn_checked")) return { operation: `${prefix}.burn-checked`, category: "token-burn" };
    if (match("burn")) return { operation: `${prefix}.burn`, category: "token-burn" };
    if (match("close_account")) return { operation: `${prefix}.close-account`, category: "account-close" };
    if (match("set_authority")) return { operation: `${prefix}.set-authority`, category: "authority-change" };
    if (match("approve_checked")) return { operation: `${prefix}.approve-checked`, category: "authority-change" };
    if (match("approve")) return { operation: `${prefix}.approve`, category: "authority-change" };
    if (match("revoke")) return { operation: `${prefix}.revoke`, category: "authority-change" };
    if (match("freeze_account")) return { operation: `${prefix}.freeze-account`, category: "freeze" };
    if (match("thaw_account")) return { operation: `${prefix}.thaw-account`, category: "thaw" };
    const initialize = /(?:^|[^a-z0-9])(initialize_[a-z0-9_]+)/.exec(normalized)?.[1];
    if (initialize) return { operation: `${prefix}.${initialize.replace(/_/g, "-")}`, category: "initialization" };
  }
  if (kind === "associated-token") {
    if (match("recover_nested")) return { operation: "associated-token.recover-nested", category: "token-account-recovery" };
    if (match("create_idempotent")) return { operation: "associated-token.create-idempotent", category: "token-account-create" };
    if (match("create")) return { operation: "associated-token.create", category: "token-account-create" };
  }
  return void 0;
}
function operationToken(value, fallback) {
  return /([a-z0-9_]*nonce[a-z0-9_]*)/.exec(value)?.[1]?.replace(/_/g, "-") ?? fallback;
}
function escapeRegex6(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function callArguments3(node) {
  return node.childForFieldName("arguments")?.namedChildren.filter((item) => !!item).map((item) => item.text) ?? [];
}
function extractNativeParameters(fn, metric, program) {
  if (!/process_instruction|entrypoint|AccountInfo|AccountView/.test(fn.text)) return;
  for (const parameter of descendants(fn, "parameter")) {
    const type = parameter.childForFieldName("type")?.text ?? "";
    const name2 = parameter.children.find((child) => child?.type === "identifier")?.text ?? "";
    if (!/AccountInfo|AccountView/.test(type) || /\[\s*(?:AccountInfo|AccountView)/.test(type) || !name2) continue;
    const account2 = { id: `account:${metric.location.uri}:parameter:${name2}:${metric.location.startLine}`, name: name2, type, location: loc8(metric.location.uri, parameter), confidence: 0.8, evidence: [{ description: "native account parameter", location: loc8(metric.location.uri, parameter) }] };
    program.accounts.push(account2);
    const instruction = program.instructions.find((item) => item.functionName === metric.name);
    if (instruction) {
      program.relationships ??= [];
      program.relationships.push({ instructionId: instruction.id ?? instruction.name, accountId: account2.id, relationship: "unknown" });
    }
  }
}
function propagateReachableSurface(program) {
  const graph = program.callGraph;
  if (!graph) return;
  const byName = new Map(program.functions.map((fn) => [fn.qualifiedName ?? fn.name, fn]));
  const edges = /* @__PURE__ */ new Map();
  for (const edge of graph.edges) edges.set(edge.source, [...edges.get(edge.source) ?? [], edge.target]);
  for (const instruction of program.instructions) {
    const handlerName = instruction.handler ?? instruction.functionName ?? instruction.name;
    const exactHandler = program.functions.find((fn) => fn.name === handlerName && fn.location.uri === instruction.location.uri && fn.location.startLine === instruction.location.startLine);
    const handlerCandidates = program.functions.filter((fn) => fn.name === handlerName);
    const handler = exactHandler?.qualifiedName ?? (handlerCandidates.length === 1 ? handlerCandidates[0].qualifiedName : void 0) ?? handlerName;
    const functions = /* @__PURE__ */ new Set();
    const queue = [handler];
    while (queue.length) {
      const current = queue.shift();
      if (functions.has(current)) continue;
      functions.add(current);
      queue.push(...(edges.get(current) ?? []).filter((next) => !functions.has(next)));
    }
    const sites = [...functions].map((name2) => byName.get(name2)).filter((fn) => !!fn);
    const reachableCalls = graph.calls.filter((call) => functions.has(call.caller));
    const unresolvedCalls = reachableCalls.filter((call) => call.status === "unresolved" || call.status === "dynamic").map((call) => call.id);
    const ambiguousCalls = reachableCalls.filter((call) => call.status === "ambiguous").map((call) => call.id);
    const unresolvedCallDetails = reachableCalls.filter((call) => call.status === "unresolved" || call.status === "dynamic" || call.status === "ambiguous").map((call) => ({ callId: call.id, expression: call.sourceExpression ?? call.callee, status: call.status, reason: call.resolutionReason ?? "resolution evidence unavailable", candidates: [...call.candidateTargets ?? []], location: call.location })).sort((a, b) => a.callId.localeCompare(b.callId));
    const localSymbols = new Set(graph.symbols);
    const crossPackageFunctions = [...functions].filter((name2) => !byName.has(name2) && !localSymbols.has(name2) && reachableCalls.some((call) => call.status === "resolved" && call.target === name2));
    const reachableCpiSites = program.securitySurface.cpiSites.filter((site) => site.enclosingInstruction === instruction.name || sites.some((fn) => fn.name === site.functionName));
    const cpis = reachableCpiSites.map((site) => site.id ?? "");
    const pdas = program.securitySurface.pdaSites.filter((site) => site.enclosingInstruction === instruction.name || sites.some((fn) => fn.name === site.enclosingFunction)).map((site) => site.id ?? "");
    const accountIds = program.relationships?.filter((rel) => rel.instructionId === (instruction.id ?? instruction.name)).map((rel) => rel.accountId) ?? [];
    const externalPrograms = reachableCpiSites.map((site) => `external:${site.target ?? site.invocationApi ?? "unknown"}`);
    for (const external of program.externalPrograms ?? []) if (externalPrograms.includes(external.id)) external.calledByInstructions = [.../* @__PURE__ */ new Set([...external.calledByInstructions, instruction.id ?? instruction.name])].sort();
    const cfgUnknown = sites.filter((fn) => fn.cfgStatus === "unknown");
    const incompleteReasons = [...unresolvedCalls.length ? [`${unresolvedCalls.length} unresolved or dynamic calls; inspect unresolvedCallDetails`] : [], ...ambiguousCalls.length ? [`${ambiguousCalls.length} ambiguous calls; inspect candidate targets`] : [], ...crossPackageFunctions.length ? [`${crossPackageFunctions.length} cross-package functions await workspace semantic propagation`] : [], ...cfgUnknown.length || instruction.cfgStatus === "unknown" ? [`conditional compilation is unresolved for ${cfgUnknown.length + (instruction.cfgStatus === "unknown" ? 1 : 0)} reachable item(s)`] : []];
    instruction.reachableSurface = { directHandler: handler, functions: [...functions].sort(), unresolvedCalls, ambiguousCalls, unresolvedCallDetails, complete: !incompleteReasons.length, incompleteReasons, directAccounts: [...new Set(accountIds)].sort(), accounts: [...new Set(accountIds)].sort(), directCpis: reachableCpiSites.filter((site) => site.functionName === handlerName || site.enclosingInstruction === instruction.name).map((site) => site.id ?? ""), cpis: [...new Set(cpis)].sort(), signedCpis: reachableCpiSites.filter((site) => site.pdaSigned).map((site) => site.id ?? ""), dynamicCpis: reachableCpiSites.filter((site) => site.targetKind === "dynamic" || !site.target).map((site) => site.id ?? ""), directPdas: program.securitySurface.pdaSites.filter((site) => site.enclosingFunction === handlerName || site.enclosingInstruction === instruction.name).map((site) => site.id ?? ""), pdas: [...new Set(pdas)].sort(), externalPrograms: [...new Set(externalPrograms)].sort(), unsafeFunctions: sites.filter((fn) => fn.isUnsafe).map((fn) => fn.qualifiedName ?? fn.name), unsafeBlocks: sites.reduce((sum2, fn) => sum2 + (fn.unsafeBlocks ?? 0), 0), reachableCyclomaticComplexity: sites.reduce((sum2, fn) => sum2 + fn.complexity, 0) };
    for (const fn of sites) {
      fn.reachableFunctions = [...functions].sort();
      fn.cpiCount = cpis.length;
      fn.pdaCount = pdas.length;
    }
  }
}
function propagateCrossPackageSurfaces(programs) {
  const parseTarget = (target, owner) => {
    if (!target) return void 0;
    const program = [...programs].sort((a, b) => b.name.length - a.name.length).find((item) => target.startsWith(`${item.name}::`));
    if (!program || program === owner) return void 0;
    return { program, functionName: `crate::${target.slice(program.name.length + 2)}` };
  };
  for (const sourceProgram of programs) for (const instruction of sourceProgram.instructions) {
    const surface = instruction.reachableSurface;
    if (!surface || !sourceProgram.callGraph) continue;
    const initial = sourceProgram.callGraph.calls.filter((call) => surface.functions.includes(call.caller) && call.status === "resolved").flatMap((call) => {
      const parsed = parseTarget(call.target, sourceProgram);
      return parsed ? [parsed] : [];
    });
    if (!initial.length) {
      surface.crossPackageSurfaces = [];
      continue;
    }
    const queue = [...initial];
    const visited = /* @__PURE__ */ new Set();
    const missing = [];
    const groups = /* @__PURE__ */ new Map();
    const details = [...surface.unresolvedCallDetails ?? []];
    while (queue.length) {
      const current = queue.shift();
      const key = `${current.program.name}:${current.functionName}`;
      if (visited.has(key)) continue;
      visited.add(key);
      const fn = current.program.functions.find((item) => (item.qualifiedName ?? item.name) === current.functionName);
      if (!fn) {
        missing.push(key);
        continue;
      }
      const group = groups.get(current.program.name) ?? { program: current.program, functions: /* @__PURE__ */ new Set(), cpis: /* @__PURE__ */ new Set(), signedCpis: /* @__PURE__ */ new Set(), dynamicCpis: /* @__PURE__ */ new Set(), pdas: /* @__PURE__ */ new Set(), states: /* @__PURE__ */ new Set(), runtime: /* @__PURE__ */ new Set(), external: /* @__PURE__ */ new Set(), unresolved: /* @__PURE__ */ new Set(), ambiguous: /* @__PURE__ */ new Set(), evidence: [], complexity: 0, unsafe: 0, cfgUnknown: 0 };
      const rendered = `${current.program.name}::${current.functionName.replace(/^crate::/, "")}`;
      group.functions.add(rendered);
      group.complexity += fn.complexity;
      group.unsafe += (fn.isUnsafe ? 1 : 0) + (fn.unsafeBlocks ?? 0);
      if (fn.cfgStatus === "unknown") group.cfgUnknown++;
      group.evidence.push({ description: `Reached ${rendered} through a resolved internal Cargo dependency`, location: fn.location });
      const functionCpis = current.program.securitySurface.cpiSites.filter((site) => site.id && site.functionName === fn.name && containsLocation(fn.location, site.location));
      for (const cpi of functionCpis) {
        group.cpis.add(cpi.id);
        if (cpi.pdaSigned) group.signedCpis.add(cpi.id);
        if (cpi.targetKind === "dynamic" || !cpi.target) group.dynamicCpis.add(cpi.id);
        group.external.add(`external:${cpi.target ?? cpi.invocationApi ?? "unknown"}`);
      }
      for (const pda of current.program.securitySurface.pdaSites.filter((site) => site.id && site.enclosingFunction === fn.name && containsLocation(fn.location, site.location))) group.pdas.add(pda.id);
      for (const state of current.program.stateTypes ?? []) if (fn.stateAccess?.includes(state.name)) group.states.add(state.id);
      for (const operation of current.program.runtimeOperations?.filter((item) => item.functionName === fn.name && containsLocation(fn.location, item.location)) ?? []) group.runtime.add(operation.id);
      for (const call of current.program.callGraph?.calls.filter((item) => item.caller === current.functionName) ?? []) {
        if (call.status === "resolved" && call.target) {
          const cross = parseTarget(call.target, current.program);
          if (cross) queue.push(cross);
          else if (call.target.startsWith("crate::")) queue.push({ program: current.program, functionName: call.target });
        } else if (call.status === "unresolved" || call.status === "dynamic" || call.status === "ambiguous") {
          (call.status === "ambiguous" ? group.ambiguous : group.unresolved).add(call.id);
          details.push({ callId: call.id, expression: call.sourceExpression ?? call.callee, status: call.status, reason: call.resolutionReason ?? "resolution evidence unavailable", candidates: [...call.candidateTargets ?? []], location: call.location });
        }
      }
      groups.set(current.program.name, group);
    }
    surface.crossPackageSurfaces = [...groups.values()].map((group) => ({
      program: group.program.name,
      functions: [...group.functions].sort(),
      cpiIds: [...group.cpis].sort(),
      signedCpiIds: [...group.signedCpis].sort(),
      dynamicCpiIds: [...group.dynamicCpis].sort(),
      pdaIds: [...group.pdas].sort(),
      stateTypeIds: [...group.states].sort(),
      runtimeOperationIds: [...group.runtime].sort(),
      externalProgramIds: [...group.external].sort(),
      unresolvedCallIds: [...group.unresolved].sort(),
      ambiguousCallIds: [...group.ambiguous].sort(),
      complete: !group.unresolved.size && !group.ambiguous.size && !group.cfgUnknown,
      evidence: dedupeSemanticEvidence(group.evidence)
    })).sort((a, b) => a.program.localeCompare(b.program));
    surface.functions = [.../* @__PURE__ */ new Set([...surface.functions, ...surface.crossPackageSurfaces.flatMap((item) => item.functions)])].sort();
    surface.unresolvedCalls = [.../* @__PURE__ */ new Set([...surface.unresolvedCalls ?? [], ...surface.crossPackageSurfaces.flatMap((item) => item.unresolvedCallIds)])].sort();
    surface.ambiguousCalls = [.../* @__PURE__ */ new Set([...surface.ambiguousCalls ?? [], ...surface.crossPackageSurfaces.flatMap((item) => item.ambiguousCallIds)])].sort();
    surface.unresolvedCallDetails = [...new Map(details.map((item) => [item.callId, item])).values()].sort((a, b) => a.callId.localeCompare(b.callId));
    surface.reachableCyclomaticComplexity = (surface.reachableCyclomaticComplexity ?? 0) + [...groups.values()].reduce((sum2, item) => sum2 + item.complexity, 0);
    surface.unsafeBlocks = (surface.unsafeBlocks ?? 0) + [...groups.values()].reduce((sum2, item) => sum2 + item.unsafe, 0);
    const retained = (surface.incompleteReasons ?? []).filter((reason) => !/cross-package functions await|unresolved or dynamic calls|ambiguous calls/.test(reason));
    const crossCfgUnknown = [...groups.values()].reduce((sum2, item) => sum2 + item.cfgUnknown, 0);
    surface.incompleteReasons = [...retained, ...surface.unresolvedCalls.length ? [`${surface.unresolvedCalls.length} unresolved or dynamic calls; inspect unresolvedCallDetails`] : [], ...surface.ambiguousCalls.length ? [`${surface.ambiguousCalls.length} ambiguous calls; inspect candidate targets`] : [], ...missing.length ? [`${missing.length} resolved cross-package function(s) were not present in the indexed dependency source`] : [], ...crossCfgUnknown ? [`conditional compilation is unresolved for ${crossCfgUnknown} cross-package reachable item(s)`] : []];
    surface.complete = !surface.incompleteReasons.length;
  }
}
function containsLocation(owner, child) {
  return owner.uri === child.uri && owner.startLine <= child.startLine && owner.endLine >= child.endLine;
}
function dedupeSemanticEvidence(items) {
  return [...new Map(items.map((item) => [`${item.description}:${item.location?.uri ?? ""}:${item.location?.startLine ?? ""}`, item])).values()].sort((a, b) => `${a.location?.uri ?? ""}:${a.location?.startLine ?? 0}:${a.description}`.localeCompare(`${b.location?.uri ?? ""}:${b.location?.startLine ?? 0}:${b.description}`));
}
function emptyProgram(name2, manifestUri, packageKind = "unknown", packageEvidence = []) {
  return { name: name2, manifestUri, packageKind, packageEvidence, sourceLanguage: "rust", sourceFiles: [], rustFiles: [], functions: [], instructions: [], accounts: [], frameworkEvidence: [], securitySurface: { signerSignals: 0, writableSignals: 0, ownerValidationSignals: 0, addressValidationSignals: 0, remainingAccounts: 0, rawOrUncheckedAccounts: 0, manualAccountIteration: 0, unsafeBlocks: 0, manualSignerChecks: 0, manualOwnerChecks: 0, manualWritableChecks: 0, manualAddressChecks: 0, manualSerialization: 0, reallocOperations: 0, unsafeFunctions: 0, cpiSites: [], pdaSites: [] }, relationships: [], architecture: { nodes: [], edges: [] } };
}
function fileMetric(file) {
  const counts = countLines(file.source);
  const root = file.tree?.rootNode;
  return { uri: file.uri, language: "rust", ...counts, functions: root ? descendants(root, "function_item").length : 0, structs: root ? descendants(root, "struct_item").length : 0, enums: root ? descendants(root, "enum_item").length : 0, traits: root ? descendants(root, "trait_item").length : 0, implBlocks: root ? descendants(root, "impl_item").length : 0, unsafeBlocks: root ? descendants(root, "unsafe_block").length : 0, macroInvocations: root ? descendants(root, "macro_invocation").length : 0, attributes: root ? descendants(root, "attribute_item").length : 0, useStatements: root ? descendants(root, "use_declaration").length : 0, functionCalls: root ? descendants(root, "call_expression").length : 0, methodCalls: root ? descendants(root, "call_expression").filter((node) => (node.childForFieldName("function")?.text ?? "").includes(".")).length : 0, matches: root ? descendants(root, "match_expression").length : 0, loops: root ? descendants(root, ["loop_expression", "while_expression", "for_expression"]).length : 0, parseError: file.error };
}
function addUniqueProgram(programs, program) {
  const requested = program.name;
  if (!programs.has(requested)) {
    programs.set(requested, program);
    return;
  }
  let index = 2;
  while (programs.has(`${requested}#${index}`)) index++;
  const name2 = `${requested}#${index}`;
  const rewrite = (value) => value?.startsWith(`${requested}::`) ? `${name2}${value.slice(requested.length)}` : value;
  program.name = name2;
  for (const fn of program.functions) {
    fn.program = name2;
    fn.qualifiedName = rewrite(fn.qualifiedName);
  }
  for (const instruction of program.instructions) instruction.handler = rewrite(instruction.handler);
  if (program.callGraph) {
    program.callGraph.symbols = program.callGraph.symbols.map((item) => rewrite(item));
    for (const call of program.callGraph.calls) {
      call.caller = rewrite(call.caller);
      call.target = rewrite(call.target);
      call.callee = rewrite(call.callee);
      call.candidateTargets = call.candidateTargets?.map((item) => rewrite(item));
    }
    for (const edge of program.callGraph.edges) {
      edge.source = rewrite(edge.source);
      edge.target = rewrite(edge.target);
    }
  }
  programs.set(name2, program);
}
function loc8(uri, node) {
  return { uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column };
}
function attributesBefore(node) {
  const values = [];
  let sibling = node.previousNamedSibling;
  while (sibling?.type === "attribute_item") {
    values.unshift(sibling.text);
    sibling = sibling.previousNamedSibling;
  }
  return values.join("\n");
}
function offsetLocation2(uri, source, start2, end) {
  const before = source.slice(0, start2).split(/\r?\n/);
  const endLines = source.slice(0, end).split(/\r?\n/);
  return { uri, startLine: before.length, startColumn: before.at(-1).length, endLine: endLines.length, endColumn: endLines.at(-1).length };
}
function packageFromUri(uri) {
  return uri.split("/").slice(-2, -1)[0] || "workspace";
}
function contextTypeFromFunction(source) {
  const match = /Context\s*<([^>]*)/.exec(source);
  return match?.[1].split(",").map((part) => part.trim().replace(/<.*$/, "")).reverse().find((part) => /^[A-Z][A-Za-z0-9_]*$/.test(part));
}
function sum(files, key) {
  return files.reduce((total, file) => total + file[key], 0);
}
function sumSurface(surfaces, key, array2 = false) {
  return surfaces.reduce((total, surface) => total + (array2 ? surface[key].length : surface[key]), 0);
}
function coverageFor(programs, files) {
  const totalInstructions = programs.reduce((sum2, program) => sum2 + program.instructions.length, 0);
  const totalCpis = programs.reduce((sum2, program) => sum2 + program.securitySurface.cpiSites.length, 0);
  const totalPdas = programs.reduce((sum2, program) => sum2 + program.securitySurface.pdaSites.length, 0);
  const ratio = (resolved, total) => ({ resolved, total, percent: total ? resolved / total : 1 });
  const calls = programs.flatMap((program) => program.callGraph?.calls ?? []);
  const internalResolvable = calls.filter((call) => call.status === "resolved" || call.status === "ambiguous");
  const external = calls.filter((call) => call.status === "external");
  const relationships = programs.flatMap((program) => program.relationships ?? []);
  const accounts = programs.flatMap((program) => program.accounts);
  const stateAccesses = programs.flatMap((program) => program.instructions.flatMap((instruction) => instruction.reachableSurface?.stateAccesses ?? []));
  const unresolvedReasons = {};
  for (const call of calls.filter((item) => item.status === "ambiguous" || item.status === "dynamic" || item.status === "unresolved")) unresolvedReasons[`${call.status === "unresolved" ? "unknown" : call.status} calls`] = (unresolvedReasons[`${call.status === "unresolved" ? "unknown" : call.status} calls`] ?? 0) + 1;
  const meaningfulInternal = ratio(internalResolvable.filter((call) => call.status === "resolved").length, internalResolvable.length);
  return { parsedFiles: ratio(files.filter((file) => !file.parseError).length, files.length), cargoPackages: ratio(programs.filter((program) => !!program.packageId).length, programs.length), programsClassified: ratio(programs.filter((program) => program.packageKind && program.packageKind !== "unknown").length, programs.length), instructions: ratio(programs.reduce((sum2, program) => sum2 + program.instructions.filter((item) => item.confidence >= 0.7).length, 0), totalInstructions), handlers: ratio(programs.reduce((sum2, program) => sum2 + program.instructions.filter((item) => !!item.handler || !!item.functionName).length, 0), totalInstructions), instructionContexts: ratio(programs.reduce((sum2, program) => sum2 + program.instructions.filter((instruction) => !!instruction.contextType).length, 0), totalInstructions), accountRelationships: ratio(relationships.filter((item) => accounts.some((account2) => account2.id === item.accountId)).length, relationships.length), calls: meaningfulInternal, internalCalls: meaningfulInternal, externalCalls: ratio(external.length, external.length), ambiguousCalls: calls.filter((call) => call.status === "ambiguous").length, dynamicCalls: calls.filter((call) => call.status === "dynamic").length, unknownCalls: calls.filter((call) => call.status === "unresolved").length, reachableSurfaces: ratio(programs.reduce((sum2, program) => sum2 + program.instructions.filter((item) => item.reachableSurface?.complete).length, 0), totalInstructions), stateAccessBindings: ratio(stateAccesses.filter((item) => item.resolved).length, stateAccesses.length), cpiTargets: ratio(programs.reduce((sum2, program) => sum2 + program.securitySurface.cpiSites.filter((site) => !!site.target).length, 0), totalCpis), pdaSeeds: ratio(programs.reduce((sum2, program) => sum2 + program.securitySurface.pdaSites.filter((site) => !!site.seeds?.length).length, 0), totalPdas), programIds: ratio(programs.filter((program) => !!program.identity?.programId).length, programs.length), unresolvedReasons };
}
function dedupeEvidence2(items) {
  const byFramework = /* @__PURE__ */ new Map();
  for (const item of items) {
    const existing = byFramework.get(item.framework);
    if (!existing) byFramework.set(item.framework, { ...item, evidence: [...item.evidence] });
    else {
      existing.confidence = Math.max(existing.confidence, item.confidence);
      const known = new Set(existing.evidence.map((evidence) => evidence.description));
      existing.evidence.push(...item.evidence.filter((evidence) => !known.has(evidence.description)));
    }
  }
  return [...byFramework.values()];
}
function buildArchitecture(program) {
  const uniqueAccounts = /* @__PURE__ */ new Map();
  for (const account2 of program.accounts) {
    const key = account2.id ?? `${account2.contextType ?? ""}:${account2.location.uri}:${account2.location.startLine}:${account2.location.startColumn}:${account2.type}:${account2.name ?? ""}`;
    const existing = uniqueAccounts.get(key);
    if (existing) {
      existing.signer ||= account2.signer;
      existing.writable ||= account2.writable;
      existing.unchecked ||= account2.unchecked;
      existing.constraints = [...existing.constraints ?? [], ...account2.constraints ?? []];
      existing.relations = [...existing.relations ?? [], ...account2.relations ?? []];
    } else uniqueAccounts.set(key, { ...account2, id: account2.id ?? `account:${program.name}:${key}` });
  }
  program.accounts = [...uniqueAccounts.values()];
  const nodes = [{ id: `program:${program.name}`, type: "program", label: program.name }];
  const edges = [];
  const relationships = program.relationships ?? [];
  for (const fn of program.functions) nodes.push({ id: fn.qualifiedName ?? `function:${program.name}:${fn.name}:${fn.location.uri}:${fn.location.startLine}`, type: "function", label: fn.qualifiedName ?? fn.name, location: fn.location });
  for (const edge of program.callGraph?.edges ?? []) if (!nodes.some((node) => node.id === edge.target)) {
    const symbol2 = program.symbols?.find((item) => item.qualifiedName === edge.target);
    nodes.push({ id: edge.target, type: "function", label: edge.target, location: symbol2?.location });
  }
  for (const edge of program.callGraph?.edges ?? []) edges.push({ source: edge.source, target: edge.target, type: "calls" });
  for (const instruction of program.instructions) {
    const instructionId = architectureInstructionId(program, instruction);
    nodes.push({ id: instructionId, type: "instruction", label: instruction.name, location: instruction.location });
    edges.push({ source: `program:${program.name}`, target: instructionId, type: "uses" });
    if (instruction.contextType) {
      const contextId = `context:${program.name}:${instruction.contextType}`;
      nodes.push({ id: contextId, type: "function", label: instruction.contextType, location: instruction.location });
      edges.push({ source: instructionId, target: contextId, type: "uses" });
    }
    for (const relationship of relationships.filter((item) => item.instructionId === (instruction.id ?? instruction.name))) {
      const account2 = program.accounts.find((item) => item.id === relationship.accountId);
      if (!account2) continue;
      const accountId = account2.id ?? relationship.accountId;
      nodes.push({ id: accountId, type: "account", label: account2.name ?? account2.type, location: account2.location });
      edges.push({ source: instructionId, target: accountId, type: relationship.relationship === "signer" ? "signs" : relationship.relationship === "writes" ? "writes" : relationship.relationship === "reads" ? "reads" : "uses" });
    }
  }
  for (const account2 of program.accounts.filter((item) => item.id && item.relations?.length)) for (const relation of account2.relations ?? []) {
    const targetName = /^[A-Za-z_][A-Za-z0-9_]*/.exec(relation.target)?.[0];
    const target = targetName ? program.accounts.find((item) => item.name === targetName && item.contextType === account2.contextType) : void 0;
    if (!target?.id || !nodes.some((node) => node.id === account2.id) || !nodes.some((node) => node.id === target.id)) continue;
    edges.push({ source: account2.id, target: target.id, type: "relates", label: relation.kind });
  }
  for (const cpi of program.securitySurface.cpiSites) {
    const target = cpi.target ?? cpi.invocationApi ?? "unknown";
    const targetId = `external:${target}`;
    if (!nodes.some((node) => node.id === targetId)) nodes.push({ id: targetId, type: "external-program", label: target, location: cpi.location });
    const instruction = program.instructions.find((item) => item.functionName === cpi.functionName);
    edges.push({ source: instruction ? architectureInstructionId(program, instruction) : `program:${program.name}`, target: targetId, type: "cpi" });
  }
  for (const pda of program.securitySurface.pdaSites) {
    const pdaId = pda.id ?? `pda:${pda.location.uri}:${pda.location.startLine}`;
    nodes.push({ id: pdaId, type: "pda", label: "PDA", location: pda.location });
    const instruction = program.instructions.find((item) => item.name === pda.enclosingInstruction || item.functionName === pda.enclosingFunction);
    edges.push({ source: instruction ? architectureInstructionId(program, instruction) : `program:${program.name}`, target: pdaId, type: "derives" });
  }
  program.architecture = { nodes: [...new Map(nodes.map((node) => [node.id, node])).values()], edges: [...new Map(edges.map((edge) => [`${edge.source}:${edge.target}:${edge.type}:${edge.label ?? ""}`, edge])).values()] };
  program.relationships = [...new Map(relationships.map((item) => [`${item.instructionId}:${item.accountId}:${item.relationship}`, item])).values()];
}
function architectureInstructionId(program, instruction) {
  return instruction.id ?? `instruction:${program.name}:${instruction.name}:${instruction.location.uri}:${instruction.location.startLine}`;
}
function buildExternalPrograms(program) {
  const grouped = /* @__PURE__ */ new Map();
  for (const cpi of program.securitySurface.cpiSites) {
    const name2 = cpi.target ?? cpi.invocationApi ?? "unknown";
    const id = `external:${name2}`;
    const instruction = program.instructions.find((item) => item.name === cpi.enclosingInstruction || item.functionName === cpi.functionName || item.handler === cpi.functionName);
    const instructionId = instruction?.id ?? instruction?.name;
    const existing = grouped.get(id) ?? { id, name: name2, programId: cpi.targetProgramId, kind: cpi.targetKind ?? "unknown", locations: [], calledByInstructions: [], cpiCount: 0, signedCpiCount: 0, confidence: cpi.confidence, evidence: [], cpiSiteIds: [] };
    existing.locations.push(cpi.location);
    if (instructionId) existing.calledByInstructions.push(instructionId);
    existing.cpiCount++;
    if (cpi.pdaSigned) existing.signedCpiCount++;
    existing.confidence = Math.max(existing.confidence, cpi.confidence);
    existing.evidence.push(...cpi.evidence);
    if (cpi.id) existing.cpiSiteIds.push(cpi.id);
    grouped.set(id, existing);
  }
  program.externalPrograms = [...grouped.values()].map((item) => ({ ...item, locations: [...new Map(item.locations.map((location3) => [`${location3.uri}:${location3.startLine}:${location3.startColumn}`, location3])).values()], calledByInstructions: [...new Set(item.calledByInstructions)].sort(), cpiSiteIds: [...new Set(item.cpiSiteIds)].sort(), evidence: [...new Map(item.evidence.map((evidence) => [`${evidence.description}:${evidence.location?.uri ?? ""}:${evidence.location?.startLine ?? ""}`, evidence])).values()] }));
}
function resolveInstructionAccounts(program) {
  program.relationships ??= [];
  for (const instruction of program.instructions) {
    const handler = instruction.handler ?? instruction.functionName;
    const related = instruction.contextType ? program.accounts.filter((item) => item.contextType === instruction.contextType) : handler ? program.accounts.filter((item) => item.id?.includes(`:${handler}:`)) : [];
    for (const account2 of related) {
      if (!account2.id) account2.id = `account:${program.name}:${account2.location.uri}:${account2.location.startLine}:${account2.name ?? account2.type}`;
      program.relationships = program.relationships.filter((item) => item.instructionId !== (instruction.id ?? instruction.name) || item.accountId !== account2.id);
      program.relationships.push({ instructionId: instruction.id ?? instruction.name, accountId: account2.id, relationship: account2.signer ? "signer" : account2.writable ? "writes" : account2.unchecked || account2.raw ? "unchecked" : "reads" });
    }
  }
  program.relationships = [...new Map(program.relationships.map((item) => [`${item.instructionId}:${item.accountId}:${item.relationship}`, item])).values()];
}
function linkFrameworkPdas(program) {
  for (const pda of program.securitySurface.pdaSites.filter((item) => item.relatedAccountId && !item.enclosingInstruction)) {
    const account2 = program.accounts.find((item) => item.id === pda.relatedAccountId);
    pda.enclosingInstruction = program.instructions.find((item) => item.contextType === account2?.contextType)?.name;
  }
  for (const cpi of program.securitySurface.cpiSites.filter((item) => item.id?.includes(":init:") && !item.enclosingInstruction)) {
    const account2 = program.accounts.find((item) => item.id && cpi.id?.endsWith(item.id));
    if (account2) cpi.enclosingInstruction = program.instructions.find((item) => item.contextType === account2.contextType)?.name;
  }
  for (const pda of program.securitySurface.pdaSites.filter((item) => item.id?.includes(":quasar-template:"))) {
    const stateType = pda.derivationApi?.replace(/::seeds$/, "");
    if (!stateType) continue;
    const account2 = program.accounts.find((item) => item.stateType === stateType && item.addressExpectation?.includes(`${stateType}::seeds`));
    if (!account2?.id) continue;
    pda.relatedAccountId = account2.id;
    account2.pdaId = pda.id;
    pda.enclosingInstruction = program.instructions.find((item) => item.contextType === account2.contextType)?.name;
    const initCpi = program.securitySurface.cpiSites.find((item) => item.id?.includes(":init:") && item.id.endsWith(account2.id));
    if (initCpi) {
      initCpi.pdaSigned = true;
      initCpi.signerPdaIds = [pda.id];
      pda.usedAsSigner = true;
      pda.relatedCpiIds = [initCpi.id];
    }
  }
}
function linkReachableSemantics(program) {
  for (const instruction of program.instructions) {
    const surface = instruction.reachableSurface;
    if (!surface) continue;
    const shortNames = new Set(surface.functions.map((name2) => name2.split("::").at(-1) ?? name2));
    const instructionId = instruction.id ?? instruction.name;
    const sysvars = (program.sysvars ?? []).filter((item) => item.functionName && shortNames.has(item.functionName));
    const runtime = (program.runtimeOperations ?? []).filter((item) => item.functionName && shortNames.has(item.functionName));
    const accounts = program.accounts.filter((account2) => account2.id && surface.accounts.includes(account2.id));
    surface.sysvars = sysvars.map((item) => item.id);
    surface.syscalls = runtime.map((item) => item.id);
    surface.stateTypes = accounts.filter((account2) => account2.stateType).map((account2) => account2.stateType);
    surface.initializationSites = semanticAccountSites(accounts, ["init", "create"], "init");
    surface.reallocSites = [...semanticAccountSites(accounts, ["realloc"], "realloc"), ...runtime.filter((item) => item.kind === "realloc").map((item) => item.id)];
    surface.closeSites = semanticAccountSites(accounts, ["close"], "close");
    surface.serializationSites = accounts.filter((account2) => account2.serialization?.length).flatMap((account2) => account2.serialization.map((format) => `${account2.id}:serialization:${format}`));
    surface.deserializationSites = accounts.filter((account2) => account2.stateType || account2.serialization?.length).map((account2) => `${account2.id}:deserialization`);
    const stateAccesses = surface.stateAccesses ?? [];
    surface.serializationSites = [.../* @__PURE__ */ new Set([...surface.serializationSites, ...stateAccesses.filter((item) => item.operation === "serialize").map((item) => item.id)])];
    surface.deserializationSites = [.../* @__PURE__ */ new Set([...surface.deserializationSites, ...stateAccesses.filter((item) => item.operation === "deserialize").map((item) => item.id)])];
    surface.lamportMutationSites = [.../* @__PURE__ */ new Set([...accounts.filter((account2) => account2.lamportAccess?.includes("write") || account2.lifecycle?.includes("lamport-transfer")).map((account2) => `${account2.id}:lamport-write`), ...stateAccesses.filter((item) => item.operation === "lamport-write" || item.operation === "close").map((item) => item.id)])];
    surface.dataMutationSites = [.../* @__PURE__ */ new Set([...accounts.filter((account2) => account2.dataAccess?.includes("write") || account2.lifecycle?.includes("write")).map((account2) => `${account2.id}:data-write`), ...runtime.filter((item) => item.kind === "state-write").map((item) => item.id), ...stateAccesses.filter((item) => item.operation === "data-write" || item.operation === "serialize" || item.operation === "realloc" || item.operation === "close").map((item) => item.id)])];
    surface.reallocSites = [.../* @__PURE__ */ new Set([...surface.reallocSites, ...stateAccesses.filter((item) => item.operation === "realloc").map((item) => item.id)])];
    surface.closeSites = [.../* @__PURE__ */ new Set([...surface.closeSites, ...stateAccesses.filter((item) => item.operation === "close").map((item) => item.id)])];
    for (const account2 of accounts.filter((item) => item.stateType)) {
      const state = program.stateTypes?.find((item) => item.name === account2.stateType);
      if (!state || !account2.id) continue;
      if (account2.lifecycle?.some((item) => item === "init" || item === "create")) state.initializationSites.push(`${account2.id}:init`);
      if (account2.lifecycle?.includes("realloc")) state.reallocSites.push(`${account2.id}:realloc`);
      if (account2.lifecycle?.includes("close")) state.closeSites.push(`${account2.id}:close`);
      state.initializationSites = [...new Set(state.initializationSites)];
      state.reallocSites = [...new Set(state.reallocSites)];
      state.closeSites = [...new Set(state.closeSites)];
    }
    surface.events = (program.events ?? []).filter((event) => event.emissionSites.some((site) => program.functions.some((fn) => shortNames.has(fn.name) && fn.location.uri === site.uri && fn.location.startLine <= site.startLine && fn.location.endLine >= site.endLine))).map((event) => event.id);
    surface.errors = (program.errors ?? []).filter((error) => error.useSites.some((site) => program.functions.some((fn) => shortNames.has(fn.name) && fn.location.uri === site.uri && fn.location.startLine <= site.startLine && fn.location.endLine >= site.endLine))).map((error) => error.id);
    for (const item of [...sysvars, ...runtime]) item.instructionIds = [.../* @__PURE__ */ new Set([...item.instructionIds, instructionId])].sort();
    for (const cpi of program.securitySurface.cpiSites.filter((item) => item.id && surface.cpis.includes(item.id))) cpi.reachableInstructions = [.../* @__PURE__ */ new Set([...cpi.reachableInstructions ?? [], instructionId])].sort();
    for (const pda of program.securitySurface.pdaSites.filter((item) => item.id && surface.pdas.includes(item.id))) pda.reachableInstructions = [.../* @__PURE__ */ new Set([...pda.reachableInstructions ?? [], instructionId])].sort();
  }
}
function semanticAccountSites(accounts, lifecycle, suffix) {
  return accounts.filter((account2) => account2.id && account2.lifecycle?.some((item) => lifecycle.includes(item))).map((account2) => `${account2.id}:${suffix}`);
}

// src/core/scope.ts
init_importMetaShim();
var import_node_crypto2 = require("node:crypto");
var import_promises2 = require("node:fs/promises");
var path6 = __toESM(require("node:path"));

// src/discovery/fileWalker.ts
init_importMetaShim();
var import_promises = require("node:fs/promises");
var path5 = __toESM(require("node:path"));
var DEFAULT_PRUNED_DIRECTORIES = /* @__PURE__ */ new Set([
  ".git",
  ".anchor",
  ".real-world-cache",
  ".sealevel-insight-cache",
  ".vscode-test",
  "coverage",
  "dist",
  "dist-integration",
  "dist-test",
  "node_modules",
  "target"
]);
async function walkFiles(root, options2 = {}) {
  const files = [];
  const pruned = options2.prunedDirectories ?? DEFAULT_PRUNED_DIRECTORIES;
  async function visit(directory) {
    for (const entry of await (0, import_promises.readdir)(directory, { withFileTypes: true })) {
      const full = path5.join(directory, entry.name);
      const relative8 = path5.relative(root, full).split(path5.sep).join("/");
      if (entry.isDirectory()) {
        if (pruned.has(entry.name) || options2.shouldDescend?.(relative8, entry.name) === false) continue;
        await visit(full);
      } else if (entry.isFile() && options2.includeFile?.(relative8, entry.name) !== false) files.push(full);
    }
  }
  await visit(root);
  return files.sort();
}

// src/core/scope.ts
async function buildScope(root, config) {
  const loaded = config ? { config: { ...config }, diagnostics: [], source: void 0 } : await loadScopeConfig(root);
  config = loaded.config;
  if (config.scopeFile) {
    const scopePath = path6.resolve(root, config.scopeFile);
    try {
      mergeScopeFile(config, await readScopeFile(scopePath, loaded.diagnostics));
      loaded.source = scopePath;
    } catch (error) {
      loaded.diagnostics.push(`Invalid scope file ${config.scopeFile}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const directoryExcludes = (config.exclude ?? ["**/target/**", "**/node_modules/**", "**/.git/**"]).map(globRegex);
  const files = await walkFiles(root, { shouldDescend: (relative8) => !directoryExcludes.some((pattern) => pattern.test(`${relative8}/__sealevel_insight__`)) });
  const result = [];
  for (const file of files) {
    const relative8 = path6.relative(root, file).split(path6.sep).join("/");
    const source = await (0, import_promises2.readFile)(file);
    const normalized = source.toString("utf8").replace(/\r\n?/g, "\n");
    const sha256 = (0, import_node_crypto2.createHash)("sha256").update(normalized).digest("hex");
    const generated = /(^|\/)(generated|target)(\/|$)/i.test(relative8);
    const test = /(^|\/)(tests?|benches?)(\/|$)/i.test(relative8);
    const excludedByPattern = matches(relative8, config.exclude ?? ["**/target/**", "**/node_modules/**", "**/.git/**"]);
    const inScope = matches(relative8, config.include ?? ["**/*"]) && !excludedByPattern && (config.includeTests === true || !test) && (config.includeGenerated === true || !generated);
    result.push({ path: relative8, sha256, inScope, generated, test });
  }
  const groups = /* @__PURE__ */ new Map();
  for (const file of result) groups.set(file.sha256, [...groups.get(file.sha256) ?? [], file]);
  for (const group of groups.values()) {
    const canonical = group.find((file) => file.inScope) ?? group[0];
    for (const file of group) if (file !== canonical) file.duplicateOf = canonical.path;
  }
  const includeDuplicate = config.includeDuplicates === true;
  return { files: result.sort((a, b) => a.path.localeCompare(b.path)), inScope: result.filter((file) => file.inScope && (includeDuplicate || !file.duplicateOf)).map((file) => file.path), outOfScope: result.filter((file) => !file.inScope).map((file) => file.path), excluded: result.filter((file) => !file.inScope && !file.test && !file.generated).map((file) => file.path), tests: result.filter((file) => file.test).map((file) => file.path), generated: result.filter((file) => file.generated).map((file) => file.path), duplicates: result.filter((file) => !!file.duplicateOf).map((file) => file.path), diagnostics: loaded.diagnostics, configSource: loaded.source };
}
async function loadScopeConfig(root) {
  const diagnostics = [];
  const configPath = path6.join(root, ".sealevel-insight.json");
  try {
    const raw = JSON.parse(await (0, import_promises2.readFile)(configPath, "utf8"));
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("configuration must be a JSON object");
    const value = raw;
    const config = { include: stringArray(value.include), exclude: stringArray(value.exclude), includeTests: boolean(value.includeTests), includeGenerated: boolean(value.includeGenerated), includeDuplicates: boolean(value.includeDuplicates), scopeFile: typeof value.scopeFile === "string" ? value.scopeFile : void 0 };
    if (config.scopeFile) mergeScopeFile(config, await readScopeFile(path6.resolve(root, config.scopeFile), diagnostics));
    return { config, diagnostics, source: configPath };
  } catch (error) {
    if (error.code !== "ENOENT") diagnostics.push(`Invalid .sealevel-insight.json: ${error instanceof Error ? error.message : String(error)}`);
  }
  const scopeFile = path6.join(root, "scopefile.txt");
  try {
    const config = {};
    mergeScopeFile(config, await readScopeFile(scopeFile, diagnostics));
    return { config, diagnostics, source: scopeFile };
  } catch (error) {
    if (error.code !== "ENOENT") diagnostics.push(`Invalid scopefile.txt: ${error instanceof Error ? error.message : String(error)}`);
  }
  return { config: {}, diagnostics };
}
async function readScopeFile(file, diagnostics) {
  const include = [], exclude = [];
  for (const [index, raw] of (await (0, import_promises2.readFile)(file, "utf8")).split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("!") || line.startsWith("-")) exclude.push(line.slice(1).trim());
    else include.push(line.startsWith("+") ? line.slice(1).trim() : line);
    if (!(line.startsWith("!") || line.startsWith("-") || line.startsWith("+") || line.includes("*") || line.includes("/"))) diagnostics.push(`scopefile.txt line ${index + 1} is treated as an include path: ${line}`);
  }
  return { include: include.length ? include : void 0, exclude: exclude.length ? exclude : void 0 };
}
function mergeScopeFile(target, source) {
  target.include = [...target.include ?? [], ...source.include ?? []];
  target.exclude = [...target.exclude ?? [], ...source.exclude ?? []];
}
function stringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string" && !!item) : void 0;
}
function boolean(value) {
  return typeof value === "boolean" ? value : void 0;
}
function matches(value, patterns) {
  return patterns.some((pattern) => globRegex(pattern).test(value));
}
function globRegex(pattern) {
  const normalized = pattern.replace(/\\/g, "/");
  let expression = "^";
  for (let index = 0; index < normalized.length; index++) {
    const current = normalized[index];
    if (current === "*" && normalized[index + 1] === "*") {
      index++;
      if (normalized[index + 1] === "/") {
        index++;
        expression += "(?:.*/)?";
      } else expression += ".*";
    } else if (current === "*") expression += "[^/]*";
    else if (current === "?") expression += "[^/]";
    else expression += current.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`${expression}$`);
}

// src/core/diff.ts
init_importMetaShim();
function diffReports(before, after) {
  assertCompatibleReports(before, after);
  const beforePrograms = new Map(before.programs.map((program) => [program.name, program]));
  const afterPrograms = new Map(after.programs.map((program) => [program.name, program]));
  const changedFunctions = [];
  const changes = {};
  compareSection(changes, "files", flatten(before, (p) => (p.sourceFiles ?? p.rustFiles).map((item) => [item.uri, item])), flatten(after, (p) => (p.sourceFiles ?? p.rustFiles).map((item) => [item.uri, item])), ["language", "codeLines", "commentLines", "functions", "unsafeBlocks"]);
  compareSection(changes, "instructions", flatten(before, (p) => p.instructions.map((item) => [instructionIdentity(p, item), instructionShape(item)])), flatten(after, (p) => p.instructions.map((item) => [instructionIdentity(p, item), instructionShape(item)])), ["complexity", "reachableFunctions", "cpis", "pdas", "accounts", "complete"]);
  compareSection(changes, "stateTypes", flatten(before, (p) => (p.stateTypes ?? []).map((item) => [`${p.name}:${item.name}`, item])), flatten(after, (p) => (p.stateTypes ?? []).map((item) => [`${p.name}:${item.name}`, item])), ["serialization", "staticSize", "dynamicSize", "zeroCopy"]);
  compareSection(changes, "accounts", flatten(before, (p) => p.accounts.map((item) => [`${p.name}:${item.contextType ?? ""}:${item.name ?? item.type}:${item.ordinal ?? item.index ?? ""}`, item])), flatten(after, (p) => p.accounts.map((item) => [`${p.name}:${item.contextType ?? ""}:${item.name ?? item.type}:${item.ordinal ?? item.index ?? ""}`, item])), ["signer", "writable", "optional", "unchecked", "ownerExpectation", "addressExpectation", "lifecycle"]);
  compareSection(changes, "cpis", flatten(before, (p) => p.securitySurface.cpiSites.map((item) => [item.id ?? `${p.name}:${item.location.uri}:${item.location.startLine}:${item.location.startColumn}`, item])), flatten(after, (p) => p.securitySurface.cpiSites.map((item) => [item.id ?? `${p.name}:${item.location.uri}:${item.location.startLine}:${item.location.startColumn}`, item])), ["target", "targetKind", "operation", "operationCategory", "pdaSigned"]);
  compareSection(changes, "pdas", flatten(before, (p) => p.securitySurface.pdaSites.map((item) => [item.id ?? `${p.name}:${item.location.uri}:${item.location.startLine}:${item.location.startColumn}`, item])), flatten(after, (p) => p.securitySurface.pdaSites.map((item) => [item.id ?? `${p.name}:${item.location.uri}:${item.location.startLine}:${item.location.startColumn}`, item])), ["seeds", "bump", "usedAsSigner"]);
  compareSection(changes, "externalPrograms", flatten(before, (p) => (p.externalPrograms ?? []).map((item) => [`${p.name}:${item.id}`, item])), flatten(after, (p) => (p.externalPrograms ?? []).map((item) => [`${p.name}:${item.id}`, item])), ["cpiCount", "signedCpiCount", "programId"]);
  compareSection(changes, "dependencies", flatten(before, (p) => (p.packageDependencies ?? []).map((item) => [`${p.name}:${item.kind}:${item.name}`, item])), flatten(after, (p) => (p.packageDependencies ?? []).map((item) => [`${p.name}:${item.kind}:${item.name}`, item])), ["version", "path", "optional", "features"]);
  compareSection(changes, "capabilities", flatten(before, (p) => (p.capabilities ?? []).map((item) => [`${p.name}:${item.id}`, item])), flatten(after, (p) => (p.capabilities ?? []).map((item) => [`${p.name}:${item.id}`, item])), []);
  compareSection(changes, "instructionDossiers", flatten(before, (p) => (p.instructionDossiers ?? []).map((item) => [item.id, dossierShape(item)])), flatten(after, (p) => (p.instructionDossiers ?? []).map((item) => [item.id, dossierShape(item)])), ["complete", "functions", "accounts", "cpis", "signedCpis", "pdas", "stateTypes", "stateAccesses", "lifecycleSites", "crossPackage", "unresolvedDetails", "witnesses", "reviewScore"]);
  compareSection(changes, "compilationProfile", /* @__PURE__ */ new Map([["workspace", before.compilationProfile ?? {}]]), /* @__PURE__ */ new Map([["workspace", after.compilationProfile ?? {}]]), ["target", "mode", "debugAssertions", "cfgOptions", "cfgKnowledge"]);
  compareSection(changes, "conditionalCompilation", new Map(before.programs.map((p) => [p.name, p.conditionalCompilation ?? {}])), new Map(after.programs.map((p) => [p.name, p.conditionalCompilation ?? {}])), ["featureKnowledge", "enabledFeatures", "inactiveItems", "unknownItems", "unknownPredicates"]);
  compareSection(changes, "callGraph", new Map(before.programs.map((p) => [p.name, callGraphShape(p)])), new Map(after.programs.map((p) => [p.name, callGraphShape(p)])), ["calls", "cycles"]);
  compareSection(changes, "stateFlows", flatten(before, (p) => (p.stateFlows ?? []).map((item) => [item.id, item])), flatten(after, (p) => (p.stateFlows ?? []).map((item) => [item.id, item])), ["relationship", "operations", "dataAccess", "lamportAccess", "serialization", "fieldReads", "fieldWrites", "accessComplete", "stateTypeId"]);
  compareSection(
    changes,
    "assetFlows",
    flatten(before, (p) => (p.assetFlows ?? []).map((item) => [assetFlowIdentity(p, item), assetFlowShape(item)])),
    flatten(after, (p) => (p.assetFlows ?? []).map((item) => [assetFlowIdentity(p, item), assetFlowShape(item)])),
    ["operation", "tokenProgram", "source", "destination", "mint", "authority", "authorityType", "delegate", "newAuthority", "amount", "decimals", "pdaSigned", "signerPdaIds", "complete", "direct"]
  );
  compareSection(changes, "idl", new Map((before.idl?.reconciliations ?? []).map((item) => [item.item, item])), new Map((after.idl?.reconciliations ?? []).map((item) => [item.item, item])), ["status", "details"]);
  for (const program of after.programs) for (const fn of program.functions) {
    const id = functionIdentity(program, fn);
    const old = beforePrograms.get(program.name)?.functions.find((item) => functionIdentity(program, item) === id);
    if (!old) changedFunctions.push({ id, after: fn.complexity });
    else {
      const fields = fieldChanges(old, fn, ["complexity", "codeLines", "reachableFunctions", "cpiCount", "pdaCount", "accountCount", "unresolvedCalls"]);
      if (Object.keys(fields).length) changedFunctions.push({ id, before: old.complexity, after: fn.complexity, fields });
    }
  }
  for (const program of before.programs) for (const fn of program.functions) if (!afterPrograms.get(program.name)?.functions.some((item) => functionIdentity(program, item) === functionIdentity(program, fn))) changedFunctions.push({ id: functionIdentity(program, fn), before: fn.complexity });
  changes.functions = changedFunctions;
  return {
    summary: numericDelta(before.summary, after.summary),
    addedPrograms: [...afterPrograms.keys()].filter((name2) => !beforePrograms.has(name2)).sort(),
    removedPrograms: [...beforePrograms.keys()].filter((name2) => !afterPrograms.has(name2)).sort(),
    changedFunctions: changedFunctions.sort(byId),
    changes,
    coverage: coverageDelta(before, after)
  };
}
function instructionShape(item) {
  const surface = item.reachableSurface;
  return { complexity: surface?.reviewComplexity?.score ?? 0, reachableFunctions: surface?.functions.length ?? 0, cpis: surface?.cpis.length ?? 0, pdas: surface?.pdas.length ?? 0, accounts: surface?.accounts.length ?? 0, stateAccesses: surface?.stateAccesses?.length ?? 0, returns: item.returns, remainingAccounts: item.remainingAccounts, complete: surface?.complete ?? false };
}
function dossierShape(item) {
  return { complete: item.reachability.complete, functions: item.reachability.functions.length, accounts: item.accounts.length, cpis: item.cpis.length, signedCpis: item.cpis.filter((cpi) => cpi.pdaSigned).length, pdas: item.pdas.length, stateTypes: item.stateTypeIds, stateAccesses: item.stateAccesses.map((access) => ({ operation: access.operation, accountId: access.accountId, stateType: access.stateType, fieldPath: access.fieldPath, resolved: access.resolved, functionPath: access.functionPath })), lifecycleSites: item.semanticSites, crossPackage: item.crossPackageSurfaces, unresolvedDetails: item.reachability.unresolvedCallDetails, witnesses: (item.reachabilityWitnesses ?? []).map((witness) => ({ targetKind: witness.targetKind, targetProgram: witness.targetProgram, targetId: witness.targetId, functionPath: witness.functionPath, callPath: witness.callPath })), reviewScore: item.reviewComplexity?.score ?? 0 };
}
function callGraphShape(program) {
  return { calls: (program.callGraph?.calls ?? []).map((call) => ({ id: call.id, status: call.status, target: call.target, candidates: call.candidateTargets, dispatchKind: call.dispatchKind, indirect: call.indirect, receiverType: call.receiverType, transforms: call.resolutionTransforms })).sort((a, b) => a.id.localeCompare(b.id)), cycles: (program.callGraph?.cycles ?? []).map((cycle) => ({ id: cycle.id, kind: cycle.kind, functions: cycle.functions, callIds: cycle.callIds })).sort((a, b) => a.id.localeCompare(b.id)) };
}
function assetFlowIdentity(program, flow) {
  return `${program.packageId ?? program.name}:asset-flow:${flow.instructionId}:${flow.cpiId ?? `${flow.location.uri}:${flow.location.startLine}:${flow.location.startColumn}`}`;
}
function assetFlowShape(flow) {
  return { operation: flow.operation, tokenProgram: flow.tokenProgram, source: flow.source, destination: flow.destination, mint: flow.mint, authority: flow.authority, authorityType: flow.authorityType, delegate: flow.delegate, newAuthority: flow.newAuthority, amount: flow.amount, decimals: flow.decimals, pdaSigned: flow.pdaSigned, signerPdaIds: [...flow.signerPdaIds ?? []].sort(), complete: flow.complete };
}
function functionIdentity(program, fn) {
  return `${program.packageId ?? program.name}:function:${fn.qualifiedName ?? fn.name}`;
}
function instructionIdentity(program, instruction) {
  return `${program.packageId ?? program.name}:instruction:${instruction.name}:${instruction.discriminator ?? ""}:${instruction.contextType ?? ""}`;
}
function assertCompatibleReports(before, after) {
  if (!before || !after || !Array.isArray(before.programs) || !Array.isArray(after.programs)) throw new Error("Diff inputs must be Sealevel Insight reports.");
  if (before.schemaVersion !== after.schemaVersion) throw new Error(`Cannot diff report schema ${before.schemaVersion} against ${after.schemaVersion}.`);
  if (before.schemaVersion !== SCHEMA_VERSION) throw new Error(`Unsupported report schema ${before.schemaVersion}. Re-baseline with the current Sealevel Insight version.`);
}
function flatten(report, values) {
  return new Map(report.programs.flatMap(values));
}
function compareSection(target, name2, before, after, fields) {
  const result = [];
  for (const [id, value] of after) {
    const previous = before.get(id);
    if (previous === void 0) result.push({ id, after: value });
    else {
      const changed = fieldChanges(previous, value, fields);
      if (Object.keys(changed).length) result.push({ id, before: previous, after: value, fields: changed });
    }
  }
  for (const [id, value] of before) if (!after.has(id)) result.push({ id, before: value });
  target[name2] = result.sort(byId);
}
function fieldChanges(before, after, fields) {
  const result = {};
  const left = asRecord(before), right = asRecord(after);
  for (const field2 of fields) if (stable(left[field2]) !== stable(right[field2])) result[field2] = { before: left[field2], after: right[field2] };
  return result;
}
function asRecord(value) {
  return value && typeof value === "object" ? value : {};
}
function stable(value) {
  return JSON.stringify(stableValue(value));
}
function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, stableValue(child)]));
}
function numericDelta(before, after) {
  const result = {};
  for (const key of Object.keys(after)) result[key] = (after[key] ?? 0) - (before[key] ?? 0);
  return result;
}
function coverageDelta(before, after) {
  const result = {};
  const left = asRecord(before.coverage), right = asRecord(after.coverage);
  for (const key of /* @__PURE__ */ new Set([...Object.keys(left), ...Object.keys(right)])) {
    const a = asRecord(left[key]).percent, b = asRecord(right[key]).percent;
    if (typeof a === "number" && typeof b === "number" && a !== b) result[key] = { before: a, after: b };
  }
  return result;
}
function byId(a, b) {
  return a.id.localeCompare(b.id);
}

// src/core/serialization.ts
init_importMetaShim();
var import_node_crypto3 = require("node:crypto");
var path7 = __toESM(require("node:path"));
var import_node_url3 = require("node:url");
function portableReport(report, root) {
  const roots = (Array.isArray(root) ? root : root ? [root] : []).map((item) => path7.resolve(item));
  if (!roots.length) return report;
  const pathKeys = /* @__PURE__ */ new Set(["uri", "sourceUri", "manifestUri", "rootUri", "workspaceRoot", "targetDirectory", "path", "buildScript"]);
  const pathArrayKeys = /* @__PURE__ */ new Set(["roots", "members", "defaultMembers", "excluded"]);
  const normalize4 = (value, key) => {
    if (Array.isArray(value)) return value.map((child) => pathArrayKeys.has(key ?? "") && typeof child === "string" ? relativeUri(child, roots) : normalize4(child));
    if (typeof value === "string") return relativeEmbedded(value, roots);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, pathKeys.has(childKey) && typeof child === "string" ? relativeUri(child, roots) : normalize4(child, childKey)]));
  };
  return normalize4(report);
}
function relativeEmbedded(value, roots) {
  let result = value;
  const mappings = roots.map((root) => ({ root, uri: (0, import_node_url3.pathToFileURL)(root).href.replace(/\/$/, ""), replacement: roots.length > 1 ? path7.basename(root) : "" })).sort((a, b) => b.root.length - a.root.length);
  for (const mapping of mappings) {
    for (const prefix of [mapping.uri, mapping.root.replace(/\\/g, "/")]) {
      result = result.split(`${prefix}/`).join(mapping.replacement ? `${mapping.replacement}/` : "");
      if (result === prefix) result = mapping.replacement || ".";
    }
  }
  return result;
}
function relativeUri(uri, roots) {
  let normalized = uri;
  try {
    if (uri.startsWith("file:")) normalized = (0, import_node_url3.fileURLToPath)(uri);
  } catch {
    return uri;
  }
  if (!path7.isAbsolute(normalized)) return uri;
  const matches2 = roots.map((root) => ({ root, relative: path7.relative(root, path7.resolve(normalized)) })).filter((item) => item.relative === "" || item.relative !== ".." && !item.relative.startsWith(`..${path7.sep}`) && !path7.isAbsolute(item.relative)).sort((a, b) => a.relative.length - b.relative.length);
  const match = matches2[0];
  if (!match) return uri;
  const relative8 = match.relative || ".";
  if (roots.length > 1 && relative8 === ".") return path7.basename(match.root);
  return `${roots.length > 1 ? `${path7.basename(match.root)}/` : ""}${relative8}`.replace(/\\/g, "/");
}
function markdownReport(report) {
  const coverage = Object.entries(report.coverage ?? {}).filter((entry) => !!entry[1] && typeof entry[1] === "object" && "resolved" in entry[1]);
  const callClasses = ["ambiguousCalls", "dynamicCalls", "unknownCalls"].map((name2) => [name2, report.coverage?.[name2]]).filter((entry) => typeof entry[1] === "number");
  const manifest = report.auditManifest;
  const dossierRows = report.programs.flatMap((program) => (program.instructionDossiers ?? []).map((dossier) => `| ${escapeMd(program.name)} | ${escapeMd(`${dossier.name}${dossier.returns ? ` \u2192 ${dossier.returns}` : ""}`)} | ${dossier.reachability.complete ? "Resolved" : `Incomplete: ${escapeMd(dossier.reachability.incompleteReasons.join("; "))}`} | ${dossier.accounts.length} | ${escapeMd(dossier.cpis.map((item) => item.operation ?? item.target ?? "dynamic").join(", ") || "none")} | ${escapeMd(dossier.crossPackageSurfaces.map((item) => `${item.program} (${item.functions.length} functions, ${item.cpiIds.length} CPIs)`).join("; ") || "none")} | ${escapeMd(dossier.reachability.unresolvedCallDetails.map((item) => `${item.expression}: ${item.reason}`).join("; ") || "none")} | init ${dossier.semanticSites.initialization.length}; realloc ${dossier.semanticSites.realloc.length}; close ${dossier.semanticSites.close.length}; write ${dossier.semanticSites.dataMutation.length} | ${dossier.reviewComplexity?.score ?? 0} |`)).join("\n");
  const stateAccessRows = report.programs.flatMap((program) => (program.instructionDossiers ?? []).flatMap((dossier) => dossier.stateAccesses.map((access) => `| ${escapeMd(`${program.name}::${dossier.name}`)} | ${escapeMd(access.operation)} | ${escapeMd(access.accountName ?? access.accountExpression)} | ${escapeMd(access.stateType ?? "unknown")} | ${escapeMd(access.fieldPath ?? "whole account")} | ${escapeMd(access.functionPath.join(" \u2192 "))} | ${access.resolved ? "Resolved" : "Unresolved account"} |`))).join("\n");
  const witnessRows = report.programs.flatMap((program) => (program.instructionDossiers ?? []).flatMap((dossier) => (dossier.reachabilityWitnesses ?? []).map((witness) => `| ${escapeMd(`${program.name}::${dossier.name}`)} | ${escapeMd(witness.targetKind)} | ${escapeMd(`${witness.targetProgram}::${witness.targetId}`)} | ${escapeMd(witness.functionPath.join(" \u2192 "))} | ${escapeMd(witness.callPath.join(" \u2192 ") || "direct")} |`))).join("\n");
  const assetFlowRows = report.programs.flatMap((program) => (program.instructionDossiers ?? []).flatMap((dossier) => dossier.assetFlows.map((flow) => `| ${escapeMd(`${program.name}::${dossier.name}`)} | ${escapeMd(flow.operation ?? "unresolved")} | ${escapeMd(flow.tokenProgram ?? "unknown")} | ${escapeMd(roleLabel(flow.source))} | ${escapeMd(roleLabel(flow.destination))} | ${escapeMd(roleLabel(flow.mint))} | ${escapeMd(roleLabel(flow.authority))}${flow.authorityType && flow.authorityType !== "unresolved" ? ` (${flow.authorityType})` : ""} | ${escapeMd(flow.amount ?? "unresolved")} | ${escapeMd(flow.decimals ?? "n/a")} | ${flow.pdaSigned ? "yes" : "no"} | ${flow.direct ? "direct" : "via helpers"} | ${flow.complete ? "complete" : escapeMd(flow.unresolvedReasons.join("; "))} |`))).join("\n");
  const dispatchRows = report.programs.flatMap((program) => (program.callGraph?.calls ?? []).filter((call) => call.indirect || call.dispatchKind && !["direct", "inherent-method"].includes(call.dispatchKind)).map((call) => `| ${escapeMd(program.name)} | ${escapeMd(call.sourceExpression ?? call.callee)} | ${call.status ?? "unknown"} | ${call.dispatchKind ?? "unknown"} | ${escapeMd(call.receiverType ?? "n/a")} | ${escapeMd(call.candidateTargets?.join(", ") || "none")} | ${escapeMd(call.resolutionTransforms?.join(" \u2192 ") || "none")} |`)).join("\n");
  const cycleRows = report.programs.flatMap((program) => (program.callGraph?.cycles ?? []).map((cycle) => `| ${escapeMd(program.name)} | ${cycle.kind} | ${escapeMd(cycle.functions.join(" \u2194 "))} | ${escapeMd(cycle.callIds.join(", "))} |`)).join("\n");
  const profile = report.compilationProfile;
  const witnessSection = `#### Reachability Evidence Paths

| Instruction | Target kind | Target | Function path | Call IDs |
|---|---|---|---|---|
${witnessRows || "| _None_ | | | | |"}

#### State & Account Dataflow

| Instruction | Operation | Account | State type | Field | Function path | Binding |
|---|---|---|---|---|---|---|
${stateAccessRows || "| _None_ | | | | | | |"}

#### Token / Asset Flows

| Instruction | Operation | Token program | Source | Destination | Mint | Authority | Amount | Decimals | PDA signed | Path | Completeness |
|---|---|---|---|---|---|---|---|---|---|---|---|
${assetFlowRows || "| _None_ | | | | | | | | | | | |"}

#### Dispatch & Indirect Calls

| Program | Call | Status | Dispatch | Receiver | Candidates | Transforms |
|---|---|---|---|---|---|---|
${dispatchRows || "| _None_ | | | | | | |"}

#### Recursion Components

| Program | Kind | Functions | Call IDs |
|---|---|---|---|
${cycleRows || "| _None_ | | | |"}

#### Compilation Profile

Target: ${escapeMd(profile?.target ?? "not specified")}; mode: ${profile?.mode ?? "normal"}; cfg knowledge: ${profile?.cfgKnowledge ?? "implicit/partial"}; options: ${escapeMd(profile?.cfgOptions.join(", ") || "none")}; debug assertions: ${profile?.debugAssertions === void 0 ? "unknown" : profile.debugAssertions ? "enabled" : "disabled"}.

`;
  const manifestSection = manifest ? `### Audit Manifest

Mode: ${manifest.analysisMode}; manifest format: ${manifest.formatVersion}. Records describe evidence-backed audit scope, not vulnerability findings.

| Programs | Dossiers | Account/state flows | External programs | Incomplete dossiers | Unknown/dynamic calls | Dynamic CPIs | IDL differences |
|---:|---:|---:|---:|---:|---:|---:|---:|
| ${manifest.scope.programs} | ${manifest.scope.dossiers} | ${manifest.scope.stateFlows} | ${manifest.externalPrograms.length} | ${manifest.unresolved.incompleteInstructionDossierIds.length} | ${manifest.unresolved.unknownOrDynamicCallIds.length} | ${manifest.unresolved.dynamicCpiIds.length} | ${manifest.unresolved.idlMismatchItems.length} |

#### Instruction Dossiers

| Program | Instruction | Reachability | Accounts | CPI operations / targets | Cross-package surface | Unresolved evidence | Lifecycle sites | Review |
|---|---|---|---:|---|---|---|---|---:|
${dossierRows || "| _None_ | | | | | | | | |"}

#### Review Queue

| Instruction | Score | Coverage | Why |
|---|---:|---|---|
${manifest.reviewQueue.slice(0, 100).map((item) => `| ${escapeMd(`${item.program}::${item.instruction}`)} | ${item.score} | ${item.complete ? "Resolved" : "Incomplete"} | ${escapeMd(item.reasons.join("; "))} |`).join("\n") || "| _None_ | | | |"}

` : "### Audit Manifest\n\nAudit manifest unavailable.\n\n";
  const languageSection = `### Source Languages

Total source files: ${report.summary.sourceFiles ?? report.summary.rustFiles}; Rust: ${report.summary.rustFiles}; Solang Solidity: ${report.summary.solidityFiles ?? 0}; sBPF assembly: ${report.summary.assemblyFiles ?? 0}.

`;
  const programs = languageSection + manifestSection + witnessSection + `Call classification counts: ${callClasses.map(([name2, value]) => `${humanize(name2)} ${value}`).join("; ") || "none"}.

` + report.programs.map((program) => {
    const instructionRows = program.instructions.map((instruction) => `| ${escapeMd(instruction.name)} | ${instruction.reachableSurface?.functions.length ?? 0} | ${instruction.reachableSurface?.accounts.length ?? 0} | ${instruction.reachableSurface?.cpis.length ?? 0} | ${instruction.reachableSurface?.pdas.length ?? 0} | ${instruction.reachableSurface?.crossPackageSurfaces?.length ?? 0} | ${instruction.reachableSurface?.unresolvedCallDetails?.length ?? 0} | ${instruction.reachableSurface?.reviewComplexity?.score ?? 0} | ${instruction.reachableSurface?.complete === false ? "Incomplete" : "Resolved"} |`).join("\n") || "| _None_ | | | | | | | | |";
    return `### ${escapeMd(program.name)}

- Package kind: ${program.packageKind ?? "unknown"}
- Frameworks: ${program.frameworkEvidence.map((item) => `${item.framework} (${percent(item.confidence)})`).join(", ") || "unknown/custom"}
- Program ID: ${program.identity?.programId ?? "unresolved"}${program.identity?.conflicts.length ? ` (${program.identity.conflicts.length} conflict(s))` : ""}
- Conditional compilation: ${program.conditionalCompilation?.inactiveItems ?? 0} inactive item(s), ${program.conditionalCompilation?.unknownItems ?? 0} unknown item(s); features ${program.conditionalCompilation?.featureKnowledge ?? "unknown"}${program.conditionalCompilation?.enabledFeatures.length ? ` (${program.conditionalCompilation.enabledFeatures.join(", ")})` : ""}
- State types: ${(program.stateTypes ?? []).map((item) => item.name).join(", ") || "none"}
- Capabilities: ${(program.capabilities ?? []).map((item) => item.label).join(", ") || "none"}
- Program review surface: ${program.reviewComplexity?.score ?? 0} \u2014 ${program.reviewComplexity?.level ?? "unscored"}

| Instruction | Reachable functions | Accounts | CPIs | PDAs | Cross packages | Unresolved calls | Review | Coverage |
|---|---:|---:|---:|---:|---:|---:|---:|---|
${instructionRows}`;
  }).join("\n\n");
  return `# Sealevel Insight

Schema: ${report.schemaVersion}  
Generated: ${report.generatedAt}

## Workspace Overview

| Metric | Value |
|---|---:|
| Programs | ${report.programs.length} |
| Cargo packages | ${report.workspaceGraph?.packages.length ?? 0} |
| Resolved Cargo nodes | ${report.workspaceGraph?.resolution?.nodes.length ?? 0} |
| Rust files | ${report.summary.rustFiles} |
| LOC | ${report.summary.loc} |
| nSLOC | ${report.summary.codeLoc} |
| Comments | ${report.summary.commentLines} |
| Functions | ${report.summary.functions} |
| Instructions | ${report.summary.instructions} |
| Accounts | ${report.summary.accounts} |
| CPIs | ${report.summary.cpis} |
| Signed CPIs | ${report.summary.pdaSignedCpis} |
| PDAs | ${report.summary.pdas} |

## Semantic Coverage

| Dimension | Resolved | Total | Coverage |
|---|---:|---:|---:|
${coverage.map(([name2, value]) => `| ${humanize(name2)} | ${value.resolved} | ${value.total} | ${percent(value.percent)} |`).join("\n")}

## Programs

${programs}

## Review Hotspots

| Item | Score | Why |
|---|---:|---|
${(report.reviewProfile ?? []).slice(0, 50).map((item) => `| ${escapeMd(item.label)} | ${item.score} | ${escapeMd(item.reasons.join("; "))} |`).join("\n") || "| _None_ | | |"}

## IDL Reconciliation

${report.idl ? `Matched records: ${report.idl.reconciliations.filter((item) => item.status === "MATCHED").length}; mismatches: ${report.idl.reconciliations.filter((item) => item.status === "MISMATCH").length}; source-only: ${report.idl.reconciliations.filter((item) => item.status === "SOURCE_ONLY").length}; IDL-only: ${report.idl.reconciliations.filter((item) => item.status === "IDL_ONLY").length}.` : "IDL analysis not enabled or no IDL discovered."}

## Diagnostics

${report.diagnostics.map((item) => `- ${escapeMd(item)}`).join("\n") || "No diagnostics."}
`;
}
function standaloneHtml(value) {
  return applyInlineCspHashes(enhanceGraphs(injectLanguageSummary(buildStandaloneHtml(value))));
}
function injectLanguageSummary(html) {
  return html.replace("[['Programs',report.programs?.length||0],['Rust files',s.rustFiles],", "[['Programs',report.programs?.length||0],['Source files',s.sourceFiles??s.rustFiles],['Rust files',s.rustFiles],['Solang files',s.solidityFiles??0],['sBPF assembly',s.assemblyFiles??0],").replace("table(['File','LOC','nSLOC','Comments','Functions','Unsafe'],(report.files||[]).map(f=>[f.uri,f.lines,f.codeLines,f.commentLines,f.functions,f.unsafeBlocks])", "table(['File','Language','LOC','nSLOC','Comments','Functions','Unsafe'],(report.files||[]).map(f=>[f.uri,f.language||'rust',f.lines,f.codeLines,f.commentLines,f.functions,f.unsafeBlocks])");
}
function buildStandaloneHtml(value) {
  const data = JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; __INLINE_CSP__"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sealevel Insight</title><style>:root{color-scheme:light dark;--bg:#101319;--panel:#181d26;--text:#e8edf5;--muted:#aab4c3;--line:#344052;--accent:#60a5fa}*{box-sizing:border-box}body{margin:0;font:14px system-ui,sans-serif;background:var(--bg);color:var(--text)}header{position:sticky;top:0;z-index:2;background:var(--panel);border-bottom:1px solid var(--line);padding:12px 20px;display:flex;gap:16px;align-items:center;flex-wrap:wrap}main{max-width:1400px;margin:auto;padding:20px}button,select,input{font:inherit;background:var(--panel);color:var(--text);border:1px solid var(--line);border-radius:4px;padding:6px 9px}button:focus,input:focus,select:focus{outline:2px solid var(--accent);outline-offset:2px}.tabs button[aria-selected=true]{border-color:var(--accent);color:var(--accent)}section[hidden]{display:none}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.card{background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:12px}.value{font-size:24px;font-weight:700;display:block}table{width:100%;border-collapse:collapse;background:var(--panel)}th,td{text-align:left;padding:8px;border-bottom:1px solid var(--line);vertical-align:top}th{position:sticky;top:58px;background:var(--panel)}.muted{color:var(--muted)}.graph{height:650px;border:1px solid var(--line);overflow:hidden;background:var(--panel)}svg{width:100%;height:100%}.edge{stroke:var(--line);stroke-width:1}.node{fill:var(--accent);stroke:var(--bg);stroke-width:2}.node-label{fill:var(--text);font-size:11px;pointer-events:none}.toolbar{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.scroll{overflow:auto;max-height:70vh}@media(prefers-color-scheme:light){:root{--bg:#f7f8fa;--panel:#fff;--text:#18202d;--muted:#596579;--line:#d5dbe5;--accent:#1565c0}}</style></head><body><header><strong>Sealevel Insight</strong><nav class="tabs" aria-label="Report sections"></nav><input id="search" type="search" aria-label="Filter report tables" placeholder="Filter tables\u2026"></header><main><section id="overview"></section><section id="programs" hidden></section><section id="graphs" hidden></section><section id="files" hidden></section><section id="diagnostics" hidden></section></main><script>const report=${data};const sections=['overview','programs','graphs','files','diagnostics'];const esc=v=>String(v??'');const tabs=document.querySelector('.tabs');sections.forEach((name,i)=>{const b=document.createElement('button');b.textContent=name[0].toUpperCase()+name.slice(1);b.setAttribute('aria-selected',String(i===0));b.onclick=()=>{sections.forEach(s=>document.getElementById(s).hidden=s!==name);tabs.querySelectorAll('button').forEach(x=>x.setAttribute('aria-selected',String(x===b)))};tabs.appendChild(b)});const card=(name,value)=>{const d=document.createElement('div');d.className='card';const v=document.createElement('span');v.className='value';v.textContent=esc(value);d.append(v,document.createTextNode(name));return d};const grid=document.createElement('div');grid.className='grid';const s=report.summary||{};[['Programs',report.programs?.length||0],['Rust files',s.rustFiles],['LOC',s.loc],['nSLOC',s.codeLoc],['Instructions',s.instructions],['Accounts',s.accounts],['CPIs',s.cpis],['PDAs',s.pdas]].forEach(x=>grid.appendChild(card(x[0],x[1]??0)));document.getElementById('overview').append(grid);const table=(headers,rows)=>{const wrap=document.createElement('div');wrap.className='scroll';const t=document.createElement('table');const tr=document.createElement('tr');headers.forEach(h=>{const th=document.createElement('th');th.textContent=h;tr.appendChild(th)});t.appendChild(tr);rows.forEach(row=>{const r=document.createElement('tr');row.forEach(value=>{const td=document.createElement('td');td.textContent=esc(value);r.appendChild(td)});t.appendChild(r)});wrap.appendChild(t);return wrap};const programRows=(report.programs||[]).flatMap(p=>(p.instructions||[]).map(i=>[p.name,i.name,i.reachableSurface?.functions?.length||0,i.reachableSurface?.accounts?.length||0,i.reachableSurface?.cpis?.length||0,i.reachableSurface?.pdas?.length||0,i.reachableSurface?.reviewComplexity?.score||0,i.reachableSurface?.complete===false?'Incomplete':'Resolved']));document.getElementById('programs').append(table(['Program','Instruction','Functions','Accounts','CPIs','PDAs','Review','Coverage'],programRows));document.getElementById('files').append(table(['File','LOC','nSLOC','Comments','Functions','Unsafe'],(report.files||[]).map(f=>[f.uri,f.lines,f.codeLines,f.commentLines,f.functions,f.unsafeBlocks])));document.getElementById('diagnostics').append(table(['Diagnostic'],(report.diagnostics||[]).map(x=>[x])));const graphSection=document.getElementById('graphs');const toolbar=document.createElement('div');toolbar.className='toolbar';const select=document.createElement('select');select.setAttribute('aria-label','Program graph');(report.programs||[]).forEach((p,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=p.name;select.appendChild(o)});const type=document.createElement('select');type.setAttribute('aria-label','Node type filter');['all','program','instruction','function','account','pda','external-program'].forEach(x=>{const o=document.createElement('option');o.value=x;o.textContent=x;type.appendChild(o)});const fit=document.createElement('button');fit.textContent='Fit';toolbar.append(select,type,fit);const holder=document.createElement('div');holder.className='graph';holder.setAttribute('role','img');holder.setAttribute('aria-label','Interactive program architecture graph');graphSection.append(toolbar,holder);let scale=1,offsetX=0,offsetY=0;function renderGraph(){holder.textContent='';const p=(report.programs||[])[Number(select.value)];if(!p)return;let nodes=(p.architecture?.nodes||[]);if(type.value!=='all')nodes=nodes.filter(n=>n.type===type.value);nodes=nodes.slice(0,500);const ids=new Set(nodes.map(n=>n.id));const edges=(p.architecture?.edges||[]).filter(e=>ids.has(e.source)&&ids.has(e.target));const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');const group=document.createElementNS(svg.namespaceURI,'g');group.setAttribute('transform','translate('+offsetX+' '+offsetY+') scale('+scale+')');const positions=new Map();nodes.forEach((n,i)=>{const angle=2*Math.PI*i/Math.max(nodes.length,1);positions.set(n.id,{x:500+Math.cos(angle)*Math.min(420,80+nodes.length*3),y:310+Math.sin(angle)*Math.min(270,60+nodes.length*2)})});edges.forEach(e=>{const a=positions.get(e.source),b=positions.get(e.target);if(!a||!b)return;const l=document.createElementNS(svg.namespaceURI,'line');l.setAttribute('class','edge');l.setAttribute('x1',a.x);l.setAttribute('y1',a.y);l.setAttribute('x2',b.x);l.setAttribute('y2',b.y);group.appendChild(l)});nodes.forEach(n=>{const p=positions.get(n.id);const c=document.createElementNS(svg.namespaceURI,'circle');c.setAttribute('class','node');c.setAttribute('cx',p.x);c.setAttribute('cy',p.y);c.setAttribute('r','6');c.tabIndex=0;const title=document.createElementNS(svg.namespaceURI,'title');title.textContent=n.type+': '+n.label;c.appendChild(title);group.appendChild(c);const label=document.createElementNS(svg.namespaceURI,'text');label.setAttribute('class','node-label');label.setAttribute('x',p.x+9);label.setAttribute('y',p.y+4);label.textContent=n.label;group.appendChild(label)});svg.appendChild(group);svg.onwheel=e=>{e.preventDefault();scale=Math.max(.25,Math.min(4,scale*(e.deltaY<0?1.1:.9)));renderGraph()};holder.appendChild(svg)}select.onchange=renderGraph;type.onchange=renderGraph;fit.onclick=()=>{scale=1;offsetX=0;offsetY=0;renderGraph()};renderGraph();document.getElementById('search').oninput=e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('tbody tr, table tr:not(:first-child)').forEach(row=>row.hidden=!row.textContent.toLowerCase().includes(q))};</script></body></html>`;
}
function applyInlineCspHashes(html) {
  const style = html.match(/<style>([\s\S]*?)<\/style>/)?.[1];
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  if (style === void 0 || script === void 0) throw new Error("Standalone report is missing its inline style or script");
  const hash = (value) => (0, import_node_crypto3.createHash)("sha256").update(value, "utf8").digest("base64");
  return html.replace("__INLINE_CSP__", `style-src 'sha256-${hash(style)}'; script-src 'sha256-${hash(script)}';`);
}
function enhanceGraphs(html) {
  return html.replace("<strong>Sealevel Insight</strong>", "<strong>Sealevel Insight Audit Cockpit</strong>").replace("document.getElementById('programs').append(table(['Program','Instruction','Functions','Accounts','CPIs','PDAs','Review','Coverage'],programRows));", "const audit=document.createElement('h2');audit.textContent='Audit Manifest';const manifest=report.auditManifest;const scopeRows=manifest?[[manifest.analysisMode,manifest.scope.programs,manifest.scope.dossiers,manifest.scope.stateFlows,manifest.externalPrograms.length,manifest.unresolved.incompleteInstructionDossierIds.length,manifest.unresolved.unknownOrDynamicCallIds.length,manifest.unresolved.dynamicCpiIds.length,manifest.unresolved.idlMismatchItems.length]]:[];const dossiers=(report.programs||[]).flatMap(p=>(p.instructionDossiers||[]).map(d=>[p.name,d.name,d.reachability.complete?'Resolved':'Incomplete: '+d.reachability.incompleteReasons.join('; '),d.accounts.length,d.cpis.map(c=>c.operation||c.target||'dynamic').join(', '),d.crossPackageSurfaces.map(x=>x.program+' ('+x.functions.length+' functions, '+x.cpiIds.length+' CPIs)').join('; ')||'none',d.reachability.unresolvedCallDetails.map(x=>x.expression+': '+x.reason).join('; ')||'none',d.pdas.length,'init '+d.semanticSites.initialization.length+'; realloc '+d.semanticSites.realloc.length+'; close '+d.semanticSites.close.length+'; writes '+d.semanticSites.dataMutation.length,d.reviewComplexity?.score||0]));const cfg=(report.programs||[]).map(p=>[p.name,p.conditionalCompilation?.featureKnowledge||'unknown',(p.conditionalCompilation?.enabledFeatures||[]).join(', ')||'none',p.conditionalCompilation?.inactiveItems||0,p.conditionalCompilation?.unknownItems||0,(p.conditionalCompilation?.unknownPredicates||[]).join('; ')||'none']);const dossierHeading=document.createElement('h2');dossierHeading.textContent='Instruction Dossiers';const cfgHeading=document.createElement('h2');cfgHeading.textContent='Conditional Compilation';const instructionHeading=document.createElement('h2');instructionHeading.textContent='Instruction Reachability';document.getElementById('programs').append(audit,table(['Mode','Programs','Dossiers','State flows','External programs','Incomplete','Unknown/dynamic calls','Dynamic CPIs','IDL differences'],scopeRows),cfgHeading,table(['Program','Feature knowledge','Enabled features','Excluded items','Unknown items','Unknown predicates'],cfg),dossierHeading,table(['Program','Instruction','Coverage','Accounts','CPI operations / targets','Cross-package','Unresolved evidence','PDAs','Lifecycle','Review'],dossiers),instructionHeading,table(['Program','Instruction','Functions','Accounts','CPIs','PDAs','Review','Coverage'],programRows));").replace("const instructionHeading=document.createElement('h2');instructionHeading.textContent='Instruction Reachability';", "const stateAccessRows=(report.programs||[]).flatMap(p=>(p.instructionDossiers||[]).flatMap(d=>(d.stateAccesses||[]).map(a=>[p.name+'::'+d.name,a.operation,a.accountName||a.accountExpression,a.stateType||'unknown',a.fieldPath||'whole account',a.functionPath.join(' \u2192 '),a.resolved?'Resolved':'Unresolved account'])));const assetFlowRows=(report.programs||[]).flatMap(p=>(p.instructionDossiers||[]).flatMap(d=>(d.assetFlows||[]).map(f=>[p.name+'::'+d.name,f.operation||'unresolved',f.tokenProgram||'unknown',role(f.source),role(f.destination),role(f.mint),role(f.authority)+(f.authorityType&&f.authorityType!=='unresolved'?' ('+f.authorityType+')':''),f.amount||'unresolved',f.decimals||'n/a',f.pdaSigned?'yes':'no',f.direct?'direct':'via helpers',f.complete?'complete':(f.unresolvedReasons||[]).join('; ')])));const role=r=>!r?'n/a':(r.resolved&&r.accountName?r.accountName:'unresolved ('+r.expression+')');const assetFlowHeading=document.createElement('h2');assetFlowHeading.textContent='Token / Asset Flows';const stateAccessHeading=document.createElement('h2');stateAccessHeading.textContent='State & Account Dataflow';const instructionHeading=document.createElement('h2');instructionHeading.textContent='Instruction Reachability';").replace("dossierHeading,table(['Program','Instruction','Coverage','Accounts','CPI operations / targets','Cross-package','Unresolved evidence','PDAs','Lifecycle','Review'],dossiers),instructionHeading", "dossierHeading,table(['Program','Instruction','Coverage','Accounts','CPI operations / targets','Cross-package','Unresolved evidence','PDAs','Lifecycle','Review'],dossiers),stateAccessHeading,table(['Instruction','Operation','Account','State type','Field','Function path','Binding'],stateAccessRows),assetFlowHeading,table(['Instruction','Operation','Token program','Source','Destination','Mint','Authority','Amount','Decimals','PDA signed','Path','Completeness'],assetFlowRows),instructionHeading").replace("const dossierHeading=document.createElement('h2');", "const witnesses=(report.programs||[]).flatMap(p=>(p.instructionDossiers||[]).flatMap(d=>(d.reachabilityWitnesses||[]).map(w=>[p.name+'::'+d.name,w.targetKind,w.targetProgram+'::'+w.targetId,w.functionPath.join(' \u2192 '),w.callPath.join(' \u2192 ')||'direct'])));const profile=report.compilationProfile;const profileRows=[[profile?.target||'not specified',profile?.mode||'normal',profile?.cfgKnowledge||'implicit/partial',(profile?.cfgOptions||[]).join(', ')||'none',profile?.debugAssertions===undefined?'unknown':profile.debugAssertions?'enabled':'disabled']];const profileHeading=document.createElement('h2');profileHeading.textContent='Compilation Profile';const witnessHeading=document.createElement('h2');witnessHeading.textContent='Reachability Evidence Paths';const dossierHeading=document.createElement('h2');").replace("dossierHeading,table(['Program','Instruction','Coverage'", "profileHeading,table(['Target','Mode','cfg knowledge','cfg options','Debug assertions'],profileRows),witnessHeading,table(['Instruction','Target kind','Target','Function path','Call IDs'],witnesses),dossierHeading,table(['Program','Instruction','Coverage'").replace("const profileHeading=document.createElement('h2');", "const dispatch=(report.programs||[]).flatMap(p=>(p.callGraph?.calls||[]).filter(c=>c.indirect||!['direct','inherent-method'].includes(c.dispatchKind)).map(c=>[p.name,c.sourceExpression||c.callee,c.status||'unknown',c.dispatchKind||'unknown',c.receiverType||'n/a',(c.candidateTargets||[]).join(', ')||'none',(c.resolutionTransforms||[]).join(' \u2192 ')||'none']));const cycles=(report.programs||[]).flatMap(p=>(p.callGraph?.cycles||[]).map(c=>[p.name,c.kind,c.functions.join(' \u2194 '),c.callIds.join(', ')]));const dispatchHeading=document.createElement('h2');dispatchHeading.textContent='Dispatch & Indirect Calls';const cycleHeading=document.createElement('h2');cycleHeading.textContent='Recursion Components';const profileHeading=document.createElement('h2');").replace("profileHeading,table(['Target','Mode','cfg knowledge','cfg options','Debug assertions'],profileRows)", "dispatchHeading,table(['Program','Call','Status','Dispatch','Receiver','Candidates','Transforms'],dispatch),cycleHeading,table(['Program','Kind','Functions','Call IDs'],cycles),profileHeading,table(['Target','Mode','cfg knowledge','cfg options','Debug assertions'],profileRows)").replace("const select=document.createElement('select');select.setAttribute('aria-label','Program graph');", "const mode=document.createElement('select');mode.setAttribute('aria-label','Graph type');[['architecture','Program Architecture'],['instruction-accounts','Instruction \u2192 Accounts'],['calls','Function Call Graph'],['cpis','CPI Graph'],['pdas','PDA Graph'],['cargo','Cargo Dependency Graph'],['state','State Relationship Graph']].forEach(x=>{const o=document.createElement('option');o.value=x[0];o.textContent=x[1];mode.appendChild(o)});const select=document.createElement('select');select.setAttribute('aria-label','Program graph');").replace("toolbar.append(select,type,fit)", "toolbar.append(mode,select,type,fit)").replace("let nodes=(p.architecture?.nodes||[]);if(type.value!=='all')", "const architecture=p.architecture||{nodes:[],edges:[]};let nodes=architecture.nodes||[];let baseEdges=architecture.edges||[];if(mode.value==='instruction-accounts'){nodes=nodes.filter(n=>n.type==='instruction'||n.type==='account');baseEdges=baseEdges.filter(e=>['reads','writes','signs','uses'].includes(e.type))}else if(mode.value==='calls'){nodes=nodes.filter(n=>n.type==='function');baseEdges=baseEdges.filter(e=>e.type==='calls')}else if(mode.value==='cpis'){nodes=nodes.filter(n=>n.type==='instruction'||n.type==='external-program');baseEdges=baseEdges.filter(e=>e.type==='cpi')}else if(mode.value==='pdas'){nodes=nodes.filter(n=>n.type==='instruction'||n.type==='pda');baseEdges=baseEdges.filter(e=>e.type==='derives')}else if(mode.value==='cargo'){nodes=(report.workspaceGraph?.packages||[]).map(x=>({id:x.id,type:'package',label:x.name}));baseEdges=(report.workspaceGraph?.dependencyEdges||[]).map(e=>({source:e.source,target:e.target,type:e.kind}))}else if(mode.value==='state'){const state=(p.stateTypes||[]).map(x=>({id:x.id,type:'state',label:x.name,location:x.location}));const accountNodes=nodes.filter(n=>n.type==='account');nodes=state.concat(accountNodes);baseEdges=(p.accounts||[]).filter(a=>a.stateType&&a.id).map(a=>{const s=(p.stateTypes||[]).find(x=>x.name===a.stateType);return {source:a.id,target:s?.id||a.stateType,type:'state'}})}const graphQuery=document.getElementById('search').value.toLowerCase();if(graphQuery)nodes=nodes.filter(n=>String(n.label).toLowerCase().includes(graphQuery));if(type.value!=='all')").replace("nodes=(report.workspaceGraph?.packages||[]).map(x=>({id:x.id,type:'package',label:x.name}));baseEdges=(report.workspaceGraph?.dependencyEdges||[]).map(e=>({source:e.source,target:e.target,type:e.kind}))", "const cargoResolution=report.workspaceGraph?.resolution;if(cargoResolution){nodes=cargoResolution.nodes.map(x=>({id:x.packageId,type:'package',label:x.name+' '+x.version}));baseEdges=cargoResolution.dependencyEdges.map(e=>({source:e.source,target:e.target,type:e.name}))}else{nodes=(report.workspaceGraph?.packages||[]).map(x=>({id:x.id,type:'package',label:x.name}));baseEdges=(report.workspaceGraph?.dependencyEdges||[]).map(e=>({source:e.source,target:e.target,type:e.kind}))}").replace("const edges=(p.architecture?.edges||[]).filter(e=>ids.has(e.source)&&ids.has(e.target));", "const edges=baseEdges.filter(e=>ids.has(e.source)&&ids.has(e.target));").replace("select.onchange=renderGraph;type.onchange=renderGraph;", "mode.onchange=renderGraph;select.onchange=renderGraph;type.onchange=renderGraph;").replace("holder.appendChild(svg)}select.onchange", "let drag;svg.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY,ox:offsetX,oy:offsetY};svg.setPointerCapture(e.pointerId)};svg.onpointermove=e=>{if(!drag)return;offsetX=drag.ox+e.clientX-drag.x;offsetY=drag.oy+e.clientY-drag.y;group.setAttribute('transform','translate('+offsetX+' '+offsetY+') scale('+scale+')')};svg.onpointerup=()=>{drag=undefined};holder.appendChild(svg)}select.onchange").replace("row.hidden=!row.textContent.toLowerCase().includes(q))};", "row.hidden=!row.textContent.toLowerCase().includes(q));renderGraph()};");
}
function escapeMd(value) {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}
function roleLabel(role) {
  if (!role) return "n/a";
  if (role.resolved && role.accountName) return role.accountName;
  return `unresolved (${role.expression})`;
}
function humanize(value) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (char) => char.toUpperCase());
}
function percent(value) {
  return `${(value <= 1 ? value * 100 : value).toFixed(1)}%`;
}

// src/idl/discovery.ts
init_importMetaShim();
var import_promises3 = require("node:fs/promises");
var path9 = __toESM(require("node:path"));

// src/idl/reconciliation.ts
init_importMetaShim();
var path8 = __toESM(require("node:path"));
function normalizeIdls(value, sourceUri) {
  if (!value || typeof value !== "object") return [];
  const raw = value;
  const programs = raw.kind === "rootNode" ? [object(raw.program), ...records(raw.additionalPrograms)].filter((item) => Object.keys(item).length) : [raw];
  return programs.map((programNode, index) => normalizeIdlProgram(programNode, raw, sourceUri, index)).filter((item) => !!item);
}
function normalizeIdlProgram(programNode, raw, sourceUri, index) {
  const metadata2 = object(programNode.metadata ?? raw.metadata);
  const instructions = records(programNode.instructions).map((item) => ({
    name: nodeName(item),
    discriminator: normalizeDiscriminator(item.discriminator ?? object(item.discriminant).value) ?? codamaDiscriminator(item, "arguments"),
    arguments: records(item.args ?? item.arguments).filter((arg) => arg.defaultValueStrategy !== "omitted").map((arg) => ({ name: nodeName(arg), type: normalizeType(arg.type), docs: strings(arg.docs) })),
    accounts: flattenAccounts(records(item.accounts)),
    returns: normalizeType(item.returns ?? item.returnType),
    docs: strings(item.docs),
    remainingAccounts: normalizeRemainingAccounts(item.remainingAccounts ?? item.remaining_accounts)
  }));
  if (!instructions.length && !("instructions" in programNode)) return void 0;
  const rawAccounts = records(programNode.accounts);
  const accountDefinitions = rawAccounts.map((item) => ({ name: nodeName(item), discriminator: normalizeDiscriminator(item.discriminator) ?? codamaDiscriminator(item, "data") }));
  const explicitTypes = records(programNode.types ?? programNode.definedTypes);
  const legacyAccountTypes = explicitTypes.length ? [] : records(programNode.accounts).filter((item) => item.type !== void 0);
  const codamaAccountTypes = programNode.kind === "programNode" ? rawAccounts.filter((item) => item.data !== void 0).map((item) => ({ ...item, type: codamaAccountData(item) })) : [];
  const result = {
    name: string(programNode.name) ?? string(metadata2.name),
    address: string(programNode.address) ?? string(programNode.programId) ?? string(programNode.publicKey),
    version: string(programNode.version ?? raw.version ?? metadata2.version),
    spec: string(programNode.spec ?? raw.spec ?? metadata2.spec),
    description: string(metadata2.description),
    repository: string(metadata2.repository),
    contact: string(metadata2.contact),
    deployments: stringRecord(metadata2.deployments),
    dependencies: records(metadata2.dependencies).map((item) => ({ name: string(item.name) ?? "unknown", version: string(item.version) ?? "unknown" })),
    docs: strings(programNode.docs),
    instructions,
    accounts: accountDefinitions,
    types: dedupeNamed([...explicitTypes, ...legacyAccountTypes, ...codamaAccountTypes].map((item) => ({ name: nodeName(item), type: item.type, serialization: item.serialization, repr: item.repr, generics: array(item.generics), docs: strings(item.docs) }))),
    events: records(programNode.events).map((item) => ({ name: nodeName(item), discriminator: normalizeDiscriminator(item.discriminator) ?? codamaDiscriminator(item, "data") })),
    errors: records(programNode.errors).map((item) => ({ name: nodeName(item), code: number(item.code), message: string(item.msg ?? item.message) })),
    constants: records(programNode.constants).map((item) => ({ name: nodeName(item), type: normalizeType(item.type), value: normalizeValue(item.value), docs: strings(item.docs) })),
    sourceUri
  };
  result.validationErrors = index === 0 ? validateCurrentSolanaIdl(programNode, result) : [];
  return result;
}
function reconcileIdl(program, idl) {
  const sourceByName = uniqueByNormalizedName(program.instructions);
  const idlByName = uniqueByNormalizedName(idl.instructions);
  const reconciliations = [...sourceByName].sort(([a], [b]) => a.localeCompare(b)).map(([normalized, sourceInstruction]) => ({ status: idlByName.has(normalized) ? "MATCHED" : "SOURCE_ONLY", item: `instruction:${sourceInstruction.name}` }));
  reconciliations.push(...[...idlByName].filter(([name2]) => !sourceByName.has(name2)).sort(([a], [b]) => a.localeCompare(b)).map(([, instruction]) => ({ status: "IDL_ONLY", item: `instruction:${instruction.name}` })));
  for (const sourceInstruction of program.instructions) {
    const idlInstruction = idlByName.get(normalizeName(sourceInstruction.name));
    if (!idlInstruction) continue;
    compareDiscriminator(`instruction:${sourceInstruction.name}.discriminator`, sourceInstruction.discriminator, idlInstruction.discriminator, reconciliations);
    compareArguments(sourceInstruction.name, sourceInstruction.arguments ?? [], idlInstruction.arguments ?? [], reconciliations);
    compareReturnType(sourceInstruction.name, sourceInstruction.returns, idlInstruction.returns, reconciliations);
    compareRemainingAccounts(sourceInstruction.name, sourceInstruction.remainingAccounts, idlInstruction.remainingAccounts, reconciliations);
    const accountIds = program.relationships?.filter((item) => item.instructionId === (sourceInstruction.id ?? sourceInstruction.name)).map((item) => item.accountId) ?? [];
    const sourceAccounts = accountIds.map((id) => (program.accounts ?? []).find((account2) => account2.id === id)).filter((item) => !!item);
    if (!sourceAccounts.length && sourceInstruction.contextType) reconciliations.push({ status: "UNKNOWN", item: `accounts:${sourceInstruction.name}`, details: "Source context exists but source account fields could not be resolved." });
    else compareAccounts(sourceInstruction.name, sourceAccounts, idlInstruction.accounts, reconciliations);
  }
  compareNamed("state", (program.stateTypes ?? []).map((item) => item.name), (idl.accounts ?? []).map((item) => item.name), reconciliations);
  compareNamed("event", (program.events ?? []).map((item) => item.name), (idl.events ?? []).map((item) => item.name), reconciliations);
  compareNamed("error", (program.errors ?? []).map((item) => item.name), (idl.errors ?? []).map((item) => item.name), reconciliations);
  compareStateTypes(program.stateTypes ?? [], idl, reconciliations);
  for (const sourceEvent of program.events ?? []) {
    const idlEvent = idl.events?.find((item) => normalizeName(item.name) === normalizeName(sourceEvent.name));
    if (idlEvent) compareDiscriminator(`event:${sourceEvent.name}.discriminator`, sourceEvent.discriminator, idlEvent.discriminator, reconciliations);
  }
  for (const sourceError of program.errors ?? []) {
    const idlError = idl.errors?.find((item) => normalizeName(item.name) === normalizeName(sourceError.name));
    if (!idlError) continue;
    if (sourceError.code !== void 0 && idlError.code !== void 0 && sourceError.code !== idlError.code) reconciliations.push({ status: "MISMATCH", item: `error:${sourceError.name}.code`, details: `source=${sourceError.code}, IDL=${idlError.code}` });
    if (sourceError.message && idlError.message && sourceError.message !== idlError.message) reconciliations.push({ status: "MISMATCH", item: `error:${sourceError.name}.message`, details: `source=${sourceError.message}, IDL=${idlError.message}` });
  }
  const validationDiagnostics = (idl.validationErrors ?? []).map((message) => `IDL validation: ${message}`);
  for (const [index, message] of validationDiagnostics.entries()) reconciliations.push({ status: "MISMATCH", item: `idl.schema:${index}`, details: message });
  const identityDiagnostic = program.identity?.programId && idl.address && program.identity.programId !== idl.address ? `Program ID mismatch: source ${program.identity.programId}, IDL ${idl.address}` : void 0;
  if (identityDiagnostic) reconciliations.push({ status: "MISMATCH", item: "programId", details: identityDiagnostic });
  const diagnostics = [...validationDiagnostics, ...identityDiagnostic ? [identityDiagnostic] : []];
  return { programs: [idl], reconciliations, diagnostics: [...diagnostics, ...reconciliations.filter((item) => item.status === "MISMATCH").map((item) => `${item.item}: ${item.details ?? "source and IDL differ"}`)] };
}
function reconcileIdls(programs, idls) {
  const reconciliations = [];
  const diagnostics = [];
  for (const idl of idls) {
    const sourceName = idl.name ?? (idl.sourceUri ? path8.basename(idl.sourceUri, ".json") : "");
    const normalizedName = normalizeName(sourceName);
    const matches2 = programs.filter((program2) => idl.address && program2.identity?.programId === idl.address || normalizedName && normalizeName(program2.name) === normalizedName);
    const program = matches2.length === 1 ? matches2[0] : programs.length === 1 ? programs[0] : void 0;
    if (!program) {
      diagnostics.push(`Could not match IDL ${idl.sourceUri ?? idl.address ?? "<unknown>"} to a source program.`);
      reconciliations.push(...idl.instructions.map((instruction) => ({ status: "IDL_ONLY", item: `instruction:${instruction.name}` })));
      continue;
    }
    if (idl.address) {
      const evidence = { description: `IDL program address ${idl.address}`, location: idl.sourceUri ? { uri: idl.sourceUri, startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 } : void 0 };
      program.identity ??= { programId: idl.address, sources: [], conflicts: [] };
      if (program.identity.programId && program.identity.programId !== idl.address) program.identity.conflicts.push(evidence);
      else if (!program.identity.sources.some((item) => item.description === evidence.description)) program.identity.sources.push(evidence);
    }
    const result = reconcileIdl(program, idl);
    reconciliations.push(...result.reconciliations);
    diagnostics.push(...result.diagnostics);
  }
  return { programs: idls, reconciliations, diagnostics: [...new Set(diagnostics)] };
}
function compareArguments(instruction, source, idl, output2) {
  if (source.length !== idl.length) output2.push({ status: "MISMATCH", item: `instruction:${instruction}.arguments`, details: `source count=${source.length}, IDL count=${idl.length}` });
  for (let index = 0; index < Math.min(source.length, idl.length); index++) {
    if (normalizeName(source[index].name) !== normalizeName(idl[index].name)) output2.push({ status: "MISMATCH", item: `instruction:${instruction}.argument:${index}`, details: `source name=${source[index].name}, IDL name=${idl[index].name}` });
    if (source[index].type && idl[index].type && normalizeType(source[index].type) !== normalizeType(idl[index].type)) output2.push({ status: "MISMATCH", item: `instruction:${instruction}.argument:${source[index].name}.type`, details: `source=${source[index].type}, IDL=${idl[index].type}` });
  }
}
function compareReturnType(instruction, source, idl, output2) {
  const sourceUnit = source === "()", idlUnit = !idl || idl === "()";
  if (sourceUnit && idlUnit || !source && !idl) return;
  if (!source && idl) {
    output2.push({ status: "UNKNOWN", item: `instruction:${instruction}.returns`, details: `IDL=${idl}; source adapter did not establish a return-data contract` });
    return;
  }
  if (source && idlUnit) {
    output2.push({ status: "MISMATCH", item: `instruction:${instruction}.returns`, details: `source=${source}, IDL has no return type` });
    return;
  }
  if (normalizeType(source) !== normalizeType(idl)) output2.push({ status: "MISMATCH", item: `instruction:${instruction}.returns`, details: `source=${source}, IDL=${idl}` });
}
function compareRemainingAccounts(instruction, source, idl, output2) {
  const prefix = `instruction:${instruction}.remainingAccounts`;
  if (!!source !== !!idl) {
    output2.push({ status: "MISMATCH", item: prefix, details: source ? "source accepts trailing accounts, IDL has no remainingAccounts contract" : "IDL declares trailing accounts, source context does not accept them" });
    return;
  }
  if (!source || !idl) return;
  for (const [field2, actual, expected] of [["kind", source.kind, idl.kind], ["name", source.name, idl.name], ["min", source.min, idl.min], ["max", source.max, idl.max], ["item.clientType", source.item.clientType, idl.item.clientType], ["item.signer", source.item.signer, idl.item.signer], ["item.writable", source.item.writable, idl.item.writable], ["policy.position", source.policy.position, idl.policy.position], ["policy.order", source.policy.order, idl.policy.order]]) if (actual !== expected) output2.push({ status: "MISMATCH", item: `${prefix}.${field2}`, details: `source=${String(actual)}, IDL=${String(expected)}` });
}
function compareAccounts(instruction, source, idl, output2) {
  if (source.length !== idl.length) output2.push({ status: "MISMATCH", item: `instruction:${instruction}.accounts`, details: `source count=${source.length}, IDL count=${idl.length}` });
  for (let index = 0; index < Math.min(source.length, idl.length); index++) {
    const actual = source[index], expected = idl[index];
    const prefix = `instruction:${instruction}.account:${expected.name}`;
    if (normalizeName(actual.name ?? "") !== normalizeName(expected.name)) output2.push({ status: "MISMATCH", item: `${prefix}.order`, details: `source account ${index}=${actual.name}, IDL account ${index}=${expected.name}` });
    for (const [key, sourceValue, idlValue] of [["signer", !!actual.signer, !!expected.signer], ["writable", !!actual.writable, !!expected.writable], ["optional", !!actual.optional, !!expected.optional]]) if (sourceValue !== idlValue) output2.push({ status: "MISMATCH", item: `${prefix}.${key}`, details: `source ${key}=${sourceValue}, IDL ${key}=${idlValue}` });
    const sourcePda = !!actual.constraints?.some((item) => item.kind === "seeds");
    if (expected.pda !== void 0 && sourcePda !== !!expected.pda) output2.push({ status: "MISMATCH", item: `${prefix}.pda`, details: `source PDA=${sourcePda}, IDL PDA=${!!expected.pda}` });
    if (expected.address) {
      if (!actual.addressExpectation) output2.push({ status: "UNKNOWN", item: `${prefix}.address`, details: `IDL address=${expected.address}; source address validation could not be resolved.` });
      else if (normalizeType(actual.addressExpectation) !== normalizeType(expected.address)) output2.push({ status: "MISMATCH", item: `${prefix}.address`, details: `source=${actual.addressExpectation}, IDL=${expected.address}` });
    }
    if (expected.relations?.length) {
      const sourceRelations = actual.relations?.filter((item) => item.kind === "has-one").map((item) => normalizeName(item.target)).sort();
      const idlRelations = expected.relations.map(normalizeName).sort();
      if (!sourceRelations) output2.push({ status: "UNKNOWN", item: `${prefix}.relations`, details: `IDL relations=${expected.relations.join(", ")}; source relations could not be resolved.` });
      else if (sourceRelations.join(",") !== idlRelations.join(",")) output2.push({ status: "MISMATCH", item: `${prefix}.relations`, details: `source=${sourceRelations.join(", ") || "none"}, IDL=${idlRelations.join(", ")}` });
    }
  }
}
function compareStateTypes(source, idl, output2) {
  const accountByName = new Map((idl.accounts ?? []).map((item) => [normalizeName(item.name), item]));
  const typeByName = new Map((idl.types ?? []).map((item) => [normalizeName(item.name), item]));
  for (const state of source) {
    const idlAccount = accountByName.get(normalizeName(state.name));
    if (idlAccount) compareDiscriminator(`state:${state.name}.discriminator`, state.discriminator, idlAccount.discriminator, output2);
    const idlType = typeByName.get(normalizeName(state.name));
    if (!idlType) continue;
    const fields = typeFields(idlType.type);
    if (!fields) continue;
    const sourceFields = state.fields.filter((item) => !item.idlSkip).map((item) => ({ ...item, name: item.idlName ?? item.name, type: item.idlType ?? item.type }));
    if (sourceFields.length !== fields.length) output2.push({ status: "MISMATCH", item: `state:${state.name}.fields`, details: `source count=${sourceFields.length}, IDL count=${fields.length}` });
    for (let index = 0; index < Math.min(sourceFields.length, fields.length); index++) {
      const actual = sourceFields[index], expected = fields[index];
      const prefix = `state:${state.name}.field:${index}`;
      if (normalizeName(actual.name) !== normalizeName(expected.name)) output2.push({ status: "MISMATCH", item: `${prefix}.name`, details: `source=${actual.name}, IDL=${expected.name}` });
      const sourceType = normalizeType(actual.type), idlFieldType = normalizeType(expected.type);
      if (sourceType && idlFieldType && sourceType !== idlFieldType) output2.push({ status: "MISMATCH", item: `${prefix}.type`, details: `source=${sourceType}, IDL=${idlFieldType}` });
    }
  }
}
function compareDiscriminator(item, source, idl, output2) {
  if (!source || !idl) return;
  const actual = normalizeDiscriminator(source), expected = normalizeDiscriminator(idl);
  if (actual === expected) return;
  output2.push(isResolvedDiscriminator(actual) ? { status: "MISMATCH", item, details: `source=${actual}, IDL=${expected}` } : { status: "UNKNOWN", item, details: `source expression ${source} could not be evaluated locally; IDL=${expected}` });
}
function compareNamed(kind, source, idl, output2) {
  const sourceSet = new Map(source.map((name2) => [normalizeName(name2), name2])), idlSet = new Map(idl.map((name2) => [normalizeName(name2), name2]));
  for (const [key, name2] of sourceSet) if (!idlSet.has(key)) output2.push({ status: "SOURCE_ONLY", item: `${kind}:${name2}` });
  for (const [key, name2] of idlSet) if (!sourceSet.has(key)) output2.push({ status: "IDL_ONLY", item: `${kind}:${name2}` });
}
function flattenAccounts(items, compositePath = []) {
  return items.flatMap((item) => {
    if (Array.isArray(item.accounts)) {
      const group = string(item.name);
      return flattenAccounts(records(item.accounts), group ? [...compositePath, group] : compositePath);
    }
    const defaultValue = object(item.defaultValue);
    const resolver = object(item.resolver);
    return [{ name: nodeName(item), signer: item.isSigner === true || item.signer === true, writable: item.isMut === true || item.isWritable === true || item.writable === true, optional: item.isOptional === true || item.optional === true, address: string(item.address) ?? (defaultValue.kind === "publicKeyValueNode" ? string(defaultValue.publicKey) : void 0) ?? (resolver.kind === "const" ? string(resolver.address) : void 0), pda: item.pda ?? (defaultValue.kind === "pdaValueNode" ? defaultValue : void 0) ?? (resolver.kind === "pda" ? resolver : void 0), relations: strings(item.relations), docs: strings(item.docs), compositePath: compositePath.length ? compositePath : void 0 }];
  });
}
function normalizeRemainingAccounts(value) {
  const contract = object(value);
  if (!Object.keys(contract).length) return void 0;
  const item = object(contract.item), policy = object(contract.policy);
  const min = number(contract.min);
  const max = contract.max === null ? null : number(contract.max);
  if (contract.kind !== "append" || min === void 0 || max === void 0) return void 0;
  const signer = item.signer === true || item.signer === false || item.signer === "input" ? item.signer : "input";
  const writable = item.writable === true || item.writable === false || item.writable === "input" ? item.writable : "input";
  return { kind: "append", name: string(contract.name) ?? "remainingAccounts", min, max, item: { clientType: string(item.clientType) ?? "accountMeta", signer, writable }, policy: { position: policy.position === "afterDeclaredAccounts" ? "afterDeclaredAccounts" : "afterDeclaredAccounts", order: policy.order === "preserveInput" ? "preserveInput" : "preserveInput" } };
}
function records(value) {
  return Array.isArray(value) ? value.filter((item) => !!item && typeof item === "object") : [];
}
function object(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function string(value) {
  return typeof value === "string" ? value : void 0;
}
function number(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function strings(value) {
  const result = Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
  return result.length ? result : void 0;
}
function array(value) {
  return Array.isArray(value) ? value : void 0;
}
function stringRecord(value) {
  const entries = Object.entries(object(value)).filter((entry) => typeof entry[1] === "string" || entry[1] === null);
  return entries.length ? Object.fromEntries(entries) : void 0;
}
function normalizeType(value) {
  if (value === void 0) return void 0;
  if (typeof value === "string") return canonicalPrimitive(value.replace(/\s+/g, ""));
  const type = object(value);
  const kind = string(type.kind);
  if (kind === "numberTypeNode") return string(type.format);
  if (kind === "publicKeyTypeNode") return "Pubkey";
  if (kind === "booleanTypeNode") return "bool";
  if (kind === "bytesTypeNode") return "bytes";
  if (kind === "stringTypeNode") return "String";
  if (kind === "definedTypeLinkNode") return string(type.name)?.replace(/\s+/g, "");
  if (kind === "optionTypeNode") return `Option<${normalizeType(type.item) ?? "unknown"}>`;
  if (kind === "fixedSizeTypeNode" || kind === "sizePrefixTypeNode") return normalizeType(type.type);
  if (kind === "arrayTypeNode") {
    const count = object(type.count);
    const fixed = count.kind === "fixedCountNode" ? number(count.value) : void 0;
    return fixed !== void 0 ? `[${normalizeType(type.item) ?? "unknown"};${fixed}]` : `Vec<${normalizeType(type.item) ?? "unknown"}>`;
  }
  if (kind === "tupleTypeNode") return `(${records(type.items ?? type.children).map((item) => normalizeType(item) ?? "unknown").join(",")})`;
  if ("option" in type) return `Option<${normalizeType(type.option) ?? "unknown"}>`;
  if ("vec" in type) return `Vec<${normalizeType(type.vec) ?? "unknown"}>`;
  if (Array.isArray(type.array)) return `[${normalizeType(type.array[0]) ?? "unknown"};${normalizeArrayLength(type.array[1])}]`;
  if (typeof type.generic === "string") return type.generic;
  const defined = type.defined;
  if (typeof defined === "string") return defined.replace(/\s+/g, "");
  const definition = object(defined);
  if (typeof definition.name === "string") {
    const generics = records(definition.generics).map((item) => item.kind === "type" ? normalizeType(item.type) : string(item.value)).filter((item) => !!item);
    return `${definition.name}${generics.length ? `<${generics.join(",")}>` : ""}`;
  }
  return stableJson(value);
}
function normalizeArrayLength(value) {
  if (typeof value === "number") return String(value);
  return string(object(value).generic) ?? stableJson(value);
}
function canonicalPrimitive(value) {
  return value === "pubkey" ? "Pubkey" : value;
}
function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`).join(",")}}`;
  return JSON.stringify(value);
}
function normalizeName(value) {
  return value.replace(/[-_]/g, "").toLowerCase();
}
function uniqueByNormalizedName(items) {
  return new Map(items.map((item) => [normalizeName(item.name), item]));
}
function normalizeDiscriminator(value) {
  if (value === void 0) return void 0;
  if (Array.isArray(value) && value.every((item) => typeof item === "number")) return `[${value.join(",")}]`;
  const normalized = normalizeType(value);
  return normalized?.replace(/\s+/g, "");
}
function codamaDiscriminator(item, container) {
  const discriminator = records(item.discriminators).find((candidate) => candidate.kind === "fieldDiscriminatorNode" && number(candidate.offset) === 0);
  if (!discriminator) return void 0;
  const fields = container === "arguments" ? records(item.arguments) : records(object(item.data).fields);
  const field2 = fields.find((candidate) => string(candidate.name) === string(discriminator.name));
  return normalizeCodamaValue(field2?.defaultValue);
}
function normalizeCodamaValue(value) {
  const node = object(value);
  if (node.kind === "numberValueNode" && number(node.number) !== void 0) return String(number(node.number));
  if (node.kind === "bytesValueNode" && node.encoding === "base16" && typeof node.data === "string" && /^[0-9a-f]*$/i.test(node.data) && node.data.length % 2 === 0) {
    return `[${[...Buffer.from(node.data, "hex")].join(",")}]`;
  }
  if (node.kind === "bytesValueNode" && Array.isArray(node.data)) return normalizeDiscriminator(node.data);
  return void 0;
}
function codamaAccountData(item) {
  const data = object(item.data);
  if (data.kind !== "structTypeNode") return item.data;
  return { ...data, fields: records(data.fields).filter((field2) => field2.defaultValueStrategy !== "omitted") };
}
function typeFields(value) {
  const type = object(value);
  if (type.kind !== "struct" && type.kind !== "structTypeNode") return void 0;
  return records(type.fields).filter((field2) => field2.defaultValueStrategy !== "omitted").map((field2) => ({ name: nodeName(field2), type: field2.type }));
}
function nodeName(item) {
  return string(item.name) ?? string(item.idlName) ?? "unknown";
}
function normalizeValue(value) {
  return typeof value === "string" ? value : normalizeCodamaValue(value) ?? (value === void 0 ? void 0 : stableJson(value));
}
function dedupeNamed(items) {
  return [...new Map(items.map((item) => [normalizeName(item.name), item])).values()];
}
function validateCurrentSolanaIdl(raw, normalized) {
  if (normalized.spec !== "0.1.0") return [];
  const errors = [];
  const metadata2 = object(raw.metadata);
  if (!normalized.address) errors.push("v0.1.0 requires address.");
  for (const field2 of ["name", "version", "spec"]) if (typeof metadata2[field2] !== "string") errors.push(`v0.1.0 requires metadata.${field2}.`);
  for (const [index, instruction] of records(raw.instructions).entries()) {
    if (!Array.isArray(instruction.discriminator)) errors.push(`instructions[${index}] requires a byte-array discriminator.`);
    if (!Array.isArray(instruction.accounts)) errors.push(`instructions[${index}] requires accounts.`);
    if (!Array.isArray(instruction.args)) errors.push(`instructions[${index}] requires args.`);
  }
  return errors;
}

// src/idl/discovery.ts
var import_node_url4 = require("node:url");
var DEFAULT_IDL_PATTERNS = ["**/target/idl/*.json", "**/idl/**/*.json", "**/generated/idl/**/*.json", "**/codama*.json"];
async function discoverIdlsDetailed(root, patterns = DEFAULT_IDL_PATTERNS) {
  const rootPath = path9.resolve(root);
  const files = await findJson(rootPath);
  const results = [];
  const diagnostics = [];
  const selected = new Set(files.filter((file) => {
    const relative8 = path9.relative(rootPath, file).split(path9.sep).join("/");
    return patterns.some((pattern) => globRegex2(pattern).test(relative8));
  }));
  for (const configFile of files.filter((file) => path9.basename(file) === "codama.json")) {
    try {
      const config = JSON.parse(await (0, import_promises3.readFile)(configFile, "utf8"));
      if (object2(config).kind === "rootNode") {
        selected.add(configFile);
        continue;
      }
      const references = [string2(object2(config).idl), ...strings2(object2(config).additionalIdls)].filter((item) => !!item);
      for (const reference of references) {
        const resolved = path9.resolve(path9.dirname(configFile), reference);
        const relativeConfig = path9.relative(rootPath, configFile).split(path9.sep).join("/");
        const relativeToRoot = path9.relative(rootPath, resolved);
        if (relativeToRoot === ".." || relativeToRoot.startsWith(`..${path9.sep}`) || path9.isAbsolute(relativeToRoot)) {
          diagnostics.push({ id: `diagnostic:idl:codama:outside:${relativeConfig}:${reference}`, category: "idl", severity: "warning", message: `Codama IDL reference is outside the analysis root and was not read: ${reference}`, location: location(configFile) });
        } else if (!files.includes(resolved)) {
          diagnostics.push({ id: `diagnostic:idl:codama:missing:${relativeConfig}:${reference}`, category: "idl", severity: "warning", message: `Codama IDL reference does not exist or is not a JSON file: ${reference}`, location: location(configFile) });
        } else selected.add(resolved);
      }
    } catch (error) {
      diagnostics.push({ id: `diagnostic:idl:codama:malformed:${path9.relative(rootPath, configFile)}`, category: "idl", severity: "warning", message: `Malformed Codama configuration ${path9.relative(rootPath, configFile)}: ${error instanceof Error ? error.message : String(error)}`, location: location(configFile) });
    }
  }
  for (const file of [...selected].sort()) {
    const relative8 = path9.relative(rootPath, file).split(path9.sep).join("/");
    const sourceUri = (0, import_node_url4.pathToFileURL)(file).href;
    try {
      const normalized = normalizeIdls(JSON.parse(await (0, import_promises3.readFile)(file, "utf8")), sourceUri);
      if (normalized.length) {
        results.push(...normalized.map((program) => ({ ...program, sourceUri })));
        diagnostics.push(...normalized.flatMap((program) => (program.validationErrors ?? []).map((message, index) => ({ id: `diagnostic:idl:schema:${relative8}:${program.name ?? "unknown"}:${index}`, category: "idl", severity: "warning", message: `IDL ${relative8}${program.name ? ` (${program.name})` : ""}: ${message}`, location: { uri: sourceUri, startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 } }))));
      } else diagnostics.push({ id: `diagnostic:idl:unsupported:${relative8}`, category: "idl", severity: "warning", message: `JSON file matched IDL patterns but was not a recognized IDL: ${relative8}`, location: { uri: sourceUri, startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 } });
    } catch (error) {
      diagnostics.push({ id: `diagnostic:idl:malformed:${relative8}`, category: "idl", severity: "error", message: `Malformed IDL ${relative8}: ${error instanceof Error ? error.message : String(error)}`, location: { uri: sourceUri, startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 } });
    }
  }
  return { programs: results.sort((a, b) => a.sourceUri.localeCompare(b.sourceUri) || (a.name ?? "").localeCompare(b.name ?? "")), diagnostics };
}
async function findJson(root) {
  const pruned = new Set(DEFAULT_PRUNED_DIRECTORIES);
  pruned.delete("target");
  return walkFiles(root, {
    prunedDirectories: pruned,
    shouldDescend: (relative8) => {
      const parts2 = relative8.split("/");
      const target = parts2.lastIndexOf("target");
      return target < 0 || parts2.length === target + 1 || parts2[target + 1] === "idl";
    },
    includeFile: (_relative, name2) => name2.endsWith(".json")
  });
}
function globRegex2(pattern) {
  let expression = "^";
  const normalized = pattern.replace(/\\/g, "/");
  for (let index = 0; index < normalized.length; index++) {
    const char = normalized[index];
    if (char === "*" && normalized[index + 1] === "*") {
      index++;
      if (normalized[index + 1] === "/") {
        index++;
        expression += "(?:.*/)?";
      } else expression += ".*";
    } else if (char === "*") expression += "[^/]*";
    else if (char === "?") expression += "[^/]";
    else expression += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`${expression}$`, "i");
}
function object2(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function string2(value) {
  return typeof value === "string" ? value : void 0;
}
function strings2(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}
function location(file) {
  return { uri: (0, import_node_url4.pathToFileURL)(file).href, startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 };
}

// src/discovery/cargoGraph.ts
init_importMetaShim();
var path10 = __toESM(require("node:path"));
var import_toml = __toESM(require_toml());
function buildCargoGraph(manifests, sourceByDirectory) {
  const diagnostics = [];
  const parsed = manifests.map((manifest, index) => parseManifest(manifest, index, diagnostics));
  const manifestByRoot = new Map(parsed.map((item) => [normalizePath(path10.dirname(item.uri)), item]));
  const workspaceRoots = parsed.filter((item) => item.data.workspace).sort((a, b) => normalizePath(path10.dirname(a.uri)).localeCompare(normalizePath(path10.dirname(b.uri))));
  const workspaces = workspaceRoots.map((item) => makeWorkspace(item, manifestByRoot, diagnostics));
  const packages = parsed.filter((item) => item.data.package).map((item) => makePackage(item, sourceByDirectory, workspaceFor(item, workspaceRoots), diagnostics));
  diagnoseDuplicatePackages(packages, diagnostics);
  const packageIds = new Map(packages.map((item) => [normalizePath(item.rootUri), item.id]));
  for (const pkg of packages) {
    for (const dependency of pkg.dependencies) {
      if (!dependency.path) continue;
      const targetRoot = normalizePath(path10.resolve(pkg.rootUri, dependency.path));
      dependency.path = targetRoot;
      dependency.internalPackageId = packageIds.get(targetRoot);
      if (!dependency.internalPackageId) diagnostics.push(diagnostic("cargo", "warning", `Path dependency ${dependency.name} from ${pkg.name} does not resolve to a discovered package: ${targetRoot}`, pkg.manifestUri, `path-dependency:${pkg.id}:${dependency.name}`));
    }
  }
  const dependencyEdges = [];
  for (const pkg of packages) for (const dep of pkg.dependencies) dependencyEdges.push(dep.internalPackageId ? { source: pkg.id, target: dep.internalPackageId, kind: "internal" } : { source: pkg.id, target: `external:${dep.packageName ?? dep.name}`, kind: "external" });
  return { workspaces, packages: packages.sort((a, b) => a.id.localeCompare(b.id)), dependencyEdges: dedupeEdges(dependencyEdges), diagnostics };
}
function parseManifest(manifest, index, diagnostics) {
  try {
    return { ...manifest, data: (0, import_toml.parse)(manifest.text) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    diagnostics.push(diagnostic("cargo", "error", `Invalid Cargo manifest TOML: ${message}`, manifest.uri, `manifest:${index}`));
    return { ...manifest, data: {}, error: message };
  }
}
function makeWorkspace(item, manifests, diagnostics) {
  const root = normalizePath(path10.dirname(item.uri));
  const workspace = object3(item.data.workspace);
  const excluded = expandPatterns(root, strings3(workspace.exclude), manifests, diagnostics, item.uri, false);
  const declaredMembers = strings3(workspace.members);
  const members = expandPatterns(root, declaredMembers, manifests, diagnostics, item.uri, true).filter((member) => !excluded.includes(member));
  if (item.data.package && !excluded.includes(root) && !members.includes(root)) members.push(root);
  const defaultPatterns = strings3(workspace["default-members"]);
  const defaultMembers = defaultPatterns.length ? expandPatterns(root, defaultPatterns, manifests, diagnostics, item.uri, true).filter((member) => members.includes(member)) : [...members];
  return { rootUri: root, manifestUri: item.uri, members: [...new Set(members)].sort(), excluded: [...new Set(excluded)].sort(), defaultMembers: [...new Set(defaultMembers)].sort(), resolver: stringValue(workspace.resolver) };
}
function makePackage(item, sources, workspace, diagnostics) {
  const data = item.data;
  const packageData = object3(data.package);
  const workspacePackage = object3(object3(workspace?.data.workspace).package);
  const inherited = (key) => isWorkspaceTrue(packageData[key]) ? workspacePackage[key] : packageData[key];
  const name2 = stringValue(inherited("name")) ?? path10.basename(path10.dirname(item.uri));
  const rootUri = normalizePath(path10.dirname(item.uri));
  const source = (sources.get(rootUri) ?? []).join("\n");
  const workspaceDependencies = object3(object3(workspace?.data.workspace).dependencies);
  const dependencies = dependencyEntries(data).map((entry) => makeDependency(entry.name, entry.value, entry.kind, entry.targetCondition, workspaceDependencies, item, diagnostics, !!workspace));
  const targets = cargoTargets(data, name2, rootUri, item.fileUris ?? [], diagnostics, item.uri);
  const features = Object.entries(object3(data.features)).map(([feature, value]) => ({ name: feature, enables: strings3(value), evidence: [{ description: `Cargo feature ${feature}` }] })).sort((a, b) => a.name.localeCompare(b.name));
  const evidence = [];
  if (hasEntrypoint(source)) evidence.push({ description: "program entrypoint syntax" });
  if (hasProgramDependency(dependencies)) evidence.push({ description: "Solana/framework dependency" });
  if (targets.some((target) => target.crateTypes.includes("cdylib"))) evidence.push({ description: "cdylib crate target" });
  const kind = classify(name2, packageData, targets, dependencies, source);
  return {
    id: `cargo:${rootUri}`,
    name: name2,
    manifestUri: item.uri,
    rootUri,
    kind,
    confidence: kind === "solana-program" ? 0.95 : kind === "unknown" ? 0.4 : 0.8,
    evidence,
    dependencies,
    targets,
    features,
    version: stringValue(inherited("version")),
    edition: stringValue(inherited("edition")),
    buildScript: typeof packageData.build === "string" ? normalizePath(path10.resolve(rootUri, packageData.build)) : packageData.build === false ? void 0 : item.fileUris?.some((file) => normalizePath(file) === normalizePath(path10.join(rootUri, "build.rs"))) ? normalizePath(path10.join(rootUri, "build.rs")) : void 0
  };
}
function workspaceFor(item, roots) {
  const packageRoot = normalizePath(path10.dirname(item.uri));
  return roots.filter((root) => isWithin(packageRoot, normalizePath(path10.dirname(root.uri)))).sort((a, b) => path10.dirname(b.uri).length - path10.dirname(a.uri).length)[0];
}
function cargoTargets(data, packageName2, root, files, diagnostics, manifestUri) {
  const targets = [];
  const add = (kind, raw, fallbackName, fallbackPath) => {
    const spec = object3(raw);
    const targetPath = normalizePath(path10.resolve(root, stringValue(spec.path) ?? fallbackPath));
    const knownFiles = files.map(normalizePath);
    const valid = !knownFiles.length || knownFiles.includes(targetPath);
    if (!valid) diagnostics.push(diagnostic("cargo", "warning", `Cargo ${kind} target path does not exist in discovered files: ${targetPath}`, manifestUri, `target:${kind}:${targetPath}`));
    targets.push({ name: stringValue(spec.name) ?? fallbackName, kind, path: targetPath, crateTypes: strings3(spec["crate-type"]), requiredFeatures: strings3(spec["required-features"]), valid, evidence: [{ description: `Cargo ${kind} target` }] });
  };
  if (data.lib || files.some((file) => normalizePath(file) === normalizePath(path10.join(root, "src/lib.rs")))) add("lib", data.lib, packageName2.replace(/-/g, "_"), "src/lib.rs");
  const arrays = [["bin", "bin", "src/main.rs"], ["example", "example", "examples/main.rs"], ["test", "test", "tests/main.rs"], ["bench", "bench", "benches/main.rs"]];
  for (const [key, kind, fallback] of arrays) for (const item of arrayObjects(data[key])) add(kind, item, packageName2, fallback);
  if (!targets.length && files.some((file) => normalizePath(file) === normalizePath(path10.join(root, "src/main.rs")))) add("bin", {}, packageName2, "src/main.rs");
  if (files.some((file) => normalizePath(file) === normalizePath(path10.join(root, "build.rs")))) add("build-script", { name: "build-script", path: "build.rs" }, "build-script", "build.rs");
  return targets.sort((a, b) => `${a.kind}:${a.name}`.localeCompare(`${b.kind}:${b.name}`));
}
function dependencyEntries(data) {
  const direct = sections(data);
  const targeted = Object.entries(object3(data.target)).flatMap(([condition, target]) => sections(object3(target), condition));
  return [...direct, ...targeted];
}
function sections(data, targetCondition) {
  return ["dependencies", "dev-dependencies", "build-dependencies"].flatMap((section) => Object.entries(object3(data[section])).map(([name2, value]) => ({ name: name2, value, kind: section === "dependencies" ? "normal" : section === "dev-dependencies" ? "dev" : "build", targetCondition })));
}
function makeDependency(name2, value, kind, targetCondition, workspaceDependencies, manifest, diagnostics, containingWorkspace) {
  const original = object3(value);
  const workspaceInherited = original.workspace === true;
  const inheritedValue = workspaceInherited ? workspaceDependencies[name2] : void 0;
  if (workspaceInherited && inheritedValue === void 0) diagnostics.push(diagnostic("cargo", containingWorkspace ? "warning" : "info", containingWorkspace ? `Dependency ${name2} uses workspace = true but is absent from [workspace.dependencies].` : `Workspace-inherited dependency ${name2} could not be resolved because no containing workspace manifest was analyzed.`, manifest.uri, `workspace-dependency:${name2}`));
  const inherited = object3(inheritedValue);
  const spec = { ...inherited, ...original };
  delete spec.workspace;
  return {
    name: name2,
    packageName: stringValue(spec.package),
    version: typeof value === "string" ? value : typeof inheritedValue === "string" ? inheritedValue : stringValue(spec.version),
    path: stringValue(spec.path),
    optional: spec.optional === true,
    features: strings3(spec.features),
    defaultFeatures: spec["default-features"] !== false,
    workspaceInherited,
    targetCondition,
    kind,
    evidence: [{ description: `Cargo ${kind} dependency${targetCondition ? ` for ${targetCondition}` : ""}${workspaceInherited ? " inherited from workspace" : ""}` }]
  };
}
function classify(name2, packageData, targets, dependencies, source) {
  if (/(^|[-_])(test|tests|bench|benches)$/.test(name2) || targets.length > 0 && targets.every((target) => target.kind === "test" || target.kind === "bench")) return "test";
  if (/generated|codegen|client-gen/i.test(name2)) return "generated";
  if (targets.some((target) => target.kind === "build-script") && !targets.some((target) => target.kind === "lib" || target.kind === "bin")) return "build-tool";
  const entrypoint = hasEntrypoint(source);
  const cdylib = targets.some((target) => target.crateTypes.includes("cdylib"));
  const solana = hasProgramDependency(dependencies);
  if (entrypoint || cdylib && solana) return "solana-program";
  if (solana && targets.some((target) => target.kind === "lib")) return "program-library";
  if (targets.some((target) => target.kind === "bin") || /client|cli|sdk/i.test(name2)) return "client";
  if (targets.some((target) => target.kind === "lib") || Object.keys(packageData).length) return "library";
  return "unknown";
}
function expandPatterns(root, patterns, manifests, diagnostics, manifestUri, reportMissing) {
  return patterns.flatMap((pattern) => {
    const regex = globRegex3(normalizePath(path10.resolve(root, pattern)));
    const matches2 = [...manifests.keys()].filter((candidate) => regex.test(candidate));
    if (reportMissing && !matches2.length) diagnostics.push(diagnostic("cargo", "warning", `Cargo workspace member pattern matched no discovered manifest: ${pattern}`, manifestUri, `member:${pattern}`));
    return matches2;
  });
}
function globRegex3(pattern) {
  let expression = "^";
  for (let index = 0; index < pattern.length; index++) {
    const char = pattern[index];
    if (char === "*" && pattern[index + 1] === "*") {
      index++;
      expression += ".*";
    } else if (char === "*") expression += "[^/]*";
    else if (char === "?") expression += "[^/]";
    else expression += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`${expression}$`);
}
function diagnoseDuplicatePackages(packages, diagnostics) {
  const identities = /* @__PURE__ */ new Map();
  for (const pkg of packages) {
    const key = `${pkg.name}@${pkg.version ?? "<unknown>"}`;
    identities.set(key, [...identities.get(key) ?? [], pkg]);
  }
  for (const [identity, matches2] of identities) if (matches2.length > 1) diagnostics.push(diagnostic("cargo", "warning", `Duplicate Cargo package identity ${identity}: ${matches2.map((item) => item.manifestUri).join(", ")}`, matches2[0].manifestUri, `duplicate:${identity}`));
}
function diagnostic(category, severity, message, uri, key) {
  return { id: `diagnostic:${category}:${key}`, category, severity, message, location: { uri, startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 } };
}
function object3(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function arrayObjects(value) {
  return Array.isArray(value) ? value.map(object3) : value && typeof value === "object" ? [object3(value)] : [];
}
function strings3(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : typeof value === "string" ? [value] : [];
}
function stringValue(value) {
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : void 0;
}
function isWorkspaceTrue(value) {
  return object3(value).workspace === true;
}
function hasProgramDependency(deps) {
  return deps.some((dep) => /^(anchor-lang|pinocchio|solana-program|solana_program|solana-account-info|solana_account_info|solana-program-entrypoint|solana_program_entrypoint|steel|quasar-lang)$/i.test(dep.packageName ?? dep.name));
}
function hasEntrypoint(source) {
  return /entrypoint!|program_entrypoint!|lazy_program_entrypoint!|process_instruction|process_entrypoint|#\[program\]/.test(source);
}
function isWithin(candidate, root) {
  const relative8 = path10.relative(root, candidate);
  return relative8 === "" || relative8 !== ".." && !relative8.startsWith(`..${path10.sep}`) && !path10.isAbsolute(relative8);
}
function normalizePath(value) {
  return path10.resolve(value).split(path10.sep).join("/");
}
function dedupeEdges(edges) {
  return [...new Map(edges.map((edge) => [`${edge.source}:${edge.target}:${edge.kind}`, edge])).values()].sort((a, b) => `${a.source}:${a.target}`.localeCompare(`${b.source}:${b.target}`));
}

// src/discovery/programIdentity.ts
init_importMetaShim();
var import_promises4 = require("node:fs/promises");
var path11 = __toESM(require("node:path"));
var import_toml2 = __toESM(require_toml());
var import_node_url5 = require("node:url");
async function enrichProgramIdentities(root, programs) {
  const diagnostics = [];
  for (const file of await findConfigs(root)) {
    try {
      const raw = (0, import_toml2.parse)(await (0, import_promises4.readFile)(file, "utf8"));
      if (path11.basename(file).toLowerCase() === "anchor.toml") applyAnchor(raw, file, programs, diagnostics);
    } catch (error) {
      diagnostics.push({ id: `diagnostic:identity:config:${file}`, category: "identity", severity: "error", message: `Invalid framework config ${file}: ${error instanceof Error ? error.message : String(error)}`, location: location2(file) });
    }
  }
  return diagnostics;
}
function applyAnchor(raw, file, programs, diagnostics) {
  const sections2 = object4(raw.programs);
  for (const [cluster, entries] of Object.entries(sections2)) {
    for (const [name2, value] of Object.entries(object4(entries))) {
      if (typeof value !== "string") continue;
      const matches2 = programs.filter((program2) => normalize(program2.name) === normalize(name2));
      if (matches2.length !== 1) {
        diagnostics.push({ id: `diagnostic:identity:anchor:${cluster}:${name2}`, category: "identity", severity: "warning", message: `Anchor.toml program ${name2} (${cluster}) could not be matched uniquely to a Cargo program.`, location: location2(file) });
        continue;
      }
      const program = matches2[0];
      const evidence = { description: `Anchor.toml ${cluster} program address ${value}`, location: location2(file) };
      program.identity ??= { programId: value, sources: [], conflicts: [] };
      if (program.identity.programId && program.identity.programId !== value) {
        program.identity.conflicts.push(evidence);
        diagnostics.push({ id: `diagnostic:identity:conflict:${program.name}:${cluster}`, category: "identity", severity: "warning", message: `Program ID conflict for ${program.name}: source ${program.identity.programId}, Anchor.toml ${value}`, location: location2(file) });
      } else if (!program.identity.sources.some((item) => item.description === evidence.description)) program.identity.sources.push(evidence);
    }
  }
}
async function findConfigs(directory) {
  return walkFiles(directory, { includeFile: (_relative, name2) => /^(?:Anchor|Quasar)\.toml$/i.test(name2) });
}
function object4(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function normalize(value) {
  return value.replace(/[-_]/g, "").toLowerCase();
}
function location2(file) {
  return { uri: (0, import_node_url5.pathToFileURL)(file).href, startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 };
}

// src/core/cache.ts
init_importMetaShim();
var import_node_crypto4 = require("node:crypto");
var import_promises5 = require("node:fs/promises");
var path12 = __toESM(require("node:path"));
var CACHE_FORMAT_VERSION = "8";
var ANALYZER_VERSION_FINGERPRINT = "rust-grammar:0.24.0;solidity-grammar:1.2.13;web-tree-sitter:0.25.10;source-frontends:2;framework-adapters:0.7.0;audit-products:2;reachability:2;witness-paths:1;compilation-profile:1;dispatch-indirect-calls:2;state-account-dataflow:2.1;pinocchio-account-view:0.11;quasar-framework-abi:2;steel-semantics:2;token-asset-flow:2";
function analysisCacheKey(sources, config) {
  const hash = (0, import_node_crypto4.createHash)("sha256");
  hash.update(`sealevel-insight-cache:${CACHE_FORMAT_VERSION}:schema-${SCHEMA_VERSION}
`);
  hash.update(`${ANALYZER_VERSION_FINGERPRINT}
`);
  for (const source of [...sources].sort((a, b) => a.uri.localeCompare(b.uri))) {
    hash.update(source.uri);
    hash.update("\0");
    hash.update(source.source);
    hash.update("\0");
  }
  hash.update(stableJson2(sources[0]?.workspaceGraph ?? {}));
  hash.update(stableJson2(config));
  return hash.digest("hex");
}
async function readAnalysisCache(directory, key) {
  try {
    const value = JSON.parse(await (0, import_promises5.readFile)(path12.join(directory, `${key}.json`), "utf8"));
    return value?.schemaVersion === SCHEMA_VERSION && value.tool?.version === TOOL_VERSION ? value : void 0;
  } catch (error) {
    if (error.code === "ENOENT" || error instanceof SyntaxError) return void 0;
    throw error;
  }
}
async function writeAnalysisCache(directory, key, report) {
  await (0, import_promises5.mkdir)(directory, { recursive: true });
  await (0, import_promises5.writeFile)(path12.join(directory, `${key}.json`), JSON.stringify(report));
}
async function clearAnalysisCache(directory) {
  await (0, import_promises5.rm)(directory, { recursive: true, force: true });
}
function stableJson2(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson2).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson2(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

// src/core/policy.ts
init_importMetaShim();
function evaluatePolicy(report, policy) {
  const failures = [];
  if (policy.maxFunctionComplexity !== void 0) {
    for (const program of report.programs) for (const fn of program.functions) if (fn.complexity > policy.maxFunctionComplexity) failures.push(`${program.name}::${fn.name} complexity ${fn.complexity} exceeds ${policy.maxFunctionComplexity}`);
  }
  if (policy.maxInstructionReviewComplexity !== void 0) for (const program of report.programs) for (const instruction of program.instructions) {
    const score = instruction.reachableSurface?.reviewComplexity?.score ?? 0;
    if (score > policy.maxInstructionReviewComplexity) failures.push(`${program.name}::${instruction.name} review complexity ${score} exceeds ${policy.maxInstructionReviewComplexity}`);
  }
  if (policy.noParseErrors && report.analysisDiagnostics?.some((item) => item.category === "parse" && item.severity === "error")) failures.push("Report contains Rust parse errors.");
  if (policy.noIdlMismatches && report.idl?.reconciliations.some((item) => item.status === "MISMATCH")) failures.push("Report contains source/IDL mismatches.");
  if (policy.minimumSemanticCoverage !== void 0) {
    for (const [name2, ratio] of Object.entries(report.coverage ?? {})) if (ratio && typeof ratio === "object" && "percent" in ratio && typeof ratio.percent === "number") {
      const actual = ratio.percent > 1 ? ratio.percent / 100 : ratio.percent;
      if (actual < policy.minimumSemanticCoverage) failures.push(`${name2} coverage ${(actual * 100).toFixed(1)}% is below ${(policy.minimumSemanticCoverage * 100).toFixed(1)}%.`);
    }
  }
  return { passed: !failures.length, failures };
}

// src/discovery/cargoMetadata.ts
init_importMetaShim();
var path13 = __toESM(require("node:path"));
function applyCargoMetadata(graph, value, sourceUri) {
  const metadata2 = object5(value);
  const resolve7 = object5(metadata2.resolve);
  if (metadata2.version !== 1 || !Array.isArray(metadata2.packages) || !Array.isArray(resolve7.nodes)) {
    graph.diagnostics.push(diagnostic2(sourceUri, "Saved Cargo metadata must use --format-version 1 and contain packages plus resolve.nodes."));
    return graph;
  }
  const packages = arrayObjects2(metadata2.packages);
  const packageById = new Map(packages.map((item) => [string3(item.id), item]).filter((item) => !!item[0]));
  const nodes = arrayObjects2(resolve7.nodes).flatMap((node) => {
    const packageId = string3(node.id);
    if (!packageId) return [];
    const pkg = packageById.get(packageId);
    const dependencies = arrayObjects2(node.deps).flatMap((dep) => {
      const dependencyId = string3(dep.pkg);
      const name2 = string3(dep.name);
      if (!dependencyId || !name2) return [];
      const kinds = arrayObjects2(dep.dep_kinds).map((item) => ({ kind: dependencyKind(item.kind), target: string3(item.target) })).map((item) => item.target ? item : { kind: item.kind });
      return [{ name: name2, packageId: dependencyId, kinds: kinds.length ? kinds : [{ kind: "normal" }] }];
    });
    return [{ packageId, name: string3(pkg?.name) ?? packageName(packageId), version: string3(pkg?.version) ?? packageVersion(packageId), source: string3(pkg?.source), features: strings4(node.features).sort(), dependencies }];
  }).sort((a, b) => a.packageId.localeCompare(b.packageId));
  const dependencyEdges = nodes.flatMap((node) => node.dependencies.map((dep) => ({ source: node.packageId, target: dep.packageId, name: dep.name, kinds: dep.kinds })));
  graph.resolution = {
    sourceUri,
    formatVersion: 1,
    workspaceRoot: string3(metadata2.workspace_root),
    targetDirectory: string3(metadata2.target_directory),
    rootPackageId: string3(resolve7.root),
    workspaceMembers: strings4(metadata2.workspace_members).sort(),
    workspaceDefaultMembers: strings4(metadata2.workspace_default_members).sort(),
    nodes,
    dependencyEdges
  };
  const metadataByManifest = new Map(packages.flatMap((pkg) => {
    const manifest = string3(pkg.manifest_path);
    const id = string3(pkg.id);
    return manifest && id ? [[normalize3(manifest), { id }]] : [];
  }));
  const nodeById = new Map(nodes.map((node) => [node.packageId, node]));
  for (const pkg of graph.packages) {
    const resolved = metadataByManifest.get(normalize3(pkg.manifestUri));
    if (!resolved) continue;
    pkg.metadataId = resolved.id;
    pkg.enabledFeatures = nodeById.get(resolved.id)?.features ?? [];
    const node = nodeById.get(resolved.id);
    for (const dependency of pkg.dependencies) {
      const names = new Set([dependency.name, dependency.packageName].filter((item) => !!item).flatMap((item) => [item, item.replace(/-/g, "_")]));
      const ids = node?.dependencies.filter((item) => names.has(item.name) || names.has(item.name.replace(/-/g, "_"))).map((item) => item.packageId) ?? [];
      if (ids.length) dependency.resolvedPackageIds = [...new Set(ids)].sort();
    }
  }
  return graph;
}
function object5(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function arrayObjects2(value) {
  return Array.isArray(value) ? value.map(object5) : [];
}
function string3(value) {
  return typeof value === "string" && value.length ? value : void 0;
}
function strings4(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}
function normalize3(value) {
  return path13.normalize(value).replace(/\\/g, "/");
}
function dependencyKind(value) {
  return value === "dev" || value === "build" ? value : "normal";
}
function packageName(id) {
  return id.split(/[ #]/).at(-2) ?? id;
}
function packageVersion(id) {
  return id.split(/[ #]/).at(-1) ?? "unknown";
}
function diagnostic2(sourceUri, message) {
  return { id: `diagnostic:cargo:metadata:${sourceUri}`, category: "cargo", severity: "error", message, location: { uri: sourceUri, startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 } };
}

// src/cli.ts
async function main() {
  const args2 = process.argv.slice(2);
  if (args2.includes("--help") || args2.includes("-h")) {
    process.stdout.write(usage());
    return;
  }
  const command = args2[0] ?? "analyze";
  if (command === "cache") {
    if (args2[1] !== "clear") throw new Error(`cache requires the clear subcommand.

${usage()}`);
    const root2 = path14.resolve(positional(args2.slice(2))[0] ?? ".");
    await clearAnalysisCache(cacheDirectory(root2));
    process.stdout.write(`Cleared ${cacheDirectory(root2)}
`);
    return;
  }
  if (command === "baseline") {
    if (args2[1] !== "save") throw new Error(`baseline requires the save subcommand.

${usage()}`);
    const root2 = path14.resolve(positional(args2.slice(2))[0] ?? ".");
    const report2 = await analyze(root2, args2);
    const target = path14.resolve(option(args2, "--output") ?? path14.join(root2, ".sealevel-insight-baseline.json"));
    await (0, import_promises6.writeFile)(target, JSON.stringify(portableReport(report2, root2), null, 2));
    process.stdout.write(`Saved baseline ${target}
`);
    return;
  }
  if (!["analyze", "scope", "diff"].includes(command)) throw new Error(`Unknown command: ${command}

${usage()}`);
  const format = option(args2, "--format") ?? "json";
  if (!["json", "markdown", "html"].includes(format)) throw new Error(`Unsupported format: ${format}. Expected json, markdown, or html.`);
  if (command === "diff") {
    const paths = positional(args2.slice(1));
    if (paths.length < 2) throw new Error(`diff requires two report paths.

${usage()}`);
    const before = JSON.parse(await (0, import_promises6.readFile)(path14.resolve(paths[0]), "utf8"));
    const after = JSON.parse(await (0, import_promises6.readFile)(path14.resolve(paths[1]), "utf8"));
    await output(diffReports(before, after), format, option(args2, "--output"));
    return;
  }
  const root = path14.resolve(positional(args2.slice(1))[0] ?? ".");
  if (command === "scope") {
    const config = hasAny(args2, ["--include", "--exclude", "--include-tests", "--include-generated", "--include-duplicates", "--scope-file"]) ? { include: options(args2, "--include"), exclude: options(args2, "--exclude"), includeTests: args2.includes("--include-tests"), includeGenerated: args2.includes("--include-generated"), includeDuplicates: args2.includes("--include-duplicates"), scopeFile: option(args2, "--scope-file") } : void 0;
    await output(await buildScope(root, config), format, option(args2, "--output"));
    return;
  }
  const report = await analyze(root, args2);
  const policy = policyFrom(args2);
  const policyResult = evaluatePolicy(report, policy);
  if (!policyResult.passed) {
    report.diagnostics.push(...policyResult.failures.map((message) => `Policy: ${message}`));
    if (!process.exitCode) process.exitCode = 2;
  }
  if (args2.includes("--fail-on-analysis-error") && report.analysisDiagnostics?.some((item) => item.severity === "error")) process.exitCode = 1;
  await output(portableReport(report, root), format, option(args2, "--output"));
}
async function analyze(root, args2) {
  const config = {
    include: options(args2, "--include").length ? options(args2, "--include") : DEFAULT_SOURCE_GLOBS,
    exclude: options(args2, "--exclude").length ? options(args2, "--exclude") : ["**/.git/**", "**/target/**", "**/node_modules/**", "**/dist/**", "**/dist-test/**", "**/.sealevel-insight-cache/**"],
    includeTests: args2.includes("--include-tests"),
    enableIdl: args2.includes("--enable-idl") || !args2.includes("--disable-idl"),
    cache: !args2.includes("--no-cache"),
    maxFileSize: numberOption(args2, "--max-file-size", 5242880),
    cargoMetadata: option(args2, "--cargo-metadata"),
    target: option(args2, "--target"),
    cfgOptions: options(args2, "--cfg"),
    cfgKnowledge: args2.includes("--cfg-complete") ? "complete" : "partial",
    compilationMode: args2.includes("--test-profile") ? "test" : "normal",
    debugAssertions: args2.includes("--debug-assertions") ? true : args2.includes("--no-debug-assertions") ? false : void 0
  };
  const collected = await sourceFiles(root, config);
  const cacheKey = analysisCacheKey(collected.sources, config);
  const cacheDir = cacheDirectory(root);
  if (config.cache) {
    const cached = await readAnalysisCache(cacheDir, cacheKey);
    if (cached) return cached;
  }
  const wasm = path14.resolve(__dirname, "tree-sitter-rust.wasm");
  const solidityWasm = path14.resolve(__dirname, "tree-sitter-solidity.wasm");
  const runtime = path14.resolve(__dirname, "tree-sitter.wasm");
  const report = await analyzeSources(collected.sources, wasm, runtime, void 0, { compilationProfile: compilationProfile(config), solidityWasmPath: solidityWasm });
  report.workspace = { name: path14.basename(root), roots: [root] };
  report.analysisDiagnostics?.push(...collected.diagnostics);
  report.diagnostics.push(...collected.diagnostics.map((item) => item.message));
  const identityDiagnostics = await enrichProgramIdentities(root, report.programs);
  report.analysisDiagnostics?.push(...identityDiagnostics);
  report.diagnostics.push(...identityDiagnostics.map((item) => item.message));
  if (config.enableIdl) {
    const idlDiscovery = await discoverIdlsDetailed(root);
    report.analysisDiagnostics?.push(...idlDiscovery.diagnostics);
    report.diagnostics.push(...idlDiscovery.diagnostics.map((item) => item.message));
    if (idlDiscovery.programs.length) {
      report.idl = reconcileIdls(report.programs, idlDiscovery.programs);
      for (const program of report.programs) program.capabilities = buildCapabilities(program, true);
    }
  }
  refreshAuditProducts(report);
  if (config.cache) await writeAnalysisCache(cacheDir, cacheKey, report);
  return report;
}
async function sourceFiles(root, config) {
  const excludePatterns = config.exclude.map(globRegex4);
  const files = await walkFiles(root, { shouldDescend: (relative8) => !excludePatterns.some((pattern) => pattern.test(`${relative8}/__sealevel_insight__`)) });
  const diagnostics = [];
  const selectedFiles = [];
  for (const file of files.filter((file2) => sourceLanguage(file2))) {
    const relative8 = path14.relative(root, file).split(path14.sep).join("/");
    if (!config.include.some((pattern) => globRegex4(pattern).test(relative8)) || config.exclude.some((pattern) => globRegex4(pattern).test(relative8)) || !config.includeTests && /(^|\/)(tests?|benches?)(\/|$)/.test(relative8)) continue;
    const size = (await (0, import_promises6.stat)(file)).size;
    if (size > config.maxFileSize) {
      diagnostics.push({ id: `diagnostic:analysis:oversized:${relative8}`, category: "analysis", severity: "info", message: `Skipped oversized source file ${relative8} (${size} bytes > ${config.maxFileSize}).`, location: { uri: (0, import_node_url6.pathToFileURL)(file).href, startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 } });
      continue;
    }
    selectedFiles.push(file);
  }
  const manifestFiles = files.filter((file) => path14.basename(file) === "Cargo.toml" && !config.exclude.some((pattern) => globRegex4(pattern).test(path14.relative(root, file).split(path14.sep).join("/"))));
  const manifests = await mapConcurrent(manifestFiles, 8, async (file) => ({ uri: file, text: await (0, import_promises6.readFile)(file, "utf8"), fileUris: files.filter((candidate) => candidate === path14.join(path14.dirname(file), "build.rs") || candidate.startsWith(`${path14.dirname(file)}${path14.sep}`)) }));
  const sourceByDirectory = /* @__PURE__ */ new Map();
  for (const file of selectedFiles.filter((file2) => sourceLanguage(file2) === "rust")) {
    const directory = nearestRoot(file, manifestFiles.map(path14.dirname));
    if (directory) sourceByDirectory.set(directory, [...sourceByDirectory.get(directory) ?? [], await (0, import_promises6.readFile)(file, "utf8")]);
  }
  const workspaceGraph = buildCargoGraph(manifests, sourceByDirectory);
  if (config.cargoMetadata) {
    const metadataPath = path14.resolve(config.cargoMetadata);
    try {
      applyCargoMetadata(workspaceGraph, JSON.parse(await (0, import_promises6.readFile)(metadataPath, "utf8")), metadataPath);
    } catch (error) {
      workspaceGraph.diagnostics.push({ id: `diagnostic:cargo:metadata:${metadataPath}`, category: "cargo", severity: "error", message: `Could not load saved Cargo metadata ${metadataPath}: ${error instanceof Error ? error.message : String(error)}`, location: { uri: metadataPath, startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 } });
    }
  }
  const sources = await mapConcurrent(selectedFiles, 8, async (file) => {
    const language = sourceLanguage(file);
    const directory = nearestRoot(file, [...sourceByDirectory.keys()]);
    const pkg = workspaceGraph.packages.find((item) => item.rootUri === directory);
    const fallbackPackage = language === "rust" ? path14.basename(path14.dirname(path14.dirname(file))) : path14.basename(path14.dirname(file));
    return { uri: (0, import_node_url6.pathToFileURL)(file).href, source: await (0, import_promises6.readFile)(file, "utf8"), language, packageName: pkg?.name ?? fallbackPackage, packageId: pkg?.id, packageRoot: pkg?.rootUri, packageKind: language === "rust" ? pkg?.kind : "solana-program", packageEvidence: pkg?.evidence, manifestUri: pkg?.manifestUri, workspaceGraph };
  });
  return { sources, diagnostics };
}
async function output(value, format, target) {
  const text = format === "markdown" ? isWorkspaceReport(value) ? markdownReport(value) : `\`\`\`json
${JSON.stringify(value, null, 2)}
\`\`\`` : format === "html" ? standaloneHtml(value) : JSON.stringify(value, null, 2);
  if (target) await (0, import_promises6.writeFile)(path14.resolve(target), text);
  else process.stdout.write(`${text}
`);
}
function isWorkspaceReport(value) {
  return !!value && typeof value === "object" && "schemaVersion" in value && "summary" in value && "programs" in value;
}
function option(args2, name2) {
  const index = args2.indexOf(name2);
  if (index < 0) return void 0;
  const value = args2[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name2} requires a value.`);
  return value;
}
function options(args2, name2) {
  const values = [];
  for (let index = 0; index < args2.length; index++) if (args2[index] === name2) {
    const value = args2[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${name2} requires a value.`);
    values.push(value);
    index++;
  }
  return values;
}
function positional(args2) {
  const values = [];
  for (let index = 0; index < args2.length; index++) {
    if (args2[index].startsWith("--")) {
      if (valueOptions.has(args2[index])) index++;
      continue;
    }
    values.push(args2[index]);
  }
  return values;
}
var valueOptions = /* @__PURE__ */ new Set(["--format", "--output", "--include", "--exclude", "--scope-file", "--max-file-size", "--cargo-metadata", "--target", "--cfg", "--max-function-complexity", "--max-instruction-review-complexity", "--minimum-semantic-coverage"]);
function numberOption(args2, name2, fallback) {
  const value = option(args2, name2);
  if (value === void 0) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${name2} requires a non-negative number.`);
  return parsed;
}
function policyFrom(args2) {
  return { maxFunctionComplexity: optionalNumber(args2, "--max-function-complexity"), maxInstructionReviewComplexity: optionalNumber(args2, "--max-instruction-review-complexity"), minimumSemanticCoverage: optionalNumber(args2, "--minimum-semantic-coverage"), noParseErrors: args2.includes("--no-parse-errors"), noIdlMismatches: args2.includes("--no-idl-mismatches") };
}
function optionalNumber(args2, name2) {
  return args2.includes(name2) ? numberOption(args2, name2, 0) : void 0;
}
function hasAny(args2, names) {
  return names.some((name2) => args2.includes(name2));
}
function cacheDirectory(root) {
  return path14.join(root, ".sealevel-insight-cache");
}
function compilationProfile(config) {
  if (!config.target && !config.cfgOptions.length && config.cfgKnowledge === "partial" && config.compilationMode === "normal" && config.debugAssertions === void 0) return void 0;
  return { target: config.target, mode: config.compilationMode, debugAssertions: config.debugAssertions, cfgOptions: [...new Set(config.cfgOptions)].sort(), cfgKnowledge: config.cfgKnowledge, evidence: [{ description: `CLI compilation profile${config.target ? ` target ${config.target}` : ""}; ${config.cfgKnowledge} cfg option set` }] };
}
function nearestRoot(file, roots) {
  return roots.filter((root) => file.startsWith(`${root}${path14.sep}`)).sort((a, b) => b.length - a.length)[0];
}
function globRegex4(pattern) {
  let expression = "^";
  const normalized = pattern.replace(/\\/g, "/");
  for (let index = 0; index < normalized.length; index++) {
    const char = normalized[index];
    if (char === "*" && normalized[index + 1] === "*") {
      index++;
      if (normalized[index + 1] === "/") {
        index++;
        expression += "(?:.*/)?";
      } else expression += ".*";
    } else if (char === "*") expression += "[^/]*";
    else if (char === "?") expression += "[^/]";
    else expression += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`${expression}$`);
}
function usage() {
  return `Sealevel Insight

Usage:
  sealevel-insight analyze [root] [options]
  sealevel-insight scope [root] [options]
  sealevel-insight diff <before.json> <after.json> [--format json|markdown|html] [--output file]
  sealevel-insight baseline save [root] [--output baseline.json]
  sealevel-insight cache clear [root]

Analysis options:
  --format json|markdown|html  --output file  --include glob  --exclude glob
  --include-tests  --enable-idl  --disable-idl  --no-cache  --max-file-size bytes
  --cargo-metadata path        Import saved cargo metadata --format-version 1 JSON
  --target triple-or-label     Record the target without guessing compiler cfg values
  --cfg option                 Add an explicit rustc cfg option (repeatable)
  --cfg-complete               Treat the supplied cfg set as complete; absent options are false
  --test-profile               Enable cfg(test)
  --debug-assertions  --no-debug-assertions
  --fail-on-analysis-error  --no-parse-errors  --no-idl-mismatches
  --max-function-complexity n  --max-instruction-review-complexity n
  --minimum-semantic-coverage ratio
`;
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
//# sourceMappingURL=cli.js.map
