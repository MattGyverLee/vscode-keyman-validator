// Keyman Keyboard Validator VSCode Extension
// File: extension.js

const vscode = require('vscode');
const cp = require('child_process');
const fs = require('fs');
const path = require('path');

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

  // Compile .kmn file using kmc
  const kmnFiles = fs.readdirSync(sourcePath).filter(file => file.endsWith('.kmn'));
  if (kmnFiles.length === 1) {
    const fullKmnPath = path.join(sourcePath, kmnFiles[0]);
    const kmcPath = 'C:\\Program Files (x86)\\Keyman\\Keyman Developer\\kmc.cmd';
    const command = `"${kmcPath}" build "${fullKmnPath}"`;
    vscode.window.showInformationMessage(`Running command: ${command}`);
    cp.exec(command, (error, stdout, stderr) => {
      if (error) {
        const diagnostic = new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 1),
          `KMN Compilation Error: ${stderr || stdout}`,
          vscode.DiagnosticSeverity.Error
        );
        const uri = vscode.Uri.file(fullKmnPath);
        diagnosticCollection.set(uri, [diagnostic]);
        vscode.window.showErrorMessage('KMN compilation failed. See Problems panel.');
      } else {
        vscode.window.showInformationMessage('KMN compiled successfully.');
      }
    });
  } else {
    vscode.window.showWarningMessage('Expected exactly one .kmn file in /source/ folder.');
  }

  // Validate .keyman-touch-layout JSON
  const layoutFiles = fs.readdirSync(sourcePath).filter(file => file.endsWith('.keyman-touch-layout'));
  if (layoutFiles.length === 1) {
    const fullLayoutPath = path.join(sourcePath, layoutFiles[0]);
    try {
      const layoutJson = fs.readFileSync(fullLayoutPath, 'utf-8');
      JSON.parse(layoutJson); // Just validating JSON structure
      vscode.window.showInformationMessage('Layout JSON is well-formed.');
    } catch (err) {
      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(0, 0, 0, 1),
        `JSON Parse Error: ${err.message}`,
        vscode.DiagnosticSeverity.Error
      );
      const uri = vscode.Uri.file(fullLayoutPath);
      diagnosticCollection.set(uri, [diagnostic]);
      vscode.window.showErrorMessage('Layout JSON parsing failed. See Problems panel.');
    }
  } else {
    vscode.window.showWarningMessage('Expected exactly one .keyman-touch-layout file in /source/ folder.');
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

