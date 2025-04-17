// Keyman Keyboard Validator VSCode Extension
// File: extension.js

const vscode = require('vscode');
const cp = require('child_process');
const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const { DOMParser } = require('@xmldom/xmldom');
const validator = require('xsd-schema-validator');

let diagnosticCollection;

function activate(context) {
  diagnosticCollection = vscode.languages.createDiagnosticCollection('keyman');
  context.subscriptions.push(diagnosticCollection);

  let validateCommand = vscode.commands.registerCommand('keyman.validateKeyboard', () => {
    vscode.window.showInformationMessage('Running manual Keyman keyboard validation...');
    runValidation();
  });
  context.subscriptions.push(validateCommand);

  vscode.workspace.onDidSaveTextDocument((document) => {
    const sourceFolder = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, 'source');
    if (document.uri.fsPath.startsWith(sourceFolder)) {
      vscode.window.showInformationMessage(`Detected save in source folder: ${document.fileName}`);
      runValidation();
    }
  });
}

function validateJsonAgainstSchema(filePath, schemaMap) {
  const ext = path.extname(filePath);
  const baseName = path.basename(filePath);
  const matchingSchema = Object.entries(schemaMap).find(([key]) => baseName.endsWith(key));
  if (!matchingSchema) return null;

  const [fileType, schemaPath] = matchingSchema;
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
  const ajv = new Ajv();
  const validate = ajv.compile(schema);
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(content);

  const diagnostics = [];
  const valid = validate(parsed);
  if (!valid && validate.errors) {
    validate.errors.forEach(error => {
      const message = `Schema Error: ${error.instancePath} ${error.message}`;
      diagnostics.push(new vscode.Diagnostic(
        new vscode.Range(0, 0, 0, 1),
        message,
        vscode.DiagnosticSeverity.Error
      ));
    });
  }
  return diagnostics;
}

function validateXmlAgainstSchema(filePath, schemaPath) {
  const xmlContent = fs.readFileSync(filePath, 'utf-8');
  const diagnostics = [];

  validator.validateXML(xmlContent, schemaPath, (err, result) => {
    if (err) {
      const errorMessage = err.message || 'Unknown XML validation error';
      const match = errorMessage.match(/line (\d+), column (\d+)/i);
      const line = match ? parseInt(match[1], 10) - 1 : 0;
      const column = match ? parseInt(match[2], 10) - 1 : 0;

      diagnostics.push(new vscode.Diagnostic(
        new vscode.Range(line, column, line, column + 1),
        `XML Validation Error: ${errorMessage}`,
        vscode.DiagnosticSeverity.Error
      ));
    } else if (!result.valid) {
      result.messages.forEach((message) => {
        const match = message.match(/line (\d+), column (\d+)/i);
        const line = match ? parseInt(match[1], 10) - 1 : 0;
        const column = match ? parseInt(match[2], 10) - 1 : 0;

        diagnostics.push(new vscode.Diagnostic(
          new vscode.Range(line, column, line, column + 1),
          `XML Validation Error: ${message}`,
          vscode.DiagnosticSeverity.Error
        ));
      });
    }
  });

  return diagnostics;
}

function runValidation() {
  diagnosticCollection.clear();

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage('No workspace folder found.');
    return;
  }

  const projectPath = workspaceFolders[0].uri.fsPath;
  const sourcePath = path.join(projectPath, 'source');
  vscode.window.showInformationMessage(`Validating source folder at: ${sourcePath}`);

  const schemaMap = {
    '.keyman-touch-layout': 'D:/Github/keyman/common/schemas/keyman-touch-layout/keyman-touch-layout.spec.json',
    '.kps': 'D:/Github/keyman/common/schemas/kps/kps.schema.json',
    '.kvk': 'D:/Github/keyman/common/schemas/kvk/kvk.schema.json',
    '.kvks': 'D:/Github/keyman/common/schemas/kvks/kvks.schema.json',
    '.keyboard_info': 'D:/Github/keyman/common/schemas/keyboard-info/keyboard_info.schema.json',
    '.kpj': 'D:/Github/keyman/common/schemas/kpj/kpj.schema.json'
  };

  const files = fs.readdirSync(sourcePath).filter(file => Object.keys(schemaMap).some(ext => file.endsWith(ext)));

  files.forEach(file => {
    const fullPath = path.join(sourcePath, file);
    const ext = path.extname(file);
    const schemaPath = schemaMap[ext];

    try {
      let diagnostics = [];
      if (['.kps', '.kvk', '.kvks'].includes(ext)) {
        diagnostics = validateXmlAgainstSchema(fullPath, schemaPath);
      } else {
        diagnostics = validateJsonAgainstSchema(fullPath, schemaMap);
      }

      if (diagnostics && diagnostics.length > 0) {
        const uri = vscode.Uri.file(fullPath);
        diagnosticCollection.set(uri, diagnostics);
        vscode.window.showErrorMessage(`${file} failed schema validation.`);
      } else {
        vscode.window.showInformationMessage(`${file} is schema-compliant.`);
      }
    } catch (err) {
      const errorMessage = err.message || 'Unknown error';
      vscode.window.showErrorMessage(`${file} validation failed: ${errorMessage}`);
    }
  });

  // Compile .kmn file using kmc
  const kmnFiles = fs.readdirSync(sourcePath).filter(file => file.endsWith('.kmn'));
  if (kmnFiles.length === 1) {
    const fullKmnPath = path.join(sourcePath, kmnFiles[0]);
    const kmcPath = 'C:\\Program Files (x86)\\Keyman\\Keyman Developer\\kmc.cmd';
    const command = `"${kmcPath}" build "${fullKmnPath}"`;
    vscode.window.showInformationMessage(`Running command: ${command}`);
    cp.exec(command, (error, stdout, stderr) => {
      if (error) {
        const output = stderr || stdout || '';
        const lines = output.split('\n').filter(line => line.trim() !== '');
        const diagnostics = lines.map((line) => {
          const match = line.match(/\.kmn:(\d+)/);
          const lineNumber = match ? parseInt(match[1], 10) - 1 : 0;
          const message = line.trim();
          console.log(`Diagnostic for line ${lineNumber + 1}: ${message}`);
          return new vscode.Diagnostic(
            new vscode.Range(lineNumber, 0, lineNumber, 100),
            message || 'Unknown compilation error',
            vscode.DiagnosticSeverity.Error
          );
        });
        if (diagnostics.length > 0) {
          const uri = vscode.Uri.file(fullKmnPath);
          diagnosticCollection.set(uri, diagnostics);
        }
        vscode.window.showErrorMessage('KMN compilation failed. See Problems panel.');
      } else {
        vscode.window.showInformationMessage('KMN compiled successfully.');
      }
    });
  } else {
    vscode.window.showWarningMessage('Expected exactly one .kmn file in /source/ folder.');
  }
}

function deactivate() {
  if (diagnosticCollection) {
    diagnosticCollection.dispose();
  }
}

module.exports = {
  activate,
  deactivate
};
