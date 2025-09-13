/**
 * FiniteObserverEngine
 * 
 * Core implementation of finite observer validation principles.
 * Implements systematic bias, bounded processing, and consciousness validation.
 */

import * as vscode from 'vscode';
import { ProblemContext, SystematicBias, ValidationResult, ProcessingState } from '../types/ValidationTypes';
import { TaskDecomposer } from './TaskDecomposer';
import { ConsciousnessValidator } from './ConsciousnessValidator';
import { TerminationCriteria } from './TerminationCriteria';
import { MetaKnowledgeProcessor } from './MetaKnowledgeProcessor';

export class FiniteObserverEngine {
    private taskDecomposer: TaskDecomposer;
    private consciousnessValidator: ConsciousnessValidator;
    private terminationCriteria: TerminationCriteria;
    private metaKnowledgeProcessor: MetaKnowledgeProcessor;

    constructor(private context: vscode.ExtensionContext) {
        this.taskDecomposer = new TaskDecomposer();
        this.consciousnessValidator = new ConsciousnessValidator();
        this.terminationCriteria = new TerminationCriteria();
        this.metaKnowledgeProcessor = new MetaKnowledgeProcessor(context);
    }

    /**
     * Validates content using finite observer principles
     * Implements Algorithm 1 from the mathematical framework
     */
    async validateContent(
        content: string,
        problemContext: ProblemContext,
        systematicBias: SystematicBias
    ): Promise<ValidationResult> {
        const startTime = Date.now();
        let processingState: ProcessingState = {
            processedTasks: [],
            adequacyLevel: 0,
            consciousnessLevel: 0,
            terminationReason: null,
            metadata: {
                startTime,
                problemType: problemContext.type,
                biasConfiguration: systematicBias
            }
        };

        try {
            // Step 1: Analyze problem type (meta-knowledge processing)
            const refinedContext = await this.metaKnowledgeProcessor.refineContext(
                problemContext,
                content
            );

            // Step 2: Task decomposition with systematic bias
            const tasks = await this.taskDecomposer.decomposeProblem(
                content,
                refinedContext,
                systematicBias
            );

            // Step 3: Importance filtering based on systematic bias
            const filteredTasks = this.taskDecomposer.filterByImportance(
                tasks,
                systematicBias
            );

            // Step 4: Bounded processing of filtered tasks
            for (const task of filteredTasks) {
                const taskStartTime = Date.now();

                // Check global termination criteria
                if (this.terminationCriteria.shouldTerminateGlobal(processingState)) {
                    processingState.terminationReason = 'global_timeout';
                    break;
                }

                // Process individual task
                const taskResult = await this.processTask(
                    task,
                    content,
                    systematicBias,
                    refinedContext
                );

                processingState.processedTasks.push(taskResult);

                // Check task-level termination
                if (this.terminationCriteria.shouldTerminateTask(task, taskResult)) {
                    processingState.terminationReason = `task_${task.id}_sufficient`;
                }

                // Update processing state
                this.updateProcessingState(processingState, taskResult);

                // Early termination if sufficiency achieved
                if (this.terminationCriteria.hasSufficientProcessing(processingState)) {
                    processingState.terminationReason = 'sufficiency_achieved';
                    break;
                }
            }

            // Step 5: Consciousness-based self-assessment
            const consciousnessAssessment = await this.consciousnessValidator.assessConsciousness(
                processingState,
                systematicBias,
                refinedContext
            );

            processingState.consciousnessLevel = consciousnessAssessment.consciousnessLevel;

            // Step 6: Generate validation result
            return this.constructValidationResult(
                processingState,
                consciousnessAssessment,
                content,
                refinedContext
            );

        } catch (error) {
            return this.constructErrorResult(error, processingState, content);
        }
    }

    /**
     * Validates entire document with progress reporting
     */
    async validateDocument(
        document: vscode.TextDocument,
        problemContext: ProblemContext,
        systematicBias: SystematicBias,
        progress: vscode.Progress<{increment?: number; message?: string}>,
        token: vscode.CancellationToken
    ): Promise<ValidationResult> {
        const content = document.getText();
        const documentLength = content.length;
        let processedLength = 0;

        // Split document into manageable chunks
        const chunks = this.splitDocumentIntoChunks(content, 2000);
        const documentIssues: any[] = [];
        let overallAdequacy = 0;
        let overallConsciousness = 0;

        for (let i = 0; i < chunks.length; i++) {
            if (token.isCancellationRequested) {
                throw new vscode.CancellationError();
            }

            const chunk = chunks[i];
            progress.report({
                increment: (100 / chunks.length),
                message: `Processing chunk ${i + 1}/${chunks.length}...`
            });

            try {
                const chunkResult = await this.validateContent(
                    chunk.content,
                    problemContext,
                    systematicBias
                );

                if (chunkResult.issues) {
                    // Adjust line numbers for document context
                    const adjustedIssues = chunkResult.issues.map(issue => ({
                        ...issue,
                        range: {
                            start: chunk.startLine + (issue.range?.start || 0),
                            end: chunk.startLine + (issue.range?.end || 0)
                        }
                    }));
                    documentIssues.push(...adjustedIssues);
                }

                overallAdequacy += chunkResult.adequacyLevel || 0;
                overallConsciousness += chunkResult.consciousnessLevel || 0;

            } catch (chunkError) {
                console.warn(`Error processing chunk ${i + 1}:`, chunkError);
                documentIssues.push({
                    message: `Processing error in section starting at line ${chunk.startLine}`,
                    severity: 'warning',
                    range: { start: chunk.startLine, end: chunk.startLine + 1 }
                });
            }
        }

        // Calculate overall document metrics
        const avgAdequacy = overallAdequacy / chunks.length;
        const avgConsciousness = overallConsciousness / chunks.length;

        return {
            isValid: documentIssues.filter(issue => issue.severity === 'error').length === 0,
            adequacyLevel: avgAdequacy,
            consciousnessLevel: avgConsciousness,
            documentIssues,
            summary: {
                totalChunks: chunks.length,
                issuesFound: documentIssues.length,
                averageAdequacy: avgAdequacy,
                averageConsciousness: avgConsciousness
            }
        };
    }

