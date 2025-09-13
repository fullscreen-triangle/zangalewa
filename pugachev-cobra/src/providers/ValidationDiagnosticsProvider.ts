/**
 * ValidationDiagnosticsProvider
 * 
 * Provides diagnostic information for validation results.
 * Integrates with VS Code's diagnostic system.
 */

import * as vscode from 'vscode';
import { ValidationResult, ValidationIssue } from '../types/ValidationTypes';

export class ValidationDiagnosticsProvider {
    
    /**
     * Converts validation issues to VS Code diagnostics
     */
    createDiagnostics(
        validationResult: ValidationResult,
        document: vscode.TextDocument,
        range?: vscode.Range
    ): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];

        if (validationResult.issues) {
            for (const issue of validationResult.issues) {
                const diagnostic = this.createDiagnosticFromIssue(issue, document, range);
                diagnostics.push(diagnostic);
            }
        }

        // Add consciousness-level diagnostic if below threshold
        if (validationResult.consciousnessLevel < 0.6) {
            const consciousnessDiagnostic = this.createConsciousnessDiagnostic(
                validationResult.consciousnessLevel,
                document,
                range
            );
            diagnostics.push(consciousnessDiagnostic);
        }

        return diagnostics;
    }

    /**
     * Creates a diagnostic from a validation issue
     */
    private createDiagnosticFromIssue(
        issue: ValidationIssue,
        document: vscode.TextDocument,
        defaultRange?: vscode.Range
    ): vscode.Diagnostic {
        // Determine range for the diagnostic
        let diagnosticRange: vscode.Range;
        
        if (issue.range) {
            const startPos = new vscode.Position(
                Math.max(0, issue.range.start),
                0
            );
            const endPos = new vscode.Position(
                Math.min(document.lineCount - 1, issue.range.end),
                0
            );
            diagnosticRange = new vscode.Range(startPos, endPos);
        } else if (defaultRange) {
            diagnosticRange = defaultRange;
        } else {
            // Default to first line if no range specified
            diagnosticRange = new vscode.Range(0, 0, 0, 1);
        }

        // Create diagnostic
        const diagnostic = new vscode.Diagnostic(
            diagnosticRange,
            this.formatDiagnosticMessage(issue),
            this.mapSeverity(issue.severity)
        );

        // Set diagnostic properties
        diagnostic.source = 'Pugachev Cobra';
        diagnostic.code = issue.code || this.generateCodeFromCategory(issue.category);
        
        // Add related information if available
        if (issue.suggestions && issue.suggestions.length > 0) {
            diagnostic.relatedInformation = issue.suggestions.map(suggestion => 
                new vscode.DiagnosticRelatedInformation(
                    new vscode.Location(document.uri, diagnosticRange),
                    `Suggestion: ${suggestion}`
                )
            );
        }

        return diagnostic;
    }

    /**
     * Creates a consciousness-level diagnostic
     */
    private createConsciousnessDiagnostic(
        consciousnessLevel: number,
        document: vscode.TextDocument,
        range?: vscode.Range
    ): vscode.Diagnostic {
        const diagnosticRange = range || new vscode.Range(0, 0, 0, 1);
        
        const message = `Low consciousness level detected (Φ=${consciousnessLevel.toFixed(3)}). ` +
                       'Validation may be insufficient for reliable assessment.';

        const diagnostic = new vscode.Diagnostic(
            diagnosticRange,
            message,
            vscode.DiagnosticSeverity.Warning
        );

        diagnostic.source = 'Pugachev Cobra';
        diagnostic.code = 'low-consciousness';
        
        return diagnostic;
    }

    /**
     * Formats diagnostic message with confidence and category information
     */
    private formatDiagnosticMessage(issue: ValidationIssue): string {
        let message = issue.message;
        
        // Add confidence level if available and below threshold
        if (issue.confidence < 0.8) {
            message += ` (Confidence: ${(issue.confidence * 100).toFixed(0)}%)`;
        }

        // Add category for context
        if (issue.category) {
            message += ` [${issue.category}]`;
        }

        return message;
    }

    /**
     * Maps validation severity to VS Code diagnostic severity
     */
    private mapSeverity(severity: ValidationIssue['severity']): vscode.DiagnosticSeverity {
        switch (severity) {
            case 'error':
                return vscode.DiagnosticSeverity.Error;
            case 'warning':
                return vscode.DiagnosticSeverity.Warning;
            case 'info':
            default:
                return vscode.DiagnosticSeverity.Information;
        }
    }

    /**
     * Generates diagnostic code from category
     */
    private generateCodeFromCategory(category: string): string {
        return `finite-observer-${category}`;
    }

    /**
     * Creates summary diagnostic for document-level validation
     */
    createSummaryDiagnostic(
        validationResult: ValidationResult,
        document: vscode.TextDocument
    ): vscode.Diagnostic | null {
        if (!validationResult.summary) {
            return null;
        }

        const summary = validationResult.summary;
        const message = `Validation Summary: ${summary.issuesFound} issues found, ` +
                       `Avg Consciousness: ${(summary.averageConsciousness || 0).toFixed(2)}, ` +
                       `Avg Adequacy: ${(summary.averageAdequacy || 0).toFixed(2)}`;

        const diagnostic = new vscode.Diagnostic(
            new vscode.Range(0, 0, 0, 1),
            message,
            summary.issuesFound === 0 ? 
                vscode.DiagnosticSeverity.Information : 
                vscode.DiagnosticSeverity.Warning
        );

        diagnostic.source = 'Pugachev Cobra';
        diagnostic.code = 'validation-summary';

        return diagnostic;
    }

    /**
     * Creates processing metrics diagnostic for performance tracking
     */
    createMetricsDiagnostic(
        validationResult: ValidationResult,
        document: vscode.TextDocument
    ): vscode.Diagnostic | null {
        if (!validationResult.processingMetrics) {
            return null;
        }

        const metrics = validationResult.processingMetrics;
        const message = `Processing: ${metrics.tasksProcessed} tasks, ` +
                       `${metrics.processingTimeMs}ms, ` +
                       `Terminated: ${metrics.terminationReason}`;

        const diagnostic = new vscode.Diagnostic(
            new vscode.Range(0, 0, 0, 1),
            message,
            vscode.DiagnosticSeverity.Information
        );

        diagnostic.source = 'Pugachev Cobra Metrics';
        diagnostic.code = 'processing-metrics';

        return diagnostic;
    }
}
