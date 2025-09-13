/**
 * TaskDecomposer
 * 
 * Decomposes validation problems into bounded, processable tasks.
 * Implements importance filtering based on systematic bias.
 */

import { ProblemContext, SystematicBias, ValidationTask } from '../types/ValidationTypes';

export class TaskDecomposer {

    /**
     * Decomposes a validation problem into processable tasks
     */
    async decomposeProblem(
        content: string,
        context: ProblemContext,
        systematicBias: SystematicBias
    ): Promise<ValidationTask[]> {
        const tasks: ValidationTask[] = [];
        
        // Generate base tasks for all contexts
        tasks.push(...this.generateBaseTasks());
        
        // Generate context-specific tasks
        tasks.push(...this.generateContextSpecificTasks(context));
        
        // Generate content-specific tasks based on analysis
        tasks.push(...this.generateContentSpecificTasks(content, context));
        
        // Set importance weights based on systematic bias
        this.applyImportanceWeights(tasks, systematicBias);
        
        return tasks.sort((a, b) => b.importance - a.importance);
    }

    /**
     * Filters tasks by importance using systematic bias
     */
    filterByImportance(
        tasks: ValidationTask[],
        systematicBias: SystematicBias
    ): ValidationTask[] {
        const selectionCriteria = systematicBias.selectionCriteria;
        const importanceThreshold = 0.3; // Minimum importance to process
        
        return tasks
            .filter(task => {
                const criteriaWeight = selectionCriteria[task.type] || 0.5;
                return task.importance * criteriaWeight >= importanceThreshold;
            })
            .slice(0, 8); // Limit to top 8 tasks to maintain bounded processing
    }

    private generateBaseTasks(): ValidationTask[] {
        return [
            {
                id: 'basic-coherence',
                type: 'logical-consistency',
                name: 'Basic Coherence Check',
                description: 'Verify basic logical coherence and sentence structure',
                importance: 0.8,
                requiredCapabilities: ['text-analysis'],
                estimatedComplexity: 0.3,
                dependsOn: [],
                metadata: {
                    category: 'structural',
                    processingType: 'analytical',
                    expectedDurationMs: 500
                }
            },
            {
                id: 'grammar-check',
                type: 'linguistic-analysis',
                name: 'Grammar and Style',
                description: 'Basic grammar and style verification',
                importance: 0.6,
                requiredCapabilities: ['linguistic-processing'],
                estimatedComplexity: 0.4,
                dependsOn: [],
                metadata: {
                    category: 'linguistic',
                    processingType: 'analytical',
                    expectedDurationMs: 400
                }
            }
        ];
    }

    private generateContextSpecificTasks(context: ProblemContext): ValidationTask[] {
        const tasks: ValidationTask[] = [];

        switch (context.type) {
            case 'Professional Communication':
                tasks.push(...this.generateProfessionalTasks(context));
                break;
            case 'Creative Exploration':
                tasks.push(...this.generateCreativeTasks(context));
                break;
            case 'Technical Analysis':
                tasks.push(...this.generateTechnicalTasks(context));
                break;
            case 'Academic Writing':
                tasks.push(...this.generateAcademicTasks(context));
                break;
        }

        return tasks;
    }

    private generateProfessionalTasks(context: ProblemContext): ValidationTask[] {
        return [
            {
                id: 'factual-accuracy',
                type: 'factual-accuracy',
                name: 'Factual Accuracy Verification',
                description: 'Verify factual claims and detect potential overconfidence',
                importance: 0.95,
                requiredCapabilities: ['fact-checking', 'confidence-analysis'],
                estimatedComplexity: 0.8,
                dependsOn: ['basic-coherence'],
                metadata: {
                    category: 'factual',
                    processingType: 'analytical',
                    expectedDurationMs: 1500
                }
            },
            {
                id: 'professional-tone',
                type: 'tone-analysis',
                name: 'Professional Tone Assessment',
                description: 'Analyze appropriateness of tone for professional context',
                importance: 0.9,
                requiredCapabilities: ['tone-analysis'],
                estimatedComplexity: 0.6,
                dependsOn: [],
                metadata: {
                    category: 'tonal',
                    processingType: 'analytical',
                    expectedDurationMs: 800
                }
            },
            {
                id: 'claim-substantiation',
                type: 'evidence-analysis',
                name: 'Claim Substantiation',
                description: 'Verify that claims are appropriately supported',
                importance: 0.85,
                requiredCapabilities: ['evidence-evaluation'],
                estimatedComplexity: 0.7,
                dependsOn: ['factual-accuracy'],
                metadata: {
                    category: 'evidence',
                    processingType: 'analytical',
                    expectedDurationMs: 1200
                }
            }
        ];
    }