    private async processTask(
        task: any,
        content: string,
        systematicBias: SystematicBias,
        context: ProblemContext
    ): Promise<any> {
        const taskProcessor = this.getTaskProcessor(task.type);
        
        return await taskProcessor.process(
            task,
            content,
            systematicBias,
            context,
            this.terminationCriteria
        );
    }

    private updateProcessingState(processingState: ProcessingState, taskResult: any): void {
        // Update adequacy based on task results
        const taskContribution = taskResult.adequacyContribution || 0;
        const weight = taskResult.importanceWeight || 1;
        
        processingState.adequacyLevel += (taskContribution * weight);
        
        // Normalize adequacy level
        processingState.adequacyLevel = Math.min(processingState.adequacyLevel, 1.0);
    }

    private constructValidationResult(
        processingState: ProcessingState,
        consciousnessAssessment: any,
        content: string,
        context: ProblemContext
    ): ValidationResult {
        const config = vscode.workspace.getConfiguration('pugachev-cobra');
        const consciousnessThreshold = config.get<number>('consciousnessThreshold', 0.6);
        
        const issues = this.extractIssuesFromProcessingState(processingState);
        
        return {
            isValid: processingState.adequacyLevel >= consciousnessThreshold && 
                    processingState.consciousnessLevel >= consciousnessThreshold,
            adequacyLevel: processingState.adequacyLevel,
            consciousnessLevel: processingState.consciousnessLevel,
            issues,
            processingMetrics: {
                tasksProcessed: processingState.processedTasks.length,
                processingTimeMs: Date.now() - processingState.metadata.startTime,
                terminationReason: processingState.terminationReason,
                systematicBiasApplied: processingState.metadata.biasConfiguration
            },
            consciousnessAssessment
        };
    }

    private constructErrorResult(
        error: any,
        processingState: ProcessingState,
        content: string
    ): ValidationResult {
        return {
            isValid: false,
            adequacyLevel: 0,
            consciousnessLevel: 0,
            issues: [{
                message: `Processing error: ${error.message}`,
                severity: 'error',
                code: 'processing-error'
            }],
            error: error.message
        };
    }

    private splitDocumentIntoChunks(content: string, maxChunkSize: number): Array<{content: string, startLine: number}> {
        const lines = content.split('\n');
        const chunks: Array<{content: string, startLine: number}> = [];
        
        let currentChunk = '';
        let startLine = 0;
        let currentLine = 0;

        for (const line of lines) {
            if (currentChunk.length + line.length > maxChunkSize && currentChunk.length > 0) {
                chunks.push({ content: currentChunk.trim(), startLine });
                currentChunk = line + '\n';
                startLine = currentLine;
            } else {
                currentChunk += line + '\n';
            }
            currentLine++;
        }

        if (currentChunk.trim()) {
            chunks.push({ content: currentChunk.trim(), startLine });
        }

        return chunks;
    }

    private getTaskProcessor(taskType: string): any {
        // Factory method for different task processors
        switch (taskType) {
            case 'factual-accuracy':
                return new (require('./processors/FactualAccuracyProcessor').FactualAccuracyProcessor)();
            case 'tone-analysis':
                return new (require('./processors/ToneAnalysisProcessor').ToneAnalysisProcessor)();
            case 'logical-consistency':
                return new (require('./processors/LogicalConsistencyProcessor').LogicalConsistencyProcessor)();
            default:
                return new (require('./processors/GenericProcessor').GenericProcessor)();
        }
    }

    private extractIssuesFromProcessingState(processingState: ProcessingState): any[] {
        const issues: any[] = [];
        
        for (const taskResult of processingState.processedTasks) {
            if (taskResult.issues) {
                issues.push(...taskResult.issues);
            }
        }
        
        return issues;
    }
}
