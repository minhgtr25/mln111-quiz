/* ==========================================================
           7. QUICK FILTER CYCLE (All -> Wrong -> Starred)
           ========================================================== */
        function cycleFilter() {
            if (state.filter === 'all') {
                if (state.wrong.size > 0) applyFilter('wrong');
                else if (state.starred.size > 0) applyFilter('starred');
                else applyFilter('all');
            } else if (state.filter === 'wrong') {
                if (state.starred.size > 0) applyFilter('starred');
                else applyFilter('all');
            } else {
                applyFilter('all');
            }
        }

        function applyFilter(f) {
            state.filter = f;
            state.activeRuleId = null;
            const label = document.getElementById('quickFilterLabel');
            if (f === 'starred') {
                state.pool = DB.filter(q => state.starred.has(q.id));
                label.innerText = `Đã lưu (${state.pool.length})`;
            } else if (f === 'wrong') {
                state.pool = DB.filter(q => state.wrong.has(q.id));
                label.innerText = `Câu sai (${state.pool.length})`;
            } else {
                state.pool = [...DB];
                label.innerText = `Tất cả (${state.pool.length})`;
            }

            if (state.pool.length === 0) {
                applyFilter('all');
                return;
            }
            state.prIdx = 0;
            state.fcIdx = 0;
            renderPracticeQuestion();
        }
