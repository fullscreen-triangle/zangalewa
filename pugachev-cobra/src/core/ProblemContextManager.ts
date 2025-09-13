/**
 * ProblemContextManager
 * 
 * Analyzes problem contexts to determine appropriate systematic bias configurations.
 * Implements meta-knowledge processing for context-dependent validation.
 */

import * as vscode from 'vscode';
import { ProblemContext } from '../types/ValidationTypes';

export class ProblemContextManager {
    private customContext: string | null = null;

    /**
     * Analyzes context from document and selection to determine problem type
     */
    async analyzeContext(
        document: vscode.TextDocument,
        selection: vscode.Selection
    ): Promise<ProblemContext> {
        const selectedText = document.getText(selection);
        const documentContext = await this.analyzeDocumentContext(document);
        
        // Refine context based on selection
        const selectionCharacteristics = this.analyzeTextCharacteristics(selectedText);
        
        return {
            ...documentContext,
            characteristics: {
                ...documentContext.characteristics,
                ...selectionCharacteristics
            },
            metadata: {
                ...documentContext.metadata,
                selectionLength: selectedText.length,
                selectionContext: this.getSelectionContext(document, selection)
            }
        };
    }

    /**
     * Analyzes entire document context
     */
    async analyzeDocumentContext(document: vscode.TextDocument): Promise<ProblemContext> {
        const text = document.getText();
        const fileName = document.fileName;
        const language = document.languageId;

        // Basic context determination
        const baseContext = this.determineBaseContext(fileName, language, text);
        const characteristics = this.analyzeTextCharacteristics(text);
        const complexity = this.estimateComplexity(text);

        return {
            type: this.customContext || baseContext.type,
            domain: baseContext.domain,
            stakes: this.assessStakes(fileName, language, text),
            characteristics,
            metadata: {
                detectedLanguage: language,
                documentType: this.classifyDocumentType(fileName, text),
                estimatedComplexity: complexity,
                userContext: this.customContext
            }
        };
    }

    private determineBaseContext(fileName: string, language: string, text: string): {type: string, domain: string} {
        const lowerFileName = fileName.toLowerCase();
        const lowerText = text.toLowerCase();

        // File name patterns
        if (lowerFileName.includes('cover') && lowerFileName.includes('letter')) {
            return { type: 'Professional Communication', domain: 'employment' };
        }
        if (lowerFileName.includes('resume') || lowerFileName.includes('cv')) {
            return { type: 'Professional Communication', domain: 'employment' };
        }
        if (lowerFileName.includes('proposal') || lowerFileName.includes('grant')) {
            return { type: 'Professional Communication', domain: 'business' };
        }
        if (lowerFileName.includes('readme') || lowerFileName.includes('doc')) {
            return { type: 'Technical Documentation', domain: 'software' };
        }

        // Content patterns
        if (this.containsMathematical(text)) {
            return { type: 'Technical Analysis', domain: 'scientific' };
        }
        if (this.containsCodePatterns(text)) {
            return { type: 'Technical Documentation', domain: 'software' };
        }
        if (this.containsAcademicPatterns(text)) {
            return { type: 'Academic Writing', domain: 'research' };
        }
        if (this.containsCreativePatterns(text)) {
            return { type: 'Creative Exploration', domain: 'creative' };
        }
        if (this.containsProfessionalPatterns(text)) {
            return { type: 'Professional Communication', domain: 'business' };
        }

        // Language-based defaults
        switch (language) {
            case 'typescript':
            case 'javascript':
            case 'python':
            case 'rust':
                return { type: 'Technical Documentation', domain: 'software' };
            case 'markdown':
                return { type: 'Technical Documentation', domain: 'general' };
            case 'latex':
                return { type: 'Academic Writing', domain: 'research' };
            default:
                return { type: 'General Analysis', domain: 'general' };
        }
    }

    private analyzeTextCharacteristics(text: string): ProblemContext['characteristics'] {
        return {
            requiresFactualAccuracy: this.requiresFactualAccuracy(text),
            allowsCreativity: this.allowsCreativity(text),
            needsConservativeTone: this.needsConservativeTone(text),
            requiresEvidence: this.requiresEvidence(text),
            mathematicalContent: this.containsMathematical(text),
            professionalContext: this.containsProfessionalPatterns(text)
        };
    }