    private generateCreativeTasks(context: ProblemContext): ValidationTask[] {
        return [
            {
                id: 'novelty-assessment',
                type: 'creativity-analysis',
                name: 'Novelty Assessment',
                description: 'Evaluate originality and creative merit',
                importance: 0.8,
                requiredCapabilities: ['creativity-evaluation'],
                estimatedComplexity: 0.7,
                dependsOn: [],
                metadata: {
                    category: 'creative',
                    processingType: 'creative',
                    expectedDurationMs: 1000
                }
            },
            {
                id: 'creative-coherence',
                type: 'logical-consistency',
                name: 'Creative Coherence',
                description: 'Balance between creativity and logical consistency',
                importance: 0.7,
                requiredCapabilities: ['coherence-analysis'],
                estimatedComplexity: 0.6,
                dependsOn: ['basic-coherence'],
                metadata: {
                    category: 'structural',
                    processingType: 'creative',
                    expectedDurationMs: 800
                }
            }
        ];
    }

    private generateTechnicalTasks(context: ProblemContext): ValidationTask[] {
        const tasks = [
            {
                id: 'technical-accuracy',
                type: 'technical-verification',
                name: 'Technical Accuracy Check',
                description: 'Verify technical claims and methodological soundness',
                importance: 0.9,
                requiredCapabilities: ['technical-analysis'],
                estimatedComplexity: 0.8,
                dependsOn: ['basic-coherence'],
                metadata: {
                    category: 'technical',
                    processingType: 'analytical',
                    expectedDurationMs: 1500
                }
            },
            {
                id: 'evidence-support',
                type: 'evidence-analysis',
                name: 'Evidence Support Verification',
                description: 'Ensure technical claims are properly supported',
                importance: 0.85,
                requiredCapabilities: ['evidence-evaluation'],
                estimatedComplexity: 0.7,
                dependsOn: ['technical-accuracy'],
                metadata: {
                    category: 'evidence',
                    processingType: 'analytical',
                    expectedDurationMs: 1200
                }
            }
        ];

        // Add mathematical rigor task if mathematical content detected
        if (context.characteristics.mathematicalContent) {
            tasks.push({
                id: 'mathematical-rigor',
                type: 'mathematical-analysis',
                name: 'Mathematical Rigor Check',
                description: 'Verify mathematical expressions and logical reasoning',
                importance: 0.95,
                requiredCapabilities: ['mathematical-analysis'],
                estimatedComplexity: 0.9,
                dependsOn: ['technical-accuracy'],
                metadata: {
                    category: 'mathematical',
                    processingType: 'analytical',
                    expectedDurationMs: 2000
                }
            });
        }

        return tasks;
    }

    private generateAcademicTasks(context: ProblemContext): ValidationTask[] {
        return [
            {
                id: 'citation-accuracy',
                type: 'citation-analysis',
                name: 'Citation Accuracy Check',
                description: 'Verify citation format and academic standards',
                importance: 0.9,
                requiredCapabilities: ['citation-analysis'],
                estimatedComplexity: 0.7,
                dependsOn: [],
                metadata: {
                    category: 'academic',
                    processingType: 'analytical',
                    expectedDurationMs: 1000
                }
            },
            {
                id: 'peer-review-readiness',
                type: 'academic-standards',
                name: 'Peer Review Readiness',
                description: 'Assess readiness for academic peer review',
                importance: 0.8,
                requiredCapabilities: ['academic-evaluation'],
                estimatedComplexity: 0.8,
                dependsOn: ['citation-accuracy', 'basic-coherence'],
                metadata: {
                    category: 'academic',
                    processingType: 'analytical',
                    expectedDurationMs: 1500
                }
            }
        ];
    }

