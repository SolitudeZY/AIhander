const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const plugin = require('../build/peace-antd-compat');

test('real legacy modal error branch calls the supported Ant Design message API', async () => {
  const filename = require.resolve('@peace/components/lib/modal');
  const source = fs.readFileSync(filename, 'utf8');
  const compiled = babel.transformSync(source, {
    filename, babelrc: false, configFile: false,
    presets: [[require.resolve('@babel/preset-env'), { targets: { node: 'current' } }], require.resolve('@babel/preset-react')],
    plugins: [plugin],
  }).code;
  const notifications = []; let exposed; let completion;
  const react = { useState: value => [value, () => {}], forwardRef: render => render,
    useImperativeHandle: (ref, factory) => { exposed = factory(); }, createElement: () => null };
  const exports = {};
  vm.runInNewContext(compiled, { exports, window: { innerHeight: 800 }, console: { log() {} }, require(name) {
    if (name === 'react') return react;
    if (name === 'antd') return { Modal() {}, message: { error: error => notifications.push(error) } };
    throw new Error('Unexpected dependency '+name);
  } });
  exports.default({ content: null }, {});
  const expected = new Error('duplicate model');
  exposed.funcOk({ form: { validateFields: () => ({ then: fn => { completion = Promise.resolve().then(() => fn({})); } }) }, extraDeal: () => { throw expected; } });
  await completion;
  assert.deepEqual(notifications, [expected]);
});

test('compatibility transform is scoped to the dependency and enabled in both webpack configurations', () => {
  const source = "import { Message } from 'antd';";
  const result = babel.transformSync(source, { filename: path.resolve(__dirname, '../client/src/example.js'), babelrc: false, configFile: false, plugins: [plugin] });
  assert.match(result.code, /\{ Message \}/);
  for (const filename of ['webpack.config.js','webpack.config.prod.js']) {
    const config = require('../'+filename);
    const rule = config.module.rules.find(rule => rule.use?.loader === 'babel-loader');
    assert.ok(rule.use.options.plugins.includes(require.resolve('../build/peace-antd-compat')));
  }
});

test('application and legacy component XLSX imports can write and read a real workbook', () => {
  const files = [
    path.resolve(__dirname, '../client/src/components/export-data.jsx'),
    path.resolve(__dirname, '../client/src/sections/analysis/components/export-data.jsx'),
    require.resolve('@peace/components/lib/export-data'),
    require.resolve('@peace/components/lib/export-and-import'),
  ];
  for (const filename of files) {
    const source = fs.readFileSync(filename, 'utf8');
    const ast = babel.parseSync(source, { filename, babelrc: false, configFile: false, parserOpts: { plugins: ['jsx'] } });
    const declaration = ast.program.body.find(node => node.type === 'ImportDeclaration' && node.source.value === 'xlsx');
    assert.ok(declaration, filename);
    const probe = source.slice(declaration.start, declaration.end) + `
      export function roundTrip() {
        const book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['设备', '版本'], ['RK3576', '2.0']]), 'models');
        const bytes = XLSX.write(book, {type:'buffer',bookType:'xlsx'});
        const saved = XLSX.read(bytes, {type:'buffer'});
        return XLSX.utils.sheet_to_json(saved.Sheets.models, {header:1});
      }
    `;
    const compiled = babel.transformSync(probe, { filename, babelrc: false, configFile: false,
      presets: [[require.resolve('@babel/preset-env'), { targets: { node: 'current' } }]], plugins: [plugin] }).code;
    const exports = {};
    vm.runInNewContext(compiled, { exports, require: name => {
      assert.equal(name, 'xlsx'); return require('xlsx');
    } });
    assert.equal(JSON.stringify(exports.roundTrip()), JSON.stringify([['设备', '版本'], ['RK3576', '2.0']]));
  }
});
