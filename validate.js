// validate.js
// Run with: node validate.js path/to/source/

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const cp = require('child_process');

const schemaMap = {
  '.keyman-touch-layout': 'D:/Github/keyman/common/schemas/keyman-touch-layout/keyman-touch-layout.spec.json',
  '.kps': 'D:/Github/keyman/common/schemas/kps/kps.schema.json',
  '.kvk': 'D:/Github/keyman/common/schemas/kvk/kvk.schema.json',
  '.kvks': 'D:/Github/keyman/common/schemas/kvks/kvks.schema.json',
  '.keyboard_info': 'D:/Github/keyman/common/schemas/keyboard-info/keyboard_info.schema.json',
  '.kpj': 'D:/Github/keyman/common/schemas/kpj/kpj.schema.json'
};

const sourcePath = process.argv[2];
if (!sourcePath || !fs.existsSync(sourcePath)) {
  console.error('Usage: node validate.js path/to/source/');
  process.exit(1);
}

const ajv = new Ajv();
const results = [];

// JSON schema validation
for (const file of fs.readdirSync(sourcePath)) {
  const ext = path.extname(file);
  const schemaPath = schemaMap[ext];
  if (schemaPath && fs.existsSync(path.join(sourcePath, file))) {
    const fullPath = path.join(sourcePath, file);
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const parsed = JSON.parse(content);
      const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
      const validate = ajv.compile(schema);
      const valid = validate(parsed);
      if (!valid) {
        results.push({ file, type: 'schema', errors: validate.errors });
      }
    } catch (err) {
      results.push({ file, type: 'json', error: err.message });
    }
  }
}

// KMN compilation using kmc
const kmnFiles = fs.readdirSync(sourcePath).filter(f => f.endsWith('.kmn'));
if (kmnFiles.length === 1) {
  const kmnPath = path.join(sourcePath, kmnFiles[0]);
  const kmcPath = 'C:/Program Files (x86)/Keyman/Keyman Developer/kmc.cmd';
  const command = `"${kmcPath}" build "${kmnPath}"`;

  try {
    cp.execSync(command, { stdio: 'pipe' });
  } catch (error) {
    const output = error.stderr?.toString() || error.stdout?.toString() || 'Unknown error';
    const lines = output.split('\n').filter(line => line.trim());
    results.push({ file: kmnFiles[0], type: 'kmc', errors: lines });
  }
}

console.log(JSON.stringify(results, null, 2));
