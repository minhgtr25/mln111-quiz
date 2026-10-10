/* ==========================================================
           9. MODALS, SEARCH & KEYBOARD HOTKEYS
           ========================================================== */
        function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
        function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

        function jumpToSpecificNumber() {
            const val = parseInt(document.getElementById('jumpNumInput').value, 10);
            if (val >= 1 && val <= DB.length) {
                applyFilter('all');
                state.prIdx = val - 1;
                renderPracticeQuestion();
                closeModal('searchModal');
            }
        }

        function handleKeywordSearch(term) {
            const list = document.getElementById('searchResultList');
            if (!term.trim()) { list.innerHTML = ''; return; }
            const regex = new RegExp(term.trim(), 'gi');
            const matches = DB.filter(q => regex.test(q.q) || q.opts.some(o => regex.test(o))).slice(0, 15);
            list.innerHTML = '';
            matches.forEach(q => {
                const row = document.createElement('div');
                row.className = "p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-500 cursor-pointer";
                row.onclick = () => {
                    applyFilter('all');
                    state.prIdx = q.id - 1;
                    renderPracticeQuestion();
                    closeModal('searchModal');
                };
                row.innerHTML = `<span class="font-bold text-indigo-500 font-mono">#${q.id}:</span> ${q.q}`;
                list.appendChild(row);
            });
        }

        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            const key = e.key.toUpperCase();
            if (state.view === 'practice') {
                if (['A', 'B', 'C', 'D'].includes(key)) onOptionTapped(key);
                if (['1', '2', '3', '4'].includes(key)) {
                    const m = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
                    onOptionTapped(m[key]);
                }
                if (e.code === 'ArrowRight' || e.code === 'Enter') advanceNextPractice();
            } else if (state.view === 'flashcard') {
                if (e.code === 'Space') { e.preventDefault(); flipFlashcard(); }
                if (e.code === 'ArrowRight') nextFlashcard();
                if (e.code === 'ArrowLeft') prevFlashcard();
            }
        });

        function toggleDarkMode() {
            document.documentElement.classList.toggle('dark');
            const isDark = document.documentElement.classList.contains('dark');
            localStorage.setItem('mln_dark', isDark ? '1' : '0');
            document.getElementById('themeIcon').setAttribute('data-lucide', isDark ? 'sun' : 'moon');
            lucide.createIcons();
        }

        // Boot
        window.addEventListener('DOMContentLoaded', () => {
            if (localStorage.getItem('mln_dark') === '1' || (!localStorage.getItem('mln_dark') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
                document.getElementById('themeIcon').setAttribute('data-lucide', 'sun');
            }
            initDatabase();
            lucide.createIcons();
        });
