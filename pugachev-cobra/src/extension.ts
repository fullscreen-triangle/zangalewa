/**
 * Pugachev Cobra VS Code Extension
 * 
 * Finite Observer AI Validation System with Metacognitive Orchestration
 * Integrates the 8-stage pipeline from four-sided-triangle for autonomous operation
 */

import * as vscode from 'vscode';
import { MetacognitiveOrchestrator } from './orchestrator/MetacognitiveOrchestrator';
import { ProblemContextManager } from './core/ProblemContextManager';
import { ValidationDiagnosticsProvider } from './providers/ValidationDiagnosticsProvider';

let orchestrator: MetacognitiveOrchestrator;
let contextManager: ProblemContextManager;
let diagnosticsProvider: ValidationDiagnosticsProvider;

export function activate(context: vscode.ExtensionContext) {
    console.log('Pugachev Cobra: Finite Observer AI Validation System activated!');

    // Initialize core components
    orchestrator = new MetacognitiveOrchestrator(context);
    contextManager = new ProblemContextManager(context);
    diagnosticsProvider = new ValidationDiagnosticsProvider(context);

    // Register main validation commands
    const validateSelectionCommand = vscode.commands.registerCommand(
        'pugachev-cobra.validateSelection',
        async () => await handleValidateSelection()
    );

    const validateDocumentCommand = vscode.commands.registerCommand(
        'pugachev-cobra.validateDocument', 
        async () => await handleValidateDocument()
    );

    const configureContextCommand = vscode.commands.registerCommand(
        'pugachev-cobra.configureContext',
        async () => await handleConfigureContext()
    );

    // Register diagnostic provider
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('pugachev-cobra');
    context.subscriptions.push(diagnosticCollection);

    // Register all disposables
    context.subscriptions.push(
        validateSelectionCommand,
        validateDocumentCommand,
        configureContextCommand,
        diagnosticCollection
    );

    // Set up automatic validation on document changes
    const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument(async (event) => {
        await handleDocumentChange(event, diagnosticCollection);
    });
    context.subscriptions.push(onDidChangeTextDocument);

    vscode.window.showInformationMessage('🧠 Pugachev Cobra: Consciousness-Aware AI Validation Ready!');
}

/**
 * Handles validation of selected text
 */
async function handleValidateSelection(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active text editor found');
        return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
        vscode.window.showErrorMessage('No text selected for validation');
        return;
    }

    const selectedText = editor.document.getText(selection);
    await performValidation(selectedText, editor.document);
}

/**
 * Handles validation of entire document
 */
async function handleValidateDocument(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active text editor found');
        return;
    }

    const documentText = editor.document.getText();
    await performValidation(documentText, editor.document);
}

/**
 * Handles context configuration
 */
async function handleConfigureContext(): Promise<void> {
    const contextTypes = [
        'Professional Communication',
        'Creative Exploration', 
        'Technical Analysis',
        'Academic Writing'
    ];

    const selectedType = await vscode.window.showQuickPick(contextTypes, {
        placeHolder: 'Select the type of content being validated'
    });

    if (!selectedType) return;

    const stakes = await vscode.window.showQuickPick(
        ['Low', 'Medium', 'High', 'Critical'],
        { placeHolder: 'Select the importance level of this content' }
    );

    if (!stakes) return;

    // Update configuration
    const config = vscode.workspace.getConfiguration('pugachev-cobra');
    await config.update('context.type', selectedType, vscode.ConfigurationTarget.Workspace);
    await config.update('context.stakes', stakes.toLowerCase(), vscode.ConfigurationTarget.Workspace);

    vscode.window.showInformationMessage(`Context configured: ${selectedType} (${stakes} stakes)`);
}

/**
 * Handles document change events for real-time validation
 */
async function handleDocumentChange(
    event: vscode.TextDocumentChangeEvent,
    diagnosticCollection: vscode.DiagnosticCollection
): Promise<void> {
    // Only validate on significant changes (avoid constant validation)
    if (event.contentChanges.length === 0) return;
    
    const config = vscode.workspace.getConfiguration('pugachev-cobra');
    const enableRealTime = config.get('validation.realTime', false);
    
    if (!enableRealTime) return;

    // Debounce validation (wait for user to stop typing)
    const document = event.document;
    setTimeout(async () => {
        await performValidationWithDiagnostics(document.getText(), document, diagnosticCollection);
    }, 2000);
}

/**
 * Core validation logic using metacognitive orchestrator
 */
async function performValidation(content: string, document: vscode.TextDocument): Promise<void> {
    try {
        // Show progress
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "🧠 Pugachev Cobra: Processing...",
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: "Analyzing context..." });

            // Analyze problem context
            const context = await contextManager.analyzeProblemType(content);
            
            progress.report({ increment: 20, message: "Initializing metacognitive orchestrator..." });

            // Execute validation through orchestrator
            const result = await orchestrator.orchestrateValidation(content, context);

            progress.report({ increment: 80, message: "Finalizing results..." });

            // Display results
            await displayValidationResults(result, document);
            
            progress.report({ increment: 100, message: "Complete!" });
        });

    } catch (error: any) {
        vscode.window.showErrorMessage(`Validation failed: ${error.message}`);
        console.error('Pugachev Cobra validation error:', error);
    }
}