    private assessStakes(fileName: string, language: string, text: string): 'low' | 'medium' | 'high' | 'critical' {
        const lowerFileName = fileName.toLowerCase();
        const lowerText = text.toLowerCase();

        // Critical stakes indicators
        if (lowerFileName.includes('cover') && lowerFileName.includes('letter')) return 'critical';
        if (lowerFileName.includes('proposal') || lowerFileName.includes('grant')) return 'critical';
        if (lowerText.includes('application') && lowerText.includes('position')) return 'critical';
        if (lowerText.includes('submission') && lowerText.includes('review')) return 'high';

        // High stakes indicators  
        if (lowerFileName.includes('resume') || lowerFileName.includes('cv')) return 'high';
        if (this.containsAcademicPatterns(text)) return 'high';
        if (lowerText.includes('publication') || lowerText.includes('journal')) return 'high';

        // Medium stakes indicators
        if (this.containsProfessionalPatterns(text)) return 'medium';
        if (lowerFileName.includes('readme') || lowerFileName.includes('doc')) return 'medium';

        // Default to low stakes
        return 'low';
    }

    private estimateComplexity(text: string): number {
        const length = text.length;
        const sentences = text.split(/[.!?]+/).length;
        const avgSentenceLength = length / sentences;
        
        const complexWords = (text.match(/\b\w{8,}\b/g) || []).length;
        const technicalTerms = this.countTechnicalTerms(text);
        const mathematicalExpressions = (text.match(/[\(\)\[\]{}=+\-*/^∫∑∏∆∇]/g) || []).length;

        // Normalize complexity score 0-1
        const baseComplexity = Math.min(length / 10000, 1.0); // Length factor
        const sentenceComplexity = Math.min(avgSentenceLength / 50, 1.0); // Sentence complexity
        const vocabularyComplexity = Math.min(complexWords / 100, 1.0); // Vocabulary
        const technicalComplexity = Math.min(technicalTerms / 50, 1.0); // Technical content
        const mathComplexity = Math.min(mathematicalExpressions / 20, 1.0); // Mathematical content

        return (baseComplexity + sentenceComplexity + vocabularyComplexity + technicalComplexity + mathComplexity) / 5;
    }

    private getSelectionContext(document: vscode.TextDocument, selection: vscode.Selection): string {
        const lineStart = Math.max(0, selection.start.line - 2);
        const lineEnd = Math.min(document.lineCount - 1, selection.end.line + 2);
        
        const contextRange = new vscode.Range(lineStart, 0, lineEnd, 0);
        return document.getText(contextRange);
    }

    // Helper methods for pattern detection
    private containsMathematical(text: string): boolean {
        const mathPatterns = [
            /\b(theorem|proof|lemma|corollary|equation|formula)\b/gi,
            /[\(\)\[\]{}=+\-*/^∫∑∏∆∇]/g,
            /\b\d+\.\d+\b/g, // Decimal numbers
            /\$.*\$/g, // LaTeX math mode
            /\\begin\{.*\}/g // LaTeX environments
        ];
        
        return mathPatterns.some(pattern => pattern.test(text));
    }

