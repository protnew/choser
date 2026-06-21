/**
 * Auto-table builder from council votes
 * Aggregates scores, prices, links from all persona votes
 */

export function buildTableFromVotes(votes, maxObjects = 0, maxParams = 0) {
    const allScores = {};
    const paramSet = new Set();
    const prices = {};
    const links = {};

    for (const v of votes) {
        // Extract prices and links from parsed vote
        if (v.prices && typeof v.prices === 'object') {
            for (const [name, price] of Object.entries(v.prices)) {
                if (!prices[name]) prices[name] = String(price);
            }
        }
        if (v.links && typeof v.links === 'object') {
            for (const [name, link] of Object.entries(v.links)) {
                if (!links[name]) links[name] = String(link);
            }
        }

        if (!v.scores) continue;
        for (const [objName, params] of Object.entries(v.scores)) {
            if (typeof params !== 'object') continue;
            if (!allScores[objName]) allScores[objName] = {};
            for (const [param, val] of Object.entries(params)) {
                // Handle both {grade, reason, source} and plain number
                let grade, reason, source;
                if (typeof val === 'object' && val !== null) {
                    grade = typeof val.grade === 'number' ? val.grade : parseFloat(val.grade);
                    reason = val.reason || '';
                    source = val.source || '';
                } else {
                    grade = typeof val === 'number' ? val : parseFloat(val);
                    reason = '';
                    source = '';
                }
                if (isNaN(grade)) continue;
                paramSet.add(param);
                if (!allScores[objName][param]) allScores[objName][param] = { grades: [], reasons: [], sources: [] };
                allScores[objName][param].grades.push(grade);
                if (reason) allScores[objName][param].reasons.push(reason);
                if (source) allScores[objName][param].sources.push(source);
            }
        }
    }

    const objNames = Object.keys(allScores);
    let paramNames = [...paramSet];

    // FORCE TRIM to requested dimensions
    if (maxParams > 0 && paramNames.length > maxParams) {
        // Sort params by vote count (most votes = most agreed upon) then alphabetical
        const paramVoteCounts = {};
        for (const p of paramNames) {
            let cnt = 0;
            for (const v of votes) {
                if (!v.scores) continue;
                for (const obj of Object.values(v.scores)) {
                    if (obj && obj[p] !== undefined) cnt++;
                }
            }
            paramVoteCounts[p] = cnt;
        }
        paramNames.sort((a, b) => (paramVoteCounts[b] - paramVoteCounts[a]) || a.localeCompare(b));
        paramNames = paramNames.slice(0, maxParams);
    }
    if (maxObjects > 0 && objNames.length > maxObjects) {
        // Sort objects by average grade descending (keep top ones)
        objNames.sort((a, b) => {
            const avgA = paramNames.reduce((s, p) => { const d = allScores[a]?.[p]; return s + (d?.grades.length ? d.grades.reduce((x,y)=>x+y,0)/d.grades.length : 0); }, 0);
            const avgB = paramNames.reduce((s, p) => { const d = allScores[b]?.[p]; return s + (d?.grades.length ? d.grades.reduce((x,y)=>x+y,0)/d.grades.length : 0); }, 0);
            return avgB - avgA;
        });
        objNames.splice(maxObjects);
    }

    console.log(`[Auto-table] After trim: ${objNames.length} objects × ${paramNames.length} params (limits: obj=${maxObjects}, param=${maxParams})`);

    if (objNames.length > 0 && paramNames.length > 0) {
        const columns = paramNames.map(p => ({
            name: p,
            weight: Math.round(100 / paramNames.length)
        }));

        const objects = objNames.map(name => {
            const scores = {};
            for (const p of paramNames) {
                const d = allScores[name]?.[p];
                if (d && d.grades.length > 0) {
                    const avgGrade = Math.round(d.grades.reduce((a, b) => a + b, 0) / d.grades.length * 10) / 10;
                    const roundedGrade = Math.round(avgGrade);
                    // Build description: grade + best reason
                    let desc = '';
                    if (d.reasons.length > 0) {
                        // Pick the longest/most informative reason
                        const bestReason = d.reasons.sort((a, b) => b.length - a.length)[0];
                        desc = bestReason;
                        if (desc.length > 150) desc = desc.substring(0, 147) + '...';
                    } else {
                        desc = `${roundedGrade}/10`;
                    }
                    // Add source if available
                    let src = '';
                    if (d.sources.length > 0) {
                        src = d.sources.find(s => s.startsWith('http')) || d.sources[0];
                    }
                    scores[p] = { grade: roundedGrade, value: desc, source: src };
                } else {
                    scores[p] = { grade: 0, value: '—', source: '' };
                }
            }
            return {
                name,
                scores,
                price: prices[name] || '—',
                link: links[name] || ''
            };
        });

        // Sort by average grade descending
        objects.sort((a, b) => {
            const avgA = paramNames.reduce((s, p) => s + (a.scores[p]?.grade || 0), 0) / paramNames.length;
            const avgB = paramNames.reduce((s, p) => s + (b.scores[p]?.grade || 0), 0) / paramNames.length;
            return avgB - avgA;
        });

        return { parameters: columns, objects };
    }

    return null;
}
