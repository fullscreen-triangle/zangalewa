/**
 * ToneAnalysisProcessor
 * 
 * Specialized processor for tone analysis and appropriateness assessment.
 * Important for professional communication contexts.
 */

import { ValidationTask, ProblemContext, SystematicBias, TaskResult } from '../../types/ValidationTypes';
import { TerminationCriteria } from '../TerminationCriteria';

export class ToneAnalysisProcessor {

    async process(
        task: ValidationTask,
        content: string,
        systematicBias: SystematicBias,
        context: ProblemContext,
        terminationCriteria: TerminationCriteria
    ): Promise<TaskResult> {
        const startTime = Date.now();
        const issues: any[] = [];
        let adequacyContribution = 0.7;
        let confidence = 0.75;

        try {
            // Analyze tone appropriateness for context
            const toneIssues = this.analyzeToneAppropriateness(content, context);
            issues.push(...toneIssues);

            // Check formality level
            const formalityIssues = this.checkFormalityLevel(content, context);
            issues.push(...formalityIssues);

            // Analyze emotional tone
            const emotionalIssues = this.analyzeEmotionalTone(content, context);
            issues.push(...emotionalIssues);

            // Check professional language use
            const professionalIssues = this.checkProfessionalLanguage(content, context);
            issues.push(...professionalIssues);

            // Adjust adequacy based on findings
            if (issues.filter(i => i.severity === 'error').length > 0) {
                adequacyContribution = 0.4;
                confidence = 0.6;
            } else if (issues.filter(i => i.severity === 'warning').length > 1) {
                adequacyContribution = 0.6;
                confidence = 0.7;
            }

            // Apply context-specific weighting
            if (context.characteristics.needsConservativeTone) {
                adequacyContribution *= 1.1; // Higher importance for conservative contexts
            }

            const processingTime = Date.now() - startTime;

            return {
                taskId: task.id,
                success: true,
                adequacyContribution: Math.min(adequacyContribution, 1.0),
                importanceWeight: task.importance,
                processingTimeMs: processingTime,
                issues,
                confidence,
                metadata: {
                    terminationReason: 'tone_analysis_completed',
                    processingSteps: this.calculateProcessingSteps(content),
                    resourcesUsed: {
                        toneIndicators: this.countToneIndicators(content),
                        formalityMarkers: this.countFormalityMarkers(content)
                    }
                }
            };

        } catch (error) {
            return this.createErrorResult(task, startTime, error);
        }
    }

