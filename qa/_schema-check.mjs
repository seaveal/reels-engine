import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const schema = JSON.parse(readFileSync(resolve(root, 'reel.schema.json'), 'utf-8'));
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

function check(label, spec, expectValid) {
  const ok = validate(spec);
  const pass = ok === expectValid;
  console.log(`${pass ? 'PASS' : 'FAIL'} [${label}] valid=${ok} (expected ${expectValid})`);
  if (!pass && validate.errors) for (const e of validate.errors) console.log(`     ${e.instancePath||'/'} ${e.message}`);
  return pass;
}
let all = true;
for (const dir of ['examples', 'reconstructions-top15']) {
  for (const f of readdirSync(resolve(root, dir))) {
    if (!f.endsWith('.json') || f.endsWith('.meta.json')) continue;
    const spec = JSON.parse(readFileSync(resolve(root, dir, f), 'utf-8'));
    all = check(`${dir}/${f}`, spec, true) && all;
  }
}
all = check('short-no-layout', { slug:'x', reveal:'all_at_once', segments:[{role:'title',text:'A'}] }, true) && all;
all = check('short-layout-short', { slug:'x', layout:'short', reveal:'staggered', segments:[{role:'title',text:'A'},{role:'cta',text:'B'}] }, true) && all;
all = check('long-valid', { slug:'long-x', layout:'long', pages:[ { lines:[ {text:'HOOK CAPS', role:'heading'}, {text:'corps un'}, {text:'corps [[deux]]'} ] }, { lines:[ {text:'page deux ligne'}, {text:'LISEZ LA LÉGENDE', role:'cta'} ], hold_s: 12 } ] }, true) && all;
all = check('long-reject-segments', { slug:'x', layout:'long', pages:[{lines:[{text:'a'}]}], segments:[{role:'title',text:'A'}] }, false) && all;
all = check('long-reject-no-pages', { slug:'x', layout:'long' }, false) && all;
all = check('long-reject-empty-page', { slug:'x', layout:'long', pages:[{lines:[]}] }, false) && all;
all = check('mixed-reject', { slug:'x', layout:'short', reveal:'all_at_once', pages:[{lines:[{text:'a'}]}] }, false) && all;
all = check('long-reject-bad-role', { slug:'x', layout:'long', pages:[{lines:[{text:'a', role:'title'}]}] }, false) && all;
// Fidélité visuelle additive : size / align / arrow + markup gras **
all = check('long-size-align-arrow', { slug:'x', layout:'long', pages:[ { lines:[ {text:'[[**punch**]]', size:'xl', align:'justify'}, {text:'corps **gras** et [[jaune]]', align:'left'} ], arrow:true }, { lines:[{text:'LISEZ LA LÉGENDE', role:'cta', size:'s', align:'center'}] } ] }, true) && all;
all = check('long-reject-bad-size', { slug:'x', layout:'long', pages:[{lines:[{text:'a', size:'xxl'}]}] }, false) && all;
all = check('long-reject-bad-align', { slug:'x', layout:'long', pages:[{lines:[{text:'a', align:'middle'}]}] }, false) && all;
all = check('long-reject-bad-arrow', { slug:'x', layout:'long', pages:[{lines:[{text:'a'}], arrow:'yes'}] }, false) && all;
// Couleur de ligne (titre full-jaune) : valeurs valides + rejet
all = check('long-color-yellow-title', { slug:'x', layout:'long', pages:[{lines:[{text:'TITRE FULL JAUNE', role:'heading', color:'yellow'}, {text:'corps', color:'white'}]}] }, true) && all;
all = check('long-reject-bad-color', { slug:'x', layout:'long', pages:[{lines:[{text:'a', color:'rouge'}]}] }, false) && all;
console.log(all ? '\nALL SCHEMA CHECKS PASS' : '\nSOME SCHEMA CHECKS FAILED');
process.exit(all ? 0 : 1);