/* ==========================================================
           8. VIEW CONTROLS & FLASHCARD & EXAM
           ========================================================== */
        function switchView(v) {
            state.view = v;
            ['practice', 'rules', 'flashcard', 'exam', 'browse'].forEach(name => {
                const el = document.getElementById(`${name}View`);
                if (el) el.classList.toggle('hidden', name !== v);

                const dBtn = document.getElementById(`deskNav${capitalize(name)}`);
                if (dBtn) {
                    dBtn.className = name === v
                        ? "px-3 py-1 rounded-lg bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                        : "px-3 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 font-medium";
                }

                const mBtn = document.getElementById(`mobNav${capitalize(name)}`);
                if (mBtn) {
                    mBtn.className = name === v
                        ? "py-1 text-indigo-600 dark:text-indigo-400 flex flex-col items-center font-bold"
                        : "py-1 text-slate-400 flex flex-col items-center font-medium";
                }
            });

            if (v === 'practice') renderPracticeQuestion();
            if (v === 'rules') renderRulesHub();
            if (v === 'flashcard') renderFlashcard();
            if (v === 'browse') renderBrowse();
            lucide.createIcons();
        }

        function enterStudyMode(view) {
            document.getElementById('entryGate').classList.add('hidden');
            document.getElementById('studyApp').classList.remove('hidden');
            document.getElementById('studyApp').classList.add('flex');
            switchView(view || 'practice');
        }

        window.showMLNLanding = function(user) {
            const gate = document.getElementById('entryGate');
            if (!gate) return;
            document.getElementById('studyApp').classList.add('hidden');
            document.getElementById('studyApp').classList.remove('flex');
            gate.classList.remove('hidden');
            document.getElementById('entrySignedOut').classList.add('hidden');
            document.getElementById('entryLanding').classList.remove('hidden');
            document.getElementById('landingGreeting').textContent = user?.email ? `Đã đăng nhập với ${user.email}` : 'Chọn một cách ôn tập để bắt đầu.';
            if (window.lucide) window.lucide.createIcons();
        };

        window.showMLNLoginGate = function() {
            const gate = document.getElementById('entryGate');
            if (!gate) return;
            document.getElementById('studyApp').classList.add('hidden');
            document.getElementById('studyApp').classList.remove('flex');
            gate.classList.remove('hidden');
            document.getElementById('entryLanding').classList.add('hidden');
            document.getElementById('entrySignedOut').classList.remove('hidden');
        };

        function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

        // Flashcard methods
        function renderFlashcard() {
            if (!state.pool.length) return;
            const item = state.pool[state.fcIdx];
            state.fcFlipped = false;
            document.getElementById('fcInner').classList.remove('rotate-y-180');
            document.getElementById('fcIdx').innerText = state.fcIdx + 1;
            document.getElementById('fcTot').innerText = state.pool.length;
            document.getElementById('fcQuestion').innerText = item.q;

            const charIdx = item.ans.charCodeAt(0) - 65;
            document.getElementById('fcAnswer').innerText = `${item.ans}. ${item.opts[charIdx] || ''}`;
        }
        function flipFlashcard() {
            state.fcFlipped = !state.fcFlipped;
            document.getElementById('fcInner').classList.toggle('rotate-y-180', state.fcFlipped);
        }
        function nextFlashcard() {
            state.fcIdx = (state.fcIdx + 1) % state.pool.length;
            renderFlashcard();
        }
        function prevFlashcard() {
            state.fcIdx = (state.fcIdx - 1 + state.pool.length) % state.pool.length;
            renderFlashcard();
        }
        function markFlashcard(correct) {
            const item = state.pool[state.fcIdx];
            if (item) {
                state.answered.add(item.id);
                if (correct) { state.correct.add(item.id); state.wrong.delete(item.id); }
                else { state.correct.delete(item.id); state.wrong.add(item.id); }
                saveUserData();
            }
            playBeep(correct);
            nextFlashcard();
        }

        // Exam methods
        function startExamSimulation() {
            state.examList = [...DB].sort(() => 0.5 - Math.random()).slice(0, 40);
            state.examIdx = 0;
            state.examAnswers = {};
            state.examSeconds = 35 * 60;
            document.getElementById('examIntroScreen').classList.add('hidden');
            document.getElementById('examResultScreen').classList.add('hidden');
            document.getElementById('examActiveScreen').classList.remove('hidden');
            renderExamQ();

            if (state.examTimer) clearInterval(state.examTimer);
            state.examTimer = setInterval(() => {
                state.examSeconds--;
                const m = Math.floor(state.examSeconds / 60);
                const s = state.examSeconds % 60;
                document.getElementById('examTimer').innerText = `${m}:${s.toString().padStart(2, '0')}`;
                if (state.examSeconds <= 0) submitExamFinal();
            }, 1000);
        }

        function renderExamQ() {
            const item = state.examList[state.examIdx];
            document.getElementById('examIdx').innerText = state.examIdx + 1;
            document.getElementById('examTot').innerText = state.examList.length;
            document.getElementById('examQuestion').innerText = item.q;
            const container = document.getElementById('examOptions');
            container.innerHTML = '';
            const letters = ['A', 'B', 'C', 'D'];
            item.opts.forEach((opt, idx) => {
                const l = letters[idx];
                const isSelected = state.examAnswers[state.examIdx] === l;
                const btn = document.createElement('button');
                btn.className = `w-full text-left p-2.5 rounded-xl border text-xs flex items-center gap-2 ${isSelected ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 font-bold' : 'border-slate-200 dark:border-slate-800'}`;
                btn.onclick = () => { state.examAnswers[state.examIdx] = l; renderExamQ(); };
                btn.innerHTML = `<span class="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-mono">${l}</span><span>${opt}</span>`;
                container.appendChild(btn);
            });
        }
        function nextExamQuestion() {
            if (state.examIdx < state.examList.length - 1) { state.examIdx++; renderExamQ(); }
        }
        function prevExamQuestion() {
            if (state.examIdx > 0) { state.examIdx--; renderExamQ(); }
        }
        function submitExamFinal() {
            clearInterval(state.examTimer);
            state.examList.forEach((item, index) => {
                const selected = state.examAnswers[index];
                if (!selected) return;
                state.answered.add(item.id);
                if (selected === item.ans) { state.correct.add(item.id); state.wrong.delete(item.id); }
                else { state.correct.delete(item.id); state.wrong.add(item.id); }
            });
            saveUserData();
            let correct = 0;
            state.examList.forEach((q, idx) => {
                if (state.examAnswers[idx] === q.ans) correct++;
            });
            const grade = ((correct / 40) * 10).toFixed(1);
            document.getElementById('examActiveScreen').classList.add('hidden');
            document.getElementById('examResultScreen').classList.remove('hidden');
            const gBadge = document.getElementById('examGrade');
            gBadge.innerText = grade;
            gBadge.className = `w-14 h-14 mx-auto mb-2 rounded-2xl flex items-center justify-center font-extrabold text-2xl ${grade >= 5 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`;
            document.getElementById('examTitle').innerText = grade >= 5 ? "Đạt bài thi!" : "Cần ôn tập thêm!";
            document.getElementById('examSummary').innerText = `Đúng ${correct}/40 câu (${Math.round((correct/40)*100)}%).`;
        }

        // Browse full list
        function renderBrowse() {
            const list = document.getElementById('browseList');
            if (!list) return;
            document.getElementById('browseCount').innerText = DB.length;
            list.innerHTML = '';
            DB.forEach(q => {
                const card = document.createElement('div');
                card.className = "p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs";
                card.innerHTML = `
                    <div class="flex items-center justify-between font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                        <span>#Câu ${q.id} (Đáp án: ${q.ans})</span>
                        <button onclick="jumpToSpecificQ(${q.id})" class="text-[11px] hover:underline">Luyện câu này ➔</button>
                    </div>
                    <div class="font-medium text-slate-800 dark:text-slate-200">${q.q}</div>
                `;
                list.appendChild(card);
            });
        }