    private analyzeToneAppropriateness(content: string, context: ProblemContext): any[] {
        const issues: any[] = [];

        // Check for inappropriate casualness in formal contexts
        if (context.characteristics.professionalContext || context.stakes === 'critical') {
            const casualPatterns = [
                /\b(hey|hi there|yo|sup|what's up)\b/gi,
                /\b(gonna|wanna|gotta|kinda|sorta)\b/gi,
                /\b(awesome|cool|sweet|neat|rad)\b/gi,
                /\b(stuff|things|whatever|anyways)\b/gi
            ];

            for (const pattern of casualPatterns) {
                const matches = content.match(pattern);
                if (matches) {
                    issues.push({
                        message: `Casual language detected in professional context: "${matches[0]}"`,
                        severity: 'warning',
                        confidence: 0.8,
                        category: 'tonal',
                        suggestions: [
                            'Use more formal language',
                            'Replace casual expressions with professional alternatives',
                            'Consider the formality expected in this context'
                        ]
                    });
                }
            }
        }

        // Check for overly formal tone in creative contexts
        if (context.characteristics.allowsCreativity && context.type === 'Creative Exploration') {
            const overlyFormalPatterns = [
                /\b(pursuant to|henceforth|heretofore|aforementioned)\b/gi,
                /\b(I am writing to inform|please be advised|it has come to my attention)\b/gi
            ];

            for (const pattern of overlyFormalPatterns) {
                const matches = content.match(pattern);
                if (matches) {
                    issues.push({
                        message: 'Very formal language in creative context - consider more natural tone',
                        severity: 'info',
                        confidence: 0.6,
                        category: 'tonal',
                        suggestions: [
                            'Use more natural, conversational language',
                            'Consider if formal tone fits the creative context',
                            'Balance professionalism with accessibility'
                        ]
                    });
                }
            }
        }

        return issues;
    }

    private checkFormalityLevel(content: string, context: ProblemContext): any[] {
        const issues: any[] = [];

        // Calculate formality score
        const formalityScore = this.calculateFormalityScore(content);
        
        let expectedFormality = 0.5; // Base expectation
        
        switch (context.type) {
            case 'Professional Communication':
                expectedFormality = 0.8;
                break;
            case 'Academic Writing':
                expectedFormality = 0.9;
                break;
            case 'Technical Documentation':
                expectedFormality = 0.7;
                break;
            case 'Creative Exploration':
                expectedFormality = 0.4;
                break;
        }

        // Adjust for stakes
        if (context.stakes === 'critical') {
            expectedFormality = Math.min(expectedFormality + 0.2, 1.0);
        }

        const formalityDifference = Math.abs(formalityScore - expectedFormality);
        
        if (formalityDifference > 0.3) {
            const message = formalityScore < expectedFormality
                ? 'Tone may be too informal for this context'
                : 'Tone may be overly formal for this context';
                
            issues.push({
                message: `${message} (Score: ${formalityScore.toFixed(2)}, Expected: ${expectedFormality.toFixed(2)})`,
                severity: formalityDifference > 0.4 ? 'warning' : 'info',
                confidence: 0.7,
                category: 'tonal',
                suggestions: [
                    formalityScore < expectedFormality
                        ? 'Consider using more formal language and structure'
                        : 'Consider using more accessible, less formal language',
                    'Review tone expectations for this context',
                    'Balance professionalism with readability'
                ]
            });
        }

        return issues;
    }

    private analyzeEmotionalTone(content: string, context: ProblemContext): any[] {
        const issues: any[] = [];

        // Check for overly emotional language in professional contexts
        if (context.characteristics.professionalContext) {
            const emotionalPatterns = [
                { pattern: /\b(love|hate|adore|despise|amazing|terrible|awful|fantastic)\b/gi, type: 'strong_emotions' },
                { pattern: /!{2,}|\b(very|really|extremely|incredibly|absolutely)\s+\w+/gi, type: 'intensity' },
                { pattern: /\b(furious|ecstatic|devastated|thrilled|outraged)\b/gi, type: 'extreme_emotions' }
            ];

            for (const { pattern, type } of emotionalPatterns) {
                const matches = content.match(pattern);
                if (matches && matches.length > 0) {
                    issues.push({
                        message: `Strong emotional language detected in professional context (${type})`,
                        severity: 'info',
                        confidence: 0.6,
                        category: 'tonal',
                        suggestions: [
                            'Consider more neutral, professional language',
                            'Use measured, objective descriptions',
                            'Maintain professional tone throughout'
                        ]
                    });
                }
            }
        }

        // Check for lack of enthusiasm in contexts that benefit from it
        if (context.type === 'Professional Communication' && 
            context.domain === 'employment' &&
            context.characteristics.allowsCreativity) {
            
            const enthusiasmIndicators = /\b(excited|enthusiastic|passionate|eager|motivated|looking forward)\b/gi;
            const matches = content.match(enthusiasmIndicators);
            
            if (!matches || matches.length === 0) {
                issues.push({
                    message: 'Consider adding some enthusiasm or motivation language',
                    severity: 'info',
                    confidence: 0.5,
                    category: 'tonal',
                    suggestions: [
                        'Show enthusiasm for the opportunity',
                        'Express motivation and interest',
                        'Balance professionalism with personality'
                    ]
                });
            }
        }

        return issues;
    }

    private checkProfessionalLanguage(content: string, context: ProblemContext): any[] {
        const issues: any[] = [];

        if (!context.characteristics.professionalContext) {
            return issues; // Skip if not professional context
        }

        // Check for unprofessional elements
        const unprofessionalPatterns = [
            { pattern: /\b(like|um|uh|er|you know)\b/gi, message: 'Filler words detected' },
            { pattern: /\b(basically|pretty much|kind of|sort of)\b/gi, message: 'Vague qualifiers detected' },
            { pattern: /[.]{3,}|\?{2,}|!{2,}/g, message: 'Excessive punctuation detected' }
        ];

        for (const { pattern, message } of unprofessionalPatterns) {
            const matches = content.match(pattern);
            if (matches && matches.length > 1) {
                issues.push({
                    message: `${message} in professional context`,
                    severity: 'info',
                    confidence: 0.6,
                    category: 'tonal',
                    suggestions: [
                        'Remove filler words and vague qualifiers',
                        'Use precise, professional language',
                        'Proofread for professional presentation'
                    ]
                });
            }
        }

        // Check for appropriate professional greetings/closings
        if (context.type === 'Professional Communication') {
            const hasGreeting = /\b(dear|hello|greetings|to whom it may concern)\b/gi.test(content);
            const hasClosing = /\b(sincerely|regards|best regards|thank you|respectfully)\b/gi.test(content);
            
            if (content.length > 200) { // Only for longer communications
                if (!hasGreeting) {
                    issues.push({
                        message: 'Consider adding a professional greeting',
                        severity: 'info',
                        confidence: 0.5,
                        category: 'tonal',
                        suggestions: [
                            'Add appropriate professional greeting',
                            'Use "Dear [Name]" for formal communications',
                            'Consider context-appropriate openings'
                        ]
                    });
                }
                
                if (!hasClosing) {
                    issues.push({
                        message: 'Consider adding a professional closing',
                        severity: 'info',
                        confidence: 0.5,
                        category: 'tonal',
                        suggestions: [
                            'Add professional closing like "Sincerely" or "Best regards"',
                            'Include your name after the closing',
                            'Match closing formality to greeting'
                        ]
                    });
                }
            }
        }

        return issues;
    }

    private calculateFormalityScore(content: string): number {
        let score = 0.5; // Base score

        // Formal indicators (increase score)
        const formalIndicators = [
            /\b(therefore|furthermore|however|moreover|nevertheless|consequently)\b/gi,
            /\b(utilize|demonstrate|facilitate|implement|establish)\b/gi,
            /\b(I am writing to|please find|I would like to)\b/gi,
            /\b(sincerely|respectfully|cordially)\b/gi
        ];

        // Informal indicators (decrease score)
        const informalIndicators = [
            /\b(gonna|wanna|can't|won't|don't|isn't)\b/gi,
            /\b(cool|awesome|great|nice|fun)\b/gi,
            /\b(hey|hi|bye|ok|yeah)\b/gi,
            /\b(stuff|things|get|got|big|small)\b/gi
        ];

        // Count formal indicators
        for (const pattern of formalIndicators) {
            const matches = content.match(pattern);
            if (matches) {
                score += matches.length * 0.05;
            }
        }

        // Count informal indicators
        for (const pattern of informalIndicators) {
            const matches = content.match(pattern);
            if (matches) {
                score -= matches.length * 0.03;
            }
        }

        // Sentence length factor (longer sentences tend to be more formal)
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const avgSentenceLength = content.length / sentences.length;
        score += Math.min((avgSentenceLength - 50) / 200, 0.2);

        return Math.max(0, Math.min(score, 1.0));
    }

    private calculateProcessingSteps(content: string): number {
        const baseSteps = 6;
        const lengthFactor = Math.min(content.length / 500, 8);
        const complexityFactor = this.calculateFormalityScore(content) * 2;
        
        return Math.ceil(baseSteps + lengthFactor + complexityFactor);
    }

    private countToneIndicators(content: string): number {
        const indicators = [
            /\b(awesome|cool|great|amazing|terrible|awful)\b/gi,
            /\b(love|hate|adore|despise)\b/gi,
            /!{2,}/g,
            /\b(very|really|extremely|incredibly)\b/gi
        ];
        
        return indicators.reduce((total, pattern) => {
            const matches = content.match(pattern);
            return total + (matches ? matches.length : 0);
        }, 0);
    }

    private countFormalityMarkers(content: string): number {
        const formalMarkers = [
            /\b(therefore|furthermore|however|moreover)\b/gi,
            /\b(utilize|demonstrate|facilitate|implement)\b/gi,
            /\b(sincerely|respectfully|cordially)\b/gi
        ];
        
        return formalMarkers.reduce((total, pattern) => {
            const matches = content.match(pattern);
            return total + (matches ? matches.length : 0);
        }, 0);
    }

    private createErrorResult(task: ValidationTask, startTime: number, error: any): TaskResult {
        return {
            taskId: task.id,
            success: false,
            adequacyContribution: 0,
            importanceWeight: task.importance,
            processingTimeMs: Date.now() - startTime,
            issues: [{
                message: `Tone analysis failed: ${error.message || 'Unknown error'}`,
                severity: 'error',
                confidence: 0.9,
                category: 'processing'
            }],
            confidence: 0,
            metadata: {
                terminationReason: 'processing_error',
                processingSteps: 1,
                resourcesUsed: { error: error.message }
            }
        };
    }
}
