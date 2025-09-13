/**
 * Pugachev Cobra: Finite Observer AI Validation Extension
 * 
 * Mathematical framework for bounded artificial intelligence processing
 * based on systematic bias and finite observer principles.
 */

import * as vscode from 'vscode';
import { FiniteObserverEngine } from './core/FiniteObserverEngine';
import { ValidationDiagnosticsProvider } from './providers/ValidationDiagnosticsProvider';
import { ProblemContextManager } from './core/ProblemContextManager';
import { SystematicBiasGenerator } from './core/SystematicBiasGenerator';

export function activate(context: vscode.ExtensionContext) {
    console.log('Activating Pugachev Cobra extension...');

    // Initialize core systems
    const finiteObserverEngine = new FiniteObserverEngine(context);
    const problemContextManager = new ProblemContextManager();
    const systematicBiasGenerator = new SystematicBiasGenerator();
    const diagnosticsProvider = new ValidationDiagnosticsProvider();

    // Register diagnostic provider
    const diagnosticsCollection = vscode.languages.createDiagnosticCollection('pugachev-cobra');
    context.subscriptions.push(diagnosticsCollection);

    // Command: Validate Selection
    const validateSelectionCommand = vscode.commands.registerCommand(
        'pugachev-cobra.validateSelection',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor found');
                return;
            }

            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);
            
            if (!selectedText.trim()) {
                vscode.window.showWarningMessage('No text selected for validation');
                return;
            }

            try {
                // Show progress indicator
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: "Validating with Finite Observer...",
                    cancellable: false
                }, async (progress) => {
                    progress.report({ increment: 0, message: "Analyzing problem context..." });
                    
                    // Determine problem context
                    const problemContext = await problemContextManager.analyzeContext(
                        editor.document,
                        selection
                    );
                    
                    progress.report({ increment: 30, message: "Generating systematic bias..." });
                    
                    // Generate appropriate systematic bias
                    const systematicBias = await systematicBiasGenerator.generateBias(problemContext);
                    
                    progress.report({ increment: 60, message: "Processing with bounded validation..." });
                    
                    // Perform finite observer validation
                    const validationResult = await finiteObserverEngine.validateContent(
                        selectedText,
                        problemContext,
                        systematicBias
                    );

                    progress.report({ increment: 100, message: "Validation complete" });
                    
                    // Display results
                    await displayValidationResults(validationResult, editor, selection, diagnosticsCollection);
                });

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Validation failed: ${errorMessage}`);
                console.error('Validation error:', error);
            }
        }
    );

    // Command: Validate Document
    const validateDocumentCommand = vscode.commands.registerCommand(
        'pugachev-cobra.validateDocument',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor found');
                return;
            }

            const document = editor.document;
            const fullText = document.getText();

            if (!fullText.trim()) {
                vscode.window.showWarningMessage('Document is empty');
                return;
            }

            try {
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: "Validating entire document...",
                    cancellable: true
                }, async (progress, token) => {
                    // Analyze document context
                    const problemContext = await problemContextManager.analyzeDocumentContext(document);
                    const systematicBias = await systematicBiasGenerator.generateBias(problemContext);

                    // Validate document with cancellation support
                    const validationResult = await finiteObserverEngine.validateDocument(
                        document,
                        problemContext,
                        systematicBias,
                        progress,
                        token
                    );

                    // Update diagnostics for entire document
                    await updateDocumentDiagnostics(validationResult, document, diagnosticsCollection);
                });

            } catch (error) {
                if (error instanceof vscode.CancellationError) {
                    vscode.window.showInformationMessage('Document validation cancelled');
                } else {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    vscode.window.showErrorMessage(`Document validation failed: ${errorMessage}`);
                    console.error('Document validation error:', error);
                }
            }
        }
    );

    // Command: Configure Context
    const configureContextCommand = vscode.commands.registerCommand(
        'pugachev-cobra.configureContext',
        async () => {
            const contextTypes = [
                'Professional Communication',
                'Creative Exploration', 
                'Technical Analysis',
                'Academic Writing',
                'Code Documentation',
                'Custom...'
            ];

            const selectedContext = await vscode.window.showQuickPick(contextTypes, {
                placeHolder: 'Select problem context for validation'
            });

            if (selectedContext) {
                if (selectedContext === 'Custom...') {
                    const customContext = await vscode.window.showInputBox({
                        prompt: 'Enter custom problem context',
                        placeHolder: 'e.g., Legal Documentation, Scientific Research'
                    });
                    
                    if (customContext) {
                        await problemContextManager.setCustomContext(customContext);
                        vscode.window.showInformationMessage(`Context set to: ${customContext}`);
                    }
                } else {
                    await problemContextManager.setContext(selectedContext);
                    vscode.window.showInformationMessage(`Context set to: ${selectedContext}`);
                }
            }
        }
    );

    // Command: Show Diagnostics
    const showDiagnosticsCommand = vscode.commands.registerCommand(
        'pugachev-cobra.showDiagnostics',
        () => {
            vscode.commands.executeCommand('workbench.panel.markers.view.focus');
        }
    );

    // Register all commands
    context.subscriptions.push(
        validateSelectionCommand,
        validateDocumentCommand,
        configureContextCommand,
        showDiagnosticsCommand
    );

    // Status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(shield) Pugachev Cobra";
    statusBarItem.tooltip = "Finite Observer AI Validation - Click to configure";
    statusBarItem.command = 'pugachev-cobra.configureContext';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    console.log('Pugachev Cobra extension activated successfully');
}

async function displayValidationResults(
    validationResult: any,
    editor: vscode.TextEditor,
    selection: vscode.Selection,
    diagnosticsCollection: vscode.DiagnosticCollection
) {
    const document = editor.document;
    const diagnostics: vscode.Diagnostic[] = [];

    if (validationResult.issues && validationResult.issues.length > 0) {
        for (const issue of validationResult.issues) {
            const diagnostic = new vscode.Diagnostic(
                selection,
                issue.message,
                issue.severity === 'error' ? vscode.DiagnosticSeverity.Error :
                issue.severity === 'warning' ? vscode.DiagnosticSeverity.Warning :
                vscode.DiagnosticSeverity.Information
            );
            diagnostic.source = 'Pugachev Cobra';
            diagnostic.code = issue.code || 'finite-observer-validation';
            diagnostics.push(diagnostic);
        }
    }

    // Update diagnostics
    diagnosticsCollection.set(document.uri, diagnostics);

    // Show summary message
    const consciousnessLevel = validationResult.consciousnessLevel || 0;
    const adequacyLevel = validationResult.adequacyLevel || 0;

    if (validationResult.isValid) {
        vscode.window.showInformationMessage(
            `✅ Validation passed (Φ=${consciousnessLevel.toFixed(3)}, Adequacy=${adequacyLevel.toFixed(3)})`
        );
    } else {
        vscode.window.showWarningMessage(
            `⚠️  Validation issues detected (Φ=${consciousnessLevel.toFixed(3)}, Adequacy=${adequacyLevel.toFixed(3)})`
        );
    }
}

async function updateDocumentDiagnostics(
    validationResult: any,
    document: vscode.TextDocument,
    diagnosticsCollection: vscode.DiagnosticCollection
) {
    const diagnostics: vscode.Diagnostic[] = [];

    if (validationResult.documentIssues) {
        for (const issue of validationResult.documentIssues) {
            const range = new vscode.Range(
                issue.range?.start || 0,
                0,
                issue.range?.end || document.lineCount - 1,
                0
            );

            const diagnostic = new vscode.Diagnostic(
                range,
                issue.message,
                issue.severity === 'error' ? vscode.DiagnosticSeverity.Error :
                issue.severity === 'warning' ? vscode.DiagnosticSeverity.Warning :
                vscode.DiagnosticSeverity.Information
            );
            diagnostic.source = 'Pugachev Cobra';
            diagnostic.code = issue.code || 'document-validation';
            diagnostics.push(diagnostic);
        }
    }

    diagnosticsCollection.set(document.uri, diagnostics);
}

export function deactivate() {
    console.log('Pugachev Cobra extension deactivated');
}