    private containsCodePatterns(text: string): boolean {
        const codePatterns = [
            /function\s+\w+\s*\(/gi,
            /class\s+\w+/gi,
            /import\s+.*from/gi,
            /def\s+\w+\s*\(/gi,
            /\bpublic\s+\w+\s+\w+\s*\(/gi,
            /console\.log\(/gi,
            /\breturn\s+/gi
        ];
        
        return codePatterns.some(pattern => pattern.test(text));
    }

    private containsAcademicPatterns(text: string): boolean {
        const academicPatterns = [
            /\b(abstract|introduction|methodology|results|conclusion|references|bibliography)\b/gi,
            /\b(research|study|analysis|investigation|findings|hypothesis)\b/gi,
            /\bet\s+al\./gi,
            /\b(journal|conference|proceedings|publication)\b/gi,
            /\bcitation\b/gi
        ];
        
        return academicPatterns.some(pattern => pattern.test(text));
    }

    private containsCreativePatterns(text: string): boolean {
        const creativePatterns = [
            /\b(story|narrative|character|plot|creative|imagine|fictional)\b/gi,
            /\b(poetry|poem|verse|stanza)\b/gi,
            /["'"][^"']*["'"]/g, // Quoted dialogue
        ];
        
        return creativePatterns.some(pattern => pattern.test(text)) && 
               !this.containsProfessionalPatterns(text);
    }

    private containsProfessionalPatterns(text: string): boolean {
        const professionalPatterns = [
            /\b(position|application|experience|qualification|skills)\b/gi,
            /\b(company|organization|team|project|responsibility)\b/gi,
            /\b(dear|sincerely|regards|respectfully)\b/gi,
            /\b(accomplished|achieved|managed|led|developed)\b/gi,
            /\b(proposal|recommendation|strategy|implementation)\b/gi
        ];
        
        return professionalPatterns.some(pattern => pattern.test(text));
    }

    private requiresFactualAccuracy(text: string): boolean {
        const factualIndicators = [
            /\b(statistics|data|research|study|evidence|facts)\b/gi,
            /\b(according to|based on|research shows|studies indicate)\b/gi,
            /\b\d+%/g, // Percentages
            /\b(published|peer.reviewed|journal|academic)\b/gi
        ];
        
        return factualIndicators.some(pattern => pattern.test(text));
    }

    private allowsCreativity(text: string): boolean {
        const creativityIndicators = [
            /\b(creative|innovative|novel|original|brainstorm)\b/gi,
            /\b(idea|concept|vision|imagine|explore)\b/gi,
            /\b(artistic|design|aesthetic|style)\b/gi
        ];
        
        return creativityIndicators.some(pattern => pattern.test(text)) ||
               this.containsCreativePatterns(text);
    }

    private needsConservativeTone(text: string): boolean {
        const conservativeIndicators = [
            /\b(application|proposal|formal|official|professional)\b/gi,
            /\b(respectfully|sincerely|cordially|formal)\b/gi,
            /\b(submission|request|inquiry|recommendation)\b/gi
        ];
        
        return conservativeIndicators.some(pattern => pattern.test(text));
    }

    private requiresEvidence(text: string): boolean {
        const evidenceIndicators = [
            /\b(claim|assertion|argument|hypothesis|theory)\b/gi,
            /\b(evidence|proof|data|statistics|research)\b/gi,
            /\b(citation|reference|source|study)\b/gi,
            /\b(demonstrates|indicates|suggests|proves)\b/gi
        ];
        
        return evidenceIndicators.some(pattern => pattern.test(text));
    }

    private countTechnicalTerms(text: string): number {
        const technicalPatterns = [
            /\b(algorithm|implementation|optimization|complexity)\b/gi,
            /\b(framework|architecture|methodology|paradigm)\b/gi,
            /\b(analysis|synthesis|integration|validation)\b/gi,
            /\b(computational|mathematical|theoretical|empirical)\b/gi
        ];
        
        let count = 0;
        for (const pattern of technicalPatterns) {
            const matches = text.match(pattern);
            if (matches) count += matches.length;
        }
        
        return count;
    }

    private classifyDocumentType(fileName: string, text: string): string {
        const lowerFileName = fileName.toLowerCase();
        
        if (lowerFileName.includes('.md')) return 'markdown';
        if (lowerFileName.includes('.tex')) return 'latex';
        if (lowerFileName.includes('.py')) return 'python';
        if (lowerFileName.includes('.ts') || lowerFileName.includes('.js')) return 'typescript';
        if (lowerFileName.includes('.rs')) return 'rust';
        
        // Content-based classification
        if (this.containsAcademicPatterns(text)) return 'academic-paper';
        if (this.containsCodePatterns(text)) return 'code-documentation';
        if (this.containsProfessionalPatterns(text)) return 'business-communication';
        if (this.containsCreativePatterns(text)) return 'creative-writing';
        
        return 'general-text';
    }

    // Public methods for context management
    async setContext(contextType: string): Promise<void> {
        this.customContext = contextType;
    }

    async setCustomContext(customContext: string): Promise<void> {
        this.customContext = customContext;
    }

    getCustomContext(): string | null {
        return this.customContext;
    }

    clearCustomContext(): void {
        this.customContext = null;
    }
}
