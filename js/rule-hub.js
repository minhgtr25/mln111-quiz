/* ==========================================================
           6. ⚡ RULES & PATTERN HUB RENDERING & CHÈN CÂU HỎI TƯƠNG ỨNG
           ========================================================== */
        function renderRulesHub() {
            const container = document.getElementById('rulesListContainer');
            if (!container) return;
            container.innerHTML = '';

            RULES_CONFIG.forEach((rule) => {
                const matchedQuestions = state.ruleQuestionsMap[rule.id] || [];
                const matchedCount = matchedQuestions.length;
                const card = document.createElement('div');
                card.id = `ruleCard_${rule.id}`;
                card.className = "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800 transition-all";

                card.innerHTML = `
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex items-start gap-2.5">
                            <span class="text-xl sm:text-2xl shrink-0 p-1 rounded-xl bg-slate-50 dark:bg-slate-800">${rule.icon}</span>
                            <div>
                                <div class="flex items-center gap-1.5 flex-wrap">
                                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">${rule.tag}</span>
                                    <span class="text-[10px] font-semibold text-slate-400">Khớp ${matchedCount} câu trong đề</span>
                                </div>
                                <h3 class="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 mt-1">${rule.title}</h3>
                            </div>
                        </div>
                    </div>

                    <!-- Formula Highlight Box -->
                    <div class="mt-2.5 p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 text-[11px] sm:text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-mono">
                        <span class="font-bold text-amber-700 dark:text-amber-400">Mẹo nhớ nhanh:</span>
                        <div class="mt-0.5">${rule.formula}</div>
                    </div>

                    <!-- Action Controls -->
                    <div class="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                        <button onclick="toggleRuleQuestionsPreview('${rule.id}')" class="text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1">
                            <span id="toggleText_${rule.id}">Xem ${matchedCount} câu áp dụng</span>
                            <i data-lucide="chevron-down" id="toggleIcon_${rule.id}" class="w-3.5 h-3.5"></i>
                        </button>
                        <button onclick="startPracticeRule('${rule.id}')" class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs">
                            <i data-lucide="play" class="w-3 h-3 fill-white"></i>
                            <span>Luyện tập ngay (${matchedCount})</span>
                        </button>
                    </div>

                    <!-- Danh mục câu hỏi tương ứng được chèn trực tiếp vào mẹo -->
                    <div id="ruleQuestions_${rule.id}" class="hidden mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <!-- Chèn động các câu hỏi tương ứng -->
                    </div>
                `;
                container.appendChild(card);
            });
            lucide.createIcons();
        }

        function toggleRuleQuestionsPreview(ruleId) {
            const targetDiv = document.getElementById(`ruleQuestions_${ruleId}`);
            const toggleText = document.getElementById(`toggleText_${ruleId}`);
            const toggleIcon = document.getElementById(`toggleIcon_${ruleId}`);
            if (!targetDiv) return;

            const isHidden = targetDiv.classList.contains('hidden');
            if (isHidden) {
                targetDiv.classList.remove('hidden');
                toggleText.innerText = "Thu gọn câu hỏi";
                toggleIcon.classList.add('rotate-180');

                // Render questions matching this rule
                const matchedList = state.ruleQuestionsMap[ruleId] || [];

                if (matchedList.length === 0) {
                    targetDiv.innerHTML = `<div class="p-3 text-center text-slate-400 text-xs">Chưa có câu hỏi nào khớp với mẹo này. Hãy nạp file TXT để đồng bộ.</div>`;
                    return;
                }

                targetDiv.innerHTML = matchedList.map((q, idx) => {
                    const ansIndex = q.ans.charCodeAt(0) - 65;
                    const ansText = q.opts[ansIndex] || '';
                    return `
                        <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 text-xs">
                            <div class="flex items-center justify-between text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                                <span>#Câu ${q.id} (Áp dụng mẹo)</span>
                                <button onclick="jumpToSpecificQ(${q.id})" class="text-indigo-600 dark:text-indigo-400 hover:underline">Làm câu này ➔</button>
                            </div>
                            <div class="font-semibold text-slate-800 dark:text-slate-200 mb-1.5 leading-snug">${q.q}</div>
                            <div class="text-[11px] p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-medium">
                                <span class="font-bold">✓ Đáp án ${q.ans}:</span> ${ansText}
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                targetDiv.classList.add('hidden');
                const matchedCount = (state.ruleQuestionsMap[ruleId] || []).length;
                toggleText.innerText = `Xem ${matchedCount} câu áp dụng`;
                toggleIcon.classList.remove('rotate-180');
            }
            lucide.createIcons();
        }

        function startPracticeRule(ruleId) {
            const filteredPool = state.ruleQuestionsMap[ruleId] || [];
            if (filteredPool.length === 0) {
                alert('Không có câu hỏi nào trong mục này.');
                return;
            }

            const rule = RULES_CONFIG.find(r => r.id === ruleId);
            state.filter = 'rule';
            state.activeRuleId = ruleId;
            state.pool = filteredPool;
            state.prIdx = 0;
            state.prScore = 0;

            const label = document.getElementById('quickFilterLabel');
            label.innerText = `${rule ? rule.tag : 'Mẹo'} (${filteredPool.length})`;

            switchView('practice');
        }

        function resetRuleFilterAndPractice() {
            applyFilter('all');
            switchView('practice');
        }

        function jumpToSpecificQ(qId) {
            applyFilter('all');
            const foundIdx = state.pool.findIndex(q => q.id === qId);
            if (foundIdx !== -1) {
                state.prIdx = foundIdx;
            }
            switchView('practice');
        }
