// src/lib/department-mapper.ts
// Maps patient chief complaints to departments using keyword matching.

export interface DepartmentMatch {
    departmentId: string;
    departmentName: string;
    departmentCode: string;
    confidence: number; // 0-1
    matchedKeywords: string[];
}

interface DepartmentRow {
    id: string;
    name: string;
    code: string;
    keywords: string[];
}

/**
 * Given a chief complaint string and a list of departments (with their keywords),
 * return the best-matching department. Falls back to Emergency Medicine.
 */
export function mapComplaintToDepartment(
    complaint: string,
    departments: DepartmentRow[]
): DepartmentMatch {
    const lowerComplaint = complaint.toLowerCase();
    const words = lowerComplaint.split(/[\s,;.]+/).filter(Boolean);

    let bestMatch: DepartmentMatch | null = null;

    for (const dept of departments) {
        const matchedKeywords: string[] = [];

        for (const keyword of dept.keywords) {
            const lowerKeyword = keyword.toLowerCase();
            // Check if the keyword phrase appears in the complaint
            if (lowerComplaint.includes(lowerKeyword)) {
                matchedKeywords.push(keyword);
            } else {
                // Check individual words in multi-word keywords
                const kwWords = lowerKeyword.split(/\s+/);
                const wordMatch = kwWords.some(kw => words.includes(kw));
                if (wordMatch && kwWords.length === 1) {
                    matchedKeywords.push(keyword);
                }
            }
        }

        if (matchedKeywords.length === 0) continue;

        // Confidence = ratio of matched keywords, boosted by phrase matches
        const phraseMatches = matchedKeywords.filter(kw =>
            lowerComplaint.includes(kw.toLowerCase()) && kw.includes(' ')
        ).length;
        const confidence = Math.min(
            1,
            (matchedKeywords.length / Math.max(dept.keywords.length, 1)) * 2 +
            phraseMatches * 0.2
        );

        if (!bestMatch || confidence > bestMatch.confidence) {
            bestMatch = {
                departmentId: dept.id,
                departmentName: dept.name,
                departmentCode: dept.code,
                confidence,
                matchedKeywords,
            };
        }
    }

    // Fall back to Emergency Medicine
    if (!bestMatch) {
        const emergency = departments.find(d => d.code === 'EM');
        return {
            departmentId: emergency?.id ?? '',
            departmentName: emergency?.name ?? 'Emergency Medicine',
            departmentCode: 'EM',
            confidence: 0.1,
            matchedKeywords: [],
        };
    }

    return bestMatch;
}
