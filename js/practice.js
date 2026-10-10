/* ==========================================================
           3. WEB AUDIO BEEP
           ========================================================== */
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        function playBeep(correct) {
            if (!state.audioOn) return;
            try {
                if (audioCtx.state === 'suspended') audioCtx.resume();
                const now = audioCtx.currentTime;
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                if (correct) {
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(587, now);
                    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
                    gain.gain.setValueAtTime(0.12, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
                    osc.start(now);
                    osc.stop(now + 0.22);
                } else {
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(220, now);
                    osc.frequency.exponentialRampToValueAtTime(140, now + 0.18);
                    gain.gain.setValueAtTime(0.15, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                    osc.start(now);
                    osc.stop(now + 0.2);
                }
            } catch(e) {}
        }

        function toggleAudio() {
            state.audioOn = !state.audioOn;
            document.getElementById('soundIcon').setAttribute('data-lucide', state.audioOn ? 'volume-2' : 'volume-x');
            lucide.createIcons();
        }
/* ==========================================================
           4. PROGRESS & ETR ESTIMATOR
           ========================================================== */
        function refreshProgressMetrics() {
            const total = state.pool.length || 1;
            const cur = Math.min(total, state.prIdx + 1);
            const remaining = Math.max(0, total - cur);
            const pct = Math.min(100, Math.max(0, (cur / total) * 100));

            let avgSec = 10.0;
            if (state.responseDurations.length > 0) {
                const recent = state.responseDurations.slice(-8);
                avgSec = recent.reduce((a, b) => a + b, 0) / recent.length;
                avgSec = Math.max(2.5, Math.min(45, avgSec));
            }

            const totalSecLeft = Math.round(remaining * avgSec);
            let timeText = "";
            if (totalSecLeft < 60) timeText = `~${totalSecLeft}s`;
            else {
                const m = Math.ceil(totalSecLeft / 60);
                if (m >= 60) {
                    const h = Math.floor(m / 60);
                    timeText = `~${h}h${m % 60}p`;
                } else timeText = `~${m}p`;
            }

            const finishDate = new Date(Date.now() + totalSecLeft * 1000);
            const h = finishDate.getHours().toString().padStart(2, '0');
            const min = finishDate.getMinutes().toString().padStart(2, '0');

            document.getElementById('stripQCount').innerText = `${cur}/${total}`;
            document.getElementById('stripPct').innerText = `${pct.toFixed(1)}%`;
            document.getElementById('stripSpeed').innerText = `~${avgSec.toFixed(1)}s/câu`;
            document.getElementById('stripTimeLeft').innerText = remaining === 0 ? 'Xong!' : timeText;
            document.getElementById('stripEta').innerText = remaining === 0 ? 'Hoàn tất' : `Xong ${h}:${min}`;
            document.getElementById('thinProgressBar').style.width = `${pct}%`;

            const rCount = state.rollbackQueue.length;
            const rBadge = document.getElementById('stripRollbackBadge');
            if (rCount > 0) {
                rBadge.classList.remove('hidden');
                document.getElementById('stripRollbackCount').innerText = rCount;
            } else {
                rBadge.classList.add('hidden');
            }
        }
/* ==========================================================
           5. PRACTICE VIEW (AUTO FONT SCALING & INSTANT TAP EVAL)
           ========================================================== */
        function renderPracticeQuestion() {
            if (!state.pool.length) return;
            if (state.autoAdvanceTimer) clearTimeout(state.autoAdvanceTimer);

            state.prAnswered = false;
            state.waitingAfterWrong = false;
            state.startTime = Date.now();
            const item = state.pool[state.prIdx];

            document.getElementById('prLiveNum').innerText = `Câu ${state.prIdx + 1}/${state.pool.length}`;
            document.getElementById('prScorePill').innerText = `Đúng: ${state.prScore}`;

            const rNotice = document.getElementById('prRollbackNotice');
            if (item.isRolledBack) rNotice.classList.remove('hidden');
            else rNotice.classList.add('hidden');

            const rulePill = document.getElementById('prRulePill');
            if (state.activeRuleId) {
                const curRule = RULES_CONFIG.find(r => r.id === state.activeRuleId);
                rulePill.classList.remove('hidden');
                rulePill.innerText = `${curRule ? curRule.tag : 'Mẹo'}`;
            } else {
                rulePill.classList.add('hidden');
            }

            const isStar = state.starred.has(item.id);
            document.getElementById('prStarBtn').innerHTML = `<i data-lucide="star" class="w-4 h-4 ${isStar ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}"></i>`;

            document.getElementById('prFeedbackMsg').className = "truncate text-slate-400";
            document.getElementById('prFeedbackMsg').innerText = "Chạm vào phương án để trả lời";
            document.getElementById('prAutoNextTimer').innerText = "";

            // Dynamic Font & Padding scaling
            const qEl = document.getElementById('prQuestionText');
            qEl.innerText = item.q;
            const qLen = item.q.length;
            const totalOptLen = item.opts.reduce((acc, opt) => acc + opt.length, 0);

            let qFontClass = "text-sm sm:text-base";
            let optPaddingClass = "py-2 sm:py-3 px-3";
            let optFontClass = "text-xs sm:text-sm";

            if (qLen > 200 || totalOptLen > 300) {
                qFontClass = "text-[12px] sm:text-sm leading-tight";
                optPaddingClass = "py-1.5 sm:py-2 px-2.5";
                optFontClass = "text-[11px] sm:text-xs leading-tight";
            } else if (qLen > 110 || totalOptLen > 180) {
                qFontClass = "text-xs sm:text-sm leading-snug";
                optPaddingClass = "py-2 sm:py-2.5 px-3";
                optFontClass = "text-xs sm:text-sm leading-snug";
            } else {
                qFontClass = "text-sm sm:text-base leading-normal";
                optPaddingClass = "py-2.5 sm:py-3.5 px-3.5";
                optFontClass = "text-xs sm:text-sm leading-normal";
            }
            qEl.className = `w-full font-bold text-slate-900 dark:text-slate-100 tracking-tight ${qFontClass}`;

            const container = document.getElementById('prOptionsContainer');
            container.innerHTML = '';
            const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

            item.opts.forEach((optText, idx) => {
                const letter = letters[idx] || `${idx + 1}`;
                const btn = document.createElement('button');
                btn.id = `optBtn_${letter}`;
                btn.className = `w-full text-left rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-indigo-400 active:scale-[0.99] transition-all flex items-center gap-2.5 shadow-2xs ${optPaddingClass}`;
                btn.onclick = () => onOptionTapped(letter);
                btn.innerHTML = `
                    <span class="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center shrink-0 font-mono">${letter}</span>
                    <span class="font-medium text-slate-700 dark:text-slate-200 truncate-2-lines flex-1 ${optFontClass}">${optText}</span>
                `;
                container.appendChild(btn);
            });

            refreshProgressMetrics();
            lucide.createIcons();
        }

        function onOptionTapped(chosenLetter) {
            if (state.prAnswered) return;
            state.prAnswered = true;

            const duration = Math.min(60, Math.max(1, (Date.now() - state.startTime) / 1000));
            state.responseDurations.push(duration);
            if (state.responseDurations.length > 20) state.responseDurations.shift();

            const item = state.pool[state.prIdx];
            const isCorrect = chosenLetter.toUpperCase() === item.ans;
            playBeep(isCorrect);

            const feedbackMsg = document.getElementById('prFeedbackMsg');
            const timerMsg = document.getElementById('prAutoNextTimer');
            const continueBtn = document.getElementById('prContinueBtn');
            continueBtn?.classList.add('hidden');

            state.answered.add(item.id);
            if (isCorrect) {
                state.prScore++;
                state.correct.add(item.id);
                state.wrong.delete(item.id);
                clearQuestionRollback(item.id);
                feedbackMsg.className = "truncate text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1";
                feedbackMsg.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5 inline"></i> Chính xác! Đáp án đúng: ${item.ans}`;
            } else {
                state.waitingAfterWrong = true;
                state.correct.delete(item.id);
                state.wrong.add(item.id);
                scheduleRollback(item);
                feedbackMsg.className = "text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1";
                feedbackMsg.innerHTML = `<i data-lucide="x" class="w-3.5 h-3.5 inline shrink-0"></i> Sai. Đáp án đúng ${item.ans} đã tô xanh. Nhấn Space để tiếp tục.`;
                continueBtn?.classList.remove('hidden');
            }

            ['A', 'B', 'C', 'D', 'E', 'F'].forEach(letter => {
                const btn = document.getElementById(`optBtn_${letter}`);
                if (!btn) return;
                btn.classList.remove('answer-correct', 'answer-incorrect', 'answer-dimmed');
                if (letter === item.ans) {
                    btn.classList.add('answer-correct');
                } else if (letter === chosenLetter) {
                    btn.classList.add('answer-incorrect');
                } else {
                    btn.classList.add('answer-dimmed');
                }
            });

            saveUserData();
            lucide.createIcons();

            if (isCorrect) {
                timerMsg.innerText = "Tự chuyển câu...";
                state.autoAdvanceTimer = setTimeout(() => advanceNextPractice(), 850);
            } else {
                timerMsg.innerText = '';
            }
        }

        function advanceNextPractice() {
            if (state.autoAdvanceTimer) clearTimeout(state.autoAdvanceTimer);
            if (state.prIdx < state.pool.length - 1) {
                state.prIdx++;
            } else {
                state.prIdx = 0;
            }
            renderPracticeQuestion();
        }

        function scheduleRollback(wrongItem) {
            // A due rollback copy was just answered incorrectly; schedule one more retry.
            if (wrongItem.isRolledBack) {
                state.rollbackQueue = state.rollbackQueue.filter(entry => entry.id !== wrongItem.id);
            }
            // Keep at most one future retry for each question.
            if (state.rollbackQueue.some(entry => entry.id === wrongItem.id)) return;

            const offset = Math.floor(Math.random() * 3) + 5;
            const targetIdx = state.prIdx + offset + 1;
            const clone = { ...wrongItem, isRolledBack: true };

            if (targetIdx < state.pool.length) {
                state.pool.splice(targetIdx, 0, clone);
            } else {
                state.pool.push(clone);
            }

            state.rollbackQueue.push({ id: wrongItem.id });
            refreshProgressMetrics();
        }

        function clearQuestionRollback(questionId) {
            state.rollbackQueue = state.rollbackQueue.filter(entry => entry.id !== questionId);
            for (let index = state.pool.length - 1; index > state.prIdx; index--) {
                if (state.pool[index].id === questionId && state.pool[index].isRolledBack) {
                    state.pool.splice(index, 1);
                }
            }
            refreshProgressMetrics();
        }

        function toggleStarCurrent() {
            const item = state.pool[state.prIdx];
            if (state.starred.has(item.id)) state.starred.delete(item.id);
            else state.starred.add(item.id);
            saveUserData();
            renderPracticeQuestion();
        }

        function saveUserData() {
            const now = Date.now();
            [['starred', savedStarred, state.starred], ['wrong', savedWrong, state.wrong], ['answered', savedAnswered, state.answered], ['correct', savedCorrect, state.correct]].forEach(([kind, before, after]) => {
                new Set([...before, ...after]).forEach(id => {
                    if (before.has(id) !== after.has(id)) progressMeta[kind][id] = { value: after.has(id), updatedAt: now };
                });
            });
            savedStarred = new Set(state.starred);
            savedWrong = new Set(state.wrong);
            savedAnswered = new Set(state.answered);
            savedCorrect = new Set(state.correct);
            persistProgressLocally();
            if (typeof window.queueMLNProgressSync === 'function') window.queueMLNProgressSync(window.exportMLNProgress());
        }
