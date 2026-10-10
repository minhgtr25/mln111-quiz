/* ==========================================================
           2. DATABASE INITIALIZATION & ROBUST TXT PARSER
           ========================================================== */
        let DB = [];
        let DBHasRuleLinks = false;
        let state = {
            view: 'practice',
            filter: 'all', // all | starred | wrong | rule
            activeRuleId: null,
            pool: [],
            prIdx: 0,
            fcIdx: 0,
            fcFlipped: false,
            prAnswered: false,
            waitingAfterWrong: false,
            prScore: 0,
            autoAdvanceTimer: null,
            rollbackQueue: [],
            startTime: Date.now(),
            responseDurations: [],
            audioOn: true,
            starred: new Set(JSON.parse(localStorage.getItem('mln_star_v2') || '[]')),
            wrong: new Set(JSON.parse(localStorage.getItem('mln_err_v2') || '[]')),
            answered: new Set(JSON.parse(localStorage.getItem('mln_answered_v1') || '[]')),
            correct: new Set(JSON.parse(localStorage.getItem('mln_correct_v1') || '[]')),
            examList: [],
            examIdx: 0,
            examAnswers: {},
            examTimer: null,
            examSeconds: 35 * 60,
            ruleQuestionsMap: {}
        };

        // Hàm phân tách văn bản từ file TXT thuần túy thành mảng JSON chuẩn
        // Timestamped per-question state lets signed-in devices merge progress changes.
        let progressMeta = {};
        try { progressMeta = JSON.parse(localStorage.getItem('mln_progress_meta_v1') || '{}') || {}; } catch (e) { progressMeta = {}; }
        progressMeta.starred = progressMeta.starred || {};
        progressMeta.wrong = progressMeta.wrong || {};
        progressMeta.answered = progressMeta.answered || {};
        progressMeta.correct = progressMeta.correct || {};
        [...state.starred].forEach(id => { if (!progressMeta.starred[id]) progressMeta.starred[id] = { value: true, updatedAt: 0 }; });
        [...state.wrong].forEach(id => { if (!progressMeta.wrong[id]) progressMeta.wrong[id] = { value: true, updatedAt: 0 }; });
        [...state.answered].forEach(id => { if (!progressMeta.answered[id]) progressMeta.answered[id] = { value: true, updatedAt: 0 }; });
        [...state.correct].forEach(id => { if (!progressMeta.correct[id]) progressMeta.correct[id] = { value: true, updatedAt: 0 }; });
        let savedStarred = new Set(state.starred);
        let savedWrong = new Set(state.wrong);
        let savedAnswered = new Set(state.answered);
        let savedCorrect = new Set(state.correct);

        function persistProgressLocally() {
            localStorage.setItem('mln_star_v2', JSON.stringify([...state.starred]));
            localStorage.setItem('mln_err_v2', JSON.stringify([...state.wrong]));
            localStorage.setItem('mln_answered_v1', JSON.stringify([...state.answered]));
            localStorage.setItem('mln_correct_v1', JSON.stringify([...state.correct]));
            localStorage.setItem('mln_progress_meta_v1', JSON.stringify(progressMeta));
        }
        window.exportMLNProgress = () => ({ version: 1, starred: progressMeta.starred, wrong: progressMeta.wrong, answered: progressMeta.answered, correct: progressMeta.correct });
        window.mergeMLNProgress = function(remote) {
            remote = remote || {};
            ['starred', 'wrong', 'answered', 'correct'].forEach(kind => {
                const merged = { ...(progressMeta[kind] || {}) };
                Object.entries(remote[kind] || {}).forEach(([id, item]) => {
                    const localTime = Number(merged[id] && merged[id].updatedAt || 0);
                    const remoteTime = Number(item && item.updatedAt || 0);
                    if (!merged[id] || remoteTime >= localTime) merged[id] = item;
                });
                progressMeta[kind] = merged;
            });
            state.starred = new Set(Object.entries(progressMeta.starred).filter(([, item]) => item && item.value).map(([id]) => Number(id)));
            state.wrong = new Set(Object.entries(progressMeta.wrong).filter(([, item]) => item && item.value).map(([id]) => Number(id)));
            state.answered = new Set(Object.entries(progressMeta.answered).filter(([, item]) => item && item.value).map(([id]) => Number(id)));
            state.correct = new Set(Object.entries(progressMeta.correct).filter(([, item]) => item && item.value).map(([id]) => Number(id)));
            savedStarred = new Set(state.starred);
            savedWrong = new Set(state.wrong);
            savedAnswered = new Set(state.answered);
            savedCorrect = new Set(state.correct);
            persistProgressLocally();
            if (DB.length) { refreshProgressMetrics(); renderPracticeQuestion(); renderBrowse(); }
            return window.exportMLNProgress();
        };

        function parseMLNText(rawText) {
            if (!rawText || !rawText.trim()) return [];
            
            // Tách theo từ khóa QUESTION:
            const rawBlocks = rawText.split(/(?:^QUESTION:\s*|\nQUESTION:\s*)/i);
            const parsed = [];
            const optRegex = /^([A-Fa-f])\s*[\.\)]\s*(.*)$/;

            rawBlocks.forEach((block) => {
                const b = block.trim();
                if (!b) return;

                const ansMatch = b.match(/ANSWER:\s*([A-Za-z0-9, ]+)/i);
                const ans = ansMatch ? ansMatch[1].trim().toUpperCase() : 'A';
                const body = ansMatch ? b.substring(0, ansMatch.index).trim() : b;

                const lines = body.split('\n').map(l => l.trim()).filter(Boolean);
                const qLines = [];
                const opts = [];
                let isOptPhase = false;

                lines.forEach(line => {
                    const optMatch = line.match(optRegex);
                    if (optMatch && (isOptPhase || optMatch[1].toUpperCase() === 'A')) {
                        isOptPhase = true;
                        opts.push(optMatch[2].trim());
                    } else {
                        if (!isOptPhase) {
                            qLines.push(line);
                        } else {
                            if (opts.length > 0) {
                                opts[opts.length - 1] += " " + line;
                            } else {
                                qLines.push(line);
                            }
                        }
                    }
                });

                const qText = qLines.join(' ').replace(/^Select these \d+\s*/i, '').trim();
                if (qText) {
                    parsed.push({
                        id: parsed.length + 1,
                        q: qText,
                        opts: opts.length > 0 ? opts : ["Đúng", "Sai", "Khác"],
                        ans: ans.length > 1 ? ans.charAt(0) : ans
                    });
                }
            });

            return parsed;
        }

        // Tự động phân loại tất cả câu hỏi vào từng Mẹo tương ứng
        function mapAllQuestionsToRules() {
            state.ruleQuestionsMap = {};
            RULES_CONFIG.forEach(rule => { state.ruleQuestionsMap[rule.id] = []; });

            if (DBHasRuleLinks) {
                DB.forEach(q => (q.ruleIds || []).forEach(ruleId => {
                    if (state.ruleQuestionsMap[ruleId]) state.ruleQuestionsMap[ruleId].push(q);
                }));
                return;
            }

            DB.forEach(q => {
                const ansIdx = q.ans.charCodeAt(0) - 65;
                const ansText = q.opts[ansIdx] || '';
                RULES_CONFIG.forEach(rule => {
                    if (rule.matcher(q, ansText)) state.ruleQuestionsMap[rule.id].push(q);
                });
            });
        }

        async function initDatabase() {
            const cachedText = localStorage.getItem('mln_db_cache_v3');
            let cached = null;
            try { cached = cachedText ? JSON.parse(cachedText) : null; } catch (e) {}

            // A manual import remains this browser's active bank until the user clears it.
            if (localStorage.getItem('mln_db_source_override_v1') === '1' && Array.isArray(cached) && cached.length > 50) {
                DB = cached;
                DBHasRuleLinks = DB.every(q => Array.isArray(q.ruleIds));
                onDatabaseReady();
                return;
            }

            // Prefer the canonical bank and rule links stored in Supabase.
            try {
                const supabaseClient = window.MLN_SUPABASE;
                if (supabaseClient) {
                    const { data, error } = await supabaseClient
                        .from('questions')
                        .select('id, question, correct_option, question_options(option_key, option_text, option_order), rule_questions(rule_id)')
                        .order('id');
                    if (!error && Array.isArray(data) && data.length > 0) {
                        DB = data.map(row => ({
                            id: row.id,
                            q: row.question,
                            opts: (row.question_options || []).sort((a, b) => a.option_order - b.option_order).map(option => option.option_text),
                            ans: row.correct_option,
                            ruleIds: (row.rule_questions || []).map(link => link.rule_id)
                        }));
                        DBHasRuleLinks = true;
                        localStorage.setItem('mln_db_cache_v3', JSON.stringify(DB));
                        onDatabaseReady();
                        return;
                    }
                    if (error) console.warn('Supabase question bank unavailable; using local fallback.', error.message);
                }
            } catch (error) {
                console.warn('Supabase question bank unavailable; using local fallback.', error);
            }

            // Use the browser cache or bundled JSON while the database is being seeded/offline.
            if (Array.isArray(cached) && cached.length > 50) {
                DB = cached;
                DBHasRuleLinks = DB.every(q => Array.isArray(q.ruleIds));
                onDatabaseReady();
                return;
            }

            try {
                const res = await fetch('./questions.json');
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        DB = data;
                        DBHasRuleLinks = false;
                        localStorage.setItem('mln_db_cache_v3', JSON.stringify(DB));
                        onDatabaseReady();
                        return;
                    }
                }
            } catch (error) {}

            try {
                const res = await fetch('FE_MLN111_parsed.json');
                if (res.ok) {
                    const data = await res.json();
                    DB = data.map(item => ({
                        id: item.id,
                        q: item.question,
                        opts: item.options.map(option => option.text),
                        ans: item.answer.trim().toUpperCase()
                    }));
                    DBHasRuleLinks = false;
                    localStorage.setItem('mln_db_cache_v3', JSON.stringify(DB));
                    onDatabaseReady();
                    return;
                }
            } catch (error) {}

            try {
                const res = await fetch('FE_MLN111_2.txt');
                if (res.ok) {
                    const parsed = parseMLNText(await res.text());
                    if (parsed.length > 0) {
                        DB = parsed;
                        DBHasRuleLinks = false;
                        localStorage.setItem('mln_db_cache_v3', JSON.stringify(DB));
                        onDatabaseReady();
                        return;
                    }
                }
            } catch (error) {}

            openModal('importModal');
        }

        function onDatabaseReady() {
            mapAllQuestionsToRules();
            state.pool = [...DB];
            document.getElementById('loadBtnText').innerText = `Đã nạp ${DB.length} câu`;
            renderRulesHub();
            renderPracticeQuestion();
            renderBrowse();
            refreshProgressMetrics();
        }

        // Xử lý nạp file TXT từ máy tính / điện thoại
        function handleFileUpload(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                const content = e.target.result;
                if (file.name.endsWith('.json')) {
                    try {
                        const json = JSON.parse(content);
                        DB = json.map(item => ({
                            id: item.id,
                            q: item.question || item.q,
                            opts: Array.isArray(item.options) ? item.options.map(o => typeof o === 'string' ? o : o.text) : item.opts,
                            ans: (item.answer || item.ans || 'A').trim().toUpperCase()
                        }));
                    } catch(err) {
                        alert('File JSON không hợp lệ.');
                        return;
                    }
                } else {
                    DB = parseMLNText(content);
                }

                if (DB.length > 0) {
                    DBHasRuleLinks = false;
                    localStorage.setItem('mln_db_source_override_v1', '1');
                    localStorage.setItem('mln_db_cache_v3', JSON.stringify(DB));
                    closeModal('importModal');
                    onDatabaseReady();
                    alert(`Đã nạp thành công ${DB.length} câu hỏi vào hệ thống!`);
                } else {
                    alert('Không tìm thấy câu hỏi hợp lệ trong file. Vui lòng kiểm tra lại cấu trúc.');
                }
            };
            reader.readAsText(file, 'utf-8');
        }

        function processPastedText() {
            const val = document.getElementById('txtPasteArea').value;
            if (!val.trim()) {
                alert('Vui lòng dán nội dung file TXT vào ô.');
                return;
            }
            const parsed = parseMLNText(val);
            if (parsed.length > 0) {
                DB = parsed;
                DBHasRuleLinks = false;
                localStorage.setItem('mln_db_source_override_v1', '1');
                localStorage.setItem('mln_db_cache_v3', JSON.stringify(DB));
                closeModal('importModal');
                onDatabaseReady();
                alert(`Đã phân tích và nạp thành công ${DB.length} câu hỏi!`);
            } else {
                alert('Không thể tách câu hỏi từ nội dung dán vào. Vui lòng đảm bảo có từ khóa QUESTION và ANSWER.');
            }
        }
