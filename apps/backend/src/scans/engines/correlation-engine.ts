import { FindingTemplate } from './engine-commands-advanced';

/**
 * Correlation & Deduplication Engine for SecureLens
 * Intelligently merges findings from multiple tools to eliminate duplicates
 * and provide a unified, actionable security report.
 */

export interface CorrelatedFinding {
  id: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: string;
  cwe?: string;
  cvss?: number;
  owasp?: string;
  remediation: string;
  sources: Array<{
    tool: string;
    originalTitle: string;
    confidence: number;
  }>;
  firstSeen: Date;
  lastSeen: Date;
  occurrenceCount: number;
  metadata?: Record<string, any>;
}

export class CorrelationEngine {
  /**
   * Normalize finding data to consistent format for comparison
   */
  private static normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[^\w\s-]/g, '');
  }

  /**
   * Calculate similarity between two strings (0-1 scale)
   */
  private static calculateSimilarity(text1: string, text2: string): number {
    const a = this.normalizeText(text1);
    const b = this.normalizeText(text2);

    if (a === b) return 1.0;
    if (a.length === 0 || b.length === 0) return 0;

    // Levenshtein distance
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const cost = a[j - 1] === b[i - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const maxLen = Math.max(a.length, b.length);
    const distance = matrix[b.length][a.length];
    return 1 - distance / maxLen;
  }

  /**
   * Check if two findings are likely the same issue
   */
  private static areSimilarFindings(
    f1: FindingTemplate & { source?: string },
    f2: FindingTemplate & { source?: string },
    threshold: number = 0.7
  ): boolean {
    // Exact match on category + severity
    if (f1.category !== f2.category || f1.severity !== f2.severity) {
      return false;
    }

    // Similar titles/descriptions
    const titleSimilarity = this.calculateSimilarity(f1.title, f2.title);
    const descSimilarity = this.calculateSimilarity(f1.description, f2.description);

    const avgSimilarity = (titleSimilarity + descSimilarity) / 2;

    // CWE match
    if (f1.cwe && f2.cwe && f1.cwe === f2.cwe) {
      return true;
    }

    return avgSimilarity >= threshold;
  }

  /**
   * Main correlation function: deduplicate and merge findings
   */
  static correlateFindings(
    findings: Array<FindingTemplate & { source?: string; tool?: string }>
  ): CorrelatedFinding[] {
    if (findings.length === 0) return [];

    const correlated: Map<string, CorrelatedFinding> = new Map();
    const processed = new Set<number>();

    findings.forEach((finding, index) => {
      if (processed.has(index)) return;

      const source = finding.source || finding.tool || 'unknown';
      let foundGroup = false;

      // Try to match with existing correlated findings
      for (const correlatedId of correlated.keys()) {
        const group = correlated.get(correlatedId)!;

        // Check if this finding matches the group
        if (this.areSimilarFindings(finding, {
          title: group.title,
          description: group.description,
          severity: group.severity,
          category: group.category,
          source: group.sources[0]?.tool || 'unknown',
          cwe: group.cwe,
          remediation: group.remediation,
        })) {
          // Add to group
          group.sources.push({
            tool: source,
            originalTitle: finding.title,
            confidence: 0.9,
          });
          group.lastSeen = new Date();
          group.occurrenceCount++;

          // Update severity if this finding is more critical
          const severityRank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0 };
          if (severityRank[finding.severity] > severityRank[group.severity]) {
            group.severity = finding.severity;
          }

          processed.add(index);
          foundGroup = true;
          break;
        }
      }

      // Create new correlated finding if no match found
      if (!foundGroup) {
        const id = `${finding.category}:${this.normalizeText(finding.title)}`;
        correlated.set(id, {
          id,
          title: finding.title,
          description: finding.description,
          severity: finding.severity,
          category: finding.category,
          cwe: finding.cwe,
          cvss: finding.cvss,
          owasp: finding.owasp,
          remediation: finding.remediation,
          sources: [{
            tool: source,
            originalTitle: finding.title,
            confidence: 1.0,
          }],
          firstSeen: new Date(),
          lastSeen: new Date(),
          occurrenceCount: 1,
          metadata: finding.metadata,
        });
        processed.add(index);
      }
    });

    // Sort by severity and occurrence
    const severityScore = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0 };
    return Array.from(correlated.values()).sort((a, b) => {
      const severityDiff = severityScore[b.severity] - severityScore[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.occurrenceCount - a.occurrenceCount;
    });
  }

  /**
   * Identify duplicate findings within a correlated set
   */
  static identifyDuplicates(findings: CorrelatedFinding[]): Map<string, string[]> {
    const duplicateGroups: Map<string, string[]> = new Map();

    findings.forEach(f1 => {
      findings.forEach(f2 => {
        if (f1.id !== f2.id && f1.severity === f2.severity && f1.category === f2.category) {
          const similarity = this.calculateSimilarity(f1.title, f2.title);
          if (similarity > 0.8) {
            const groupKey = [f1.id, f2.id].sort().join('|');
            if (!duplicateGroups.has(groupKey)) {
              duplicateGroups.set(groupKey, []);
            }
            if (!duplicateGroups.get(groupKey)!.includes(f1.id)) {
              duplicateGroups.get(groupKey)!.push(f1.id);
            }
            if (!duplicateGroups.get(groupKey)!.includes(f2.id)) {
              duplicateGroups.get(groupKey)!.push(f2.id);
            }
          }
        }
      });
    });

    return duplicateGroups;
  }

  /**
   * Merge correlated findings with similar findings
   */
  static mergeCorrelatedFindings(correlated: CorrelatedFinding[]): CorrelatedFinding[] {
    const merged: CorrelatedFinding[] = [];
    const processed = new Set<string>();

    correlated.forEach(finding => {
      if (processed.has(finding.id)) return;

      // Look for similar findings to merge
      let mergedFinding = { ...finding };

      correlated.forEach(other => {
        if (
          !processed.has(other.id) &&
          finding.id !== other.id &&
          finding.severity === other.severity &&
          finding.category === other.category
        ) {
          const similarity = this.calculateSimilarity(finding.title, other.title);
          if (similarity > 0.75) {
            // Merge
            mergedFinding.sources.push(...other.sources);
            mergedFinding.occurrenceCount += other.occurrenceCount;
            mergedFinding.metadata = {
              ...mergedFinding.metadata,
              ...other.metadata,
            };
            processed.add(other.id);
          }
        }
      });

      // Deduplicate sources
      const uniqueSources = new Map<string, typeof mergedFinding.sources[0]>();
      mergedFinding.sources.forEach(source => {
        const key = source.tool;
        if (!uniqueSources.has(key) || source.confidence > uniqueSources.get(key)!.confidence) {
          uniqueSources.set(key, source);
        }
      });
      mergedFinding.sources = Array.from(uniqueSources.values());

      merged.push(mergedFinding);
      processed.add(finding.id);
    });

    return merged;
  }

  /**
   * Apply severity boost based on corroboration from multiple tools
   */
  static boostSeverityByCorroboration(findings: CorrelatedFinding[]): CorrelatedFinding[] {
    const severityMap: Record<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO', number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
      INFO: 0,
    };

    const reverseMap: Record<number, 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'> = {
      0: 'INFO',
      1: 'LOW',
      2: 'MEDIUM',
      3: 'HIGH',
      4: 'CRITICAL',
    };

    return findings.map(f => ({
      ...f,
      severity: this.boostSeverityIfMultipleSources(f, severityMap, reverseMap),
    }));
  }

  private static boostSeverityIfMultipleSources(
    finding: CorrelatedFinding,
    severityMap: Record<string, number>,
    reverseMap: Record<number, string>
  ): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' {
    // If multiple tools found the same issue, boost severity
    if (finding.sources.length >= 3) {
      const currentScore = severityMap[finding.severity];
      const boostedScore = Math.min(4, currentScore + 1);
      return reverseMap[boostedScore] as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
    }
    return finding.severity;
  }

  /**
   * Full pipeline: correlate, merge, and boost
   */
  static processFindings(
    findings: Array<FindingTemplate & { source?: string; tool?: string }>
  ): CorrelatedFinding[] {
    const correlated = this.correlateFindings(findings);
    const merged = this.mergeCorrelatedFindings(correlated);
    const boosted = this.boostSeverityByCorroboration(merged);
    return boosted;
  }
}

export default CorrelationEngine;