/**
 * Validation with diagnostic integration
 */
async function performValidationWithDiagnostics(
    content: string,
    document: vscode.TextDocument,
    diagnosticCollection: vscode.DiagnosticCollection
): Promise<void> {
    try {
        const context = await contextManager.analyzeProblemType(content);
        const result = await orchestrator.orchestrateValidation(content, context);
        
        // Convert results to diagnostics
        const diagnostics = await diagnosticsProvider.provideDiagnostics(result.finalResult, document);
        diagnosticCollection.set(document.uri, diagnostics);

    } catch (error) {
        console.warn('Real-time validation failed:', error);
    }
}

/**
 * Displays validation results to user
 */
async function displayValidationResults(
    result: {
        finalResult: any[];
        decisions: any[];
        qualityMetrics: any;
        processingStrategy: any;
    },
    document: vscode.TextDocument
): Promise<void> {
    const { finalResult, decisions, qualityMetrics, processingStrategy } = result;

    // Create summary message
    const issueCount = finalResult.reduce((sum, r) => sum + (r.issues?.length || 0), 0);
    const averageConfidence = finalResult.reduce((sum, r) => sum + r.confidence, 0) / finalResult.length;
    
    const summary = `✅ Validation Complete!
    
📊 Results Summary:
• Overall Quality: ${(qualityMetrics.overallScore * 100).toFixed(1)}%
• Confidence: ${(averageConfidence * 100).toFixed(1)}%
• Issues Found: ${issueCount}
• Refinement Iterations: ${decisions.length}
• Processing Strategy: ${processingStrategy.approach}

🎯 Quality Dimensions:
${Object.entries(qualityMetrics.dimensionScores)
  .map(([dim, score]) => `• ${dim}: ${((score as number) * 100).toFixed(1)}%`)
  .join('\n')}`;

    // Show results in information message
    const action = await vscode.window.showInformationMessage(
        summary,
        'View Details',
        'Show Issues',
        'OK'
    );

    if (action === 'View Details') {
        await showDetailedResults(result);
    } else if (action === 'Show Issues') {
        await showIssuesPanel(finalResult, document);
    }
}

/**
 * Shows detailed results in output channel
 */
async function showDetailedResults(result: any): Promise<void> {
    const outputChannel = vscode.window.createOutputChannel('Pugachev Cobra - Details');
    
    outputChannel.appendLine('🧠 PUGACHEV COBRA: FINITE OBSERVER VALIDATION RESULTS');
    outputChannel.appendLine('=' .repeat(60));
    outputChannel.appendLine('');
    
    outputChannel.appendLine('📈 QUALITY ANALYSIS:');
    outputChannel.appendLine(`Overall Score: ${(result.qualityMetrics.overallScore * 100).toFixed(2)}%`);
    outputChannel.appendLine(`Confidence: ${(result.qualityMetrics.confidence * 100).toFixed(2)}%`);
    outputChannel.appendLine('');
    
    outputChannel.appendLine('🎯 DIMENSION BREAKDOWN:');
    for (const [dimension, score] of Object.entries(result.qualityMetrics.dimensionScores)) {
        outputChannel.appendLine(`• ${dimension}: ${((score as number) * 100).toFixed(2)}%`);
    }
    outputChannel.appendLine('');
    
    outputChannel.appendLine('🔄 REFINEMENT DECISIONS:');
    result.decisions.forEach((decision: any, i: number) => {
        outputChannel.appendLine(`${i + 1}. ${decision.reason}`);
        outputChannel.appendLine(`   Target Areas: ${decision.targetAreas.join(', ')}`);
        outputChannel.appendLine(`   Confidence: ${(decision.confidence * 100).toFixed(1)}%`);
    });
    outputChannel.appendLine('');
    
    outputChannel.appendLine('💡 RECOMMENDATIONS:');
    result.qualityMetrics.improvementRecommendations.forEach((rec: string, i: number) => {
        outputChannel.appendLine(`${i + 1}. ${rec}`);
    });
    
    outputChannel.show(true);
}

/**
 * Shows issues in problems panel
 */
async function showIssuesPanel(results: any[], document: vscode.TextDocument): Promise<void> {
    const diagnostics = await diagnosticsProvider.provideDiagnostics(results, document);
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('pugachev-cobra-issues');
    diagnosticCollection.set(document.uri, diagnostics);
    
    // Focus on problems panel
    vscode.commands.executeCommand('workbench.panel.markers.view.focus');
}

export function deactivate() {
    // Cleanup resources
    console.log('Pugachev Cobra extension deactivated');
}