    private generateContentSpecificTasks(
        content: string,
        context: ProblemContext
    ): ValidationTask[] {
        const tasks: ValidationTask[] = [];

        // Detect specific patterns that require specialized validation
        if (this.containsStatistics(content)) {
            tasks.push({
                id: 'statistical-claims',
                type: 'statistical-analysis',
                name: 'Statistical Claims Verification',
                description: 'Verify statistical claims and data presentation',
                importance: 0.85,
                requiredCapabilities: ['statistical-analysis'],
                estimatedComplexity: 0.8,
                dependsOn: ['factual-accuracy'],
                metadata: {
                    category: 'statistical',
                    processingType: 'analytical',
                    expectedDurationMs: 1300
                }
            });
        }

        if (this.containsComparisons(content)) {
            tasks.push({
                id: 'comparison-validity',
                type: 'comparative-analysis',
                name: 'Comparison Validity Check',
                description: 'Verify logical validity of comparisons made',
                importance: 0.75,
                requiredCapabilities: ['comparative-reasoning'],
                estimatedComplexity: 0.6,
                dependsOn: ['logical-consistency'],
                metadata: {
                    category: 'logical',
                    processingType: 'analytical',
                    expectedDurationMs: 900
                }
            });
        }

        if (this.containsCausalClaims(content)) {
            tasks.push({
                id: 'causality-analysis',
                type: 'causal-reasoning',
                name: 'Causal Claims Analysis',
                description: 'Verify logical validity of causal relationships',
                importance: 0.8,
                requiredCapabilities: ['causal-analysis'],
                estimatedComplexity: 0.7,
                dependsOn: ['logical-consistency'],
                metadata: {
                    category: 'logical',
                    processingType: 'analytical',
                    expectedDurationMs: 1100
                }
            });
        }

        return tasks;
    }

    private applyImportanceWeights(
        tasks: ValidationTask[],
        systematicBias: SystematicBias
    ): void {
        const selectionCriteria = systematicBias.selectionCriteria;
        
        for (const task of tasks) {
            // Apply systematic bias weighting
            const criteriaWeight = selectionCriteria[task.type] || 0.5;
            task.importance *= criteriaWeight;

            // Apply processing priority adjustments
            task.importance *= this.getProcessingPriorityMultiplier(task, systematicBias);

            // Ensure importance stays within bounds
            task.importance = Math.max(0, Math.min(1, task.importance));
        }
    }

    private getProcessingPriorityMultiplier(
        task: ValidationTask,
        systematicBias: SystematicBias
    ): number {
        const priorities = systematicBias.processingPriorities;
        
        switch (task.metadata.category) {
            case 'factual':
                return 0.5 + (priorities.factualAccuracy * 0.5);
            case 'logical':
                return 0.5 + (priorities.logicalConsistency * 0.5);
            case 'tonal':
                return 0.5 + (priorities.toneAppropriateness * 0.5);
            case 'creative':
                return 0.5 + (priorities.creativityLevel * 0.5);
            case 'evidence':
                return 0.5 + (priorities.evidenceRequirement * 0.5);
            default:
                return 1.0;
        }
    }

    // Content analysis helpers
    private containsStatistics(content: string): boolean {
        return /\b\d+(\.\d+)?%|\b\d+\s*(percent|percentage)|\bstatistic|\bdata\s+show|\bp\s*[<>=]\s*0?\.\d+/i.test(content);
    }

    private containsComparisons(content: string): boolean {
        return /\b(better|worse|more|less|superior|inferior|compared to|versus|vs\.)\b/i.test(content);
    }

    private containsCausalClaims(content: string): boolean {
        return /\b(because|therefore|thus|hence|as a result|leads to|causes|due to|results in)\b/i.test(content);
    }
}
