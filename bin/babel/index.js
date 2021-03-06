#!/usr/bin/env node

var commander = require("commander");
var transform = require("../../lib/babel/transformation");
var kebabCase = require("lodash/string/kebabCase");
var File      = require("../../lib/babel/transformation/file");
var util      = require("../../lib/babel/util");
var each      = require("lodash/collection/each");
var keys      = require("lodash/object/keys");
var fs        = require("fs");

each(File.options, function (option, key) {
  if (option.hidden) return;

  var arg = kebabCase(key);

  if (option.type !== "boolean") {
    arg += ` [${option.type || "string"}]`;
  }

  if (option.type === "boolean" && option.default === true) {
    arg = `no-${key}`;
  }

  arg = `--${arg}`;

  if (option.shorthand) {
    arg = `-${option.shorthand}, ${arg}`;
  }

  commander.option(arg, option.description);
})

commander.option("-w, --watch", "Recompile files on changes");
commander.option("-o, --out-file [out]", "Compile all input files into a single file");
commander.option("-d, --out-dir [out]", "Compile an input directory of modules into an output directory");
commander.option("-D, --copy-files", "When compiling a directory copy over non-compilable files");

commander.on("--help", function () {
  var outKeys = function (title, obj) {
    console.log("  " + title + ":");
    console.log();

    each(keys(obj).sort(), function (key) {
      if (key[0] === "_") return;

      if (obj[key].optional) key = `[${key}]`;

      console.log("    - " + key);
    });

    console.log();
  };

  outKeys("Transformers", transform.transformers);
  outKeys("Module formatters", transform.moduleFormatters);
});

var pkg = require("../../package.json");
commander.version(pkg.version);
commander.usage("[options] <files ...>");
commander.parse(process.argv);

//

var errors = [];

var filenames = commander.args;

each(filenames, function (filename) {
  if (!fs.existsSync(filename)) {
    errors.push(filename + " doesn't exist");
  }
});

if (commander.outDir && !filenames.length) {
  errors.push("filenames required for --out-dir");
}

if (commander.outFile && commander.outDir) {
  errors.push("cannot have --out-file and --out-dir");
}

if (commander.watch) {
  if (!commander.outFile && !commander.outDir) {
    errors.push("--watch requires --out-file or --out-dir");
  }

  if (!filenames.length) {
    errors.push("--watch requires filenames");
  }
}

if (commander.sourceMaps) {
  if (!commander.outFile && !commander.outDir) {
    errors.push("--source-maps requires --out-file or --out-dir");
  }
}

if (errors.length) {
  console.error(errors.join(". "));
  process.exit(2);
}

//

exports.opts = {};

each(File.options, function (opt, key) {
  exports.opts[key] = commander[key];
});

var fn;

if (commander.outDir) {
  fn = require("./dir");
} else {
  fn = require("./file");
}

fn(commander, filenames, exports.opts);
