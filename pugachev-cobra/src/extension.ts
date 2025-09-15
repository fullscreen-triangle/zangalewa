/**
 * Pugachev Cobra VS Code Extension
 * 
 * The World's First Autonomous Consciousness-Aware AI Validation System
 * 
 * Breakthrough: "Reality happens" principle + Subtask-level ridiculous solutions
 * Creates precise boundaries only where needed while preserving known solutions.
 */

import * as vscode from 'vscode';
import { MetacognitiveOrchestrator } from './orchestrator/MetacognitiveOrchestrator';
import { ProblemContextManager } from './core/ProblemContextManager';
import { ValidationDiagnosticsProvider } from './providers/ValidationDiagnosticsProvider';

let orchestrator: MetacognitiveOrchestrator;
let contextManager: ProblemContextManager;
let diagnosticsProvider: ValidationDiagnosticsProvider;

export function activate(context: vscode.ExtensionContext) {
    console.log('🧠 Pugachev Cobra: Reality-Based AI Validation System activated!');

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

    vscode.window.showInformationMessage('🎯 Pugachev Cobra: "Reality Happens" Validation Ready!');
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

    vscode.window.showInformationMessage(`🎯 Context: ${selectedType} (${stakes} stakes) - "Reality Happens" mode`);
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
 * Core validation logic using refined Pugachev Cobra system
 */
async function performValidation(content: string, document: vscode.TextDocument): Promise<void> {
    try {
        // Show progress
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "🧠 Pugachev Cobra: Reality-Based Processing...",
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: "Analyzing context with reality principle..." });

            // Analyze problem context
            const context = await contextManager.analyzeProblemType(content);
            
            progress.report({ increment: 20, message: "Decomposing into subtasks..." });

            // Execute refined validation through orchestrator
            const result = await orchestrator.orchestrateValidation(content, context);

            progress.report({ increment: 80, message: "Creating precise boundaries..." });

            // Display results with refined information
            await displayRefinedValidationResults(result, document);
            
            progress.report({ increment: 100, message: "Reality-based validation complete!" });
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
 * Displays refined validation results with subtask breakdown
 */
async function displayRefinedValidationResults(
    result: {
        finalResult: any[];
        decisions: any[];
        qualityMetrics: any;
        processingStrategy: any;
        refinedPugachevCobraResult: any;
    },
    document: vscode.TextDocument
): Promise<void> {
    const { finalResult, decisions, qualityMetrics, processingStrategy, refinedPugachevCobraResult } = result;

    // Create summary message with refined information
    const issueCount = finalResult.reduce((sum, r) => sum + (r.issues?.length || 0), 0);
    const averageConfidence = finalResult.reduce((sum, r) => sum + r.confidence, 0) / finalResult.length;
    
    const knownSubtasks = refinedPugachevCobraResult?.knownSubtasks?.length || 0;
    const unknownSubtasks = refinedPugachevCobraResult?.unknownSubtasks?.length || 0;
    const totalSubtasks = knownSubtasks + unknownSubtasks;
    
    const summary = `🎯 Reality-Based Validation Complete!
    
📊 Results Summary:
• Overall Quality: ${(qualityMetrics.overallScore * 100).toFixed(1)}%
• Confidence: ${(averageConfidence * 100).toFixed(1)}%
• Issues Found: ${issueCount}
• Processing Strategy: ${processingStrategy.approach}

🧩 Subtask Analysis (Reality Happens Principle):
• Total Subtasks: ${totalSubtasks}
• Known Solutions: ${knownSubtasks} (preserved exactly)
• Unknown Boundaries: ${unknownSubtasks} (boundaries created)
• Solvability Guarantee: ${refinedPugachevCobraResult?.realityProof?.solvabilityGuarantee ? 'YES' : 'N/A'}

🎯 Quality Dimensions:
${Object.entries(qualityMetrics.dimensionScores)
  .map(([dim, score]) => `• ${dim}: ${((score as number) * 100).toFixed(1)}%`)
  .join('\n')}

🧠 Refined Validation: ${refinedPugachevCobraResult?.finalValidation?.overallAssessment?.toUpperCase() || 'PROCESSED'}`;

    // Show results in information message
    const action = await vscode.window.showInformationMessage(
        summary,
        'View Subtask Details',
        'Show Reality Proof',
        'Show Issues',
        'OK'
    );

    if (action === 'View Subtask Details') {
        await showSubtaskDetails(result);
    } else if (action === 'Show Reality Proof') {
        await showRealityProof(result);
    } else if (action === 'Show Issues') {
        await showIssuesPanel(finalResult, document);
    }
}

/**
 * Shows detailed subtask breakdown
 */
async function showSubtaskDetails(result: any): Promise<void> {
    const outputChannel = vscode.window.createOutputChannel('Pugachev Cobra - Subtask Analysis');
    
    outputChannel.appendLine('🧠 PUGACHEV COBRA: REALITY-BASED SUBTASK VALIDATION');
    outputChannel.appendLine('=' .repeat(60));
    outputChannel.appendLine('');
    
    outputChannel.appendLine('🌍 REALITY PRINCIPLE:');
    outputChannel.appendLine('• "Reality happens" → All problems have solutions');
    outputChannel.appendLine('• What\'s harder than reality? Nothing.');
    outputChannel.appendLine('• Therefore: Every subtask is solvable');
    outputChannel.appendLine('');
    
    if (result.refinedPugachevCobraResult) {
        const refined = result.refinedPugachevCobraResult;
        
        outputChannel.appendLine('🔧 KNOWN SUBTASKS (Preserved Solutions):');
        refined.knownSubtasks?.forEach((subtask: any, i: number) => {
            outputChannel.appendLine(`${i + 1}. ${subtask.id}`);
            outputChannel.appendLine(`   Solution: ${subtask.solutionType}`);
            outputChannel.appendLine(`   Confidence: ${(subtask.confidence * 100).toFixed(1)}%`);
            outputChannel.appendLine(`   Reasoning: ${subtask.reasoning}`);
            outputChannel.appendLine('');
        });
        
        outputChannel.appendLine('🎯 UNKNOWN SUBTASKS (Boundary Creation):');
        refined.unknownSubtasks?.forEach((subtask: any, i: number) => {
            outputChannel.appendLine(`${i + 1}. ${subtask.id}`);
            outputChannel.appendLine(`   Uncertainty Type: ${subtask.uncertaintyType}`);
            outputChannel.appendLine(`   Boundary Needed: ${subtask.boundaryNeeded ? 'YES' : 'NO'}`);
            outputChannel.appendLine(`   Reasoning: ${subtask.reasoning}`);
            outputChannel.appendLine('');
        });
        
        outputChannel.appendLine('🚧 BOUNDARIES CREATED:');
        const boundaries = refined.refinedBoundaries?.unknownBoundaries || {};
        for (const [subtaskId, boundary] of Object.entries(boundaries)) {
            outputChannel.appendLine(`Subtask: ${subtaskId}`);
            const b = boundary as any;
            outputChannel.appendLine(`  Can Mean: ${b.canMean?.slice(0, 2).join('; ')}...`);
            outputChannel.appendLine(`  Cannot Mean: ${b.cannotMean?.slice(0, 2).join('; ')}...`);
            outputChannel.appendLine(`  Boundary Confidence: ${(b.boundaryConfidence * 100).toFixed(1)}%`);
            outputChannel.appendLine('');
        }
    }
    
    outputChannel.show(true);
}

/**
 * Shows the reality-happens proof
 */
async function showRealityProof(result: any): Promise<void> {
    const outputChannel = vscode.window.createOutputChannel('Pugachev Cobra - Reality Proof');
    
    outputChannel.appendLine('🌍 THE REALITY-HAPPENS PROOF');
    outputChannel.appendLine('=' .repeat(50));
    outputChannel.appendLine('');
    
    outputChannel.appendLine('PREMISE:');
    outputChannel.appendLine('• Reality exists and functions');
    outputChannel.appendLine('• Reality is the ultimate complexity test');
    outputChannel.appendLine('• What could be harder than reality itself?');
    outputChannel.appendLine('');
    
    outputChannel.appendLine('LOGICAL DEDUCTION:');
    outputChannel.appendLine('• If reality works → all problems that constitute reality work');
    outputChannel.appendLine('• Since reality happens → all problems have AT LEAST one solution');
    outputChannel.appendLine('• Therefore: Every problem, when properly decomposed, is solvable');
    outputChannel.appendLine('');
    
    outputChannel.appendLine('PRACTICAL APPLICATION:');
    outputChannel.appendLine('• Decompose problems into subtasks');
    outputChannel.appendLine('• Identify known vs unknown subtasks');
    outputChannel.appendLine('• Keep proven solutions for known subtasks');
    outputChannel.appendLine('• Create boundaries only for unknown subtasks');
    outputChannel.appendLine('• Result: Precise validation without wasted effort');
    outputChannel.appendLine('');
    
    if (result.refinedPugachevCobraResult?.realityProof) {
        const proof = result.refinedPugachevCobraResult.realityProof;
        outputChannel.appendLine('VALIDATION PROOF:');
        outputChannel.appendLine(`• Solvability Guarantee: ${proof.solvabilityGuarantee}`);
        outputChannel.appendLine(`• Decomposition Complete: ${proof.decompositionComplete}`);
        outputChannel.appendLine(`• Boundaries Established: ${proof.boundariesEstablished}`);
        outputChannel.appendLine(`• Reasoning: ${proof.reasoning}`);
    }
    
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
    console.log('🧠 Pugachev Cobra: Reality-based validation deactivated');
}